import { describe, expect, it } from 'vitest';
import { excludesTakeHomeAllocation, excludesBusinessOperatingFunding, isFiveBucketFunding, budgetFundingBreakdown } from './takeHomeAllocation';

describe('net-pay allocation exclusions', () => {
  it('keeps all five bucket contributions separate from expenses', () => {
    for (const name of ['Retirement & HSA', 'Deductibles & Emergency Fund', 'Vacation Fund', 'Housing Fund', 'Guilt Free Fund']) {
      expect(isFiveBucketFunding(`Five-Bucket · ${name}`)).toBe(true);
    }
    expect(isFiveBucketFunding('Rent')).toBe(false);
  });
  it('explains October funding gap without calling saved bucket allocations expenses', () => {
    expect(budgetFundingBreakdown(5233.52, 5400.70, 2345.25)).toEqual({
      beforeBuckets: -167.18, unallocated: -2512.43, expenseShortfall: 167.18, unfundedBuckets: 2345.25,
    });
  });
  it('keeps funded savings assigned without an allocation warning', () => {
    expect(budgetFundingBreakdown(4363.52, 3055.57, 1307.95).unallocated).toBe(0);
  });
  it('excludes HSA already withheld before net pay', () => {
    expect(excludesTakeHomeAllocation('Health Savings Account', true)).toBe(true);
  });
  it('excludes payroll benefits even when classified as Live', () => {
    expect(excludesTakeHomeAllocation('Medical Plan', true)).toBe(true);
    expect(excludesTakeHomeAllocation('Rent', false)).toBe(false);
  });
  it('excludes internal Transfers even without a transfer flag', () => {
    expect(excludesTakeHomeAllocation('Transfers', false)).toBe(true);
  });
  it('keeps the $66 Business Checking investment transfer out of operating funding', () => {
    const spending = [
      { name: 'SBA Loan', amount: 296 },
      { name: 'Investment Transfer — Business Checking', amount: 66 },
    ].filter(row => !excludesBusinessOperatingFunding(row.name))
      .reduce((sum, row) => sum + row.amount, 0);
    expect(spending).toBe(296);
    expect(excludesTakeHomeAllocation('Investment Transfer — Business Checking', false)).toBe(false);
  });
  it('excludes groceries reimbursed by wife', () => {
    expect(excludesTakeHomeAllocation('Groceries', false)).toBe(true);
  });
  it('excludes medical costs paid from HSA', () => {
    expect(excludesTakeHomeAllocation('Prescriptions', false)).toBe(true);
  });
});