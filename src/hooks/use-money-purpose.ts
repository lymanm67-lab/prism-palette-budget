import { useMemo } from 'react';
import { useBudgets, useCategories, useCategoryGroups, useTransactionsByDateRange } from '@/hooks/use-finance-data';
import {
  classifyMoneyPurpose,
  consumesTakeHome,
  type MoneyPurpose,
} from '@/lib/budgeting/moneyPurpose';

export interface PurposeResolution {
  /** category id -> resolved purpose (stored override wins over smart mapping) */
  byCategory: Map<string, MoneyPurpose | null>;
  /** category id -> true when the purpose came from a stored override */
  overridden: Set<string>;
  /** category ids whose money is business-owned (never personal) */
  businessCategoryIds: Set<string>;
  /** category ids that are employer-paid contributions (never personal cash) */
  employerCategoryIds: Set<string>;
  /** category ids that are personal income (the denominator) */
  incomeCategoryIds: Set<string>;
}

/**
 * Resolves the Money Purpose of every category: a stored `money_purpose` value
 * (user override) takes precedence, otherwise the smart mapping rules apply.
 */
export function usePurposeResolution(): PurposeResolution {
  const { data: categories } = useCategories();
  const { data: groups } = useCategoryGroups();

  return useMemo(() => {
    const byCategory = new Map<string, MoneyPurpose | null>();
    const overridden = new Set<string>();
    const businessCategoryIds = new Set<string>();
    const employerCategoryIds = new Set<string>();
    const incomeCategoryIds = new Set<string>();

    const groupMap = new Map<string, any>((groups as any[] | undefined)?.map((g: any) => [g.id, g]) || []);

    for (const c of ((categories as any[]) || [])) {
      const g = groupMap.get(c.group_id) || {};
      const stored = (c.money_purpose || g.money_purpose || null) as MoneyPurpose | null;
      const purpose =
        stored ||
        classifyMoneyPurpose({
          categoryName: c.name,
          groupName: g.name,
          expenseType: g.expense_type,
          budgetType: g.budget_type,
        });

      if (c.money_purpose) overridden.add(c.id);
      byCategory.set(c.id, purpose);

      if (purpose === 'business') businessCategoryIds.add(c.id);
      if (purpose === 'employer_contribution') employerCategoryIds.add(c.id);
      if ((g.expense_type || '') === 'income' && (g.budget_type || 'personal') === 'personal') {
        incomeCategoryIds.add(c.id);
      }
    }

    return { byCategory, overridden, businessCategoryIds, employerCategoryIds, incomeCategoryIds };
  }, [categories, groups]);
}

export interface PurposeTotals {
  live: number;
  enjoy: number;
  build_wealth: number;
  eliminate_debt: number;
  /** informational only — excluded from personal ratios */
  business: number;
  payroll_deduction: number;
  employer_contribution: number;
}

const emptyTotals = (): PurposeTotals => ({
  live: 0,
  enjoy: 0,
  build_wealth: 0,
  eliminate_debt: 0,
  business: 0,
  payroll_deduction: 0,
  employer_contribution: 0,
});

function monthBounds(month: string) {
  const start = `${month}-01`;
  const [y, m] = month.split('-').map(Number);
  const end = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return { start, end };
}

export interface MoneyPurposeMonth {
  planned: PurposeTotals;
  actual: PurposeTotals;
  /** personal take-home received in the month (income categories, transfers excluded) */
  netIncome: number;
  /** planned/actual sums that consume take-home cash only */
  plannedAllocated: number;
  actualAllocated: number;
  unallocated: number;
  loading: boolean;
}

/**
 * Personal 50/10/20/20 totals for a month.
 *
 * Accounting rules enforced here:
 * - business purposes never enter personal totals;
 * - employer contributions never enter personal totals or income;
 * - payroll deductions are tracked separately (they already sit inside net pay),
 *   except wealth-building deductions which are surfaced under BUILD WEALTH;
 * - transfers between owned accounts are ignored.
 */
export function useMoneyPurposeMonth(month: string): MoneyPurposeMonth {
  const resolution = usePurposeResolution();
  const { data: budgets, isLoading: bLoading } = useBudgets(month);
  const { start, end } = monthBounds(month);
  const { data: txns, isLoading: tLoading } = useTransactionsByDateRange(start, end);

  return useMemo(() => {
    const planned = emptyTotals();
    const actual = emptyTotals();
    let netIncome = 0;

    for (const b of ((budgets as any[]) || [])) {
      if (resolution.incomeCategoryIds.has(b.category_id)) continue;
      const p = resolution.byCategory.get(b.category_id);
      if (!p) continue;
      planned[p] += Number(b.planned_amount) || 0;
    }

    for (const t of ((txns as any[]) || [])) {
      if (t.deleted_at || t.is_transfer) continue;
      const amount = Number(t.amount) || 0;
      const catId = t.category_id;

      if (catId && resolution.incomeCategoryIds.has(catId)) {
        if (amount > 0) netIncome += amount;
        continue;
      }

      const p = (t.money_purpose as MoneyPurpose | null) || (catId ? resolution.byCategory.get(catId) : null);
      if (!p) continue;
      actual[p] += Math.abs(Math.min(amount, 0)) || (amount < 0 ? Math.abs(amount) : 0);
    }

    const plannedAllocated = (['live', 'enjoy', 'build_wealth', 'eliminate_debt'] as const).reduce(
      (s, k) => s + planned[k],
      0,
    );
    const actualAllocated = (['live', 'enjoy', 'build_wealth', 'eliminate_debt'] as const).reduce(
      (s, k) => s + actual[k],
      0,
    );

    return {
      planned,
      actual,
      netIncome,
      plannedAllocated,
      actualAllocated,
      unallocated: netIncome - actualAllocated,
      loading: bLoading || tLoading,
    };
  }, [budgets, txns, resolution, bLoading, tLoading]);
}

export { consumesTakeHome };
