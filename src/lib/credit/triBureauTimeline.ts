// Turns a stacked scenario into a sequenced, date-stamped action plan.
//
// Ordering logic mirrors how the bureaus actually update:
//  1. Disputes go out first — they take the longest to resolve (30–45 days per round).
//  2. Limit increases / new limits next, because they lower utilization without cash.
//  3. Pay-downs land right before the statement cut so the lower balance is what reports.
//  4. Inquiry aging is pure waiting.
//  5. Applying for the mortgage happens last, once everything has reported.

import { disputeCredit, type ScenarioAction, type Sensitivity, type Tradeline } from './triBureauModel';

export type StepKind = 'dispute' | 'limit' | 'paydown' | 'wait' | 'apply' | 'verify';

export interface TimelineStep {
  kind: StepKind;
  /** Months from today when this step starts. */
  monthOffset: number;
  dateLabel: string;
  title: string;
  detail: string;
  /** Expected directional score impact of this step, in points (middle score). */
  impact: number;
  /** Cumulative expected score after this step. */
  cumulative: number | null;
  cash: number;
}

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.44;

const dateFor = (monthOffset: number) =>
  new Date(Date.now() + monthOffset * MONTH_MS).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function buildTimeline(args: {
  actions: ScenarioAction[];
  tradelines: Tradeline[];
  sensitivity: Sensitivity;
  baseMiddle: number | null;
  simMiddle: number | null;
}): TimelineStep[] {
  const { actions, tradelines, sensitivity, baseMiddle, simMiddle } = args;
  if (actions.length === 0) return [];

  const nameOf = (id: string) => tradelines.find(t => t.id === id)?.account_name ?? 'Account';
  const totalDelta = (simMiddle ?? 0) - (baseMiddle ?? 0);

  const disputes = actions.filter(a => a.kind === 'dispute') as Extract<ScenarioAction, { kind: 'dispute' }>[];
  const limits = actions.filter(a => a.kind === 'limitIncrease' || a.kind === 'newCard');
  const paydowns = actions.filter(a => a.kind === 'paydown') as Extract<ScenarioAction, { kind: 'paydown' }>[];
  const wait = actions.find(a => a.kind === 'ageInquiries') as any;
  const newInq = actions.find(a => a.kind === 'newInquiry') as any;

  // Weight the total modeled delta across the steps that produced it.
  const weights: number[] = [];
  const raw: Omit<TimelineStep, 'impact' | 'cumulative'>[] = [];

  const push = (s: Omit<TimelineStep, 'impact' | 'cumulative'>, weight: number) => {
    raw.push(s);
    weights.push(weight);
  };

  // 1. Disputes
  disputes.forEach((d, i) => {
    const offset = i === 0 ? 0 : 0; // all mailed in the same window
    push(
      {
        kind: 'dispute',
        monthOffset: offset,
        dateLabel: dateFor(offset),
        title: `Mail dispute — ${nameOf(d.accountId)}`,
        detail: `Round 1 dispute (certified mail). Bureaus have 30 days to respond; you are assuming deletion in ${sensitivity.disputeLagMonths} month${sensitivity.disputeLagMonths === 1 ? '' : 's'} (${Math.round(disputeCredit(sensitivity.disputeLagMonths) * 100)}% credit applied to the projection).`,
        cash: 0,
      },
      4,
    );
  });

  // 2. Limit increases / new credit
  limits.forEach(l => {
    const amount = (l as any).amount ?? (l as any).limit ?? 0;
    const offset = disputes.length ? 1 : 0;
    push(
      {
        kind: 'limit',
        monthOffset: offset,
        dateLabel: dateFor(offset),
        title:
          l.kind === 'newCard'
            ? `Add ${money(amount)} of new credit limit`
            : `Request +${money(amount)} limit on ${nameOf((l as any).accountId)}`,
        detail:
          l.kind === 'newCard'
            ? 'A brand-new account also drops your average age and adds an inquiry — do this at least 6 months before applying for the mortgage, never during underwriting.'
            : 'Ask for a soft-pull credit line increase so it costs you no inquiry.',
        cash: 0,
      },
      2,
    );
  });

  // 3. Pay-downs, largest utilization impact first
  const orderedPaydowns = [...paydowns].sort((a, b) => b.amount - a.amount);
  orderedPaydowns.forEach((p, i) => {
    const offset = (disputes.length ? 1 : 0) + i;
    push(
      {
        kind: 'paydown',
        monthOffset: offset,
        dateLabel: dateFor(offset),
        title: `Pay ${money(p.amount)} to ${nameOf(p.accountId)}`,
        detail:
          'Send it 3–5 days BEFORE the statement cut date, not the due date — the statement balance is what gets reported. Also lowers your DTI.',
        cash: p.amount,
      },
      5,
    );
  });

  // 4. Waiting on inquiries
  if (wait?.months > 0) {
    const offset = Math.max(...raw.map(r => r.monthOffset), 0);
    push(
      {
        kind: 'wait',
        monthOffset: offset,
        dateLabel: `${dateFor(offset)} – ${dateFor(offset + wait.months)}`,
        title: `Hold ${wait.months} month${wait.months === 1 ? '' : 's'} — no new applications`,
        detail: `Ages existing hard inquiries out of the ${sensitivity.inquiryWindowMonths}-month scoring window. Utilization is averaged over ${sensitivity.utilWindowMonths} statement cycle${sensitivity.utilWindowMonths === 1 ? '' : 's'}, so balances need to stay low the whole time.`,
        cash: 0,
      },
      3,
    );
  }

  // 5. Verify then apply
  const lastOffset = Math.max(...raw.map(r => r.monthOffset), 0) + (wait?.months ?? 0);
  const verifyOffset = lastOffset + Math.max(1, sensitivity.utilWindowMonths);
  push(
    {
      kind: 'verify',
      monthOffset: verifyOffset,
      dateLabel: dateFor(verifyOffset),
      title: 'Pull a fresh 3-bureau report and verify',
      detail:
        'Confirm each pay-down and deletion actually reported before you let anyone pull your credit. Re-run this simulator against the new data.',
      cash: 0,
    },
    0,
  );

  const applyOffset = verifyOffset + (newInq?.count > 0 ? 0 : 0) + 1;
  push(
    {
      kind: 'apply',
      monthOffset: applyOffset,
      dateLabel: dateFor(applyOffset),
      title: 'Apply — mortgage pre-approval window',
      detail:
        newInq?.count > 0
          ? `You planned ${newInq.count} new hard inquir${newInq.count === 1 ? 'y' : 'ies'}. Keep all mortgage pulls inside a 14-day window so they count as one.`
          : 'Keep all mortgage pulls inside a 14-day window so they count as a single inquiry. No new credit until you close.',
      cash: 0,
    },
    0,
  );

  const weightSum = weights.reduce((s, w) => s + w, 0) || 1;
  let running = baseMiddle;
  return raw.map((s, i) => {
    const impact = Math.round((totalDelta * weights[i]) / weightSum);
    if (running != null) running = running + impact;
    return { ...s, impact, cumulative: running };
  });
}
