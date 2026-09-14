// SwingEdge — Paper Trading Practice (SwingEdge + Thinkorswim paperMoney lab).
//
// Division of labour, deliberately strict:
//   SWINGEDGE           = brain and coach. Find, analyse, validate, size, plan,
//                         qualify, journal, review, teach.
//   THINKORSWIM PAPER   = cockpit and simulator. Order entry, stops, targets,
//                         fills, position management, platform experience.
//
// Nothing in this module places an order anywhere, and nothing here invents a
// number. Anything the trader has not recorded reads "not recorded" and is left
// out of every score rather than guessed at.

/* ------------------------------------------------------- the workflow spine */

export type PracticeStepKey =
  | 'ANALYZE'
  | 'PLAN'
  | 'QUALIFY'
  | 'EXECUTE'
  | 'MANAGE'
  | 'RECORD'
  | 'REVIEW'
  | 'IMPROVE';

export interface PracticeStep {
  key: PracticeStepKey;
  title: string;
  /** Which of the two systems owns this step. */
  owner: 'SWINGEDGE' | 'THINKORSWIM';
  what: string;
}

export const PRACTICE_STEPS: PracticeStep[] = [
  {
    key: 'ANALYZE',
    title: 'Analyze',
    owner: 'SWINGEDGE',
    what: 'Read the market first, then the timeframes, then scan and study three to five candidates.',
  },
  {
    key: 'PLAN',
    title: 'Plan',
    owner: 'SWINGEDGE',
    what: 'Write the entry, the invalidation, the stop, the target and the size before anything else.',
  },
  {
    key: 'QUALIFY',
    title: 'Qualify',
    owner: 'SWINGEDGE',
    what: 'Event risk, readiness, rules and heat all have to clear before a ticket exists.',
  },
  {
    key: 'EXECUTE',
    title: 'Execute in Thinkorswim',
    owner: 'THINKORSWIM',
    what: 'Place the simulated order in paperMoney using the approved share count and nothing larger.',
  },
  {
    key: 'MANAGE',
    title: 'Manage',
    owner: 'THINKORSWIM',
    what: 'Work the orders in paperMoney, but judge the trade on the daily and 4-hour charts.',
  },
  {
    key: 'RECORD',
    title: 'Record the result',
    owner: 'SWINGEDGE',
    what: 'Bring the real fill, the real stop and the real exit back here. The plan price is not the fill.',
  },
  {
    key: 'REVIEW',
    title: 'Review',
    owner: 'SWINGEDGE',
    what: 'Score the decision and the execution separately from the money.',
  },
  {
    key: 'IMPROVE',
    title: 'Improve',
    owner: 'SWINGEDGE',
    what: 'Name one thing to do differently, then run the loop again.',
  },
];

export const IMPROVEMENT_LOOP = ['ANALYZE', 'PLAN', 'EXECUTE', 'REVIEW', 'IMPROVE'] as const;

export const FULL_WORKFLOW: string[] = [
  'SwingEdge dashboard',
  'Multi-timeframe review',
  'Scan',
  'Analyze',
  'Event check',
  'Build trade plan',
  'Trade readiness',
  'Revalidate',
  'Create Thinkorswim execution plan',
  'Execute in paperMoney',
  'Record actual fill',
  'Manage using daily / 4-hour',
  'Exit',
  'Return to SwingEdge',
  'Journal',
  'Execution score',
  'Good win / good loss / bad win / bad loss',
  'Expectancy',
  'Monte Carlo',
  'Review',
  'Improve',
];

export const PRACTICE_PRINCIPLES = [
  'Plan before you click.',
  'Size before you buy.',
  'Define the loss before chasing the gain.',
  'Execute the plan.',
  'Review the result.',
  'Improve the process.',
];

/* ----------------------------------------------------- the training account */

export interface TrainingAccount {
  capital: number;
  riskPct: number;
  /** One unit of risk in dollars. */
  oneR: number;
  dailyLossLimitR: number;
  weeklyLossLimitR: number;
  maxPortfolioHeatR: number;
  minRewardRisk: number;
}

