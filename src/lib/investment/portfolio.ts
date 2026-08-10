/**
 * Montgomery Investment Wealth Operating System — portfolio hierarchy engine.
 *
 * Hierarchy:
 *   MONTGOMERY INVESTMENT PORTFOLIO
 *     RETIREMENT INVESTMENTS  -> recordkeeper (Fidelity / TIAA) -> account -> position
 *     SELF-DIRECTED INVESTMENTS -> brokerage (Stash / SoFi / Schwab) -> account -> holding
 *
 * Data-integrity rules enforced here:
 *  - Retirement and self-directed (taxable) money are never merged for tax,
 *    RMD, contribution-limit, Roth or capital-gains purposes.
 *  - Contributions are never counted as investment gain.
 *  - Transfers between investment accounts are never new wealth.
 *  - Missing asset-class data is reported as NOT YET CLASSIFIED, never guessed.
 */

import type { MonthPoint, RetirementAccountRow } from '@/lib/retirement/investmentTracker';

export const PORTFOLIO_BASELINE_DATE = '2026-08-07';

export const BASELINE_RETIREMENT_TOTAL = 181504.7;
export const BASELINE_SELF_DIRECTED_TOTAL = 2629.39;
export const BASELINE_INVESTMENT_TOTAL = 184113.61;

export const UNCLASSIFIED = 'NOT YET CLASSIFIED';
export const NOT_AVAILABLE = 'NOT AVAILABLE';

export type PortfolioClass = 'retirement' | 'self_directed';

export interface PortfolioAccount extends RetirementAccountRow {
  portfolio_class: PortfolioClass;
  custodian: string | null;
  plan_type: string | null;
  default_asset_class: string | null;
}

export interface PositionRow {
  id: string;
  account_id: string;
  name: string;
  ticker: string | null;
  asset_type: string;
  asset_class: string | null;
  quantity: number | null;
  average_cost: number | null;
  current_price: number | null;
  current_value: number;
  cost_basis: number | null;
  contributions: number;
  withdrawals: number;
  dividends: number;
  interest: number;
  monthly_contribution: number;
  purchased_at: string | null;
  reported_return: number | null;
  as_of_date: string | null;
  notes: string | null;
  sort_order: number;
}

export interface InvestmentGoalRow {
  id: string;
  scope: string;
  planned_monthly: number;
  annual_goal: number;
  allocation: Record<string, number>;
  notes: string | null;
}

export const ASSET_TYPES = [
  'Stock',
  'ETF',
  'Mutual Fund',
  'REIT',
  'Bond',
  'Cash',
  'Money Market',
  'Cryptocurrency',
  'Annuity / Traditional',
  'Other',
] as const;

export const ASSET_CLASSES = [
  'US Stocks',
  'International Stocks',
  'Bonds',
  'Real Estate',
  'Stable Value / Traditional',
  'Cash',
  'Other',
] as const;

/** Canonical account roster. Reconciled (never duplicated) on load. */
export interface CanonicalAccount {
  name: string;
  institution: string;
  custodian: string;
  portfolio_class: PortfolioClass;
  account_kind: string;
  plan_type: string | null;
  fund_name: string | null;
  ticker: string | null;
  balance: number;
  sort_order: number;
  default_asset_class: string | null;
}

