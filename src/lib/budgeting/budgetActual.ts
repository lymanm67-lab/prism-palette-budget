import { excludesTakeHomeAllocation, isFiveBucketFunding } from './takeHomeAllocation';

export const BUDGET_ACTUAL_PILLARS = [
  { key: 'bills', label: 'Bills & Essentials', color: 'var(--prism-sky)' },
  { key: 'debt', label: 'Debt Freedom', color: 'var(--prism-indigo)' },
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

export interface BudgetActualEntry {
  category: BudgetActualCategory;
  budgeted: number;
  actual: number;
}

// Generic "Transfers" categories are money moves between accounts, not
// spending — they are never planned, so they stay out of budget-vs-actual.
// Named planned lines like "Investment Transfer — Business Checking" stay in.
export function isTransferLikeCategory(category: BudgetActualCategory): boolean {
  return /^transfers?$/i.test(category.name.trim());
}

// Split expenses are named e.g. "Utilities — Personal 69%" / "Utilities — Business 31%".
const SPLIT_SHARE_SUFFIX = /\s*[—–-]\s*(personal|business)\s*\d+\s*%\s*$/i;

export function combinedCategoryName(name: string): string {
  return name.trim().replace(SPLIT_SHARE_SUFFIX, '').trim();
}

// In combined mode, the same expense split across personal and business
// budget rows (e.g. Rent $946 personal + $154 business) must read as one
// line, so the key is the normalized category name rather than the id.
export function budgetActualLineKey(mode: BudgetActualMode, category: BudgetActualCategory): string {
  if (!category.id) return 'uncategorized';
  return mode === 'combined' ? `merged:${combinedCategoryName(category.name).toLowerCase()}` : category.id;
}

// The merged line takes the pillar of the side carrying the larger plan
// (rent: personal $946 > business $154, so it stays in Bills & Essentials).
export function primaryBudgetActualEntry(entries: BudgetActualEntry[]): BudgetActualEntry {
  return entries.reduce((best, entry) =>
    entry.budgeted > best.budgeted || (entry.budgeted === best.budgeted && entry.actual > best.actual) ? entry : best);
}

/** One combined, expense-only warning list shared by the page and sidebar. */
export function overBudgetExpenseLines<T extends { name: string; groupName: string; budgeted: number; actual: number }>(lines: T[]) {
  return lines
    .filter(line => !isFiveBucketFunding(line.name) &&
      !excludesTakeHomeAllocation(line.name, /payroll|pre[ -]?tax/i.test(line.groupName)) &&
      !/transfer|owner draw|owner contribution|owner capital/i.test(line.name))
    .map(line => ({ ...line, over: Math.round((line.actual - line.budgeted) * 100) / 100 }))
    .filter(line => line.budgeted > 0 && line.over > 0)
    .sort((a, b) => b.over - a.over);
}