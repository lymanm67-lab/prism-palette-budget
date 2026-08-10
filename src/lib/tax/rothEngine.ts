/**
 * Roth conversion ladder planner: fills a target bracket each year, applies
 * business losses / NOL carryforwards first, and guards Medicare IRMAA tiers.
 */

import {
  bracketHeadroom, federalTax, irmaaStatus, lawForYear, marginalRate, standardDeduction,
  type FilingStatus,
} from './brackets';
import { distributionPeriod } from './rmdEngine';

export interface ConversionInputs {
  pretaxBalance: number;
  rothBalance: number;
  birthYear: number;
  rmdStartAge: number;
  planningEndAge: number;
  /** Last year conversions are allowed (usually just before RMDs begin). */
  ladderEndAge?: number;
  assumedReturn: number;
  inflation: number;
  filingStatus: FilingStatus;
  otherIncome: number;
  targetBracket: number;
  irmaaGuard: boolean;
  /** Available business losses by tax year (loss_amount - used_amount). */
  lossesByYear?: Record<number, number>;
}

export interface ConversionYear {
  year: number;
  age: number;
  headroom: number;
  lossOffset: number;
  conversion: number;
  taxOnConversion: number;
  marginalRate: number;
  irmaaTier: number;
  pretaxAfter: number;
  rothAfter: number;
}

export interface LadderResult {
  years: ConversionYear[];
  totalConverted: number;
  totalTax: number;
  totalLossOffset: number;
  conversionsByYear: Record<number, number>;
  pretaxAtRmdStart: number;
  rothAtEnd: number;
}

export function planConversionLadder(input: ConversionInputs): LadderResult {
  const {
    pretaxBalance, rothBalance, birthYear, rmdStartAge, planningEndAge, assumedReturn, inflation,
    filingStatus, otherIncome, targetBracket, irmaaGuard, lossesByYear = {},
  } = input;
  const ladderEndAge = input.ladderEndAge ?? rmdStartAge - 1;

  const startYear = new Date().getFullYear();
  const currentAge = startYear - birthYear;
  let pretax = Math.max(0, pretaxBalance);
  let roth = Math.max(0, rothBalance);
  const years: ConversionYear[] = [];
  const conversionsByYear: Record<number, number> = {};

  for (let age = currentAge; age <= Math.min(ladderEndAge, planningEndAge); age++) {
    const year = birthYear + age;
    const law = lawForYear(year, inflation);
    const infFactor = Math.pow(1 + inflation / 100, year - startYear);
    const other = otherIncome * infFactor;
    const seniors = age >= 65 ? (filingStatus === 'married_joint' ? 2 : 1) : 0;
    const deduction = standardDeduction(filingStatus, law, seniors);
    const baseTaxable = Math.max(0, other - deduction);

    let headroom = bracketHeadroom(baseTaxable, targetBracket, filingStatus, law);
    if (!Number.isFinite(headroom)) headroom = pretax;

    if (irmaaGuard) {
      const room = irmaaStatus(other, filingStatus, law).roomToNext;
      if (room != null) headroom = Math.min(headroom, room);
    }

    const lossOffset = Math.max(0, lossesByYear[year] ?? 0);
    const conversion = Math.max(0, Math.min(pretax, headroom + lossOffset));

    const taxableWith = Math.max(0, other + Math.max(0, conversion - lossOffset) - deduction);
    const taxOnConversion = federalTax(taxableWith, filingStatus, law) - federalTax(baseTaxable, filingStatus, law);

    pretax = Math.max(0, (pretax - conversion) * (1 + assumedReturn / 100));
    roth = (roth + conversion) * (1 + assumedReturn / 100);
    if (conversion > 0) conversionsByYear[year] = conversion;

    years.push({
      year, age, headroom, lossOffset, conversion, taxOnConversion,
      marginalRate: marginalRate(taxableWith, filingStatus, law),
      irmaaTier: irmaaStatus(other + conversion, filingStatus, law).tier,
      pretaxAfter: pretax, rothAfter: roth,
    });
  }

  // Grow remaining balances to the RMD start year for comparison purposes.
  let pretaxAtRmd = pretax;
  for (let age = Math.min(ladderEndAge, planningEndAge) + 1; age < rmdStartAge; age++) {
    pretaxAtRmd *= 1 + assumedReturn / 100;
  }

  return {
    years,
    totalConverted: years.reduce((s, y) => s + y.conversion, 0),
    totalTax: years.reduce((s, y) => s + y.taxOnConversion, 0),
    totalLossOffset: years.reduce((s, y) => s + Math.min(y.lossOffset, y.conversion), 0),
    conversionsByYear,
    pretaxAtRmdStart: pretaxAtRmd,
    rothAtEnd: roth,
  };
}

/** First RMD if nothing is converted vs. after the ladder — the headline compare. */
export function rmdRelief(input: ConversionInputs, ladder: LadderResult) {
  const { pretaxBalance, birthYear, rmdStartAge, assumedReturn } = input;
  const yearsToRmd = Math.max(0, rmdStartAge - (new Date().getFullYear() - birthYear));
  const doNothingBalance = pretaxBalance * Math.pow(1 + assumedReturn / 100, yearsToRmd);
  const period = distributionPeriod(rmdStartAge);
  return {
    doNothingBalance,
    ladderBalance: ladder.pretaxAtRmdStart,
    doNothingFirstRmd: doNothingBalance / period,
    ladderFirstRmd: ladder.pretaxAtRmdStart / period,
    reduction: (doNothingBalance - ladder.pretaxAtRmdStart) / period,
  };
}
