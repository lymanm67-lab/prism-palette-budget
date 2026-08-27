// ---------------------------------------------------------------------------
// LTC tax intelligence — pure functions, no I/O.
//
// Covers four questions the household needs answered:
//   1. How much of the Nationwide premium can plausibly be deducted?
//   2. Does paying premiums from the HSA beat paying with taxable cash?
//   3. Would benefit payments be excluded from income at claim time?
//   4. What are the underlying IRS limits, and what must a CPA confirm?
//
// Nothing here is tax advice. Every output carries a caveat and every limit is
// cited so a tax professional can verify it against the current year's figures.
// ---------------------------------------------------------------------------

import { NW } from './nationwide';

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';

export const FILING_LABEL: Record<FilingStatus, string> = {
  single: 'Single',
  mfj: 'Married filing jointly',
  mfs: 'Married filing separately',
  hoh: 'Head of household',
};

/* ------------------------------------------------------------------------ */
/* IRS age-based eligible LTC premium limits (per insured, per year)         */
/* ------------------------------------------------------------------------ */

export interface AgeBandLimit {
  label: string;
  minAge: number;
  maxAge: number;
  limit: number;
}

/**
 * Eligible long-term care premium limits by attained age at year end.
 * Source: IRS Rev. Proc. age-based eligible LTC premium table (IRC §213(d)(10)).
 * 2025 figures — confirm the current year's amounts with a tax professional.
 */
export const LTC_AGE_LIMITS_2025: AgeBandLimit[] = [
  { label: '40 or under', minAge: 0, maxAge: 40, limit: 480 },
  { label: '41 to 50', minAge: 41, maxAge: 50, limit: 900 },
  { label: '51 to 60', minAge: 51, maxAge: 60, limit: 1800 },
  { label: '61 to 70', minAge: 61, maxAge: 70, limit: 4810 },
  { label: 'over 70', minAge: 71, maxAge: 200, limit: 6020 },
];

export const LTC_LIMIT_YEAR = 2025;

export function ltcPremiumLimitForAge(age: number, table = LTC_AGE_LIMITS_2025): AgeBandLimit {
  return (
    table.find((b) => age >= b.minAge && age <= b.maxAge) ?? table[table.length - 1]
  );
}

/**
 * Per-diem exclusion limit for indemnity-style LTC benefits (IRC §7702B(d)).
 * 2025: $420 per day. Benefits above this are excludable only to the extent of
 * actual qualified LTC costs incurred.
 */
export const LTC_PER_DIEM_LIMIT_2025 = 420;

/** Medical expense deduction floor: expenses above this share of AGI. */
export const MEDICAL_AGI_FLOOR = 0.075;

/* ------------------------------------------------------------------------ */
/* Premium deduction estimator                                              */
/* ------------------------------------------------------------------------ */

export interface PremiumDeductionInputs {
  /** Attained age at year end for each insured on the policy. */
  ages: number[];
  /** Total annual LTC premium paid across all insureds. */
  annualPremium: number;
  filingStatus: FilingStatus;
  agi: number;
  /** Other unreimbursed qualified medical expenses for the year. */
  otherMedicalExpenses: number;
  /** Itemizing unlocks the Schedule A medical deduction path. */
  itemizes: boolean;
  /** Self-employed health-insurance deduction path (above the line). */
  selfEmployedHealthPlan: boolean;
  marginalRate: number; // 0..1
  /** Premium dollars paid from an HSA are already pre-tax — never deductible again. */
  premiumPaidFromHsa?: number;
}

export interface PremiumDeductionResult {
  /** Sum of the per-insured IRS age-based caps. */
  eligiblePremiumCap: number;
  perInsured: { age: number; band: string; limit: number; counted: number }[];
  /** Premium that survives both the age caps and the HSA exclusion. */
  countablePremium: number;
  /** Premium excluded because it was already paid with pre-tax HSA dollars. */
  hsaExcludedPremium: number;
  agiFloor: number;
  totalMedicalExpenses: number;
  deductibleAmount: number;
  estimatedTaxSavings: number;
  path: 'self-employed' | 'schedule-a' | 'none';
  reasons: string[];
}

