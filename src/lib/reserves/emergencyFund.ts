// Reserve fund engine — SoFi Emergency Cash, Vehicle Maintenance sinking fund
// and SoFi Investments.
//
// Hard rules enforced here:
//  1. The monthly Buffer and the Emergency Fund are DIFFERENT pools. Buffer is
//     current-month flexibility for normal irregular expenses. The Emergency
//     Fund is a dedicated reserve for true unexpected financial events. Money
//     moved between them is recorded once, as a `buffer_transfer`
//     ("Buffer Sweep to SoFi Emergency Fund"), never counted twice.
//  2. Only balances classified `emergency_cash` count toward the $5,000 target.
//     Investment market value never counts as emergency cash — the first $5,000
//     stays on the cash side.

export type ReserveKind = 'emergency' | 'vehicle' | 'investment' | 'other';

export type LiquidityClass =
  | 'emergency_cash'
  | 'short_term_savings'
  | 'investment'
  | 'retirement'
  | 'other';

export const LIQUIDITY_LABEL: Record<LiquidityClass, string> = {
  emergency_cash: 'Emergency Cash',
  short_term_savings: 'Short-Term Savings',
  investment: 'Investment',
  retirement: 'Retirement',
  other: 'Other',
};

export const LIQUIDITY_CLASSES: LiquidityClass[] = [
  'emergency_cash',
  'short_term_savings',
  'investment',
  'retirement',
  'other',
];

export type ReserveDirection =
  | 'contribution'
  | 'buffer_transfer'
  | 'interest'
  | 'withdrawal'
  | 'gain'
  | 'loss'
  | 'adjustment';

/** Directions that add to the reserve. */
const INFLOW: ReserveDirection[] = ['contribution', 'buffer_transfer', 'interest', 'gain', 'adjustment'];

export const DIRECTION_LABEL: Record<ReserveDirection, string> = {
  contribution: 'Contribution',
  buffer_transfer: 'Buffer Sweep to SoFi Emergency Fund',
  interest: 'Interest earned',
  withdrawal: 'Withdrawal',
  gain: 'Investment gain',
  loss: 'Investment loss',
  adjustment: 'Manual adjustment',
};

export interface ReserveFund {
  id: string;
  kind: ReserveKind;
  name: string;
  account_id: string | null;
  institution_label: string | null;
  liquidity_class: LiquidityClass;
  account_type: string | null;
  goal_label: string | null;
  market_value: number;
  stage1_target: number;
  primary_target: number;
  ceiling_target: number;
  monthly_contribution: number;
  contributions_paused: boolean;
  essential_monthly_expenses: number;
  starting_balance: number;
  redirect_excess_enabled: boolean;
  redirect_investments_pct: number;
  redirect_other_pct: number;
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
  'Medical emergency',
  'Insurance deductible',
  'Emergency travel',
  'Temporary income interruption',
  'Major unexpected vehicle repair',
  'Urgent household expense',
  'Family emergency',
  'Other emergency',
] as const;

/** Vehicle sinking-fund spend categories. */
export const VEHICLE_CATEGORIES = [
  'Tires',
  'Brakes',
  'Batteries',
  'Repairs',
  'Routine maintenance',
  'Other maintenance',
] as const;

/**
 * Spend types that must NEVER be paid from the Emergency Fund. Used to raise a
 * guardrail when a withdrawal reason looks like planned or discretionary spend.
 */
const NON_EMERGENCY_PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\bvacation|\btrip\b|cruise|resort|hawaii|flight deal|holiday travel/i, label: 'a planned vacation' },
  { re: /subscription|streaming|netflix|spotify|membership/i, label: 'a subscription' },
  { re: /dining|restaurant|takeout|coffee|shopping|clothes|clothing|gift|entertainment|concert/i, label: 'ordinary discretionary spending' },
  { re: /\brent\b|utilit|groceries|phone bill|routine|monthly bill/i, label: 'a routine monthly expense' },
  { re: /invest|brokerage|stock|etf|crypto/i, label: 'an investment transfer' },
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
  gains: number;
  losses: number;
  ytdContributions: number;
  ytdWithdrawals: number;
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
  /** Amount currently sitting below the primary goal. */
  belowGoal: number;
  lastWithdrawal: ReserveTxn | null;
  guardrails: Guardrail[];
  /** Balance derived from logged reserve movements only. */
  trackedBalance: number;
  /** Linked institution account, when the fund follows a real account. */
  link: LinkedAccountInfo | null;

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
  /** Funds classified as investments, so misclassification can be flagged. */
  investmentFunds?: { name: string; liquidity_class: LiquidityClass; market_value: number }[];
  /**
   * Live balance of the linked institution account. When present it replaces the
   * manually tracked balance so the card follows the real account.
   */
  link?: LinkedAccountInfo | null;

}

