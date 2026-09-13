// SwingEdge — Core indicator framework readouts.
//
// Three primary tools, each answering exactly one question:
//   20 EMA + 50 SMA  -> TREND
//   RSI 14           -> MOMENTUM
//   ATR 14           -> VOLATILITY AND RISK
//
// Price structure is primary. Indicators only support the read. There are no
// moving-average crossover entries here, and no RSI 70/30 rules — RSI is read
// as a state inside trend context instead.

import { atr as atrSeries, ema, last, rsi, sma } from './indicators';
import type { Candle } from './types';

export type TrendAlignment = 'STRONG' | 'ALIGNED' | 'MIXED' | 'AGAINST';

export interface TrendAlignmentRead {
  alignment: TrendAlignment;
  priceAboveEma20: boolean | null;
  ema20AboveSma50: boolean | null;
  ema20Rising: boolean | null;
  sma50Rising: boolean | null;
  higherHighsAndLows: boolean | null;
  /** How far price has pulled back from the recent swing high, in percent. */
  pullbackDepthPct: number | null;
  detail: string;
}

const pct = (n: number) => Math.round(n * 10) / 10;

function slopeRising(series: (number | null)[], lookback = 5): boolean | null {
  const nowIdx = series.length - 1;
  const thenIdx = nowIdx - lookback;
  if (thenIdx < 0) return null;
  const a = series[thenIdx];
  const b = series[nowIdx];
  if (typeof a !== 'number' || typeof b !== 'number') return null;
  return b > a;
}

/** Reads how well price, the 20 EMA and the 50 SMA agree on direction. */
export function trendAlignment(candles: Candle[]): TrendAlignmentRead {
  const closes = candles.map((c) => c.close);
  const e20 = ema(closes, 20);
  const s50 = sma(closes, 50);
  const price = closes[closes.length - 1] ?? null;
  const e = last(e20);
  const s = last(s50);

  const priceAboveEma20 = price !== null && e !== null ? price > e : null;
  const ema20AboveSma50 = e !== null && s !== null ? e > s : null;
  const ema20Rising = slopeRising(e20, 5);
  const sma50Rising = slopeRising(s50, 10);

  // Structure read: two rising swing highs and two rising swing lows.
  const win = candles.slice(-40);
  let higherHighsAndLows: boolean | null = null;
  let pullbackDepthPct: number | null = null;
  if (win.length >= 20) {
    const half = Math.floor(win.length / 2);
    const firstHigh = Math.max(...win.slice(0, half).map((c) => c.high));
    const lastHigh = Math.max(...win.slice(half).map((c) => c.high));
    const firstLow = Math.min(...win.slice(0, half).map((c) => c.low));
    const lastLow = Math.min(...win.slice(half).map((c) => c.low));
    higherHighsAndLows = lastHigh > firstHigh && lastLow > firstLow;
    if (price !== null && lastHigh > 0) {
      pullbackDepthPct = pct(((lastHigh - price) / lastHigh) * 100);
    }
  }

  const votes = [priceAboveEma20, ema20AboveSma50, ema20Rising, sma50Rising, higherHighsAndLows];
  const known = votes.filter((v) => v !== null) as boolean[];
  const agree = known.filter(Boolean).length;

  let alignment: TrendAlignment;
  if (known.length < 3) alignment = 'MIXED';
  else if (agree === known.length) alignment = 'STRONG';
  else if (agree >= known.length - 1) alignment = 'ALIGNED';
  else if (agree <= 1) alignment = 'AGAINST';
  else alignment = 'MIXED';

  const detail =
    alignment === 'STRONG'
      ? 'Price, both averages and the swing structure all point the same way.'
      : alignment === 'ALIGNED'
        ? 'Most of the trend evidence agrees, with one part lagging.'
        : alignment === 'AGAINST'
          ? 'The trend evidence points against a long setup here.'
          : 'The trend evidence is split, so this is not a clean trend read.';

  return {
    alignment,
    priceAboveEma20,
    ema20AboveSma50,
    ema20Rising,
    sma50Rising,
    higherHighsAndLows,
    pullbackDepthPct,
    detail,
  };
}

export type RsiState = 'STRENGTHENING' | 'STABLE' | 'WEAKENING' | 'EXTENDED';

export interface RsiRead {
  value: number | null;
  state: RsiState | null;
  changeOver5: number | null;
  detail: string;
}

