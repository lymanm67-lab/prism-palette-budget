/**
 * Retirement Investment Performance Tracker engine.
 *
 * Data-integrity rules enforced here:
 *  - Contributions are NEVER counted as investment return.
 *  - Transfers between retirement accounts are NEVER new wealth.
 *  - Calculated gains are labeled "Estimated Investment Gain" and are kept
 *    strictly separate from institution-reported personal rates of return.
 */

export interface RetirementAccountRow {
  id: string;
  household_id: string;
  name: string;
  institution: string | null;
  account_kind: string;
  fund_name: string | null;
  ticker: string | null;
  current_balance: number;
  baseline_balance: number;
  baseline_date: string | null;
  sort_order: number;
  notes: string | null;
}

export interface RetirementStatementRow {
  id: string;
  account_id: string;
  period_month: string; // YYYY-MM-01
  statement_date: string | null;
  beginning_balance: number;
  employee_contributions: number;
  employer_contributions: number;
  transfers_in: number;
  transfers_out: number;
  withdrawals: number;
  fees: number;
  ending_balance: number;
  reported_prr: number | null;
  ytd_return: number | null;
  one_year_return: number | null;
  three_year_return: number | null;
  five_year_return: number | null;
  ten_year_return: number | null;
  fund_name: string | null;
  ticker: string | null;
  statement_path: string | null;
  notes: string | null;
}

export interface FundReturnRow {
  id: string;
  label: string;
  ticker: string | null;
  as_of_date: string;
  ytd_return: number | null;
  one_year_return: number | null;
  three_year_return: number | null;
  five_year_return: number | null;
  ten_year_return: number | null;
  methodology_note: string | null;
}

export const BASELINE_DATE = '2026-08-07';
export const BASELINE_TOTAL = 181504.7;

export const RETURN_SCENARIOS = [
  { pct: 6, label: 'Conservative' },
  { pct: 7, label: 'Planning Baseline' },
  { pct: 8, label: 'Growth' },
  { pct: 9, label: 'Aggressive' },
  { pct: 10, label: 'Highly Aggressive' },
] as const;

export const MILESTONES = [
  200000, 250000, 500000, 750000, 1000000, 1500000, 2000000, 3000000, 4000000, 5000000,
];

export const SEED_ACCOUNTS = [
  {
    name: 'IU Retirement Plan',
    institution: 'Fidelity / IU',
    account_kind: 'employer_plan',
    fund_name: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    balance: 139243.36,
    sort_order: 1,
  },
  {
    name: 'IU TDA Plan',
    institution: 'Fidelity / IU',
    account_kind: 'tda',
    fund_name: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    balance: 17775.36,
    sort_order: 2,
  },
  {
    name: 'IU 457(b) Supplemental',
    institution: 'Fidelity / IU',
    account_kind: '457b',
    fund_name: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    balance: 11951.75,
    sort_order: 3,
  },
  {
    name: 'TIAA',
    institution: 'TIAA',
    account_kind: 'tiaa',
    fund_name: null,
    ticker: null,
    balance: 12534.23,
    sort_order: 4,
  },
];

export const SEED_FUND_RETURNS = [
  {
    label: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    as_of_date: '2026-08-01',
    ytd_return: 13.63,
    one_year_return: 20.71,
    three_year_return: 16.68,
    five_year_return: 9.59,
    ten_year_return: 11.41,
    methodology_note: 'Historical reference fund returns (July/August 2026). Past returns are not a forecast.',
  },
  {
    label: 'TIAA Personal Rate of Return',
    ticker: null,
    as_of_date: '2026-07-31',
    ytd_return: 8.6,
    one_year_return: 15.9,
    three_year_return: 10.6,
    five_year_return: 7.4,
    ten_year_return: null,
    methodology_note:
      'TIAA personal rates of return. These measurements may use different calculation methodologies than published fund returns.',
  },
];

/* ------------------------------------------------------------------ */
/* Per-statement derivation                                            */
/* ------------------------------------------------------------------ */

export interface StatementDerived {
  netContributions: number;
  employeeContributions: number;
  employerContributions: number;
  transfersNet: number;
  withdrawals: number;
  fees: number;
  /** Estimated Investment Gain — NOT an official personal rate of return. */
  estimatedInvestmentGain: number;
  balanceChange: number;
}

export function deriveStatement(s: RetirementStatementRow): StatementDerived {
  const netContributions =
    Number(s.employee_contributions) +
    Number(s.employer_contributions) +
    Number(s.transfers_in) -
    Number(s.transfers_out) -
    Number(s.withdrawals);

  const estimatedInvestmentGain =
    Number(s.ending_balance) - Number(s.beginning_balance) - netContributions + Number(s.fees);

  return {
    netContributions,
    employeeContributions: Number(s.employee_contributions),
    employerContributions: Number(s.employer_contributions),
    transfersNet: Number(s.transfers_in) - Number(s.transfers_out),
    withdrawals: Number(s.withdrawals),
    fees: Number(s.fees),
    estimatedInvestmentGain,
    balanceChange: Number(s.ending_balance) - Number(s.beginning_balance),
  };
}

