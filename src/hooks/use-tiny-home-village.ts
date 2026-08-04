// Data layer for the Montgomery Tiny Home Village (Goal 2).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import {
  PHASES,
  PROGRAM_SEEDS,
  RISK_SEEDS,
  computeBudget,
  computeOperating,
  rollupFunding,
} from '@/lib/legacy/tinyHomeVillage';

const sb = supabase as any;

export type ThvTable =
  | 'thv_tasks'
  | 'thv_sites'
  | 'thv_budgets'
  | 'thv_programs'
  | 'thv_partners'
  | 'thv_funding'
  | 'thv_risks'
  | 'thv_impact'
  | 'thv_documents'
  | 'thv_residents';

function useList(table: ThvTable, orderBy = 'created_at', ascending = true) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: [table, household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order(orderBy, { ascending });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export const useThvTasks = () => useList('thv_tasks', 'sort_order');
export const useThvSites = () => useList('thv_sites');
export const useThvBudgets = () => useList('thv_budgets');
export const useThvPrograms = () => useList('thv_programs', 'sort_order');
export const useThvPartners = () => useList('thv_partners');
export const useThvFunding = () => useList('thv_funding');
export const useThvRisks = () => useList('thv_risks');
export const useThvImpact = () => useList('thv_impact', 'year');
export const useThvDocuments = () => useList('thv_documents');
export const useThvResidents = () => useList('thv_residents');

// ---------- Singleton rows ----------

function useSingleton(table: 'thv_settings' | 'thv_operating_budget') {
  const { household } = useHousehold();
  return useQuery({
    queryKey: [table, household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as any;
      const { data: created, error: cErr } = await sb
        .from(table)
        .insert({ household_id: household!.id })
        .select()
        .single();
      if (cErr) throw cErr;
      return created as any;
    },
  });
}

export const useThvSettings = () => useSingleton('thv_settings');
export const useThvOperating = () => useSingleton('thv_operating_budget');

function useUpdateSingleton(table: 'thv_settings' | 'thv_operating_budget') {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await sb.from(table).update(patch).eq('household_id', household!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, household?.id] }),
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

export const useUpdateThvSettings = () => useUpdateSingleton('thv_settings');
export const useUpdateThvOperating = () => useUpdateSingleton('thv_operating_budget');

// ---------- Generic row mutations ----------

export function useThvUpsert(table: ThvTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown> & { id?: string }) => {
      if (!household) throw new Error('No household');
      if (row.id) {
        const { id, ...patch } = row;
        const { error } = await sb.from(table).update(patch).eq('id', id);
        if (error) throw error;
        return id as string;
      }
      const { data, error } = await sb
        .from(table)
        .insert({ ...row, household_id: household.id })
        .select()
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [table, household?.id] }),
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

export function useThvDelete(table: ThvTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from(table)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, household?.id] });
      toast.success('Removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove'),
  });
}

// ---------- One-time per-household seeding ----------

export function useThvSeed() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const ran = useRef(false);

  const tasks = useThvTasks();
  const programs = useThvPrograms();
  const risks = useThvRisks();
  const budgets = useThvBudgets();

  const ready =
    !!household && !tasks.isLoading && !programs.isLoading && !risks.isLoading && !budgets.isLoading;

  useEffect(() => {
    if (!ready || ran.current) return;
    const empty =
      (tasks.data?.length ?? 0) === 0 &&
      (programs.data?.length ?? 0) === 0 &&
      (risks.data?.length ?? 0) === 0 &&
      (budgets.data?.length ?? 0) === 0;
    if (!empty) return;
    ran.current = true;

    const hh = household!.id;

    const taskRows = PHASES.flatMap((p, pi) =>
      p.tasks.map((t, ti) => ({
        household_id: hh,
        phase: p.phase,
        title: t,
        sort_order: pi * 100 + ti,
      })),
    );

    const programRows = PROGRAM_SEEDS.map((name, i) => ({
      household_id: hh,
      name,
      status: 'Planned',
      sort_order: i,
    }));

    const riskRows = RISK_SEEDS.map((risk) => ({ household_id: hh, risk }));

    const budgetRows = [
      { household_id: hh, name: 'Small Pilot Village', scenario: 'expected', homes_count: 6, cost_per_home: 85000 },
      { household_id: hh, name: 'Medium Village', scenario: 'expected', homes_count: 12, cost_per_home: 85000 },
      { household_id: hh, name: 'Expanded Village', scenario: 'expected', homes_count: 20, cost_per_home: 85000 },
    ];

    (async () => {
      try {
        await Promise.all([
          sb.from('thv_tasks').insert(taskRows),
          sb.from('thv_programs').insert(programRows),
          sb.from('thv_risks').insert(riskRows),
          sb.from('thv_budgets').insert(budgetRows),
        ]);
        ['thv_tasks', 'thv_programs', 'thv_risks', 'thv_budgets'].forEach((t) =>
          qc.invalidateQueries({ queryKey: [t, hh] }),
        );
      } catch (e) {
        console.error('Tiny home village seed failed', e);
        ran.current = false;
      }
    })();
  }, [ready, tasks.data, programs.data, risks.data, budgets.data, household, qc]);

  return { seeding: ready && ran.current };
}

// ---------- Rollups ----------

export function useThvRollup() {
  const settings = useThvSettings();
  const tasks = useThvTasks();
  const budgets = useThvBudgets();
  const operating = useThvOperating();
  const funding = useThvFunding();
  const partners = useThvPartners();
  const risks = useThvRisks();
  const sites = useThvSites();

  const s = settings.data;
  const primaryBudget = (budgets.data ?? [])[0];

  const budgetTotals = primaryBudget
    ? computeBudget(
        {
          homes_count: primaryBudget.homes_count,
          cost_per_home: primaryBudget.cost_per_home,
          contingency_pct: primaryBudget.contingency_pct,
          funding_secured: primaryBudget.funding_secured,
          line_items: primaryBudget.line_items ?? {},
        },
        s?.residents_served,
      )
    : null;

  const projectGoal = budgetTotals?.total || Number(s?.est_total_cost) || 0;

  const fundingRollup = rollupFunding(funding.data ?? [], projectGoal);

  const operatingTotals = operating.data
    ? computeOperating(
        operating.data.expenses ?? {},
        operating.data.income ?? {},
        operating.data.homes_count,
        operating.data.residents_count,
        operating.data.reserve_months,
      )
    : null;

  const allTasks = tasks.data ?? [];
  const completedTasks = allTasks.filter((t) => t.status === 'complete').length;
  const taskCompletionPct = allTasks.length ? (completedTasks / allTasks.length) * 100 : 0;

  const activePartners = (partners.data ?? []).filter((p) =>
    ['Active Partner', 'Letter of Support', 'Proposed Partner'].includes(p.status),
  ).length;

  const criticalRisks = (risks.data ?? []).filter(
    (r) => r.overall_rating === 'Critical' && r.status !== 'Closed',
  ).length;
  const highRisks = (risks.data ?? []).filter(
    (r) => ['High', 'Critical'].includes(r.overall_rating) && r.status !== 'Closed',
  ).length;

  return {
    isLoading:
      settings.isLoading || tasks.isLoading || budgets.isLoading || funding.isLoading || operating.isLoading,
    settings: s,
    projectGoal,
    budgetTotals,
    fundingRollup,
    operatingTotals,
    taskCompletionPct,
    completedTasks,
    totalTasks: allTasks.length,
    activePartners,
    partnerCount: (partners.data ?? []).length,
    siteCount: (sites.data ?? []).length,
    criticalRisks,
    highRisks,
  };
}
