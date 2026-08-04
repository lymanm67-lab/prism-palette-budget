// Northeast Ohio Medical Housing Market Planner — pure calculation engine + seed data.
// Educational planning estimates only; not investment advice.

// ============================================================
// Types
// ============================================================

export interface StartupInputs {
  purchase_price: number;
  down_payment_pct: number;
  closing_costs: number;
  inspection_cost: number;
  appraisal_cost: number;
  initial_repairs: number;
  paint_cosmetic: number;
  furniture: number;
  appliances: number;
  kitchen_supplies: number;
  linens: number;
  security_system: number;
  internet_setup: number;
  utility_deposits: number;
  insurance_deposit: number;
  licensing_permits: number;
  marketing: number;
  initial_cleaning: number;
  vacancy_reserve: number;
  maintenance_reserve: number;
  emergency_reserve: number;
}

export interface StartupTotals {
  downPayment: number;
  closingTotal: number;
  preparationTotal: number;
  furnishingTotal: number;
  reserveTotal: number;
  totalStartup: number;
}

export interface IncomeInputs {
  model_type: string;
  monthly_rent: number;
  bedrooms: number;
  rent_per_room: number;
  occupancy_pct: number;
  annual_vacancy_pct: number;
  utilities: number;
  internet: number;
  property_taxes: number;
  insurance: number;
  mortgage: number;
  maintenance_reserve: number;
  furniture_reserve: number;
  cleaning: number;
  lawn_care: number;
  snow_removal: number;
  property_management: number;
  platform_fees: number;
  advertising: number;
  other_expenses: number;
  cash_invested: number;
}

export interface IncomeTotals {
  monthlyGross: number;
  annualGross: number;
  monthlyEffectiveGross: number;
  annualEffectiveGross: number;
  monthlyOpEx: number;
  annualOpEx: number;
  monthlyOpExNoDebt: number;
  netMonthlyCashFlow: number;
  netAnnualCashFlow: number;
  cashOnCashPct: number | null;
  breakEvenOccupancyPct: number | null;
  dscr: number | null;
  noiAnnual: number;
}

// ============================================================
// Startup capital
// ============================================================

export function computeStartup(i: StartupInputs): StartupTotals {
  const downPayment = (i.purchase_price || 0) * ((i.down_payment_pct || 0) / 100);
  const closingTotal = n(i.closing_costs) + n(i.inspection_cost) + n(i.appraisal_cost);
  const preparationTotal =
    n(i.initial_repairs) + n(i.paint_cosmetic) + n(i.initial_cleaning) +
    n(i.licensing_permits) + n(i.utility_deposits) + n(i.insurance_deposit) +
    n(i.internet_setup) + n(i.security_system) + n(i.marketing);
  const furnishingTotal =
    n(i.furniture) + n(i.appliances) + n(i.kitchen_supplies) + n(i.linens);
  const reserveTotal =
    n(i.vacancy_reserve) + n(i.maintenance_reserve) + n(i.emergency_reserve);

  return {
    downPayment,
    closingTotal,
    preparationTotal,
    furnishingTotal,
    reserveTotal,
    totalStartup: downPayment + closingTotal + preparationTotal + furnishingTotal + reserveTotal,
  };
}

// ============================================================
// Income projection
// ============================================================

