import { useMemo } from 'react';
import { useAccounts, useTransactions } from '@/hooks/use-finance-data';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useModeSettings, type FinancialMode, MODE_CONFIG } from '@/hooks/use-financial-mode';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfMonth } from 'date-fns';

const NON_SUB_KEYWORDS = ['rent', 'mortgage', 'insurance', 'utilit', 'electric', 'gas', 'water', 'sewer', 'trash', 'debt', 'loan', 'transfer', 'payment'];

function isNonSubscription(sub: any): boolean {
  const merchant = (sub.merchant || '').toLowerCase();
  const catName = (sub.categories?.name || '').toLowerCase();
  return NON_SUB_KEYWORDS.some(kw => merchant.includes(kw) || catName.includes(kw)) || (sub.is_transfer === true);
}

export interface SafeToSpendResult {
  daily: number;
  weekly: number;
  monthly: number;
  totalAvailableCash: number;
  monthlyIncome: number;
  monthlyObligations: number;
  monthlySubscriptions: number;
  budgetIncome: number;
  budgetExpenses: number;
  effectiveExpenses: number;
  bufferPercent: number;
  mode: FinancialMode;
  isLoading: boolean;
}

export type StsScope = 'combined' | 'personal' | 'business';

export function useSafeToSpend(scope: StsScope = 'combined'): SafeToSpendResult {
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  const { data: recurring } = useRecurringTransactions();
  const { data: subscriptions } = useSubscriptions();
  const { data: modeSettings } = useModeSettings();
  const { household } = useHousehold();

  // Fetch budgets with category group info to identify income vs expense
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: budgetsWithGroups } = useQuery({
    queryKey: ['budgets-with-groups', household?.id, currentMonth],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('planned_amount, categories(name, group_id, category_groups(expense_type, budget_type, business_profile_id))')
        .eq('household_id', household!.id)
        .eq('month', currentMonth);
      if (error) throw error;
      return data as any[];
    },
  });

  return useMemo(() => {
    const mode: FinancialMode = (modeSettings?.current_mode as FinancialMode) || 'guardrail';
    const bufferPercent = modeSettings?.buffer_percent ?? MODE_CONFIG[mode].bufferDefault;

    // Calculate budget-based income and expenses
    let budgetIncome = 0;
    let budgetExpenses = 0;
    for (const b of (budgetsWithGroups || [])) {
      const group = b.categories?.category_groups;
      const isBusiness = group?.budget_type === 'business' || !!group?.business_profile_id;
      if (scope === 'personal' && isBusiness) continue;
      if (scope === 'business' && !isBusiness) continue;
      const expType = group?.expense_type || 'flexible';
      if (expType === 'income') {
        budgetIncome += b.planned_amount || 0;
      } else if (expType !== 'equity') {
        budgetExpenses += b.planned_amount || 0;
      }
    }

    // Total available cash (checking + savings)
    const totalAvailableCash = (accounts || [])
      .filter(a => a.is_active && (a.account_type === 'checking' || a.account_type === 'savings') && a.balance > 0)
      .reduce((s, a) => s + a.balance, 0);

    // Monthly income from this month's transactions
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthTxns = (transactions || []).filter(t => t.date.startsWith(monthPrefix));
    const monthlyIncome = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);

    // Use higher of budget income vs actual transaction income
    const effectiveIncome = Math.max(monthlyIncome, budgetIncome);

    // Monthly obligations from recurring transactions (bills) 
    const monthlyObligations = (recurring || [])
      .filter((r: any) => r.is_active && r.amount < 0)
      .reduce((s: number, r: any) => {
        const amt = Math.abs(r.amount);
        const freq = r.frequency;
        if (freq === 'weekly') return s + amt * 4.33;
        if (freq === 'biweekly') return s + amt * 2.17;
        if (freq === 'quarterly') return s + amt / 3;
        if (freq === 'yearly') return s + amt / 12;
        return s + amt; // monthly
      }, 0);

    // Monthly subscriptions
    const monthlySubscriptions = (subscriptions || [])
      .filter((sub: any) => {
        if (!sub.is_active || sub.is_cancelled || isNonSubscription(sub)) return false;
        const subGroup = sub.categories?.category_groups;
        const isBiz = subGroup?.budget_type === 'business' || !!subGroup?.business_profile_id;
        if (scope === 'personal' && isBiz) return false;
        if (scope === 'business' && !isBiz) return false;
        return true;
      })
      .reduce((s: number, sub: any) => {
        const amt = Math.abs(sub.average_amount || 0);
        if (sub.frequency === 'yearly' || sub.frequency === 'annual') return s + amt / 12;
        if (sub.frequency === 'quarterly') return s + amt / 3;
        return s + amt;
      }, 0);

    // Already spent this month
    const monthlySpent = monthTxns
      .filter(t => t.amount < 0 && !t.is_transfer)
      .reduce((s, t) => s + Math.abs(t.amount), 0);

    // Use higher of budget expenses vs (obligations + subscriptions)
    const recurringTotal = monthlyObligations + monthlySubscriptions;
    const effectiveExpenses = Math.max(recurringTotal, budgetExpenses);

    // Avoid double-counting: when budget expenses exist, they already represent full-month planned spending.
    // Only subtract already-spent when no budget expense baseline exists.
    const spentAdjustment = budgetExpenses > 0 ? 0 : monthlySpent;

    // Base monthly safe-to-spend: income - expenses - optional spent adjustment
    const baseMonthlySafe = effectiveIncome - effectiveExpenses - spentAdjustment;
    
    // Apply buffer
    const bufferMultiplier = 1 - (bufferPercent / 100);
    const monthlySafe = Math.max(0, baseMonthlySafe * bufferMultiplier);

    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    // Consistent planning rates based on full month
    const dailySafe = monthlySafe / daysInMonth;
    const weeklySafe = monthlySafe / (daysInMonth / 7);

    return {
      daily: Math.round(dailySafe * 100) / 100,
      weekly: Math.round(weeklySafe * 100) / 100,
      monthly: Math.round(monthlySafe * 100) / 100,
      totalAvailableCash,
      monthlyIncome: effectiveIncome,
      monthlyObligations,
      monthlySubscriptions,
      budgetIncome,
      budgetExpenses,
      effectiveExpenses,
      bufferPercent,
      mode,
      isLoading: !accounts,
    };
  }, [accounts, transactions, recurring, subscriptions, modeSettings, budgetsWithGroups, scope]);
}
