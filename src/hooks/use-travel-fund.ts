import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  DEFAULT_SETTINGS, TravelSettings, TravelTrip, tripFunding,
} from '@/lib/travel/travelFund';

const sb = supabase as any;

export function useTravelSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['travel_settings', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('travel_settings').select('*').eq('household_id', household!.id).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<TravelSettings> & Record<string, any>) => {
      const { data, error } = await sb
        .from('travel_settings')
        .upsert({ household_id: household!.id, ...patch }, { onConflict: 'household_id' })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travel_settings'] }),
  });

  const settings: TravelSettings = useMemo(() => {
    const row = query.data;
    if (!row) return DEFAULT_SETTINGS;
    return {
      monthly_target: Number(row.monthly_target),
      essential_budget: Number(row.essential_budget),
      target_budget: Number(row.target_budget),
      enhanced_budget: Number(row.enhanced_budget),
      reserve_target: Number(row.reserve_target),
      cycle_start_month: Number(row.cycle_start_month),
      trip_month: Number(row.trip_month),
      inflation_pct: Number(row.inflation_pct),
      cost_history: Array.isArray(row.cost_history) && row.cost_history.length
        ? row.cost_history
        : DEFAULT_SETTINGS.cost_history,
    };
  }, [query.data]);

  return { settings, isLoading: query.isLoading, save };
}

function normalizeTrip(r: any): TravelTrip {
  return {
    id: r.id,
    destination: r.destination,
    travel_month: Number(r.travel_month),
    travel_year: Number(r.travel_year),
    depart_date: r.depart_date,
    trip_type: r.trip_type,
    status: r.status,
    budget_target: Number(r.budget_target),
    saved_amount: Number(r.saved_amount),
    rollover_amount: Number(r.rollover_amount),
    monthly_contribution: Number(r.monthly_contribution),
    savings_start_date: r.savings_start_date,
    is_prepaid: !!r.is_prepaid,
    actual_cost: r.actual_cost == null ? null : Number(r.actual_cost),
    completed_at: r.completed_at,
    funding_checklist: r.funding_checklist || {},
    booking: r.booking || {},
    final_payment_due: r.final_payment_due,
    notes: r.notes,
  };
}

export function useTravelTrips() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['travel_trips', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('travel_trips').select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('travel_year', { ascending: true })
        .order('travel_month', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(normalizeTrip);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['travel_trips'] });

  const create = useMutation({
    mutationFn: async (trip: Record<string, any>) => {
      const { data, error } = await sb
        .from('travel_trips').insert({ household_id: household!.id, ...trip }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await sb.from('travel_trips').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb
        .from('travel_trips').update({ deleted_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { trips: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}

export function useTripBudgetLines(tripId?: string) {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['travel_budget_lines', tripId],
    enabled: !!tripId && !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('travel_budget_lines').select('*').eq('trip_id', tripId!).order('created_at');
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['travel_budget_lines'] });

  const upsert = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      if (row.id) {
        const { id, ...patch } = row;
        const { error } = await sb.from('travel_budget_lines').update(patch).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await sb
          .from('travel_budget_lines').insert({ household_id: household!.id, trip_id: tripId, ...row });
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('travel_budget_lines').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { lines: query.data ?? [], isLoading: query.isLoading, upsert, remove };
}

export function useTravelBusinessExpenses() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['travel_business_expenses', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('travel_business_expenses').select('*')
        .eq('household_id', household!.id)
        .order('expense_date', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['travel_business_expenses'] });

  const create = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { error } = await sb
        .from('travel_business_expenses').insert({ household_id: household!.id, ...row });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { error } = await sb.from('travel_business_expenses').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('travel_business_expenses').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { expenses: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}

export function useTravelContributions() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['travel_contributions', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('travel_contributions').select('*')
        .eq('household_id', household!.id)
        .order('contribution_month', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  const log = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { error } = await sb
        .from('travel_contributions').insert({ household_id: household!.id, ...row });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travel_contributions'] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('travel_contributions').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['travel_contributions'] }),
  });

  return { contributions: query.data ?? [], isLoading: query.isLoading, log, remove };
}

/** Aggregated view used by dashboard cards. */
export function useTravelFund() {
  const { settings, isLoading: sLoading, save } = useTravelSettings();
  const { trips, isLoading: tLoading, create, update, remove } = useTravelTrips();

  const now = new Date();
  const upcoming = useMemo(
    () =>
      trips
        .filter((t) => t.status !== 'completed')
        .sort((a, b) => a.travel_year * 12 + a.travel_month - (b.travel_year * 12 + b.travel_month))[0] ?? null,
    [trips],
  );
  const nextSaving = useMemo(
    () => trips.filter((t) => t.status !== 'completed' && !t.is_prepaid)[0] ?? null,
    [trips],
  );
  const completed = useMemo(() => trips.filter((t) => t.status === 'completed'), [trips]);

  const funding = upcoming ? tripFunding(upcoming, settings, now) : null;
  const savingFunding = nextSaving ? tripFunding(nextSaving, settings, now) : null;

  return {
    settings, save, trips, upcoming, nextSaving, completed, funding, savingFunding,
    create, update, remove,
    isLoading: sLoading || tLoading,
  };
}
