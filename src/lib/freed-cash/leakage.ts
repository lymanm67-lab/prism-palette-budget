/**
 * Freed Cash forward look & leakage detection.
 *
 * Forward look = what the current run rate is expected to be worth over the next
 * 12 months, after removing savings that are already known to end (expiration,
 * scheduled resume) — always an estimate, never added to realized savings.
 *
 * Leakage = verified savings at risk of quietly drifting back into spending.
 */
import { FreedCashRedirect, FreedCashSource, monthlySavings } from '@/hooks/use-freed-cash';
import { activeVerified, conversionMetrics } from './conversion';
import { monthKey, monthLabel, savingsEndDate } from './timing';

const DAY = 86_400_000;

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

export interface ForwardMonthRow {
  key: string;
  label: string;
  runRate: number;
  endingThisMonth: number;
}

export interface ForwardLook {
  runRate: number;
  /** Run rate 12 months from now once known expirations are removed. */
  runRateInTwelveMonths: number;
  /** Sum of the projected monthly run rates over the next 12 months. */
  projectedTwelveMonth: number;
  /** Naive run rate x 12 (what the headline avoided-annual figure assumes). */
  naiveTwelveMonth: number;
  /** Projected shortfall vs the naive figure, caused by known endings. */
  expiringImpact: number;
  /** Verified savings not assigned to any destination. */
  unallocatedMonthly: number;
  /** Assigned but not actually moved. */
  executionGap: number;
  /** Verified savings actually being moved, per month. */
  executedMonthly: number;
  /** Net recurring spending improvement = run rate that is durable + executed. */
  netRecurringImprovement: number;
  months: ForwardMonthRow[];
}

export function forwardLook(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  now = new Date(),
): ForwardLook {
  const active = activeVerified(sources, now);
  const runRate = active.reduce((sum, s) => sum + monthlySavings(s), 0);
  const conv = conversionMetrics(sources, redirects);

  const months: ForwardMonthRow[] = [];
  let projectedTwelveMonth = 0;

  for (let i = 0; i < 12; i++) {
    const monthStartDate = addMonths(now, i);
    const nextStart = addMonths(now, i + 1);
    const key = monthKey(monthStartDate);

    let rate = 0;
    let ending = 0;
    for (const s of active) {
      const end = savingsEndDate(s);
      const amount = monthlySavings(s);
      if (!end || end >= nextStart) {
        rate += amount;
      } else if (end >= monthStartDate) {
        // Ends during this month: still counted this month, gone afterwards.
        rate += amount;
        ending += amount;
      }
    }

    projectedTwelveMonth += rate;
    months.push({ key, label: monthLabel(key), runRate: rate, endingThisMonth: ending });
  }

  const runRateInTwelveMonths = months.length ? months[months.length - 1].runRate : runRate;
  const naiveTwelveMonth = runRate * 12;

  const durable = active
    .filter((s) => (s.durability || 'permanent') !== 'temporary' && !savingsEndDate(s))
    .reduce((sum, s) => sum + monthlySavings(s), 0);

  return {
    runRate,
    runRateInTwelveMonths,
    projectedTwelveMonth,
    naiveTwelveMonth,
    expiringImpact: Math.max(0, naiveTwelveMonth - projectedTwelveMonth),
    unallocatedMonthly: conv.unallocatedMonthly,
    executionGap: conv.executionGap,
    executedMonthly: conv.executedMonthly,
    netRecurringImprovement: Math.min(durable, conv.executedMonthly || durable),
    months,
  };
}

export type LeakSeverity = 'high' | 'medium' | 'low';

export interface LeakRow {
  id: string;
  sourceId: string;
  name: string;
  vendor: string | null;
  monthly: number;
  severity: LeakSeverity;
  reason: string;
  action: string;
}

export interface LeakageReport {
  rows: LeakRow[];
  atRiskMonthly: number;
  highCount: number;
  /** Unallocated + not-yet-moved money, which leaks back into spending by default. */
  driftMonthly: number;
}

const SEVERITY_RANK: Record<LeakSeverity, number> = { high: 3, medium: 2, low: 1 };

export function leakageReport(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  now = new Date(),
): LeakageReport {
  const conv = conversionMetrics(sources, redirects);
  const live = redirects.filter((r) => r.status === 'planned' || r.status === 'active');
  const rows: LeakRow[] = [];

  for (const s of activeVerified(sources, now)) {
    const monthly = monthlySavings(s);
    if (monthly <= 0) continue;

    const end = savingsEndDate(s);
    const daysToEnd = end ? Math.round((end.getTime() - now.getTime()) / DAY) : null;
    const assigned = live
      .filter((r) => r.source_id === s.id)
      .reduce((sum, r) => sum + Number(r.monthly_amount || 0), 0);
    const moved = live
      .filter((r) => r.source_id === s.id)
      .reduce((sum, r) => sum + Number(r.executed_monthly || 0), 0);

    const push = (severity: LeakSeverity, reason: string, action: string) =>
      rows.push({ id: `${s.id}-${reason}`, sourceId: s.id, name: s.name, vendor: s.vendor, monthly, severity, reason, action });

    if (daysToEnd !== null && daysToEnd <= 60) {
      push(
        'high',
        `Savings end in ${Math.max(0, daysToEnd)} days`,
        'Renegotiate before the end date or plan to replace this saving.',
      );
    }

    if (s.reactivation_risk === 'high') {
      push('high', 'High chance this expense comes back', 'Cancel at the source or set a reminder to check.');
    }

    if (assigned <= 0) {
      push('high', 'No job assigned', 'Assign this freed money to a goal so it stops being spendable.');
    } else if (moved <= 0) {
      push('medium', 'Assigned but never moved', 'Move the money, then mark the redirect as moved.');
    } else if (moved + 0.5 < assigned) {
      push('medium', 'Moving less than assigned', 'Increase the transfer to match what you assigned.');
    }

    if (Number(s.renewal_amount || 0) > Number(s.new_amount || 0) + Number(s.added_fees || 0)) {
      push('medium', 'Renewal price is higher than today', 'Shop or renegotiate before the renewal date.');
    }

    if ((s.durability || 'permanent') === 'temporary' && !end) {
      push('medium', 'Temporary saving with no end date', 'Add the end date so the run rate stays honest.');
    }

    if (s.statement_checked_date) {
      const ageDays = Math.round((now.getTime() - new Date(s.statement_checked_date).getTime()) / DAY);
      if (ageDays > 120) {
        push('low', `Not checked on a statement in ${ageDays} days`, 'Re-check a recent statement to reconfirm.');
      }
    } else {
      push('low', 'Never checked on a statement', 'Confirm the lower amount on a statement.');
    }
  }

  rows.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.monthly - a.monthly);

  const atRisk = new Map<string, number>();
  for (const r of rows) {
    if (r.severity === 'high') atRisk.set(r.sourceId, r.monthly);
  }

  return {
    rows,
    atRiskMonthly: [...atRisk.values()].reduce((a, b) => a + b, 0),
    highCount: rows.filter((r) => r.severity === 'high').length,
    driftMonthly: conv.unallocatedMonthly + conv.executionGap,
  };
}
