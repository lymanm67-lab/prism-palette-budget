// Dynamic, bracket-aware withdrawal sequencer.
// Fills the target federal bracket each year with pre-tax dollars, then blends
// taxable and Roth to hit the spending need without bracket creep or IRMAA jumps.
// Pure functions — no I/O.

import { BRACKETS_SINGLE_2025, BRACKETS_MFJ_2025, taxOn, marginalRate, type TaxBracket } from './tax';

export type Filing = 'single' | 'mfj';

export const STANDARD_DEDUCTION_2025: Record<Filing, number> = {
  single: 15_000,
  mfj: 30_000,
};

// 2025 Medicare IRMAA MAGI tiers (Part B + D combined monthly surcharge per person).
export type IrmaaTier = { magiUpTo: number; monthlySurchargePerPerson: number; label: string };

export const IRMAA_TIERS_2025: Record<Filing, IrmaaTier[]> = {
  single: [
    { magiUpTo: 106_000, monthlySurchargePerPerson: 0, label: 'No surcharge' },
    { magiUpTo: 133_000, monthlySurchargePerPerson: 83.5, label: 'Tier 1' },
    { magiUpTo: 167_000, monthlySurchargePerPerson: 208.7, label: 'Tier 2' },
    { magiUpTo: 200_000, monthlySurchargePerPerson: 333.9, label: 'Tier 3' },
    { magiUpTo: 500_000, monthlySurchargePerPerson: 459.1, label: 'Tier 4' },
    { magiUpTo: Infinity, monthlySurchargePerPerson: 500.8, label: 'Tier 5' },
  ],
  mfj: [
    { magiUpTo: 212_000, monthlySurchargePerPerson: 0, label: 'No surcharge' },
    { magiUpTo: 266_000, monthlySurchargePerPerson: 83.5, label: 'Tier 1' },
    { magiUpTo: 334_000, monthlySurchargePerPerson: 208.7, label: 'Tier 2' },
    { magiUpTo: 400_000, monthlySurchargePerPerson: 333.9, label: 'Tier 3' },
    { magiUpTo: 750_000, monthlySurchargePerPerson: 459.1, label: 'Tier 4' },
    { magiUpTo: Infinity, monthlySurchargePerPerson: 500.8, label: 'Tier 5' },
  ],
};

export function irmaaFor(magi: number, filing: Filing, people = 1) {
  const tiers = IRMAA_TIERS_2025[filing];
  for (let i = 0; i < tiers.length; i++) {
    if (magi <= tiers[i].magiUpTo) {
      const next = tiers[i + 1];
      return {
        tier: tiers[i].label,
        annualSurcharge: tiers[i].monthlySurchargePerPerson * 12 * people,
        nextThreshold: next ? tiers[i].magiUpTo : null,
        headroomToNextTier: next ? Math.max(0, tiers[i].magiUpTo - magi) : null,
      };
    }
  }
  return { tier: 'Tier 5', annualSurcharge: 0, nextThreshold: null, headroomToNextTier: null };
}

// IRS Uniform Lifetime Table divisors (SECURE 2.0)
const UNIFORM_LIFETIME: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2,
  87: 14.4, 88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1,
  94: 9.5, 95: 8.9, 96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4,
};

export function rmdDivisor(age: number): number | null {
  if (age < 73) return null;
  return UNIFORM_LIFETIME[Math.min(age, 100)] ?? 6.4;
}

function bracketTop(brackets: TaxBracket[], rate: number): number {
  for (const b of brackets) if (b.rate === rate) return b.upTo;
  return brackets[brackets.length - 1].upTo;
}

export type SequencerInput = {
  startAge: number;
  endAge: number;
  filing: Filing;
  /** Annual after-tax spending need (today's dollars, inflated by inflationPct). */
  spendingNeed: number;
  /** Other taxable income (pension, wages) at start, inflated. */
  otherOrdinaryIncome: number;
  /** Annual Social Security benefit (85% assumed taxable). */
  socialSecurity: number;
  ssStartAge: number;
  balances: { taxable: number; traditional: number; roth: number };
  /** Cost basis fraction of the taxable account (rest is long-term gain). */
  taxableBasisPct: number;
  returnPct: number;
  inflationPct: number;
  /** Top federal bracket we are willing to fill each year: 0.12 | 0.22 | 0.24 */
  targetBracket: number;
  /** Avoid crossing the next IRMAA MAGI threshold when possible. */
  avoidIrmaa: boolean;
  medicareEnrollees: number;
  stateTaxPct: number;
  /** Convert leftover bracket headroom to Roth when spending doesn't use it. */
  fillWithRothConversions: boolean;
};

