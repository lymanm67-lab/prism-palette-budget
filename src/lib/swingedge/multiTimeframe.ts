// SwingEdge — Multi-Timeframe Analysis Engine.
//
// Each timeframe has one job, and a lower timeframe can never do a higher
// timeframe's job:
//
//   WEEKLY  provides the big picture
//   DAILY   creates the trade
//   4-HOUR  confirms the story
//   1-HOUR  times the entry
//   15-MIN  fine-tunes execution, and nothing else
//
// Nothing here forecasts. It only reports whether the charts agree, and it
// never lets a bullish 15-minute chart rescue a failed daily setup.

import { rsiRead, trendAlignment, type RsiState } from './framework';
import { ema, last, relativeVolume, atr as atrSeries, rsi as rsiSeries, sma, supportResistance, setupState, trendState, type SetupState } from './indicators';
import type { Candle, TrendState } from './types';

export type TimeframeKey = 'WEEKLY' | 'DAILY' | 'H4' | 'H1' | 'M15';

export const TIMEFRAME_ROLE: Record<TimeframeKey, { label: string; role: string; question: string }> = {
  WEEKLY: {
    label: 'Weekly',
    role: 'Big-picture context',
    question: 'What larger trend am I trading inside?',
  },
  DAILY: {
    label: 'Daily',
    role: 'The setup itself',
    question: 'Is there a valid swing-trading setup?',
  },
  H4: {
    label: '4 hour',
    role: 'Setup confirmation',
    question: 'Is the daily setup behaving the way we expected?',
  },
  H1: {
    label: '1 hour',
    role: 'Entry timing',
    question: 'Is price actually starting to move the way the daily setup says?',
  },
  M15: {
    label: '15 minute',
    role: 'Optional execution precision',
    question: 'Can I get a cleaner entry without changing the thesis?',
  },
};

/** Daily is dominant by design. These always total 100. */
export const DEFAULT_TIMEFRAME_WEIGHTS: Record<TimeframeKey, number> = {
  DAILY: 40,
  H4: 25,
  WEEKLY: 15,
  H1: 15,
  M15: 5,
};

export type WeeklyContext = 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'TRANSITION';
export type DailyState = 'VALID_SETUP' | 'DEVELOPING_SETUP' | 'NO_SETUP' | 'INVALIDATED';
export type H4State = 'CONFIRMS' | 'MIXED' | 'WEAKENING' | 'CONTRADICTS';
export type H1State = 'ENTRY_CONFIRMED' | 'EARLY' | 'WAITING' | 'FAILED';
export type M15State = 'CLEAN_ENTRY' | 'NEUTRAL' | 'EXTENDED' | 'CONTRADICTS' | 'NOT_USED';

export const STATE_LABEL: Record<string, string> = {
  BULLISH: 'BULLISH',
  NEUTRAL: 'NEUTRAL',
  BEARISH: 'BEARISH',
  TRANSITION: 'TRANSITION',
  VALID_SETUP: 'VALID SETUP',
  DEVELOPING_SETUP: 'DEVELOPING SETUP',
  NO_SETUP: 'NO SETUP',
  INVALIDATED: 'INVALIDATED',
  CONFIRMS: 'CONFIRMING',
  MIXED: 'MIXED',
  WEAKENING: 'WEAKENING',
  CONTRADICTS: 'CONTRADICTS',
  ENTRY_CONFIRMED: 'ENTRY CONFIRMED',
  EARLY: 'EARLY',
  WAITING: 'WAITING',
  FAILED: 'FAILED',
  CLEAN_ENTRY: 'CLEAN ENTRY',
  EXTENDED: 'EXTENDED',
  NOT_USED: 'NOT USED',
};

export type Structure = 'HIGHER_HIGHS_AND_LOWS' | 'LOWER_HIGHS_AND_LOWS' | 'MIXED';

export interface TimeframeMetrics {
  candles: number;
  price: number | null;
  trend: TrendState | null;
  ema20: number | null;
  sma50: number | null;
  aboveEma20: boolean | null;
  ema20AboveSma50: boolean | null;
  rsi: number | null;
  rsiState: RsiState | null;
  atr: number | null;
  atrPercentOfPrice: number | null;
  relativeVolume: number | null;
  support: number | null;
  resistance: number | null;
  structure: Structure | null;
  setup: SetupState | null;
}