export const TRAINING_DEFAULTS = {
  capital: 5000,
  riskPct: 1,
  dailyLossLimitR: 2,
  weeklyLossLimitR: 5,
  maxPortfolioHeatR: 5,
  minRewardRisk: 2,
} as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Builds the training account from whatever the trader has configured. */
export function trainingAccount(
  capital = TRAINING_DEFAULTS.capital,
  riskPct = TRAINING_DEFAULTS.riskPct,
): TrainingAccount {
  return {
    capital,
    riskPct,
    oneR: round2((capital * riskPct) / 100),
    dailyLossLimitR: TRAINING_DEFAULTS.dailyLossLimitR,
    weeklyLossLimitR: TRAINING_DEFAULTS.weeklyLossLimitR,
    maxPortfolioHeatR: TRAINING_DEFAULTS.maxPortfolioHeatR,
    minRewardRisk: TRAINING_DEFAULTS.minRewardRisk,
  };
}

export const BUYING_POWER_WARNING =
  'Thinkorswim paperMoney may show far more buying power than this training account. Ignore it. Size every trade using the SwingEdge training account.';

/* ------------------------------------------------------------ position size */

export interface SizingInput {
  capital: number;
  riskPct: number;
  entry: number | null;
  stop: number | null;
}

export interface Sizing {
  riskPerShare: number | null;
  maxDollarRisk: number;
  maxShares: number | null;
  positionValue: number | null;
  note: string;
}

/**
 * The only share count SwingEdge will ever approve.
 *
 *   risk per share  = entry − stop
 *   max dollar risk = capital × risk %
 *   max shares      = floor(max dollar risk ÷ risk per share)
 */
export function sizePosition(input: SizingInput): Sizing {
  const maxDollarRisk = round2((input.capital * input.riskPct) / 100);
  if (input.entry === null || input.stop === null) {
    return {
      riskPerShare: null,
      maxDollarRisk,
      maxShares: null,
      positionValue: null,
      note: 'Entry and stop not recorded — no share count can be approved.',
    };
  }
  const riskPerShare = round2(input.entry - input.stop);
  if (riskPerShare <= 0) {
    return {
      riskPerShare,
      maxDollarRisk,
      maxShares: null,
      positionValue: null,
      note: 'The stop must sit below the entry for a long trade.',
    };
  }
  const maxShares = Math.floor(maxDollarRisk / riskPerShare);
  return {
    riskPerShare,
    maxDollarRisk,
    maxShares,
    positionValue: round2(maxShares * input.entry),
    note: `${maxShares} shares risks ${round2(maxShares * riskPerShare).toFixed(2)} of a ${maxDollarRisk.toFixed(2)} limit.`,
  };
}

export interface ShareCheck {
  ok: boolean;
  label: string | null;
  excess: number;
}

/** Guards the approved share count against whatever was typed into paperMoney. */
export function checkShareCount(entered: number | null, approved: number | null): ShareCheck {
  if (entered === null || approved === null) {
    return { ok: true, label: null, excess: 0 };
  }
  const excess = entered - approved;
  if (excess > 0) {
    return { ok: false, label: 'RISK LIMIT EXCEEDED', excess };
  }
  return { ok: true, label: null, excess: 0 };
}

/* -------------------------------------------------------------- market read */

export type MarketRead =
  | 'STRONG BULL'
  | 'BULL'
  | 'NEUTRAL'
  | 'CAUTIOUS'
  | 'BEAR'
  | 'HIGH VOLATILITY'
  | 'TRANSITION';

export const MARKET_READS: MarketRead[] = [
  'STRONG BULL',
  'BULL',
  'NEUTRAL',
  'CAUTIOUS',
  'BEAR',
  'HIGH VOLATILITY',
  'TRANSITION',
];

export const MARKET_READ_QUESTION = 'What kind of market am I trading in today?';

/* -------------------------------------------------------- execution variance */

export type VarianceBand = 'LOW' | 'MODERATE' | 'HIGH';

