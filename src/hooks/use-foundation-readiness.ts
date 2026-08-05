import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { useFdnSettings } from '@/hooks/use-foundation';

const sb = supabase as any;

export interface ReadinessState {
  checked?: Record<string, boolean>;
  milestones?: Record<string, boolean>;
  sustainability?: Record<string, number>;
  costs?: Record<string, number>;
  funding?: Record<string, any>;
}

/** Reads and patches the `readiness_state` jsonb blob on fdn_settings. */
export function useFdnReadinessState() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const settings = useFdnSettings();
  const state: ReadinessState = (settings.data?.readiness_state ?? {}) as ReadinessState;

  const mutation = useMutation({
    mutationFn: async (next: ReadinessState) => {
      const { error } = await sb
        .from('fdn_settings')
        .update({ readiness_state: next })
        .eq('household_id', household!.id);
      if (error) throw error;
      return next;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fdn_settings', household?.id] });
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save readiness data'),
  });

  const patch = useCallback(
    (part: ReadinessState) => {
      const next: ReadinessState = { ...state };
      for (const [k, v] of Object.entries(part)) {
        (next as any)[k] = { ...((state as any)[k] ?? {}), ...(v as any) };
      }
      mutation.mutate(next);
    },
    [state, mutation],
  );

  return {
    state,
    isLoading: settings.isLoading,
    isSaving: mutation.isPending,
    patch,
  };
}
