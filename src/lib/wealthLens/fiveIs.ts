export type LeakArea = 'income' | 'irs' | 'interest' | 'investments' | 'insurance';
export type LeakStatus = 'working' | 'leak' | 'unsure' | 'na';
export type LeakKind = 'savings' | 'income';

export const LEAK_AREAS: { id: LeakArea; name: string; check: string; kind: LeakKind }[] = [
  { id: 'income', name: 'Income (Value)', check: 'Underpricing, unpaid work, or skills that could create more income.', kind: 'income' },
  { id: 'irs', name: 'IRS (Taxes)', check: 'Missing records and potentially overlooked deductions, credits, or eligible tax benefits to review.', kind: 'savings' },
  { id: 'interest', name: 'Interest (Make It Work for You)', check: 'Interest earned versus interest paid, including costly debt and fees.', kind: 'savings' },
  { id: 'investments', name: 'Investments (Compounding)', check: "Contribution consistency, fees, and whether investments fit the user's goals and time horizon.", kind: 'savings' },
  { id: 'insurance', name: 'Insurance (Coverage and Deductibles)', check: 'Coverage gaps, overlapping policies, and deductibles the user could realistically afford.', kind: 'savings' },
];

export interface LeakEntry { status: LeakStatus; amount?: number; period: 'monthly' | 'annual' }
export type LeakCheck = Partial<Record<LeakArea, LeakEntry>>;

export const monthlyOf = (e?: LeakEntry) =>
  !e || !e.amount || e.amount < 0 ? 0 : e.period === 'annual' ? e.amount / 12 : e.amount;

/** Possible savings and possible income gains are totaled separately (monthly). */
export function leakTotals(check: LeakCheck) {
  let savings = 0, income = 0;
  for (const a of LEAK_AREAS) {
    const e = check[a.id];
    if (!e || e.status !== 'leak') continue;
    if (a.kind === 'income') income += monthlyOf(e); else savings += monthlyOf(e);
  }
  return { savings, income };
}

/** The one chosen item, as a scenario adjustment. Applying twice returns the same result. */
export function leakAdjustment(check: LeakCheck, focus?: LeakArea) {
  if (!focus) return { spendingCut: 0, incomeGain: 0 };
  const area = LEAK_AREAS.find((a) => a.id === focus)!;
  const e = check[focus];
  const m = e?.status === 'leak' ? monthlyOf(e) : 0;
  return area.kind === 'income' ? { spendingCut: 0, incomeGain: m } : { spendingCut: m, incomeGain: 0 };
}
