import { describe, it, expect } from 'vitest';
import { personaCounts, resolveResult, scoreAnswers, QUESTIONS } from './persona';
import { leakTotals, leakAdjustment } from './fiveIs';
import { freedomNumber, yearlyGaps, FreedomInputs } from './freedom';

const base: FreedomInputs = {
  currentYear: 2026, targetYear: 2030, endYear: 2032, budgetBefore: 1000, monthlyTaxes: 0,
  otherIncome: [], currentAssets: 0, monthlyContribution: 0, inflation: 0, nominalReturn: 0,
};

describe('wealth lens', () => {
  it('16 questions, each persona appears 8 times', () => {
    expect(QUESTIONS).toHaveLength(16);
    Object.values(personaCounts()).forEach((c) => expect(c).toBe(8));
  });
  it('tie for first needs a tie-breaker, and tie-breaker picks primary', () => {
    const s = scoreAnswers({ 1: 'fortress', 2: 'architect', 3: 'leak' });
    s.fortress = 3; s.architect = 3; s.leak = 1;
    expect(resolveResult(s).needsTieBreaker).toBe(true);
    const r = resolveResult(s, 'architect');
    expect(r.primary).toEqual(['architect']);
    expect(r.secondary).toEqual(['fortress']);
  });
  it('skipped tie-breaker gives blended primary', () => {
    const s = scoreAnswers({});
    s.value = 2; s.bridge = 2;
    expect(resolveResult(s, 'skip').primary).toEqual(['value', 'bridge']);
  });
  it('savings and income totals stay separate', () => {
    const t = leakTotals({
      income: { status: 'leak', amount: 300, period: 'monthly' },
      irs: { status: 'leak', amount: 1200, period: 'annual' },
      interest: { status: 'working', amount: 999, period: 'monthly' },
    });
    expect(t).toEqual({ savings: 100, income: 300 });
  });
  it('leak adjustment is applied once', () => {
    const check = { interest: { status: 'leak' as const, amount: 50, period: 'monthly' as const } };
    const a = leakAdjustment(check, 'interest');
    const once = freedomNumber({ ...base, spendingCut: a.spendingCut });
    const twice = freedomNumber({ ...base, ...a, ...a });
    expect(once).toBe(twice);
    expect(once).toBe(950 * 12 * 2);
  });
  it('other income covering costs gives a zero gap year', () => {
    const rows = yearlyGaps({ ...base, otherIncome: [{ label: 'Pension', monthly: 1500, startYear: 2031 }] });
    expect(rows.map((r) => r.gap)).toEqual([12000, 0]);
  });
  it('present value matches a hand-checked example', () => {
    // 2 years of $12,000 at 10% real: 12000 + 12000/1.1 = 22909.09
    expect(freedomNumber({ ...base, nominalReturn: 0.1 })).toBeCloseTo(22909.09, 1);
  });
});