export function estimatePremiumDeduction(i: PremiumDeductionInputs): PremiumDeductionResult {
  const reasons: string[] = [];
  const hsaExcludedPremium = Math.min(Math.max(0, i.premiumPaidFromHsa ?? 0), i.annualPremium);
  const cashPremium = Math.max(0, i.annualPremium - hsaExcludedPremium);
  if (hsaExcludedPremium > 0) {
    reasons.push(
      'Premium paid from HSA dollars is already tax-free and is removed before applying the age-based caps — it cannot be deducted a second time.',
    );
  }

  // Spread the cash premium across insureds evenly, then cap each by age band.
  const share = i.ages.length > 0 ? cashPremium / i.ages.length : 0;
  const perInsured = i.ages.map((age) => {
    const band = ltcPremiumLimitForAge(age);
    return {
      age,
      band: band.label,
      limit: band.limit,
      counted: Math.min(share, band.limit),
    };
  });
  const eligiblePremiumCap = perInsured.reduce((s, p) => s + p.limit, 0);
  const countablePremium = perInsured.reduce((s, p) => s + p.counted, 0);

  if (countablePremium < cashPremium) {
    reasons.push('Premium above the IRS age-based eligible amount is not treated as a medical expense.');
  }

  if (i.selfEmployedHealthPlan) {
    const deductibleAmount = countablePremium;
    return {
      eligiblePremiumCap,
      perInsured,
      countablePremium,
      hsaExcludedPremium,
      agiFloor: 0,
      totalMedicalExpenses: countablePremium + i.otherMedicalExpenses,
      deductibleAmount: round(deductibleAmount),
      estimatedTaxSavings: round(deductibleAmount * i.marginalRate),
      path: 'self-employed',
      reasons: [
        ...reasons,
        'Self-employed health insurance deduction applies above the line, so the 7.5% AGI floor does not reduce it.',
        'Deduction is limited to net self-employment earnings and requires no eligible employer subsidized plan.',
      ],
    };
  }

  const agiFloor = Math.max(0, i.agi) * MEDICAL_AGI_FLOOR;
  const totalMedicalExpenses = countablePremium + Math.max(0, i.otherMedicalExpenses);
  const overFloor = Math.max(0, totalMedicalExpenses - agiFloor);
  const deductibleAmount = i.itemizes ? overFloor : 0;

  if (!i.itemizes) {
    reasons.push('Standard deduction is being taken, so no Schedule A medical deduction is available this year.');
  } else if (overFloor === 0) {
    reasons.push('Total qualified medical expenses do not exceed 7.5% of AGI, so nothing is deductible this year.');
  }

  return {
    eligiblePremiumCap,
    perInsured,
    countablePremium: round(countablePremium),
    hsaExcludedPremium: round(hsaExcludedPremium),
    agiFloor: round(agiFloor),
    totalMedicalExpenses: round(totalMedicalExpenses),
    deductibleAmount: round(deductibleAmount),
    estimatedTaxSavings: round(deductibleAmount * i.marginalRate),
    path: deductibleAmount > 0 ? 'schedule-a' : 'none',
    reasons,
  };
}

/* ------------------------------------------------------------------------ */
/* HSA vs cash premium funding                                              */
/* ------------------------------------------------------------------------ */

export interface HsaFundingInputs {
  annualPremium: number;
  years: number;
  hsaBalance: number;
  hsaReturnPct: number; // e.g. 6 => 6%
  marginalRate: number; // 0..1
  ages: number[];
  agi: number;
  filingStatus: FilingStatus;
  otherMedicalExpenses: number;
  itemizes: boolean;
}

