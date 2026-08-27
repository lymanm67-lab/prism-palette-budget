// ---------------------------------------------------------------------------
// Nationwide CareMatters Together — plan of record.
//
// Every value marked `illustrated: true` comes straight off the Nationwide
// proposal. Anything else is an app planning estimate produced by applying the
// contract's 3% compound inflation protection, and is labelled as such in the
// UI. The issued contract always controls.
// ---------------------------------------------------------------------------

import type { LtcPolicy } from './model';

export const NW_CARRIER = 'Nationwide Life and Annuity Insurance Company';
export const NW_PRODUCT = 'Nationwide CareMatters Together';
export const NW_POLICY_ID = 'nationwide-carematters-together';

/** Age of the older insured (Lyman) when the illustration was produced. */
export const NW_BASE_AGE = 59;
export const NW_POLICY_START_YEAR = 2026;

export const NW = {
  /** Combined household premium, guaranteed per the current illustration. */
  monthlyPremium: 291.96,
  annualPremium: 3503.52,
  premiumPayPeriod: 'Pay to age 100 of the older insured',
  /** Initial maximum monthly LTC benefit, per insured. */
  monthlyBenefitEach: 2000,
  /** Maximum number of full monthly LTC benefit payments. */
  maxFullPayments: 72,
  /** Initial total LTC benefit (shared pool). */
  initialTotalBenefit: 155245,
  inflationPct: 3,
  /** Illustrated monthly benefit per insured at older-insured age 85. */
  illustratedMonthlyAt85: 4313,
  /** Illustrated total LTC benefits at older-insured age 85. */
  illustratedTotalAt85: 334800,
  initialSpecifiedAmount: 72001,
  guaranteedMinimumDeathBenefit: 7200,
  eliminationDays: 90,
} as const;

export const NW_FEATURES = [
  'Cash Indemnity',
  'Shared Couple Coverage',
  '$2,000 Initial Monthly Benefit Per Insured',
  '3% Compound Lifetime Inflation',
  '72 Full Monthly Payments',
  '$291.96 Combined Monthly Premium',
  'Guaranteed Premium',
  'Death Benefit',
  'Cash Surrender Value',
  'Informal Care Flexibility',
  'Retroactive Benefits After Elimination Period',
] as const;

export const NW_CASH_INDEMNITY_ADVANTAGES = [
  'No monthly reimbursement paperwork for qualifying expenses after claim approval.',
  'No requirement to match the LTC benefit dollar-for-dollar with submitted bills.',
  'Up to 100% of the available monthly benefit may be elected.',
  'Benefits may be used for informal care when supported by the required plan of care.',
  'Nationwide places no restriction on how received LTC benefit payments are ultimately spent.',
  'The household controls how LTC cash supports care needs.',
] as const;

export const NW_CASH_INDEMNITY_TOOLTIP =
  'Cash indemnity means the policy pays the available benefit after claim qualification rather than reimbursing only documented qualifying expenses.';

export const NW_PLANNING_NOTICE =
  'This app summarizes values from the current Nationwide CareMatters Together illustration. The issued insurance contract controls all benefits, claims, exclusions, premium obligations, inflation adjustments, surrender values, death benefits, and other policy provisions. Projections shown by this application are for planning purposes only.';

export const NW_DECISION_SUMMARY = `Long-Term Care insurance is not intended to replace our HSA, retirement accounts, pension, Social Security, or other household wealth. Its purpose is to protect those assets from unnecessary depletion if one or both spouses experience a major Long-Term Care event.

Nationwide CareMatters Together adds a flexible shared LTC benefit, cash indemnity access, inflation protection, premium predictability, life insurance protection, and surrender value.

Our strategy combines insurance with self-funding rather than attempting to insure every dollar of future healthcare expense.`;

export const NW_REDUCED_PAID_UP = {
  title: 'What If Premium Payments Stop?',
  body: 'If the policy enters a grace period because scheduled premiums are not paid, Nationwide may allow the policyowner to either surrender the policy or elect a reduced paid-up insurance option, subject to policy requirements.',
  reduces: [
    'Monthly LTC benefit',
    'Available LTC pool',
    'Life insurance amount',
    'Other policy values',
  ],
  note: 'This app does not model a specific reduced paid-up benefit. Enter actual Nationwide reduced paid-up figures before relying on any number.',
} as const;

