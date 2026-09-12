// SwingEdge — Execution Realism.
//
// A plan is not a fill. This module models what actually happens when an order
// meets a real market: slippage that scales with liquidity, gaps that jump
// straight through a stop, and the difference between the loss you planned and
// the loss you took.
//
// It also keeps three readings strictly separate, because conflating them is how
// traders learn the wrong lesson:
//   SIGNAL QUALITY   — was the setup identification sound, judged on evidence
//                      available before entry, independent of the money outcome
//   EXECUTION QUALITY — did you enter, hold and exit the way the plan said
//   TRADE RESULT     — what the money did
//
// Profit and loss alone never decides whether a decision was good. A disciplined
// loss is a good trade. A rule-breaking win is a bad trade that paid.
//
// Nothing here predicts anything. It reports.

import type { Candle } from './types';

/* ------------------------------------------------------------- liquidity */

export type LiquidityTier = 'DEEP' | 'NORMAL' | 'THIN' | 'VERY_THIN';

export interface SlippageModel {
  /** Slippage as a fraction of price, per side. */
  pctOfPrice: number;
  label: string;
}

/**
 * Slippage assumptions by liquidity tier, per side of the trade. These are
 * assumptions, not measurements — a deliberately conservative stand-in for the
 * spread and impact you cannot see from daily bars.
 */
export const SLIPPAGE_BY_TIER: Record<LiquidityTier, SlippageModel> = {
  DEEP: { pctOfPrice: 0.0005, label: 'Deep liquidity — 0.05% assumed per side' },
  NORMAL: { pctOfPrice: 0.001, label: 'Normal liquidity — 0.10% assumed per side' },
  THIN: { pctOfPrice: 0.0035, label: 'Thin — 0.35% assumed per side' },
  VERY_THIN: { pctOfPrice: 0.0075, label: 'Very thin — 0.75% assumed per side' },
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10_000) / 10_000;

/** Liquidity tier from average daily dollar volume. */
export function liquidityTier(avgDollarVolume: number | null): LiquidityTier {
  if (avgDollarVolume === null) return 'THIN';
  if (avgDollarVolume >= 200_000_000) return 'DEEP';
  if (avgDollarVolume >= 20_000_000) return 'NORMAL';
  if (avgDollarVolume >= 2_000_000) return 'THIN';
  return 'VERY_THIN';
}

/* ------------------------------------------------------------------ fills */

export type FillSide = 'BUY' | 'SELL';

export interface SimulatedFill {
  /** The price the plan asked for. */
  requested: number;
  /** The price the simulation actually uses. */
  filled: number;
  /** Signed cost of the difference, in dollars per share, always ≥ 0. */
  slippagePerShare: number;
  /** Total dollar cost across all shares. */
  slippageCost: number;
  /** Non-zero when the session opened past the requested price. */
  gapDifference: number;
  gapped: boolean;
  tier: LiquidityTier;
  commission: number;
  note: string;
}

export interface FillInput {
  side: FillSide;
  requested: number;
  shares: number;
  tier: LiquidityTier;
  /** Next session's open, when the fill has to wait for it. */
  nextOpen?: number | null;
  commissionPerTrade?: number;
}

/**
 * Simulates one fill.
 *
 * Slippage always works against you: a buy fills a little higher, a sell a
 * little lower. When `nextOpen` is supplied and it is worse than the requested
 * price, that open becomes the reference price — this is how a gap through a
 * stop is handled, rather than pretending the stop filled exactly at its number.
 */
export function simulateFill(input: FillInput): SimulatedFill {
  const { side, requested, shares, tier } = input;
  const commission = input.commissionPerTrade ?? 0;
  const model = SLIPPAGE_BY_TIER[tier];

  let reference = requested;
  let gapDifference = 0;
  let gapped = false;

  if (input.nextOpen !== null && input.nextOpen !== undefined) {
    const open = input.nextOpen;
    // A gap counts only when the open is worse for you than what you asked for.
    const worse = side === 'BUY' ? open > requested : open < requested;
    if (worse) {
      reference = open;
      gapDifference = round2(Math.abs(open - requested));
      gapped = true;
    }
  }

  const drift = round4(reference * model.pctOfPrice);
  const filled = round2(side === 'BUY' ? reference + drift : reference - drift);
  const slippagePerShare = round2(Math.abs(filled - requested));
  const slippageCost = round2(slippagePerShare * shares);

  return {
    requested: round2(requested),
    filled,
    slippagePerShare,
    slippageCost,
    gapDifference,
    gapped,
    tier,
    commission,
    note: gapped
      ? `Price opened past your level, so the fill uses the next session open of $${round2(reference)}. ${model.label}.`
      : model.label,
  };
}

/**
 * Given the candle that triggered a stop and the one after it, works out which
 * price the exit should use.
 *
 * When a candle both breaches the stop and opens above it, the stop is assumed
 * to fill intrabar. When the candle OPENS below the stop, the market gapped and
 * the open is the earliest realistic price — never the stop itself.
 */
