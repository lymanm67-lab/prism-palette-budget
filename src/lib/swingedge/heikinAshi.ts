// Heikin Ashi — a SECONDARY trend-confirmation view.
//
// Standard candles create the trade. Heikin Ashi only confirms whether the
// trend is worth trading. Nothing in this file may ever be used for entry,
// stop, target, support, resistance, ATR, position size, portfolio heat or
// Thinkorswim order prices — those all keep using actual market OHLC.
//
// Heikin Ashi values are calculated locally from the OHLC data already loaded,
// so no extra market-data request is needed, and there is no look-ahead: each
// bar only uses itself and the bar before it.

import type { Candle } from './types';

/** Smallest history that produces an honest reading. */
export const HA_MIN_CANDLES = 10;

export const HEIKIN_ASHI_NOTE =
  'Heikin Ashi candles use calculated values and are for trend confirmation. Entry, stop, target, and execution prices continue to use actual market prices.';

export const HEIKIN_ASHI_WHAT =
  'Heikin Ashi is a smoothed representation of price action designed to make trends easier to see. Its candle values are calculated rather than exact tradable OHLC prices.';

export const HEIKIN_ASHI_WHEN =
  'Use Heikin Ashi to confirm trend strength and momentum. Use standard candles for precise entries, stops, targets, support/resistance, and execution.';

/**
 * Heikin Ashi series calculated from actual candles.
 *
 * HA close = (open + high + low + close) / 4
 * HA open  = (previous HA open + previous HA close) / 2
 * HA high  = max(high, HA open, HA close)
 * HA low   = min(low, HA open, HA close)
 *
 * The first bar is initialised deterministically from the first actual candle.
 */
export function heikinAshi(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  let prevOpen = 0;
  let prevClose = 0;
  candles.forEach((c, i) => {
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevOpen + prevClose) / 2;
    out.push({
      datetime: c.datetime,
      open: haOpen,
      high: Math.max(c.high, haOpen, haClose),
      low: Math.min(c.low, haOpen, haClose),
      close: haClose,
      volume: c.volume,
    });
    prevOpen = haOpen;
    prevClose = haClose;
  });
  return out;
}

export type HaTrend = 'STRONG_BULLISH' | 'BULLISH' | 'TRANSITION' | 'BEARISH' | 'STRONG_BEARISH';

export const HA_TREND_LABEL: Record<HaTrend, string> = {
  STRONG_BULLISH: 'Strong bullish',
  BULLISH: 'Bullish',
  TRANSITION: 'Neutral / transition',
  BEARISH: 'Bearish',
  STRONG_BEARISH: 'Strong bearish',
};

export type HaPersistence = 'STRONG' | 'MODERATE' | 'WEAK';
export type HaMomentum = 'IMPROVING' | 'STEADY' | 'FADING';
export type HaTrendHealth = 'HEALTHY' | 'WEAKENING' | 'TRANSITION' | 'DETERIORATING';

export const HA_HEALTH_LABEL: Record<HaTrendHealth, string> = {
  HEALTHY: 'Healthy',
  WEAKENING: 'Weakening',
  TRANSITION: 'Possible transition',
  DETERIORATING: 'Deteriorating',
};

