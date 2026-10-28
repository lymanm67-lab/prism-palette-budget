import { describe, it, expect } from 'vitest';
import { DEFAULT_PHASES, phaseFor, project, ssMonthly, type WhatIfInputs } from './whatIf';
import { stateByCode, stateTaxFor } from './stateTax';

const base: WhatIfInputs = {
  currentAge: 59, retireAge: 62, lifeExpectancy: 100, ssClaimAge: 67, portfolio: 184602.31,
  annualContribution: 10000, annualReturn: 0.05, inflation: 0.025, baseSpending: 60000,
  medicalSpending: 6000, medicalInflation: 0.05, otherIncome: 0, phases: DEFAULT_PHASES,
  state: 'OH', homeValue: 0,
};

describe('what-if engine', () => {
  it('uses SSA estimates at 62, 67 and 70', () => {
    expect(ssMonthly(62)).toBe(1799);
    expect(ssMonthly(67)).toBe(2784);
    expect(ssMonthly(70)).toBe(3540);
  });
  it('applies Go-Go 110%, Slow-Go 85%, No-Go 75%', () => {
    expect(phaseFor(70, 62, DEFAULT_PHASES).pct).toBe(1.1);
    expect(phaseFor(80, 62, DEFAULT_PHASES).pct).toBe(0.85);
    expect(phaseFor(90, 62, DEFAULT_PHASES).pct).toBe(0.75);
  });
  it('Ohio taxes retirement withdrawals, Florida does not', () => {
    const inc = { withdrawals: 40000, pension: 0, socialSecurity: 30000 };
    expect(stateTaxFor(stateByCode('OH'), inc)).toBeCloseTo(1100, 2);
    expect(stateTaxFor(stateByCode('FL'), inc)).toBe(0);
  });
  it('delaying retirement pushes the money-runs-out age later', () => {
    const early = project(base).depletionAge!;
    const late = project({ ...base, retireAge: 67 }).depletionAge ?? 999;
    expect(late).toBeGreaterThan(early);
  });
});