/**
 * RSI read as a state, never as a buy or sell rule. A high reading in an uptrend
 * is strength, not an automatic sell.
 */
export function rsiRead(candles: Candle[], period = 14): RsiRead {
  const closes = candles.map((c) => c.close);
  const series = rsi(closes, period);
  const value = last(series);
  const prev = series.length > 6 ? series[series.length - 6] : null;
  const changeOver5 = typeof value === 'number' && typeof prev === 'number' ? Math.round((value - prev) * 10) / 10 : null;

  if (value === null) {
    return { value: null, state: null, changeOver5, detail: 'Not enough history to read momentum yet.' };
  }

  let state: RsiState;
  if (value >= 80) state = 'EXTENDED';
  else if (changeOver5 !== null && changeOver5 >= 4) state = 'STRENGTHENING';
  else if (changeOver5 !== null && changeOver5 <= -4) state = 'WEAKENING';
  else state = 'STABLE';

  const detail =
    state === 'EXTENDED'
      ? 'Momentum is stretched. That is not a sell rule, but chasing here usually means a worse entry.'
      : state === 'STRENGTHENING'
        ? 'Momentum is building compared with a week ago.'
        : state === 'WEAKENING'
          ? 'Momentum is fading compared with a week ago.'
          : 'Momentum is steady.';

  return { value: Math.round(value * 10) / 10, state, changeOver5, detail };
}

export interface AtrRead {
  value: number | null;
  percentOfPrice: number | null;
  /** Today's high-to-low range divided by ATR. */
  candleRangeVsAtr: number | null;
  entryDistanceInAtr: number | null;
  stopDistanceInAtr: number | null;
  expansion: boolean;
  detail: string;
}

/** ATR expressed the four ways the app teaches: value, share of price, range comparison, and distances. */
export function atrRead(
  candles: Candle[],
  opts: { entry?: number | null; stop?: number | null; period?: number } = {},
): AtrRead {
  const period = opts.period ?? 14;
  const series = atrSeries(candles, period);
  const value = last(series);
  const price = candles[candles.length - 1]?.close ?? null;
  const bar = candles[candles.length - 1] ?? null;
  const prior = series.length > 11 ? series[series.length - 11] : null;

  const percentOfPrice = value !== null && price ? Math.round((value / price) * 1000) / 10 : null;
  const candleRangeVsAtr = value && bar ? Math.round(((bar.high - bar.low) / value) * 100) / 100 : null;
  const entryDistanceInAtr =
    value && price && typeof opts.entry === 'number' ? Math.round((Math.abs(opts.entry - price) / value) * 100) / 100 : null;
  const stopDistanceInAtr =
    value && typeof opts.entry === 'number' && typeof opts.stop === 'number'
      ? Math.round((Math.abs(opts.entry - opts.stop) / value) * 100) / 100
      : null;
  const expansion = typeof value === 'number' && typeof prior === 'number' && prior > 0 ? value / prior >= 1.25 : false;

  const bits: string[] = [];
  if (percentOfPrice !== null) bits.push(`one normal day is about ${percentOfPrice}% of price`);
  if (candleRangeVsAtr !== null) bits.push(`today's range is ${candleRangeVsAtr} times normal`);
  if (stopDistanceInAtr !== null) bits.push(`the stop sits ${stopDistanceInAtr} normal days away`);
  if (expansion) bits.push('volatility has expanded sharply, so an old plan needs rechecking');

  return {
    value: value === null ? null : Math.round(value * 100) / 100,
    percentOfPrice,
    candleRangeVsAtr,
    entryDistanceInAtr,
    stopDistanceInAtr,
    expansion,
    detail: bits.length ? `Read this as: ${bits.join('; ')}.` : 'Not enough history to measure normal movement yet.',
  };
}

export type MomentumTool = 'RSI' | 'STOCHASTIC';

/**
 * Beginner Mode always uses RSI. Advanced Mode may swap to Stochastics, and it
 * is a swap rather than an addition so momentum is never counted twice.
 */
export function momentumTool(mode: 'BEGINNER' | 'ADVANCED', preferred: MomentumTool): MomentumTool {
  return mode === 'BEGINNER' ? 'RSI' : preferred;
}

export const MACD_ROLE_TEXT =
  'MACD is secondary confirmation only. It can support a read taken from price structure, and it can never create an entry or override the structure.';
