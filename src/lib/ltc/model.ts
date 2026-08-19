// Long-Term Care Decision Dashboard — master model.
// Philosophy: LTC insurance transfers a major risk. It is not meant to replace
// every future dollar of care cost. Every calculation here compares premium
// paid against retirement capital potentially protected.

export interface LtcPolicy {
  id: string;
  carrier: string;
  product: string;
  /** Starting monthly benefit per person. */
  startingMonthlyBenefit: number;
  benefitPeriodMonths: number;
  /** Initial policy limit (pool) per person. */
  poolEach: number;
  inflationPct: number;
  inflationCompound: boolean;
  inflationLifetime: boolean;
  homeCarePct: number;
  assistedLivingPct: number;
  nursingPct: number;
  cashBenefitPct: number;
  eliminationDays: number;
  partnershipQualified: boolean;
  sharedCare: boolean;
  premiumWaiver: boolean;
  jointApplicantDiscount: boolean;
  /** Per-spouse premiums when quoted individually. */
  premiumLyman?: number;
  premiumKateri?: number;
  /** Combined household monthly premium (authoritative when set). */
  combinedMonthlyPremium: number;
  seeded?: boolean;
  notes?: string;
}

export interface LtcHousehold {
  lymanAge: number;
  kateriAge: number;
  city: string;
  /** Today's in-home care cost per month in the local market. */
  homeCareMonthly: number;
  dailyLow: number;
  dailyHigh: number;
  careCostGrowthPct: number;
  assumedClaimAge: number;
  assumedCareYears: number;
  retirementBalance: number;
  expectedReturnPct: number;
  monthlyHouseholdIncome: number;
  lastReviewed: string;
  nextReview: string;
}

export interface LtcWeights {
  affordability: number;
  inflation: number;
  benefit: number;
  flexibility: number;
  partnership: number;
  homeCare: number;
  cash: number;
}

export interface SweetSpotRung {
  benefit: number;
  premiumLyman: number;
  premiumKateri: number;
}

/** A single monthly LTC premium payment logged into the binder. */
export interface PremiumPayment {
  id: string;
  /** Month paid, YYYY-MM. */
  month: string;
  /** Date the payment actually cleared. */
  paidOn: string;
  amountLyman: number;
  amountKateri: number;
  method?: string;
  confirmation?: string;
  notes?: string;
}


/**
 * A renewal / rate-action notice from the carrier. LTC premiums are not
 * guaranteed level — carriers can file class-wide increases, so every notice is
 * logged with the old and new premium and how it was answered.
 */
export interface RenewalNotice {
  id: string;
  /** Effective date of the new premium. */
  effectiveDate: string;
  /** Date the notice arrived. */
  noticeDate?: string;
  carrier: string;
  oldMonthlyPremium: number;
  newMonthlyPremium: number;
  /** Monthly benefit in force after the action (landing spot if benefit was cut). */
  monthlyBenefit?: number;
  /** How the increase was handled. */
  response: 'accepted' | 'reducedBenefit' | 'shortenedPeriod' | 'reducedInflation' | 'nonforfeiture' | 'pending' | 'declined';
  filingPct?: number;
  notes?: string;
}

export const RENEWAL_RESPONSE_LABEL: Record<RenewalNotice['response'], string> = {
  accepted: 'Paid the increase',
  reducedBenefit: 'Reduced monthly benefit',
  shortenedPeriod: 'Shortened benefit period',
  reducedInflation: 'Reduced inflation rider',
  nonforfeiture: 'Took nonforfeiture option',
  pending: 'Decision pending',
  declined: 'Declined / lapsed',
};

export interface LtcState {
  household: LtcHousehold;
  policies: LtcPolicy[];
  currentPolicyId: string;
  weights: LtcWeights;
  sweetSpot: SweetSpotRung[];
  reviewLog: { date: string; premium: number; benefit: number; careCost: number; notes?: string }[];
  /** Monthly premium payment ledger (binder / plan of record). */
  premiumLog?: PremiumPayment[];
  /** Carrier renewal / rate-increase history. */
  renewals?: RenewalNotice[];


  /** Location-based care cost + agency comparison (see ./location). */
  location?: import('./location').LtcLocationState;
  asOf: string;
}


// ---------------------------------------------------------------------------
// Seeded carriers (household quotes on file)
// ---------------------------------------------------------------------------

