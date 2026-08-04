// Data layer for the Northeast Ohio Medical Housing Market Planner.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import {
  SEED_MARKETS,
  SEED_EMPLOYERS,
  SEED_STARTUP_SCENARIOS,
  SEED_INCOME_SCENARIOS,
  SEED_DUPLEX_UNITS,
  SEED_MILESTONES,
} from '@/lib/legacy/medicalHousing';

const sb = supabase as any;

export type MhTable =
  | 'mh_markets'
  | 'mh_employers'
  | 'mh_properties'
  | 'mh_startup_scenarios'
  | 'mh_income_scenarios'
  | 'mh_duplex_units'
  | 'mh_milestones';

function useList(table: MhTable, orderBy = 'sort_order') {
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
        .order(orderBy, { ascending: true });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
}

export const useMhMarkets = () => useList('mh_markets');
export const useMhEmployers = () => useList('mh_employers');
export const useMhProperties = () => useList('mh_properties', 'created_at');
export const useMhStartupScenarios = () => useList('mh_startup_scenarios');
export const useMhIncomeScenarios = () => useList('mh_income_scenarios');
export const useMhDuplexUnits = () => useList('mh_duplex_units');
export const useMhMilestones = () => useList('mh_milestones');

// ---------- Settings (one row per household) ----------

export function useMhSettings() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['mh_settings', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('mh_settings')
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as any;
      const { data: created, error: cErr } = await sb
        .from('mh_settings')
        .insert({ household_id: household!.id })
        .select()
        .single();
      if (cErr) throw cErr;
      return created as any;
    },
  });
}

export function useUpdateMhSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const { error } = await sb
        .from('mh_settings')
        .update(patch)
        .eq('household_id', household!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mh_settings', household?.id] }),
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

// ---------- Generic row mutations ----------

export function useMhUpsert(table: MhTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown> & { id?: string }) => {
      if (!household) throw new Error('No household');
      if (row.id) {
        const { id, ...patch } = row;
        const { error } = await sb.from(table).update(patch).eq('id', id);
        if (error) throw error;
        return id;
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

export function useMhDelete(table: MhTable) {
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

export function useMhSeed() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const ran = useRef(false);

  const markets = useMhMarkets();
  const employers = useMhEmployers();
  const startup = useMhStartupScenarios();
  const income = useMhIncomeScenarios();
  const duplex = useMhDuplexUnits();
  const milestones = useMhMilestones();

  const ready =
    !!household &&
    !markets.isLoading && !employers.isLoading && !startup.isLoading &&
    !income.isLoading && !duplex.isLoading && !milestones.isLoading;

  useEffect(() => {
    if (!ready || ran.current) return;
    const empty =
      (markets.data?.length ?? 0) === 0 &&
      (employers.data?.length ?? 0) === 0 &&
      (startup.data?.length ?? 0) === 0 &&
      (income.data?.length ?? 0) === 0 &&
      (duplex.data?.length ?? 0) === 0 &&
      (milestones.data?.length ?? 0) === 0;
    if (!empty) return;
    ran.current = true;

    const hh = household!.id;
    const withHh = (rows: any[]) => rows.map((r) => ({ ...r, household_id: hh }));

    (async () => {
      try {
        await Promise.all([
          sb.from('mh_markets').insert(withHh(SEED_MARKETS)),
          sb.from('mh_employers').insert(withHh(SEED_EMPLOYERS)),
          sb.from('mh_startup_scenarios').insert(withHh(SEED_STARTUP_SCENARIOS)),
          sb.from('mh_income_scenarios').insert(withHh(SEED_INCOME_SCENARIOS)),
          sb.from('mh_duplex_units').insert(withHh(SEED_DUPLEX_UNITS)),
          sb.from('mh_milestones').insert(withHh(SEED_MILESTONES)),
        ]);
        ['mh_markets', 'mh_employers', 'mh_startup_scenarios', 'mh_income_scenarios', 'mh_duplex_units', 'mh_milestones']
          .forEach((t) => qc.invalidateQueries({ queryKey: [t, hh] }));
      } catch (e: any) {
        console.error('Medical housing seed failed', e);
      }
    })();
  }, [ready, markets.data, employers.data, startup.data, income.data, duplex.data, milestones.data, household, qc]);

  return { seeding: ready && ran.current };
}
