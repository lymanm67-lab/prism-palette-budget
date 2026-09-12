// SwingEdge Analyzer — candle anatomy and classification.
//
// Every candlestick judgement in the app starts here: one candle is measured
// (body, wicks, close location, size against ATR and against its own recent
// average) before any pattern name is attached to it. Pure functions over OHLCV
// candles, no provider calls, no image recognition — every rule is arithmetic on
// open/high/low/close so the reasoning can always be shown to the trader.

import { atr } from './indicators';
import type { Candle } from './types';

/**
 * Tolerances live in configuration rather than being hard-coded through the
 * detection rules, so Advanced Mode can adjust them without touching the maths.
 */
export interface CandleConfig {
  /** A body smaller than this share of the total range counts as a doji. */
  dojiBodyPct: number;
  /** A long-legged doji also needs both wicks at least this share of range. */
  dojiLongLegWickPct: number;
  /** Hammer / pin bar: lower wick must be at least this multiple of the body. */
  wickToBodyRatio: number;
  /** Hammer: the opposite wick must stay below this share of the range. */
  oppositeWickMaxPct: number;
  /** Price equality tolerance, as a share of the candle range. */
  engulfTolerancePct: number;
  /** Volume at or above this multiple of average counts as confirming. */
  volumeConfirmRatio: number;
  /** Volume below this multiple of average actively weakens a pattern. */
  volumeWeakRatio: number;
  /** Range at or above this multiple of ATR is an expansion candle. */
  expansionAtrRatio: number;
  /** Range at or above this multiple of ATR is a large candle. */
  largeAtrRatio: number;
  /** Range at or below this multiple of ATR is a small candle. */
  smallAtrRatio: number;
  /** Strong close: close must sit in this top share of the range. */
  strongClosePct: number;
  /** Strong close: body must be at least this share of the range. */
  strongCloseBodyPct: number;
  /** A level counts as "near" when price is within this share of ATR of it. */
  nearLevelAtrRatio: number;
  /** Patterns below this confirmation score are hidden by default. */
  minConfirmationScore: number;
}

export const DEFAULT_CANDLE_CONFIG: CandleConfig = {
  dojiBodyPct: 0.1,
  dojiLongLegWickPct: 0.3,
  wickToBodyRatio: 2,
  oppositeWickMaxPct: 0.25,
  engulfTolerancePct: 0.02,
  volumeConfirmRatio: 1.15,
  volumeWeakRatio: 0.8,
  expansionAtrRatio: 2,
  largeAtrRatio: 1.4,
  smallAtrRatio: 0.6,
  strongClosePct: 0.8,
  strongCloseBodyPct: 0.5,
  nearLevelAtrRatio: 0.75,
  minConfirmationScore: 55,
};

export type CandleClass = 'STRONG BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG BEARISH';
export type CandleSize = 'SMALL' | 'NORMAL' | 'LARGE' | 'EXPANSION';
export type WickShape = 'LONG LOWER WICK' | 'LONG UPPER WICK' | 'DUAL LONG WICKS' | 'NO SIGNIFICANT WICK';

export interface CandleAnatomy {
  index: number;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  /** Real body size, always positive. */
  body: number;
  bodyPct: number;
  upperWick: number;
  lowerWick: number;
  upperWickPct: number;
  lowerWickPct: number;
  range: number;
  direction: 'UP' | 'DOWN' | 'FLAT';
  /** 0 = closed on the low, 1 = closed on the high. */
  closeLocation: number;
  /** Gap between this open and the previous close, in price. Null on the first candle. */
  gapFromPrevClose: number | null;
  /** Range measured against ATR. Null when ATR is unavailable. */
  rangeAtrRatio: number | null;
  /** Range measured against the average range of the prior 20 candles. */
  rangeAvgRatio: number | null;
  /** Volume against the average of the prior 20 candles. */
  volumeRatio: number | null;
  classification: CandleClass;
  size: CandleSize;
  wickShape: WickShape;
}

/** True when one candle has usable, self-consistent OHLC values. */
export function candleIsValid(c: Candle | undefined | null): boolean {
  if (!c) return false;
  const nums = [c.open, c.high, c.low, c.close];
  if (nums.some((n) => typeof n !== 'number' || !Number.isFinite(n) || n <= 0)) return false;
  if (typeof c.volume !== 'number' || !Number.isFinite(c.volume) || c.volume < 0) return false;
  if (!c.date) return false;
  if (c.high < c.low) return false;
  if (c.high < c.open || c.high < c.close) return false;
  if (c.low > c.open || c.low > c.close) return false;
  return true;
}

export interface DataQuality {
  ok: boolean;
  message: string | null;
  invalidCount: number;
}

/** Guards the whole engine: bad OHLC data means no pattern is reported at all. */
export function checkCandleData(candles: Candle[], needed = 30): DataQuality {
  if (!candles || candles.length < needed) {
    return {
      ok: false,
      message: `CANDLE DATA INCOMPLETE — ${candles?.length ?? 0} days of prices available, at least ${needed} are needed.`,
      invalidCount: 0,
    };
  }
  const invalidCount = candles.filter((c) => !candleIsValid(c)).length;
  if (invalidCount > 0) {
    return {
      ok: false,
      message: `CANDLE DATA INCOMPLETE — ${invalidCount} day${invalidCount === 1 ? '' : 's'} of prices do not make sense, so no pattern is reported.`,
      invalidCount,
    };
  }
  return { ok: true, message: null, invalidCount: 0 };
}

