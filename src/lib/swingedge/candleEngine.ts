// SwingEdge Analyzer — one entry point for candlestick analysis.
//
// Ties the pieces together in the order the app teaches: validate the data,
// measure each candle, detect patterns, judge them in context, then hand a
// single capped contribution to Setup Quality. Nothing here decides a trade.

import { anatomySeries, checkCandleData, DEFAULT_CANDLE_CONFIG, toWeekly, type CandleConfig } from './candles';
import { assessPattern, summariseConfirmation, type CandleAssessment, type CandleConfirmation, type CandleContext } from './candleContext';
import { detectPatterns, type PatternDetection } from './patterns';
import { last, relativeVolume, atr as atrSeries, ema, macd, rsi, setupState, sma, supportResistance, trendState } from './indicators';
import type { Candle } from './types';

export type CandleTimeframe = '1day' | '1week' | '4h' | '1h';

export interface CandleAnalysisOptions {
  config?: CandleConfig;
  /** Number of candles that are fully closed. Anything after that is developing. */
  completedCount?: number;
  /** Beginner Mode shows only the major patterns and hides tolerance settings. */
  majorOnly?: boolean;
  lookback?: number;
  /** Only show patterns at or above this confirmation score. Advanced Mode can lower it. */
  minScore?: number;
  marketTrend?: CandleContext['marketTrend'];
  sectorTrend?: CandleContext['sectorTrend'];
  timeframe?: CandleTimeframe;
}

export interface CandleAnalysis {
  timeframe: CandleTimeframe;
  dataOk: boolean;
  dataMessage: string | null;
  context: CandleContext;
  /** Every pattern found in the lookback window, newest last. */
  patterns: PatternDetection[];
  /** Contextual assessments above the display threshold, ranked. */
  assessments: CandleAssessment[];
  /** Full history for the symbol including low-significance patterns. */
  history: CandleAssessment[];
  confirmation: CandleConfirmation;
  developing: boolean;
  weeklyTrend: CandleContext['higherTimeframeTrend'];
}

const EMPTY_CONFIRMATION: CandleConfirmation = {
  best: null,
  ranked: [],
  setupPoints: 3,
  setupDetail: 'Candlestick evidence was not available, so this is scored neutrally.',
  flags: [],
  warnings: [],
};

/**
 * Runs the whole candlestick read for one symbol on one timeframe. Patterns are
 * detected separately per timeframe and are never treated as the same signal
 * across timeframes.
 */
export function analyzeCandles(candles: Candle[], opts: CandleAnalysisOptions = {}): CandleAnalysis {
  const cfg = opts.config ?? DEFAULT_CANDLE_CONFIG;
  const timeframe = opts.timeframe ?? '1day';
  const quality = checkCandleData(candles);
  const closes = candles.map((c) => c.close);
  const sr = supportResistance(candles);
  const weekly = candles.length >= 60 ? trendState(toWeekly(candles)) : null;

  const context: CandleContext = {
    trend: candles.length >= 50 ? trendState(candles) : 'SIDEWAYS',
    setup: candles.length >= 45 ? setupState(candles) : 'NONE',
    support: sr.support,
    resistance: sr.resistance,
    ema20: last(ema(closes, 20)),
    sma50: last(sma(closes, 50)),
    swingHigh: sr.resistance,
    swingLow: sr.support,
    atr: last(atrSeries(candles, 14)),
    rsi: last(rsi(closes, 14)),
    macdHistogram: last(macd(closes).histogram),
    marketTrend: opts.marketTrend ?? null,
    sectorTrend: opts.sectorTrend ?? null,
    higherTimeframeTrend: weekly,
    price: closes[closes.length - 1] ?? null,
  };

  if (!quality.ok) {
    return {
      timeframe,
      dataOk: false,
      dataMessage: quality.message,
      context,
      patterns: [],
      assessments: [],
      history: [],
      confirmation: { ...EMPTY_CONFIRMATION, warnings: quality.message ? [quality.message] : [] },
      developing: false,
      weeklyTrend: weekly,
    };
  }

  const series = anatomySeries(candles, cfg);
  const completed = opts.completedCount ?? candles.length;
  const lastCompletedIndex = Math.min(candles.length - 1, Math.max(0, completed - 1));
  const developing = lastCompletedIndex < candles.length - 1;

  const patterns = detectPatterns(series, {
    config: cfg,
    lookback: opts.lookback ?? 30,
    lastCompletedIndex,
    majorOnly: opts.majorOnly,
  });

  const history = patterns.map((p) => assessPattern(p, series, context, cfg));
  const threshold = opts.minScore ?? cfg.minConfirmationScore;
  const confirmation = summariseConfirmation(
    history.filter((h) => h.pattern.index >= series.length - 6),
    context,
  );
  const assessments = confirmation.ranked.filter((a) => a.score >= threshold);

  return {
    timeframe,
    dataOk: true,
    dataMessage: null,
    context,
    patterns,
    assessments,
    history: [...history].reverse(),
    confirmation,
    developing,
    weeklyTrend: weekly,
  };
}