const base = {
  benefitPeriodMonths: 36,
  homeCarePct: 100,
  assistedLivingPct: 100,
  nursingPct: 100,
  eliminationDays: 90,
  inflationCompound: true,
  inflationLifetime: true,
  sharedCare: false,
  premiumWaiver: true,
  jointApplicantDiscount: true,
  seeded: true,
};

export const SEED_POLICIES: LtcPolicy[] = [
  {
    ...base, id: 'moo-2100-3', carrier: 'Mutual of Omaha', product: 'MutualCare Secure Solution',
    startingMonthlyBenefit: 2100, poolEach: 75600, inflationPct: 3, cashBenefitPct: 25,
    partnershipQualified: true, premiumLyman: 85.19, premiumKateri: 128.21, combinedMonthlyPremium: 213.40,
    notes: 'Current leading strategy. Cash benefit $525/mo (25% of home health care benefit).',
  },
  {
    ...base, id: 'thrivent-3000-3', carrier: 'Thrivent', product: '3% Compound Plan',
    startingMonthlyBenefit: 3000, poolEach: 108000, inflationPct: 3, cashBenefitPct: 0,
    partnershipQualified: true, combinedMonthlyPremium: 257.51,
  },
  {
    ...base, id: 'ngl-3000-3', carrier: 'National Guardian Life', product: 'HonestLTC 3%',
    startingMonthlyBenefit: 3000, poolEach: 108000, inflationPct: 3, cashBenefitPct: 0,
    partnershipQualified: true, combinedMonthlyPremium: 262,
  },
  {
    ...base, id: 'thrivent-3000-2', carrier: 'Thrivent', product: '2% Compound Plan',
    startingMonthlyBenefit: 3000, poolEach: 108000, inflationPct: 2, cashBenefitPct: 0,
    partnershipQualified: false, combinedMonthlyPremium: 218.79,
  },
  {
    ...base, id: 'ngl-3000-2', carrier: 'National Guardian Life', product: 'HonestLTC 2%',
    startingMonthlyBenefit: 3000, poolEach: 108000, inflationPct: 2, cashBenefitPct: 0,
    partnershipQualified: true, combinedMonthlyPremium: 220,
  },
  {
    ...base, id: 'moo-3000-2', carrier: 'Mutual of Omaha', product: 'Secure Solution $3,000 / 2%',
    startingMonthlyBenefit: 3000, poolEach: 108000, inflationPct: 2, cashBenefitPct: 25,
    partnershipQualified: false, combinedMonthlyPremium: 242.23,
  },
  {
    ...base, id: 'moo-3000-3', carrier: 'Mutual of Omaha', product: 'Secure Solution $3,000 / 3%',
    startingMonthlyBenefit: 3000, poolEach: 108000, inflationPct: 3, cashBenefitPct: 25,
    partnershipQualified: true, combinedMonthlyPremium: 313.17,
  },
];

export const DOC_CATEGORIES = [
  'Mutual of Omaha',
  'Thrivent',
  'National Guardian Life',
  'Other LTC Quotes',
  'Policy Contracts',
  'Benefit Summaries',
  'Annual Statements',
  'Rate Increase Notices',
  'Other',
] as const;

