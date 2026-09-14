// SwingEdge — data layer for the SwingEdge + Thinkorswim practice lab.
//
// Three records: the practice session (one per day), the execution ticket you
// carry into paperMoney, and the target changes made on an open trade. Anything
// the trader has not typed in stays null — nothing is inferred.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { HANDOFF_CHECKLIST, TRAINING_CHECKLIST } from '@/lib/swingedge/practice';

const todayISO = () => new Date().toISOString().slice(0, 10);

/* --------------------------------------------------------- practice session */

export interface PracticeSession {
  id: string;
  session_date: string;
  market_read: string | null;
  regime_note: string | null;
  candidates_reviewed: number;
  trades_qualified: number;
  trades_rejected: number;
  trades_executed: number;
  best_skip_symbol: string | null;
  best_skip_reason: string | null;
  rule_violations: string | null;
  lessons_learned: string | null;
  notes: string | null;
  training_week: number | null;
}

export type SessionPatch = Partial<Omit<PracticeSession, 'id' | 'session_date'>>;

const SESSION_COLUMNS =
  'id, session_date, market_read, regime_note, candidates_reviewed, trades_qualified, trades_rejected, trades_executed, best_skip_symbol, best_skip_reason, rule_violations, lessons_learned, notes, training_week';

export function usePracticeSessions() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-practice-sessions', householdId],
    enabled: !!householdId,
    staleTime: 30_000,
    queryFn: async (): Promise<PracticeSession[]> => {
      const { data, error } = await supabase
        .from('se_practice_sessions')
        .select(SESSION_COLUMNS)
        .eq('household_id', householdId!)
        .order('session_date', { ascending: false })
        .limit(120);
      if (error) throw error;
      return (data ?? []) as unknown as PracticeSession[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['se-practice-sessions', householdId] });

  const today = useMemo(
    () => (query.data ?? []).find((s) => s.session_date === todayISO()) ?? null,
    [query.data],
  );

  const save = useMutation({
    mutationFn: async (patch: SessionPatch & { session_date?: string }) => {
      const date = patch.session_date ?? todayISO();
      const existing = (query.data ?? []).find((s) => s.session_date === date);
      if (existing) {
        const { error } = await supabase
          .from('se_practice_sessions')
          .update(patch)
          .eq('id', existing.id);
        if (error) throw error;
        return existing.id;
      }
      const { data, error } = await supabase
        .from('se_practice_sessions')
        .insert({ household_id: householdId!, session_date: date, ...patch })
        .select('id')
        .single();
      if (error) throw error;
      return String(data.id);
    },
    onSuccess: invalidate,
  });

  return {
    sessions: query.data ?? [],
    today,
    isLoading: query.isLoading,
    save,
  };
}

/* -------------------------------------------------------- execution tickets */

export interface ExecutionTicket {
  id: string;
  trade_plan_id: string | null;
  paper_trade_id: string | null;
  symbol: string;
  setup_type: string | null;
  status: string;
  entry_zone_low: number | null;
  entry_zone_high: number | null;
  planned_entry: number;
  planned_stop: number;
  planned_target: number | null;
  risk_per_share: number | null;
  max_dollar_risk: number | null;
  approved_shares: number | null;
  position_value: number | null;
  potential_reward: number | null;
  reward_risk: number | null;
  training_capital: number | null;
  risk_pct: number | null;
  expected_hold: string | null;
  readiness_score: number | null;
  signal: string | null;
  bias_direction: string | null;
  bias_confidence: string | null;
  bias_probability: number | null;
  event_risk_band: string | null;
  earnings_note: string | null;
  timeframe_daily: string | null;
  timeframe_h4: string | null;
  timeframe_h1: string | null;
  timeframe_weekly: string | null;
  timeframe_m15: string | null;
  handoff_checklist: Record<string, boolean>;
  training_checklist: Record<string, boolean>;
  actual_entry: number | null;
  actual_shares: number | null;
  actual_stop: number | null;
  actual_target: number | null;
  order_type: string | null;
  execution_time: string | null;
  slippage: number | null;
  variance_band: string | null;
  notes: string | null;
  created_at: string;
}

