// SwingEdge — layered correlation engine.
//
// Correlation is not "same sector" alone. Three levels, highest available wins:
//   LEVEL 1  sector and industry overlap
//   LEVEL 2  ETF holdings overlap, when holdings data exists
//   LEVEL 3  rolling price-return correlation from daily candles
//
// Thresholds and lookback are configurable. Nothing here is presented as a
// universal rule, and the level plus sample size is always reported so a weak
// basis is visible.

import type { Candle } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round3 = (n: number) => Math.round(n * 1000) / 1000;

export type CorrelationBand = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';
export type CorrelationLevel = 1 | 2 | 3;

export interface CorrelationConfig {
  /** Trading days of daily returns used for level 3. Default 60. */
  lookbackDays: number;
  /** Minimum usable return pairs before level 3 is trusted. */
  minSamples: number;
  thresholds: { moderate: number; high: number; veryHigh: number };
}

export const DEFAULT_CORRELATION_CONFIG: CorrelationConfig = {
  lookbackDays: 60,
  minSamples: 30,
  thresholds: { moderate: 0.4, high: 0.6, veryHigh: 0.8 },
};

export function classifyCorrelation(
  coefficient: number,
  config: CorrelationConfig = DEFAULT_CORRELATION_CONFIG,
): CorrelationBand {
  const c = Math.abs(coefficient);
  if (c > config.thresholds.veryHigh) return 'VERY_HIGH';
  if (c > config.thresholds.high) return 'HIGH';
  if (c >= config.thresholds.moderate) return 'MODERATE';
  return 'LOW';
}

export const CORRELATION_BAND_LABEL: Record<CorrelationBand, string> = {
  LOW: 'Low',
  MODERATE: 'Moderate',
  HIGH: 'High',
  VERY_HIGH: 'Very high',
};

/** Daily simple returns, oldest first. */
export function dailyReturns(candles: Candle[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const prev = candles[i - 1].close;
    const cur = candles[i].close;
    if (prev > 0 && cur > 0) out.push(cur / prev - 1);
  }
  return out;
}

/** Pearson correlation over the overlapping tail of two return series. */
export function pearson(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const x = a.slice(a.length - n);
  const y = b.slice(b.length - n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < n; i += 1) {
    const a1 = x[i] - mx;
    const b1 = y[i] - my;
    num += a1 * b1;
    dx += a1 * a1;
    dy += b1 * b1;
  }
  if (dx <= 0 || dy <= 0) return null;
  return num / Math.sqrt(dx * dy);
}

export interface SymbolProfile {
  symbol: string;
  sector?: string | null;
  industry?: string | null;
  /** Top holdings for an ETF, upper-cased symbols. */
  holdings?: string[];
  /** Daily candles, oldest first, for level 3. */
  candles?: Candle[];
}

export interface PairCorrelation {
  a: string;
  b: string;
  level: CorrelationLevel;
  band: CorrelationBand;
  /** Present only for level 3. */
  coefficient: number | null;
  /** Return pairs used at level 3, or overlap count at level 2. */
  samples: number;
  basis: string;
}

function holdingsOverlap(a: SymbolProfile, b: SymbolProfile): { pct: number; shared: string[] } | null {
  const ah = (a.holdings ?? []).map((h) => h.toUpperCase());
  const bh = (b.holdings ?? []).map((h) => h.toUpperCase());
  // Also treat a single stock held inside an ETF as overlap.
  if (ah.length && bh.length) {
    const shared = ah.filter((h) => bh.includes(h));
    if (!shared.length) return { pct: 0, shared: [] };
    return { pct: shared.length / Math.min(ah.length, bh.length), shared };
  }
  if (ah.length && ah.includes(b.symbol.toUpperCase())) return { pct: 1, shared: [b.symbol.toUpperCase()] };
  if (bh.length && bh.includes(a.symbol.toUpperCase())) return { pct: 1, shared: [a.symbol.toUpperCase()] };
  return null;
}

