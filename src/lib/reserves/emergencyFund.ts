// Reserve fund engine — Emergency Fund + Vehicle Maintenance sinking fund.
//
// Hard rule: the monthly Buffer and the Emergency Fund are DIFFERENT pools.
// Buffer = short-term cash left in the current month's budget for normal
// irregular expenses. Emergency Fund = dedicated liquid cash held only for
// true unexpected financial events. Money moved from Buffer into the Emergency
// Fund is recorded once, as a `buffer_transfer`, and is never counted in both.

export type ReserveKind = 'emergency' | 'vehicle';

export type ReserveDirection =
  | 'contribution'
  | 'buffer_transfer'
  | 'interest'
  | 'withdrawal'
  | 'adjustment';

/** Directions that add to the reserve. */
const INFLOW: ReserveDirection[] = ['contribution', 'buffer_transfer', 'interest', 'adjustment'];

export const DIRECTION_LABEL: Record<ReserveDirection, string> = {
  contribution: 'Monthly contribution',
  buffer_transfer: 'Buffer Transfer to Emergency Fund',
  interest: 'Interest earned',
  withdrawal: 'Withdrawal',
  adjustment: 'Manual adjustment',
};

export interface ReserveFund {
  id: string;
  kind: ReserveKind;
  name: string;
  account_id: string | null;
  institution_label: string | null;
  stage1_target: number;
  primary_target: number;
  ceiling_target: number;
  monthly_contribution: number;
  contributions_paused: boolean;
  essential_monthly_expenses: number;
  starting_balance: number;
  notes: string | null;
  sort_order: number;
}

export interface ReserveTxn {
  id: string;
  fund_id: string;
  txn_date: string;
  amount: number;
  direction: ReserveDirection;
  reason: string | null;
  category: string | null;
  notes: string | null;
}

/** Emergency-only withdrawal reasons. Anything not on this list is not an emergency. */
export const EMERGENCY_CATEGORIES = [
  'Unexpected medical expense',
  'Insurance deductible',
  'Emergency travel',
  'Temporary income interruption',
  'Major unexpected transportation expense',
  'Urgent household expense',
  'Other emergency',
] as const;

/** Vehicle sinking-fund spend categories. */
export const VEHICLE_CATEGORIES = [
  'Tires',
  'Brakes',
  'Battery',
  'Routine service',
  'Repair',
  'Other maintenance',
] as const;

/**
 * Spend types that must NEVER be paid from the Emergency Fund. Used to raise a
 * guardrail when a withdrawal reason looks like planned or discretionary spend.
 */
const NON_EMERGENCY_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bvacation|\btrip\b|cruise|resort|hawaii|flight deal|holiday travel/i, label: 'planned vacation' },
  { re: /subscription|streaming|netflix|spotify|membership/i, label: 'a subscription' },
  { re: /dining|restaurant|takeout|coffee|shopping|clothes|clothing|gift|entertainment|concert/i, label: 'discretionary spending' },
  { re: /\brent\b|utilit|groceries|phone bill|routine|monthly bill/i, label: 'a routine monthly expense' },
];

export type ReserveStatus = 'unfunded' | 'building' | 'stage1_met' | 'funded' | 'replenishment_needed';

export const STATUS_LABEL: Record<ReserveStatus, string> = {
  unfunded: 'Not started',
  building: 'Building to Stage 1',
  stage1_met: 'Stage 1 met — building to goal',
  funded: 'Fully funded',
  replenishment_needed: 'Replenishment Needed',
};

export interface Guardrail {
  id: string;
  severity: 'warning' | 'critical' | 'info';
  message: string;
}