export function defaultState(partial?: Partial<LtcState>): LtcState {
  const today = new Date().toISOString().slice(0, 10);
  const next = `${new Date().getFullYear() + 1}-${today.slice(5)}`;
  const d: LtcState = {
    asOf: today,
    currentPolicyId: 'moo-2100-3',
    household: {
      lymanAge: 59, kateriAge: 55, city: 'Akron, Ohio',
      // Akron OH non-medical home care daily rate: $128–$140 (verified Aug 2026).
      // $4,195/mo ≈ high end of range (~$135/day × 31 days).
      homeCareMonthly: 4195, dailyLow: 128, dailyHigh: 140,
      careCostGrowthPct: 3, assumedClaimAge: 80, assumedCareYears: 3,
      retirementBalance: 184114, expectedReturnPct: 8,
      monthlyHouseholdIncome: 16000,
      lastReviewed: today, nextReview: next,
    },
    policies: SEED_POLICIES,
    weights: { affordability: 25, inflation: 25, benefit: 15, flexibility: 10, partnership: 10, homeCare: 10, cash: 5 },
    sweetSpot: [
      { benefit: 2000, premiumLyman: 81.13, premiumKateri: 122.10 },
      { benefit: 2100, premiumLyman: 85.19, premiumKateri: 128.21 },
      { benefit: 2250, premiumLyman: 91.28, premiumKateri: 137.37 },
      { benefit: 2500, premiumLyman: 101.42, premiumKateri: 152.63 },
      { benefit: 2750, premiumLyman: 111.56, premiumKateri: 167.89 },
      { benefit: 3000, premiumLyman: 121.71, premiumKateri: 183.15 },
    ],
    reviewLog: [],
    premiumLog: [],
  };
  if (!partial) return d;
  return {
    ...d,
    ...partial,
    household: { ...d.household, ...(partial.household || {}) },
    weights: { ...d.weights, ...(partial.weights || {}) },
    policies: partial.policies?.length ? partial.policies : d.policies,
    sweetSpot: partial.sweetSpot?.length ? partial.sweetSpot : d.sweetSpot,
    reviewLog: partial.reviewLog || d.reviewLog,
    premiumLog: partial.premiumLog || d.premiumLog || [],
    renewals: partial.renewals || [],

  };
}


// ---------------------------------------------------------------------------
// Core math
// ---------------------------------------------------------------------------

export const combinedPremium = (p: LtcPolicy) =>
  p.combinedMonthlyPremium || (p.premiumLyman || 0) + (p.premiumKateri || 0);
export const annualPremium = (p: LtcPolicy) => combinedPremium(p) * 12;
export const cashBenefitMonthly = (p: LtcPolicy) => p.startingMonthlyBenefit * (p.cashBenefitPct / 100);

export function inflationFactor(pct: number, years: number, compound: boolean) {
  const r = pct / 100;
  return compound ? Math.pow(1 + r, Math.max(0, years)) : 1 + r * Math.max(0, years);
}

/** Grows a policy's monthly benefit + pool from today to a target age. */
export function benefitAtAge(p: LtcPolicy, currentAge: number, targetAge: number) {
  const years = Math.max(0, targetAge - currentAge);
  const capped = p.inflationLifetime ? years : Math.min(years, 20);
  const f = inflationFactor(p.inflationPct, capped, p.inflationCompound);
  return {
    age: targetAge,
    years,
    monthlyBenefit: p.startingMonthlyBenefit * f,
    dailyBenefit: (p.startingMonthlyBenefit * f) / 30,
    pool: p.poolEach * f,
  };
}

export function benefitAtYear(p: LtcPolicy, year: number) {
  const f = inflationFactor(p.inflationPct, year - 1, p.inflationCompound);
  return { year, monthlyBenefit: p.startingMonthlyBenefit * f, pool: p.poolEach * f };
}

/** Local care cost per month grown from today. */
export function careCostAtAge(h: LtcHousehold, currentAge: number, targetAge: number, growthPct?: number) {
  const years = Math.max(0, targetAge - currentAge);
  return h.homeCareMonthly * Math.pow(1 + (growthPct ?? h.careCostGrowthPct) / 100, years);
}

export type GapBand = 'covered' | 'small' | 'moderate' | 'large';
export const GAP_LABEL: Record<GapBand, string> = {
  covered: 'Fully Covered', small: 'Small Gap', moderate: 'Moderate Gap', large: 'Large Gap',
};

export function gapBand(benefit: number, cost: number): GapBand {
  if (cost <= 0) return 'covered';
  const ratio = benefit / cost;
  if (ratio >= 1) return 'covered';
  if (ratio >= 0.8) return 'small';
  if (ratio >= 0.55) return 'moderate';
  return 'large';
}

/**
 * Posture for a partial-coverage strategy: the retained risk is intentionally
 * funded by household income, so the band credits an income offset (default
 * 30% of monthly household income) on top of the insurance benefit.
 */
export function fundedGap(benefit: number, cost: number, monthlyIncome: number, incomeSharePct = 30) {
  const incomeOffset = Math.max(0, monthlyIncome) * (incomeSharePct / 100);
  const funded = benefit + incomeOffset;
  return {
    incomeOffset,
    funded,
    residualGap: Math.max(0, cost - funded),
    insuranceRatio: cost > 0 ? benefit / cost : 1,
    fundedRatio: cost > 0 ? funded / cost : 1,
    band: gapBand(funded, cost),
  };
}

