// SwingEdge — Six-week training programme.
//
// The programme is deliberately not "six weeks until you can trade real money".
// Weeks are how the work is organised; graduation is behavioural. A trader who
// finishes six weeks with sloppy stops is not ready, and a trader who needs ten
// weeks has lost nothing.
//
// Every requirement below is about repeated behaviour under observation, not
// about profit. Profit over twenty paper trades is mostly noise.

export interface TrainingWeek {
  week: number;
  title: string;
  focus: string;
  /** What the week is actually teaching, in plain terms. */
  intent: string;
  activities: string[];
  /** Counters this week expects to see move. */
  targets: {
    lessons?: number;
    chartsAnalyzed?: number;
    setupsAnalyzed?: number;
    candidatesBuilt?: number;
    paperTrades?: number;
  };
  doneWhen: string;
}

export const TRAINING_WEEKS: TrainingWeek[] = [
  {
    week: 1,
    title: 'Read the market, place no trades',
    focus: 'Market condition and chart reading',
    intent:
      'Most beginner losses are good setups taken in the wrong market. Before learning entries, learn to tell a trending market from a choppy one.',
    activities: [
      'Work through the foundation lessons in the Academy.',
      'Open the Stock Analyzer on 20 charts and write down, for each, whether the market is trending, ranging or falling apart.',
      'Do not plan a single trade this week.',
    ],
    targets: { lessons: 4, chartsAnalyzed: 20 },
    doneWhen: 'You can look at a chart and say what the market is doing before looking at any score.',
  },
  {
    week: 2,
    title: 'Recognise setups, still no trades',
    focus: 'Setup identification',
    intent:
      'Learn to name what you are looking at. A pullback, a breakout retest and a range edge are different trades with different failure points.',
    activities: [
      'Study the setup lessons.',
      'Identify 15 setups and name each one before checking what SwingEdge calls it.',
      'For each, write where the setup would be proven wrong.',
    ],
    targets: { lessons: 4, setupsAnalyzed: 15 },
    doneWhen: 'You name the setup and its invalidation level without prompting.',
  },
  {
    week: 3,
    title: 'Stops and position size',
    focus: 'Risk defined before entry',
    intent:
      'This is the week that decides whether trading is survivable. The stop comes from the chart; the size comes from the stop. Never the other way round.',
    activities: [
      'Study the stop-loss lessons.',
      'Build 10 full trade plans in the Trade Planner — stop first, then size.',
      'Do not open any of them as trades.',
    ],
    targets: { lessons: 5, candidatesBuilt: 10 },
    doneWhen: 'Every plan you build has a stop at an invalidation level and a size you did not choose first.',
  },
  {
    week: 4,
    title: 'First paper trades',
    focus: 'Executing a plan you already wrote',
    intent:
      'The gap between planning and doing is where discipline lives. Take small, qualified trades and change nothing after entry.',
    activities: [
      'Open 5 paper trades, each from a plan that qualified.',
      'Journal every one on the day you take it, not later.',
      'Move a stop only in your favour, and only with a written reason.',
    ],
    targets: { paperTrades: 5 },
    doneWhen: 'Five trades taken exactly as planned, all journaled.',
  },
  {
    week: 5,
    title: 'Managing and exiting',
    focus: 'Holding, trailing and getting out',
    intent:
      'Most damage happens after entry: exiting a good trade early out of fear, or holding a broken one out of hope.',
    activities: [
      'Open 5 more paper trades and manage each to a planned exit.',
      'Practise trailing stops and breakeven stops.',
      'Review every exit against the plan, and label each result a good or bad decision separately from the money.',
    ],
    targets: { paperTrades: 5, lessons: 3 },
    doneWhen: 'You can point to a losing trade and explain why it was still a good trade.',
  },
  {
    week: 6,
    title: 'Review, refine, decide',
    focus: 'Honest self-assessment',
    intent:
      'Look at your own record without flattering it. The best trades this month may be the ones you correctly skipped.',
    activities: [
      'Complete 10 more paper trades for a 20-trade sample.',
      'Write a weekly review, including the best trade you chose not to take.',
      'Read your Performance page and name your single most expensive habit.',
    ],
    targets: { paperTrades: 10 },
    doneWhen: 'Your rule following holds up across 20 trades and you can name your weakness before anyone points it out.',
  },
];

/* ---------------------------------------------------------- graduation */

export interface GraduationInput {
  closedPaperTrades: number;
  rulesFollowedPct: number;
  journaledPct: number;
  /** Average execution score across closed trades. */
  avgExecutionScore: number;
  stopsWidened: number;
  /** Trades taken outside the approved entry zone. */
  chasedEntries: number;
  weeklyReviews: number;
  expectancy: number | null;
  minPaperTrades: number;
}

export interface GraduationCheck {
  label: string;
  passed: boolean;
  detail: string;
}

export interface GraduationResult {
  status: 'NOT_READY' | 'BUILDING' | 'READY_FOR_SMALL_LIVE';
  headline: string;
  checks: GraduationCheck[];
  passedCount: number;
  /** Never a promise. Ever. */
  caveat: string;
}

/**
 * Behaviour-based readiness. Note what is absent: no profit target, no win rate
 * requirement, no equity curve. A trader can be ready while flat, and unready
 * while up.
 */
