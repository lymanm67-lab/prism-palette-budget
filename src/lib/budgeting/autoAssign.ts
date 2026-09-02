// Auto-assign engine — keeps Layer A at $0.00 unassigned without hand-picking numbers.
//
// Two rules, applied in order:
//   1. Business costs paid from the personal account are covered by an owner
//      advance of exactly the same size, so business net = $0 and the cost lands
//      on the personal buckets instead of showing as an over-allocation.
//   2. Whatever is still unassigned after that is parked in Buffer (a real job),
//      and any over-allocation is pulled back out of Buffer first.

import type { Reconciliation } from '@/lib/budgeting/blueprint5010';
import type { LayerAAssignment } from '@/hooks/use-layer-a-assignments';

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface AutoAssignPlan {
  /** Fields to write to layer_a_assignments. Empty when nothing needs changing. */
  patch: Partial<LayerAAssignment>;
  /** Plain-English lines describing what the auto-assign will do. */
  steps: string[];
  balanced: boolean;
}

/**
 * Derive the balancing assignment for a month from its reconciliation.
 * Nothing is invented: every number comes from figures already on the month.
 */
export function planAutoAssign(r: Reconciliation): AutoAssignPlan {
  const steps: string[] = [];
  const patch: Partial<LayerAAssignment> = {};

  // 1. Cover business costs with an owner advance of the same amount.
  const businessNet = round2(Math.max(0, r.businessOutflow - r.businessInflow));
  let freed = 0;
  if (businessNet > 0.005) {
    patch.business_inflow = round2(r.businessOutflow);
    freed = businessNet;
    steps.push(
      `Cover ${money(businessNet)} of business costs with an owner advance of the same size — the cost sits on the personal buckets and is reimbursed when the client pays.`,
    );
  }

  // 2. Park (or release) the remainder in Buffer.
  const surplus = round2(r.unassigned + freed);
  const buffer = round2(Math.max(0, (r.bufferAssignment || 0) + surplus));
  if (Math.abs(surplus) > 0.005) {
    patch.buffer_assignment = buffer;
    steps.push(
      surplus > 0
        ? `Park the remaining ${money(surplus)} in Buffer (${money(r.bufferAssignment || 0)} → ${money(buffer)}).`
        : `Release ${money(Math.abs(surplus))} from Buffer to close the over-allocation (${money(r.bufferAssignment || 0)} → ${money(buffer)}).`,
    );
    if (surplus < 0 && buffer === 0 && (r.bufferAssignment || 0) + surplus < -0.005) {
      steps.push(
        `Buffer cannot absorb all of it — ${money(Math.abs((r.bufferAssignment || 0) + surplus))} still needs a spending cut.`,
      );
    }
  }

  return { patch, steps, balanced: Object.keys(patch).length === 0 };
}

function money(n: number) {
  return `$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
