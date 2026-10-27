import { allocate, BUCKETS, stageFor, targets, toCents, vacationSlice, type PlanInputs } from './engine';

export const FUNDING_PREFIX = 'Five-Bucket · ';
export const fundingName = (key: string) => FUNDING_PREFIX + (BUCKETS.find(b => b.key === key)?.label || key);

export function budgetFunding(inputs: PlanInputs, unallocated: number, month: string) {
  const available = Math.max(0, toCents(unallocated));
  const yearIndex = Math.max(0, Math.min(11, Number(month.slice(5, 7)) - 1));
  const allocation = allocate(inputs, available, toCents(inputs.startEmergency),
    Math.max(0, toCents(inputs.vacationAnnual) - toCents(inputs.startVacation)),
    vacationSlice(toCents(inputs.vacationAnnual), yearIndex));
  return { allocation, stage: stageFor(toCents(inputs.startEmergency), targets(inputs)),
    total: BUCKETS.reduce((sum, b) => sum + allocation[b.key], 0), available };
}

/** Saved funding REPLACES model surplus; net-pay deductions and consulting must not be added again. */
export function withBudgetFunding(inputs: PlanInputs, amount: number, month: string): PlanInputs {
  return { ...inputs, takeHome: inputs.expenses + amount, takeHomeReduction: 0,
    consultingEnabled: false, startYear: Number(month.slice(0, 4)), startMonth: Number(month.slice(5, 7)) };
}