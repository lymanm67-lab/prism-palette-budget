/**
 * Freed Cash — "Savings Reality" layer.
 *
 * The one accounting rule this file exists to enforce:
 *
 *  - A cancellation or reduction is counted ONCE as new savings created.
 *  - It is counted REPEATEDLY, month after month, as realized savings.
 *  - It is counted ONCE as a forward run-rate estimate when projecting ahead.
 *
 * Forward annualized savings (run rate x 12) is NEVER added to realized savings,
 * and a future-dated source never counts as realized before its effective date.
 */

import {
  FreedCashRedirect,
  FreedCashSource,
  monthlySavings,
} from '@/hooks/use-freed-cash';
import { conversionMetrics, executedAmount } from './conversion';
import {
  computeTimingMetrics,
  earliestMonth,
  monthEnd,
  monthKey,
  monthLabel,
  monthRange,
  monthStart,
  netMonthly,
  realizedInMonth,
  runRateAtMonthEnd,
  savingsEndDate,
  savingsStartDate,
} from './timing';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Statuses whose savings are real enough to count in realized / run-rate math. */
const COUNTED = new Set(['confirmed', 'verified', 'historical', 'reversed']);
/** Statuses that can still be in the pipeline (not yet effective). */
const PIPELINE_STATUS = new Set(['pending', 'requested', 'confirmed', 'verified']);
const LIVE_REDIRECT = new Set(['planned', 'active']);

/* ------------------------------------------------------------- confidence view */

export type ConfidenceView = 'all' | 'verified' | 'reconciled' | 'estimated';

export const CONFIDENCE_VIEWS: { value: ConfidenceView; label: string; hint: string }[] = [
  { value: 'all', label: 'All', hint: 'Every logged saving, whatever its confidence level' },
  { value: 'verified', label: 'Verified only', hint: 'Confirmed by a bill, statement or account change' },
  { value: 'reconciled', label: 'Reconciled only', hint: 'Verified and matched against actual cash flow' },
  { value: 'estimated', label: 'Estimated', hint: 'Projected or user-entered savings, not yet confirmed' },
];

export function confidenceOf(s: FreedCashSource): 'estimated' | 'verified' | 'reconciled' {
  const c = s.confidence || 'estimated';
  return c === 'reconciled' ? 'reconciled' : c === 'verified' ? 'verified' : 'estimated';
}

/** Only Verified and Reconciled savings count as confirmed. */
export function isConfirmed(s: FreedCashSource): boolean {
  return confidenceOf(s) !== 'estimated';
}

export function filterByConfidence(sources: FreedCashSource[], view: ConfidenceView): FreedCashSource[] {
  if (view === 'all') return sources;
  if (view === 'estimated') return sources.filter((s) => confidenceOf(s) === 'estimated');
  if (view === 'reconciled') return sources.filter((s) => confidenceOf(s) === 'reconciled');
  return sources.filter((s) => isConfirmed(s));
}

/* ------------------------------------------------------------------- pipeline */

/** Savings with a future effective date — real, but not yet happening. */
export function pipelineSources(sources: FreedCashSource[], now = new Date()): FreedCashSource[] {
  return sources.filter((s) => {
    if (!PIPELINE_STATUS.has(s.status)) return false;
    const start = savingsStartDate(s);
    return !!start && start > now;
  });
}

export function pipelineMonthly(sources: FreedCashSource[], now = new Date()): number {
  return round2(pipelineSources(sources, now).reduce((sum, s) => sum + netMonthly(s), 0));
}

/** Pipeline still ahead of a given month (used by the month-by-month table). */
export function pipelineAfterMonth(sources: FreedCashSource[], key: string): number {
  const end = monthEnd(key);
  return round2(
    sources.reduce((sum, s) => {
      if (!PIPELINE_STATUS.has(s.status)) return sum;
      const start = savingsStartDate(s);
      return start && start > end ? sum + netMonthly(s) : sum;
    }, 0),
  );
}

