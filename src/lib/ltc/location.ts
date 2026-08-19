// Location-based LTC home care cost + agency comparison.
// Philosophy: care costs are LOCAL. The decision metric is not "what does care
// cost nationally" but "how many hours of professional care does our policy
// actually purchase where we live (or might live)".
//
// Nothing here invents agency pricing. Every rate carries a source and a
// verification status; unknown rates stay null and render as
// "Rate Not Publicly Available".

import {
  benefitAtAge, inflationFactor, type LtcPolicy, type LtcState,
} from './model';

export const WEEKS_PER_MONTH = 4.33;
export const HOUR_TIERS = [10, 20, 30, 40] as const;
export const PROJECTION_AGES = [65, 70, 75, 80, 85] as const;

export type CareCategory = 'nonMedical' | 'personalCare' | 'homeHealth' | 'skilledNursing';

export const CARE_CATEGORY_LABEL: Record<CareCategory, string> = {
  nonMedical: 'Non-Medical Home Care',
  personalCare: 'Personal Care',
  homeHealth: 'Home Health Care',
  skilledNursing: 'Skilled Nursing',
};

export const CARE_CATEGORY_EXAMPLES: Record<CareCategory, string> = {
  nonMedical: 'Companionship, meal prep, light housekeeping, transportation, shopping, medication reminders',
  personalCare: 'Bathing, dressing, grooming, toileting, mobility assistance, activities of daily living',
  homeHealth: 'Home health aide, therapy, nurse-supervised care',
  skilledNursing: 'RN, LPN, medication administration, wound care, other medically skilled services',
};

export type PricingStatus =
  | 'verified' | 'userEntered' | 'estimated' | 'publiclyListed' | 'agentConfirmed' | 'outdated' | 'needsVerification';

export const PRICING_STATUS_LABEL: Record<PricingStatus, string> = {
  verified: 'Verified',
  userEntered: 'User Entered',
  estimated: 'Estimated',
  publiclyListed: 'Publicly Listed',
  agentConfirmed: 'Agent Confirmed',
  outdated: 'Outdated',
  needsVerification: 'Needs Verification',
};

export interface LtcLocation {
  id: string;
  city: string;
  state: string;
  zip?: string;
  /** Current residence flag — exactly one location should be the home market. */
  isCurrent?: boolean;
  /** Marked as a possible future residence. */
  isFuture?: boolean;
  /** Median hourly rate per care category. null = not established locally. */
  medianHourly: Record<CareCategory, number | null>;
  /** Facility comparison inputs (monthly). */
  assistedLivingMonthly?: number | null;
  nursingMonthly?: number | null;
  partnershipAvailable?: boolean | null;
  providerCount?: number | null;
  /** Local care-cost inflation assumption; falls back to the household setting. */
  careInflationPct?: number | null;
  source?: string;
  lastUpdated?: string;
  notes?: string;
  policyNotes?: string;
}

export interface CareAgency {
  id: string;
  locationId: string;
  name: string;
  city: string;
  state: string;
  zip?: string;
  nonMedicalHourly: number | null;
  personalCareHourly: number | null;
  homeHealthAideHourly: number | null;
  skilledNursingHourly: number | null;
  minVisitHours?: number | null;
  minWeeklyHours?: number | null;
  weekendHourly?: number | null;
  holidayHourly?: number | null;
  overnightHourly?: number | null;
  liveInDaily?: number | null;
  transportationFee?: number | null;
  assessmentFee?: number | null;
  cancellationFee?: number | null;
  otherMonthlyFees?: number | null;
  classification: 'medical' | 'nonMedical' | 'both' | 'unknown';
  licensed?: 'licensed' | 'certified' | 'unknown';
  ltcEligible?: 'eligible' | 'notEligible' | 'unknown';
  phone?: string;
  website?: string;
  distanceMiles?: number | null;
  qualityRating?: number | null; // 0–5, user entered
  pricingStatus: PricingStatus;
  lastVerified?: string;
  source?: string;
  notes?: string;
}

