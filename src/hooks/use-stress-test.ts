import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useInvestmentPlan } from '@/hooks/use-investment-plan';
import { useInvestmentPensions, useInvestmentSpouse } from '@/hooks/use-investment-v2';
import { useReserves } from '@/hooks/use-reserves';
import {
  DEFAULT_GOALS,
  LTC_COST_PRESETS,
  type StressAssumptions,
  type StressGoals,
  type StressResult,
  type SensitivityPoint,
  type RiskRow,
  type ActionRow,
} from '@/lib/retirement/stressTest';

const sb = supabase as any;

export interface StressRunOutput {
  base: StressResult;
  sequence: SensitivityPoint[];
  crises: (SensitivityPoint & { key: string; description: string })[];
  inflation: SensitivityPoint[];
  ltc: SensitivityPoint[];
  retirementAge: SensitivityPoint[];
  contributions: SensitivityPoint[];
  spending: SensitivityPoint[];
  risks: RiskRow[];
  recommendations: { base: number; actions: ActionRow[]; alreadyStrong: boolean };
}

export const FALLBACK_ASSUMPTIONS: StressAssumptions = {
  currentAge: 58,
  retirementAge: 70,
  lifeExpectancy: 95,
  portfolioBalance: 184_113.61,
  hsaBalance: 0,
  employeeContribution: 5_420,
  employerContribution: 6_199,
  hsaContribution: 0,
  hsaEmployerContribution: 0,
  contributionGrowthPct: 3,
  includeSpouse: true,
  spouseCurrentAge: 56,
  spouseRetirementAge: 62,
  spouseBalance: 0,
  spouseContribution: 0,
  spouseSocialSecurityAnnual: 0,
  spouseSocialSecurityStartAge: 67,
  debtRedirectAnnual: 0,
  debtRedirectStartAge: null,
  taxRefundRedirectAnnual: 0,
  postRetirementIncomeAnnual: 0,
  postRetirementIncomeEndAge: null,
  withdrawalStartAge: null,
  expectedReturnPct: 8,
  volatilityPct: 15,
  inflationPct: 3,
  housingInflationPct: 3.5,
  healthcareInflationPct: 5.5,
  ltcInflationPct: 4.5,
  travelInflationPct: 3,
  essentialSpend: 42_000,
  discretionarySpend: 12_000,
  healthcareSpend: 9_000,
  travelSpend: 6_000,
  withdrawalGrowthPct: 0,
  socialSecurityAnnual: 42_480,
  socialSecurityStartAge: 70,
  socialSecurityColaPct: 2.5,
  pensionAnnual: 0,
  pensionStartAge: 65,
  pensionColaPct: 1.5,
  otherGuaranteedAnnual: 0,
  effectiveTaxRatePct: 15,
  marketShockPct: 30,
  marketShockAge: null,
  ltcSetting: 'none',
  ltcStartAge: 82,
  ltcYears: 3,
  ltcAnnualCost: LTC_COST_PRESETS.assisted,
  ltcInsuranceBenefit: 0,
  ltcHsaOffset: 0,
  extraOneTimeExpense: 0,
  extraOneTimeExpenseAge: null,
  returnHaircutPct: 0,
};

