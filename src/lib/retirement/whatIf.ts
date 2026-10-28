import { stateByCode, stateTaxFor } from './stateTax';

/** SSA 04/05/2026 monthly estimates for Lyman. */
export const SS_ESTIMATES: Record<number, number> = { 62: 1799, 67: 2784, 70: 3540 };

/** Monthly SS benefit for a claim age 62–70, linear between known SSA points. */
export function ssMonthly(claimAge: number): number {
  const a = Math.min(70, Math.max(62, claimAge));
  if (a <= 67) return SS_ESTIMATES[62] + ((SS_ESTIMATES[67] - SS_ESTIMATES[62]) * (a - 62)) / 5;
  return SS_ESTIMATES[67] + ((SS_ESTIMATES[70] - SS_ESTIMATES[67]) * (a - 67)) / 3;
}

export interface Phases {
  goGoEnd: number; // last Go-Go age
  slowGoEnd: number; // last Slow-Go age
  goGoPct: number;
  slowGoPct: number;
  noGoPct: number;
}

export const DEFAULT_PHASES: Phases = { goGoEnd: 74, slowGoEnd: 84, goGoPct: 1.1, slowGoPct: 0.85, noGoPct: 0.75 };

export type PhaseName = 'Working' | 'Go-Go' | 'Slow-Go' | 'No-Go';

export function phaseFor(age: number, retireAge: number, p: Phases): { name: PhaseName; pct: number } {
  if (age < retireAge) return { name: 'Working', pct: 0 };
  if (age <= p.goGoEnd) return { name: 'Go-Go', pct: p.goGoPct };
  if (age <= p.slowGoEnd) return { name: 'Slow-Go', pct: p.slowGoPct };
  return { name: 'No-Go', pct: p.noGoPct };
}

export interface WhatIfInputs {
  currentAge: number;
  retireAge: number;
  lifeExpectancy: number;
  ssClaimAge: number;
  portfolio: number;
  annualContribution: number;
  annualReturn: number;
  inflation: number;
  baseSpending: number; // today's dollars / yr
  medicalSpending: number; // today's dollars / yr
  medicalInflation: number;
  otherIncome: number; // spouse/pension, today's dollars / yr, from retirement
  phases: Phases;
  state: string;
  homeValue: number;
}

export interface YearRow {
  age: number;
  phase: PhaseName;
  spending: number;
  medical: number;
  socialSecurity: number;
  otherIncome: number;
  withdrawal: number;
  stateTax: number;
  balance: number;
}

export interface WhatIfResult {
  rows: YearRow[];
  depletionAge: number | null;
  endingBalance: number;
  lifetimeStateTax: number;
}

export function project(i: WhatIfInputs): WhatIfResult {
  const st = stateByCode(i.state);
  const rows: YearRow[] = [];
  let bal = i.portfolio;
  let depletionAge: number | null = null;
  let lifetimeStateTax = 0;
  const ssAnnual = ssMonthly(i.ssClaimAge) * 12;
  for (let age = i.currentAge; age <= i.lifeExpectancy; age++) {
    const t = age - i.currentAge;
    const infl = Math.pow(1 + i.inflation, t);
    const { name, pct } = phaseFor(age, i.retireAge, i.phases);
    const retired = name !== 'Working';
    const spending = retired ? i.baseSpending * pct * infl : 0;
    const medMult = name === 'No-Go' ? 1.5 : 1;
    const medical = retired ? i.medicalSpending * medMult * Math.pow(1 + i.medicalInflation, t) : 0;
    const socialSecurity = age >= i.ssClaimAge ? ssAnnual * infl : 0;
    const otherIncome = retired ? i.otherIncome * infl : 0;
    const gap = Math.max(0, spending + medical - socialSecurity - otherIncome);
    const stateTax = retired
      ? stateTaxFor(st, { withdrawals: gap, pension: otherIncome, socialSecurity }, i.homeValue * infl)
      : 0;
    lifetimeStateTax += stateTax;
    const withdrawal = retired ? gap + stateTax : 0;
    bal = bal * (1 + i.annualReturn) + (retired ? 0 : i.annualContribution) - withdrawal;
    if (bal < 0) {
      if (depletionAge === null) depletionAge = age;
      bal = 0;
    }
    rows.push({ age, phase: name, spending, medical, socialSecurity, otherIncome, withdrawal, stateTax, balance: bal });
  }
  return { rows, depletionAge, endingBalance: bal, lifetimeStateTax };
}

export function ageFromDob(dob: string, on = new Date()): number {
  const d = new Date(dob + 'T00:00:00');
  let a = on.getFullYear() - d.getFullYear();
  if (on.getMonth() < d.getMonth() || (on.getMonth() === d.getMonth() && on.getDate() < d.getDate())) a--;
  return a;
}
