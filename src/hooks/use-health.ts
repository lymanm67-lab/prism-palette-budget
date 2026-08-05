// Data layer for the PRISM Health, Wellness & Longevity OS.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import {
  MILESTONE_REWARDS,
  MILESTONE_WEIGHTS,
  todayISO,
  type DailyLog,
  type HealthProfile,
} from '@/lib/health/healthEngine';

const sb = supabase as any;

// ------------------------------------------------------------------- profile

export function useHealthProfile() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['health_profile', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<HealthProfile> => {
      const { data, error } = await sb
        .from('health_profile')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as HealthProfile;
      const { data: created, error: cErr } = await sb
        .from('health_profile')
        .insert({ household_id: household!.id })
        .select()
        .single();
      if (cErr) throw cErr;
      return created as HealthProfile;
    },
  });
}

export function useUpdateHealthProfile() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await sb
        .from('health_profile')
        .update(patch)
        .eq('household_id', household!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_profile', household?.id] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

// ---------------------------------------------------------------- daily logs

const PAGE = 1000;

export function useHealthLogs() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['health_daily_logs', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<DailyLog[]> => {
      const rows: DailyLog[] = [];
      for (let page = 0; page < 10; page += 1) {
        const { data, error } = await sb
          .from('health_daily_logs')
          .select('*')
          .eq('household_id', household!.id)
          .is('deleted_at', null)
          .order('log_date', { ascending: false })
          .range(page * PAGE, page * PAGE + PAGE - 1);
        if (error) throw error;
        const chunk = (data ?? []) as DailyLog[];
        rows.push(...chunk);
        if (chunk.length < PAGE) break;
      }
      return rows;
    },
  });
}

export function useTodayLog() {
  const logs = useHealthLogs();
  const today = todayISO();
  return {
    ...logs,
    data: logs.data?.find((l) => l.log_date === today) ?? null,
  };
}

/** Upserts one day's log by date. */
export function useSaveDailyLog() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown> & { log_date?: string }) => {
      if (!household) throw new Error('No household');
      const payload = { ...row, household_id: household.id, log_date: row.log_date ?? todayISO() };
      const { error } = await sb
        .from('health_daily_logs')
        .upsert(payload, { onConflict: 'household_id,log_date' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['health_daily_logs', household?.id] }),
    onError: (e: any) => toast.error(e.message ?? 'Could not save the log'),
  });
}

export function useDeleteDailyLog() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('health_daily_logs')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['health_daily_logs', household?.id] });
      toast.success('Log removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove'),
  });
}

// -------------------------------------------------------- generic list tables

export type HealthTable =
  | 'health_vitals'
  | 'health_milestones'
  | 'health_achievements'
  | 'health_meals'
  | 'health_meal_prep'
  | 'health_coach_reports';