export function computeIncome(i: IncomeInputs): IncomeTotals {
  const monthlyGross =
    i.model_type === 'room_by_room'
      ? n(i.rent_per_room) * n(i.bedrooms)
      : n(i.monthly_rent);

  const occ = clamp(n(i.occupancy_pct), 0, 100) / 100;
  const vacancyDrag = clamp(n(i.annual_vacancy_pct), 0, 100) / 100;
  // Occupancy is the primary driver; annual vacancy adds an extra planning haircut.
  const effectiveFactor = occ * (1 - vacancyDrag * 0.5);
  const monthlyEffectiveGross = monthlyGross * effectiveFactor;

  const opExNoDebt =
    n(i.utilities) + n(i.internet) + n(i.property_taxes) + n(i.insurance) +
    n(i.maintenance_reserve) + n(i.furniture_reserve) + n(i.cleaning) +
    n(i.lawn_care) + n(i.snow_removal) + n(i.property_management) +
    n(i.platform_fees) + n(i.advertising) + n(i.other_expenses);

  const monthlyOpEx = opExNoDebt + n(i.mortgage);
  const netMonthlyCashFlow = monthlyEffectiveGross - monthlyOpEx;
  const netAnnualCashFlow = netMonthlyCashFlow * 12;
  const noiAnnual = (monthlyEffectiveGross - opExNoDebt) * 12;

  const cashOnCashPct =
    n(i.cash_invested) > 0 ? (netAnnualCashFlow / n(i.cash_invested)) * 100 : null;

  const breakEvenOccupancyPct =
    monthlyGross > 0 ? clamp((monthlyOpEx / monthlyGross) * 100, 0, 999) : null;

  const annualDebt = n(i.mortgage) * 12;
  const dscr = annualDebt > 0 ? noiAnnual / annualDebt : null;

  return {
    monthlyGross,
    annualGross: monthlyGross * 12,
    monthlyEffectiveGross,
    annualEffectiveGross: monthlyEffectiveGross * 12,
    monthlyOpEx,
    annualOpEx: monthlyOpEx * 12,
    monthlyOpExNoDebt: opExNoDebt,
    netMonthlyCashFlow,
    netAnnualCashFlow,
    cashOnCashPct,
    breakEvenOccupancyPct,
    dscr,
    noiAnnual,
  };
}

// ============================================================
// Property scoring
// ============================================================

export const SCORE_CATEGORIES = [
  { key: 'score_hospital_proximity', label: 'Hospital proximity', groups: ['market'] },
  { key: 'score_neighborhood', label: 'Neighborhood quality', groups: ['market'] },
  { key: 'score_purchase_price', label: 'Purchase price', groups: ['financial'] },
  { key: 'score_furnished_rent', label: 'Furnished rent potential', groups: ['financial', 'market'] },
  { key: 'score_longterm_rent', label: 'Long-term rental potential', groups: ['financial'] },
  { key: 'score_parking', label: 'Parking', groups: [] },
  { key: 'score_condition', label: 'Property condition', groups: ['risk'] },
  { key: 'score_laundry', label: 'Laundry', groups: [] },
  { key: 'score_bedrooms', label: 'Bedroom count', groups: ['market'] },
  { key: 'score_safety', label: 'Safety', groups: ['risk'] },
  { key: 'score_management', label: 'Management difficulty', groups: ['risk'] },
  { key: 'score_resale', label: 'Resale potential', groups: ['financial'] },
  { key: 'score_cash_flow', label: 'Cash flow', groups: ['financial'] },
  { key: 'score_reserves', label: 'Reserve requirement', groups: ['risk'] },
  { key: 'score_overall_risk', label: 'Overall investment risk', groups: ['risk'] },
] as const;

export type ScoreKey = (typeof SCORE_CATEGORIES)[number]['key'];

export type Decision = 'Strong Candidate' | 'Review Further' | 'Negotiate Price' | 'High Risk' | 'Reject';

export interface ScoreResult {
  totalScore: number;
  maxScore: number;
  totalPct: number;
  financialScore: number;
  marketScore: number;
  riskScore: number;
  scoredCount: number;
  decision: Decision;
}

export function computeScores(row: Partial<Record<ScoreKey, number | null>>): ScoreResult {
  const scored = SCORE_CATEGORIES.filter((c) => typeof row[c.key] === 'number' && (row[c.key] as number) > 0);
  const total = scored.reduce((s, c) => s + (row[c.key] as number), 0);
  const maxScore = SCORE_CATEGORIES.length * 5;
  const totalPct = scored.length ? (total / (scored.length * 5)) * 100 : 0;

  const groupPct = (group: string) => {
    const g = scored.filter((c) => (c.groups as readonly string[]).includes(group));
    if (!g.length) return 0;
    return (g.reduce((s, c) => s + (row[c.key] as number), 0) / (g.length * 5)) * 100;
  };

  const financialScore = groupPct('financial');
  const marketScore = groupPct('market');
  const riskScore = groupPct('risk');

  let decision: Decision;
  const priceScore = row.score_purchase_price ?? 0;
  if (scored.length < 8) decision = 'Review Further';
  else if (riskScore < 45 || (row.score_condition ?? 5) <= 1) decision = 'Reject';
  else if (riskScore < 60) decision = 'High Risk';
  else if (totalPct >= 78 && riskScore >= 70) decision = 'Strong Candidate';
  else if (priceScore <= 2 && financialScore < 70) decision = 'Negotiate Price';
  else decision = 'Review Further';

  return {
    totalScore: total,
    maxScore,
    totalPct,
    financialScore,
    marketScore,
    riskScore,
    scoredCount: scored.length,
    decision,
  };
}

