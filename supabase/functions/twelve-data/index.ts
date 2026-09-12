// SwingEdge Analyzer — Twelve Data proxy.
// The ONLY caller of TWELVE_DATA_API_KEY. The key is never returned to the
// client and never appears in any response body.
//
// This function is deliberately separate from the existing `market-data`
// function (Alpha Vantage), so the trading feature cannot disturb PrismBudget's
// investing pages.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const BASE = 'https://api.twelvedata.com';
const PROVIDER = 'TWELVE_DATA';

type Json = Record<string, unknown>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

const admin = () =>
  createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
    auth: { persistSession: false },
  });

const ALLOWED_INTERVALS = new Set(['1h', '4h', '1day', '1week']);
const SYMBOL_RE = /^[A-Z][A-Z0-9.\-]{0,9}$/;

interface CallResult {
  body: Json;
  creditsUsed: number | null;
  creditsLeft: number | null;
  rateLimited: boolean;
  errorMessage: string | null;
}

/** Single provider call. Reads the credit headers Twelve Data returns so we
 * never have to spend a credit on /api_usage for routine monitoring. */
async function call(path: string, params: Record<string, string>, apiKey: string): Promise<CallResult> {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('apikey', apiKey);

  const res = await fetch(url.toString());
  const creditsUsed = Number(res.headers.get('api-credits-used'));
  const creditsLeft = Number(res.headers.get('api-credits-left'));

  let body: Json = {};
  try {
    body = (await res.json()) as Json;
  } catch {
    body = {};
  }

  const code = Number(body['code'] ?? res.status);
  const message = typeof body['message'] === 'string' ? String(body['message']) : null;
  const failed = res.status >= 400 || (typeof body['status'] === 'string' && body['status'] === 'error');

  return {
    body,
    creditsUsed: Number.isFinite(creditsUsed) ? creditsUsed : null,
    creditsLeft: Number.isFinite(creditsLeft) ? creditsLeft : null,
    rateLimited: code === 429,
    errorMessage: failed ? (message ?? `Provider responded ${res.status}`) : null,
  };
}

async function recordStatus(patch: Json) {
  try {
    const db = admin();
    const { data } = await db
      .from('se_api_provider_status')
      .select('id, day_window_date, day_requests, minute_window_started_at, minute_requests, cache_hits, cache_misses, failed_requests, rate_limit_events')
      .eq('provider', PROVIDER)
      .maybeSingle();
    if (!data) return;
    await db.from('se_api_provider_status').update(patch).eq('id', data.id);
  } catch (e) {
    console.error('status update failed', e);
  }
}

/** Rolling counters plus a short lockout after repeated quota errors. */
async function tickCounters(opts: { failed?: boolean; rateLimited?: boolean; result?: CallResult }) {
  const db = admin();
  const { data } = await db
    .from('se_api_provider_status')
    .select('*')
    .eq('provider', PROVIDER)
    .maybeSingle();
  if (!data) return;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const minuteStart = data.minute_window_started_at ? new Date(data.minute_window_started_at) : null;
  const sameMinute = minuteStart !== null && now.getTime() - minuteStart.getTime() < 60_000;

  const rateLimitEvents = (data.rate_limit_events ?? 0) + (opts.rateLimited ? 1 : 0);

  const patch: Json = {
    minute_window_started_at: sameMinute ? data.minute_window_started_at : now.toISOString(),
    minute_requests: sameMinute ? (data.minute_requests ?? 0) + 1 : 1,
    day_window_date: today,
    day_requests: data.day_window_date === today ? (data.day_requests ?? 0) + 1 : 1,
    cache_misses: (data.cache_misses ?? 0) + 1,
    failed_requests: (data.failed_requests ?? 0) + (opts.failed ? 1 : 0),
    rate_limit_events: rateLimitEvents,
  };

  if (opts.result?.creditsUsed !== null && opts.result?.creditsUsed !== undefined) {
    patch.credits_used_reported = opts.result.creditsUsed;
  }
  if (opts.result?.creditsLeft !== null && opts.result?.creditsLeft !== undefined) {
    patch.credits_left_reported = opts.result.creditsLeft;
  }

  if (opts.rateLimited) {
    patch.connection_status = 'RATE_LIMITED';
    patch.locked_until = new Date(now.getTime() + 65_000).toISOString();
    patch.last_error = 'Market data limit reached.';
    patch.last_error_at = now.toISOString();
  } else if (opts.failed) {
    patch.connection_status = 'ERROR';
    patch.last_error = opts.result?.errorMessage ?? 'Unknown provider error';
    patch.last_error_at = now.toISOString();
  } else {
    patch.connection_status = 'CONNECTED';
    patch.last_success_at = now.toISOString();
    patch.locked_until = null;
    patch.last_error = null;
  }

  await db.from('se_api_provider_status').update(patch).eq('id', data.id);
}

