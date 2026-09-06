import type { FreedCashRedirect, FreedCashSource } from '@/hooks/use-freed-cash';
import { executedAmount } from './conversion';
import { buildMonthlyHistory, monthKey, monthLabel, type MonthlySavingsRow } from './timing';

export type ReportBasis = 'calendar' | 'rolling';

export interface MonthSnapshot {
  id?: string;
  household_id?: string;
  entity_scope: string;
  period_month: string;
  realized_monthly: number;
  run_rate: number;
  created_monthly: number;
  executed_monthly: number;
  unallocated_monthly: number;
  source_count: number;
  locked: boolean;
  notes?: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Jan..Dec of a calendar year. */
export function calendarYearRange(year: number): { fromKey: string; toKey: string } {
  return { fromKey: `${year}-01`, toKey: `${year}-12` };
}

/** The last `months` months, ending with the current month. */
export function rollingRange(now = new Date(), months = 12): { fromKey: string; toKey: string } {
  const to = monthKey(now);
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
  return { fromKey: monthKey(start), toKey: to };
}

export interface PeriodMonthRow extends MonthlySavingsRow {
  /** True when this month's numbers come from a frozen snapshot. */
  frozen: boolean;
  executedMonthly: number;
  unallocatedMonthly: number;
}

export interface PeriodReport {
  fromKey: string;
  toKey: string;
  rows: PeriodMonthRow[];
  realizedTotal: number;
  createdTotal: number;
  executedTotal: number;
  endingRunRate: number;
  startingRunRate: number;
  avoidedAnnualAtEnd: number;
  bestMonth: PeriodMonthRow | null;
  frozenCount: number;
  openMonths: string[];
}

/**
 * Month-by-month report for a period. Frozen snapshots always win over
 * recalculated figures, so a past month never rewrites itself when a savings
 * row is edited later.
 */
export function periodReport(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  fromKey: string,
  toKey: string,
  snapshots: MonthSnapshot[] = [],
  now = new Date(),
): PeriodReport {
  const snapByMonth = new Map<string, MonthSnapshot>();
  for (const s of snapshots) {
    if (s.locked) snapByMonth.set(s.period_month.slice(0, 7), s);
  }

  const live = buildMonthlyHistory(sources, fromKey, toKey);
  const currentKey = monthKey(now);
  const executedNow = redirects.reduce((sum, r) => sum + executedAmount(r), 0);

  const rows: PeriodMonthRow[] = live.map((r) => {
    const snap = snapByMonth.get(r.month);
    if (snap) {
      return {
        ...r,
        createdMonthly: Number(snap.created_monthly),
        realizedThisMonth: Number(snap.realized_monthly),
        runRateAtEnd: Number(snap.run_rate),
        avoidedAnnualAtEnd: round2(Number(snap.run_rate) * 12),
        executedMonthly: Number(snap.executed_monthly),
        unallocatedMonthly: Number(snap.unallocated_monthly),
        frozen: true,
      };
    }
    const executed = r.month === currentKey ? round2(executedNow) : 0;
    return {
      ...r,
      executedMonthly: executed,
      unallocatedMonthly: round2(Math.max(0, r.runRateAtEnd - executed)),
      frozen: false,
    };
  });

  // Recompute the running cumulative so frozen months carry through.
  let cumulative = rows.length > 0 ? rows[0].cumulativeRealized - rows[0].realizedThisMonth : 0;
  for (const r of rows) {
    cumulative += r.realizedThisMonth;
    r.cumulativeRealized = round2(cumulative);
  }

  const realizedTotal = rows.reduce((sum, r) => sum + r.realizedThisMonth, 0);
  const best = rows.reduce<PeriodMonthRow | null>(
    (top, r) => (!top || r.realizedThisMonth > top.realizedThisMonth ? r : top),
    null,
  );

  return {
    fromKey,
    toKey,
    rows,
    realizedTotal: round2(realizedTotal),
    createdTotal: round2(rows.reduce((sum, r) => sum + r.createdMonthly, 0)),
    executedTotal: round2(rows.reduce((sum, r) => sum + r.executedMonthly, 0)),
    endingRunRate: rows.length > 0 ? rows[rows.length - 1].runRateAtEnd : 0,
    startingRunRate: rows.length > 0 ? rows[0].runRateAtEnd : 0,
    avoidedAnnualAtEnd: rows.length > 0 ? rows[rows.length - 1].avoidedAnnualAtEnd : 0,
    bestMonth: best,
    frozenCount: rows.filter((r) => r.frozen).length,
    openMonths: rows.filter((r) => !r.frozen && r.month < currentKey).map((r) => r.month),
  };
}

/** Turn a computed month into a snapshot payload ready to freeze. */
export function snapshotPayload(
  row: PeriodMonthRow,
  scope: string,
  sourceCount: number,
): Omit<MonthSnapshot, 'id' | 'household_id'> {
  return {
    entity_scope: scope,
    period_month: `${row.month}-01`,
    realized_monthly: row.realizedThisMonth,
    run_rate: row.runRateAtEnd,
    created_monthly: row.createdMonthly,
    executed_monthly: row.executedMonthly,
    unallocated_monthly: row.unallocatedMonthly,
    source_count: sourceCount,
    locked: true,
  };
}

/** Years that have any activity, newest first. */
export function availableYears(sources: FreedCashSource[], now = new Date()): number[] {
  const years = new Set<number>([now.getFullYear()]);
  for (const s of sources) {
    if (s.effective_date) years.add(Number(s.effective_date.slice(0, 4)));
  }
  return [...years].sort((a, b) => b - a);
}

export { monthLabel };
