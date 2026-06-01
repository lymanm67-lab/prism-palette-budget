import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from '@/hooks/use-toast';

export function useRecoveryPlans(month?: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['recovery-plans', household?.id, month],
    enabled: !!household?.id,
    queryFn: async () => {
      let q = supabase
        .from('recovery_plans')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false });
      if (month) q = q.eq('month', month);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });
}

export function useBuildRecoveryPlan() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      category_id?: string;
      category_name: string;
      month: string;
      overage_amount: number;
      budget_amount?: number;
      spent_amount?: number;
      recent_history?: Array<{ month: string; over: boolean }>;
    }) => {
      const { data, error } = await supabase.functions.invoke('recovery-plan-builder', {
        body: { household_id: household!.id, ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recovery-plans'] });
      toast({ title: 'Recovery plans ready', description: 'Pick the play that fits your situation.' });
    },
    onError: (e: any) => {
      toast({ title: 'Could not build plan', description: e.message, variant: 'destructive' });
    },
  });
}

export function useUpdateRecoveryPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'completed' | 'dismissed' }) => {
      const patch: any = { status };
      if (status === 'active') patch.applied_at = new Date().toISOString();
      const { error } = await supabase.from('recovery_plans').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recovery-plans'] }),
  });
}
