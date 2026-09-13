// SwingEdge — closed trade results in R, for the Risk Lab and Performance splits.
//
// R comes from the trade's own planned risk: a trade that made twice what it
// risked is +2R. Trades without a recorded planned risk are excluded rather than
// estimated, so nothing here is inferred from a guess.

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { RTrade } from '@/lib/swingedge/expectancy';

export interface ClosedTradeRow extends RTrade {
  outcomeClass: string | null;
  eventDecision: string | null;
  readinessScore: number | null;
}

export function useClosedRTrades() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;

  const query = useQuery({
    queryKey: ['se-closed-r-trades', householdId],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async (): Promise<ClosedTradeRow[]> => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select(
          'id, symbol, setup_type, realized_pl, initial_dollar_risk, planned_loss, exit_date, outcome_class, event_risk_band, event_decision, bias_direction, earnings_within_hold, readiness_score',
        )
        .eq('household_id', householdId!)
        .eq('status', 'CLOSED')
        .order('exit_date', { ascending: true })
        .limit(1000);
      if (error) throw error;

      return (data ?? [])
        .map((t) => {
          const risk = Number(t.initial_dollar_risk ?? t.planned_loss ?? 0);
          const pl = Number(t.realized_pl ?? 0);
          if (!Number.isFinite(risk) || risk <= 0 || !Number.isFinite(pl)) return null;
          return {
            id: String(t.id),
            symbol: t.symbol ?? undefined,
            r: pl / risk,
            setupType: t.setup_type ?? null,
            biasDirection: t.bias_direction ?? null,
            eventRiskBand: t.event_risk_band ?? null,
            nearEarnings: t.earnings_within_hold ?? null,
            closedAt: t.exit_date ?? null,
            outcomeClass: t.outcome_class ?? null,
            eventDecision: t.event_decision ?? null,
            readinessScore: t.readiness_score ?? null,
          } as ClosedTradeRow;
        })
        .filter((r): r is ClosedTradeRow => r !== null);
    },
  });

  const trades = useMemo(() => query.data ?? [], [query.data]);
  return { trades, isLoading: query.isLoading, error: query.error };
}
