/**
 * Net recurring spending summary.
 *
 * Savings alone are only half the picture: new subscriptions approved through
 * the Subscription Gate push recurring spending back up. Net improvement is
 * the honest number — savings run rate minus newly added recurring costs.
 *
 * Everything here is scope-aware (personal vs business) so business savings
 * never offset household cash.
 */
import {
  FreedCashRedirect,
  FreedCashSource,
  GateRequest,
  monthlySavings,
  toMonthly,
} from '@/hooks/use-freed-cash';
import { activeVerified, conversionMetrics } from './conversion';
import { savingsEndDate } from './timing';

const round2 = (n: number) => Math.round(n * 100) / 100;

export type EntityScope = 'all' | 'personal' | 'business';

export function scopeOf(value: string | null | undefined): 'personal' | 'business' {
  return value === 'business' ? 'business' : 'personal';
}

export function matchesScope(value: string | null | undefined, scope: EntityScope): boolean {
  return scope === 'all' || scopeOf(value) === scope;
}

/** Filter sources by entity scope. */
export function filterSources(sources: FreedCashSource[], scope: EntityScope): FreedCashSource[] {
  return sources.filter((s) => matchesScope(s.entity_scope, scope));
}

/** Filter redirects to those whose source is in scope (unlinked redirects are personal). */
export function filterRedirects(
  redirects: FreedCashRedirect[],
  sources: FreedCashSource[],
  scope: EntityScope,
): FreedCashRedirect[] {
  if (scope === 'all') return redirects;
  const byId = new Map(sources.map((s) => [s.id, s]));
  return redirects.filter((r) => {
    const src = r.source_id ? byId.get(r.source_id) : undefined;
    return matchesScope(src?.entity_scope ?? 'personal', scope);
  });
}

/** Filter gate requests by entity scope. */
export function filterGateRequests(requests: GateRequest[], scope: EntityScope): GateRequest[] {
  return requests.filter((g) => matchesScope(g.entity_scope, scope));
}

export interface NetRecurringSummary {
  /** Confirmed savings currently lowering recurring spending. */
  savingsRunRate: number;
  /** Recurring cost of subscriptions approved through the gate. */
  addedRecurring: number;
  addedCount: number;
  /** Recurring cost still awaiting a gate decision. */
  pendingRecurring: number;
  pendingCount: number;
  /** Savings run rate minus newly added recurring cost. */
  netImprovement: number;
  /** Share of the savings run rate that survived the new spending (0-100). */
  netRetention: number;
  /** Confirmed savings not assigned to any destination. */
  unallocatedMonthly: number;
  /** Assigned but not yet actually moved. */
  executionGap: number;
  /** Freed cash without a job at all: unallocated + not moved. */
  atRiskMonthly: number;
  /** Part of the run rate expected to last (no end date, not temporary). */
  durableMonthly: number;
}

export function netRecurringSummary(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  gateRequests: GateRequest[],
  now = new Date(),
): NetRecurringSummary {
  const active = activeVerified(sources, now);
  const savingsRunRate = active.reduce((sum, s) => sum + monthlySavings(s), 0);

  const durableMonthly = active
    .filter((s) => (s.durability || 'permanent') !== 'temporary' && !savingsEndDate(s))
    .reduce((sum, s) => sum + monthlySavings(s), 0);

  const approved = gateRequests.filter((g) => g.decision === 'approved');
  const pending = gateRequests.filter((g) => g.decision === 'pending' || g.decision === 'deferred');

  const addedRecurring = approved.reduce(
    (sum, g) => sum + toMonthly(Number(g.amount || 0), g.billing_frequency),
    0,
  );
  const pendingRecurring = pending.reduce(
    (sum, g) => sum + toMonthly(Number(g.amount || 0), g.billing_frequency),
    0,
  );

  const conv = conversionMetrics(sources, redirects);
  const netImprovement = savingsRunRate - addedRecurring;

  return {
    savingsRunRate: round2(savingsRunRate),
    addedRecurring: round2(addedRecurring),
    addedCount: approved.length,
    pendingRecurring: round2(pendingRecurring),
    pendingCount: pending.length,
    netImprovement: round2(netImprovement),
    netRetention: savingsRunRate > 0 ? round2((netImprovement / savingsRunRate) * 100) : 0,
    unallocatedMonthly: round2(conv.unallocatedMonthly),
    executionGap: round2(conv.executionGap),
    atRiskMonthly: round2(conv.unallocatedMonthly + conv.executionGap),
    durableMonthly: round2(durableMonthly),
  };
}

export interface ScopeSplitRow {
  scope: 'personal' | 'business';
  label: string;
  savingsRunRate: number;
  addedRecurring: number;
  netImprovement: number;
  unallocatedMonthly: number;
}

/** Side-by-side personal vs business view so the two never mix. */
export function scopeSplit(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
  gateRequests: GateRequest[],
  now = new Date(),
): ScopeSplitRow[] {
  return (['personal', 'business'] as const).map((scope) => {
    const scoped = filterSources(sources, scope);
    const s = netRecurringSummary(
      scoped,
      filterRedirects(redirects, sources, scope),
      filterGateRequests(gateRequests, scope),
      now,
    );
    return {
      scope,
      label: scope === 'personal' ? 'Personal / household' : 'Business',
      savingsRunRate: s.savingsRunRate,
      addedRecurring: s.addedRecurring,
      netImprovement: s.netImprovement,
      unallocatedMonthly: s.unallocatedMonthly,
    };
  });
}
