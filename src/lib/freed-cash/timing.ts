/**
 * Freed Cash — savings TIMING engine.
 *
 * Accounting rule enforced here:
 *  - A cancellation is counted ONCE when measuring new savings created (in the month
 *    its savings became effective).
 *  - It is counted REPEATEDLY over time when measuring realized savings.
 *  - It is counted ONCE as an annualized run-rate estimate when projecting future
 *    avoided spending.
 *
 * Nothing in here mutates or replaces the existing capture-rate / redirect logic;
 * redirecting freed cash never creates a second savings event.
 */

import { FreedCashRedirect, FreedCashSource, monthlySavings } from '@/hooks/use-freed-cash';

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Statuses whose savings are real enough to count in realized / run-rate math. */
const COUNTED = new Set(['confirmed', 'verified', 'historical', 'reversed']);

export function monthKey(d: Date | string): string {
  const s = typeof d === 'string' ? d : d.toISOString();
  return s.slice(0, 7);
}

export function monthStart(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1));
}

export function monthEnd(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0));
}

export function daysInMonth(key: string): number {
  return monthEnd(key).getUTCDate();
}

export function monthLabel(key: string): string {
  return monthStart(key).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Inclusive list of month keys between two month keys. */
export function monthRange(fromKey: string, toKey: string): string[] {
  const out: string[] = [];
  let cur = fromKey;
  let guard = 0;
  while (cur <= toKey && guard++ < 600) {
    out.push(cur);
    const d = monthStart(cur);
    d.setUTCMonth(d.getUTCMonth() + 1);
    cur = monthKey(d);
  }
  return out;
}

/**
 * The date savings actually START. Uses the Actual Savings Effective Date, never the
 * cancellation request date. Service paid through month end ⇒ effective_date should
 * already be the 1st of the following month.
 */
export function savingsStartDate(s: FreedCashSource): Date | null {
  if (!s.effective_date) return null;
  return new Date(`${s.effective_date.slice(0, 10)}T00:00:00Z`);
}

/**
 * The date savings STOP (reactivation / reversal / pause ending). Historical realized
 * savings before this date are preserved.
 */
export function savingsEndDate(s: FreedCashSource): Date | null {
  const candidates: Date[] = [];
  if (s.status === 'reversed') {
    const d = s.statement_checked_date || s.verified_at || s.effective_date;
    if (d) candidates.push(new Date(`${d.slice(0, 10)}T00:00:00Z`));
  }
  if (s.is_temporary && s.resume_date) candidates.push(new Date(`${s.resume_date.slice(0, 10)}T00:00:00Z`));
  // Promotional rates / temporary discounts stop counting after their expiration date.
  if (s.expires_on) candidates.push(new Date(`${s.expires_on.slice(0, 10)}T00:00:00Z`));
  if (candidates.length === 0) return null;
  return new Date(Math.min(...candidates.map((d) => d.getTime())));
}


function counts(s: FreedCashSource): boolean {
  return COUNTED.has(s.status);
}

/** Net monthly savings after replacement cost and added fees (existing logic reused). */
export function netMonthly(s: FreedCashSource): number {
  return monthlySavings(s);
}

/** Prorated savings this source actually delivered during a calendar month. */
export function realizedInMonth(s: FreedCashSource, key: string): number {
  if (!counts(s)) return 0;
  const start = savingsStartDate(s);
  if (!start) return 0;
  const end = savingsEndDate(s);
  const mStart = monthStart(key);
  const mEnd = monthEnd(key);
  if (start > mEnd) return 0;
  if (end && end <= mStart) return 0;

  const dim = daysInMonth(key);
  const firstDay = start > mStart ? start.getUTCDate() : 1;
  const lastDay = end && end <= mEnd ? Math.max(firstDay - 1, end.getUTCDate() - 1) : dim;
  const activeDays = Math.max(0, lastDay - firstDay + 1);
  return (netMonthly(s) * activeDays) / dim;
}

/** Recurring monthly savings still in force at the end of a given month. */
export function runRateAtMonthEnd(sources: FreedCashSource[], key: string): number {
  const mEnd = monthEnd(key);
  return sources.reduce((sum, s) => {
    if (!counts(s)) return sum;
    const start = savingsStartDate(s);
    if (!start || start > mEnd) return sum;
    const end = savingsEndDate(s);
    if (end && end <= mEnd) return sum;
    return sum + netMonthly(s);
  }, 0);
}

/** New recurring savings whose effective date falls inside this month. */
export function createdInMonth(sources: FreedCashSource[], key: string) {
  const rows = sources.filter((s) => counts(s) && s.effective_date?.slice(0, 7) === key);
  return {
    sources: rows,
    monthly: rows.reduce((sum, s) => sum + netMonthly(s), 0),
    cancellations: rows.filter((s) => s.source_type === 'cancellation').length,
    reductions: rows.filter((s) => s.source_type !== 'cancellation').length,
  };
}

export interface MonthlySavingsRow {
  month: string;
  label: string;
  newCancellations: number;
  newReductions: number;
  createdMonthly: number;
  realizedThisMonth: number;
  runRateAtEnd: number;
  cumulativeRealized: number;
  avoidedAnnualAtEnd: number;
}

/** Earliest month with any counted savings. */
export function earliestMonth(sources: FreedCashSource[]): string | null {
  const dates = sources
    .filter((s) => counts(s) && s.effective_date)
    .map((s) => s.effective_date.slice(0, 7))
    .sort();
  return dates[0] ?? null;
}

/**
 * Month-by-month history. `cumulativeRealized` always counts from the very first
 * effective date so it is never confused with one month's savings.
 */
export function buildMonthlyHistory(
  sources: FreedCashSource[],
  fromKey: string,
  toKey: string,
): MonthlySavingsRow[] {
  const first = earliestMonth(sources) ?? fromKey;
  const allMonths = monthRange(first <= fromKey ? first : fromKey, toKey);
  let cumulative = 0;
  const rows: MonthlySavingsRow[] = [];

  for (const key of allMonths) {
    const created = createdInMonth(sources, key);
    const realized = sources.reduce((sum, s) => sum + realizedInMonth(s, key), 0);
    cumulative += realized;
    const runRate = runRateAtMonthEnd(sources, key);
    rows.push({
      month: key,
      label: monthLabel(key),
      newCancellations: created.cancellations,
      newReductions: created.reductions,
      createdMonthly: round2(created.monthly),
      realizedThisMonth: round2(realized),
      runRateAtEnd: round2(runRate),
      cumulativeRealized: round2(cumulative),
      avoidedAnnualAtEnd: round2(runRate * 12),
    });
  }

  return rows.filter((r) => r.month >= fromKey);
}

export interface TimingMetrics {
  /** Historical */
  createdThisMonth: number;
  realizedThisMonth: number;
  ytdRealized: number;
  cumulativeRealized: number;
  periodRealized: number;
  periodMonths: number;
  averageMonthlyRealized: number;
  /** Forward-looking */
  runRate: number;
  avoidedAnnual: number;
  /** Supporting */
  monthKey: string;
  rows: MonthlySavingsRow[];
}

export function computeTimingMetrics(
  sources: FreedCashSource[],
  fromKey: string,
  toKey: string,
  now = new Date(),
): TimingMetrics {
  const current = monthKey(now);
  const rows = buildMonthlyHistory(sources, fromKey, toKey);
  const periodRealized = rows.reduce((sum, r) => sum + r.realizedThisMonth, 0);
  const periodMonths = Math.max(1, rows.length);

  const yearStart = `${toKey.slice(0, 4)}-01`;
  const ytdRealized = monthRange(yearStart, toKey).reduce(
    (sum, key) => sum + sources.reduce((s, src) => s + realizedInMonth(src, key), 0),
    0,
  );

  const first = earliestMonth(sources);
  const cumulativeRealized = first
    ? monthRange(first, toKey).reduce(
        (sum, key) => sum + sources.reduce((s, src) => s + realizedInMonth(src, key), 0),
        0,
      )
    : 0;

  const runRate = runRateAtMonthEnd(sources, toKey);

  return {
    createdThisMonth: round2(createdInMonth(sources, toKey).monthly),
    realizedThisMonth: round2(sources.reduce((sum, s) => sum + realizedInMonth(s, toKey), 0)),
    ytdRealized: round2(ytdRealized),
    cumulativeRealized: round2(cumulativeRealized),
    periodRealized: round2(periodRealized),
    periodMonths,
    averageMonthlyRealized: round2(periodRealized / periodMonths),
    runRate: round2(runRate),
    avoidedAnnual: round2(runRate * 12),
    monthKey: toKey <= current ? toKey : current,
    rows,
  };
}

/* --------------------------------------------------- "What if I never canceled?" */

export interface NeverCanceledReport {
  fromKey: string;
  toKey: string;
  months: number;
  /** What the still-paid portion of these expenses actually cost over the period. */
  actualRecurringSpend: number;
  /** What they would have cost if nothing had been canceled or reduced. */
  hypotheticalSpend: number;
  difference: number;
  realizedSavings: number;
  projectedAvoidedNext12: number;
}

export function neverCanceledReport(
  sources: FreedCashSource[],
  fromKey: string,
  toKey: string,
): NeverCanceledReport {
  const months = monthRange(fromKey, toKey);
  let actual = 0;
  let hypothetical = 0;
  let realized = 0;

  for (const key of months) {
    for (const s of sources) {
      if (!counts(s)) continue;
      const start = savingsStartDate(s);
      if (!start || start > monthEnd(key)) continue;
      const r = realizedInMonth(s, key);
      realized += r;
      const gross = monthlySavings({ ...s, new_amount: 0, added_fees: 0 } as FreedCashSource);
      const originalMonthly = gross;
      hypothetical += originalMonthly;
      actual += Math.max(0, originalMonthly - r);
    }
  }

  const runRate = runRateAtMonthEnd(sources, toKey);
  return {
    fromKey,
    toKey,
    months: months.length,
    actualRecurringSpend: round2(actual),
    hypotheticalSpend: round2(hypothetical),
    difference: round2(hypothetical - actual),
    realizedSavings: round2(realized),
    projectedAvoidedNext12: round2(runRate * 12),
  };
}

/* ---------------------------------------------------------- year-end report */

export interface YearEndReport {
  year: number;
  cancellations: number;
  reductions: number
  ;
  byMonth: MonthlySavingsRow[];
  totalRealized: number;
  averageMonthlyRealized: number;
  yearEndRunRate: number;
  avoidedAnnualAtYearEnd: number;
  redirectedByDestination: { destination: string; monthly: number }[];
  redirectedMonthly: number;
  unallocatedMonthly: number;
}

export function yearEndReport(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  year: number,
): YearEndReport {
  const from = `${year}-01`;
  const to = `${year}-12`;
  const rows = buildMonthlyHistory(sources, from, to);
  const created = sources.filter((s) => counts(s) && s.effective_date?.slice(0, 4) === String(year));
  const totalRealized = rows.reduce((sum, r) => sum + r.realizedThisMonth, 0);
  const activeMonths = rows.filter((r) => r.realizedThisMonth > 0).length || 1;
  const yearEndRunRate = runRateAtMonthEnd(sources, to);

  const live = redirects.filter((r) => r.status === 'planned' || r.status === 'active');
  const byDest = new Map<string, number>();
  for (const r of live) {
    byDest.set(r.destination_type, (byDest.get(r.destination_type) ?? 0) + Number(r.monthly_amount));
  }
  const redirectedMonthly = live.reduce((sum, r) => sum + Number(r.monthly_amount), 0);

  return {
    year,
    cancellations: created.filter((s) => s.source_type === 'cancellation').length,
    reductions: created.filter((s) => s.source_type !== 'cancellation').length,
    byMonth: rows,
    totalRealized: round2(totalRealized),
    averageMonthlyRealized: round2(totalRealized / activeMonths),
    yearEndRunRate: round2(yearEndRunRate),
    avoidedAnnualAtYearEnd: round2(yearEndRunRate * 12),
    redirectedByDestination: [...byDest.entries()].map(([destination, monthly]) => ({
      destination,
      monthly: round2(monthly),
    })),
    redirectedMonthly: round2(redirectedMonthly),
    unallocatedMonthly: round2(Math.max(0, yearEndRunRate - redirectedMonthly)),
  };
}

/* ------------------------------------------------------------ report periods */

export type PeriodPreset = 'current' | 'ytd' | 'last3' | 'last6' | 'last12' | 'custom';

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: 'current', label: 'Current month' },
  { value: 'ytd', label: 'Year to date' },
  { value: 'last3', label: 'Last 3 months' },
  { value: 'last6', label: 'Last 6 months' },
  { value: 'last12', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

export function presetRange(preset: PeriodPreset, now = new Date()): { fromKey: string; toKey: string } {
  const toKey = monthKey(now);
  if (preset === 'current') return { fromKey: toKey, toKey };
  if (preset === 'ytd') return { fromKey: `${now.getUTCFullYear()}-01`, toKey };
  const back = preset === 'last3' ? 2 : preset === 'last6' ? 5 : 11;
  const d = monthStart(toKey);
  d.setUTCMonth(d.getUTCMonth() - back);
  return { fromKey: monthKey(d), toKey };
}
