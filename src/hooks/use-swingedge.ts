// SwingEdge Analyzer — data orchestration.
// Settings and provider status live in the database; market candles are read
// from the shared cache first and only fetched when they are not Fresh.

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { INDEX_SYMBOLS, classifyMarket, readIndex, type IndexReading } from '@/lib/swingedge/marketCondition';
import { cacheStatus, needsRefresh } from '@/lib/swingedge/cache';
import { ProviderUnavailableError, providerFor, twelveData } from '@/lib/swingedge/provider';
import { portfolioRisk } from '@/lib/swingedge/risk';
import type { Candle, DataMode, SwingInterval } from '@/lib/swingedge/types';

export interface TradingSettings {
  id?: string;
  data_mode: DataMode;
  api_provider: string;
  api_minute_limit: number;
  api_daily_limit: number;
  trading_capital: number;
  risk_per_trade_pct: number;
  max_portfolio_risk_pct: number;
  advanced_mode: boolean;
  // Heat, sector and correlation limits. All configurable, none universal.
  max_sector_capital_exposure_pct: number;
  max_sector_heat_pct: number;
  correlation_lookback_days: number;
  correlation_moderate: number;
  correlation_high: number;
  correlation_very_high: number;
  max_correlated_risk_pct: number;
  commission_per_trade: number;
  signal_max_age_days: number;
  breaker_consecutive_losses: number;
  /** Loss ceilings held as R multiples; dollars are derived from the balance. */
  breaker_daily_loss_r: number;
  breaker_weekly_loss_r: number;
  /** Legacy fixed-dollar ceilings, kept as a fallback only. */
  breaker_daily_loss_limit: number;
  breaker_weekly_loss_limit: number;

  training_min_paper_trades: number;
  training_mode_enabled: boolean;
}

const DEFAULT_SETTINGS: TradingSettings = {
  data_mode: 'DEMO',
  api_provider: 'TWELVE_DATA',
  api_minute_limit: 8,
  api_daily_limit: 800,
  trading_capital: 5000,
  risk_per_trade_pct: 1,
  max_portfolio_risk_pct: 5,
  advanced_mode: false,
  max_sector_capital_exposure_pct: 25,
  max_sector_heat_pct: 2.5,
  correlation_lookback_days: 60,
  correlation_moderate: 0.4,
  correlation_high: 0.6,
  correlation_very_high: 0.8,
  max_correlated_risk_pct: 2.5,
  commission_per_trade: 0,
  signal_max_age_days: 3,
  breaker_consecutive_losses: 3,
  breaker_daily_loss_r: 2,
  breaker_weekly_loss_r: 5,
  breaker_daily_loss_limit: 0,
  breaker_weekly_loss_limit: 0,

  training_min_paper_trades: 20,
  training_mode_enabled: false,
};

