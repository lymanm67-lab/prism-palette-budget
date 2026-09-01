// Debt amortization + snowball engine (PrismMoney Session 4)
//
// Every payoff date in the UI is *computed* from balance / APR / payment.
// Nothing here is hard-coded to a calendar date.

export interface DebtInput {
  id: string;
  name: string;
  balance: number;
  /** annual percentage rate, e.g. 35.99 */
  apr: number;
  minimumPayment: number;
  extraPayment: number;
  dueDay?: number | null;
  /** A second, separately billed payment (e.g. BetrLink $49). */
  separatePayment?: number;
  inSettlement?: boolean;
  /** Present when the debt is on a forgiveness track. */
  pslf?: { made: number; required: number; forgivenessDate?: string | null } | null;
  businessSplitPct?: number;
}

export interface PayoffResult {
  months: number;
  payoffDate: Date | null;
  totalInterest: number;
  neverPaysOff: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function addMonths(d: Date, n: number) {
  const out = new Date(d.getFullYear(), d.getMonth() + n, 1);
  return out;
}

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function parseMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1);
}

/**
 * Amortise a balance at `payment` per month. Returns the number of months,
 * the projected payoff month and the interest paid getting there.
 */
export function projectPayoff(
  balance: number,
  apr: number,
  payment: number,
  start: Date = new Date(),
  maxMonths = 600,
): PayoffResult {
  let bal = Math.max(0, balance);
  if (bal === 0) return { months: 0, payoffDate: start, totalInterest: 0, neverPaysOff: false };
  if (payment <= 0) return { months: Infinity, payoffDate: null, totalInterest: 0, neverPaysOff: true };

  const r = Math.max(0, apr) / 100 / 12;
  let interest = 0;
  let months = 0;

  while (bal > 0.01 && months < maxMonths) {
    const accrued = bal * r;
    if (payment <= accrued + 0.01) {
      return { months: Infinity, payoffDate: null, totalInterest: round2(interest), neverPaysOff: true };
    }
    interest += accrued;
    bal = bal + accrued - payment;
    months += 1;
  }

  if (months >= maxMonths && bal > 0.01) {
    return { months: Infinity, payoffDate: null, totalInterest: round2(interest), neverPaysOff: true };
  }

  return {
    months,
    payoffDate: addMonths(start, months - 1),
    totalInterest: round2(interest),
    neverPaysOff: false,
  };
}

export interface DebtCardMetrics {
  debt: DebtInput;
  totalPayment: number;
  current: PayoffResult;
  original: PayoffResult;
  monthsAccelerated: number;
  interestAvoided: number;
  isForgiveness: boolean;
}

/** Current plan (minimum + extra) vs the original plan (minimum only). */
export function debtCardMetrics(debt: DebtInput, start: Date = new Date()): DebtCardMetrics {
  const totalPayment = round2((debt.minimumPayment || 0) + (debt.extraPayment || 0));
  const current = projectPayoff(debt.balance, debt.apr, totalPayment, start);
  const original = projectPayoff(debt.balance, debt.apr, debt.minimumPayment || 0, start);

  const monthsAccelerated =
    Number.isFinite(original.months) && Number.isFinite(current.months)
      ? Math.max(0, original.months - current.months)
      : 0;
  const interestAvoided =
    Number.isFinite(original.totalInterest) && Number.isFinite(current.totalInterest)
      ? Math.max(0, round2(original.totalInterest - current.totalInterest))
      : 0;

  return {
    debt,
    totalPayment,
    current,
    original,
    monthsAccelerated,
    interestAvoided,
    isForgiveness: !!debt.pslf,
  };
}

export interface SnowballStep {
  debtId: string;
  name: string;
  minimumPayment: number;
  extraPayment: number;
  /** minimum + extra + everything rolled in from cleared debts */
  totalPayment: number;
  rolledInFrom: { name: string; amount: number }[];
  payoffMonths: number;
  payoffDate: Date | null;
  interestPaid: number;
}

/**
 * Snowball the given debts in the supplied order: when one clears, its whole
 * payment rolls into the next, and the card names where every extra dollar
 * came from.
 */
export function snowballPlan(debts: DebtInput[], start: Date = new Date()): SnowballStep[] {
  const steps: SnowballStep[] = [];
  let rolled: { name: string; amount: number }[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);

  for (const d of debts) {
    const rolledTotal = rolled.reduce((s, r) => s + r.amount, 0);
    const total = round2((d.minimumPayment || 0) + (d.extraPayment || 0) + rolledTotal);
    const res = projectPayoff(d.balance, d.apr, total, cursor);

    steps.push({
      debtId: d.id,
      name: d.name,
      minimumPayment: round2(d.minimumPayment || 0),
      extraPayment: round2(d.extraPayment || 0),
      totalPayment: total,
      rolledInFrom: [...rolled],
      payoffMonths: res.months,
      payoffDate: res.payoffDate,
      interestPaid: res.totalInterest,
    });

    rolled = [...rolled, { name: d.name, amount: total }];
    if (Number.isFinite(res.months)) cursor = addMonths(cursor, res.months);
  }

  return steps;
}

/** Remaining PSLF payments and the resulting forgiveness month. */
export function pslfStatus(debt: DebtInput, start: Date = new Date()) {
  const made = debt.pslf?.made ?? 0;
  const required = debt.pslf?.required ?? 120;
  const remaining = Math.max(0, required - made);
  const forgiveness = debt.pslf?.forgivenessDate
    ? new Date(debt.pslf.forgivenessDate)
    : addMonths(start, remaining - 1);
  return { made, required, remaining, forgiveness };
}
