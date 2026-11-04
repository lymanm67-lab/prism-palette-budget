/**
 * Vacation Loan payoff engine (Loans 2306 and 3006). Pure, cents-based.
 * Interest is an ESTIMATE using simple daily interest (APR / 365) unless
 * a lender payoff quote valid for the payoff date is entered.
 */
export const APR = 0.3599;
export const LOAN_2306 = { balance: 601.2, iucu: 450.2, myusa: 151 };
export const LOAN_3006 = {
  balance: 2804.2,
  startMonth: '2026-12',
  sources: { regular: 228.47, redirect2306: 155.43, debtRedirects: 246.2, myusa: 250, iucuExtra: 54 },
};
export const FULL_3006_PAYMENT = 934.1;
export const WITHOUT_REDIRECT_3006 = 778.67;

export type PaymentStatus = 'planned' | 'pending' | 'posted';

export interface Loan2306State {
  balance: number; asOf: string; iucuDate: string; myusaDate: string;
  quoteAmount: number | null; quoteGoodThrough: string; lenderZero: boolean;
}
export interface Loan3006Payment { status: PaymentStatus; amount: number | null; date?: string }
export interface Loan3006State {
  balance: number; asOf: string; postingDay: number | null;
  quoteAmount: number | null; quoteGoodThrough: string; lenderZero: boolean;
  payments: Record<string, Loan3006Payment>; // key yyyy-MM
}

const c = (n: number) => Math.round(n * 100);
const d = (cents: number) => cents / 100;
const days = (from: string, to: string) =>
  Math.max(0, Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000));
export const interestCents = (balCents: number, from: string, to: string, apr = APR) =>
  Math.round((balCents * apr * days(from, to)) / 365);

export function plan2306(s: Loan2306State) {
  const missing: string[] = [];
  if (!s.asOf) missing.push('balance as-of date');
  if (!s.iucuDate) missing.push('IUCU posting date');
  if (!s.myusaDate) missing.push('MyUSA posting date');
  const payoffDate = [s.iucuDate, s.myusaDate].filter(Boolean).sort().pop() || '';
  const quoteValid = !!(s.quoteAmount && s.quoteGoodThrough && payoffDate && s.quoteGoodThrough >= payoffDate);
  if (missing.length && !quoteValid) {
    return { estimated: false as const, missing, payoffDate, interest: null, required: null, iucuNeeded: null, extraFromIucu: null, quoteValid, paidOff: s.lenderZero };
  }
  let requiredC: number, interestC = 0;
  if (quoteValid) {
    requiredC = c(s.quoteAmount!);
    interestC = Math.max(0, requiredC - c(s.balance));
  } else {
    // Apply payments in posting order, accruing daily interest between.
    const events = [{ date: s.myusaDate, amt: c(LOAN_2306.myusa) }, { date: s.iucuDate, amt: Infinity }]
      .sort((a, b) => a.date.localeCompare(b.date));
    let bal = c(s.balance), last = s.asOf, paidOther = 0;
    for (const e of events) {
      const i = interestCents(bal, last, e.date); interestC += i; bal += i; last = e.date;
      if (e.amt === Infinity) { break; }
      bal -= e.amt; paidOther += e.amt;
    }
    requiredC = c(s.balance) + interestC;
  }
  const iucuNeededC = Math.max(0, requiredC - c(LOAN_2306.myusa));
  return {
    estimated: !quoteValid, missing, payoffDate, quoteValid, paidOff: s.lenderZero,
    interest: d(interestC), required: d(requiredC), iucuNeeded: d(iucuNeededC),
    extraFromIucu: d(Math.max(0, iucuNeededC - c(LOAN_2306.iucu))),
  };
}

export function monthly3006(redirectActive: boolean) {
  return redirectActive ? FULL_3006_PAYMENT : WITHOUT_REDIRECT_3006;
}

export interface Row3006 {
  month: string; postingDate: string; begin: number; interest: number;
  planned: number; posted: number | null; status: PaymentStatus; payment: number; end: number; unused: number; final: boolean;
}

const addMonth = (ym: string, n: number) => {
  const [y, m] = ym.split('-').map(Number); const t = y * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`;
};
const postingFor = (ym: string, day: number) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return `${ym}-${String(Math.min(day, last)).padStart(2, '0')}`;
};

export function schedule3006(s: Loan3006State, loan2306PaidOff: boolean, maxMonths = 24) {
  const missing: string[] = [];
  if (!s.asOf) missing.push('balance as-of date');
  if (!s.postingDay) missing.push('expected monthly posting day');
  if (missing.length) return { rows: [] as Row3006[], missing, payoffMonth: null as string | null, totalInterest: 0 };
  const rows: Row3006[] = [];
  let bal = c(s.balance), last = s.asOf, totalI = 0;
  for (let i = 0; i < maxMonths && bal > 0 && !s.lenderZero; i++) {
    const month = addMonth(LOAN_3006.startMonth, i);
    const rec = s.payments[month];
    const postingDate = rec?.date || postingFor(month, s.postingDay!);
    const intC = interestCents(bal, last, postingDate);
    const owed = bal + intC;
    // Redirect only after 2306 confirmed paid off; counted once.
    const plannedC = c(monthly3006(loan2306PaidOff));
    const quoteOk = !!(s.quoteAmount && s.quoteGoodThrough && s.quoteGoodThrough >= postingDate && plannedC >= c(s.quoteAmount));
    const capC = quoteOk ? c(s.quoteAmount!) : owed;
    const postedC = rec?.status === 'posted' && rec.amount != null ? c(rec.amount) : null;
    const payC = postedC ?? Math.min(plannedC, capC);
    const endC = quoteOk && postedC == null ? 0 : Math.max(0, owed - payC);
    const final = endC === 0;
    rows.push({
      month, postingDate, begin: d(bal), interest: d(intC), planned: d(plannedC), posted: postedC == null ? null : d(postedC),
      status: rec?.status || 'planned', payment: d(payC), end: d(endC), unused: final ? d(Math.max(0, plannedC - payC)) : 0, final,
    });
    totalI += intC; bal = endC; last = postingDate;
  }
  return { rows, missing, payoffMonth: rows.find(r => r.final)?.month ?? null, totalInterest: d(totalI) };
}

export const DEFAULT_STATE = {
  l2306: { balance: LOAN_2306.balance, asOf: '', iucuDate: '', myusaDate: '', quoteAmount: null, quoteGoodThrough: '', lenderZero: false } as Loan2306State,
  l3006: { balance: LOAN_3006.balance, asOf: '', postingDay: null, quoteAmount: null, quoteGoodThrough: '', lenderZero: false, payments: {} } as Loan3006State,
};
