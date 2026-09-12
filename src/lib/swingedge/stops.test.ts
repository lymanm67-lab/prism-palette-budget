import { describe, expect, it } from 'vitest';
import {
  assessStopChange,
  atrStop,
  checkPortfolioRisk,
  classifyRewardRisk,
  hybridStop,
  percentStop,
  rewardRiskRatio,
  riskPerShare,
  runRiskSequence,
  structureStop,
  trailingSuggestions,
} from './stops';

const BASE = { tradingCapital: 5000, riskPerTradePct: 1, entry: 44.5, stop: 42.5, target: 48.5 };

describe('Stop-Loss Strategy Engine — acceptance tests', () => {
  it('TEST A: sizes a $5,000 account risking 1% correctly', () => {
    const r = runRiskSequence(BASE);
    expect(r.maxDollarRisk).toBe(50);
    expect(r.riskPerShare).toBe(2);
    expect(r.shares).toBe(25);
    expect(r.positionValue).toBe(1112.5);
    expect(r.plannedLoss).toBe(50);
    expect(r.riskLimitExceeded).toBe(false);
  });

  it('TEST B: flags a manual 40-share entry as over the risk limit', () => {
    const r = runRiskSequence({ ...BASE, plannedShares: 40 });
    expect(r.plannedLoss).toBe(80);
    expect(r.riskLimitExceeded).toBe(true);
    expect(r.maxAllowedShares).toBe(25);
    expect(r.problems.some((p) => p.startsWith('RISK LIMIT EXCEEDED'))).toBe(true);
  });

  it('TEST C: reports reward-to-risk of 2:1', () => {
    expect(rewardRiskRatio(44.5, 42.5, 48.5)).toBe(2);
    expect(classifyRewardRisk(2, 2)).toBe('ACCEPTABLE');
    expect(classifyRewardRisk(1.3, 2)).toBe('BELOW_RULE');
  });

  it('TEST D: warns and recalculates when a stop is widened after entry', () => {
    const a = assessStopChange({ entry: 44.5, oldStop: 42.5, newStop: 41.5, shares: 25, originalRisk: 50 });
    expect(a.direction).toBe('WIDEN');
    expect(a.widened).toBe(true);
    expect(a.riskBefore).toBe(50);
    expect(a.riskAfter).toBe(75);
    expect(a.riskChange).toBe(25);
    expect(a.riskChangePct).toBe(50);
    expect(a.requiresReason).toBe(true);
    expect(a.warning).toContain('STOP-WIDENING WARNING');
  });

  it('TEST E: a valid trailing move reduces risk with no widening warning', () => {
    const a = assessStopChange({ entry: 44.5, oldStop: 42.5, newStop: 45.25, shares: 25, originalRisk: 50 });
    expect(a.direction).toBe('TIGHTEN');
    expect(a.widened).toBe(false);
    expect(a.riskAfter).toBe(0);
    expect(a.warning).toBeNull();
    expect(a.requiresReason).toBe(false);
  });
});

describe('stop methods', () => {
  it('rejects a stop at or above the entry', () => {
    expect(riskPerShare(44.5, 44.5)).toBeNull();
    expect(riskPerShare(44.5, 45)).toBeNull();
    const r = runRiskSequence({ ...BASE, stop: 45 });
    expect(r.invalidStop).toBe(true);
    expect(r.shares).toBe(0);
  });

  it('places a structure stop below the lowest structural level plus a buffer', () => {
    const s = structureStop({ entry: 44.5, swingLow: 42.75, support: 43.1, setup: 'PULLBACK', bufferPct: 0.5 });
    expect(s.invalidationLevel).toBe(42.75);
    expect(s.stop).toBeCloseTo(42.53, 2);
    expect(s.candidates.length).toBeGreaterThan(1);
  });

  it('computes ATR and percentage stops', () => {
    expect(atrStop(44.5, 1.6, 1.5)).toBe(42.1);
    expect(percentStop(44.5, 3)).toBe(43.17);
  });

  it('hybrid stop picks the level below both structure and volatility', () => {
    const h = hybridStop({ entry: 44.5, structureLevel: 42.6, atrValue: 1.5, multiple: 1.5, bufferPct: 0.25 });
    expect(h.stop).toBe(42.25);
    expect(h.chosen).toBe('ATR');
    expect(h.reason).toContain('below both support and normal volatility');
  });

  it('never suggests a trailing stop below the current stop', () => {
    const out = trailingSuggestions({ currentPrice: 47, currentStop: 46, swingLow: 45, ema20: 44, atrValue: 1 });
    expect(out.every((s) => s.stop > 46)).toBe(true);
  });

  it('blocks a trade that would breach the portfolio risk limit', () => {
    const p = checkPortfolioRisk({ tradingCapital: 5000, maxPortfolioRiskPct: 5, openRisk: 220, newTradeRisk: 50 });
    expect(p.maxTotalOpenRisk).toBe(250);
    expect(p.projectedTotal).toBe(270);
    expect(p.exceeded).toBe(true);
  });
});