export function stopExitReference(
  stop: number,
  triggerCandle: Candle,
): { reference: number; gapped: boolean; note: string } {
  if (triggerCandle.open < stop) {
    return {
      reference: triggerCandle.open,
      gapped: true,
      note: `Session opened at $${round2(triggerCandle.open)}, below the $${round2(stop)} stop. A stop cannot fill at a price the market skipped.`,
    };
  }
  return {
    reference: stop,
    gapped: false,
    note: 'Stop breached during the session, so the stop price is a fair fill assumption.',
  };
}

/**
 * Daily-bar ambiguity: when one candle touches both the stop and the target,
 * there is no way to know which came first. SwingEdge assumes the stop, because
 * assuming the target flatters every backtest.
 */
export function resolveAmbiguousCandle(
  candle: Candle,
  stop: number,
  target: number,
): { hit: 'STOP' | 'TARGET' | 'NEITHER'; ambiguous: boolean; note: string } {
  const hitStop = candle.low <= stop;
  const hitTarget = candle.high >= target;
  if (hitStop && hitTarget) {
    return {
      hit: 'STOP',
      ambiguous: true,
      note: 'This candle reached both the stop and the target. Daily data cannot say which came first, so the stop is assumed. Treat the result as the pessimistic case.',
    };
  }
  if (hitStop) return { hit: 'STOP', ambiguous: false, note: 'Stop reached.' };
  if (hitTarget) return { hit: 'TARGET', ambiguous: false, note: 'Target reached.' };
  return { hit: 'NEITHER', ambiguous: false, note: 'Neither level reached.' };
}

/* ------------------------------------------------- planned vs actual loss */

export interface LossComparison {
  plannedLoss: number;
  actualLoss: number;
  difference: number;
  /** Positive when the real loss exceeded the plan. */
  worseThanPlanned: boolean;
  note: string;
}

/** Compares the loss the plan accepted with the loss the simulation produced. */
export function compareLoss(input: {
  entryFill: number;
  exitFill: number;
  plannedEntry: number;
  plannedStop: number;
  shares: number;
  commission?: number;
}): LossComparison {
  const commission = input.commission ?? 0;
  const plannedLoss = round2(Math.max(0, (input.plannedEntry - input.plannedStop) * input.shares));
  const realized = (input.exitFill - input.entryFill) * input.shares - commission;
  const actualLoss = round2(Math.max(0, -realized));
  const difference = round2(actualLoss - plannedLoss);
  return {
    plannedLoss,
    actualLoss,
    difference,
    worseThanPlanned: difference > 0.005,
    note:
      difference > 0.005
        ? `The loss came in $${Math.abs(difference).toFixed(2)} worse than planned. Slippage and gaps do that, which is why position size leaves room for it.`
        : difference < -0.005
          ? `The loss came in $${Math.abs(difference).toFixed(2)} better than planned.`
          : 'The loss matched the plan.',
  };
}

/* ------------------------------------------------------ execution quality */

export interface ExecutionQualityInput {
  /** Did the entry happen inside the approved zone? */
  enteredInZone: boolean;
  /** Was the stop defined before entry? */
  stopDefinedBeforeEntry: boolean;
  /** Was the stop ever widened away from price? */
  stopWidened: boolean;
  /** Did the exit follow the plan (stop, target or a stated rule)? */
  exitFollowedPlan: boolean;
  /** Was position size calculated from the stop before entry? */
  sizeCalculatedFirst: boolean;
  /** Was the trade revalidated immediately before entry? */
  revalidatedBeforeEntry: boolean;
  /** Did the trade get journaled? */
  journaled: boolean;
}

export interface ExecutionQualityResult {
  score: number;
  band: 'EXCELLENT' | 'GOOD' | 'MIXED' | 'POOR';
  breaches: string[];
  credits: string[];
  summary: string;
}

/** Scores how faithfully the plan was carried out. Money never enters this. */
export function scoreExecutionQuality(input: ExecutionQualityInput): ExecutionQualityResult {
  const checks: { ok: boolean; weight: number; credit: string; breach: string }[] = [
    {
      ok: input.stopDefinedBeforeEntry,
      weight: 25,
      credit: 'Stop was defined before entry.',
      breach: 'No stop was defined before entry. This is the one rule with no exceptions.',
    },
    {
      ok: input.sizeCalculatedFirst,
      weight: 20,
      credit: 'Position size came from the stop.',
      breach: 'Position size was not calculated from the stop before entry.',
    },
    {
      ok: !input.stopWidened,
      weight: 20,
      credit: 'Stop was never widened.',
      breach: 'The stop was widened after entry, which turns a defined loss into an open one.',
    },
    {
      ok: input.enteredInZone,
      weight: 15,
      credit: 'Entry landed inside the approved zone.',
      breach: 'Entry happened outside the approved zone — chasing.',
    },
    {
      ok: input.exitFollowedPlan,
      weight: 10,
      credit: 'Exit followed the plan.',
      breach: 'Exit did not follow the plan.',
    },
    {
      ok: input.revalidatedBeforeEntry,
      weight: 5,
      credit: 'Signal was rechecked immediately before entry.',
      breach: 'The signal was not rechecked before entry.',
    },
    {
      ok: input.journaled,
      weight: 5,
      credit: 'Trade was journaled.',
      breach: 'Trade was not journaled, so there is nothing to learn from later.',
    },
  ];

  const score = checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0);
  const breaches = checks.filter((c) => !c.ok).map((c) => c.breach);
  const credits = checks.filter((c) => c.ok).map((c) => c.credit);
  const band: ExecutionQualityResult['band'] =
    score >= 90 ? 'EXCELLENT' : score >= 75 ? 'GOOD' : score >= 55 ? 'MIXED' : 'POOR';

  return {
    score,
    band,
    breaches,
    credits,
    summary:
      band === 'EXCELLENT'
        ? 'Carried out as planned.'
        : band === 'GOOD'
          ? 'Mostly carried out as planned, with something to tighten.'
          : band === 'MIXED'
            ? 'Several parts of the plan were not followed.'
            : 'The plan was largely abandoned once the trade was live.',
  };
}

