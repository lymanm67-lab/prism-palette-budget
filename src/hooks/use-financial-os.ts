import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import {
  computeLegacyWorth, projectEstateAt85, daysUntilFreedom,
  type LegacyWorthInputs, type LifeStage,
} from '@/lib/legacy/legacyWorthEngine';
import { buildKungFooPlan, type KungFooContext, type KungFooStep } from '@/lib/kungfoo/orderOfOperations';
import { computeBelt, nextBeltRequirements, ESTATE_CHECKLIST_ITEMS, type Belt } from '@/lib/progression/beltRules';
import { computeOpportunityCost, type OpportunityCostInputs } from '@/lib/coach/opportunityCost';

const sb = supabase as any;

// ============================================================
// Legacy Worth — pulls source data, computes score, upserts snapshot
// ============================================================
export function useLegacyWorth() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['legacy_worth', household?.id],
    enabled: !!household,
    staleTime: 60_000,
    queryFn: async () => {
      const hid = household!.id;
      const [
        accounts, debts, holdings, insurance, estate, trust,
        constitution, txns, plan, profile, progression, wealthEvents,
      ] = await Promise.all([
        sb.from('accounts').select('id,account_type,balance,name').eq('household_id', hid).is('deleted_at', null),
        sb.from('debt_items').select('balance,interest_rate,debt_plans!inner(household_id)').eq('debt_plans.household_id', hid),
        sb.from('investment_holdings').select('symbol,market_value,cost_basis').eq('household_id', hid),
        sb.from('insurance_coverage').select('kind,coverage_amount').eq('household_id', hid).is('deleted_at', null),
        sb.from('estate_planning_checklist').select('item_key,is_complete').eq('household_id', hid),
        sb.from('family_legacy_trusts').select('current_assets,funding_target,readiness_score').eq('household_id', hid).is('deleted_at', null).maybeSingle(),
        sb.from('family_constitutions').select('is_published,published_at').eq('household_id', hid).is('deleted_at', null).maybeSingle(),
        sb.from('transactions').select('amount,date,category_id,is_transfer').eq('household_id', hid).is('deleted_at', null).gte('date', new Date(Date.now() - 365 * 86400_000).toISOString().slice(0, 10)).limit(5000),
        sb.from('investment_plans').select('*').eq('household_id', hid).eq('is_active', true).maybeSingle(),
        sb.from('profiles').select('display_name,date_of_birth').eq('household_id', hid).limit(1),
        sb.from('user_progression').select('current_belt,milestones_completed').eq('household_id', hid).maybeSingle(),
        sb.from('family_wealth_events').select('event_date').eq('household_id', hid).is('deleted_at', null),
      ]);

      const LIAB_TYPES = new Set(['credit', 'loan', 'credit_card', 'mortgage']);
      const acctAssets = (accounts.data || [])
        .filter((a: any) => !LIAB_TYPES.has(String(a.account_type || '').toLowerCase()))
        .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
      const acctLiab = (accounts.data || [])
        .filter((a: any) => LIAB_TYPES.has(String(a.account_type || '').toLowerCase()))
        .reduce((s: number, a: any) => s + Math.abs(Number(a.balance || 0)), 0);
      const debtLiab = (debts.data || []).reduce((s: number, d: any) => s + Number(d.balance || 0), 0);
      const liab = acctLiab + debtLiab;
      const netWorth = acctAssets - liab;

      const liquid = (accounts.data || [])
        .filter((a: any) => ['checking', 'savings', 'cash'].includes(String(a.account_type || '').toLowerCase()))
        .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

      const highInterestDebt = (debts.data || [])
        .filter((d: any) => Number(d.interest_rate || 0) >= 8)
        .reduce((s: number, d: any) => s + Number(d.balance || 0), 0);

      const holdingsValue = (holdings.data || []).reduce((s: number, h: any) => s + Number(h.market_value || 0), 0);
      const retirementAccounts = (accounts.data || [])
        .filter((a: any) => String(a.account_type || '').toLowerCase() === 'investment')
        .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);
      const investable = holdingsValue + retirementAccounts;
      const totalHoldingsVal = holdingsValue || 1;
      const hhi = (holdings.data || []).reduce((s: number, h: any) => {
        const share = Number(h.market_value || 0) / totalHoldingsVal;
        return s + share * share;
      }, 0);

      const insTotal = (insurance.data || []).reduce((s: number, r: any) => s + Number(r.coverage_amount || 0), 0);
      const insKinds = new Set((insurance.data || []).map((r: any) => r.kind)).size;

      const estateComplete = (estate.data || []).filter((r: any) => r.is_complete).length;

      const monthsBack12 = new Date();
      monthsBack12.setMonth(monthsBack12.getMonth() - 12);
      const yearTxns = (txns.data || []).filter((t: any) => new Date(t.date) >= monthsBack12 && !t.is_transfer);
      const income = yearTxns.filter((t: any) => Number(t.amount) > 0).reduce((s: number, t: any) => s + Number(t.amount), 0);
      const spend = yearTxns.filter((t: any) => Number(t.amount) < 0).reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
      // Prefer investment_plan configured monthly income (household) when transaction-derived income is low
      const planMonthlyIncome = plan.data ? Number((plan.data as any).current_monthly_income || 0) : 0;
      const annualIncome = Math.max(income, planMonthlyIncome * 12);
      const monthlyExpenses = spend / 12;

      const rothPct = plan.data ? Number((plan.data as any).roth_pct || 30) : 30;
      const hsaContribution = plan.data ? Number((plan.data as any).annual_contribution || 0) * 0.1 : 0;

      const age = (() => {
        const dob = (profile.data as any)?.[0]?.date_of_birth;
        if (!dob) return 40;
        return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400_000));
      })();

      const passiveMonthlyIncome = investable * 0.02 / 12; // rough dividend yield 2%

      // Trust readiness: use stored readiness_score, but fall back to funding ratio
      // (current_assets can be seeded by life insurance + retirement designations).
      const trustRow: any = trust.data || {};
      const fundingPct = trustRow.funding_target > 0
        ? Math.min(100, (Number(trustRow.current_assets || 0) / Number(trustRow.funding_target)) * 100)
        : 0;
      const trustReadinessPct = Math.max(Number(trustRow.readiness_score || 0), fundingPct);

      const inputs: LegacyWorthInputs = {
        age, annualIncome, monthlyExpenses, netWorth,
        liquidSavings: liquid, investableAssets: investable,
        passiveMonthlyIncome, highInterestDebt, totalDebt: liab,
        insuranceCoverageTotal: insTotal, insuranceKindsCount: insKinds,
        estateItemsComplete: estateComplete, estateItemsTotal: ESTATE_CHECKLIST_ITEMS.length,
        trustFunded: Number(trustRow.current_assets || 0) > 0,
        trustReadinessPct,
        rothPct, hsaContribution, holdingsHHI: hhi,
        charitableAnnual: 0,
        hasConstitution: !!(constitution.data as any)?.is_published,
        hadSummitLast12Months: (wealthEvents.data || []).some((e: any) => new Date(e.event_date) >= monthsBack12),
        hasBusinessOwnership: (accounts.data || []).some((a: any) => /business/i.test(String(a.name || ''))),
        realEstateEquity: (accounts.data || []).filter((a: any) => /real.?estate|home|house|property/i.test(String(a.name || ''))).reduce((s: number, a: any) => s + Number(a.balance || 0), 0),
        currentBelt: (progression.data as any)?.current_belt || 'white',
        fiPercentage: Math.min(1, investable / Math.max(monthlyExpenses * 12 * 25, 1)),
      };

      const result = computeLegacyWorth(inputs);
      const planAnnualContribution = plan.data ? Number((plan.data as any).annual_contribution || 0) : 0;
      const estateAt85 = projectEstateAt85(netWorth, age, Math.max(planAnnualContribution, annualIncome * 0.1));
      const targetPortfolio = monthlyExpenses * 12 * 25;
      // Use actual retirement contribution rate; fall back to 20% of expenses if none configured
      const monthlySavings = planAnnualContribution > 0 ? planAnnualContribution / 12 : monthlyExpenses * 0.2;
      const days = daysUntilFreedom(inputs.fiPercentage, monthlySavings, targetPortfolio, investable);

      // Upsert daily snapshot (best-effort)
      const today = new Date().toISOString().slice(0, 10);
      await sb.from('legacy_worth_snapshots').upsert({
        household_id: hid, snapshot_date: today,
        score: result.score, factor_scores: Object.fromEntries(result.factors.map(f => [f.key, f.score])),
        life_stage: result.lifeStage, fi_percentage: inputs.fiPercentage,
        days_until_freedom: days, passive_income_coverage: passiveMonthlyIncome / Math.max(monthlyExpenses, 1),
        projected_estate_at_85: estateAt85, net_worth: netWorth,
      }, { onConflict: 'household_id,snapshot_date' });

      return { ...result, inputs, netWorth, estateAt85, daysUntilFreedom: days, targetPortfolio };
    },
  });
}