export interface VarianceInput {
  plannedEntry: number | null;
  actualEntry: number | null;
  plannedStop: number | null;
  actualStop: number | null;
  plannedShares: number | null;
  actualShares: number | null;
  plannedTarget: number | null;
  actualTarget: number | null;
}

export interface VarianceRow {
  label: string;
  planned: number | null;
  actual: number | null;
  difference: number | null;
}

export interface Variance {
  band: VarianceBand | null;
  slippagePerShare: number | null;
  rows: VarianceRow[];
  plannedRewardRisk: number | null;
  actualRewardRisk: number | null;
  notes: string[];
}

function rr(entry: number | null, stop: number | null, target: number | null): number | null {
  if (entry === null || stop === null || target === null) return null;
  const risk = entry - stop;
  if (risk <= 0) return null;
  return round2((target - entry) / risk);
}

/**
 * Planned versus actual, on the four things that change the trade: fill price,
 * risk, reward-to-risk and position value. The band is driven by how much of one
 * unit of risk the fill gave away, escalated when the share count differs.
 */
export function executionVariance(input: VarianceInput): Variance {
  const notes: string[] = [];
  const plannedRisk =
    input.plannedEntry !== null && input.plannedStop !== null
      ? round2(input.plannedEntry - input.plannedStop)
      : null;
  const actualRisk =
    input.actualEntry !== null && input.actualStop !== null
      ? round2(input.actualEntry - input.actualStop)
      : null;

  const plannedValue =
    input.plannedEntry !== null && input.plannedShares !== null
      ? round2(input.plannedEntry * input.plannedShares)
      : null;
  const actualValue =
    input.actualEntry !== null && input.actualShares !== null
      ? round2(input.actualEntry * input.actualShares)
      : null;

  const slippagePerShare =
    input.plannedEntry !== null && input.actualEntry !== null
      ? round2(input.actualEntry - input.plannedEntry)
      : null;

  const rows: VarianceRow[] = [
    {
      label: 'Entry price',
      planned: input.plannedEntry,
      actual: input.actualEntry,
      difference: slippagePerShare,
    },
    {
      label: 'Risk per share',
      planned: plannedRisk,
      actual: actualRisk,
      difference: plannedRisk !== null && actualRisk !== null ? round2(actualRisk - plannedRisk) : null,
    },
    {
      label: 'Shares',
      planned: input.plannedShares,
      actual: input.actualShares,
      difference:
        input.plannedShares !== null && input.actualShares !== null
          ? input.actualShares - input.plannedShares
          : null,
    },
    {
      label: 'Position value',
      planned: plannedValue,
      actual: actualValue,
      difference: plannedValue !== null && actualValue !== null ? round2(actualValue - plannedValue) : null,
    },
  ];

  const plannedRewardRisk = rr(input.plannedEntry, input.plannedStop, input.plannedTarget);
  const actualRewardRisk = rr(input.actualEntry, input.actualStop, input.actualTarget ?? input.plannedTarget);
  rows.push({
    label: 'Reward-to-risk',
    planned: plannedRewardRisk,
    actual: actualRewardRisk,
    difference:
      plannedRewardRisk !== null && actualRewardRisk !== null
        ? round2(actualRewardRisk - plannedRewardRisk)
        : null,
  });

  if (slippagePerShare === null || plannedRisk === null || plannedRisk <= 0) {
    notes.push('Fill price or planned risk not recorded — variance cannot be graded.');
    return {
      band: null,
      slippagePerShare,
      rows,
      plannedRewardRisk,
      actualRewardRisk,
      notes,
    };
  }

  const driftAsRisk = Math.abs(slippagePerShare) / plannedRisk;
  let band: VarianceBand = driftAsRisk <= 0.1 ? 'LOW' : driftAsRisk <= 0.25 ? 'MODERATE' : 'HIGH';
  notes.push(
    `The fill differed from the plan by ${Math.abs(slippagePerShare).toFixed(2)} per share, ${(driftAsRisk * 100).toFixed(0)}% of one unit of risk.`,
  );

  if (input.plannedShares !== null && input.actualShares !== null && input.actualShares !== input.plannedShares) {
    band = 'HIGH';
    notes.push('The share count in paperMoney did not match the approved size.');
  }

  return { band, slippagePerShare, rows, plannedRewardRisk, actualRewardRisk, notes };
}