export interface RateHistoryEntry {
  id: string;
  agencyId: string;
  date: string;
  category: CareCategory;
  oldRate: number | null;
  newRate: number;
  source?: string;
}

export interface BlendedCare {
  /** Total weekly hours of care actually needed. */
  neededWeeklyHours: number;
  familyWeeklyHours: number;
  adultDayWeeklyHours: number;
  respiteWeeklyHours: number;
  otherSupportWeeklyHours: number;
  mealServiceMonthly: number;
  transportationMonthly: number;
  adultDayHourlyCost: number;
}

export interface ProgressionPlan {
  mode: 'moderate' | 'higher' | 'custom';
  customHours: number[]; // per year
}

export interface LtcLocationState {
  locations: LtcLocation[];
  agencies: CareAgency[];
  rateHistory: RateHistoryEntry[];
  /** Agency-rate inflation, kept separate from the policy's benefit inflation. */
  careRateInflationPct: number;
  compareCategory: CareCategory;
  compareHours: number;
  futureLocationId?: string;
  blended: BlendedCare;
  progression: ProgressionPlan;
  stateShortlist: string[];
}

export function defaultLocationState(): LtcLocationState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    // Akron is the DEFAULT planning market, not a hard-coded permanent choice.
    locations: [
      {
        id: 'akron-oh',
        city: 'Akron', state: 'OH', isCurrent: true,
        // Akron non-medical home care verified range $128–$140/day.
        medianHourly: { nonMedical: 30, personalCare: null, homeHealth: null, skilledNursing: null },
        assistedLivingMonthly: null, nursingMonthly: null,
        partnershipAvailable: true, providerCount: null,
        source: 'Household research — daily planning range $128–$140/day',
        lastUpdated: today,
        notes: 'Default planning market. Replace the median with agency quotes as you collect them.',
      },
    ],
    agencies: [],
    rateHistory: [],
    careRateInflationPct: 4,
    compareCategory: 'nonMedical',
    compareHours: 20,
    blended: {
      neededWeeklyHours: 20, familyWeeklyHours: 0, adultDayWeeklyHours: 0,
      respiteWeeklyHours: 0, otherSupportWeeklyHours: 0,
      mealServiceMonthly: 0, transportationMonthly: 0, adultDayHourlyCost: 12,
    },
    progression: { mode: 'moderate', customHours: [10, 20, 30] },
    stateShortlist: ['OH'],
  };
}

/** Back-compat hydration: older saved plans have no location block. */
export function ensureLocationState(s?: Partial<LtcLocationState> | null): LtcLocationState {
  const d = defaultLocationState();
  if (!s) return d;
  return {
    ...d,
    ...s,
    locations: s.locations?.length ? s.locations : d.locations,
    agencies: s.agencies || [],
    rateHistory: s.rateHistory || [],
    blended: { ...d.blended, ...(s.blended || {}) },
    progression: { ...d.progression, ...(s.progression || {}) },
    stateShortlist: s.stateShortlist?.length ? s.stateShortlist : d.stateShortlist,
  };
}

export const locationLabel = (l: LtcLocation) =>
  [l.city, l.state].filter(Boolean).join(', ') + (l.zip ? ` ${l.zip}` : '');

// ---------------------------------------------------------------------------
// Core hours ↔ dollars math
// ---------------------------------------------------------------------------

/** Weekly Hours × Hourly Rate × 4.33 = Estimated Monthly Cost. */
export const monthlyCostFromHours = (weeklyHours: number, hourlyRate: number) =>
  weeklyHours * hourlyRate * WEEKS_PER_MONTH;

/** Monthly LTC benefit ÷ hourly rate ÷ 4.33 = weekly hours the policy purchases. */
export function weeklyHoursCovered(monthlyBenefit: number, hourlyRate: number) {
  if (!hourlyRate || hourlyRate <= 0) return 0;
  return monthlyBenefit / hourlyRate / WEEKS_PER_MONTH;
}