function useList(table: HealthTable, orderBy: string, ascending = true) {
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

export const useHealthVitals = () => useList('health_vitals', 'measured_on', false);
export const useHealthMilestones = () => useList('health_milestones', 'sort_order');
export const useHealthAchievements = () => useList('health_achievements', 'earned_on');
export const useHealthMeals = () => useList('health_meals', 'meal_date', false);
export const useHealthPrep = () => useList('health_meal_prep', 'prep_date', false);
export const useHealthReports = () => useList('health_coach_reports', 'created_at', false);

export function useHealthUpsert(table: HealthTable) {
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

export function useHealthDelete(table: HealthTable) {
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

// ----------------------------------------------- one-time milestone seeding

export function useHealthSeed() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const ran = useRef(false);
  const milestones = useHealthMilestones();

  useEffect(() => {
    if (!household || milestones.isLoading || ran.current) return;
    if ((milestones.data?.length ?? 0) > 0) return;
    ran.current = true;

    const rows = MILESTONE_WEIGHTS.filter((w) => w !== 220).map((w, i) => ({
      household_id: household.id,
      weight_target: w,
      reward: MILESTONE_REWARDS[w] ?? null,
      sort_order: i,
    }));

    sb.from('health_milestones')
      .insert(rows)
      .then(() => qc.invalidateQueries({ queryKey: ['health_milestones', household.id] }));
  }, [household, milestones.isLoading, milestones.data, qc]);
}

// -------------------------------------------------- grocery budget integration

export type GroceryStats = {
  monthLabel: string;
  budget: number;
  budgetSource: 'current' | 'carried' | 'none';
  budgetMonthLabel: string | null;
  categoryNames: string[];
  spent: number;
  remaining: number;
  trend: { month: string; spent: number }[];
  recent: { id: string; date: string; merchant: string; amount: number }[];
};

const EMPTY_GROCERY = (now: Date): GroceryStats => ({
  monthLabel: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
  budget: 0,
  budgetSource: 'none',
  budgetMonthLabel: null,
  categoryNames: [],
  spent: 0,
  remaining: 0,
  trend: [],
  recent: [],
});

const monthLabelFromISO = (iso: string) =>
  new Date(`${iso.slice(0, 7)}-01T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

/**
 * Reads the household's grocery categories (and their subcategories), the
 * current-month budget from the Budgets page, and actual spend from
 * transactions. Transfers and soft-deleted rows excluded; grocery
 * reimbursements (positive amounts) are netted against the spend. If no budget
 * exists for the current month, the most recent prior month's budget carries
 * forward.
 */
export function useGroceryStats() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['health_grocery_stats', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<GroceryStats> => {
      const hh = household!.id;
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)
        .toISOString()
        .slice(0, 10);

      const { data: cats } = await sb
        .from('categories')
        .select('id, name')
        .eq('household_id', hh)
        .or('name.ilike.%grocer%,name.ilike.%food%');
      const catIds = (cats ?? []).map((c: any) => c.id);
      const categoryNames = (cats ?? []).map((c: any) => String(c.name));

      if (catIds.length === 0) return EMPTY_GROCERY(now);

      // Budget for this month, else carry forward the most recent prior month.
      const { data: budgetRows } = await sb
        .from('budgets')
        .select('planned_amount, month')
        .eq('household_id', hh)
        .in('category_id', catIds)
        .lte('month', monthStart)
        .order('month', { ascending: false });

      let budget = 0;
      let budgetSource: GroceryStats['budgetSource'] = 'none';
      let budgetMonthLabel: string | null = null;
      const rows = budgetRows ?? [];
      const useMonth = rows.length ? String(rows[0].month) : null;
      if (useMonth) {
        budget = rows
          .filter((b: any) => String(b.month) === useMonth)
          .reduce((s: number, b: any) => s + (Number(b.planned_amount) || 0), 0);
        budgetSource = useMonth === monthStart ? 'current' : 'carried';
        budgetMonthLabel = monthLabelFromISO(useMonth);
      }

      const { data: txns } = await sb
        .from('transactions')
        .select('id, amount, date, merchant')
        .eq('household_id', hh)
        .in('category_id', catIds)
        .is('deleted_at', null)
        .neq('is_transfer', true)
        .gte('date', sixMonthsAgo)
        .order('date', { ascending: true })
        .limit(1000);

      const byMonth = new Map<string, number>();
      let spent = 0;
      for (const t of txns ?? []) {
        const amt = Number(t.amount) || 0;
        // Expenses are negative; reimbursements are positive and net against spend.
        const net = -amt;
        const key = String(t.date).slice(0, 7);
        byMonth.set(key, (byMonth.get(key) ?? 0) + net);
        if (String(t.date) >= monthStart) spent += net;
      }

      const recent = [...(txns ?? [])]
        .sort((a: any, b: any) => (a.date < b.date ? 1 : -1))
        .slice(0, 8)
        .map((t: any) => ({
          id: String(t.id),
          date: String(t.date),
          merchant: String(t.merchant ?? 'Grocery purchase'),
          amount: -(Number(t.amount) || 0),
        }));

      return {
        monthLabel: now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        budget,
        budgetSource,
        budgetMonthLabel,
        categoryNames,
        spent: Math.max(0, spent),
        remaining: budget - Math.max(0, spent),
        trend: [...byMonth.entries()]
          .sort((a, b) => (a[0] < b[0] ? -1 : 1))
          .map(([month, s]) => ({ month, spent: Math.max(0, s) })),
        recent,
      };
    },
  });
}

