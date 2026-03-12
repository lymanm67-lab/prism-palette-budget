import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export interface CreditDispute {
  id: string;
  household_id: string;
  credit_account_id: string | null;
  bureau: string;
  dispute_reason: string;
  metro2_violation: string | null;
  explanation: string | null;
  status: string;
  submitted_date: string | null;
  response_due_date: string | null;
  response_received_date: string | null;
  outcome: string | null;
  outcome_notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DisputeInsert = {
  household_id: string;
  credit_account_id?: string | null;
  bureau: string;
  dispute_reason: string;
  metro2_violation?: string | null;
  explanation?: string | null;
  status?: string;
  submitted_date?: string | null;
  response_due_date?: string | null;
};

export function useDisputes() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const householdId = household?.id;

  const query = useQuery({
    queryKey: ['credit-disputes', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await (supabase as any)
        .from('credit_disputes')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as CreditDispute[];
    },
    enabled: !!householdId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['credit-disputes'] });

  const createDispute = useMutation({
    mutationFn: async (d: DisputeInsert) => {
      const { error } = await (supabase as any).from('credit_disputes').insert(d);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Dispute created'); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateDispute = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreditDispute> & { id: string }) => {
      const { error } = await (supabase as any).from('credit_disputes').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Dispute updated'); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteDispute = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('credit_disputes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { invalidate(); toast.success('Dispute deleted'); },
    onError: (e: any) => toast.error(e.message),
  });

  const disputes = query.data || [];
  const active = disputes.filter(d => d.status === 'submitted' || d.status === 'in_progress');
  const pending = disputes.filter(d => d.status === 'draft');
  const resolved = disputes.filter(d => d.status === 'resolved' || d.status === 'denied');

  return {
    ...query,
    disputes,
    active,
    pending,
    resolved,
    createDispute: createDispute.mutate,
    createDisputeAsync: createDispute.mutateAsync,
    updateDispute: updateDispute.mutate,
    deleteDispute: deleteDispute.mutate,
    isCreating: createDispute.isPending,
  };
}