export type SequencerYear = {
  year: number;
  age: number;
  spendingNeed: number;
  socialSecurity: number;
  otherIncome: number;
  rmd: number;
  fromTraditional: number;
  fromTaxable: number;
  fromRoth: number;
  rothConversion: number;
  taxableIncome: number;
  magi: number;
  federalTax: number;
  stateTax: number;
  capGainsTax: number;
  irmaaSurcharge: number;
  totalTax: number;
  effectiveRate: number;
  marginalRate: number;
  irmaaTier: string;
  bracketHeadroomUsedPct: number;
  endingBalances: { taxable: number; traditional: number; roth: number; total: number };
  warnings: string[];
};

export type SequencerResult = {
  years: SequencerYear[];
  totals: {
    grossWithdrawals: number;
    federalTax: number;
    stateTax: number;
    capGainsTax: number;
    irmaa: number;
    totalTax: number;
    lifetimeEffectiveRate: number;
    endingTotal: number;
    endingRoth: number;
    rothConverted: number;
  };
  naive: { totalTax: number; endingTotal: number };
  savingsVsNaive: { taxSaved: number; extraEndingBalance: number };
};

const LTCG_RATE = 0.15;

function ssTaxablePortion(ss: number, otherIncome: number, filing: Filing) {
  if (ss <= 0) return 0;
  const provisional = otherIncome + ss * 0.5;
  const base = filing === 'mfj' ? 32_000 : 25_000;
  const upper = filing === 'mfj' ? 44_000 : 34_000;
  if (provisional <= base) return 0;
  if (provisional <= upper) return Math.min(ss * 0.5, (provisional - base) * 0.5);
  return Math.min(ss * 0.85, (provisional - upper) * 0.85 + Math.min(ss * 0.5, (upper - base) * 0.5));
}

/**
 * Runs a year-by-year, bracket-filling withdrawal plan.
 * Order of dollars each year:
 *   1. RMDs (forced, ordinary income)
 *   2. Traditional up to the top of the target bracket (and below the next IRMAA tier)
 *   3. Taxable brokerage (LTCG rates, doesn't push ordinary bracket)
 *   4. Roth (tax-free) for anything left — protects the bracket ceiling
 *   5. Leftover bracket headroom -> optional Roth conversion
 */
