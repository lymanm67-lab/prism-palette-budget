// Money Redirects engine (PrismMoney Session 5)
//
// Freed cash is never "new spending". Every dollar released by an ended
// obligation, a settled debt or a raise is shown as a FLOW from a source into
// one or more targets, with whatever is left over explicitly labelled as
// needing a job. Buffer is deliberately NOT a default target: released cash
// goes to PSLF, the vacation snowball, the Travel Fund and Build Wealth first.

import type { MoneyPurpose } from '@/lib/budgeting/moneyPurpose';

export type RedirectStatus = 'scheduled' | 'active' | 'pending_trigger' | 'needs_job' | 'paused';

export type RedirectTrigger = 'obligation_ended' | 'vacation_paid_off' | 'raise' | 'manual';

export interface RedirectRow {
  id: string;
  source_label: string;
  source_amount: number;
  target_label: string;
  target_amount: number;
  target_purpose: string | null;
  start_month: string;
  end_month: string | null;
  status: string;
  trigger_type: string;
  group_key: string | null;
  sort_order: number;
  notes: string | null;
}

export interface RedirectLeg {
  id: string;
  targetLabel: string;
  amount: number;
  purpose: MoneyPurpose | null;
  status: RedirectStatus;
  startMonth: string;
  endMonth: string | null;
  notes: string | null;
  /** Running balance of the source pool after this leg is funded. */
  remainingAfter: number;
  needsJob: boolean;
}

