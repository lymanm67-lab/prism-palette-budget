import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  type AllocationEvent,
  type AllocationSettings,
  montgomerySeedEvents,
  runAllocationEngine,
} from '@/lib/retirement/allocationEngine';

const DEFAULT_SETTINGS: AllocationSettings = {
  hsa_eligible: true,
  hsa_coverage: 'family',
  hsa_max_target: 8550,
  roth_pct_default: 60,
  employer_contribution_rate: 9,
  annual_raise_pct: 3,
  inflation_mode: 'future',
  current_monthly_salary: 5739.5,
  current_ee_contribution: 451.66,
  current_er_contribution: 516.56,
  ss_age70_estimate: 3540,
};

export function useRetirementAllocation() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['retirement-allocation-settings', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retirement_allocation_settings')
        .select('*')
        .eq('household_id', householdId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        // Upsert defaults so user can immediately edit
        const ins = await supabase
          .from('retirement_allocation_settings')
          .insert({ household_id: householdId!, ...DEFAULT_SETTINGS })
          .select()
          .single();
        if (ins.error) throw ins.error;
        return ins.data as any;
      }
      return data as any;
    },
  });

  const eventsQuery = useQuery({
    queryKey: ['retirement-allocation-events', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retirement_allocation_events')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('event_date', { ascending: true });
      if (error) throw error;
      if (!data || data.length === 0) {
        // seed Montgomery events
        const seeds = montgomerySeedEvents().map((e) => ({ ...e, household_id: householdId! }));
        const ins = await supabase
          .from('retirement_allocation_events')
          .insert(seeds as any)
          .select();
        if (ins.error) throw ins.error;
        return (ins.data ?? []) as any[];
      }
      return data as any[];
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (patch: Partial<AllocationSettings>) => {
      const { error } = await supabase
        .from('retirement_allocation_settings')
        .update(patch as any)
        .eq('household_id', householdId!);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retirement-allocation-settings', householdId] }),
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<AllocationEvent> }) => {
      const { error } = await supabase
        .from('retirement_allocation_events')
        .update(patch as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retirement-allocation-events', householdId] }),
  });

  const resetToDefaults = useMutation({
    mutationFn: async () => {
      // soft-delete all then re-seed
      await supabase
        .from('retirement_allocation_events')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('household_id', householdId!)
        .is('deleted_at', null);
      const seeds = montgomerySeedEvents().map((e) => ({ ...e, household_id: householdId! }));
      const ins = await supabase.from('retirement_allocation_events').insert(seeds as any);
      if (ins.error) throw ins.error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['retirement-allocation-events', householdId] }),
  });

  const settings: AllocationSettings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const events: AllocationEvent[] = (eventsQuery.data ?? []) as any;

  const engine = useMemo(() => runAllocationEngine(settings, events), [settings, events]);

  return {
    isLoading: settingsQuery.isLoading || eventsQuery.isLoading,
    settings,
    events,
    engine,
    updateSettings: updateSettings.mutate,
    updateEvent: updateEvent.mutate,
    resetToDefaults: resetToDefaults.mutate,
  };
}
