// SwingEdge — Circuit breakers.
//
// Losing streaks are not the real danger. The danger is what a trader does
// during one: sizing up to win it back, loosening stops, taking setups that were
// never qualified. The account rarely dies from three planned losses. It dies
// from the fourth trade that broke every rule.
//
// Limits are held as R multiples and percentages. 1R is the maximum planned risk
// per trade, derived from the current account balance (5,000 x 1% = 50), so every
// dollar ceiling here moves with the balance instead of being frozen in place.
//
// Each breaker is independent: the daily pause, the weekly pause and the
// consecutive-loss review trip, and clear, on their own.
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

export type BreakerKey = 'DAILY' | 'WEEKLY' | 'CONSECUTIVE';

export interface BreakerLimits {
  consecutiveLosses: number;
  /** Dollar value of 1R — the maximum planned risk on one trade. */
  oneR?: number;
  /** Daily realized-loss ceiling, as a multiple of R. */
  dailyLossR?: number;
  /** Weekly realized-loss ceiling, as a multiple of R. */
  weeklyLossR?: number;
  /** Maximum portfolio heat, as a percentage of the account. */
  maxPortfolioHeatPct?: number;
  /** Current account balance, used for the heat ceiling in dollars. */
  accountBalance?: number;
  /** Legacy fixed-dollar ceilings. Only used when no R multiple is given. */
  dailyLossLimit?: number;
  weeklyLossLimit?: number;
}

export interface BreakerTally {
  consecutiveLosses: number;
  dailyLoss: number;
  weeklyLoss: number;
  /** Open risk as a percentage of the account, for the heat tile. */
  portfolioHeatPct?: number;
}

export interface BreakerReading {
  key: BreakerKey;
  label: string;
  /** The tally has reached the ceiling. */
  tripped: boolean;
  /** Tripped and the required review has not been written yet. */
  blocking: boolean;
  reviewed: boolean;
  used: number;
  usedR: number;
  limit: number;
  limitR: number;
  room: number;
  pct: number;
  reason: string | null;
}

export interface BreakerAssessment {
  state: BreakerState;
  tripped: boolean;
  /** Can a new paper trade be opened right now? */
  canOpenNewTrade: boolean;
  headline: string;
  reason: string | null;
  /** What the pause is actually for. */
  reviewSteps: string[];
  /** Distance to each ceiling, for the dashboard. */
  room: { losses: number; daily: number; weekly: number };
  /** Every breaker, read independently. */
  breakers: Record<'daily' | 'weekly' | 'consecutive', BreakerReading>;
  /** Reviews still owed before new paper trades resume. */
  reviewsRequired: BreakerKey[];
  oneR: number;
  heat: { pct: number; limitPct: number; limit: number; room: number };
}

export const BREAKER_LABEL: Record<BreakerState, string> = {
  ACTIVE: 'Active',
  PAUSED_CONSECUTIVE_LOSSES: 'Review required',
  PAUSED_DAILY_LOSS: 'Daily trading pause',
  PAUSED_WEEKLY_LOSS: 'Weekly trading pause',
  REVIEW_REQUIRED: 'Review required',
};

const REVIEW_STEPS = [
  'Read back the last three trades. Was each setup qualified before entry, or did one get taken because you wanted a trade?',
  'Check whether position size was calculated from the stop every time, or whether any of them was sized to make money back.',
  'Look at whether the market regime turned. A setup that worked in a trending market often stops working in a choppy one.',
  'Confirm your stops were placed at invalidation levels, not at a dollar amount you were willing to lose.',
  'Decide the one thing you will do differently, and write it down before the next plan.',
];

/**
 * The consecutive-loss review. Three losses are not evidence that the strategy
 * failed — most of the time they are ordinary variance. These questions separate
 * variance from an execution problem.
 */
export const CONSECUTIVE_REVIEW_QUESTIONS = [
  'Did all three setups qualify?',
  'Were the entries inside the planned entry zones?',
  'Were position sizes correct?',
  'Were stops technically valid?',
  'Were stops followed?',
  'Was the market regime appropriate?',
  'Were the trades highly correlated?',
  'Did I chase any entries?',
  'Was this normal strategy variance or an execution problem?',
  'What will I do differently on the next trade?',
];

export const DAILY_REVIEW_PROMPT =
  'Write the daily review: which trades made up the loss, whether each was executed as planned, and what you are doing for the rest of the day.';

export const WEEKLY_REVIEW_PROMPT =
  'Write the weekly review: what the week cost, which of the losses were properly executed, and what changes before the next trading week.';

/** Dollar value of 1R from the current account balance. */
export function oneRFrom(accountBalance: number, riskPerTradePct: number): number {
  return round2((accountBalance * riskPerTradePct) / 100);
}

function reading(input: {
  key: BreakerKey;
  label: string;
  used: number;
  limit: number;
  oneR: number;
  limitR: number;
  reviewed: boolean;
  reason: string;
}): BreakerReading {
  const { key, label, used, limit, oneR, limitR, reviewed } = input;
  const tripped = limit > 0 && used >= limit;
  return {
    key,
    label,
    tripped,
    blocking: tripped && !reviewed,
    reviewed,
    used: round2(used),
    usedR: oneR > 0 ? Math.round((used / oneR) * 100) / 100 : 0,
    limit: round2(limit),
    limitR: round2(limitR),
    room: round2(Math.max(0, limit - used)),
    pct: limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0,
    reason: tripped ? input.reason : null,
  };
}

/**
 * Reads the current tally against the user's own limits.
 *
 * Losses are counted as positive dollars. Consecutive losses reset on any win.
 */
