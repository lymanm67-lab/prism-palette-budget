import { describe, expect, it } from 'vitest';
import { overBudgetExpenseLines } from './budgetActual';

const line = (name: string, budgeted: number, actual: number, groupName = 'Fixed Essentials') => ({ name, budgeted, actual, groupName });
describe('expense-only over-budget warnings', () => {
  it('does not flag the five savings buckets as expense overages', () => {
    expect(overBudgetExpenseLines([line('Five-Bucket · Housing Fund', 100, 200)])).toEqual([]);
  });
  it('excludes transfers and withheld or reimbursed spending', () => {
    expect(overBudgetExpenseLines([
      line('Transfers', 100, 200), line('Groceries', 100, 200), line('Medical', 100, 200),
      line('TDA', 100, 200, 'Payroll & Pre-Tax'), line('Owner Draw', 100, 200),
    ])).toEqual([]);
  });
  it('does not flag combined rent of $1100 when both shares total $1100', () => {
    expect(overBudgetExpenseLines([line('Rent', 946 + 154, 1100)])).toEqual([]);
  });
  it('retains genuine expense overages with exact cents', () => {
    expect(overBudgetExpenseLines([line('Oil & Tags', 55, 182)])[0].over).toBe(127);
  });
});