/** Settings, provider status and the risk envelope for the household. */
export function useTradingSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const householdId = household?.id;

  const settingsQuery = useQuery({
    queryKey: ['se-trading-settings', householdId],
    enabled: !!householdId,
    queryFn: async (): Promise<TradingSettings> => {
      const { data, error } = await supabase
        .from('se_trading_settings')
        .select('*')
        .eq('household_id', householdId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...DEFAULT_SETTINGS };
      const row = data as Record<string, unknown>;
      const num = (key: string, fallback: number) =>
        row[key] === null || row[key] === undefined ? fallback : Number(row[key]);
      return {
        id: data.id,
        data_mode: data.data_mode as DataMode,
        api_provider: data.api_provider,
        api_minute_limit: data.api_minute_limit,
        api_daily_limit: data.api_daily_limit,
        trading_capital: Number(data.trading_capital),
        risk_per_trade_pct: Number(data.risk_per_trade_pct),
        max_portfolio_risk_pct: Number(data.max_portfolio_risk_pct),
        advanced_mode: data.advanced_mode,
        max_sector_capital_exposure_pct: num(
          'max_sector_capital_exposure_pct',
          DEFAULT_SETTINGS.max_sector_capital_exposure_pct,
        ),
        max_sector_heat_pct: num('max_sector_heat_pct', DEFAULT_SETTINGS.max_sector_heat_pct),
        correlation_lookback_days: num(
          'correlation_lookback_days',
          DEFAULT_SETTINGS.correlation_lookback_days,
        ),
        correlation_moderate: num('correlation_moderate', DEFAULT_SETTINGS.correlation_moderate),
        correlation_high: num('correlation_high', DEFAULT_SETTINGS.correlation_high),
        correlation_very_high: num('correlation_very_high', DEFAULT_SETTINGS.correlation_very_high),
        max_correlated_risk_pct: num(
          'max_correlated_risk_pct',
          DEFAULT_SETTINGS.max_correlated_risk_pct,
        ),
        commission_per_trade: num('commission_per_trade', DEFAULT_SETTINGS.commission_per_trade),
        signal_max_age_days: num('signal_max_age_days', DEFAULT_SETTINGS.signal_max_age_days),
        breaker_consecutive_losses: num(
          'breaker_consecutive_losses',
          DEFAULT_SETTINGS.breaker_consecutive_losses,
        ),
        breaker_daily_loss_limit: num(
          'breaker_daily_loss_limit',
          DEFAULT_SETTINGS.breaker_daily_loss_limit,
        ),
        breaker_weekly_loss_limit: num(
          'breaker_weekly_loss_limit',
          DEFAULT_SETTINGS.breaker_weekly_loss_limit,
        ),
        breaker_daily_loss_r: num('breaker_daily_loss_r', DEFAULT_SETTINGS.breaker_daily_loss_r),
        breaker_weekly_loss_r: num('breaker_weekly_loss_r', DEFAULT_SETTINGS.breaker_weekly_loss_r),

        training_min_paper_trades: num(
          'training_min_paper_trades',
          DEFAULT_SETTINGS.training_min_paper_trades,
        ),
        training_mode_enabled: Boolean(row.training_mode_enabled ?? false),
      };
    },
  });

  const statusQuery = useQuery({
    queryKey: ['se-provider-status'],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_api_provider_status')
        .select('*')
        .eq('provider', 'TWELVE_DATA')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const openRiskQuery = useQuery({
    queryKey: ['se-open-risk', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select('shares, entry_price, stop_price')
        .eq('household_id', householdId!)
        .eq('status', 'OPEN');
      if (error) throw error;
      return (data ?? []).reduce(
        (sum, t) => sum + Number(t.shares) * (Number(t.entry_price) - Number(t.stop_price)),
        0,
      );
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<TradingSettings>) => {
      if (!householdId) throw new Error('No household');
      const current = settingsQuery.data ?? DEFAULT_SETTINGS;
      const row = { ...current, ...patch, household_id: householdId };
      delete (row as Record<string, unknown>).id;
      const { error } = await supabase
        .from('se_trading_settings')
        .upsert(row, { onConflict: 'household_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-trading-settings'] });
    },
  });

  const settings = settingsQuery.data ?? DEFAULT_SETTINGS;
  const openRisk = openRiskQuery.data ?? 0;

  const risk = useMemo(
    () =>
      portfolioRisk({
        tradingCapital: settings.trading_capital,
        maxPortfolioRiskPct: settings.max_portfolio_risk_pct,
        openRisk,
      }),
    [settings.trading_capital, settings.max_portfolio_risk_pct, openRisk],
  );

  const maxRiskPerTrade = useMemo(
    () => Math.round(((settings.trading_capital * settings.risk_per_trade_pct) / 100) * 100) / 100,
    [settings.trading_capital, settings.risk_per_trade_pct],
  );

  return {
    settings,
    status: statusQuery.data ?? null,
    risk,
    maxRiskPerTrade,
    isLoading: settingsQuery.isLoading,
    save: save.mutateAsync,
    isSaving: save.isPending,
    refetchStatus: statusQuery.refetch,
  };
}

export interface CandleResult {
  candles: Candle[];
  source: 'demo' | 'cache' | 'live';
  fetchedAt: string | null;
  notice: string | null;
}

/**
 * Cache-first candle loading. Live calls only happen when cached data is not
 * Fresh, and a provider failure always falls back to whatever is cached.
 */
