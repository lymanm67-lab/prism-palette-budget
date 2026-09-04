// Applies real bank transactions to a debt's stored balance.
//
// `balance` on debt_items is the balance as of `balance_as_of`. Any matched
// payment dated AFTER that date has not been reflected yet, so we accrue
// interest day-by-day between payments and subtract the principal portion.

import { keysFor } from './debtActuals';

export interface PaymentTxn {
  id: string;
  date: string;
  merchant: string | null;
  description?: string | null;
  amount: number;
}

export interface AppliedPayment {
  id: string;
  date: string;
  merchant: string | null;
  amount: number;
  interest: number;
  principal: number;
  balanceAfter: number;
}

export interface DebtApplied {
  debtId: string;
  debtName: string;
  storedBalance: number;
  balanceAsOf: string | null;
  liveBalance: number;
  payments: AppliedPayment[];
  totalPaid: number;
  interestPaid: number;
  principalPaid: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const daysBetween = (a: string, b: string) =>
  Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));

export function applyPaymentsToDebt(
  debt: {
    id: string;
    name: string;
    balance: number | string | null;
    interest_rate?: number | string | null;
    balance_as_of?: string | null;
  },
  txns: PaymentTxn[],
): DebtApplied {
  const storedBalance = Number(debt.balance || 0);
  const apr = Number(debt.interest_rate || 0);
  const asOf = debt.balance_as_of || null;
  const keys = keysFor(debt.name);
  const hay = (t: PaymentTxn) => `${t.merchant || ''} ${t.description || ''}`;

  const matched = keys.length
    ? txns
        .filter(
          (t) =>
            Number(t.amount) < 0 &&
            (!asOf || t.date > asOf) &&
            keys.some((k) => k.test(hay(t))),
        )
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];

  let bal = storedBalance;
  let cursor = asOf || (matched[0]?.date ?? new Date().toISOString().slice(0, 10));
  const payments: AppliedPayment[] = [];

  for (const t of matched) {
    const days = daysBetween(cursor, t.date);
    const interest = bal > 0 && apr > 0 ? round2((bal * (apr / 100) * days) / 365) : 0;
    const paid = round2(Math.abs(Number(t.amount)));
    const principal = round2(Math.min(Math.max(paid - interest, 0), Math.max(bal + interest, 0)));
    bal = Math.max(0, round2(bal + interest - paid));
    cursor = t.date;
    payments.push({
      id: t.id,
      date: t.date,
      merchant: t.merchant,
      amount: paid,
      interest,
      principal,
      balanceAfter: bal,
    });
  }

  return {
    debtId: debt.id,
    debtName: debt.name,
    storedBalance: round2(storedBalance),
    balanceAsOf: asOf,
    liveBalance: round2(bal),
    payments: payments.slice().reverse(),
    totalPaid: round2(payments.reduce((s, p) => s + p.amount, 0)),
    interestPaid: round2(payments.reduce((s, p) => s + p.interest, 0)),
    principalPaid: round2(payments.reduce((s, p) => s + p.principal, 0)),
  };
}

export function summarizeApplied(rows: DebtApplied[]) {
  return {
    storedTotal: round2(rows.reduce((s, r) => s + r.storedBalance, 0)),
    liveTotal: round2(rows.reduce((s, r) => s + r.liveBalance, 0)),
    paidTotal: round2(rows.reduce((s, r) => s + r.totalPaid, 0)),
    principalTotal: round2(rows.reduce((s, r) => s + r.principalPaid, 0)),
    interestTotal: round2(rows.reduce((s, r) => s + r.interestPaid, 0)),
    pending: rows.filter((r) => r.payments.length > 0).length,
  };
}
