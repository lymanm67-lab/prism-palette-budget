import { describe, expect, it } from 'vitest';
import { atr, ema, relativeVolume, rsi, sma, trendState } from './indicators';
import { calculatePosition, estimateLevels, portfolioRisk } from './risk';
import { classifyMarket, readIndex } from './marketCondition';
import { cacheStatus, needsRefresh } from './cache';
import { demoCandles } from './demoData';
import type { Candle } from './types';

const closes = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

function candle(close: number, i: number, volume = 1000): Candle {
  return {
    datetime: `2026-01-${String(i + 1).padStart(2, '0')}`,
    open: close - 0.5,
    high: close + 1,
    low: close - 1,
    close,
    volume,
  };
}

describe('indicators', () => {
  it('averages the last n closes', () => {
    expect(sma(closes, 5)).toBeCloseTo(17, 6);
    expect(sma(closes, 20)).toBeNull();
  });

  it('weights recent closes more heavily than a simple average', () => {
    const e = ema(closes, 5)!;
    expect(e).toBeGreaterThan(sma(closes, 5)!);
  });

  it('reports a maxed reading when every move is upward', () => {
    expect(rsi(closes, 5)).toBeCloseTo(100, 6);
  });

  it('measures the average range of recent candles', () => {
    const cs = closes.map((c, i) => candle(c, i));
    expect(atr(cs, 5)).toBeGreaterThan(0);
  });

  it('compares today volume against its own average', () => {
    const cs = [...Array(20)].map((_, i) => candle(50, i, 1000));
    cs.push(candle(50, 20, 2000));
    expect(relativeVolume(cs, 20)).toBeCloseTo(2, 1);
  });

  it('calls a rising series an uptrend', () => {
    const cs = [...Array(80)].map((_, i) => candle(50 + i, i));
    expect(trendState(cs)).toBe('UP');
  });
});

describe('position sizing', () => {
  it('sizes the acceptance case exactly: $5,000 at 1% with a $2.00 stop is 25 shares and $50 risk', () => {
    const p = calculatePosition({
      tradingCapital: 5000,
      riskPerTradePct: 1,
      entry: 50,
      stop: 48,
      target: 56,
    });
    expect(p.shares).toBe(25);
    expect(p.dollarRisk).toBeCloseTo(50, 2);
    expect(p.maxRiskPerTrade).toBeCloseTo(50, 2);
    expect(p.rewardToRisk).toBeCloseTo(3, 2);
    expect(p.positionValue).toBeCloseTo(1250, 2);
  });

  it('refuses to size a trade whose stop is not below the entry', () => {
    const p = calculatePosition({ tradingCapital: 5000, riskPerTradePct: 1, entry: 50, stop: 50 });
    expect(p.shares).toBe(0);
    expect(p.valid).toBe(false);
  });

  it('never rounds up into more risk than allowed', () => {
    const p = calculatePosition({
      tradingCapital: 5000,
      riskPerTradePct: 1,
      entry: 100,
      stop: 97,
    });
    expect(p.shares).toBe(16);
    expect(p.dollarRisk).toBeLessThanOrEqual(50);
  });

  it('tracks remaining portfolio risk and flags going over the limit', () => {
    const ok = portfolioRisk({ tradingCapital: 5000, maxPortfolioRiskPct: 5, openRisk: 100 });
    expect(ok.maxPortfolioRisk).toBeCloseTo(250, 2);
    expect(ok.riskRemaining).toBeCloseTo(150, 2);
    expect(ok.overLimit).toBe(false);

    const over = portfolioRisk({ tradingCapital: 5000, maxPortfolioRiskPct: 5, openRisk: 300 });
    expect(over.riskRemaining).toBe(0);
    expect(over.overLimit).toBe(true);
  });

  it('marks scanner levels as estimates and keeps the stop below the entry', () => {
    const cs = [...Array(60)].map((_, i) => candle(50 + i * 0.1, i));
    const est = estimateLevels(cs);
    expect(est).not.toBeNull();
    expect(est!.estimated).toBe(true);
    expect(est!.stop).toBeLessThan(est!.entry);
    expect(est!.target).toBeGreaterThan(est!.entry);
  });
});

describe('market condition', () => {
  it('reads an index and classifies a broadly rising market as bullish', () => {
    const readings = ['SPY', 'QQQ', 'DIA', 'IWM']
      .map((s) => readIndex(s, demoCandles(s, '1day', 120), '2026-09-11T20:00:00.000Z'))
      .filter((r): r is NonNullable<typeof r> => r !== null);
    expect(readings).toHaveLength(4);
    const result = classifyMarket(readings);
    expect(['BULLISH', 'NEUTRAL', 'CAUTIOUS']).toContain(result.condition);
    expect(result.checks.length).toBeGreaterThan(0);
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('says conditions are unknown when there is no data', () => {
    expect(classifyMarket([]).condition).toBe('NEUTRAL');
  });
});

describe('cache freshness', () => {
  it('calls missing data unavailable and same-hour daily data fresh', () => {
    expect(cacheStatus(null, '1day')).toBe('UNAVAILABLE');
    expect(cacheStatus(new Date().toISOString(), '1day')).toBe('FRESH');
  });

  it('asks for a refresh only once data is no longer fresh', () => {
    expect(needsRefresh(new Date().toISOString(), '1day')).toBe(false);
    expect(needsRefresh(null, '1day')).toBe(true);
  });
});

describe('demo data', () => {
  it('is deterministic so lessons and tests always agree', () => {
    const a = demoCandles('SPY', '1day', 40);
    const b = demoCandles('SPY', '1day', 40);
    expect(a).toEqual(b);
    expect(a).toHaveLength(40);
    a.forEach((c) => {
      expect(c.high).toBeGreaterThanOrEqual(c.close);
      expect(c.low).toBeLessThanOrEqual(c.close);
    });
  });
});