/** The policy of record, expressed in the shared LtcPolicy shape. */
export const NATIONWIDE_POLICY: LtcPolicy = {
  id: NW_POLICY_ID,
  carrier: NW_CARRIER,
  product: NW_PRODUCT,
  startingMonthlyBenefit: NW.monthlyBenefitEach,
  benefitPeriodMonths: NW.maxFullPayments,
  poolEach: NW.initialTotalBenefit,
  inflationPct: NW.inflationPct,
  inflationCompound: true,
  inflationLifetime: true,
  homeCarePct: 100,
  assistedLivingPct: 100,
  nursingPct: 100,
  /** Cash indemnity: up to 100% of the available monthly benefit may be elected. */
  cashBenefitPct: 100,
  eliminationDays: NW.eliminationDays,
  partnershipQualified: false,
  sharedCare: true,
  premiumWaiver: false,
  jointApplicantDiscount: true,
  combinedMonthlyPremium: NW.monthlyPremium,
  seeded: true,
  notes:
    'Linked life insurance and Long-Term Care policy. Joint coverage for Lyman and Kateri with a flexible shared LTC benefit pool, cash indemnity claims, and guaranteed premium per the current illustration.',
};

/* ------------------------------------------------------------------------ */
/* Inflation projection                                                      */
/* ------------------------------------------------------------------------ */

const factor = (years: number) => Math.pow(1 + NW.inflationPct / 100, Math.max(0, years));

/** Monthly LTC benefit per insured at an older-insured age. */
export const nwMonthlyBenefitAtAge = (age: number) =>
  NW.monthlyBenefitEach * factor(age - NW_BASE_AGE);

/** Total shared LTC benefit pool at an older-insured age. */
export const nwTotalBenefitAtAge = (age: number) =>
  NW.initialTotalBenefit * factor(age - NW_BASE_AGE);

/** Ages where the Nationwide illustration prints an exact value. */
export const NW_ILLUSTRATED_AGES = [NW_BASE_AGE, 85] as const;
export const isIllustratedAge = (age: number) =>
  (NW_ILLUSTRATED_AGES as readonly number[]).includes(age);

export interface NwBenefitRow {
  age: number;
  monthlyBenefit: number;
  totalBenefit: number;
  /** True when the figure is printed on the Nationwide illustration. */
  illustrated: boolean;
  label: 'Policy Illustration Value' | 'Planning Estimate Based on 3% Annual Compounding';
}

export const NW_PROJECTION_AGES = [NW_BASE_AGE, 65, 70, 75, 80, 85, 90, 95] as const;

export function nwBenefitLadder(ages: readonly number[] = NW_PROJECTION_AGES): NwBenefitRow[] {
  return ages.map((age) => {
    const illustrated = isIllustratedAge(age);
    return {
      age,
      monthlyBenefit: age === 85 ? NW.illustratedMonthlyAt85 : nwMonthlyBenefitAtAge(age),
      totalBenefit: age === 85 ? NW.illustratedTotalAt85 : nwTotalBenefitAtAge(age),
      illustrated,
      label: illustrated
        ? 'Policy Illustration Value'
        : 'Planning Estimate Based on 3% Annual Compounding',
    };
  });
}

/* ------------------------------------------------------------------------ */
/* Elimination period                                                        */
/* ------------------------------------------------------------------------ */

/**
 * The structure provides retroactive benefits once the 90-day elimination
 * period is completed, so the first payment illustrates as roughly four months
 * of benefit at the claim-age monthly amount.
 */
export function nwEliminationBridge(age = 85) {
  const monthly = age === 85 ? NW.illustratedMonthlyAt85 : nwMonthlyBenefitAtAge(age);
  const retroMonths = 4;
  return {
    age,
    monthly,
    eliminationDays: NW.eliminationDays,
    retroMonths,
    firstPayment: monthly * retroMonths,
    illustrated: isIllustratedAge(age),
  };
}

