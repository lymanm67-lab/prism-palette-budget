/**
 * Required Minimum Distribution engine.
 * The starting age is configuration, never a hard-coded constant, so a change
 * in law (or a different birth year) is a settings edit.
 */

import { federalTax, irmaaStatus, lawForYear, marginalRate, standardDeduction, type FilingStatus } from './brackets';

/** IRS Uniform Lifetime Table distribution periods by age. */
export const UNIFORM_LIFETIME: Record<number, number> = {
  72: 27.4, 73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1,
  80: 20.2, 81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
  96: 8.4, 97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2,
  104: 4.9, 105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5,
};

export function distributionPeriod(age: number): number {
  if (age <= 72) return UNIFORM_LIFETIME[72];
  if (age >= 110) return UNIFORM_LIFETIME[110];
  return UNIFORM_LIFETIME[age] ?? UNIFORM_LIFETIME[110];
}

export interface RmdInputs {
  pretaxBalance: number;
  birthYear: number;
  rmdStartAge: number;
  planningEndAge: number;
  assumedReturn: number; // percent
  inflation: number; // percent
  filingStatus: FilingStatus;
  /** Other ordinary income in today's dollars (pension, Social Security, wages). */
  otherIncome: number;
  /** Roth conversions by calendar year that shrink the pre-tax balance. */
  conversionsByYear?: Record<number, number>;
  /** Qualified charitable distributions by year that satisfy RMD tax-free. */
  qcdByYear?: Record<number, number>;
}

export interface RmdYear {
  year: number;
  age: number;
  startBalance: number;
  rmd: number;
  qcd: number;
  taxableRmd: number;
  conversion: number;
  ordinaryIncome: number;
  taxableIncome: number;
  federalTax: number;
  marginalRate: number;
  effectiveRate: number;
  irmaaTier: number;
  endBalance: number;
}

export function forecastRmd(input: RmdInputs): RmdYear[] {
  const {
    pretaxBalance, birthYear, rmdStartAge, planningEndAge, assumedReturn, inflation,
    filingStatus, otherIncome, conversionsByYear = {}, qcdByYear = {},
  } = input;

  const rows: RmdYear[] = [];
  let balance = Math.max(0, pretaxBalance);
  const startYear = new Date().getFullYear();
  const currentAge = startYear - birthYear;

  for (let age = currentAge; age <= planningEndAge; age++) {
    const year = birthYear + age;
    const law = lawForYear(year, inflation);
    const infFactor = Math.pow(1 + inflation / 100, year - startYear);
    const startBalance = balance;

    const conversion = Math.max(0, conversionsByYear[year] ?? 0);
    const grossRmd = age >= rmdStartAge && balance > 0 ? balance / distributionPeriod(age) : 0;
    const qcd = Math.min(qcdByYear[year] ?? 0, grossRmd);
    const taxableRmd = Math.max(0, grossRmd - qcd);

    const other = otherIncome * infFactor;
    const ordinaryIncome = other + taxableRmd + conversion;
    const seniors = age >= 65 ? (filingStatus === 'married_joint' ? 2 : 1) : 0;
    const taxableIncome = Math.max(0, ordinaryIncome - standardDeduction(filingStatus, law, seniors));
    const tax = federalTax(taxableIncome, filingStatus, law);

    balance = Math.max(0, (startBalance - grossRmd - conversion) * (1 + assumedReturn / 100));

    rows.push({
      year, age, startBalance,
      rmd: grossRmd, qcd, taxableRmd, conversion,
      ordinaryIncome, taxableIncome,
      federalTax: tax,
      marginalRate: marginalRate(taxableIncome, filingStatus, law),
      effectiveRate: ordinaryIncome > 0 ? (tax / ordinaryIncome) * 100 : 0,
      irmaaTier: irmaaStatus(ordinaryIncome, filingStatus, law).tier,
      endBalance: balance,
    });
  }

  return rows;
}

export interface RmdSummary {
  firstRmdYear: number | null;
  firstRmdAmount: number;
  peakRmd: number;
  peakRmdYear: number | null;
  lifetimeRmd: number;
  lifetimeTax: number;
  peakMarginalRate: number;
  irmaaYears: number;
  balanceAtEnd: number;
}

export function summarizeRmd(rows: RmdYear[]): RmdSummary {
  const withRmd = rows.filter((r) => r.rmd > 0);
  const peak = withRmd.reduce<RmdYear | null>((a, r) => (!a || r.rmd > a.rmd ? r : a), null);
  return {
    firstRmdYear: withRmd[0]?.year ?? null,
    firstRmdAmount: withRmd[0]?.rmd ?? 0,
    peakRmd: peak?.rmd ?? 0,
    peakRmdYear: peak?.year ?? null,
    lifetimeRmd: withRmd.reduce((s, r) => s + r.rmd, 0),
    lifetimeTax: rows.reduce((s, r) => s + r.federalTax, 0),
    peakMarginalRate: rows.reduce((m, r) => Math.max(m, r.marginalRate), 0),
    irmaaYears: rows.filter((r) => r.irmaaTier > 0).length,
    balanceAtEnd: rows.length ? rows[rows.length - 1].endBalance : 0,
  };
}