export interface HsaFundingPath {
  label: string;
  /** Out-of-pocket after-tax dollars required over the horizon. */
  afterTaxCost: number;
  /** HSA balance remaining at the end of the horizon. */
  hsaEndingBalance: number;
  /** Tax benefit captured over the horizon. */
  taxBenefit: number;
  /** Growth given up inside the HSA because dollars were withdrawn. */
  forgoneGrowth: number;
  notes: string[];
}

export interface HsaFundingResult {
  hsaPath: HsaFundingPath;
  cashPath: HsaFundingPath;
  /** Positive means paying from the HSA leaves the household better off. */
  advantageHsa: number;
  winner: 'hsa' | 'cash';
  recommendation: string;
  eligiblePremiumPerYear: number;
}

export function compareHsaVsCash(i: HsaFundingInputs): HsaFundingResult {
  const r = i.hsaReturnPct / 100;
  const cap = i.ages.reduce((s, age) => s + ltcPremiumLimitForAge(age).limit, 0);
  // Only the IRS eligible amount may be paid tax-free from an HSA.
  const hsaEligiblePremium = Math.min(i.annualPremium, cap);
  const cashRemainder = Math.max(0, i.annualPremium - hsaEligiblePremium);

  // --- HSA path: withdraw the eligible premium each year, tax-free.
  let hsaBal = i.hsaBalance;
  for (let y = 0; y < i.years; y++) {
    hsaBal = Math.max(0, hsaBal - hsaEligiblePremium) * (1 + r);
  }

  // --- Cash path: HSA untouched and compounding; premium from taxable cash.
  const cashBal = i.hsaBalance * (1 + r) ** i.years;

  const cashDeduction = estimatePremiumDeduction({
    ages: i.ages,
    annualPremium: i.annualPremium,
    filingStatus: i.filingStatus,
    agi: i.agi,
    otherMedicalExpenses: i.otherMedicalExpenses,
    itemizes: i.itemizes,
    selfEmployedHealthPlan: false,
    marginalRate: i.marginalRate,
  });

  const hsaPath: HsaFundingPath = {
    label: 'Pay premiums from the HSA',
    // Out-of-pocket dollars are compared at future value so both paths are
    // measured at the same point in time.
    afterTaxCost: round(fvAnnuity(cashRemainder, i.years, r)),
    hsaEndingBalance: round(hsaBal),
    taxBenefit: round(hsaEligiblePremium * i.years * i.marginalRate),
    forgoneGrowth: round(cashBal - hsaBal),
    notes: [
      'Qualified LTC premiums up to the IRS age-based eligible amount are a qualified HSA expense.',
      'HSA dollars were contributed pre-tax and withdraw tax-free for this purpose — a full exclusion, not a deduction.',
      'Premium above the eligible amount must still be paid with after-tax cash.',
      'Withdrawn dollars stop compounding inside the HSA.',
    ],
  };

  const cashPath: HsaFundingPath = {
    label: 'Pay premiums with taxable cash',
    afterTaxCost: round(
      fvAnnuity(i.annualPremium - cashDeduction.estimatedTaxSavings, i.years, r),
    ),
    hsaEndingBalance: round(cashBal),
    taxBenefit: round(cashDeduction.estimatedTaxSavings * i.years),
    forgoneGrowth: 0,
    notes: [
      'HSA keeps compounding tax-free for later qualified medical costs.',
      'Any deduction depends on itemizing and clearing the 7.5% AGI medical floor.',
      cashDeduction.path === 'none'
        ? 'On the current inputs no premium deduction is available, so this path costs full after-tax dollars.'
        : 'Deduction is limited to the IRS age-based eligible premium amount.',
    ],
  };

  // Compare total household position: ending HSA balance less after-tax outlay.
  const hsaNet = hsaPath.hsaEndingBalance - hsaPath.afterTaxCost;
  const cashNet = cashPath.hsaEndingBalance - cashPath.afterTaxCost;
  const advantageHsa = round(hsaNet - cashNet);

  return {
    hsaPath,
    cashPath,
    advantageHsa,
    winner: advantageHsa >= 0 ? 'hsa' : 'cash',
    eligiblePremiumPerYear: round(hsaEligiblePremium),
    recommendation:
      advantageHsa >= 0
        ? 'Paying eligible premium from the HSA converts pre-tax dollars into coverage with no deduction hurdles, and wins on these inputs.'
        : 'Leaving the HSA invested wins on these inputs — the tax-free growth given up exceeds the exclusion captured.',
  };
}