export interface ReserveSummary {
  fund: ReserveFund;
  balance: number;
  contributed: number;
  bufferTransferred: number;
  interest: number;
  withdrawn: number;
  status: ReserveStatus;
  remainingToStage1: number;
  remainingToPrimary: number;
  remainingToCeiling: number;
  pctFunded: number;
  monthlyContribution: number;
  monthsToGoal: number | null;
  goalDate: string | null;
  monthsCovered: number | null;
  /** Amount needed to get back to the primary target after a withdrawal. */
  replenishmentNeeded: number;
  lastWithdrawal: ReserveTxn | null;
  guardrails: Guardrail[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export function reserveBalance(fund: ReserveFund, txns: ReserveTxn[]): number {
  return r2(
    Number(fund.starting_balance || 0) +
      txns.reduce((s, t) => {
        const amt = Math.abs(Number(t.amount || 0));
        return INFLOW.includes(t.direction) ? s + amt : s - amt;
      }, 0),
  );
}

function addMonths(months: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + Math.ceil(months));
  return d.toISOString().slice(0, 10);
}

/** True when a withdrawal reason/category looks like non-emergency spending. */
export function nonEmergencyFlag(text: string): string | null {
  const hay = text || '';
  for (const p of NON_EMERGENCY_PATTERNS) if (p.re.test(hay)) return p.label;
  return null;
}

export interface GuardrailContext {
  /** Ending monthly Buffer balance — used to detect double-counted money. */
  bufferBalance?: number;
  /** Vacation / travel reserve balance — must stay distinct from emergency cash. */
  vacationReserve?: number;
  /** Vehicle sinking-fund balance, so vehicle spend is checked against it first. */
  vehicleBalance?: number;
}

export function summarizeReserve(
  fund: ReserveFund,
  allTxns: ReserveTxn[],
  ctx: GuardrailContext = {},
): ReserveSummary {
  const txns = allTxns
    .filter((t) => t.fund_id === fund.id)
    .sort((a, b) => b.txn_date.localeCompare(a.txn_date));

  const sum = (dir: ReserveDirection) =>
    r2(txns.filter((t) => t.direction === dir).reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0));

  const contributed = sum('contribution');
  const bufferTransferred = sum('buffer_transfer');
  const interest = sum('interest');
  const withdrawn = sum('withdrawal');
  const balance = reserveBalance(fund, txns);

  const stage1 = Number(fund.stage1_target || 0);
  const primary = Number(fund.primary_target || 0);
  const ceiling = Number(fund.ceiling_target || 0);

  const remainingToStage1 = r2(Math.max(0, stage1 - balance));
  const remainingToPrimary = r2(Math.max(0, primary - balance));
  const remainingToCeiling = r2(Math.max(0, ceiling - balance));
  const pctFunded = primary > 0 ? Math.min(1, balance / primary) : 0;

  const lastWithdrawal = txns.find((t) => t.direction === 'withdrawal') || null;
  const everFunded = balance + withdrawn >= primary && primary > 0;

  let status: ReserveStatus;
  if (balance <= 0) status = 'unfunded';
  else if (remainingToPrimary <= 0) status = 'funded';
  else if (everFunded && withdrawn > 0) status = 'replenishment_needed';
  else if (remainingToStage1 <= 0) status = 'stage1_met';
  else status = 'building';

  // Priority 5: contributions stop once the primary goal is met, unless the
  // fund has been drawn down or the household risk profile changed.
  const monthlyContribution =
    fund.contributions_paused || (remainingToPrimary <= 0 && status === 'funded')
      ? 0
      : Number(fund.monthly_contribution || 0);

  const monthsToGoal =
    remainingToPrimary > 0 && monthlyContribution > 0
      ? Math.ceil(remainingToPrimary / monthlyContribution)
      : remainingToPrimary <= 0
        ? 0
        : null;
  const goalDate = monthsToGoal && monthsToGoal > 0 ? addMonths(monthsToGoal) : null;

  const essential = Number(fund.essential_monthly_expenses || 0);
  const monthsCovered = essential > 0 ? r2(balance / essential) : null;

  const replenishmentNeeded = status === 'replenishment_needed' ? remainingToPrimary : 0;

