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
import type { CandleConfirmation } from './candleContext';
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

/** Optional context so the chart can be judged against its sector and market. */
export interface AlignmentContext {
  assetType?: 'STOCK' | 'ETF';
  /** Trend of the broad market benchmark, normally SPY. */
  marketTrend?: TrendState | null;
  /** Trend of the sector benchmark for a stock, or of the fund's benchmark. */
  sectorTrend?: TrendState | null;
  sectorSymbol?: string | null;
  /**
   * Candlestick evidence, already scored in context. It contributes at most 7
   * points INSIDE Setup Quality — never a separate score on top of the 100.
   */
  candleConfirmation?: CandleConfirmation | null;
}


/**
 * Scores one symbol out of 100 across trend, momentum, setup, volume and
 * alignment with its sector and the wider market. Reward against risk is
 * deliberately NOT part of this score — that belongs to the risk layer, so the
 * chart read and the trade maths stay separable.
 */
export function scoreSymbol(symbol: string, candles: Candle[], alignment?: AlignmentContext): SymbolScore {
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

  // 1. Trend — 25 points.
  const trendPoints = trend === 'UP' ? 25 : trend === 'SIDEWAYS' ? 10 : 0;
  components.push({
    key: 'trend',
    label: 'Trend',
    points: trendPoints,
    max: 25,
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

  // 2. Momentum — 20 points: the reading itself plus whether it has turned up.
  let momentumPoints = 0;
  let momentumDetail = '';
  if (rsiValue === null) {
    momentumDetail = 'Not enough data for a momentum reading.';
  } else if (rsiValue >= 50 && rsiValue <= 70) {
    momentumPoints = 13;
    momentumDetail = `Momentum is healthy without being stretched (RSI ${round2(rsiValue)}).`;
    reasons.push('Momentum is firm but not overheated.');
  } else if (rsiValue > 70) {
    momentumPoints = 5;
    momentumDetail = `Momentum is stretched (RSI ${round2(rsiValue)}), so a pause is common.`;
    risks.push('Momentum is stretched, which raises the chance of buying right before a pullback.');
  } else if (rsiValue >= 40) {
    momentumPoints = 7;
    momentumDetail = `Momentum is soft but not broken (RSI ${round2(rsiValue)}).`;
  } else {
    momentumDetail = `Momentum is weak (RSI ${round2(rsiValue)}).`;
    risks.push('Momentum is weak, so buyers are not in control.');
  }
  if (hist !== null && hist > 0) {
    momentumPoints += 7;
    momentumDetail += ' Shorter-term momentum is running ahead of longer-term momentum.';
  } else if (hist !== null) {
    momentumDetail += ' Shorter-term momentum is still behind longer-term momentum.';
    risks.push('Momentum has not turned back up yet.');
  }
  components.push({ key: 'momentum', label: 'Momentum', points: Math.min(20, momentumPoints), max: 20, detail: momentumDetail });

  // 3. Setup quality — 25 points, split into three named parts so candlestick
  // evidence is a subcomponent rather than points layered on top of 100:
  //   structure 10 + candlestick confirmation 7 + breakout/pullback validation 8.
  const structurePoints = setup === 'NONE' ? 2 : 10;
  const validationPoints = setup === 'BREAKOUT' ? 8 : setup === 'PULLBACK' ? 6 : 1;
  const candleConf = alignment?.candleConfirmation ?? null;
  const candlePoints = candleConf ? candleConf.setupPoints : 3;
  const setupPoints = structurePoints + validationPoints + candlePoints;
  const setupParts: ScoreComponent[] = [
    {
      key: 'setup-structure',
      label: 'Structure',
      points: structurePoints,
      max: 10,
      detail:
        setup === 'NONE'
          ? 'No recognisable breakout or pullback right now, so an entry price would be arbitrary.'
          : setup === 'BREAKOUT'
            ? 'Price has cleared its recent high with participation.'
            : 'An uptrend has eased back near its 20-day average.',
    },
    {
      key: 'setup-candle',
      label: 'Candlestick confirmation',
      points: candlePoints,
      max: 7,
      detail: candleConf
        ? candleConf.setupDetail
        : 'Candlestick evidence was not supplied for this read, so it is scored neutrally.',
    },
    {
      key: 'setup-validation',
      label: 'Breakout / pullback validation',
      points: validationPoints,
      max: 8,
      detail:
        setup === 'BREAKOUT'
          ? 'The breakout is confirmed by a close above the prior range on volume.'
          : setup === 'PULLBACK'
            ? 'The pullback is still inside normal depth for the trend.'
            : 'There is nothing to validate without a defined setup.',
    },
  ];
  components.push({
    key: 'setup',
    label: 'Setup quality',
    points: setupPoints,
    max: 25,
    detail: setupParts.map((p) => `${p.label} ${p.points}/${p.max}`).join(' · '),
  });
  if (setup === 'BREAKOUT') reasons.push('Price broke above its recent range.');
  if (setup === 'PULLBACK') reasons.push('Uptrend has pulled back to a normal buying area.');
  if (setup === 'NONE') risks.push('There is no defined setup, so an entry price would be arbitrary.');
  if (candleConf?.best && candleConf.setupPoints >= 4) {
    reasons.push(`${candleConf.best.pattern.name} ${candleConf.best.location} backs the setup.`);
  }
  candleConf?.warnings.forEach((w) => risks.push(w));


  // 4. Volume — 15 points.
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

  // 5. Market and sector alignment — 15 points.
  const align = alignmentComponent(alignment);
  components.push(align.component);
  align.reasons.forEach((r) => reasons.push(r));
  align.risks.forEach((r) => risks.push(r));

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
 * Alignment is worth 15 points. A stock is judged against its sector and the
 * sector against the market; a fund is judged against its own benchmark. When
 * the benchmark data is missing the component is scored neutrally and says so,
 * because a data gap is not evidence against the symbol.
 */
function alignmentComponent(alignment?: AlignmentContext): {
  component: ScoreComponent;
  reasons: string[];
  risks: string[];
} {
  const reasons: string[] = [];
  const risks: string[] = [];
  const isEtf = alignment?.assetType === 'ETF';
  const market = alignment?.marketTrend ?? null;
  const sector = alignment?.sectorTrend ?? null;

  if (!alignment || (market === null && sector === null)) {
    return {
      component: {
        key: 'alignment',
        label: 'Market and sector alignment',
        points: 7,
        max: 15,
        detail: 'Benchmark data was not available, so this component is scored neutrally rather than against the symbol.',
      },
      reasons,
      risks: ['Sector and market comparison was unavailable for this read.'],
    };
  }

  if (isEtf) {
    const benchmark = sector ?? market;
    const points = benchmark === 'UP' ? 15 : benchmark === 'SIDEWAYS' ? 7 : 0;
    if (benchmark === 'UP') reasons.push('The benchmark this fund tracks is also trending up.');
    if (benchmark === 'DOWN') risks.push('The benchmark behind this fund is trending down.');
    return {
      component: {
        key: 'alignment',
        label: 'Benchmark alignment',
        points,
        max: 15,
        detail:
          benchmark === 'UP'
            ? 'The fund is moving with a benchmark that is trending up.'
            : benchmark === 'DOWN'
              ? 'The benchmark behind the fund is trending down, so the fund is fighting its own index.'
              : 'The benchmark behind the fund has no clear direction.',
      },
      reasons,
      risks,
    };
  }

  const sectorPoints = sector === 'UP' ? 8 : sector === 'SIDEWAYS' ? 4 : sector === 'DOWN' ? 0 : 4;
  const marketPoints = market === 'UP' ? 7 : market === 'SIDEWAYS' ? 3 : market === 'DOWN' ? 0 : 3;
  const sectorLabel = alignment.sectorSymbol ? `its sector (${alignment.sectorSymbol})` : 'its sector';
  if (sector === 'UP') reasons.push(`The symbol has ${sectorLabel} moving with it.`);
  if (sector === 'DOWN') risks.push(`${sectorLabel.charAt(0).toUpperCase()}${sectorLabel.slice(1)} is trending down, so the move has less support.`);
  if (market === 'DOWN') risks.push('The wider market is trending down, which lowers the odds of follow-through.');

  return {
    component: {
      key: 'alignment',
      label: 'Market and sector alignment',
      points: sectorPoints + marketPoints,
      max: 15,
      detail: `${sectorLabel.charAt(0).toUpperCase()}${sectorLabel.slice(1)} is ${(sector ?? 'unknown').toLowerCase()} and the wider market is ${(market ?? 'unknown').toLowerCase()}.`,
    },
    reasons,
    risks,
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