/* ------------------------------------------------------- billing-cycle accuracy */

export interface BillingRealization {
  amount: number;
  /** True when no billing day was recorded, so the month is a prorated estimate. */
  estimated: boolean;
}

interface WithBilling {
  billing_day?: number | null;
  next_avoided_payment_date?: string | null;
}

/**
 * Realized savings for one month. When the original billing day is known, the
 * first partial month counts only if the avoided charge actually fell inside it.
 * Without a billing day we fall back to the prorated figure and flag it.
 */
export function realizedInMonthDetailed(s: FreedCashSource, key: string, now = new Date()): BillingRealization {
  const base = realizedInMonth(s, key);
  if (base <= 0) return { amount: 0, estimated: false };

  const start = savingsStartDate(s);
  const day = Number((s as FreedCashSource & WithBilling).billing_day || 0);
  const full = netMonthly(s);
  const isFirstMonth = !!start && monthKey(start) === key && start.getUTCDate() > 1;

  if (!isFirstMonth) return { amount: round2(base), estimated: false };
  if (!day || day < 1 || day > 31) return { amount: round2(base), estimated: true };

  // The charge on `day` was avoided only if it fell on or after the effective date.
  const avoided = day >= (start as Date).getUTCDate();
  return { amount: avoided ? round2(full) : 0, estimated: false };
}

/** Sum of billing-aware realized savings across a month range. */
export function realizedBetween(
  sources: FreedCashSource[],
  fromKey: string,
  toKey: string,
  now = new Date(),
): { amount: number; estimatedMonths: string[] } {
  let amount = 0;
  const estimatedMonths = new Set<string>();
  for (const key of monthRange(fromKey, toKey)) {
    for (const s of sources) {
      const r = realizedInMonthDetailed(s, key, now);
      amount += r.amount;
      if (r.estimated && r.amount > 0) estimatedMonths.add(key);
    }
  }
  return { amount: round2(amount), estimatedMonths: [...estimatedMonths] };
}

/* -------------------------------------------------------------- headline metrics */

export interface RealityMetrics {
  monthKey: string;
  /** Already happened */
  createdThisMonth: number;
  realizedThisMonth: number;
  realizedYtd: number;
  realizedLifetime: number;
  /** Happening now */
  runRate: number;
  forwardAnnualized: number;
  /** Still coming */
  pipelineMonthly: number;
  projectedRunRate: number;
  projectedAnnualized: number;
  /** Where it went */
  redirectedMonthly: number;
  assignedMonthly: number;
  needsJobMonthly: number;
  conversionRate: number;
  /** Confidence split of the current run rate */
  verifiedMonthly: number;
  reconciledMonthly: number;
  estimatedMonthly: number;
  /** True when any realized month relied on prorating instead of a billing date. */
  hasEstimatedMonths: boolean;
}

