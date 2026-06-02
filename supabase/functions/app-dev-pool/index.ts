// Hub endpoint for the shared App-Dev Pool across all founder apps.
// Other apps POST { app_name, amount_usd, credits, note, founder_email, timestamp }
// signed with HMAC-SHA256(APP_DEV_POOL_HMAC_SECRET) over the raw JSON body.
// Header: x-pool-signature: <hex>
// Also supports GET ?email=<founder_email> for the hub UI to fetch aggregated usage.

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-pool-signature',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const secret = Deno.env.get('APP_DEV_POOL_HMAC_SECRET');
  if (!secret) return json({ error: 'hub not configured' }, 500);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // GET — read aggregated usage for the founder email (used by hub UI via authed fetch)
  if (req.method === 'GET') {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    const email = user?.email;
    if (!email) return json({ error: 'unauthorized' }, 401);

    const now = new Date();
    const periodStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;

    const { data, error } = await supabase
      .from('app_dev_pool_log')
      .select('app_name, amount_usd, credits_used, created_at, note, source')
      .eq('founder_email', email)
      .is('deleted_at', null)
      .gte('created_at', periodStart)
      .order('created_at', { ascending: false });

    if (error) return json({ error: error.message }, 500);
    return json({ entries: data ?? [] });
  }

  // POST — ingest a charge from another app
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const rawBody = await req.text();
  const provided = req.headers.get('x-pool-signature') ?? '';
  const expected = await hmacHex(secret, rawBody);
  if (!provided || !timingSafeEqual(provided, expected)) {
    return json({ error: 'invalid signature' }, 401);
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch { return json({ error: 'invalid json' }, 400); }

  const { app_name, founder_email, amount_usd = 0, credits = 0, note = null } = body ?? {};
  if (typeof app_name !== 'string' || !app_name) return json({ error: 'app_name required' }, 400);
  if (typeof founder_email !== 'string' || !founder_email) return json({ error: 'founder_email required' }, 400);
  if (typeof amount_usd !== 'number' || typeof credits !== 'number') {
    return json({ error: 'amount_usd and credits must be numbers' }, 400);
  }

  const { error } = await supabase.from('app_dev_pool_log').insert({
    founder_email,
    app_name,
    amount_usd,
    credits_used: credits,
    note,
    source: 'edge',
  });
  if (error) return json({ error: error.message }, 500);

  return json({ ok: true });
});
