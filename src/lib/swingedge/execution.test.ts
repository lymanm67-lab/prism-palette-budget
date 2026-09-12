// Stage 3 acceptance tests — execution realism and corporate actions.

import { describe, expect, it } from 'vitest';
import {
  classifyOutcome,
  compareLoss,
  liquidityTier,
  rMultiple,
  resolveAmbiguousCandle,
  scoreExecutionQuality,
  scoreSignalQuality,
  simulateFill,
  stopExitReference,
} from './execution';
import { applySplit, findDiscontinuities, prepareHistory } from './corporateActions';
import type { Candle } from './types';

const candle = (o: number, h: number, l: number, c: number, datetime = '2026-09-01', volume = 1_000_000): Candle => ({
  datetime,
  open: o,
  high: h,
  low: l,
  close: c,
  volume,
});

/** Flat series at a given price, used as a clean baseline. */
function series(price: number, n: number, startDay = 1): Candle[] {
  return Array.from({ length: n }, (_, i) =>
    candle(price, price * 1.01, price * 0.99, price, `2026-01-${String(startDay + i).padStart(2, '0')}`),
  );
}

describe('Stage 3 — execution realism', () => {
  it('A: a buy fills worse than requested, never better', () => {
    const fill = simulateFill({ side: 'BUY', requested: 100, shares: 50, tier: 'NORMAL' });
    expect(fill.filled).toBeGreaterThan(100);
    expect(fill.slippagePerShare).toBeGreaterThan(0);
    expect(fill.slippageCost).toBe(fill.slippagePerShare * 50);
    expect(fill.gapped).toBe(false);
  });

  it('B: a sell fills below the requested price', () => {
    const fill = simulateFill({ side: 'SELL', requested: 100, shares: 10, tier: 'NORMAL' });
    expect(fill.filled).toBeLessThan(100);
  });

  it('C: thinner liquidity costs more slippage', () => {
    const deep = simulateFill({ side: 'BUY', requested: 100, shares: 100, tier: 'DEEP' });
    const thin = simulateFill({ side: 'BUY', requested: 100, shares: 100, tier: 'VERY_THIN' });
    expect(thin.slippageCost).toBeGreaterThan(deep.slippageCost);
  });

  it('D: a gap through the stop uses the next session open, not the stop price', () => {
    const fill = simulateFill({ side: 'SELL', requested: 95, shares: 100, tier: 'NORMAL', nextOpen: 88 });
    expect(fill.gapped).toBe(true);
    expect(fill.gapDifference).toBe(7);
    expect(fill.filled).toBeLessThan(88);
    expect(fill.note).toContain('next session open');
  });

  it('E: a favourable open is not treated as a gap against you', () => {
    const fill = simulateFill({ side: 'SELL', requested: 95, shares: 100, tier: 'NORMAL', nextOpen: 99 });
    expect(fill.gapped).toBe(false);
    expect(fill.gapDifference).toBe(0);
  });

  it('F: a session opening below the stop is a gap, not a clean stop fill', () => {
    const gapDown = stopExitReference(95, candle(90, 92, 88, 91));
    expect(gapDown.gapped).toBe(true);
    expect(gapDown.reference).toBe(90);

    const intrabar = stopExitReference(95, candle(97, 98, 93, 94));
    expect(intrabar.gapped).toBe(false);
    expect(intrabar.reference).toBe(95);
  });

  it('G: a candle touching both stop and target assumes the stop', () => {
    const r = resolveAmbiguousCandle(candle(100, 110, 94, 105), 95, 108);
    expect(r.hit).toBe('STOP');
    expect(r.ambiguous).toBe(true);
    expect(r.note).toContain('pessimistic');
  });

  it('H: a gapped loss is reported as worse than planned', () => {
    const c = compareLoss({
      entryFill: 100.1,
      exitFill: 87.9,
      plannedEntry: 100,
      plannedStop: 95,
      shares: 100,
    });
    expect(c.plannedLoss).toBe(500);
    expect(c.actualLoss).toBeGreaterThan(500);
    expect(c.worseThanPlanned).toBe(true);
  });

  it('I: execution quality ignores money and punishes a widened stop', () => {
    const clean = scoreExecutionQuality({
      enteredInZone: true,
      stopDefinedBeforeEntry: true,
      stopWidened: false,
      exitFollowedPlan: true,
      sizeCalculatedFirst: true,
      revalidatedBeforeEntry: true,
      journaled: true,
    });
    expect(clean.score).toBe(100);
    expect(clean.band).toBe('EXCELLENT');

    const widened = scoreExecutionQuality({
      enteredInZone: true,
      stopDefinedBeforeEntry: true,
      stopWidened: true,
      exitFollowedPlan: false,
      sizeCalculatedFirst: true,
      revalidatedBeforeEntry: false,
      journaled: false,
    });
    expect(widened.score).toBeLessThan(75);
    expect(widened.breaches.some((b) => b.includes('widened'))).toBe(true);
  });

  it('J: a hard gate failure makes the signal unsound regardless of score', () => {
    const r = scoreSignalQuality({
      hybridScore: 92,
      stopJustified: true,
      rewardRisk: 3,
      hardGateFailures: 1,
      setupPresent: true,
    });
    expect(r.quality).toBe('UNSOUND');
  });

  it('K: a disciplined losing trade is a GOOD LOSS', () => {
    const r = classifyOutcome({ signalQuality: 'SOUND', executionScore: 95, realizedPl: -240 });
    expect(r.outcome).toBe('GOOD_LOSS');
    expect(r.meaning).toContain('nothing needs fixing');
  });

  it('L: a rule-breaking winner is a BAD WIN', () => {
    const r = classifyOutcome({ signalQuality: 'WEAK', executionScore: 40, realizedPl: 600 });
    expect(r.outcome).toBe('BAD_WIN');
    expect(r.meaning).toContain('dangerous');
  });

  it('M: R multiples measure against the risk originally accepted', () => {
    expect(rMultiple(500, 250)).toBe(2);
    expect(rMultiple(-250, 250)).toBe(-1);
    expect(rMultiple(100, 0)).toBeNull();
  });

  it('N: liquidity tiers follow dollar volume', () => {
    expect(liquidityTier(500_000_000)).toBe('DEEP');
    expect(liquidityTier(50_000_000)).toBe('NORMAL');
    expect(liquidityTier(5_000_000)).toBe('THIN');
    expect(liquidityTier(100_000)).toBe('VERY_THIN');
    expect(liquidityTier(null)).toBe('THIN');
  });
});