const r2 = (n: number | null) => (n === null ? null : Math.round(n * 100) / 100);

/** Plain measurement of one timeframe. Anything unmeasurable stays null. */
export function timeframeMetrics(candles: Candle[]): TimeframeMetrics {
  const closes = candles.map((c) => c.close);
  const price = closes.length ? closes[closes.length - 1] : null;
  const e20 = last(ema(closes, 20));
  const s50 = last(sma(closes, 50));
  const sr = candles.length > 5 ? supportResistance(candles.slice(0, -1)) : supportResistance(candles);
  const atrValue = last(atrSeries(candles, 14));
  const rsiValue = last(rsiSeries(closes, 14));
  const rr = candles.length >= 20 ? rsiRead(candles) : null;

  let structure: Structure | null = null;
  const win = candles.slice(-40);
  if (win.length >= 20) {
    const half = Math.floor(win.length / 2);
    const firstHigh = Math.max(...win.slice(0, half).map((c) => c.high));
    const lastHigh = Math.max(...win.slice(half).map((c) => c.high));
    const firstLow = Math.min(...win.slice(0, half).map((c) => c.low));
    const lastLow = Math.min(...win.slice(half).map((c) => c.low));
    if (lastHigh > firstHigh && lastLow > firstLow) structure = 'HIGHER_HIGHS_AND_LOWS';
    else if (lastHigh < firstHigh && lastLow < firstLow) structure = 'LOWER_HIGHS_AND_LOWS';
    else structure = 'MIXED';
  }

  return {
    candles: candles.length,
    price: r2(price),
    trend: candles.length >= 50 ? trendState(candles) : null,
    ema20: r2(e20),
    sma50: r2(s50),
    aboveEma20: price !== null && e20 !== null ? price > e20 : null,
    ema20AboveSma50: e20 !== null && s50 !== null ? e20 > s50 : null,
    rsi: rsiValue === null ? null : Math.round(rsiValue * 10) / 10,
    rsiState: rr?.state ?? null,
    atr: r2(atrValue),
    atrPercentOfPrice: atrValue !== null && price ? Math.round((atrValue / price) * 1000) / 10 : null,
    relativeVolume: candles.length >= 25 ? relativeVolume(candles) : null,
    support: r2(sr.support),
    resistance: r2(sr.resistance),
    structure,
    setup: candles.length >= 45 ? setupState(candles) : null,
  };
}

export interface TimeframeRead<S extends string> {
  key: TimeframeKey;
  available: boolean;
  state: S;
  /** 0 to 1 contribution towards alignment. Null when the timeframe is missing. */
  score: number | null;
  headline: string;
  metrics: TimeframeMetrics;
}

const MIN_CANDLES: Record<TimeframeKey, number> = { WEEKLY: 30, DAILY: 50, H4: 40, H1: 40, M15: 30 };

/** Weekly gives context only. It never generates an entry. */
export function readWeekly(candles: Candle[]): TimeframeRead<WeeklyContext> {
  const metrics = timeframeMetrics(candles);
  if (candles.length < MIN_CANDLES.WEEKLY) {
    return {
      key: 'WEEKLY',
      available: false,
      state: 'NEUTRAL',
      score: null,
      headline: 'Not enough weekly history to read the bigger picture yet.',
      metrics,
    };
  }
  const ta = trendAlignment(candles);
  let state: WeeklyContext;
  if (ta.alignment === 'STRONG' || ta.alignment === 'ALIGNED') state = 'BULLISH';
  else if (ta.alignment === 'AGAINST') state = 'BEARISH';
  else if (metrics.aboveEma20 !== metrics.ema20AboveSma50) state = 'TRANSITION';
  else state = 'NEUTRAL';

  const score = state === 'BULLISH' ? 1 : state === 'NEUTRAL' ? 0.5 : state === 'TRANSITION' ? 0.4 : 0;
  const headline =
    state === 'BULLISH'
      ? 'The larger trend is up, so a long swing trade is going with the tide.'
      : state === 'BEARISH'
        ? 'The larger trend is down. A long trade here is swimming against the tide.'
        : state === 'TRANSITION'
          ? 'The weekly picture is changing hands — one part is up, another has not turned yet.'
          : 'The weekly picture is flat, so it neither helps nor hurts.';
  return { key: 'WEEKLY', available: true, state, score, headline, metrics };
}

