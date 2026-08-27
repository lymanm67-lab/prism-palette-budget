// MONEY BLUEPRINT 2.0 — master financial data model.
// Single source of truth for every assumption. Nothing downstream hard-codes a value:
// all cards, charts, projections and binder pages derive from AssumptionState via the
// pure functions in this file. Change one input -> every dependent number moves.

export type Confidence = 'current' | 'estimated' | 'projected';

export interface Tracked {
  value: number;
  confidence: Confidence;
  effectiveDate?: string; // ISO
  updatedAt?: string; // ISO
  source?: string;
}

export const tracked = (
  value: number,
  confidence: Confidence = 'estimated',
  source?: string,
): Tracked => ({ value, confidence, source, updatedAt: new Date().toISOString().slice(0, 10) });

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  current: 'CURRENT / VERIFIED',
  estimated: 'ESTIMATED',
  projected: 'PROJECTED',
};

// ---------------------------------------------------------------------------
// Debt -> wealth conversion
// ---------------------------------------------------------------------------

export type RedirectDestination =
  | 'workplace_retirement'
  | 'hsa'
  | 'roth'
  | 'brokerage'
  | 'emergency'
  | 'other';

export const DESTINATION_LABEL: Record<RedirectDestination, string> = {
  workplace_retirement: 'Workplace retirement (TDA / 457)',
  hsa: 'HSA',
  roth: 'Roth account',
  brokerage: 'Taxable brokerage',
  emergency: 'Emergency fund',
  other: 'Other investment account',
};

export interface DebtRedirect {
  key: string;
  label: string;
  balance: number;
  ratePct: number;
  requiredPayment: number;
  extraPayment: number;
  /** ISO month (YYYY-MM) the payment is expected to end. */
  payoffDate: string;
  /** ISO month actually paid off — set only once it happens. */
  actualPayoffDate?: string;
  /** Monthly cash flow released once the debt is gone (defaults to required+extra). */
  releasedCashFlow?: number;
  destination: RedirectDestination;
  /** Forgiveness (PSLF/IDR) tracking — only for the student loan row. */
  forgiveness?: {
    qualifyingPaymentsCompleted: number;
    qualifyingPaymentsRemaining: number;
    monthlyQualifyingPayment: number;
    /** ISO month forgiveness is expected. */
    forgivenessDate: string;
  };
  notes?: string;
}

export const releasedCash = (d: DebtRedirect) =>
  d.releasedCashFlow ?? d.requiredPayment + d.extraPayment;

// ---------------------------------------------------------------------------
// Investment waterfall
// ---------------------------------------------------------------------------

export interface WaterfallStep {
  key: string;
  label: string;
  /** Editable annual IRS/plan limit — never hard-coded downstream. */
  annualLimit: number;
  /** Annual dollars already committed via payroll. */
  committedAnnual: number;
  eligible: boolean;
  notes?: string;
}

export interface WaterfallFill {
  key: string;
  label: string;
  annualLimit: number;
  committedAnnual: number;
  filled: number;
  room: number;
  overflow: number;
  eligible: boolean;
}

/** Flows available cash through the ordered steps, spilling excess to the next one. */
export function runWaterfall(steps: WaterfallStep[], availableAnnual: number): {
  fills: WaterfallFill[];
  unallocated: number;
} {
  let cash = Math.max(0, availableAnnual);
  const fills: WaterfallFill[] = steps.map((s) => {
    const room = s.eligible ? Math.max(0, s.annualLimit - s.committedAnnual) : 0;
    const filled = Math.min(room, cash);
    cash -= filled;
    return {
      key: s.key,
      label: s.label,
      annualLimit: s.annualLimit,
      committedAnnual: s.committedAnnual,
      filled,
      room,
      overflow: cash,
      eligible: s.eligible,
    };
  });
  return { fills, unallocated: cash };
}

// ---------------------------------------------------------------------------
// Long-term care
// ---------------------------------------------------------------------------

export interface LtcQuote {
  id: string;
  carrier: string;
  product: string;
  applicant: string;
  monthlyPremium: number;
  startingMonthlyBenefit: number;
  benefitPool: number;
  benefitPeriodYears: number;
  homeCarePct: number;
  assistedLivingPct: number;
  nursingPct: number;
  cashBenefitPct: number;
  eliminationDays: number;
  inflationPct: number;
  inflationCompound: boolean;
  inflationYears: number;
  partnershipQualified: boolean;
  sharedCare: boolean;
  premiumWaiver: boolean;
  nonforfeiture: boolean;
  spousalDiscount: boolean;
  underwritingClass: string;
  quoteDate: string;
  notes?: string;
}

