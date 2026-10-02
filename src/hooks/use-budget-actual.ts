import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { BUDGET_ACTUAL_PILLARS, classifyBudgetActualPillar, modeIncludes, type BudgetActualCategory, type BudgetActualMode, type BudgetActualPillarKey } from '@/lib/budgeting/budgetActual';
import type { PaycheckDeployment } from '@/hooks/use-paycheck-deploy';

export interface BudgetActualLine {
  key: string;
  categoryId: string | null;
  name: string;
  groupName: string;
  pillar: BudgetActualPillarKey | 'uncategorized';
  budgeted: number;
  actual: number;
}

export function useBudgetActual(month: string, mode: BudgetActualMode) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['budget-actual', household?.id, month, mode],
    enabled: !!household,
    queryFn: async () => {
      const start = `${month}-01`;
      const end = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0).toISOString().slice(0, 10);
      const [budgetsRes, txRes, splitsRes, deployRes] = await Promise.all([
        supabase.from('budgets').select('category_id, planned_amount, categories(name, money_purpose, category_groups(name, budget_type, expense_type))').eq('household_id', household!.id).eq('month', start),
        supabase.from('transactions').select('id, amount, category_id, categories(name, money_purpose, category_groups(name, budget_type, expense_type))').eq('household_id', household!.id).is('deleted_at', null).eq('is_transfer', false).gte('date', start).lte('date', end).range(0, 4999),
        supabase.from('transaction_splits').select('transaction_id, category_id, amount, categories(name, money_purpose, category_groups(name, budget_type, expense_type)), transactions!inner(household_id, date, is_transfer, deleted_at)').eq('transactions.household_id', household!.id).eq('transactions.is_transfer', false).is('transactions.deleted_at', null).gte('transactions.date', start).lte('transactions.date', end).range(0, 4999),
        supabase.from('paycheck_deployments').select('*').eq('household_id', household!.id).gte('pay_date', start).lte('pay_date', end).neq('status', 'skipped').order('pay_date', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (budgetsRes.error) throw budgetsRes.error;
      if (txRes.error) throw txRes.error;
      if (splitsRes.error) throw splitsRes.error;
      if (deployRes.error) throw deployRes.error;

      const map = new Map<string, BudgetActualLine>();
      const readCat = (row: any): BudgetActualCategory => ({
        id: row.category_id || null,
        name: row.categories?.name || 'Uncategorized',
        groupName: row.categories?.category_groups?.name || 'Uncategorized',
        budgetType: row.categories?.category_groups?.budget_type,
        expenseType: row.categories?.category_groups?.expense_type,
        moneyPurpose: row.categories?.money_purpose,
      });
      const add = (category: BudgetActualCategory, budgeted: number, actual: number) => {
        const pillar = classifyBudgetActualPillar(category);
        if (pillar === 'income' || !modeIncludes(mode, category)) return;
        const key = category.id || 'uncategorized';
        const current = map.get(key) || { key, categoryId: category.id, name: category.name, groupName: category.groupName, pillar, budgeted: 0, actual: 0 };
        current.budgeted += budgeted;
        current.actual += actual;
        map.set(key, current);
      };
      for (const row of budgetsRes.data || []) add(readCat(row), Number(row.planned_amount) || 0, 0);
      const splitIds = new Set((splitsRes.data || []).map((row: any) => row.transaction_id));
      let incomeReceived = 0;
      for (const row of txRes.data || []) {
        if (splitIds.has(row.id)) continue;
        const amount = Number(row.amount) || 0;
        const cat = readCat(row);
        if (amount > 0 && classifyBudgetActualPillar(cat) === 'income' && modeIncludes(mode, cat)) incomeReceived += amount;
        if (amount < 0) add(cat, 0, Math.abs(amount));
      }
      for (const row of splitsRes.data || []) {
        const amount = Number(row.amount) || 0;
        if (amount < 0) add(readCat(row), 0, Math.abs(amount));
      }

      const lines = Array.from(map.values()).sort((a, b) => b.actual - a.actual || b.budgeted - a.budgeted);
      const pillars = BUDGET_ACTUAL_PILLARS.map(def => {
        const children = lines.filter(line => line.pillar === def.key);
        return { ...def, budgeted: children.reduce((sum, line) => sum + line.budgeted, 0), actual: children.reduce((sum, line) => sum + line.actual, 0), lines: children };
      });
      const uncategorized = lines.filter(line => line.pillar === 'uncategorized');
      return { start, end, pillars, uncategorized, incomeReceived, deployment: deployRes.data as unknown as PaycheckDeployment | null };
    },
  });
}