import { describe, expect, it } from 'vitest';
import { excludesTakeHomeAllocation } from './takeHomeAllocation';

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
  it('excludes groceries reimbursed by wife', () => {
    expect(excludesTakeHomeAllocation('Groceries', false)).toBe(true);
  });
  it('excludes medical costs paid from HSA', () => {
    expect(excludesTakeHomeAllocation('Prescriptions', false)).toBe(true);
  });
});