export const DECISION_TONE: Record<Decision, string> = {
  'Strong Candidate': 'text-prism-teal border-prism-teal/40 bg-prism-teal/10',
  'Review Further': 'text-prism-sky border-prism-sky/40 bg-prism-sky/10',
  'Negotiate Price': 'text-prism-amber border-prism-amber/40 bg-prism-amber/10',
  'High Risk': 'text-prism-orange border-prism-orange/40 bg-prism-orange/10',
  Reject: 'text-prism-rose border-prism-rose/40 bg-prism-rose/10',
};

// ============================================================
// Deal guardrails
// ============================================================

export interface GuardrailInput {
  purchase_price: number;
  market_price_high: number | null;
  market_name?: string | null;
  furnished_rent: number;
  longterm_rent: number;
  breakEvenOccupancyPct: number | null;
  totalStartup: number;
  reserves_available: number;
  monthly_expenses: number;
  netAnnualCashFlow: number;
  relies_on_appreciation: boolean;
  relies_on_tax_savings: boolean;
  major_repairs_unresolved: boolean;
  off_street_parking: boolean;
  minutes_to_hospital: number | null;
  target_minutes: number;
  hoa_restrictions: boolean;
  compliance_verified: boolean;
}

export interface Guardrail {
  id: string;
  severity: 'critical' | 'warning';
  title: string;
  detail: string;
}

export const AKRON_TARGETS = {
  furnishedRentMin: 2100,
  longtermRentMin: 1300,
  breakEvenMaxPct: 80,
  startupMax: 80000,
  reserveMonths: 6,
  minutesToHospital: 10,
  priceLow: 140000,
  priceHigh: 165000,
} as const;

export function evaluateGuardrails(i: GuardrailInput): Guardrail[] {
  const out: Guardrail[] = [];
  const push = (id: string, severity: Guardrail['severity'], title: string, detail: string) =>
    out.push({ id, severity, title, detail });

  if (i.market_price_high && i.purchase_price > i.market_price_high) {
    push('price', 'critical', 'Purchase price exceeds market target',
      `${fmt(i.purchase_price)} is above the ${i.market_name ?? 'selected market'} target of ${fmt(i.market_price_high)}.`);
  }
  if (i.furnished_rent > 0 && i.furnished_rent < AKRON_TARGETS.furnishedRentMin) {
    push('rent', 'warning', 'Furnished rent below Akron target',
      `${fmt(i.furnished_rent)}/mo is under the ${fmt(AKRON_TARGETS.furnishedRentMin)}/mo preferred Akron model.`);
  }
  if (i.longterm_rent > 0 && i.longterm_rent < AKRON_TARGETS.longtermRentMin) {
    push('backup', 'warning', 'Long-term backup rent too low',
      `${fmt(i.longterm_rent)}/mo is under the ${fmt(AKRON_TARGETS.longtermRentMin)}/mo backup floor.`);
  }
  if (i.breakEvenOccupancyPct !== null && i.breakEvenOccupancyPct > AKRON_TARGETS.breakEvenMaxPct) {
    push('breakeven', 'critical', 'Break-even occupancy above 80%',
      `Break-even occupancy is ${i.breakEvenOccupancyPct.toFixed(0)}% — above the ${AKRON_TARGETS.breakEvenMaxPct}% ceiling.`);
  }
  if (i.totalStartup > AKRON_TARGETS.startupMax) {
    push('startup', 'warning', 'Startup investment above Akron pilot ceiling',
      `${fmt(i.totalStartup)} exceeds the ${fmt(AKRON_TARGETS.startupMax)} pilot target.`);
  }
  const neededReserve = i.monthly_expenses * AKRON_TARGETS.reserveMonths;
  if (neededReserve > 0 && i.reserves_available < neededReserve) {
    push('reserves', 'critical', 'Six months of reserves not available',
      `${fmt(i.reserves_available)} on hand vs. ${fmt(neededReserve)} needed for 6 months of expenses.`);
  }
  if (i.netAnnualCashFlow < 0) {
    push('cashflow', 'critical', 'Net cash flow is negative',
      `Projected net annual cash flow is ${fmt(i.netAnnualCashFlow)}.`);
  }
  if (i.relies_on_appreciation) {
    push('appreciation', 'critical', 'Model depends on appreciation',
      'The deal only works if the property appreciates. Appreciation is not a plan.');
  }
  if (i.relies_on_tax_savings) {
    push('tax', 'critical', 'Model depends on tax savings',
      'The deal only stays profitable through deductions. Cash flow should stand on its own.');
  }
  if (i.major_repairs_unresolved) {
    push('repairs', 'critical', 'Major repairs unresolved',
      'Foundation, roof, sewer, electrical, plumbing, or HVAC issues are still open.');
  }
  if (!i.off_street_parking) {
    push('parking', 'warning', 'No off-street parking',
      'Off-street parking is a requirement for the medical housing model.');
  }
  if (i.minutes_to_hospital !== null && i.minutes_to_hospital > i.target_minutes) {
    push('commute', 'warning', 'Travel time to medical employers exceeds target',
      `${i.minutes_to_hospital} minutes vs. a ${i.target_minutes}-minute target.`);
  }
  if (i.hoa_restrictions) {
    push('hoa', 'warning', 'Restrictive HOA rules',
      'HOA restrictions may prohibit furnished or short-term medical tenancies.');
  }
  if (!i.compliance_verified) {
    push('compliance', 'warning', 'Local furnished rental compliance not verified',
      'Confirm zoning, licensing, and occupancy rules before closing.');
  }
  return out;
}

