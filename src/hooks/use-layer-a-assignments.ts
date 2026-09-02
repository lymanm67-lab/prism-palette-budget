import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

export interface LayerAAssignment {
  /** Manual override for the month's sinking fund contribution. */
  sinking_funds: number | null;
  /** Cash deliberately parked in Buffer this month. */
  buffer_assignment: number | null;
  /** Manual override for one-time expenses assigned this month. */
  one_time_expenses: number | null;
  /** Manual override for business money that left the personal account. */
  business_outflow: number | null;
  /** Manual override for business revenue/reimbursement that landed in it. */
  business_inflow: number | null;
  /** When on, the app fills the balancing figures itself every month. */
  auto_balance: boolean;
  notes: string | null;
}

export type LayerAField = keyof Omit<LayerAAssignment, 'notes'>;

/**
 * Per-month, hand-entered Layer A cash assignments. Nothing is invented —
 * a null field means "not set" and the derived figure is used instead.
 */
export function useLayerAAssignments(month: string) {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['layer_a_assignments', household?.id, month],
    enabled: !!household && !!month,
    queryFn: async () => {
      const { data, error } = await sb
        .from('layer_a_assignments')
        .select('*')
        .eq('household_id', household!.id)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as (LayerAAssignment & { id: string }) | null;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<LayerAAssignment>) => {
      const { data, error } = await sb
        .from('layer_a_assignments')
        .upsert({ household_id: household!.id, month, ...patch }, { onConflict: 'household_id,month' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['layer_a_assignments'] }),
  });

  const row = query.data;
  const num = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v));

  return {
    assignment: {
      sinking_funds: num(row?.sinking_funds),
      buffer_assignment: num(row?.buffer_assignment),
      one_time_expenses: num(row?.one_time_expenses),
      business_outflow: num(row?.business_outflow),
      business_inflow: num(row?.business_inflow),
      notes: row?.notes ?? null,
    } as LayerAAssignment,
    isLoading: query.isLoading,
    save,
  };
}
