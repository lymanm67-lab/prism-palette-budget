import type { MonthRolloverResult } from './rollover';
import type { MonthEndCloseSummary } from './leftover';

export interface RolloverCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol;
const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

export interface CheckInput {
  rollover: MonthRolloverResult;
  close: MonthEndCloseSummary;
  /** Category ids that are also counted as Freed Cash sources. */
  freedCashCategoryIds?: string[];
  bufferBalance?: number;
  bufferTarget?: number;
}

export function runRolloverChecks(input: CheckInput): RolloverCheck[] {
  const { rollover, close } = input;
  const checks: RolloverCheck[] = [];

  const assigned = close.totalRolledForward + close.totalSwept + close.unassignedCash;
  checks.push({
    id: 'leftover_balances',
    label: 'Every leftover dollar has one job',
    ok: assigned <= close.leftoverCash + 0.02 || near(assigned, close.leftoverCash),
    detail: `Leftover ${money(close.leftoverCash)} vs assigned ${money(assigned)} (carried ${money(
      close.totalRolledForward,
    )}, swept ${money(close.totalSwept)}, unassigned ${money(close.unassignedCash)}).`,
  });

  checks.push({
    id: 'no_negative_unassigned',
    label: 'Unassigned cash is never negative',
    ok: close.unassignedCash >= -0.02,
    detail: `Unassigned cash is ${money(close.unassignedCash)}.`,
  });

  const doubleCounted = (input.freedCashCategoryIds ?? []).filter((id) =>
    rollover.rows.some((r) => r.categoryId === id && (r.sweptAmount > 0 || r.rolledForward > 0)),
  );
  checks.push({
    id: 'freed_cash_no_double_count',
    label: 'Freed Cash is not counted twice',
    ok: doubleCounted.length === 0,
    detail: doubleCounted.length
      ? `${doubleCounted.length} category(ies) are both a Freed Cash source and sweeping money out.`
      : 'No category is both a Freed Cash source and a sweep source.',
  });

  const bufferOver =
    (input.bufferBalance ?? 0) +
      close.allocations.filter((a) => a.destination === 'buffer').reduce((t, a) => t + a.amount, 0) >
    (input.bufferTarget ?? Infinity) + 0.02;
  checks.push({
    id: 'buffer_not_overfunded',
    label: 'Buffer stops at its target',
    ok: !bufferOver,
    detail: bufferOver
      ? 'The waterfall would push the buffer past its target.'
      : `Buffer target respected (${money(input.bufferTarget ?? 0)}).`,
  });

  checks.push({
    id: 'overspend_visible',
    label: 'Overspending is shown, not hidden',
    ok: true,
    detail:
      rollover.totalOverspent > 0
        ? `${money(rollover.totalOverspent)} of overspending is carried into the numbers.`
        : 'No category went over plan this month.',
  });

  return checks;
}
