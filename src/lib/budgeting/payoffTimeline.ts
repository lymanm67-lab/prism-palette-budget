// Combined payoff timeline — every debt, every month, and the cash freed as each clears.
//
// Builds one month-by-month table across ALL debts so the cash-flow effect of
// each payment is visible: what leaves the account, what of it is interest,
// what reduces balances, and how much monthly cash is freed after each payoff.

import { addMonths, monthKey } from '@/lib/budgeting/debtAmortization';

export interface TimelineDebt {
  id: string;
  name: string;
  balance: number;
  apr: number;
  payment: number;
  /** Forgiveness-track debts are paid, never accelerated, and never "paid off". */
  forgiveness?: boolean;
  inSettlement?: boolean;
}

export interface TimelineMonth {
  month: string;
  monthLabel: string;
  /** Total leaving the account for debt this month. */
  payment: number;
  interest: number;
  principal: number;
  /** Combined remaining balance at month end. */
  endingBalance: number;
  /** Monthly payments no longer required, versus month 1. */
  freedCash: number;
  /** Debts that hit $0 in this month. */
  clearedThisMonth: { id: string; name: string; payment: number }[];
  perDebt: Record<string, number>;
}

export interface PayoffMilestone {
  id: string;
  name: string;
  payment: number;
  /** null when the payment never clears the balance. */
  payoffMonth: string | null;
  payoffLabel: string;
  monthsFromNow: number | null;
  interestPaid: number;
  /** Cumulative monthly cash freed once this debt clears. */
  cumulativeFreed: number;
  forgiveness: boolean;
}

export interface PayoffTimeline {
  months: TimelineMonth[];
  milestones: PayoffMilestone[];
  totalBalance: number;
  totalMonthlyPayment: number;
  totalInterest: number;
  debtFreeMonth: string | null;
  debtFreeLabel: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Simulate every debt in parallel at its own payment (no snowball rolling —
 * this shows the plan as it is actually funded today).
 */
export function buildPayoffTimeline(
  debts: TimelineDebt[],
  start: Date = new Date(),
  maxMonths = 480,
): PayoffTimeline {
  const state = debts.map((d) => ({
    debt: d,
    balance: Math.max(0, d.balance),
    interest: 0,
    clearedAt: null as number | null,
  }));

  const months: TimelineMonth[] = [];
  const startMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const baselinePayment = round2(debts.reduce((s, d) => s + (d.payment || 0), 0));
  let freed = 0;

  for (let i = 0; i < maxMonths; i++) {
    const active = state.filter((s) => s.balance > 0.01);
    if (!active.length) break;

    const d = addMonths(startMonth, i);
    let payment = 0;
    let interestMo = 0;
    let principalMo = 0;
    const cleared: TimelineMonth['clearedThisMonth'] = [];
    const perDebt: Record<string, number> = {};

    for (const s of active) {
      const rate = Math.max(0, s.debt.apr) / 100 / 12;
      const accrued = round2(s.balance * rate);
      const due = round2(s.balance + accrued);
      const pay = Math.min(s.debt.payment || 0, due);
      if (pay <= accrued + 0.005) {
        // Payment never clears interest — record it but the balance won't fall.
        payment += pay;
        interestMo += pay;
        perDebt[s.debt.id] = round2(pay);
        s.interest = round2(s.interest + pay);
        continue;
      }
      const principal = round2(pay - accrued);
      s.balance = round2(s.balance - principal);
      s.interest = round2(s.interest + accrued);
      payment += pay;
      interestMo += accrued;
      principalMo += principal;
      perDebt[s.debt.id] = round2(pay);

      if (s.balance <= 0.01) {
        s.balance = 0;
        s.clearedAt = i;
        cleared.push({ id: s.debt.id, name: s.debt.name, payment: round2(s.debt.payment || 0) });
      }
    }

    const endingBalance = round2(state.reduce((sum, s) => sum + s.balance, 0));
    freed = round2(freed + cleared.reduce((sum, c) => sum + c.payment, 0));

    months.push({
      month: monthKey(d),
      monthLabel: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      payment: round2(payment),
      interest: round2(interestMo),
      principal: round2(principalMo),
      endingBalance,
      freedCash: freed,
      clearedThisMonth: cleared,
      perDebt,
    });
  }

  // Milestones ordered by payoff month, then by size.
  let cumulative = 0;
  const milestones = state
    .map((s) => ({ s, at: s.clearedAt }))
    .sort((a, b) => {
      if (a.at === null && b.at === null) return b.s.balance - a.s.balance;
      if (a.at === null) return 1;
      if (b.at === null) return -1;
      return a.at - b.at;
    })
    .map(({ s, at }) => {
      const payment = round2(s.debt.payment || 0);
      if (at !== null) cumulative = round2(cumulative + payment);
      const date = at !== null ? addMonths(startMonth, at) : null;
      return {
        id: s.debt.id,
        name: s.debt.name,
        payment,
        payoffMonth: date ? monthKey(date) : null,
        payoffLabel: s.debt.forgiveness
          ? 'Forgiveness track'
          : date
            ? date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            : 'Not at this payment',
        monthsFromNow: at !== null ? at + 1 : null,
        interestPaid: s.interest,
        cumulativeFreed: cumulative,
        forgiveness: !!s.debt.forgiveness,
      } as PayoffMilestone;
    });

  const last = months[months.length - 1];
  const debtFree = last && last.endingBalance <= 0.01 ? last : null;

  return {
    months,
    milestones,
    totalBalance: round2(debts.reduce((s, d) => s + Math.max(0, d.balance), 0)),
    totalMonthlyPayment: baselinePayment,
    totalInterest: round2(state.reduce((s, x) => s + x.interest, 0)),
    debtFreeMonth: debtFree ? debtFree.month : null,
    debtFreeLabel: debtFree ? debtFree.monthLabel : 'Beyond the projection window',
  };
}