/** Correlation between one pair, using the strongest evidence available. */
export function correlatePair(
  a: SymbolProfile,
  b: SymbolProfile,
  config: CorrelationConfig = DEFAULT_CORRELATION_CONFIG,
): PairCorrelation {
  const base = { a: a.symbol.toUpperCase(), b: b.symbol.toUpperCase() };

  // Level 3 — actual market behaviour, preferred whenever there is enough history.
  const ra = dailyReturns((a.candles ?? []).slice(-(config.lookbackDays + 1)));
  const rb = dailyReturns((b.candles ?? []).slice(-(config.lookbackDays + 1)));
  const samples = Math.min(ra.length, rb.length);
  if (samples >= config.minSamples) {
    const coefficient = pearson(ra, rb);
    if (coefficient !== null) {
      return {
        ...base,
        level: 3,
        band: classifyCorrelation(coefficient, config),
        coefficient: round3(coefficient),
        samples,
        basis: `Price-return correlation over ${samples} trading days.`,
      };
    }
  }

  // Level 2 — holdings overlap.
  const overlap = holdingsOverlap(a, b);
  if (overlap && overlap.pct > 0) {
    const band: CorrelationBand =
      overlap.pct >= 0.6 ? 'VERY_HIGH' : overlap.pct >= 0.35 ? 'HIGH' : 'MODERATE';
    return {
      ...base,
      level: 2,
      band,
      coefficient: null,
      samples: overlap.shared.length,
      basis: `Holdings overlap of ${Math.round(overlap.pct * 100)}% (${overlap.shared.slice(0, 5).join(', ')}).`,
    };
  }

  // Level 1 — sector and industry.
  const sameIndustry =
    !!a.industry && !!b.industry && a.industry.toLowerCase() === b.industry.toLowerCase();
  const sameSector = !!a.sector && !!b.sector && a.sector.toLowerCase() === b.sector.toLowerCase();
  if (sameIndustry) {
    return {
      ...base,
      level: 1,
      band: 'HIGH',
      coefficient: null,
      samples: 0,
      basis: `Same industry (${a.industry}). Not enough price history for a measured correlation.`,
    };
  }
  if (sameSector) {
    return {
      ...base,
      level: 1,
      band: 'MODERATE',
      coefficient: null,
      samples: 0,
      basis: `Same sector (${a.sector}). Not enough price history for a measured correlation.`,
    };
  }
  return {
    ...base,
    level: 1,
    band: 'LOW',
    coefficient: null,
    samples: 0,
    basis: 'No sector, holdings or price-history overlap found.',
  };
}

export interface CorrelationCheckResult {
  /** Strongest band found between the candidate and any open position. */
  worstBand: CorrelationBand;
  pairs: PairCorrelation[];
  /** True when the candidate breaches the configured limit. */
  overLimit: boolean;
  /** Combined risk in dollars across positions correlated at or above the limit. */
  correlatedRisk: number;
  reasons: string[];
}

const BAND_ORDER: CorrelationBand[] = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'];

export interface CorrelationLimit {
  /** Band at which correlated exposure is capped. Default HIGH. */
  band: CorrelationBand;
  /** Maximum combined risk in dollars across a correlated group. */
  maxCorrelatedRisk: number;
}

/**
 * Compare a candidate against open positions.
 *
 * NVDA, AMD, SMH and QQQ can register as correlated even though they are not the
 * same kind of security, because level 3 measures actual co-movement.
 */
export function checkCorrelation(
  candidate: SymbolProfile,
  openPositions: { profile: SymbolProfile; currentRisk: number }[],
  candidateRisk: number,
  limit: CorrelationLimit,
  config: CorrelationConfig = DEFAULT_CORRELATION_CONFIG,
): CorrelationCheckResult {
  const pairs = openPositions.map((p) => correlatePair(candidate, p.profile, config));
  const limitIndex = BAND_ORDER.indexOf(limit.band);

  let worstIndex = 0;
  let correlatedRisk = candidateRisk;
  const reasons: string[] = [];

  pairs.forEach((pair, i) => {
    const idx = BAND_ORDER.indexOf(pair.band);
    if (idx > worstIndex) worstIndex = idx;
    if (idx >= limitIndex) {
      correlatedRisk += openPositions[i].currentRisk;
      reasons.push(
        `${CORRELATION_BAND_LABEL[pair.band]} correlation with ${pair.b} (level ${pair.level}). ${pair.basis}`,
      );
    }
  });

  correlatedRisk = round2(correlatedRisk);
  const overLimit = correlatedRisk > limit.maxCorrelatedRisk && reasons.length > 0;
  if (overLimit) {
    reasons.unshift(
      `Correlated group risk would reach $${correlatedRisk.toFixed(2)}, above the $${limit.maxCorrelatedRisk.toFixed(2)} limit for a correlated group.`,
    );
  }
  if (!reasons.length) reasons.push('No meaningful correlation with open positions.');

  return {
    worstBand: BAND_ORDER[worstIndex],
    pairs,
    overLimit,
    correlatedRisk,
    reasons,
  };
}