export function realityMetrics(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  now = new Date(),
): RealityMetrics {
  const key = monthKey(now);
  const timing = computeTimingMetrics(sources, `${now.getUTCFullYear()}-01`, key, now);
  const conv = conversionMetrics(sources, redirects);

  const ytd = realizedBetween(sources, `${now.getUTCFullYear()}-01`, key, now);
  const first = earliestMonth(sources);
  const lifetime = first ? realizedBetween(sources, first, key, now) : { amount: 0, estimatedMonths: [] };

  const pipeline = pipelineMonthly(sources, now);
  const runRate = timing.runRate;

  const activeNow = sources.filter((s) => {
    if (!COUNTED.has(s.status)) return false;
    const start = savingsStartDate(s);
    if (!start || start > now) return false;
    const end = savingsEndDate(s);
    return !end || end > now;
  });
  const byConfidence = (level: string) =>
    round2(activeNow.filter((s) => confidenceOf(s) === level).reduce((sum, s) => sum + netMonthly(s), 0));

  return {
    monthKey: key,
    createdThisMonth: timing.createdThisMonth,
    realizedThisMonth: timing.realizedThisMonth,
    realizedYtd: ytd.amount,
    realizedLifetime: lifetime.amount,
    runRate,
    forwardAnnualized: round2(runRate * 12),
    pipelineMonthly: pipeline,
    projectedRunRate: round2(runRate + pipeline),
    projectedAnnualized: round2((runRate + pipeline) * 12),
    redirectedMonthly: round2(conv.executedMonthly),
    assignedMonthly: round2(conv.assignedMonthly),
    needsJobMonthly: round2(Math.max(0, runRate - conv.executedMonthly)),
    conversionRate: runRate > 0 ? round2((conv.executedMonthly / runRate) * 100) : 0,
    verifiedMonthly: byConfidence('verified'),
    reconciledMonthly: byConfidence('reconciled'),
    estimatedMonthly: byConfidence('estimated'),
    hasEstimatedMonths: ytd.estimatedMonths.length > 0,
  };
}

/* ---------------------------------------------------------- future run rate line */

export interface RunRateEvent {
  date: string;
  label: string;
  sourceName: string;
  amount: number;
  direction: 'added' | 'lost';
  runRateAfter: number;
  annualizedAfter: number;
}

/** Upcoming additions (pipeline) and losses (expirations, resume dates). */
export function runRateTimeline(
  sources: FreedCashSource[],
  now = new Date(),
  monthsAhead = 18,
): { current: number; events: RunRateEvent[]; endingRunRate: number } {
  const current = round2(runRateAtMonthEnd(sources, monthKey(now)));
  const horizon = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + monthsAhead, 28));

  type Raw = { date: Date; name: string; amount: number; direction: 'added' | 'lost' };
  const raw: Raw[] = [];

  for (const s of pipelineSources(sources, now)) {
    const d = savingsStartDate(s)!;
    if (d <= horizon) raw.push({ date: d, name: s.name, amount: netMonthly(s), direction: 'added' });
  }

  for (const s of sources) {
    if (!COUNTED.has(s.status)) continue;
    const start = savingsStartDate(s);
    if (!start || start > now) continue;
    const end = savingsEndDate(s);
    if (end && end > now && end <= horizon) {
      raw.push({ date: end, name: s.name, amount: netMonthly(s), direction: 'lost' });
    }
  }

  raw.sort((a, b) => a.date.getTime() - b.date.getTime());

  let running = current;
  const events: RunRateEvent[] = raw.map((r) => {
    running = round2(running + (r.direction === 'added' ? r.amount : -r.amount));
    return {
      date: r.date.toISOString().slice(0, 10),
      label: r.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }),
      sourceName: r.name,
      amount: round2(r.amount),
      direction: r.direction,
      runRateAfter: running,
      annualizedAfter: round2(running * 12),
    };
  });

  return { current, events, endingRunRate: running };
}

/* ------------------------------------------------------- source-level realized */

export interface SourceRealizedRow {
  id: string;
  name: string;
  vendor: string | null;
  scope: string;
  monthly: number;
  effectiveDate: string;
  realizedYtd: number;
  realizedLifetime: number;
  annualizedValue: number;
  isPipeline: boolean;
  redirected: number;
  confidence: 'estimated' | 'verified' | 'reconciled';
  estimatedMonths: boolean;
}