export function runWithdrawalSequencer(input: SequencerInput): SequencerResult {
  const brackets = input.filing === 'mfj' ? BRACKETS_MFJ_2025 : BRACKETS_SINGLE_2025;
  const stdDed = STANDARD_DEDUCTION_2025[input.filing];
  const top = bracketTop(brackets, input.targetBracket);
  const r = input.returnPct / 100;
  const infl = input.inflationPct / 100;

  let taxable = input.balances.taxable;
  let traditional = input.balances.traditional;
  let roth = input.balances.roth;
  const gainPct = Math.max(0, 1 - input.taxableBasisPct);

  const years: SequencerYear[] = [];
  const thisYear = new Date().getFullYear();

  let tGross = 0, tFed = 0, tState = 0, tCg = 0, tIrmaa = 0, tConv = 0;

  for (let age = input.startAge; age <= input.endAge; age++) {
    const i = age - input.startAge;
    const inflator = (1 + infl) ** i;
    const need = input.spendingNeed * inflator;
    const other = input.otherOrdinaryIncome * inflator;
    const ss = age >= input.ssStartAge ? input.socialSecurity * inflator : 0;
    const warnings: string[] = [];

    // 1. RMD
    const div = rmdDivisor(age);
    const rmd = div && traditional > 0 ? Math.min(traditional, traditional / div) : 0;

    let fromTrad = rmd;
    let fromTaxable = 0;
    let fromRoth = 0;
    let conversion = 0;

    const ssTaxable = ssTaxablePortion(ss, other + fromTrad, input.filing);
    let ordinary = other + ssTaxable + fromTrad;

    // Ceiling on ordinary taxable income (after standard deduction)
    let ceiling = top + stdDed;
    if (input.avoidIrmaa) {
      const tiers = IRMAA_TIERS_2025[input.filing];
      const current = tiers.find((t) => (other + ss + fromTrad) <= t.magiUpTo) ?? tiers[0];
      if (current.magiUpTo !== Infinity) ceiling = Math.min(ceiling, current.magiUpTo);
    }

    // Cash already available from non-portfolio income (net of estimated tax later)
    let netCashSoFar = other + ss + fromTrad;
    let remainingNeed = Math.max(0, need - netCashSoFar);

    // 2. Traditional up to ceiling
    if (remainingNeed > 0 && traditional - fromTrad > 0) {
      const headroom = Math.max(0, ceiling - ordinary);
      const draw = Math.min(remainingNeed, headroom, traditional - fromTrad);
      fromTrad += draw;
      ordinary += draw;
      remainingNeed -= draw;
      if (headroom <= 0) warnings.push('Bracket/IRMAA ceiling reached — switched to taxable and Roth.');
    }

    // 3. Taxable brokerage
    if (remainingNeed > 0 && taxable > 0) {
      const draw = Math.min(remainingNeed, taxable);
      fromTaxable = draw;
      taxable -= draw;
      remainingNeed -= draw;
    }

    // 4. Roth last
    if (remainingNeed > 0 && roth > 0) {
      const draw = Math.min(remainingNeed, roth);
      fromRoth = draw;
      roth -= draw;
      remainingNeed -= draw;
    }

    // 5. Overflow — if still short, pull extra traditional even past the ceiling
    if (remainingNeed > 0 && traditional - fromTrad > 0) {
      const draw = Math.min(remainingNeed, traditional - fromTrad);
      fromTrad += draw;
      ordinary += draw;
      remainingNeed -= draw;
      warnings.push('Spending exceeded the tax-efficient ceiling — extra pre-tax dollars taxed at a higher rate.');
    }
    if (remainingNeed > 1) warnings.push('Portfolio cannot fund the full spending need this year.');

    // 6. Fill leftover headroom with a Roth conversion
    if (input.fillWithRothConversions) {
      const headroom = Math.max(0, ceiling - ordinary);
      const avail = Math.max(0, traditional - fromTrad);
      conversion = Math.min(headroom, avail);
      if (conversion > 0) {
        ordinary += conversion;
        roth += conversion;
      }
    }

    traditional = Math.max(0, traditional - fromTrad - conversion);

    const taxableIncome = Math.max(0, ordinary - stdDed);
    const federalTax = taxOn(taxableIncome, brackets);
    const gains = fromTaxable * gainPct;
    const capGainsTax = gains * LTCG_RATE;
    const stateTax = (taxableIncome + gains) * (input.stateTaxPct / 100);
    const magi = ordinary + gains;
    const irmaa = irmaaFor(magi, input.filing, input.medicareEnrollees);
    const irmaaSurcharge = age >= 65 ? irmaa.annualSurcharge : 0;
    if (age >= 65 && irmaa.headroomToNextTier !== null && irmaa.headroomToNextTier < 5_000 && irmaaSurcharge === 0) {
      warnings.push(`Within $${Math.round(irmaa.headroomToNextTier).toLocaleString()} of the next IRMAA threshold.`);
    }
    const totalTax = federalTax + capGainsTax + stateTax + irmaaSurcharge;
    const gross = fromTrad + fromTaxable + fromRoth;

    // Grow remaining balances
    taxable = taxable * (1 + r);
    traditional = traditional * (1 + r);
    roth = roth * (1 + r);

    tGross += gross; tFed += federalTax; tState += stateTax; tCg += capGainsTax; tIrmaa += irmaaSurcharge; tConv += conversion;

    years.push({
      year: thisYear + i,
      age,
      spendingNeed: Math.round(need),
      socialSecurity: Math.round(ss),
      otherIncome: Math.round(other),
      rmd: Math.round(rmd),
      fromTraditional: Math.round(fromTrad),
      fromTaxable: Math.round(fromTaxable),
      fromRoth: Math.round(fromRoth),
      rothConversion: Math.round(conversion),
      taxableIncome: Math.round(taxableIncome),
      magi: Math.round(magi),
      federalTax: Math.round(federalTax),
      stateTax: Math.round(stateTax),
      capGainsTax: Math.round(capGainsTax),
      irmaaSurcharge: Math.round(irmaaSurcharge),
      totalTax: Math.round(totalTax),
      effectiveRate: gross > 0 ? totalTax / gross : 0,
      marginalRate: marginalRate(taxableIncome, brackets),
      irmaaTier: irmaa.tier,
      bracketHeadroomUsedPct: ceiling > stdDed ? Math.min(1, ordinary / ceiling) : 0,
      endingBalances: {
        taxable: Math.round(taxable),
        traditional: Math.round(traditional),
        roth: Math.round(roth),
        total: Math.round(taxable + traditional + roth),
      },
      warnings,
    });
  }

  const naive = runNaive(input);
  const endingTotal = years.length ? years[years.length - 1].endingBalances.total : 0;
  const totalTax = tFed + tState + tCg + tIrmaa;

  return {
    years,
    totals: {
      grossWithdrawals: Math.round(tGross),
      federalTax: Math.round(tFed),
      stateTax: Math.round(tState),
      capGainsTax: Math.round(tCg),
      irmaa: Math.round(tIrmaa),
      totalTax: Math.round(totalTax),
      lifetimeEffectiveRate: tGross > 0 ? totalTax / tGross : 0,
      endingTotal,
      endingRoth: years.length ? years[years.length - 1].endingBalances.roth : 0,
      rothConverted: Math.round(tConv),
    },
    naive,
    savingsVsNaive: {
      taxSaved: Math.round(naive.totalTax - totalTax),
      extraEndingBalance: Math.round(endingTotal - naive.endingTotal),
    },
  };
}