export function assessBreaker(input: {
  tally: BreakerTally;
  limits: BreakerLimits;
  /** Per-breaker review flags. Each breaker clears on its own review. */
  reviews?: { daily?: boolean; weekly?: boolean; consecutive?: boolean };
  /** Legacy: one flag clearing whichever breaker is live. */
  reviewCompleted?: boolean;
}): BreakerAssessment {
  const { tally, limits } = input;
  const oneR = round2(limits.oneR ?? 0);
  const dailyLossR = limits.dailyLossR ?? 0;
  const weeklyLossR = limits.weeklyLossR ?? 0;

  // R multiples drive the dollar ceilings. Fixed dollars are only a fallback for
  // households that set them before limits moved to R.
  const dailyLimit =
    dailyLossR > 0 && oneR > 0 ? round2(dailyLossR * oneR) : (limits.dailyLossLimit ?? 0);
  const weeklyLimit =
    weeklyLossR > 0 && oneR > 0 ? round2(weeklyLossR * oneR) : (limits.weeklyLossLimit ?? 0);

  const all = input.reviewCompleted === true;
  const daily = reading({
    key: 'DAILY',
    label: 'Daily trading pause',
    used: tally.dailyLoss,
    limit: dailyLimit,
    oneR,
    limitR: dailyLossR || (oneR > 0 ? dailyLimit / oneR : 0),
    reviewed: all || input.reviews?.daily === true,
    reason: `Today's simulated losses reached $${round2(tally.dailyLoss)}, at or past your ${round2(dailyLossR || 0) || ''}R daily limit of $${round2(dailyLimit)}. New paper trades are paused for the rest of the trading day; analysis, watchlists and review stay open.`,
  });
  const weekly = reading({
    key: 'WEEKLY',
    label: 'Weekly trading pause',
    used: tally.weeklyLoss,
    limit: weeklyLimit,
    oneR,
    limitR: weeklyLossR || (oneR > 0 ? weeklyLimit / oneR : 0),
    reviewed: all || input.reviews?.weekly === true,
    reason: `This week's simulated losses reached $${round2(tally.weeklyLoss)}, at or past your ${round2(weeklyLossR || 0) || ''}R weekly limit of $${round2(weeklyLimit)}. New paper trades are paused until the weekly review is written.`,
  });
  const consecutive = reading({
    key: 'CONSECUTIVE',
    label: 'Consecutive loss review',
    used: tally.consecutiveLosses,
    limit: limits.consecutiveLosses,
    oneR: 1,
    limitR: limits.consecutiveLosses,
    reviewed: all || input.reviews?.consecutive === true,
    reason: `${tally.consecutiveLosses} losing trades in a row, which is the streak length you asked to be stopped at. Three losses are usually variance rather than a broken strategy — the review is how you tell the difference.`,
  });

  const room = {
    losses: consecutive.room,
    daily: daily.room,
    weekly: weekly.room,
  };

  // Independent breakers, one headline. Weekly is the widest signal that
  // something structural is off, so it is named first when several are live.
  let state: BreakerState = 'ACTIVE';
  let reason: string | null = null;
  if (weekly.blocking) {
    state = 'PAUSED_WEEKLY_LOSS';
    reason = weekly.reason;
  } else if (daily.blocking) {
    state = 'PAUSED_DAILY_LOSS';
    reason = daily.reason;
  } else if (consecutive.blocking) {
    state = 'REVIEW_REQUIRED';
    reason = consecutive.reason;
  }

  const tripped = state !== 'ACTIVE';
  const reviewsRequired = [weekly, daily, consecutive].filter((b) => b.blocking).map((b) => b.key);
  const heatPct = tally.portfolioHeatPct ?? 0;
  const heatLimitPct = limits.maxPortfolioHeatPct ?? 0;
  const heat = {
    pct: round2(heatPct),
    limitPct: round2(heatLimitPct),
    limit: round2(((limits.accountBalance ?? 0) * heatLimitPct) / 100),
    room: round2(Math.max(0, heatLimitPct - heatPct)),
  };

  if (!tripped) {
    const cleared = [weekly, daily, consecutive].some((b) => b.tripped);
    return {
      state: 'ACTIVE',
      tripped: false,
      canOpenNewTrade: true,
      headline: cleared ? 'Review done — clear to plan again' : BREAKER_LABEL.ACTIVE,
      reason: [weekly, daily, consecutive].find((b) => b.tripped)?.reason ?? null,
      reviewSteps: [],
      room,
      breakers: { daily, weekly, consecutive },
      reviewsRequired,
      oneR,
      heat,
    };
  }

  return {
    state,
    tripped,
    canOpenNewTrade: false,
    headline: BREAKER_LABEL[state],
    reason,
    reviewSteps: REVIEW_STEPS,
    room,
    breakers: { daily, weekly, consecutive },
    reviewsRequired,
    oneR,
    heat,
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

/** The closed trades that make up a loss window, newest first. */
export function losingTradesIn<T extends ClosedTradeLike>(
  trades: T[],
  from: string,
  to: string,
): T[] {
  return trades
    .filter(
      (t) =>
        t.status === 'CLOSED' &&
        t.exit_date &&
        t.exit_date >= from &&
        t.exit_date <= to &&
        (t.realized_pl ?? 0) < 0,
    )
    .sort((a, b) => (a.exit_date! < b.exit_date! ? 1 : -1));
}

/** The current run of losing trades, newest first. */
export function consecutiveLosingTrades<T extends ClosedTradeLike>(trades: T[]): T[] {
  const closed = trades
    .filter((t) => t.status === 'CLOSED' && t.exit_date)
    .sort((a, b) => (a.exit_date! < b.exit_date! ? 1 : -1));
  const run: T[] = [];
  for (const t of closed) {
    if ((t.realized_pl ?? 0) < 0) run.push(t);
    else break;
  }
  return run;
}

/** Monday of the week containing the given ISO date. */
export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday
  const back = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}