export function useLegacyWorthHistory(days = 90) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['legacy_worth_history', household?.id, days],
    enabled: !!household,
    queryFn: async () => {
      const since = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
      const { data, error } = await sb.from('legacy_worth_snapshots')
        .select('snapshot_date,score,life_stage')
        .eq('household_id', household!.id)
        .gte('snapshot_date', since)
        .order('snapshot_date');
      if (error) throw error;
      return data || [];
    },
  });
}

// ============================================================
// KUNG FOO™ plan
// ============================================================
export function useKungFooPlan(paycheckNet = 0) {
  const { household } = useHousehold();
  const lw = useLegacyWorth();
  return useQuery({
    queryKey: ['kungfoo_plan', household?.id, paycheckNet, lw.data?.score],
    enabled: !!household && !!lw.data,
    queryFn: async () => {
      const inputs = lw.data!.inputs;
      const ctx: KungFooContext = {
        age: inputs.age ?? 40,
        annualIncome: inputs.annualIncome,
        marginalBracket: 0.24,
        employerMatchPct: 0.05,
        employerMatchMaxed: false,
        liquidCash: inputs.liquidSavings,
        monthlyExpenses: inputs.monthlyExpenses,
        highInterestDebt: inputs.highInterestDebt,
        hasHsaEligibility: true,
        hsaMaxed: false,
        retirementTimelineYears: Math.max(1, 65 - (inputs.age ?? 40)),
        familySize: 3,
        hasLegacyGoal: inputs.hasConstitution || inputs.trustFunded,
        paycheckNet: paycheckNet || (inputs.annualIncome / 26),
      };
      const steps = buildKungFooPlan(ctx);
      return { steps, context: ctx };
    },
  });
}

