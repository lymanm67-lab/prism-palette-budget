/**
 * Freed Cash conversion & execution measurement.
 *
 * Savings Capture Rate measures ASSIGNMENT (did the freed dollar get a job?).
 * Freed Cash Conversion Rate measures EXECUTION (was the money actually moved?).
 * They are deliberately kept separate and never added together.
 *
 * Nothing here counts assigned redirects as completed financial progress.
 */
import {
  FreedCashRedirect,
  FreedCashSource,
  destinationLabel,
  monthlySavings,
} from '@/hooks/use-freed-cash';
import { netMonthly, savingsEndDate, savingsStartDate } from './timing';

const LIVE_REDIRECT = new Set(['planned', 'active']);

export interface DestinationRow {
  destination: string;
  label: string;
  assigned: number;
  executed: number;
  gap: number;
}

export interface ConversionMetrics {
  /** Verified recurring savings currently in effect, per month. */
  realizedMonthly: number;
  /** Assigned to a destination, per month. */
  assignedMonthly: number;
  /** Actually transferred / contributed, per month. */
  executedMonthly: number;
  /** Assigned but not actually moved. */
  executionGap: number;
  /** Verified savings with no destination at all. */
  unallocatedMonthly: number;
  /** Assignment %. */
  captureRate: number;
  /** Execution %. */
  conversionRate: number;
  byDestination: DestinationRow[];
}

export function conversionMetrics(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
): ConversionMetrics {
  const realizedMonthly = activeVerified(sources).reduce((sum, s) => sum + monthlySavings(s), 0);

  const live = redirects.filter((r) => LIVE_REDIRECT.has(r.status));
  const assignedMonthly = live.reduce((sum, r) => sum + Number(r.monthly_amount || 0), 0);
  const executedMonthly = live.reduce((sum, r) => sum + executedAmount(r), 0);

  const byDest = new Map<string, DestinationRow>();
  for (const r of live) {
    const row =
      byDest.get(r.destination_type) ??
      {
        destination: r.destination_type,
        label: destinationLabel(r.destination_type),
        assigned: 0,
        executed: 0,
        gap: 0,
      };
    row.assigned += Number(r.monthly_amount || 0);
    row.executed += executedAmount(r);
    row.gap = Math.max(0, row.assigned - row.executed);
    byDest.set(r.destination_type, row);
  }

  return {
    realizedMonthly,
    assignedMonthly,
    executedMonthly,
    executionGap: Math.max(0, assignedMonthly - executedMonthly),
    unallocatedMonthly: Math.max(0, realizedMonthly - assignedMonthly),
    captureRate: realizedMonthly > 0 ? (assignedMonthly / realizedMonthly) * 100 : 0,
    conversionRate: realizedMonthly > 0 ? (executedMonthly / realizedMonthly) * 100 : 0,
    byDestination: [...byDest.values()].sort((a, b) => b.assigned - a.assigned),
  };
}

/**
 * Falls back to the assigned amount only when the redirect was explicitly confirmed
 * moved — an unconfirmed redirect never counts as executed.
 */
export function executedAmount(r: FreedCashRedirect): number {
  const executed = Number(r.executed_monthly || 0);
  if (executed > 0) return Math.min(executed, Number(r.monthly_amount || 0) || executed);
  return r.confirmed_moved ? Number(r.monthly_amount || 0) : 0;
}

/** Verified savings still in effect today (expired / reversed / resumed excluded). */
export function activeVerified(sources: FreedCashSource[], now = new Date()): FreedCashSource[] {
  return sources.filter((s) => {
    if (s.status !== 'verified') return false;
    const start = savingsStartDate(s);
    if (!start || start > now) return false;
    const end = savingsEndDate(s);
    return !end || end > now;
  });
}

export interface AuditRow {
  id: string;
  name: string;
  vendor: string | null;
  category: string | null;
  entityScope: string;
  original: number;
  replacement: number;
  netMonthly: number;
  effectiveDate: string;
  expiresOn: string | null;
  status: string;
  confidence: string;
  durability: string;
  destinations: string;
}

/** Drill-down: every active source behind the run rate, and where its money goes. */
export function runRateAudit(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  now = new Date(),
): AuditRow[] {
  const live = redirects.filter((r) => LIVE_REDIRECT.has(r.status));
  return activeVerified(sources, now)
    .map((s) => {
      const dests = live
        .filter((r) => r.source_id === s.id)
        .map((r) => r.destination_label || destinationLabel(r.destination_type));
      return {
        id: s.id,
        name: s.name,
        vendor: s.vendor,
        category: s.category,
        entityScope: s.entity_scope,
        original: Number(s.original_amount || 0),
        replacement: Number(s.new_amount || 0) + Number(s.added_fees || 0),
        netMonthly: netMonthly(s),
        effectiveDate: s.effective_date,
        expiresOn: s.expires_on ?? null,
        status: s.status,
        confidence: s.confidence || 'estimated',
        durability: s.durability || 'permanent',
        destinations: dests.length ? dests.join(', ') : 'Unassigned',
      };
    })
    .sort((a, b) => b.netMonthly - a.netMonthly);
}

/** Savings whose expiration date lands within the next 60 days. */
export function expiringSoon(sources: FreedCashSource[], now = new Date(), days = 60) {
  const cutoff = new Date(now.getTime() + days * 86_400_000);
  return activeVerified(sources, now).filter((s) => {
    const end = savingsEndDate(s);
    return !!end && end <= cutoff;
  });
}