/* -------------------------------------------------------- result classification */

export type ResultClass = 'GOOD WIN' | 'GOOD LOSS' | 'BAD WIN' | 'BAD LOSS';

export interface ResultClassification {
  result: ResultClass;
  profitable: boolean;
  rulesFollowed: boolean;
  violations: string[];
  explanation: string;
}

/**
 * Money decides win or loss. Rules decide good or bad. The two are never mixed:
 * a disciplined loss is a good trade, a rule-breaking win is a bad one that paid.
 */
export function classifyResult(realizedPl: number | null, violations: string[]): ResultClassification {
  const profitable = (realizedPl ?? 0) > 0;
  const rulesFollowed = violations.length === 0;
  const result: ResultClass = profitable
    ? rulesFollowed
      ? 'GOOD WIN'
      : 'BAD WIN'
    : rulesFollowed
      ? 'GOOD LOSS'
      : 'BAD LOSS';

  const explanation = rulesFollowed
    ? profitable
      ? 'The trade qualified, the rules held, and it paid.'
      : 'The trade qualified and the rules held. Losing a qualified trade is part of the plan, not a mistake.'
    : profitable
      ? `Profitable, but the rules were broken: ${violations.join('; ')}. Profit does not erase a rule violation.`
      : `The rules were broken and the trade lost: ${violations.join('; ')}.`;

  return { result, profitable, rulesFollowed, violations, explanation };
}

/* ------------------------------------------------------------ execution score */

export type ScoreState = 'PASS' | 'FAIL' | 'NOT_RECORDED';

export interface ExecutionComponent {
  key: string;
  label: string;
  points: number;
  state: ScoreState;
}

export const EXECUTION_COMPONENTS: { key: string; label: string; points: number }[] = [
  { key: 'entry', label: 'Correct entry', points: 20 },
  { key: 'size', label: 'Correct position size', points: 20 },
  { key: 'stop', label: 'Stop discipline', points: 20 },
  { key: 'target', label: 'Target discipline', points: 15 },
  { key: 'chasing', label: 'No chasing', points: 10 },
  { key: 'heat', label: 'Portfolio risk compliance', points: 10 },
  { key: 'journal', label: 'Journal completion', points: 5 },
];

export interface ExecutionScore {
  score: number | null;
  earned: number;
  scored: number;
  components: ExecutionComponent[];
  notRecorded: string[];
}

/**
 * Out of 100. Items that were never recorded are excluded from both sides of the
 * fraction rather than assumed either way, so the score always says what it is
 * actually measuring.
 */
export function scoreExecution(states: Partial<Record<string, ScoreState>>): ExecutionScore {
  const components: ExecutionComponent[] = EXECUTION_COMPONENTS.map((c) => ({
    ...c,
    state: states[c.key] ?? 'NOT_RECORDED',
  }));
  const scored = components
    .filter((c) => c.state !== 'NOT_RECORDED')
    .reduce((sum, c) => sum + c.points, 0);
  const earned = components.filter((c) => c.state === 'PASS').reduce((sum, c) => sum + c.points, 0);
  return {
    score: scored === 0 ? null : Math.round((earned / scored) * 100),
    earned,
    scored,
    components,
    notRecorded: components.filter((c) => c.state === 'NOT_RECORDED').map((c) => c.label),
  };
}

/* ----------------------------------------------------------- discipline flags */

export interface EarlyExitInput {
  /** Was the daily thesis still intact when the position was closed? */
  dailyThesisValid: boolean | null;
  /** Did a structural level actually break? */
  structuralInvalidation: boolean | null;
  /** Which chart prompted the exit. */
  promptedBy: 'DAILY' | 'H4' | 'H1' | 'M15' | null;
  exitReason: string | null;
}

export interface DisciplineFlag {
  code: string;
  label: string;
  detail: string;
}

