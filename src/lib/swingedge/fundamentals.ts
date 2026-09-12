// SwingEdge Hybrid Signal Engine — Company Fundamental Score.
// Stocks only. ETFs go through etfQuality.ts and are never measured with company
// rules. Missing figures are never scored as zero: the category drops out of the
// available points, coverage falls, and confidence falls with it.

import { assessConfidence, type ConfidenceResult, type ProviderQuality } from './confidence';
import { profileFor, type SectorProfile } from './sectors';

export interface FundamentalMetrics {
  // Growth
  revenueGrowthYoY?: number | null;
  revenueGrowthPriorYoY?: number | null;
  revenueGrowthQoQ?: number | null;
  epsGrowthYoY?: number | null;
  epsGrowthPriorYoY?: number | null;
  netIncomeGrowthYoY?: number | null;
  oneOffEarningsEvent?: boolean | null;
  // Profitability (percent)
  grossMargin?: number | null;
  operatingMargin?: number | null;
  operatingMarginPrior?: number | null;
  netMargin?: number | null;
  returnOnEquity?: number | null;
  returnOnAssets?: number | null;
  returnOnInvestedCapital?: number | null;
  // Cash flow (absolute currency)
  operatingCashFlow?: number | null;
  freeCashFlow?: number | null;
  freeCashFlowPrior?: number | null;
  netIncome?: number | null;
  // Balance sheet
  debtToEquity?: number | null;
  debtToEquityPrior?: number | null;
  currentRatio?: number | null;
  cashAndEquivalents?: number | null;
  totalDebt?: number | null;
  interestCoverage?: number | null;
  // Valuation
  peRatio?: number | null;
  forwardPe?: number | null;
  pegRatio?: number | null;
  priceToSales?: number | null;
  priceToBook?: number | null;
  evToEbitda?: number | null;
  freeCashFlowYield?: number | null;
  // Relative comparisons, when the provider supplies them
  sectorPe?: number | null;
  sectorPriceToSales?: number | null;
  sectorEvToEbitda?: number | null;
  ownFiveYearPe?: number | null;
}

export interface FundamentalContext {
  sector?: string | null;
  industry?: string | null;
  provider: ProviderQuality;
  /** Age in days of the newest reported figure. */
  freshnessDays?: number | null;
  periodsAvailable?: number;
  conflictingMetrics?: string[];
  staleManualMetrics?: string[];
}

export type CategoryKey = 'revenue' | 'earnings' | 'profitability' | 'cashflow' | 'balance' | 'valuation';

export interface FundamentalCategory {
  key: CategoryKey;
  label: string;
  max: number;
  points: number | null; // null when the data is missing
  available: boolean;
  detail: string;
}

export type FundamentalTrend = 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'INSUFFICIENT_DATA';
export type ValuationClass = 'ATTRACTIVE' | 'REASONABLE' | 'PREMIUM' | 'EXTREME' | 'INSUFFICIENT_DATA';
export type RedFlagSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';

export interface RedFlag {
  key: string;
  label: string;
  severity: RedFlagSeverity;
  detail: string;
}

export interface FundamentalScoreResult {
  /** 0-100, normalised across the categories that had data. Null when nothing was usable. */
  score: number | null;
  earnedPoints: number;
  availablePoints: number;
  coverage: number;
  categories: FundamentalCategory[];
  trend: FundamentalTrend;
  valuation: ValuationClass;
  redFlags: RedFlag[];
  confidence: ConfidenceResult;
  profile: SectorProfile;
  usedGenericModel: boolean;
  /** Raw inputs actually used, stored as the audit trail behind the score. */
  evidence: Record<string, number | boolean | string | null>;
  notes: string[];
}

const MAX: Record<CategoryKey, number> = {
  revenue: 15,
  earnings: 20,
  profitability: 15,
  cashflow: 15,
  balance: 15,
  valuation: 20,
};

const has = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const round1 = (n: number) => Math.round(n * 10) / 10;

