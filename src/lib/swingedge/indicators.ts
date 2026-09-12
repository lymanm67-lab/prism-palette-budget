// SwingEdge Analyzer — local indicator math.
// All indicators are computed from cached OHLCV candles so no API credits are
// spent on indicator endpoints. Pure functions, no side effects.

import type { Candle, TrendState } from './types';

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** Simple moving average series. Index i holds the SMA ending at candle i. */
export function sma(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0) return out;
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= period) sum -= values[i - period];
    if (i >= period - 1) out[i] = sum / period;
  }
  return out;
}

/** Exponential moving average series, seeded with the first SMA. */
export function ema(values: number[], period: number): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (period <= 0 || values.length < period) return out;
  const k = 2 / (period + 1);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += values[i];
  let prev = seed / period;
  out[period - 1] = prev;
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out[i] = prev;
  }
  return out;
}

/** Wilder's RSI. */
export function rsi(values: number[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(values.length).fill(null);
  if (values.length <= period) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const d = values[i] - values[i - 1];
    if (d >= 0) gain += d;
    else loss -= d;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  out[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  for (let i = period + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    const g = d > 0 ? d : 0;
    const l = d < 0 ? -d : 0;
    avgGain = (avgGain * (period - 1) + g) / period;
    avgLoss = (avgLoss * (period - 1) + l) / period;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return out;
}

export interface MacdSeries {
  macd: (number | null)[];
  signal: (number | null)[];
  histogram: (number | null)[];
}

export function macd(values: number[], fast = 12, slow = 26, signalPeriod = 9): MacdSeries {
  const fastE = ema(values, fast);
  const slowE = ema(values, slow);
  const line: (number | null)[] = values.map((_, i) =>
    isNum(fastE[i]) && isNum(slowE[i]) ? (fastE[i] as number) - (slowE[i] as number) : null,
  );
  const firstIdx = line.findIndex((v) => isNum(v));
  const signal: (number | null)[] = new Array(values.length).fill(null);
  if (firstIdx >= 0) {
    const compact = line.slice(firstIdx).map((v) => v as number);
    const sig = ema(compact, signalPeriod);
    sig.forEach((v, i) => {
      signal[firstIdx + i] = v;
    });
  }
  const histogram = line.map((v, i) =>
    isNum(v) && isNum(signal[i]) ? (v as number) - (signal[i] as number) : null,
  );
  return { macd: line, signal, histogram };
}

/** Average True Range (Wilder smoothing). Used for stop distance context. */
export function atr(candles: Candle[], period = 14): (number | null)[] {
  const out: (number | null)[] = new Array(candles.length).fill(null);
  if (candles.length <= period) return out;
  const tr: number[] = [0];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prevClose = candles[i - 1].close;
    tr.push(Math.max(c.high - c.low, Math.abs(c.high - prevClose), Math.abs(c.low - prevClose)));
  }
  let sum = 0;
  for (let i = 1; i <= period; i++) sum += tr[i];
  let prev = sum / period;
  out[period] = prev;
  for (let i = period + 1; i < candles.length; i++) {
    prev = (prev * (period - 1) + tr[i]) / period;
    out[i] = prev;
  }
  return out;
}

export interface StochasticSeries {
  k: (number | null)[];
  d: (number | null)[];
}

export function stochastic(candles: Candle[], period = 14, smoothD = 3): StochasticSeries {
  const k: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = period - 1; i < candles.length; i++) {
    let hi = -Infinity;
    let lo = Infinity;
    for (let j = i - period + 1; j <= i; j++) {
      hi = Math.max(hi, candles[j].high);
      lo = Math.min(lo, candles[j].low);
    }
    k[i] = hi === lo ? 50 : ((candles[i].close - lo) / (hi - lo)) * 100;
  }
  const d: (number | null)[] = new Array(candles.length).fill(null);
  for (let i = 0; i < candles.length; i++) {
    const window = k.slice(Math.max(0, i - smoothD + 1), i + 1).filter(isNum) as number[];
    if (window.length === smoothD) d[i] = window.reduce((a, b) => a + b, 0) / smoothD;
  }
  return { k, d };
}

/** Current volume relative to its recent average. 1.0 means average. */
export function relativeVolume(candles: Candle[], period = 20): number | null {
  if (candles.length < period + 1) return null;
  const recent = candles.slice(-period - 1, -1);
  const avg = recent.reduce((a, c) => a + c.volume, 0) / recent.length;
  if (avg <= 0) return null;
  return candles[candles.length - 1].volume / avg;
}

export function last<T>(series: (T | null)[]): T | null {
  for (let i = series.length - 1; i >= 0; i--) if (series[i] !== null) return series[i] as T;
  return null;
}

/** Trend from the 20 EMA / 50 SMA relationship plus price position. */
export function trendState(candles: Candle[]): TrendState {
  const closes = candles.map((c) => c.close);
  const e20 = last(ema(closes, 20));
  const s50 = last(sma(closes, 50));
  const price = closes[closes.length - 1];
  if (!isNum(e20) || !isNum(s50) || !isNum(price)) return 'SIDEWAYS';
  const spread = Math.abs(e20 - s50) / s50;
  if (spread < 0.005) return 'SIDEWAYS';
  if (e20 > s50 && price > s50) return 'UP';
  if (e20 < s50 && price < s50) return 'DOWN';
  return 'SIDEWAYS';
}

export interface SupportResistance {
  support: number | null;
  resistance: number | null;
}

/** Swing high / low levels from a lookback window. */
export function supportResistance(candles: Candle[], lookback = 40): SupportResistance {
  if (candles.length < 5) return { support: null, resistance: null };
  const window = candles.slice(-lookback);
  const lows = window.map((c) => c.low);
  const highs = window.map((c) => c.high);
  return { support: Math.min(...lows), resistance: Math.max(...highs) };
}

export type SetupState = 'BREAKOUT' | 'PULLBACK' | 'NONE';

/**
 * Breakout: latest close clears the prior window's highest high on above-average
 * volume. Pullback: uptrend intact but price has eased back toward the 20 EMA.
 */
export function setupState(candles: Candle[], lookback = 20): SetupState {
  if (candles.length < lookback + 25) return 'NONE';
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const priorHigh = Math.max(...candles.slice(-lookback - 1, -1).map((c) => c.high));
  const rvol = relativeVolume(candles) ?? 0;
  if (price > priorHigh && rvol >= 1) return 'BREAKOUT';

  const e20 = last(ema(closes, 20));
  const trend = trendState(candles);
  if (trend === 'UP' && isNum(e20)) {
    const distance = (price - e20) / e20;
    if (distance <= 0.02 && distance >= -0.04) return 'PULLBACK';
  }
  return 'NONE';
}

export interface IndicatorSnapshot {
  price: number;
  ema20: number | null;
  sma50: number | null;
  sma200: number | null;
  rsi14: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHistogram: number | null;
  atr14: number | null;
  stochasticK: number | null;
  stochasticD: number | null;
  relativeVolume: number | null;
  trend: TrendState;
  support: number | null;
  resistance: number | null;
  setup: SetupState;
}

/** One pass over cached candles produces every value the engine needs. */
export function snapshot(candles: Candle[]): IndicatorSnapshot | null {
  if (!candles.length) return null;
  const closes = candles.map((c) => c.close);
  const m = macd(closes);
  const st = stochastic(candles);
  const sr = supportResistance(candles);
  return {
    price: closes[closes.length - 1],
    ema20: last(ema(closes, 20)),
    sma50: last(sma(closes, 50)),
    sma200: last(sma(closes, 200)),
    rsi14: last(rsi(closes, 14)),
    macd: last(m.macd),
    macdSignal: last(m.signal),
    macdHistogram: last(m.histogram),
    atr14: last(atr(candles, 14)),
    stochasticK: last(st.k),
    stochasticD: last(st.d),
    relativeVolume: relativeVolume(candles),
    trend: trendState(candles),
    support: sr.support,
    resistance: sr.resistance,
    setup: setupState(candles),
  };
}

export type VolumeCondition = 'HEAVY' | 'ABOVE AVERAGE' | 'AVERAGE' | 'LIGHT' | 'UNKNOWN';

export function volumeCondition(rvol: number | null): VolumeCondition {
  if (rvol === null) return 'UNKNOWN';
  if (rvol >= 1.75) return 'HEAVY';
  if (rvol >= 1.15) return 'ABOVE AVERAGE';
  if (rvol >= 0.75) return 'AVERAGE';
  return 'LIGHT';
}
