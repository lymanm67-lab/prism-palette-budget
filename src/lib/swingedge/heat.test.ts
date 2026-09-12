import { describe, it, expect } from 'vitest';
import {
  positionRisk,
  summarizeHeat,
  checkTradeAgainstHeat,
  maxSharesWithinHeat,
  DEFAULT_HEAT_LIMITS,
  type HeatLimits,
} from './portfolioHeat';
import {
  correlatePair,
  checkCorrelation,
  classifyCorrelation,
  dailyReturns,
  DEFAULT_CORRELATION_CONFIG,
  type SymbolProfile,
} from './correlation';
import type { Candle } from './types';

const limits: HeatLimits = { tradingCapital: 5000, ...DEFAULT_HEAT_LIMITS };

function candles(closes: number[]): Candle[] {
  return closes.map((c, i) => ({
    datetime: new Date(2026, 0, i + 1).toISOString(),
    open: c,
    high: c,
    low: c,
    close: c,
    volume: 1_000_000,
  }));
}

describe('portfolio heat — risk, not capital invested', () => {
  it('A: $5,000 account at 5% allows $250 of combined open risk', () => {
    const summary = summarizeHeat([], limits);
    expect(summary.maxHeatDollars).toBe(250);
    expect(summary.riskAvailable).toBe(250);
    expect(summary.openRisk).toBe(0);
  });

  it('B: a trade taking open risk above $250 is stopped', () => {
    const summary = summarizeHeat(
      [
        { id: '1', symbol: 'AAA', sector: 'Health', shares: 100, entryPrice: 50, originalStop: 48 },
      ],
      limits,
    );
    expect(summary.openRisk).toBe(200);
    expect(summary.riskAvailable).toBe(50);

    const gate = checkTradeAgainstHeat(
      { symbol: 'BBB', sector: 'Energy', shares: 50, entry: 20, stop: 18 },
      summary,
    );
    expect(gate.addedRisk).toBe(100);
    expect(gate.projectedOpenRisk).toBe(300);
    expect(gate.status).toBe('HEAT_LIMIT_REACHED');
    expect(gate.allowed).toBe(false);
  });

  it('C: original risk, current risk and locked profit stay separate and heat never goes negative', () => {
    // Original risk $50: 25 shares x $2.
    const opened = positionRisk({
      id: '1',
      symbol: 'AAA',
      shares: 25,
      entryPrice: 44.5,
      currentPrice: 44.5,
      originalStop: 42.5,
    });
    expect(opened.originalRisk).toBe(50);
    expect(opened.currentRisk).toBe(50);
    expect(opened.lockedProfit).toBe(0);

    // Stop trailed to 45.7 while price is 46.5 -> current risk $20, no locked... check both.
    const trailed = positionRisk({
      id: '1',
      symbol: 'AAA',
      shares: 25,
      entryPrice: 44.5,
      currentPrice: 46.5,
      originalStop: 42.5,
      currentStop: 45.7,
    });
    expect(trailed.originalRisk).toBe(50);
    expect(trailed.currentRisk).toBe(20);
    expect(trailed.lockedProfit).toBe(30);

    // Stop above current price: risk floors at 0, never negative.
    const locked = positionRisk({
      id: '1',
      symbol: 'AAA',
      shares: 25,
      entryPrice: 44.5,
      currentPrice: 45.5,
      originalStop: 42.5,
      currentStop: 46,
    });
    expect(locked.currentRisk).toBe(0);
    expect(locked.lockedProfit).toBe(37.5);

    const summary = summarizeHeat(
      [
        {
          id: '1',
          symbol: 'AAA',
          shares: 25,
          entryPrice: 44.5,
          currentPrice: 45.5,
          originalStop: 42.5,
          currentStop: 46,
        },
      ],
      limits,
    );
    expect(summary.openRisk).toBe(0);
    expect(summary.heatPct).toBe(0);
    expect(summary.riskAvailable).toBe(250);
    expect(summary.openRisk).toBeGreaterThanOrEqual(0);
  });

  it('D: sector capital exposure and sector heat are separate readings', () => {
    // $1,250 invested in technology on a $5,000 account = 25% exposure.
    // Risk of $125 on the same positions = 2.5% sector heat.
    const summary = summarizeHeat(
      [
        {
          id: '1',
          symbol: 'NVDA',
          sector: 'Technology',
          shares: 25,
          entryPrice: 50,
          currentPrice: 50,
          originalStop: 45,
        },
      ],
      limits,
    );
    const tech = summary.sectors.find((s) => s.sector === 'Technology')!;
    expect(tech.capital).toBe(1250);
    expect(tech.capitalExposurePct).toBe(25);
    expect(tech.risk).toBe(125);
    expect(tech.heatPct).toBe(2.5);
    expect(tech.overCapitalLimit).toBe(false);
    expect(tech.overHeatLimit).toBe(false);
  });

  it('E: sector heat can breach while portfolio heat still has room', () => {
    const summary = summarizeHeat(
      [
        {
          id: '1',
          symbol: 'NVDA',
          sector: 'Technology',
          shares: 20,
          entryPrice: 40,
          currentPrice: 40,
          originalStop: 35,
        },
      ],
      limits,
    );
    expect(summary.openRisk).toBe(100);
    expect(summary.riskAvailable).toBe(150); // portfolio heat still has room
    const gate = checkTradeAgainstHeat(
      { symbol: 'AMD', sector: 'Technology', shares: 10, entry: 30, stop: 26 },
      summary,
    );
    expect(gate.status).toBe('SECTOR_HEAT_LIMIT_REACHED');
    expect(gate.allowed).toBe(false);
  });

  it('F: sector capital exposure gates independently of heat', () => {
    const wide: HeatLimits = { ...limits, maxSectorHeatPct: 100 };
    const summary = summarizeHeat(
      [
        {
          id: '1',
          symbol: 'XLK',
          sector: 'Technology',
          shares: 20,
          entryPrice: 60,
          currentPrice: 60,
          originalStop: 59.5,
        },
      ],
      wide,
    );
    expect(summary.sectors[0].capitalExposurePct).toBe(24);
    const gate = checkTradeAgainstHeat(
      { symbol: 'SMH', sector: 'Technology', shares: 10, entry: 30, stop: 29.9 },
      summary,
    );
    expect(gate.status).toBe('SECTOR_EXPOSURE_LIMIT_REACHED');
  });

  it('G: max shares within heat respects remaining risk', () => {
    const summary = summarizeHeat(
      [{ id: '1', symbol: 'AAA', shares: 50, entryPrice: 20, originalStop: 17 }],
      limits,
    );
    expect(summary.openRisk).toBe(150);
    expect(summary.riskAvailable).toBe(100);
    expect(maxSharesWithinHeat(50, 48, summary)).toBe(50);
  });
});