export function sourceRealizedRows(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  now = new Date(),
): SourceRealizedRow[] {
  const key = monthKey(now);
  const yearStart = `${now.getUTCFullYear()}-01`;
  const live = redirects.filter((r) => LIVE_REDIRECT.has(r.status));

  return sources
    .map((s) => {
      const start = savingsStartDate(s);
      const isPipeline = !!start && start > now;
      const ytd = isPipeline ? { amount: 0, estimatedMonths: [] } : realizedBetween([s], yearStart, key, now);
      const firstMonth = start ? monthKey(start) : key;
      const lifetime = isPipeline
        ? { amount: 0, estimatedMonths: [] }
        : realizedBetween([s], firstMonth <= key ? firstMonth : key, key, now);
      const monthly = netMonthly(s);

      return {
        id: s.id,
        name: s.name,
        vendor: s.vendor,
        scope: s.entity_scope,
        monthly: round2(monthly),
        effectiveDate: s.effective_date,
        realizedYtd: ytd.amount,
        realizedLifetime: lifetime.amount,
        annualizedValue: round2(monthly * 12),
        isPipeline,
        redirected: round2(
          live.filter((r) => r.source_id === s.id).reduce((sum, r) => sum + executedAmount(r), 0),
        ),
        confidence: confidenceOf(s),
        estimatedMonths: ytd.estimatedMonths.length > 0,
      };
    })
    .sort((a, b) => b.monthly - a.monthly);
}

/* ------------------------------------------------------------ double-count guard */

export interface OverlapWarning {
  key: string;
  label: string;
  sourceNames: string[];
  claimedMonthly: number;
  largestOriginal: number;
  overlap: number;
}

/**
 * Two reductions logged against the same original expense (e.g. $888 -> $583 and
 * later $583 -> $0) must never total more than the original payment eliminated.
 */
export function overlapWarnings(sources: FreedCashSource[]): OverlapWarning[] {
  const groups = new Map<string, FreedCashSource[]>();
  for (const s of sources) {
    if (s.status === 'reversed') continue;
    const k = (s.vendor || s.name || '').trim().toLowerCase();
    if (!k) continue;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }

  const out: OverlapWarning[] = [];
  for (const [k, rows] of groups) {
    if (rows.length < 2) continue;
    const claimed = round2(rows.reduce((sum, s) => sum + monthlySavings(s), 0));
    const largestOriginal = round2(
      Math.max(...rows.map((s) => monthlySavings({ ...s, new_amount: 0, added_fees: 0 } as FreedCashSource))),
    );
    if (claimed > largestOriginal + 0.01) {
      out.push({
        key: k,
        label: rows[0].vendor || rows[0].name,
        sourceNames: rows.map((s) => s.name),
        claimedMonthly: claimed,
        largestOriginal,
        overlap: round2(claimed - largestOriginal),
      });
    }
  }
  return out.sort((a, b) => b.overlap - a.overlap);
}

/* --------------------------------------------------------------- savings story */

export function savingsStory(year: number, realizedInYear: number, runRate: number, pipeline: number): string {
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  const parts = [
    `You reduced recurring expenses during ${year}, but those savings became effective at different times, so your realized ${year} savings is lower than your full-year forward savings rate.`,
    `Your current monthly savings run rate is ${fmt(runRate)} per month.`,
    `Your realized savings during ${year} is ${fmt(realizedInYear)}.`,
    `If those savings stay in place for a full 12 months, they are projected to reduce spending by ${fmt(runRate * 12)}.`,
  ];
  if (pipeline > 0.01) {
    parts.push(
      `A further ${fmt(pipeline)} per month is already in the pipeline, which would take the run rate to ${fmt(
        runRate + pipeline,
      )} per month, or ${fmt((runRate + pipeline) * 12)} a year, once it becomes effective.`,
    );
  }
  return parts.join(' ');
}

/* ---------------------------------------------- what if I never cut these costs */

export interface NeverCutView {
  originalMonthlySpend: number;
  currentMonthlySpend: number;
  realizedThisYear: number;
  nextYearProjected: number;
  fiveYearAvoided: number;
  tenYearAvoided: number;
}

