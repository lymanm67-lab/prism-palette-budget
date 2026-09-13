// SwingEdge — "Read this chart" layer.
//
// Turns the candlestick analysis the app already ran into plain-English chart
// reading: how to read what is on screen, what the newest candle is, which way
// the chart is pointing, where structure sits — and then asks the six-week
// training questions back, answered from the same data.
//
// Nothing here invents data. When a value is missing the answer says so.

import { describeCandle } from './candles';
import type { CandleAnalysis } from './candleEngine';
import { TRAINING_WEEKS } from './training';

export interface ChartReadLevel {
  label: string;
  value: number | null;
  /** Distance from current price, signed percent. Null when either side is unknown. */
  distancePct: number | null;
  meaning: string;
}

export interface ChartReadPattern {
  name: string;
  direction: string;
  status: string;
  band: string;
  score: number;
  location: string;
  why: string;
  whyNot: string;
  confirmationLevel: number;
  invalidation: string;
  /** Training week that teaches this kind of read. */
  week: number;
}

export interface ChartQuestion {
  week: number;
  weekTitle: string;
  teaches: string;
  question: string;
  answer: string;
}

export interface ChartRead {
  hasData: boolean;
  howToRead: string[];
  candle: {
    date: string;
    classification: string;
    size: string;
    wickShape: string;
    direction: string;
    description: string;
    developing: boolean;
  } | null;
  direction: {
    daily: string;
    weekly: string;
    setup: string;
    sentence: string;
  };
  levels: ChartReadLevel[];
  patterns: ChartReadPattern[];
  questions: ChartQuestion[];
  /** What this chart does not tell you. */
  limits: string[];
}

const pct = (from: number | null | undefined, to: number | null | undefined) =>
  from == null || to == null || from === 0 ? null : ((to - from) / from) * 100;

const money = (n: number | null | undefined) =>
  n == null ? 'not available' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const trendWords = (t: string | null | undefined) => {
  if (!t) return 'not available yet';
  if (t === 'UP') return 'up — buyers in charge';
  if (t === 'DOWN') return 'down — sellers in charge';
  return 'sideways — no honest direction';
};

/** Which training week teaches the read a given pattern needs. */
function weekForPattern(direction: string, status: string): number {
  if (status === 'WAITING FOR CONFIRMATION') return 4;
  if (direction === 'BEARISH') return 5;
  return 2;
}

const weekTitle = (w: number) => TRAINING_WEEKS[w - 1]?.title ?? `Week ${w}`;
const weekFocus = (w: number) => TRAINING_WEEKS[w - 1]?.focus ?? '';

export interface ChartReadInput {
  analysis: CandleAnalysis | null | undefined;
  price?: number | null;
  estimatedEntry?: number | null;
  estimatedStop?: number | null;
  estimatedTarget?: number | null;
}

