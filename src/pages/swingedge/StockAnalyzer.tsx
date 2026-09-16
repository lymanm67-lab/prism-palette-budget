import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Loader2, Minus, Save, Search, Square, TrendingDown, TrendingUp, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import ExecutionGuideButton from '@/components/swingedge/ExecutionGuideButton';

import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import CandlePatternCard from '@/components/swingedge/CandlePatternCard';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import CandlestickChart from '@/components/swingedge/CandlestickChart';
import ReadThisChartCard from '@/components/swingedge/ReadThisChartCard';
import { readChart } from '@/lib/swingedge/chartReading';
import { currentDirection } from '@/lib/swingedge/directionStrip';
import type { SwingInterval } from '@/lib/swingedge/types';
import EntryReadinessCard from '@/components/swingedge/EntryReadinessCard';
import ArmedTradeStrip from '@/components/swingedge/ArmedTradeStrip';
import { buildEntryReadiness, armedNeedsReview } from '@/lib/swingedge/conditionalStaging';
import { buildAnalysisSnapshot, stashSnapshot, type AnalysisSnapshot } from '@/lib/swingedge/analysisSnapshot';
import { computeGeometry } from '@/lib/swingedge/tradeGeometry';
import { useArmedPlans } from '@/hooks/use-swingedge-stops';

const CHART_INTERVALS: { value: SwingInterval; label: string }[] = [
  { value: '1week', label: 'Weekly' },
  { value: '1day', label: 'Daily' },
  { value: '4h', label: '4 hour' },
  { value: '1h', label: '1 hour' },
  { value: '15m', label: '15 min' },
];
import { directionalBias } from '@/lib/swingedge/directionalBias';
import { conditionsFromNow } from '@/lib/swingedge/historicalMatch';
import { scoreTradeReadiness, READINESS_BAND_LABEL, type ReadinessItemKey } from '@/lib/swingedge/tradeReadiness';
import DirectionalBiasCard from '@/components/swingedge/DirectionalBiasCard';
import EventRiskCard from '@/components/swingedge/EventRiskCard';
import TradeReadinessCard from '@/components/swingedge/TradeReadinessCard';
import TrackRecordCard from '@/components/swingedge/TrackRecordCard';
import MultiTimeframeCard from '@/components/swingedge/MultiTimeframeCard';
import MtfStatusStrip from '@/components/swingedge/MtfStatusStrip';
import { useMultiTimeframe } from '@/hooks/use-swingedge-mtf';
import { useTrackRecord } from '@/hooks/use-swingedge-trackrecord';
import HowToUse from '@/components/swingedge/HowToUse';
import AiLevelsAssistant from '@/components/swingedge/AiLevelsAssistant';
import AiMentorCard from '@/components/swingedge/AiMentorCard';
import HybridSignalCard from '@/components/swingedge/HybridSignalCard';
import ManualFundamentalsForm from '@/components/swingedge/ManualFundamentalsForm';
import QualityScoreCard from '@/components/swingedge/QualityScoreCard';
import { RiskQualityCard, TechnicalCard } from '@/components/swingedge/TechnicalRiskCards';
import {
  MarketRegimeCard,
  RelativeStrengthCard,
  TradabilityCard,
} from '@/components/swingedge/ContextCards';
import { useTradingSettings, useTradingTitle, loadCandles } from '@/hooks/use-swingedge';
import { useEventRisk } from '@/hooks/use-swingedge-events';
import { useHybridAnalysis, useHybridSignalHistory } from '@/hooks/use-swingedge-hybrid';
import { useAnalyzerVoice } from '@/hooks/use-analyzer-voice';
import { buildAnalysisNarration } from '@/lib/swingedge/narration';
import { rsiRead } from '@/lib/swingedge/framework';

/** Market regime as a 0-1 backdrop score for readiness. Never a forecast. */
const REGIME_SCORE: Record<string, number> = {
  STRONG_BULL: 1,
  BULL: 0.85,
  NEUTRAL: 0.5,
  TRANSITION: 0.45,
  HIGH_VOLATILITY: 0.35,
  CAUTIOUS: 0.35,
  BEAR: 0.1,
};