export const annualPremium = (q: LtcQuote) => q.monthlyPremium * 12;
export const dailyBenefit = (q: LtcQuote) => q.startingMonthlyBenefit / 30;

/** Grows a quote's monthly benefit and pool to a target age. */
export function ltcBenefitAtAge(q: LtcQuote, currentAge: number, targetAge: number) {
  const years = Math.max(0, Math.min(targetAge - currentAge, q.inflationYears));
  const r = q.inflationPct / 100;
  const factor = q.inflationCompound ? Math.pow(1 + r, years) : 1 + r * years;
  return {
    age: targetAge,
    monthlyBenefit: q.startingMonthlyBenefit * factor,
    dailyBenefit: (q.startingMonthlyBenefit * factor) / 30,
    benefitPool: q.benefitPool * factor,
  };
}

export type CareScenarioKey =
  | 'home20'
  | 'home30'
  | 'home40'
  | 'home24'
  | 'assisted'
  | 'nursing';

export const CARE_SCENARIOS: { key: CareScenarioKey; label: string; hoursPerWeek?: number; facility?: boolean }[] = [
  { key: 'home20', label: 'Home care 20 hrs/week', hoursPerWeek: 20 },
  { key: 'home30', label: 'Home care 30 hrs/week', hoursPerWeek: 30 },
  { key: 'home40', label: 'Home care 40 hrs/week', hoursPerWeek: 40 },
  { key: 'home24', label: 'Home care 24 hours/day', hoursPerWeek: 168 },
  { key: 'assisted', label: 'Assisted living', facility: true },
  { key: 'nursing', label: 'Nursing facility', facility: true },
];

export interface CareCostBasis {
  homeHourlyRate: number;
  assistedMonthly: number;
  nursingMonthly: number;
  inflationPct: number;
}

/** Monthly cost of a care scenario at a future age, inflated from today. */
export function careCostAtAge(
  scenario: CareScenarioKey,
  basis: CareCostBasis,
  currentAge: number,
  targetAge: number,
): number {
  const meta = CARE_SCENARIOS.find((s) => s.key === scenario)!;
  const today =
    scenario === 'assisted'
      ? basis.assistedMonthly
      : scenario === 'nursing'
        ? basis.nursingMonthly
        : basis.homeHourlyRate * (meta.hoursPerWeek ?? 0) * 4.333;
  const years = Math.max(0, targetAge - currentAge);
  return today * Math.pow(1 + basis.inflationPct / 100, years);
}

export interface LtcScore {
  quoteId: string;
  affordability: number;
  futureBenefit: number;
  inflationProtection: number;
  homeCareFlexibility: number;
  cashBenefit: number;
  partnership: number;
  benefitPool: number;
  spousalProtection: number;
  total: number;
}

/** Scores quotes relative to each other on eight axes (0-10 each). Price is one axis, not the verdict. */
export function scoreLtcQuotes(quotes: LtcQuote[], currentAge: number, evalAge = 85): LtcScore[] {
  if (!quotes.length) return [];
  const prem = quotes.map((q) => q.monthlyPremium);
  const future = quotes.map((q) => ltcBenefitAtAge(q, currentAge, evalAge).monthlyBenefit);
  const pools = quotes.map((q) => ltcBenefitAtAge(q, currentAge, evalAge).benefitPool);
  const rel = (v: number, arr: number[], invert = false) => {
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    if (max === min) return 7;
    const t = (v - min) / (max - min);
    return Math.round((invert ? 1 - t : t) * 10 * 10) / 10;
  };
  return quotes.map((q, i) => {
    const s = {
      quoteId: q.id,
      affordability: rel(prem[i], prem, true),
      futureBenefit: rel(future[i], future),
      inflationProtection: Math.min(10, (q.inflationPct / 5) * 6 + (q.inflationCompound ? 3 : 0) + (q.inflationYears >= 99 ? 1 : 0)),
      homeCareFlexibility: Math.min(10, (q.homeCarePct / 100) * 10),
      cashBenefit: Math.min(10, (q.cashBenefitPct / 100) * 10),
      partnership: q.partnershipQualified ? 10 : 0,
      benefitPool: rel(pools[i], pools),
      spousalProtection: (q.sharedCare ? 5 : 0) + (q.spousalDiscount ? 3 : 0) + (q.premiumWaiver ? 2 : 0),
      total: 0,
    };
    s.total =
      Math.round(
        (s.affordability + s.futureBenefit + s.inflationProtection + s.homeCareFlexibility +
          s.cashBenefit + s.partnership + s.benefitPool + s.spousalProtection) * 10,
      ) / 10;
    return s;
  });
}