export const monthlyHoursCovered = (monthlyBenefit: number, hourlyRate: number) =>
  hourlyRate > 0 ? monthlyBenefit / hourlyRate : 0;

export type CoverageBand = 'full' | 'strong' | 'balanced' | 'partial' | 'selfFund';

export const COVERAGE_LABEL: Record<CoverageBand, string> = {
  full: 'Fully Covered',
  strong: 'Strong Coverage',
  balanced: 'Balanced Risk Sharing',
  partial: 'Partial Coverage',
  selfFund: 'Significant Self-Funding',
};

/** Realistic coverage labels — partial payment is not automatically a failure. */
export function coverageBand(coveragePct: number): CoverageBand {
  if (coveragePct >= 100) return 'full';
  if (coveragePct >= 80) return 'strong';
  if (coveragePct >= 50) return 'balanced';
  if (coveragePct >= 30) return 'partial';
  return 'selfFund';
}

export interface CoverageResult {
  weeklyHours: number;
  hourlyRate: number;
  monthlyCost: number;
  monthlyBenefit: number;
  insurancePays: number;
  outOfPocketMonthly: number;
  outOfPocketAnnual: number;
  outOfPocket3Year: number;
  coveragePct: number;
  band: CoverageBand;
  hoursCoveredWeekly: number;
  uncoveredWeeklyHours: number;
}

export function coverageAt(weeklyHours: number, hourlyRate: number, monthlyBenefit: number): CoverageResult {
  const monthlyCost = monthlyCostFromHours(weeklyHours, hourlyRate);
  const insurancePays = Math.min(monthlyBenefit, monthlyCost);
  const oop = Math.max(0, monthlyCost - insurancePays);
  const coveragePct = monthlyCost > 0 ? (insurancePays / monthlyCost) * 100 : 100;
  const hoursCoveredWeekly = weeklyHoursCovered(monthlyBenefit, hourlyRate);
  return {
    weeklyHours, hourlyRate, monthlyCost, monthlyBenefit, insurancePays,
    outOfPocketMonthly: oop, outOfPocketAnnual: oop * 12, outOfPocket3Year: oop * 36,
    coveragePct, band: coverageBand(coveragePct),
    hoursCoveredWeekly,
    uncoveredWeeklyHours: Math.max(0, weeklyHours - hoursCoveredWeekly),
  };
}

/**
 * Current monthly LTC reimbursement maximum for one person.
 * The 25% cash benefit is NOT added to the reimbursement maximum — policy terms
 * must confirm whether both can be used at the same time.
 */
export function policyMonthlyBenefit(policy: LtcPolicy | undefined, currentAge: number, atAge?: number) {
  if (!policy) return 0;
  if (atAge == null) return policy.startingMonthlyBenefit;
  return benefitAtAge(policy, currentAge, atAge).monthlyBenefit;
}

/** Agency rate grown at the agency-rate inflation assumption (not the policy's). */
export function futureHourlyRate(rate: number, inflationPct: number, years: number) {
  return rate * inflationFactor(inflationPct, Math.max(0, years), true);
}

// ---------------------------------------------------------------------------
// Agency helpers
// ---------------------------------------------------------------------------

export function agencyRate(a: CareAgency, category: CareCategory): number | null {
  const map: Record<CareCategory, number | null | undefined> = {
    nonMedical: a.nonMedicalHourly,
    personalCare: a.personalCareHourly,
    homeHealth: a.homeHealthAideHourly,
    skilledNursing: a.skilledNursingHourly,
  };
  const v = map[category];
  return typeof v === 'number' && v > 0 ? v : null;
}

