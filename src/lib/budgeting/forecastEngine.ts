// Zero-based month-by-month forecast engine (PrismMoney Session 6)
//
// Pure functions only, so the What-If simulator can re-run the whole forecast
// on every keystroke without touching the database.

import { CORE_TARGETS, type MoneyPurpose } from '@/lib/budgeting/moneyPurpose';

export interface ForecastLine {
  label: string;
  amount: number;
  startMonth?: string;
  endMonth?: string | null;
}

export interface ForecastDebt {
  id: string;
  name: string;
  balance: number;
  apr: number;
  minimum: number;
  extra: number;
  /** Second, separately billed payment (e.g. BetrLink $49). */
  separatePayment?: number;
  separateEndMonth?: string | null;
  startMonth?: string | null;
  /** Payments stop after this month whatever the balance (settlement plans). */
  endMonth?: string | null;
  isBusiness?: boolean;
  isForgiveness?: boolean;
  /** Lower = paid first; its whole payment then rolls into the next in order. */
  snowballOrder?: number | null;
}

export interface ForecastAssumptions {
  startMonth: string;
  months: number;
  takeHome: number;
  liveLines: ForecastLine[];
  enjoyPlanned: number;
  businessLines: ForecastLine[];
  debts: ForecastDebt[];
  /** Take-home dollars sent to wealth, effective-dated. */
  wealthTakeHome: { fromMonth: string; amount: number }[];
  /** Informational only — never deducted from take-home again. */
  employeePayrollWealth: number;
  employerRetirement: number;
  /** e.g. [{ month: '2027-01', amount: 500 }, { month: '2027-07', amount: 500 }] */
  employerHsa: { month: string; amount: number }[];
  bufferStarting: number;
  bufferOneTimes: { month: string; label: string; amount: number }[];
  /** Raise redirected rather than absorbed by lifestyle. */
  raise?: { month: string; amount: number; target: string } | null;
  /** Travel fund activation once the vacation debt clears. */
  travelFundMonthly?: number;
  vacationDebtIds?: string[];
  /** Redirect rows purely for change-flag annotation. */
  redirects?: { startMonth: string; sourceLabel: string; targetLabel: string; amount: number }[];
}

export type ChangeFlag =
  | 'payment_ended'
  | 'subscription_added'
  | 'employer_hsa'
  | 'raise_redirected'
  | 'fee_paid'
  | 'loan_cleared'
  | 'travel_fund_activated'
  | 'redirect_starts';

export const CHANGE_FLAG_LABEL: Record<ChangeFlag, string> = {
  payment_ended: 'Payment ended',
  subscription_added: 'Subscription added',
  employer_hsa: 'Employer HSA received',
  raise_redirected: 'Raise redirected',
  fee_paid: 'Fee paid',
  loan_cleared: 'Loan cleared',
  travel_fund_activated: 'Vacation Fund activated',
  redirect_starts: 'Redirect starts',
};

