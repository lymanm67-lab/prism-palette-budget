// Market data proxy (Alpha Vantage). Keeps the API key server-side.
// Actions: quote (price + validated security type), holdings (ETF underlying holdings),
// search, fundamentals (company / fund figures for SwingEdge, cached).
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { getFundamentals, type Depth } from './fundamentals.ts';

const BASE = 'https://www.alphavantage.co/query';

// Canonical instruments in the Prism Five Investment Roles. These exact
// symbols were validated against provider search results; retaining that
// classification prevents quote throttling from reverting them to unknown.
const VALIDATED_ROLE_SECURITIES: Record<string, { name: string; type: string }> = {
  SPMO: { name: 'Invesco S&P 500 Momentum ETF', type: 'etf' },
  DRAM: { name: 'Roundhill Memory ETF', type: 'etf' },
  IAU: { name: 'iShares Gold Trust', type: 'etf' },
  ISU: { name: 'iShares U.S. Utilities ETF', type: 'etf' },
  QTUM: { name: 'Defiance Quantum ETF', type: 'etf' },
  LYTE: { name: 'Roundhill Photonics & Optics ETF', type: 'etf' },
  ITA: { name: 'iShares U.S. Aerospace & Defense ETF', type: 'etf' },
};

type Json = Record<string, unknown>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

class RateLimitError extends Error {}

function looksRateLimited(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('rate limit') || m.includes('requests per day') || m.includes('more sparingly') || m.includes('premium');
}

async function av(params: Record<string, string>, apiKey: string): Promise<Json> {
  const url = new URL(BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('apikey', apiKey);
  const res = await fetch(url.toString());
  if (res.status === 429) throw new RateLimitError('Market data provider limit reached — try again later.');
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);
  const body = (await res.json()) as Json;
  if (typeof body['Note'] === 'string') throw new RateLimitError('Market data provider limit reached — try again in a minute.');
  if (typeof body['Information'] === 'string') {
    const info = String(body['Information']);
    throw looksRateLimited(info) ? new RateLimitError('Daily market data limit reached — figures will refresh tomorrow.') : new Error(info);
  }
  if (typeof body['Error Message'] === 'string') throw new Error(String(body['Error Message']));
  return body;
}

