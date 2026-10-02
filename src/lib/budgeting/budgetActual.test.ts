import { describe, expect, it } from 'vitest';
import { classifyBudgetActualPillar, modeIncludes } from './budgetActual';

const cat = (overrides: Record<string, unknown> = {}) => ({ id: '1', name: 'Rent', groupName: 'Housing', budgetType: 'personal', expenseType: 'fixed', moneyPurpose: null, ...overrides });
describe('budget actual classification', () => {
  it('maps core paycheck-tree areas', () => {
    expect(classifyBudgetActualPillar(cat())).toBe('bills');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Personal Debt Repayment' }))).toBe('debt');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Business Fixed Expenses', budgetType: 'business' }))).toBe('business');
    expect(classifyBudgetActualPillar(cat({ expenseType: 'payroll_deduction', name: 'Roth 457' }))).toBe('wealth');
    expect(classifyBudgetActualPillar(cat({ moneyPurpose: 'build_wealth' }))).toBe('savings');
    expect(classifyBudgetActualPillar(cat({ expenseType: 'flexible' }))).toBe('guiltFree');
  });
  it('keeps personal and business modes separate', () => {
    expect(modeIncludes('personal', cat())).toBe(true);
    expect(modeIncludes('business', cat())).toBe(false);
    expect(modeIncludes('business', cat({ budgetType: 'business' }))).toBe(true);
  });
});