export const CANONICAL_ACCOUNTS: CanonicalAccount[] = [
  {
    name: 'IU Retirement Plan',
    institution: 'Fidelity / IU',
    custodian: 'Fidelity / IU',
    portfolio_class: 'retirement',
    account_kind: 'employer_plan',
    plan_type: 'IU Retirement Plan',
    fund_name: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    balance: 139243.36,
    sort_order: 1,
    default_asset_class: null,
  },
  {
    name: 'IU TDA Plan',
    institution: 'Fidelity / IU',
    custodian: 'Fidelity / IU',
    portfolio_class: 'retirement',
    account_kind: 'tda',
    plan_type: 'TDA 403(b)',
    fund_name: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    balance: 17775.36,
    sort_order: 2,
    default_asset_class: null,
  },
  {
    name: 'IU 457(b) Supplemental',
    institution: 'Fidelity / IU',
    custodian: 'Fidelity / IU',
    portfolio_class: 'retirement',
    account_kind: '457b',
    plan_type: '457(b)',
    fund_name: 'Vanguard Target Retirement 2050 Fund',
    ticker: 'VFIFX',
    balance: 11951.75,
    sort_order: 3,
    default_asset_class: null,
  },
  {
    name: 'TIAA — IU Retirement Plan',
    institution: 'TIAA',
    custodian: 'TIAA',
    portfolio_class: 'retirement',
    account_kind: 'employer_plan',
    plan_type: 'IU Retirement Plan',
    fund_name: null,
    ticker: null,
    balance: 9914.8,
    sort_order: 4,
    default_asset_class: null,
  },
  {
    name: 'TIAA — IU TDA 403(b)',
    institution: 'TIAA',
    custodian: 'TIAA',
    portfolio_class: 'retirement',
    account_kind: 'tda',
    plan_type: 'TDA 403(b)',
    fund_name: null,
    ticker: null,
    balance: 1804.03,
    sort_order: 5,
    default_asset_class: null,
  },
  {
    name: 'TIAA — IU 457(b) Retirement Plan',
    institution: 'TIAA',
    custodian: 'TIAA',
    portfolio_class: 'retirement',
    account_kind: '457b',
    plan_type: '457(b)',
    fund_name: null,
    ticker: null,
    balance: 815.4,
    sort_order: 6,
    default_asset_class: null,
  },
  {
    name: 'Stash',
    institution: 'Stash',
    custodian: 'Stash',
    portfolio_class: 'self_directed',
    account_kind: 'taxable_brokerage',
    plan_type: 'Taxable brokerage',
    fund_name: null,
    ticker: null,
    balance: 1520.52,
    sort_order: 7,
    default_asset_class: null,
  },
  {
    name: 'SoFi Self-Directed',
    institution: 'SoFi',
    custodian: 'SoFi',
    portfolio_class: 'self_directed',
    account_kind: 'taxable_brokerage',
    plan_type: 'Taxable brokerage',
    fund_name: null,
    ticker: null,
    balance: 833.39,
    sort_order: 8,
    default_asset_class: null,
  },
  {
    name: 'Charles Schwab',
    institution: 'Charles Schwab',
    custodian: 'Charles Schwab',
    portfolio_class: 'self_directed',
    account_kind: 'taxable_brokerage',
    plan_type: 'Taxable brokerage',
    fund_name: null,
    ticker: null,
    balance: 275.48,
    sort_order: 9,
    default_asset_class: null,
  },
];

/** Known TIAA fund names. Added on request with $0 values — never auto-guessed. */
export const KNOWN_TIAA_FUNDS = [
  'CREF Global Equities R3',
  'CREF Core Bond R3',
  'CREF Inflation-Linked Bond R3',
  'CREF Responsible Balanced R3',
  'TIAA Real Estate',
  'TIAA Traditional',
  'CREF Total Global Stock',
  'CREF Growth',
];

export const RETIREMENT_MILESTONES = [
  200000, 250000, 500000, 750000, 1000000, 1500000, 2000000, 3000000, 4000000, 5000000,
];

/* ------------------------------------------------------------------ */
/* Grouping and totals                                                 */
/* ------------------------------------------------------------------ */

export function accountClass(a: Partial<PortfolioAccount>): PortfolioClass {
  return a.portfolio_class === 'self_directed' ? 'self_directed' : 'retirement';
}

export function custodianOf(a: Partial<PortfolioAccount>): string {
  return a.custodian || a.institution || 'Unassigned';
}

export function sumBalances(accounts: PortfolioAccount[]) {
  return accounts.reduce((s, a) => s + Number(a.current_balance || 0), 0);
}

export interface CustodianGroup {
  custodian: string;
  portfolioClass: PortfolioClass;
  total: number;
  accounts: PortfolioAccount[];
}