/** Flags an exit taken off a lower timeframe while the swing thesis still held. */
export function earlyExitFlag(input: EarlyExitInput): DisciplineFlag | null {
  if (input.dailyThesisValid !== true) return null;
  if (input.structuralInvalidation === true) return null;
  if (input.promptedBy !== 'M15' && input.promptedBy !== 'H1') return null;
  return {
    code: 'EARLY_EXIT_LOWER_TIMEFRAME',
    label: 'EARLY EXIT / LOWER-TIMEFRAME INTERFERENCE',
    detail: `The ${input.promptedBy === 'M15' ? '15-minute' : '1-hour'} chart closed a position the daily thesis still supported, with no structural level broken. Review required.`,
  };
}

export interface StopChangeAudit {
  originalStop: number | null;
  newStop: number | null;
  originalRisk: number | null;
  currentRisk: number | null;
  riskIncreased: boolean;
  violation: DisciplineFlag | null;
  warning: string | null;
}

/** Records a stop move and calls a widened stop what it is. */
export function auditStopChange(args: {
  originalStop: number | null;
  newStop: number | null;
  entry: number | null;
  shares: number | null;
  structuralReason: boolean;
}): StopChangeAudit {
  const { originalStop, newStop, entry, shares } = args;
  const originalRisk =
    entry !== null && originalStop !== null && shares !== null
      ? round2((entry - originalStop) * shares)
      : null;
  const currentRisk =
    entry !== null && newStop !== null && shares !== null ? round2((entry - newStop) * shares) : null;
  const riskIncreased =
    originalRisk !== null && currentRisk !== null ? currentRisk > originalRisk : false;

  let violation: DisciplineFlag | null = null;
  if (riskIncreased && !args.structuralReason) {
    violation = {
      code: 'STOP_DISCIPLINE',
      label: 'STOP DISCIPLINE VIOLATION',
      detail: 'The stop was widened without a structural reason, which increases the loss you already agreed to take.',
    };
  }
  return {
    originalStop,
    newStop,
    originalRisk,
    currentRisk,
    riskIncreased,
    violation,
    warning: riskIncreased ? 'This stop move increases the money at risk on an open position.' : null,
  };
}

export const TARGET_CHANGE_RULE =
  'A target moves when structure moves it — a new level, a measured move, a changed thesis. Wanting more profit is not a reason.';

/* --------------------------------------------------------------- checklists */

export const TRAINING_CHECKLIST: string[] = [
  'I found the trade in SwingEdge.',
  'I reviewed the weekly context.',
  'I reviewed the daily setup.',
  'I checked 4-hour confirmation.',
  'I checked 1-hour entry timing.',
  'I checked earnings.',
  'I checked event risk.',
  'I defined my invalidation.',
  'I defined my stop.',
  'I calculated my position size.',
  'I checked reward-to-risk.',
  'I checked portfolio heat.',
  'I checked correlation.',
  'I revalidated the signal.',
  'I will use only the SwingEdge-approved position size in Thinkorswim.',
];

export const HANDOFF_CHECKLIST: string[] = [
  'Symbol confirmed',
  'Entry confirmed',
  'Stop confirmed',
  'Target confirmed',
  'Maximum shares confirmed',
  'Account risk confirmed',
  'Event risk checked',
  'Trade readiness checked',
  'Signal revalidated',
];

export const HANDOFF_READY_LABEL = 'READY FOR PAPERMONEY EXECUTION';

export const MANUAL_EXECUTION_STEPS: string[] = [
  'Open Thinkorswim paperMoney.',
  'Locate the symbol.',
  'Confirm the current market price.',
  'Enter the approved share quantity — no more.',
  'Enter the appropriate order type.',
  'Add the stop order.',
  'Add the target order when applicable.',
  'Verify the order details before submitting.',
  'Submit the simulated trade.',
  'Record the actual fill back in SwingEdge.',
];

export const MANAGEMENT_RULES: string[] = [
  'Follow the original plan.',
  'Do not chase.',
  'Do not widen a stop simply to avoid a loss.',
  'Do not add to the position after entry unless an approved strategy supports it.',
  'Do not react to one 15-minute candle while the daily thesis holds.',
  'Manage the swing on daily and 4-hour structure.',
];

