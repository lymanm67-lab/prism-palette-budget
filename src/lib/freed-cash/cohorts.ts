/**
 * Freed Cash cohort analysis.
 *
 * A cohort = every saving whose effective date falls in the same month.
 * Grouping this way answers "which months of effort are still paying off?"
 * and shows how much of each cohort survived (vs reversed or expired).
 *
 * Durability mix = how much of the current run rate is permanent vs temporary.
 */
import { FreedCashSource, monthlySavings } from '@/hooks/use-freed-cash';
import { activeVerified } from './conversion';
import { monthKey, monthLabel, realizedInMonth, savingsEndDate, savingsStartDate } from './timing';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface CohortRow {
  key: string;
  label: string;
  count: number;
  /** Monthly savings originally logged for this cohort. */
  startedMonthly: number;
  /** Monthly savings from this cohort still in effect today. */
  survivingMonthly: number;
  survivingCount: number;
  /** Share of the cohort's monthly savings still alive (0-100). */
  survivalRate: number;
  /** Every dollar this cohort has actually delivered since it started. */
  cumulativeRealized: number;
  /** Months elapsed since the cohort started. */
  ageMonths: number;
}

function monthsBetween(fromKey: string, toKey: string): string[] {
  const [fy, fm] = fromKey.split('-').map(Number);
  const [ty, tm] = toKey.split('-').map(Number);
  const out: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export interface CohortReport {
  rows: CohortRow[];
  bestKey: string | null;
  totalStartedMonthly: number;
  totalSurvivingMonthly: number;
  totalCumulative: number;
  /** Weighted share of all logged savings still in effect (0-100). */
  overallSurvivalRate: number;
}

export function cohortReport(sources: FreedCashSource[], now = new Date()): CohortReport {
  const nowKey = monthKey(now);
  const alive = new Set(activeVerified(sources, now).map((s) => s.id));
  const groups = new Map<string, FreedCashSource[]>();

  for (const s of sources) {
    const start = savingsStartDate(s);
    if (!start) continue;
    if (monthlySavings(s) <= 0) continue;
    const key = monthKey(start);
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }

  const rows: CohortRow[] = [];
  for (const [key, list] of groups) {
    const startedMonthly = list.reduce((sum, s) => sum + monthlySavings(s), 0);
    const surviving = list.filter((s) => alive.has(s.id));
    const survivingMonthly = surviving.reduce((sum, s) => sum + monthlySavings(s), 0);

    const months = key <= nowKey ? monthsBetween(key, nowKey) : [];
    let cumulative = 0;
    for (const s of list) {
      for (const m of months) cumulative += realizedInMonth(s, m);
    }

    rows.push({
      key,
      label: monthLabel(key),
      count: list.length,
      startedMonthly: round2(startedMonthly),
      survivingMonthly: round2(survivingMonthly),
      survivingCount: surviving.length,
      survivalRate: startedMonthly > 0 ? round2((survivingMonthly / startedMonthly) * 100) : 0,
      cumulativeRealized: round2(cumulative),
      ageMonths: months.length,
    });
  }

  rows.sort((a, b) => (a.key < b.key ? 1 : -1));

  const totalStartedMonthly = rows.reduce((s, r) => s + r.startedMonthly, 0);
  const totalSurvivingMonthly = rows.reduce((s, r) => s + r.survivingMonthly, 0);
  const best = [...rows].sort((a, b) => b.cumulativeRealized - a.cumulativeRealized)[0];

  return {
    rows,
    bestKey: best?.key ?? null,
    totalStartedMonthly: round2(totalStartedMonthly),
    totalSurvivingMonthly: round2(totalSurvivingMonthly),
    totalCumulative: round2(rows.reduce((s, r) => s + r.cumulativeRealized, 0)),
    overallSurvivalRate:
      totalStartedMonthly > 0 ? round2((totalSurvivingMonthly / totalStartedMonthly) * 100) : 0,
  };
}

export interface DurabilityRow {
  value: string;
  count: number;
  monthly: number;
  share: number;
  /** Savings in this bucket that already have a known end date. */
  withEndDate: number;
}

export interface DurabilityMix {
  rows: DurabilityRow[];
  runRate: number;
  /** Run rate from permanent / long-term savings with no known end date. */
  durableMonthly: number;
  /** Run rate that is temporary, uncertain, or has a known end date. */
  fragileMonthly: number;
  durableShare: number;
}

const ORDER = ['permanent', 'long_term', 'uncertain', 'temporary'];

export function durabilityMix(sources: FreedCashSource[], now = new Date()): DurabilityMix {
  const active = activeVerified(sources, now);
  const runRate = active.reduce((sum, s) => sum + monthlySavings(s), 0);

  const buckets = new Map<string, DurabilityRow>();
  let durableMonthly = 0;

  for (const s of active) {
    const value = s.durability || 'permanent';
    const monthly = monthlySavings(s);
    const end = savingsEndDate(s);
    const row =
      buckets.get(value) ?? { value, count: 0, monthly: 0, share: 0, withEndDate: 0 };
    row.count += 1;
    row.monthly += monthly;
    if (end) row.withEndDate += 1;
    buckets.set(value, row);

    if ((value === 'permanent' || value === 'long_term') && !end) durableMonthly += monthly;
  }

  const rows = [...buckets.values()]
    .map((r) => ({
      ...r,
      monthly: round2(r.monthly),
      share: runRate > 0 ? round2((r.monthly / runRate) * 100) : 0,
    }))
    .sort((a, b) => ORDER.indexOf(a.value) - ORDER.indexOf(b.value));

  return {
    rows,
    runRate: round2(runRate),
    durableMonthly: round2(durableMonthly),
    fragileMonthly: round2(runRate - durableMonthly),
    durableShare: runRate > 0 ? round2((durableMonthly / runRate) * 100) : 0,
  };
}