/* ------------------------------------------------------------------------ */
/* Shared benefit pool                                                       */
/* ------------------------------------------------------------------------ */

export type PoolScenario =
  | 'lymanMore'
  | 'kateriMore'
  | 'equal'
  | 'oneSpouseOnly'
  | 'simultaneous';

export const POOL_SCENARIO_LABEL: Record<PoolScenario, string> = {
  lymanMore: 'Lyman uses more care',
  kateriMore: 'Kateri uses more care',
  equal: 'Equal usage',
  oneSpouseOnly: 'One spouse never requires LTC',
  simultaneous: 'Both spouses require care at the same time',
};

/** Share of the shared pool consumed by each spouse under a scenario. */
const POOL_SPLIT: Record<PoolScenario, { lyman: number; kateri: number }> = {
  lymanMore: { lyman: 0.7, kateri: 0.2 },
  kateriMore: { lyman: 0.2, kateri: 0.7 },
  equal: { lyman: 0.45, kateri: 0.45 },
  oneSpouseOnly: { lyman: 0.8, kateri: 0 },
  simultaneous: { lyman: 0.5, kateri: 0.5 },
};

export interface SharedPoolResult {
  scenario: PoolScenario;
  age: number;
  pool: number;
  usedLyman: number;
  usedKateri: number;
  used: number;
  remaining: number;
  remainingPct: number;
  monthlyBenefitEach: number;
  note: string;
}

/**
 * Benefits respond to whichever spouse ultimately has the greater care need —
 * the model never forces a 50/50 assumption.
 */
export function sharedPool(scenario: PoolScenario, age = 85, usagePct?: { lyman: number; kateri: number }): SharedPoolResult {
  const pool = age === 85 ? NW.illustratedTotalAt85 : nwTotalBenefitAtAge(age);
  const split = usagePct
    ? { lyman: usagePct.lyman / 100, kateri: usagePct.kateri / 100 }
    : POOL_SPLIT[scenario];
  const usedLyman = pool * Math.max(0, split.lyman);
  const usedKateri = pool * Math.max(0, split.kateri);
  const used = Math.min(pool, usedLyman + usedKateri);
  const NOTES: Record<PoolScenario, string> = {
    lymanMore: 'Lyman draws the majority of the shared pool; Kateri retains the remainder.',
    kateriMore: 'Kateri draws the majority of the shared pool; Lyman retains the remainder.',
    equal: 'Both spouses draw similar amounts — an assumption, not a policy requirement.',
    oneSpouseOnly: 'One spouse never claims, so the surviving benefit stays available for the other.',
    simultaneous: 'Both claim at once, which consumes the shared pool fastest.',
  };
  return {
    scenario,
    age,
    pool,
    usedLyman,
    usedKateri,
    used,
    remaining: Math.max(0, pool - used),
    remainingPct: pool > 0 ? Math.max(0, (pool - used) / pool) * 100 : 0,
    monthlyBenefitEach: age === 85 ? NW.illustratedMonthlyAt85 : nwMonthlyBenefitAtAge(age),
    note: NOTES[scenario],
  };
}

/* ------------------------------------------------------------------------ */
/* Surrender value (Policy Exit Value)                                       */
/* ------------------------------------------------------------------------ */

/** Illustrated net surrender values by policy year. */
export const NW_SURRENDER_VALUES: { year: number; value: number }[] = [
  { year: 1, value: 1870 },
  { year: 5, value: 6731 },
  { year: 10, value: 13806 },
  { year: 15, value: 22051 },
  { year: 20, value: 31337 },
  { year: 25, value: 41140 },
  { year: 30, value: 50320 },
  { year: 35, value: 57570 },
  { year: 40, value: 63623 },
];

export const NW_SURRENDER_NOTE =
  'Net surrender value can be reduced by LTC benefits previously paid, policy indebtedness, unpaid charges, loans, partial surrenders, or other policy adjustments.';

