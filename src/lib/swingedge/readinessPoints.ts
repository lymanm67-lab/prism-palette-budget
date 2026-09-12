/**
 * Readiness points — a single number that answers "have I done enough
 * preparation to start trading?".
 *
 * Points are earned for preparation and discipline only. Nothing here rewards
 * profit: a lucky winner earns the same points as a well-run loser, because the
 * point of the score is to measure work done, not money made.
 *
 * Two gates:
 *  - PAPER_TRADING_THRESHOLD — enough learning to open paper trades.
 *  - LIVE_CONSIDERATION_THRESHOLD — enough recorded practice to even discuss
 *    real money. The behaviour checks in assessGraduation still apply on top.
 */

export const POINT_VALUES = {
  lessonCompleted: 10,
  quizPassed: 5,
  trainingWeekCompleted: 20,
  closedPaperTrade: 15,
  journaledTrade: 10,
  weeklyReview: 25,
} as const;

export const PAPER_TRADING_THRESHOLD = 150;
export const LIVE_CONSIDERATION_THRESHOLD = 500;

/** A quiz counts as passed at 80 or better. */
export const QUIZ_PASS_SCORE = 80;

export interface ReadinessPointsInput {
  lessonsCompleted: number;
  totalLessons: number;
  quizzesPassed: number;
  trainingWeeksCompleted: number;
  closedPaperTrades: number;
  journaledTrades: number;
  weeklyReviews: number;
}

export interface PointLine {
  label: string;
  detail: string;
  earned: number;
  possibleNote?: string;
}

export interface ReadinessPointsResult {
  total: number;
  lines: PointLine[];
  /** Points available from the Academy alone. */
  academyPoints: number;
  /** Cleared to open paper trades. */
  canPaperTrade: boolean;
  pointsToPaperTrade: number;
  /** Enough recorded practice to consider small live money. */
  canConsiderLive: boolean;
  pointsToLive: number;
  /** 0–100 progress toward the next gate. */
  progressPct: number;
  stage: 'LEARNING' | 'PAPER_TRADING' | 'LIVE_CANDIDATE';
  headline: string;
}

export function assessReadinessPoints(input: ReadinessPointsInput): ReadinessPointsResult {
  const lessonPts = input.lessonsCompleted * POINT_VALUES.lessonCompleted;
  const quizPts = input.quizzesPassed * POINT_VALUES.quizPassed;
  const weekPts = input.trainingWeeksCompleted * POINT_VALUES.trainingWeekCompleted;
  const tradePts = input.closedPaperTrades * POINT_VALUES.closedPaperTrade;
  const journalPts = input.journaledTrades * POINT_VALUES.journaledTrade;
  const reviewPts = input.weeklyReviews * POINT_VALUES.weeklyReview;

  const academyPoints = lessonPts + quizPts;
  const total = academyPoints + weekPts + tradePts + journalPts + reviewPts;

  const lines: PointLine[] = [
    {
      label: 'Academy lessons finished',
      detail: `${input.lessonsCompleted} of ${input.totalLessons} lessons`,
      earned: lessonPts,
      possibleNote: `${POINT_VALUES.lessonCompleted} points each`,
    },
    {
      label: 'Lesson quizzes passed',
      detail: `${input.quizzesPassed} passed at ${QUIZ_PASS_SCORE} or better`,
      earned: quizPts,
      possibleNote: `${POINT_VALUES.quizPassed} points each`,
    },
    {
      label: 'Training weeks completed',
      detail: `${input.trainingWeeksCompleted} of 6 weeks`,
      earned: weekPts,
      possibleNote: `${POINT_VALUES.trainingWeekCompleted} points each`,
    },
    {
      label: 'Paper trades closed',
      detail: `${input.closedPaperTrades} closed`,
      earned: tradePts,
      possibleNote: `${POINT_VALUES.closedPaperTrade} points each`,
    },
    {
      label: 'Trades journaled',
      detail: `${input.journaledTrades} written up`,
      earned: journalPts,
      possibleNote: `${POINT_VALUES.journaledTrade} points each`,
    },
    {
      label: 'Weekly reviews written',
      detail: `${input.weeklyReviews} reviews`,
      earned: reviewPts,
      possibleNote: `${POINT_VALUES.weeklyReview} points each`,
    },
  ];

  const canPaperTrade = total >= PAPER_TRADING_THRESHOLD;
  const canConsiderLive = total >= LIVE_CONSIDERATION_THRESHOLD;
  const pointsToPaperTrade = Math.max(0, PAPER_TRADING_THRESHOLD - total);
  const pointsToLive = Math.max(0, LIVE_CONSIDERATION_THRESHOLD - total);

  const stage: ReadinessPointsResult['stage'] = canConsiderLive
    ? 'LIVE_CANDIDATE'
    : canPaperTrade
      ? 'PAPER_TRADING'
      : 'LEARNING';

  const progressPct = canPaperTrade
    ? Math.min(
        100,
        Math.round(
          ((total - PAPER_TRADING_THRESHOLD) /
            (LIVE_CONSIDERATION_THRESHOLD - PAPER_TRADING_THRESHOLD)) *
            100,
        ),
      )
    : Math.round((total / PAPER_TRADING_THRESHOLD) * 100);

  const headline = canConsiderLive
    ? 'You have done the preparation work. The behaviour checks decide the rest.'
    : canPaperTrade
      ? `Cleared to paper trade. ${pointsToLive} more points before real money is even a conversation.`
      : `${pointsToPaperTrade} more points before your first paper trade. Finish lessons to earn them.`;

  return {
    total,
    lines,
    academyPoints,
    canPaperTrade,
    pointsToPaperTrade,
    canConsiderLive,
    pointsToLive,
    progressPct,
    stage,
    headline,
  };
}