export interface ForecastMonth {
  month: string;
  takeHome: number;
  live: number;
  enjoy: number;
  buildWealthTakeHome: number;
  buildWealthEmployee: number;
  buildWealthEmployer: number;
  buildWealthCombined: number;
  eliminateDebt: number;
  business: number;
  bufferAddition: number;
  bufferOneTime: number;
  bufferEnding: number;
  unassigned: number;
  pct: Record<'live' | 'enjoy' | 'build_wealth' | 'eliminate_debt', number>;
  targetPct: Record<'live' | 'enjoy' | 'build_wealth' | 'eliminate_debt', number>;
  flags: { flag: ChangeFlag; detail: string }[];
  debtBalances: { id: string; name: string; balance: number; payment: number }[];
  travelFund: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function nextMonth(key: string) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, (m || 1) - 1 + 1, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

const activeIn = (line: ForecastLine, month: string) =>
  (!line.startMonth || line.startMonth <= month) && (!line.endMonth || line.endMonth >= month);

function wealthTakeHomeFor(a: ForecastAssumptions, month: string) {
  const applicable = a.wealthTakeHome
    .filter((w) => w.fromMonth <= month)
    .sort((x, y) => x.fromMonth.localeCompare(y.fromMonth));
  return applicable.length ? applicable[applicable.length - 1].amount : 0;
}

export function buildForecast(a: ForecastAssumptions): ForecastMonth[] {
  const out: ForecastMonth[] = [];
  const balances = new Map<string, number>(a.debts.map((d) => [d.id, Math.max(0, d.balance)]));
  const cleared = new Set<string>();
  const snowballed = [...a.debts]
    .filter((d) => d.snowballOrder != null)
    .sort((x, y) => (x.snowballOrder! - y.snowballOrder!));

  let month = a.startMonth;
  let buffer = a.bufferStarting;
  let travelFundActive = false;
  let travelFundTotal = 0;
  let prevWealth = wealthTakeHomeFor(a, a.startMonth);
  let prevLive = 0;

  for (let i = 0; i < a.months; i++) {
    const flags: { flag: ChangeFlag; detail: string }[] = [];

    // ── Income (raise is redirected, not absorbed) ──────────────────────────
    let takeHome = a.takeHome;
    let raiseRedirect = 0;
    if (a.raise && a.raise.month <= month) {
      raiseRedirect = a.raise.amount;
      takeHome = round2(takeHome + a.raise.amount);
      if (a.raise.month === month) {
        flags.push({
          flag: 'raise_redirected',
          detail: `$${a.raise.amount.toFixed(2)} raise → ${a.raise.target}`,
        });
      }
    }

    // ── LIVE ───────────────────────────────────────────────────────────────
    const liveActive = a.liveLines.filter((l) => activeIn(l, month));
    const live = round2(liveActive.reduce((s, l) => s + l.amount, 0));
    for (const l of liveActive) {
      if (l.startMonth === month && i > 0) {
        flags.push({ flag: 'subscription_added', detail: `${l.label} $${l.amount.toFixed(2)}` });
      }
      if (l.endMonth === month) {
        flags.push({ flag: 'payment_ended', detail: `${l.label} ends` });
      }
    }
    if (prevLive && live < prevLive - 0.01 && !flags.some((f) => f.flag === 'payment_ended')) {
      flags.push({ flag: 'payment_ended', detail: 'A Live obligation ended' });
    }
    prevLive = live;

    // ── ENJOY (+ Travel Fund once vacation debt clears) ────────────────────
    let enjoy = a.enjoyPlanned;
    if (travelFundActive && a.travelFundMonthly) {
      enjoy = round2(enjoy + a.travelFundMonthly);
      travelFundTotal = round2(travelFundTotal + a.travelFundMonthly);
    }

    // ── BUSINESS ───────────────────────────────────────────────────────────
    const bizActive = a.businessLines.filter((l) => activeIn(l, month));
    let business = round2(bizActive.reduce((s, l) => s + l.amount, 0));
    for (const l of bizActive) {
      if (l.startMonth === month && i > 0) {
        flags.push({ flag: 'subscription_added', detail: `${l.label} $${l.amount.toFixed(2)} (business)` });
      }
    }

    // ── DEBT (per-debt simulation with snowball rollover) ──────────────────
    let rollover = 0;
    for (const d of snowballed) {
      if (cleared.has(d.id)) rollover = round2(rollover + d.minimum + d.extra);
      else break;
    }

    let debtTotal = 0;
    const debtBalances: ForecastMonth['debtBalances'] = [];

    for (const d of a.debts) {
      const bal = balances.get(d.id) ?? 0;
      const startedYet = !d.startMonth || d.startMonth <= month;
      const stillScheduled = !d.endMonth || d.endMonth >= month;

      if (d.endMonth && d.endMonth === nextMonth(month)) {
        // no-op; the flag fires the month after payments stop
      }

      let payment = 0;
      if (startedYet && stillScheduled && (bal > 0.01 || d.isForgiveness || d.endMonth)) {
        payment = d.minimum + d.extra;
        if (d.separatePayment && (!d.separateEndMonth || d.separateEndMonth >= month)) {
          payment += d.separatePayment;
        }
        if (d.separateEndMonth && nextMonth(d.separateEndMonth) === month) {
          flags.push({ flag: 'payment_ended', detail: `${d.name}: separate payment ended` });
        }
        // Snowball rollover only feeds the next un-cleared snowball debt.
        if (d.snowballOrder != null && !cleared.has(d.id)) {
          const firstOpen = snowballed.find((s) => !cleared.has(s.id));
          if (firstOpen && firstOpen.id === d.id) payment = round2(payment + rollover);
        }
      }

      if (d.startMonth === month && i > 0 && payment > 0) {
        flags.push({ flag: 'subscription_added', detail: `${d.name} payment begins` });
      }

      // Forgiveness debts pay the required amount only; no extra principal.
      let newBal = bal;
      if (payment > 0 && bal > 0) {
        const interest = (bal * Math.max(0, d.apr)) / 100 / 12;
        newBal = Math.max(0, round2(bal + interest - payment));
        if (newBal <= 0.01 && !cleared.has(d.id)) {
          cleared.add(d.id);
          flags.push({ flag: 'loan_cleared', detail: `${d.name} paid off` });
          if ((a.vacationDebtIds || []).includes(d.id)) {
            const remainingVacation = (a.vacationDebtIds || []).some(
              (id) => id !== d.id && (balances.get(id) ?? 0) > 0.01,
            );
            if (!remainingVacation && a.travelFundMonthly) {
              travelFundActive = true;
              flags.push({
                flag: 'travel_fund_activated',
                detail: `Vacation debt at $0 → Travel Fund $${a.travelFundMonthly.toFixed(2)}/mo`,
              });
            }
          }
        }
      }
      balances.set(d.id, newBal);

      if (d.endMonth && nextMonth(d.endMonth) === month) {
        flags.push({ flag: 'payment_ended', detail: `${d.name}: scheduled payments ended` });
      }

      if (d.isBusiness) business = round2(business + payment);
      else debtTotal = round2(debtTotal + payment);

      debtBalances.push({ id: d.id, name: d.name, balance: newBal, payment: round2(payment) });
    }

    // ── WEALTH ─────────────────────────────────────────────────────────────
    const wealthTakeHome = round2(wealthTakeHomeFor(a, month) + (raiseRedirect || 0));
    if (wealthTakeHome > prevWealth + 0.01 && i > 0) {
      flags.push({
        flag: 'redirect_starts',
        detail: `Build Wealth take-home rises to $${wealthTakeHome.toFixed(2)}`,
      });
    }
    prevWealth = wealthTakeHome;

    const hsa = a.employerHsa
      .filter((h) => h.month === month)
      .reduce((s, h) => s + h.amount, 0);
    if (hsa > 0) {
      flags.push({ flag: 'employer_hsa', detail: `Employer HSA $${hsa.toFixed(2)} (informational)` });
    }

    const employer = round2(a.employerRetirement + hsa);
    const combined = round2(wealthTakeHome + a.employeePayrollWealth + employer);

    // ── BUFFER ─────────────────────────────────────────────────────────────
    const oneTimes = a.bufferOneTimes.filter((o) => o.month === month);
    const oneTimeTotal = round2(oneTimes.reduce((s, o) => s + o.amount, 0));
    for (const o of oneTimes) {
      flags.push({ flag: 'fee_paid', detail: `${o.label} $${o.amount.toFixed(2)} from Buffer` });
    }

    const spent = round2(live + enjoy + wealthTakeHome + debtTotal + business);
    const unassignedRaw = round2(takeHome - spent);
    const bufferAddition = round2(Math.max(0, unassignedRaw));
    buffer = round2(buffer + bufferAddition - oneTimeTotal);

    for (const r of a.redirects || []) {
      if (r.startMonth === month) {
        flags.push({
          flag: 'redirect_starts',
          detail: `${r.sourceLabel} → ${r.targetLabel} $${r.amount.toFixed(2)}`,
        });
      }
    }

    const p = (n: number) => (takeHome > 0 ? round2((n / takeHome) * 100) : 0);

    out.push({
      month,
      takeHome,
      live,
      enjoy,
      buildWealthTakeHome: wealthTakeHome,
      buildWealthEmployee: a.employeePayrollWealth,
      buildWealthEmployer: employer,
      buildWealthCombined: combined,
      eliminateDebt: debtTotal,
      business,
      bufferAddition,
      bufferOneTime: oneTimeTotal,
      bufferEnding: buffer,
      unassigned: unassignedRaw,
      pct: {
        live: p(live),
        enjoy: p(enjoy),
        build_wealth: p(combined),
        eliminate_debt: p(debtTotal),
      },
      targetPct: {
        live: CORE_TARGETS.live,
        enjoy: CORE_TARGETS.enjoy,
        build_wealth: CORE_TARGETS.build_wealth,
        eliminate_debt: CORE_TARGETS.eliminate_debt,
      },
      flags,
      debtBalances,
      travelFund: travelFundTotal,
    });

    month = nextMonth(month);
  }

  return out;
}

export type { MoneyPurpose };