async function lockedOut(): Promise<string | null> {
  const db = admin();
  const { data } = await db
    .from('se_api_provider_status')
    .select('locked_until')
    .eq('provider', PROVIDER)
    .maybeSingle();
  if (!data?.locked_until) return null;
  return new Date(data.locked_until).getTime() > Date.now() ? data.locked_until : null;
}

function normalizeCandles(body: Json) {
  const values = (body['values'] as Json[] | undefined) ?? [];
  return values
    .map((v) => ({
      datetime: String(v['datetime'] ?? ''),
      open: Number(v['open']),
      high: Number(v['high']),
      low: Number(v['low']),
      close: Number(v['close']),
      volume: Number(v['volume'] ?? 0),
    }))
    .filter((c) => c.datetime && Number.isFinite(c.close))
    .reverse(); // provider returns newest first; engine wants oldest first
}

async function storeCandles(symbol: string, interval: string, candles: ReturnType<typeof normalizeCandles>) {
  if (!candles.length) return;
  try {
    const db = admin();
    const newest = candles[candles.length - 1].datetime;
    const rows = candles.map((c) => ({
      symbol,
      interval,
      datetime: new Date(c.datetime).toISOString(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      provider: PROVIDER,
      is_final: c.datetime !== newest,
      fetched_at: new Date().toISOString(),
    }));
    // Chunked to keep payloads modest.
    for (let i = 0; i < rows.length; i += 500) {
      await db
        .from('se_market_data_cache')
        .upsert(rows.slice(i, i + 500), { onConflict: 'provider,symbol,interval,datetime' });
    }
  } catch (e) {
    console.error('cache write failed', e);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // Require a signed-in caller. Verification happens in code because these
  // functions deploy without gateway JWT checks.
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.startsWith('Bearer ')) {
    return json({ error: 'Sign in required.' }, 401);
  }
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } },
  );
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return json({ error: 'Sign in required.' }, 401);

  let payload: { action?: string; symbol?: string; symbols?: string[]; interval?: string; outputsize?: number; query?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const apiKey = Deno.env.get('TWELVE_DATA_API_KEY');
  if (!apiKey) {
    return json(
      {
        error: 'not_configured',
        connectionStatus: 'NOT_CONNECTED',
        message: 'Market data is not connected yet. SwingEdge is running on demo data.',
      },
      200,
    );
  }

  const action = (payload.action ?? 'quote').toLowerCase();
  const symbol = (payload.symbol ?? '').trim().toUpperCase();

  if (action !== 'search' && action !== 'market_status' && action !== 'test' && action !== 'batch_quotes') {
    if (!SYMBOL_RE.test(symbol)) return json({ error: 'A valid symbol is required.' }, 400);
  }

  const locked = await lockedOut();
  if (locked && action !== 'test') {
    return json(
      {
        error: 'rate_limited',
        connectionStatus: 'RATE_LIMITED',
        lockedUntil: locked,
        message: 'Market data limit reached. SwingEdge is temporarily using cached data.',
      },
      200,
    );
  }

  try {
    if (action === 'test') {
      const result = await call('/quote', { symbol: 'SPY' }, apiKey);
      await tickCounters({ failed: !!result.errorMessage, rateLimited: result.rateLimited, result });
      if (result.errorMessage) {
        return json({
          ok: false,
          connectionStatus: result.rateLimited ? 'RATE_LIMITED' : 'ERROR',
          message: result.errorMessage,
          creditsLeft: result.creditsLeft,
        });
      }
      return json({
        ok: true,
        connectionStatus: 'CONNECTED',
        message: 'Connected to Twelve Data.',
        creditsUsed: result.creditsUsed,
        creditsLeft: result.creditsLeft,
      });
    }

    if (action === 'time_series') {
      const interval = String(payload.interval ?? '1day');
      if (!ALLOWED_INTERVALS.has(interval)) return json({ error: 'Unsupported interval.' }, 400);
      const outputsize = Math.min(Math.max(Number(payload.outputsize ?? 250) || 250, 30), 500);
      const result = await call('/time_series', { symbol, interval, outputsize: String(outputsize) }, apiKey);
      await tickCounters({ failed: !!result.errorMessage, rateLimited: result.rateLimited, result });
      if (result.errorMessage) {
        return json({
          error: result.rateLimited ? 'rate_limited' : 'provider_error',
          connectionStatus: result.rateLimited ? 'RATE_LIMITED' : 'ERROR',
          message: result.errorMessage,
        }, 200);
      }
      const candles = normalizeCandles(result.body);
      await storeCandles(symbol, interval, candles);
      return json({ symbol, interval, candles, creditsLeft: result.creditsLeft });
    }

    if (action === 'quote' || action === 'batch_quotes') {
      const list =
        action === 'batch_quotes'
          ? (payload.symbols ?? []).map((s) => String(s).trim().toUpperCase()).filter((s) => SYMBOL_RE.test(s)).slice(0, 8)
          : [symbol];
      if (!list.length) return json({ error: 'No valid symbols supplied.' }, 400);
      const result = await call('/quote', { symbol: list.join(',') }, apiKey);
      await tickCounters({ failed: !!result.errorMessage, rateLimited: result.rateLimited, result });
      if (result.errorMessage) {
        return json({
          error: result.rateLimited ? 'rate_limited' : 'provider_error',
          connectionStatus: result.rateLimited ? 'RATE_LIMITED' : 'ERROR',
          message: result.errorMessage,
        }, 200);
      }
      const raw = result.body;
      const entries = list.length === 1 ? [raw] : list.map((s) => (raw[s] as Json) ?? {});
      const quotes = entries
        .map((q) => ({
          symbol: String(q['symbol'] ?? ''),
          price: Number(q['close']),
          previousClose: Number(q['previous_close']),
          change: Number(q['change']),
          changePercent: Number(q['percent_change']),
          volume: Number(q['volume'] ?? 0),
          asOf: new Date().toISOString(),
        }))
        .filter((q) => q.symbol && Number.isFinite(q.price));
      return json({ quotes, creditsLeft: result.creditsLeft });
    }

    if (action === 'search') {
      const q = (payload.query ?? '').trim().slice(0, 40);
      if (!q) return json({ error: 'query is required' }, 400);
      const result = await call('/symbol_search', { symbol: q, outputsize: '15' }, apiKey);
      await tickCounters({ failed: !!result.errorMessage, rateLimited: result.rateLimited, result });
      const rows = (result.body['data'] as Json[] | undefined) ?? [];
      return json({
        matches: rows
          .filter((r) => String(r['country'] ?? '') === 'United States')
          .map((r) => ({
            symbol: String(r['symbol'] ?? ''),
            name: String(r['instrument_name'] ?? ''),
            assetType: String(r['instrument_type'] ?? 'stock'),
            exchange: String(r['exchange'] ?? ''),
          })),
      });
    }

    if (action === 'market_status') {
      const result = await call('/market_state', { exchange: 'NYSE' }, apiKey);
      await tickCounters({ failed: !!result.errorMessage, rateLimited: result.rateLimited, result });
      const rows = Array.isArray(result.body) ? (result.body as unknown as Json[]) : [];
      const first = rows[0] ?? {};
      return json({
        isOpen: Boolean(first['is_market_open']),
        exchange: String(first['name'] ?? 'NYSE'),
        asOf: new Date().toISOString(),
      });
    }

    if (action === 'earnings') {
      // Capability-aware: earnings endpoints are plan-gated and cost far more
      // than /time_series. Unavailable is a normal answer, not a failure.
      const result = await call('/earnings', { symbol, outputsize: '4' }, apiKey);
      if (result.errorMessage) {
        await recordStatus({ supports_earnings: false });
        return json({
          available: false,
          reason:
            result.rateLimited
              ? 'Not enough market data credits available right now.'
              : 'Earnings data unavailable on the connected plan.',
        });
      }
      await tickCounters({ result });
      await recordStatus({ supports_earnings: true });
      const rows = (result.body['earnings'] as Json[] | undefined) ?? [];
      return json({ available: true, nextDate: rows[0] ? String(rows[0]['date'] ?? '') : null });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Market data request failed.';
    await recordStatus({
      connection_status: 'ERROR',
      last_error: message,
      last_error_at: new Date().toISOString(),
    });
    return json({ error: 'provider_error', connectionStatus: 'ERROR', message }, 200);
  }
});
