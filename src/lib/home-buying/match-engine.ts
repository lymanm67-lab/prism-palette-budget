// Match Engine — pure functions for scoring listings and neighborhoods.
// Rule-based (no LLM cost). All weights per the user's spec.

import type { HomeSearchProfile } from './search-profile';
import type { Neighborhood } from './akron-neighborhoods';
import { AKRON_NEIGHBORHOODS } from './akron-neighborhoods';
import { calcMortgage } from './mortgage-math';

export interface Listing {
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  url: string;
  style?: string;
  features?: string[];
  source?: string;
  sources?: string[];
  // Optional enrichments (may be absent from live feed — we fill with heuristics)
  yearBuilt?: number;
  lotAcres?: number;
  hoaMonthly?: number;
  neighborhoodId?: string;
  taxPct?: number;
  insurancePct?: number;
  floodRisk?: 'low' | 'moderate' | 'high';
  condition?: 'move_in' | 'cosmetic_ok' | 'major_repairs';
  roofAge?: number;
  hvacAge?: number;
}

export const WEIGHTS = {
  affordability: 20, appreciation: 15, propertyTax: 10, insurance: 5,
  stability: 10, ownerOccupancy: 10, crime: 10, schools: 5,
  commute: 5, amenities: 5, resale: 10,
} as const;

/** Overall 0–100 neighborhood score using user-spec weights. */
export function neighborhoodOverall(n: Neighborhood): number {
  const s = n.scores;
  const total =
    s.affordability   * WEIGHTS.affordability   +
    s.appreciation    * WEIGHTS.appreciation    +
    s.propertyTax     * WEIGHTS.propertyTax     +
    s.insurance       * WEIGHTS.insurance       +
    s.stability       * WEIGHTS.stability       +
    s.ownerOccupancy  * WEIGHTS.ownerOccupancy  +
    s.crime           * WEIGHTS.crime           +
    s.schools         * WEIGHTS.schools         +
    s.commute         * WEIGHTS.commute         +
    s.amenities       * WEIGHTS.amenities       +
    s.resale          * WEIGHTS.resale;
  const weightSum = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  return Math.round(total / weightSum);
}

/** Rank neighborhoods best-first. */
export function rankedNeighborhoods(): Array<Neighborhood & { overall: number }> {
  return AKRON_NEIGHBORHOODS
    .map((n) => ({ ...n, overall: neighborhoodOverall(n) }))
    .sort((a, b) => b.overall - a.overall);
}

/** Estimate the monthly PITI for a listing under the user's financing rules. */
export function estimateMonthlyPayment(listing: Listing, profile: HomeSearchProfile) {
  const n = AKRON_NEIGHBORHOODS.find((x) => x.id === listing.neighborhoodId);
  const taxPct = listing.taxPct ?? n?.avgPropertyTaxPct ?? 1.85;
  const insPct = listing.insurancePct ?? 0.55;
  const hoa = listing.hoaMonthly ?? 0;

  const m = calcMortgage({
    price: listing.price,
    downPct: profile.downPct,
    ratePct: profile.ratePct,
    termYears: profile.termYears,
    propertyTaxPct: taxPct,
    insurancePct: insPct,
    hoaMonthly: hoa,
    pmiPct: profile.downPct < 20 ? 0.5 : 0,
  });

  const floodInsurance = listing.floodRisk === 'high' ? 120 : listing.floodRisk === 'moderate' ? 55 : 0;
  const totalPITI = m.monthlyPITI + floodInsurance;

  return {
    principalInterest: m.monthlyPI,
    tax: m.monthlyTax,
    insurance: m.monthlyInsurance,
    pmi: m.monthlyPmi,
    hoa: m.monthlyHoa,
    floodInsurance,
    totalPITI,
    cushion: profile.maxMonthlyPayment - totalPITI,
    overBudget: totalPITI > profile.maxMonthlyPayment,
  };
}

export type PropertyVerdict = 'excellent' | 'good' | 'watch' | 'high_risk';