/** Daily creates the trade. Everything else only reacts to this read. */
export function readDaily(candles: Candle[]): TimeframeRead<DailyState> {
  const metrics = timeframeMetrics(candles);
  if (candles.length < MIN_CANDLES.DAILY) {
    return {
      key: 'DAILY',
      available: false,
      state: 'NO_SETUP',
      score: null,
      headline: 'Not enough daily history to judge a setup.',
      metrics,
    };
  }
  const ta = trendAlignment(candles);
  const price = metrics.price ?? 0;
  const brokeSupport = metrics.support !== null && price < metrics.support * 0.99;
  const setup = metrics.setup ?? 'NONE';

  let state: DailyState;
  if (ta.alignment === 'AGAINST' || (brokeSupport && metrics.aboveEma20 === false)) state = 'INVALIDATED';
  else if (setup !== 'NONE' && (ta.alignment === 'STRONG' || ta.alignment === 'ALIGNED')) state = 'VALID_SETUP';
  else if (setup !== 'NONE' || ta.alignment === 'STRONG') state = 'DEVELOPING_SETUP';
  else state = 'NO_SETUP';

  const score = state === 'VALID_SETUP' ? 1 : state === 'DEVELOPING_SETUP' ? 0.5 : state === 'NO_SETUP' ? 0.2 : 0;
  const headline =
    state === 'VALID_SETUP'
      ? `A ${setup === 'BREAKOUT' ? 'breakout' : 'pullback'} setup is in place on the daily chart.`
      : state === 'DEVELOPING_SETUP'
        ? 'Something is forming on the daily chart, but it is not a setup yet.'
        : state === 'NO_SETUP'
          ? 'There is no swing setup on the daily chart. Lower timeframes cannot create one.'
          : 'The daily setup has failed. That is a stop, whatever the shorter charts show.';
  return { key: 'DAILY', available: true, state, score, headline, metrics };
}

function agreementScore(metrics: TimeframeMetrics): { score: number; parts: string[] } {
  const votes: (boolean | null)[] = [
    metrics.aboveEma20,
    metrics.ema20AboveSma50,
    metrics.structure === null ? null : metrics.structure === 'HIGHER_HIGHS_AND_LOWS',
    metrics.rsiState === null ? null : metrics.rsiState !== 'WEAKENING',
    metrics.relativeVolume === null ? null : metrics.relativeVolume >= 0.9,
  ];
  const known = votes.filter((v) => v !== null) as boolean[];
  const parts: string[] = [];
  if (metrics.aboveEma20 !== null) parts.push(metrics.aboveEma20 ? 'price above its 20 EMA' : 'price below its 20 EMA');
  if (metrics.structure) parts.push(metrics.structure === 'HIGHER_HIGHS_AND_LOWS' ? 'higher highs and higher lows' : metrics.structure === 'LOWER_HIGHS_AND_LOWS' ? 'lower highs and lower lows' : 'mixed swing structure');
  if (metrics.rsiState) parts.push(`momentum ${metrics.rsiState.toLowerCase()}`);
  return { score: known.length ? known.filter(Boolean).length / known.length : 0.5, parts };
}

