import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

/**
 * Fetch all business profiles for the household
 */
export function useBusinessProfiles() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['business_profiles', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('business_profiles')
        .select('*')
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .order('business_name');
      if (error) throw error;
      return data;
    },
  });
}

/**
 * Fetch all business category groups with their categories
 */
export function useBusinessCategoryGroups() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['business_category_groups', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('category_groups')
        .select('*, categories(*)') as any)
        .eq('household_id', household!.id)
        .eq('budget_type', 'business')
        .order('sort_order');
      if (error) throw error;
      return data as any[];
    },
  });
}

/**
 * Fetch business transactions (transactions whose category belongs to a business group)
 */
export function useBusinessTransactions(startDate: string, endDate: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['business_transactions', household?.id, startDate, endDate],
    enabled: !!household && !!startDate && !!endDate,
    queryFn: async () => {
      // First get business category IDs
      const { data: groups, error: gErr } = await (supabase
        .from('category_groups')
        .select('id, business_profile_id') as any)
        .eq('household_id', household!.id)
        .eq('budget_type', 'business');
      if (gErr) throw gErr;

      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map((g: any) => g.id);

      const { data: cats, error: cErr } = await supabase
        .from('categories')
        .select('id, name, color, group_id')
        .eq('household_id', household!.id)
        .in('group_id', groupIds);
      if (cErr) throw cErr;

      if (!cats || cats.length === 0) return [];

      const catIds = cats.map(c => c.id);

      // Build a group -> business_profile_id map
      const groupBizMap: Record<string, string | null> = {};
      for (const g of groups) {
        groupBizMap[g.id] = g.business_profile_id;
      }

      const { data: txns, error: tErr } = await supabase
        .from('transactions')
        .select('*, categories(name, color, group_id), accounts(name)')
        .eq('household_id', household!.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .in('category_id', catIds)
        .order('date', { ascending: false });
      if (tErr) throw tErr;

      // Attach business_profile_id to each transaction for filtering
      return (txns || []).map(t => ({
        ...t,
        _business_profile_id: t.category_id && (t.categories as any)?.group_id
          ? groupBizMap[(t.categories as any).group_id] || null
          : null,
      }));
    },
  });
}

/**
 * Fetch business budgets
 */
export function useBusinessBudgets(month: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['business_budgets', household?.id, month],
    enabled: !!household,
    queryFn: async () => {
      const { data: groups, error: gErr } = await (supabase
        .from('category_groups')
        .select('id, business_profile_id') as any)
        .eq('household_id', household!.id)
        .eq('budget_type', 'business');
      if (gErr) throw gErr;

      if (!groups || groups.length === 0) return [];

      const groupIds = groups.map((g: any) => g.id);
      const groupBizMap: Record<string, string | null> = {};
      for (const g of groups) {
        groupBizMap[g.id] = g.business_profile_id;
      }

      const { data: cats, error: cErr } = await supabase
        .from('categories')
        .select('id')
        .eq('household_id', household!.id)
        .in('group_id', groupIds);
      if (cErr) throw cErr;

      if (!cats || cats.length === 0) return [];

      const catIds = cats.map(c => c.id);

      const { data: budgets, error: bErr } = await supabase
        .from('budgets')
        .select('*, categories(name, color, group_id)')
        .eq('household_id', household!.id)
        .eq('month', month)
        .in('category_id', catIds);
      if (bErr) throw bErr;

      return (budgets || []).map(b => ({
        ...b,
        _business_profile_id: (b.categories as any)?.group_id
          ? groupBizMap[(b.categories as any).group_id] || null
          : null,
      }));
    },
  });
}
