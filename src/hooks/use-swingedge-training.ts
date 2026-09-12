// SwingEdge — Circuit breakers, daily checklist, six-week training and reviews.
//
// The breaker tally is derived from closed trades rather than stored counters, so
// it cannot drift out of step with the trade record. The stored row exists only
// to remember that a review was written.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useTradingSettings } from '@/hooks/use-swingedge';
import { usePaperTradeManagement } from '@/hooks/use-swingedge-stops';
import { useTradeJournal } from '@/hooks/use-swingedge-lists';
import { assessBreaker, tallyFromTrades, weekStartOf } from '@/lib/swingedge/circuitBreaker';
import {
  TRAINING_WEEKS,
  assessGraduation,
  checklistComplete,
  type ChecklistState,
  type WeekProgress,
} from '@/lib/swingedge/training';
import { computeStats } from '@/lib/swingedge/performance';

const today = () => new Date().toISOString().slice(0, 10);
const round2 = (n: number) => Math.round(n * 100) / 100;

const EMPTY_CHECKLIST: ChecklistState = {
  market_condition_checked: false,
  earnings_checked: false,
  heat_room_checked: false,
  stop_defined: false,
  size_calculated: false,
};

/* ------------------------------------------------------- circuit breakers */

export function useCircuitBreaker() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  const { settings } = useTradingSettings();
  const { trades } = usePaperTradeManagement();

  const stateQuery = useQuery({
    queryKey: ['se-breaker-state', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_circuit_breaker_state')
        .select('*')
        .eq('household_id', householdId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const day = today();
  const weekStart = weekStartOf(day);
  const tally = useMemo(() => tallyFromTrades(trades, day, weekStart), [trades, day, weekStart]);

  // A review only clears the pause that was live when it was written. Once a new
  // loss lands, the tally moves on and the breaker can trip again.
  const reviewedAt = stateQuery.data?.review_completed_at ?? null;
  const reviewCovers = useMemo(() => {
    if (!reviewedAt) return false;
    const reviewedDay = reviewedAt.slice(0, 10);
    const lossesSince = trades.filter(
      (t) => t.status === 'CLOSED' && (t.realized_pl ?? 0) < 0 && (t.exit_date ?? '') > reviewedDay,
    );
    return lossesSince.length === 0;
  }, [reviewedAt, trades]);

  const assessment = useMemo(
    () =>
      assessBreaker({
        tally,
        limits: {
          consecutiveLosses: settings.breaker_consecutive_losses,
          dailyLossLimit: settings.breaker_daily_loss_limit,
          weeklyLossLimit: settings.breaker_weekly_loss_limit,
        },
        reviewCompleted: reviewCovers,
      }),
    [tally, settings, reviewCovers],
  );

  const completeReview = useMutation({
    mutationFn: async (notes: string) => {
      if (!householdId) throw new Error('No household');
      const { error } = await supabase.from('se_circuit_breaker_state').upsert(
        {
          household_id: householdId,
          state: assessment.state,
          consecutive_losses: tally.consecutiveLosses,
          daily_loss: tally.dailyLoss,
          weekly_loss: tally.weeklyLoss,
          reason: notes,
          triggered_at: assessment.tripped ? new Date().toISOString() : null,
          review_completed_at: new Date().toISOString(),
        },
        { onConflict: 'household_id' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['se-breaker-state'] }),
  });

  return {
    assessment,
    tally,
    limits: {
      consecutiveLosses: settings.breaker_consecutive_losses,
      dailyLossLimit: settings.breaker_daily_loss_limit,
      weeklyLossLimit: settings.breaker_weekly_loss_limit,
    },
    lastReview: stateQuery.data?.reason ?? null,
    reviewedAt,
    isLoading: stateQuery.isLoading,
    completeReview: completeReview.mutateAsync,
    isSaving: completeReview.isPending,
  };
}

/* --------------------------------------------------------- daily checklist */

export function useDailyChecklist(date?: string) {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();
  const day = date ?? today();

  const query = useQuery({
    queryKey: ['se-checklist', householdId, day],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_daily_checklists')
        .select('*')
        .eq('household_id', householdId!)
        .eq('checklist_date', day)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const state: ChecklistState = query.data
    ? {
        market_condition_checked: !!query.data.market_condition_checked,
        earnings_checked: !!query.data.earnings_checked,
        heat_room_checked: !!query.data.heat_room_checked,
        stop_defined: !!query.data.stop_defined,
        size_calculated: !!query.data.size_calculated,
      }
    : EMPTY_CHECKLIST;

  const save = useMutation({
    mutationFn: async (input: Partial<ChecklistState> & { notes?: string | null }) => {
      if (!householdId) throw new Error('No household');
      const { error } = await supabase.from('se_daily_checklists').upsert(
        {
          household_id: householdId,
          checklist_date: day,
          ...state,
          ...input,
          notes: input.notes ?? query.data?.notes ?? null,
        },
        { onConflict: 'household_id,checklist_date' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['se-checklist'] }),
  });

  return {
    date: day,
    state,
    notes: query.data?.notes ?? '',
    complete: checklistComplete(state),
    isLoading: query.isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
  };
}

/* ------------------------------------------------------- training progress */

export function useTrainingProgress() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-training-progress', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_training_progress')
        .select('*')
        .eq('household_id', householdId!)
        .order('week_number');
      if (error) throw error;
      return data ?? [];
    },
  });

  const byWeek = useMemo(() => {
    const map = new Map<number, WeekProgress & { completed_at: string | null; notes: string | null }>();
    for (const row of query.data ?? []) {
      map.set(row.week_number, {
        lessons_completed: row.lessons_completed,
        charts_analyzed: row.charts_analyzed,
        setups_analyzed: row.setups_analyzed,
        candidates_built: row.candidates_built,
        paper_trades_taken: row.paper_trades_taken,
        completed_at: row.completed_at,
        notes: row.notes,
      });
    }
    return map;
  }, [query.data]);

  const currentWeek = useMemo(() => {
    const week = TRAINING_WEEKS.find((w) => !byWeek.get(w.week)?.completed_at);
    return week?.week ?? TRAINING_WEEKS.length;
  }, [byWeek]);

  const saveWeek = useMutation({
    mutationFn: async (input: {
      week: number;
      progress: Partial<WeekProgress>;
      notes?: string | null;
      completed?: boolean;
    }) => {
      if (!householdId) throw new Error('No household');
      const existing = byWeek.get(input.week);
      const { error } = await supabase.from('se_training_progress').upsert(
        {
          household_id: householdId,
          week_number: input.week,
          lessons_completed: input.progress.lessons_completed ?? existing?.lessons_completed ?? 0,
          charts_analyzed: input.progress.charts_analyzed ?? existing?.charts_analyzed ?? 0,
          setups_analyzed: input.progress.setups_analyzed ?? existing?.setups_analyzed ?? 0,
          candidates_built: input.progress.candidates_built ?? existing?.candidates_built ?? 0,
          paper_trades_taken: input.progress.paper_trades_taken ?? existing?.paper_trades_taken ?? 0,
          notes: input.notes ?? existing?.notes ?? null,
          completed_at:
            input.completed === undefined
              ? (existing?.completed_at ?? null)
              : input.completed
                ? new Date().toISOString()
                : null,
        },
        { onConflict: 'household_id,week_number' },
      );
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['se-training-progress'] }),
  });

  return {
    byWeek,
    currentWeek,
    isLoading: query.isLoading,
    saveWeek: saveWeek.mutateAsync,
    isSaving: saveWeek.isPending,
  };
}

/* --------------------------------------------------------- weekly reviews */

export interface WeeklyReview {
  id: string;
  week_start: string;
  trades_taken: number;
  rule_following_pct: number;
  execution_score: number;
  best_skip_symbol: string | null;
  best_skip_reason: string | null;
  lesson_to_revisit: string | null;
  notes: string | null;
}

export function useWeeklyReviews() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-weekly-reviews', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<WeeklyReview[]> => {
      const { data, error } = await supabase
        .from('se_weekly_reviews')
        .select('*')
        .eq('household_id', householdId!)
        .order('week_start', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        week_start: r.week_start,
        trades_taken: r.trades_taken,
        rule_following_pct: Number(r.rule_following_pct),
        execution_score: Number(r.execution_score),
        best_skip_symbol: r.best_skip_symbol,
        best_skip_reason: r.best_skip_reason,
        lesson_to_revisit: r.lesson_to_revisit,
        notes: r.notes,
      }));
    },
  });

  const saveReview = useMutation({
    mutationFn: async (input: Omit<WeeklyReview, 'id'>) => {
      if (!householdId) throw new Error('No household');
      const { error } = await supabase
        .from('se_weekly_reviews')
        .upsert({ household_id: householdId, ...input }, { onConflict: 'household_id,week_start' });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['se-weekly-reviews'] }),
  });

  const deleteReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_weekly_reviews').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['se-weekly-reviews'] }),
  });

  return {
    reviews: query.data ?? [],
    isLoading: query.isLoading,
    saveReview: saveReview.mutateAsync,
    deleteReview: deleteReview.mutateAsync,
    isSaving: saveReview.isPending,
  };
}