export function assessGraduation(input: GraduationInput): GraduationResult {
  const checks: GraduationCheck[] = [
    {
      label: `At least ${input.minPaperTrades} closed paper trades`,
      passed: input.closedPaperTrades >= input.minPaperTrades,
      detail: `${input.closedPaperTrades} closed so far. A smaller sample tells you almost nothing.`,
    },
    {
      label: 'Rules followed on 80% or more of trades',
      passed: input.rulesFollowedPct >= 80,
      detail: `Currently ${Math.round(input.rulesFollowedPct)}%.`,
    },
    {
      label: 'Every trade journaled',
      passed: input.journaledPct >= 95,
      detail: `${Math.round(input.journaledPct)}% journaled. An unjournaled trade teaches nothing.`,
    },
    {
      label: 'Average plan following of 80 or better',
      passed: input.avgExecutionScore >= 80,
      detail: `Averaging ${Math.round(input.avgExecutionScore)} out of 100.`,
    },
    {
      label: 'No stop ever widened',
      passed: input.stopsWidened === 0,
      detail:
        input.stopsWidened === 0
          ? 'No stop was moved away from price.'
          : `${input.stopsWidened} stop${input.stopsWidened === 1 ? ' was' : 's were'} widened. This is the habit that ends accounts.`,
    },
    {
      label: 'No chased entries',
      passed: input.chasedEntries === 0,
      detail:
        input.chasedEntries === 0
          ? 'Every entry landed inside its approved zone.'
          : `${input.chasedEntries} entr${input.chasedEntries === 1 ? 'y was' : 'ies were'} taken outside the approved zone.`,
    },
    {
      label: 'At least 4 weekly reviews written',
      passed: input.weeklyReviews >= 4,
      detail: `${input.weeklyReviews} written.`,
    },
    {
      label: 'Expectancy is not negative',
      passed: input.expectancy === null ? false : input.expectancy >= 0,
      detail:
        input.expectancy === null
          ? 'Not enough closed trades to measure.'
          : `Expectancy is ${input.expectancy.toFixed(2)}R per trade.`,
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const status: GraduationResult['status'] =
    passedCount === checks.length ? 'READY_FOR_SMALL_LIVE' : passedCount >= 5 ? 'BUILDING' : 'NOT_READY';

  return {
    status,
    headline:
      status === 'READY_FOR_SMALL_LIVE'
        ? 'Behaviour is consistent enough to consider small live trades'
        : status === 'BUILDING'
          ? 'Habits are forming — keep going on paper'
          : 'Stay on paper for now',
    checks,
    passedCount,
    caveat:
      'This measures your habits, not your edge and not your future results. Paper trading has no real fear in it, so expect your first live trades to feel harder. Start smaller than feels worthwhile.',
  };
}

/* -------------------------------------------------------- daily checklist */

export interface ChecklistState {
  market_condition_checked: boolean;
  earnings_checked: boolean;
  heat_room_checked: boolean;
  stop_defined: boolean;
  size_calculated: boolean;
}

export const CHECKLIST_ITEMS: { key: keyof ChecklistState; label: string; why: string }[] = [
  {
    key: 'market_condition_checked',
    label: 'I checked what the market is doing today',
    why: 'A good setup in a falling market is still a bad trade.',
  },
  {
    key: 'earnings_checked',
    label: 'I checked for earnings before the exit date',
    why: 'Earnings can gap straight through a stop overnight.',
  },
  {
    key: 'heat_room_checked',
    label: 'I checked I have room left under my risk ceiling',
    why: 'Each trade alone can be small while the total is not.',
  },
  {
    key: 'stop_defined',
    label: 'My stop is at a level that proves the setup wrong',
    why: 'A stop at a dollar amount is not a stop, it is a wish.',
  },
  {
    key: 'size_calculated',
    label: 'I calculated size from the stop, not the other way round',
    why: 'Choosing size first is how one trade does the damage of five.',
  },
];

export function checklistComplete(state: ChecklistState): boolean {
  return CHECKLIST_ITEMS.every((i) => state[i.key]);
}

export function checklistProgress(state: ChecklistState): number {
  const done = CHECKLIST_ITEMS.filter((i) => state[i.key]).length;
  return Math.round((done / CHECKLIST_ITEMS.length) * 100);
}

/* ------------------------------------------------------------ week status */

export interface WeekProgress {
  lessons_completed: number;
  charts_analyzed: number;
  setups_analyzed: number;
  candidates_built: number;
  paper_trades_taken: number;
}

/** How far through a week's targets the user is, 0–100. */
export function weekCompletion(week: TrainingWeek, progress: WeekProgress): number {
  const pairs: [number | undefined, number][] = [
    [week.targets.lessons, progress.lessons_completed],
    [week.targets.chartsAnalyzed, progress.charts_analyzed],
    [week.targets.setupsAnalyzed, progress.setups_analyzed],
    [week.targets.candidatesBuilt, progress.candidates_built],
    [week.targets.paperTrades, progress.paper_trades_taken],
  ];
  const active = pairs.filter(([target]) => target !== undefined) as [number, number][];
  if (!active.length) return 0;
  const ratio =
    active.reduce((sum, [target, done]) => sum + Math.min(1, target > 0 ? done / target : 1), 0) / active.length;
  return Math.round(ratio * 100);
}

/* ------------------------------------------------------------- CSV export */

/** Escapes a single CSV field. */
function csvField(v: unknown): string {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Builds a CSV document from column keys and rows. */
export function toCsv(columns: string[], rows: Record<string, unknown>[]): string {
  const head = columns.map(csvField).join(',');
  const body = rows.map((r) => columns.map((c) => csvField(r[c])).join(','));
  return [head, ...body].join('\n');
}

/** Triggers a browser download without leaving the page. */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