/** Straight-line interpolation between illustrated surrender-value years. */
export function surrenderValueAtYear(year: number): { value: number; illustrated: boolean } {
  const pts = NW_SURRENDER_VALUES;
  const exact = pts.find((p) => p.year === year);
  if (exact) return { value: exact.value, illustrated: true };
  if (year <= pts[0].year) return { value: 0, illustrated: false };
  const last = pts[pts.length - 1];
  if (year >= last.year) return { value: last.value, illustrated: false };
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    if (year > a.year && year < b.year) {
      const t = (year - a.year) / (b.year - a.year);
      return { value: a.value + (b.value - a.value) * t, illustrated: false };
    }
  }
  return { value: 0, illustrated: false };
}

export const policyYearFor = (calendarYear: number) =>
  Math.max(1, calendarYear - NW_POLICY_START_YEAR + 1);

/* ------------------------------------------------------------------------ */
/* Three ways the policy can create value                                    */
/* ------------------------------------------------------------------------ */

export const NW_VALUE_PATHS = [
  {
    key: 'care',
    title: 'Outcome 1: LTC Is Needed',
    body: 'The policy pays qualifying LTC cash benefits from the shared pool.',
    branch: 'Care Needed → LTC Cash',
  },
  {
    key: 'death',
    title: 'Outcome 2: LTC Is Not Needed',
    body: 'Applicable life insurance proceeds pass to beneficiaries according to the policy.',
    branch: 'No Care Needed → Death Benefit',
  },
  {
    key: 'exit',
    title: 'Outcome 3: LTC Benefits Are Fully Used',
    body: 'The current illustration provides a guaranteed minimum death benefit of approximately $7,200, subject to policy terms, indebtedness, loans, withdrawals, and other adjustments.',
    branch: 'Policy Surrendered → Surrender Value',
  },
] as const;

/* ------------------------------------------------------------------------ */
/* LTC stress testing                                                       */
/* ------------------------------------------------------------------------ */

export const STRESS_CLAIM_AGES = [70, 75, 80, 85, 90] as const;
export const STRESS_DURATIONS = [1, 2, 3, 4, 5, 6] as const;
export const STRESS_COST_PRESETS = [5000, 7500, 10000, 12500] as const;

export interface StressInputs {
  claimAge: number;
  careYears: number;
  monthlyCareCost: number;
  /** HSA balance available today (grown to the claim age at hsaReturnPct). */
  hsaBalance: number;
  hsaReturnPct: number;
  /** Pension + Social Security cash flow available for care each month. */
  monthlyIncomeAvailable: number;
  taxableAssets: number;
  retirementAssets: number;
}

export const DEFAULT_STRESS: StressInputs = {
  claimAge: 85,
  careYears: 3,
  monthlyCareCost: 7500,
  hsaBalance: 0,
  hsaReturnPct: 6,
  monthlyIncomeAvailable: 2000,
  taxableAssets: 2609,
  retirementAssets: 181505,
};

export interface StressLayer {
  key: 'insurance' | 'hsa' | 'income' | 'taxable' | 'retirement';
  label: string;
  applied: number;
  remainingGap: number;
  detail: string;
}

export interface StressResult {
  inputs: StressInputs;
  months: number;
  /** Nationwide monthly benefit at the claim age (per insured). */
  monthlyBenefit: number;
  benefitIllustrated: boolean;
  monthlyGap: number;
  coveragePct: number;
  totalCareCost: number;
  /** Months the shared pool can actually pay a full benefit. */
  payableMonths: number;
  insurancePaid: number;
  poolAtClaim: number;
  poolExhausted: boolean;
  eliminationCost: number;
  retroactiveFirstPayment: number;
  totalGap: number;
  layers: StressLayer[];
  uncoveredGap: number;
  /** Investment assets that would otherwise have funded the insured portion. */
  portfolioAssetsProtected: number;
  hsaAtClaim: number;
}

/**
 * Runs one care event against the Nationwide policy and walks the remaining
 * gap through the funding waterfall: insurance → HSA → household cash flow →
 * taxable → retirement assets.
 */
