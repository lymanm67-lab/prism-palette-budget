/**
 * Wealth Projection engine — pure, event-driven, month by month.
 *
 * Rules enforced here:
 *  - Every dollar has one job: one source, one destination, per month.
 *  - Core retirement/HSA contributions never stop because the buffer is low.
 *  - Only flexible (freed) cash runs the waterfall:
 *      freed cash -> buffer -> debt -> savings/other -> investing
 *  - Growth is applied to balances and never attributed to a funding source.
 *  - Debt principal reduction and loan payments are never investing.
 *  - Forgiven principal never becomes an asset, income or growth.
 *
 * No React, no data fetching. Callers normalise app data into plain objects.
 */
import { monthIndex, indexToMonth, monthLabel } from '@/lib/retirement/cashflowEngine';

export { monthIndex, indexToMonth, monthLabel };

/* --------------------------------- taxonomy -------------------------------- */

export type FundCategory =
  | 'starting_assets'
  | 'employee'
  | 'employer'
  | 'employee_hsa'
  | 'employer_hsa'
  | 'accelerator'
  | 'scheduled_increase'
  | 'raise'
  | 'tax_refund'
  | 'freed_cash'
  | 'released_debt'
  | 'other';

export const CATEGORY_LABELS: Record<FundCategory, string> = {
  starting_assets: 'Starting assets',
  employee: 'Employee retirement',
  employer: 'Employer retirement',
  employee_hsa: 'Employee HSA',
  employer_hsa: 'Employer HSA',
  accelerator: 'First Million Accelerator',
  scheduled_increase: 'Scheduled contribution increases',
  raise: 'Pay raise redirects',
  tax_refund: 'Tax refund redirects',
  freed_cash: 'Freed cash redirects',
  released_debt: 'Released debt payments',
  other: 'Other assigned money',
};

export const CATEGORY_ORDER: FundCategory[] = [
  'starting_assets',
  'employee',
  'employer',
  'employee_hsa',
  'employer_hsa',
  'accelerator',
  'scheduled_increase',
  'raise',
  'tax_refund',
  'freed_cash',
  'released_debt',
  'other',
];

export const CATEGORY_COLORS: Record<FundCategory, string> = {
  starting_assets: 'hsl(215 25% 55%)',
  employee: 'hsl(var(--primary))',
  employer: 'hsl(38 92% 55%)',
  employee_hsa: 'hsl(190 70% 45%)',
  employer_hsa: 'hsl(200 60% 62%)',
  accelerator: 'hsl(265 70% 62%)',
  scheduled_increase: 'hsl(285 60% 58%)',
  raise: 'hsl(320 60% 58%)',
  tax_refund: 'hsl(195 75% 50%)',
  freed_cash: 'hsl(160 60% 45%)',
  released_debt: 'hsl(0 70% 60%)',
  other: 'hsl(215 15% 45%)',
};

export type Confidence = 'confirmed' | 'planned' | 'estimated' | 'illustrative';

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  confirmed: 'Confirmed',
  planned: 'Planned',
  estimated: 'Estimated',
  illustrative: 'Illustrative',
};

export type Bucket = 'retirement' | 'hsa' | 'taxable';
export type FlowKind = 'core' | 'flexible';
export type Destination = Bucket | 'buffer' | 'debt' | 'savings' | 'other';

/* ---------------------------------- events --------------------------------- */

export interface WealthEvent {
  id: string;
  label: string;
  category: FundCategory;
  flow: FlowKind;
  status: Confidence;
  /** Monthly amount for `monthly`, per-deposit amount for `annual`/`once`. */
  amount: number;
  recurrence: 'monthly' | 'annual' | 'once';
  /** Calendar months (1-12) an `annual` deposit lands. */
  annualMonths?: number[];
  startMonth: string; // YYYY-MM
  endMonth?: string | null;
  reversalMonth?: string | null;
  reactivationMonth?: string | null;
  /** Core money lands here directly. Flexible money enters the pool. */
  bucket?: Bucket;
  enabled?: boolean;
  notes?: string;
}

/** A claim on the flexible pool that is not investing. */
export interface FlowAssignment {
  id: string;
  label: string;
  destination: 'buffer' | 'savings' | 'other';
  monthly: number;
  startMonth: string;
  endMonth?: string | null;
  /** Buffer only: stop once the running balance reaches this. */
  targetBalance?: number;
  status: Confidence;
  enabled?: boolean;
}