/** 4-hour confirms or questions the daily story. It cannot create a trade. */
export function readH4(candles: Candle[]): TimeframeRead<H4State> {
  const metrics = timeframeMetrics(candles);
  if (candles.length < MIN_CANDLES.H4) {
    return {
      key: 'H4',
      available: false,
      state: 'MIXED',
      score: null,
      headline: 'No 4-hour history available, so the daily setup is unconfirmed.',
      metrics,
    };
  }
  const { score, parts } = agreementScore(metrics);
  const state: H4State = score >= 0.75 ? 'CONFIRMS' : score >= 0.5 ? 'MIXED' : score >= 0.3 ? 'WEAKENING' : 'CONTRADICTS';
  const headline =
    state === 'CONFIRMS'
      ? `The 4-hour chart is behaving as expected: ${parts.slice(0, 2).join(' and ') || 'structure holding'}.`
      : state === 'MIXED'
        ? 'The 4-hour chart is neither confirming nor denying the daily setup.'
        : state === 'WEAKENING'
          ? 'The 4-hour chart is losing strength underneath the daily setup.'
          : 'The 4-hour chart contradicts the daily setup. That needs a review before anything else.';
  return { key: 'H4', available: true, state, score, headline, metrics };
}

/** 1-hour times the entry for a setup that already qualified on the daily. */
export function readH1(candles: Candle[]): TimeframeRead<H1State> {
  const metrics = timeframeMetrics(candles);
  if (candles.length < MIN_CANDLES.H1) {
    return {
      key: 'H1',
      available: false,
      state: 'WAITING',
      score: null,
      headline: 'No 1-hour history available, so entry timing is unconfirmed.',
      metrics,
    };
  }
  const price = metrics.price ?? 0;
  const brokeResistance = metrics.resistance !== null && price > metrics.resistance;
  const higherLows = metrics.structure === 'HIGHER_HIGHS_AND_LOWS';
  const turning = metrics.rsiState === 'STRENGTHENING';
  const above = metrics.aboveEma20 === true;

  let state: H1State;
  if (!above && metrics.rsiState === 'WEAKENING') state = 'FAILED';
  else if (above && brokeResistance && (higherLows || turning)) state = 'ENTRY_CONFIRMED';
  else if (above && (higherLows || turning)) state = 'EARLY';
  else state = 'WAITING';

  const score = state === 'ENTRY_CONFIRMED' ? 1 : state === 'EARLY' ? 0.6 : state === 'WAITING' ? 0.35 : 0;
  const headline =
    state === 'ENTRY_CONFIRMED'
      ? 'The 1-hour chart has made a higher low and cleared short-term resistance.'
      : state === 'EARLY'
        ? 'The 1-hour chart is turning up but has not cleared short-term resistance yet.'
        : state === 'WAITING'
          ? 'The 1-hour chart has not started moving in the direction of the daily setup.'
          : 'The 1-hour chart is falling away. Wait for it to settle.';
  return { key: 'H1', available: true, state, score, headline, metrics };
}

/**
 * 15-minute is optional precision. It contributes a small amount to the score
 * and is never allowed to change the decision.
 */
export function readM15(candles: Candle[]): TimeframeRead<M15State> {
  const metrics = timeframeMetrics(candles);
  if (candles.length < MIN_CANDLES.M15) {
    return {
      key: 'M15',
      available: false,
      state: 'NOT_USED',
      score: null,
      headline: 'The 15-minute chart is optional and is not being used.',
      metrics,
    };
  }
  const { score } = agreementScore(metrics);
  const stretched = metrics.rsiState === 'EXTENDED';
  const state: M15State = stretched ? 'EXTENDED' : score >= 0.75 ? 'CLEAN_ENTRY' : score >= 0.4 ? 'NEUTRAL' : 'CONTRADICTS';
  const headline =
    state === 'CLEAN_ENTRY'
      ? 'The 15-minute chart offers a tidy entry without changing the thesis.'
      : state === 'EXTENDED'
        ? 'The 15-minute chart is stretched. Buying here usually means a worse price.'
        : state === 'CONTRADICTS'
          ? 'The 15-minute chart is soft. That is short-term noise, not a reason to abandon the trade.'
          : 'The 15-minute chart is unremarkable, which is fine.';
  return { key: 'M15', available: true, state, score, headline, metrics };
}

export type AlignmentState = 'STRONG_ALIGNMENT' | 'ALIGNED' | 'MIXED' | 'CONFLICT';

export const ALIGNMENT_LABEL: Record<AlignmentState, string> = {
  STRONG_ALIGNMENT: 'STRONG ALIGNMENT',
  ALIGNED: 'ALIGNED',
  MIXED: 'MIXED',
  CONFLICT: 'CONFLICT',
};

