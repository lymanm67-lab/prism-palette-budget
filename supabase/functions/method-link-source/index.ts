// Phase 2: Convert an existing Plaid-linked account into a Method ACH funding source.
// Flow: caller passes plaid_item (our PK) + plaid_account_id (Plaid's id string).
// We mint a Plaid processor token for Method, POST /accounts to Method,
// and persist in method_accounts.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PLAID_BASE_URL = (env: string) =>
  env === 'production' ? 'https://production.plaid.com' : 'https://sandbox.plaid.com';
const METHOD_BASE_URL = (env: string) =>
  env === 'production' ? 'https://production.methodfi.com' : 'https://dev.methodfi.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const METHOD_API_KEY = Deno.env.get('METHOD_API_KEY');
  const METHOD_ENV = Deno.env.get('METHOD_ENV') ?? 'dev';
  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
  const PLAID_ENV = Deno.env.get('PLAID_ENV') ?? 'production';
  if (!METHOD_API_KEY || !PLAID_CLIENT_ID || !PLAID_SECRET) {
    return new Response(JSON.stringify({ error: 'Missing API credentials' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

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
    const { household_id, plaid_item_db_id, plaid_account_id } = await req.json();
    if (!household_id || !plaid_item_db_id || !plaid_account_id) {
      return new Response(JSON.stringify({ error: 'Missing fields: household_id, plaid_item_db_id, plaid_account_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: member } = await supabase.from('household_members')
      .select('id').eq('household_id', household_id).eq('user_id', userId).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: 'Not a household member' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Get Method entity for this household
    const { data: entity } = await service.from('method_entities')
      .select('id, method_entity_id').eq('household_id', household_id).maybeSingle();
    if (!entity?.method_entity_id) {
      return new Response(JSON.stringify({ error: 'Method entity not created. Complete KYC first.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    // Get Plaid access token
    const { data: pItem } = await service.from('plaid_items')
      .select('plaid_access_token').eq('id', plaid_item_db_id).eq('household_id', household_id).maybeSingle();
    if (!pItem?.plaid_access_token) {
      return new Response(JSON.stringify({ error: 'Plaid item not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 1. Create Plaid processor token for Method
    const procRes = await fetch(`${PLAID_BASE_URL(PLAID_ENV)}/processor/token/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET,
        access_token: pItem.plaid_access_token,
        account_id: plaid_account_id,
        processor: 'method',
      }),
    });
    const procData = await procRes.json();
    if (!procRes.ok) {
      console.error('Plaid processor token failed:', procData);
      return new Response(JSON.stringify({ error: 'Plaid processor token creation failed', details: procData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Create Method ACH account using processor token
    const methodRes = await fetch(`${METHOD_BASE_URL(METHOD_ENV)}/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${METHOD_API_KEY}`,
      },
      body: JSON.stringify({
        holder_id: entity.method_entity_id,
        plaid: { plaid_token: procData.processor_token },
      }),
    });
    const methodData = await methodRes.json();
    if (!methodRes.ok) {
      console.error('Method /accounts failed:', methodData);
      return new Response(JSON.stringify({ error: 'Method account creation failed', details: methodData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const acct = methodData.data ?? methodData;
    const { data: saved, error: saveErr } = await service.from('method_accounts').upsert({
      household_id,
      entity_id: entity.id,
      method_account_id: acct.id,
      type: acct.type ?? 'ach',
      status: acct.status ?? 'active',
      mask: acct.ach?.mask ?? null,
      routing: acct.ach?.routing ?? null,
    }, { onConflict: 'method_account_id' }).select().single();
    if (saveErr) {
      console.error('DB save failed:', saveErr);
      return new Response(JSON.stringify({ error: saveErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ account: saved }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Unhandled:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