export function neverCutView(sources: FreedCashSource[], now = new Date()): NeverCutView {
  const key = monthKey(now);
  const yearStart = `${now.getUTCFullYear()}-01`;
  const active = sources.filter((s) => {
    if (!COUNTED.has(s.status)) return false;
    const start = savingsStartDate(s);
    if (!start || start > now) return false;
    const end = savingsEndDate(s);
    return !end || end > now;
  });

  const original = round2(
    active.reduce(
      (sum, s) => sum + monthlySavings({ ...s, new_amount: 0, added_fees: 0 } as FreedCashSource),
      0,
    ),
  );
  const runRate = round2(active.reduce((sum, s) => sum + netMonthly(s), 0));

  return {
    originalMonthlySpend: original,
    currentMonthlySpend: round2(Math.max(0, original - runRate)),
    realizedThisYear: realizedBetween(sources, yearStart, key, now).amount,
    nextYearProjected: round2(runRate * 12),
    fiveYearAvoided: round2(runRate * 60),
    tenYearAvoided: round2(runRate * 120),
  };
}

/* --------------------------------------------------- wealth potential calculator */

export interface WealthInputs {
  monthly: number;
  years: number;
  annualReturn: number;
  annualIncrease: number;
  includeDebtPayoffs: boolean;
  debtPayoffMonthly: number;
  includeRaises: boolean;
  raiseMonthly: number;
  includeTaxRefunds: boolean;
  taxRefundAnnual: number;
}

export interface WealthResult {
  contributions: number;
  growth: number;
  ending: number;
  monthlyStart: number;
  monthlyEnd: number;
  points: { year: number; contributions: number; balance: number }[];
}

export function wealthProjection(input: WealthInputs): WealthResult {
  const months = Math.max(0, Math.round(input.years * 12));
  const r = input.annualReturn / 100 / 12;
  let monthly =
    input.monthly +
    (input.includeDebtPayoffs ? input.debtPayoffMonthly : 0) +
    (input.includeRaises ? input.raiseMonthly : 0);

  let balance = 0;
  let contributions = 0;
  const points: WealthResult['points'] = [];
  const monthlyStart = monthly;

  for (let m = 1; m <= months; m++) {
    balance = balance * (1 + r) + monthly;
    contributions += monthly;
    if (input.includeTaxRefunds && m % 12 === 4) {
      balance += input.taxRefundAnnual;
      contributions += input.taxRefundAnnual;
    }
    if (m % 12 === 0) {
      points.push({ year: m / 12, contributions: round2(contributions), balance: round2(balance) });
      monthly = monthly * (1 + input.annualIncrease / 100);
    }
  }

  return {
    contributions: round2(contributions),
    growth: round2(balance - contributions),
    ending: round2(balance),
    monthlyStart: round2(monthlyStart),
    monthlyEnd: round2(monthly),
    points,
  };
}

/* --------------------------------------------------------------------- leakage */

export interface LeakageView {
  monthKey: string;
  monthClosed: boolean;
  realized: number;
  redirected: number;
  guiltFree: number;
  unaccounted: number;
}

/**
 * Unallocated money only becomes leakage after the month closes with no
 * destination assigned. Intentional guilt-free spending is subtracted first.
 */
export function leakageView(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  key: string,
  now = new Date(),
): LeakageView {
  const realized = round2(sources.reduce((sum, s) => sum + realizedInMonthDetailed(s, key, now).amount, 0));
  const live = redirects.filter((r) => LIVE_REDIRECT.has(r.status));
  const redirected = round2(live.reduce((sum, r) => sum + executedAmount(r), 0));
  const guiltFree = round2(
    live
      .filter((r) => r.destination_type === 'guilt_free')
      .reduce((sum, r) => sum + Number(r.monthly_amount || 0), 0),
  );
  const monthClosed = monthEnd(key) < now && key < monthKey(now);

  return {
    monthKey: key,
    monthClosed,
    realized,
    redirected,
    guiltFree,
    unaccounted: monthClosed ? round2(Math.max(0, realized - redirected - guiltFree)) : 0,
  };
}

export { monthLabel, monthStart };
