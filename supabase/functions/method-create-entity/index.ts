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
    return new Response(JSON.stringify({ error: 'METHOD_API_KEY not configured' }), {
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
    const body = await req.json();
    const { household_id, first_name, last_name, phone, email, dob } = body ?? {};

    if (!household_id || !first_name || !last_name || !phone || !email) {
      return new Response(JSON.stringify({ error: 'Missing required fields: household_id, first_name, last_name, phone, email' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify the caller is a member of this household
    const { data: memberCheck } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', household_id)
      .eq('user_id', userId)
      .maybeSingle();
    if (!memberCheck) {
      return new Response(JSON.stringify({ error: 'Not a member of this household' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if entity already exists for this household
    const { data: existing } = await supabase
      .from('method_entities')
      .select('id, method_entity_id, status')
      .eq('household_id', household_id)
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ entity: existing, already_exists: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Method entity
    const methodRes = await fetch(`${METHOD_BASE_URL(METHOD_ENV)}/entities`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${METHOD_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'individual',
        individual: {
          first_name,
          last_name,
          phone,
          email,
          dob: dob ?? undefined,
        },
      }),
    });

    const methodData = await methodRes.json();
    if (!methodRes.ok) {
      console.error('Method API error', methodData);
      return new Response(JSON.stringify({ error: 'Method API error', details: methodData }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const methodEntityId = methodData?.data?.id ?? methodData?.id;
    const status = methodData?.data?.status ?? methodData?.status ?? 'pending';
    const capabilities = methodData?.data?.capabilities ?? methodData?.capabilities ?? {};

    // Persist (uses service role to bypass RLS safely after our membership check)
    const svc = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { data: inserted, error: insertError } = await svc
      .from('method_entities')
      .insert({
        household_id,
        user_id: userId,
        method_entity_id: methodEntityId,
        status,
        capabilities,
        kyc_first_name: first_name,
        kyc_last_name: last_name,
        kyc_phone: phone,
        kyc_email: email,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Insert error', insertError);
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ entity: inserted }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