const money = (n: number | null) =>
  n === null ? '—' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export default function StockAnalyzer() {
  useTradingTitle('Stock Analyzer');
  const [params, setParams] = useSearchParams();
  const initial = (params.get('symbol') ?? '').toUpperCase();
  const [input, setInput] = useState(initial);
  const [symbol, setSymbol] = useState(initial || null);

  const { analysis, isLoading, isFetching, save, isSaving, refreshFigures, isRefreshingFigures } =
    useHybridAnalysis(symbol);
  const { data: history } = useHybridSignalHistory(symbol ?? undefined);
  const { settings } = useTradingSettings();

  const { data: candleResult } = useQuery({
    queryKey: ['se-analyzer-candles', symbol, settings.data_mode],
    queryFn: () => loadCandles(symbol as string, '1day', settings.data_mode, 260),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });

  // The chart can be zoomed into finer timeframes without changing the
  // analysis, which always reads the daily chart.
  const [chartInterval, setChartInterval] = useState<SwingInterval>('1day');
  const { data: chartResult, isLoading: chartLoading } = useQuery({
    queryKey: ['se-analyzer-chart', symbol, chartInterval, settings.data_mode],
    queryFn: () =>
      chartInterval === '1day'
        ? loadCandles(symbol as string, '1day', settings.data_mode, 260)
        : loadCandles(symbol as string, chartInterval, settings.data_mode, 300),
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000,
  });
  const chartIntervalLabel =
    CHART_INTERVALS.find((i) => i.value === chartInterval)?.label.toLowerCase() ?? 'daily';

  const chartDirection = useMemo(
    () => currentDirection(candleResult?.candles ?? []),
    [candleResult],
  );

  // What happened the last times this name and this setup were traded.
  const { record: trackRecord } = useTrackRecord(symbol, analysis?.technical.setup ?? null);

  // Weekly context, daily setup, 4-hour confirmation and 1-hour entry timing.
  const { result: mtf } = useMultiTimeframe(symbol, candleResult?.candles, {
    price: analysis?.technical.price ?? null,
    entryZone: analysis?.entryZone ?? null,
  });



  // Historical tendency for the conditions showing right now.
  const bias = useMemo(() => {
    const candles = candleResult?.candles ?? [];
    if (candles.length < 120) return null;
    return directionalBias(candles, {
      conditions: conditionsFromNow(candles, symbol ?? 'this symbol'),
      trend: analysis?.technical.trend ?? null,
    });
  }, [candleResult, symbol, analysis?.technical.trend]);

  const eventView = useEventRisk({
    symbol,
    sector: analysis?.bundle.profile?.sector ?? null,
    holdingDays: 10,
  });

  // Trade readiness. Planner-only items stay unavailable here rather than
  // being guessed at, and every hard gate is passed straight through.
  const readiness = useMemo(() => {
    if (!analysis) return null;
    const t = analysis.technical;
    const rv = t.relativeVolume;
    const event = eventView.result;

    const scores: Partial<Record<ReadinessItemKey, number | null>> = {
      setup: t.setup === 'BREAKOUT' || t.setup === 'PULLBACK' ? 1 : 0.35,
      stop: analysis.technical.levels?.estimatedStop ? Math.min(1, analysis.risk.score / 100) : null,
      trend: t.trend === 'UP' ? 1 : t.trend === 'SIDEWAYS' ? 0.5 : 0,
      bias: bias
        ? bias.confidence === 'INSUFFICIENT_DATA'
          ? null
          : bias.direction === 'UP'
            ? Math.min(1, bias.leadingPct / 100)
            : bias.direction === 'SIDEWAYS'
              ? 0.4
              : 0.1
        : null,
      rewardRisk: null,
      quality: analysis.qualityScore === null ? null : analysis.qualityScore / 100,
      regime: analysis.regime.insufficientData ? null : (REGIME_SCORE[analysis.regime.regime] ?? 0.5),
      sector: analysis.relativeStrength.insufficientData ? null : analysis.relativeStrength.bias,
      candles: Math.min(1, analysis.candles.confirmation.setupPoints / 7),
      volume: rv === null ? null : Math.max(0, Math.min(1, rv / 1.5)),
      sizing: null,
      event: event ? Math.max(0, 1 - event.score / 100) : null,
      revalidation: analysis.developing ? 0.5 : 1,
      heat: null,
      correlation: null,
      timeframes: mtf ? mtf.score / 100 : null,
    };

    const details: Partial<Record<ReadinessItemKey, string>> = {
      rewardRisk: 'Set in the Trade Planner, so it cannot be judged here.',
      sizing: 'Set in the Trade Planner, so it cannot be judged here.',
      heat: 'Measured across your open positions in the Trade Planner.',
      correlation: 'Measured across your open positions in the Trade Planner.',
      bias: bias ? `${bias.direction} lean from ${bias.independentEpisodes} separate past episodes.` : 'No matching history.',
      event: event ? `Event risk ${event.score} of 100 (${event.band}).` : 'No event data available.',
      revalidation: analysis.developing ? "Today's candle is still forming." : 'Reading uses completed candles.',
      timeframes: mtf ? `${mtf.alignmentLabel} across weekly, daily, 4-hour and 1-hour.` : 'Timeframes not read yet.',
    };

    const hardGates = [
      ...analysis.risk.hardGateFailures,
      ...(analysis.tradability.hardGate ? [`Tradability: ${analysis.tradability.reasons[0]}`] : []),
      ...(event?.hardGates ?? []),
      ...(mtf?.hardGates ?? []),
    ];

    return scoreTradeReadiness({ scores, details, hardGates });
  }, [analysis, bias, eventView.result, mtf]);

  // Spoken reading of the analysis. Built only from numbers already computed
  // on this page — nothing extra is estimated for the voice-over.
  const voice = useAnalyzerVoice();
  const narration = useMemo(() => {
    if (!analysis) return null;
    const t = analysis.technical;
    const event = eventView.result;
    return buildAnalysisNarration({
      symbol: analysis.symbol,
      assetType: analysis.assetType,
      price: t.price,
      trend: t.trend,
      setup: t.setup,
      rsi: t.rsi,
      rsiState: rsiRead(candleResult?.candles ?? [])?.state ?? null,
      atr: t.atr,
      support: t.support,
      resistance: t.resistance,
      estimatedStop: analysis.technical.levels?.estimatedStop ?? null,
      estimatedTarget: analysis.technical.levels?.estimatedTarget ?? null,
      relativeVolume: t.relativeVolume,
      developing: analysis.developing,
      biasDirection: bias?.direction ?? null,
      biasConfidence: bias?.confidence ?? null,
      eventScore: event?.score ?? null,
      eventBand: event?.band ?? null,
      readinessScore: readiness?.score ?? null,
      readinessVerdict: readiness?.bandLabel ?? null,
      readinessHardGates: readiness?.hardGates ?? [],
      mtfLabel: mtf?.alignmentLabel ?? null,
    });
  }, [analysis, bias, eventView.result, readiness, mtf, candleResult]);



  const run = () => {
    const next = input.trim().toUpperCase();
    if (!next) return;
    setSymbol(next);
    setParams({ symbol: next });
  };

  // One plain answer on the chart: yes trade it, hold and wait, or no.
  const decision = useMemo<'GO' | 'WAIT' | 'STOP' | null>(() => {
    if (!analysis) return null;
    const signal = analysis.hybrid.signal;
    const band = readiness?.band ?? null;
    if (signal === 'STOP' || band === 'NOT_READY') return 'STOP';
    if (signal === 'GO' && (band === 'READY' || band === 'QUALIFIED')) return 'GO';
    return 'WAIT';
  }, [analysis, readiness]);

  const levels = analysis?.technical.levels ?? null;
  const coveragePct = analysis
    ? Math.round(((analysis.assetType === 'ETF' ? analysis.etf?.coverage : analysis.fundamental?.coverage) ?? 0) * 100)
    : null;

  /* --------------------------------------------- conditional trade staging */

  const navigate = useNavigate();
  const { plans: armedPlans } = useArmedPlans(symbol);
  const armedPlan = armedPlans[0] ?? null;

  // Trade geometry, used only for the target and the path to it. Estimates from
  // the daily chart, never a plan.
  const geometry = useMemo(() => {
    if (!analysis || !levels) return null;
    return computeGeometry({
      entry: levels.estimatedEntry,
      stop: levels.estimatedStop,
      resistance: analysis.technical.resistance,
    });
  }, [analysis, levels]);

  const priceExtended = mtf?.priceExtended ?? false;

  const entryReadiness = useMemo(() => {
    if (!analysis) return null;
    const rowState = (key: string) => mtf?.rows.find((r) => r.key === key)?.state ?? null;
    return buildEntryReadiness(
      {
        symbol: analysis.symbol,
        setup: analysis.technical.setup,
        signal: analysis.hybrid.signal,
        readinessScore: readiness?.score ?? null,
        readinessBand: readiness?.band ?? null,
        hardGates: readiness?.hardGates ?? [],
        dailyState: rowState('DAILY'),
        h4State: rowState('H4'),
        h1State: rowState('H1'),
        entryTrigger: levels?.estimatedEntry ?? null,
        currentPrice: analysis.technical.price,
        stop: levels?.estimatedStop ?? null,
        target: geometry?.target ?? levels?.estimatedTarget ?? null,
        targetPath: geometry?.targetPath ?? null,
        targetPathReason: geometry?.targetPathReason ?? null,
        eventBand: eventView.result?.band ?? null,
        haConfirmation: null,
        priceExtended,
        entryZone: analysis.entryZone ?? null,
      },
      !settings.advanced_mode,
    );
  }, [analysis, mtf, readiness, levels, geometry, eventView.result, priceExtended, settings.advanced_mode]);

  const snapshot = useMemo<AnalysisSnapshot | null>(() => {
    if (!analysis) return null;
    const rowState = (key: string) => mtf?.rows.find((r) => r.key === key)?.state ?? null;
    return buildAnalysisSnapshot({
      symbol: analysis.symbol,
      currentPrice: analysis.technical.price,
      setup: analysis.technical.setup,
      entryTrigger: levels?.estimatedEntry ?? null,
      support: analysis.technical.support,
      resistance: analysis.technical.resistance,
      stopSuggestion: levels?.estimatedStop ?? null,
      mathematicalTarget: geometry?.mathematicalTarget ?? null,
      technicalTarget: geometry?.target ?? null,
      targetPath: geometry?.targetPath ?? null,
      targetPathReason: geometry?.targetPathReason ?? null,
      dailyTrend: rowState('DAILY'),
      h4Trend: rowState('H4'),
      h1Trend: rowState('H1'),
      weeklyContext: rowState('WEEKLY'),
      haConfirmation: null,
      directionalBias: bias?.direction ?? null,
      eventRisk: eventView.result?.band ?? null,
      signalStatus: analysis.hybrid.signal,
      readinessScore: readiness?.score ?? null,
      readinessBand: readiness?.band ?? null,
    });
  }, [analysis, mtf, levels, geometry, bias, eventView.result, readiness]);

  // Was anything material different when this trade was armed?
  const armedReview = useMemo(() => {
    const stored = armedPlan?.analysis_snapshot as AnalysisSnapshot | null | undefined;
    if (!stored || !snapshot) return null;
    return armedNeedsReview(stored, { ...snapshot, priceExtended });
  }, [armedPlan, snapshot, priceExtended]);

  const prepareConditionalTrade = () => {
    if (!snapshot) return;
    const key = stashSnapshot(snapshot);
    toast.success('Analysis sent to the Trade Planner.');
    navigate(`/swingedge/planner?symbol=${encodeURIComponent(snapshot.symbol)}&prep=${encodeURIComponent(key)}`);
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">Stock Analyzer</h1>
        <p className="text-sm text-muted-foreground">
          One name, read properly: what the business or fund is like, what the chart is doing, and whether the risk side
          holds up. The three come together into one signal.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && run()}
          placeholder="Symbol, for example QQQ"
          className="w-48"
          aria-label="Symbol"
        />
        <Button onClick={run} disabled={!input.trim()}>
          <Search className="mr-2 h-4 w-4" /> Analyze
        </Button>
        {analysis && (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await save();
                toast.success('Signal saved to your history.');
              } catch {
                toast.error('The signal could not be saved just now.');
              }
            }}
            disabled={isSaving}
          >
            <Save className="mr-2 h-4 w-4" /> Save this reading
          </Button>
        )}
        {narration && (
          <Button
            variant="outline"
            onClick={() => (voice.speaking || voice.loading ? voice.stop() : voice.speak(narration))}
            disabled={!narration}
            aria-label={voice.speaking ? 'Stop the spoken reading' : 'Listen to this reading'}
          >
            {voice.loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : voice.speaking ? (
              <Square className="mr-2 h-4 w-4" />
            ) : (
              <Volume2 className="mr-2 h-4 w-4" />
            )}
            {voice.speaking ? 'Stop reading' : voice.loading ? 'Preparing voice…' : 'Listen to this reading'}
          </Button>
        )}
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <HowToUse
        title="How to use the Stock Analyzer"
        steps={[
          'Type a symbol and read the combined signal first, then the three cards behind it.',
          'GO means every layer clears your minimums. WAIT means nothing is wrong yet. REVIEW needs a judgement call from you. STOP means a rule is broken.',
          'Open a candlestick pattern to read where it formed, whether volume agreed, and why it might not matter.',
          'Check the data confidence line. A score built on half the figures is not the same as a complete one.',
          'If figures are missing, type them in yourself lower down the page — they will be labelled as yours.',
          'When you are happy, send the idea to the Trade Planner and set your own entry, stop and target there.',
        ]}
        tips={[
          'Confirmed readings only use completed candles. Anything marked DEVELOPING can still change by the close.',
          'A weak set of figures with a strong chart is a REVIEW, not a green light.',
        ]}
      />

      {!symbol && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-sm text-muted-foreground">
            Enter a symbol above to see the combined signal.
          </CardContent>
        </Card>
      )}

      {symbol && isLoading && (
        <Card>
          <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Reading {symbol}…
          </CardContent>
        </Card>
      )}

      {analysis && (
        <div className="space-y-6">
          {analysis.notice && (
            <p className="rounded-md border border-prism-amber/40 bg-prism-amber/10 p-3 text-xs text-prism-amber">
              {analysis.notice}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="secondary">{analysis.symbol}</Badge>
            <Badge variant="outline">{analysis.assetType === 'ETF' ? 'Fund' : 'Company'}</Badge>
            <Badge variant="outline">Price {money(analysis.technical.price)}</Badge>
            <Badge variant="outline">Data source: {analysis.source}</Badge>
            <Badge variant="outline">
              Compared with {analysis.sectorSymbol} and {analysis.marketTrendSymbol}
            </Badge>
          </div>

          {armedPlan && (
            <ArmedTradeStrip
              symbol={analysis.symbol}
              planState={(armedPlan.plan_state as string | null) ?? null}
              entryCondition={
                Array.isArray(armedPlan.entry_conditions) && armedPlan.entry_conditions.length
                  ? (armedPlan.entry_conditions as { text?: string }[])
                      .map((c) => c.text)
                      .filter(Boolean)
                      .join(' AND ')
                  : null
              }
              lastRevalidatedAt={(armedPlan.last_revalidated_at as string | null) ?? null}
              needsReview={!!armedReview?.needsReview}
              reviewReasons={armedReview?.reasons ?? []}
            />
          )}

          {entryReadiness && (
            <EntryReadinessCard
              symbol={analysis.symbol}
              readiness={entryReadiness}
              onPrepare={prepareConditionalTrade}
            />
          )}


          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="text-base">Price chart — {chartIntervalLabel} candles</CardTitle>
                {chartDirection && (
                  <Badge
                    variant="outline"
                    className="flex items-center gap-1"
                    title={chartDirection.detail}
                  >
                    {chartDirection.direction === 'UP' ? (
                      <TrendingUp className="h-3.5 w-3.5 text-prism-lime" />
                    ) : chartDirection.direction === 'DOWN' ? (
                      <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                    ) : (
                      <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {chartDirection.direction === 'UP'
                      ? 'Moving up'
                      : chartDirection.direction === 'DOWN'
                        ? 'Moving down'
                        : 'Sideways'}
                    <span className="text-muted-foreground">
                      · {chartDirection.confidence === 'HIGH' ? 'high' : chartDirection.confidence === 'MODERATE' ? 'moderate' : 'low'} confidence
                    </span>
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                The chart the signal is reading. Dashed flat lines mark support, resistance and the estimated entry,
                stop and target — these come from the daily chart, whatever timeframe you view, and their prices sit
                on the price scale. Learning mode adds trend lines and the direction strip, Trader mode keeps the two
                averages, Execution mode shows price and your levels only.
              </p>
            </CardHeader>
            <CardContent>
              {chartLoading ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading the chart…
                </p>
              ) : (
                <CandlestickChart
                  showDirectionStrip
                  showTrendLines
                  showMovingAverages
                  candles={chartResult?.candles ?? []}
                  symbol={analysis.symbol}
                  assetName={analysis.assetType === 'ETF' ? 'Fund' : 'Company'}
                  price={analysis.technical.price}
                  status={readiness ? READINESS_BAND_LABEL[readiness.band] : null}
                  decision={decision}
                  confidence={readiness ? `${readiness.score}/100 readiness` : null}
                  timeframes={CHART_INTERVALS}
                  activeTimeframe={chartInterval}
                  onTimeframeChange={(v) => setChartInterval(v as SwingInterval)}
                  mtfStrip={<MtfStatusStrip result={mtf} />}
                  levels={[
                    { label: 'Support', short: 'SUP', value: analysis.technical.support, color: 'hsl(var(--prism-teal))' },
                    { label: 'Resistance', short: 'RES', value: analysis.technical.resistance, color: 'hsl(var(--prism-amber))' },
                    { label: 'Est. entry', short: 'ENT', value: levels?.estimatedEntry, color: 'hsl(var(--foreground))' },
                    { label: 'Est. stop', short: 'STP', value: levels?.estimatedStop, color: 'hsl(var(--destructive))' },
                    { label: 'Est. target', short: 'TGT', value: levels?.estimatedTarget, color: 'hsl(var(--prism-lime))' },
                  ]}
                />
              )}

              {/* Plain-words key for the three trade prices drawn on the chart. */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--foreground))' }} />
                  <span className="text-muted-foreground">Entry</span>
                  <span className="font-semibold tabular-nums">
                    {levels ? money(levels.estimatedEntry) : 'not estimated'}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--destructive))' }} />
                  <span className="text-muted-foreground">Stop loss</span>
                  <span className="font-semibold tabular-nums">
                    {levels ? money(levels.estimatedStop) : 'not estimated'}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-0 w-4 border-t-2 border-dashed" style={{ borderColor: 'hsl(var(--prism-lime))' }} />
                  <span className="text-muted-foreground">Target</span>
                  <span className="font-semibold tabular-nums">
                    {levels ? money(levels.estimatedTarget) : 'not estimated'}
                  </span>
                </span>
                {levels ? (
                  <span className="text-xs text-muted-foreground">
                    Target is {levels.projectedRewardRisk} times the risk above the entry — an estimate, not a plan.
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    These appear once the daily chart gives a usable stop distance.
                  </span>
                )}
              </div>
            </CardContent>
          </Card>

          <ReadThisChartCard
            symbol={analysis.symbol}
            read={readChart({
              analysis: analysis.candles,
              price: analysis.technical.price,
              estimatedEntry: levels?.estimatedEntry ?? null,
              estimatedStop: levels?.estimatedStop ?? null,
              estimatedTarget: levels?.estimatedTarget ?? null,
            })}
          />

          <HybridSignalCard
            result={analysis.hybrid}
            qualityLabel={analysis.assetType === 'ETF' ? 'Fund quality' : 'Company quality'}
            qualityScore={analysis.qualityScore}
            technicalScore={analysis.technical.score}
            riskScore={analysis.risk.score}
            coveragePct={coveragePct}
            validUntil={analysis.validUntil}
            dataSources={analysis.dataSources}
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <QualityScoreCard assetType={analysis.assetType} fundamental={analysis.fundamental} etf={analysis.etf} />
            <TechnicalCard score={analysis.technical} />
            <RiskQualityCard risk={analysis.risk} />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <MarketRegimeCard regime={analysis.regime} />
            <RelativeStrengthCard rs={analysis.relativeStrength} />
            <TradabilityCard t={analysis.tradability} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {bias && <DirectionalBiasCard bias={bias} />}
            {eventView.result && <EventRiskCard result={eventView.result} dataNote={eventView.dataNote} />}
          </div>

          <MultiTimeframeCard result={mtf} />

          {readiness && <TradeReadinessCard readiness={readiness} />}

          {readiness && (readiness.band === 'READY' || readiness.band === 'QUALIFIED') && (
            <Card className="border-prism-teal/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Ready to execute in Thinkorswim</CardTitle>
                <CardDescription>
                  Build the plan first — the guide fills in your own share count, entry, stop and target from it. The
                  sample guide below practises the same order steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button size="sm" asChild>
                  <Link to={`/swingedge/planner?symbol=${symbol}`}>Build the plan, then get the guide</Link>
                </Button>
                <ExecutionGuideButton label="Open the sample training guide" />
              </CardContent>
            </Card>
          )}


          <CandlePatternCard analysis={analysis.candles} advanced={settings.advanced_mode} />

          <TrackRecordCard record={trackRecord} />



          {levels && (
            <Card className="border-border/60 bg-card/60 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estimated levels — not a plan</CardTitle>
                <p className="text-xs text-muted-foreground">
                  These are scanner-grade estimates used to grade the risk side. Your real entry, stop, target and
                  position size are set in the Trade Planner.
                </p>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Estimated entry</div>
                  <div className="font-semibold tabular-nums">{money(levels.estimatedEntry)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estimated stop</div>
                  <div className="font-semibold tabular-nums">{money(levels.estimatedStop)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Estimated target</div>
                  <div className="font-semibold tabular-nums">{money(levels.estimatedTarget)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Entry zone</div>
                  <div className="font-semibold tabular-nums">
                    {analysis.entryZone ? `${money(analysis.entryZone.low)} – ${money(analysis.entryZone.high)}` : '—'}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Company &amp; fund figures</CardTitle>
              <p className="text-xs text-muted-foreground">
                Figures come from your market data service and are saved so the same lookup is not paid for twice.
                Source: {analysis.bundle.sources.join(', ') || 'none yet'}
                {analysis.bundle.asOf ? ` · as of ${analysis.bundle.asOf}` : ''}.
                {analysis.bundle.unavailableReason ? ` ${analysis.bundle.unavailableReason}` : ''}
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshingFigures}
                onClick={() => refreshFigures('basic')}
              >
                Refresh figures
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={isRefreshingFigures || analysis.assetType === 'ETF'}
                onClick={() => refreshFigures('full')}
              >
                Get full statements
              </Button>
              <span className="self-center text-xs text-muted-foreground">
                Full statements add debt, cash flow and multi-year trend, and use more of the daily allowance.
              </span>
            </CardContent>
          </Card>

          <CollapsibleSection
            id="analyzer-manual-figures"
            title="Missing figures — enter by hand if needed"
            defaultOpen={false}
          >
            <ManualFundamentalsForm
              symbol={analysis.symbol}
              assetType={analysis.assetType}
              sector={analysis.fundamental?.profile.label ?? null}
            />
          </CollapsibleSection>

          <CollapsibleSection id="analyzer-signal-history" title="Signal changes for this symbol" defaultOpen={false}>
            {history && history.length > 0 ? (
              <ul className="space-y-2 text-sm">
                {history.map((h) => (
                  <li key={h.id} className="flex flex-wrap items-baseline gap-2 border-b border-border/50 pb-2">
                    <Badge variant="outline">{h.to_signal}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {h.from_signal ? `was ${h.from_signal}, ` : ''}
                      {new Date(h.created_at as string).toLocaleString()}
                    </span>
                    <span className="text-xs">{h.reason ?? ''}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No saved readings yet. Use "Save this reading" to start a history for this symbol.
              </p>
            )}
          </CollapsibleSection>
        </div>
      )}

      {analysis && symbol && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What to do next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {analysis.hybrid.signal === 'GO'
                ? `${symbol} passes the gates right now. The next step is not buying — it is planning: turn this reading into written numbers before any money moves.`
                : analysis.hybrid.signal === 'WAIT'
                  ? `${symbol} is not a trade yet. Save this reading, put it on a watchlist, and let the scanner tell you when it qualifies.`
                  : analysis.hybrid.signal === 'REVIEW'
                    ? `${symbol} needs a closer look before it can qualify. Check the missing or weak pieces above, fill in what the provider could not supply, and re-run.`
                    : `${symbol} fails the gates today. That's a win for the process — a clear "no" is a completed task. Park it and move on to the next name.`}
            </p>
            <ol className="space-y-2 text-sm">
              {(analysis.hybrid.signal === 'GO'
                ? [
                    {
                      n: 1,
                      text: 'Plan the trade: entry, stop, target and share size in the Trade Planner.',
                      to: `/swingedge/planner?symbol=${symbol}`,
                      cta: 'Open Trade Planner',
                    },
                    {
                      n: 2,
                      text: 'Take it on paper first — a paper trade, not real money.',
                      to: '/swingedge/paper-trading',
                      cta: 'Open Paper Trading',
                    },
                    {
                      n: 3,
                      text: 'Journal the outcome so your record keeps building.',
                      to: '/swingedge/journal',
                      cta: 'Open Journal',
                    },
                  ]
                : analysis.hybrid.signal === 'REVIEW'
                  ? [
                      {
                        n: 1,
                        text: 'Fill in any missing fund or company figures manually below, then re-run the analysis.',
                        to: null,
                        cta: null,
                      },
                      {
                        n: 2,
                        text: 'If it still reviews badly, park it on a watchlist with a status so you remember why.',
                        to: '/swingedge/watchlists',
                        cta: 'Open Watchlists',
                      },
                      {
                        n: 3,
                        text: 'Move to the next candidate on your scanner list.',
                        to: '/swingedge/scanner',
                        cta: 'Back to Scanner',
                      },
                    ]
                  : analysis.hybrid.signal === 'WAIT'
                    ? [
                        {
                          n: 1,
                          text: 'Save this reading so you can see how the story changes.',
                          to: null,
                          cta: null,
                        },
                        {
                          n: 2,
                          text: 'Put it on a watchlist with the right status — setup forming, pullback watch or breakout watch.',
                          to: '/swingedge/watchlists',
                          cta: 'Open Watchlists',
                        },
                        {
                          n: 3,
                          text: 'Re-run the scanner tomorrow; it will flag when this name qualifies.',
                          to: '/swingedge/scanner',
                          cta: 'Back to Scanner',
                        },
                      ]
                    : [
                        {
                          n: 1,
                          text: 'Record the pass: mark it rejected on your watchlist so you stay honest with yourself.',
                          to: '/swingedge/watchlists',
                          cta: 'Open Watchlists',
                        },
                        {
                          n: 2,
                          text: 'Move to the next candidate on your scanner list.',
                          to: '/swingedge/scanner',
                          cta: 'Back to Scanner',
                        },
                      ]
              ).map((s) => (
                <li key={s.n} className="flex items-center gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-prism-teal/15 text-xs font-semibold text-prism-teal">
                    {s.n}
                  </span>
                  <span className="flex-1">{s.text}</span>
                  {s.to && s.cta && (
                    <Button asChild variant="outline" size="sm" className="shrink-0">
                      <Link to={s.to}>
                        {s.cta}
                        <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      <AiMentorCard
        scope="TRADE"
        page="Stock Analyzer"
        symbol={symbol}
        context={{
          price: analysis?.technical.price ?? null,
          technical: analysis?.technical ?? null,
          risk: analysis?.risk ?? null,
          tradability: analysis?.tradability ?? null,
          quality: analysis?.qualityScore ?? null,
          regime: analysis?.regime ?? null,
          levels: levels ?? null,
          bias: bias ?? null,
          readiness: readiness ?? null,
          eventRisk: eventView.result ?? null,
        }}
      />

      <AiLevelsAssistant
        page="Stock Analyzer"
        symbol={symbol}
        price={analysis?.technical.price ?? null}
        rules={
          levels
            ? {
                entry: levels.estimatedEntry,
                stop: levels.estimatedStop,
                target: levels.estimatedTarget,
                rewardRisk: levels.projectedRewardRisk,
              }
            : null
        }
        context={
          analysis
            ? {
                assetType: analysis.assetType,
                hybridSignal: analysis.hybrid,
                qualityScore: analysis.qualityScore,
                technicalScore: analysis.technical.score,
                verdict: analysis.technical.verdict,
                trend: analysis.technical.trend,
                setup: analysis.technical.setup,
                atr: analysis.technical.atr,
                support: analysis.technical.support,
                resistance: analysis.technical.resistance,
                rsi: analysis.technical.rsi,
                entryZone: analysis.entryZone,
                riskScore: analysis.risk,
                candleAssessments: analysis.candles?.assessments?.slice(0, 3) ?? null,
                candleConfirmation: analysis.candles?.confirmation ?? null,
                regime: analysis.regime,
                relativeStrength: analysis.relativeStrength,
                tradability: analysis.tradability,
                confidence: analysis.confidence,
                developing: analysis.developing,
              }
            : null
        }
      />
    </div>
  );
}
