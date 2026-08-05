// Data layer for the Dr. Lyman A. Montgomery Family Foundation module.
import { useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';
import {
  DEFAULT_MISSION,
  DEFAULT_VISION,
  DEFAULT_VALUES,
  DEFAULT_LEGACY_STATEMENT,
  PILLAR_SEEDS,
  ROADMAP_SEEDS,
  LEGACY_NODE_SEEDS,
} from '@/lib/legacy/foundation';

const sb = supabase as any;

export type FdnTable =
  | 'fdn_pillars'
  | 'fdn_initiatives'
  | 'fdn_relationships'
  | 'fdn_roadmap'
  | 'fdn_legacy_nodes';

function useList(table: FdnTable, orderBy = 'created_at', ascending = true) {
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

export const useFdnPillars = () => useList('fdn_pillars', 'sort_order');
export const useFdnInitiatives = () => useList('fdn_initiatives');
export const useFdnRelationships = () => useList('fdn_relationships', 'name');
export const useFdnRoadmap = () => useList('fdn_roadmap', 'sort_order');
export const useFdnLegacyNodes = () => useList('fdn_legacy_nodes', 'sort_order');

export function useFdnSettings() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['fdn_settings', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('fdn_settings')
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as any;
      const { data: created, error: cErr } = await sb
        .from('fdn_settings')
        .insert({
          household_id: household!.id,
          mission: DEFAULT_MISSION,
          vision: DEFAULT_VISION,
          core_values: DEFAULT_VALUES,
          legacy_statement: DEFAULT_LEGACY_STATEMENT,
          tagline: 'Capital with character. Impact you can measure.',
        })
        .select()
        .single();
      if (cErr) throw cErr;
      return created as any;
    },
  });
}

export function useUpdateFdnSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      const { error } = await sb.from('fdn_settings').update(patch).eq('household_id', household!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fdn_settings', household?.id] });
      toast.success('Foundation profile saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

export function useSaveFdnRow(table: FdnTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { id, ...rest } = row;
      if (id) {
        const { error } = await sb.from(table).update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb.from(table).insert({ ...rest, household_id: household!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, household?.id] });
      toast.success('Saved');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not save'),
  });
}

export function useDeleteFdnRow(table: FdnTable) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(table).update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table, household?.id] });
      toast.success('Removed');
    },
    onError: (e: any) => toast.error(e.message ?? 'Could not remove'),
  });
}

/** Seeds the five pillars, five-year roadmap, and legacy map once per household. */
export function useFdnSeed() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const done = useRef(false);
  const pillars = useFdnPillars();
  const roadmap = useFdnRoadmap();
  const nodes = useFdnLegacyNodes();

  useEffect(() => {
    if (!household || done.current) return;
    if (pillars.isLoading || roadmap.isLoading || nodes.isLoading) return;
    const needPillars = (pillars.data ?? []).length === 0;
    const needRoadmap = (roadmap.data ?? []).length === 0;
    const needNodes = (nodes.data ?? []).length === 0;
    if (!needPillars && !needRoadmap && !needNodes) {
      done.current = true;
      return;
    }
    done.current = true;

    (async () => {
      try {
        let pillarRows: any[] = pillars.data ?? [];
        if (needPillars) {
          const { data, error } = await sb
            .from('fdn_pillars')
            .insert(PILLAR_SEEDS.map((p) => ({ ...p, household_id: household.id })))
            .select();
          if (error) throw error;
          pillarRows = data ?? [];
          qc.invalidateQueries({ queryKey: ['fdn_pillars', household.id] });
        }
        if (needRoadmap) {
          const { error } = await sb
            .from('fdn_roadmap')
            .insert(ROADMAP_SEEDS.map((r) => ({ ...r, household_id: household.id })));
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ['fdn_roadmap', household.id] });
        }
        if (needNodes) {
          const { error } = await sb
            .from('fdn_legacy_nodes')
            .insert(LEGACY_NODE_SEEDS.map((n) => ({ ...n, household_id: household.id })));
          if (error) throw error;
          qc.invalidateQueries({ queryKey: ['fdn_legacy_nodes', household.id] });
        }
        void pillarRows;
      } catch (e: any) {
        console.error('Foundation seed failed', e);
      }
    })();
  }, [household, pillars.isLoading, roadmap.isLoading, nodes.isLoading, pillars.data, roadmap.data, nodes.data, qc]);
}
