import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export type MedicaidClaim = Tables<'medicaid_claims'>;

export function useMedicaidClaims() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const queryKey = ['medicaid_claims', household?.id];

  const query = useQuery({
    queryKey,
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicaid_claims')
        .select('*')
        .eq('household_id', household!.id)
        .order('service_date', { ascending: false });
      if (error) throw error;
      return data as MedicaidClaim[];
    },
  });

  const createClaim = useMutation({
    mutationFn: async (claim: Omit<TablesInsert<'medicaid_claims'>, 'household_id'>) => {
      const { data, error } = await supabase
        .from('medicaid_claims')
        .insert({ ...claim, household_id: household!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const updateClaim = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'medicaid_claims'> & { id: string }) => {
      const { data, error } = await supabase
        .from('medicaid_claims')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  const deleteClaim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('medicaid_claims')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
  });

  return {
    claims: query.data ?? [],
    isLoading: query.isLoading,
    createClaim,
    updateClaim,
    deleteClaim,
  };
}
