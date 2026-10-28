import { describe, it, expect } from 'vitest';
import { ownerLoanLedger } from './ownerLoan';

describe('ownerLoanLedger', () => {
  it('adds owner funding of a business shortfall to the loan balance', () => {
    const r = ownerLoanLedger([{ month: '2026-10', businessIncome: 0, businessExpense: 500 }]);
    expect(r[0].balance).toBe(500);
  });
  it('consulting surplus repays the loan but never below zero', () => {
    const r = ownerLoanLedger([
      { month: '2026-10', businessIncome: 0, businessExpense: 500 },
      { month: '2026-11', businessIncome: 1925.29, businessExpense: 300 },
    ]);
    expect(r[1].repaid).toBe(500);
    expect(r[1].balance).toBe(0);
  });
});