export type TicketDraft = Omit<
  ExecutionTicket,
  'id' | 'created_at' | 'handoff_checklist' | 'training_checklist'
> & {
  handoff_checklist?: Record<string, boolean>;
  training_checklist?: Record<string, boolean>;
};

export type TicketPatch = Partial<Omit<ExecutionTicket, 'id' | 'created_at'>>;

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : Number(v);

function readTicket(row: Record<string, unknown>): ExecutionTicket {
  const checklist = (v: unknown): Record<string, boolean> =>
    v && typeof v === 'object' ? (v as Record<string, boolean>) : {};
  return {
    ...(row as unknown as ExecutionTicket),
    id: String(row.id),
    planned_entry: Number(row.planned_entry),
    planned_stop: Number(row.planned_stop),
    planned_target: num(row.planned_target),
    entry_zone_low: num(row.entry_zone_low),
    entry_zone_high: num(row.entry_zone_high),
    risk_per_share: num(row.risk_per_share),
    max_dollar_risk: num(row.max_dollar_risk),
    position_value: num(row.position_value),
    potential_reward: num(row.potential_reward),
    reward_risk: num(row.reward_risk),
    training_capital: num(row.training_capital),
    risk_pct: num(row.risk_pct),
    bias_probability: num(row.bias_probability),
    actual_entry: num(row.actual_entry),
    actual_stop: num(row.actual_stop),
    actual_target: num(row.actual_target),
    slippage: num(row.slippage),
    handoff_checklist: checklist(row.handoff_checklist),
    training_checklist: checklist(row.training_checklist),
  };
}

export function useExecutionTickets() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-execution-tickets', householdId],
    enabled: !!householdId,
    staleTime: 15_000,
    queryFn: async (): Promise<ExecutionTicket[]> => {
      const { data, error } = await supabase
        .from('se_execution_tickets')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((r) => readTicket(r as Record<string, unknown>));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['se-execution-tickets', householdId] });
    qc.invalidateQueries({ queryKey: ['se-open-positions', householdId] });
  };

  const create = useMutation({
    mutationFn: async (draft: Partial<TicketDraft> & { symbol: string; planned_entry: number; planned_stop: number }) => {
      const { data, error } = await supabase
        .from('se_execution_tickets')
        .insert({
          household_id: householdId!,
          status: 'DRAFT',
          handoff_checklist: {},
          training_checklist: {},
          ...draft,
        })
        .select('id')
        .single();
      if (error) throw error;
      return String(data.id);
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: TicketPatch & { id: string }) => {
      const { error } = await supabase.from('se_execution_tickets').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_execution_tickets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { tickets: query.data ?? [], isLoading: query.isLoading, create, update, remove };
}

/** True when every item on a checklist has been ticked. */
export function checklistComplete(
  ticks: Record<string, boolean>,
  items: string[] = HANDOFF_CHECKLIST,
): boolean {
  return items.every((item) => ticks[item] === true);
}

export function trainingChecklistComplete(ticks: Record<string, boolean>): boolean {
  return checklistComplete(ticks, TRAINING_CHECKLIST);
}

/* ------------------------------------------------------- target changes log */

export interface TargetChange {
  id: string;
  paper_trade_id: string;
  original_target: number | null;
  new_target: number;
  reason: string;
  updated_reward_risk: number | null;
  created_at: string;
}

export function useTargetChanges(paperTradeId?: string) {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-target-changes', householdId, paperTradeId ?? 'all'],
    enabled: !!householdId,
    staleTime: 30_000,
    queryFn: async (): Promise<TargetChange[]> => {
      let q = supabase
        .from('se_target_modifications')
        .select('id, paper_trade_id, original_target, new_target, reason, updated_reward_risk, created_at')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })
        .limit(200);
      if (paperTradeId) q = q.eq('paper_trade_id', paperTradeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as TargetChange[];
    },
  });

  const log = useMutation({
    mutationFn: async (row: {
      paper_trade_id: string;
      original_target: number | null;
      new_target: number;
      reason: string;
      updated_reward_risk: number | null;
    }) => {
      const { error } = await supabase
        .from('se_target_modifications')
        .insert({ household_id: householdId!, ...row });
      if (error) throw error;
      const upd = await supabase
        .from('se_paper_trades')
        .update({ target_price: row.new_target })
        .eq('id', row.paper_trade_id);
      if (upd.error) throw upd.error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-target-changes', householdId] });
      qc.invalidateQueries({ queryKey: ['se-open-positions', householdId] });
      qc.invalidateQueries({ queryKey: ['se-managed-trades', householdId] });
    },
  });

  return { changes: query.data ?? [], log };
}

