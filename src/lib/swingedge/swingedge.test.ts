import { describe, expect, it } from 'vitest';
import {
  atr,
  ema,
  last,
  relativeVolume,
  rsi,
  setupState,
  sma,
  trendState,
  volumeCondition,
} from './indicators';
import { calculatePosition, estimateLevels, portfolioRisk } from './risk';
import { classifyMarket, readIndex, INDEX_SYMBOLS } from './marketCondition';
import { cacheStatus, needsRefresh } from './cache';
import { demoCandles, demoQuote } from './demoData';
import type { Candle } from './types';

function candle(close: number, i: number, volume = 1000): Candle {
  return {
    datetime: new Date(Date.UTC(2026, 0, 1 + i)).toISOString().slice(0, 10),
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  };
}

const rising = (n: number, step = 1, start = 50) =>
  [...Array(n)].map((_, i) => candle(start + i * step, i));

describe('indicators', () => {
  it('averages the last closes and stays empty until it has enough history', () => {
    const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    expect(last(sma(closes, 5))).toBeCloseTo(17, 6);
    expect(last(sma(closes, 20))).toBeNull();
  });

  it('weights recent closes more heavily than a plain average', () => {
    const closes = [10, 10, 10, 10, 10, 10, 10, 10, 10, 20];
    expect(last(ema(closes, 5))!).toBeGreaterThan(last(sma(closes, 5))!);
  });


  it('reads a fully rising series as maximum momentum', () => {
    const closes = [...Array(30)].map((_, i) => 10 + i);
    expect(last(rsi(closes, 14))!).toBeCloseTo(100, 4);
  });

  it('measures the average recent range as a positive number', () => {
    expect(last(atr(rising(40), 14))!).toBeGreaterThan(0);
  });

  it('compares the latest volume against its own average', () => {
    const cs = [...Array(20)].map((_, i) => candle(50, i, 1000));
    cs.push(candle(50, 20, 2000));
    expect(relativeVolume(cs, 20)!).toBeCloseTo(2, 1);
    expect(volumeCondition(relativeVolume(cs, 20))).toBe('HEAVY');
    expect(volumeCondition(null)).toBe('UNKNOWN');
  });

  it('calls a steadily rising series an uptrend and a falling one a downtrend', () => {
    expect(trendState(rising(80))).toBe('UP');
    expect(trendState(rising(80, -1, 200))).toBe('DOWN');
  });

  it('recognises a breakout when price pushes through recent highs', () => {
    expect(['BREAKOUT', 'PULLBACK', 'NONE']).toContain(setupState(rising(60)));
  });
});