function band(value: number, thresholds: [number, number, number, number], max: number): number {
  // thresholds ascending: below[0] -> 0, then 40%, 65%, 85%, 100% of max
  if (value >= thresholds[3]) return max;
  if (value >= thresholds[2]) return Math.round(max * 0.85);
  if (value >= thresholds[1]) return Math.round(max * 0.65);
  if (value >= thresholds[0]) return Math.round(max * 0.4);
  return 0;
}

function scoreRevenue(m: FundamentalMetrics): FundamentalCategory {
  const max = MAX.revenue;
  if (!has(m.revenueGrowthYoY)) {
    return {
      key: 'revenue',
      label: 'Revenue growth',
      max,
      points: null,
      available: false,
      detail: 'Revenue growth data is missing, so this category is left out of the score.',
    };
  }
  let points = band(m.revenueGrowthYoY, [0, 4, 8, 15], max);
  const trendWord = revenueTrendWord(m);
  if (trendWord === 'Accelerating') points = Math.min(max, points + 2);
  if (trendWord === 'Slowing') points = Math.max(0, points - 2);
  if (trendWord === 'Declining') points = Math.max(0, points - 4);
  return {
    key: 'revenue',
    label: 'Revenue growth',
    max,
    points: Math.min(max, points),
    available: true,
    detail: `Revenue is ${m.revenueGrowthYoY >= 0 ? 'up' : 'down'} ${round1(Math.abs(m.revenueGrowthYoY))}% against the same period a year ago. Trend: ${trendWord}.`,
  };
}

export function revenueTrendWord(m: FundamentalMetrics): 'Accelerating' | 'Stable' | 'Slowing' | 'Declining' | 'Unknown' {
  if (!has(m.revenueGrowthYoY)) return 'Unknown';
  if (m.revenueGrowthYoY < 0) return 'Declining';
  if (!has(m.revenueGrowthPriorYoY)) return 'Stable';
  const delta = m.revenueGrowthYoY - m.revenueGrowthPriorYoY;
  if (delta >= 2) return 'Accelerating';
  if (delta <= -2) return 'Slowing';
  return 'Stable';
}

function scoreEarnings(m: FundamentalMetrics): FundamentalCategory {
  const max = MAX.earnings;
  const eps = has(m.epsGrowthYoY) ? m.epsGrowthYoY : has(m.netIncomeGrowthYoY) ? m.netIncomeGrowthYoY : null;
  if (eps === null) {
    return {
      key: 'earnings',
      label: 'Earnings growth',
      max,
      points: null,
      available: false,
      detail: 'Earnings growth data is missing, so this category is left out of the score.',
    };
  }
  let points = band(eps, [0, 5, 10, 18], max);
  if (has(m.epsGrowthPriorYoY) && m.epsGrowthPriorYoY - eps >= 5) points = Math.max(0, points - 3);
  let detail = `Earnings are ${eps >= 0 ? 'up' : 'down'} ${round1(Math.abs(eps))}% year on year.`;
  if (m.oneOffEarningsEvent) {
    points = Math.max(0, Math.round(points * 0.6));
    detail += ' A one-off item is flagged in this period, so it is not treated as recurring improvement.';
  }
  return { key: 'earnings', label: 'Earnings growth', max, points, available: true, detail };
}

