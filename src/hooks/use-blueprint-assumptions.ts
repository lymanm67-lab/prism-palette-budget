import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { defaultAssumptions, type AssumptionState } from '@/lib/blueprint/model';

const sb = supabase as any;

export interface AssumptionRecord {
  id: string | null;
  state: AssumptionState;
}

export function useBlueprintAssumptions() {
  const { household } = useHousehold();
  return useQuery<AssumptionRecord>({
    queryKey: ['blueprint_assumptions', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('blueprint_assumptions')
        .select('id, state')
        .eq('household_id', household!.id)
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row) return { id: null, state: defaultAssumptions() };
      // Merge so newly added assumption fields always have a value.
      return { id: row.id, state: defaultAssumptions(row.state || {}) };
    },
  });
}

export function useSaveBlueprintAssumptions() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state }: { id: string | null; state: AssumptionState }) => {
      const payload = { household_id: household!.id, state };
      if (id) {
        const { error } = await sb.from('blueprint_assumptions').update(payload).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await sb
        .from('blueprint_assumptions')
        .upsert(payload, { onConflict: 'household_id' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blueprint_assumptions'] }),
  });
}
