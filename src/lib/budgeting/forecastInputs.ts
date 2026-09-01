// Turns the stored zero-based ledgers into ForecastAssumptions so the
// What-If simulator can re-run the plan without touching the database.

import type { ForecastAssumptions, ForecastDebt, ForecastLine } from '@/lib/budgeting/forecastEngine';

export interface WhatIfKnobs {
  months: 12 | 24 | 60;
  takeHome: number;
  enjoyPlanned: number;
  /** Extra dollars thrown at the snowball each month. */
  extraDebt: number;
  /** Extra take-home dollars sent to Build Wealth each month. */
  extraWealth: number;
  /** Percentage change applied to every Live line. */
  livePctChange: number;
  /** Monthly Travel Fund contribution once vacation debt clears. */
  travelFundMonthly: number;
  /** Raise redirected instead of absorbed. */
  raiseMonth: string;
  raiseAmount: number;
  bufferStarting: number;
  /** Turn the vacation snowball on/off. */
  snowball: boolean;
  /** Use observed bank-statement payments instead of stored minimums. */
  useActualPayments: boolean;
}

export const DEFAULT_KNOBS: WhatIfKnobs = {
  months: 12,
  takeHome: 4250.02,
  enjoyPlanned: 0,
  extraDebt: 0,
  extraWealth: 0,
  livePctChange: 0,
  travelFundMonthly: 500,
  raiseMonth: '2027-07',
  raiseAmount: 100,
  bufferStarting: 0,
  snowball: true,
  useActualPayments: true,
};

export interface ForecastSourceData {
  startMonth: string;
  recurringLines: {
    label: string;
    purpose: string;
    amount: number;
    start_month: string;
    end_month: string | null;
  }[];
  businessExpenses: {
    vendor: string;
    brand: string | null;
    amount: number;
    frequency: string;
    is_active: boolean;
    is_owner_investment: boolean;
  }[];
  debts: any[];
  bufferOneTimes: { label: string; amount: number; due_date: string; is_paid: boolean }[];
  /** Payroll wealth (employee elections) and employer contributions. */
  employeePayrollWealth: number;
  employerRetirement: number;
  employerHsa: { month: string; amount: number }[];
  wealthTakeHome: { fromMonth: string; amount: number }[];
  redirects?: { startMonth: string; sourceLabel: string; targetLabel: string; amount: number }[];
  /** Session 7: observed monthly payment per debt id, from bank statements. */
  observedPayments?: Record<string, number>;
}

const isVacation = (name: string) => /vacation/i.test(name || '');

export function buildAssumptions(src: ForecastSourceData, k: WhatIfKnobs): ForecastAssumptions {
  const liveMult = 1 + (k.livePctChange || 0) / 100;

  const liveLines: ForecastLine[] = src.recurringLines
    .filter((l) => l.purpose === 'live')
    .map((l) => ({
      label: l.label,
      amount: Math.round(Number(l.amount || 0) * liveMult * 100) / 100,
      startMonth: l.start_month,
      endMonth: l.end_month,
    }));

  const enjoyLines: ForecastLine[] = src.recurringLines
    .filter((l) => l.purpose === 'enjoy')
    .map((l) => ({
      label: l.label,
      amount: Number(l.amount || 0),
      startMonth: l.start_month,
      endMonth: l.end_month,
    }));

  const businessLines: ForecastLine[] = src.businessExpenses
    .filter((b) => b.is_active !== false && !b.is_owner_investment && b.frequency === 'monthly')
    .map((b) => ({ label: b.brand || b.vendor, amount: Number(b.amount || 0) }));

  // Snowball order: smallest balance first, forgiveness debts excluded.
  const snowballCandidates = src.debts
    .filter((d) => !d.forgiveness_eligible && Number(d.balance || 0) > 0)
    .sort((a, b) => Number(a.balance) - Number(b.balance));
  const orderById = new Map(snowballCandidates.map((d, i) => [d.id, i + 1]));

  const vacationIds = src.debts.filter((d) => isVacation(d.name)).map((d) => d.id);
  const smallestVacation = src.debts
    .filter((d) => isVacation(d.name) && Number(d.balance || 0) > 0)
    .sort((a, b) => Number(a.balance) - Number(b.balance))[0];

  const debts: ForecastDebt[] = src.debts.map((d) => {
    const extraStored = Number(d.extra_payment || 0);
    const bonus = k.extraDebt > 0 && smallestVacation && d.id === smallestVacation.id ? k.extraDebt : 0;
    const observed = k.useActualPayments ? src.observedPayments?.[d.id] : undefined;
    const stored = Number(d.minimum_payment || 0);
    const separate = Number(d.settlement_separate_payment || 0);
    // Observed totals include any separately billed leg, so don't double count it.
    const minimum = observed && observed > 0 ? Math.max(0, observed - separate) : stored;
    return {
      id: d.id,
      name: d.name,
      balance: Number(d.balance || 0),
      apr: Number(d.interest_rate || 0),
      minimum,
      extra: extraStored + bonus,
      separatePayment: Number(d.settlement_separate_payment || 0),
      isBusiness: Number(d.business_split_pct || 0) >= 100,
      isForgiveness: !!d.forgiveness_eligible,
      snowballOrder: k.snowball ? orderById.get(d.id) ?? null : null,
    };
  });

  const wealthTakeHome = (src.wealthTakeHome.length
    ? src.wealthTakeHome
    : [{ fromMonth: src.startMonth, amount: 0 }]
  ).map((w) => ({ fromMonth: w.fromMonth, amount: w.amount + (k.extraWealth || 0) }));

  return {
    startMonth: src.startMonth,
    months: k.months,
    takeHome: k.takeHome,
    liveLines,
    enjoyPlanned: k.enjoyPlanned,
    enjoyLines,
    businessLines,
    debts,
    wealthTakeHome,
    employeePayrollWealth: src.employeePayrollWealth,
    employerRetirement: src.employerRetirement,
    employerHsa: src.employerHsa,
    bufferStarting: k.bufferStarting,
    bufferOneTimes: src.bufferOneTimes
      .filter((o) => !o.is_paid)
      .map((o) => ({ month: (o.due_date || '').slice(0, 7), label: o.label, amount: Number(o.amount || 0) })),
    raise: k.raiseAmount > 0 ? { month: k.raiseMonth, amount: k.raiseAmount, target: 'Build Wealth' } : null,
    travelFundMonthly: k.travelFundMonthly,
    vacationDebtIds: vacationIds,
    redirects: src.redirects || [],
  };
}