function scoreProfitability(m: FundamentalMetrics, p: SectorProfile): FundamentalCategory {
  const max = MAX.profitability;
  const parts: number[] = [];
  const bits: string[] = [];

  if (has(m.operatingMargin)) {
    const t = p.strongOperatingMargin;
    parts.push(band(m.operatingMargin, [0, t * 0.4, t * 0.7, t], 100) / 100);
    bits.push(`operating margin ${round1(m.operatingMargin)}% against a ${t}% sector marker`);
  }
  if (has(m.netMargin)) {
    parts.push(band(m.netMargin, [0, 3, 7, 12], 100) / 100);
    bits.push(`net margin ${round1(m.netMargin)}%`);
  }
  if (has(m.returnOnEquity)) {
    const t = p.strongRoe;
    parts.push(band(m.returnOnEquity, [0, t * 0.5, t * 0.75, t], 100) / 100);
    bits.push(`return on equity ${round1(m.returnOnEquity)}%`);
  }
  if (has(m.returnOnInvestedCapital)) {
    parts.push(band(m.returnOnInvestedCapital, [0, 6, 9, 12], 100) / 100);
    bits.push(`return on invested capital ${round1(m.returnOnInvestedCapital)}%`);
  } else if (has(m.returnOnAssets)) {
    parts.push(band(m.returnOnAssets, [0, 2, 5, 8], 100) / 100);
    bits.push(`return on assets ${round1(m.returnOnAssets)}%`);
  }

  if (!parts.length) {
    return {
      key: 'profitability',
      label: 'Profitability',
      max,
      points: null,
      available: false,
      detail: 'No margin or return figures are available, so this category is left out of the score.',
    };
  }
  const ratio = parts.reduce((a, b) => a + b, 0) / parts.length;
  return {
    key: 'profitability',
    label: 'Profitability',
    max,
    points: Math.round(ratio * max),
    available: true,
    detail: `Judged on ${bits.join(', ')}. ${p.note}`,
  };
}

function scoreCashFlow(m: FundamentalMetrics, p: SectorProfile): FundamentalCategory {
  const max = MAX.cashflow;
  if (!has(m.freeCashFlow) && !has(m.operatingCashFlow)) {
    return {
      key: 'cashflow',
      label: 'Cash flow',
      max,
      points: null,
      available: false,
      detail: 'Cash-flow data is missing, so this category is left out of the score.',
    };
  }
  let points = 0;
  const bits: string[] = [];
  const fcf = has(m.freeCashFlow) ? m.freeCashFlow : null;
  const ocf = has(m.operatingCashFlow) ? m.operatingCashFlow : null;

  if (ocf !== null) {
    points += ocf > 0 ? 5 : 0;
    bits.push(`operating cash flow is ${ocf > 0 ? 'positive' : 'negative'}`);
  }
  if (fcf !== null) {
    points += fcf > 0 ? 6 : 0;
    bits.push(`free cash flow is ${fcf > 0 ? 'positive' : 'negative'}`);
    if (has(m.freeCashFlowPrior)) {
      const improving = fcf > m.freeCashFlowPrior;
      points += improving ? 4 : 0;
      bits.push(improving ? 'free cash flow improved on the prior period' : 'free cash flow fell against the prior period');
    }
  }
  if (fcf !== null && has(m.netIncome) && m.netIncome > 0 && fcf < m.netIncome * 0.5) {
    points = Math.max(0, points - 3);
    bits.push('reported profit is not converting into cash');
  }
  if (!p.cashFlowMeaningful) {
    bits.push('cash-flow comparisons are less meaningful in this sector');
  }
  return {
    key: 'cashflow',
    label: 'Cash flow',
    max,
    points: Math.min(max, points),
    available: true,
    detail: `${bits.join('; ')}.`,
  };
}

