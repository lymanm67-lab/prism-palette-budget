// Automatic target-phase switching.
//
// The 50/10/20/20 targets step to 50/10/30/10 and finally 50/10/40/0 as debt
// elimination winds down. The switch is PROJECTED from the known settlement
// schedule and remaining debt obligations, so the plan changes on the month the
// obligation actually clears — not months later once averages catch up.

import { buildSettlementPlan, NEW_OBLIGATIONS, SETTLEMENT_FEES } from './settlementStepDown';
import { derivePhase } from './blueprint5010';
import type { FreedomPhase } from './moneyPurpose';

const mk = (m: string) => m.slice(0, 7);
const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export interface PhaseProjection {
  phase: FreedomPhase;
  /** phase implied purely by the actual debt ratio */
  observedPhase: FreedomPhase;
  /** phase implied by the projected debt schedule */
  projectedPhase: FreedomPhase;
  auto: boolean;
  reason: string;
  /** month the last known debt obligation is projected to clear */
  debtFreeMonth: string | null;
  /** remaining scheduled monthly debt obligations for this month */
  scheduledDebt: number;
}

/**
 * Projected phase for a month, blending the known settlement/PSLF schedule with
 * the observed debt ratio. The stronger (further along) signal wins so the plan
 * never rolls backwards inside the same month.
 */
export function projectPhase(
  month: string,
  opts: { debtActual: number; netIncome: number; override?: FreedomPhase | null },
): PhaseProjection {
  const m = mk(month);
  const plan = buildSettlementPlan(m);
  const observedPhase = derivePhase(opts.debtActual, opts.netIncome);

  const finalFeeMonth = mk(SETTLEMENT_FEES[SETTLEMENT_FEES.length - 1]?.date || plan.finalFeeDate);
  const settlementDone = cmp(m, finalFeeMonth) > 0;
  const regularDone = cmp(m, plan.regularPaymentsEndMonth) >= 0;

  const scheduledDebt =
    plan.current.regularPayment +
    NEW_OBLIGATIONS.filter((o) => cmp(m, o.month) >= 0).reduce((s, o) => s + o.amount, 0);

  // The last dated obligation we know about ends the debt phase.
  const debtFreeMonth = NEW_OBLIGATIONS.length ? null : settlementDone ? finalFeeMonth : null;

  let projectedPhase: FreedomPhase = 1;
  let reason: string;

  if (settlementDone && scheduledDebt <= 0) {
    projectedPhase = 3;
    reason = 'All known debt obligations projected complete — Build Wealth target steps to 40% and Debt to 0%.';
  } else if (regularDone || settlementDone) {
    projectedPhase = 2;
    reason = settlementDone
      ? `Settlement fully complete, ${money(scheduledDebt)}/mo of scheduled debt remains — targets step to 30% Build Wealth / 10% Debt.`
      : `Regular settlement payments end ${plan.regularPaymentsEndMonth}; remaining obligations ${money(scheduledDebt)}/mo — targets step to 30% / 10%.`;
  } else {
    projectedPhase = 1;
    reason = `Debt elimination still running (${money(scheduledDebt)}/mo scheduled) — targets stay 20% Build Wealth / 20% Debt.`;
  }

  if (opts.override) {
    return {
      phase: opts.override,
      observedPhase,
      projectedPhase,
      auto: false,
      reason: 'Phase manually pinned — automatic switching paused.',
      debtFreeMonth,
      scheduledDebt: round2(scheduledDebt),
    };
  }

  const phase = (Math.max(projectedPhase, observedPhase) as FreedomPhase);
  if (phase !== projectedPhase) {
    reason = `Observed debt spending is already at Phase ${phase} levels — using the further-along target set.`;
  }

  return {
    phase,
    observedPhase,
    projectedPhase,
    auto: true,
    reason,
    debtFreeMonth,
    scheduledDebt: round2(scheduledDebt),
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
