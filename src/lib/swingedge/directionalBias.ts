// SwingEdge — Directional Bias Engine.
//
// This is a historical tendency engine, NOT a forecast. It answers one question:
// when conditions looked broadly like this before, what happened next?
//
// Rules that keep it honest:
//   - Confidence is always calculated from INDEPENDENT episodes, never raw matches.
//   - Raw and independent counts are both reported.
//   - Nothing here is presented as a prediction, and no bias can authorise a trade.

import { findHistoricalMatches, type ClassificationMethod, type MatchConditions, type MatchResult, type OutcomeClass } from './historicalMatch';
import type { Candle, MarketCondition, TrendState } from './types';

export type BiasDirection = 'UP' | 'SIDEWAYS' | 'DOWN';
export type BiasConfidence = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT_DATA';

export const BIAS_CONFIDENCE_LABEL: Record<BiasConfidence, string> = {
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
  INSUFFICIENT_DATA: 'INSUFFICIENT DATA',
};

export interface BiasPeriodRead {
  period: number;
  upPct: number;
  sidewaysPct: number;
  downPct: number;
  medianReturnPct: number;
  averageReturnPct: number;
  averageFavourableExcursionPct: number;
  averageAdverseExcursionPct: number;
  bestPct: number;
  worstPct: number;
  sampleSize: number;
}

export interface DirectionalBias {
  direction: BiasDirection;
  confidence: BiasConfidence;
  /** Highest of up/sideways/down for the primary period, as a percent. */
  leadingPct: number;
  primaryPeriod: number;
  periods: BiasPeriodRead[];
  rawMatches: number;
  independentEpisodes: number;
  method: ClassificationMethod;
  lookbackBars: number;
  conditionsMatched: string[];
  marketRegime: MarketCondition | null;
  trend: TrendState | null;
  whyThisBias: string[];
  whatWouldChangeThisBias: string[];
  warnings: string[];
  methodologyVersion: string;
}

export const BIAS_METHODOLOGY_VERSION = 'bias-1.0';

