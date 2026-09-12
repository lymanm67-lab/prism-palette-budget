// SwingEdge — Circuit breakers.
//
// Losing streaks are not the real danger. The danger is what a trader does
// during one: sizing up to win it back, loosening stops, taking setups that were
// never qualified. The account rarely dies from three planned losses. It dies
// from the fourth trade that broke every rule.
//
// A breaker does not judge whether the trades were bad. It notices a pattern and
// asks for a pause and a review. Every message here is instructional — it tells
// the user what to look at, never that they are a bad trader.
//
// Nothing here is enforced against a live brokerage. SwingEdge cannot stop an
// order at thinkorswim. It can only refuse to bless the next plan and say why.

const round2 = (n: number) => Math.round(n * 100) / 100;

export type BreakerState =
  | 'ACTIVE'
  | 'PAUSED_CONSECUTIVE_LOSSES'
  | 'PAUSED_DAILY_LOSS'
  | 'PAUSED_WEEKLY_LOSS'
  | 'REVIEW_REQUIRED';

export interface BreakerLimits {
  consecutiveLosses: number;
  dailyLossLimit: number;
  weeklyLossLimit: number;
}

export interface BreakerTally {
  consecutiveLosses: number;
  dailyLoss: number;
  weeklyLoss: number;
}

export interface BreakerAssessment {
  state: BreakerState;
  tripped: boolean;
  /** Can a new plan be executed right now? */
  canOpenNewTrade: boolean;
  headline: string;
  reason: string | null;
  /** What the pause is actually for. */
  reviewSteps: string[];
  /** Distance to each ceiling, for the dashboard. */
  room: { losses: number; daily: number; weekly: number };
}

export const BREAKER_LABEL: Record<BreakerState, string> = {
  ACTIVE: 'Clear to plan',
  PAUSED_CONSECUTIVE_LOSSES: 'Pause — losing streak',
  PAUSED_DAILY_LOSS: 'Pause — daily loss limit',
  PAUSED_WEEKLY_LOSS: 'Pause — weekly loss limit',
  REVIEW_REQUIRED: 'Review before the next trade',
};

const REVIEW_STEPS = [
  'Read back the last three trades. Was each setup qualified before entry, or did one get taken because you wanted a trade?',
  'Check whether position size was calculated from the stop every time, or whether any of them was sized to make money back.',
  'Look at whether the market regime turned. A setup that worked in a trending market often stops working in a choppy one.',
  'Confirm your stops were placed at invalidation levels, not at a dollar amount you were willing to lose.',
  'Decide the one thing you will do differently, and write it down before the next plan.',
];

/**
 * Reads the current tally against the user's own limits.
 *
 * Losses are counted as positive dollars. Consecutive losses reset on any win.
 */
export function assessBreaker(input: {
  tally: BreakerTally;
  limits: BreakerLimits;
  /** Set when a paused breaker has had its review written. */
  reviewCompleted?: boolean;
}): BreakerAssessment {
  const { tally, limits } = input;
  const room = {
    losses: Math.max(0, limits.consecutiveLosses - tally.consecutiveLosses),
    daily: round2(Math.max(0, limits.dailyLossLimit - tally.dailyLoss)),
    weekly: round2(Math.max(0, limits.weeklyLossLimit - tally.weeklyLoss)),
  };

  let state: BreakerState = 'ACTIVE';
  let reason: string | null = null;

  // Weekly is checked first: it is the widest signal that something structural
  // is off, and it should not be masked by a daily figure.
  if (limits.weeklyLossLimit > 0 && tally.weeklyLoss >= limits.weeklyLossLimit) {
    state = 'PAUSED_WEEKLY_LOSS';
    reason = `This week's simulated losses reached $${round2(tally.weeklyLoss)}, at or past the $${round2(limits.weeklyLossLimit)} weekly limit you set.`;
  } else if (limits.dailyLossLimit > 0 && tally.dailyLoss >= limits.dailyLossLimit) {
    state = 'PAUSED_DAILY_LOSS';
    reason = `Today's simulated losses reached $${round2(tally.dailyLoss)}, at or past the $${round2(limits.dailyLossLimit)} daily limit you set.`;
  } else if (limits.consecutiveLosses > 0 && tally.consecutiveLosses >= limits.consecutiveLosses) {
    state = 'PAUSED_CONSECUTIVE_LOSSES';
    reason = `${tally.consecutiveLosses} losing trades in a row, which is the streak length you asked to be stopped at.`;
  }

  const tripped = state !== 'ACTIVE';

  // A completed review moves a pause to REVIEW_REQUIRED cleared — trading may
  // resume, because the point was the review, not the punishment.
  if (tripped && input.reviewCompleted) {
    return {
      state: 'ACTIVE',
      tripped: false,
      canOpenNewTrade: true,
      headline: 'Review done — clear to plan again',
      reason,
      reviewSteps: [],
      room,
    };
  }

  return {
    state,
    tripped,
    canOpenNewTrade: !tripped,
    headline: BREAKER_LABEL[state],
    reason,
    reviewSteps: tripped ? REVIEW_STEPS : [],
    room,
  };
}

export interface ClosedTradeLike {
  exit_date: string | null;
  realized_pl: number | null;
  status: string;
}

/**
 * Builds the tally from closed trades.
 *
 * `today` and the week start are passed in rather than read from the clock, so
 * the same inputs always produce the same reading.
 */
export function tallyFromTrades(
  trades: ClosedTradeLike[],
  today: string,
  weekStart: string,
): BreakerTally {
  const closed = trades
    .filter((t) => t.status === 'CLOSED' && t.exit_date)
    .sort((a, b) => (a.exit_date! < b.exit_date! ? 1 : -1)); // newest first

  let consecutiveLosses = 0;
  for (const t of closed) {
    if ((t.realized_pl ?? 0) < 0) consecutiveLosses += 1;
    else break;
  }

  const lossesIn = (from: string) =>
    round2(
      closed
        .filter((t) => t.exit_date! >= from && t.exit_date! <= today)
        .reduce((sum, t) => sum + Math.max(0, -(t.realized_pl ?? 0)), 0),
    );

  return {
    consecutiveLosses,
    dailyLoss: lossesIn(today),
    weeklyLoss: lossesIn(weekStart),
  };
}

/** Monday of the week containing the given ISO date. */
export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const back = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