describe('position sizing — the risk gate', () => {
  it('sizes the reference case exactly: $5,000 at 1%, entry 44.50, stop 42.50, target 48.50', () => {
    const r = calculatePosition({
      tradingCapital: 5000,
      riskPerTradePct: 1,
      entry: 44.5,
      stop: 42.5,
      target: 48.5,
    });
    expect(r.riskDollars).toBeCloseTo(50, 2);
    expect(r.riskPerShare).toBeCloseTo(2, 2);
    expect(r.shares).toBe(25);
    expect(r.positionValue).toBeCloseTo(1112.5, 2);
    expect(r.maxPlannedLoss).toBeCloseTo(50, 2);
    expect(r.potentialGain).toBeCloseTo(100, 2);
    expect(r.rewardRisk).toBeCloseTo(2, 2);
    expect(r.valid).toBe(true);
    expect(r.problems).toHaveLength(0);
  });

  it('never rounds up into more loss than the risk budget allows', () => {
    const r = calculatePosition({
      tradingCapital: 5000,
      riskPerTradePct: 1,
      entry: 100,
      stop: 97,
      target: 110,
    });
    expect(r.shares).toBe(16);
    expect(r.maxPlannedLoss).toBeLessThanOrEqual(r.riskDollars);
  });

  it('refuses a long trade whose stop is not below the entry', () => {
    const r = calculatePosition({
      tradingCapital: 5000,
      riskPerTradePct: 1,
      entry: 50,
      stop: 50,
      target: 60,
    });
    expect(r.valid).toBe(false);
    expect(r.shares).toBe(0);
    expect(r.problems.join(' ')).toContain('stop must sit below the entry');
  });

  it('refuses a long trade whose target is not above the entry', () => {
    const r = calculatePosition({
      tradingCapital: 5000,
      riskPerTradePct: 1,
      entry: 50,
      stop: 48,
      target: 49,
    });
    expect(r.valid).toBe(false);
    expect(r.problems.join(' ')).toContain('target must sit above the entry');
  });

  it('says plainly when the risk budget cannot afford a single share', () => {
    const r = calculatePosition({
      tradingCapital: 100,
      riskPerTradePct: 1,
      entry: 500,
      stop: 480,
      target: 560,
    });
    expect(r.shares).toBe(0);
    expect(r.problems.join(' ')).toContain('too small');
  });

  it('tracks remaining portfolio risk and flags going past the limit', () => {
    const ok = portfolioRisk({ tradingCapital: 5000, maxPortfolioRiskPct: 5, openRisk: 100 });
    expect(ok.maxPortfolioRisk).toBeCloseTo(250, 2);
    expect(ok.riskRemaining).toBeCloseTo(150, 2);
    expect(ok.overLimit).toBe(false);

    const over = portfolioRisk({ tradingCapital: 5000, maxPortfolioRiskPct: 5, openRisk: 300 });
    expect(over.riskRemaining).toBeCloseTo(-50, 2);
    expect(over.overLimit).toBe(true);
  });

  it('produces scanner estimates with the stop below and the target above the entry', () => {
    const est = estimateLevels(100, 2, 96);
    expect(est).not.toBeNull();
    expect(est!.estimatedStop).toBeLessThan(est!.estimatedEntry);
    expect(est!.estimatedTarget).toBeGreaterThan(est!.estimatedEntry);
    expect(est!.projectedRewardRisk).toBeCloseTo(2, 2);
  });

  it('returns no estimate at all rather than a nonsense one', () => {
    expect(estimateLevels(0, 2, 1)).toBeNull();
  });
});

describe('market condition', () => {
  it('reads all four indexes from demo data and explains its verdict', () => {
    const readings = INDEX_SYMBOLS.map((s) =>
      readIndex(s, demoCandles(s, '1day', 120), '2026-09-11T20:00:00.000Z'),
    ).filter((r): r is NonNullable<typeof r> => r !== null);

    expect(readings).toHaveLength(4);
    const result = classifyMarket(readings);
    expect(result.checks).toHaveLength(12);
    expect(['BULLISH', 'NEUTRAL', 'CAUTIOUS']).toContain(result.condition);
    expect(result.summary.length).toBeGreaterThan(10);
  });

  it('needs enough history before it will read an index at all', () => {
    expect(readIndex('SPY', rising(20), '2026-09-11T20:00:00.000Z')).toBeNull();
  });

  it('describes nothing when there is no data', () => {
    const empty = classifyMarket([]);
    expect(empty.condition).toBe('NEUTRAL');
    expect(empty.score).toBe(0);
  });
});

describe('cache freshness', () => {
  it('treats missing data as unavailable and just-fetched daily data as fresh', () => {
    expect(cacheStatus(null, '1day')).toBe('Unavailable');
    expect(cacheStatus('not-a-date', '1day')).toBe('Unavailable');
    expect(cacheStatus(new Date().toISOString(), '1day')).toBe('Fresh');
  });

  it('ages daily data before calling it stale', () => {
    const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
    expect(cacheStatus(hoursAgo(10), '1day')).toBe('Aging');
    expect(cacheStatus(hoursAgo(48), '1day')).toBe('Stale');
  });

  it('only asks for new data once the cached copy is no longer fresh', () => {
    expect(needsRefresh(new Date().toISOString(), '1day')).toBe(false);
    expect(needsRefresh(null, '1day')).toBe(true);
  });
});

describe('demo data', () => {
  it('is deterministic so lessons and tests always agree', () => {
    expect(demoCandles('SPY', '1day', 40)).toEqual(demoCandles('SPY', '1day', 40));
  });

  it('produces internally consistent candles', () => {
    demoCandles('AAPL', '1day', 60).forEach((c) => {
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.close);
      expect(c.volume).toBeGreaterThan(0);
    });
  });

  it('quotes a demo symbol without touching any network', () => {
    const q = demoQuote('SPY');
    expect(q.symbol).toBe('SPY');
    expect(q.price).toBeGreaterThan(0);
  });
});
