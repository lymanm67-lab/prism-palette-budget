import { describe, it, expect } from 'vitest';
import { classifyRegime, volatilityExpansion } from './marketRegime';
import { assessRelativeStrength, classifyRelative, periodReturnPct } from './relativeStrength';
import { assessTradability, readSpread } from './tradability';
import { revalidateSignal, runExecutionSequence } from './revalidation';
import { entryZone } from './signalLifecycle';
import type { Candle } from './types';

function series(closes: number[], volume = 2_000_000, range = 1): Candle[] {
  return closes.map((c, i) => ({
    datetime: new Date(2026, 0, i + 1).toISOString(),
    open: c,
    high: c + range,
    low: c - range,
    close: c,
    volume,
  }));
}

const rising = series(Array.from({ length: 120 }, (_, i) => 100 + i * 0.5));
const falling = series(Array.from({ length: 120 }, (_, i) => 200 - i * 0.5));
const flat = series(Array.from({ length: 120 }, () => 100));

describe('market regime engine', () => {
  it('A: a steadily rising market reads as a bull regime with transparent inputs', () => {
    const result = classifyRegime([
      { symbol: 'SPY', candles: rising },
      { symbol: 'QQQ', candles: rising },
    ]);
    expect(['BULL', 'STRONG_BULL']).toContain(result.regime);
    expect(result.inputs.length).toBe(8);
    expect(result.breadthPct).toBe(100);
    expect(result.insufficientData).toBe(false);
  });

  it('B: a steadily falling market reads as bear', () => {
    const result = classifyRegime([{ symbol: 'SPY', candles: falling }]);
    expect(result.regime).toBe('BEAR');
    expect(result.breadthPct).toBe(0);
  });

  it('C: no history says so instead of guessing', () => {
    const result = classifyRegime([{ symbol: 'SPY', candles: series([100, 101]) }]);
    expect(result.insufficientData).toBe(true);
  });

  it('D: expanding ranges are detected', () => {
    const calm = Array.from({ length: 60 }, (_, i) => ({
      datetime: new Date(2026, 0, i + 1).toISOString(),
      open: 100,
      high: 100.5,
      low: 99.5,
      close: 100,
      volume: 1_000_000,
    }));
    const wild = Array.from({ length: 15 }, (_, i) => ({
      datetime: new Date(2026, 3, i + 1).toISOString(),
      open: 100,
      high: 106,
      low: 94,
      close: 100,
      volume: 1_000_000,
    }));
    const exp = volatilityExpansion([...calm, ...wild]);
    expect(exp).not.toBeNull();
    expect(exp!).toBeGreaterThan(1.5);
    const result = classifyRegime([{ symbol: 'SPY', candles: [...calm, ...wild] }]);
    expect(result.regime).toBe('HIGH_VOLATILITY');
  });
});

describe('relative strength engine', () => {
  it('E: a stock beating both sector and market reads as leading', () => {
    const strong = series(Array.from({ length: 80 }, (_, i) => 100 * 1.01 ** i));
    const result = assessRelativeStrength({
      symbol: 'AAA',
      assetType: 'STOCK',
      candles: strong,
      sectorCandles: flat,
      sectorSymbol: 'XLK',
      benchmarkCandles: flat,
      benchmarkSymbol: 'SPY',
    });
    expect(result.overall).toBe('LEADING');
    expect(result.comparisons).toHaveLength(3);
    expect(result.bias).toBe(1);
  });

  it('F: an ETF is compared only against its benchmark', () => {
    const result = assessRelativeStrength({
      symbol: 'SMH',
      assetType: 'ETF',
      candles: flat,
      benchmarkCandles: flat,
      benchmarkSymbol: 'SPY',
    });
    expect(result.comparisons).toHaveLength(1);
    expect(result.overall).toBe('NEUTRAL');
  });

  it('G: missing benchmark history is reported, not invented', () => {
    const result = assessRelativeStrength({ symbol: 'AAA', assetType: 'STOCK', candles: flat });
    expect(result.insufficientData).toBe(true);
    expect(result.overall).toBeNull();
    expect(result.bias).toBe(0.5);
  });

  it('H: bands and period returns behave', () => {
    expect(classifyRelative(8)).toBe('LEADING');
    expect(classifyRelative(-8)).toBe('LAGGING');
    expect(classifyRelative(0)).toBe('NEUTRAL');
    expect(periodReturnPct(series([100, 110]), 1)).toBe(10);
  });
});

describe('tradability with honest spread labelling', () => {
  it('I: an actual bid and ask is labelled as actual', () => {
    const s = readSpread(50, 49.98, 50.02);
    expect(s.source).toBe('ACTUAL');
    expect(s.label).toBe('Actual spread');
  });

  it('J: with no bid and ask, the estimate is clearly labelled a proxy', () => {
    const s = readSpread(50, null, null, series(Array.from({ length: 40 }, () => 50)));
    expect(s.source).toBe('PROXY');
    expect(s.label).toBe('Spread proxy');
    expect(s.note).toContain('not a real quote');
  });

  it('K: a liquid name is tradable', () => {
    const result = assessTradability({
      symbol: 'SPY',
      candles: series(Array.from({ length: 60 }, () => 500), 50_000_000),
      bid: 499.99,
      ask: 500.01,
    });
    expect(result.verdict).toBe('TRADABLE');
    expect(result.hardGate).toBe(false);
  });

  it('L: a cheap illiquid name is a hard gate', () => {
    const result = assessTradability({
      symbol: 'PENNY',
      candles: series(Array.from({ length: 60 }, () => 2), 20_000),
    });
    expect(result.verdict).toBe('AVOID');
    expect(result.hardGate).toBe(true);
  });
});