/* --------------------------------------------------------- signal quality */

export type SignalQuality = 'SOUND' | 'ACCEPTABLE' | 'WEAK' | 'UNSOUND';

/**
 * Was the setup identification sound, judged only on what was known before
 * entry? Deliberately blind to the outcome.
 */
export function scoreSignalQuality(input: {
  hybridScore: number | null;
  stopJustified: boolean;
  rewardRisk: number | null;
  minimumRewardRisk?: number;
  hardGateFailures: number;
  setupPresent: boolean;
}): { quality: SignalQuality; reasons: string[] } {
  const reasons: string[] = [];
  const minRr = input.minimumRewardRisk ?? 2;

  if (input.hardGateFailures > 0) {
    reasons.push('A hard risk gate was failing when the trade was taken.');
    return { quality: 'UNSOUND', reasons };
  }
  if (!input.setupPresent) reasons.push('No recognised setup was present.');
  if (!input.stopJustified) reasons.push('The stop was not at a defensible invalidation level.');
  if (input.rewardRisk !== null && input.rewardRisk < minRr) {
    reasons.push(`Reward to risk was ${input.rewardRisk}:1, under the ${minRr}:1 minimum.`);
  }
  if (input.hybridScore !== null && input.hybridScore < 55) {
    reasons.push(`The combined reading was ${input.hybridScore}, which is weak.`);
  }

  if (reasons.length === 0) {
    reasons.push('Setup, stop and reward to risk all held up on the evidence available beforehand.');
    return { quality: 'SOUND', reasons };
  }
  if (reasons.length === 1 && input.setupPresent) return { quality: 'ACCEPTABLE', reasons };
  if (reasons.length >= 3 || !input.setupPresent) return { quality: 'UNSOUND', reasons };
  return { quality: 'WEAK', reasons };
}

/* ----------------------------------------------------------- outcome class */

export type OutcomeClass = 'GOOD_WIN' | 'GOOD_LOSS' | 'BAD_WIN' | 'BAD_LOSS';

export const OUTCOME_LABEL: Record<OutcomeClass, string> = {
  GOOD_WIN: 'Good win',
  GOOD_LOSS: 'Good loss',
  BAD_WIN: 'Bad win',
  BAD_LOSS: 'Bad loss',
};

export const OUTCOME_MEANING: Record<OutcomeClass, string> = {
  GOOD_WIN: 'Sound setup, followed the plan, and it paid. Repeat this.',
  GOOD_LOSS:
    'Sound setup, followed the plan, and it still lost. This is the cost of doing business and nothing needs fixing.',
  BAD_WIN:
    'It paid despite the process. This is the most dangerous result, because it rewards the habit that will eventually cost you.',
  BAD_LOSS: 'Process broke down and it cost money. This is the one to study.',
};

/**
 * Combines the three separate readings. Money is only ever the second input,
 * never the judge of whether the decision was good.
 */
export function classifyOutcome(input: {
  signalQuality: SignalQuality;
  executionScore: number;
  realizedPl: number;
}): { outcome: OutcomeClass; label: string; meaning: string } {
  const processGood =
    (input.signalQuality === 'SOUND' || input.signalQuality === 'ACCEPTABLE') && input.executionScore >= 75;
  const won = input.realizedPl > 0;
  const outcome: OutcomeClass = processGood
    ? won
      ? 'GOOD_WIN'
      : 'GOOD_LOSS'
    : won
      ? 'BAD_WIN'
      : 'BAD_LOSS';
  return { outcome, label: OUTCOME_LABEL[outcome], meaning: OUTCOME_MEANING[outcome] };
}

/* ------------------------------------------------------------ R multiples */

/** Result in units of the risk originally accepted. */
export function rMultiple(realizedPl: number, originalRisk: number | null): number | null {
  if (!originalRisk || originalRisk <= 0) return null;
  return Math.round((realizedPl / originalRisk) * 100) / 100;
}
