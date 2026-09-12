// SwingEdge Hybrid Signal Engine — data orchestration for one symbol.
// Reads cache-first candles, works out the technical read on COMPLETED candles,
// grades the risk side, pulls whatever fundamental figures are actually
// available, and combines the three into one signal.

import { useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { loadCandles, useTradingSettings } from '@/hooks/use-swingedge';
import { trendState } from '@/lib/swingedge/indicators';
import { scoreSymbol, type AlignmentContext, type SymbolScore } from '@/lib/swingedge/score';
import { assessStop } from '@/lib/swingedge/stops';
import { calculatePosition } from '@/lib/swingedge/risk';
import { scoreRisk, type RiskScoreResult } from '@/lib/swingedge/riskScore';
import { scoreFundamentals, type FundamentalScoreResult } from '@/lib/swingedge/fundamentals';
import { scoreEtfQuality, type EtfQualityResult } from '@/lib/swingedge/etfQuality';
import { combineConfidence, type DataConfidence } from '@/lib/swingedge/confidence';
import { detectConflicts } from '@/lib/swingedge/conflicts';
import { computeHybridSignal, HYBRID_METHODOLOGY_VERSION, type HybridResult } from '@/lib/swingedge/hybrid';
import { candleBasis, entryZone, priceOutsideZone, validUntil } from '@/lib/swingedge/signalLifecycle';
import { analyzeCandles, type CandleAnalysis } from '@/lib/swingedge/candleEngine';
import { MARKET_BENCHMARK, SECTOR_BENCHMARKS, profileFor } from '@/lib/swingedge/sectors';
import { classifyRegime, regimeAlignmentBias, REGIME_LABEL, type MarketRegimeResult } from '@/lib/swingedge/marketRegime';
import { assessRelativeStrength, RS_LABEL, type RelativeStrengthResult } from '@/lib/swingedge/relativeStrength';
import { assessTradability, type TradabilityResult } from '@/lib/swingedge/tradability';
import type { Candle } from '@/lib/swingedge/types';
import {
  AlphaVantageFundamentals,
  ManualFundamentals,
  TwelveDataFundamentals,
  mergeBundles,
  providerQualityFor,
  type FundamentalBundle,
  type FundamentalCapability,
} from '@/lib/swingedge/fundamentalProvider';

/**
 * The Twelve Data plan behind this app covers prices, quotes, search and market
 * status. It does not include company statements or fund profiles, so those
 * capabilities are declared false and never called. Hand-entered figures fill
 * the gap and are labelled as yours.
 */
const TWELVE_DATA_CAPABILITIES = new Set<FundamentalCapability>(['earningsCalendar']);

export interface HybridAnalysis {
  symbol: string;
  assetType: 'STOCK' | 'ETF';
  technical: SymbolScore;
  risk: RiskScoreResult;
  fundamental: FundamentalScoreResult | null;
  etf: EtfQualityResult | null
  qualityScore: number | null;
  hybrid: HybridResult;
  bundle: FundamentalBundle;
  confidence: DataConfidence;
  developing: boolean;
  lastCompletedCandleAt: string | null;
  validUntil: string;
  entryZone: { low: number; high: number } | null
  source: 'demo' | 'cache' | 'live';
  notice: string | null;
  /** Candlestick read for the daily timeframe. Feeds Setup Quality only. */
  candles: CandleAnalysis;
  sectorSymbol: string;
  marketTrendSymbol: string;
  dataSources: string[];
  /** What the market IS doing. Shades alignment inside the Technical Score. */
  regime: MarketRegimeResult;
  /** Who has been stronger over the window. Also shades alignment only. */
  relativeStrength: RelativeStrengthResult;
  /** Liquidity, price and spread reality. AVOID is a hard gate. */
  tradability: TradabilityResult;
}

async function benchmarkCandles(symbol: string, mode: Parameters<typeof loadCandles>[2]) {
  const { candles } = await loadCandles(symbol, '1day', mode, 200);
  return candles;
}

function trendOf(candles: Candle[]) {
  if (candles.length < 60) return null;
  return trendState(candles);
}


/** One symbol, end to end. Nothing here calls a provider endpoint off the plan. */
export function useHybridAnalysis(symbol: string | null, assetTypeHint?: 'STOCK' | 'ETF') {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const { settings, risk: portfolio } = useTradingSettings();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: [
      'se-hybrid',
      householdId,
      symbol,
      assetTypeHint,
      settings.data_mode,
      settings.trading_capital,
      settings.risk_per_trade_pct,
      settings.max_portfolio_risk_pct,
    ],
    enabled: !!symbol,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<HybridAnalysis> => {
      const sym = symbol!.toUpperCase();
      const mode = settings.data_mode;

      const [priceResult, directory] = await Promise.all([
        loadCandles(sym, '1day', mode, 260),
        supabase
          .from('se_market_symbols')
          .select('symbol, name, asset_type')
          .eq('symbol', sym)
          .maybeSingle(),
      ]);

      const assetType: 'STOCK' | 'ETF' =
        assetTypeHint ??
        ((directory.data?.asset_type as string | undefined)?.toUpperCase() === 'ETF' ? 'ETF' : 'STOCK');


      // Confirmed signals only ever use completed candles.
      const basis = candleBasis(priceResult.candles, '1day');
      const usable = basis.completed.length >= 60 ? basis.completed : priceResult.candles;

      // Figures priority: Alpha Vantage (saved copy first, then live), then the
      // price provider if it ever gains the capability, then hand-entered values.
      // Hand entry is the fallback, never the first stop.
      const manualProvider = new ManualFundamentals(householdId);
      const [alphaBundle, manualBundle] = await Promise.all([
        mode === 'DEMO'
          ? Promise.resolve(null)
          : new AlphaVantageFundamentals().getBundle(sym, assetType),
        manualProvider.getBundle(sym, assetType),
      ]);
      let providerBundle =
        alphaBundle && alphaBundle.mode !== 'UNAVAILABLE'
          ? alphaBundle
          : await new TwelveDataFundamentals(TWELVE_DATA_CAPABILITIES).getBundle(sym, assetType);
      if (providerBundle.mode === 'UNAVAILABLE' && alphaBundle) {
        providerBundle = alphaBundle; // keep the clearer Alpha Vantage explanation
      }
      const { bundle, conflictingMetrics } = mergeBundles(providerBundle, manualBundle);

      const sectorText = bundle.profile?.sector ?? null;
      const profile = profileFor(sectorText, bundle.profile?.industry ?? null);
      const sectorSymbol = assetType === 'ETF' ? MARKET_BENCHMARK : SECTOR_BENCHMARKS[profile.key];

      const [marketCandlesRaw, sectorCandlesRaw] = await Promise.all([
        benchmarkCandles(MARKET_BENCHMARK, mode),
        sectorSymbol === MARKET_BENCHMARK
          ? Promise.resolve([] as Candle[])
          : benchmarkCandles(sectorSymbol, mode),
      ]);
      const marketCandles = marketCandlesRaw;
      const sectorCandles = sectorCandlesRaw.length ? sectorCandlesRaw : marketCandlesRaw;
      const marketTrend = trendOf(marketCandles);
      const sectorTrend = sectorCandlesRaw.length ? trendOf(sectorCandlesRaw) : null;

      // What the market IS doing, from transparent index checks.
      const regime = classifyRegime([{ symbol: MARKET_BENCHMARK, candles: marketCandles }]);

      // Who has been stronger over the window. Reporting, never prediction.
      const relativeStrength = assessRelativeStrength({
        symbol: sym,
        assetType,
        candles: usable,
        sectorCandles: assetType === 'ETF' ? null : sectorCandles,
        sectorSymbol: assetType === 'ETF' ? null : sectorSymbol,
        benchmarkCandles: marketCandles,
        benchmarkSymbol: MARKET_BENCHMARK,
        lookback: settings.correlation_lookback_days,
      });

      // Liquidity and spread reality. AVOID is a hard gate downstream.
      const tradability = assessTradability({ symbol: sym, candles: usable });

      // Candlestick evidence, scored in context. It contributes at most 7 points
      // inside Setup Quality and can never promote a signal on its own.
      const candleAnalysis = analyzeCandles(priceResult.candles, {
        completedCount: basis.completed.length,
        majorOnly: !settings.advanced_mode,
        marketTrend,
        sectorTrend: sectorTrend ?? marketTrend,
        minScore: settings.advanced_mode ? 40 : undefined,
      });

      const alignment: AlignmentContext = {
        assetType,
        marketTrend,
        sectorTrend: sectorTrend ?? marketTrend,
        sectorSymbol,
        candleConfirmation: candleAnalysis.confirmation,
        regimeBias: regime.insufficientData ? null : regimeAlignmentBias(regime.regime),
        regimeLabel: regime.insufficientData ? null : REGIME_LABEL[regime.regime],
        relativeStrengthBias: relativeStrength.overall ? relativeStrength.bias : null,
        relativeStrengthLabel: relativeStrength.overall ? RS_LABEL[relativeStrength.overall] : null,
      };
      const technical = scoreSymbol(sym, usable, alignment);

      const providerQuality = providerQualityFor(bundle);
      const freshnessDays = bundle.asOf
        ? Math.round((Date.now() - new Date(bundle.asOf).getTime()) / 86_400_000)
        : null;

      let fundamental: FundamentalScoreResult | null = null;
      let etf: EtfQualityResult | null = null;
      if (assetType === 'ETF') {
        etf = scoreEtfQuality(bundle.etf ?? {}, {
          provider: providerQuality,
          freshnessDays,
          conflictingMetrics,
        });
      } else {
        fundamental = scoreFundamentals(bundle.metrics, {
          sector: sectorText,
          industry: bundle.profile?.industry ?? null,
          provider: providerQuality,
          freshnessDays,
          periodsAvailable: bundle.periodsAvailable,
          conflictingMetrics,
        });
      }

      const qualityScore = assetType === 'ETF' ? (etf?.score ?? null) : (fundamental?.score ?? null);
      const qualityConfidence = assetType === 'ETF' ? etf?.confidence.level : fundamental?.confidence.level;

      // Risk layer works off the estimated levels so a scanner-grade read still
      // grades the risk side. A real plan replaces these in the Trade Planner.
      const levels = technical.levels;
      const position = levels
        ? calculatePosition({
            tradingCapital: settings.trading_capital,
            riskPerTradePct: settings.risk_per_trade_pct,
            entry: levels.estimatedEntry,
            stop: levels.estimatedStop,
            target: levels.estimatedTarget,
          })
        : null;
      const stopAssessment = levels
        ? assessStop({
            entry: levels.estimatedEntry,
            stop: levels.estimatedStop,
            atrValue: technical.atr,
            structureLevel: technical.support,
            rewardRisk: position?.rewardRisk ?? levels.projectedRewardRisk,
            setup: technical.setup,
          })
        : null;

      const accountRiskPct =
        position && position.maxPlannedLoss > 0 && settings.trading_capital > 0
          ? (position.maxPlannedLoss / settings.trading_capital) * 100
          : null;
      const portfolioAfter =
        settings.trading_capital > 0 && position
          ? ((portfolio.openRisk + position.maxPlannedLoss) / settings.trading_capital) * 100
          : null;

      const risk = scoreRisk({
        stopQuality: stopAssessment?.quality ?? null,
        stopJustified: stopAssessment?.justified ?? false,
        rewardRisk: position?.rewardRisk ?? null,
        minimumRewardRisk: 2,
        shares: position?.shares ?? 0,
        accountRiskPct,
        maxAccountRiskPct: settings.risk_per_trade_pct,
        portfolioRiskPctAfter: portfolioAfter,
        maxPortfolioRiskPct: settings.max_portfolio_risk_pct,
        stopDistanceInAtr:
          technical.atr && levels ? (levels.estimatedEntry - levels.estimatedStop) / technical.atr : null,
        daysToEarnings: null,
        earningsDataAvailable: false,
      });

      const confidence = combineConfidence([
        qualityConfidence ?? 'INSUFFICIENT',
        technical.insufficientData ? 'INSUFFICIENT' : priceResult.source === 'cache' ? 'MODERATE' : 'HIGH',
      ]);

      const criticalRedFlag = !!fundamental?.redFlags.some((f) => f.severity === 'CRITICAL');
      const conflicts = detectConflicts({
        qualityScore,
        technicalScore: technical.score,
        riskScore: risk.score,
        qualityMinimum: 65,
        technicalMinimum: 75,
        riskMinimum: 75,
        fundamentalTrend: fundamental?.trend,
        criticalRedFlag,
        extendedFromAverage: technical.risks.some((r) => r.includes('far above its 20-day average')),
        volumeWeak: (technical.relativeVolume ?? 1) < 1,
        marketAgainst: marketTrend === 'DOWN',
        sectorAgainst: (sectorTrend ?? marketTrend) === 'DOWN',
      });

      const zone = levels ? entryZone(levels.estimatedEntry, technical.atr) : null;
      const priceOutside = zone && technical.price !== null ? priceOutsideZone(technical.price, zone) : false;
      const until = validUntil(basis.lastCompletedAt, '1day');

      const hybrid = computeHybridSignal({
        symbol: sym,
        assetType,
        qualityScore,
        technicalScore: technical.score,
        riskScore: risk.score,
        confidence,
        qualityCoverage: assetType === 'ETF' ? etf?.coverage : fundamental?.coverage,
        hardGateFailures: risk.hardGateFailures,
        conflicts,
        setupReady: technical.setup !== 'NONE',
        priceOutsideEntryZone: priceOutside,
        expired: false,
        criticalRedFlag,
        advancedProduct: !!etf?.advancedProduct,
        beginnerMode: !settings.advanced_mode,
        developing: basis.developing,
      });

      return {
        symbol: sym,
        assetType,
        technical,
        risk,
        fundamental,
        etf,
        qualityScore,
        hybrid,
        bundle,
        confidence,
        developing: basis.developing,
        lastCompletedCandleAt: basis.lastCompletedAt,
        validUntil: until,
        entryZone: zone,
        candles: candleAnalysis,
        source: priceResult.source,
        notice: priceResult.notice,
        sectorSymbol,
        marketTrendSymbol: MARKET_BENCHMARK,
        dataSources: [priceResult.source === 'demo' ? 'DEMO_DATA' : 'TWELVE_DATA', ...bundle.sources],
      };
    },
  });

  const persist = useMutation({
    mutationFn: async (analysis: HybridAnalysis) => {
      if (!householdId) throw new Error('No household');
      const { data: existing } = await supabase
        .from('se_hybrid_scores')
        .select('signal')
        .eq('household_id', householdId)
        .eq('symbol', analysis.symbol)
        .maybeSingle();

      // Cast at the boundary: these nested shapes are plain JSON at rest.
      const row: Record<string, unknown> = {

        household_id: householdId,
        symbol: analysis.symbol,
        asset_type: analysis.assetType,
        hybrid_score: analysis.hybrid.hybridScore,
        band: analysis.hybrid.band,
        signal: analysis.hybrid.signal,
        quality_score: analysis.qualityScore,
        technical_score: analysis.technical.score,
        risk_score: analysis.risk.score,
        weights: analysis.hybrid.weights,
        thresholds: analysis.hybrid.thresholds,
        confidence: analysis.confidence,
        quality_coverage:
          analysis.assetType === 'ETF' ? (analysis.etf?.coverage ?? null) : (analysis.fundamental?.coverage ?? null),
        candle_basis: analysis.developing ? 'COMPLETED_PLUS_PREVIEW' : 'COMPLETED',
        developing: analysis.developing,
        last_completed_candle_at: analysis.lastCompletedCandleAt,
        checks: analysis.hybrid.checks,
        blocking: analysis.hybrid.blocking,
        reasons: analysis.hybrid.reasons,
        what_would_change_it: analysis.hybrid.whatWouldChangeIt,
        evidence: {
          technical: analysis.technical.components,
          risk: analysis.risk.components,
          quality: analysis.assetType === 'ETF' ? analysis.etf?.evidence : analysis.fundamental?.evidence,
        },
        data_sources: analysis.dataSources,
        valid_until: analysis.validUntil,
        methodology_version: HYBRID_METHODOLOGY_VERSION,
      };

      const { error } = await supabase
        .from('se_hybrid_scores')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(row as any, { onConflict: 'household_id,symbol' });

      if (error) throw error;

      if (existing?.signal !== analysis.hybrid.signal) {
        await supabase.from('se_hybrid_signal_history').insert({
          household_id: householdId,
          symbol: analysis.symbol,
          from_signal: existing?.signal ?? null,
          to_signal: analysis.hybrid.signal,
          hybrid_score: analysis.hybrid.hybridScore,
          quality_score: analysis.qualityScore,
          technical_score: analysis.technical.score,
          risk_score: analysis.risk.score,
          confidence: analysis.confidence,
          reason: analysis.hybrid.reasons[0] ?? null,
          developing: analysis.developing,
          methodology_version: HYBRID_METHODOLOGY_VERSION,
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-hybrid-history'] });
    },
  });

  const save = useCallback(async () => {
    if (query.data) await persist.mutateAsync(query.data);
  }, [persist, query.data]);

  /**
   * Fetch the business figures again. "full" also pulls the statements, which
   * costs three extra provider requests, so it stays a deliberate choice.
   */
  const refreshFigures = useMutation({
    mutationFn: async (depth: 'basic' | 'full' = 'basic') => {
      if (!symbol) throw new Error('No symbol');
      const assetType = query.data?.assetType ?? assetTypeHint ?? 'STOCK';
      return new AlphaVantageFundamentals({ depth, force: true }).getBundle(symbol, assetType);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-hybrid'] });
    },
  });

  return {
    ...query,
    analysis: query.data ?? null,
    save,
    isSaving: persist.isPending,
    advancedMode: settings.advanced_mode,
    refreshFigures: refreshFigures.mutateAsync,
    isRefreshingFigures: refreshFigures.isPending,
  };
}

/** Recent signal changes for one symbol or the whole household. */
export function useHybridSignalHistory(symbol?: string) {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;

  return useQuery({
    queryKey: ['se-hybrid-history', householdId, symbol ?? 'all'],
    enabled: !!householdId,
    queryFn: async () => {
      let q = supabase
        .from('se_hybrid_signal_history')
        .select('*')
        .eq('household_id', householdId!)
        .order('created_at', { ascending: false })
        .limit(25);
      if (symbol) q = q.eq('symbol', symbol.toUpperCase());
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Hand-entered figures for symbols the data plan does not cover. */
export function useFundamentalOverrides(symbol: string | null) {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-fundamental-overrides', householdId, symbol],
    enabled: !!householdId && !!symbol,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('se_fundamental_overrides')
        .select('*')
        .eq('household_id', householdId!)
        .eq('symbol', symbol!.toUpperCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const save = useMutation({
    mutationFn: async (input: {
      assetType: 'STOCK' | 'ETF';
      sector?: string | null;
      metrics: Record<string, number | boolean | null>;
      etfMetrics?: Record<string, number | boolean | null> | null;
      asOf?: string | null;
      note?: string | null;
    }) => {
      if (!householdId || !symbol) throw new Error('No household or symbol');
      const { error } = await supabase.from('se_fundamental_overrides').upsert(
        {
          household_id: householdId,
          symbol: symbol.toUpperCase(),
          asset_type: input.assetType,
          sector: input.sector ?? null,
          metrics: input.metrics,
          etf_metrics: input.etfMetrics ?? null,
          as_of: input.asOf ?? null,
          note: input.note ?? null,
        },
        { onConflict: 'household_id,symbol' },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-fundamental-overrides'] });
      qc.invalidateQueries({ queryKey: ['se-hybrid'] });
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!householdId || !symbol) return;
      const { error } = await supabase
        .from('se_fundamental_overrides')
        .delete()
        .eq('household_id', householdId)
        .eq('symbol', symbol.toUpperCase());
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['se-fundamental-overrides'] });
      qc.invalidateQueries({ queryKey: ['se-hybrid'] });
    },
  });

  const values = useMemo(() => (query.data?.metrics ?? {}) as Record<string, number | null>, [query.data]);

  return { row: query.data ?? null, values, isLoading: query.isLoading, save: save.mutateAsync, remove: remove.mutateAsync, isSaving: save.isPending };
}
