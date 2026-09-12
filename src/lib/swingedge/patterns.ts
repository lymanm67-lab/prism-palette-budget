// SwingEdge Analyzer — candlestick pattern detection.
//
// Deterministic rules over OHLC values only. Every pattern states its own high,
// low, confirmation level and invalidation reference, and nothing here decides
// whether a trade is worth taking: a pattern is evidence, scored for context
// elsewhere, and it can never on its own promote a signal to GO.

import { DEFAULT_CANDLE_CONFIG, type CandleAnatomy, type CandleConfig } from './candles';

export type PatternDirection = 'BULLISH' | 'BEARISH' | 'NEUTRAL';
export type PatternStatus = 'DETECTED' | 'WAITING FOR CONFIRMATION' | 'CONFIRMED' | 'FAILED';

export type PatternKey =
  // Bullish
  | 'BULLISH_ENGULFING'
  | 'HAMMER'
  | 'MORNING_STAR'
  | 'BULLISH_PIN_BAR'
  | 'BULLISH_OUTSIDE_BAR'
  | 'BULLISH_INSIDE_BAR_BREAKOUT'
  | 'THREE_WHITE_SOLDIERS'
  | 'PIERCING_PATTERN'
  | 'STRONG_BULLISH_CLOSE'
  | 'LONG_LOWER_WICK_REJECTION'
  // Bearish
  | 'BEARISH_ENGULFING'
  | 'SHOOTING_STAR'
  | 'EVENING_STAR'
  | 'BEARISH_PIN_BAR'
  | 'BEARISH_OUTSIDE_BAR'
  | 'BEARISH_INSIDE_BAR_BREAKDOWN'
  | 'THREE_BLACK_CROWS'
  | 'DARK_CLOUD_COVER'
  | 'STRONG_BEARISH_CLOSE'
  | 'LONG_UPPER_WICK_REJECTION'
  // Neutral / indecision
  | 'DOJI'
  | 'LONG_LEGGED_DOJI'
  | 'DRAGONFLY_DOJI'
  | 'GRAVESTONE_DOJI'
  | 'SPINNING_TOP'
  | 'INSIDE_BAR'
  | 'NARROW_RANGE_CANDLE'
  | 'SMALL_BODY_CONSOLIDATION';

export const MAJOR_PATTERNS: PatternKey[] = [
  'BULLISH_ENGULFING',
  'BEARISH_ENGULFING',
  'HAMMER',
  'SHOOTING_STAR',
  'DOJI',
  'INSIDE_BAR',
  'BULLISH_OUTSIDE_BAR',
  'BEARISH_OUTSIDE_BAR',
  'MORNING_STAR',
  'EVENING_STAR',
  'STRONG_BULLISH_CLOSE',
  'STRONG_BEARISH_CLOSE',
];

export const PATTERN_NAMES: Record<PatternKey, string> = {
  BULLISH_ENGULFING: 'Bullish engulfing',
  HAMMER: 'Hammer',
  MORNING_STAR: 'Morning star',
  BULLISH_PIN_BAR: 'Bullish pin bar',
  BULLISH_OUTSIDE_BAR: 'Bullish outside bar',
  BULLISH_INSIDE_BAR_BREAKOUT: 'Inside bar breakout',
  THREE_WHITE_SOLDIERS: 'Three white soldiers',
  PIERCING_PATTERN: 'Piercing pattern',
  STRONG_BULLISH_CLOSE: 'Strong bullish close',
  LONG_LOWER_WICK_REJECTION: 'Long lower wick rejection',
  BEARISH_ENGULFING: 'Bearish engulfing',
  SHOOTING_STAR: 'Shooting star',
  EVENING_STAR: 'Evening star',
  BEARISH_PIN_BAR: 'Bearish pin bar',
  BEARISH_OUTSIDE_BAR: 'Bearish outside bar',
  BEARISH_INSIDE_BAR_BREAKDOWN: 'Inside bar breakdown',
  THREE_BLACK_CROWS: 'Three black crows',
  DARK_CLOUD_COVER: 'Dark cloud cover',
  STRONG_BEARISH_CLOSE: 'Strong bearish close',
  LONG_UPPER_WICK_REJECTION: 'Long upper wick rejection',
  DOJI: 'Doji',
  LONG_LEGGED_DOJI: 'Long-legged doji',
  DRAGONFLY_DOJI: 'Dragonfly doji',
  GRAVESTONE_DOJI: 'Gravestone doji',
  SPINNING_TOP: 'Spinning top',
  INSIDE_BAR: 'Inside bar',
  NARROW_RANGE_CANDLE: 'Narrow range candle',
  SMALL_BODY_CONSOLIDATION: 'Small body consolidation',
};

