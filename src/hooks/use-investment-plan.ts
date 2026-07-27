import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export type InvestmentPlan = {
  id: string;
  household_id: string;
  name: string;
  is_active: boolean;
  current_age: number | null;
  retirement_age: number | null;
  current_balance: number;
  target_amount: number;
  monthly_employee_contribution: number;
  monthly_employer_contribution: number;
  employer_match_pct: number | null;
  expected_return_pct: number;
  annual_raise_pct: number;
  raise_redirect_pct: number;
  current_monthly_income: number | null;
  debt_payment_amount: number | null;
  debt_payoff_date: string | null;
  additional_monthly_amount: number | null;
  additional_start_date: string | null;
  ss_monthly_estimate: number | null;
  ss_claiming_age: number | null;
  ss_invest_while_working: boolean;
  ss_invest_pct: number;
  hsa_balance: number;
  hsa_monthly_contribution: number;
  hsa_employer_contribution: number;
  hsa_invested: boolean;
  hsa_return_pct: number;
  use_future_dollars: boolean;
  inflation_pct: number;
  legacy_calculation_method: 'total' | 'surplus' | 'percent';
  legacy_percentage: number;
  legacy_goal_name: string;
  spouse_pension_monthly: number;
  spouse_pension_account_value: number;
  spouse_deferred_comp_value: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export function useInvestmentPlan() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['investment_plan', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_plans')
        .select('*')
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as InvestmentPlan | null;
    },
  });
}

export function useUpsertInvestmentPlan() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (updates: Partial<InvestmentPlan> & { id?: string }) => {
      if (updates.id) {
        const { data, error } = await supabase
          .from('investment_plans')
          .update(updates as any)
          .eq('id', updates.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('investment_plans')
        .insert({ ...updates, household_id: household!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investment_plan'] }),
  });
}

export function useInvestmentScenarios() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['investment_scenarios', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_scenarios')
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useSaveScenario() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (s: { name: string; scenario_type: string; return_pct: number; inputs: any; results: any; plan_id?: string }) => {
      const { data, error } = await supabase
        .from('investment_scenarios')
        .insert({ ...s, household_id: household!.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investment_scenarios'] }),
  });
}

export function useInvestmentMilestones() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['investment_milestones', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_milestones')
        .select('*')
        .eq('household_id', household!.id)
        .order('age', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useToggleMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_completed }: { id: string; is_completed: boolean }) => {
      const { error } = await supabase
        .from('investment_milestones')
        .update({ is_completed, completed_at: is_completed ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investment_milestones'] }),
  });
}

export function useSeedMilestones() {
  const qc = useQueryClient();
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async () => {
      const defaults = [
        { age: 60, title: 'Age 60 review', description: 'Review savings rate and debt payoff strategy.' },
        { age: 62, title: 'Age 62 review', description: 'Review pension or early-retirement options.' },
        { age: 65, title: 'Age 65 review', description: 'Review Medicare, HSA, beneficiaries, and risk exposure.' },
        { age: 67, title: 'Age 67 review', description: 'Review full retirement-age income options.' },
        { age: 70, title: 'Age 70 review', description: 'Social Security claiming and investment strategy.' },
        { age: 75, title: 'Age 75 review', description: 'Review withdrawal strategy, taxes, and risk.' },
        { age: 80, title: 'Age 80 review', description: 'Shift from accumulation to preservation and legacy.' },
        { age: 75, title: 'Age 75 review', description: 'Review estate transfer and trust funding plan.' },
      ];
      const rows = defaults.map((d, i) => ({ ...d, sort_order: i, household_id: household!.id }));
      const { error } = await supabase.from('investment_milestones').insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investment_milestones'] }),
  });
}