// ---------------------------------------------------------------------------
// Healthcare reserve
// ---------------------------------------------------------------------------

export interface HealthcareReserveInputs {
  medicarePartB: number;
  medigap: number;
  partD: number;
  advantage: number;
  ltcPremium: number;
  dental: number;
  vision: number;
  hearing: number;
  copays: number;
  deductibles: number;
  eliminationPeriodCost: number;
  homeCareGap: number;
  uncoveredCare: number;
  other: number;
  /** Years of cost the reserve should cover. */
  reserveYears: number;
  hsaBalance: number;
}

export const HEALTHCARE_LINES: { key: keyof HealthcareReserveInputs; label: string; annual?: boolean }[] = [
  { key: 'medicarePartB', label: 'Medicare Part B premium' },
  { key: 'medigap', label: 'Medicare supplement / Medigap' },
  { key: 'partD', label: 'Part D premium' },
  { key: 'advantage', label: 'Medicare Advantage costs' },
  { key: 'ltcPremium', label: 'LTC insurance premium' },
  { key: 'dental', label: 'Dental' },
  { key: 'vision', label: 'Vision' },
  { key: 'hearing', label: 'Hearing' },
  { key: 'copays', label: 'Copays' },
  { key: 'deductibles', label: 'Deductibles' },
  { key: 'eliminationPeriodCost', label: 'LTC elimination period', annual: true },
  { key: 'homeCareGap', label: 'Home-care gap', annual: true },
  { key: 'uncoveredCare', label: 'Uncovered care', annual: true },
  { key: 'other', label: 'Other healthcare' },
];

export function healthcareReserve(i: HealthcareReserveInputs) {
  const monthlyLines = HEALTHCARE_LINES.filter((l) => !l.annual).reduce(
    (s, l) => s + (Number(i[l.key]) || 0), 0);
  const annualExtras = HEALTHCARE_LINES.filter((l) => l.annual).reduce(
    (s, l) => s + (Number(i[l.key]) || 0), 0);
  const annual = monthlyLines * 12 + annualExtras;
  const target = annual * Math.max(1, i.reserveYears || 1);
  return {
    monthly: annual / 12,
    annual,
    target,
    hsaBalance: i.hsaBalance,
    gap: target - i.hsaBalance,
  };
}

// ---------------------------------------------------------------------------
// Assumption state
// ---------------------------------------------------------------------------

export interface AssumptionState {
  asOf: string;
  currentAge: number;
  spouseCurrentAge: number;
  retirementAge: number;
  /** Salary & raise accelerator */
  salaryAnnual: number;
  salaryGrowthPct: number;
  raiseRedirectPct: number;
  raiseDestination: RedirectDestination;
  employerContributionPct: number;
  employeeContributionMonthly: number;
  additionalVoluntaryMonthly: number;
  scheduledIncreaseMonthly: number;
  scheduledIncreaseStartYear: number;
  /** Portfolio */
  portfolioBalance: number;
  returnScenarios: number[];
  primaryReturnPct: number;
  stretchReturnPct: number;
  milestones: number[];
  inflationPct: number;
  healthcareInflationPct: number;
  /** Income streams — never counted as net worth */
  socialSecurityStartAge: number;
  socialSecurityMonthly: number;
  socialSecurityCola: number;
  spousePensionStartAge: number;
  spousePensionMonthly: number;
  spousePensionCola: number;
  spousePensionSurvivorPct: number;
  otherRecurringIncomeMonthly: number;
  legacyWindowStartAge: number;
  plannedWithdrawalForLiving: number;
  /** Tax / RMD */
  rmdAge: number;
  effectiveTaxRatePct: number;
  rothConversionAnnual: number;
  /** Modules */
  debts: DebtRedirect[];
  waterfall: WaterfallStep[];
  ltcQuotes: LtcQuote[];
  careCostBasis: CareCostBasis;
  healthcare: HealthcareReserveInputs;
  medicare: {
    plannedMedicareAge: number;
    hsaEligible: boolean;
    medicareEnrolled: boolean;
    activeEmployerCoverage: boolean;
    optionsConsidered: string[];
  };
  achievedMilestones: { amount: number; date?: string }[];
  scenarios: SavedScenario[];
  confidence: Record<string, Confidence>;
  /** Link to the household spending plan (Budget Planner / CSV import). */
  budget: BudgetLink;
}