export interface RedirectFlow {
  groupKey: string;
  sourceLabel: string;
  sourceAmount: number;
  trigger: RedirectTrigger;
  startMonth: string;
  legs: RedirectLeg[];
  assigned: number;
  unassigned: number;
  /** True once the calendar has reached the start month. */
  started: boolean;
  /** Trigger conditions that have not fired yet (vacation payoff, raise). */
  awaitingTrigger: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const REDIRECT_STATUS_LABEL: Record<RedirectStatus, string> = {
  scheduled: 'Scheduled',
  active: 'Active',
  pending_trigger: 'Waiting on trigger',
  needs_job: 'Needs a job',
  paused: 'Paused',
};

export const TRIGGER_LABEL: Record<RedirectTrigger, string> = {
  obligation_ended: 'When the obligation ends',
  vacation_paid_off: 'When vacation debt reaches $0',
  raise: 'When the raise lands',
  manual: 'Manual',
};

/** Purposes a redirect may target. Buffer is intentionally absent. */
export const REDIRECT_TARGET_PURPOSES: { value: MoneyPurpose | ''; label: string }[] = [
  { value: 'eliminate_debt', label: 'Eliminate Debt' },
  { value: 'build_wealth', label: 'Build Wealth' },
  { value: 'enjoy', label: 'Enjoy (Travel Fund)' },
  { value: 'live', label: 'Live' },
  { value: 'business', label: 'Business' },
  { value: '', label: 'Unassigned — needs a job' },
];

function asStatus(v: string): RedirectStatus {
  return (['scheduled', 'active', 'pending_trigger', 'needs_job', 'paused'] as RedirectStatus[]).includes(
    v as RedirectStatus,
  )
    ? (v as RedirectStatus)
    : 'scheduled';
}

function asTrigger(v: string): RedirectTrigger {
  return (['obligation_ended', 'vacation_paid_off', 'raise', 'manual'] as RedirectTrigger[]).includes(
    v as RedirectTrigger,
  )
    ? (v as RedirectTrigger)
    : 'manual';
}

export interface FlowContext {
  /** Current month key, YYYY-MM. */
  currentMonth: string;
  /** Remaining balance across the vacation loans, for the payoff trigger. */
  vacationBalance?: number;
}

/**
 * Groups redirect rows into source → target flows and computes what is still
 * unassigned in each pool.
 */
export function buildRedirectFlows(rows: RedirectRow[], ctx: FlowContext): RedirectFlow[] {
  const groups = new Map<string, RedirectRow[]>();
  for (const r of rows || []) {
    const key = r.group_key || `${r.source_label}:${r.start_month}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const flows: RedirectFlow[] = [];

  for (const [groupKey, groupRows] of groups) {
    const ordered = [...groupRows].sort((a, b) => a.sort_order - b.sort_order);
    const first = ordered[0];
    const sourceAmount = round2(Number(first.source_amount) || 0);
    const trigger = asTrigger(first.trigger_type);
    const startMonth = first.start_month;

    const awaitingTrigger =
      (trigger === 'vacation_paid_off' && (ctx.vacationBalance ?? 0) > 0.01) ||
      (trigger === 'raise' && startMonth > ctx.currentMonth);
    const started = startMonth <= ctx.currentMonth && !awaitingTrigger;

    let remaining = sourceAmount;
    const legs: RedirectLeg[] = ordered.map((r) => {
      const amount = round2(Number(r.target_amount) || 0);
      const stored = asStatus(r.status);
      const needsJob = stored === 'needs_job' || !r.target_purpose;
      remaining = round2(remaining - amount);

      let status: RedirectStatus = stored;
      if (stored !== 'paused' && stored !== 'needs_job') {
        if (awaitingTrigger) status = 'pending_trigger';
        else if (startMonth <= ctx.currentMonth) status = 'active';
        else status = 'scheduled';
      }

      return {
        id: r.id,
        targetLabel: r.target_label,
        amount,
        purpose: (r.target_purpose || null) as MoneyPurpose | null,
        status,
        startMonth: r.start_month,
        endMonth: r.end_month,
        notes: r.notes,
        remainingAfter: remaining,
        needsJob,
      };
    });

    const assigned = round2(legs.filter((l) => !l.needsJob).reduce((s, l) => s + l.amount, 0));

    flows.push({
      groupKey,
      sourceLabel: first.source_label,
      sourceAmount,
      trigger,
      startMonth,
      legs,
      assigned,
      unassigned: round2(sourceAmount - assigned),
      started,
      awaitingTrigger,
    });
  }

  return flows.sort((a, b) => a.startMonth.localeCompare(b.startMonth) || a.sourceLabel.localeCompare(b.sourceLabel));
}

export interface RedirectTotals {
  totalFreed: number;
  toDebt: number;
  toWealth: number;
  toEnjoy: number;
  toLive: number;
  toBusiness: number;
  needsJob: number;
}

export function redirectTotals(flows: RedirectFlow[]): RedirectTotals {
  const t: RedirectTotals = {
    totalFreed: 0,
    toDebt: 0,
    toWealth: 0,
    toEnjoy: 0,
    toLive: 0,
    toBusiness: 0,
    needsJob: 0,
  };

  for (const f of flows) {
    t.totalFreed = round2(t.totalFreed + f.sourceAmount);
    for (const l of f.legs) {
      if (l.needsJob) t.needsJob = round2(t.needsJob + l.amount);
      else if (l.purpose === 'eliminate_debt') t.toDebt = round2(t.toDebt + l.amount);
      else if (l.purpose === 'build_wealth') t.toWealth = round2(t.toWealth + l.amount);
      else if (l.purpose === 'enjoy') t.toEnjoy = round2(t.toEnjoy + l.amount);
      else if (l.purpose === 'live') t.toLive = round2(t.toLive + l.amount);
      else if (l.purpose === 'business') t.toBusiness = round2(t.toBusiness + l.amount);
    }
    if (f.unassigned > 0.01 && !f.legs.some((l) => l.needsJob)) {
      t.needsJob = round2(t.needsJob + f.unassigned);
    }
  }

  return t;
}

/** Redirect rows shaped for the forecast engine's annotation list. */
export function redirectFlagInputs(flows: RedirectFlow[]) {
  return flows.flatMap((f) =>
    f.legs
      .filter((l) => !l.needsJob && l.status !== 'paused')
      .map((l) => ({
        startMonth: l.startMonth,
        sourceLabel: f.sourceLabel,
        targetLabel: l.targetLabel,
        amount: l.amount,
      })),
  );
}