export function groupByCustodian(accounts: PortfolioAccount[]): CustodianGroup[] {
  const map = new Map<string, CustodianGroup>();
  for (const a of accounts) {
    const key = custodianOf(a);
    const g =
      map.get(key) ??
      ({ custodian: key, portfolioClass: accountClass(a), total: 0, accounts: [] } as CustodianGroup);
    g.total += Number(a.current_balance || 0);
    g.accounts.push(a);
    map.set(key, g);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function share(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

/* ------------------------------------------------------------------ */
/* Allocation views                                                    */
/* ------------------------------------------------------------------ */

export interface AllocationSlice {
  label: string;
  value: number;
  pct: number;
  unclassified?: boolean;
}

function toSlices(rows: Array<{ label: string; value: number; unclassified?: boolean }>): AllocationSlice[] {
  const total = rows.reduce((s, r) => s + r.value, 0);
  return rows
    .filter((r) => r.value !== 0)
    .sort((a, b) => b.value - a.value)
    .map((r) => ({ ...r, pct: share(r.value, total) }));
}

export function allocationByType(accounts: PortfolioAccount[]): AllocationSlice[] {
  const ret = sumBalances(accounts.filter((a) => accountClass(a) === 'retirement'));
  const sd = sumBalances(accounts.filter((a) => accountClass(a) === 'self_directed'));
  return toSlices([
    { label: 'Retirement', value: ret },
    { label: 'Self-Directed', value: sd },
  ]);
}

export function allocationByInstitution(accounts: PortfolioAccount[]): AllocationSlice[] {
  return toSlices(groupByCustodian(accounts).map((g) => ({ label: g.custodian, value: g.total })));
}

export function allocationByAccount(accounts: PortfolioAccount[]): AllocationSlice[] {
  return toSlices(accounts.map((a) => ({ label: a.name, value: Number(a.current_balance || 0) })));
}

/**
 * Asset-class view. Uses position-level asset_class when present, otherwise the
 * account default; anything unknown is reported as NOT YET CLASSIFIED.
 */
export function allocationByAssetClass(
  accounts: PortfolioAccount[],
  positions: PositionRow[],
): AllocationSlice[] {
  const buckets = new Map<string, number>();
  const add = (label: string, value: number) =>
    buckets.set(label, (buckets.get(label) ?? 0) + value);

  for (const a of accounts) {
    const balance = Number(a.current_balance || 0);
    const own = positions.filter((p) => p.account_id === a.id);
    const classified = own.filter((p) => !!p.asset_class && Number(p.current_value) !== 0);
    const classifiedValue = classified.reduce((s, p) => s + Number(p.current_value || 0), 0);

    for (const p of classified) add(p.asset_class as string, Number(p.current_value || 0));

    const remainder = balance - classifiedValue;
    if (Math.abs(remainder) > 0.005) {
      add(a.default_asset_class || UNCLASSIFIED, remainder);
    }
  }

  return toSlices(
    [...buckets.entries()].map(([label, value]) => ({
      label,
      value,
      unclassified: label === UNCLASSIFIED,
    })),
  );
}

/** WHAT I OWN / WHERE I OWN IT. */
export interface AssetLocationRow {
  assetClass: string;
  retirement: number;
  taxable: number;
  total: number;
}

export function assetLocation(
  accounts: PortfolioAccount[],
  positions: PositionRow[],
): AssetLocationRow[] {
  const map = new Map<string, AssetLocationRow>();
  const bump = (assetClass: string, cls: PortfolioClass, value: number) => {
    const row = map.get(assetClass) ?? { assetClass, retirement: 0, taxable: 0, total: 0 };
    if (cls === 'retirement') row.retirement += value;
    else row.taxable += value;
    row.total += value;
    map.set(assetClass, row);
  };

  for (const a of accounts) {
    const cls = accountClass(a);
    const balance = Number(a.current_balance || 0);
    const own = positions.filter((p) => p.account_id === a.id && !!p.asset_class && Number(p.current_value) !== 0);
    const classifiedValue = own.reduce((s, p) => s + Number(p.current_value || 0), 0);
    for (const p of own) bump(p.asset_class as string, cls, Number(p.current_value || 0));
    const remainder = balance - classifiedValue;
    if (Math.abs(remainder) > 0.005) bump(a.default_asset_class || UNCLASSIFIED, cls, remainder);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

/* ------------------------------------------------------------------ */
/* Holding math                                                        */
/* ------------------------------------------------------------------ */

export interface HoldingDerived {
  costBasis: number | null;
  gainDollars: number | null;
  gainPct: number | null;
}

export function deriveHolding(p: PositionRow): HoldingDerived {
  const basis =
    p.cost_basis != null
      ? Number(p.cost_basis)
      : p.quantity != null && p.average_cost != null
        ? Number(p.quantity) * Number(p.average_cost)
        : null;
  if (basis == null || basis === 0) return { costBasis: basis, gainDollars: null, gainPct: null };
  const gain = Number(p.current_value || 0) - basis;
  return { costBasis: basis, gainDollars: gain, gainPct: (gain / basis) * 100 };
}

/* ------------------------------------------------------------------ */
/* Snapshot + growth waterfall                                         */
/* ------------------------------------------------------------------ */

export interface WaterfallStep {
  label: string;
  value: number;
  kind: 'start' | 'add' | 'subtract' | 'end';
}

export function buildWaterfall(point: MonthPoint | undefined, beginning: number): WaterfallStep[] {
  const p = point;
  const employee = p?.employeeContributions ?? 0;
  const employer = p?.employerContributions ?? 0;
  const gain = p?.investmentGain ?? 0;
  const withdrawals = p?.withdrawals ?? 0;
  const fees = p?.fees ?? 0;
  const ending = p?.balance ?? beginning;

  return [
    { label: 'Beginning portfolio', value: beginning, kind: 'start' },
    { label: 'Employee contributions', value: employee, kind: 'add' },
    { label: 'Employer contributions', value: employer, kind: 'add' },
    { label: 'Investment gains', value: gain, kind: gain >= 0 ? 'add' : 'subtract' },
    { label: 'Withdrawals', value: withdrawals, kind: 'subtract' },
    { label: 'Fees', value: fees, kind: 'subtract' },
    { label: 'Ending portfolio', value: ending, kind: 'end' },
  ];
}

export function waterfallChartData(steps: WaterfallStep[]) {
  let running = 0;
  return steps.map((s) => {
    if (s.kind === 'start') {
      running = s.value;
      return { label: s.label, base: 0, delta: s.value, total: running, kind: s.kind };
    }
    if (s.kind === 'end') {
      return { label: s.label, base: 0, delta: s.value, total: s.value, kind: s.kind };
    }
    const signed = s.kind === 'subtract' ? -Math.abs(s.value) : s.value;
    const base = signed >= 0 ? running : running + signed;
    running += signed;
    return { label: s.label, base, delta: Math.abs(signed), total: running, kind: s.kind };
  });
}

/* ------------------------------------------------------------------ */
/* Self-directed goal tracking                                         */
/* ------------------------------------------------------------------ */

export interface SelfDirectedGoalStatus {
  plannedMonthly: number;
  actualMonthly: number;
  ytdInvested: number;
  annualGoal: number;
  difference: number;
  projectedYearEnd: number;
}

export function selfDirectedGoalStatus(
  goal: InvestmentGoalRow | null,
  monthContributions: number,
  ytdContributions: number,
  currentValue: number,
  monthsRemaining: number,
): SelfDirectedGoalStatus {
  const plannedMonthly = Number(goal?.planned_monthly ?? 0);
  const annualGoal = Number(goal?.annual_goal ?? plannedMonthly * 12);
  return {
    plannedMonthly,
    actualMonthly: monthContributions,
    ytdInvested: ytdContributions,
    annualGoal,
    difference: monthContributions - plannedMonthly,
    projectedYearEnd: currentValue + plannedMonthly * Math.max(0, monthsRemaining),
  };
}

/* ------------------------------------------------------------------ */
/* Return-measurement labels (never interchangeable)                   */
/* ------------------------------------------------------------------ */

export const RETURN_KINDS = [
  {
    key: 'personal',
    label: 'PERSONAL RETURN',
    detail: 'Reported by Fidelity or TIAA using your actual cash flows.',
  },
  {
    key: 'fund',
    label: 'FUND RETURN',
    detail: 'Performance of an investment such as VFIFX. Not your personal return.',
  },
  {
    key: 'portfolio',
    label: 'PORTFOLIO RETURN',
    detail: 'Estimated performance of the whole Montgomery investment portfolio.',
  },
] as const;
