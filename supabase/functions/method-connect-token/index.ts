// Phase 3a: Mint a Method Element token for the Connect flow so the user can
// authenticate with their billers and surface liabilities.
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
    return new Response(JSON.stringify({ error: 'METHOD_API_KEY missing' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
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

    const res = await fetch(`${METHOD_BASE_URL(METHOD_ENV)}/elements/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${METHOD_API_KEY}`,
      },
      body: JSON.stringify({
        type: 'connect',
        entity_id: entity.method_entity_id,
        connect: { products: ['liability'] },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Method element token failed:', data);
      return new Response(JSON.stringify({ error: 'Element token failed', details: data }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const element_token = data.data?.element_token ?? data.element_token;
    return new Response(JSON.stringify({ element_token }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