export interface PropertyScore {
  overall: number;                  // 0-100
  verdict: PropertyVerdict;
  matchPct: number;                 // % of hard rules satisfied
  reasons: { positive: string[]; negative: string[] };
  breakdown: {
    financialFit: number;
    monthlyPayment: number;
    taxes: number;
    insurance: number;
    maintenance: number;
    hoa: number;
    appreciation: number;
    neighborhood: number;
    commute: number;
    inspectionRisk: number;
  };
  payment: ReturnType<typeof estimateMonthlyPayment>;
  neighborhood?: Neighborhood & { overall: number };
  hardFail: boolean;                // violates a personal rule
  hardFailReasons: string[];
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Score a single listing against the profile. */
export function scoreListing(listing: Listing, profile: HomeSearchProfile): PropertyScore {
  const positive: string[] = [];
  const negative: string[] = [];
  const hardFailReasons: string[] = [];

  // Neighborhood lookup
  const nRanked = rankedNeighborhoods();
  const nMatch = nRanked.find((n) => n.id === listing.neighborhoodId);

  // Hard rule checks
  const criteriaTotal = 8;
  let criteriaMet = 0;
  if (listing.price <= profile.maxPrice) { criteriaMet++; positive.push(`Under your $${profile.maxPrice.toLocaleString()} max`); }
  else hardFailReasons.push(`Over max price ($${listing.price.toLocaleString()} > $${profile.maxPrice.toLocaleString()})`);

  if (listing.beds >= profile.minBeds) criteriaMet++;
  else hardFailReasons.push(`Only ${listing.beds} bed(s), need ${profile.minBeds}+`);

  if (listing.baths >= profile.minBaths) criteriaMet++;
  else hardFailReasons.push(`Only ${listing.baths} bath(s), need ${profile.minBaths}+`);

  if (listing.sqft >= profile.minSqft) criteriaMet++;
  else hardFailReasons.push(`Only ${listing.sqft} sqft, need ${profile.minSqft}+`);

  const styleOk = !profile.preferredStyles.length ||
    !listing.style ||
    profile.preferredStyles.some((s) => listing.style!.toLowerCase().includes(s.toLowerCase()));
  if (styleOk) { criteriaMet++; if (listing.style) positive.push(`Matches preferred style (${listing.style})`); }
  else negative.push(`Style "${listing.style}" is outside your preferred list`);

  const lotOk = listing.lotAcres === undefined || listing.lotAcres >= profile.minLotAcres;
  if (lotOk) criteriaMet++;
  else negative.push(`Lot ${listing.lotAcres} ac below ${profile.minLotAcres}`);

  const yearOk = listing.yearBuilt === undefined ||
    (listing.yearBuilt >= profile.yearBuiltMin && listing.yearBuilt <= profile.yearBuiltMax);
  if (yearOk) criteriaMet++;
  else negative.push(`Built ${listing.yearBuilt} — outside ${profile.yearBuiltMin}–${profile.yearBuiltMax}`);

  const hoaOk = (listing.hoaMonthly ?? 0) <= profile.maxHoa;
  if (hoaOk) criteriaMet++;
  else hardFailReasons.push(`HOA $${listing.hoaMonthly}/mo exceeds $${profile.maxHoa}`);

  // Exclusions
  if (profile.excludeFloodRisk && listing.floodRisk === 'high') hardFailReasons.push('High flood risk');
  if (profile.excludeMajorRepairs && listing.condition === 'major_repairs') hardFailReasons.push('Major repairs required');

  // Payment
  const payment = estimateMonthlyPayment(listing, profile);
  if (payment.overBudget) hardFailReasons.push(`Monthly payment $${Math.round(payment.totalPITI)} > $${profile.maxMonthlyPayment} max`);
  else positive.push(`Monthly payment $${Math.round(payment.totalPITI)} fits your $${profile.maxMonthlyPayment} budget`);

  // Sub-scores
  const financialFit = clamp(100 - (payment.totalPITI / profile.maxMonthlyPayment - 1) * 200);
  const monthlyPayment = clamp(100 - Math.max(0, payment.totalPITI - profile.maxMonthlyPayment * 0.85) / (profile.maxMonthlyPayment * 0.15) * 40);
  const taxes = clamp(100 - ((listing.taxPct ?? nMatch?.avgPropertyTaxPct ?? 1.85) - 1.2) * 25);
  const insurance = clamp(100 - ((listing.insurancePct ?? 0.55) - 0.4) * 100);
  const maintenance = clamp(
    listing.condition === 'move_in' ? 92 :
    listing.condition === 'cosmetic_ok' ? 78 :
    listing.condition === 'major_repairs' ? 30 : 70
  );
  const hoa = clamp(100 - (listing.hoaMonthly ?? 0));
  const appreciation = nMatch?.scores.appreciation ?? 65;
  const neighborhood = nMatch?.overall ?? 65;
  const commute = nMatch?.scores.commute ?? 70;
  const roofPenalty = listing.roofAge ? Math.max(0, listing.roofAge - 15) * 3 : 0;
  const hvacPenalty = listing.hvacAge ? Math.max(0, listing.hvacAge - 12) * 3 : 0;
  const inspectionRisk = clamp(90 - roofPenalty - hvacPenalty - (listing.condition === 'major_repairs' ? 40 : 0));

  // Weighted overall (mirrors neighborhood weights, adapted for property)
  const overall = Math.round(
    (financialFit * 22 + monthlyPayment * 15 + taxes * 8 + insurance * 4 +
     maintenance * 10 + hoa * 3 + appreciation * 12 + neighborhood * 15 +
     commute * 4 + inspectionRisk * 7) / 100
  );

  const matchPct = Math.round((criteriaMet / criteriaTotal) * 100);

  let verdict: PropertyVerdict = 'watch';
  const hardFail = hardFailReasons.length > 0;
  if (hardFail) verdict = 'high_risk';
  else if (overall >= 85 && matchPct >= 90) verdict = 'excellent';
  else if (overall >= 72) verdict = 'good';
  else if (overall >= 58) verdict = 'watch';
  else verdict = 'high_risk';

  if (nMatch?.tier === 1) positive.push(`${nMatch.name} is a Tier 1 neighborhood (${nMatch.overall}/100)`);
  if (nMatch && nMatch.avgPropertyTaxPct < 1.75) positive.push('Property taxes below the Akron metro average');

  return {
    overall,
    verdict,
    matchPct,
    reasons: { positive, negative },
    breakdown: {
      financialFit: Math.round(financialFit),
      monthlyPayment: Math.round(monthlyPayment),
      taxes: Math.round(taxes),
      insurance: Math.round(insurance),
      maintenance: Math.round(maintenance),
      hoa: Math.round(hoa),
      appreciation: Math.round(appreciation),
      neighborhood: Math.round(neighborhood),
      commute: Math.round(commute),
      inspectionRisk: Math.round(inspectionRisk),
    },
    payment,
    neighborhood: nMatch,
    hardFail,
    hardFailReasons,
  };
}

/** Rule-based AI Coach explanation. */
export function coachExplanation(listing: Listing, score: PropertyScore, profile: HomeSearchProfile): string[] {
  const lines: string[] = [];
  lines.push(`This property matches ${score.matchPct}% of your criteria.`);
  if (!score.payment.overBudget) {
    lines.push(`The estimated monthly payment of $${Math.round(score.payment.totalPITI)} remains below your $${profile.maxMonthlyPayment} limit — cushion of $${Math.round(score.payment.cushion)}/mo.`);
  } else {
    lines.push(`⚠︎ Monthly payment of $${Math.round(score.payment.totalPITI)} is over your $${profile.maxMonthlyPayment} cap by $${Math.round(-score.payment.cushion)}.`);
  }
  const avgTax = 1.85;
  if ((listing.taxPct ?? score.neighborhood?.avgPropertyTaxPct ?? avgTax) < avgTax) {
    lines.push('Property taxes are lower than similar homes in the area.');
  }
  if (score.neighborhood && score.neighborhood.scores.resale >= 78) {
    lines.push(`${score.neighborhood.name} has stronger resale potential than the metro average.`);
  }
  if (listing.condition === 'cosmetic_ok') {
    lines.push('Cosmetic-only updates make this a good value opportunity — sweat equity, not structural risk.');
  }
  if (listing.condition === 'major_repairs') {
    lines.push('Major repairs will erase the "good deal" price — factor $20–60k in reserves.');
  }
  return lines;
}

/** Project 5- and 10-year equity from purchase. */
export function projectEquity(listing: Listing, profile: HomeSearchProfile, years: number, appreciationPct = 4) {
  const down = listing.price * (profile.downPct / 100);
  const loan = listing.price - down;
  const monthlyRate = profile.ratePct / 100 / 12;
  const nPmts = profile.termYears * 12;
  const monthlyPI = loan * (monthlyRate * Math.pow(1 + monthlyRate, nPmts)) / (Math.pow(1 + monthlyRate, nPmts) - 1);

  // Amortize
  let balance = loan;
  for (let i = 0; i < years * 12; i++) {
    const interest = balance * monthlyRate;
    balance -= (monthlyPI - interest);
  }
  const paidDown = loan - balance;
  const futureValue = listing.price * Math.pow(1 + appreciationPct / 100, years);
  const appreciation = futureValue - listing.price;
  const equity = down + paidDown + appreciation;

  return { down, paidDown, appreciation, futureValue, equity };
}
