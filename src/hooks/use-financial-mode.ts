import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export type FinancialMode = 'guardrail' | 'balanced' | 'greenlight';

export const MODE_CONFIG = {
  guardrail: { label: 'Guardrail', bufferDefault: 20, description: 'Conservative protection to build strong habits', color: 'prism-orange' },
  balanced: { label: 'Balanced', bufferDefault: 10, description: 'Moderate flexibility with reasonable safeguards', color: 'prism-teal' },
  greenlight: { label: 'Green Light', bufferDefault: 5, description: 'Maximum flexibility — you\'ve earned it', color: 'prism-lime' },
} as const;

export interface ModeSettings {
  id: string;
  household_id: string;
  current_mode: FinancialMode;
  buffer_percent: number;
  greenlight_unlocked: boolean;
  created_at: string;
  updated_at: string;
}

export function useModeSettings() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['financial-mode', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_mode_settings' as any)
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as any as ModeSettings) ?? null;
    },
  });
}

export function useUpsertModeSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: { current_mode?: FinancialMode; buffer_percent?: number; greenlight_unlocked?: boolean }) => {
      const { data: existing } = await supabase
        .from('financial_mode_settings' as any)
        .select('id')
        .eq('household_id', household!.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('financial_mode_settings' as any)
          .update(settings)
          .eq('id', (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('financial_mode_settings' as any)
          .insert({ household_id: household!.id, ...settings })
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['financial-mode'] }),
  });
}
