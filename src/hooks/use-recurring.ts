import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export function useRecurringTransactions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['recurring_transactions', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_transactions' as any)
        .select('*, categories(name, color), accounts(name)')
        .eq('household_id', household!.id)
        .order('next_due_date');
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useCreateRecurring() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (rec: any) => {
      const { data, error } = await supabase
        .from('recurring_transactions' as any)
        .insert({ ...rec, household_id: household!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  });
}

export function useDeleteRecurring() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurring_transactions' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring_transactions'] }),
  });
}
