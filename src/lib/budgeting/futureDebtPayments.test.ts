import { describe, expect, it } from 'vitest';
import { futureDebtPayments } from './futureDebtPayments';

describe('confirmed January–April debt payments', () => {
  const months = ['2027-01-01', '2027-02-01', '2027-03-01', '2027-04-01'];
  it('removes paid-off Vacation Loan 2306', () => {
    expect(months.map(m => futureDebtPayments(m)?.vacation2306)).toEqual([0, 0, 0, 0]);
  });
  it('removes the fully repaid $1,000 sister loan', () => {
    expect(months.map(m => futureDebtPayments(m)?.sister)).toEqual([0, 0, 0, 0]);
  });
  it('starts $390 student loan payments in January', () => {
    expect(months.map(m => futureDebtPayments(m)?.student)).toEqual([390, 390, 390, 390]);
    expect(futureDebtPayments('2026-12-01')).toBeNull();
  });
  it('splits $583 BetrLink 63% personal and 37% business through April', () => {
    for (const month of months) {
      const payments = futureDebtPayments(month);
      expect(payments?.betrLinkPersonal).toBe(367.29);
      expect(payments?.betrLinkBusiness).toBe(215.71);
      expect(Math.round(((payments?.betrLinkPersonal || 0) + (payments?.betrLinkBusiness || 0)) * 100)).toBe(58300);
    }
    expect(futureDebtPayments('2027-05-01')).toBeNull();
  });
  it('applies Loan 3004 extra payments ($878.77 Jan/Mar, $750 Feb) with March payoff', () => {
    expect(months.map(m => futureDebtPayments(m)?.vacation3004)).toEqual([1107.24, 978.47, 551.73, 0]);
  });
});