/**
 * Pure month-end leftover cash + sweep waterfall engine.
 *
 * Leftover cash = income received - actual spending - actual money moved out
 * (transfers to savings/debt/investing already counted elsewhere).
 *
 * The waterfall then assigns leftover cash to ordered destinations. The
 * emergency buffer is capped at its remaining need so the buffer is never
 * overfunded, and anything not claimed stays unassigned.
 */

const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type SweepMode = 'fixed' | 'percent' | 'remainder';

export const SWEEP_DESTINATIONS: { value: string; label: string }[] = [
  { value: 'buffer', label: 'Emergency fund / buffer' },
  { value: 'rollover_reserve', label: 'Rollover reserve (next month)' },
  { value: 'debt_payoff', label: 'Extra debt payoff' },
  { value: 'investing', label: 'Investing' },
  { value: 'retirement', label: 'Retirement' },
  { value: 'hsa', label: 'HSA' },
  { value: 'travel_fund', label: 'Travel fund' },
  { value: 'business_capital', label: 'Business capital reserve' },
  { value: 'sinking_fund', label: 'Sinking fund' },
  { value: 'giving', label: 'Giving' },
  { value: 'hold_cash', label: 'Hold as cash' },
];

export interface SweepRule {
  id?: string;
  priority: number;
  destination: string;
  destinationLabel?: string | null;
  mode: SweepMode;
  /** Dollar amount for fixed, percentage (0-100) for percent. */
  amount: number;
  /** Optional hard cap in dollars for this rule. */
  capAmount?: number | null;
  isActive?: boolean;
}

export interface LeftoverInput {
  incomeReceived: number;
  actualSpending: number;
  /** Money already moved out on purpose (savings, investing, extra debt). */
  actualTransfers?: number;
  /** Money already reserved inside categories that carry forward. */
  rolledForward?: number;
  /** Money already swept out of categories by category rules. */
  categorySwept?: number;
  bufferBalance?: number;
  bufferTarget?: number;
}

export interface LeftoverAllocation {
  destination: string;
  destinationLabel: string;
  amount: number;
  capped: boolean;
}

export interface LeftoverResult {
  leftoverCash: number;
  distributable: number;
  allocations: LeftoverAllocation[];
  totalAllocated: number;
  unassignedCash: number;
  bufferNeed: number;
}

export function computeLeftoverCash(input: LeftoverInput): number {
  return r2(
    (input.incomeReceived || 0) - Math.abs(input.actualSpending || 0) - Math.abs(input.actualTransfers || 0),
  );
}

export function runLeftoverWaterfall(input: LeftoverInput, rules: SweepRule[]): LeftoverResult {
  const leftoverCash = computeLeftoverCash(input);
  const reserved = r2(Math.max(0, input.rolledForward ?? 0) + Math.max(0, input.categorySwept ?? 0));
  const distributable = r2(Math.max(0, leftoverCash - reserved));

  const bufferNeed = r2(Math.max(0, (input.bufferTarget ?? 0) - (input.bufferBalance ?? 0)));
  let remaining = distributable;
  const allocations: LeftoverAllocation[] = [];

  const active = rules
    .filter((r) => r.isActive !== false)
    .slice()
    .sort((a, b) => a.priority - b.priority);

  for (const rule of active) {
    if (remaining <= 0) break;
    let want =
      rule.mode === 'fixed'
        ? r2(rule.amount || 0)
        : rule.mode === 'percent'
          ? r2((distributable * (rule.amount || 0)) / 100)
          : remaining;

    let capped = false;
    if (rule.capAmount != null && want > rule.capAmount) {
      want = r2(rule.capAmount);
      capped = true;
    }
    if (rule.destination === 'buffer' && want > bufferNeed) {
      want = bufferNeed;
      capped = true;
    }
    if (want > remaining) {
      want = remaining;
      capped = true;
    }
    if (want <= 0) continue;

    allocations.push({
      destination: rule.destination,
      destinationLabel:
        rule.destinationLabel ||
        SWEEP_DESTINATIONS.find((d) => d.value === rule.destination)?.label ||
        rule.destination,
      amount: r2(want),
      capped,
    });
    remaining = r2(remaining - want);
  }

  const totalAllocated = r2(allocations.reduce((t, a) => t + a.amount, 0));
  return {
    leftoverCash,
    distributable,
    allocations,
    totalAllocated,
    unassignedCash: r2(distributable - totalAllocated),
    bufferNeed,
  };
}

export interface MonthEndCloseSummary {
  month: string;
  incomeReceived: number;
  actualSpending: number;
  actualTransfers: number;
  leftoverCash: number;
  totalRolledForward: number;
  totalSwept: number;
  unassignedCash: number;
  allocations: LeftoverAllocation[];
}

export function buildMonthEndClose(
  month: string,
  input: LeftoverInput,
  rules: SweepRule[],
): MonthEndCloseSummary {
  const waterfall = runLeftoverWaterfall(input, rules);
  return {
    month,
    incomeReceived: r2(input.incomeReceived || 0),
    actualSpending: r2(Math.abs(input.actualSpending || 0)),
    actualTransfers: r2(Math.abs(input.actualTransfers || 0)),
    leftoverCash: waterfall.leftoverCash,
    totalRolledForward: r2(Math.max(0, input.rolledForward ?? 0)),
    totalSwept: r2(Math.max(0, input.categorySwept ?? 0) + waterfall.totalAllocated),
    unassignedCash: waterfall.unassignedCash,
    allocations: waterfall.allocations,
  };
}
