// Alpha Vantage company / fund figures for SwingEdge.
// Twelve Data stays the price and chart provider; this file only supplies the
// business side. Cached in the shared se_fundamental_cache table so the free
// daily request allowance is not spent twice on the same symbol.

type Json = Record<string, unknown>;

export type Depth = 'basic' | 'full';

const CACHE_DAYS = 30;
const PROVIDER = 'ALPHA_VANTAGE';

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s || s === 'None' || s === '-' || s === 'NaN') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const pct = (v: unknown): number | null => {
  const n = num(v);
  return n === null ? null : n * 100;
};
const growth = (curr: number | null, prior: number | null): number | null =>
  curr === null || prior === null || prior === 0 ? null : ((curr - prior) / Math.abs(prior)) * 100;

export interface FundamentalPayload {
  symbol: string;
  assetType: 'STOCK' | 'ETF';
  profile: {
    symbol: string;
    name: string | null;
    sector: string | null;
    industry: string | null;
    assetType: 'STOCK' | 'ETF';
    exchange: string | null;
  } | null;
  metrics: Json;
  etf: Json | null;
  as_of: string | null;
  periods: number;
  provider: string;
  cached: boolean;
  fetched_at: string;
  depth: Depth;
  stale: boolean;
  note: string | null;
  requests_used: number;
}

/** OVERVIEW alone covers profitability, valuation and headline growth: one request. */
function fromOverview(o: Json) {
  const revenue = num(o['RevenueTTM']);
  const grossProfit = num(o['GrossProfitTTM']);
  return {
    metrics: {
      revenueGrowthYoY: pct(o['QuarterlyRevenueGrowthYOY']),
      epsGrowthYoY: pct(o['QuarterlyEarningsGrowthYOY']),
      grossMargin: revenue && grossProfit ? (grossProfit / revenue) * 100 : null,
      operatingMargin: pct(o['OperatingMarginTTM']),
      netMargin: pct(o['ProfitMargin']),
      returnOnEquity: pct(o['ReturnOnEquityTTM']),
      returnOnAssets: pct(o['ReturnOnAssetsTTM']),
      peRatio: num(o['PERatio']),
      forwardPe: num(o['ForwardPE']),
      pegRatio: num(o['PEGRatio']),
      priceToSales: num(o['PriceToSalesRatioTTM']),
      priceToBook: num(o['PriceToBookRatio']),
      evToEbitda: num(o['EVToEBITDA']),
    } as Json,
    profile: {
      symbol: String(o['Symbol'] ?? ''),
      name: (o['Name'] as string) || null,
      sector: (o['Sector'] as string) || null,
      industry: (o['Industry'] as string) || null,
      assetType: 'STOCK' as const,
      exchange: (o['Exchange'] as string) || null,
    },
    asOf: (o['LatestQuarter'] as string) || null,
  };
}

/** Statements add balance-sheet strength, cash flow and multi-year trend: three more requests. */
function fromStatements(income: Json, balance: Json, cash: Json) {
  const ia = (income['annualReports'] as Json[] | undefined) ?? [];
  const ba = (balance['annualReports'] as Json[] | undefined) ?? [];
  const ca = (cash['annualReports'] as Json[] | undefined) ?? [];
  const i0 = ia[0] ?? {};
  const i1 = ia[1] ?? {};
  const i2 = ia[2] ?? {};
  const b0 = ba[0] ?? {};
  const b1 = ba[1] ?? {};
  const c0 = ca[0] ?? {};
  const c1 = ca[1] ?? {};

  const equity = num(b0['totalShareholderEquity']);
  const equityPrior = num(b1['totalShareholderEquity']);
  const debt = num(b0['shortLongTermDebtTotal']) ?? num(b0['longTermDebt']);
  const debtPrior = num(b1['shortLongTermDebtTotal']) ?? num(b1['longTermDebt']);
  const ocf = num(c0['operatingCashflow']);
  const ocfPrior = num(c1['operatingCashflow']);
  const capex = num(c0['capitalExpenditures']);
  const capexPrior = num(c1['capitalExpenditures']);
  const ebit = num(i0['ebit']) ?? num(i0['operatingIncome']);
  const interest = num(i0['interestExpense']);
  const currentAssets = num(b0['totalCurrentAssets']);
  const currentLiabilities = num(b0['totalCurrentLiabilities']);

  return {
    metrics: {
      revenueGrowthPriorYoY: growth(num(i1['totalRevenue']), num(i2['totalRevenue'])),
      netIncomeGrowthYoY: growth(num(i0['netIncome']), num(i1['netIncome'])),
      operatingMarginPrior:
        num(i1['totalRevenue']) && (num(i1['ebit']) ?? num(i1['operatingIncome'])) !== null
          ? ((num(i1['ebit']) ?? num(i1['operatingIncome']))! / num(i1['totalRevenue'])!) * 100
          : null,
      netIncome: num(i0['netIncome']),
      operatingCashFlow: ocf,
      freeCashFlow: ocf !== null && capex !== null ? ocf - Math.abs(capex) : null,
      freeCashFlowPrior: ocfPrior !== null && capexPrior !== null ? ocfPrior - Math.abs(capexPrior) : null,
      debtToEquity: debt !== null && equity ? debt / equity : null,
      debtToEquityPrior: debtPrior !== null && equityPrior ? debtPrior / equityPrior : null,
      currentRatio: currentAssets !== null && currentLiabilities ? currentAssets / currentLiabilities : null,
      cashAndEquivalents: num(b0['cashAndCashEquivalentsAtCarryingValue']),
      totalDebt: debt,
      interestCoverage: ebit !== null && interest ? ebit / Math.abs(interest) : null,
    } as Json,
    periods: Math.min(ia.length, Math.max(ba.length, 1)),
    asOf: (i0['fiscalDateEnding'] as string) || null,
  };
}