describe('signal revalidation', () => {
  const zone = entryZone(50, 1);
  const stored = {
    symbol: 'AAA',
    signal: 'GO',
    entryZone: zone,
    entry: 50,
    atrValue: 1,
    capturedAt: new Date('2026-09-10T20:00:00Z').toISOString(),
    marketRegime: 'BULL',
    sectorTrend: 'UPTREND',
    rewardRisk: 2,
    stopQuality: 'STRONG',
    confidence: 'HIGH',
    lastCompletedCandle: '2026-09-10T00:00:00Z',
    candleConfirmed: true,
  };
  const now = new Date('2026-09-11T15:00:00Z');

  it('M: nothing changed leaves the signal current and usable', () => {
    const v = revalidateSignal(
      stored,
      {
        price: 50,
        marketRegime: 'BULL',
        sectorTrend: 'UPTREND',
        rewardRisk: 2,
        stopQuality: 'STRONG',
        confidence: 'HIGH',
        lastCompletedCandle: '2026-09-10T00:00:00Z',
        candleConfirmed: true,
      },
      {},
      now,
    );
    expect(v.freshness).toBe('CURRENT');
    expect(v.usable).toBe(true);
    expect(v.effectiveSignal).toBe('GO');
  });

  it('N: price beyond the entry zone gives PRICE EXTENDED and WAIT, never a chase', () => {
    const v = revalidateSignal(stored, { price: 54 }, {}, now);
    expect(v.priceExtended).toBe(true);
    expect(v.effectiveSignal).toBe('WAIT');
    expect(v.headline).toContain('PRICE EXTENDED');
    expect(v.usable).toBe(false);
  });

  it('O: a new completed candle forces review even when everything else agrees', () => {
    const v = revalidateSignal(
      stored,
      { price: 50, lastCompletedCandle: '2026-09-11T00:00:00Z' },
      {},
      now,
    );
    expect(v.triggers).toContain('NEW_DAILY_CANDLE');
    expect(v.effectiveSignal).toBe('REVIEW');
  });

  it('P: an aged signal expires and cannot stay GO', () => {
    const v = revalidateSignal(stored, { price: 50 }, {}, new Date('2026-09-20T15:00:00Z'));
    expect(v.freshness).toBe('EXPIRED');
    expect(v.effectiveSignal).toBe('REVIEW');
    expect(v.triggers).toContain('SIGNAL_AGED_OUT');
  });

  it('Q: regime, stop, reward-risk, confidence and quality changes all trigger review', () => {
    const v = revalidateSignal(
      stored,
      {
        price: 50,
        marketRegime: 'BEAR',
        sectorTrend: 'DOWNTREND',
        rewardRisk: 1.2,
        stopQuality: 'QUESTIONABLE',
        confidence: 'LOW',
        candleConfirmed: false,
      },
      {},
      now,
    );
    expect(v.triggers).toContain('MARKET_REGIME_CHANGED');
    expect(v.triggers).toContain('SECTOR_TREND_CHANGED');
    expect(v.triggers).toContain('REWARD_RISK_CHANGED');
    expect(v.triggers).toContain('STOP_VALIDITY_CHANGED');
    expect(v.triggers).toContain('CONFIDENCE_FELL');
    expect(v.triggers).toContain('CANDLE_CONFIRMATION_FAILED');
    expect(v.usable).toBe(false);
  });

  it('R: the full execution sequence blocks a stale GO and runs every gate in order', () => {
    const stale = revalidateSignal(stored, { price: 50 }, { beforePaperTrade: true }, new Date('2026-09-20T15:00:00Z'));
    const seq = runExecutionSequence({
      storedSignal: 'GO',
      revalidation: stale,
      price: 50,
      zone,
      entry: 50,
      stop: 48,
      shares: 25,
      accountRiskPct: 1,
      maxAccountRiskPct: 1,
      heatAllowed: true,
      heatReason: 'Within limits.',
      correlationOverLimit: false,
      correlationReason: 'No meaningful correlation.',
    });
    expect(seq.checks.map((c) => c.name)).toEqual([
      'REVALIDATE',
      'CURRENT_PRICE',
      'ENTRY_ZONE',
      'STOP',
      'RISK',
      'PORTFOLIO_HEAT',
      'CORRELATION',
    ]);
    expect(seq.mayExecute).toBe(false);
    expect(seq.finalSignal).toBe('REVIEW');
  });

  it('S: heat or correlation alone blocks execution even on a current signal', () => {
    const fresh = revalidateSignal(
      stored,
      { price: 50, lastCompletedCandle: '2026-09-10T00:00:00Z' },
      { beforePaperTrade: true },
      now,
    );
    const seq = runExecutionSequence({
      storedSignal: 'GO',
      revalidation: fresh,
      price: 50,
      zone,
      entry: 50,
      stop: 48,
      shares: 25,
      accountRiskPct: 1,
      maxAccountRiskPct: 1,
      heatAllowed: false,
      heatReason: 'Combined open risk would exceed the ceiling.',
      correlationOverLimit: false,
      correlationReason: 'No meaningful correlation.',
    });
    expect(seq.mayExecute).toBe(false);
    expect(seq.blockers[0]).toContain('Portfolio and sector heat');
  });
});