/** Effective hourly rate including recurring fees spread across the hours used. */
export function effectiveHourly(a: CareAgency, category: CareCategory, weeklyHours: number) {
  const base = agencyRate(a, category);
  if (base == null) return null;
  const monthlyHours = weeklyHours * WEEKS_PER_MONTH;
  if (monthlyHours <= 0) return base;
  const fees = (a.otherMonthlyFees || 0) + (a.transportationFee || 0);
  return base + fees / monthlyHours;
}

export type VerificationFlag = 'current' | 'reviewRecommended' | 'outdated' | 'unknown';

export const VERIFICATION_LABEL: Record<VerificationFlag, string> = {
  current: 'Current',
  reviewRecommended: 'Review Recommended',
  outdated: 'Outdated',
  unknown: 'Needs Verification',
};

/** An old rate is never silently treated as current. */
export function verificationFlag(lastVerified?: string, today = new Date()): VerificationFlag {
  if (!lastVerified) return 'unknown';
  const t = new Date(lastVerified).getTime();
  if (Number.isNaN(t)) return 'unknown';
  const months = (today.getTime() - t) / (1000 * 60 * 60 * 24 * 30.4375);
  if (months >= 24) return 'outdated';
  if (months >= 12) return 'reviewRecommended';
  return 'current';
}

export interface MarketStats {
  category: CareCategory;
  low: number | null;
  median: number | null;
  high: number | null;
  average: number | null;
  count: number;
  lastUpdated?: string;
}

/** Category-level market stats. The four categories are never blended together. */
export function marketStats(agencies: CareAgency[], category: CareCategory): MarketStats {
  const rates = agencies.map((a) => agencyRate(a, category)).filter((r): r is number => r != null).sort((a, b) => a - b);
  const dates = agencies.map((a) => a.lastVerified).filter(Boolean).sort() as string[];
  if (!rates.length) {
    return { category, low: null, median: null, high: null, average: null, count: 0, lastUpdated: dates.at(-1) };
  }
  const mid = Math.floor(rates.length / 2);
  const median = rates.length % 2 ? rates[mid] : (rates[mid - 1] + rates[mid]) / 2;
  return {
    category,
    low: rates[0], high: rates.at(-1)!, median,
    average: rates.reduce((a, b) => a + b, 0) / rates.length,
    count: rates.length,
    lastUpdated: dates.at(-1),
  };
}

/**
 * Planning rate for a location & category: verified agency median first, then the
 * user-entered location median. Returns the source so the UI can be honest.
 */
export function locationPlanningRate(
  loc: LtcLocation, agencies: CareAgency[], category: CareCategory,
): { rate: number | null; basis: 'agencies' | 'entered' | 'none'; count: number } {
  const local = agencies.filter((a) => a.locationId === loc.id);
  const stats = marketStats(local, category);
  if (stats.median != null) return { rate: stats.median, basis: 'agencies', count: stats.count };
  const entered = loc.medianHourly?.[category];
  if (typeof entered === 'number' && entered > 0) return { rate: entered, basis: 'entered', count: 0 };
  return { rate: null, basis: 'none', count: 0 };
}

// ---------------------------------------------------------------------------
// Agency rankings — never rank #1 on price alone
// ---------------------------------------------------------------------------

export interface AgencyScore {
  agency: CareAgency;
  rate: number;
  effective: number;
  coverage: CoverageResult;
  costScore: number;
  hoursScore: number;
  oopScore: number;
  frictionScore: number;
  qualityScore: number;
  eligibilityScore: number;
  distanceScore: number;
  overall: number;
}

const clamp = (n: number, lo = 0, hi = 10) => Math.max(lo, Math.min(hi, n));

