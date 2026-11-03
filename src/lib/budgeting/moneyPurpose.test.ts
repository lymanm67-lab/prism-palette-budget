import { describe, it, expect } from 'vitest';
import { isGuiltFreeSpend } from './moneyPurpose';

describe('isGuiltFreeSpend', () => {
  it('counts discretionary flexible spending', () => {
    expect(isGuiltFreeSpend({
      categoryName: 'Clothing', expenseType: 'flexible', budgetType: 'personal', storedPurpose: 'enjoy',
    })).toBe(true);
  });

  it('excludes business operating costs (insurance, dues, vehicle)', () => {
    expect(isGuiltFreeSpend({
      categoryName: 'Insurance', expenseType: 'flexible', budgetType: 'business', storedPurpose: 'business',
    })).toBe(false);
    expect(isGuiltFreeSpend({
      categoryName: 'Dues & Subscriptions', expenseType: 'flexible', budgetType: 'business', storedPurpose: 'business',
    })).toBe(false);
    expect(isGuiltFreeSpend({
      categoryName: 'Vehicle Expenses', expenseType: 'flexible', budgetType: 'business', storedPurpose: 'business',
    })).toBe(false);
  });

  it('excludes fixed bills and subscriptions', () => {
    expect(isGuiltFreeSpend({
      categoryName: 'SiriusXM', expenseType: 'fixed', budgetType: 'personal', storedPurpose: 'enjoy',
    })).toBe(false);
  });

  it('excludes groceries and medical (reimbursed / HSA)', () => {
    expect(isGuiltFreeSpend({ categoryName: 'Groceries', expenseType: 'flexible', budgetType: 'personal' })).toBe(false);
    expect(isGuiltFreeSpend({ categoryName: 'Medical', expenseType: 'flexible', budgetType: 'personal' })).toBe(false);
  });

  it('treats unbudgeted flexible personal spending as guilt-free', () => {
    expect(isGuiltFreeSpend({ categoryName: 'Misc', expenseType: 'flexible', budgetType: 'personal' })).toBe(true);
  });
});