export type ProtectionLevel = 'under' | 'basic' | 'balanced' | 'strong' | 'over';
export const PROTECTION_LABEL: Record<ProtectionLevel, string> = {
  under: 'Underinsured', basic: 'Basic Protection', balanced: 'Balanced Protection',
  strong: 'Strong Protection', over: 'Potentially Overinsured',
};

/**
 * Protection level blends coverage ratio at the assumed claim age with premium
 * as a share of household income. Over-insurance is a real failure mode here.
 */
export function protectionLevel(state: LtcState, policy: LtcPolicy): {
  level: ProtectionLevel; coverageRatio: number; premiumShare: number;
} {
  const h = state.household;
  const benefit = benefitAtAge(policy, h.lymanAge, h.assumedClaimAge).monthlyBenefit;
  const cost = careCostAtAge(h, h.lymanAge, h.assumedClaimAge);
  const coverageRatio = cost > 0 ? benefit / cost : 0;
  const premiumShare = h.monthlyHouseholdIncome > 0 ? combinedPremium(policy) / h.monthlyHouseholdIncome : 0;
  let level: ProtectionLevel;
  if (coverageRatio < 0.4) level = 'under';
  else if (coverageRatio < 0.6) level = 'basic';
  else if (coverageRatio < 0.9) level = 'balanced';
  else level = 'strong';
  if (premiumShare > 0.05 || (coverageRatio > 1.2 && premiumShare > 0.025)) level = 'over';
  return { level, coverageRatio, premiumShare };
}

/** Total premiums paid from today until a claim age (premiums assumed level). */
export function lifetimePremiums(p: LtcPolicy, currentAge: number, throughAge: number) {
  return combinedPremium(p) * 12 * Math.max(0, throughAge - currentAge);
}

/** Future value of a monthly investment. */
export function fvMonthly(monthly: number, annualReturnPct: number, years: number) {
  const r = annualReturnPct / 100 / 12;
  const n = years * 12;
  if (r === 0) return monthly * n;
  return monthly * ((Math.pow(1 + r, n) - 1) / r);
}

export function fvLump(amount: number, annualReturnPct: number, years: number) {
  return amount * Math.pow(1 + annualReturnPct / 100, years);
}

export interface CareEventResult {
  claimAge: number;
  careYears: number;
  monthlyCareCost: number;
  totalCareCost: number;
  monthlyBenefit: number;
  poolAvailable: number;
  insurancePaid: number;
  eliminationCost: number;
  outOfPocket: number;
  premiumsPaid: number;
  assetsProtected: number;
  retirementRemaining: number;
  legacyValue: number;
}

/**
 * Models one care event for a policy (or no policy when `policy` is null).
 * Insurance pays the lesser of the monthly benefit and the actual cost, capped
 * by the inflated policy pool, and never during the elimination period.
 */
export function simulateCareEvent(
  state: LtcState,
  policy: LtcPolicy | null,
  claimAge: number,
  careYears: number,
): CareEventResult {
  const h = state.household;
  const monthlyCareCost = careCostAtAge(h, h.lymanAge, claimAge);
  const months = careYears * 12;
  const totalCareCost = monthlyCareCost * months;

  let monthlyBenefit = 0, poolAvailable = 0, insurancePaid = 0, eliminationCost = 0, premiumsPaid = 0;
  if (policy) {
    const b = benefitAtAge(policy, h.lymanAge, claimAge);
    monthlyBenefit = b.monthlyBenefit;
    poolAvailable = b.pool;
    const elimMonths = policy.eliminationDays / 30;
    eliminationCost = monthlyCareCost * elimMonths;
    const payableMonths = Math.max(0, Math.min(months - elimMonths, policy.benefitPeriodMonths));
    insurancePaid = Math.min(monthlyBenefit * payableMonths, poolAvailable);
    premiumsPaid = lifetimePremiums(policy, h.lymanAge, claimAge);
  }

  const outOfPocket = Math.max(0, totalCareCost - insurancePaid);
  const yearsToClaim = Math.max(0, claimAge - h.lymanAge);
  const projectedBalance = fvLump(h.retirementBalance, h.expectedReturnPct, yearsToClaim);
  const retirementRemaining = Math.max(0, projectedBalance - outOfPocket - premiumsPaid);
  const legacyValue = fvLump(retirementRemaining, h.expectedReturnPct, Math.max(0, 90 - claimAge - careYears));

  return {
    claimAge, careYears, monthlyCareCost, totalCareCost, monthlyBenefit, poolAvailable,
    insurancePaid, eliminationCost, outOfPocket, premiumsPaid,
    assetsProtected: insurancePaid, retirementRemaining, legacyValue,
  };
}

