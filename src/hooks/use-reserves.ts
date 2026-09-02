import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { ReserveFund, ReserveTxn } from '@/lib/reserves/emergencyFund';

const sb = supabase as any;

function normalizeFund(r: any): ReserveFund {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    account_id: r.account_id,
    institution_label: r.institution_label,
    liquidity_class: r.liquidity_class || 'other',
    account_type: r.account_type ?? null,
    goal_label: r.goal_label ?? null,
    market_value: Number(r.market_value || 0),
    stage1_target: Number(r.stage1_target || 0),
    primary_target: Number(r.primary_target || 0),
    ceiling_target: Number(r.ceiling_target || 0),
    monthly_contribution: Number(r.monthly_contribution || 0),
    contributions_paused: !!r.contributions_paused,
    essential_monthly_expenses: Number(r.essential_monthly_expenses || 0),
    starting_balance: Number(r.starting_balance || 0),
    redirect_excess_enabled: !!r.redirect_excess_enabled,
    redirect_investments_pct: Number(r.redirect_investments_pct ?? 60),
    redirect_other_pct: Number(r.redirect_other_pct ?? 40),
    notes: r.notes,
    sort_order: Number(r.sort_order || 0),
  };
}

function normalizeTxn(r: any): ReserveTxn {
  return {
    id: r.id,
    fund_id: r.fund_id,
    txn_date: r.txn_date,
    amount: Number(r.amount || 0),
    direction: r.direction,
    reason: r.reason,
    category: r.category,
    notes: r.notes,
  };
}

export function useReserveFunds() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['reserve_funds', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('reserve_funds')
        .select('*')
        .eq('household_id', household!.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data as any[]).map(normalizeFund);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reserve_funds'] });

  const create = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await sb
        .from('reserve_funds')
        .insert({ household_id: household!.id, ...row })
        .select()
        .single();
      if (error) throw error;
      return normalizeFund(data);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Record<string, any>) => {
      const { data, error } = await sb.from('reserve_funds').update(patch).eq('id', id).select().single();
      if (error) throw error;
      return normalizeFund(data);
    },
    onSuccess: invalidate,
  });

  return { funds: query.data || [], isLoading: query.isLoading, create, update };
}

export function useReserveTransactions() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['reserve_transactions', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('reserve_transactions')
        .select('*')
        .eq('household_id', household!.id)
        .order('txn_date', { ascending: false });
      if (error) throw error;
      return (data as any[]).map(normalizeTxn);
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['reserve_transactions'] });

  const create = useMutation({
    mutationFn: async (row: Record<string, any>) => {
      const { data, error } = await sb
        .from('reserve_transactions')
        .insert({ household_id: household!.id, ...row })
        .select()
        .single();
      if (error) throw error;
      return normalizeTxn(data);
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('reserve_transactions').delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { txns: query.data || [], isLoading: query.isLoading, create, remove };
}

/** Convenience: the emergency and vehicle funds plus all their movements. */
export function useReserves() {
  const { funds, isLoading: fLoading, create, update } = useReserveFunds();
  const { txns, isLoading: tLoading, create: addTxn, remove: removeTxn } = useReserveTransactions();

  const emergency = useMemo(() => funds.find((f) => f.kind === 'emergency') || null, [funds]);
  const vehicle = useMemo(() => funds.find((f) => f.kind === 'vehicle') || null, [funds]);

  return {
    funds,
    emergency,
    vehicle,
    txns,
    isLoading: fLoading || tLoading,
    createFund: create,
    updateFund: update,
    addTxn,
    removeTxn,
  };
}