export type MtfDecision = 'GO' | 'WAIT' | 'REVIEW' | 'STOP' | 'NO_TRADE';

export const MTF_DECISION_LABEL: Record<MtfDecision, string> = {
  GO: 'GO',
  WAIT: 'WAIT',
  REVIEW: 'REVIEW',
  STOP: 'STOP',
  NO_TRADE: 'NO TRADE',
};

export type MtfWarningCode =
  | 'DAILY_4H_CONFLICT'
  | 'WEEKLY_HEADWIND'
  | 'H1_ENTRY_NOT_CONFIRMED'
  | 'M15_CONTRADICTS_ENTRY'
  | 'LOWER_TIMEFRAME_NOISE'
  | 'PRICE_EXTENDED'
  | 'DAILY_NO_SETUP'
  | 'DAILY_INVALIDATED';

export interface MtfWarning {
  code: MtfWarningCode;
  label: string;
  detail: string;
}

export interface MtfRow {
  key: TimeframeKey;
  label: string;
  role: string;
  question: string;
  state: string;
  stateLabel: string;
  headline: string;
  weight: number;
  score: number | null;
  points: number;
  available: boolean;
  metrics: TimeframeMetrics;
}

export interface MultiTimeframeInput {
  weekly?: TimeframeRead<WeeklyContext> | null;
  daily?: TimeframeRead<DailyState> | null;
  h4?: TimeframeRead<H4State> | null;
  h1?: TimeframeRead<H1State> | null;
  m15?: TimeframeRead<M15State> | null;
  weights?: Partial<Record<TimeframeKey, number>>;
  /** Beginner Mode turns the timeframe rules into hard gates. */
  beginner?: boolean;
  price?: number | null;
  entryZone?: { low: number; high: number } | null;
}

export interface MultiTimeframeResult {
  /** 0 to 100, weighted by each timeframe's job. */
  score: number;
  alignment: AlignmentState;
  alignmentLabel: string;
  decision: MtfDecision;
  headline: string;
  rows: MtfRow[];
  hardGates: string[];
  warnings: MtfWarning[];
  dailyThesis: string;
  entryTimeframe: string;
  managementTimeframe: string;
  unavailable: TimeframeKey[];
  priceExtended: boolean;
}

export const MTF_MANAGEMENT_WARNING =
  'Lower-timeframe noise does not automatically invalidate a higher-timeframe swing setup.';

export const MTF_MANAGEMENT_TEXT =
  'Manage this trade from the daily and 4-hour charts. The 1-hour chart can help with execution and trailing. The 15-minute chart is not a reason to exit.';

export const MTF_STOP_TEXT =
  'The stop comes from daily structure, daily support or the daily breakout level, confirmed on the 4-hour chart and sized with ATR. A 15-minute bearish candle is not a reason to tighten it.';

export const MTF_PRINCIPLE = [
  'The daily chart creates the trade.',
  'The 4-hour chart confirms the story.',
  'The 1-hour chart times the entry.',
  'The 15-minute chart fine-tunes execution.',
  'The weekly chart keeps you aware of the bigger picture.',
];

/** Everything that forces the multi-timeframe read to be taken again. */
export const MTF_REVALIDATION_TRIGGERS = [
  'A new daily candle has completed.',
  'A new 4-hour candle has completed.',
  'The 1-hour structure has changed materially.',
  'The market regime has changed.',
  'Event risk has changed.',
  'Price has left the entry zone.',
  'The stop has moved.',
  'The directional bias has changed materially.',
  'Immediately before a paper trade is recorded.',
];

/**
 * Weights each timeframe by its job rather than counting bullish signals, then
 * applies the timeframe rules. Hard gates always beat the score.
 */
