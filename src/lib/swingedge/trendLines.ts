import type { Candle } from './types';
import { ema, sma } from './indicators';

/**
 * Trend line helpers for the candlestick chart.
 *
 * Two things are drawn:
 *  - moving average curves (20 EMA, 50 SMA) as supporting context
 *  - sloping trend lines fitted through recent swing highs and swing lows
 *
 * Price structure stays primary: the sloping lines come from actual pivots in
 * the data, never from a smoothed indicator.
 */

export interface MovingAverageSeries {
  label: string;
  values: (number | null)[];
}

export function movingAverages(candles: Candle[]): MovingAverageSeries[] {
  const closes = candles.map((c) => c.close);
  return [
    { label: '20 EMA', values: ema(closes, 20) },
    { label: '50 SMA', values: sma(closes, 50) },
  ];
}

export type TrendLineKind = 'RESISTANCE' | 'SUPPORT';

export interface TrendLine {
  kind: TrendLineKind;
  /** Index into the candle array where the line starts / ends. */
  startIndex: number;
  endIndex: number;
  startPrice: number;
  endPrice: number;
  /** Price change per candle. Positive = rising line. */
  slope: number;
  /** How many pivots the line was fitted through. */
  pivots: number;
  direction: 'RISING' | 'FALLING' | 'FLAT';
}

interface Pivot {
  index: number;
  price: number;
}

/** A swing high / low needs `reach` candles on each side that do not exceed it. */
function pivots(candles: Candle[], kind: TrendLineKind, reach: number): Pivot[] {
  const out: Pivot[] = [];
  for (let i = reach; i < candles.length - reach; i++) {
    const price = kind === 'RESISTANCE' ? candles[i].high : candles[i].low;
    let isPivot = true;
    for (let j = i - reach; j <= i + reach; j++) {
      if (j === i) continue;
      const other = kind === 'RESISTANCE' ? candles[j].high : candles[j].low;
      if (kind === 'RESISTANCE' ? other > price : other < price) {
        isPivot = false;
        break;
      }
    }
    if (isPivot) out.push({ index: i, price });
  }
  return out;
}

/** Least-squares fit through the pivots, so one odd spike cannot swing the line. */
function fit(points: Pivot[]): { slope: number; intercept: number } | null {
  if (points.length < 2) return null;
  const n = points.length;
  let sx = 0;
  let sy = 0;
  let sxy = 0;
  let sxx = 0;
  for (const p of points) {
    sx += p.index;
    sy += p.price;
    sxy += p.index * p.price;
    sxx += p.index * p.index;
  }
  const denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const slope = (n * sxy - sx * sy) / denom;
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

export const MIN_TREND_CANDLES = 30;

/**
 * Fit an upper (resistance) and lower (support) trend line through the most
 * recent swing points. Returns an empty list when there is not enough
 * structure to draw an honest line.
 */
export function buildTrendLines(candles: Candle[], reach = 3, maxPivots = 5): TrendLine[] {
  if (candles.length < MIN_TREND_CANDLES) return [];
  const lines: TrendLine[] = [];

  for (const kind of ['RESISTANCE', 'SUPPORT'] as TrendLineKind[]) {
    const all = pivots(candles, kind, reach);
    if (all.length < 2) continue;
    const recent = all.slice(-maxPivots);
    const f = fit(recent);
    if (!f) continue;

    const startIndex = recent[0].index;
    const endIndex = candles.length - 1;
    const startPrice = f.intercept + f.slope * startIndex;
    const endPrice = f.intercept + f.slope * endIndex;
    if (!Number.isFinite(startPrice) || !Number.isFinite(endPrice)) continue;

    // Flat is anything under 0.05% of price drift per candle.
    const reference = candles[endIndex].close || 1;
    const drift = Math.abs(f.slope) / reference;
    const direction = drift < 0.0005 ? 'FLAT' : f.slope > 0 ? 'RISING' : 'FALLING';

    lines.push({
      kind,
      startIndex,
      endIndex,
      startPrice,
      endPrice,
      slope: f.slope,
      pivots: recent.length,
      direction,
    });
  }

  return lines;
}

export function trendLineSummary(lines: TrendLine[]): string {
  if (!lines.length) return 'Not enough swing highs and lows yet to draw trend lines.';
  const upper = lines.find((l) => l.kind === 'RESISTANCE');
  const lower = lines.find((l) => l.kind === 'SUPPORT');
  const word = (d: TrendLine['direction']) => (d === 'RISING' ? 'rising' : d === 'FALLING' ? 'falling' : 'flat');
  if (upper && lower) {
    if (upper.direction === lower.direction && upper.direction !== 'FLAT') {
      return `Both trend lines are ${word(upper.direction)}, so price is travelling in a ${word(upper.direction)} channel.`;
    }
    if (upper.direction === 'FALLING' && lower.direction === 'RISING') {
      return 'The lines are squeezing together, so the range is tightening.';
    }
    if (upper.direction === 'RISING' && lower.direction === 'FALLING') {
      return 'The lines are spreading apart, so swings are getting wider.';
    }
    return `Upper line ${word(upper.direction)}, lower line ${word(lower.direction)}.`;
  }
  const only = upper ?? lower!;
  return `One ${word(only.direction)} ${only.kind === 'RESISTANCE' ? 'upper' : 'lower'} trend line fitted.`;
}
