import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format, addDays } from 'date-fns';
import { useBudgetActual } from './use-budget-actual';
import { overBudgetExpenseLines } from '@/lib/budgeting/budgetActual';

export interface SidebarBadges {
  recurring: number;   // bills due within 3 days
  transactions: number; // needs_review count
  budgets: number;     // categories over budget this month
}

export function useSidebarBadges(): SidebarBadges {
  const { household } = useHousehold();

  const today = new Date();
  const soon = addDays(today, 3);
  const todayStr = format(today, 'yyyy-MM-dd');
  const soonStr = format(soon, 'yyyy-MM-dd');
  const monthStart = format(today, 'yyyy-MM-01');

  // Bills due within 3 days
  const { data: recurringCount } = useQuery({
    queryKey: ['sidebar_badge_recurring', household?.id, todayStr],
    enabled: !!household,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('recurring_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .gte('next_due_date', todayStr)
        .lte('next_due_date', soonStr);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Unreviewed transactions
  const { data: reviewCount } = useQuery({
    queryKey: ['sidebar_badge_review', household?.id],
    enabled: !!household,
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('household_id', household!.id)
        .eq('needs_review', true)
        .is('deleted_at', null);
      if (error) throw error;
      return count ?? 0;
    },
  });

  // Use the same combined, split-aware expense list as Over budget at a glance.
  const { data: budgetActual } = useBudgetActual(monthStart.slice(0, 7), 'combined');
  const budgetOverages = budgetActual
    ? overBudgetExpenseLines([...budgetActual.pillars.flatMap(p => p.lines), ...budgetActual.uncategorized]).length
    : 0;

  return {
    recurring: recurringCount ?? 0,
    transactions: reviewCount ?? 0,
    budgets: budgetOverages ?? 0,
  };
}