export function runStressTest(inputs: StressInputs): StressResult {
  const months = Math.max(0, inputs.careYears) * 12;
  const monthlyBenefit =
    inputs.claimAge === 85 ? NW.illustratedMonthlyAt85 : nwMonthlyBenefitAtAge(inputs.claimAge);
  const poolAtClaim =
    inputs.claimAge === 85 ? NW.illustratedTotalAt85 : nwTotalBenefitAtAge(inputs.claimAge);

  const elimMonths = NW.eliminationDays / 30;
  const totalCareCost = inputs.monthlyCareCost * months;
  const eliminationCost = inputs.monthlyCareCost * elimMonths;

  // Cash indemnity: the household may elect up to 100% of the available
  // monthly benefit, capped by the shared pool and the 72-payment maximum.
  const claimableMonths = Math.max(0, Math.min(months - elimMonths, NW.maxFullPayments));
  const monthlyElected = Math.min(monthlyBenefit, Math.max(0, inputs.monthlyCareCost));
  const insurancePaid = Math.min(monthlyElected * claimableMonths, poolAtClaim);
  const payableMonths = monthlyElected > 0 ? Math.min(claimableMonths, poolAtClaim / monthlyElected) : 0;

  const monthlyGap = Math.max(0, inputs.monthlyCareCost - monthlyBenefit);
  const coveragePct =
    inputs.monthlyCareCost > 0 ? Math.min(100, (monthlyBenefit / inputs.monthlyCareCost) * 100) : 100;

  const totalGap = Math.max(0, totalCareCost - insurancePaid);

  const yearsToClaim = Math.max(0, inputs.claimAge - NW_BASE_AGE);
  const hsaAtClaim = inputs.hsaBalance * Math.pow(1 + inputs.hsaReturnPct / 100, yearsToClaim);
  const incomeAvailable = Math.max(0, inputs.monthlyIncomeAvailable) * months;

  const layers: StressLayer[] = [];
  let gap = totalGap;
  const push = (key: StressLayer['key'], label: string, avail: number, detail: string) => {
    const applied = Math.max(0, Math.min(gap, avail));
    gap -= applied;
    layers.push({ key, label, applied, remainingGap: gap, detail });
  };

  layers.push({
    key: 'insurance',
    label: 'Nationwide LTC (cash indemnity)',
    applied: insurancePaid,
    remainingGap: totalGap,
    detail: `${Math.round(payableMonths)} of ${months} months paid from the shared pool.`,
  });
  push('hsa', 'HSA healthcare reserve', hsaAtClaim, 'Qualified healthcare and eligible LTC-related costs.');
  push('income', 'Pension & Social Security cash flow', incomeAvailable, 'Household cash flow directed to care.');
  push('taxable', 'Taxable assets', inputs.taxableAssets, 'Self-directed brokerage drawn before retirement accounts.');
  push('retirement', 'Retirement assets', inputs.retirementAssets, 'Last funding source — protects the legacy base.');

  return {
    inputs,
    months,
    monthlyBenefit,
    benefitIllustrated: isIllustratedAge(inputs.claimAge),
    monthlyGap,
    coveragePct,
    totalCareCost,
    payableMonths,
    insurancePaid,
    poolAtClaim,
    poolExhausted: insurancePaid >= poolAtClaim - 1,
    eliminationCost,
    retroactiveFirstPayment: monthlyBenefit * 4,
    totalGap,
    layers,
    uncoveredGap: Math.max(0, gap),
    // Without the policy this cost would have come out of invested assets.
    portfolioAssetsProtected: insurancePaid,
    hsaAtClaim,
  };
}

export const NW_WATERFALL = [
  { step: 1, label: 'Nationwide LTC', body: 'Use LTC insurance first when a qualifying LTC claim exists.' },
  { step: 2, label: 'HSA', body: 'Use the HSA for qualified healthcare expenses, LTC gaps, deductibles, and eligible LTC-related costs outside insurance coverage.' },
  { step: 3, label: 'Household Cash Flow', body: 'Pension and Social Security income absorb manageable ongoing costs.' },
  { step: 4, label: 'Retirement Assets', body: 'Retirement and investment assets are used only after insurance and healthcare reserves have been considered.' },
] as const;

export const NW_WATERFALL_MESSAGE =
  'Insurance protects the portfolio. The HSA helps fill the gap. Retirement assets remain the long-term wealth and legacy base.';