function fromEtfProfile(p: Json) {
  const holdings = (p['holdings'] as Json[] | undefined) ?? [];
  const sectors = (p['sectors'] as Json[] | undefined) ?? [];
  const topTen = holdings
    .slice(0, 10)
    .reduce((sum, h) => sum + (num(h['weight']) ?? 0) * 100, 0);
  const largestSector = sectors.reduce((max, s) => Math.max(max, (num(s['weight']) ?? 0) * 100), 0);
  return {
    avgDollarVolume: null,
    spreadPct: null,
    netAssets: num(p['net_assets']),
    expenseRatio: pct(p['net_expense_ratio']),
    holdingsCount: holdings.length || null,
    topTenWeightPct: holdings.length ? topTen : null,
    largestSectorWeightPct: sectors.length ? largestSector : null,
    annualVolatilityPct: null,
    trackingErrorPct: null,
    fundAgeYears: p['inception_date']
      ? Math.max(
          0,
          (Date.now() - new Date(String(p['inception_date'])).getTime()) / (365.25 * 24 * 3600 * 1000),
        )
      : null,
    leveraged: null,
    inverse: null,
    singleStock: holdings.length === 1 ? true : holdings.length > 1 ? false : null,
    leverageFactor: null,
    benchmark: null,
  } as Json;
}

const stripNulls = (o: Json): Json =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== null && v !== undefined));

interface Deps {
  av: (params: Record<string, string>) => Promise<Json>;
  supabaseUrl: string;
  serviceKey: string;
}

