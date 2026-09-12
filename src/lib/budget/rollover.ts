/**
 * Pure monthly rollover engine.
 *
 * Rules per category:
 *  - reset  : unused money returns to the month-end leftover pool (nothing carries)
 *  - full   : full unused balance carries into next month (overspend carries as negative)
 *  - sweep  : unused money is swept to a destination (buffer, debt, investing, ...)
 *  - hybrid : keep up to `keepAmount` in the category, sweep the rest
 */

export type RolloverRule = 'reset' | 'full' | 'sweep' | 'hybrid';

export const ROLLOVER_RULES: { value: RolloverRule; label: string; help: string }[] = [
  { value: 'reset', label: 'Reset each month', help: 'Unused money goes back to the leftover pool at month end.' },
  { value: 'full', label: 'Carry everything forward', help: 'Whatever is left stays in this category next month.' },
  { value: 'sweep', label: 'Sweep it out', help: 'Anything left is moved to the destination you pick.' },
  { value: 'hybrid', label: 'Keep some, sweep the rest', help: 'Keep a set amount here, move the rest to your destination.' },
];

export interface CategoryRolloverInput {
  categoryId: string;
  name?: string;
  rule: RolloverRule;
  keepAmount?: number;
  sweepDestination?: string | null;
  /** Planned amount for the month. */
  planned: number;
  /** Actual spending for the month, as a positive number. */
  actual: number;
  /** Balance carried in from the prior month (may be negative). */
  beginningRollover?: number;
}

export interface CategoryRolloverResult {
  categoryId: string;
  name?: string;
  rule: RolloverRule;
  beginningRollover: number;
  planned: number;
  available: number;
  actual: number;
  endingBalance: number;
  rolledForward: number;
  sweptAmount: number;
  sweepDestination: string | null;
  overspent: number;
  /** Portion released to the month-end leftover pool. */
  releasedToLeftover: number;
}

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function computeCategoryRollover(input: CategoryRolloverInput): CategoryRolloverResult {
  const beginning = r2(input.beginningRollover ?? 0);
  const planned = r2(input.planned || 0);
  const actual = r2(Math.abs(input.actual || 0));
  const available = r2(planned + beginning);
  const ending = r2(available - actual);
  const positive = Math.max(ending, 0);
  const overspent = ending < 0 ? r2(-ending) : 0;

  let rolledForward = 0;
  let swept = 0;
  let released = 0;

  switch (input.rule) {
    case 'full':
      rolledForward = ending; // negative balances carry too
      break;
    case 'sweep':
      swept = positive;
      break;
    case 'hybrid': {
      const keep = Math.min(positive, Math.max(0, r2(input.keepAmount ?? 0)));
      rolledForward = keep;
      swept = r2(positive - keep);
      break;
    }
    case 'reset':
    default:
      released = positive;
      break;
  }

  return {
    categoryId: input.categoryId,
    name: input.name,
    rule: input.rule,
    beginningRollover: beginning,
    planned,
    available,
    actual,
    endingBalance: ending,
    rolledForward: r2(rolledForward),
    sweptAmount: r2(swept),
    sweepDestination: swept > 0 ? input.sweepDestination ?? 'buffer' : null,
    overspent,
    releasedToLeftover: r2(released),
  };
}

export interface MonthRolloverResult {
  rows: CategoryRolloverResult[];
  totalPlanned: number;
  totalActual: number;
  totalRolledForward: number;
  totalSwept: number;
  totalReleasedToLeftover: number;
  totalOverspent: number;
  sweptByDestination: Record<string, number>;
}

export function computeMonthRollover(inputs: CategoryRolloverInput[]): MonthRolloverResult {
  const rows = inputs.map(computeCategoryRollover);
  const sweptByDestination: Record<string, number> = {};
  for (const row of rows) {
    if (row.sweptAmount > 0 && row.sweepDestination) {
      sweptByDestination[row.sweepDestination] = r2(
        (sweptByDestination[row.sweepDestination] ?? 0) + row.sweptAmount,
      );
    }
  }
  const sum = (fn: (r: CategoryRolloverResult) => number) => r2(rows.reduce((t, r) => t + fn(r), 0));
  return {
    rows,
    totalPlanned: sum((r) => r.planned),
    totalActual: sum((r) => r.actual),
    totalRolledForward: sum((r) => r.rolledForward),
    totalSwept: sum((r) => r.sweptAmount),
    totalReleasedToLeftover: sum((r) => r.releasedToLeftover),
    totalOverspent: sum((r) => r.overspent),
    sweptByDestination,
  };
}

/** Beginning rollover map for the next month, keyed by category id. */
export function nextMonthBeginningRollover(result: MonthRolloverResult): Record<string, number> {
  const map: Record<string, number> = {};
  for (const row of result.rows) {
    if (row.rolledForward !== 0) map[row.categoryId] = row.rolledForward;
  }
  return map;
}