/**
 * The monthly budget that funds investing. `plannedSpendMonthly` is the sum of
 * the household outflow budgets for `sourceMonth`; whatever net income is left
 * over is surplus, and `surplusRedirectPct` of it is invested in the timeline.
 */
export interface BudgetLink {
  sourceMonth: string;
  netIncomeMonthly: number;
  plannedSpendMonthly: number;
  surplusRedirectPct: number;
  /** Where the numbers came from — 'planner', 'csv' or 'manual'. */
  source: 'planner' | 'csv' | 'manual';
  importedAt?: string;
  categoryCount?: number;
}

/** Net income minus planned spending for the linked budget month. */
export const budgetSurplus = (s: AssumptionState) =>
  Math.round(((s.budget?.netIncomeMonthly || 0) - (s.budget?.plannedSpendMonthly || 0)) * 100) / 100;

/** The share of surplus that actually reaches the portfolio each month. */
export const budgetSurplusMonthly = (s: AssumptionState) =>
  Math.round(Math.max(0, budgetSurplus(s)) * ((s.budget?.surplusRedirectPct || 0) / 100) * 100) / 100;

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  /** Sparse override of the assumption state. */
  overrides: Partial<AssumptionState>;
}

/**
 * Household baseline — every value below is the real, verified figure for the
 * Montgomery household (IU + DODD paystubs, OPERS, SSA estimate, debt records).
 */