/** Alpha Vantage CSV endpoints (the earnings calendar is one). Returns rows of cells. */
async function avCsv(params: Record<string, string>, apiKey: string): Promise<string[][]> {
  const url = new URL(BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('apikey', apiKey);
  const res = await fetch(url.toString());
  if (res.status === 429) throw new RateLimitError('Market data provider limit reached — try again later.');
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    const body = JSON.parse(trimmed) as Json;
    const info = String(body['Information'] ?? body['Note'] ?? body['Error Message'] ?? '');
    if (info) throw looksRateLimited(info) ? new RateLimitError('Daily market data limit reached — figures will refresh tomorrow.') : new Error(info);
    return [];
  }
  return trimmed
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line) => line.split(','));
}


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
  if (!apiKey) return json({ error: 'Market data is not configured (missing API key).' }, 500);

  let body: {
    action?: string;
    symbol?: string;
    symbols?: string[];
    query?: string;
    assetType?: string;
    depth?: string;
    force?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = (body.action ?? 'quote').toLowerCase();
  const symbol = (body.symbol ?? '').trim().toUpperCase();

  try {
    // Earnings for many symbols at once. The provider's calendar is one CSV for
    // the whole market, so a scan costs a single call instead of one per name.
    if (action === 'earnings_batch') {
      const wanted = (body.symbols ?? [])
        .map((s) => String(s).trim().toUpperCase())
        .filter((s) => s.length > 0);
      if (!wanted.length) return json({ error: 'symbols is required' }, 400);
      const rows = await avCsv({ function: 'EARNINGS_CALENDAR', horizon: '3month' }, apiKey);
      const head = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
      const symIdx = head.indexOf('symbol');
      const dateIdx = head.indexOf('reportdate');
      const want = new Set(wanted);
      const earliest: Record<string, string> = {};
      if (symIdx >= 0 && dateIdx >= 0) {
        for (const r of rows.slice(1)) {
          const sym = (r[symIdx] ?? '').trim().toUpperCase();
          if (!want.has(sym)) continue;
          const date = (r[dateIdx] ?? '').trim();
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
          if (!earliest[sym] || date < earliest[sym]) earliest[sym] = date;
        }
      }
      return json({
        fetchedAt: new Date().toISOString(),
        earnings: wanted.map((sym) => ({
          symbol: sym,
          date: earliest[sym] ?? null,
          certainty: earliest[sym] ? 'ESTIMATED' : 'UNKNOWN',
          timing: 'TIME_UNKNOWN',
          source: earliest[sym] ? 'Alpha Vantage earnings calendar' : null,
        })),
      } as unknown as Json);
    }

    if (action === 'fundamentals') {
      if (!symbol) return json({ error: 'symbol is required' }, 400);
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const hint = (body.assetType ?? '').toUpperCase();
      const payload = await getFundamentals(
        {
          av: (params) => av(params, apiKey),
          supabaseUrl,
          serviceKey,
        },
        symbol,
        hint === 'ETF' ? 'ETF' : hint === 'STOCK' ? 'STOCK' : null,
        (body.depth === 'full' ? 'full' : 'basic') as Depth,
        body.force === true,
      );
      return json(payload as unknown as Json);
    }

    if (action === 'search') {
      const q = (body.query ?? '').trim();
      if (!q) return json({ error: 'query is required' }, 400);
      const data = await av({ function: 'SYMBOL_SEARCH', keywords: q }, apiKey);
      const matches = (data['bestMatches'] as Json[] | undefined) ?? [];
      return json({
        matches: matches.map((m) => ({
          symbol: String(m['1. symbol'] ?? ''),
          name: String(m['2. name'] ?? ''),
          type: String(m['3. type'] ?? ''),
          region: String(m['4. region'] ?? ''),
        })),
      });
    }

    if (!symbol) return json({ error: 'symbol is required' }, 400);

    // Earnings calendar. Alpha Vantage returns CSV here, and its dates are
    // provider estimates unless a company has confirmed the date, so the
    // certainty is reported as ESTIMATED and never upgraded on our side.
    if (action === 'earnings') {
      const rows = await avCsv({ function: 'EARNINGS_CALENDAR', symbol, horizon: '3month' }, apiKey);
      const head = rows[0]?.map((h) => h.trim().toLowerCase()) ?? [];
      const symIdx = head.indexOf('symbol');
      const dateIdx = head.indexOf('reportdate');
      const next = rows
        .slice(1)
        .filter((r) => (symIdx >= 0 ? (r[symIdx] ?? '').trim().toUpperCase() === symbol : true))
        .map((r) => (dateIdx >= 0 ? (r[dateIdx] ?? '').trim() : ''))
        .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
        .sort()[0] ?? null;

      return json({
        symbol,
        date: next,
        // The provider does not publish the session, so it stays unknown.
        certainty: next ? 'ESTIMATED' : 'UNKNOWN',
        timing: 'TIME_UNKNOWN',
        source: next ? 'Alpha Vantage earnings calendar' : null,
        fetchedAt: new Date().toISOString(),
      });
    }


    if (action === 'holdings') {
      const data = await av({ function: 'ETF_PROFILE', symbol }, apiKey);
      const holdings = (data['holdings'] as Json[] | undefined) ?? [];
      const sectors = (data['sectors'] as Json[] | undefined) ?? [];
      return json({
        symbol,
        isEtf: holdings.length > 0,
        expenseRatio: data['net_expense_ratio'] ? Number(data['net_expense_ratio']) * 100 : null,
        dividendYield: data['dividend_yield'] ? Number(data['dividend_yield']) * 100 : null,
        holdings: holdings.map((h) => ({
          symbol: String(h['symbol'] ?? '') || null,
          name: String(h['description'] ?? h['symbol'] ?? 'Unknown'),
          weightPct: Number(h['weight'] ?? 0) * 100,
        })),
        sectors: sectors.map((s) => ({
          sector: String(s['sector'] ?? ''),
          weightPct: Number(s['weight'] ?? 0) * 100,
        })),
      });
    }

    // quote + security-type validation
    const quote = await av({ function: 'GLOBAL_QUOTE', symbol }, apiKey);
    const q = (quote['Global Quote'] as Json | undefined) ?? {};
    const price = q['05. price'] ? Number(q['05. price']) : null;

    const validatedRoleSecurity = VALIDATED_ROLE_SECURITIES[symbol];
    let securityType = validatedRoleSecurity?.type ?? 'unverified';
    let name: string | null = validatedRoleSecurity?.name ?? null;
    let sector: string | null = null;
    let industry: string | null = null;
    let dividendYield: number | null = null;
    let expenseRatio: number | null = null;

    // SYMBOL_SEARCH is the most reliable low-cost source for instrument type.
    // Run it before premium profile calls so a profile/rate-limit failure cannot
    // leave a valid ETF or stock marked as unverified.
    try {
      const search = await av({ function: 'SYMBOL_SEARCH', keywords: symbol }, apiKey);
      const matches = (search['bestMatches'] as Json[] | undefined) ?? [];
      const exact = matches.find((m) => String(m['1. symbol'] ?? '').toUpperCase() === symbol);
      if (exact) {
        name = String(exact['2. name'] ?? '') || null;
        const t = String(exact['3. type'] ?? '').toLowerCase();
        if (t === 'etf') securityType = 'etf';
        else if (t === 'equity' || t.includes('stock')) securityType = 'stock';
        else if (t.includes('mutual')) securityType = 'mutual_fund';
      }
    } catch {
      // Continue to the detailed fallbacks below.
    }

    if (securityType === 'etf') {
      try {
        const profile = await av({ function: 'ETF_PROFILE', symbol }, apiKey);
        if (profile['dividend_yield']) dividendYield = Number(profile['dividend_yield']) * 100;
        if (profile['net_expense_ratio']) expenseRatio = Number(profile['net_expense_ratio']) * 100;
      } catch {
        // Classification from exact symbol search remains valid.
      }
    } else if (securityType === 'unverified') {
      try {
        const overview = await av({ function: 'OVERVIEW', symbol }, apiKey);
        const assetType = String(overview['AssetType'] ?? '').toLowerCase();
        name = (overview['Name'] as string) || name;
        sector = (overview['Sector'] as string) || null;
        industry = (overview['Industry'] as string) || null;
        if (overview['DividendYield']) dividendYield = Number(overview['DividendYield']) * 100;
        if (assetType.includes('etf')) securityType = 'etf';
        else if (assetType.includes('common stock') || assetType === 'equity') securityType = 'stock';
        else if (assetType.includes('mutual fund')) securityType = 'mutual_fund';
      } catch {
        // Leave genuinely unknown instruments unverified for manual review.
      }
    }

    return json({
      symbol,
      price,
      name,
      securityType,
      verified: securityType !== 'unverified',
      sector,
      industry,
      dividendYield: Number.isFinite(dividendYield as number) ? dividendYield : null,
      expenseRatio: Number.isFinite(expenseRatio as number) ? expenseRatio : null,
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Market data lookup failed';
    // Provider limits are expected on the free plan: degrade instead of failing
    // the request, so the page keeps rendering with the data it already has.
    if (err instanceof RateLimitError || looksRateLimited(message)) {
      return json({
        symbol: (body.symbol ?? '').toUpperCase() || null,
        price: null,
        name: null,
        securityType: 'unverified',
        verified: false,
        sector: null,
        industry: null,
        dividendYield: null,
        expenseRatio: null,
        rateLimited: true,
        notice: message,
        asOf: new Date().toISOString(),
      });
    }
    // Provider-side refusals (unknown symbol, restricted endpoint, no figures)
    // are answered with 200 and an error field. Callers already read that field,
    // and this way the real reason reaches the user instead of a generic
    // "non-2xx status" from the function client.
    return json({ error: message, unavailable: true, symbol: symbol || null, asOf: new Date().toISOString() }, 200);
  }
});
