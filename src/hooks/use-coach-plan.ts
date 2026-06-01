import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';

export type CoachPlanStatus = 'in_progress' | 'completed';

export interface CoachPlanGenerated {
  summary: string;
  top_priorities: string[];
  thirty_day: string[];
  sixty_day: string[];
  ninety_day: string[];
  per_card: Record<string, { headline: string; recommendation: string }>;
}

export interface CoachPlan {
  id: string;
  household_id: string;
  user_id: string;
  status: CoachPlanStatus;
  current_step: number;
  answers: Record<string, any>;
  generated_plan: CoachPlanGenerated | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useLatestCoachPlan() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['coach-plan-latest', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<CoachPlan | null> => {
      const { data, error } = await supabase
        .from('coach_plans')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as CoachPlan) ?? null;
    },
  });
}

export function useCoachPlan(id: string | null | undefined) {
  return useQuery({
    queryKey: ['coach-plan', id],
    enabled: !!id,
    queryFn: async (): Promise<CoachPlan | null> => {
      const { data, error } = await supabase
        .from('coach_plans')
        .select('*')
        .eq('id', id!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as CoachPlan) ?? null;
    },
  });
}

export function useStartCoachPlan() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<CoachPlan> => {
      if (!household || !user) throw new Error('No household/user');
      const { data, error } = await supabase
        .from('coach_plans')
        .insert({
          household_id: household.id,
          user_id: user.id,
          status: 'in_progress',
          current_step: 1,
          answers: {},
        })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as CoachPlan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-plan-latest'] });
    },
  });
}

export function useSaveCoachPlanStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id, step, answer, nextStep,
    }: { id: string; step: number; answer: any; nextStep: number }) => {
      // read existing answers, merge
      const { data: existing, error: readErr } = await supabase
        .from('coach_plans')
        .select('answers')
        .eq('id', id)
        .single();
      if (readErr) throw readErr;
      const merged = { ...(existing?.answers as object || {}), [String(step)]: answer };
      const { error } = await supabase
        .from('coach_plans')
        .update({ answers: merged, current_step: nextStep })
        .eq('id', id);
      if (error) throw error;
      return { merged, nextStep };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['coach-plan', vars.id] });
      qc.invalidateQueries({ queryKey: ['coach-plan-latest'] });
    },
  });
}

export function useGenerateCoachPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const { data, error } = await supabase.functions.invoke('generate-coach-plan', {
        body: { plan_id: planId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { plan: CoachPlanGenerated };
    },
    onSuccess: (_d, planId) => {
      qc.invalidateQueries({ queryKey: ['coach-plan', planId] });
      qc.invalidateQueries({ queryKey: ['coach-plan-latest'] });
    },
  });
}

export function useRestartCoachPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('coach_plans')
        .update({
          status: 'in_progress',
          current_step: 1,
          answers: {},
          generated_plan: null,
          generated_at: null,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coach-plan-latest'] });
    },
  });
}