export function scoreAgencies(
  agencies: CareAgency[], category: CareCategory, weeklyHours: number, monthlyBenefit: number,
): AgencyScore[] {
  const priced = agencies
    .map((a) => ({ a, rate: agencyRate(a, category), eff: effectiveHourly(a, category, weeklyHours) }))
    .filter((x): x is { a: CareAgency; rate: number; eff: number } => x.rate != null && x.eff != null);
  if (!priced.length) return [];

  const effs = priced.map((p) => p.eff);
  const min = Math.min(...effs), max = Math.max(...effs);
  const rel = (v: number, invert = false) => {
    if (max === min) return 7;
    const t = (v - min) / (max - min);
    return clamp((invert ? 1 - t : t) * 10);
  };

  return priced.map(({ a, rate, eff }) => {
    const coverage = coverageAt(weeklyHours, eff, monthlyBenefit);
    const costScore = rel(eff, true);
    const hoursScore = clamp((coverage.hoursCoveredWeekly / Math.max(1, weeklyHours)) * 10);
    const oopScore = rel(coverage.outOfPocketMonthly, true);
    // Friction: minimum visit length, minimum weekly hours, weekend/holiday premiums, fees.
    const minVisitPenalty = (a.minVisitHours || 0) > 4 ? 3 : (a.minVisitHours || 0) > 2 ? 1.5 : 0;
    const minWeekPenalty = (a.minWeeklyHours || 0) > weeklyHours ? 3 : 0;
    const weekendPenalty = a.weekendHourly && a.weekendHourly > rate ? Math.min(2, ((a.weekendHourly - rate) / rate) * 10) : 0;
    const feePenalty = ((a.assessmentFee || 0) > 0 ? 0.5 : 0) + ((a.otherMonthlyFees || 0) > 0 ? 1 : 0)
      + ((a.cancellationFee || 0) > 0 ? 0.5 : 0);
    const frictionScore = clamp(10 - minVisitPenalty - minWeekPenalty - weekendPenalty - feePenalty);
    const qualityScore = a.qualityRating != null ? clamp((a.qualityRating / 5) * 10) : 5;
    const eligibilityScore = a.ltcEligible === 'eligible' ? 10 : a.ltcEligible === 'notEligible' ? 0 : 5;
    const distanceScore = a.distanceMiles != null ? clamp(10 - a.distanceMiles / 4) : 6;
    const overall =
      costScore * 0.2 + hoursScore * 0.2 + oopScore * 0.15 + frictionScore * 0.15 +
      qualityScore * 0.1 + eligibilityScore * 0.15 + distanceScore * 0.05;
    return {
      agency: a, rate, effective: eff, coverage,
      costScore, hoursScore, oopScore, frictionScore, qualityScore, eligibilityScore, distanceScore,
      overall: Math.round(overall * 10) / 10,
    };
  });
}

export type RankingKey =
  | 'lowestCost' | 'mostHours' | 'lowestOop' | 'bestOverall' | 'h10' | 'h20' | 'h30' | 'h40';

export const RANKING_LABEL: Record<RankingKey, string> = {
  lowestCost: 'Lowest Cost',
  mostHours: 'Most Hours Covered',
  lowestOop: 'Lowest Out-of-Pocket Cost',
  bestOverall: 'Best Overall LTC Fit',
  h10: 'Best for 10 Hours/Week',
  h20: 'Best for 20 Hours/Week',
  h30: 'Best for 30 Hours/Week',
  h40: 'Best for 40 Hours/Week',
};

export function rankAgencies(
  agencies: CareAgency[], category: CareCategory, weeklyHours: number, monthlyBenefit: number, key: RankingKey,
): AgencyScore[] {
  const tierHours: Partial<Record<RankingKey, number>> = { h10: 10, h20: 20, h30: 30, h40: 40 };
  const hours = tierHours[key] ?? weeklyHours;
  const scored = scoreAgencies(agencies, category, hours, monthlyBenefit);
  const sorters: Record<RankingKey, (a: AgencyScore, b: AgencyScore) => number> = {
    lowestCost: (a, b) => a.effective - b.effective,
    mostHours: (a, b) => b.coverage.hoursCoveredWeekly - a.coverage.hoursCoveredWeekly,
    lowestOop: (a, b) => a.coverage.outOfPocketMonthly - b.coverage.outOfPocketMonthly,
    bestOverall: (a, b) => b.overall - a.overall,
    h10: (a, b) => b.overall - a.overall,
    h20: (a, b) => b.overall - a.overall,
    h30: (a, b) => b.overall - a.overall,
    h40: (a, b) => b.overall - a.overall,
  };
  return [...scored].sort(sorters[key]);
}

