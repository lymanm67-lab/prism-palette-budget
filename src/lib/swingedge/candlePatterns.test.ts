// Acceptance tests for the candlestick pattern recognition and confirmation engine.
// Series are built deterministically so each test isolates one rule.

import { describe, expect, it } from 'vitest';
import { anatomySeries, checkCandleData, DEFAULT_CANDLE_CONFIG, toWeekly } from './candles';
import { detectPatterns } from './patterns';
import { assessPattern, summariseConfirmation, type CandleContext } from './candleContext';
import { analyzeCandles } from './candleEngine';
import { scoreSymbol } from './score';
import type { Candle } from './types';

const day = (i: number) => new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10);

interface Bar {
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
}

const build = (bars: Bar[], startIndex = 0): Candle[] =>
  bars.map((b, i) => ({
    date: day(startIndex + i),
    open: b.o,
    high: b.h,
    low: b.l,
    close: b.c,
    volume: b.v ?? 1_000_000,
  }));

/** A clean uptrend that leaves price pulled back near its 20-day average. */
function uptrendBase(length = 80, start = 30, step = 0.35): Candle[] {
  const bars: Bar[] = [];
  let price = start;
  for (let i = 0; i < length; i++) {
    const o = price;
    const c = price + step;
    bars.push({ o, h: c + 0.15, l: o - 0.15, c, v: 1_000_000 });
    price = c;
  }
  return build(bars);
}

function sidewaysBase(length = 80, level = 50): Candle[] {
  const bars: Bar[] = [];
  for (let i = 0; i < length; i++) {
    const drift = i % 2 === 0 ? 0.1 : -0.1;
    const o = level + drift;
    const c = level - drift;
    bars.push({ o, h: Math.max(o, c) + 0.2, l: Math.min(o, c) - 0.2, c, v: 1_000_000 });
  }
  return build(bars);
}

const ctxFrom = (candles: Candle[], over: Partial<CandleContext> = {}): CandleContext => {
  const a = analyzeCandles(candles);
  return { ...a.context, ...over };
};

describe('candle anatomy', () => {
  it('measures body, wicks, close location and size', () => {
    const series = anatomySeries(build([{ o: 10, h: 11, l: 9, c: 10.8 }]));
    const a = series[0];
    expect(a.range).toBeCloseTo(2);
    expect(a.body).toBeCloseTo(0.8);
    expect(a.bodyPct).toBeCloseTo(0.4);
    expect(a.upperWick).toBeCloseTo(0.2);
    expect(a.lowerWick).toBeCloseTo(1);
    expect(a.closeLocation).toBeCloseTo(0.9);
    expect(a.direction).toBe('UP');
    expect(a.wickShape).toBe('LONG LOWER WICK');
  });

  it('refuses to work with impossible OHLC values', () => {
    const bad = build([{ o: 10, h: 9, l: 11, c: 10 }]);
    const padded = [...uptrendBase(60), ...bad];
    const q = checkCandleData(padded);
    expect(q.ok).toBe(false);
    expect(q.message).toContain('CANDLE DATA INCOMPLETE');
    const analysis = analyzeCandles(padded);
    expect(analysis.dataOk).toBe(false);
    expect(analysis.patterns).toHaveLength(0);
  });

  it('rolls daily candles up into weekly candles for context', () => {
    const weekly = toWeekly(uptrendBase(20));
    expect(weekly.length).toBeGreaterThan(2);
    expect(weekly[0].high).toBeGreaterThanOrEqual(weekly[0].open);
  });
});

