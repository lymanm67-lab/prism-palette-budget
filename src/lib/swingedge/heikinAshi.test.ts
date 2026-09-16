import { describe, expect, it } from 'vitest';
import { haConfirmation, haRead, heikinAshi } from './heikinAshi';
import type { Candle } from './types';

const bar = (i: number, open: number, high: number, low: number, close: number): Candle => ({
  datetime: `2026-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  open,
  high,
  low,
  close,
  volume: 1_000_000,
});

/** Steady uptrend with small lower wicks. */
const uptrend = (n = 20): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const base = 100 + i * 1.2;
    return bar(i, base, base + 1.4, base - 0.15, base + 1.1);
  });

/** Choppy, shrinking, alternating bars. */
const choppy = (n = 20): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const base = 100 + (i % 2 === 0 ? 0.4 : -0.4);
    return i % 2 === 0
      ? bar(i, base, base + 0.9, base - 0.9, base + 0.1)
      : bar(i, base, base + 0.9, base - 0.9, base - 0.1);
  });

describe('heikin ashi calculation', () => {
  it('uses the documented formulas and the first actual candle to start', () => {
    const c = [bar(0, 10, 12, 9, 11), bar(1, 11, 13, 10.5, 12)];
    const ha = heikinAshi(c);
    expect(ha[0].close).toBeCloseTo((10 + 12 + 9 + 11) / 4, 10);
    expect(ha[0].open).toBeCloseTo((10 + 11) / 2, 10);
    expect(ha[1].open).toBeCloseTo((ha[0].open + ha[0].close) / 2, 10);
    expect(ha[1].close).toBeCloseTo((11 + 13 + 10.5 + 12) / 4, 10);
    expect(ha[1].high).toBeCloseTo(Math.max(13, ha[1].open, ha[1].close), 10);
    expect(ha[1].low).toBeCloseTo(Math.min(10.5, ha[1].open, ha[1].close), 10);
  });

  it('keeps dates and volume from the actual candles', () => {
    const ha = heikinAshi(uptrend(5));
    expect(ha).toHaveLength(5);
    expect(ha[3].datetime).toBe(uptrend(5)[3].datetime);
    expect(ha[3].volume).toBe(1_000_000);
  });

  it('has no look-ahead: adding later bars never changes earlier ones', () => {
    const short = heikinAshi(uptrend(12));
    const long = heikinAshi(uptrend(20));
    short.forEach((c, i) => expect(long[i].close).toBeCloseTo(c.close, 10));
  });

  it('returns no reading without enough history', () => {
    expect(haRead(uptrend(5))).toBeNull();
  });
});

describe('acceptance test B — bullish run confirms', () => {
  const read = haRead(uptrend())!;
  it('reads strong bullish', () => {
    expect(read.trend).toBe('STRONG_BULLISH');
    expect(read.streak).toBeGreaterThanOrEqual(4);
    expect(read.persistence).toBe('STRONG');
    expect(read.health).toBe('HEALTHY');
  });
  it('confirms a bullish regular trend', () => {
    expect(haConfirmation('UP', read)).toBe('CONFIRMS');
  });
});

describe('acceptance test C — transition stays neutral', () => {
  const read = haRead(choppy())!;
  it('reads transition, not a reversal', () => {
    expect(read.trend).toBe('TRANSITION');
  });
  it('is neutral against a valid bullish setup, never a contradiction', () => {
    expect(haConfirmation('UP', read)).toBe('NEUTRAL');
  });
});

describe('confirmation states', () => {
  it('contradicts when the smoothed trend is the other way', () => {
    const down = uptrend().map((c, i) => bar(i, 140 - i * 1.2, 140 - i * 1.2 + 0.15, 139 - i * 1.2 - 1.4, 139 - i * 1.2));
    const read = haRead(down)!;
    expect(['BEARISH', 'STRONG_BEARISH']).toContain(read.trend);
    expect(haConfirmation('UP', read)).toBe('CONTRADICTS');
    expect(haConfirmation('DOWN', read)).toBe('CONFIRMS');
  });

  it('reports nothing when either side is unknown', () => {
    expect(haConfirmation(null, haRead(uptrend()))).toBeNull();
    expect(haConfirmation('UP', null)).toBeNull();
  });
});

describe('acceptance test E — smoothed prices never become trade levels', () => {
  it('leaves the actual candles untouched', () => {
    const actual = uptrend();
    const copy = actual.map((c) => ({ ...c }));
    heikinAshi(actual);
    haRead(actual);
    expect(actual).toEqual(copy);
  });
});
