import { describe, expect, it } from 'vitest';
import { excludesTakeHomeAllocation, excludesBusinessOperatingFunding } from './takeHomeAllocation';

describe('net-pay allocation exclusions', () => {
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