import { describe, expect, it } from 'vitest';
import { computeGeometry } from './tradeGeometry';

describe('trade geometry — acceptance tests', () => {
  it('A: 34.34 / 32.51 gives 1.83 risk and a 38.00 target', () => {
    const g = computeGeometry({ entry: 34.34, stop: 32.51 });
    expect(g.riskPerShare).toBe(1.83);
    expect(g.mathematicalTarget).toBe(38.0);
    expect(g.targetMethod).toBe('2R MATHEMATICAL');
  });

  it('B: 165.36 / 156.60 gives 8.76 risk and a 182.88 target', () => {
    const g = computeGeometry({ entry: 165.36, stop: 156.6 });
    expect(g.riskPerShare).toBe(8.76);
    expect(g.mathematicalTarget).toBe(182.88);
  });

  it('C: 155.53 / 112.67 gives 42.86 risk and a 241.25 target', () => {
    const g = computeGeometry({ entry: 155.53, stop: 112.67 });
    expect(g.riskPerShare).toBe(42.86);
    expect(g.mathematicalTarget).toBe(241.25);
  });

  it('D: resistance at 35.31 blocks the path before 1R', () => {
    const g = computeGeometry({ entry: 34.34, stop: 32.51, resistance: 35.31 });
    expect(g.riskPerShare).toBe(1.83);
    expect(g.rewardToResistance).toBe(0.97);
    expect(g.rToResistance).toBeCloseTo(0.53, 2);
    expect(g.mathematicalTarget).toBe(38.0);
    expect(g.targetPath).toBe('BLOCKED');
    expect(g.targetQuality).toBe('POOR');
    expect(g.resistanceTooClose).toBe(true);
  });

  it('E: 65.14 / 56.81 with a $50 risk ceiling approves 6 shares', () => {
    const g = computeGeometry({ entry: 65.14, stop: 56.81, maxDollarRisk: 50 });
    expect(g.riskPerShare).toBe(8.33);
    expect(g.mathematicalTarget).toBe(81.8);
    expect(g.maxShares).toBe(6);
  });
});

describe('trade geometry — quality and gates', () => {
  it('clear path when resistance sits beyond the target', () => {
    const g = computeGeometry({ entry: 100, stop: 95, resistance: 115 });
    expect(g.rToResistance).toBe(3);
    expect(g.targetPath).toBe('CLEAR');
    expect(g.targetQuality).toBe('STRONG');
  });

  it('acceptable between 1.5R and 2R', () => {
    const g = computeGeometry({ entry: 100, stop: 95, resistance: 108.75 });
    expect(g.rToResistance).toBe(1.75);
    expect(g.targetPath).toBe('PARTIALLY_BLOCKED');
    expect(g.targetQuality).toBe('ACCEPTABLE');
  });

  it('questionable between 1R and 1.5R', () => {
    const g = computeGeometry({ entry: 100, stop: 95, resistance: 106 });
    expect(g.targetQuality).toBe('QUESTIONABLE');
  });

  it('says so instead of guessing when no resistance is recorded', () => {
    const g = computeGeometry({ entry: 100, stop: 95 });
    expect(g.targetPath).toBe('INSUFFICIENT_DATA');
    expect(g.targetQuality).toBe('INSUFFICIENT_DATA');
  });

  it('an invalid stop produces no qualified target', () => {
    const g = computeGeometry({ entry: 100, stop: 95, stopQuality: 'INVALID' });
    expect(g.target).toBeNull();
    expect(g.targetState).toBe('INVALID_STOP');
  });

  it('a questionable stop lowers target confidence but keeps the maths', () => {
    const g = computeGeometry({ entry: 100, stop: 95, stopQuality: 'QUESTIONABLE' });
    expect(g.target).toBe(110);
    expect(g.targetConfidence).toBe('LOW');
  });

  it('an extended entry marks the target stale', () => {
    const g = computeGeometry({ entry: 100, stop: 95, entryQuality: 'EXTENDED' });
    expect(g.targetState).toBe('STALE');
  });

  it('a stop at or above entry cannot produce risk or a target', () => {
    const g = computeGeometry({ entry: 100, stop: 100 });
    expect(g.riskPerShare).toBeNull();
    expect(g.target).toBeNull();
  });

  it('honours a custom reward multiple and planned risk', () => {
    const g = computeGeometry({
      entry: 34.34,
      stop: 32.51,
      rewardMultiple: 3,
      plannedShares: 5,
      maxDollarRisk: 50,
    });
    expect(g.mathematicalTarget).toBe(39.83);
    expect(g.plannedRisk).toBe(9.15);
    expect(g.maxShares).toBe(27);
  });

  it('keeps the 2R maths visible next to a manual technical target', () => {
    const g = computeGeometry({
      entry: 165.36,
      stop: 156.6,
      manualTarget: 179.5,
      manualTargetMethod: 'RESISTANCE',
    });
    expect(g.mathematicalTarget).toBe(182.88);
    expect(g.target).toBe(179.5);
    expect(g.targetMethod).toBe('RESISTANCE');
    expect(g.rewardRisk).toBe(1.61);
  });
});
