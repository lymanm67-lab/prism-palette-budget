import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

// ─── Plan hooks ───
export function useDebtPlans() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['debt_plans', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_plans')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDebtPlan(planId: string | null) {
  return useQuery({
    queryKey: ['debt_plan', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_plans')
        .select('*')
        .eq('id', planId!)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDebtPlan() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (plan: { name?: string; strategy?: string; extra_payment?: number }) => {
      const { data, error } = await supabase
        .from('debt_plans')
        .insert({ ...plan, household_id: household!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debt_plans'] }),
  });
}

export function useUpdateDebtPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; strategy?: string; extra_payment?: number }) => {
      const { data, error } = await supabase
        .from('debt_plans')
        .update(updates as any)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['debt_plans'] });
      qc.invalidateQueries({ queryKey: ['debt_plan', data.id] });
    },
  });
}

export function useDeleteDebtPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('debt_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debt_plans'] }),
  });
}

// ─── Debt item hooks ───
export function useDebtItems(planId: string | null) {
  return useQuery({
    queryKey: ['debt_items', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('debt_items')
        .select('*')
        .eq('plan_id', planId!)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateDebtItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: { plan_id: string; name: string; balance: number; interest_rate: number; minimum_payment: number; account_id?: string | null; sort_order?: number; business_split_pct?: number; business_name?: string | null; deferred_until?: string | null; forgiveness_eligible?: boolean; forgiveness_date?: string | null; forgiveness_note?: string | null; due_day?: number | null; due_date?: string | null; target_payoff_date?: string | null; in_settlement_plan?: boolean }) => {
      const { data, error } = await supabase
        .from('debt_items')
        .insert(item as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['debt_items', data.plan_id] }),
  });
}

export function useUpdateDebtItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plan_id, ...updates }: { id: string; plan_id: string; name?: string; balance?: number; interest_rate?: number; minimum_payment?: number; business_split_pct?: number; business_name?: string | null; deferred_until?: string | null; forgiveness_eligible?: boolean; forgiveness_date?: string | null; forgiveness_note?: string | null; due_day?: number | null; due_date?: string | null; in_settlement_plan?: boolean }) => {
      const { data, error } = await supabase
        .from('debt_items')
        .update(updates as any)
        .eq('id', id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error('Debt item not found or access denied');
      return { ...data, plan_id };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['debt_items', data.plan_id] }),
  });
}


export function useDeleteDebtItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, plan_id }: { id: string; plan_id: string }) => {
      const { error } = await supabase.from('debt_items').delete().eq('id', id);
      if (error) throw error;
      return { plan_id };
    },
    onSuccess: (data) => qc.invalidateQueries({ queryKey: ['debt_items', data.plan_id] }),
  });
}