function scoreBalance(m: FundamentalMetrics, p: SectorProfile): FundamentalCategory {
  const max = MAX.balance;
  const parts: number[] = [];
  const bits: string[] = [];

  if (has(m.debtToEquity)) {
    const heavy = p.heavyDebtToEquity;
    const ratio = m.debtToEquity <= heavy * 0.3 ? 1 : m.debtToEquity <= heavy * 0.6 ? 0.8 : m.debtToEquity <= heavy ? 0.5 : 0.15;
    parts.push(ratio);
    bits.push(`debt to equity ${round1(m.debtToEquity)} against a ${heavy} sector marker`);
  }
  if (has(m.currentRatio)) {
    parts.push(m.currentRatio >= 1.5 ? 1 : m.currentRatio >= 1.1 ? 0.7 : m.currentRatio >= 0.9 ? 0.4 : 0.1);
    bits.push(`current ratio ${round1(m.currentRatio)}`);
  }
  if (has(m.interestCoverage)) {
    parts.push(m.interestCoverage >= 8 ? 1 : m.interestCoverage >= 4 ? 0.7 : m.interestCoverage >= 2 ? 0.4 : 0.1);
    bits.push(`interest cover ${round1(m.interestCoverage)}x`);
  }
  if (!parts.length) {
    return {
      key: 'balance',
      label: 'Balance sheet',
      max,
      points: null,
      available: false,
      detail: 'No balance-sheet figures are available, so this category is left out of the score.',
    };
  }
  let ratio = parts.reduce((a, b) => a + b, 0) / parts.length;
  if (has(m.debtToEquity) && has(m.debtToEquityPrior) && m.debtToEquity > m.debtToEquityPrior * 1.25) {
    ratio = Math.max(0, ratio - 0.2);
    bits.push('debt is rising quickly');
  }
  return {
    key: 'balance',
    label: 'Balance sheet',
    max,
    points: Math.round(ratio * max),
    available: true,
    detail: `Judged on ${bits.join(', ')}.`,
  };
}

interface ValuationOutcome {
  category: FundamentalCategory;
  classification: ValuationClass;
}

function scoreValuation(m: FundamentalMetrics, p: SectorProfile): ValuationOutcome {
  const max = MAX.valuation;
  const scores: number[] = [];
  const bits: string[] = [];

  const relative = (value: number | null | undefined, peer: number | null | undefined, label: string) => {
    if (!has(value) || value <= 0) return;
    if (has(peer) && peer > 0) {
      const ratio = value / peer;
      scores.push(ratio <= 0.8 ? 1 : ratio <= 1 ? 0.8 : ratio <= 1.25 ? 0.55 : ratio <= 1.6 ? 0.3 : 0.1);
      bits.push(`${label} ${round1(value)} against a peer level of ${round1(peer)}`);
    } else {
      scores.push(0.5);
      bits.push(`${label} ${round1(value)} with no peer comparison available`);
    }
  };

  for (const metric of p.valuationMetrics) {
    if (metric === 'pe') relative(m.peRatio, m.sectorPe ?? m.ownFiveYearPe, 'price to earnings');
    if (metric === 'forwardPe') relative(m.forwardPe, m.sectorPe, 'forward price to earnings');
    if (metric === 'priceToSales') relative(m.priceToSales, m.sectorPriceToSales, 'price to sales');
    if (metric === 'evToEbitda') relative(m.evToEbitda, m.sectorEvToEbitda, 'enterprise value to EBITDA');
    if (metric === 'priceToBook' && has(m.priceToBook)) {
      scores.push(m.priceToBook <= 1 ? 1 : m.priceToBook <= 1.8 ? 0.75 : m.priceToBook <= 3 ? 0.5 : 0.2);
      bits.push(`price to book ${round1(m.priceToBook)}`);
    }
    if (metric === 'peg' && has(m.pegRatio) && m.pegRatio > 0) {
      scores.push(m.pegRatio <= 1 ? 1 : m.pegRatio <= 1.5 ? 0.75 : m.pegRatio <= 2.5 ? 0.45 : 0.15);
      bits.push(`price to earnings against growth ${round1(m.pegRatio)}`);
    }
    if (metric === 'fcfYield' && has(m.freeCashFlowYield)) {
      scores.push(m.freeCashFlowYield >= 6 ? 1 : m.freeCashFlowYield >= 4 ? 0.75 : m.freeCashFlowYield >= 2 ? 0.45 : 0.15);
      bits.push(`free cash flow yield ${round1(m.freeCashFlowYield)}%`);
    }
  }

  if (!scores.length) {
    return {
      category: {
        key: 'valuation',
        label: 'Valuation',
        max,
        points: null,
        available: false,
        detail: 'No valuation measures suitable for this business are available.',
      },
      classification: 'INSUFFICIENT_DATA',
    };
  }

  const ratio = scores.reduce((a, b) => a + b, 0) / scores.length;
  const classification: ValuationClass =
    ratio >= 0.8 ? 'ATTRACTIVE' : ratio >= 0.55 ? 'REASONABLE' : ratio >= 0.3 ? 'PREMIUM' : 'EXTREME';
  return {
    category: {
      key: 'valuation',
      label: 'Valuation',
      max,
      points: Math.round(ratio * max),
      available: true,
      detail: `Relative to what is comparable: ${bits.join(', ')}. Classified ${classification.toLowerCase().replace('_', ' ')}.`,
    },
    classification,
  };
}

