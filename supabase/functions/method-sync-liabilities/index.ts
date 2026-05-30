// Phase 3b: Pull all liability accounts attached to the household's Method entity
// and upsert into method_liabilities. Safe to call after Connect completes or on a cron.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const METHOD_BASE_URL = (env: string) =>
  env === 'production' ? 'https://production.methodfi.com' : 'https://dev.methodfi.com';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  const METHOD_API_KEY = Deno.env.get('METHOD_API_KEY');
  const METHOD_ENV = Deno.env.get('METHOD_ENV') ?? 'dev';
  if (!METHOD_API_KEY) {
    return new Response(JSON.stringify({ error: 'METHOD_API_KEY missing' }), { status: 500, headers: corsHeaders });
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
    const { household_id } = await req.json();
    if (!household_id) {
      return new Response(JSON.stringify({ error: 'household_id required' }), {
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
    const { data: entity } = await service.from('method_entities')
      .select('method_entity_id').eq('household_id', household_id).maybeSingle();
    if (!entity?.method_entity_id) {
      return new Response(JSON.stringify({ error: 'Complete KYC first' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all liability accounts for this holder from Method
    const res = await fetch(
      `${METHOD_BASE_URL(METHOD_ENV)}/accounts?holder_id=${entity.method_entity_id}&type=liability`,
      { headers: { 'Authorization': `Bearer ${METHOD_API_KEY}` } }
    );
    const data = await res.json();
    if (!res.ok) {
      console.error('Method /accounts list failed:', data);
      return new Response(JSON.stringify({ error: 'Failed fetching liabilities', details: data }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const accounts: any[] = data.data ?? data ?? [];

    const rows = accounts.map((a) => ({
      household_id,
      method_entity_id: entity.method_entity_id,
      method_account_id: a.id,
      merchant_name: a.liability?.mch_id ?? a.liability?.merchant?.name ?? a.merchant_name ?? 'Unknown',
      mask: a.liability?.mask ?? null,
      balance: a.balance ?? a.liability?.balance ?? null,
      next_payment_minimum_amount: a.liability?.next_payment_minimum_amount ?? null,
      next_payment_due_date: a.liability?.next_payment_due_date ?? null,
      status: a.status ?? null,
    }));

    let upserted = 0;
    if (rows.length) {
      const { error } = await service.from('method_liabilities')
        .upsert(rows, { onConflict: 'method_account_id' });
      if (error) {
        console.error('Upsert failed:', error);
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      upserted = rows.length;
    }
    return new Response(JSON.stringify({ synced: upserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