/** One-off deposits into the buffer that do not come from the monthly pool. */
export interface BufferInjection {
  id: string;
  label: string;
  month: string;
  amount: number;
  status: Confidence;
}

export interface DebtSchedule {
  id: string;
  label: string;
  balance: number;
  annualRatePct: number;
  payment: number;
  startMonth: string;
  /** Dated payment changes, e.g. +$100 from 2027-06. */
  extras?: { month: string; amount: number; label?: string }[];
  /** Estimated forgiveness month: balance and payment disappear, no asset created. */
  forgivenessMonth?: string | null;
  /** Where the released payment goes once the debt ends. */
  release?: { toDebtId?: string; amount: number; label?: string }[];
  status: Confidence;
  enabled?: boolean;
}

export interface StartingBalanceMeta {
  retirement: number;
  hsa: number;
  taxable: number;
  source: string;
  lastUpdated: string;
  status: Confidence;
  manualOverride: boolean;
}

export interface WealthAssumptions {
  startMonth: string;
  currentAge: number;
  returnPct: number;
  includeHsa: boolean;
  bufferTarget: number;
  bufferStartingBalance: number;
  starting: StartingBalanceMeta;
  /** Legacy fields kept so older callers keep compiling. */
  startingRetirement?: number;
  startingSelfDirected?: number;
  startingHsa?: number;
}

export const RETURN_OPTIONS = [5, 6, 7, 8, 9, 10] as const;
export const DEFAULT_RETURN_COMPARISON = [7, 8, 9, 10] as const;
export const HORIZONS = [10, 15, 20, 25, 30] as const;

export type StrategyKey = 'core' | 'planned' | 'max' | 'today';

export const STRATEGIES: { key: StrategyKey; label: string; blurb: string }[] = [
  {
    key: 'core',
    label: 'Confirmed Core',
    blurb: 'Payroll, employer money, HSA, accelerator, scheduled increases, raises and valid refund redirects only.',
  },
  {
    key: 'planned',
    label: 'Planned Strategy',
    blurb: 'Confirmed Core plus the freed cash left after the buffer, debts and savings are handled.',
  },
  {
    key: 'max',
    label: 'Maximum Redirect Capacity',
    blurb: 'Upper contribution capacity if nearly all freed cash were invested. Not the expected forecast.',
  },
  {
    key: 'today',
    label: "Today's Active Contributions",
    blurb: 'Diagnostic only: what is going in right now, with no future events.',
  },
];

export const DEFAULT_ASSUMPTIONS: WealthAssumptions = {
  startMonth: '2027-01',
  currentAge: 55,
  returnPct: 8,
  includeHsa: true,
  bufferTarget: 7000,
  bufferStartingBalance: 0,
  starting: {
    retirement: 181_504.70,
    hsa: 0,
    taxable: 2_608.91,
    source: 'Investment accounts (retirement + self-directed)',
    lastUpdated: '2026-09-01',
    status: 'confirmed',
    manualOverride: false,
  },
};

/* --------------------------------- helpers --------------------------------- */

export function monthlyRateFrom(annualPct: number): number {
  return Math.pow(1 + annualPct / 100, 1 / 12) - 1;
}

export function annualizedFreedCash(monthlyRunRate: number): number {
  return monthlyRunRate * 12;
}

/** The month a payment is available after a final payment date (YYYY-MM-DD or YYYY-MM). */
export function releaseMonthAfterFinalPayment(finalPaymentDate: string): string {
  return indexToMonth(monthIndex(finalPaymentDate.slice(0, 7)) + 1);
}