export function useSaveKungFooPlan() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { steps: KungFooStep[]; context: any; nextAction?: string }) => {
      // Deactivate any prior active plans
      await sb.from('kungfoo_plans').update({ is_active: false }).eq('household_id', household!.id).eq('is_active', true);
      const { data, error } = await sb.from('kungfoo_plans').insert({
        household_id: household!.id,
        ordered_steps: payload.steps,
        context: payload.context,
        next_action: payload.nextAction,
        is_active: true,
      }).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kungfoo_plan'] });
      toast({ title: 'KUNG FOO plan saved', description: 'Your paycheck now has marching orders.' });
    },
  });
}

// ============================================================
// Financial Freedom
// ============================================================
export function useFinancialFreedom() {
  const lw = useLegacyWorth();
  if (!lw.data) return { data: null, isLoading: lw.isLoading };
  const { inputs, targetPortfolio, daysUntilFreedom: days } = lw.data;
  return {
    data: {
      daysUntilFreedom: days,
      fiPercentage: inputs.fiPercentage,
      passiveIncomeCoverage: inputs.passiveMonthlyIncome / Math.max(inputs.monthlyExpenses, 1),
      portfolioSustainability: inputs.investableAssets >= targetPortfolio,
      targetPortfolio,
      currentPortfolio: inputs.investableAssets,
      yearsUntilOptional: days != null ? days / 365 : null,
    },
    isLoading: false,
  };
}