// ---------------------------------------------------------------------------
// Location affordability score (an LTC indicator — NOT a where-to-live recommendation)
// ---------------------------------------------------------------------------

export interface LocationScore {
  locationId: string;
  score: number;
  rate: number | null;
  hoursCovered: number;
  cover20: number;
  cover30: number;
  oop20: number;
  providerScore: number;
  inflationDrag: number;
}

export function locationAffordability(
  loc: LtcLocation, agencies: CareAgency[], category: CareCategory,
  monthlyBenefit: number, policyInflationPct: number, careInflationPct: number,
): LocationScore {
  const { rate } = locationPlanningRate(loc, agencies, category);
  const hoursCovered = rate ? weeklyHoursCovered(monthlyBenefit, rate) : 0;
  const c20 = rate ? coverageAt(20, rate, monthlyBenefit) : null;
  const c30 = rate ? coverageAt(30, rate, monthlyBenefit) : null;
  const localCount = agencies.filter((a) => a.locationId === loc.id).length;
  const providerScore = clamp(((loc.providerCount ?? localCount) / 8) * 10);
  const inflationDrag = (loc.careInflationPct ?? careInflationPct) - policyInflationPct;

  const score = rate
    ? clamp(
      Math.min(100, Math.round(
        Math.min(30, (c20?.coveragePct ?? 0) * 0.3) +
        Math.min(25, (c30?.coveragePct ?? 0) * 0.25) +
        Math.min(20, (hoursCovered / 40) * 20) +
        Math.min(10, providerScore) +
        Math.max(0, 15 - Math.max(0, inflationDrag) * 5),
      )), 0, 100)
    : 0;

  return {
    locationId: loc.id, score, rate, hoursCovered,
    cover20: c20?.coveragePct ?? 0, cover30: c30?.coveragePct ?? 0,
    oop20: c20?.outOfPocketMonthly ?? 0, providerScore, inflationDrag,
  };
}

// ---------------------------------------------------------------------------
// Progressive care + blended (family) care
// ---------------------------------------------------------------------------

export const PROGRESSION_PRESETS: Record<'moderate' | 'higher', number[]> = {
  moderate: [10, 20, 30],
  higher: [20, 30, 40],
};

export function progressionHours(p: ProgressionPlan) {
  return p.mode === 'custom' ? (p.customHours.length ? p.customHours : [10, 20, 30]) : PROGRESSION_PRESETS[p.mode];
}

export interface ProgressionYear {
  year: number;
  weeklyHours: number;
  hourlyRate: number;
  monthlyCost: number;
  annualCost: number;
  insurancePaid: number;
  householdPaid: number;
  poolUsed: number;
  poolRemaining: number;
}

export function simulateProgression(
  hoursByYear: number[], startRate: number, careInflationPct: number,
  startMonthlyBenefit: number, policyInflationPct: number, pool: number,
): ProgressionYear[] {
  let remaining = pool;
  return hoursByYear.map((weeklyHours, i) => {
    const hourlyRate = futureHourlyRate(startRate, careInflationPct, i);
    const monthlyBenefit = startMonthlyBenefit * inflationFactor(policyInflationPct, i, true);
    const monthlyCost = monthlyCostFromHours(weeklyHours, hourlyRate);
    const annualCost = monthlyCost * 12;
    const payable = Math.min(monthlyBenefit, monthlyCost) * 12;
    const insurancePaid = Math.max(0, Math.min(payable, remaining));
    remaining = Math.max(0, remaining - insurancePaid);
    return {
      year: i + 1, weeklyHours, hourlyRate, monthlyCost, annualCost,
      insurancePaid, householdPaid: Math.max(0, annualCost - insurancePaid),
      poolUsed: pool - remaining, poolRemaining: remaining,
    };
  });
}