/** Patterns that mean nothing until a later candle agrees with them. */
export const NEEDS_CONFIRMATION: PatternKey[] = [
  'HAMMER',
  'SHOOTING_STAR',
  'DOJI',
  'LONG_LEGGED_DOJI',
  'DRAGONFLY_DOJI',
  'GRAVESTONE_DOJI',
  'SPINNING_TOP',
  'INSIDE_BAR',
  'NARROW_RANGE_CANDLE',
  'SMALL_BODY_CONSOLIDATION',
  'BULLISH_PIN_BAR',
  'BEARISH_PIN_BAR',
  'LONG_LOWER_WICK_REJECTION',
  'LONG_UPPER_WICK_REJECTION',
];

export interface PatternDetection {
  key: PatternKey;
  name: string;
  direction: PatternDirection;
  /** Index of the candle that completes the pattern. */
  index: number;
  /** Index of the first candle involved, for multi-candle patterns. */
  startIndex: number;
  date: string;
  patternHigh: number;
  patternLow: number;
  /** Price a later close must clear (bullish) or lose (bearish) to confirm. */
  confirmationLevel: number;
  /** Where the pattern would be proven wrong. An input to the stop engine, never a stop by itself. */
  invalidation: { price: number; basis: string };
  requiresConfirmation: boolean;
  status: PatternStatus;
  /** 0-100 read of how cleanly the pattern is formed, before any context. */
  quality: number;
  /** Rules that fired, in plain language. */
  evidence: string[];
  detectedAt: string;
  confirmedAt: string | null;
  /** First date an entry could honestly have happened. Never before confirmation. */
  earliestEntryAt: string | null;
  failedAt: string | null;
  failureReason: string | null;
  /** True when the pattern sits on the still-forming candle. */
  developing: boolean;
  /** Mother bar levels for inside/outside bar patterns. */
  motherBar?: { high: number; low: number };
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function isDojiBody(a: CandleAnatomy, cfg: CandleConfig): boolean {
  return a.range > 0 && a.bodyPct <= cfg.dojiBodyPct;
}

/**
 * Detects every pattern that completes on candle `index`, using only candles at
 * or before that index — historical detection therefore never peeks ahead.
 */
function detectAt(series: CandleAnatomy[], index: number, cfg: CandleConfig): Omit<
  PatternDetection,
  'status' | 'detectedAt' | 'confirmedAt' | 'earliestEntryAt' | 'failedAt' | 'failureReason' | 'developing'
>[] {
  const out: Omit<
    PatternDetection,
    'status' | 'detectedAt' | 'confirmedAt' | 'earliestEntryAt' | 'failedAt' | 'failureReason' | 'developing'
  >[] = [];
  const c = series[index];
  const p1 = series[index - 1];
  const p2 = series[index - 2];
  const p3 = series[index - 3];
  if (!c || c.range <= 0) return out;

  const tol = cfg.engulfTolerancePct * c.range;
  const bodyTop = Math.max(c.open, c.close);
  const bodyBottom = Math.min(c.open, c.close);

  const push = (
    key: PatternKey,
    direction: PatternDirection,
    quality: number,
    evidence: string[],
    opts: {
      startIndex?: number;
      patternHigh?: number;
      patternLow?: number;
      confirmationLevel?: number;
      invalidation?: { price: number; basis: string };
      motherBar?: { high: number; low: number };
    } = {},
  ) => {
    const startIndex = opts.startIndex ?? index;
    const window = series.slice(startIndex, index + 1);
    const patternHigh = opts.patternHigh ?? Math.max(...window.map((w) => w.high));
    const patternLow = opts.patternLow ?? Math.min(...window.map((w) => w.low));
    out.push({
      key,
      name: PATTERN_NAMES[key],
      direction,
      index,
      startIndex,
      date: c.date,
      patternHigh,
      patternLow,
      confirmationLevel: opts.confirmationLevel ?? (direction === 'BEARISH' ? patternLow : patternHigh),
      invalidation:
        opts.invalidation ??
        (direction === 'BEARISH'
          ? { price: patternHigh, basis: 'the high of the pattern' }
          : { price: patternLow, basis: 'the low of the pattern' }),
      requiresConfirmation: NEEDS_CONFIRMATION.includes(key),
      quality: clamp(Math.round(quality)),
      evidence,
      motherBar: opts.motherBar,
    });
  };

  // ---------- Single-candle shapes ----------

  // Hammer / bullish pin bar: small body high in the range, long lower wick.
  if (
    c.body > 0 &&
    c.lowerWick >= cfg.wickToBodyRatio * c.body &&
    c.upperWickPct <= cfg.oppositeWickMaxPct &&
    c.bodyPct <= 0.4
  ) {
    const ratio = c.lowerWick / Math.max(c.body, 1e-9);
    push('HAMMER', 'BULLISH', 55 + Math.min(30, (ratio - cfg.wickToBodyRatio) * 10) + (c.closeLocation >= 0.6 ? 10 : 0), [
      `The lower wick is ${ratio.toFixed(1)} times the body, so sellers pushed price down and lost the day.`,
      `The body sits in the upper part of the range and the upper wick is only ${(c.upperWickPct * 100).toFixed(0)}% of it.`,
    ]);
    if (c.lowerWickPct >= 0.6) {
      push('BULLISH_PIN_BAR', 'BULLISH', 60 + (c.closeLocation >= 0.7 ? 15 : 0), [
        `The lower wick alone is ${(c.lowerWickPct * 100).toFixed(0)}% of the whole day's range.`,
      ]);
    }
  }

  // Shooting star / bearish pin bar.
  if (
    c.body > 0 &&
    c.upperWick >= cfg.wickToBodyRatio * c.body &&
    c.lowerWickPct <= cfg.oppositeWickMaxPct &&
    c.bodyPct <= 0.4
  ) {
    const ratio = c.upperWick / Math.max(c.body, 1e-9);
    push('SHOOTING_STAR', 'BEARISH', 55 + Math.min(30, (ratio - cfg.wickToBodyRatio) * 10) + (c.closeLocation <= 0.4 ? 10 : 0), [
      `The upper wick is ${ratio.toFixed(1)} times the body, so buyers pushed price up and could not hold it.`,
    ]);
    if (c.upperWickPct >= 0.6) {
      push('BEARISH_PIN_BAR', 'BEARISH', 60 + (c.closeLocation <= 0.3 ? 15 : 0), [
        `The upper wick alone is ${(c.upperWickPct * 100).toFixed(0)}% of the whole day's range.`,
      ]);
    }
  }

  // Long wick rejections — direction depends on where it formed, judged later by context.
  if (c.lowerWickPct >= 0.4 && c.closeLocation >= 0.55) {
    push('LONG_LOWER_WICK_REJECTION', 'BULLISH', 50 + c.lowerWickPct * 40, [
      `Price traded down to ${c.low.toFixed(2)} and closed back at ${c.close.toFixed(2)}.`,
    ]);
  }
  if (c.upperWickPct >= 0.4 && c.closeLocation <= 0.45) {
    push('LONG_UPPER_WICK_REJECTION', 'BEARISH', 50 + c.upperWickPct * 40, [
      `Price traded up to ${c.high.toFixed(2)} and closed back at ${c.close.toFixed(2)}.`,
    ]);
  }

  // Doji family.
  if (isDojiBody(c, cfg)) {
    const bothLong = c.upperWickPct >= cfg.dojiLongLegWickPct && c.lowerWickPct >= cfg.dojiLongLegWickPct;
    if (bothLong) {
      push('LONG_LEGGED_DOJI', 'NEUTRAL', 60, [
        'Open and close finished at almost the same price after a wide swing both ways.',
      ]);
    } else if (c.lowerWickPct >= 0.6) {
      push('DRAGONFLY_DOJI', 'NEUTRAL', 60, ['Open and close sit at the top of a long lower wick.']);
    } else if (c.upperWickPct >= 0.6) {
      push('GRAVESTONE_DOJI', 'NEUTRAL', 60, ['Open and close sit at the bottom of a long upper wick.']);
    }
    push('DOJI', 'NEUTRAL', 55, [
      `The body is only ${(c.bodyPct * 100).toFixed(0)}% of the range, so buyers and sellers finished level.`,
    ]);
  } else if (c.bodyPct <= 0.3 && c.upperWickPct >= 0.25 && c.lowerWickPct >= 0.25) {
    push('SPINNING_TOP', 'NEUTRAL', 45, ['A small body with wicks on both sides — no side took control.']);
  }

  // Strong close.
  const volumeOk = c.volumeRatio === null || c.volumeRatio >= 0.9;
  if (c.direction === 'UP' && c.closeLocation >= cfg.strongClosePct && c.bodyPct >= cfg.strongCloseBodyPct && volumeOk) {
    push('STRONG_BULLISH_CLOSE', 'BULLISH', 60 + (c.size === 'LARGE' || c.size === 'EXPANSION' ? 15 : 0) + (c.volumeRatio && c.volumeRatio >= cfg.volumeConfirmRatio ? 10 : 0), [
      `Closed in the top ${(100 - c.closeLocation * 100).toFixed(0)}% of the day's range with a solid body.`,
    ]);
  }
  if (c.direction === 'DOWN' && c.closeLocation <= 1 - cfg.strongClosePct && c.bodyPct >= cfg.strongCloseBodyPct && volumeOk) {
    push('STRONG_BEARISH_CLOSE', 'BEARISH', 60 + (c.size === 'LARGE' || c.size === 'EXPANSION' ? 15 : 0), [
      "Closed near the bottom of the day's range with a solid body.",
    ]);
  }

  if (c.size === 'SMALL' && c.rangeAvgRatio !== null && c.rangeAvgRatio <= 0.6) {
    push('NARROW_RANGE_CANDLE', 'NEUTRAL', 40, ['The range is much narrower than recent days — energy is coiling.']);
  }
  if (c.bodyPct <= 0.25 && c.size === 'SMALL') {
    push('SMALL_BODY_CONSOLIDATION', 'NEUTRAL', 35, ['A small body on a quiet day: consolidation, not a decision.']);
  }

  if (!p1) return out;

  // ---------- Two-candle patterns ----------

  const p1BodyTop = Math.max(p1.open, p1.close);
  const p1BodyBottom = Math.min(p1.open, p1.close);

  // Bullish engulfing: prior candle down, this one up and swallowing its body.
  if (
    p1.direction === 'DOWN' &&
    c.direction === 'UP' &&
    bodyBottom <= p1BodyBottom + tol &&
    bodyTop >= p1BodyTop - tol &&
    c.close > p1.open - tol &&
    c.open <= p1.close + tol
  ) {
    const engulfRatio = c.body / Math.max(p1.body, 1e-9);
    push(
      'BULLISH_ENGULFING',
      'BULLISH',
      55 + Math.min(25, (engulfRatio - 1) * 25) + (c.closeLocation >= 0.7 ? 10 : 0) + ((c.volumeRatio ?? 1) >= cfg.volumeConfirmRatio ? 10 : 0),
      [
        'The previous day closed lower; this day opened at or below that close and finished above its open.',
        `This body is ${engulfRatio.toFixed(1)} times the previous body, so it fully covers it.`,
      ],
      { startIndex: index - 1 },
    );
  }

  // Bearish engulfing.
  if (
    p1.direction === 'UP' &&
    c.direction === 'DOWN' &&
    bodyBottom <= p1BodyBottom + tol &&
    bodyTop >= p1BodyTop - tol &&
    c.close < p1.open + tol &&
    c.open >= p1.close - tol
  ) {
    const engulfRatio = c.body / Math.max(p1.body, 1e-9);
    push(
      'BEARISH_ENGULFING',
      'BEARISH',
      55 + Math.min(25, (engulfRatio - 1) * 25) + (c.closeLocation <= 0.3 ? 10 : 0),
      ['A rising day was completely covered by the following down day.'],
      { startIndex: index - 1 },
    );
  }

  // Piercing pattern / dark cloud cover.
  if (p1.direction === 'DOWN' && c.direction === 'UP' && c.open < p1.close && c.close >= p1BodyBottom + p1.body * 0.5 && c.close < p1.open) {
    push('PIERCING_PATTERN', 'BULLISH', 55 + (c.closeLocation >= 0.7 ? 10 : 0), [
      'Opened below the previous close and closed back above the midpoint of that down day.',
    ], { startIndex: index - 1 });
  }
  if (p1.direction === 'UP' && c.direction === 'DOWN' && c.open > p1.close && c.close <= p1BodyBottom + p1.body * 0.5 && c.close > p1.open) {
    push('DARK_CLOUD_COVER', 'BEARISH', 55, [
      'Opened above the previous close and closed back below the midpoint of that up day.',
    ], { startIndex: index - 1 });
  }

  // Inside bar and its breakout / breakdown.
  if (c.high <= p1.high && c.low >= p1.low) {
    push('INSIDE_BAR', 'NEUTRAL', 45 + (c.range / Math.max(p1.range, 1e-9) <= 0.6 ? 15 : 0), [
      `The whole day fits inside the previous day's range (${p1.low.toFixed(2)} to ${p1.high.toFixed(2)}).`,
    ], {
      startIndex: index - 1,
      patternHigh: p1.high,
      patternLow: p1.low,
      motherBar: { high: p1.high, low: p1.low },
    });
  }
  if (p1.high <= p2?.high && p1.low >= p2?.low && p2) {
    // Previous candle was an inside bar; does today break out of the mother bar?
    if (c.close > p2.high) {
      push('BULLISH_INSIDE_BAR_BREAKOUT', 'BULLISH', 60 + ((c.volumeRatio ?? 1) >= cfg.volumeConfirmRatio ? 15 : 0), [
        `Closed above the mother bar high of ${p2.high.toFixed(2)} after a quiet inside day.`,
      ], { startIndex: index - 2, motherBar: { high: p2.high, low: p2.low }, invalidation: { price: p2.low, basis: 'the mother bar low' } });
    }
    if (c.close < p2.low) {
      push('BEARISH_INSIDE_BAR_BREAKDOWN', 'BEARISH', 60, [
        `Closed below the mother bar low of ${p2.low.toFixed(2)} after a quiet inside day.`,
      ], { startIndex: index - 2, motherBar: { high: p2.high, low: p2.low }, invalidation: { price: p2.high, basis: 'the mother bar high' } });
    }
  }

  // Outside bars.
  if (c.high > p1.high && c.low < p1.low) {
    if (c.direction === 'UP' && c.closeLocation >= 0.6) {
      push('BULLISH_OUTSIDE_BAR', 'BULLISH', 60 + (c.closeLocation >= 0.8 ? 10 : 0) + ((c.volumeRatio ?? 1) >= cfg.volumeConfirmRatio ? 10 : 0), [
        'Traded above the previous high and below the previous low, then closed strongly in the upper part of the range.',
      ], { startIndex: index - 1 });
    }
    if (c.direction === 'DOWN' && c.closeLocation <= 0.4) {
      push('BEARISH_OUTSIDE_BAR', 'BEARISH', 60, [
        'Traded through both sides of the previous day and closed near its low.',
      ], { startIndex: index - 1 });
    }
  }

  if (!p2) return out;

  // ---------- Three-candle patterns ----------

  // Morning star: down day, small-bodied middle, strong up day closing into the first body.
  if (
    p2.direction === 'DOWN' &&
    p2.bodyPct >= 0.4 &&
    p1.bodyPct <= 0.35 &&
    c.direction === 'UP' &&
    c.close > (p2.open + p2.close) / 2 &&
    p1.high < p2.open
  ) {
    push('MORNING_STAR', 'BULLISH', 65 + (c.closeLocation >= 0.7 ? 10 : 0) + ((c.volumeRatio ?? 1) >= cfg.volumeConfirmRatio ? 10 : 0), [
      'A firm down day, then a small indecisive day, then a strong up day closing back into the first day.',
    ], { startIndex: index - 2 });
  }

  // Evening star.
  if (
    p2.direction === 'UP' &&
    p2.bodyPct >= 0.4 &&
    p1.bodyPct <= 0.35 &&
    c.direction === 'DOWN' &&
    c.close < (p2.open + p2.close) / 2 &&
    p1.low > p2.open
  ) {
    push('EVENING_STAR', 'BEARISH', 65, [
      'A firm up day, then a small indecisive day, then a strong down day closing back into the first day.',
    ], { startIndex: index - 2 });
  }

  // Three white soldiers / three black crows.
  if (p3 !== undefined || true) {
    const three = [p2, p1, c];
    if (three.every((x) => x.direction === 'UP' && x.bodyPct >= 0.5) && p1.close > p2.close && c.close > p1.close) {
      push('THREE_WHITE_SOLDIERS', 'BULLISH', 65 + (c.closeLocation >= 0.7 ? 10 : 0), [
        'Three rising days in a row, each with a solid body and a higher close.',
      ], { startIndex: index - 2 });
    }
    if (three.every((x) => x.direction === 'DOWN' && x.bodyPct >= 0.5) && p1.close < p2.close && c.close < p1.close) {
      push('THREE_BLACK_CROWS', 'BEARISH', 65, [
        'Three falling days in a row, each with a solid body and a lower close.',
      ], { startIndex: index - 2 });
    }
  }

  return out;
}

export interface DetectOptions {
  config?: CandleConfig;
  /** How many candles back to scan. */
  lookback?: number;
  /**
   * Index of the last completed candle. Patterns after it are marked developing
   * and can never reach CONFIRMED — the daily candle has to close first.
   */
  lastCompletedIndex?: number;
  /** Beginner Mode shows only the well-known patterns. */
  majorOnly?: boolean;
}

/**
 * Scans the series and resolves each pattern's status using only candles that
 * came after it — so a confirmation can never be borrowed from the future
 * relative to the pattern itself, which keeps backtests honest.
 */
export function detectPatterns(series: CandleAnatomy[], opts: DetectOptions = {}): PatternDetection[] {
  const cfg = opts.config ?? DEFAULT_CANDLE_CONFIG;
  const lookback = opts.lookback ?? 30;
  const lastCompleted = opts.lastCompletedIndex ?? series.length - 1;
  const start = Math.max(3, series.length - lookback);
  const results: PatternDetection[] = [];

  for (let i = start; i < series.length; i++) {
    const raw = detectAt(series, i, cfg);
    for (const r of raw) {
      if (opts.majorOnly && !MAJOR_PATTERNS.includes(r.key)) continue;
      const developing = i > lastCompleted;
      let status: PatternStatus = r.requiresConfirmation ? 'WAITING FOR CONFIRMATION' : 'DETECTED';
      let confirmedAt: string | null = null;
      let earliestEntryAt: string | null = null;
      let failedAt: string | null = null;
      let failureReason: string | null = null;

      if (developing) {
        status = 'WAITING FOR CONFIRMATION';
      } else {
        // Walk forward through completed candles only.
        for (let j = i + 1; j <= lastCompleted; j++) {
          const f = series[j];
          const bullish = r.direction === 'BULLISH';
          const neutral = r.direction === 'NEUTRAL';
          const confirmUp = f.close > r.confirmationLevel;
          const confirmDown = f.close < (r.direction === 'NEUTRAL' ? r.patternLow : r.confirmationLevel);

          if (neutral) {
            // A neutral pattern resolves in whichever direction breaks first.
            if (f.close > r.patternHigh || f.close < r.patternLow) {
              status = 'CONFIRMED';
              confirmedAt = f.date;
              earliestEntryAt = series[j + 1]?.date ?? f.date;
              break;
            }
            continue;
          }

          if (bullish ? f.close < r.patternLow : f.close > r.patternHigh) {
            status = 'FAILED';
            failedAt = f.date;
            failureReason = bullish
              ? `Price closed below the pattern low of ${r.patternLow.toFixed(2)} before it was confirmed.`
              : `Price closed above the pattern high of ${r.patternHigh.toFixed(2)} before it was confirmed.`;
            break;
          }
          if (bullish ? confirmUp : confirmDown) {
            status = 'CONFIRMED';
            confirmedAt = f.date;
            earliestEntryAt = series[j + 1]?.date ?? f.date;
            break;
          }
        }
        // Patterns that stand on their own close are DETECTED until proven wrong.
        if (status === 'DETECTED' || status === 'WAITING FOR CONFIRMATION') {
          if (!r.requiresConfirmation && status === 'DETECTED') {
            earliestEntryAt = series[i + 1]?.date ?? null;
          }
        }
      }

      results.push({
        ...r,
        status,
        detectedAt: series[i].date,
        confirmedAt,
        earliestEntryAt,
        failedAt,
        failureReason,
        developing,
      });
    }
  }

  return results;
}