describe('layered correlation engine', () => {
  it('H: classification bands follow the configured thresholds', () => {
    expect(classifyCorrelation(0.2)).toBe('LOW');
    expect(classifyCorrelation(0.45)).toBe('MODERATE');
    expect(classifyCorrelation(0.7)).toBe('HIGH');
    expect(classifyCorrelation(0.9)).toBe('VERY_HIGH');
  });

  it('I: level 3 price-return correlation is used when history allows', () => {
    const base = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const a: SymbolProfile = { symbol: 'NVDA', sector: 'Technology', candles: candles(base) };
    const b: SymbolProfile = {
      symbol: 'AMD',
      sector: 'Technology',
      candles: candles(base.map((c) => c * 1.5)),
    };
    const pair = correlatePair(a, b);
    expect(pair.level).toBe(3);
    expect(pair.samples).toBeGreaterThanOrEqual(DEFAULT_CORRELATION_CONFIG.minSamples);
    expect(pair.coefficient).not.toBeNull();
    expect(pair.band).toBe('VERY_HIGH');
  });

  it('J: an ETF holding the stock registers via holdings overlap when no history exists', () => {
    const pair = correlatePair(
      { symbol: 'SMH', holdings: ['NVDA', 'TSM', 'AVGO'] },
      { symbol: 'NVDA', sector: 'Technology' },
    );
    expect(pair.level).toBe(2);
    expect(pair.band).toBe('VERY_HIGH');
  });

  it('K: sector overlap only, with no other data, stays at level 1', () => {
    const pair = correlatePair(
      { symbol: 'AAA', sector: 'Technology', industry: 'Semiconductors' },
      { symbol: 'BBB', sector: 'Technology', industry: 'Semiconductors' },
    );
    expect(pair.level).toBe(1);
    expect(pair.band).toBe('HIGH');
  });

  it('L: correlated group risk over the limit blocks the trade', () => {
    const base = Array.from({ length: 80 }, (_, i) => 100 + Math.sin(i / 3) * 5);
    const candidate: SymbolProfile = { symbol: 'QQQ', candles: candles(base) };
    const result = checkCorrelation(
      candidate,
      [
        {
          profile: { symbol: 'NVDA', candles: candles(base.map((c) => c * 2)) },
          currentRisk: 100,
        },
        {
          profile: { symbol: 'AMD', candles: candles(base.map((c) => c * 0.5)) },
          currentRisk: 100,
        },
      ],
      50,
      { band: 'HIGH', maxCorrelatedRisk: 150 },
    );
    expect(result.worstBand).toBe('VERY_HIGH');
    expect(result.correlatedRisk).toBe(250);
    expect(result.overLimit).toBe(true);
  });

  it('M: daily returns skip unusable closes', () => {
    expect(dailyReturns(candles([100, 110]))).toEqual([0.10000000000000009]);
    expect(dailyReturns(candles([100]))).toEqual([]);
  });
});