export function fundamentalTrend(m: FundamentalMetrics): FundamentalTrend {
  const signals: number[] = [];
  if (has(m.revenueGrowthYoY) && has(m.revenueGrowthPriorYoY)) {
    signals.push(Math.sign(m.revenueGrowthYoY - m.revenueGrowthPriorYoY));
  }
  if (has(m.epsGrowthYoY) && has(m.epsGrowthPriorYoY)) {
    signals.push(Math.sign(m.epsGrowthYoY - m.epsGrowthPriorYoY));
  }
  if (has(m.operatingMargin) && has(m.operatingMarginPrior)) {
    signals.push(Math.sign(m.operatingMargin - m.operatingMarginPrior));
  }
  if (has(m.freeCashFlow) && has(m.freeCashFlowPrior)) {
    signals.push(Math.sign(m.freeCashFlow - m.freeCashFlowPrior));
  }
  if (signals.length < 2) return 'INSUFFICIENT_DATA';
  const sum = signals.reduce((a, b) => a + b, 0);
  if (sum >= 2) return 'IMPROVING';
  if (sum <= -2) return 'DETERIORATING';
  return 'STABLE';
}

export function detectRedFlags(m: FundamentalMetrics, p: SectorProfile): RedFlag[] {
  const flags: RedFlag[] = [];
  if (has(m.revenueGrowthYoY) && m.revenueGrowthYoY < 0) {
    flags.push({
      key: 'revenue_contraction',
      label: 'Revenue is shrinking',
      severity: m.revenueGrowthYoY < -10 ? 'HIGH' : 'MODERATE',
      detail: `Revenue is down ${round1(Math.abs(m.revenueGrowthYoY))}% year on year.`,
    });
  }
  const eps = has(m.epsGrowthYoY) ? m.epsGrowthYoY : m.netIncomeGrowthYoY;
  if (has(eps) && eps < 0) {
    flags.push({
      key: 'earnings_contraction',
      label: 'Earnings are shrinking',
      severity: eps < -25 ? 'HIGH' : 'MODERATE',
      detail: `Earnings are down ${round1(Math.abs(eps))}% year on year.`,
    });
  }
  if (has(m.freeCashFlow) && m.freeCashFlow < 0) {
    flags.push({
      key: 'negative_fcf',
      label: 'Free cash flow is negative',
      severity: has(m.freeCashFlowPrior) && m.freeCashFlowPrior < 0 ? 'CRITICAL' : 'HIGH',
      detail: 'The business is not generating spare cash in the latest period.',
    });
  }
  if (has(m.freeCashFlow) && has(m.netIncome) && m.netIncome > 0 && m.freeCashFlow < m.netIncome * 0.5) {
    flags.push({
      key: 'profit_without_cash',
      label: 'Positive earnings, weak cash flow',
      severity: 'MODERATE',
      detail: 'Reported profit is well ahead of the cash actually generated.',
    });
  }
  if (has(m.debtToEquity) && has(m.debtToEquityPrior) && m.debtToEquity > m.debtToEquityPrior * 1.4) {
    flags.push({
      key: 'debt_rising',
      label: 'Debt is rising quickly',
      severity: 'HIGH',
      detail: `Debt to equity moved from ${round1(m.debtToEquityPrior)} to ${round1(m.debtToEquity)}.`,
    });
  }
  if (has(m.currentRatio) && m.currentRatio < 0.9) {
    flags.push({
      key: 'weak_liquidity',
      label: 'Weak liquidity',
      severity: m.currentRatio < 0.6 ? 'CRITICAL' : 'HIGH',
      detail: `Current ratio is ${round1(m.currentRatio)}, so short-term bills exceed short-term assets.`,
    });
  }
  if (has(m.operatingMargin) && has(m.operatingMarginPrior) && m.operatingMarginPrior - m.operatingMargin >= 5) {
    flags.push({
      key: 'margin_drop',
      label: 'Sharp margin deterioration',
      severity: 'HIGH',
      detail: `Operating margin fell from ${round1(m.operatingMarginPrior)}% to ${round1(m.operatingMargin)}%.`,
    });
  }
  if (has(m.interestCoverage) && m.interestCoverage < 1.5 && p.cashFlowMeaningful) {
    flags.push({
      key: 'interest_cover',
      label: 'Interest is barely covered',
      severity: 'CRITICAL',
      detail: `Profits cover interest only ${round1(m.interestCoverage)} times.`,
    });
  }
  return flags;
}

