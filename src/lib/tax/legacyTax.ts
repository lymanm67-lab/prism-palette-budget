/**
 * Legacy / heir tax modeling and charitable tax-efficiency math.
 * Educational estimates only.
 */

import { type FilingStatus, federalTax, lawForYear, standardDeduction } from './brackets';

export interface HeirInput {
  pretaxAtDeath: number;
  rothAtDeath: number;
  taxableAtDeath: number;
  heirCount: number;
  heirOtherIncome: number; // per heir
  heirFilingStatus: FilingStatus;
  yearOfDeath: number;
  inflation: number;
  /** SECURE Act payout window for most non-spouse heirs. */
  payoutYears?: number;
}

export interface HeirResult {
  perHeirPretax: number;
  annualDistribution: number;
  heirMarginalTax: number;
  totalHeirTax: number;
  netToHeirs: number;
  effectiveHeirRate: number;
  rothTaxFree: number;
  /** Pre-tax dollars lost to tax vs. Roth dollars, per heir. */
  taxDragPerHeir: number;
}

export function projectHeirTax(input: HeirInput): HeirResult {
  const payoutYears = input.payoutYears ?? 10;
  const heirs = Math.max(1, input.heirCount);
  const perHeirPretax = input.pretaxAtDeath / heirs;
  const annual = perHeirPretax / payoutYears;

  let taxPerHeir = 0;
  for (let i = 0; i < payoutYears; i++) {
    const year = input.yearOfDeath + i + 1;
    const law = lawForYear(year, input.inflation);
    const inf = Math.pow(1 + input.inflation / 100, i);
    const base = input.heirOtherIncome * inf;
    const deduction = standardDeduction(input.heirFilingStatus, law);
    const withDist = Math.max(0, base + annual - deduction);
    const without = Math.max(0, base - deduction);
    taxPerHeir += federalTax(withDist, input.heirFilingStatus, law) - federalTax(without, input.heirFilingStatus, law);
  }

  const totalHeirTax = taxPerHeir * heirs;
  const gross = input.pretaxAtDeath + input.rothAtDeath + input.taxableAtDeath;
  return {
    perHeirPretax,
    annualDistribution: annual,
    heirMarginalTax: taxPerHeir,
    totalHeirTax,
    netToHeirs: gross - totalHeirTax,
    effectiveHeirRate: input.pretaxAtDeath > 0 ? (totalHeirTax / input.pretaxAtDeath) * 100 : 0,
    rothTaxFree: input.rothAtDeath,
    taxDragPerHeir: taxPerHeir,
  };
}

/** Tax saved by satisfying RMDs with a qualified charitable distribution. */
export function qcdSavings(qcdAmount: number, marginalRatePct: number) {
  const federal = qcdAmount * (marginalRatePct / 100);
  return {
    federal,
    /** Charity receives the full amount either way; this is the household's savings. */
    costPerCharitableDollar: qcdAmount > 0 ? (qcdAmount - federal) / qcdAmount : 0,
  };
}

/** Foundation / DAF funding compared with cash giving from taxable income. */
export function charitableVehicleCompare(amount: number, marginalRatePct: number, appreciatedGainPct = 40) {
  const rate = marginalRatePct / 100;
  const gain = amount * (appreciatedGainPct / 100);
  return [
    { vehicle: 'Cash gift', deduction: amount, taxSaved: amount * rate, capitalGainAvoided: 0 },
    { vehicle: 'Appreciated stock', deduction: amount, taxSaved: amount * rate + gain * 0.15, capitalGainAvoided: gain * 0.15 },
    { vehicle: 'QCD from IRA (age 70.5+)', deduction: 0, taxSaved: amount * rate, capitalGainAvoided: 0 },
    { vehicle: 'Donor-advised fund', deduction: amount, taxSaved: amount * rate + gain * 0.15, capitalGainAvoided: gain * 0.15 },
    { vehicle: 'Private foundation', deduction: amount * 0.3, taxSaved: amount * 0.3 * rate, capitalGainAvoided: gain * 0.15 },
  ];
}