export function readChart({
  analysis,
  price = null,
  estimatedEntry = null,
  estimatedStop = null,
  estimatedTarget = null,
}: ChartReadInput): ChartRead {
  const howToRead = [
    'Read it right to left. The newest candle is on the right; everything to its left is the context that gives it meaning.',
    'Each candle is one day: the thick body runs from the open to the close, the thin lines are the highest and lowest prices traded.',
    'Green means the day closed above where it opened, red means it closed below. A long lower line means buyers pushed price back up off the low.',
    'Dashed lines are levels, not predictions: support is where buyers showed up before, resistance is where sellers did.',
    'Direction first, then the candle. A good-looking candle in a downtrend is still a downtrend.',
  ];

  if (!analysis || !analysis.dataOk) {
    return {
      hasData: false,
      howToRead,
      candle: null,
      direction: {
        daily: 'not available yet',
        weekly: 'not available yet',
        setup: 'not available yet',
        sentence: analysis?.dataMessage ?? 'There is not enough clean price history to read this chart yet.',
      },
      levels: [],
      patterns: [],
      questions: [],
      limits: ['A chart shows what already happened. It cannot tell you what happens next.'],
    };
  }

  const ctx = analysis.context;
  const newest = analysis.history.at(-1)?.anatomy ?? analysis.assessments[0]?.anatomy ?? null;
  const currentPrice = price ?? ctx.price ?? newest?.close ?? null;

  const levels: ChartReadLevel[] = [
    {
      label: 'Support',
      value: ctx.support,
      distancePct: pct(currentPrice, ctx.support),
      meaning: 'The area buyers defended last time. Losing it is usually what proves a long wrong.',
    },
    {
      label: 'Resistance',
      value: ctx.resistance,
      distancePct: pct(currentPrice, ctx.resistance),
      meaning: 'The area sellers showed up last time. The first honest place to think about taking profit.',
    },
    {
      label: '20-day average',
      value: ctx.ema20,
      distancePct: pct(currentPrice, ctx.ema20),
      meaning: 'The last month of mood. Pullbacks in an uptrend often stop near this line.',
    },
    {
      label: '50-day average',
      value: ctx.sma50,
      distancePct: pct(currentPrice, ctx.sma50),
      meaning: 'The last quarter of mood. Price above it is the app\u2019s minimum test for an uptrend.',
    },
    {
      label: 'Estimated entry',
      value: estimatedEntry,
      distancePct: pct(currentPrice, estimatedEntry),
      meaning: 'Where an entry would sit if this setup triggered. An estimate, not a plan.',
    },
    {
      label: 'Estimated stop',
      value: estimatedStop,
      distancePct: pct(currentPrice, estimatedStop),
      meaning: 'Where the chart would say the idea failed. Your size comes from this, never the other way round.',
    },
    {
      label: 'Estimated target',
      value: estimatedTarget,
      distancePct: pct(currentPrice, estimatedTarget),
      meaning: 'The next area sellers appeared. Targets are where you plan to leave, not where price must go.',
    },
  ].filter((l) => l.value != null);

  const patterns: ChartReadPattern[] = analysis.assessments.slice(0, 4).map((a) => ({
    name: a.pattern.name,
    direction: a.pattern.direction,
    status: a.pattern.status,
    band: a.band,
    score: a.score,
    location: a.location,
    why: a.why,
    whyNot: a.whyNot,
    confirmationLevel: a.pattern.confirmationLevel,
    invalidation: `${money(a.invalidation.price)} — ${a.invalidation.basis}`,
    week: weekForPattern(a.pattern.direction, a.pattern.status),
  }));

  const best = patterns[0] ?? null;

  const direction = {
    daily: trendWords(ctx.trend),
    weekly: trendWords(analysis.weeklyTrend ?? null),
    setup: ctx.setup === 'NONE' ? 'no recognised setup on this chart right now' : ctx.setup.toLowerCase(),
    sentence:
      `Daily trend is ${trendWords(ctx.trend)}; the weekly chart is ${trendWords(analysis.weeklyTrend ?? null)}. ` +
      (ctx.setup === 'NONE'
        ? 'No setup is recognised, so there is nothing to act on yet.'
        : `The setup being read is a ${ctx.setup.toLowerCase()}.`),
  };

  const questions: ChartQuestion[] = [
    {
      week: 1,
      question: 'What is this chart doing right now — trending, ranging, or falling apart?',
      answer:
        `${direction.sentence} Price is ${
          pct(ctx.sma50, currentPrice) == null
            ? 'at an unknown distance from'
            : `${Math.abs(pct(ctx.sma50, currentPrice) as number).toFixed(1)}% ${
                (pct(ctx.sma50, currentPrice) as number) >= 0 ? 'above' : 'below'
              }`
        } the 50-day average, which is the line the trend call is based on.`,
    },
    {
      week: 2,
      question: 'What setup or candlestick pattern is on the chart, and where would it be proven wrong?',
      answer: best
        ? `${best.name} (${best.direction.toLowerCase()}, ${best.status.toLowerCase()}), formed ${best.location}. It is proven wrong at ${best.invalidation}.`
        : 'No pattern is showing above the significance threshold. "Nothing here" is a valid answer and the most common one.',
    },
    {
      week: 3,
      question: 'Where is support, and what does that mean for the stop?',
      answer:
        ctx.support == null
          ? 'Support cannot be measured from the candles available, so this chart cannot size a trade yet.'
          : `Support sits at ${money(ctx.support)}${
              pct(currentPrice, ctx.support) != null
                ? `, ${Math.abs(pct(currentPrice, ctx.support) as number).toFixed(1)}% below price`
                : ''
            }. A stop belongs below that level${
              estimatedStop != null ? ` — the app estimates ${money(estimatedStop)}` : ''
            }, and the share count comes from the distance to it.`,
    },
    {
      week: 4,
      question: 'What would have to happen for this chart to become a trade you could take?',
      answer: best
        ? best.status === 'CONFIRMED'
          ? `The ${best.name} is already confirmed. Any entry still has to clear the plan checks — quality, risk and portfolio heat — before it becomes a trade.`
          : `A close ${best.direction === 'BEARISH' ? 'below' : 'above'} ${money(best.confirmationLevel)} would confirm the ${best.name}. Until then it is a watch, not a trade.`
        : 'Nothing on this chart is close to a trade. Wait for a pattern to form at a level you can name.',
    },
    {
      week: 5,
      question: 'If you were already long here, what would tell you to get out?',
      answer:
        `${ctx.support == null ? 'A break of the last swing low' : `A close below ${money(ctx.support)}`} is the exit that says you were wrong. ` +
        `${ctx.resistance == null ? 'There is no measured resistance above' : `${money(ctx.resistance)} overhead`} is where you would plan to take profit${
          estimatedTarget != null ? ` (estimated target ${money(estimatedTarget)})` : ''
        }.`,
    },
    {
      week: 6,
      question: 'What does this chart NOT tell you?',
      answer: best
        ? `${best.whyNot} Chart evidence is a weight of evidence, not a probability of profit.`
        : 'It shows no edge at all right now. A chart cannot tell you about earnings dates, news, or how you will behave once you are in.',
    },
  ].map((q) => ({ ...q, weekTitle: weekTitle(q.week), teaches: weekFocus(q.week) }));

  const limits = [
    'Every level here is measured from past candles. Levels move as new candles print.',
    'The newest candle can still change until the session closes.',
    analysis.developing ? 'The most recent candle is still developing, so treat its shape as provisional.' : null,
    ...analysis.confirmation.warnings,
  ].filter(Boolean) as string[];

  return {
    hasData: true,
    howToRead,
    candle: newest
      ? {
          date: newest.date,
          classification: newest.classification,
          size: newest.size,
          wickShape: newest.wickShape,
          direction: newest.direction,
          description: describeCandle(newest),
          developing: analysis.developing,
        }
      : null,
    direction,
    levels,
    patterns,
    questions,
    limits,
  };
}

/** The chart-reading questions for one training week. */
export function questionsForWeek(read: ChartRead, week: number): ChartQuestion[] {
  return read.questions.filter((q) => q.week === week);
}