describe('pattern detection', () => {
  it('detects a bullish engulfing only when the body is fully covered', () => {
    const candles = [
      ...uptrendBase(70),
      ...build([{ o: 60, h: 60.2, l: 59, c: 59.2 }], 70),
      ...build([{ o: 59.1, h: 61, l: 59, c: 60.6, v: 1_800_000 }], 71),
    ];
    const series = anatomySeries(candles);
    const found = detectPatterns(series).filter((p) => p.key === 'BULLISH_ENGULFING');
    expect(found).toHaveLength(1);
    expect(found[0].direction).toBe('BULLISH');
    expect(found[0].requiresConfirmation).toBe(false);
    expect(found[0].invalidation.price).toBeCloseTo(59);
  });

  it('detects a hammer and marks it as waiting for confirmation', () => {
    const candles = [...uptrendBase(70), ...build([{ o: 50, h: 50.3, l: 48, c: 50.1 }], 70)];
    const series = anatomySeries(candles);
    const hammer = detectPatterns(series).find((p) => p.key === 'HAMMER');
    expect(hammer).toBeDefined();
    expect(hammer!.requiresConfirmation).toBe(true);
    expect(hammer!.status).toBe('WAITING FOR CONFIRMATION');
  });

  it('detects a doji without calling it a reversal', () => {
    const candles = [...sidewaysBase(70), ...build([{ o: 50, h: 51, l: 49, c: 50.02 }], 70)];
    const doji = detectPatterns(anatomySeries(candles)).find((p) => p.key === 'DOJI');
    expect(doji).toBeDefined();
    expect(doji!.direction).toBe('NEUTRAL');
  });

  it('tracks a failed pattern with its reason and date', () => {
    const candles = [
      ...uptrendBase(70),
      ...build([{ o: 60, h: 60.2, l: 59, c: 59.2 }], 70),
      ...build([{ o: 59.1, h: 61, l: 59, c: 60.6, v: 1_800_000 }], 71),
      ...build([{ o: 60.5, h: 60.6, l: 58, c: 58.2 }], 72),
    ];
    const failed = detectPatterns(anatomySeries(candles)).find(
      (p) => p.key === 'BULLISH_ENGULFING' && p.status === 'FAILED',
    );
    expect(failed).toBeDefined();
    expect(failed!.failureReason).toContain('closed below the pattern low');
    expect(failed!.failedAt).toBe(day(72));
  });

  it('never confirms a pattern using candles the trade could not have seen', () => {
    const candles = [
      ...uptrendBase(70),
      ...build([{ o: 50, h: 50.3, l: 48, c: 50.1 }], 70),
      ...build([{ o: 50.2, h: 51.5, l: 50.1, c: 51.4 }], 71),
    ];
    const hammer = detectPatterns(anatomySeries(candles)).find((p) => p.key === 'HAMMER');
    expect(hammer!.status).toBe('CONFIRMED');
    expect(hammer!.confirmedAt).toBe(day(71));
    // The earliest honest entry is never before the confirming candle exists.
    expect(hammer!.earliestEntryAt === null || hammer!.earliestEntryAt >= hammer!.confirmedAt!).toBe(true);
  });

  it('tracks mother bar levels for inside bars', () => {
    const candles = [...uptrendBase(70), ...build([{ o: 50, h: 52, l: 48, c: 51 }], 70), ...build([{ o: 50.5, h: 51, l: 49.5, c: 50.2 }], 71)];
    const inside = detectPatterns(anatomySeries(candles)).find((p) => p.key === 'INSIDE_BAR');
    expect(inside).toBeDefined();
    expect(inside!.motherBar).toEqual({ high: 52, low: 48 });
    expect(inside!.direction).toBe('NEUTRAL');
  });
});

describe('acceptance test A — bullish engulfing on a pullback into support', () => {
  // Uptrend, then a pullback toward the 20-day average and prior support, then a
  // bullish engulfing on elevated volume.
  const candles = (() => {
    const base = uptrendBase(70, 30, 0.35);
    const lastClose = base[base.length - 1].close;
    const pullback = build(
      [
        { o: lastClose, h: lastClose + 0.1, l: lastClose - 1.2, c: lastClose - 1.0 },
        { o: lastClose - 1.0, h: lastClose - 0.9, l: lastClose - 2.0, c: lastClose - 1.8 },
      ],
      70,
    );
    const trigger = build(
      [{ o: lastClose - 1.85, h: lastClose - 0.3, l: lastClose - 2.0, c: lastClose - 0.4, v: 2_200_000 }],
      72,
    );
    return [...base, ...pullback, ...trigger];
  })();

  it('detects the pattern and scores the context highly', () => {
    const analysis = analyzeCandles(candles, { marketTrend: 'UP' });
    const engulf = analysis.history.find((h) => h.pattern.key === 'BULLISH_ENGULFING');
    expect(engulf).toBeDefined();
    expect(engulf!.score).toBeGreaterThanOrEqual(70);
    expect(['CONFIRMATION', 'STRONG CONFIRMATION']).toContain(engulf!.band);
    expect(analysis.context.trend).toBe('UP');
    expect(engulf!.why).toContain('uptrend');
  });

  it('contributes to Setup Quality rather than a separate score', () => {
    const analysis = analyzeCandles(candles, { marketTrend: 'UP' });
    const scored = scoreSymbol('TEST', candles, { marketTrend: 'UP', candleConfirmation: analysis.confirmation });
    const setup = scored.components.find((c) => c.key === 'setup')!;
    expect(setup.max).toBe(25);
    expect(scored.components.reduce((s, c) => s + c.max, 0)).toBe(100);
    const candlePart = scored.setupParts.find((p) => p.key === 'setup-candle')!;
    expect(candlePart.max).toBe(7);
    expect(candlePart.points).toBeGreaterThanOrEqual(4);
    expect(setup.points).toBe(scored.setupParts.reduce((s, p) => s + p.points, 0));
  });
});

describe('acceptance test B — same pattern with no context', () => {
  const candles = [
    ...sidewaysBase(70, 50),
    ...build([{ o: 50.4, h: 50.5, l: 49.6, c: 49.7, v: 500_000 }], 70),
    ...build([{ o: 49.65, h: 50.6, l: 49.6, c: 50.5, v: 400_000 }], 71),
  ];

  it('detects the pattern but scores it weakly and never says GO', () => {
    const analysis = analyzeCandles(candles, { marketTrend: 'SIDEWAYS' });
    const engulf = analysis.history.find((h) => h.pattern.key === 'BULLISH_ENGULFING');
    expect(engulf).toBeDefined();
    expect(engulf!.score).toBeLessThan(70);
    expect(['WEAK CONFIRMATION', 'LOW SIGNIFICANCE']).toContain(engulf!.band);
    // Candlestick evidence alone can add no more than 7 points inside Setup Quality.
    expect(analysis.confirmation.setupPoints).toBeLessThanOrEqual(7);
  });
});

