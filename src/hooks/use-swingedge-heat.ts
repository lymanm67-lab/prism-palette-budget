// SwingEdge — portfolio heat, sector exposure and correlation for the household.
// Reads open paper trades, groups them by sector, and reports risk-based heat.

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useTradingSettings } from '@/hooks/use-swingedge';
import {
  summarizeHeat,
  checkTradeAgainstHeat,
  maxSharesWithinHeat,
  type HeatLimits,
  type OpenPositionInput,
  type ProposedTrade,
} from '@/lib/swingedge/portfolioHeat';
import {
  checkCorrelation,
  type CorrelationConfig,
  type CorrelationLimit,
  type SymbolProfile,
} from '@/lib/swingedge/correlation';

interface OpenTradeRow {
  id: string;
  symbol: string;
  sector: string | null;
  shares: number;
  entry_price: number;
  current_price: number | null;
  stop_price: number;
  original_stop: number | null;
}

export function usePortfolioHeat() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const { settings } = useTradingSettings();
  const qc = useQueryClient();

  const openQuery = useQuery({
    queryKey: ['se-open-positions', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select('id, symbol, sector, shares, entry_price, current_price, stop_price, original_stop')
        .eq('household_id', householdId!)
        .eq('status', 'OPEN');
      if (error) throw error;
      return (data ?? []) as unknown as OpenTradeRow[];
    },
  });

  const limits: HeatLimits = useMemo(
    () => ({
      tradingCapital: settings.trading_capital,
      maxPortfolioHeatPct: settings.max_portfolio_risk_pct,
      maxSectorCapitalExposurePct: settings.max_sector_capital_exposure_pct ?? 25,
      maxSectorHeatPct: settings.max_sector_heat_pct ?? 2.5,
    }),
    [
      settings.trading_capital,
      settings.max_portfolio_risk_pct,
      settings.max_sector_capital_exposure_pct,
      settings.max_sector_heat_pct,
    ],
  );

  const positions: OpenPositionInput[] = useMemo(
    () =>
      (openQuery.data ?? []).map((t) => ({
        id: t.id,
        symbol: t.symbol,
        sector: t.sector,
        shares: Number(t.shares),
        entryPrice: Number(t.entry_price),
        currentPrice: t.current_price === null ? null : Number(t.current_price),
        originalStop: Number(t.original_stop ?? t.stop_price),
        currentStop: Number(t.stop_price),
      })),
    [openQuery.data],
  );

  const summary = useMemo(() => summarizeHeat(positions, limits), [positions, limits]);

  const correlationConfig: CorrelationConfig = useMemo(
    () => ({
      lookbackDays: settings.correlation_lookback_days ?? 60,
      minSamples: 30,
      thresholds: {
        moderate: settings.correlation_moderate ?? 0.4,
        high: settings.correlation_high ?? 0.6,
        veryHigh: settings.correlation_very_high ?? 0.8,
      },
    }),
    [
      settings.correlation_lookback_days,
      settings.correlation_moderate,
      settings.correlation_high,
      settings.correlation_very_high,
    ],
  );

  const correlationLimit: CorrelationLimit = useMemo(
    () => ({
      band: 'HIGH',
      maxCorrelatedRisk:
        Math.round(
          ((settings.trading_capital * (settings.max_correlated_risk_pct ?? 2.5)) / 100) * 100,
        ) / 100,
    }),
    [settings.trading_capital, settings.max_correlated_risk_pct],
  );

  const checkTrade = useCallback(
    (trade: ProposedTrade) => checkTradeAgainstHeat(trade, summary),
    [summary],
  );

  const checkCorrelated = useCallback(
    (candidate: SymbolProfile, candidateRisk: number, profiles: Record<string, SymbolProfile> = {}) =>
      checkCorrelation(
        candidate,
        summary.positions.map((p) => ({
          profile: profiles[p.symbol] ?? { symbol: p.symbol, sector: p.sector },
          currentRisk: p.currentRisk,
        })),
        candidateRisk,
        correlationLimit,
        correlationConfig,
      ),
    [summary.positions, correlationLimit, correlationConfig],
  );

  const sharesWithinHeat = useCallback(
    (entry: number, stop: number) => maxSharesWithinHeat(entry, stop, summary),
    [summary],
  );

  /** Snapshot today's heat reading so history is reviewable later. */
  const recordSnapshot = useCallback(async () => {
    if (!householdId) return;
    const { error } = await supabase.from('se_heat_history').insert({
      household_id: householdId,
      trading_capital: summary.tradingCapital,
      open_risk: summary.openRisk,
      original_risk: summary.originalRisk,
      locked_profit: summary.lockedProfit,
      heat_pct: summary.heatPct,
      max_heat_dollars: summary.maxHeatDollars,
      invested_capital: summary.investedCapital,
      open_positions: summary.positions.length,
      sector_breakdown: summary.sectors as unknown as never,
    });
    if (error) throw error;
    qc.invalidateQueries({ queryKey: ['se-heat-history', householdId] });
  }, [householdId, summary, qc]);

  return {
    summary,
    limits,
    correlationConfig,
    correlationLimit,
    checkTrade,
    checkCorrelated,
    sharesWithinHeat,
    recordSnapshot,
    isLoading: openQuery.isLoading,
  };
}
