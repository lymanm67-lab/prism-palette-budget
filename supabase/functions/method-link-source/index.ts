// Guard endpoint: Method does not accept Plaid processor tokens as ACH funding sources.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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

    return new Response(JSON.stringify({
      error: 'Direct Plaid bank funding is not supported by Method. Use Connect Bills for biller linking; ACH funding must be added with verified routing and account details.',
      error_code: 'METHOD_PLAID_FUNDING_UNSUPPORTED',
    }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Unhandled:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