/** Full company fundamental score with coverage, trend, flags and evidence. */
export function scoreFundamentals(
  metrics: FundamentalMetrics,
  context: FundamentalContext,
): FundamentalScoreResult {
  const profile = profileFor(context.sector, context.industry);
  const usedGenericModel = profile.key === 'GENERIC';

  const valuation = scoreValuation(metrics, profile);
  const categories: FundamentalCategory[] = [
    scoreRevenue(metrics),
    scoreEarnings(metrics),
    scoreProfitability(metrics, profile),
    scoreCashFlow(metrics, profile),
    scoreBalance(metrics, profile),
    valuation.category,
  ];

  const availablePoints = categories.filter((c) => c.available).reduce((s, c) => s + c.max, 0);
  const earnedPoints = categories.reduce((s, c) => s + (c.points ?? 0), 0);
  const totalPoints = Object.values(MAX).reduce((a, b) => a + b, 0);
  const coverage = availablePoints / totalPoints;
  const score = availablePoints > 0 ? Math.round((earnedPoints / availablePoints) * 100) : null;

  const confidence = assessConfidence({
    coverage,
    freshnessDays: context.freshnessDays ?? null,
    provider: context.provider,
    periodsAvailable: context.periodsAvailable ?? 1,
    conflictingMetrics: context.conflictingMetrics,
    staleManualMetrics: context.staleManualMetrics,
  });

  const notes: string[] = [];
  if (usedGenericModel) notes.push('Generic fundamental model used because no sector profile matched.');
  if (coverage < 1) {
    notes.push(
      `Fundamental score is based on ${confidence.coveragePct}% of the required data. Missing categories: ${categories
        .filter((c) => !c.available)
        .map((c) => c.label)
        .join(', ')}.`,
    );
  }

  const evidence: Record<string, number | boolean | string | null> = {};
  for (const [k, v] of Object.entries(metrics)) {
    if (v === undefined) continue;
    evidence[k] = v as number | boolean | string | null;
  }
  evidence.sectorProfile = profile.key;

  return {
    score,
    earnedPoints,
    availablePoints,
    coverage,
    categories,
    trend: fundamentalTrend(metrics),
    valuation: valuation.classification,
    redFlags: detectRedFlags(metrics, profile),
    confidence,
    profile,
    usedGenericModel,
    evidence,
    notes,
  };
}

export const FUNDAMENTAL_BANDS = [
  { min: 85, label: 'STRONG' },
  { min: 75, label: 'QUALIFIED' },
  { min: 65, label: 'WATCH' },
  { min: 50, label: 'WEAK' },
  { min: 0, label: 'POOR' },
] as const;

export function fundamentalBand(score: number | null): string {
  if (score === null) return 'NO DATA';
  return FUNDAMENTAL_BANDS.find((b) => score >= b.min)?.label ?? 'POOR';
}
