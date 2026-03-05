import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLAID_BASE_URL = 'https://sandbox.plaid.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return new Response(JSON.stringify({ error: 'Plaid credentials not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Authenticate user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
  if (claimsError || !claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = claimsData.claims.sub;

  try {
    const url = new URL(req.url);
    const action = url.pathname.split('/').pop();

    if (action === 'create-link-token' && req.method === 'POST') {
      const plaidResponse = await fetch(`${PLAID_BASE_URL}/link/token/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          user: { client_user_id: userId },
          client_name: 'PrismBudget',
          products: ['transactions'],
          country_codes: ['US'],
          language: 'en',
        }),
      });
      const data = await plaidResponse.json();
      if (!plaidResponse.ok) {
        throw new Error(`Plaid link/token/create failed [${plaidResponse.status}]: ${JSON.stringify(data)}`);
      }
      return new Response(JSON.stringify({ link_token: data.link_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange-token' && req.method === 'POST') {
      const { public_token, institution, household_id } = await req.json();

      // Exchange public token for access token
      const exchangeResponse = await fetch(`${PLAID_BASE_URL}/item/public_token/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          public_token,
        }),
      });
      const exchangeData = await exchangeResponse.json();
      if (!exchangeResponse.ok) {
        throw new Error(`Plaid exchange failed [${exchangeResponse.status}]: ${JSON.stringify(exchangeData)}`);
      }

      const { access_token, item_id } = exchangeData;

      // Store plaid item using service role to avoid RLS issues
      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      await serviceSupabase.from('plaid_items').insert({
        household_id,
        plaid_item_id: item_id,
        plaid_access_token: access_token,
        institution_id: institution?.institution_id || null,
        institution_name: institution?.name || null,
      });

      // Fetch accounts from Plaid
      const accountsResponse = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token,
        }),
      });
      const accountsData = await accountsResponse.json();

      // Map Plaid account types
      const typeMap: Record<string, string> = {
        depository: 'checking',
        credit: 'credit',
        loan: 'loan',
        investment: 'investment',
        other: 'other',
      };
      const subtypeMap: Record<string, string> = {
        checking: 'checking',
        savings: 'savings',
      };

      // Insert accounts
      const accountInserts = (accountsData.accounts || []).map((acc: any) => ({
        household_id,
        name: acc.name || acc.official_name || 'Unknown Account',
        institution: institution?.name || null,
        account_type: subtypeMap[acc.subtype] || typeMap[acc.type] || 'other',
        balance: acc.balances?.current || 0,
        currency: acc.balances?.iso_currency_code || 'USD',
        last_synced_at: new Date().toISOString(),
      }));

      if (accountInserts.length > 0) {
        await serviceSupabase.from('accounts').insert(accountInserts);
      }

      // Fetch transactions (last 30 days for initial import)
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const txnResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: PLAID_CLIENT_ID,
          secret: PLAID_SECRET,
          access_token,
          start_date: startDate,
          end_date: endDate,
        }),
      });
      const txnData = await txnResponse.json();

      // Get account mapping (we need account IDs from our DB)
      const { data: dbAccounts } = await serviceSupabase
        .from('accounts')
        .select('id')
        .eq('household_id', household_id)
        .limit(1);

      const defaultAccountId = dbAccounts?.[0]?.id;

      if (defaultAccountId && txnData.transactions) {
        const txnInserts = txnData.transactions.map((t: any) => ({
          household_id,
          account_id: defaultAccountId,
          date: t.date,
          merchant: t.merchant_name || t.name || null,
          amount: -t.amount, // Plaid uses positive for debits
          notes: t.name || null,
          provider_transaction_id: t.transaction_id,
        }));

        if (txnInserts.length > 0) {
          await serviceSupabase.from('transactions').insert(txnInserts);
        }
      }

      return new Response(JSON.stringify({
        success: true,
        accounts_synced: accountInserts.length,
        transactions_synced: txnData.transactions?.length || 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Plaid error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