/** An explicit effective date is used as-is — no extra month. */
export function releaseMonthFromEffectiveDate(effectiveDate: string): string {
  return effectiveDate.slice(0, 7);
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function money2(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function activeAt(e: WealthEvent, idx: number): boolean {
  if (e.enabled === false) return false;
  if (idx < monthIndex(e.startMonth)) return false;
  if (e.endMonth && idx > monthIndex(e.endMonth)) return false;
  if (e.reversalMonth && idx >= monthIndex(e.reversalMonth)) {
    // reversed — unless it was reactivated later and reactivation resumes savings
    if (!e.reactivationMonth) return false;
    if (idx < monthIndex(e.reactivationMonth)) return false;
    return false; // a reactivated service means the saving stops for good
  }
  if (e.reactivationMonth && idx >= monthIndex(e.reactivationMonth)) return false;
  return true;
}

export function eventAmountAt(e: WealthEvent, month: string): number {
  const idx = monthIndex(month);
  if (!activeAt(e, idx)) return 0;
  if (e.recurrence === 'monthly') return e.amount;
  const cal = Number(month.split('-')[1]);
  if (e.recurrence === 'annual') return (e.annualMonths || []).includes(cal) ? e.amount : 0;
  return monthIndex(e.startMonth) === idx ? e.amount : 0;
}

/* ------------------------------- engine input ------------------------------ */

export interface FlowInput {
  events: WealthEvent[];
  assignments: FlowAssignment[];
  injections: BufferInjection[];
  debts: DebtSchedule[];
}

export interface MonthRow {
  month: string;
  label: string;
  beginning: number;
  beginningByBucket: Record<Bucket, number>;
  /** Core money by category. */
  core: Partial<Record<FundCategory, number>>;
  coreTotal: number;
  flexibleAvailable: number;
  flexibleByCategory: Partial<Record<FundCategory, number>>;
  bufferAllocation: number;
  bufferBalance: number;
  debtAllocation: number;
  debtByLoan: Record<string, number>;
  savingsAllocation: number;
  otherAllocation: number;
  netInvestableFreedCash: number;
  investedByBucket: Record<Bucket, number>;
  investedTotal: number;
  growth: number;
  ending: number;
  endingByBucket: Record<Bucket, number>;
  shortfall: number;
  releases: { label: string; amount: number }[];
  sourcesTotal: number;
  destinationsTotal: number;
  reconciliationDiff: number;
}

export interface SourceTotalRow {
  id: string;
  label: string;
  category: FundCategory;
  categoryLabel: string;
  status: Confidence;
  flow: FlowKind;
  effectiveMonth: string;
  monthlyNow: number;
  total: number;
  sharePct: number;
}

export interface YearRow {
  year: number;
  byCategory: Partial<Record<FundCategory, number>>;
  invested: number;
  growth: number;
  ending: number;
  months: MonthRow[];
}

export interface FlowResult {
  returnPct: number;
  months: MonthRow[];
  years: YearRow[];
  startingAssets: number;
  startingByBucket: Record<Bucket, number>;
  contributions: number;
  growth: number;
  ending: number;
  endingByBucket: Record<Bucket, number>;
  byCategory: Record<FundCategory, number>;
  bySource: SourceTotalRow[];
  monthCount: number;
  reconciliationErrors: { month: string; expected: number; actual: number; diff: number }[];
  eventsFired: Record<string, { firstMonth: string | null; total: number }>;
}

function emptyBuckets(): Record<Bucket, number> {
  return { retirement: 0, hsa: 0, taxable: 0 };
}

function emptyCategories(): Record<FundCategory, number> {
  return CATEGORY_ORDER.reduce((acc, c) => {
    acc[c] = 0;
    return acc;
  }, {} as Record<FundCategory, number>);
}

/* ---------------------------------- engine --------------------------------- */

export function runFlow(
  input: FlowInput,
  a: WealthAssumptions,
  returnPct = a.returnPct,
  months = 300,
): FlowResult {
  return runFlowInternal(input, a, returnPct, months);
}


/* ------------------------- the real month-by-month run --------------------- */

function runFlowInternal(
  input: FlowInput,
  a: WealthAssumptions,
  returnPct: number,
  months: number,
): FlowResult {
  const rate = monthlyRateFrom(returnPct);
  const startIdx = monthIndex(a.startMonth);
  /* Bridge growth: the balance was measured on `lastUpdated`, so grow it forward
     to the plan's start month at the same return assumption. */
  const asOfMonth = (a.starting.lastUpdated || a.startMonth).slice(0, 7);
  const bridgeMonths = Math.max(0, startIdx - monthIndex(asOfMonth));
  const bridgeFactor = Math.pow(1 + rate, bridgeMonths);
  const startingRawByBucket: Record<Bucket, number> = {
    retirement: a.starting.retirement,
    hsa: a.includeHsa ? a.starting.hsa : 0,
    taxable: a.starting.taxable,
  };
  const startingByBucket: Record<Bucket, number> = {
    retirement: startingRawByBucket.retirement * bridgeFactor,
    hsa: startingRawByBucket.hsa * bridgeFactor,
    taxable: startingRawByBucket.taxable * bridgeFactor,
  };
  const balances: Record<Bucket, number> = { ...startingByBucket };
  const startingAssets = balances.retirement + balances.hsa + balances.taxable;
  const startingAssetsAsOf =
    startingRawByBucket.retirement + startingRawByBucket.hsa + startingRawByBucket.taxable;
  const bridgeGrowth = startingAssets - startingAssetsAsOf;

  let bufferBalance = a.bufferStartingBalance;
  let contributions = 0;
  let growthTotal = 0;
  const byCategory = emptyCategories();
  byCategory.starting_assets = startingAssets;

  const bySourceTotals = new Map<string, number>();
  const eventsFired: Record<string, { firstMonth: string | null; total: number }> = {};

  const debtState = input.debts
    .filter((d) => d.enabled !== false)
    .map((d) => ({ def: d, balance: d.balance, closed: false }));
  const addedFromRelease = new Map<string, number>();
  const releasedByMonth = new Map<number, number>();

  const rows: MonthRow[] = [];
  const reconciliationErrors: FlowResult['reconciliationErrors'] = [];

  const activePayment = (d: { def: DebtSchedule }, idx: number) => {
    let p = d.def.payment;
    for (const ex of d.def.extras || []) {
      if (idx >= monthIndex(ex.month)) p += ex.amount;
    }
    p += addedFromRelease.get(d.def.id) || 0;
    return p;
  };

  const applyRelease = (
    d: { def: DebtSchedule },
    activeAmount: number,
    idx: number,
    releases: { label: string; amount: number }[],
  ) => {
    releases.push({ label: `${d.def.label} ended — ${money2(activeAmount)}/mo released`, amount: activeAmount });
    const splits = d.def.release?.length ? d.def.release : [{ amount: activeAmount }];
    let toDebt = 0;
    for (const s of splits) {
      if (s.toDebtId) {
        addedFromRelease.set(s.toDebtId, (addedFromRelease.get(s.toDebtId) || 0) + s.amount);
        toDebt += s.amount;
      }
    }
    const toPool = Math.max(0, activeAmount - toDebt);
    for (let k = idx + 1; k < startIdx + months; k++) {
      releasedByMonth.set(k, (releasedByMonth.get(k) || 0) + toPool);
    }
  };

  for (let i = 0; i < months; i++) {
    const idx = startIdx + i;
    const month = indexToMonth(idx);
    const beginningByBucket = { ...balances };
    const beginning = balances.retirement + balances.hsa + balances.taxable;

    const core: Partial<Record<FundCategory, number>> = {};
    let coreTotal = 0;
    const investedByBucket = emptyBuckets();

    for (const e of input.events) {
      if (e.flow !== 'core') continue;
      const amt = eventAmountAt(e, month);
      if (amt <= 0) continue;
      const bucket: Bucket = e.bucket ?? 'retirement';
      if (bucket === 'hsa' && !a.includeHsa) continue;
      core[e.category] = (core[e.category] || 0) + amt;
      investedByBucket[bucket] += amt;
      coreTotal += amt;
      byCategory[e.category] += amt;
      bySourceTotals.set(e.id, (bySourceTotals.get(e.id) || 0) + amt);
      const f = eventsFired[e.id] || { firstMonth: null, total: 0 };
      eventsFired[e.id] = { firstMonth: f.firstMonth ?? month, total: f.total + amt };
    }

    const flexibleByCategory: Partial<Record<FundCategory, number>> = {};
    let pool = 0;
    for (const e of input.events) {
      if (e.flow !== 'flexible') continue;
      const amt = eventAmountAt(e, month);
      if (amt <= 0) continue;
      flexibleByCategory[e.category] = (flexibleByCategory[e.category] || 0) + amt;
      pool += amt;
      bySourceTotals.set(e.id, (bySourceTotals.get(e.id) || 0) + amt);
      const f = eventsFired[e.id] || { firstMonth: null, total: 0 };
      eventsFired[e.id] = { firstMonth: f.firstMonth ?? month, total: f.total + amt };
    }

    const released = releasedByMonth.get(idx) || 0;
    if (released > 0) {
      flexibleByCategory.released_debt = (flexibleByCategory.released_debt || 0) + released;
      pool += released;
    }

    const flexibleAvailable = pool;
    const releases: { label: string; amount: number }[] = [];

    for (const inj of input.injections) {
      if (monthIndex(inj.month) !== idx) continue;
      const room = Math.max(0, a.bufferTarget - bufferBalance);
      bufferBalance += Math.min(room, inj.amount);
    }

    let bufferAllocation = 0;
    let savingsAllocation = 0;
    let otherAllocation = 0;

    for (const as of input.assignments) {
      if (as.enabled === false) continue;
      if (idx < monthIndex(as.startMonth)) continue;
      if (as.endMonth && idx > monthIndex(as.endMonth)) continue;
      if (as.monthly <= 0) continue;

      if (as.destination === 'buffer') {
        const target = as.targetBalance ?? a.bufferTarget;
        const room = Math.max(0, target - bufferBalance);
        if (room <= 0) continue;
        const send = Math.min(as.monthly, room, Math.max(0, pool));
        bufferBalance += send;
        bufferAllocation += send;
        pool -= send;
        if (send < as.monthly) {
          releases.push({
            label: `Buffer reached ${money(target)} — ${money2(as.monthly - send)}/mo released`,
            amount: as.monthly - send,
          });
        }
      } else {
        const send = Math.min(as.monthly, Math.max(0, pool));
        if (as.destination === 'savings') savingsAllocation += send;
        else otherAllocation += send;
        pool -= send;
      }
    }

    let debtAllocation = 0;
    const debtByLoan: Record<string, number> = {};

    for (const d of debtState) {
      if (d.closed) continue;
      if (idx < monthIndex(d.def.startMonth)) continue;

      if (d.def.forgivenessMonth && idx >= monthIndex(d.def.forgivenessMonth)) {
        const active = activePayment(d, idx);
        d.closed = true;
        d.balance = 0;
        applyRelease(d, active, idx, releases);
        continue;
      }

      const interest = (d.balance * (d.def.annualRatePct / 100)) / 12;
      d.balance += interest;
      const active = activePayment(d, idx);
      const pay = Math.min(active, Math.max(0, pool), d.balance);
      d.balance -= pay;
      pool -= pay;
      debtAllocation += pay;
      debtByLoan[d.def.id] = pay;

      if (d.balance <= 0.01) {
        d.balance = 0;
        d.closed = true;
        applyRelease(d, active, idx, releases);
      }
    }

    const netInvestableFreedCash = Math.max(0, pool);
    const shortfall = pool < 0 ? -pool : 0;
    if (netInvestableFreedCash > 0) investedByBucket.taxable += netInvestableFreedCash;

    if (netInvestableFreedCash > 0 && flexibleAvailable > 0) {
      const ratio = netInvestableFreedCash / flexibleAvailable;
      for (const [cat, amt] of Object.entries(flexibleByCategory)) {
        byCategory[cat as FundCategory] += (amt || 0) * ratio;
      }
    }

    const investedTotal =
      investedByBucket.retirement + investedByBucket.hsa + investedByBucket.taxable;

    let growth = 0;
    (Object.keys(balances) as Bucket[]).forEach((b) => {
      const g = balances[b] * rate;
      growth += g;
      balances[b] = balances[b] * (1 + rate) + investedByBucket[b];
    });

    contributions += investedTotal;
    growthTotal += growth;

    const ending = balances.retirement + balances.hsa + balances.taxable;
    const sourcesTotal = coreTotal + flexibleAvailable;
    const destinationsTotal =
      bufferAllocation + debtAllocation + savingsAllocation + otherAllocation + investedTotal;
    const diff = Number((sourcesTotal - destinationsTotal).toFixed(2));
    if (Math.abs(diff) > 0.05) {
      reconciliationErrors.push({ month, expected: sourcesTotal, actual: destinationsTotal, diff });
    }

    rows.push({
      month,
      label: monthLabel(month),
      beginning,
      beginningByBucket,
      core,
      coreTotal,
      flexibleAvailable,
      flexibleByCategory,
      bufferAllocation,
      bufferBalance,
      debtAllocation,
      debtByLoan,
      savingsAllocation,
      otherAllocation,
      netInvestableFreedCash,
      investedByBucket: { ...investedByBucket },
      investedTotal,
      growth,
      ending,
      endingByBucket: { ...balances },
      shortfall,
      releases,
      sourcesTotal,
      destinationsTotal,
      reconciliationDiff: diff,
    });
  }

  const years: YearRow[] = [];
  for (const r of rows) {
    const y = Number(r.month.split('-')[0]);
    let row = years.find((x) => x.year === y);
    if (!row) {
      row = { year: y, byCategory: {}, invested: 0, growth: 0, ending: 0, months: [] };
      years.push(row);
    }
    row.months.push(r);
    row.invested += r.investedTotal;
    row.growth += r.growth;
    row.ending = r.ending;
    for (const [c, amt] of Object.entries(r.core)) {
      row.byCategory[c as FundCategory] = (row.byCategory[c as FundCategory] || 0) + (amt || 0);
    }
    if (r.flexibleAvailable > 0 && r.netInvestableFreedCash > 0) {
      const ratio = r.netInvestableFreedCash / r.flexibleAvailable;
      for (const [c, amt] of Object.entries(r.flexibleByCategory)) {
        row.byCategory[c as FundCategory] =
          (row.byCategory[c as FundCategory] || 0) + (amt || 0) * ratio;
      }
    }
  }

  const ending = balances.retirement + balances.hsa + balances.taxable;
  const bySource: SourceTotalRow[] = input.events
    .filter((e) => (bySourceTotals.get(e.id) || 0) > 0)
    .map((e) => {
      const total = bySourceTotals.get(e.id) || 0;
      return {
        id: e.id,
        label: e.label,
        category: e.category,
        categoryLabel: CATEGORY_LABELS[e.category],
        status: e.status,
        flow: e.flow,
        effectiveMonth: e.startMonth,
        monthlyNow: e.recurrence === 'monthly' ? e.amount : 0,
        total,
        sharePct: contributions > 0 ? (total / contributions) * 100 : 0,
      };
    })
    .sort((x, y) => y.total - x.total);

  return {
    returnPct,
    months: rows,
    years,
    startingAssets,
    startingByBucket,
    contributions,
    growth: growthTotal,
    ending,
    endingByBucket: { ...balances },
    byCategory,
    bySource,
    monthCount: rows.length,
    reconciliationErrors,
    eventsFired,
  };
}

/* ------------------------------- strategies -------------------------------- */

export function applyStrategy(input: FlowInput, strategy: StrategyKey, startMonth: string): FlowInput {
  if (strategy === 'planned') return input;

  if (strategy === 'core') {
    return {
      ...input,
      events: input.events.filter((e) => e.flow === 'core'),
      assignments: [],
      debts: [],
    };
  }

  if (strategy === 'max') {
    // all freed cash invested: debts still get paid, buffer/savings assumed already handled
    return { ...input, assignments: [] };
  }

  // today: only what is already active in the start month, no future events
  const startIdx = monthIndex(startMonth);
  return {
    ...input,
    events: input.events
      .filter((e) => monthIndex(e.startMonth) <= startIdx)
      .map((e) => ({ ...e, endMonth: null, reversalMonth: null, reactivationMonth: null })),
    assignments: input.assignments.filter((as) => monthIndex(as.startMonth) <= startIdx),
    debts: input.debts,
  };
}

export interface ScenarioCell {
  years: number;
  months: number;
  ending: number;
  contributions: number;
  growth: number;
  byBucket: Record<Bucket, number>;
}

export function runScenarioGrid(
  input: FlowInput,
  a: WealthAssumptions,
  strategy: StrategyKey,
  returns: readonly number[] = DEFAULT_RETURN_COMPARISON,
  horizons: readonly number[] = HORIZONS,
): { returnPct: number; cells: ScenarioCell[] }[] {
  const scoped = applyStrategy(input, strategy, a.startMonth);
  return returns.map((r) => ({
    returnPct: r,
    cells: horizons.map((h) => {
      const res = runFlow(scoped, a, r, h * 12);
      return {
        years: h,
        months: res.monthCount,
        ending: res.ending,
        contributions: res.contributions,
        growth: res.growth,
        byBucket: res.endingByBucket,
      };
    }),
  }));
}

/* --------------------------- legacy compatibility -------------------------- */

export interface FundingSource {
  id: string;
  label: string;
  category: FundCategory;
  monthly: number;
  startMonth: string;
  endMonth?: string | null;
  enabled: boolean;
  notes?: string;
}

export interface SourceTotal {
  id: string;
  label: string;
  category: FundCategory;
  categoryLabel: string;
  monthlyNow: number;
  startMonth: string;
  total: number;
  sharePct: number;
}