// ---------------------------------------------------------------------------
// Scoring / recommendation
// ---------------------------------------------------------------------------

export interface PolicyScores {
  policyId: string;
  affordability: number;
  inflation: number;
  benefit: number;
  flexibility: number;
  partnership: number;
  homeCare: number;
  cash: number;
  value: number;
  protection: number;
  weighted: number;
}

const clamp10 = (n: number) => Math.max(0, Math.min(10, n));

export function scorePolicies(state: LtcState, weights = state.weights): PolicyScores[] {
  const h = state.household;
  const list = state.policies;
  if (!list.length) return [];
  const prem = list.map(combinedPremium);
  const future = list.map((p) => benefitAtAge(p, h.lymanAge, 80).monthlyBenefit);
  const rel = (v: number, arr: number[], invert = false) => {
    const min = Math.min(...arr), max = Math.max(...arr);
    if (max === min) return 7;
    const t = (v - min) / (max - min);
    return clamp10((invert ? 1 - t : t) * 10);
  };
  const wTotal = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  return list.map((p, i) => {
    const affordability = rel(prem[i], prem, true);
    const inflation = clamp10((p.inflationPct / 3) * 6 + (p.inflationCompound ? 3 : 0) + (p.inflationLifetime ? 1 : 0));
    const benefit = rel(future[i], future);
    const flexibility = clamp10(
      (p.cashBenefitPct > 0 ? 3 : 0) + (p.sharedCare ? 2 : 0) + (p.premiumWaiver ? 2 : 0) +
      (p.jointApplicantDiscount ? 1 : 0) + (p.homeCarePct >= 100 ? 2 : 0),
    );
    const partnership = p.partnershipQualified ? 10 : 0;
    const homeCare = clamp10((p.homeCarePct / 100) * 10);
    const cash = clamp10((p.cashBenefitPct / 25) * 10);
    // Value = protection bought per premium dollar, relative to the field.
    const protectedCapital = simulateCareEvent(state, p, h.assumedClaimAge, h.assumedCareYears).insurancePaid;
    const efficiency = protectedCapital / Math.max(1, lifetimePremiums(p, h.lymanAge, h.assumedClaimAge));
    const effArr = list.map((q) =>
      simulateCareEvent(state, q, h.assumedClaimAge, h.assumedCareYears).insurancePaid /
      Math.max(1, lifetimePremiums(q, h.lymanAge, h.assumedClaimAge)));
    const value = rel(efficiency, effArr);
    const protection = clamp10((benefit * 0.5) + (inflation * 0.3) + (partnership * 0.2));

    const weighted =
      (affordability * weights.affordability + inflation * weights.inflation + benefit * weights.benefit +
        flexibility * weights.flexibility + partnership * weights.partnership + homeCare * weights.homeCare +
        cash * weights.cash) / wTotal;

    return {
      policyId: p.id,
      affordability: r1(affordability), inflation: r1(inflation), benefit: r1(benefit),
      flexibility: r1(flexibility), partnership: r1(partnership), homeCare: r1(homeCare),
      cash: r1(cash), value: r1(value), protection: r1(protection), weighted: r1(weighted),
    };
  });
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function rankPolicies(state: LtcState, weights = state.weights) {
  const scores = scorePolicies(state, weights);
  return [...scores].sort((a, b) => b.weighted - a.weighted);
}

// ---------------------------------------------------------------------------
// Sweet spot
// ---------------------------------------------------------------------------

export function sweetSpotTable(state: LtcState) {
  const h = state.household;
  const current = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const rows = state.sweetSpot.map((rung) => {
    const policy: LtcPolicy = {
      ...(current || SEED_POLICIES[0]),
      id: `sweet-${rung.benefit}`,
      startingMonthlyBenefit: rung.benefit,
      poolEach: rung.benefit * 36,
      inflationPct: 3, inflationCompound: true, inflationLifetime: true,
      benefitPeriodMonths: 36, eliminationDays: 90, partnershipQualified: true,
      homeCarePct: 100, assistedLivingPct: 100,
      premiumLyman: rung.premiumLyman, premiumKateri: rung.premiumKateri,
      combinedMonthlyPremium: rung.premiumLyman + rung.premiumKateri,
    };
    const at = benefitAtAge(policy, h.lymanAge, h.assumedClaimAge);
    const cost = careCostAtAge(h, h.lymanAge, h.assumedClaimAge);
    const sim = simulateCareEvent(state, policy, h.assumedClaimAge, h.assumedCareYears);
    const combined = policy.combinedMonthlyPremium;
    // Value score: capital protected per premium dollar, plus a penalty for
    // paying for coverage well beyond projected local cost.
    const efficiency = sim.insurancePaid / Math.max(1, sim.premiumsPaid);
    const overshoot = Math.max(0, at.monthlyBenefit / cost - 1.1);
    const valueScore = r1(clamp10(efficiency * 1.6 - overshoot * 6));
    return {
      benefit: rung.benefit, combined, annual: combined * 12,
      futureMonthly: at.monthlyBenefit, futurePool: at.pool,
      careCost: cost, gap: Math.max(0, cost - at.monthlyBenefit),
      band: gapBand(at.monthlyBenefit, cost),
      protectedCapital: sim.insurancePaid,
      premiumsPaid: sim.premiumsPaid,
      valueScore,
      highlight: rung.benefit === 2500,
    };
  });
  const best = rows.reduce((a, b) => (b.valueScore > a.valueScore ? b : a), rows[0]);
  return { rows, bestBenefit: best?.benefit };
}

// ---------------------------------------------------------------------------
// Annual review warnings
// ---------------------------------------------------------------------------

export interface ReviewWarning { level: 'risk' | 'review' | 'info'; title: string; detail: string }

export function reviewWarnings(state: LtcState): ReviewWarning[] {
  const out: ReviewWarning[] = [];
  const h = state.household;
  const p = state.policies.find((x) => x.id === state.currentPolicyId);
  if (!p) return out;
  const log = [...state.reviewLog].sort((a, b) => a.date.localeCompare(b.date));
  const prior = log[log.length - 1];
  const premium = combinedPremium(p);
  if (prior && prior.premium > 0) {
    const rise = (premium - prior.premium) / prior.premium;
    if (rise > 0.15) out.push({
      level: 'risk', title: 'Premium rose more than 15%',
      detail: `Combined premium moved from $${prior.premium.toFixed(2)} to $${premium.toFixed(2)} (${(rise * 100).toFixed(1)}%). Re-run the sweet spot before renewing.`,
    });
  }
  const benefit = benefitAtAge(p, h.lymanAge, h.assumedClaimAge).monthlyBenefit;
  const cost = careCostAtAge(h, h.lymanAge, h.assumedClaimAge);
  if (cost > 0 && benefit / cost < 0.4) out.push({
    level: 'risk', title: 'Benefit covers under 40% of projected local care cost',
    detail: `Projected benefit at age ${h.assumedClaimAge} is $${Math.round(benefit).toLocaleString()} against $${Math.round(cost).toLocaleString()} of ${h.city} care cost.`,
  });
  if (!p.partnershipQualified) out.push({
    level: 'review', title: 'Not Ohio Partnership qualified',
    detail: 'Partnership qualification protects assets in a Medicaid spend-down. Confirm whether a qualified version is available.',
  });
  if (!p.inflationCompound || p.inflationPct < 3) out.push({
    level: 'review', title: 'Inflation protection below strategy target',
    detail: 'Strategy calls for 3% compound, lifetime. Verify the rider on the current contract.',
  });
  if (p.benefitPeriodMonths < 36) out.push({
    level: 'review', title: 'Benefit period below 3 years',
    detail: `Current benefit period is ${p.benefitPeriodMonths} months.`,
  });
  if (h.monthlyHouseholdIncome > 0 && premium / h.monthlyHouseholdIncome > 0.05) out.push({
    level: 'risk', title: 'Lapse risk — premium above 5% of household income',
    detail: 'A policy that lapses protects nothing. Reduce the benefit rung before stretching the budget.',
  });
  if (p.cashBenefitPct > 0) out.push({
    level: 'info', title: 'Confirm cash benefit coordination',
    detail: 'The cash benefit is not assumed to stack on top of the full reimbursement benefit. Verify against the policy contract.',
  });
  return out;
}

// ---------------------------------------------------------------------------
// Monthly premium tracker (binder plan of record)
// ---------------------------------------------------------------------------

export const paymentTotal = (p: PremiumPayment) => (p.amountLyman || 0) + (p.amountKateri || 0);

export interface PremiumTracker {
  /** Plan of record: the combined monthly premium on the current policy. */
  planOfRecord: number;
  annualPlanOfRecord: number;
  payments: PremiumPayment[];
  /** One row per logged month, newest first, measured against plan of record. */
  months: {
    month: string;
    paid: number;
    expected: number;
    variance: number;
    lyman: number;
    kateri: number;
    onPlan: boolean;
    payment: PremiumPayment;
  }[];
  paidThisYear: number;
  expectedThisYear: number;
  varianceThisYear: number;
  lifetimePaid: number;
  monthsLogged: number;
  monthsOnPlan: number;
  averagePaid: number;
  latestMonth?: string;
  /** Months in the current year with no logged payment yet. */
  missingMonths: string[];
  incomeShare: number;
}

export function premiumTracker(state: LtcState, today = new Date()): PremiumTracker {
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const planOfRecord = policy ? combinedPremium(policy) : 0;
  const payments = [...(state.premiumLog || [])].sort((a, b) => b.month.localeCompare(a.month));
  const year = today.getFullYear();
  const monthIdx = today.getMonth();

  const months = payments.map((p) => {
    const paid = paymentTotal(p);
    return {
      month: p.month,
      paid,
      expected: planOfRecord,
      variance: paid - planOfRecord,
      lyman: p.amountLyman || 0,
      kateri: p.amountKateri || 0,
      onPlan: Math.abs(paid - planOfRecord) <= 0.5,
      payment: p,
    };
  });

  const thisYear = months.filter((m) => m.month.startsWith(String(year)));
  const paidThisYear = thisYear.reduce((s, m) => s + m.paid, 0);
  const expectedThisYear = planOfRecord * (monthIdx + 1);
  const lifetimePaid = months.reduce((s, m) => s + m.paid, 0);

  const missingMonths: string[] = [];
  for (let i = 0; i <= monthIdx; i++) {
    const key = `${year}-${String(i + 1).padStart(2, '0')}`;
    if (!months.some((m) => m.month === key)) missingMonths.push(key);
  }

  return {
    planOfRecord,
    annualPlanOfRecord: planOfRecord * 12,
    payments,
    months,
    paidThisYear,
    expectedThisYear,
    varianceThisYear: paidThisYear - expectedThisYear,
    lifetimePaid,
    monthsLogged: months.length,
    monthsOnPlan: months.filter((m) => m.onPlan).length,
    averagePaid: months.length ? lifetimePaid / months.length : 0,
    latestMonth: months[0]?.month,
    missingMonths,
    incomeShare: state.household.monthlyHouseholdIncome > 0
      ? planOfRecord / state.household.monthlyHouseholdIncome
      : 0,
  };
}

// ---------------------------------------------------------------------------
// Sweet spot rung scoring
// ---------------------------------------------------------------------------

export type RungGrade = 'best' | 'strong' | 'workable' | 'stretch' | 'thin';

export const RUNG_GRADE_LABEL: Record<RungGrade, string> = {
  best: 'Best Balance',
  strong: 'Strong Fit',
  workable: 'Workable',
  stretch: 'Budget Stretch',
  thin: 'Too Thin',
};

/**
 * Scores every sweet-spot rung on four axes and blends them with the household
 * decision weights so the ranking follows the same logic as policy scoring.
 * Affordability falls away as premium eats more household income; coverage
 * rewards benefit that tracks projected local care cost without overbuying.
 */
export function scoreRungs(state: LtcState) {
  const { rows, bestBenefit } = sweetSpotTable(state);
  const income = state.household.monthlyHouseholdIncome;
  const w = state.weights;
  const wSum = Math.max(1, w.affordability + w.benefit + w.inflation + w.flexibility);

  const scored = rows.map((r) => {
    const share = income > 0 ? r.combined / income : 0;
    // 1% of income = 10, 5% of income (lapse threshold) = 0.
    const affordability = r1(clamp10(10 - ((share * 100) - 1) * 2.5));
    const ratio = r.careCost > 0 ? r.futureMonthly / r.careCost : 0;
    // Coverage peaks at ~100% of projected cost, penalised above 110%.
    const coverage = r1(clamp10(ratio >= 1.1 ? 10 - (ratio - 1.1) * 12 : ratio * 9.5));
    const efficiency = r1(clamp10((r.protectedCapital / Math.max(1, r.premiumsPaid)) * 1.4));
    const value = r.valueScore;
    const score = r1(
      (affordability * w.affordability + coverage * w.benefit + efficiency * w.inflation + value * w.flexibility) / wSum,
    );
    return { ...r, share, affordability, coverage, efficiency, score };
  });

  const ranked = [...scored].sort((a, b) => b.score - a.score);
  const topBenefit = ranked[0]?.benefit;

  const withGrades = scored.map((r) => {
    let grade: RungGrade = 'workable';
    if (r.benefit === topBenefit) grade = 'best';
    else if (r.share > 0.05) grade = 'stretch';
    else if (r.band === 'large') grade = 'thin';
    else if (r.score >= 6.5) grade = 'strong';
    return {
      ...r,
      grade,
      rank: ranked.findIndex((x) => x.benefit === r.benefit) + 1,
    };
  });

  return { rows: withGrades, bestBenefit, topBenefit, ranked };
}

// ---------------------------------------------------------------------------
// Renewal / rate-increase tracking
// ---------------------------------------------------------------------------

export interface RenewalAnalysis {
  rows: (RenewalNotice & { increaseDollars: number; increasePct: number })[];
  /** Premium in force after the most recent notice (or the current policy). */
  currentPremium: number;
  originalPremium: number;
  cumulativePct: number;
  /** Average annual increase across the logged history. */
  averageAnnualPct: number;
  /** Count of accepted increases. */
  acceptedCount: number;
  pendingCount: number;
  /** Premium share of household income after the latest action. */
  premiumShare: number;
  /** Share once projected forward at the observed average increase. */
  projectedIn5Years: number;
  projected5YrShare: number;
  /** True when the projected premium breaches the 5% of income lapse guardrail. */
  breachesGuardrail: boolean;
}

export function analyzeRenewals(state: LtcState, policy?: LtcPolicy): RenewalAnalysis {
  const income = Math.max(0, state.household.monthlyHouseholdIncome);
  const sorted = [...(state.renewals || [])].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
  const rows = sorted.map((r) => {
    const increaseDollars = r.newMonthlyPremium - r.oldMonthlyPremium;
    return {
      ...r,
      increaseDollars,
      increasePct: r.oldMonthlyPremium > 0 ? (increaseDollars / r.oldMonthlyPremium) * 100 : 0,
    };
  });

  const basePremium = policy ? combinedPremium(policy) : 0;
  const originalPremium = rows.length ? rows[0].oldMonthlyPremium : basePremium;
  const currentPremium = rows.length ? rows[rows.length - 1].newMonthlyPremium : basePremium;
  const cumulativePct = originalPremium > 0 ? ((currentPremium - originalPremium) / originalPremium) * 100 : 0;

  const firstYear = rows.length ? Number(rows[0].effectiveDate.slice(0, 4)) : 0;
  const lastYear = rows.length ? Number(rows[rows.length - 1].effectiveDate.slice(0, 4)) : 0;
  const span = Math.max(1, lastYear - firstYear);
  const averageAnnualPct = rows.length
    ? (Math.pow(currentPremium / Math.max(1, originalPremium), 1 / span) - 1) * 100
    : 0;

  const growth = Math.max(0, averageAnnualPct) / 100;
  const projectedIn5Years = currentPremium * Math.pow(1 + growth, 5);
  const premiumShare = income > 0 ? currentPremium / income : 0;
  const projected5YrShare = income > 0 ? projectedIn5Years / income : 0;

  return {
    rows, currentPremium, originalPremium, cumulativePct, averageAnnualPct,
    acceptedCount: rows.filter((r) => r.response === 'accepted').length,
    pendingCount: rows.filter((r) => r.response === 'pending').length,
    premiumShare, projectedIn5Years, projected5YrShare,
    breachesGuardrail: projected5YrShare > 0.05,
  };
}