describe('acceptance test C — failed breakout attempt', () => {
  const candles = (() => {
    const base = sidewaysBase(70, 50); // resistance around 50.3
    return [...base, ...build([{ o: 50.1, h: 53.5, l: 50.0, c: 50.05, v: 600_000 }], 70)];
  })();

  it('flags a possible false breakout and reduces the setup contribution', () => {
    const analysis = analyzeCandles(candles);
    expect(analysis.confirmation.flags).toContain('POSSIBLE FALSE BREAKOUT');
    expect(analysis.confirmation.warnings.join(' ')).toContain('POSSIBLE FALSE BREAKOUT');
    expect(analysis.confirmation.setupPoints).toBeLessThanOrEqual(1);
  });
});

describe('acceptance test D — developing candle', () => {
  const candles = [...uptrendBase(70), ...build([{ o: 50, h: 50.3, l: 48, c: 50.1 }], 70)];

  it('will not confirm a hammer on a candle that has not closed', () => {
    const analysis = analyzeCandles(candles, { completedCount: candles.length - 1 });
    const hammer = analysis.history.find((h) => h.pattern.key === 'HAMMER')!;
    expect(hammer.pattern.developing).toBe(true);
    expect(hammer.pattern.status).toBe('WAITING FOR CONFIRMATION');
    expect(hammer.flags).toContain('DEVELOPING CANDLE');
    expect(analysis.confirmation.warnings.join(' ')).toContain('DEVELOPING CANDLE');
  });
});

describe('acceptance test E — price extended beyond the entry zone', () => {
  const candles = [
    ...uptrendBase(70),
    ...build([{ o: 50, h: 50.2, l: 49, c: 49.2 }], 70),
    ...build([{ o: 49.1, h: 51, l: 49, c: 50.8, v: 2_000_000 }], 71),
  ];

  it('flags chasing when price has left the pattern entry zone', () => {
    const series = anatomySeries(candles);
    const pattern = detectPatterns(series).find((p) => p.key === 'BULLISH_ENGULFING')!;
    const ctx = ctxFrom(candles, { price: 54, marketTrend: 'UP' });
    const assessed = assessPattern(pattern, series, ctx);
    expect(assessed.flags).toContain('PRICE EXTENDED');
    const summary = summariseConfirmation([assessed], ctx);
    expect(summary.warnings.join(' ')).toContain('PRICE EXTENDED');
    expect(summary.warnings.join(' ')).toContain('rather than chase');
  });
});

describe('context beats pattern names', () => {
  it('scores the same shape higher at support than away from it', () => {
    const atSupport = (() => {
      const base = uptrendBase(70, 30, 0.35);
      const lastClose = base[base.length - 1].close;
      return [
        ...base,
        ...build(
          [
            { o: lastClose, h: lastClose + 0.1, l: lastClose - 1.2, c: lastClose - 1.0 },
            { o: lastClose - 1.0, h: lastClose - 0.9, l: lastClose - 2.0, c: lastClose - 1.8 },
            { o: lastClose - 1.85, h: lastClose - 0.3, l: lastClose - 2.0, c: lastClose - 0.4, v: 2_200_000 },
          ],
          70,
        ),
      ];
    })();
    const nowhere = [
      ...sidewaysBase(70, 50),
      ...build([{ o: 50.4, h: 50.5, l: 49.6, c: 49.7, v: 500_000 }], 70),
      ...build([{ o: 49.65, h: 50.6, l: 49.6, c: 50.5, v: 400_000 }], 71),
    ];
    const a = analyzeCandles(atSupport, { marketTrend: 'UP' }).history.find((h) => h.pattern.key === 'BULLISH_ENGULFING')!;
    const b = analyzeCandles(nowhere, { marketTrend: 'SIDEWAYS' }).history.find((h) => h.pattern.key === 'BULLISH_ENGULFING')!;
    expect(a.score).toBeGreaterThan(b.score);
    expect(b.whyNot.length).toBeGreaterThan(20);
  });

  it('keeps tolerances configurable rather than hard-coded', () => {
    expect(DEFAULT_CANDLE_CONFIG.dojiBodyPct).toBeGreaterThan(0);
    const strict = { ...DEFAULT_CANDLE_CONFIG, dojiBodyPct: 0.001 };
    const candles = [...sidewaysBase(70), ...build([{ o: 50, h: 51, l: 49, c: 50.02 }], 70)];
    const loose = detectPatterns(anatomySeries(candles)).some((p) => p.key === 'DOJI');
    const tight = detectPatterns(anatomySeries(candles, strict), { config: strict }).some((p) => p.key === 'DOJI');
    expect(loose).toBe(true);
    expect(tight).toBe(false);
  });
});