export function summarizeReserve(
  fund: ReserveFund,
  allTxns: ReserveTxn[],
  ctx: GuardrailContext = {},
): ReserveSummary {
  const txns = allTxns
    .filter((t) => t.fund_id === fund.id)
    .sort((a, b) => b.txn_date.localeCompare(a.txn_date));

  const year = String(new Date().getFullYear());
  const sum = (dir: ReserveDirection, ytdOnly = false) =>
    r2(
      txns
        .filter((t) => t.direction === dir && (!ytdOnly || (t.txn_date || '').startsWith(year)))
        .reduce((s, t) => s + Math.abs(Number(t.amount || 0)), 0),
    );

  const contributed = sum('contribution');
  const bufferTransferred = sum('buffer_transfer');
  const interest = sum('interest');
  const withdrawn = sum('withdrawal');
  const gains = sum('gain');
  const losses = sum('loss');
  const ytdContributions = r2(sum('contribution', true) + sum('buffer_transfer', true) + sum('interest', true));
  const ytdWithdrawals = sum('withdrawal', true);
  const trackedBalance = reserveBalance(fund, txns);
  const link = ctx.link ?? null;
  const linkUsable = !!link && link.balance != null && !link.stale;
  const balance = linkUsable ? r2(Number(link!.balance)) : trackedBalance;


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
  if (primary <= 0) status = 'funded';
  else if (balance <= 0) status = 'unfunded';
  else if (remainingToPrimary <= 0) status = 'funded';
  else if (everFunded && withdrawn > 0) status = 'replenishment_needed';
  else if (remainingToStage1 <= 0) status = 'stage1_met';
  else status = 'building';

  // Priority 6: contributions stop once the primary goal is met, unless the
  // fund has been drawn down or the household risk profile changed.
  const monthlyContribution =
    fund.contributions_paused || (remainingToPrimary <= 0 && status === 'funded' && primary > 0)
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
    if (fund.liquidity_class !== 'emergency_cash') {
      guardrails.push({
        id: 'wrong-class',
        severity: 'critical',
        message: `This fund is classified as ${LIQUIDITY_LABEL[fund.liquidity_class]}. Only balances classified Emergency Cash count toward the ${money0(primary)} target.`,
      });
    }
    if (balance > 0 && balance < stage1) {
      guardrails.push({
        id: 'below-stage1',
        severity: 'critical',
        message: `SoFi Emergency Cash is below the ${money0(stage1)} Stage 1 floor. Rebuild this before anything optional.`,
      });
    }
    if (status === 'replenishment_needed') {
      guardrails.push({
        id: 'replenish',
        severity: 'warning',
        message: `Replenishment Needed — add ${money0(replenishmentNeeded)} to get back to the ${money0(primary)} goal.`,
      });
    }
    for (const t of txns.filter((x) => x.direction === 'withdrawal')) {
      const flag = nonEmergencyFlag(`${t.reason || ''} ${t.category || ''} ${t.notes || ''}`);
      if (flag) {
        guardrails.push({
          id: `misuse-${t.id}`,
          severity: 'critical',
          message: `${t.txn_date}: this withdrawal looks like ${flag}, not a true emergency. Planned vacations, entertainment, subscriptions and routine expenses are not emergencies.`,
        });
      }
    }
    for (const f of ctx.investmentFunds || []) {
      if (f.liquidity_class === 'emergency_cash' && f.market_value > 0) {
        guardrails.push({
          id: `invest-as-cash-${f.name}`,
          severity: 'critical',
          message: `${f.name} holds ${money0(f.market_value)} of market value but is classified Emergency Cash. Investments are exposed to market volatility and must not count toward the emergency target.`,
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
        message: `${money0(bufferTransferred)} was swept out of Buffer into SoFi Emergency Cash, but the Buffer balance still appears to include it. Reduce the Buffer so the money is only counted once.`,
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
    gains,
    losses,
    ytdContributions,
    ytdWithdrawals,
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
    belowGoal: remainingToPrimary,
    lastWithdrawal,
    guardrails,
    trackedBalance,
    link,

  };
}

function money0(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export interface FundingPriority {
  order: number;
  label: string;
  detail: string;
  state: 'active' | 'done' | 'waiting';
}

/**
 * Priority ladder. Emergency floor first, then required debt, then core payroll
 * retirement + employer contributions, then high-interest vacation debt, then
 * freed cash into SoFi Emergency Cash up to $5,000, then stop and redirect.
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
      label: `Build SoFi Emergency Cash to ${money0(em.fund.stage1_target)}`,
      detail: stage1Done
        ? 'Stage 1 floor is in place.'
        : `${money0(em.remainingToStage1)} to go — fund this as quickly as reasonably possible.`,
      state: stage1Done ? 'done' : 'active',
    },
    {
      order: 2,
      label: 'Keep required debt payments running',
      detail: 'Minimums and settlement schedules are never paused to build cash.',
      state: 'active',
    },
    {
      order: 3,
      label: 'Keep core payroll retirement and employer contributions running',
      detail: 'Never give up matched or employer-funded money to build cash.',
      state: 'active',
    },
    {
      order: 4,
      label: 'Eliminate high-interest vacation debt and finish settlement obligations',
      detail: vacGone
        ? 'Vacation debt is cleared.'
        : `${money0(opts.vacationDebtBalance)} of vacation debt remaining.`,
      state: vacGone ? 'done' : stage1Done ? 'active' : 'waiting',
    },
    {
      order: 5,
      label: `Redirect freed debt payment into SoFi Emergency Cash up to ${money0(em.fund.primary_target)}`,
      detail: !vacGone
        ? `Waiting on vacation payoff — about ${money0(opts.freedMonthly)}/mo will be freed.`
        : funded
          ? 'Primary goal reached.'
          : `${money0(em.remainingToPrimary)} to go at ${money0(opts.freedMonthly)}/mo of freed cash.`,
      state: funded ? 'done' : vacGone ? 'active' : 'waiting',
    },
    {
      order: 6,
      label: 'At the goal, stop automatic contributions and redirect the surplus',
      detail: funded
        ? 'Surplus can go to SoFi Investments, the Vacation Fund, HSA, retirement or other goals — each transfer needs your approval.'
        : 'Kicks in once emergency cash is fully funded (unless it is used or your risk profile changes).',
      state: funded ? 'active' : 'waiting',
    },
  ];
}

export interface ExcessSplit {
  enabled: boolean;
  /** Cash floor that must remain untouched. */
  floor: number;
  excessMonthly: number;
  toInvestments: number;
  toOtherGoals: number;
  investmentsPct: number;
  otherPct: number;
  /** True when the floor is not yet protected, so nothing may be redirected. */
  blocked: boolean;
}

/**
 * Splits monthly excess savings once the emergency cash floor is protected.
 * Never moves money automatically — the UI requires explicit approval.
 */
export function excessSplit(
  em: ReserveSummary,
  excessMonthly: number,
): ExcessSplit {
  const f = em.fund;
  const invPct = Math.max(0, Math.min(100, Number(f.redirect_investments_pct || 0)));
  const otherPct = Math.max(0, 100 - invPct);
  const blocked = em.remainingToPrimary > 0;
  const usable = blocked ? 0 : Math.max(0, excessMonthly);

  return {
    enabled: !!f.redirect_excess_enabled,
    floor: Number(f.primary_target || 0),
    excessMonthly: r2(excessMonthly),
    toInvestments: r2((usable * invPct) / 100),
    toOtherGoals: r2((usable * otherPct) / 100),
    investmentsPct: invPct,
    otherPct,
    blocked,
  };
}
