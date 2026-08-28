// One-click scenario presets: set the sensitivity assumptions AND stack a matching
// set of actions, so the timeline regenerates immediately.

import {
  DEFAULT_SENSITIVITY, DEROGATORY_STATUSES,
  type ScenarioAction, type Sensitivity, type Tradeline, type CardUtilization,
} from './triBureauModel';

export type PresetId = 'paydown' | 'dispute' | 'inquiry' | 'conservative' | 'lender';

export interface PresetContext {
  tradelines: Tradeline[];
  cards: CardUtilization[];
  /** Account ids that cannot be simulated (missing limit / balance). */
  blockedAccountIds: Set<string>;
  /** Cash you're willing to throw at balances in the pay-down preset. */
  cashBudget?: number;
}

export interface PresetResult {
  actions: ScenarioAction[];
  sensitivity: Sensitivity;
  /** Anything the preset could not do because the data isn't there. */
  notes: string[];
}

export interface PresetDef {
  id: PresetId;
  label: string;
  blurb: string;
  build: (ctx: PresetContext) => PresetResult;
}

let seq = 0;
const id = () => `preset-${++seq}`;

/** Target every card down to 9% of its limit, cheapest-first, inside the cash budget. */
function paydownActions(ctx: PresetContext, targetUtil: number, budget: number): { actions: ScenarioAction[]; spent: number; skipped: number } {
  const usable = ctx.cards.filter(c => c.limit > 0 && c.balance > 0 && !ctx.blockedAccountIds.has(c.id));
  const skipped = ctx.cards.filter(c => c.balance > 0 && ctx.blockedAccountIds.has(c.id)).length;
  // Highest utilization first — per-card drag is what hurts most.
  const ordered = [...usable].sort((a, b) => b.util - a.util);
  const actions: ScenarioAction[] = [];
  let left = budget;
  for (const c of ordered) {
    if (left <= 0) break;
    const target = c.limit * (targetUtil / 100);
    const need = Math.max(0, c.balance - target);
    const pay = Math.min(need, left);
    if (pay >= 25) {
      actions.push({ kind: 'paydown', id: id(), accountId: c.id, amount: Math.round(pay) });
      left -= pay;
    }
  }
  return { actions, spent: budget - left, skipped };
}

const derogsOf = (ctx: PresetContext) =>
  ctx.tradelines.filter(t => DEROGATORY_STATUSES.includes(t.account_status));

export const PRESETS: PresetDef[] = [
  {
    id: 'paydown',
    label: 'Pay-down focus',
    blurb: 'Spends your cash budget on the highest-utilization cards first, down toward 9% each. Fastest, most reliable score lift — and the only lever that also lowers DTI.',
    build: ctx => {
      const budget = ctx.cashBudget ?? 2000;
      const { actions, spent, skipped } = paydownActions(ctx, 9, budget);
      const notes: string[] = [];
      if (actions.length === 0) notes.push('No card had a balance that could be paid toward 9% with this budget.');
      else notes.push(`Allocated ${Math.round(spent).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })} across ${actions.length} card(s), highest utilization first.`);
      if (skipped) notes.push(`${skipped} card(s) skipped — missing limit or balance data.`);
      return {
        actions,
        // Conservative reporting lag: assume 2 cycles before the lower balance is what lenders see.
        sensitivity: { ...DEFAULT_SENSITIVITY, utilWindowMonths: 2 },
        notes,
      };
    },
  },
  {
    id: 'dispute',
    label: 'Dispute focus',
    blurb: 'Disputes every derogatory item on file and assumes a realistic 3-month deletion lag. Highest ceiling, least certain outcome.',
    build: ctx => {
      const derogs = derogsOf(ctx);
      const notes: string[] = [];
      if (derogs.length === 0) notes.push('No derogatory items on file for any bureau — nothing to dispute.');
      else notes.push(`${derogs.length} derogatory item(s) queued for dispute. Round 1 rarely deletes; budget 2–3 rounds.`);
      return {
        actions: derogs.map(d => ({ kind: 'dispute' as const, id: id(), accountId: d.id })),
        sensitivity: { ...DEFAULT_SENSITIVITY, disputeLagMonths: 3 },
        notes,
      };
    },
  },
  {
    id: 'inquiry',
    label: 'Inquiry delay',
    blurb: 'No new credit for 12 months so existing hard inquiries age out of the scoring window. Costs nothing but time.',
    build: () => ({
      actions: [{ kind: 'ageInquiries', id: id(), months: 12 }],
      sensitivity: { ...DEFAULT_SENSITIVITY, inquiryWindowMonths: 12 },
      notes: ['Assumes zero new applications for the full 12 months — one new card resets the clock.'],
    }),
  },
  {
    id: 'conservative',
    label: 'Worst-case view',
    blurb: 'Same file, pessimistic assumptions: slow reporting, long look-back on inquiries, disputes that barely move. Use this number when deciding what you can actually afford.',
    build: ctx => {
      const { actions, skipped } = paydownActions(ctx, 30, ctx.cashBudget ?? 1000);
      const notes = ['Pessimistic assumptions: 4-cycle utilization blend, 18-month inquiry look-back, disputes credited at 45%.'];
      if (skipped) notes.push(`${skipped} card(s) skipped — missing limit or balance data.`);
      return {
        actions,
        sensitivity: { utilWindowMonths: 4, inquiryWindowMonths: 18, disputeLagMonths: 0 },
        notes,
      };
    },
  },
  {
    id: 'lender',
    label: 'Mortgage-ready stack',
    blurb: 'The combination lenders reward: pay every card under 9%, dispute derogatories, then sit still for 6 months before any pull.',
    build: ctx => {
      const { actions, skipped } = paydownActions(ctx, 9, ctx.cashBudget ?? 3000);
      const derogs = derogsOf(ctx);
      const notes = ['Combines pay-down, disputes and a 6-month quiet period before applying.'];
      if (skipped) notes.push(`${skipped} card(s) skipped — missing limit or balance data.`);
      if (derogs.length === 0) notes.push('No derogatory items to dispute.');
      return {
        actions: [
          ...actions,
          ...derogs.map(d => ({ kind: 'dispute' as const, id: id(), accountId: d.id })),
          { kind: 'ageInquiries' as const, id: id(), months: 6 },
        ],
        sensitivity: { ...DEFAULT_SENSITIVITY, utilWindowMonths: 2, disputeLagMonths: 3 },
        notes,
      };
    },
  },
];