function classify(a: Omit<CandleAnatomy, 'classification' | 'size' | 'wickShape'>, cfg: CandleConfig): CandleClass {
  if (a.range <= 0) return 'NEUTRAL';
  if (a.bodyPct < cfg.dojiBodyPct) return 'NEUTRAL';
  const strong = a.bodyPct >= cfg.strongCloseBodyPct;
  if (a.direction === 'UP') {
    return strong && a.closeLocation >= cfg.strongClosePct ? 'STRONG BULLISH' : 'BULLISH';
  }
  if (a.direction === 'DOWN') {
    return strong && a.closeLocation <= 1 - cfg.strongClosePct ? 'STRONG BEARISH' : 'BEARISH';
  }
  return 'NEUTRAL';
}

function sizeOf(rangeAtrRatio: number | null, rangeAvgRatio: number | null, cfg: CandleConfig): CandleSize {
  const ratio = rangeAtrRatio ?? rangeAvgRatio;
  if (ratio === null) return 'NORMAL';
  if (ratio >= cfg.expansionAtrRatio) return 'EXPANSION';
  if (ratio >= cfg.largeAtrRatio) return 'LARGE';
  if (ratio <= cfg.smallAtrRatio) return 'SMALL';
  return 'NORMAL';
}

function wickShapeOf(upperPct: number, lowerPct: number): WickShape {
  const longUpper = upperPct >= 0.33;
  const longLower = lowerPct >= 0.33;
  if (longUpper && longLower) return 'DUAL LONG WICKS';
  if (longLower) return 'LONG LOWER WICK';
  if (longUpper) return 'LONG UPPER WICK';
  return 'NO SIGNIFICANT WICK';
}

/**
 * Measures every candle in the series. Index i of the result lines up with index
 * i of the input, so pattern rules can look back without re-deriving anything.
 */
export function anatomySeries(candles: Candle[], cfg: CandleConfig = DEFAULT_CANDLE_CONFIG): CandleAnatomy[] {
  const atrSeries = atr(candles, 14);
  return candles.map((c, i) => {
    const range = c.high - c.low;
    const body = Math.abs(c.close - c.open);
    const upperWick = c.high - Math.max(c.open, c.close);
    const lowerWick = Math.min(c.open, c.close) - c.low;
    const safeRange = range > 0 ? range : 0;
    const priorRanges = candles.slice(Math.max(0, i - 20), i).map((p) => p.high - p.low);
    const avgRange = priorRanges.length ? priorRanges.reduce((a, b) => a + b, 0) / priorRanges.length : null;
    const priorVolumes = candles.slice(Math.max(0, i - 20), i).map((p) => p.volume);
    const avgVolume = priorVolumes.length ? priorVolumes.reduce((a, b) => a + b, 0) / priorVolumes.length : null;
    const atrValue = atrSeries[i];

    const base = {
      index: i,
      date: c.date,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
      body,
      bodyPct: safeRange > 0 ? body / safeRange : 0,
      upperWick,
      lowerWick,
      upperWickPct: safeRange > 0 ? upperWick / safeRange : 0,
      lowerWickPct: safeRange > 0 ? lowerWick / safeRange : 0,
      range,
      direction: (c.close > c.open ? 'UP' : c.close < c.open ? 'DOWN' : 'FLAT') as 'UP' | 'DOWN' | 'FLAT',
      closeLocation: safeRange > 0 ? (c.close - c.low) / safeRange : 0.5,
      gapFromPrevClose: i > 0 ? c.open - candles[i - 1].close : null,
      rangeAtrRatio: atrValue && atrValue > 0 ? range / atrValue : null,
      rangeAvgRatio: avgRange && avgRange > 0 ? range / avgRange : null,
      volumeRatio: avgVolume && avgVolume > 0 ? c.volume / avgVolume : null,
    };

    return {
      ...base,
      classification: classify(base, cfg),
      size: sizeOf(base.rangeAtrRatio, base.rangeAvgRatio, cfg),
      wickShape: wickShapeOf(base.upperWickPct, base.lowerWickPct),
    };
  });
}

/** Plain-English description of one candle, used in explanations and tooltips. */
export function describeCandle(a: CandleAnatomy): string {
  const closeWhere =
    a.closeLocation >= 0.8
      ? 'closed near its high'
      : a.closeLocation <= 0.2
        ? 'closed near its low'
        : 'closed around the middle of its range';
  const sizeText =
    a.size === 'EXPANSION'
      ? 'an unusually wide day'
      : a.size === 'LARGE'
        ? 'a wider day than normal'
        : a.size === 'SMALL'
          ? 'a quiet, narrow day'
          : 'a normal-sized day';
  return `${sizeText} that ${closeWhere}${a.wickShape === 'NO SIGNIFICANT WICK' ? '' : `, with a ${a.wickShape.toLowerCase()}`}.`;
}

/** Weekly candles built from daily candles — free higher-timeframe context, no extra data pulls. */
export function toWeekly(candles: Candle[]): Candle[] {
  const out: Candle[] = [];
  let bucket: Candle[] = [];
  const weekKey = (iso: string) => {
    const d = new Date(iso);
    const day = (d.getUTCDay() + 6) % 7; // Monday = 0
    const monday = new Date(d);
    monday.setUTCDate(d.getUTCDate() - day);
    return monday.toISOString().slice(0, 10);
  };
  let currentKey: string | null = null;
  const flush = () => {
    if (!bucket.length) return;
    out.push({
      date: bucket[0].date,
      open: bucket[0].open,
      high: Math.max(...bucket.map((c) => c.high)),
      low: Math.min(...bucket.map((c) => c.low)),
      close: bucket[bucket.length - 1].close,
      volume: bucket.reduce((a, c) => a + c.volume, 0),
    });
    bucket = [];
  };
  for (const c of candles) {
    if (!candleIsValid(c)) continue;
    const key = weekKey(c.date);
    if (currentKey !== null && key !== currentKey) flush();
    currentKey = key;
    bucket.push(c);
  }
  flush();
  return out;
}