// ============================================================
// Portfolio growth forecast
// ============================================================

export interface ForecastAssumptions {
  avgValue: number;
  avgRent: number;
  avgOccupancyPct: number;
  avgMonthlyCashFlow: number;
  appreciationPct: number;
  ltvPct: number;
  reservePerProperty: number;
}

export interface ForecastRow {
  properties: number;
  years: number;
  annualGrossRevenue: number;
  annualNetCashFlow: number;
  totalEquity: number;
  totalDebt: number;
  totalReserves: number;
  portfolioValue: number;
}

export const FORECAST_PROPERTY_COUNTS = [1, 2, 3, 5, 10];
export const FORECAST_YEARS = [3, 5, 10, 15];

export function forecastPortfolio(a: ForecastAssumptions, properties: number, years: number): ForecastRow {
  const occ = clamp(a.avgOccupancyPct, 0, 100) / 100;
  const annualGrossRevenue = a.avgRent * 12 * properties * occ;
  const annualNetCashFlow = a.avgMonthlyCashFlow * 12 * properties;
  const portfolioValue = a.avgValue * properties * Math.pow(1 + a.appreciationPct / 100, years);
  const originalDebt = a.avgValue * properties * (clamp(a.ltvPct, 0, 100) / 100);
  // Straight-line 30-year principal paydown approximation.
  const amortized = originalDebt * Math.max(0, 1 - years / 30);
  const totalReserves = a.reservePerProperty * properties;
  return {
    properties,
    years,
    annualGrossRevenue,
    annualNetCashFlow,
    totalEquity: portfolioValue - amortized,
    totalDebt: amortized,
    totalReserves,
    portfolioValue,
  };
}

// ============================================================
// Tiny home village funding link
// ============================================================

export interface VillageFunding {
  annualProfit: number;
  allocationPct: number;
  customAmount: number | null;
  fundBalance: number;
  fundingGoal: number;
}

export interface VillageResult {
  annualAllocation: number;
  remainingGap: number;
  yearsToGoal: number | null;
  projectedGoalDate: Date | null;
  pctFunded: number;
}

export function computeVillageFunding(v: VillageFunding): VillageResult {
  const annualAllocation =
    v.customAmount && v.customAmount > 0
      ? v.customAmount
      : Math.max(0, v.annualProfit) * (clamp(v.allocationPct, 0, 100) / 100);
  const remainingGap = Math.max(0, v.fundingGoal - v.fundBalance);
  const yearsToGoal = annualAllocation > 0 ? remainingGap / annualAllocation : null;
  let projectedGoalDate: Date | null = null;
  if (yearsToGoal !== null && Number.isFinite(yearsToGoal)) {
    projectedGoalDate = new Date();
    projectedGoalDate.setMonth(projectedGoalDate.getMonth() + Math.ceil(yearsToGoal * 12));
  }
  return {
    annualAllocation,
    remainingGap,
    yearsToGoal,
    projectedGoalDate,
    pctFunded: v.fundingGoal > 0 ? clamp((v.fundBalance / v.fundingGoal) * 100, 0, 100) : 0,
  };
}

