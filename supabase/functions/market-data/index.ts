// Market data proxy (Alpha Vantage). Keeps the API key server-side.
// Actions: quote (price + validated security type), holdings (ETF underlying holdings), search.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const BASE = 'https://www.alphavantage.co/query';

type Json = Record<string, unknown>;

function json(body: Json, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function av(params: Record<string, string>, apiKey: string): Promise<Json> {
  const url = new URL(BASE);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  url.searchParams.set('apikey', apiKey);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Alpha Vantage ${res.status}`);
  const body = (await res.json()) as Json;
  if (typeof body['Note'] === 'string') throw new Error('Alpha Vantage rate limit reached — try again in a minute.');
  if (typeof body['Information'] === 'string') throw new Error(String(body['Information']));
  if (typeof body['Error Message'] === 'string') throw new Error(String(body['Error Message']));
  return body;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const apiKey = Deno.env.get('ALPHAVANTAGE_API_KEY');
  if (!apiKey) return json({ error: 'Market data is not configured (missing API key).' }, 500);

  let body: { action?: string; symbol?: string; query?: string };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const action = (body.action ?? 'quote').toLowerCase();
  const symbol = (body.symbol ?? '').trim().toUpperCase();

  try {
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

    let securityType = 'unverified';
    let name: string | null = null;
    let sector: string | null = null;
    let industry: string | null = null;

    try {
      const profile = await av({ function: 'ETF_PROFILE', symbol }, apiKey);
      const holdings = (profile['holdings'] as Json[] | undefined) ?? [];
      if (holdings.length > 0) securityType = 'etf';
    } catch {
      // not an ETF or lookup failed — fall through to OVERVIEW
    }

    if (securityType === 'unverified') {
      try {
        const overview = await av({ function: 'OVERVIEW', symbol }, apiKey);
        const assetType = String(overview['AssetType'] ?? '').toLowerCase();
        name = (overview['Name'] as string) || null;
        sector = (overview['Sector'] as string) || null;
        industry = (overview['Industry'] as string) || null;
        if (assetType.includes('etf')) securityType = 'etf';
        else if (assetType.includes('common stock') || assetType === 'equity') securityType = 'stock';
        else if (assetType.includes('mutual fund')) securityType = 'mutual_fund';
      } catch {
        // leave unverified — the UI shows "Instrument requires verification"
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
      asOf: new Date().toISOString(),
    });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Market data lookup failed' }, 502);
  }
});
