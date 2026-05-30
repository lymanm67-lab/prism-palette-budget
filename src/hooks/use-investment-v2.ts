import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

// ---------- Spouse ----------
export function useInvestmentSpouse(planId?: string) {
  return useQuery({
    queryKey: ['inv_spouse', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await sb.from('investment_plan_spouse').select('*').eq('plan_id', planId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
export function useUpsertSpouse() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('investment_plan_spouse').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('investment_plan_spouse').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_spouse'] }),
  });
}

// ---------- Pensions ----------
export function useInvestmentPensions(planId?: string) {
  return useQuery({
    queryKey: ['inv_pensions', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await sb.from('investment_pensions').select('*').eq('plan_id', planId).order('created_at');
      if (error) throw error;
      return data || [];
    },
  });
}
export function useUpsertPension() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('investment_pensions').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('investment_pensions').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_pensions'] }),
  });
}
export function useDeletePension() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('investment_pensions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_pensions'] }),
  });
}

// ---------- Legacy ----------
export function useInvestmentLegacy(planId?: string) {
  return useQuery({
    queryKey: ['inv_legacy', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await sb.from('investment_legacy_goals').select('*').eq('plan_id', planId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
export function useUpsertLegacy() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('investment_legacy_goals').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('investment_legacy_goals').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_legacy'] }),
  });
}

// ---------- Money Rules ----------
export function useMoneyRules() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['inv_money_rules', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb.from('investment_money_rules').select('*').eq('household_id', household!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}
export function useUpsertMoneyRule() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('investment_money_rules').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('investment_money_rules').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_money_rules'] }),
  });
}
export function useDeleteMoneyRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('investment_money_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inv_money_rules'] }),
  });
}