/** Naive "taxable → traditional → Roth" rule-of-thumb, for comparison. */
function runNaive(input: SequencerInput) {
  const brackets = input.filing === 'mfj' ? BRACKETS_MFJ_2025 : BRACKETS_SINGLE_2025;
  const stdDed = STANDARD_DEDUCTION_2025[input.filing];
  const r = input.returnPct / 100;
  const infl = input.inflationPct / 100;
  const gainPct = Math.max(0, 1 - input.taxableBasisPct);

  let taxable = input.balances.taxable;
  let traditional = input.balances.traditional;
  let roth = input.balances.roth;
  let totalTax = 0;

  for (let age = input.startAge; age <= input.endAge; age++) {
    const i = age - input.startAge;
    const inflator = (1 + infl) ** i;
    const need = input.spendingNeed * inflator;
    const other = input.otherOrdinaryIncome * inflator;
    const ss = age >= input.ssStartAge ? input.socialSecurity * inflator : 0;

    const div = rmdDivisor(age);
    let fromTrad = div && traditional > 0 ? traditional / div : 0;
    let remaining = Math.max(0, need - other - ss - fromTrad);

    const fromTaxable = Math.min(remaining, taxable);
    taxable -= fromTaxable; remaining -= fromTaxable;
    const extraTrad = Math.min(remaining, Math.max(0, traditional - fromTrad));
    fromTrad += extraTrad; remaining -= extraTrad;
    const fromRoth = Math.min(remaining, roth);
    roth -= fromRoth;
    traditional = Math.max(0, traditional - fromTrad);

    const ssTaxable = ssTaxablePortion(ss, other + fromTrad, input.filing);
    const ordinary = other + ssTaxable + fromTrad;
    const taxableIncome = Math.max(0, ordinary - stdDed);
    const gains = fromTaxable * gainPct;
    const irmaa = age >= 65 ? irmaaFor(ordinary + gains, input.filing, input.medicareEnrollees).annualSurcharge : 0;
    totalTax += taxOn(taxableIncome, brackets) + gains * LTCG_RATE + (taxableIncome + gains) * (input.stateTaxPct / 100) + irmaa;

    taxable *= 1 + r; traditional *= 1 + r; roth *= 1 + r;
  }

  return { totalTax: Math.round(totalTax), endingTotal: Math.round(taxable + traditional + roth) };
}

export const DEFAULT_SEQUENCER_INPUT: SequencerInput = {
  startAge: 75,
  endAge: 95,
  filing: 'mfj',
  spendingNeed: 72_000,
  otherOrdinaryIncome: 30_000,
  socialSecurity: 42_000,
  ssStartAge: 70,
  balances: { taxable: 3_500, traditional: 520_000, roth: 120_000 },
  taxableBasisPct: 0.7,
  returnPct: 8,
  inflationPct: 2.5,
  targetBracket: 0.22,
  avoidIrmaa: true,
  medicareEnrollees: 2,
  stateTaxPct: 2.75,
  fillWithRothConversions: true,
};
