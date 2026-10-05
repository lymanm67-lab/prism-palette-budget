export const BUDGET_ACTUAL_PILLARS = [
  { key: 'bills', label: 'Bills & Essentials', color: 'var(--prism-sky)' },
  { key: 'debt', label: 'Debt Freedom', color: 'var(--prism-rose)' },
  { key: 'savings', label: 'Savings & Buffer', color: 'var(--prism-teal)' },
  { key: 'wealth', label: 'Wealth & Investing', color: 'var(--prism-lime)' },
  { key: 'business', label: 'Business Expenses', color: 'var(--prism-orange)' },
  { key: 'sinkingFunds', label: 'Non-Monthly & Sinking Funds', color: 'var(--prism-violet)' },
  { key: 'guiltFree', label: 'Guilt-Free Spend', color: 'var(--prism-amber)' },
] as const;

export type BudgetActualPillarKey = typeof BUDGET_ACTUAL_PILLARS[number]['key'];
export type BudgetActualMode = 'personal' | 'business' | 'combined';

export interface BudgetActualCategory {
  id: string | null;
  name: string;
  groupName: string;
  budgetType?: string | null;
  expenseType?: string | null;
  moneyPurpose?: string | null;
}

export function classifyBudgetActualPillar(category: BudgetActualCategory): BudgetActualPillarKey | 'income' | 'uncategorized' {
  if (!category.id) return 'uncategorized';
  const group = category.groupName.toLowerCase();
  const name = category.name.toLowerCase();
  const expense = (category.expenseType || '').toLowerCase();
  const purpose = (category.moneyPurpose || '').toLowerCase();
  const business = category.budgetType === 'business' || group.startsWith('business');

  if (expense === 'income' || /(^|\s)income($|\s)/.test(group)) return 'income';
  if (purpose === 'eliminate_debt' || expense === 'debt' || /debt|loan repayment/.test(group)) return 'debt';
  if (business) return 'business';
  if (expense === 'payroll_deduction' || /payroll|pre[ -]?tax/.test(group) || /roth|457|tda|403|401|hsa|retire|brokerage|ira/.test(name)) return 'wealth';
  if (purpose === 'build_wealth' || expense === 'wealth' || /savings|buffer|future fund/.test(group)) return 'savings';
  if (expense === 'non_monthly' || /non[ -]?monthly|sinking/.test(group)) return 'sinkingFunds';
  if (purpose === 'enjoy' || expense === 'flexible' || /guilt.?free|enjoy/.test(group)) return 'guiltFree';
  return 'bills';
}

export function modeIncludes(mode: BudgetActualMode, category: BudgetActualCategory) {
  if (mode === 'combined') return true;
  const business = category.budgetType === 'business' || category.groupName.toLowerCase().startsWith('business');
  return mode === 'business' ? business : !business;
}