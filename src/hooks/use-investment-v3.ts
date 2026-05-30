import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

export function useDigitalAssets() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['digital_assets', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await sb.from('digital_assets').select('*').eq('household_id', household!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useUpsertDigitalAsset() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('digital_assets').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('digital_assets').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['digital_assets'] }),
  });
}

export function useDeleteDigitalAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('digital_assets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['digital_assets'] }),
  });
}

export function useRuleExecutions(planId?: string) {
  return useQuery({
    queryKey: ['rule_executions', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await sb.from('investment_rule_executions').select('*').order('executed_at', { ascending: false }).limit(50);
      if (error) throw error;
      return data || [];
    },
  });
}