describe('Stage 3 — corporate actions', () => {
  const split: Candle[] = [
    ...series(400, 5, 1),
    ...series(100, 5, 6), // 4-for-1 split, unadjusted
  ];

  it('O: an unadjusted split is detected as a share count change, not a crash', () => {
    const findings = findDiscontinuities(split);
    expect(findings.length).toBe(1);
    expect(findings[0].likely).toBe('SPLIT');
    expect(findings[0].impliedRatio).toBe(4);
    expect(findings[0].note).toContain('not a loss');
  });

  it('P: applying the split ratio removes the false collapse', () => {
    const fixed = applySplit(split, '2026-01-06', 4);
    expect(findDiscontinuities(fixed)).toHaveLength(0);
    expect(fixed[0].close).toBe(100);
  });

  it('Q: unadjusted history is disclosed rather than silently traded on', () => {
    const report = prepareHistory({ candles: split, providerAdjusted: false });
    expect(report.disclosure).toContain('may not be adjusted');
  });

  it('R: known actions are applied and clean history needs no disclosure', () => {
    const report = prepareHistory({
      candles: split,
      providerAdjusted: false,
      knownActions: [{ kind: 'SPLIT', date: '2026-01-06', ratio: 4 }],
    });
    expect(report.adjusted).toBe(true);
    expect(report.findings).toHaveLength(0);
    expect(report.disclosure).toBeNull();
  });

  it('S: ordinary volatility is never mistaken for a corporate action', () => {
    const normal = [...series(100, 5, 1), ...series(104, 5, 6)];
    expect(findDiscontinuities(normal)).toHaveLength(0);
  });
});