/** Assumptions derived from the user's real Prism plan; each is overridable. */
export function useStressAssumptionsSource() {
  const plan = useInvestmentPlan();
  const pensions = useInvestmentPensions(plan.data?.id);
  const spouse = useInvestmentSpouse(plan.data?.id);
  const reserves = useReserves();

  const pensionParts = useMemo(() => {
    const rows = (pensions.data ?? []) as any[];
    const amt = (x: any) => Number(x.monthly_amount || x.monthly_benefit || 0) * 12;
    const total = rows.reduce((s, x) => s + amt(x), 0);
    const spouseTotal = rows.filter((x) => x.owner === 'spouse').reduce((s, x) => s + amt(x), 0);
    return {
      self: Math.max(0, total - spouseTotal),
      spouse: spouseTotal,
      spouseStartAge: Number(rows.find((x) => x.owner === 'spouse')?.start_age ?? 62),
    };
  }, [pensions.data]);

  const derived = useMemo<StressAssumptions>(() => {
    const p = plan.data;
    const pensionRows = (pensions.data ?? []) as any[];
    const pensionAmount = (x: any) => Number(x.monthly_amount || x.monthly_benefit || 0) * 12;
    const pensionAnnual = pensionRows.reduce((s: number, x: any) => s + pensionAmount(x), 0);
    const spousePensionAnnual = pensionRows
      .filter((x) => x.owner === 'spouse')
      .reduce((s: number, x: any) => s + pensionAmount(x), 0);
    const selfPensionAnnual = Math.max(0, pensionAnnual - spousePensionAnnual);
    const spousePensionStartAge = Number(
      pensionRows.find((x) => x.owner === 'spouse')?.start_age ?? 62,
    );
    const sp = spouse.data as any;
    const spouseFields = {
      includeSpouse: !!sp,
      spouseCurrentAge: Number(sp?.current_age ?? FALLBACK_ASSUMPTIONS.spouseCurrentAge),
      spouseRetirementAge: Number(sp?.retirement_age ?? FALLBACK_ASSUMPTIONS.spouseRetirementAge),
      spouseBalance: Number(sp?.current_balance ?? 0),
      spouseContribution:
        (Number(sp?.monthly_employee_contribution ?? 0) + Number(sp?.monthly_employer_contribution ?? 0)) * 12,
      spouseSocialSecurityAnnual: Number(sp?.ss_monthly_estimate ?? 0) * 12,
      spouseSocialSecurityStartAge: Number(sp?.ss_claiming_age ?? 67),
    };

    if (!p)
      return {
        ...FALLBACK_ASSUMPTIONS,
        ...spouseFields,
        pensionAnnual: pensionAnnual || FALLBACK_ASSUMPTIONS.pensionAnnual,
      };

    const employee = Number(p.monthly_employee_contribution || 0) * 12;
    const employer = Number(p.monthly_employer_contribution || 0) * 12;
    const additional = Number(p.additional_monthly_amount || 0) * 12;

    return {
      ...FALLBACK_ASSUMPTIONS,
      ...spouseFields,
      currentAge: Number(p.current_age ?? FALLBACK_ASSUMPTIONS.currentAge),
      retirementAge: Number(p.retirement_age ?? FALLBACK_ASSUMPTIONS.retirementAge),
      portfolioBalance: Number(p.current_balance || 0),
      hsaBalance: Number(p.hsa_balance || 0),
      employeeContribution: employee + additional,
      employerContribution: employer,
      hsaContribution: Number(p.hsa_monthly_contribution || 0) * 12,
      hsaEmployerContribution: Number(p.hsa_employer_contribution || 0) * 12,
      contributionGrowthPct: Number(p.annual_raise_pct ?? 3),
      expectedReturnPct: Number(p.expected_return_pct ?? 8),
      inflationPct: Number(p.inflation_pct ?? 3),
      socialSecurityAnnual: Number(p.ss_monthly_estimate || 0) * 12 || FALLBACK_ASSUMPTIONS.socialSecurityAnnual,
      socialSecurityStartAge: Number(p.ss_claiming_age ?? 70),
      pensionAnnual: pensionAnnual + Number(p.spouse_pension_monthly || 0) * 12,
    };
  }, [plan.data, pensions.data, spouse.data]);

  const parts = useMemo(
    () => ({
      selfPensionAnnual: pensionParts.self,
      spousePensionAnnual: pensionParts.spouse,
      spousePensionStartAge: pensionParts.spouseStartAge,
    }),
    [pensionParts],
  );

  return {
    derived,
    parts,
    isLoading: plan.isLoading || reserves.isLoading,
    planId: plan.data?.id ?? null,
    emergencyFund: reserves.emergency,
    /** Cash reserves are deliberately NOT counted as invested assets. */
    emergencyCash: Number((reserves.emergency as any)?.current_balance || 0),
  };
}