export function multiTimeframeAlignment(input: MultiTimeframeInput): MultiTimeframeResult {
  const weights = { ...DEFAULT_TIMEFRAME_WEIGHTS, ...(input.weights ?? {}) };
  const reads: Record<TimeframeKey, TimeframeRead<string> | null> = {
    WEEKLY: input.weekly ?? null,
    DAILY: input.daily ?? null,
    H4: input.h4 ?? null,
    H1: input.h1 ?? null,
    M15: input.m15 ?? null,
  };

  const keys: TimeframeKey[] = ['WEEKLY', 'DAILY', 'H4', 'H1', 'M15'];
  const unavailable: TimeframeKey[] = [];
  const rows: MtfRow[] = keys.map((key) => {
    const read = reads[key];
    const available = !!read?.available;
    if (!available) unavailable.push(key);
    const score = available ? (read?.score ?? null) : null;
    const meta = TIMEFRAME_ROLE[key];
    return {
      key,
      label: meta.label,
      role: meta.role,
      question: meta.question,
      state: read?.state ?? 'NOT_USED',
      stateLabel: STATE_LABEL[read?.state ?? 'NOT_USED'] ?? (read?.state ?? 'NOT USED'),
      headline: read?.headline ?? 'This timeframe has not been read.',
      weight: weights[key],
      score,
      points: score === null ? 0 : Math.round(score * weights[key] * 10) / 10,
      available,
      metrics: read?.metrics ?? timeframeMetrics([]),
    };
  });

  // Score over the timeframes actually measured, so a missing optional chart
  // does not silently drag the number down.
  const measured = rows.filter((r) => r.score !== null);
  const weightSum = measured.reduce((s, r) => s + r.weight, 0);
  const score = weightSum > 0 ? Math.round((measured.reduce((s, r) => s + r.points, 0) / weightSum) * 100) : 0;

  const weekly = input.weekly?.available ? input.weekly.state : null;
  const daily = input.daily?.available ? input.daily.state : null;
  const h4 = input.h4?.available ? input.h4.state : null;
  const h1 = input.h1?.available ? input.h1.state : null;
  const m15 = input.m15?.available ? input.m15.state : null;

  const priceExtended =
    typeof input.price === 'number' && input.entryZone ? input.price > input.entryZone.high : false;

  const warnings: MtfWarning[] = [];
  if (daily === 'INVALIDATED') {
    warnings.push({
      code: 'DAILY_INVALIDATED',
      label: 'DAILY INVALIDATED',
      detail: 'The daily structure has failed, so the trade is over regardless of the shorter charts.',
    });
  }
  if (daily === 'NO_SETUP') {
    warnings.push({
      code: 'DAILY_NO_SETUP',
      label: 'NO DAILY SETUP',
      detail: 'There is no daily setup. A 1-hour or 15-minute move cannot create a swing trade.',
    });
  }
  if (daily && daily !== 'INVALIDATED' && (h4 === 'CONTRADICTS' || h4 === 'WEAKENING')) {
    warnings.push({
      code: 'DAILY_4H_CONFLICT',
      label: 'DAILY / 4H CONFLICT',
      detail: 'The 4-hour chart is not behaving the way the daily setup expects.',
    });
  }
  if (weekly === 'BEARISH') {
    warnings.push({
      code: 'WEEKLY_HEADWIND',
      label: 'WEEKLY HEADWIND',
      detail: 'The weekly trend is against a long trade. That does not stop the trade, but it lowers the odds.',
    });
  }
  if (h1 && h1 !== 'ENTRY_CONFIRMED') {
    warnings.push({
      code: 'H1_ENTRY_NOT_CONFIRMED',
      label: '1H ENTRY NOT CONFIRMED',
      detail: 'Entry timing has not confirmed on the 1-hour chart. Waiting costs nothing.',
    });
  }
  if (m15 === 'CONTRADICTS' || m15 === 'EXTENDED') {
    warnings.push({
      code: 'M15_CONTRADICTS_ENTRY',
      label: '15M CONTRADICTS ENTRY',
      detail: 'The 15-minute chart disagrees with the entry. Use it to time, not to decide.',
    });
    if (daily === 'VALID_SETUP') {
      warnings.push({
        code: 'LOWER_TIMEFRAME_NOISE',
        label: 'LOWER-TIMEFRAME NOISE',
        detail: MTF_MANAGEMENT_WARNING,
      });
    }
  }
  if (priceExtended) {
    warnings.push({
      code: 'PRICE_EXTENDED',
      label: 'PRICE EXTENDED — WAIT FOR NEW ENTRY',
      detail:
        'Price has run past the planned entry zone. Strong momentum on the shorter charts is not a reason to chase.',
    });
  }

  // Alignment. The 15-minute chart can never lift this to STRONG ALIGNMENT.
  let alignment: AlignmentState;
  if (daily === 'INVALIDATED' || h4 === 'CONTRADICTS' || h1 === 'FAILED' || (weekly === 'BEARISH' && daily !== 'VALID_SETUP')) {
    alignment = 'CONFLICT';
  } else if (
    daily === 'VALID_SETUP' &&
    h4 === 'CONFIRMS' &&
    h1 === 'ENTRY_CONFIRMED' &&
    weekly !== 'BEARISH' &&
    score >= 75
  ) {
    alignment = 'STRONG_ALIGNMENT';
  } else if (
    daily === 'VALID_SETUP' &&
    (h4 === 'CONFIRMS' || h4 === 'MIXED') &&
    (h1 === 'ENTRY_CONFIRMED' || h1 === 'EARLY') &&
    score >= 60
  ) {
    alignment = 'ALIGNED';
  } else {
    alignment = 'MIXED';
  }

  // Decision. Read top to bottom; the first failure wins.
  let decision: MtfDecision;
  if (daily === 'INVALIDATED') decision = 'STOP';
  else if (daily === 'NO_SETUP' || daily === null) decision = 'NO_TRADE';
  else if (h4 === 'CONTRADICTS') decision = 'REVIEW';
  else if (priceExtended) decision = 'WAIT';
  else if (daily === 'DEVELOPING_SETUP') decision = 'WAIT';
  else if (h1 !== 'ENTRY_CONFIRMED') decision = 'WAIT';
  else if (weekly === 'BEARISH' || h4 === 'WEAKENING') decision = 'REVIEW';
  else decision = 'GO';

  const hardGates: string[] = [];
  if (input.beginner !== false) {
    if (daily === 'INVALIDATED') hardGates.push('The daily setup has been invalidated.');
    if (daily === 'NO_SETUP' || daily === null) hardGates.push('There is no valid daily setup to trade.');
    if (h4 === 'CONTRADICTS') hardGates.push('The 4-hour chart strongly contradicts the daily setup.');
    if (h1 !== 'ENTRY_CONFIRMED') hardGates.push('Entry has not confirmed on the 1-hour chart.');
    if (weekly === 'BEARISH' && daily !== 'VALID_SETUP') hardGates.push('The weekly trend contradicts this trade.');
    if (priceExtended) hardGates.push('Price is beyond the planned entry zone.');
  }

  const dailyThesis =
    input.daily?.headline ?? 'The daily chart has not been read, so there is no thesis to trade.';

  const headline =
    decision === 'STOP'
      ? 'STOP — the daily structure has failed. Shorter charts cannot rescue it.'
      : decision === 'NO_TRADE'
        ? 'NO TRADE — there is no daily setup. Lower timeframes cannot create the swing setup.'
        : decision === 'REVIEW'
          ? `REVIEW — the timeframes disagree at ${score} of 100. Work out which chart is wrong before risking money.`
          : decision === 'WAIT'
            ? `WAIT — the setup is intact at ${score} of 100, but the entry has not earned itself yet.`
            : `${ALIGNMENT_LABEL[alignment]} at ${score} of 100. Every timeframe is doing its job — that is permission to plan, not a promise.`;

  return {
    score,
    alignment,
    alignmentLabel: ALIGNMENT_LABEL[alignment],
    decision,
    headline,
    rows,
    hardGates,
    warnings,
    dailyThesis,
    entryTimeframe: '1 hour, with the 15-minute chart optional for precision',
    managementTimeframe: 'Daily and 4 hour',
    unavailable,
    priceExtended,
  };
}

/** Course drills for the multi-timeframe module. */
export const MTF_EXERCISES = [
  '5 weekly-to-daily trend reviews.',
  '10 daily setup reviews.',
  '10 daily-to-4-hour confirmation exercises.',
  '10 one-hour entry-timing exercises.',
  '5 fifteen-minute entry fine-tuning exercises.',
  '5 timeframe-conflict examples written up in your own words.',
];