// ============================================================
// Opportunity Cost
// ============================================================
export function useOpportunityCost(amount: number, category?: string) {
  const ff = useFinancialFreedom();
  if (!ff.data) return null;
  const dailyProgress = ff.data.currentPortfolio > 0 && ff.data.targetPortfolio > 0
    ? (ff.data.targetPortfolio - ff.data.currentPortfolio) / Math.max(1, ff.data.yearsUntilOptional! * 365)
    : 1;
  const inputs: OpportunityCostInputs = {
    amount,
    dailyFreedomProgress: Math.max(1, dailyProgress),
    planningReturnRate: 0.07,
    yearsHorizon: 30,
    legacyWorthPerDollar: 0.0005,
    merchantCategory: category,
    timeOfDay: new Date().getHours(),
  };
  return computeOpportunityCost(inputs);
}

// ============================================================
// User Progression / Belt
// ============================================================
export function useUserProgression() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const lw = useLegacyWorth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['user_progression', user?.id],
    enabled: !!household && !!user,
    queryFn: async () => {
      const { data } = await sb.from('user_progression').select('*').eq('user_id', user!.id).maybeSingle();
      return data;
    },
  });

  const recompute = useMutation({
    mutationFn: async () => {
      if (!lw.data || !user || !household) return null;
      const i = lw.data.inputs;
      const estateComplete = i.estateItemsComplete;
      const belt = computeBelt({
        emergencyFundStarted: i.liquidSavings >= 1000,
        emergencyMonths: i.monthlyExpenses > 0 ? i.liquidSavings / i.monthlyExpenses : 0,
        highInterestDebtZero: i.highInterestDebt <= 0,
        employerMatchMaxed: false,
        rothActive: i.rothPct > 0,
        netWorth: lw.data.netWorth,
        legacyWorth: lw.data.score,
        fiPercentage: i.fiPercentage,
        estateChecklistPct: estateComplete / i.estateItemsTotal,
        trustFunded: i.trustFunded,
        constitutionPublished: i.hasConstitution,
        generationsSupportedInSim: 0,
      });
      const next = nextBeltRequirements(belt, {
        emergencyFundStarted: i.liquidSavings >= 1000,
        emergencyMonths: i.monthlyExpenses > 0 ? i.liquidSavings / i.monthlyExpenses : 0,
        highInterestDebtZero: i.highInterestDebt <= 0,
        employerMatchMaxed: false,
        rothActive: i.rothPct > 0,
        netWorth: lw.data.netWorth,
        legacyWorth: lw.data.score,
        fiPercentage: i.fiPercentage,
        estateChecklistPct: estateComplete / i.estateItemsTotal,
        trustFunded: i.trustFunded,
        constitutionPublished: i.hasConstitution,
        generationsSupportedInSim: 0,
      });
      const current = query.data;
      const isNewBelt = current?.current_belt !== belt;
      const { data, error } = await sb.from('user_progression').upsert({
        user_id: user.id,
        household_id: household.id,
        current_belt: belt,
        belt_earned_at: isNewBelt ? new Date().toISOString() : current?.belt_earned_at,
        celebration_seen: isNewBelt ? false : current?.celebration_seen ?? true,
        next_requirements: next,
        history: isNewBelt ? [...(current?.history || []), { belt, earned_at: new Date().toISOString() }] : (current?.history || []),
      }, { onConflict: 'user_id' }).select().maybeSingle();
      if (error) throw error;
      return { belt, isNewBelt, row: data };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['user_progression'] });
      if (res?.isNewBelt) {
        toast({ title: `🥋 New Belt: ${res.belt.toUpperCase()}`, description: 'Milestone unlocked!' });
      }
    },
  });

  return { ...query, recompute };
}