/** Runs the simulation in a Web Worker. */
export function useStressRunner() {
  const workerRef = useRef<Worker | null>(null);
  const [output, setOutput] = useState<StressRunOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);

  useEffect(() => {
    const w = new Worker(new URL('../workers/stressTest.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<any>) => {
      if (e.data?.id !== reqId.current) return;
      setIsRunning(false);
      if (e.data.ok) {
        setError(null);
        const { ok, id, ...rest } = e.data;
        setOutput(rest as StressRunOutput);
      } else {
        setError(e.data.error || 'Simulation failed');
      }
    };
    workerRef.current = w;
    return () => w.terminate();
  }, []);

  const run = useCallback(
    (assumptions: StressAssumptions, goals: StressGoals, runs: number) => {
      if (!workerRef.current) return;
      reqId.current += 1;
      setIsRunning(true);
      workerRef.current.postMessage({
        id: reqId.current,
        assumptions,
        goals,
        runs,
        gridRuns: runs >= 10_000 ? 800 : runs >= 5_000 ? 500 : 300,
        retirementAges: [62, 65, 67, 70],
        contributionDeltas: [-250, 0, 250, 500, 1000],
        spendingPcts: [-10, -5, 0, 5, 10],
      });
    },
    [],
  );

  return { run, output, isRunning, error };
}

/* ----------------------------- Saved scenarios ---------------------------- */

export interface StressScenario {
  id: string;
  name: string;
  slot: string;
  assumptions: StressAssumptions;
  goals: StressGoals;
  results: Partial<StressResult> | null;
  runs: number;
  created_at: string;
}

export function useStressScenarios() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const key = ['stress_test_scenarios', household?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('stress_test_scenarios')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StressScenario[];
    },
  });

  const save = useMutation({
    mutationFn: async (input: {
      name: string;
      slot: string;
      assumptions: StressAssumptions;
      goals: StressGoals;
      results: Partial<StressResult>;
      runs: number;
    }) => {
      const existing = (query.data ?? []).find((s) => s.slot === input.slot);
      if (existing) {
        const { error } = await sb
          .from('stress_test_scenarios')
          .update({ ...input, household_id: household!.id })
          .eq('id', existing.id);
        if (error) throw error;
        return existing.id;
      }
      const { data, error } = await sb
        .from('stress_test_scenarios')
        .insert({ ...input, household_id: household!.id })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('stress_test_scenarios')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { scenarios: query.data ?? [], isLoading: query.isLoading, save, remove };
}

/* ------------------------------ Annual review ---------------------------- */

export interface StressSnapshot {
  id: string;
  snapshot_date: string;
  portfolio_balance: number;
  monthly_contribution: number;
  success_probability: number;
  legacy_probability: number;
  depletion_probability: number;
  notes: string | null;
}

export function useStressSnapshots() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const key = ['stress_test_snapshots', household?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('stress_test_snapshots')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('snapshot_date', { ascending: true });
      if (error) throw error;
      return (data ?? []) as StressSnapshot[];
    },
  });

  const add = useMutation({
    mutationFn: async (input: {
      portfolio_balance: number;
      monthly_contribution: number;
      success_probability: number;
      legacy_probability: number;
      depletion_probability: number;
      assumptions: StressAssumptions;
      notes?: string;
    }) => {
      const { error } = await sb
        .from('stress_test_snapshots')
        .insert({ ...input, household_id: household!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
  });

  return { snapshots: query.data ?? [], isLoading: query.isLoading, add };
}

export { DEFAULT_GOALS };
export type { StressAssumptions, StressGoals };
