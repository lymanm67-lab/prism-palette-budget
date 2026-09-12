// SwingEdge Analyzer — candlestick context engine.
//
// A pattern name on its own says very little. This module asks where the candle
// formed, what came before it, whether volume and momentum agreed, and how big
// the candle was against its own normal range — then turns that into a
// confirmation score out of 100. The score is a weight of evidence, NOT a
// probability of profit, and it can never promote a trade on its own.

import { DEFAULT_CANDLE_CONFIG, describeCandle, type CandleAnatomy, type CandleConfig } from './candles';
import type { PatternDetection } from './patterns';
import type { SetupState } from './indicators';
import type { TrendState } from './types';

export type ConfirmationBand = 'STRONG CONFIRMATION' | 'CONFIRMATION' | 'WEAK CONFIRMATION' | 'LOW SIGNIFICANCE';

export type CandleRole =
  | 'ENTRY CONFIRMATION'
  | 'SETUP CONFIRMATION'
  | 'REVERSAL WARNING'
  | 'MOMENTUM CONFIRMATION'
  | 'NO MEANINGFUL SIGNAL';

export type CandleFlag =
  | 'SUPPORT REJECTION'
  | 'RESISTANCE REJECTION'
  | 'STRONG BULLISH CLOSE'
  | 'STRONG BEARISH CLOSE'
  | 'POSSIBLE FALSE BREAKOUT'
  | 'EXPANSION CANDLE'
  | 'PRICE EXTENDED'
  | 'DEVELOPING CANDLE'
  | 'TIMEFRAME CONFLICT';

export interface CandleContext {
  trend: TrendState;
  setup: SetupState;
  support: number | null;
  resistance: number | null;
  ema20: number | null;
  sma50: number | null;
  swingHigh: number | null;
  swingLow: number | null;
  atr: number | null;
  rsi: number | null;
  macdHistogram: number | null;
  marketTrend?: TrendState | null;
  sectorTrend?: TrendState | null;
  /** Weekly trend, derived locally from daily candles. */
  higherTimeframeTrend?: TrendState | null;
  /** Current price, used for the chasing check. */
  price?: number | null;
}

export interface ScoreComponentLite {
  key: string;
  label: string;
  points: number;
  max: number;
  detail: string;
}

