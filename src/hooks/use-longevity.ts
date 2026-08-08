// Longevity Dividend™ hooks — bridge health data into the financial plan.
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useHealthLogs, useHealthMeals, useHealthProfile } from '@/hooks/use-health';
import { useLegacyWorth } from '@/hooks/use-financial-os';
import { buildConsistency } from '@/lib/health/consistency';
import {
  longevityEstimate,
  weeklyHealthScore,
  weightStatus,
} from '@/lib/health/healthEngine';
import {
  healthAdjustedHorizon,
  longevityDividend,
  type HealthHorizon,
  type LongevityDividend,
} from '@/lib/health/longevityDividend';
import {
  computeCombinedLegacyScore,
  type CombinedLegacyScore,
} from '@/lib/legacy/combinedLegacyScore';

const sb = supabase as any;

/** Health-adjusted planning horizon — safe to use anywhere, health-only inputs. */
export function useHealthHorizon() {
  const { data: profile, isLoading: lp } = useHealthProfile();
  const { data: logs = [], isLoading: ll } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();

  const horizon = useMemo<HealthHorizon>(() => {
    const status = weightStatus(profile ?? null, logs as any);
    const score = weeklyHealthScore(logs as any, profile ?? null);
    const consistency = buildConsistency(logs as any, meals as any, profile ?? null);
    return healthAdjustedHorizon(profile ?? null, status, score, consistency, logs as any);
  }, [profile, logs, meals]);

  return { horizon, isLoading: lp || ll };
}

/** Retirement plan assumptions needed to price the dividend. */
function usePlanAssumptions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['longevity_plan_assumptions', household?.id],
    enabled: !!household,
    staleTime: 120_000,
    queryFn: async () => {
      const { data } = await sb
        .from('investment_plans')
        .select(
          'monthly_employee_contribution,monthly_employer_contribution,additional_monthly_amount,expected_return_pct,retirement_age',
        )
        .eq('household_id', household!.id)
        .eq('is_active', true)
        .maybeSingle();
      const monthly =
        Number(data?.monthly_employee_contribution || 0) +
        Number(data?.monthly_employer_contribution || 0) +
        Number(data?.additional_monthly_amount || 0);
      return {
        annualContribution: monthly * 12,
        returnRate:
          data?.expected_return_pct != null ? Number(data.expected_return_pct) / 100 : 0.08,
        retirementAge: data?.retirement_age != null ? Number(data.retirement_age) : 75,
        annualRetirementSpend: 0,
      };
    },
  });
}

export function useLongevityDividend() {
  const { horizon, isLoading: hl } = useHealthHorizon();
  const lw = useLegacyWorth();
  const plan = usePlanAssumptions();

  const dividend = useMemo<LongevityDividend | null>(() => {
    if (!lw.data) return null;
    const i = (lw.data as any).inputs;
    const annualContribution =
      plan.data?.annualContribution && plan.data.annualContribution > 0
        ? plan.data.annualContribution
        : Math.max(0, Number(i.annualIncome || 0) * 0.1);
    const annualRetirementSpend =
      plan.data?.annualRetirementSpend && plan.data.annualRetirementSpend > 0
        ? plan.data.annualRetirementSpend
        : Math.max(0, Number(i.monthlyExpenses || 0) * 12);

    return longevityDividend({
      horizon,
      netWorth: Number((lw.data as any).netWorth || 0),
      investableAssets: Number(i.investableAssets || 0),
      annualContribution,
      annualRetirementSpend,
      retirementAge: plan.data?.retirementAge ?? 75,
      returnRate: plan.data?.returnRate ?? 0.08,
      guaranteedIncomeAnnual: Number(i.passiveMonthlyIncome || 0) * 12,
    });
  }, [lw.data, plan.data, horizon]);

  return {
    horizon,
    dividend,
    isLoading: hl || lw.isLoading || plan.isLoading,
    hasFinancialData: !!lw.data,
  };
}

export function useCombinedLegacyScore() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const { horizon, dividend, isLoading } = useLongevityDividend();
  const lw = useLegacyWorth();

  const combined = useMemo<CombinedLegacyScore>(() => {
    const status = weightStatus(profile ?? null, logs as any);
    const score = weeklyHealthScore(logs as any, profile ?? null);
    const est = longevityEstimate(profile ?? null, status, score);
    const consistency = buildConsistency(logs as any, meals as any, profile ?? null);
    const retirementFactor = (lw.data as any)?.factors?.find((f: any) => f.key === 'retirement');

    return computeCombinedLegacyScore({
      legacyWorthScore: lw.data ? Number((lw.data as any).score) : null,
      retirementReadiness: retirementFactor ? Number(retirementFactor.score) : null,
      healthyAgingScore: horizon.hasData ? est.healthyAgingScore : null,
      consistency30: consistency.hasData ? consistency.pct30 : null,
      planningAge: horizon.hasData ? horizon.planningAge : null,
      healthspanAge: horizon.hasData ? horizon.healthspanAge : null,
      fundedThroughAge: dividend ? dividend.fundedThroughAge : null,
      hasHealthData: horizon.hasData,
    });
  }, [profile, logs, meals, horizon, dividend, lw.data]);

  return { combined, horizon, dividend, isLoading: isLoading || lw.isLoading };
}
