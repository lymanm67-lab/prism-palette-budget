// SwingEdge Hybrid Signal Engine — ETF Quality Score.
// ETFs are never measured with company rules: there is no revenue or EPS to
// judge. What matters for a swing trade is whether the fund can be traded
// cleanly and what it actually holds.

import { assessConfidence, type ConfidenceResult, type ProviderQuality } from './confidence';

export interface EtfMetrics {
  /** Average daily traded value in dollars. */
  avgDollarVolume?: number | null;
  /** Typical bid/ask spread as a percent of price. */
  spreadPct?: number | null;
  netAssets?: number | null;
  expenseRatio?: number | null;
  holdingsCount?: number | null;
  topTenWeightPct?: number | null;
  largestSectorWeightPct?: number | null;
  /** Annualised volatility in percent. */
  annualVolatilityPct?: number | null;
  /**
   * True when liquidity, spread or volatility were measured from price history
   * rather than supplied by the fund data provider. Wording changes so a
   * measured figure is never presented as an official one.
   */
  derivedFromPriceHistory?: boolean | null;
  trackingErrorPct?: number | null;
  fundAgeYears?: number | null;
  leveraged?: boolean | null;
  inverse?: boolean | null;
  singleStock?: boolean | null;
  leverageFactor?: number | null;
  benchmark?: string | null;
}

export interface EtfWeights {
  liquidity: number;
  tradability: number;
  size: number;
  expense: number;
  diversification: number;
  concentration: number;
  volatility: number;
  structure: number;
  stability: number;
}

export const DEFAULT_ETF_WEIGHTS: EtfWeights = {
  liquidity: 20,
  tradability: 15,
  size: 10,
  expense: 10,
  diversification: 10,
  concentration: 10,
  volatility: 10,
  structure: 10,
  stability: 5,
};

export interface EtfCategory {
  key: keyof EtfWeights;
  label: string;
  max: number;
  points: number | null;
  available: boolean;
  detail: string;
}

export interface EtfQualityResult {
  score: number | null;
  earnedPoints: number;
  availablePoints: number;
  coverage: number;
  categories: EtfCategory[];
  advancedProduct: boolean;
  advancedReasons: string[];
  confidence: ConfidenceResult;
  evidence: Record<string, number | boolean | string | null>;
  notes: string[];
}

const has = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

function tier(value: number, cuts: [number, number, number], max: number, ascending = true): number {
  const [low, mid, high] = cuts;
  if (ascending) {
    if (value >= high) return max;
    if (value >= mid) return Math.round(max * 0.75);
    if (value >= low) return Math.round(max * 0.45);
    return Math.round(max * 0.1);
  }
  if (value <= low) return max;
  if (value <= mid) return Math.round(max * 0.75);
  if (value <= high) return Math.round(max * 0.45);
  return Math.round(max * 0.1);
}

