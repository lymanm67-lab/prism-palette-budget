// SwingEdge — Historical setup matching with de-clustering.
//
// The credibility problem this solves: if ten consecutive trading days all
// satisfy the same pullback condition, that is ONE market episode, not ten
// independent pieces of evidence. Counting it as ten inflates confidence.
//
// So two counts are always produced and always shown:
//   rawMatches            — every bar that matched
//   independentEpisodes   — de-clustered episodes
//
// Confidence must be calculated from the independent count. Nothing here reads
// a bar later than the match date, so no future information leaks in.

import { atr as atrSeries, ema, rsi, sma } from './indicators';
import type { Candle } from './types';

export type ForwardPeriod = 5 | 10 | 20 | number;

export type OutcomeClass = 'UP' | 'SIDEWAYS' | 'DOWN';

export type ClassificationMethod = 'ATR_NORMALISED' | 'PERCENT';

export interface MatchConditions {
  /** Price above the 20 EMA at the match bar. */
  aboveEma20?: boolean;
  /** 20 EMA above the 50 SMA at the match bar. */
  ema20AboveSma50?: boolean;
  /** RSI band the match bar must fall inside. */
  rsiBand?: [number, number];
  /** Pullback depth from the trailing 20-bar high, in percent. */
  pullbackPctBand?: [number, number];
  /** Setup family, used only as a label on the result. */
  label?: string;
}

export interface HistoricalMatch {
  index: number;
  date: string;
  close: number;
  /** Forward outcome per requested period. */
  outcomes: Record<number, MatchOutcome>;
  /** Episode id after de-clustering. Matches sharing an id are one episode. */
  episode: number;
  /** True when this match represents its episode in the independent sample. */
  representative: boolean;
}

export interface MatchOutcome {
  forwardChangePct: number;
  forwardChangeInAtr: number | null;
  classification: OutcomeClass;
  maxFavourableExcursionPct: number;
  maxAdverseExcursionPct: number;
  atrChangePct: number | null;
}

export interface MatchResult {
  label: string;
  method: ClassificationMethod;
  periods: number[];
  rawMatches: number;
  independentEpisodes: number;
  matches: HistoricalMatch[];
  /** Only the representative match of each episode. Use these for statistics. */
  independent: HistoricalMatch[];
  lookbackBars: number;
  dataNote: string | null;
}

