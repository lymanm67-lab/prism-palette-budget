import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

export interface HouseholdProfile {
  id: string;
  lyman_dob: string | null;
  kateri_dob: string | null;
  lyman_gross_monthly: number | null;
  lyman_net_monthly: number | null;
  kateri_gross_monthly: number | null;
  kateri_net_monthly: number | null;
  household_net_monthly: number | null;
  net_pay_effective_from: string | null;
  investments_total_override: number | null;
  debt_balance_override: number | null;
  debt_minimums_override: number | null;
  budget_expenses_override: number | null;
  updated_at: string;
}

export function ageFromDob(dob: string | null, on = new Date()): number | null {
  if (!dob) return null;
  const [y, m, d] = dob.split('-').map(Number);
  let age = on.getFullYear() - y;
  if (on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d)) age--;
  return age;
}

export function useHouseholdProfile() {
  const { household } = useHousehold();
  return useQuery<HouseholdProfile | null>({
    queryKey: ['household_profile', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb.from('household_profile').select('*')
        .eq('household_id', household!.id).is('deleted_at', null).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSaveHouseholdProfile() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<HouseholdProfile>) => {
      const { error } = await sb.from('household_profile')
        .upsert({ ...patch, household_id: household!.id }, { onConflict: 'household_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['household_profile'] });
      qc.invalidateQueries({ queryKey: ['blueprint_assumptions'] });
    },
  });
}
