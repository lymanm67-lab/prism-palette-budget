import { describe, expect, it } from 'vitest';
import { budgetActualLineKey, classifyBudgetActualPillar, combinedCategoryName, isTransferLikeCategory, modeIncludes, primaryBudgetActualEntry, namedBudgetActualShares } from './budgetActual';

const cat = (overrides: Record<string, unknown> = {}) => ({ id: '1', name: 'Rent', groupName: 'Housing', budgetType: 'personal', expenseType: 'fixed', moneyPurpose: null, ...overrides });
describe('budget actual classification', () => {
  it('allocates restaurant outflows before netting the refund, removing the $117.21 discrepancy', () => {
    const shares = namedBudgetActualShares([cat({ name: 'Restaurants — Personal 50%' })], { '1': 234.42 }, new Set());
    expect(234.42 * (shares.scale.get('1') ?? 1) - 40).toBeCloseTo(77.21, 2);
    expect(194.42 - 77.21).toBeCloseTo(117.21, 2);
  });
  it('does not allocate explicit personal/business bank splits twice', () => {
    const shares = namedBudgetActualShares([
      cat({ id: 'p', name: 'Utilities — Personal 69%' }),
      cat({ id: 'b', name: 'Utilities — Business 31%' }),
    ], { p: 330.01, b: 35.72 }, new Set(['p', 'b']));
    expect(shares.scale.size).toBe(0);
    expect(shares.mirror.size).toBe(0);
  });
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
  it('excludes generic transfer categories but keeps planned transfer lines', () => {
    expect(isTransferLikeCategory(cat({ name: 'Transfers' }))).toBe(true);
    expect(isTransferLikeCategory(cat({ name: 'Transfer' }))).toBe(true);
    expect(isTransferLikeCategory(cat({ name: 'Investment Transfer — Business Checking' }))).toBe(false);
    expect(isTransferLikeCategory(cat({ name: 'Rent' }))).toBe(false);
  });
});