export interface MatchOptions {
  conditions: MatchConditions;
  periods?: number[];
  method?: ClassificationMethod;
  /** Movement of more than this many ATRs counts as UP or DOWN. */
  atrThreshold?: number;
  /** Movement of more than this percent counts as UP or DOWN. */
  percentThreshold?: number;
  /** Bars that must pass before a new match starts a new episode. */
  declusterGap?: number;
  /** Ignore bars before this index (used by walk-forward splits). */
  fromIndex?: number;
  /** Ignore bars at or after this index (used by walk-forward splits). */
  toIndex?: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Finds bars in a symbol's own history whose conditions resemble the ones being
 * described, then measures what happened next. Every measurement uses only bars
 * at or before the match date to decide whether it matched.
 */
export function findHistoricalMatches(candles: Candle[], opts: MatchOptions): MatchResult {
  const periods = (opts.periods ?? [5, 10, 20]).slice().sort((a, b) => a - b);
  const method = opts.method ?? 'ATR_NORMALISED';
  const atrThreshold = opts.atrThreshold ?? 1;
  const percentThreshold = opts.percentThreshold ?? 2;
  const gap = opts.declusterGap ?? 10;
  const maxForward = periods[periods.length - 1] ?? 20;

  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const s50 = sma(closes, 50);
  const r14 = rsi(closes, 14);
  const atr14 = atrSeries(candles, 14);

  const start = Math.max(50, opts.fromIndex ?? 0);
  const end = Math.min(candles.length - maxForward, opts.toIndex ?? candles.length);

  const matches: HistoricalMatch[] = [];
  let episode = 0;
  let lastMatchIndex = -Infinity;

  for (let i = start; i < end; i++) {
    if (!matchesConditions(i, opts.conditions, { closes, e20, s50, r14, candles })) continue;

    const outcomes: Record<number, MatchOutcome> = {};
    for (const p of periods) {
      const fwdIdx = i + p;
      if (fwdIdx >= candles.length) continue;
      const base = closes[i];
      const forwardChangePct = ((closes[fwdIdx] - base) / base) * 100;
      const atrHere = atr14[i];
      const forwardChangeInAtr =
        typeof atrHere === 'number' && atrHere > 0 ? (closes[fwdIdx] - base) / atrHere : null;

      const window = candles.slice(i + 1, fwdIdx + 1);
      const hi = Math.max(...window.map((c) => c.high));
      const lo = Math.min(...window.map((c) => c.low));
      const atrThen = atr14[fwdIdx];
      const atrChangePct =
        typeof atrHere === 'number' && atrHere > 0 && typeof atrThen === 'number'
          ? round2(((atrThen - atrHere) / atrHere) * 100)
          : null;

      outcomes[p] = {
        forwardChangePct: round2(forwardChangePct),
        forwardChangeInAtr: forwardChangeInAtr === null ? null : round2(forwardChangeInAtr),
        classification: classify(forwardChangePct, forwardChangeInAtr, method, atrThreshold, percentThreshold),
        maxFavourableExcursionPct: round2(((hi - base) / base) * 100),
        maxAdverseExcursionPct: round2(((lo - base) / base) * 100),
        atrChangePct,
      };
    }

    if (i - lastMatchIndex > gap) episode += 1;
    const isNewEpisode = matches.length === 0 || matches[matches.length - 1].episode !== episode;
    lastMatchIndex = i;

    matches.push({
      index: i,
      date: candles[i].datetime,
      close: closes[i],
      outcomes,
      episode,
      representative: isNewEpisode,
    });
  }

  const independent = matches.filter((m) => m.representative);

  return {
    label: opts.conditions.label ?? 'Similar past conditions',
    method,
    periods,
    rawMatches: matches.length,
    independentEpisodes: independent.length,
    matches,
    independent,
    lookbackBars: Math.max(0, end - start),
    dataNote:
      candles.length < 250
        ? 'Less than a year of history is available, so the historical sample is thin by construction.'
        : null,
  };
}

function matchesConditions(
  i: number,
  cond: MatchConditions,
  ctx: { closes: number[]; e20: (number | null)[]; s50: (number | null)[]; r14: (number | null)[]; candles: Candle[] },
): boolean {
  const close = ctx.closes[i];
  const e = ctx.e20[i];
  const s = ctx.s50[i];
  const r = ctx.r14[i];

  if (cond.aboveEma20 !== undefined) {
    if (typeof e !== 'number') return false;
    if (close > e !== cond.aboveEma20) return false;
  }
  if (cond.ema20AboveSma50 !== undefined) {
    if (typeof e !== 'number' || typeof s !== 'number') return false;
    if (e > s !== cond.ema20AboveSma50) return false;
  }
  if (cond.rsiBand) {
    if (typeof r !== 'number') return false;
    if (r < cond.rsiBand[0] || r > cond.rsiBand[1]) return false;
  }
  if (cond.pullbackPctBand) {
    const win = ctx.candles.slice(Math.max(0, i - 19), i + 1);
    const high = Math.max(...win.map((c) => c.high));
    if (!(high > 0)) return false;
    const depth = ((high - close) / high) * 100;
    if (depth < cond.pullbackPctBand[0] || depth > cond.pullbackPctBand[1]) return false;
  }
  return true;
}

function classify(
  changePct: number,
  changeInAtr: number | null,
  method: ClassificationMethod,
  atrThreshold: number,
  percentThreshold: number,
): OutcomeClass {
  if (method === 'ATR_NORMALISED' && changeInAtr !== null) {
    if (changeInAtr > atrThreshold) return 'UP';
    if (changeInAtr < -atrThreshold) return 'DOWN';
    return 'SIDEWAYS';
  }
  if (changePct > percentThreshold) return 'UP';
  if (changePct < -percentThreshold) return 'DOWN';
  return 'SIDEWAYS';
}

/** Describes the current bar as a set of match conditions. */
export function conditionsFromNow(candles: Candle[], label: string): MatchConditions {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const s50 = sma(closes, 50);
  const r14 = rsi(closes, 14);
  const i = candles.length - 1;
  const close = closes[i];
  const e = e20[i];
  const s = s50[i];
  const r = r14[i];

  const win = candles.slice(Math.max(0, i - 19), i + 1);
  const high = Math.max(...win.map((c) => c.high));
  const depth = high > 0 ? ((high - close) / high) * 100 : 0;

  return {
    label,
    aboveEma20: typeof e === 'number' ? close > e : undefined,
    ema20AboveSma50: typeof e === 'number' && typeof s === 'number' ? e > s : undefined,
    rsiBand: typeof r === 'number' ? [Math.max(0, r - 8), Math.min(100, r + 8)] : undefined,
    pullbackPctBand: [Math.max(0, depth - 3), depth + 3],
  };
}