/* ------------------------------------------------------------------ */
/* Portfolio timeline                                                  */
/* ------------------------------------------------------------------ */

export interface MonthPoint {
  month: string; // YYYY-MM
  label: string;
  balance: number;
  employeeContributions: number;
  employerContributions: number;
  contributions: number;
  investmentGain: number;
  fees: number;
  transfersNet: number;
  withdrawals: number;
  cumulativeContributions: number;
  cumulativeEmployer: number;
  cumulativeGain: number;
  accountCount: number;
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

export function buildTimeline(statements: RetirementStatementRow[]): MonthPoint[] {
  const byMonth = new Map<string, RetirementStatementRow[]>();
  for (const s of statements) {
    const key = String(s.period_month).slice(0, 7);
    const list = byMonth.get(key) ?? [];
    list.push(s);
    byMonth.set(key, list);
  }

  const months = [...byMonth.keys()].sort();
  let cumContrib = 0;
  let cumEmployer = 0;
  let cumGain = 0;

  return months.map((month) => {
    const rows = byMonth.get(month)!;
    let balance = 0;
    let ee = 0;
    let er = 0;
    let gain = 0;
    let fees = 0;
    let transfers = 0;
    let withdrawals = 0;

    for (const r of rows) {
      const d = deriveStatement(r);
      balance += Number(r.ending_balance);
      ee += d.employeeContributions;
      er += d.employerContributions;
      gain += d.estimatedInvestmentGain;
      fees += d.fees;
      transfers += d.transfersNet;
      withdrawals += d.withdrawals;
    }

    cumContrib += ee;
    cumEmployer += er;
    cumGain += gain;

    return {
      month,
      label: monthLabel(month),
      balance,
      employeeContributions: ee,
      employerContributions: er,
      contributions: ee + er,
      investmentGain: gain,
      fees,
      transfersNet: transfers,
      withdrawals,
      cumulativeContributions: cumContrib,
      cumulativeEmployer: cumEmployer,
      cumulativeGain: cumGain,
      accountCount: rows.length,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Where my wealth came from                                           */
/* ------------------------------------------------------------------ */

export interface WealthSources {
  startingPrincipal: number;
  employeeContributions: number;
  employerContributions: number;
  investmentGrowth: number;
  otherDeposits: number;
  withdrawals: number;
  portfolioValue: number;
  /** Annual growth exceeded annual personal contributions in this month key. */
  crossoverMonth: string | null;
}

export function wealthSources(
  timeline: MonthPoint[],
  startingPrincipal: number,
  currentPortfolio: number,
): WealthSources {
  const ee = timeline.reduce((s, m) => s + m.employeeContributions, 0);
  const er = timeline.reduce((s, m) => s + m.employerContributions, 0);
  const gain = timeline.reduce((s, m) => s + m.investmentGain, 0);
  const transfers = timeline.reduce((s, m) => s + m.transfersNet, 0);
  const wd = timeline.reduce((s, m) => s + m.withdrawals, 0);

  // Rolling trailing-12 comparison for the compounding crossover.
  let crossoverMonth: string | null = null;
  for (let i = 0; i < timeline.length; i++) {
    const window = timeline.slice(Math.max(0, i - 11), i + 1);
    const g = window.reduce((s, m) => s + m.investmentGain, 0);
    const c = window.reduce((s, m) => s + m.employeeContributions, 0);
    if (window.length >= 6 && g > c && c > 0) {
      crossoverMonth = timeline[i].month;
      break;
    }
  }

  return {
    startingPrincipal,
    employeeContributions: ee,
    employerContributions: er,
    investmentGrowth: gain,
    otherDeposits: transfers,
    withdrawals: wd,
    portfolioValue: currentPortfolio,
    crossoverMonth,
  };
}

/* ------------------------------------------------------------------ */
/* Projection engine                                                   */
/* ------------------------------------------------------------------ */

export interface ProjectionInputs {
  startingBalance: number;
  currentAge: number;
  targetAge: number;
  monthlyEmployee: number;
  monthlyEmployer: number;
  annualContributionIncreasePct: number;
  annualLumpSum: number;
  expectedReturnPct: number;
  inflationPct: number;
  startYear: number;
}

export interface ProjectionYear {
  year: number;
  age: number;
  beginningBalance: number;
  contributions: number;
  employerContributions: number;
  lumpSum: number;
  growth: number;
  endingBalance: number;
  realEndingBalance: number;
}

export function projectWealth(inputs: ProjectionInputs): ProjectionYear[] {
  const rows: ProjectionYear[] = [];
  const monthlyRate = inputs.expectedReturnPct / 100 / 12;
  let balance = inputs.startingBalance;
  let ee = inputs.monthlyEmployee;
  let er = inputs.monthlyEmployer;
  const years = Math.max(0, inputs.targetAge - inputs.currentAge);

  for (let y = 0; y < years; y++) {
    const beginning = balance;
    let growth = 0;
    for (let m = 0; m < 12; m++) {
      const g = balance * monthlyRate;
      growth += g;
      balance += g + ee + er;
    }
    if (inputs.annualLumpSum) balance += inputs.annualLumpSum;

    const year = inputs.startYear + y;
    const elapsed = y + 1;
    rows.push({
      year,
      age: inputs.currentAge + elapsed,
      beginningBalance: beginning,
      contributions: ee * 12,
      employerContributions: er * 12,
      lumpSum: inputs.annualLumpSum,
      growth,
      endingBalance: balance,
      realEndingBalance: balance / Math.pow(1 + inputs.inflationPct / 100, elapsed),
    });

    const bump = 1 + inputs.annualContributionIncreasePct / 100;
    ee *= bump;
    er *= bump;
  }

  return rows;
}

export interface MilestoneProjection {
  target: number;
  current: number;
  remaining: number;
  progressPct: number;
  reached: boolean;
  projectedYear: number | null;
  projectedAge: number | null;
  yearsRemaining: number | null;
}

export function projectMilestone(
  target: number,
  current: number,
  projection: ProjectionYear[],
  currentAge: number,
): MilestoneProjection {
  const reached = current >= target;
  const hit = projection.find((r) => r.endingBalance >= target);
  return {
    target,
    current,
    remaining: Math.max(0, target - current),
    progressPct: target > 0 ? Math.min(100, (current / target) * 100) : 0,
    reached,
    projectedYear: reached ? null : hit?.year ?? null,
    projectedAge: reached ? null : hit?.age ?? null,
    yearsRemaining: reached ? 0 : hit ? hit.age - currentAge : null,
  };
}

/** Monthly contribution needed to reach a target by a given number of years. */
export function requiredMonthlyContribution(
  target: number,
  startingBalance: number,
  years: number,
  annualReturnPct: number,
) {
  const n = Math.max(1, Math.round(years * 12));
  const r = annualReturnPct / 100 / 12;
  const fvExisting = startingBalance * Math.pow(1 + r, n);
  const gap = target - fvExisting;
  if (gap <= 0) return 0;
  if (r === 0) return gap / n;
  return gap / ((Math.pow(1 + r, n) - 1) / r);
}

/* ------------------------------------------------------------------ */
/* Plan status                                                         */
/* ------------------------------------------------------------------ */

export type PlanStatus = 'AHEAD OF PLAN' | 'ON TRACK' | 'WATCH' | 'BEHIND PLAN';

export function planStatus(actualReturnPct: number | null, planningReturnPct: number): PlanStatus {
  if (actualReturnPct == null) return 'ON TRACK';
  const diff = actualReturnPct - planningReturnPct;
  if (diff >= 1) return 'AHEAD OF PLAN';
  if (diff >= -0.5) return 'ON TRACK';
  if (diff >= -2) return 'WATCH';
  return 'BEHIND PLAN';
}

export const PLAN_STATUS_TONE: Record<PlanStatus, string> = {
  'AHEAD OF PLAN': 'text-emerald-500',
  'ON TRACK': 'text-emerald-500',
  WATCH: 'text-prism-amber',
  'BEHIND PLAN': 'text-destructive',
};

/* ------------------------------------------------------------------ */
/* Range filtering                                                     */
/* ------------------------------------------------------------------ */

export const RANGE_OPTIONS = [
  { key: '1m', label: '1M', months: 1 },
  { key: '3m', label: '3M', months: 3 },
  { key: '6m', label: '6M', months: 6 },
  { key: 'ytd', label: 'YTD', months: null },
  { key: '1y', label: '1Y', months: 12 },
  { key: '3y', label: '3Y', months: 36 },
  { key: '5y', label: '5Y', months: 60 },
  { key: '10y', label: '10Y', months: 120 },
  { key: 'all', label: 'All', months: Infinity },
] as const;

export type RangeKey = (typeof RANGE_OPTIONS)[number]['key'];

export function filterTimeline(timeline: MonthPoint[], range: RangeKey): MonthPoint[] {
  if (range === 'all') return timeline;
  if (range === 'ytd') {
    const year = new Date().getFullYear();
    return timeline.filter((m) => m.month.startsWith(String(year)));
  }
  const opt = RANGE_OPTIONS.find((o) => o.key === range);
  const months = opt?.months ?? Infinity;
  return timeline.slice(Math.max(0, timeline.length - (months as number)));
}

/* ------------------------------------------------------------------ */
/* Formatting helpers                                                  */
/* ------------------------------------------------------------------ */

export function money(n: number, decimals = 0) {
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function pct(n: number | null | undefined, decimals = 2) {
  if (n == null || Number.isNaN(n)) return '—';
  return `${n >= 0 ? '' : ''}${n.toFixed(decimals)}%`;
}

export function compactMoney(n: number) {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1000)}k`;
  return money(n);
}
