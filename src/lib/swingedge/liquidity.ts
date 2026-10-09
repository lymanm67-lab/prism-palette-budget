// SwingEdge — Liquidity & Buyer/Seller Intelligence (Phase 1).
// Built only from real OHLCV candles. Volume can't tell us who actually bought
// or sold, so every reading here is an estimate from where price closed inside
// each candle's range. Missing or thin data returns null, never a guess.

import type { Candle } from './types';

export type PressureState = 'BUYERS_IN_CONTROL' | 'BUYERS_LEANING' | 'BALANCED' | 'SELLERS_LEANING' | 'SELLERS_IN_CONTROL';
export type LiquidityGrade = 'HIGH' | 'ADEQUATE' | 'THIN' | 'UNKNOWN';

export interface PressureBar {
  datetime: string;
  buyVolume: number;
  sellVolume: number;
  /** Close location value, -1 (closed at low) to +1 (closed at high). */
  clv: number;
}

export interface LiquidityRead {
  bars: PressureBar[];
  /** Chaikin Money Flow over 20 candles, -1..+1. */
  cmf20: number | null;
  /** Estimated buy share of volume over the last 20 candles, 0..1. */
  buyShare20: number | null;
  /** Today's volume vs the 20-candle average. */
  relativeVolume: number | null;
  /** Average daily dollar volume over 20 candles. */
  avgDollarVolume: number | null;
  obvTrend: 'RISING' | 'FALLING' | 'FLAT' | null;
  state: PressureState | null;
  grade: LiquidityGrade;
  /** Score 0..100 (50 = balanced). */
  score: number | null;
  notes: string[];
}

export const PRESSURE_LABEL: Record<PressureState, string> = {
  BUYERS_IN_CONTROL: 'Buyers in control',
  BUYERS_LEANING: 'Buyers leaning',
  BALANCED: 'Balanced',
  SELLERS_LEANING: 'Sellers leaning',
  SELLERS_IN_CONTROL: 'Sellers in control',
};

function clvOf(c: Candle): number {
  const range = c.high - c.low;
  if (!(range > 0)) return 0;
  return ((c.close - c.low) - (c.high - c.close)) / range;
}

export function pressureBars(candles: Candle[]): PressureBar[] {
  return candles.map((c) => {
    const clv = clvOf(c);
    const v = Math.max(0, c.volume || 0);
    const buyShare = (clv + 1) / 2;
    return { datetime: c.datetime, clv, buyVolume: v * buyShare, sellVolume: v * (1 - buyShare) };
  });
}

export function analyzeLiquidity(candles: Candle[], window = 20): LiquidityRead {
  const notes: string[] = [];
  const valid = candles.filter((c) => Number.isFinite(c.close) && c.volume > 0);
  const bars = pressureBars(candles);
  if (valid.length < window) {
    return {
      bars, cmf20: null, buyShare20: null, relativeVolume: null, avgDollarVolume: null,
      obvTrend: null, state: null, grade: 'UNKNOWN', score: null,
      notes: [`Needs at least ${window} candles with volume — only ${valid.length} available.`],
    };
  }
  const recent = valid.slice(-window);
  const recentBars = pressureBars(recent);
  const vol = recent.reduce((s, c) => s + c.volume, 0);
  const mfv = recent.reduce((s, c) => s + clvOf(c) * c.volume, 0);
  const cmf20 = vol > 0 ? mfv / vol : null;
  const buy = recentBars.reduce((s, b) => s + b.buyVolume, 0);
  const buyShare20 = vol > 0 ? buy / vol : null;
  const avgVol = vol / recent.length;
  const lastC = recent[recent.length - 1];
  const relativeVolume = avgVol > 0 ? lastC.volume / avgVol : null;
  const avgDollarVolume = recent.reduce((s, c) => s + c.volume * c.close, 0) / recent.length;

  // OBV slope over the window.
  let obv = 0;
  const obvSeries: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const d = recent[i].close - recent[i - 1].close;
    obv += d > 0 ? recent[i].volume : d < 0 ? -recent[i].volume : 0;
    obvSeries.push(obv);
  }
  const obvDelta = obvSeries.length ? obvSeries[obvSeries.length - 1] - obvSeries[0] : 0;
  const obvTrend = Math.abs(obvDelta) < vol * 0.1 ? 'FLAT' : obvDelta > 0 ? 'RISING' : 'FALLING';

  const grade: LiquidityGrade =
    avgDollarVolume >= 50_000_000 ? 'HIGH' : avgDollarVolume >= 5_000_000 ? 'ADEQUATE' : 'THIN';
  if (grade === 'THIN') notes.push('Thin trading: fills can slip and stops can gap. Size down or skip.');

  const c = cmf20 ?? 0;
  const score = Math.round(Math.max(0, Math.min(100, 50 + c * 150 + (obvTrend === 'RISING' ? 8 : obvTrend === 'FALLING' ? -8 : 0))));
  const state: PressureState =
    score >= 70 ? 'BUYERS_IN_CONTROL' : score >= 57 ? 'BUYERS_LEANING' : score > 43 ? 'BALANCED'
      : score > 30 ? 'SELLERS_LEANING' : 'SELLERS_IN_CONTROL';

  if (relativeVolume != null && relativeVolume >= 1.5) {
    notes.push(`Latest candle traded ${relativeVolume.toFixed(1)}× normal volume — ${clvOf(lastC) >= 0 ? 'buyers' : 'sellers'} pushed harder than usual.`);
  }
  if (obvTrend === 'RISING' && c < 0) notes.push('Volume trend is rising while closes sit low in range — mixed signal.');
  if (obvTrend === 'FALLING' && c > 0) notes.push('Closes are strong but volume trend is falling — buyers may be tiring.');
  notes.push('Estimated from where each candle closed in its range — not actual order flow.');

  return { bars, cmf20, buyShare20, relativeVolume, avgDollarVolume, obvTrend, state, grade, score, notes };
}