// ============================================================
// Copy constants
// ============================================================

export const PRIMARY_RECOMMENDATION =
  'Begin with one carefully selected Akron property near Summa Health and Akron Children\u2019s Hospital. Prefer a two-bedroom or three-bedroom home, townhouse, duplex, or small multifamily property with off-street parking, laundry, strong long-term rental potential, and a total startup investment below approximately $80,000.';

export const SECONDARY_RECOMMENDATION =
  'Use Cleveland Heights as a phase-two expansion market after the Akron property has produced at least 12 months of operating data and demonstrated stable demand, acceptable occupancy, and positive cash flow.';

export const FIRST_PROPERTY_NOTE =
  'The first property may produce modest cash flow while also building equity, creating depreciation deductions, validating demand, and establishing the operating model.';

export const ROOM_MODEL_WARNINGS = [
  'More tenant screening',
  'More lease administration',
  'More cleaning',
  'Tenant compatibility management',
  'Additional local compliance review',
  'Greater property management involvement',
];

export const CLEVELAND_CAUTION =
  'Cleveland Heights may generate higher rent, but higher property prices, taxes, insurance, and operating costs may reduce net cash flow.';

export const VILLAGE_STATEMENT =
  'The medical housing portfolio can become both a family wealth-building asset and a long-term funding engine for the tiny home village serving young adults aging out of foster care.';

export const AKRON_ADVANTAGES = [
  'Lower acquisition costs than many Cleveland medical districts',
  'Proximity to Summa Health',
  'Proximity to Akron Children\u2019s Hospital',
  'Access to medical residents, nurses, therapists, physicians, medical students, and contract healthcare workers',
  'Easier local management for Lyman and Kateri',
  'Lower financial exposure while testing the operating model',
];

export const CLEVELAND_ADVANTAGES = [
  'Cleveland Clinic',
  'University Hospitals',
  'Case Western Reserve University',
  'Medical residency and fellowship programs',
  'Visiting physicians and researchers',
  'A larger pool of healthcare professionals',
  'Higher furnished rental demand',
];

export const CLEVELAND_CAUTIONS = [
  'Higher property prices',
  'Higher property taxes',
  'Greater competition',
  'Higher furnishing standards',
  'Greater operating complexity',
];

export const HYBRID_BENEFITS = [
  'Reduced vacancy risk',
  'Multiple income sources',
  'Ability to test the furnished model',
  'Stable income from the long-term unit',
  'Potential owner-occupancy option',
  'Greater flexibility during market changes',
];

export const PILOT_GOAL_DESCRIPTION =
  'Acquire, furnish, and operate the first professional housing property for medical professionals in the Akron market. Use the property as a pilot to validate demand, establish referral relationships, document operating procedures, and create a repeatable model for future expansion.';

export const PILOT_FINANCIAL_TARGETS = [
  { label: 'Target purchase price', value: '$140,000 – $165,000' },
  { label: 'Target startup investment', value: '$65,000 – $80,000' },
  { label: 'Target monthly gross rent', value: '$2,000 – $2,300' },
  { label: 'Target annual gross income', value: '$24,000 – $27,600' },
  { label: 'Target annual net cash flow', value: '$1,500 – $6,000' },
  { label: 'Target break-even occupancy', value: 'Below 80%' },
  { label: 'Target reserve', value: '6 months of property expenses' },
];