  const guardrails: Guardrail[] = [];
  if (fund.kind === 'emergency') {
    if (balance > 0 && balance < stage1) {
      guardrails.push({
        id: 'below-stage1',
        severity: 'critical',
        message: `Emergency Fund is below the $${stage1.toLocaleString()} Stage 1 floor. Rebuild this before anything optional.`,
      });
    }
    if (status === 'replenishment_needed') {
      guardrails.push({
        id: 'replenish',
        severity: 'warning',
        message: `Replenishment Needed — add $${replenishmentNeeded.toLocaleString()} to get back to the $${primary.toLocaleString()} target.`,
      });
    }
    for (const t of txns.filter((x) => x.direction === 'withdrawal')) {
      const flag = nonEmergencyFlag(`${t.reason || ''} ${t.category || ''} ${t.notes || ''}`);
      if (flag) {
        guardrails.push({
          id: `misuse-${t.id}`,
          severity: 'critical',
          message: `${t.txn_date}: this withdrawal looks like ${flag}, not a true emergency. Planned vacations, entertainment, subscriptions and routine bills are not emergencies.`,
        });
      }
    }
    if ((ctx.vacationReserve ?? 0) > 0 && balance > 0 && r2(ctx.vacationReserve!) === balance) {
      guardrails.push({
        id: 'vacation-overlap',
        severity: 'warning',
        message: 'Emergency Fund and Vacation Fund balances match exactly — check that the same cash is not being counted as both.',
      });
    }
    if ((ctx.bufferBalance ?? 0) > 0 && bufferTransferred > 0 && (ctx.bufferBalance ?? 0) >= bufferTransferred) {
      guardrails.push({
        id: 'buffer-double-count',
        severity: 'warning',
        message: `$${bufferTransferred.toLocaleString()} was transferred out of Buffer into the Emergency Fund, but the Buffer balance still includes it. Reduce the Buffer so the money is only counted once.`,
      });
    }
  } else if (fund.kind === 'vehicle' && balance <= 0 && Number(fund.monthly_contribution || 0) === 0) {
    guardrails.push({
      id: 'vehicle-unfunded',
      severity: 'info',
      message: 'No vehicle sinking fund yet — normal maintenance would fall back on the Emergency Fund.',
    });
  }

  return {
    fund,
    balance,
    contributed,
    bufferTransferred,
    interest,
    withdrawn,
    status,
    remainingToStage1,
    remainingToPrimary,
    remainingToCeiling,
    pctFunded,
    monthlyContribution,
    monthsToGoal,
    goalDate,
    monthsCovered,
    replenishmentNeeded,
    lastWithdrawal,
    guardrails,
  };
}

export interface FundingPriority {
  order: number;
  label: string;
  detail: string;
  state: 'active' | 'done' | 'waiting';
}

/**
 * Priority ladder. Emergency floor first, then required debt + core retirement,
 * then high-interest vacation debt, then freed cash into the Emergency Fund up
 * to the primary target, then redirect the surplus elsewhere.
 */
export function fundingPriorities(
  em: ReserveSummary,
  opts: { vacationDebtBalance: number; freedMonthly: number },
): FundingPriority[] {
  const vacGone = opts.vacationDebtBalance <= 0.01;
  const stage1Done = em.remainingToStage1 <= 0;
  const funded = em.remainingToPrimary <= 0;

  return [
    {
      order: 1,
      label: `Build the Emergency Fund to $${em.fund.stage1_target.toLocaleString()}`,
      detail: stage1Done
        ? 'Stage 1 floor is in place.'
        : `$${em.remainingToStage1.toLocaleString()} to go — fund this as quickly as reasonably possible.`,
      state: stage1Done ? 'done' : 'active',
    },
    {
      order: 2,
      label: 'Keep required debt payments and core retirement/HSA contributions running',
      detail: 'Never pause minimums or employer-matched contributions to build cash.',
      state: 'active',
    },
    {
      order: 3,
      label: 'Attack high-interest vacation debt and finish settlement obligations',
      detail: vacGone
        ? 'Vacation debt is cleared.'
        : `$${opts.vacationDebtBalance.toLocaleString()} of vacation debt remaining.`,
      state: vacGone ? 'done' : stage1Done ? 'active' : 'waiting',
    },
    {
      order: 4,
      label: `Redirect freed debt payment into the Emergency Fund up to $${em.fund.primary_target.toLocaleString()}`,
      detail: !vacGone
        ? `Waiting on vacation payoff — about $${opts.freedMonthly.toLocaleString()}/mo will be freed.`
        : funded
          ? 'Primary goal reached.'
          : `$${em.remainingToPrimary.toLocaleString()} to go at $${opts.freedMonthly.toLocaleString()}/mo of freed cash.`,
      state: funded ? 'done' : vacGone ? 'active' : 'waiting',
    },
    {
      order: 5,
      label: 'At the goal, stop automatic contributions and redirect the surplus',
      detail: funded
        ? 'Send further dollars to the Vacation Fund, HSA, retirement, investments and other savings goals.'
        : 'Kicks in once the Emergency Fund is fully funded (unless it is used or your risk profile changes).',
      state: funded ? 'active' : 'waiting',
    },
  ];
}