/* ------------------------------------------------------------- graduation */

/** Behaviour-based readiness, assembled from the real trade and journal record. */
export function useGraduation() {
  const { settings } = useTradingSettings();
  const { trades, modifications } = usePaperTradeManagement();
  const { entries } = useTradeJournal();
  const { reviews } = useWeeklyReviews();

  const closed = useMemo(() => trades.filter((t) => t.status === 'CLOSED'), [trades]);

  const stats = useMemo(
    () =>
      computeStats(
        closed.map((t) => ({
          id: t.id,
          symbol: t.symbol,
          status: t.status,
          setup_type: t.setup_type,
          entry_price: t.entry_price,
          entry_date: t.entry_date,
          stop_price: t.stop_price,
          target_price: t.target_price,
          shares: t.shares,
          initial_dollar_risk: t.initial_dollar_risk,
          exit_price: t.exit_price,
          exit_date: t.exit_date,
          exit_reason: t.exit_reason,
          realized_pl: t.realized_pl,
          rules_followed: null,
          notes: t.notes,
        })),
      ),
    [closed],
  );

  const journaledIds = useMemo(
    () => new Set((entries ?? []).map((e) => e.paper_trade_id).filter(Boolean)),
    [entries],
  );

  const result = useMemo(() => {
    const scored = closed.filter((t) => t.execution_score !== null);
    const avgExecutionScore = scored.length
      ? round2(scored.reduce((s, t) => s + (t.execution_score ?? 0), 0) / scored.length)
      : 0;
    const followed = closed.filter((t) => (t.execution_score ?? 0) >= 75).length;
    const journaled = closed.filter((t) => journaledIds.has(t.id)).length;

    return assessGraduation({
      closedPaperTrades: closed.length,
      rulesFollowedPct: closed.length ? (followed / closed.length) * 100 : 0,
      journaledPct: closed.length ? (journaled / closed.length) * 100 : 0,
      avgExecutionScore,
      stopsWidened: modifications.filter((m) => m.widened).length,
      chasedEntries: 0,
      weeklyReviews: reviews.length,
      expectancy: closed.length ? stats.averageR : null,
      minPaperTrades: settings.training_min_paper_trades,
    });
  }, [closed, modifications, reviews.length, journaledIds, stats.averageR, settings.training_min_paper_trades]);

  return { result, closedCount: closed.length, stats };
}