export function defaultAssumptions(seed?: Partial<AssumptionState>): AssumptionState {
  const debts: DebtRedirect[] = [
    {
      key: 'student',
      label: 'Student loans (PSLF / IDR)',
      balance: 107_000,
      ratePct: 6.5,
      requiredPayment: 390,
      extraPayment: 0,
      payoffDate: '2033-07',
      destination: 'workplace_retirement',
      forgiveness: {
        qualifyingPaymentsCompleted: 41,
        qualifyingPaymentsRemaining: 79,
        monthlyQualifyingPayment: 390,
        forgivenessDate: '2033-07',
      },
      notes: 'IDR payments of $390 begin Jan 2027. Liability until legally forgiven; payment redirects to investing at forgiveness.',
    },
    {
      key: 'vacation',
      label: 'Vacation loans (2)',
      balance: 5_049.30,
      ratePct: 12,
      requiredPayment: 383.90,
      extraPayment: 0,
      payoffDate: '2027-01',
      destination: 'roth',
      notes: 'Vacation Loan 1 $3,488.03 at $228.47 + Vacation Loan 2 $1,561.27 at $155.43.',
    },
    {
      key: 'consumer',
      label: 'Consumer debt (BetrLink settlement)',
      balance: 2_606.04,
      ratePct: 24,
      requiredPayment: 888,
      extraPayment: 0,
      payoffDate: '2026-11',
      destination: 'brokerage',
      notes: 'BetrLink settlement plan at $888/mo — the real Freedom Plan target.',
    },
    {
      key: 'sba',
      label: 'SBA loan',
      balance: 48_000,
      ratePct: 3,
      requiredPayment: 158,
      extraPayment: 0,
      payoffDate: '2050-01',
      destination: 'brokerage',
      notes: '3% minimums forever — lowest payoff priority.',
    },
  ];

  const base: AssumptionState = {
    asOf: new Date().toISOString().slice(0, 10),
    currentAge: 59,
    spouseCurrentAge: 55,
    retirementAge: 85,
    salaryAnnual: 70_940.04,
    salaryGrowthPct: 3,
    raiseRedirectPct: 100,
    raiseDestination: 'workplace_retirement',
    employerContributionPct: 9,
    employeeContributionMonthly: 451.66,
    additionalVoluntaryMonthly: 0,
    scheduledIncreaseMonthly: 250,
    scheduledIncreaseStartYear: 2028,
    portfolioBalance: 184_113.61,
    returnScenarios: [6, 7, 8, 9, 10],
    primaryReturnPct: 8,
    stretchReturnPct: 10,
    milestones: [200_000, 250_000, 500_000, 750_000, 1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000],
    inflationPct: 3,
    healthcareInflationPct: 5,
    socialSecurityStartAge: 70,
    socialSecurityMonthly: 4_035,
    socialSecurityCola: 2,
    spousePensionStartAge: 62,
    spousePensionMonthly: 6_559,
    spousePensionCola: 2,
    spousePensionSurvivorPct: 50,
    // Consulting / 1099 income: $1,925 per quarter = $7,700/yr.
    otherRecurringIncomeMonthly: 641.67,
    legacyWindowStartAge: 70,
    plannedWithdrawalForLiving: 0,
    rmdAge: 75,
    effectiveTaxRatePct: 22,
    rothConversionAnnual: 0,
    debts,
    waterfall: [
      { key: 'employer', label: 'Capture employer retirement contribution', annualLimit: 999_999, committedAnnual: 6_384.60, eligible: true, notes: 'IU 9% employer contribution — $532.05/mo.' },
      { key: 'workplace', label: 'Workplace retirement (403(b) TDA)', annualLimit: 23_500, committedAnnual: 2_220, eligible: true, notes: 'Roth TDA $85 + pre-tax TDA $100 per month.' },
      { key: 'gov457', label: 'Governmental 457(b)', annualLimit: 23_500, committedAnnual: 1_800, eligible: true, notes: 'Roth 457 $75 + pre-tax 457 $75 per month.' },
      { key: 'hsa', label: 'HSA (while eligible)', annualLimit: 8_550, committedAnnual: 4_400.04, eligible: true, notes: '$366.67/mo from payroll.' },
      { key: 'roth', label: 'Roth opportunities', annualLimit: 8_000, committedAnnual: 0, eligible: true },
      { key: 'brokerage', label: 'Taxable brokerage', annualLimit: 999_999, committedAnnual: 0, eligible: true },
      { key: 'legacy', label: 'Legacy / foundation assets', annualLimit: 999_999, committedAnnual: 0, eligible: true },
    ],
    ltcQuotes: [],
    careCostBasis: { homeHourlyRate: 33, assistedMonthly: 5_200, nursingMonthly: 9_100, inflationPct: 5 },
    healthcare: {
      medicarePartB: 185, medigap: 180, partD: 35, advantage: 0, ltcPremium: 0,
      dental: 45, vision: 15, hearing: 20, copays: 60, deductibles: 40,
      eliminationPeriodCost: 0, homeCareGap: 0, uncoveredCare: 0, other: 0,
      reserveYears: 5, hsaBalance: 1_500,
    },
    medicare: {
      plannedMedicareAge: 65,
      hsaEligible: true,
      medicareEnrolled: false,
      activeEmployerCoverage: true,
      optionsConsidered: ['Medicare Part A', 'Medicare Part B', 'Medicare Part D', 'IU Blue Retiree Plan'],
    },
    achievedMilestones: [{ amount: 100_000 }],
    scenarios: baselineScenarios(debts),
    confidence: {
      socialSecurityMonthly: 'projected',
      portfolioBalance: 'current',
      salaryAnnual: 'current',
      employeeContributionMonthly: 'current',
      spousePensionMonthly: 'current',
      otherRecurringIncomeMonthly: 'current',
      retirementAge: 'projected',
    },
    // Net income = Lyman $4,250.02 + Kateri $4,227.72 take-home. Planned spend is
    // the confirmed household budget target; surplus redirect starts at 0 so an
    // import never silently inflates a projection.
    budget: {
      sourceMonth: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`,
      netIncomeMonthly: 8_692.63,
      plannedSpendMonthly: 4_393.58,
      surplusRedirectPct: 0,
      source: 'manual',
    },
  };
  const merged = { ...base, ...(seed || {}) };
  // Older saved records predate the seeded comparison scenarios / budget link.
  if (!merged.scenarios?.length) merged.scenarios = baselineScenarios(merged.debts || debts);
  merged.budget = { ...base.budget, ...(seed?.budget || {}) };
  return merged;
}

/**
 * Saved comparison sets: work-stop age sensitivity, return sensitivity, and the
 * PSLF forgiven / not-forgiven fork. Overrides are sparse patches of the state.
 */
export function baselineScenarios(debts: DebtRedirect[]): SavedScenario[] {
  const createdAt = '2026-08-19';
  const mk = (id: string, name: string, overrides: Partial<AssumptionState>): SavedScenario =>
    ({ id, name, createdAt, overrides });

  // PSLF fails: the balance is repaid on a standard schedule instead of forgiven.
  const unforgiven: DebtRedirect[] = debts.map((d) =>
    d.forgiveness
      ? {
          ...d,
          label: 'Student loans (no forgiveness — repaid in full)',
          requiredPayment: 1_215,
          payoffDate: '2037-01',
          forgiveness: undefined,
          notes: 'PSLF denied — $107,000 repaid over 10 years at roughly $1,215/mo.',
        }
      : d,
  );

  return [
    mk('retire-75', 'Retire at 75', { retirementAge: 75 }),
    mk('retire-80', 'Retire at 80', { retirementAge: 80 }),
    mk('retire-85', 'Retire at 85 (base plan)', { retirementAge: 85 }),
    mk('return-6', 'Conservative — 6% returns', { primaryReturnPct: 6, stretchReturnPct: 7 }),
    mk('return-8', 'Base — 8% returns', { primaryReturnPct: 8, stretchReturnPct: 10 }),
    mk('return-10', 'Stretch — 10% returns', { primaryReturnPct: 10, stretchReturnPct: 12 }),
    mk('pslf-forgiven', 'PSLF forgiven July 2033 (base)', { debts }),
    mk('pslf-denied', 'PSLF denied — student loans paid in full', { debts: unforgiven }),
  ];
}


export function applyScenario(state: AssumptionState, scenario?: SavedScenario | null): AssumptionState {
  if (!scenario) return state;
  return { ...state, ...scenario.overrides };
}

// ---------------------------------------------------------------------------
// Derived projections
// ---------------------------------------------------------------------------

export interface YearRow {
  year: number;
  age: number;
  salary: number;
  raiseAmount: number;
  cumulativeRaises: number;
  raiseRedirectMonthly: number;
  employeeMonthly: number;
  employerMonthly: number;
  debtRedirectMonthly: number;
  voluntaryMonthly: number;
  scheduledMonthly: number;
  /** Investable surplus released by the monthly budget. */
  budgetSurplusMonthly: number;
  totalMonthly: number;
  totalAnnual: number;
  /** Household income (legacy window) */
  socialSecurityMonthly: number;
  pensionMonthly: number;
  otherIncomeMonthly: number;
  householdIncomeMonthly: number;
}

const monthIndex = (iso?: string) => {
  if (!iso) return Infinity;
  const [y, m] = iso.split('-').map(Number);
  return y * 12 + (m || 1) - 1;
};

/** Monthly cash released by debt payoffs / forgiveness that is live in a given year. */
export function debtRedirectForYear(s: AssumptionState, year: number): number {
  const endOfYear = year * 12 + 11;
  return s.debts.reduce((sum, d) => {
    const done = d.actualPayoffDate ?? d.forgiveness?.forgivenessDate ?? d.payoffDate;
    return monthIndex(done) <= endOfYear ? sum + releasedCash(d) : sum;
  }, 0);
}

export function buildTimeline(s: AssumptionState): YearRow[] {
  const startYear = new Date().getFullYear();
  const years = Math.max(1, s.retirementAge - s.currentAge + 1);
  const rows: YearRow[] = [];
  let salary = s.salaryAnnual;
  let cumulativeRaises = 0;

  for (let i = 0; i < years; i++) {
    const year = startYear + i;
    const age = s.currentAge + i;
    const raiseAmount = i === 0 ? 0 : salary * (s.salaryGrowthPct / 100);
    if (i > 0) salary += raiseAmount;
    cumulativeRaises += raiseAmount;
    const raiseRedirectMonthly = (cumulativeRaises * (s.raiseRedirectPct / 100)) / 12;
    const employerMonthly = (salary * (s.employerContributionPct / 100)) / 12;
    const debtRedirectMonthly = debtRedirectForYear(s, year);
    const scheduledMonthly = year >= s.scheduledIncreaseStartYear ? s.scheduledIncreaseMonthly : 0;
    const employeeMonthly = s.employeeContributionMonthly;
    const voluntaryMonthly = s.additionalVoluntaryMonthly;
    const surplusMonthly = budgetSurplusMonthly(s);
    const totalMonthly =
      employeeMonthly + employerMonthly + debtRedirectMonthly + voluntaryMonthly +
      scheduledMonthly + raiseRedirectMonthly + surplusMonthly;

    const ssYears = age - s.socialSecurityStartAge;
    const socialSecurityMonthly =
      ssYears >= 0 ? s.socialSecurityMonthly * Math.pow(1 + s.socialSecurityCola / 100, ssYears) : 0;
    const penYears = s.spouseCurrentAge + i - s.spousePensionStartAge;
    const pensionMonthly =
      penYears >= 0 ? s.spousePensionMonthly * Math.pow(1 + s.spousePensionCola / 100, penYears) : 0;

    rows.push({
      year, age, salary, raiseAmount, cumulativeRaises, raiseRedirectMonthly,
      employeeMonthly, employerMonthly, debtRedirectMonthly, voluntaryMonthly,
      scheduledMonthly, budgetSurplusMonthly: surplusMonthly,
      totalMonthly, totalAnnual: totalMonthly * 12,
      socialSecurityMonthly, pensionMonthly,
      otherIncomeMonthly: s.otherRecurringIncomeMonthly,
      householdIncomeMonthly:
        salary / 12 + socialSecurityMonthly + pensionMonthly + s.otherRecurringIncomeMonthly,
    });
  }
  return rows;
}

export interface ProjectionPoint {
  year: number;
  age: number;
  balance: number;
  contributions: number;
  growth: number;
}

/** Compounds the contribution timeline forward at a given return. */
export function projectPortfolio(s: AssumptionState, returnPct: number): ProjectionPoint[] {
  const rows = buildTimeline(s);
  const r = returnPct / 100;
  let balance = s.portfolioBalance;
  let contributed = 0;
  const out: ProjectionPoint[] = [];
  for (const row of rows) {
    const annual = row.totalAnnual - s.plannedWithdrawalForLiving * 12;
    // mid-year contribution convention
    balance = balance * (1 + r) + annual * (1 + r / 2);
    contributed += annual;
    out.push({
      year: row.year,
      age: row.age,
      balance,
      contributions: s.portfolioBalance + contributed,
      growth: balance - s.portfolioBalance - contributed,
    });
  }
  return out;
}

export interface MilestoneHit {
  amount: number;
  year: number | null;
  age: number | null;
  yearsFromNow: number | null;
  returnPct: number;
  contributionsAtHit: number;
  growthAtHit: number;
}

export function milestoneHits(s: AssumptionState, returnPct: number): MilestoneHit[] {
  const path = projectPortfolio(s, returnPct);
  const thisYear = new Date().getFullYear();
  return s.milestones.map((amount) => {
    const hit = path.find((p) => p.balance >= amount);
    return {
      amount,
      year: hit?.year ?? null,
      age: hit?.age ?? null,
      yearsFromNow: hit ? hit.year - thisYear : null,
      returnPct,
      contributionsAtHit: hit?.contributions ?? 0,
      growthAtHit: hit?.growth ?? 0,
    };
  });
}

export interface LegacyWindowRow extends YearRow {
  pctOfIncomeInvested: number;
}

export function legacyWindow(s: AssumptionState): LegacyWindowRow[] {
  return buildTimeline(s)
    .filter((r) => r.age >= s.legacyWindowStartAge && r.age <= s.retirementAge)
    .map((r) => ({
      ...r,
      pctOfIncomeInvested:
        r.householdIncomeMonthly > 0 ? (r.totalMonthly / r.householdIncomeMonthly) * 100 : 0,
    }));
}

// ---------------------------------------------------------------------------
// RMD / Roth (kept conceptually separate from "new wealth")
// ---------------------------------------------------------------------------

const RMD_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9,
};

export function rmdSchedule(s: AssumptionState, pretaxBalance: number, returnPct?: number) {
  const r = (returnPct ?? s.primaryReturnPct) / 100;
  let bal = pretaxBalance;
  const rows: { age: number; balance: number; rmd: number; taxes: number; netToBrokerage: number }[] = [];
  for (let age = s.rmdAge; age <= Math.min(95, s.retirementAge + 15); age++) {
    const divisor = RMD_DIVISORS[age] ?? 8.9;
    const rmd = bal / divisor;
    const taxes = rmd * (s.effectiveTaxRatePct / 100);
    rows.push({ age, balance: bal, rmd, taxes, netToBrokerage: rmd - taxes });
    bal = (bal - rmd) * (1 + r);
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Data integrity
// ---------------------------------------------------------------------------

export interface IntegrityIssue {
  id: string;
  severity: 'error' | 'warn' | 'info';
  title: string;
  detail: string;
}

export function validateBlueprint(
  s: AssumptionState,
  live?: {
    netWorth?: number;
    liabilities?: { name: string; balance: number }[];
    portfolio?: number;
    assets?: { name: string; balance: number }[];
  },
): IntegrityIssue[] {

  const issues: IntegrityIssue[] = [];

  const dupDebt = new Map<string, number>();
  s.debts.forEach((d) => dupDebt.set(d.label.toLowerCase().trim(), (dupDebt.get(d.label.toLowerCase().trim()) || 0) + 1));
  dupDebt.forEach((n, label) => {
    if (n > 1) issues.push({ id: `dup-debt-${label}`, severity: 'error', title: 'Duplicate liability', detail: `"${label}" appears ${n} times in the debt plan.` });
  });

  if (s.plannedWithdrawalForLiving > 0) {
    issues.push({ id: 'withdrawal', severity: 'warn', title: 'Portfolio withdrawal planned during accumulation', detail: `The Age ${s.legacyWindowStartAge}–${s.retirementAge} window assumes $0 withdrawals for ordinary living. Currently set to $${s.plannedWithdrawalForLiving.toLocaleString()}/mo.` });
  }

  if (s.spousePensionMonthly > 0 || s.socialSecurityMonthly > 0) {
    issues.push({ id: 'income-not-assets', severity: 'info', title: 'Pension & Social Security excluded from net worth', detail: 'Future pension and Social Security are modelled as income streams only — they are never added to assets.' });
  }

  const employerStep = s.waterfall.find((w) => w.key === 'employer');
  if (employerStep && employerStep.committedAnnual > 0) {
    issues.push({ id: 'employer-double', severity: 'warn', title: 'Possible double-counted employer contribution', detail: 'Employer dollars are already derived from the employer contribution rate. Remove the committed amount on the "Capture employer retirement contribution" waterfall step.' });
  }

  const redirectKeys = new Set<string>();
  s.debts.forEach((d) => {
    if (redirectKeys.has(d.key)) issues.push({ id: `dup-redirect-${d.key}`, severity: 'error', title: 'Duplicate debt redirect', detail: `Redirect key "${d.key}" is used more than once.` });
    redirectKeys.add(d.key);
  });

  s.achievedMilestones.forEach((m) => {
    if (!m.date) issues.push({ id: `milestone-${m.amount}`, severity: 'info', title: `$${m.amount.toLocaleString()} achieved — date not documented`, detail: 'No historical achievement date on file. Nothing has been invented.' });
  });

  if (live?.portfolio && Math.abs(live.portfolio - s.portfolioBalance) > 1) {
    issues.push({ id: 'portfolio-conflict', severity: 'error', title: 'DATA REVIEW REQUIRED — portfolio balance conflict', detail: `Assumption Center says $${s.portfolioBalance.toLocaleString()}, live account data says $${Math.round(live.portfolio).toLocaleString()}. Confirm which is correct.` });
  }

  if (live?.liabilities?.length) {
    const liveTotal = live.liabilities.reduce((a, b) => a + b.balance, 0);
    const planTotal = s.debts.reduce((a, b) => a + b.balance, 0);
    if (Math.abs(liveTotal - planTotal) / Math.max(1, liveTotal) > 0.1) {
      issues.push({ id: 'liab-conflict', severity: 'warn', title: 'Liability totals differ from live accounts', detail: `Debt plan totals $${Math.round(planTotal).toLocaleString()} vs live $${Math.round(liveTotal).toLocaleString()}.` });
    }
  }

  const asOfAge = new Date().getFullYear() - new Date(s.asOf).getFullYear();
  if (asOfAge >= 1) issues.push({ id: 'stale', severity: 'warn', title: 'Projections may be outdated', detail: `Assumptions were last dated ${s.asOf}.` });

  if (s.rmdAge < 73) issues.push({ id: 'rmd-age', severity: 'warn', title: 'RMD age below current law', detail: 'RMD age is editable, but values below 73 conflict with current rules.' });

  // Repeated asset rows inflate net worth — flagged, never auto-deleted.
  if (live?.assets?.length) {
    const groups = new Map<string, { name: string; count: number; total: number }>();
    for (const a of live.assets) {
      const key = a.name.toLowerCase().trim();
      const g = groups.get(key) || { name: a.name, count: 0, total: 0 };
      g.count += 1;
      g.total += a.balance;
      groups.set(key, g);
    }
    groups.forEach((g, key) => {
      if (g.count > 1) {
        issues.push({
          id: `dup-asset-${key}`,
          severity: 'warn',
          title: `Duplicate asset row — "${g.name}"`,
          detail: `"${g.name}" appears ${g.count} times in your accounts, totalling $${g.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}. Confirm which row to keep; nothing has been deleted.`,
        });
      }
    });
  }

  return issues;
}