export const PREFERRED_FIRST_PROPERTY = [
  { label: 'Location', value: 'Akron' },
  { label: 'Purchase price', value: '$140,000 – $165,000' },
  { label: 'Bedrooms', value: '2 minimum, 3 preferred' },
  { label: 'Bathrooms', value: '1.5 minimum preferred' },
  { label: 'Parking', value: 'Off-street parking required' },
  { label: 'Laundry', value: 'Washer and dryer required' },
  { label: 'Distance to hospitals', value: '~10 minutes preferred' },
  { label: 'Furnished rent goal', value: 'At least $2,100/mo' },
  { label: 'Long-term backup rent', value: '$1,300 – $1,500/mo' },
  { label: 'Break-even occupancy', value: 'Below 80%' },
  { label: 'Property reserve', value: '6 months of expenses' },
  { label: 'Major repairs', value: 'No unresolved foundation, roof, sewer, electrical, plumbing, or HVAC issue' },
];

// ============================================================
// Seed data
// ============================================================

export const SEED_MARKETS = [
  {
    name: 'Highland Square / Akron 44302',
    city: 'Akron', zip: '44302', region: 'akron', priority: 'primary',
    classification: [
      'Preferred first-market area',
      'Strong access to Akron hospitals',
      'Moderate acquisition cost',
      'Good fit for two-bedroom and three-bedroom furnished homes',
      'Suitable for residents, nurses, fellows, and visiting professionals',
    ],
    cautions: [],
    price_low: 140000, price_high: 175000,
    rent_low: 1800, rent_expected: 2100, rent_strong: 2300,
    recommendation: null, sort_order: 1,
  },
  {
    name: 'Downtown Akron & Hospital Corridor',
    city: 'Akron', zip: null, region: 'akron', priority: 'primary',
    classification: [
      'Strongest hospital convenience',
      'Best for short commutes',
      'Requires careful block-by-block review',
      'Parking and property condition are essential',
    ],
    cautions: ['Block-by-block review required', 'Verify parking and condition'],
    price_low: 125000, price_high: 165000,
    rent_low: null, rent_expected: null, rent_strong: null,
    recommendation: null, sort_order: 2,
  },
  {
    name: 'West Akron',
    city: 'Akron', zip: null, region: 'akron', priority: 'primary',
    classification: [
      'Lower-cost acquisition opportunity',
      'Potentially stronger cash flow',
      'Requires careful neighborhood and property selection',
    ],
    cautions: ['Review exterior condition, parking, safety, and commute'],
    price_low: 110000, price_high: 145000,
    rent_low: null, rent_expected: null, rent_strong: null,
    recommendation: null, sort_order: 3,
  },
  {
    name: 'Cuyahoga Falls',
    city: 'Cuyahoga Falls', zip: null, region: 'akron', priority: 'primary',
    classification: [
      'Strong residential appeal',
      'Quiet environment',
      'Convenient for Akron-area professionals',
    ],
    cautions: ['Higher acquisition cost may reduce cash flow'],
    price_low: 180000, price_high: 200000,
    rent_low: null, rent_expected: null, rent_strong: null,
    recommendation: 'Preferred maximum purchase price: $200,000.', sort_order: 4,
  },
  {
    name: 'Cleveland Heights',
    city: 'Cleveland Heights', zip: null, region: 'cleveland', priority: 'secondary',
    classification: [
      'Preferred Cleveland expansion area',
      'Strong access to Cleveland Clinic',
      'Strong access to University Hospitals',
      'Proximity to Case Western Reserve University',
      'Suitable for medical residents, fellows, physicians, and visiting faculty',
    ],
    cautions: ['Higher property prices, taxes, insurance, and operating costs'],
    price_low: 180000, price_high: 225000,
    rent_low: 2000, rent_expected: 2400, rent_strong: 2700,
    recommendation: null, sort_order: 5,
  },
  {
    name: 'University Circle',
    city: 'Cleveland', zip: null, region: 'cleveland', priority: 'later',
    classification: [
      'High medical and educational demand',
      'Higher acquisition cost',
      'Better suited for later expansion',
      'Multifamily property may be required for stronger returns',
    ],
    cautions: ['Higher acquisition cost', 'Multifamily likely required'],
    price_low: 0, price_high: 0,
    rent_low: null, rent_expected: null, rent_strong: null,
    recommendation:
      'Do not use University Circle as the first pilot market unless the property has multiple rentable units, a significant pricing advantage, or unusually strong projected cash flow.',
    sort_order: 6,
  },
];