export interface BlendedResult {
  neededWeeklyHours: number;
  unpaidWeeklyHours: number;
  paidAgencyWeeklyHours: number;
  agencyMonthlyCost: number;
  adultDayMonthlyCost: number;
  otherMonthlyCost: number;
  totalMonthlyCost: number;
  insurancePays: number;
  householdPays: number;
  coveragePct: number;
  band: CoverageBand;
}

/** Not all required care must be purchased from an agency. */
export function blendedCare(b: BlendedCare, hourlyRate: number, monthlyBenefit: number): BlendedResult {
  const unpaid = (b.familyWeeklyHours || 0) + (b.respiteWeeklyHours || 0) + (b.otherSupportWeeklyHours || 0);
  const adultDay = b.adultDayWeeklyHours || 0;
  const paid = Math.max(0, (b.neededWeeklyHours || 0) - unpaid - adultDay);
  const agencyMonthlyCost = monthlyCostFromHours(paid, hourlyRate);
  const adultDayMonthlyCost = monthlyCostFromHours(adultDay, b.adultDayHourlyCost || 0);
  const otherMonthlyCost = (b.mealServiceMonthly || 0) + (b.transportationMonthly || 0);
  const totalMonthlyCost = agencyMonthlyCost + adultDayMonthlyCost + otherMonthlyCost;
  const insurancePays = Math.min(monthlyBenefit, agencyMonthlyCost + adultDayMonthlyCost);
  const householdPays = Math.max(0, totalMonthlyCost - insurancePays);
  const coveragePct = totalMonthlyCost > 0 ? (insurancePays / totalMonthlyCost) * 100 : 100;
  return {
    neededWeeklyHours: b.neededWeeklyHours || 0, unpaidWeeklyHours: unpaid, paidAgencyWeeklyHours: paid,
    agencyMonthlyCost, adultDayMonthlyCost, otherMonthlyCost, totalMonthlyCost,
    insurancePays, householdPays, coveragePct, band: coverageBand(coveragePct),
  };
}

// ---------------------------------------------------------------------------
// Retirement asset protection by location
// ---------------------------------------------------------------------------

export interface LocationRetirementImpact {
  locationId: string;
  threeYearCareCost: number;
  insuranceBenefits: number;
  householdLtcExpense: number;
  withdrawalsAvoided: number;
  riskTransferredPct: number;
  assetsPreservedNoInsurance: number;
  assetsPreservedWithInsurance: number;
}

export function locationRetirementImpact(
  loc: LtcLocation, rate: number | null, weeklyHours: number,
  monthlyBenefit: number, poolAvailable: number, retirementBalance: number,
): LocationRetirementImpact {
  const monthlyCost = rate ? monthlyCostFromHours(weeklyHours, rate) : 0;
  const threeYearCareCost = monthlyCost * 36;
  const insuranceBenefits = Math.min(Math.min(monthlyBenefit, monthlyCost) * 36, poolAvailable);
  const householdLtcExpense = Math.max(0, threeYearCareCost - insuranceBenefits);
  return {
    locationId: loc.id,
    threeYearCareCost,
    insuranceBenefits,
    householdLtcExpense,
    withdrawalsAvoided: insuranceBenefits,
    riskTransferredPct: threeYearCareCost > 0 ? (insuranceBenefits / threeYearCareCost) * 100 : 0,
    assetsPreservedNoInsurance: Math.max(0, retirementBalance - threeYearCareCost),
    assetsPreservedWithInsurance: Math.max(0, retirementBalance - householdLtcExpense),
  };
}

/** Convenience: the active policy for a plan state. */
export function activePolicy(state: LtcState) {
  return state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
}

export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
] as const;
