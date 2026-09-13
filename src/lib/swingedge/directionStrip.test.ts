import { describe, expect, it } from 'vitest';
import type { Candle } from './types';
import { buildDirectionStrip, currentDirection, directionFromAlignment } from './directionStrip';

function makeCandles(closes: number[]): Candle[] {
  return closes.map((close, i) => ({
    datetime: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume: 1_000_000,
  }));
}

const uptrend = makeCandles(Array.from({ length: 120 }, (_, i) => 100 + i * 0.8));
const downtrend = makeCandles(Array.from({ length: 120 }, (_, i) => 200 - i * 0.7));
const flat = makeCandles(Array.from({ length: 120 }, (_, i) => 100 + Math.sin(i / 3) * 0.4));

describe('directionFromAlignment', () => {
  it('maps the alignment reads to directions', () => {
    expect(directionFromAlignment('STRONG', true)).toBe('UP');
    expect(directionFromAlignment('AGAINST', false)).toBe('DOWN');
    expect(directionFromAlignment('MIXED', true)).toBe('SIDEWAYS');
    expect(directionFromAlignment('ALIGNED', true)).toBe('UP');
    expect(directionFromAlignment('ALIGNED', false)).toBe('DOWN');
    expect(directionFromAlignment('ALIGNED', null)).toBe('SIDEWAYS');
  });
});

describe('buildDirectionStrip', () => {
  it('returns no segments for a near-empty history', () => {
    expect(buildDirectionStrip(makeCandles([100]))).toEqual([]);
  });

  it('produces stable segment counts that cover the full range', () => {
    const strip = buildDirectionStrip(uptrend, 24);
    expect(strip).toHaveLength(24);
    expect(strip[0].startIndex).toBe(0);
    expect(strip[strip.length - 1].endIndex).toBe(uptrend.length - 1);
    for (let i = 1; i < strip.length; i++) {
      expect(strip[i].startIndex).toBeGreaterThan(strip[i - 1].startIndex);
    }
  });

  it('reads a clear uptrend as UP in the later windows', () => {
    const strip = buildDirectionStrip(uptrend);
    expect(strip[strip.length - 1].direction).toBe('UP');
  });

  it('reads a clear downtrend as DOWN in the later windows', () => {
    const strip = buildDirectionStrip(downtrend);
    expect(strip[strip.length - 1].direction).toBe('DOWN');
  });

  it('reads a flat tape as SIDEWAYS in the last window', () => {
    const strip = buildDirectionStrip(flat);
    expect(strip[strip.length - 1].direction).toBe('SIDEWAYS');
  });

  it('never claims more segments than there are candles', () => {
    const short = makeCandles([100, 101, 102]);
    expect(buildDirectionStrip(short, 24)).toHaveLength(3);
  });
});

describe('currentDirection', () => {
  it('returns null when history is too short to read', () => {
    expect(currentDirection(makeCandles([100, 101, 102]))).toBeNull();
  });

  it('reads the uptrend as UP with confidence', () => {
    const read = currentDirection(uptrend);
    expect(read?.direction).toBe('UP');
    expect(read?.confidence).toBe('HIGH');
  });

  it('reads the downtrend as DOWN', () => {
    expect(currentDirection(downtrend)?.direction).toBe('DOWN');
  });
});