export interface HaRead {
  trend: HaTrend;
  label: string;
  /** How many of the most recent HA candles share one direction. */
  streak: number;
  streakDirection: 'UP' | 'DOWN';
  bodies: 'EXPANDING' | 'STABLE' | 'SHRINKING';
  persistence: HaPersistence;
  momentum: HaMomentum;
  /** Watch only — never a sell instruction. Needs actual-price confirmation. */
  reversalWatch: boolean;
  health: HaTrendHealth;
  /** Plain sentences behind the reading, for the "why" panel. */
  reasons: string[];
  candlesUsed: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * Read the Heikin Ashi trend from completed candles. Pass only completed
 * candles — the caller decides whether today's bar is finished.
 *
 * Returns null when there is not enough history. Never guesses.
 */
export function haRead(candles: Candle[]): HaRead | null {
  if (candles.length < HA_MIN_CANDLES) return null;
  const ha = heikinAshi(candles);
  const recent = ha.slice(-10);
  const lastBar = recent[recent.length - 1];
  const up = lastBar.close >= lastBar.open;

  let streak = 0;
  for (let i = recent.length - 1; i >= 0; i--) {
    const isUp = recent[i].close >= recent[i].open;
    if (isUp !== up) break;
    streak++;
  }

  const body = (c: Candle) => Math.abs(c.close - c.open);
  const range = (c: Candle) => Math.max(1e-9, c.high - c.low);
  const bodyRatio = (c: Candle) => body(c) / range(c);
  const upperWick = (c: Candle) => c.high - Math.max(c.open, c.close);
  const lowerWick = (c: Candle) => Math.min(c.open, c.close) - c.low;

  const lastThree = recent.slice(-3);
  const priorThree = recent.slice(-6, -3);
  const bodyNow = avg(lastThree.map(body));
  const bodyBefore = avg(priorThree.map(body));
  const bodies: HaRead['bodies'] =
    bodyBefore <= 0
      ? 'STABLE'
      : bodyNow > bodyBefore * 1.15
        ? 'EXPANDING'
        : bodyNow < bodyBefore * 0.7
          ? 'SHRINKING'
          : 'STABLE';

  const alternating = recent.slice(-4).filter((c, i, arr) => i > 0 && (c.close >= c.open) !== (arr[i - 1].close >= arr[i - 1].open)).length;
  const dojiLike = lastThree.filter((c) => bodyRatio(c) < 0.25).length;
  const risingHighs = lastBar.high > recent[recent.length - 3].high;
  const risingLows = lastBar.low > recent[recent.length - 3].low;
  const fallingHighs = lastBar.high < recent[recent.length - 3].high;
  const fallingLows = lastBar.low < recent[recent.length - 3].low;
  const smallOpposingWick = up
    ? avg(lastThree.map(lowerWick)) < avg(lastThree.map(body)) * 0.35
    : avg(lastThree.map(upperWick)) < avg(lastThree.map(body)) * 0.35;

  const reasons: string[] = [];
  reasons.push(
    `${streak} ${streak === 1 ? 'candle' : 'consecutive candles'} in the same direction (${up ? 'bullish' : 'bearish'}).`,
  );
  reasons.push(
    bodies === 'EXPANDING'
      ? 'Candle bodies are getting bigger.'
      : bodies === 'SHRINKING'
        ? 'Candle bodies are shrinking.'
        : 'Candle bodies are holding a steady size.',
  );
  if (smallOpposingWick) reasons.push(up ? 'Lower wicks are small or absent.' : 'Upper wicks are small or absent.');
  if (up && risingHighs && risingLows) reasons.push('Heikin Ashi highs and lows are both rising.');
  if (!up && fallingHighs && fallingLows) reasons.push('Heikin Ashi highs and lows are both falling.');
  if (dojiLike > 0) reasons.push(`${dojiLike} recent candle${dojiLike === 1 ? '' : 's'} had a very small body (doji-like).`);
  if (alternating >= 2) reasons.push('Recent candle colours are alternating.');

  // Transition first: a mixed, shrinking tape is not a trend either way.
  const transition = alternating >= 2 || (dojiLike >= 2 && streak <= 2) || (streak <= 1 && bodies !== 'EXPANDING');

  let trend: HaTrend;
  if (transition) {
    trend = 'TRANSITION';
  } else if (up) {
    const strong = streak >= 4 && bodies !== 'SHRINKING' && smallOpposingWick && risingHighs && risingLows;
    trend = strong ? 'STRONG_BULLISH' : 'BULLISH';
  } else {
    const strong = streak >= 4 && bodies !== 'SHRINKING' && smallOpposingWick && fallingHighs && fallingLows;
    trend = strong ? 'STRONG_BEARISH' : 'BEARISH';
  }

  const persistence: HaPersistence = streak >= 4 ? 'STRONG' : streak >= 2 ? 'MODERATE' : 'WEAK';
  const momentum: HaMomentum = bodies === 'EXPANDING' ? 'IMPROVING' : bodies === 'SHRINKING' ? 'FADING' : 'STEADY';

  // Reversal watch: a run of strong candles that is now losing its body or
  // growing an opposing wick. A watch, never a sell.
  const priorRun = ha.slice(-8, -3);
  const priorRunUp = priorRun.filter((c) => c.close >= c.open).length;
  const hadStrongRun = priorRunUp >= 4 || priorRunUp <= 1;
  const reversalWatch =
    hadStrongRun && (bodies === 'SHRINKING' || dojiLike >= 1 || alternating >= 1) && trend !== 'STRONG_BULLISH' && trend !== 'STRONG_BEARISH';
  if (reversalWatch) reasons.push('A strong run is losing body size — watch for a change, and wait for actual prices to confirm.');

  const health: HaTrendHealth =
    trend === 'TRANSITION'
      ? 'TRANSITION'
      : momentum === 'FADING' && persistence === 'WEAK'
        ? 'DETERIORATING'
        : momentum === 'FADING' || reversalWatch
          ? 'WEAKENING'
          : 'HEALTHY';

  return {
    trend,
    label: HA_TREND_LABEL[trend],
    streak,
    streakDirection: up ? 'UP' : 'DOWN',
    bodies,
    persistence,
    momentum,
    reversalWatch,
    health,
    reasons,
    candlesUsed: candles.length,
  };
}

export type HaConfirmation = 'CONFIRMS' | 'PARTIALLY_CONFIRMS' | 'NEUTRAL' | 'CONTRADICTS';

export const HA_CONFIRMATION_LABEL: Record<HaConfirmation, string> = {
  CONFIRMS: 'Confirms',
  PARTIALLY_CONFIRMS: 'Partially confirms',
  NEUTRAL: 'Neutral',
  CONTRADICTS: 'Contradicts',
};

/** Compact scanner-friendly codes. */
export const HA_SHORT: Record<HaTrend, 'BULL' | 'BEAR' | 'NEUTRAL'> = {
  STRONG_BULLISH: 'BULL',
  BULLISH: 'BULL',
  TRANSITION: 'NEUTRAL',
  BEARISH: 'BEAR',
  STRONG_BEARISH: 'BEAR',
};

export type RegularTrendDirection = 'UP' | 'DOWN' | 'SIDEWAYS';

/**
 * Compare the smoothed trend against the regular-candle trend.
 * Returns null when either side is unknown — never a guess.
 */
export function haConfirmation(
  regular: RegularTrendDirection | null | undefined,
  ha: HaRead | null | undefined,
): HaConfirmation | null {
  if (!ha || !regular) return null;
  if (regular === 'SIDEWAYS') return ha.trend === 'TRANSITION' ? 'NEUTRAL' : 'PARTIALLY_CONFIRMS';
  const bullish = ha.trend === 'BULLISH' || ha.trend === 'STRONG_BULLISH';
  const bearish = ha.trend === 'BEARISH' || ha.trend === 'STRONG_BEARISH';
  if (ha.trend === 'TRANSITION') return 'NEUTRAL';
  if (regular === 'UP') {
    if (ha.trend === 'STRONG_BULLISH') return 'CONFIRMS';
    if (bullish) return ha.momentum === 'FADING' ? 'PARTIALLY_CONFIRMS' : 'CONFIRMS';
    return bearish ? 'CONTRADICTS' : 'NEUTRAL';
  }
  if (ha.trend === 'STRONG_BEARISH') return 'CONFIRMS';
  if (bearish) return ha.momentum === 'FADING' ? 'PARTIALLY_CONFIRMS' : 'CONFIRMS';
  return bullish ? 'CONTRADICTS' : 'NEUTRAL';
}

/**
 * Plain caution line for the Analyzer / Planner. Heikin Ashi may add a note or
 * a reason to wait — it can never create a GO or clear a hard gate.
 */
export function haCaution(confirmation: HaConfirmation | null): string | null {
  if (confirmation === 'CONTRADICTS')
    return 'The smoothed trend disagrees with the regular-candle setup — worth a review before risking money.';
  if (confirmation === 'NEUTRAL') return 'The smoothed trend is flat, so it neither helps nor hurts this setup.';
  return null;
}