async function readCache(deps: Deps, symbol: string): Promise<Json | null> {
  const url =
    `${deps.supabaseUrl}/rest/v1/se_fundamental_cache?symbol=eq.${symbol}&provider=eq.${PROVIDER}&select=*&limit=1`;
  const res = await fetch(url, {
    headers: { apikey: deps.serviceKey, Authorization: `Bearer ${deps.serviceKey}` },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as Json[];
  return rows[0] ?? null;
}

async function writeCache(deps: Deps, row: Json) {
  await fetch(`${deps.supabaseUrl}/rest/v1/se_fundamental_cache?on_conflict=symbol,provider`, {
    method: 'POST',
    headers: {
      apikey: deps.serviceKey,
      Authorization: `Bearer ${deps.serviceKey}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });
}

function payloadFromCache(cached: Json, stale: boolean, note: string | null): FundamentalPayload {
  const assetType = String(cached['asset_type'] ?? 'STOCK').toUpperCase() === 'ETF' ? 'ETF' : 'STOCK';
  const symbol = String(cached['symbol']);
  return {
    symbol,
    assetType,
    profile:
      cached['sector'] || cached['industry'] || cached['company_name']
        ? {
            symbol,
            name: (cached['company_name'] as string) ?? null,
            sector: (cached['sector'] as string) ?? null,
            industry: (cached['industry'] as string) ?? null,
            assetType,
            exchange: null,
          }
        : null,
    metrics: (cached['metrics'] as Json) ?? {},
    etf: assetType === 'ETF' ? ((cached['etf_metrics'] as Json) ?? {}) : null,
    as_of: (cached['as_of'] as string) ?? null,
    periods: Number(cached['periods_available'] ?? 1),
    provider: PROVIDER,
    cached: true,
    fetched_at: String(cached['fetched_at'] ?? new Date().toISOString()),
    depth: (String(cached['data_mode'] ?? 'basic').toLowerCase() === 'full' ? 'full' : 'basic'),
    stale,
    note,
    requests_used: 0,
  };
}

/**
 * Cache first, then one live pass. A rate-limited provider falls back to stale
 * cache rather than failing, and nothing is ever filled in with invented values.
 */
export async function getFundamentals(
  deps: Deps,
  symbol: string,
  assetTypeHint: 'STOCK' | 'ETF' | null,
  depth: Depth,
  force: boolean,
): Promise<FundamentalPayload> {
  const cached = await readCache(deps, symbol);
  const cacheDepth = String(cached?.['data_mode'] ?? 'basic').toLowerCase();
  const fresh =
    !!cached &&
    !!cached['valid_until'] &&
    new Date(String(cached['valid_until'])).getTime() > Date.now();
  const deepEnough = depth === 'basic' || cacheDepth === 'full';
  if (cached && fresh && deepEnough && !force) {
    return payloadFromCache(cached, false, null);
  }

  let requests = 0;
  try {
    let assetType: 'STOCK' | 'ETF' = assetTypeHint ?? 'STOCK';
    let metrics: Json = {};
    let etf: Json | null = null;
    let profile: FundamentalPayload['profile'] = null;
    let asOf: string | null = null;
    let periods = 0;

    if (assetType === 'STOCK') {
      const overview = await deps.av({ function: 'OVERVIEW', symbol });
      requests += 1;
      const at = String(overview['AssetType'] ?? '').toLowerCase();
      if (at.includes('etf')) assetType = 'ETF';
      if (assetType === 'STOCK') {
        const mapped = fromOverview(overview);
        metrics = stripNulls(mapped.metrics);
        profile = { ...mapped.profile, symbol };
        asOf = mapped.asOf;
        periods = Object.keys(metrics).length ? 1 : 0;
      } else {
        profile = {
          symbol,
          name: (overview['Name'] as string) || null,
          sector: null,
          industry: null,
          assetType: 'ETF',
          exchange: (overview['Exchange'] as string) || null,
        };
      }
    }

    if (assetType === 'STOCK' && depth === 'full') {
      const [income, balance, cash] = await Promise.all([
        deps.av({ function: 'INCOME_STATEMENT', symbol }),
        deps.av({ function: 'BALANCE_SHEET', symbol }),
        deps.av({ function: 'CASH_FLOW', symbol }),
      ]);
      requests += 3;
      const s = fromStatements(income, balance, cash);
      metrics = { ...metrics, ...stripNulls(s.metrics) };
      periods = Math.max(periods, s.periods);
      asOf = asOf ?? s.asOf;
    }

    if (assetType === 'ETF') {
      const p = await deps.av({ function: 'ETF_PROFILE', symbol });
      requests += 1;
      etf = stripNulls(fromEtfProfile(p));
      periods = Object.keys(etf).length ? 1 : 0;
    }

    const hasAny = Object.keys(metrics).length > 0 || (etf && Object.keys(etf).length > 0);
    if (!hasAny) {
      if (cached) return payloadFromCache(cached, !fresh, 'The provider returned no figures; showing the saved copy.');
      throw new Error('No figures returned for this symbol.');
    }

    const fetchedAt = new Date().toISOString();
    const validUntil = new Date(Date.now() + CACHE_DAYS * 86400_000).toISOString();
    await writeCache(deps, {
      symbol,
      asset_type: assetType,
      provider: PROVIDER,
      metrics,
      etf_metrics: etf,
      sector: profile?.sector ?? null,
      industry: profile?.industry ?? null,
      company_name: profile?.name ?? null,
      as_of: asOf,
      periods_available: periods,
      data_mode: assetType === 'STOCK' ? depth : 'basic',
      fetched_at: fetchedAt,
      valid_until: validUntil,
      updated_at: fetchedAt,
    });

    return {
      symbol,
      assetType,
      profile,
      metrics,
      etf,
      as_of: asOf,
      periods,
      provider: PROVIDER,
      cached: false,
      fetched_at: fetchedAt,
      depth,
      stale: false,
      note: null,
      requests_used: requests,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Figures lookup failed.';
    if (cached) {
      return payloadFromCache(
        cached,
        !fresh,
        `Live figures were not available (${message}). Showing the saved copy.`,
      );
    }
    throw err;
  }
}