/* ------------------------------------------------------------------------ */
/* Benefit taxability                                                       */
/* ------------------------------------------------------------------------ */

export type BenefitTaxStatus = 'likely-excluded' | 'partially-taxable' | 'needs-review';

export interface BenefitTaxInputs {
  /** Monthly LTC benefit elected at claim. */
  monthlyBenefit: number;
  /** Actual qualified LTC costs incurred per month. */
  monthlyQualifiedCost: number;
  /** Days in the benefit month used for the per-diem test. */
  daysInMonth?: number;
  /** Licensed practitioner certified 2+ ADL loss or severe cognitive impairment. */
  chronicallyIllCertified: boolean;
  /** A qualifying plan of care is on file. */
  planOfCareOnFile: boolean;
  /** Policy is intended to be tax-qualified under IRC §7702B. */
  taxQualifiedContract: boolean;
  perDiemLimit?: number;
}

export interface BenefitTaxResult {
  status: BenefitTaxStatus;
  perDiemLimit: number;
  monthlyPerDiemAllowance: number;
  /** Larger of actual qualified costs and the per-diem allowance. */
  excludableAmount: number;
  potentiallyTaxable: number;
  tests: { label: string; passed: boolean; detail: string }[];
  summary: string;
  caveat: string;
}

export function assessBenefitTaxability(i: BenefitTaxInputs): BenefitTaxResult {
  const days = i.daysInMonth ?? 30;
  const perDiemLimit = i.perDiemLimit ?? LTC_PER_DIEM_LIMIT_2025;
  const monthlyPerDiemAllowance = perDiemLimit * days;

  const tests = [
    {
      label: 'Tax-qualified LTC contract (IRC §7702B)',
      passed: i.taxQualifiedContract,
      detail: 'Benefits from a qualified contract are treated as amounts received for personal injury or sickness.',
    },
    {
      label: 'Chronically ill certification',
      passed: i.chronicallyIllCertified,
      detail: 'Requires certification of at least two ADL deficiencies for 90+ days, or severe cognitive impairment.',
    },
    {
      label: 'Plan of care on file',
      passed: i.planOfCareOnFile,
      detail: 'A licensed practitioner plan of care supports the claim and the informal-care flexibility of cash indemnity.',
    },
  ];

  const excludableAmount = Math.max(
    Math.max(0, i.monthlyQualifiedCost),
    monthlyPerDiemAllowance,
  );
  const potentiallyTaxable = Math.max(0, i.monthlyBenefit - excludableAmount);
  const allPassed = tests.every((t) => t.passed);

  const status: BenefitTaxStatus = !allPassed
    ? 'needs-review'
    : potentiallyTaxable > 0
    ? 'partially-taxable'
    : 'likely-excluded';

  const summary =
    status === 'likely-excluded'
      ? 'On these assumptions the full monthly benefit would likely be excluded from income.'
      : status === 'partially-taxable'
      ? 'The benefit exceeds both the per-diem allowance and actual qualified costs, so the excess could be taxable income.'
      : 'One or more qualification tests is unmet, so taxability cannot be assumed. Resolve certification and plan of care first.';

  return {
    status,
    perDiemLimit,
    monthlyPerDiemAllowance: round(monthlyPerDiemAllowance),
    excludableAmount: round(excludableAmount),
    potentiallyTaxable: round(potentiallyTaxable),
    tests,
    summary,
    caveat:
      'Cash indemnity benefits are reported on Form 1099-LTC. Exclusion depends on the greater of actual qualified LTC expenses or the statutory per-diem amount. Confirm with a tax professional.',
  };
}

