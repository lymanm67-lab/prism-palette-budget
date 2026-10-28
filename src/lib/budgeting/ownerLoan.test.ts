import { describe, it, expect } from 'bun:test';
import { ownerLoanLedger } from './ownerLoan';

describe('ownerLoanLedger', () => {
  it('lends all business costs by transfer and repays with the quarterly fee', () => {
    const r = ownerLoanLedger([
      { month: '2026-11', businessIncome: 0, businessExpense: 800 },
      { month: '2026-12', businessIncome: 0, businessExpense: 800 },
      { month: '2027-01', businessIncome: 1925, businessExpense: 800 },
    ]);
    expect(r.map(x => x.balance)).toEqual([800, 1600, 475]);
    expect(r[2].repaid).toBe(1925);
  });
  it('never repays more than is owed', () => {
    const r = ownerLoanLedger([{ month: '2027-01', businessIncome: 1925, businessExpense: 300 }]);
    expect(r[0].repaid).toBe(300);
    expect(r[0].balance).toBe(0);
  });
});
