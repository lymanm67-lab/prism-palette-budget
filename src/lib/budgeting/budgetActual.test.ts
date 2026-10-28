import { describe, expect, it } from 'vitest';
import { budgetActualLineKey, classifyBudgetActualPillar, combinedCategoryName, modeIncludes, primaryBudgetActualEntry } from './budgetActual';

const cat = (overrides: Record<string, unknown> = {}) => ({ id: '1', name: 'Rent', groupName: 'Housing', budgetType: 'personal', expenseType: 'fixed', moneyPurpose: null, ...overrides });
describe('budget actual classification', () => {
  it('maps core paycheck-tree areas', () => {
    expect(classifyBudgetActualPillar(cat())).toBe('bills');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Personal Debt Repayment' }))).toBe('debt');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Business Fixed Expenses', budgetType: 'business' }))).toBe('business');
    expect(classifyBudgetActualPillar(cat({ expenseType: 'payroll_deduction', name: 'Roth 457' }))).toBe('wealth');
    expect(classifyBudgetActualPillar(cat({ moneyPurpose: 'build_wealth' }))).toBe('savings');
    expect(classifyBudgetActualPillar(cat({ expenseType: 'flexible' }))).toBe('guiltFree');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Sinking Funds (Non-Monthly)', expenseType: 'non_monthly', name: 'Auto Maintenance & Tags' }))).toBe('sinkingFunds');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Non-Monthly', expenseType: 'non_monthly' }))).toBe('sinkingFunds');
    expect(classifyBudgetActualPillar(cat({ groupName: 'Enjoy', purpose: 'enjoy' }))).toBe('guiltFree');
  });
  it('keeps personal and business modes separate', () => {
    expect(modeIncludes('personal', cat())).toBe(true);
    expect(modeIncludes('business', cat())).toBe(false);
    expect(modeIncludes('business', cat({ budgetType: 'business' }))).toBe(true);
  });
  it('merges split categories into one line in combined mode only', () => {
    const personal = cat({ id: 'a', name: 'Rent', groupName: 'Housing' });
    const business = cat({ id: 'b', name: 'Rent', groupName: 'Business Fixed Expenses', budgetType: 'business' });
    expect(budgetActualLineKey('combined', personal)).toBe(budgetActualLineKey('combined', business));
    expect(budgetActualLineKey('personal', personal)).not.toBe(budgetActualLineKey('personal', business));
    expect(budgetActualLineKey('combined', cat({ id: null }))).toBe('uncategorized');
  });
  it('merges "— Personal/Business NN%" share categories in combined mode', () => {
    const personal = cat({ id: 'a', name: 'Utilities — Personal 69%' });
    const business = cat({ id: 'b', name: 'Utilities — Business 31%', budgetType: 'business' });
    expect(budgetActualLineKey('combined', personal)).toBe(budgetActualLineKey('combined', business));
    expect(combinedCategoryName('Phone & Internet (Verizon) — Business 60%')).toBe('Phone & Internet (Verizon)');
    expect(combinedCategoryName('Auto Insurance — Personal 53%')).toBe('Auto Insurance');
    expect(combinedCategoryName('Rent')).toBe('Rent');
  });
  it('classifies a merged split line by the side with the larger plan', () => {
    const entries = [
      { category: cat({ id: 'a', name: 'Rent', groupName: 'Housing' }), budgeted: 946, actual: 1100 },
      { category: cat({ id: 'b', name: 'Rent', groupName: 'Business Fixed Expenses', budgetType: 'business' }), budgeted: 154, actual: 0 },
    ];
    const primary = primaryBudgetActualEntry(entries);
    expect(primary.category.groupName).toBe('Housing');
    expect(classifyBudgetActualPillar(primary.category)).toBe('bills');
  });
});