import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TrustContributionRow {
  id: string;
  household_id: string;
  plan_id: string;
  contribution_date: string;
  amount: number;
  source_asset_key: string | null;
  source_label: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export function useTrustContributions(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['legacy_trust_contributions', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('legacy_trust_contributions' as any)
        .select('*')
        .eq('plan_id', planId!)
        .order('contribution_date', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrustContributionRow[];
    },
  });
}

export function useAddTrustContribution() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: {
      plan_id: string;
      household_id: string;
      contribution_date: string;
      amount: number;
      source_asset_key?: string | null;
      source_label?: string | null;
      note?: string | null;
    }) => {
      const { error } = await supabase
        .from('legacy_trust_contributions' as any)
        .insert(row as any);
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['legacy_trust_contributions', vars.plan_id] }),
  });
}

export function useDeleteTrustContribution(planId: string | null | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('legacy_trust_contributions' as any)
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ['legacy_trust_contributions', planId] }),
  });
}
