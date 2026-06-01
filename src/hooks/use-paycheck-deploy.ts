import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from '@/hooks/use-toast';

export interface PaycheckDeployment {
  id?: string;
  household_id?: string;
  pay_date: string;
  net_amount: number;
  frequency: string;
  bills_amount: number;
  min_debt_amount: number;
  extra_debt_amount: number;
  savings_amount: number;
  investment_amount: number;
  buffer_amount: number;
  safe_to_spend_amount: number;
  bills_breakdown: Array<{ id: string; merchant: string; amount: number; due_date: string }>;
  rationale: string | null;
  confidence: 'high' | 'medium' | 'low';
  status: 'suggested' | 'active' | 'applied' | 'skipped';
  source: 'ai' | 'manual';
  applied_at?: string | null;
  created_at?: string;
}

export function usePaycheckDeployments(limit = 6) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['paycheck_deployments', household?.id, limit],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('paycheck_deployments')
        .select('*')
        .eq('household_id', household!.id)
        .order('pay_date', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as PaycheckDeployment[];
    },
  });
}

export function useBuildPaycheckDeployment() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (opts: { pay_date?: string; net_amount?: number; frequency?: string; persist?: boolean }) => {
      if (!household) throw new Error('No household');
      const { data, error } = await supabase.functions.invoke('paycheck-deploy', {
        body: { household_id: household.id, ...opts },
      });
      if (error) throw error;
      return data?.deployment as PaycheckDeployment;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paycheck_deployments'] });
      toast({ title: 'Paycheck plan ready', description: 'Coach has deployed your next paycheck.' });
    },
    onError: (e: any) => toast({ title: 'Plan failed', description: e?.message || 'Try again', variant: 'destructive' }),
  });
}

export function useUpdatePaycheckDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (vars: { id: string; status?: PaycheckDeployment['status'] }) => {
      const patch: any = {};
      if (vars.status) {
        patch.status = vars.status;
        if (vars.status === 'applied') patch.applied_at = new Date().toISOString();
      }
      const { data, error } = await supabase
        .from('paycheck_deployments')
        .update(patch)
        .eq('id', vars.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['paycheck_deployments'] }),
  });
}
