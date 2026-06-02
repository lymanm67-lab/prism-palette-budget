import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from '@/hooks/use-toast';

export interface DeploymentRules {
  id?: string;
  household_id: string;
  fixed_min: number; fixed_max: number; fixed_target: number;
  invest_min: number; invest_max: number; invest_target: number;
  savings_min: number; savings_max: number; savings_target: number;
  guiltfree_min: number; guiltfree_max: number; guiltfree_target: number;
  nag_enabled: boolean;
  nag_hours: number;
  savings_account_id?: string | null;
  investment_account_id?: string | null;
}

export const DEFAULT_RULES: Omit<DeploymentRules, 'household_id'> = {
  fixed_min: 50, fixed_max: 60, fixed_target: 60,
  invest_min: 5, invest_max: 10, invest_target: 10,
  savings_min: 5, savings_max: 10, savings_target: 10,
  guiltfree_min: 20, guiltfree_max: 35, guiltfree_target: 20,
  nag_enabled: true,
  nag_hours: 24,
  savings_account_id: null,
  investment_account_id: null,
};

export function useDeploymentRules() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['paycheck_deployment_rules', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<DeploymentRules> => {
      const { data, error } = await supabase
        .from('paycheck_deployment_rules')
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as DeploymentRules;
      // Auto-seed defaults
      const seed = { ...DEFAULT_RULES, household_id: household!.id };
      const { data: inserted, error: insErr } = await supabase
        .from('paycheck_deployment_rules')
        .insert(seed)
        .select()
        .single();
      if (insErr) {
        // Fall back to in-memory defaults if insert blocked
        return seed as DeploymentRules;
      }
      return inserted as DeploymentRules;
    },
  });
}

export function useUpdateDeploymentRules() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<DeploymentRules>) => {
      if (!household) throw new Error('No household');
      const { data, error } = await supabase
        .from('paycheck_deployment_rules')
        .update(patch)
        .eq('household_id', household.id)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['paycheck_deployment_rules'] });
      qc.invalidateQueries({ queryKey: ['safe-to-spend'] });
      toast({ title: 'Deployment rules saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e?.message, variant: 'destructive' }),
  });
}

export type ZoneStatus = 'under' | 'in_range' | 'over';

export function zoneFor(pct: number, min: number, max: number): ZoneStatus {
  if (pct < min) return 'under';
  if (pct > max) return 'over';
  return 'in_range';
}

export function zoneColor(z: ZoneStatus) {
  if (z === 'in_range') return 'text-prism-teal';
  if (z === 'under') return 'text-prism-sky';
  return 'text-prism-rose';
}

export function zoneBarColor(z: ZoneStatus) {
  if (z === 'in_range') return 'bg-prism-teal';
  if (z === 'under') return 'bg-prism-sky';
  return 'bg-prism-rose';
}

export function zoneLabel(z: ZoneStatus) {
  if (z === 'in_range') return 'In Range';
  if (z === 'under') return 'Under';
  return 'Over';
}
