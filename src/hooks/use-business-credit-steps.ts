import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export interface BusinessCreditStep {
  id: string;
  household_id: string;
  step_key: string;
  step_label: string;
  is_completed: boolean;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export function useBusinessCreditSteps() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const householdId = household?.id;

  const query = useQuery({
    queryKey: ['business-credit-steps', householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await (supabase as any)
        .from('business_credit_steps')
        .select('*')
        .eq('household_id', householdId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as BusinessCreditStep[];
    },
    enabled: !!householdId,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['business-credit-steps'] });

  const upsertStep = useMutation({
    mutationFn: async (step: { step_key: string; step_label: string; is_completed: boolean; notes?: string | null }) => {
      if (!householdId) throw new Error('No household');
      const existing = (query.data || []).find(s => s.step_key === step.step_key);
      if (existing) {
        const { error } = await (supabase as any)
          .from('business_credit_steps')
          .update({
            is_completed: step.is_completed,
            completed_at: step.is_completed ? new Date().toISOString() : null,
            notes: step.notes ?? existing.notes,
          })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('business_credit_steps')
          .insert({
            household_id: householdId,
            step_key: step.step_key,
            step_label: step.step_label,
            is_completed: step.is_completed,
            completed_at: step.is_completed ? new Date().toISOString() : null,
            notes: step.notes || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.message),
  });

  const updateNotes = useMutation({
    mutationFn: async ({ step_key, notes, step_label }: { step_key: string; notes: string; step_label: string }) => {
      if (!householdId) throw new Error('No household');
      const existing = (query.data || []).find(s => s.step_key === step_key);
      if (existing) {
        const { error } = await (supabase as any)
          .from('business_credit_steps')
          .update({ notes })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from('business_credit_steps')
          .insert({ household_id: householdId, step_key, step_label, notes, is_completed: false });
        if (error) throw error;
      }
    },
    onSuccess: () => { invalidate(); toast.success('Notes saved'); },
    onError: (e: any) => toast.error(e.message),
  });

  const steps = query.data || [];
  const getStep = (key: string) => steps.find(s => s.step_key === key);

  return { ...query, steps, getStep, upsertStep: upsertStep.mutate, updateNotes: updateNotes.mutate };
}