/* ------------------------------------------------------------------------ */
/* Documentation panel                                                      */
/* ------------------------------------------------------------------------ */

export const IRS_LIMIT_CITATIONS = [
  {
    topic: 'Age-based eligible LTC premium',
    authority: 'IRC §213(d)(10); annual IRS Revenue Procedure table',
    detail: `Eligible premium is capped by attained age at year end: ${LTC_AGE_LIMITS_2025
      .map((b) => `${b.label} — $${b.limit.toLocaleString()}`)
      .join('; ')} (${LTC_LIMIT_YEAR}).`,
  },
  {
    topic: 'Medical expense floor',
    authority: 'IRC §213(a)',
    detail: 'Unreimbursed qualified medical expenses are deductible only above 7.5% of AGI, and only when itemizing.',
  },
  {
    topic: 'Per-diem benefit exclusion',
    authority: 'IRC §7702B(d)',
    detail: `Indemnity benefits are excludable up to the greater of actual qualified LTC costs or $${LTC_PER_DIEM_LIMIT_2025} per day (${LTC_LIMIT_YEAR}).`,
  },
  {
    topic: 'HSA-qualified LTC premium',
    authority: 'IRC §223(d)(2)(C); Pub. 969',
    detail: 'HSA distributions may pay qualified LTC insurance premiums tax-free, limited to the age-based eligible amount.',
  },
  {
    topic: 'Self-employed health insurance deduction',
    authority: 'IRC §162(l)',
    detail: 'Self-employed taxpayers may deduct eligible LTC premium above the line, limited to net self-employment earnings.',
  },
  {
    topic: 'Benefit reporting',
    authority: 'Form 1099-LTC instructions',
    detail: 'The carrier reports LTC benefits paid and whether they were per-diem or reimbursement based.',
  },
] as const;

export const MUST_CONFIRM_WITH_CPA = [
  'Current-year age-based eligible premium and per-diem amounts.',
  'Whether the issued Nationwide contract is tax-qualified under IRC §7702B.',
  'Filing status, AGI, and whether itemizing beats the standard deduction this year.',
  'Eligibility for the self-employed health insurance deduction, including net SE earnings.',
  'State-level LTC premium credits or deductions.',
  'Coordination of HSA distributions with any premium deduction claimed.',
] as const;

export const TAX_DISCLAIMER =
  'PrismMoney™ provides planning estimates only and is not a tax advisor. Figures use published IRS limits for the stated year and your entered assumptions. Confirm every number with a qualified tax professional before filing.';

/* ------------------------------------------------------------------------ */

/** Default estimator inputs wired to the Nationwide plan of record. */
export const NW_TAX_DEFAULTS: PremiumDeductionInputs = {
  ages: [59, 57],
  annualPremium: NW.annualPremium,
  filingStatus: 'mfj',
  agi: 112_000,
  otherMedicalExpenses: 4_000,
  itemizes: false,
  selfEmployedHealthPlan: false,
  marginalRate: 0.22,
  premiumPaidFromHsa: 0,
};

/** Future value of an ordinary annuity of `payment` for `years` at rate `r`. */
function fvAnnuity(payment: number, years: number, r: number) {
  if (payment === 0 || years <= 0) return 0;
  if (r === 0) return payment * years;
  // Annuity-due: premiums are paid at the start of each policy year, matching
  // the HSA withdrawal timing used in the projection loop.
  return payment * (((1 + r) ** years - 1) / r) * (1 + r);
}

function round(n: number) {
  return Math.round(n * 100) / 100;
}
