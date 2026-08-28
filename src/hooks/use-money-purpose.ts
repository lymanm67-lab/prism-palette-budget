import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useBudgets, useCategories, useCategoryGroups, useTransactionsByDateRange } from '@/hooks/use-finance-data';
import { classifyMoneyPurpose, consumesTakeHome, type MoneyPurpose } from '@/lib/budgeting/moneyPurpose';
import { computeBlueprint5010, CORE_KEYS, type BlueprintOutput, type CoreKey } from '@/lib/budgeting/blueprint5010';
import { projectPhase, type PhaseProjection } from '@/lib/budgeting/phaseProjection';

export interface PurposeResolution {
  byCategory: Map<string, MoneyPurpose | null>;
  overridden: Set<string>;
  businessCategoryIds: Set<string>;
  employerCategoryIds: Set<string>;
  incomeCategoryIds: Set<string>;
  payrollCategoryIds: Set<string>;
}

/**
 * Resolves the Money Purpose of every category: a stored `money_purpose`
 * (user override) wins, otherwise the smart mapping rules apply.
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
    const payrollCategoryIds = new Set<string>();

    const groupMap = new Map<string, any>(((groups as any[]) || []).map((g: any) => [g.id, g]));

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
      if ((g.expense_type || '') === 'payroll_deduction') payrollCategoryIds.add(c.id);
      if ((g.expense_type || '') === 'income' && (g.budget_type || 'personal') === 'personal') {
        incomeCategoryIds.add(c.id);
      }
    }

    return {
      byCategory,
      overridden,
      businessCategoryIds,
      employerCategoryIds,
      incomeCategoryIds,
      payrollCategoryIds,
    };
  }, [categories, groups]);
}

// ---------------------------------------------------------------------------
// Payroll elections (effective-dated)
// ---------------------------------------------------------------------------

export interface PayrollElection {
  id: string;
  label: string;
  owner: string;
  amount: number;
  tax_treatment: string;
  counts_as_wealth: boolean;
  is_employer: boolean;
  effective_start: string;
  effective_end: string | null;
  notes: string | null;
}

export function usePayrollElections() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['payroll-elections', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payroll_elections' as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('effective_start', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as PayrollElection[];
    },
  });
}

/** Elections in force for a given YYYY-MM month. */
export function electionsForMonth(elections: PayrollElection[] | undefined, month: string): PayrollElection[] {
  const first = `${month}-01`;
  return (elections || []).filter(
    (e) => e.effective_start <= first && (!e.effective_end || e.effective_end >= first),
  );
}

// ---------------------------------------------------------------------------
// Monthly purpose totals
// ---------------------------------------------------------------------------

export type PurposeTotals = Record<MoneyPurpose, number>;

const emptyTotals = (): PurposeTotals => ({
  live: 0,
  enjoy: 0,
  build_wealth: 0,
  eliminate_debt: 0,
  business: 0,
  payroll_deduction: 0,
  employer_contribution: 0,
});

function monthEnd(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
}

function addMonths(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export type AverageWindow = 1 | 3 | 6 | 12;

export interface MoneyPurposeSnapshot {
  /** actual spend per purpose, averaged across the window */
  actual: PurposeTotals;
  /** planned amounts for the selected month (not averaged) */
  planned: PurposeTotals;
  /** take-home cash received, averaged across the window */
  netIncome: number;
  /** employee payroll wealth contributions in force for the month */
  payrollWealth: number;
  /** employer-paid contributions in force for the month */
  employerWealth: number;
  /** payroll taxes/benefits withheld (informational) */
  payrollDeductions: number;
  blueprint: BlueprintOutput;
  /** automatic target-phase switching detail */
  phaseProjection: PhaseProjection;
  monthsCovered: string[];
  /** true when the month is complete, so imported actuals are authoritative */
  isCompletedMonth: boolean;
  loading: boolean;
}

/**
 * Personal 50/10/20/20 snapshot. Business purposes and employer contributions
 * are excluded from every personal ratio.
 */
export function useMoneyPurposeSnapshot(monthInput: string, window: AverageWindow = 1): MoneyPurposeSnapshot {
  // Callers may pass either `YYYY-MM` or a full `YYYY-MM-01` budget month key.
  const month = monthInput.slice(0, 7);
  const resolution = usePurposeResolution();
  const { data: budgets, isLoading: bLoading } = useBudgets(`${month}-01`);
  const { data: elections, isLoading: eLoading } = usePayrollElections();

  const startMonth = addMonths(month, -(window - 1));
  const { data: txns, isLoading: tLoading } = useTransactionsByDateRange(`${startMonth}-01`, monthEnd(month));

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
      const catId = t.category_id as string | null;

      // Income is the denominator, never an allocation.
      if (catId && resolution.incomeCategoryIds.has(catId)) {
        if (amount > 0) netIncome += amount;
        continue;
      }

      const p = ((t.money_purpose as MoneyPurpose | null) || (catId ? resolution.byCategory.get(catId) : null)) as
        | MoneyPurpose
        | null
        | undefined;
      if (!p) continue;

      // Payroll deduction rows are already inside net pay — never charge them again.
      if (catId && resolution.payrollCategoryIds.has(catId)) {
        actual[p === 'build_wealth' ? 'payroll_deduction' : p] += -amount;
        continue;
      }
      actual[p] += -amount;
    }

    const divisor = window;
    for (const k of Object.keys(actual) as MoneyPurpose[]) {
      actual[k] = Math.round((actual[k] / divisor) * 100) / 100;
    }
    netIncome = Math.round((netIncome / divisor) * 100) / 100;

    const active = electionsForMonth(elections, month);
    const payrollWealth = active
      .filter((e) => e.counts_as_wealth && !e.is_employer)
      .reduce((s, e) => s + Number(e.amount || 0), 0);
    const employerWealth = active.filter((e) => e.is_employer).reduce((s, e) => s + Number(e.amount || 0), 0);
    const payrollDeductions = active
      .filter((e) => !e.counts_as_wealth && !e.is_employer)
      .reduce((s, e) => s + Number(e.amount || 0), 0);

    const core = (src: PurposeTotals): Record<CoreKey, number> =>
      CORE_KEYS.reduce((acc, k) => ({ ...acc, [k]: src[k] }), {} as Record<CoreKey, number>);

    const phaseProjection = projectPhase(month, {
      debtActual: actual.eliminate_debt,
      netIncome,
    });

    const blueprint = computeBlueprint5010({
      netIncome,
      actual: core(actual),
      planned: core(planned),
      payrollWealth,
      employerWealth,
      phase: phaseProjection.phase,
    });

    const monthsCovered = Array.from({ length: window }, (_, i) => addMonths(month, -i)).reverse();
    const isCompletedMonth = monthEnd(month) < new Date().toISOString().slice(0, 10);

    return {
      actual,
      planned,
      netIncome,
      payrollWealth,
      employerWealth,
      payrollDeductions,
      blueprint,
      phaseProjection,
      monthsCovered,
      isCompletedMonth,
      loading: bLoading || tLoading || eLoading,
    };
  }, [budgets, txns, elections, resolution, window, month, bLoading, tLoading, eLoading]);
}

export { consumesTakeHome };
