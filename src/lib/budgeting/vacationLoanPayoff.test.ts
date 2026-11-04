import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE, LOAN_2306, LOAN_3006, monthly3006, plan2306, schedule3006 } from './vacationLoanPayoff';

describe('vacation loan payoff', () => {
  it('2306 planned funding totals $601.20 with MyUSA fixed at $151', () => {
    expect(LOAN_2306.balance).toBe(601.2);
    expect(LOAN_2306.iucu + LOAN_2306.myusa).toBeCloseTo(601.2, 2);
  });
  it('3006 sources total $934.10, $778.67 while 2306 is open', () => {
    const s = LOAN_3006.sources;
    expect(s.regular + s.redirect2306 + s.debtRedirects + s.myusa + s.iucuExtra).toBeCloseTo(934.1, 2);
    expect(monthly3006(false)).toBe(778.67);
    expect(monthly3006(true)).toBe(934.1);
  });
  it('2306 withholds a precise estimate until dates are entered', () => {
    expect(plan2306(DEFAULT_STATE.l2306).required).toBeNull();
  });
  it('2306 extra interest comes from IUCU, not MyUSA', () => {
    const r = plan2306({ ...DEFAULT_STATE.l2306, asOf: '2026-11-04', iucuDate: '2026-11-30', myusaDate: '2026-11-30' });
    // 601.20 * 0.3599/365 * 26 days = 15.41
    expect(r.interest).toBe(15.41);
    expect(r.iucuNeeded).toBe(465.61);
    expect(r.extraFromIucu).toBe(15.41);
  });
  it('valid lender quote overrides the estimate', () => {
    const r = plan2306({ ...DEFAULT_STATE.l2306, asOf: '', iucuDate: '2026-11-30', myusaDate: '2026-11-30', quoteAmount: 612, quoteGoodThrough: '2026-12-02' });
    expect(r.required).toBe(612);
    expect(r.estimated).toBe(false);
  });
  it('3006 schedule starts December 2026 and stops at payoff', () => {
    const s = schedule3006({ ...DEFAULT_STATE.l3006, asOf: '2026-11-30', postingDay: 30 }, false);
    expect(s.rows[0].month).toBe('2026-12');
    expect(s.rows[0].planned).toBe(778.67);
    expect(s.rows[s.rows.length - 1].end).toBe(0);
  });
  it('lender-confirmed zero stops future payments', () => {
    expect(schedule3006({ ...DEFAULT_STATE.l3006, asOf: '2026-11-30', postingDay: 30, lenderZero: true }, true).rows).toHaveLength(0);
  });
});