export function scoreEtfQuality(
  metrics: EtfMetrics,
  context: { provider: ProviderQuality; freshnessDays?: number | null; conflictingMetrics?: string[]; staleManualMetrics?: string[] },
  weights: EtfWeights = DEFAULT_ETF_WEIGHTS,
): EtfQualityResult {
  const categories: EtfCategory[] = [];
  const missing = (key: keyof EtfWeights, label: string, why: string): EtfCategory => ({
    key,
    label,
    max: weights[key],
    points: null,
    available: false,
    detail: why,
  });

  categories.push(
    has(metrics.avgDollarVolume)
      ? {
          key: 'liquidity',
          label: 'Liquidity',
          max: weights.liquidity,
          points: tier(metrics.avgDollarVolume, [2_000_000, 20_000_000, 100_000_000], weights.liquidity),
          available: true,
          detail: `About ${money(metrics.avgDollarVolume)} changes hands on an average day${
            metrics.derivedFromPriceHistory ? ', measured from recent price history' : ''
          }.`,
        }
      : missing('liquidity', 'Liquidity', 'Average traded value is unavailable.'),
  );

  categories.push(
    has(metrics.spreadPct)
      ? {
          key: 'tradability',
          label: 'Tradability',
          max: weights.tradability,
          points: tier(metrics.spreadPct, [0.05, 0.15, 0.4], weights.tradability, false),
          available: true,
          detail: `The typical gap between buy and sell price is about ${metrics.spreadPct}% of price.`,
        }
      : missing('tradability', 'Tradability', 'Bid and ask spread is not in the current data plan.'),
  );

  categories.push(
    has(metrics.netAssets)
      ? {
          key: 'size',
          label: 'Fund size',
          max: weights.size,
          points: tier(metrics.netAssets, [100_000_000, 1_000_000_000, 5_000_000_000], weights.size),
          available: true,
          detail: `The fund holds about ${money(metrics.netAssets)}.`,
        }
      : missing('size', 'Fund size', 'Net assets are unavailable.'),
  );

  categories.push(
    has(metrics.expenseRatio)
      ? {
          key: 'expense',
          label: 'Running cost',
          max: weights.expense,
          points: tier(metrics.expenseRatio, [0.1, 0.3, 0.75], weights.expense, false),
          available: true,
          detail: `Annual cost is ${metrics.expenseRatio}% of the amount invested.`,
        }
      : missing('expense', 'Running cost', 'Expense ratio is unavailable.'),
  );

  categories.push(
    has(metrics.holdingsCount)
      ? {
          key: 'diversification',
          label: 'Diversification',
          max: weights.diversification,
          points: tier(metrics.holdingsCount, [20, 60, 150], weights.diversification),
          available: true,
          detail: `The fund holds ${metrics.holdingsCount} positions.`,
        }
      : missing('diversification', 'Diversification', 'Holdings count is unavailable.'),
  );

  const concentration = has(metrics.topTenWeightPct)
    ? metrics.topTenWeightPct
    : has(metrics.largestSectorWeightPct)
      ? metrics.largestSectorWeightPct
      : null;
  categories.push(
    concentration !== null
      ? {
          key: 'concentration',
          label: 'Concentration risk',
          max: weights.concentration,
          points: tier(concentration, [25, 45, 65], weights.concentration, false),
          available: true,
          detail: `The largest exposures make up about ${concentration}% of the fund.`,
        }
      : missing('concentration', 'Concentration risk', 'Holdings weights are unavailable.'),
  );

  categories.push(
    has(metrics.annualVolatilityPct)
      ? {
          key: 'volatility',
          label: 'Volatility',
          max: weights.volatility,
          points: tier(metrics.annualVolatilityPct, [15, 25, 40], weights.volatility, false),
          available: true,
          detail: `Yearly price swing is running near ${metrics.annualVolatilityPct}%.`,
        }
      : missing('volatility', 'Volatility', 'Volatility figure is unavailable.'),
  );

  const structural = metrics.leveraged || metrics.inverse || metrics.singleStock;
  categories.push(
    has(metrics.trackingErrorPct) || structural !== null || structural !== undefined
      ? {
          key: 'structure',
          label: 'Structure and tracking',
          max: weights.structure,
          points: structural
            ? Math.round(weights.structure * 0.1)
            : has(metrics.trackingErrorPct)
              ? tier(metrics.trackingErrorPct, [0.2, 0.75, 2], weights.structure, false)
              : Math.round(weights.structure * 0.6),
          available: true,
          detail: structural
            ? 'This is a geared, inverse or single-stock product, which behaves very differently from a plain index fund.'
            : has(metrics.trackingErrorPct)
              ? `The fund tracks its index within about ${metrics.trackingErrorPct}%.`
              : 'Plain structure assumed; tracking figures are not available.',
        }
      : missing('structure', 'Structure and tracking', 'Structure data unavailable.'),
  );

  categories.push(
    has(metrics.fundAgeYears)
      ? {
          key: 'stability',
          label: 'Fund stability',
          max: weights.stability,
          points: tier(metrics.fundAgeYears, [1, 3, 7], weights.stability),
          available: true,
          detail: `The fund has been running for about ${metrics.fundAgeYears} years.`,
        }
      : missing('stability', 'Fund stability', 'Inception date is unavailable.'),
  );

  const totalPoints = Object.values(weights).reduce((a, b) => a + b, 0);
  const availablePoints = categories.filter((c) => c.available).reduce((s, c) => s + c.max, 0);
  const earnedPoints = categories.reduce((s, c) => s + (c.points ?? 0), 0);
  const coverage = totalPoints > 0 ? availablePoints / totalPoints : 0;
  const score = availablePoints > 0 ? Math.round((earnedPoints / availablePoints) * 100) : null;

  const advancedReasons: string[] = [];
  if (metrics.leveraged) advancedReasons.push('geared fund');
  if (metrics.inverse) advancedReasons.push('inverse fund');
  if (metrics.singleStock) advancedReasons.push('single-stock fund');
  if (has(metrics.leverageFactor) && Math.abs(metrics.leverageFactor) > 1) {
    advancedReasons.push(`${metrics.leverageFactor}x exposure`);
  }
  if (concentration !== null && concentration >= 70) advancedReasons.push('very concentrated holdings');

  const confidence = assessConfidence({
    coverage,
    freshnessDays: context.freshnessDays ?? null,
    provider: context.provider,
    // ETF profile data is a single snapshot rather than a series of periods.
    periodsAvailable: 2,
    conflictingMetrics: context.conflictingMetrics,
    staleManualMetrics: context.staleManualMetrics,
  });

  const notes: string[] = [];
  if (coverage < 1) {
    notes.push(
      `ETF quality data is partial — ${confidence.coveragePct}% of the inputs are available. Missing: ${categories
        .filter((c) => !c.available)
        .map((c) => c.label)
        .join(', ')}. The score uses only what is present rather than penalising the fund for a data gap.`,
    );
  }

  const evidence: Record<string, number | boolean | string | null> = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (v === undefined) continue;
    evidence[k] = v as number | boolean | string | null;
  }

  return {
    score,
    earnedPoints,
    availablePoints,
    coverage,
    categories,
    advancedProduct: advancedReasons.length > 0,
    advancedReasons,
    confidence,
    evidence,
    notes,
  };
}

export const ADVANCED_PRODUCT_TEXT =
  'ADVANCED PRODUCT — geared, inverse and single-stock funds move far more than the market they track. Beginner mode leaves these out of GO signals.';
