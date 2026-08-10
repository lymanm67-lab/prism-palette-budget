/**
 * Federal tax-law reference tables and bracket math.
 * Educational estimates only — not tax advice.
 * All figures are stored in one place so future law changes are a data edit,
 * never a code change.
 */

export type FilingStatus = 'single' | 'married_joint' | 'head_of_household';

export interface Bracket {
  rate: number; // percent
  upTo: number; // upper bound of taxable income (Infinity for top bracket)
}

export interface TaxLawYear {
  year: number;
  standardDeduction: Record<FilingStatus, number>;
  seniorAddOn: Record<FilingStatus, number>; // extra deduction per person age 65+
  brackets: Record<FilingStatus, Bracket[]>;
  /** Modified AGI thresholds for Medicare premium surcharges (IRMAA). */
  irmaaTiers: Record<FilingStatus, number[]>;
  capitalGainsZeroTop: Record<FilingStatus, number>;
}

/** Baseline law year. Inflation-adjust forward with `lawForYear`. */
export const BASE_LAW: TaxLawYear = {
  year: 2026,
  standardDeduction: { single: 15_750, married_joint: 31_500, head_of_household: 23_625 },
  seniorAddOn: { single: 2_000, married_joint: 1_600, head_of_household: 2_000 },
  brackets: {
    single: [
      { rate: 10, upTo: 11_925 },
      { rate: 12, upTo: 48_475 },
      { rate: 22, upTo: 103_350 },
      { rate: 24, upTo: 197_300 },
      { rate: 32, upTo: 250_525 },
      { rate: 35, upTo: 626_350 },
      { rate: 37, upTo: Infinity },
    ],
    married_joint: [
      { rate: 10, upTo: 23_850 },
      { rate: 12, upTo: 96_950 },
      { rate: 22, upTo: 206_700 },
      { rate: 24, upTo: 394_600 },
      { rate: 32, upTo: 501_050 },
      { rate: 35, upTo: 751_600 },
      { rate: 37, upTo: Infinity },
    ],
    head_of_household: [
      { rate: 10, upTo: 17_000 },
      { rate: 12, upTo: 64_850 },
      { rate: 22, upTo: 103_350 },
      { rate: 24, upTo: 197_300 },
      { rate: 32, upTo: 250_500 },
      { rate: 35, upTo: 626_350 },
      { rate: 37, upTo: Infinity },
    ],
  },
  irmaaTiers: {
    single: [106_000, 133_000, 167_000, 200_000, 500_000],
    married_joint: [212_000, 266_000, 334_000, 400_000, 750_000],
    head_of_household: [106_000, 133_000, 167_000, 200_000, 500_000],
  },
  capitalGainsZeroTop: { single: 48_350, married_joint: 96_700, head_of_household: 64_750 },
};

/** Inflation-adjusts the baseline law forward/backward to a target year. */
export function lawForYear(year: number, inflationPct = 2.5): TaxLawYear {
  const factor = Math.pow(1 + inflationPct / 100, year - BASE_LAW.year);
  const scaleRecord = (r: Record<FilingStatus, number>) =>
    Object.fromEntries(Object.entries(r).map(([k, v]) => [k, Math.round((v * factor) / 50) * 50])) as Record<
      FilingStatus,
      number
    >;
  return {
    year,
    standardDeduction: scaleRecord(BASE_LAW.standardDeduction),
    seniorAddOn: scaleRecord(BASE_LAW.seniorAddOn),
    brackets: Object.fromEntries(
      Object.entries(BASE_LAW.brackets).map(([k, list]) => [
        k,
        list.map((b) => ({ rate: b.rate, upTo: b.upTo === Infinity ? Infinity : Math.round((b.upTo * factor) / 50) * 50 })),
      ]),
    ) as Record<FilingStatus, Bracket[]>,
    irmaaTiers: Object.fromEntries(
      Object.entries(BASE_LAW.irmaaTiers).map(([k, tiers]) => [k, tiers.map((t) => Math.round((t * factor) / 1000) * 1000)]),
    ) as Record<FilingStatus, number[]>,
    capitalGainsZeroTop: scaleRecord(BASE_LAW.capitalGainsZeroTop),
  };
}

/** Federal tax on ordinary taxable income (after deductions). */
export function federalTax(taxableIncome: number, status: FilingStatus, law: TaxLawYear): number {
  let remaining = Math.max(0, taxableIncome);
  let last = 0;
  let tax = 0;
  for (const b of law.brackets[status]) {
    const slice = Math.min(remaining, b.upTo - last);
    if (slice <= 0) break;
    tax += slice * (b.rate / 100);
    remaining -= slice;
    last = b.upTo;
    if (remaining <= 0) break;
  }
  return tax;
}

export function marginalRate(taxableIncome: number, status: FilingStatus, law: TaxLawYear): number {
  const list = law.brackets[status];
  for (const b of list) if (taxableIncome <= b.upTo) return b.rate;
  return list[list.length - 1].rate;
}

/** Dollars of income that still fit inside `targetRate` before spilling over. */
export function bracketHeadroom(
  taxableIncome: number,
  targetRate: number,
  status: FilingStatus,
  law: TaxLawYear,
): number {
  const top = law.brackets[status].find((b) => b.rate === targetRate);
  if (!top || top.upTo === Infinity) return Infinity;
  return Math.max(0, top.upTo - Math.max(0, taxableIncome));
}

export function standardDeduction(status: FilingStatus, law: TaxLawYear, seniors = 0): number {
  return law.standardDeduction[status] + law.seniorAddOn[status] * Math.max(0, seniors);
}

/** IRMAA tier index (0 = no surcharge) plus dollars until the next tier. */
export function irmaaStatus(magi: number, status: FilingStatus, law: TaxLawYear) {
  const tiers = law.irmaaTiers[status];
  let tier = 0;
  for (let i = 0; i < tiers.length; i++) if (magi >= tiers[i]) tier = i + 1;
  const next = tiers[tier];
  return { tier, nextThreshold: next ?? null, roomToNext: next ? Math.max(0, next - magi) : null };
}

export const FILING_LABELS: Record<FilingStatus, string> = {
  single: 'Single',
  married_joint: 'Married filing jointly',
  head_of_household: 'Head of household',
};