export const SEED_EMPLOYERS = [
  { name: 'Summa Health', category: 'Hospital system', city: 'Akron', has_residency: true, has_fellowship: true, med_school_affiliation: 'NEOMED', travel_nurse_demand: 'high', contract_demand: 'high', estimated_housing_demand: 'high', sort_order: 1 },
  { name: 'Akron Children\u2019s Hospital', category: 'Hospital system', city: 'Akron', has_residency: true, has_fellowship: true, med_school_affiliation: 'NEOMED', travel_nurse_demand: 'high', contract_demand: 'high', estimated_housing_demand: 'high', sort_order: 2 },
  { name: 'Cleveland Clinic', category: 'Hospital system', city: 'Cleveland', has_residency: true, has_fellowship: true, med_school_affiliation: 'Cleveland Clinic Lerner College of Medicine', travel_nurse_demand: 'high', contract_demand: 'high', estimated_housing_demand: 'high', sort_order: 3 },
  { name: 'University Hospitals', category: 'Hospital system', city: 'Cleveland', has_residency: true, has_fellowship: true, med_school_affiliation: 'Case Western Reserve University', travel_nurse_demand: 'high', contract_demand: 'high', estimated_housing_demand: 'high', sort_order: 4 },
  { name: 'Case Western Reserve University', category: 'Medical school', city: 'Cleveland', has_residency: false, has_fellowship: true, med_school_affiliation: 'CWRU School of Medicine', travel_nurse_demand: 'low', contract_demand: 'medium', estimated_housing_demand: 'high', sort_order: 5 },
  { name: 'Rehabilitation hospitals', category: 'Rehabilitation', city: null, has_residency: false, has_fellowship: false, med_school_affiliation: null, travel_nurse_demand: 'medium', contract_demand: 'high', estimated_housing_demand: 'medium', sort_order: 6 },
  { name: 'Skilled nursing facilities', category: 'Skilled nursing', city: null, has_residency: false, has_fellowship: false, med_school_affiliation: null, travel_nurse_demand: 'high', contract_demand: 'high', estimated_housing_demand: 'medium', sort_order: 7 },
  { name: 'Specialty medical centers', category: 'Specialty', city: null, has_residency: false, has_fellowship: false, med_school_affiliation: null, travel_nurse_demand: 'medium', contract_demand: 'medium', estimated_housing_demand: 'medium', sort_order: 8 },
  { name: 'Outpatient surgery centers', category: 'Outpatient surgery', city: null, has_residency: false, has_fellowship: false, med_school_affiliation: null, travel_nurse_demand: 'low', contract_demand: 'medium', estimated_housing_demand: 'low', sort_order: 9 },
  { name: 'Medical staffing agencies', category: 'Staffing agency', city: null, has_residency: false, has_fellowship: false, med_school_affiliation: null, travel_nurse_demand: 'high', contract_demand: 'high', estimated_housing_demand: 'high', sort_order: 10 },
];

const startupBase = {
  down_payment_pct: 20,
  closing_costs: 5250, inspection_cost: 500, appraisal_cost: 600,
  initial_repairs: 8000, paint_cosmetic: 3500,
  furniture: 11000, appliances: 2500, kitchen_supplies: 900, linens: 700,
  security_system: 500, internet_setup: 300,
  utility_deposits: 400, insurance_deposit: 600,
  licensing_permits: 350, marketing: 600, initial_cleaning: 400,
  vacancy_reserve: 3500, maintenance_reserve: 3500, emergency_reserve: 3000,
};

export const SEED_STARTUP_SCENARIOS = [
  { name: 'Akron Entry Scenario', purchase_price: 150000, is_active: true, range_low: 62500, range_high: 81000, sort_order: 1, ...startupBase },
  { name: 'Highland Square Scenario', purchase_price: 184000, is_active: false, range_low: 72300, range_high: 89300, sort_order: 2, ...startupBase },
  { name: 'Cleveland Heights Scenario', purchase_price: 235000, is_active: false, range_low: 91000, range_high: 111000, sort_order: 3, ...startupBase, furniture: 14000, initial_repairs: 10000 },
];

const incomeBase = {
  bedrooms: 3, occupancy_pct: 90, annual_vacancy_pct: 10,
  utilities: 220, internet: 75, property_taxes: 240, insurance: 110,
  mortgage: 760, maintenance_reserve: 125, furniture_reserve: 60,
  cleaning: 120, lawn_care: 60, snow_removal: 40,
  property_management: 0, platform_fees: 45, advertising: 35, other_expenses: 40,
  cash_invested: 72000,
};