/* ----------------------------------------------------- dashboard practice card */

export interface PracticeToday {
  candidatesReviewed: number;
  tradesQualified: number;
  tradesExecuted: number;
  openTrades: number;
  dailyR: number | null;
  weeklyR: number | null;
  rulesFollowedPct: number | null;
  marketRead: string | null;
  bestSkip: string | null;
}

/** The numbers behind "Today's paper trading practice", all from recorded rows. */
export function usePracticeToday() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const { today } = usePracticeSessions();

  const query = useQuery({
    queryKey: ['se-practice-today', householdId],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async () => {
      const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
      const [open, closed] = await Promise.all([
        supabase
          .from('se_paper_trades')
          .select('id')
          .eq('household_id', householdId!)
          .eq('status', 'OPEN'),
        supabase
          .from('se_paper_trades')
          .select('realized_pl, initial_dollar_risk, planned_loss, exit_date, rules_followed')
          .eq('household_id', householdId!)
          .eq('status', 'CLOSED')
          .gte('exit_date', weekAgo)
          .limit(500),
      ]);
      if (open.error) throw open.error;
      if (closed.error) throw closed.error;

      const rows = closed.data ?? [];
      const rOf = (t: Record<string, unknown>): number | null => {
        const risk = Number(t.initial_dollar_risk ?? t.planned_loss ?? 0);
        const pl = Number(t.realized_pl ?? 0);
        if (!Number.isFinite(risk) || risk <= 0) return null;
        return pl / risk;
      };
      const day = todayISO();
      const sum = (list: typeof rows) => {
        const vals = list.map((t) => rOf(t as Record<string, unknown>)).filter((v): v is number => v !== null);
        return vals.length === 0 ? null : Math.round(vals.reduce((a, b) => a + b, 0) * 100) / 100;
      };
      const followed = rows.filter((t) => t.rules_followed !== null);

      return {
        openTrades: (open.data ?? []).length,
        dailyR: sum(rows.filter((t) => t.exit_date === day)),
        weeklyR: sum(rows),
        rulesFollowedPct:
          followed.length === 0
            ? null
            : Math.round((followed.filter((t) => t.rules_followed === true).length / followed.length) * 100),
      };
    },
  });

  const data: PracticeToday = {
    candidatesReviewed: today?.candidates_reviewed ?? 0,
    tradesQualified: today?.trades_qualified ?? 0,
    tradesExecuted: today?.trades_executed ?? 0,
    openTrades: query.data?.openTrades ?? 0,
    dailyR: query.data?.dailyR ?? null,
    weeklyR: query.data?.weeklyR ?? null,
    rulesFollowedPct: query.data?.rulesFollowedPct ?? null,
    marketRead: today?.market_read ?? null,
    bestSkip: today?.best_skip_symbol ?? null,
  };

  return { data, isLoading: query.isLoading };
}
