// Phase 2: Method does not accept Plaid processor tokens as ACH funding sources.
// Keep this endpoint as a safe guard so older UI flows fail gracefully instead of
// surfacing Plaid's INVALID_PROCESSOR as an app-level error.
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


    return new Response(JSON.stringify({
      error: 'Direct Plaid bank funding is not supported by Method. Use Connect Bills for biller linking; ACH funding must be added with verified routing and account details.',
      error_code: 'METHOD_PLAID_FUNDING_UNSUPPORTED',
    }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

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
