// SwingEdge Analyzer — Stop-Loss Strategy Engine data layer.
// Trade plans, paper trade management and the stop modification log.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { loadCandles, useTradingSettings } from '@/hooks/use-swingedge';
import { atr, last, setupState, snapshot, type IndicatorSnapshot, type SetupState } from '@/lib/swingedge/indicators';
import { candleBasis, entryZone } from '@/lib/swingedge/signalLifecycle';
import { revalidateSignal } from '@/lib/swingedge/revalidation';
import {
  classifyOutcome,
  compareLoss,
  liquidityTier,
  scoreExecutionQuality,
  scoreSignalQuality,
  simulateFill,
  stopExitReference,
  type LiquidityTier,
} from '@/lib/swingedge/execution';
import type { Candle } from '@/lib/swingedge/types';


const num = (v: unknown): number => Number(v ?? 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

/* --------------------------------------------------------------- levels */

export interface SymbolLevels {
  snapshot: IndicatorSnapshot | null;
  setup: SetupState;
  swingLow: number | null;
  pullbackLow: number | null;
  priorHigh: number | null;
  breakoutLevel: number | null;
  retestLow: number | null;
  rangeHeight: number | null;
  candles: Candle[];
  notice: string | null;
  source: string;
}

/** Lowest low of the last n candles — the level a swing thesis leans on. */
function lowestLow(candles: Candle[], n: number): number | null {
  if (candles.length < 2) return null;
  const w = candles.slice(-n);
  return w.length ? round2(Math.min(...w.map((c) => c.low))) : null;
}

function highestHigh(candles: Candle[], n: number, offset = 0): number | null {
  if (candles.length < 2) return null;
  const end = candles.length - offset;
  const w = candles.slice(Math.max(0, end - n), end);
  return w.length ? round2(Math.max(...w.map((c) => c.high))) : null;
}

/** Structural levels for one symbol, cache-first so no credits are wasted. */
export function useSymbolLevels(symbol: string) {
  const { settings } = useTradingSettings();
  const sym = symbol.trim().toUpperCase();

  return useQuery({
    queryKey: ['se-levels', sym, settings.data_mode],
    enabled: sym.length >= 1,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<SymbolLevels> => {
      const { candles, notice, source } = await loadCandles(sym, '1day', settings.data_mode);
      const snap = snapshot(candles);
      const setup = candles.length ? setupState(candles) : 'NONE';
      const swingLow = lowestLow(candles, 10);
      const pullbackLow = lowestLow(candles, 5);
      const priorHigh = highestHigh(candles, 40, 1);
      const breakoutLevel = highestHigh(candles, 20, 1);
      const retestLow = lowestLow(candles, 3);
      const rangeHeight =
        breakoutLevel !== null && swingLow !== null ? round2(breakoutLevel - swingLow) : null;
      return {
        snapshot: snap,
        setup,
        swingLow,
        pullbackLow,
        priorHigh,
        breakoutLevel,
        retestLow,
        rangeHeight,
        candles,
        notice,
        source,
      };
    },
  });
}

/* ----------------------------------------------------------- trade plans */

export interface TradePlanRow {
  id: string;
  symbol: string;
  status: string;
  setup_type: string | null;
  planned_entry: number;
  planned_stop: number;
  planned_target: number;
  shares: number | null;
  risk_per_share: number | null;
  dollar_risk: number | null;
  position_value: number | null;
  potential_gain: number | null;
  reward_risk: number | null;
  verdict: string | null;
  invalidation: string | null;
  why_qualifies: string | null;
  stop_strategy: string;
  structure_level: number | null;
  atr_value: number | null;
  atr_multiple: number | null;
  stop_buffer_pct: number | null;
  stop_quality: string | null;
  why_stop_here: string | null;
  target_method: string | null;
  earnings_reviewed: boolean;
  override_reason: string | null;
  created_at: string;
}

export type TradePlanInput = Omit<TradePlanRow, 'id' | 'created_at'> & { id?: string };

export function useTradePlans() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const { settings } = useTradingSettings();
  const qc = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['se-trade-plans', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<TradePlanRow[]> => {
      const { data, error } = await supabase
        .from('se_trade_plans')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p) => ({
        id: p.id,
        symbol: p.symbol,
        status: p.status,
        setup_type: p.setup_type,
        planned_entry: num(p.planned_entry),
        planned_stop: num(p.planned_stop),
        planned_target: num(p.planned_target),
        shares: p.shares,
        risk_per_share: p.risk_per_share === null ? null : num(p.risk_per_share),
        dollar_risk: p.dollar_risk === null ? null : num(p.dollar_risk),
        position_value: p.position_value === null ? null : num(p.position_value),
        potential_gain: p.potential_gain === null ? null : num(p.potential_gain),
        reward_risk: p.reward_risk === null ? null : num(p.reward_risk),
        verdict: p.verdict,
        invalidation: p.invalidation,
        why_qualifies: p.why_qualifies,
        stop_strategy: p.stop_strategy ?? 'STRUCTURE',
        structure_level: p.structure_level === null ? null : num(p.structure_level),
        atr_value: p.atr_value === null ? null : num(p.atr_value),
        atr_multiple: p.atr_multiple === null ? null : num(p.atr_multiple),
        stop_buffer_pct: p.stop_buffer_pct === null ? null : num(p.stop_buffer_pct),
        stop_quality: p.stop_quality,
        why_stop_here: p.why_stop_here,
        target_method: p.target_method,
        earnings_reviewed: !!p.earnings_reviewed,
        override_reason: p.override_reason,
        created_at: p.created_at,
      }));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['se-trade-plans'] });
    qc.invalidateQueries({ queryKey: ['se-paper-trades'] });
    qc.invalidateQueries({ queryKey: ['se-open-risk'] });
  };

  const savePlan = useMutation({
    mutationFn: async (input: TradePlanInput) => {
      if (!householdId) throw new Error('No household');
      const row = { ...input, household_id: householdId };
      delete (row as Record<string, unknown>).id;
      if (input.id) {
        const { error } = await supabase.from('se_trade_plans').update(row).eq('id', input.id);
        if (error) throw error;
        return input.id;
      }
      const { data, error } = await supabase.from('se_trade_plans').insert(row).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: invalidate,
  });

  const deletePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('se_trade_plans').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /**
   * Opens a paper trade and locks the original plan values on it.
   *
   * Revalidation is MANDATORY here, not advisory. A plan saved days ago, or one
   * whose price has walked away from the approved entry zone, is refused and the
   * reason is recorded. This is the last gate before execution.
   */
  const openPaperTrade = useMutation({
    mutationFn: async (plan: TradePlanRow) => {
      if (!householdId) throw new Error('No household');

      const fresh = await loadCandles(plan.symbol, '1day', settings.data_mode, 120);
      const basis = candleBasis(fresh.candles, '1day');
      const atrValue = fresh.candles.length >= 15 ? last(atr(fresh.candles, 14)) : null;
      const price = fresh.candles.length ? fresh.candles[fresh.candles.length - 1].close : 0;
      const zone = entryZone(plan.planned_entry, atrValue);

      const verdict = revalidateSignal(
        {
          symbol: plan.symbol,
          signal: 'GO',
          entryZone: zone,
          entry: plan.planned_entry,
          atrValue,
          capturedAt: plan.created_at,
          lastCompletedCandle: basis.lastCompletedAt,
        },
        { price, lastCompletedCandle: basis.lastCompletedAt },
        { maxAgeDays: settings.signal_max_age_days, beforePaperTrade: true },
      );

      // Record the check either way, so review compares against what was known.
      await supabase.from('se_signal_revalidations').insert({
        household_id: householdId,
        symbol: plan.symbol,
        previous_signal: 'GO',
        new_signal: verdict.effectiveSignal,
        previous_entry_low: zone.low,
        previous_entry_high: zone.high,
        current_price: price,
        reason: verdict.reasons.join(' '),
        triggers: verdict.triggers,
      });

      if (!verdict.usable) {
        throw new Error(`${verdict.headline} ${verdict.reasons.join(' ')}`);
      }

      const shares = plan.shares ?? 0;
      const risk = plan.dollar_risk ?? round2((plan.planned_entry - plan.planned_stop) * shares);
      const { error } = await supabase.from('se_paper_trades').insert({
        household_id: householdId,
        trade_plan_id: plan.id,
        symbol: plan.symbol,
        setup_type: plan.setup_type,
        entry_price: plan.planned_entry,
        stop_price: plan.planned_stop,
        target_price: plan.planned_target,
        shares,
        initial_dollar_risk: risk,
        original_stop: plan.planned_stop,
        original_target: plan.planned_target,
        original_shares: shares,
        original_risk: risk,
        invalidation: plan.invalidation,
        stop_strategy: plan.stop_strategy,
        earnings_ack: plan.earnings_reviewed,
        planned_stop: plan.planned_stop,
        current_price: price,
        revalidated_at: verdict.checkedAt,
        status: 'OPEN',
      });
      if (error) throw error;
      const { error: e2 } = await supabase
        .from('se_trade_plans')
        .update({ status: 'EXECUTED' })
        .eq('id', plan.id);
      if (e2) throw e2;
    },
    onSuccess: invalidate,
  });

  return {
    plans: plansQuery.data ?? [],
    isLoading: plansQuery.isLoading,
    savePlan: savePlan.mutateAsync,
    deletePlan: deletePlan.mutateAsync,
    openPaperTrade: openPaperTrade.mutateAsync,
    isSaving: savePlan.isPending || openPaperTrade.isPending || deletePlan.isPending,
  };
}

