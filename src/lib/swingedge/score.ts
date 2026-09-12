// SwingEdge Analyzer — original scoring and verdict engine.
// Pure functions over cached candles. No provider calls, no API credits.
//
// The score is a transparent sum of five named components so a trader can always
// read WHY a symbol scored what it scored. It is not a prediction and it is not
// a signal — it is a checklist tally.

import {
  atr,
  ema,
  last,
  macd,
  relativeVolume,
  rsi,
  setupState,
  sma,
  supportResistance,
  trendState,
  type SetupState,
} from './indicators';
import { estimateLevels, type EstimatedLevels } from './risk';
import type { Candle, TrendState, Verdict } from './types';

export interface ScoreComponent {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface SymbolScore {
  symbol: string;
  score: number;
  verdict: Verdict;
  trend: TrendState;
  setup: SetupState;
  price: number | null;
  rsi: number | null;
  macdHistogram: number | null;
  relativeVolume: number | null;
  atr: number | null;
  support: number | null;
  resistance: number | null;
  levels: EstimatedLevels | null;
  components: ScoreComponent[];
  reasons: string[];
  risks: string[];
  /** True when there simply are not enough candles to judge anything. */
  insufficientData: boolean;
}

const MIN_CANDLES = 60;
const round2 = (n: number) => Math.round(n * 100) / 100;

const EMPTY = (symbol: string): SymbolScore => ({
  symbol,
  score: 0,
  verdict: 'NOT_READY',
  trend: 'SIDEWAYS',
  setup: 'NONE',
  price: null,
  rsi: null,
  macdHistogram: null,
  relativeVolume: null,
  atr: null,
  support: null,
  resistance: null,
  levels: null,
  components: [],
  reasons: [],
  risks: ['Not enough price history to judge this symbol yet.'],
  insufficientData: true,
});

/**
 * Scores one symbol out of 100 across trend, momentum, momentum confirmation,
 * setup and volume. Every component carries the sentence that explains it.
 */
export function scoreSymbol(symbol: string, candles: Candle[]): SymbolScore {
  const sym = symbol.toUpperCase();
  if (!candles || candles.length < MIN_CANDLES) return EMPTY(sym);

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const trend = trendState(candles);
  const setup = setupState(candles);
  const rsiValue = last(rsi(closes, 14));
  const hist = last(macd(closes).histogram);
  const rvol = relativeVolume(candles);
  const atrValue = last(atr(candles, 14));
  const { support, resistance } = supportResistance(candles);
  const e20 = last(ema(closes, 20));
  const s50 = last(sma(closes, 50));

  const components: ScoreComponent[] = [];
  const reasons: string[] = [];
  const risks: string[] = [];

  // 1. Trend — 30 points.
  const trendPoints = trend === 'UP' ? 30 : trend === 'SIDEWAYS' ? 12 : 0;
  components.push({
    key: 'trend',
    label: 'Trend',
    points: trendPoints,
    max: 30,
    detail:
      trend === 'UP'
        ? 'The 20-day average is above the 50-day average and price is holding above it.'
        : trend === 'DOWN'
          ? 'The 20-day average is below the 50-day average and price is under it.'
          : 'The averages are flat and close together, so there is no clear direction.',
  });
  if (trend === 'UP') reasons.push('Trend is up on the daily chart.');
  if (trend === 'DOWN') risks.push('The trend is down. Long swing trades fight the tide here.');
  if (trend === 'SIDEWAYS') risks.push('No clear trend, so moves are more likely to stall.');

  // 2. Momentum — 20 points.
  let momentumPoints = 0;
  let momentumDetail = '';
  if (rsiValue === null) {
    momentumDetail = 'Not enough data for a momentum reading.';
  } else if (rsiValue >= 50 && rsiValue <= 70) {
    momentumPoints = 20;
    momentumDetail = `Momentum is healthy without being stretched (RSI ${round2(rsiValue)}).`;
    reasons.push('Momentum is firm but not overheated.');
  } else if (rsiValue > 70) {
    momentumPoints = 8;
    momentumDetail = `Momentum is stretched (RSI ${round2(rsiValue)}), so a pause is common.`;
    risks.push('Momentum is stretched, which raises the chance of buying right before a pullback.');
  } else if (rsiValue >= 40) {
    momentumPoints = 10;
    momentumDetail = `Momentum is soft but not broken (RSI ${round2(rsiValue)}).`;
  } else {
    momentumPoints = 0;
    momentumDetail = `Momentum is weak (RSI ${round2(rsiValue)}).`;
    risks.push('Momentum is weak, so buyers are not in control.');
  }
  components.push({ key: 'momentum', label: 'Momentum', points: momentumPoints, max: 20, detail: momentumDetail });

  // 3. Momentum confirmation — 15 points.
  const confirmPoints = hist !== null && hist > 0 ? 15 : 0;
  components.push({
    key: 'confirmation',
    label: 'Momentum confirmation',
    points: confirmPoints,
    max: 15,
    detail:
      hist === null
        ? 'Not enough data to confirm momentum.'
        : hist > 0
          ? 'Shorter-term momentum is running ahead of longer-term momentum.'
          : 'Shorter-term momentum is still behind longer-term momentum.',
  });
  if (confirmPoints === 0 && hist !== null) risks.push('Momentum has not turned back up yet.');

  // 4. Setup — 20 points.
  const setupPoints = setup === 'BREAKOUT' ? 20 : setup === 'PULLBACK' ? 16 : 4;
  components.push({
    key: 'setup',
    label: 'Setup',
    points: setupPoints,
    max: 20,
    detail:
      setup === 'BREAKOUT'
        ? 'Price has cleared its recent high with participation.'
        : setup === 'PULLBACK'
          ? 'An uptrend has eased back near its 20-day average.'
          : 'No recognisable breakout or pullback right now.',
  });
  if (setup === 'BREAKOUT') reasons.push('Price broke above its recent range.');
  if (setup === 'PULLBACK') reasons.push('Uptrend has pulled back to a normal buying area.');
  if (setup === 'NONE') risks.push('There is no defined setup, so an entry price would be arbitrary.');

  // 5. Volume — 15 points.
  let volumePoints = 0;
  let volumeDetail = 'No volume reading available.';
  if (rvol !== null) {
    if (rvol >= 1.5) {
      volumePoints = 15;
      volumeDetail = `Volume is ${round2(rvol)}x its recent average — strong participation.`;
      reasons.push('Volume is well above average.');
    } else if (rvol >= 1) {
      volumePoints = 10;
      volumeDetail = `Volume is ${round2(rvol)}x its recent average.`;
    } else if (rvol >= 0.7) {
      volumePoints = 5;
      volumeDetail = `Volume is light at ${round2(rvol)}x its recent average.`;
    } else {
      volumeDetail = `Volume is very light at ${round2(rvol)}x its recent average.`;
      risks.push('Very light volume means moves can reverse easily.');
    }
  }
  components.push({ key: 'volume', label: 'Volume', points: volumePoints, max: 15, detail: volumeDetail });

  const score = components.reduce((sum, c) => sum + c.points, 0);
  const levels = estimateLevels(price, atrValue, support);

  if (e20 !== null && s50 !== null && price !== undefined) {
    const extended = (price - e20) / e20;
    if (extended > 0.08) {
      risks.push('Price is far above its 20-day average, so the stop would have to be wide.');
    }
  }
  if (resistance !== null && price < resistance && (resistance - price) / price < 0.01 && setup !== 'BREAKOUT') {
    risks.push('Price is sitting right under recent resistance.');
  }

  const verdict = verdictFor({ score, trend, setup });

  return {
    symbol: sym,
    score,
    verdict,
    trend,
    setup,
    price: round2(price),
    rsi: rsiValue === null ? null : round2(rsiValue),
    macdHistogram: hist === null ? null : round2(hist),
    relativeVolume: rvol === null ? null : round2(rvol),
    atr: atrValue === null ? null : round2(atrValue),
    support: support === null ? null : round2(support),
    resistance: resistance === null ? null : round2(resistance),
    levels,
    components,
    reasons,
    risks,
    insufficientData: false,
  };
}

/**
 * Four statuses so a good chart that has not set up yet reads as WATCH instead
 * of a failure:
 *  QUALIFIES        — up trend, a real setup, and a strong tally.
 *  WATCH            — worth following, but something is still missing.
 *  NOT READY        — the chart is fine but there is no setup to act on.
 *  DOES NOT QUALIFY — the trend or the tally rules it out.
 */
export function verdictFor(input: { score: number; trend: TrendState; setup: SetupState }): Verdict {
  const { score, trend, setup } = input;
  if (trend === 'DOWN' || score < 45) return 'DOES_NOT_QUALIFY';
  if (trend === 'UP' && setup !== 'NONE' && score >= 70) return 'QUALIFIES';
  if (setup === 'NONE') return 'NOT_READY';
  return 'WATCH';
}

export const VERDICT_TONE: Record<Verdict, string> = {
  QUALIFIES: 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime',
  WATCH: 'border-prism-sky/50 bg-prism-sky/10 text-prism-sky',
  NOT_READY: 'border-muted-foreground/40 bg-muted/40 text-muted-foreground',
  DOES_NOT_QUALIFY: 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose',
};

export const VERDICT_MEANING: Record<Verdict, string> = {
  QUALIFIES: 'Up trend, a defined setup and a strong checklist tally.',
  WATCH: 'Worth following, but at least one part of the checklist is missing.',
  NOT_READY: 'The chart is acceptable but there is no setup to act on today.',
  DOES_NOT_QUALIFY: 'The trend or the checklist rules this one out for a long swing trade.',
};

export function scoreTone(score: number): string {
  if (score >= 70) return 'text-prism-lime';
  if (score >= 45) return 'text-prism-sky';
  return 'text-prism-rose';
}