// ============================================================
// Estate checklist
// ============================================================
export function useEstateChecklist() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['estate_checklist', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb.from('estate_planning_checklist').select('*').eq('household_id', household!.id);
      if (error) throw error;
      return data || [];
    },
  });
}
export function useUpsertEstateItem() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: { item_key: string; is_complete: boolean; notes?: string; document_url?: string; professional_name?: string; next_review_date?: string | null }) => {
      const { error } = await sb.from('estate_planning_checklist').upsert({
        household_id: household!.id,
        ...row,
        completed_at: row.is_complete ? new Date().toISOString() : null,
      }, { onConflict: 'household_id,item_key' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['estate_checklist'] }),
  });
}

// ============================================================
// Family Constitution
// ============================================================
export function useFamilyConstitution() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['family_constitution', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await sb.from('family_constitutions').select('*').eq('household_id', household!.id).is('deleted_at', null).maybeSingle();
      return data;
    },
  });
}
export function useUpsertConstitution() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('family_constitutions').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('family_constitutions').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family_constitution'] });
      toast({ title: 'Constitution saved' });
    },
  });
}
export function useDraftConstitutionSection() {
  return useMutation({
    mutationFn: async (payload: { section: string; family_name: string; existing?: string; values?: string[] }) => {
      const { data, error } = await sb.functions.invoke('family-constitution-draft', { body: payload });
      if (error) throw error;
      return data?.draft as string;
    },
    onError: (e: any) => toast({ title: 'Draft failed', description: e?.message, variant: 'destructive' }),
  });
}

// ============================================================
// Trust
// ============================================================
export function useFamilyTrust() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['family_trust', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await sb.from('family_legacy_trusts').select('*').eq('household_id', household!.id).is('deleted_at', null).maybeSingle();
      return data;
    },
  });
}
export function useUpsertTrust() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('family_legacy_trusts').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('family_legacy_trusts').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family_trust'] });
      toast({ title: 'Trust updated' });
    },
  });
}

// ============================================================
// Beneficiaries
// ============================================================
export function useBeneficiaries() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['beneficiaries', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await sb.from('family_beneficiaries').select('*').eq('household_id', household!.id).is('deleted_at', null).order('is_contingent');
      return data || [];
    },
  });
}
export function useSaveBeneficiary() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('family_beneficiaries').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('family_beneficiaries').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}
export function useDeleteBeneficiary() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('family_beneficiaries').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  });
}

// ============================================================
// 100-year scenarios
// ============================================================
export function useHundredYearScenarios() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['hundred_year', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await sb.from('hundred_year_scenarios').select('*').eq('household_id', household!.id).is('deleted_at', null).order('created_at', { ascending: false });
      return data || [];
    },
  });
}
export function useSaveHundredYearScenario() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('hundred_year_scenarios').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('hundred_year_scenarios').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['hundred_year'] }),
  });
}

// ============================================================
// Insurance
// ============================================================
export function useInsurance() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['insurance', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await sb.from('insurance_coverage').select('*').eq('household_id', household!.id).is('deleted_at', null);
      return data || [];
    },
  });
}
export function useSaveInsurance() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: any) => {
      if (row.id) {
        const { error } = await sb.from('insurance_coverage').update(row).eq('id', row.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from('insurance_coverage').insert({ ...row, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance'] }),
  });
}
export function useDeleteInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('insurance_coverage').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['insurance'] }),
  });
}
