import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

/** Every debt item across all of the household's debt plans. */
export function useHouseholdDebts() {
  const { household } = useHousehold();

  return useQuery({
    queryKey: ['household_debt_items', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data: plans, error: pErr } = await sb
        .from('debt_plans')
        .select('id')
        .eq('household_id', household!.id);
      if (pErr) throw pErr;
      const ids = (plans || []).map((p: any) => p.id);
      if (!ids.length) return [] as any[];

      const { data, error } = await sb
        .from('debt_items')
        .select('*')
        .in('plan_id', ids)
        .order('balance');
      if (error) throw error;
      return (data || []) as any[];
    },
  });
}
