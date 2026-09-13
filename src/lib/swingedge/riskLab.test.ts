import { describe, expect, it } from 'vitest';
import { expectancy, expectancyBy, expectancyNearVsOutsideEarnings, type RTrade } from './expectancy';
import { outlierDependence } from './outlierDependence';
import { runMonteCarlo, riskSizingComparison, regimeAwareRuns, sampleQuality, ruinDefinition } from './monteCarlo';
import { scoreTradeReadiness, HARD_GATE_TEXT, DEFAULT_READINESS_WEIGHTS } from './tradeReadiness';

const trade = (r: number, extra: Partial<RTrade> = {}): RTrade => ({ r, ...extra });

describe('expectancy', () => {
  it('reports zero state with no trades', () => {
    expect(expectancy([]).trades).toBe(0);
  });

  it('computes expectancy from win rate and average R', () => {
    // 2 wins at +2R, 2 losses at -1R => 0.5*2 - 0.5*1 = 0.5R
    const res = expectancy([trade(2), trade(2), trade(-1), trade(-1)]);
    expect(res.winRatePct).toBe(50);
    expect(res.averageWinR).toBe(2);
    expect(res.averageLossR).toBe(1);
    expect(res.expectancyR).toBe(0.5);
    expect(res.profitFactor).toBe(2);
  });

  it('splits by setup type and by earnings proximity', () => {
    const rows = [
      trade(2, { setupType: 'PULLBACK', nearEarnings: false }),
      trade(-1, { setupType: 'BREAKOUT', nearEarnings: true }),
    ];
    expect(expectancyBy(rows, 'setupType')).toHaveLength(2);
    const split = expectancyNearVsOutsideEarnings(rows);
    expect(split.near.trades).toBe(1);
    expect(split.outside.trades).toBe(1);
  });
});

describe('outlier dependence', () => {
  it('flags profit concentrated in a few trades', () => {
    const rows = [trade(12), trade(9), trade(8), ...Array.from({ length: 12 }, () => trade(-1))];
    const res = outlierDependence(rows);
    expect(res.verdict).toBe('HIGHLY_CONCENTRATED');
    expect(res.stillProfitableWithoutTop3).toBe(false);
    expect(res.headline).toBe('RESULTS HIGHLY CONCENTRATED');
  });

  it('reports insufficient data on a tiny sample', () => {
    expect(outlierDependence([trade(1), trade(-1)]).verdict).toBe('INSUFFICIENT_DATA');
  });
});

describe('monte carlo', () => {
  const rMultiples = [2, 2, 2, -1, -1, -1, -1, 3, -1, 1.5];

  it('labels sample quality by trade count', () => {
    expect(sampleQuality(12)).toBe('INSUFFICIENT_DATA');
    expect(sampleQuality(35)).toBe('EARLY_ESTIMATE');
    expect(sampleQuality(60)).toBe('MODERATE_SAMPLE');
    expect(sampleQuality(150)).toBe('STRONGER_SAMPLE');
  });

  it('is reproducible for a fixed seed', () => {
    const base = { rMultiples, startingCapital: 10_000, riskPerTradePct: 1, tradesPerRun: 50, runs: 500, seed: 7 };
    expect(runMonteCarlo(base).medianEnding).toBe(runMonteCarlo(base).medianEnding);
  });

  it('always states the ruin definition and sample quality', () => {
    const res = runMonteCarlo({
      rMultiples,
      startingCapital: 10_000,
      riskPerTradePct: 1,
      tradesPerRun: 50,
      runs: 300,
      ruin: ruinDefinition('DECLINE_20'),
    });
    expect(res.ruinLabel).toBe('20% account loss');
    expect(res.qualityLabel).toBe('INSUFFICIENT DATA');
    expect(res.assumptions.join(' ')).toContain('20% account loss');
  });

  it('runs nothing when there are no completed trades', () => {
    const res = runMonteCarlo({ rMultiples: [], startingCapital: 1000, riskPerTradePct: 1, tradesPerRun: 20 });
    expect(res.runs).toBe(0);
    expect(res.quality).toBe('INSUFFICIENT_DATA');
  });

  it('shows deeper drawdowns as risk per trade rises', () => {
    const cmp = riskSizingComparison(
      { rMultiples, startingCapital: 10_000, tradesPerRun: 60, runs: 400, seed: 11 },
      [0.5, 2],
    );
    expect(cmp.rows).toHaveLength(2);
    expect(cmp.rows[1].worst5PctDrawdownPct).toBeGreaterThan(cmp.rows[0].worst5PctDrawdownPct);
  });

  it('refuses a separate simulation for a thin regime split', () => {
    const rows = rMultiples.map((r) => trade(r, { marketRegime: 'BULLISH' }));
    const splits = regimeAwareRuns(rows, { startingCapital: 10_000, riskPerTradePct: 1, tradesPerRun: 40, runs: 200 }, ['BULL']);
    expect(splits[0].result).toBeNull();
    expect(splits[0].note).toContain('below the 30');
  });
});

describe('trade readiness', () => {
  const full = Object.fromEntries(
    (Object.keys(DEFAULT_READINESS_WEIGHTS) as (keyof typeof DEFAULT_READINESS_WEIGHTS)[]).map((k) => [k, 1]),
  );

  it('scores a fully passing trade as READY', () => {
    const res = scoreTradeReadiness({ scores: full });
    expect(res.score).toBe(100);
    expect(res.band).toBe('READY');
    expect(res.qualifies).toBe(true);
  });

  it('lets a hard gate override a high score', () => {
    const res = scoreTradeReadiness({ scores: full, hardGates: [HARD_GATE_TEXT.SEVERE_EVENT] });
    expect(res.band).toBe('NOT_READY');
    expect(res.qualifies).toBe(false);
    expect(res.headline).toContain('hard rule is broken');
  });

  it('treats an unavailable input as zero and names it', () => {
    const res = scoreTradeReadiness({ scores: { ...full, event: null } });
    expect(res.unavailable).toContain('event');
    expect(res.score).toBeLessThan(100);
  });
});