export async function loadCandles(
  symbol: string,
  interval: SwingInterval,
  mode: DataMode,
  outputsize = 260,
): Promise<CandleResult> {
  const sym = symbol.toUpperCase();

  if (mode === 'DEMO') {
    const candles = await providerFor('DEMO').getTimeSeries(sym, interval, outputsize);
    return { candles, source: 'demo', fetchedAt: null, notice: null };
  }

  const { data: cached } = await supabase
    .from('se_market_data_cache')
    .select('datetime, open, high, low, close, volume, fetched_at')
    .eq('symbol', sym)
    .eq('interval', interval)
    .order('datetime', { ascending: false })
    .limit(outputsize);

  const rows = (cached ?? []).slice().reverse();
  const cachedCandles: Candle[] = rows.map((r) => ({
    datetime: r.datetime as string,
    open: Number(r.open),
    high: Number(r.high),
    low: Number(r.low),
    close: Number(r.close),
    volume: Number(r.volume),
  }));
  const newestFetch = rows.length ? (rows[rows.length - 1].fetched_at as string) : null;

  if (mode === 'CACHED') {
    return {
      candles: cachedCandles,
      source: 'cache',
      fetchedAt: newestFetch,
      notice: cachedCandles.length ? null : 'No cached market data for this symbol yet.',
    };
  }

  if (cachedCandles.length >= 60 && !needsRefresh(newestFetch, interval)) {
    return { candles: cachedCandles, source: 'cache', fetchedAt: newestFetch, notice: null };
  }

  try {
    const candles = await twelveData.getTimeSeries(sym, interval, outputsize);
    if (candles.length) {
      return { candles, source: 'live', fetchedAt: new Date().toISOString(), notice: null };
    }
    throw new ProviderUnavailableError('No candles returned.', 'provider_error');
  } catch (e) {
    const message =
      e instanceof ProviderUnavailableError && e.kind === 'rate_limited'
        ? 'Market data limit reached. SwingEdge is temporarily using cached data.'
        : e instanceof ProviderUnavailableError && e.kind === 'not_configured'
          ? 'Market data is not connected yet.'
          : 'Live market data is unavailable, so cached data is being used.';
    return {
      candles: cachedCandles,
      source: 'cache',
      fetchedAt: newestFetch,
      notice: cachedCandles.length ? message : `${message} No cached data for this symbol yet.`,
    };
  }
}

export interface DashboardData {
  readings: IndexReading[];
  condition: ReturnType<typeof classifyMarket>;
  source: 'demo' | 'cache' | 'live';
  fetchedAt: string | null;
  notice: string | null;
}

/** Market overview for SPY / QQQ / DIA / IWM plus the overall condition. */
export function useSwingEdgeDashboard() {
  const { settings } = useTradingSettings();
  const mode = settings.data_mode;

  const query = useQuery({
    queryKey: ['se-dashboard', mode],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<DashboardData> => {
      const results = await Promise.all(
        INDEX_SYMBOLS.map(async (s) => ({ symbol: s, result: await loadCandles(s, '1day', mode) })),
      );
      const readings = results
        .map(({ symbol, result }) =>
          readIndex(symbol, result.candles, result.fetchedAt ?? new Date().toISOString()),
        )
        .filter((r): r is IndexReading => r !== null);
      const first = results[0]?.result;
      return {
        readings,
        condition: classifyMarket(readings),
        source: first?.source ?? 'demo',
        fetchedAt: first?.fetchedAt ?? null,
        notice: results.find((r) => r.result.notice)?.result.notice ?? null,
      };
    },
  });

  return {
    ...query,
    data: query.data,
    mode,
    cacheState: cacheStatus(query.data?.fetchedAt, '1day'),
  };
}

/** Connection test button state. */
export function useConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const qc = useQueryClient();

  const run = useCallback(async () => {
    setTesting(true);
    try {
      const outcome = await twelveData.testConnection();
      setResult(outcome);
      return outcome;
    } finally {
      setTesting(false);
      qc.invalidateQueries({ queryKey: ['se-provider-status'] });
    }
  }, [qc]);

  return { testing, result, run };
}

/** Curated scan universe, seeded in the shared symbol directory. */
export function useCuratedUniverse() {
  return useQuery({
    queryKey: ['se-curated-universe'],
    staleTime: 60 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_market_symbols')
        .select('symbol, name, asset_type, exchange')
        .eq('in_curated_universe', true)
        .eq('is_active', true)
        .order('symbol');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Keeps a title in place while the trading section is open. */
export function useTradingTitle(title: string) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | SwingEdge Analyzer`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