/* --------------------------------------------------- paper trade management */

export interface ManagedTrade {
  id: string;
  symbol: string;
  status: string;
  setup_type: string | null;
  entry_price: number;
  entry_date: string;
  stop_price: number;
  target_price: number;
  shares: number;
  initial_dollar_risk: number | null;
  original_stop: number | null;
  original_target: number | null;
  original_shares: number | null;
  original_risk: number | null;
  invalidation: string | null;
  stop_strategy: string | null;
  trailing_method: string | null;
  breakeven_trigger: string | null;
  exit_price: number | null;
  exit_date: string | null;
  exit_reason: string | null;
  realized_pl: number | null;
  notes: string | null;
}

export interface StopModification {
  id: string;
  paper_trade_id: string;
  old_stop: number;
  new_stop: number;
  method: string | null;
  reason: string;
  risk_before: number | null;
  risk_after: number | null;
  widened: boolean;
  rule_followed: boolean | null;
  created_at: string;
}

export const EXIT_REASONS = [
  'Stop hit',
  'Target hit',
  'Trailing stop exit',
  'Breakeven stop exit',
  'Manual exit — thesis changed',
  'Manual exit — changed my mind',
] as const;

/** Open and closed paper trades, their live-ish prices and stop history. */
export function usePaperTradeManagement() {
  const { household } = useHousehold();
  const { settings } = useTradingSettings();
  const householdId = household?.id;
  const qc = useQueryClient();

  const tradesQuery = useQuery({
    queryKey: ['se-managed-trades', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<ManagedTrade[]> => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select('*')
        .eq('household_id', householdId!)
        .order('entry_date', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        status: t.status,
        setup_type: t.setup_type,
        entry_price: num(t.entry_price),
        entry_date: t.entry_date,
        stop_price: num(t.stop_price),
        target_price: num(t.target_price),
        shares: Number(t.shares),
        initial_dollar_risk: t.initial_dollar_risk === null ? null : num(t.initial_dollar_risk),
        original_stop: t.original_stop === null ? null : num(t.original_stop),
        original_target: t.original_target === null ? null : num(t.original_target),
        original_shares: t.original_shares === null ? null : Number(t.original_shares),
        original_risk: t.original_risk === null ? null : num(t.original_risk),
        invalidation: t.invalidation,
        stop_strategy: t.stop_strategy,
        trailing_method: t.trailing_method,
        breakeven_trigger: t.breakeven_trigger,
        exit_price: t.exit_price === null ? null : num(t.exit_price),
        exit_date: t.exit_date,
        exit_reason: t.exit_reason,
        realized_pl: t.realized_pl === null ? null : num(t.realized_pl),
        notes: t.notes,
      }));
    },
  });

  const trades = tradesQuery.data ?? [];
  const openTrades = useMemo(() => trades.filter((t) => t.status === 'OPEN'), [trades]);
  const openSymbols = useMemo(() => [...new Set(openTrades.map((t) => t.symbol))], [openTrades]);

  const pricesQuery = useQuery({
    queryKey: ['se-managed-prices', openSymbols, settings.data_mode],
    enabled: openSymbols.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const out: Record<string, { price: number; ema20: number | null; atr: number | null; swingLow: number | null }> = {};
      for (const s of openSymbols) {
        const { candles } = await loadCandles(s, '1day', settings.data_mode);
        const snap = snapshot(candles);
        if (!snap) continue;
        out[s] = {
          price: round2(snap.price),
          ema20: snap.ema20,
          atr: snap.atr14,
          swingLow: lowestLow(candles, 10),
        };
      }
      return out;
    },
  });

  const modsQuery = useQuery({
    queryKey: ['se-stop-mods', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<StopModification[]> => {
      const { data, error } = await supabase
        .from('se_stop_modifications')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((m) => ({
        id: m.id,
        paper_trade_id: m.paper_trade_id,
        old_stop: num(m.old_stop),
        new_stop: num(m.new_stop),
        method: m.method,
        reason: m.reason,
        risk_before: m.risk_before === null ? null : num(m.risk_before),
        risk_after: m.risk_after === null ? null : num(m.risk_after),
        widened: !!m.widened,
        rule_followed: m.rule_followed,
        created_at: m.created_at,
      }));
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['se-managed-trades'] });
    qc.invalidateQueries({ queryKey: ['se-paper-trades'] });
    qc.invalidateQueries({ queryKey: ['se-stop-mods'] });
    qc.invalidateQueries({ queryKey: ['se-open-risk'] });
  };

  const moveStop = useMutation({
    mutationFn: async (input: {
      trade: ManagedTrade;
      newStop: number;
      reason: string;
      method?: string | null;
      riskBefore: number;
      riskAfter: number;
      widened: boolean;
      trailingMethod?: string | null;
      breakevenTrigger?: string | null;
    }) => {
      if (!householdId) throw new Error('No household');
      const { error } = await supabase
        .from('se_paper_trades')
        .update({
          stop_price: input.newStop,
          trailing_method: input.trailingMethod ?? input.trade.trailing_method,
          breakeven_trigger: input.breakevenTrigger ?? input.trade.breakeven_trigger,
        })
        .eq('id', input.trade.id);
      if (error) throw error;
      const { error: logError } = await supabase.from('se_stop_modifications').insert({
        household_id: householdId,
        paper_trade_id: input.trade.id,
        old_stop: input.trade.stop_price,
        new_stop: input.newStop,
        method: input.method ?? input.trade.stop_strategy,
        reason: input.reason,
        risk_before: input.riskBefore,
        risk_after: input.riskAfter,
        widened: input.widened,
        rule_followed: !input.widened,
      });
      if (logError) throw logError;
    },
    onSuccess: invalidate,
  });

  // Closing a trade is where the plan meets the market. The exit price the user
  // types is a request, not a fill: slippage works against it, and a session that
  // opened past the stop means the stop never traded. The result is then split
  // three ways — was the setup sound, was the plan followed, and what did the
  // money do — so a disciplined loss is never mistaken for a mistake.
  const closeTrade = useMutation({
    mutationFn: async (input: { trade: ManagedTrade; exitPrice: number; reason: string; date?: string }) => {
      const { trade } = input;
      const stopExit = /stop/i.test(input.reason);

      let tier: LiquidityTier = 'THIN';
      let nextOpen: number | null = null;
      try {
        const { candles } = await loadCandles(trade.symbol, '1day', settings.data_mode);
        const recent = candles.slice(-20);
        if (recent.length) {
          const avgDollarVolume =
            recent.reduce((s, c) => s + c.close * c.volume, 0) / recent.length;
          tier = liquidityTier(avgDollarVolume);
        }
        // A stop exit only fills at the stop when the session traded through it.
        // If the last completed session opened below the stop, that open is the
        // earliest price the exit could realistically have got.
        const lastCandle = last(candles);
        if (stopExit && lastCandle) {
          const ref = stopExitReference(trade.stop_price, lastCandle);
          if (ref.gapped) nextOpen = ref.reference;
        }
      } catch {
        // No fresh candles — fall back to the cautious tier and no gap.
      }

      const fill = simulateFill({
        side: 'SELL',
        requested: input.exitPrice,
        shares: trade.shares,
        tier,
        nextOpen,
      });

      const pl = round2((fill.filled - trade.entry_price) * trade.shares);
      const plannedStop = trade.planned_stop ?? trade.original_stop ?? trade.stop_price;
      const loss = compareLoss({
        entryFill: trade.entry_price,
        exitFill: fill.filled,
        plannedEntry: trade.entry_price,
        plannedStop,
        shares: trade.original_shares ?? trade.shares,
      });

      // Did the stop ever move away from price on this trade?
      const widened = (modsQuery.data ?? []).some((m) => m.paper_trade_id === trade.id && m.widened);
      const rr =
        trade.stop_price < trade.entry_price
          ? round2((trade.target_price - trade.entry_price) / (trade.entry_price - trade.stop_price))
          : null;

      const signal = scoreSignalQuality({
        hybridScore: null,
        stopJustified: !widened && !!trade.invalidation,
        rewardRisk: rr,
        minimumRewardRisk: settings.min_reward_risk ?? 2,
        hardGateFailures: 0,
        setupPresent: !!trade.setup_type,
      });

      const execution = scoreExecutionQuality({
        enteredInZone: true,
        stopDefinedBeforeEntry: !!trade.original_stop,
        stopWidened: widened,
        exitFollowedPlan: !/changed my mind/i.test(input.reason),
        sizeCalculatedFirst: !!trade.initial_dollar_risk,
        revalidatedBeforeEntry: !!trade.revalidated_at,
        journaled: true,
      });

      const outcome = classifyOutcome({
        signalQuality: signal.quality,
        executionScore: execution.score,
        realizedPl: pl,
      });

      const { error } = await supabase
        .from('se_paper_trades')
        .update({
          status: 'CLOSED',
          exit_price: input.exitPrice,
          exit_date: input.date ?? new Date().toISOString().slice(0, 10),
          exit_reason: input.reason,
          realized_pl: pl,
          simulated_fill: fill.filled,
          slippage: fill.slippagePerShare,
          gap_difference: fill.gapDifference,
          planned_loss: loss.plannedLoss,
          actual_simulated_loss: loss.actualLoss,
          execution_score: execution.score,
          signal_quality: signal.quality,
          outcome_class: outcome.outcome,
        })
        .eq('id', trade.id);
      if (error) throw error;

      return { fill, loss, execution, signal, outcome, realizedPl: pl };
    },
    onSuccess: invalidate,
  });


  const openRisk = useMemo(
    () =>
      round2(
        openTrades.reduce((sum, t) => sum + Math.max(0, t.entry_price - t.stop_price) * t.shares, 0),
      ),
    [openTrades],
  );

  const unrealized = useMemo(() => {
    const prices = pricesQuery.data ?? {};
    return round2(
      openTrades.reduce((sum, t) => {
        const p = prices[t.symbol]?.price;
        return p ? sum + (p - t.entry_price) * t.shares : sum;
      }, 0),
    );
  }, [openTrades, pricesQuery.data]);

  const realized = useMemo(
    () =>
      round2(
        trades.filter((t) => t.status === 'CLOSED').reduce((s, t) => s + (t.realized_pl ?? 0), 0),
      ),
    [trades],
  );

  return {
    trades,
    openTrades,
    closedTrades: trades.filter((t) => t.status === 'CLOSED'),
    prices: pricesQuery.data ?? {},
    modifications: modsQuery.data ?? [],
    openRisk,
    unrealized,
    realized,
    isLoading: tradesQuery.isLoading,
    isPricing: pricesQuery.isLoading,
    moveStop: moveStop.mutateAsync,
    closeTrade: closeTrade.mutateAsync,
    isSaving: moveStop.isPending || closeTrade.isPending,
  };
}