export interface CandleAssessment {
  pattern: PatternDetection;
  anatomy: CandleAnatomy;
  score: number;
  band: ConfirmationBand;
  role: CandleRole;
  components: ScoreComponentLite[];
  flags: CandleFlag[];
  /** Where the candle formed, in words: "at support, near the rising 20-day average". */
  location: string;
  /** Entry zone implied by the pattern, for the chasing check. */
  entryZone: { low: number; high: number } | null;
  why: string;
  whyNot: string;
  /** Feeds the stop engine as one candidate invalidation level among several. */
  invalidation: { price: number; basis: string };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function near(price: number, level: number | null, atr: number | null, cfg: CandleConfig): boolean {
  if (level === null) return false;
  const band = atr && atr > 0 ? atr * cfg.nearLevelAtrRatio : level * 0.01;
  return Math.abs(price - level) <= band;
}

/** Describes where the candle formed relative to structure. */
function describeLocation(a: CandleAnatomy, ctx: CandleContext, cfg: CandleConfig): { text: string; parts: string[] } {
  const parts: string[] = [];
  if (near(a.low, ctx.support, ctx.atr, cfg) || (ctx.support !== null && a.low <= ctx.support && a.close > ctx.support)) {
    parts.push('at support');
  }
  if (near(a.high, ctx.resistance, ctx.atr, cfg) || (ctx.resistance !== null && a.high >= ctx.resistance)) {
    parts.push('at resistance');
  }
  if (near(a.close, ctx.ema20, ctx.atr, cfg)) parts.push('on the 20-day average');
  if (near(a.close, ctx.sma50, ctx.atr, cfg)) parts.push('on the 50-day average');
  if (!parts.length) parts.push('away from any obvious level');
  return { text: parts.join(', '), parts };
}

/**
 * Location quality — 25 points. A candle at a level that matters is worth far
 * more than the same shape in the middle of nowhere.
 */
function locationPoints(
  a: CandleAnatomy,
  ctx: CandleContext,
  pattern: PatternDetection,
  cfg: CandleConfig,
): { points: number; detail: string; flags: CandleFlag[] } {
  const flags: CandleFlag[] = [];
  const { parts } = describeLocation(a, ctx, cfg);
  const atSupport = parts.includes('at support');
  const atResistance = parts.includes('at resistance');
  const atAverage = parts.includes('on the 20-day average') || parts.includes('on the 50-day average');
  let points = 5;
  const bits: string[] = [];

  if (pattern.direction === 'BULLISH') {
    if (atSupport) {
      points += 12;
      bits.push('formed where buyers have stepped in before');
      if (a.lowerWickPct >= 0.35 && a.closeLocation >= 0.55) flags.push('SUPPORT REJECTION');
    }
    if (atAverage) {
      points += 8;
      bits.push('formed on a rising moving average that traders watch');
    }
    if (atResistance && !atSupport) {
      points -= 3;
      bits.push('formed right under resistance, which caps the move');
    }
  } else if (pattern.direction === 'BEARISH') {
    if (atResistance) {
      points += 12;
      bits.push('formed where sellers have appeared before');
      if (a.upperWickPct >= 0.35 && a.closeLocation <= 0.45) flags.push('RESISTANCE REJECTION');
    }
    if (atAverage) points += 5;
  } else {
    if (atSupport || atResistance) {
      points += 10;
      bits.push('indecision right at a level is more informative than indecision in open space');
    }
  }

  if (!bits.length) bits.push('formed away from meaningful structure, which limits what it can tell you');
  return { points: clamp(points, 0, 25), detail: bits.join('; ') + '.', flags };
}

/** Trend alignment — 20 points. */
function trendPoints(ctx: CandleContext, pattern: PatternDetection): { points: number; detail: string } {
  const t = ctx.trend;
  if (pattern.direction === 'BULLISH') {
    if (t === 'UP') return { points: 20, detail: 'The pattern points the same way as an established uptrend.' };
    if (t === 'SIDEWAYS')
      return { points: 9, detail: 'There is no clear trend, so the pattern has less behind it.' };
    return { points: 2, detail: 'The pattern points up while the trend is down — that is fighting the tide.' };
  }
  if (pattern.direction === 'BEARISH') {
    if (t === 'DOWN') return { points: 20, detail: 'The pattern agrees with a downtrend already in place.' };
    if (t === 'SIDEWAYS') return { points: 9, detail: 'No clear trend, so this is a warning rather than a signal.' };
    return { points: 6, detail: 'A bearish candle inside an uptrend is a warning, not a reversal on its own.' };
  }
  return { points: 8, detail: 'Indecision candles do not align with any direction by definition.' };
}

/** Volume confirmation — 15 points. */
function volumePoints(a: CandleAnatomy, cfg: CandleConfig): { points: number; detail: string } {
  if (a.volumeRatio === null) return { points: 7, detail: 'No volume reading was available, so this is scored neutrally.' };
  const r = a.volumeRatio;
  if (r >= 1.5) return { points: 15, detail: `Volume was ${r.toFixed(2)}x its recent average — real participation.` };
  if (r >= cfg.volumeConfirmRatio) return { points: 12, detail: `Volume was ${r.toFixed(2)}x average, which supports the candle.` };
  if (r >= cfg.volumeWeakRatio) return { points: 7, detail: `Volume was about average at ${r.toFixed(2)}x.` };
  return { points: 2, detail: `Volume was light at ${r.toFixed(2)}x average, so fewer traders backed this candle.` };
}

/** Momentum confirmation — 10 points. */
function momentumPoints(ctx: CandleContext, pattern: PatternDetection): { points: number; detail: string } {
  const rsi = ctx.rsi;
  const hist = ctx.macdHistogram;
  if (rsi === null && hist === null) return { points: 5, detail: 'No momentum reading available, scored neutrally.' };
  let pts = 0;
  const bits: string[] = [];
  if (pattern.direction === 'BULLISH') {
    if (rsi !== null && rsi >= 45) {
      pts += 5;
      bits.push(`momentum is holding up (RSI ${rsi.toFixed(0)})`);
    } else if (rsi !== null) bits.push(`momentum is weak (RSI ${rsi.toFixed(0)})`);
    if (hist !== null && hist > 0) {
      pts += 5;
      bits.push('shorter-term momentum is running ahead of longer-term');
    } else if (hist !== null) bits.push('momentum has not turned up yet');
  } else if (pattern.direction === 'BEARISH') {
    if (rsi !== null && rsi <= 55) pts += 5;
    if (hist !== null && hist < 0) pts += 5;
    bits.push('momentum readings are consistent with a pullback risk');
  } else {
    pts = 5;
    bits.push('momentum is not decisive either way');
  }
  return { points: clamp(pts, 0, 10), detail: `${bits.join('; ')}.` };
}

/** Market alignment — 5 points. */
function marketPoints(ctx: CandleContext, pattern: PatternDetection): { points: number; detail: string } {
  const market = ctx.marketTrend ?? null;
  if (market === null) return { points: 2, detail: 'No market benchmark reading, scored neutrally.' };
  if (pattern.direction === 'BULLISH') {
    if (market === 'UP') return { points: 5, detail: 'The wider market is trending up too.' };
    if (market === 'SIDEWAYS') return { points: 2, detail: 'The wider market has no clear direction.' };
    return { points: 0, detail: 'The wider market is trending down, which works against a long.' };
  }
  return { points: market === 'DOWN' ? 5 : 2, detail: `The wider market trend is ${market.toLowerCase()}.` };
}

function bandFor(score: number): ConfirmationBand {
  if (score >= 85) return 'STRONG CONFIRMATION';
  if (score >= 70) return 'CONFIRMATION';
  if (score >= 55) return 'WEAK CONFIRMATION';
  return 'LOW SIGNIFICANCE';
}

function roleFor(pattern: PatternDetection, ctx: CandleContext, score: number, flags: CandleFlag[]): CandleRole {
  if (score < 55) return 'NO MEANINGFUL SIGNAL';
  if (pattern.direction === 'BEARISH') return 'REVERSAL WARNING';
  if (pattern.direction === 'NEUTRAL') return score >= 70 ? 'SETUP CONFIRMATION' : 'NO MEANINGFUL SIGNAL';
  if (flags.includes('POSSIBLE FALSE BREAKOUT')) return 'NO MEANINGFUL SIGNAL';
  if (ctx.setup === 'PULLBACK' && score >= 70) return 'ENTRY CONFIRMATION';
  if (ctx.setup === 'BREAKOUT' && score >= 70) return 'ENTRY CONFIRMATION';
  if (pattern.key === 'STRONG_BULLISH_CLOSE' || pattern.key === 'THREE_WHITE_SOLDIERS') return 'MOMENTUM CONFIRMATION';
  return 'SETUP CONFIRMATION';
}

/**
 * False breakout evidence: price pushed through resistance intraday but could
 * not hold it, or did so without participation.
 */
export function falseBreakoutEvidence(a: CandleAnatomy, ctx: CandleContext, cfg: CandleConfig): string[] {
  const ev: string[] = [];
  const r = ctx.resistance;
  if (r === null) return ev;
  if (a.high > r && a.close < r) ev.push(`Price traded above ${r.toFixed(2)} but closed back below it at ${a.close.toFixed(2)}.`);
  if (a.high > r && a.upperWickPct >= 0.4) ev.push('The breakout attempt left a long upper wick, meaning sellers took the level back.');
  if (a.high > r && a.volumeRatio !== null && a.volumeRatio < cfg.volumeConfirmRatio)
    ev.push(`Volume did not confirm the attempt (${a.volumeRatio.toFixed(2)}x average).`);
  if (a.high > r && a.bodyPct <= 0.3 && a.close >= r)
    ev.push('The breakout candle has only a small body, so the push had little conviction.');
  if (a.gapFromPrevClose !== null && ctx.atr && a.gapFromPrevClose > ctx.atr && a.closeLocation <= 0.35)
    ev.push('Price gapped up and then closed weakly, which often marks a failed push.');
  return ev;
}

/**
 * Scores one detected pattern in its context. Returns everything the UI needs to
 * explain itself, including an honest "why this might not matter" note.
 */
export function assessPattern(
  pattern: PatternDetection,
  series: CandleAnatomy[],
  ctx: CandleContext,
  cfg: CandleConfig = DEFAULT_CANDLE_CONFIG,
): CandleAssessment {
  const a = series[pattern.index];
  const flags: CandleFlag[] = [];
  const components: ScoreComponentLite[] = [];

  // 1. Pattern quality — 25 points, rescaled from the shape read.
  const qualityPoints = clamp(Math.round((pattern.quality / 100) * 25), 0, 25);
  components.push({
    key: 'pattern',
    label: 'Pattern quality',
    points: qualityPoints,
    max: 25,
    detail: pattern.evidence.join(' '),
  });

  // 2. Location quality — 25 points.
  const loc = locationPoints(a, ctx, pattern, cfg);
  loc.flags.forEach((f) => flags.push(f));
  components.push({ key: 'location', label: 'Location quality', points: loc.points, max: 25, detail: loc.detail });

  // 3. Trend alignment — 20 points.
  const tr = trendPoints(ctx, pattern);
  components.push({ key: 'trend', label: 'Trend alignment', points: tr.points, max: 20, detail: tr.detail });

  // 4. Volume — 15 points.
  const vol = volumePoints(a, cfg);
  components.push({ key: 'volume', label: 'Volume confirmation', points: vol.points, max: 15, detail: vol.detail });

  // 5. Momentum — 10 points.
  const mom = momentumPoints(ctx, pattern);
  components.push({ key: 'momentum', label: 'Momentum confirmation', points: mom.points, max: 10, detail: mom.detail });

  // 6. Market alignment — 5 points.
  const mkt = marketPoints(ctx, pattern);
  components.push({ key: 'market', label: 'Market alignment', points: mkt.points, max: 5, detail: mkt.detail });

  let score = components.reduce((s, c) => s + c.points, 0);

  // Flags that change how the candle should be read.
  if (a.size === 'EXPANSION') flags.push('EXPANSION CANDLE');
  if (pattern.developing) flags.push('DEVELOPING CANDLE');
  if (a.classification === 'STRONG BULLISH') flags.push('STRONG BULLISH CLOSE');
  if (a.classification === 'STRONG BEARISH') flags.push('STRONG BEARISH CLOSE');

  const falseBreak = falseBreakoutEvidence(a, ctx, cfg);
  if (falseBreak.length >= 2 || (falseBreak.length === 1 && ctx.setup === 'BREAKOUT')) {
    flags.push('POSSIBLE FALSE BREAKOUT');
    score -= 15;
  }

  // Higher-timeframe disagreement is surfaced, never hidden.
  const weekly = ctx.higherTimeframeTrend ?? null;
  if (weekly !== null && pattern.direction !== 'NEUTRAL') {
    const conflict =
      (pattern.direction === 'BULLISH' && weekly === 'DOWN') || (pattern.direction === 'BEARISH' && weekly === 'UP');
    if (conflict) {
      flags.push('TIMEFRAME CONFLICT');
      score -= 8;
    }
  }

  // Entry zone and the chasing check.
  const entryZone =
    pattern.direction === 'BULLISH'
      ? { low: Math.min(a.close, pattern.patternHigh), high: pattern.patternHigh + (ctx.atr ?? 0) * 0.25 }
      : null;
  const price = ctx.price ?? a.close;
  if (entryZone && price > entryZone.high) {
    flags.push('PRICE EXTENDED');
    score -= 10;
  }

  score = clamp(Math.round(score));
  const band = bandFor(score);
  const role = roleFor(pattern, ctx, score, flags);
  const location = describeLocation(a, ctx, cfg).text;

  const why = buildWhy(pattern, a, ctx, location, flags, score);
  const whyNot = buildWhyNot(pattern, a, ctx, location, flags);

  return {
    pattern,
    anatomy: a,
    score,
    band,
    role,
    components,
    flags,
    location,
    entryZone,
    why,
    whyNot,
    invalidation: pattern.invalidation,
  };
}

function buildWhy(
  pattern: PatternDetection,
  a: CandleAnatomy,
  ctx: CandleContext,
  location: string,
  flags: CandleFlag[],
  score: number,
): string {
  const trendText =
    ctx.trend === 'UP' ? 'an established uptrend' : ctx.trend === 'DOWN' ? 'a downtrend' : 'sideways price action';
  const volText =
    a.volumeRatio === null
      ? 'volume could not be read'
      : a.volumeRatio >= 1.15
        ? 'volume increased'
        : a.volumeRatio < 0.8
          ? 'volume was light'
          : 'volume was about average';
  const setupText =
    ctx.setup === 'PULLBACK' ? ' after a pullback' : ctx.setup === 'BREAKOUT' ? ' during a breakout attempt' : '';
  const strength =
    score >= 85
      ? 'That combination makes this a strong piece of confirmation'
      : score >= 70
        ? 'That combination gives this real confirmation value'
        : score >= 55
          ? 'That gives it some, but limited, confirmation value'
          : 'On its own that carries little weight';
  const extras = flags.includes('SUPPORT REJECTION')
    ? ' Buyers visibly defended support inside the day.'
    : flags.includes('RESISTANCE REJECTION')
      ? ' Sellers visibly defended resistance inside the day.'
      : '';
  return `${pattern.name} formed during ${trendText}${setupText}, ${location}, and ${volText}. ${describeCandle(a)}${extras} ${strength} — the same shape in random sideways price action away from any level would mean much less.`;
}

function buildWhyNot(
  pattern: PatternDetection,
  a: CandleAnatomy,
  ctx: CandleContext,
  location: string,
  flags: CandleFlag[],
): string {
  const reasons: string[] = [];
  if (location.includes('away from any obvious level')) reasons.push('it formed away from meaningful support or resistance');
  if (a.volumeRatio !== null && a.volumeRatio < 0.8) reasons.push('volume was below average, so few traders backed it');
  if (ctx.trend === 'SIDEWAYS') reasons.push('there is no trend behind it');
  if (pattern.direction === 'BULLISH' && ctx.trend === 'DOWN') reasons.push('the wider trend still points down');
  if (pattern.requiresConfirmation && pattern.status !== 'CONFIRMED')
    reasons.push('this shape needs a later close to confirm it, and that has not happened yet');
  if (flags.includes('DEVELOPING CANDLE')) reasons.push("today's candle has not closed, so the shape can still change");
  if (flags.includes('EXPANSION CANDLE')) reasons.push('the candle is unusually wide, which raises the risk of chasing');
  if (flags.includes('PRICE EXTENDED')) reasons.push('price has already run past a sensible entry area');
  if (flags.includes('POSSIBLE FALSE BREAKOUT')) reasons.push('the breakout attempt was not held into the close');
  if (flags.includes('TIMEFRAME CONFLICT')) reasons.push('the weekly picture disagrees with it');
  if (!reasons.length)
    return 'Nothing obvious argues against this candle, but a clean pattern still says nothing about what price does next — it is evidence, not a prediction.';
  return `Treat it carefully because ${reasons.join(', ')}. A candle is evidence about what just happened, not a forecast.`;
}

/**
 * Ranks assessments so the UI shows the few that matter instead of dozens.
 * Order: relevance to the current setup, then score, then recency.
 */
export function rankAssessments(list: CandleAssessment[], ctx: CandleContext): CandleAssessment[] {
  const relevance = (x: CandleAssessment) => {
    let r = 0;
    if (x.role === 'ENTRY CONFIRMATION') r += 3;
    if (x.role === 'SETUP CONFIRMATION' || x.role === 'REVERSAL WARNING') r += 2;
    if (ctx.setup === 'PULLBACK' && x.pattern.direction === 'BULLISH') r += 1;
    if (ctx.setup === 'BREAKOUT' && (x.pattern.key === 'STRONG_BULLISH_CLOSE' || x.pattern.key === 'BULLISH_OUTSIDE_BAR')) r += 1;
    return r;
  };
  return [...list].sort(
    (a, b) =>
      relevance(b) - relevance(a) ||
      b.pattern.index - a.pattern.index ||
      b.score - a.score ||
      b.pattern.quality - a.pattern.quality,
  );
}

export interface CandleConfirmation {
  /** Best bullish, contextual evidence for entering now. Null when there is none. */
  best: CandleAssessment | null;
  /** Everything worth showing, ranked. */
  ranked: CandleAssessment[];
  /** Contribution to Setup Quality, 0-7 points inside the existing 25. */
  setupPoints: number;
  setupDetail: string;
  flags: CandleFlag[];
  warnings: string[];
}

/**
 * Turns the ranked assessments into the single contribution the technical score
 * is allowed to use. Deliberately capped at 7 points inside Setup Quality so
 * candlestick evidence is never double-counted or layered on top of 100.
 */
export function summariseConfirmation(list: CandleAssessment[], ctx: CandleContext): CandleConfirmation {
  const ranked = rankAssessments(list, ctx);
  const flags = Array.from(new Set(ranked.flatMap((r) => r.flags)));
  const warnings: string[] = [];

  const recent = ranked.filter((r) => r.pattern.status !== 'FAILED');
  const bullish = recent.filter((r) => r.pattern.direction === 'BULLISH' && r.score >= 55);
  const bearish = recent.filter((r) => r.pattern.direction === 'BEARISH' && r.score >= 70);
  const best = bullish[0] ?? null;

  let points = 3; // Neutral middle: no candle evidence neither helps nor punishes.
  let detail = 'No meaningful candlestick confirmation either way, so this is scored neutrally.';

  if (best) {
    const confirmed = best.pattern.status === 'CONFIRMED' || !best.pattern.requiresConfirmation;
    const base = best.score >= 85 ? 7 : best.score >= 70 ? 6 : 4;
    points = confirmed ? base : Math.max(3, base - 2);
    detail = `${best.pattern.name} ${best.location} scored ${best.score} out of 100 (${best.band.toLowerCase()})${confirmed ? '' : ', still waiting for a confirming close'}.`;
  }

  if (bearish.length) {
    points = Math.min(points, 2);
    warnings.push(`${bearish[0].pattern.name} is a reversal warning against a long here.`);
    detail += ` A bearish ${bearish[0].pattern.name.toLowerCase()} also formed nearby, which argues the other way.`;
  }
  if (flags.includes('POSSIBLE FALSE BREAKOUT')) {
    points = Math.min(points, 1);
    warnings.push('POSSIBLE FALSE BREAKOUT — price could not hold above resistance into the close.');
  }
  if (flags.includes('DEVELOPING CANDLE')) {
    warnings.push("DEVELOPING CANDLE — today's candle is still forming, so no pattern on it is confirmed.");
  }
  if (flags.includes('PRICE EXTENDED')) {
    warnings.push('PRICE EXTENDED — confirmation happened, but price has left the planned entry zone. Recalculate rather than chase.');
    points = Math.min(points, 3);
  }
  if (flags.includes('EXPANSION CANDLE')) {
    warnings.push('EXPANSION CANDLE — large expansion candles may increase chasing risk.');
  }
  if (flags.includes('TIMEFRAME CONFLICT')) {
    warnings.push('TIMEFRAME CONFLICT — the daily and weekly readings disagree.');
  }

  return { best, ranked, setupPoints: clamp(points, 0, 7), setupDetail: detail, flags, warnings };
}
