import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const PLAID_BASE_URL = 'https://production.plaid.com';

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
        console.error('Plaid link/token/create failed:', plaidResponse.status, JSON.stringify(data));
        return new Response(JSON.stringify({ error: 'Failed to initialize bank connection. Please try again.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ link_token: data.link_token }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'exchange-token' && req.method === 'POST') {
      const { public_token, institution, household_id } = await req.json();

      // Verify user is a member of the claimed household
      const { data: membership } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', household_id)
        .eq('user_id', userId)
        .single();
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Forbidden: not a member of this household' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

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
        console.error('Plaid exchange failed:', exchangeResponse.status, JSON.stringify(exchangeData));
        return new Response(JSON.stringify({ error: 'Failed to connect bank account. Please try again.' }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
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

      if (defaultAccountId && txnData.transactions && txnData.transactions.length > 0) {
        // Check for existing provider_transaction_ids to avoid duplicates
        const providerIds = txnData.transactions.map((t: any) => t.transaction_id);
        const { data: existing } = await serviceSupabase
          .from('transactions')
          .select('provider_transaction_id')
          .eq('household_id', household_id)
          .in('provider_transaction_id', providerIds);

        const existingIds = new Set((existing || []).map((e: any) => e.provider_transaction_id));

        const txnInserts = txnData.transactions
          .filter((t: any) => !existingIds.has(t.transaction_id))
          .map((t: any) => ({
            household_id,
            account_id: defaultAccountId,
            date: t.date,
            merchant: t.merchant_name || t.name || null,
            amount: -t.amount,
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

    if (action === 'sync-transactions' && req.method === 'POST') {
      const { household_id } = await req.json();

      // Verify membership
      const { data: membership } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', household_id)
        .eq('user_id', userId)
        .single();
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const serviceSupabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      );

      // Get all plaid items for this household
      const { data: plaidItems, error: itemsError } = await serviceSupabase
        .from('plaid_items')
        .select('id, plaid_access_token, institution_name')
        .eq('household_id', household_id)
        .eq('status', 'active');

      if (itemsError || !plaidItems?.length) {
        return new Response(JSON.stringify({ error: 'No connected bank accounts found.' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let totalAccountsUpdated = 0;
      let totalNewTransactions = 0;
      let allNewTransactionIds: string[] = [];

      for (const item of plaidItems) {
        // Update account balances
        const accountsResponse = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: item.plaid_access_token,
          }),
        });

        if (accountsResponse.ok) {
          const accountsData = await accountsResponse.json();
          for (const acc of accountsData.accounts || []) {
            const { error: updateErr } = await serviceSupabase
              .from('accounts')
              .update({
                balance: acc.balances?.current || 0,
                last_synced_at: new Date().toISOString(),
              })
              .eq('household_id', household_id)
              .eq('institution', item.institution_name)
              .ilike('name', acc.name || acc.official_name || '');
            if (!updateErr) totalAccountsUpdated++;
          }
        }

        // Fetch recent transactions (last 14 days)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const txnResponse = await fetch(`${PLAID_BASE_URL}/transactions/get`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: item.plaid_access_token,
            start_date: startDate,
            end_date: endDate,
          }),
        });

        if (txnResponse.ok) {
          const txnData = await txnResponse.json();
          const transactions = txnData.transactions || [];

          if (transactions.length > 0) {
            // Get existing provider_transaction_ids to avoid duplicates
            const providerIds = transactions.map((t: any) => t.transaction_id);
            const { data: existing } = await serviceSupabase
              .from('transactions')
              .select('provider_transaction_id')
              .eq('household_id', household_id)
              .in('provider_transaction_id', providerIds);

            const existingIds = new Set((existing || []).map(e => e.provider_transaction_id));

            // Get default account for this institution
            const { data: dbAccounts } = await serviceSupabase
              .from('accounts')
              .select('id')
              .eq('household_id', household_id)
              .eq('institution', item.institution_name)
              .limit(1);

            const accountId = dbAccounts?.[0]?.id;
            if (!accountId) continue;

            const newTxns = transactions
              .filter((t: any) => !existingIds.has(t.transaction_id))
              .map((t: any) => ({
                household_id,
                account_id: accountId,
                date: t.date,
                merchant: t.merchant_name || t.name || null,
                amount: -t.amount,
                notes: t.name || null,
                provider_transaction_id: t.transaction_id,
              }));

            if (newTxns.length > 0) {
              const { data: inserted } = await serviceSupabase.from('transactions').insert(newTxns).select('id');
              totalNewTransactions += newTxns.length;
              if (inserted) allNewTransactionIds.push(...inserted.map((r: any) => r.id));
            }
          }
        }
      }

      return new Response(JSON.stringify({
        success: true,
        accounts_updated: totalAccountsUpdated,
        new_transactions: totalNewTransactions,
        new_transaction_ids: allNewTransactionIds,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'remove-item' && req.method === 'POST') {
      const { household_id, plaid_item_id } = await req.json();

      // Verify membership
      const { data: membership } = await supabase
        .from('household_members')
        .select('id')
        .eq('household_id', household_id)
        .eq('user_id', userId)
        .single();
      if (!membership) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get the plaid item with access token using service role
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: plaidItem } = await admin
        .from('plaid_items')
        .select('plaid_access_token, plaid_item_id')
        .eq('household_id', household_id)
        .eq('plaid_item_id', plaid_item_id)
        .single();

      if (!plaidItem) {
        return new Response(JSON.stringify({ error: 'Plaid item not found' }), {
          status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Remove item from Plaid
      try {
        await fetch(`${PLAID_BASE_URL}/item/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: plaidItem.plaid_access_token,
          }),
        });
      } catch (e) {
        console.error('Plaid item/remove error:', e);
      }

      // Mark item as revoked in DB
      await admin
        .from('plaid_items')
        .update({ status: 'revoked' })
        .eq('plaid_item_id', plaid_item_id)
        .eq('household_id', household_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Plaid error:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred. Please try again.' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