export const BEST_SKIP_EXAMPLES: string[] = [
  'Avoided chasing an extended price',
  'Skipped a trade before earnings',
  'Rejected a poor reward-to-risk',
  'Rejected correlated concentration',
  'Waited for 1-hour confirmation',
  'Avoided an invalid stop placement',
];

export const BEST_SKIP_PRINCIPLE = 'Not trading can be a good trading decision.';

export const EXIT_REASON_OPTIONS = [
  'Target hit',
  'Stop hit',
  'Manual exit',
  'Trailing stop',
  'Event exit',
  'Trade invalidated',
] as const;

export const ORDER_TYPE_OPTIONS = ['Market', 'Limit', 'Stop', 'Stop limit'] as const;

/* -------------------------------------------------------------- trade result */

export interface TradeResultInput {
  entry: number | null;
  exit: number | null;
  shares: number | null;
  originalRisk: number | null;
  entryDate: string | null;
  exitDate: string | null;
}

export interface TradeResult {
  dollarPl: number | null;
  rMultiple: number | null;
  percentReturn: number | null;
  holdingDays: number | null;
}

export function tradeResult(input: TradeResultInput): TradeResult {
  const { entry, exit, shares, originalRisk } = input;
  const dollarPl =
    entry !== null && exit !== null && shares !== null ? round2((exit - entry) * shares) : null;
  const rMultiple =
    dollarPl !== null && originalRisk !== null && originalRisk > 0
      ? round2(dollarPl / originalRisk)
      : null;
  const percentReturn =
    entry !== null && exit !== null && entry > 0 ? round2(((exit - entry) / entry) * 100) : null;
  let holdingDays: number | null = null;
  if (input.entryDate && input.exitDate) {
    const a = new Date(input.entryDate).getTime();
    const b = new Date(input.exitDate).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b)) holdingDays = Math.max(0, Math.round((b - a) / 86_400_000));
  }
  return { dollarPl, rMultiple, percentReturn, holdingDays };
}

/* ------------------------------------------------ course integration, weeks 1–6 */

/**
 * What paperMoney is for in each week of the six-week course. SwingEdge always
 * does the analysis; the platform work is added in deliberately, one layer at a
 * time, and no trading is asked for until the analysis habit exists.
 */
export const THINKORSWIM_WEEK_FOCUS: Record<number, string[]> = {
  1: [
    'Set up your paperMoney charts to match SwingEdge: daily candles, 20 EMA, 50 SMA, RSI 14, volume.',
    'Practise basic navigation — symbol lookup, timeframes, drawing a horizontal line.',
    'No trades this week. None.',
  ],
  2: [
    'Scan in SwingEdge, then open each candidate in paperMoney and read the same chart in both places.',
    'Build the same watchlist in both tools so the names match.',
    'Still no orders — the goal is that the two screens tell you the same story.',
  ],
  3: [
    'Analyse pullbacks in SwingEdge, and only execute the ones that qualify in paperMoney.',
    'Use the approved share count exactly. Attach the stop with the entry, in the same order ticket.',
    'Record every fill back in SwingEdge the same day.',
  ],
  4: [
    'Analyse breakouts in SwingEdge, and only execute the ones that qualify in paperMoney.',
    'Notice how much more the fill drifts from the plan on a breakout than on a pullback.',
    'Log the variance every time — that number is the lesson.',
  ],
  5: [
    'Drill the mechanics: position sizing, stop orders, target orders, order modification, and reading R.',
    'Practise moving a stop up to breakeven, and practise not moving one down.',
    'Every modification gets a written reason in SwingEdge.',
  ],
  6: [
    'Run the whole loop alone: SwingEdge analysis, paperMoney execution, SwingEdge journal, SwingEdge review.',
    'No prompting from the checklists — use them only to check yourself afterwards.',
    'Grade each trade good win, good loss, bad win or bad loss before you look at the money.',
  ],
};
