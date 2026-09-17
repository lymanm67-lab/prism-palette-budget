// SwingEdge — portfolio risk snapshot data layer.
//
// Reads open paper trades (live risk) and armed/saved plans (risk that only
// appears if the order triggers), then grades the whole book. Filled positions
// and resting conditional orders are never added together as if both were live.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useTradingSettings } from '@/hooks/use-swingedge';
import {
  buildRiskSnapshot,
  DEFAULT_RISK_LIMITS,
  type OrderStatus,
  type RiskLimits,
  type RiskTradeInput,
} from '@/lib/swingedge/portfolioRiskSnapshot';

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

interface OpenRow {
  id: string;
  symbol: string;
  sector: string | null;
  shares: number | null;
  entry_price: number | null;
  stop_price: number | null;
  target_price: number | null;
  atr_at_entry: number | null;
}

interface PlanRow {
  id: string;
  symbol: string;
  plan_state: string | null;
  status: string | null;
  planned_entry: number | null;
  planned_stop: number | null;
  planned_target: number | null;
  shares: number | null;
}

/** Armed plan states mapped onto Thinkorswim order language. */
function statusForPlan(planState: string | null): OrderStatus {
  if (planState === 'CONDITION_MET') return 'WORKING';
  return 'WAIT_COND';
}

export function useRiskSnapshot() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const { settings } = useTradingSettings();

  const openQuery = useQuery({
    queryKey: ['se-risk-open', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select('id, symbol, sector, shares, entry_price, stop_price, target_price, atr_at_entry')
        .eq('household_id', householdId!)
        .eq('status', 'OPEN');
      if (error) throw error;
      return (data ?? []) as unknown as OpenRow[];
    },
  });

  const pendingQuery = useQuery({
    queryKey: ['se-risk-pending', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_trade_plans')
        .select('id, symbol, plan_state, status, planned_entry, planned_stop, planned_target, shares')
        .eq('household_id', householdId!)
        .in('plan_state', [
          'READY_TO_ARM',
          'WAITING_FOR_CONDITION',
          'CONDITION_MET',
          'REVALIDATION_REQUIRED',
        ]);
      if (error) throw error;
      return (data ?? []) as unknown as PlanRow[];
    },
  });

  const limits: RiskLimits = useMemo(
    () => ({
      ...DEFAULT_RISK_LIMITS,
      minRewardRisk: settings.min_reward_risk ?? DEFAULT_RISK_LIMITS.minRewardRisk,
    }),
    [settings.min_reward_risk],
  );

  const trades: RiskTradeInput[] = useMemo(() => {
    const live: RiskTradeInput[] = (openQuery.data ?? []).map((t) => ({
      id: t.id,
      symbol: t.symbol,
      sector: t.sector,
      status: 'FILLED' as OrderStatus,
      entry: num(t.entry_price),
      stop: num(t.stop_price),
      target: num(t.target_price),
      shares: num(t.shares),
      atr: num(t.atr_at_entry),
    }));
    const pending: RiskTradeInput[] = (pendingQuery.data ?? [])
      .filter((p) => p.status !== 'EXECUTED' && p.status !== 'CANCELLED')
      .map((p) => ({
        id: p.id,
        symbol: p.symbol,
        sector: null,
        status: statusForPlan(p.plan_state),
        entry: num(p.planned_entry),
        stop: num(p.planned_stop),
        target: num(p.planned_target),
        shares: num(p.shares),
        atr: null,
      }));
    return [...live, ...pending];
  }, [openQuery.data, pendingQuery.data]);

  const snapshot = useMemo(() => buildRiskSnapshot(trades, limits), [trades, limits]);

  return {
    snapshot,
    isLoading: openQuery.isLoading || pendingQuery.isLoading,
    hasData: trades.length > 0,
  };
}
