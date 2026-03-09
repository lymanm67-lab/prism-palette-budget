import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { format, addDays } from 'date-fns';

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
  const monthEnd = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), 'yyyy-MM-dd');

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

  // Budget overages this month
  const { data: budgetOverages } = useQuery({
    queryKey: ['sidebar_badge_budgets', household?.id, monthStart],
    enabled: !!household,
    refetchInterval: 120_000,
    queryFn: async () => {
      // Get budgets for current month
      const { data: budgets, error: bErr } = await supabase
        .from('budgets')
        .select('category_id, planned_amount')
        .eq('household_id', household!.id)
        .eq('month', monthStart);
      if (bErr) throw bErr;
      if (!budgets?.length) return 0;

      // Get spending for current month
      const { data: txns, error: tErr } = await supabase
        .from('transactions')
        .select('amount, category_id')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .gte('date', monthStart)
        .lte('date', monthEnd)
        .lt('amount', 0);
      if (tErr) throw tErr;

      // Sum spending per category
      const spent = new Map<string, number>();
      for (const t of txns || []) {
        if (t.category_id) {
          spent.set(t.category_id, (spent.get(t.category_id) || 0) + Math.abs(t.amount));
        }
      }

      // Count overages
      let overages = 0;
      for (const b of budgets) {
        const s = spent.get(b.category_id) || 0;
        if (b.planned_amount > 0 && s > b.planned_amount) overages++;
      }
      return overages;
    },
  });

  return {
    recurring: recurringCount ?? 0,
    transactions: reviewCount ?? 0,
    budgets: budgetOverages ?? 0,
  };
}