export const SEED_INCOME_SCENARIOS = [
  { name: 'Akron — Conservative', model_type: 'whole_property', market_label: 'Akron', monthly_rent: 1800, rent_per_room: 0, is_active: false, sort_order: 1, ...incomeBase },
  { name: 'Akron — Expected', model_type: 'whole_property', market_label: 'Akron', monthly_rent: 2100, rent_per_room: 0, is_active: true, sort_order: 2, ...incomeBase },
  { name: 'Akron — Strong', model_type: 'whole_property', market_label: 'Akron', monthly_rent: 2300, rent_per_room: 0, is_active: false, sort_order: 3, ...incomeBase },
  { name: 'Room-by-Room — 3 @ $850', model_type: 'room_by_room', market_label: 'Akron', monthly_rent: 0, rent_per_room: 850, is_active: false, sort_order: 4, ...incomeBase, cleaning: 220 },
  { name: 'Room-by-Room — 3 @ $950', model_type: 'room_by_room', market_label: 'Akron', monthly_rent: 0, rent_per_room: 950, is_active: false, sort_order: 5, ...incomeBase, cleaning: 220 },
  { name: 'Room-by-Room — 3 @ $1,050', model_type: 'room_by_room', market_label: 'Akron', monthly_rent: 0, rent_per_room: 1050, is_active: false, sort_order: 6, ...incomeBase, cleaning: 220 },
  { name: 'Cleveland Heights — Conservative', model_type: 'whole_property', market_label: 'Cleveland Heights', monthly_rent: 2000, rent_per_room: 0, is_active: false, sort_order: 7, ...incomeBase, property_taxes: 420, insurance: 145, mortgage: 1190, cash_invested: 100000 },
  { name: 'Cleveland Heights — Expected', model_type: 'whole_property', market_label: 'Cleveland Heights', monthly_rent: 2400, rent_per_room: 0, is_active: false, sort_order: 8, ...incomeBase, property_taxes: 420, insurance: 145, mortgage: 1190, cash_invested: 100000 },
  { name: 'Cleveland Heights — Strong', model_type: 'whole_property', market_label: 'Cleveland Heights', monthly_rent: 2700, rent_per_room: 0, is_active: false, sort_order: 9, ...incomeBase, property_taxes: 420, insurance: 145, mortgage: 1190, cash_invested: 100000 },
];

export const SEED_DUPLEX_UNITS = [
  { unit_label: 'Unit A — Furnished medical', lease_type: 'furnished_medical', monthly_rent: 1500, occupancy_pct: 90, monthly_expenses: 420, maintenance_cost: 90, tenant_type: 'Travel nurse / resident', sort_order: 1 },
  { unit_label: 'Unit B — Long-term rental', lease_type: 'long_term', monthly_rent: 950, occupancy_pct: 96, monthly_expenses: 260, maintenance_cost: 70, tenant_type: '12-month tenant', sort_order: 2 },
];

export const SEED_MILESTONES = [
  'Select target Akron neighborhood',
  'Identify hospital clusters',
  'Contact medical staffing agencies',
  'Contact residency coordinators',
  'Research furnished rental competition',
  'Establish financing target',
  'Save startup capital',
  'Obtain loan preapproval',
  'Review local zoning',
  'Identify properties',
  'Run property financial analysis',
  'Complete inspection',
  'Purchase property',
  'Furnish property',
  'Create lease documents',
  'Establish tenant screening process',
  'Set up online payments',
  'Establish cleaning and maintenance systems',
  'Launch referral outreach',
  'Place first medical professional tenant',
  'Complete 90-day performance review',
  'Complete first-year financial review',
].map((title, idx) => ({
  title,
  sort_order: idx + 1,
  phase:
    idx < 5 ? 'Research' : idx < 9 ? 'Financing' : idx < 13 ? 'Acquisition' : idx < 19 ? 'Launch' : 'Review',
}));

// ============================================================
// Helpers
// ============================================================

function n(v: unknown): number {
  const x = typeof v === 'number' ? v : parseFloat(String(v ?? 0));
  return Number.isFinite(x) ? x : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

export function fmt(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function fmtPct(v: number | null | undefined, digits = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${v.toFixed(digits)}%`;
}