export interface BiasOptions {
  conditions: MatchConditions;
  periods?: number[];
  primaryPeriod?: number;
  method?: ClassificationMethod;
  marketRegime?: MarketCondition | null;
  trend?: TrendState | null;
  /** Independent-episode counts below this read as INSUFFICIENT DATA. */
  minimumEpisodes?: number;
  /** Set when other engines disagree; lowers confidence by one step. */
  conflicts?: string[];
  dataComplete?: boolean;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const mean = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** Reads a bias from an already-computed match result. */
export function biasFromMatches(result: MatchResult, opts: BiasOptions): DirectionalBias {
  const periods = result.periods;
  const primaryPeriod = opts.primaryPeriod ?? periods[Math.min(1, periods.length - 1)] ?? periods[0] ?? 10;
  const minimumEpisodes = opts.minimumEpisodes ?? 10;
  const sample = result.independent;

  const reads: BiasPeriodRead[] = periods.map((p) => {
    const rows = sample.map((m) => m.outcomes[p]).filter(Boolean);
    const changes = rows.map((r) => r.forwardChangePct);
    const counts: Record<OutcomeClass, number> = { UP: 0, SIDEWAYS: 0, DOWN: 0 };
    rows.forEach((r) => {
      counts[r.classification] += 1;
    });
    const n = rows.length || 1;
    return {
      period: p,
      upPct: round1((counts.UP / n) * 100),
      sidewaysPct: round1((counts.SIDEWAYS / n) * 100),
      downPct: round1((counts.DOWN / n) * 100),
      medianReturnPct: round1(median(changes)),
      averageReturnPct: round1(mean(changes)),
      averageFavourableExcursionPct: round1(mean(rows.map((r) => r.maxFavourableExcursionPct))),
      averageAdverseExcursionPct: round1(mean(rows.map((r) => r.maxAdverseExcursionPct))),
      bestPct: changes.length ? round1(Math.max(...changes)) : 0,
      worstPct: changes.length ? round1(Math.min(...changes)) : 0,
      sampleSize: rows.length,
    };
  });

  const primary = reads.find((r) => r.period === primaryPeriod) ?? reads[0];
  const leadingPct = primary ? Math.max(primary.upPct, primary.sidewaysPct, primary.downPct) : 0;
  const direction: BiasDirection = !primary
    ? 'SIDEWAYS'
    : primary.upPct === leadingPct
      ? 'UP'
      : primary.downPct === leadingPct
        ? 'DOWN'
        : 'SIDEWAYS';

  const warnings: string[] = [];
  if (result.dataNote) warnings.push(result.dataNote);
  if (result.rawMatches > result.independentEpisodes * 2 && result.independentEpisodes > 0) {
    warnings.push(
      `${result.rawMatches} bars matched, but they represent only ${result.independentEpisodes} separate market episodes. The smaller number is the one that counts.`,
    );
  }

  const confidence = gradeConfidence({
    episodes: result.independentEpisodes,
    minimumEpisodes,
    leadingPct,
    conflicts: opts.conflicts?.length ?? 0,
    dataComplete: opts.dataComplete !== false,
  });
  if (confidence === 'INSUFFICIENT_DATA') {
    warnings.push(
      `Only ${result.independentEpisodes} independent past episodes were found, below the ${minimumEpisodes} needed to say anything useful.`,
    );
  }

  const conditionsMatched = describeConditions(opts.conditions);

  return {
    direction,
    confidence,
    leadingPct,
    primaryPeriod,
    periods: reads,
    rawMatches: result.rawMatches,
    independentEpisodes: result.independentEpisodes,
    method: result.method,
    lookbackBars: result.lookbackBars,
    conditionsMatched,
    marketRegime: opts.marketRegime ?? null,
    trend: opts.trend ?? null,
    whyThisBias: buildWhy(direction, primary, result, conditionsMatched, opts),
    whatWouldChangeThisBias: buildWhatWouldChange(opts),
    warnings,
    methodologyVersion: BIAS_METHODOLOGY_VERSION,
  };
}

/** Convenience wrapper: match, then read the bias. */
export function directionalBias(candles: Candle[], opts: BiasOptions): DirectionalBias {
  const result = findHistoricalMatches(candles, {
    conditions: opts.conditions,
    periods: opts.periods,
    method: opts.method,
  });
  return biasFromMatches(result, opts);
}

function gradeConfidence(input: {
  episodes: number;
  minimumEpisodes: number;
  leadingPct: number;
  conflicts: number;
  dataComplete: boolean;
}): BiasConfidence {
  if (input.episodes < input.minimumEpisodes) return 'INSUFFICIENT_DATA';
  let level: BiasConfidence =
    input.episodes >= 30 && input.leadingPct >= 60 ? 'HIGH' : input.episodes >= 18 ? 'MODERATE' : 'LOW';
  if (!input.dataComplete) level = step(level);
  if (input.conflicts > 0) level = step(level);
  return level;
}

function step(level: BiasConfidence): BiasConfidence {
  if (level === 'HIGH') return 'MODERATE';
  if (level === 'MODERATE') return 'LOW';
  return 'LOW';
}

function describeConditions(cond: MatchConditions): string[] {
  const out: string[] = [];
  if (cond.aboveEma20 !== undefined) out.push(cond.aboveEma20 ? 'price above the 20 EMA' : 'price below the 20 EMA');
  if (cond.ema20AboveSma50 !== undefined) {
    out.push(cond.ema20AboveSma50 ? '20 EMA above the 50 SMA' : '20 EMA below the 50 SMA');
  }
  if (cond.rsiBand) out.push(`RSI between ${Math.round(cond.rsiBand[0])} and ${Math.round(cond.rsiBand[1])}`);
  if (cond.pullbackPctBand) {
    out.push(
      `pullback of ${round1(cond.pullbackPctBand[0])}% to ${round1(cond.pullbackPctBand[1])}% from the recent high`,
    );
  }
  return out;
}

function buildWhy(
  direction: BiasDirection,
  primary: BiasPeriodRead | undefined,
  result: MatchResult,
  conditions: string[],
  opts: BiasOptions,
): string[] {
  const lines: string[] = [];
  if (!primary) return ['There was not enough matching history to describe a bias.'];
  lines.push(
    `Conditions matched: ${conditions.join(', ') || 'none recorded'}. That happened in ${result.independentEpisodes} separate past episodes (${result.rawMatches} individual bars).`,
  );
  lines.push(
    `Over the next ${primary.period} trading days those episodes finished up ${primary.upPct}% of the time, sideways ${primary.sidewaysPct}% and down ${primary.downPct}%.`,
  );
  lines.push(
    `The middle outcome was ${primary.medianReturnPct}%, with an average best point of ${primary.averageFavourableExcursionPct}% and an average worst point of ${primary.averageAdverseExcursionPct}% along the way.`,
  );
  if (opts.marketRegime) lines.push(`Current market regime: ${opts.marketRegime}.`);
  lines.push(
    direction === 'UP'
      ? 'The lean is upward, which means past episodes leaned that way — not that this one will.'
      : direction === 'DOWN'
        ? 'The lean is downward, so a long setup here is fighting the historical tendency.'
        : 'The lean is sideways, which usually means waiting costs very little.',
  );
  return lines;
}

function buildWhatWouldChange(opts: BiasOptions): string[] {
  const lines = [
    'Price closing back through the 20 EMA or the 50 SMA changes the trend conditions this bias was built on.',
    'A change in market regime removes the backdrop these past episodes shared.',
    'A jump in ATR means the size of a normal move has changed, so the same percentages mean something different.',
    'A new earnings date, a verified global event or a sector event can override the historical tendency entirely.',
    'A deeper pullback moves this out of the matched condition band, so the sample no longer applies.',
  ];
  if (opts.conflicts?.length) lines.push(`Other engines currently disagree: ${opts.conflicts.join('; ')}.`);
  return lines;
}
