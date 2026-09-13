// Acceptance tests A–F for the Multi-Timeframe Analysis Engine.
// The reads are supplied directly so the rules are tested, not the indicators.

import { describe, expect, it } from 'vitest';
import {
  multiTimeframeAlignment,
  timeframeMetrics,
  type DailyState,
  type H1State,
  type H4State,
  type M15State,
  type TimeframeKey,
  type TimeframeRead,
  type WeeklyContext,
} from './multiTimeframe';

function read<S extends string>(key: TimeframeKey, state: S, score: number, available = true): TimeframeRead<S> {
  return { key, available, state, score: available ? score : null, headline: `${key} ${state}`, metrics: timeframeMetrics([]) };
}

const weekly = (s: WeeklyContext, score: number) => read('WEEKLY', s, score);
const daily = (s: DailyState, score: number) => read('DAILY', s, score);
const h4 = (s: H4State, score: number) => read('H4', s, score);
const h1 = (s: H1State, score: number) => read('H1', s, score);
const m15 = (s: M15State, score: number, available = true) => read('M15', s, score, available);

describe('multi-timeframe alignment', () => {
  it('A: weekly bullish, daily valid, 4H confirming, 1H confirmed gives STRONG ALIGNMENT', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('BULLISH', 1),
      daily: daily('VALID_SETUP', 1),
      h4: h4('CONFIRMS', 0.9),
      h1: h1('ENTRY_CONFIRMED', 1),
      m15: m15('NEUTRAL', 0.5),
    });
    expect(res.alignment).toBe('STRONG_ALIGNMENT');
    expect(res.decision).toBe('GO');
    expect(res.hardGates).toHaveLength(0);
  });

  it('B: no daily setup means no trade whatever the shorter charts do', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('NEUTRAL', 0.5),
      daily: daily('NO_SETUP', 0.2),
      h4: h4('CONFIRMS', 0.9),
      h1: h1('ENTRY_CONFIRMED', 1),
      m15: m15('CLEAN_ENTRY', 1),
    });
    expect(res.decision).toBe('NO_TRADE');
    expect(res.alignment).not.toBe('STRONG_ALIGNMENT');
    expect(res.hardGates.join(' ')).toContain('no valid daily setup');
  });

  it('C: 1H waiting means WAIT', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('BULLISH', 1),
      daily: daily('VALID_SETUP', 1),
      h4: h4('CONFIRMS', 0.9),
      h1: h1('WAITING', 0.35),
    });
    expect(res.decision).toBe('WAIT');
  });

  it('D: invalidated daily is a STOP even with bullish 1H and 15M', () => {
    const res = multiTimeframeAlignment({
      daily: daily('INVALIDATED', 0),
      h1: h1('ENTRY_CONFIRMED', 1),
      m15: m15('CLEAN_ENTRY', 1),
    });
    expect(res.decision).toBe('STOP');
    expect(res.alignment).toBe('CONFLICT');
  });

  it('E: a soft 15-minute chart is noise, not an exit', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('BULLISH', 1),
      daily: daily('VALID_SETUP', 1),
      h4: h4('CONFIRMS', 0.9),
      h1: h1('ENTRY_CONFIRMED', 1),
      m15: m15('CONTRADICTS', 0.2),
    });
    expect(res.decision).not.toBe('STOP');
    expect(res.warnings.map((w) => w.code)).toContain('LOWER_TIMEFRAME_NOISE');
  });

  it('F: price past the entry zone is PRICE EXTENDED and a WAIT', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('BULLISH', 1),
      daily: daily('VALID_SETUP', 1),
      h4: h4('CONFIRMS', 0.9),
      h1: h1('ENTRY_CONFIRMED', 1),
      m15: m15('CLEAN_ENTRY', 1),
      price: 54,
      entryZone: { low: 50, high: 51 },
    });
    expect(res.priceExtended).toBe(true);
    expect(res.decision).toBe('WAIT');
    expect(res.warnings.map((w) => w.code)).toContain('PRICE_EXTENDED');
  });

  it('a bullish 15-minute chart cannot lift a mixed read to STRONG ALIGNMENT', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('BULLISH', 1),
      daily: daily('VALID_SETUP', 1),
      h4: h4('MIXED', 0.55),
      h1: h1('EARLY', 0.6),
      m15: m15('CLEAN_ENTRY', 1),
    });
    expect(res.alignment).toBe('ALIGNED');
    expect(res.alignment).not.toBe('STRONG_ALIGNMENT');
  });

  it('keeps the daily chart dominant in the weighting', () => {
    const res = multiTimeframeAlignment({
      weekly: weekly('BULLISH', 1),
      daily: daily('VALID_SETUP', 1),
      h4: h4('CONFIRMS', 1),
      h1: h1('ENTRY_CONFIRMED', 1),
      m15: m15('NOT_USED', 0, false),
    });
    const dailyRow = res.rows.find((r) => r.key === 'DAILY')!;
    expect(dailyRow.weight).toBe(40);
    expect(res.score).toBe(100);
    expect(res.unavailable).toContain('M15');
  });
});
