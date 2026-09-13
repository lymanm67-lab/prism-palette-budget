// SwingEdge — chart direction strip.
//
// Splits the visible candles into equal windows and classifies each window as
// UP, DOWN or SIDEWAYS by reusing the existing trendAlignment read (20 EMA vs
// 50 SMA, price position, swing structure). Display-only: it never feeds
// signals, scores or gates.

import { trendAlignment, type TrendAlignment } from './framework';
import type { Candle } from './types';

export type StripDirection = 'UP' | 'DOWN' | 'SIDEWAYS';

export interface DirectionSegment {
  /** Inclusive candle indexes into the array passed to buildDirectionStrip. */
  startIndex: number;
  endIndex: number;
  startDate: string;
  endDate: string;
  direction: StripDirection;
  alignment: TrendAlignment | null;
}

export const STRIP_SEGMENTS = 24;

/** Maps a trendAlignment read to a display direction for one window. */
export function directionFromAlignment(
  alignment: TrendAlignment,
  priceAboveEma20: boolean | null,
): StripDirection {
  if (alignment === 'STRONG') return 'UP';
  if (alignment === 'AGAINST') return 'DOWN';
  if (alignment === 'ALIGNED') {
    // Mostly agreeing evidence: price position breaks the tie.
    if (priceAboveEma20 === true) return 'UP';
    if (priceAboveEma20 === false) return 'DOWN';
    return 'SIDEWAYS';
  }
  return 'SIDEWAYS';
}

/**
 * Builds the strip. Windows look back over the full history available up to
 * each window end, so early segments in a short history read as SIDEWAYS
 * rather than fake confidence.
 */
export function buildDirectionStrip(candles: Candle[], segments = STRIP_SEGMENTS): DirectionSegment[] {
  if (candles.length < 2) return [];
  const count = Math.min(segments, candles.length);
  const size = candles.length / count;
  const out: DirectionSegment[] = [];

  for (let i = 0; i < count; i++) {
    const startIndex = Math.floor(i * size);
    const endIndex = Math.min(candles.length - 1, Math.floor((i + 1) * size) - 1);
    const slice = candles.slice(0, endIndex + 1);
    let direction: StripDirection = 'SIDEWAYS';
    let alignment: TrendAlignment | null = null;
    if (slice.length >= 30) {
      const read = trendAlignment(slice);
      alignment = read.alignment;
      direction = directionFromAlignment(read.alignment, read.priceAboveEma20);
    }
    out.push({
      startIndex,
      endIndex,
      startDate: candles[startIndex].datetime,
      endDate: candles[endIndex].datetime,
      direction,
      alignment,
    });
  }
  return out;
}

export type StripConfidence = 'HIGH' | 'MODERATE' | 'LOW';

export interface CurrentDirection {
  direction: StripDirection;
  confidence: StripConfidence;
  alignment: TrendAlignment | null;
  detail: string;
}

/** The arrow chip read: current direction plus how much trust to place in it. */
export function currentDirection(candles: Candle[]): CurrentDirection | null {
  if (candles.length < 30) return null;
  const read = trendAlignment(candles);
  const direction = directionFromAlignment(read.alignment, read.priceAboveEma20);
  const confidence: StripConfidence =
    candles.length < 60 ? 'LOW' : read.alignment === 'STRONG' ? 'HIGH' : read.alignment === 'MIXED' ? 'LOW' : 'MODERATE';
  return { direction, confidence, alignment: read.alignment, detail: read.detail };
}
