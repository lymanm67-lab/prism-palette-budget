import { describe, expect, it } from 'vitest';
import { monthlyBalance, monthlyIncome, EMERGENCY_OPENING } from './monthlyBalance';
describe('expense-first monthly balancing', () => {
  it('counts the $387 carryover once separately from $5457 received', () => {
    expect(monthlyIncome('2026-10-01', '2026-10-01', [{ planned: 5233.52, received: 5457 }, { planned: 387, received: 0, carryover: true }])).toBe(5844);
  });
  it('funds Emergency first with October $554.17 and removes supplemental retirement', () => {
    expect(monthlyBalance(5844, 5289.83)).toEqual({ available: 554.17, shortfall: 0, emergency: 554.17, retire: 0, vacation: 0, housing: 0, guilt: 0 });
  });
  it('preserves the confirmed $607 balance without counting it as income', () => {
    expect(EMERGENCY_OPENING).toBe(607);
    expect(monthlyBalance(100, 100).available).toBe(0);
  });
  it('does not fund any bucket when expenses exceed income', () => {
    expect(monthlyBalance(100, 150)).toEqual({ available: 0, shortfall: 50, emergency: 0, retire: 0, vacation: 0, housing: 0, guilt: 0 });
  });
  it('uses future plans, past actuals and only unpaid confirmed expected income', () => {
    const lines = [{ planned: 4363.52, received: 2000, expected: true }];
    expect(monthlyIncome('2026-11-01','2026-10-01',lines)).toBe(4363.52);
    expect(monthlyIncome('2026-09-01','2026-10-01',lines)).toBe(2000);
    expect(monthlyIncome('2026-10-01','2026-10-01',lines)).toBe(4363.52);
  });
  it('never doubles income already received above the plan', () => {
    expect(monthlyIncome('2026-10-01','2026-10-01',[{ planned: 4363.52, received: 4367, expected: true }])).toBe(4367);
  });
  it('caps Emergency at $7000 including prior plans and preserves exact cents', () => {
    const a = monthlyBalance(100,0,6900,50);
    expect(a.emergency).toBe(50);
    expect(a.vacation+a.housing+a.guilt).toBe(50);
  });
  it('repeated calculations replace the same amounts', () => {
    expect(monthlyBalance(5844,5289.83)).toEqual(monthlyBalance(5844,5289.83));
  });
});