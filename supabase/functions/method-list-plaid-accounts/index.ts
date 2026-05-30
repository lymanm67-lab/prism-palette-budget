// Helper for Phase 2 UI: list the Plaid accounts for a given plaid_items row
// so the user can pick which one to convert into a Method ACH source.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const PLAID_BASE_URL = 'https://production.plaid.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const PLAID_CLIENT_ID = Deno.env.get('PLAID_CLIENT_ID');
  const PLAID_SECRET = Deno.env.get('PLAID_SECRET');
  if (!PLAID_CLIENT_ID || !PLAID_SECRET) {
    return new Response(JSON.stringify({ error: 'Plaid creds missing' }), { status: 500, headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: claimsData } = await supabase.auth.getClaims(authHeader.replace('Bearer ', ''));
  if (!claimsData?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
  }
  const userId = claimsData.claims.sub;

  try {
    const { household_id, plaid_item_db_id } = await req.json();
    if (!household_id || !plaid_item_db_id) {
      return new Response(JSON.stringify({ error: 'household_id + plaid_item_db_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: member } = await supabase.from('household_members')
      .select('id').eq('household_id', household_id).eq('user_id', userId).maybeSingle();
    if (!member) {
      return new Response(JSON.stringify({ error: 'Not a household member' }), { status: 403, headers: corsHeaders });
    }

    const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: item } = await service.from('plaid_items')
      .select('plaid_access_token').eq('id', plaid_item_db_id).eq('household_id', household_id).maybeSingle();
    if (!item?.plaid_access_token) {
      return new Response(JSON.stringify({ error: 'Plaid item not found' }), { status: 404, headers: corsHeaders });
    }
    if (!item.plaid_access_token.startsWith('access-production-')) {
      return new Response(JSON.stringify({ error: 'This bank connection must be reconnected before it can be used for bill pay.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const res = await fetch(`${PLAID_BASE_URL}/accounts/get`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: PLAID_CLIENT_ID, secret: PLAID_SECRET, access_token: item.plaid_access_token }),
    });
    const data = await res.json();
    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Plaid /accounts/get failed', details: data }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Only return depository (checking/savings) — those are valid Method ACH sources
    const accounts = (data.accounts ?? [])
      .filter((a: any) => a.type === 'depository')
      .map((a: any) => ({
        account_id: a.account_id,
        name: a.name || a.official_name,
        mask: a.mask,
        subtype: a.subtype,
      }));
    return new Response(JSON.stringify({ accounts }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
