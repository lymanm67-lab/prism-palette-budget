// Tax-Efficient Investment Allocation & Contribution Waterfall™
// Dynamic Investment Priority Engine for the Montgomery Family Wealth OS

export interface WaterfallInputs {
  // Payroll / employer
  iuSalary: number; // Lyman IU eligible salary
  employerRate: number; // fallback rate if no actual amount is entered
  /** Actual employer contribution per month from the paystub. Overrides salary x rate when > 0. */
  employerMonthlyActual: number;
  employerHsaMonthly: number;

  // HSA
  hsaCurrentMonthly: number;
  hsaTargetMonthly: number;
  routineMedicalMonthly: number; // $50
  physicianVisitCost: number; // $150 per quarter
  hsaBalance: number;

  // Roth IRA
  rothIraCurrentMonthly: number;
  rothIraAnnualTarget: number;
  rothIraBalance: number;

  // 457(b)
  plan457CurrentMonthly: number;
  plan457AnnualTarget: number;
  plan457Balance: number;

  // TDA
  tdaCurrentMonthly: number;
  tdaAnnualTarget: number;
  tdaBalance: number;

  // Brokerage
  brokerageCurrentMonthly: number;
  brokerageBalance: number;

  // Pre-tax / Roth split for 457(b) + TDA
  preTaxSplit: number; // 0.60

  // Cash-flow redirects
  marketingEducationBudget: number; // 500
  studentLoanPayment: number; // 390
  debtPayoffRedirect: number; // 888

  // Tax + growth assumptions
  marginalTaxRate: number; // 0.22
  expectedReturn: number; // 0.08
  yearsToRetirement: number;

  // Employer-plan balance (Priority 1)
  employerPlanBalance: number;
}

export const DEFAULT_WATERFALL_INPUTS: WaterfallInputs = {
  iuSalary: 95940,
  employerRate: 0.09,
  employerMonthlyActual: 532.05,
  employerHsaMonthly: 0,

  hsaCurrentMonthly: 116.66,
  hsaTargetMonthly: 150,
  routineMedicalMonthly: 50,
  physicianVisitCost: 150,
  hsaBalance: 4200,

  rothIraCurrentMonthly: 0,
  // Realistic near-term targets sized to current cash flow (step up after Sept-2027 debt payoff)
  rothIraAnnualTarget: 2400, // $200/mo
  rothIraBalance: 0,

  // Paystub actuals (monthly pay): IU 457(b) $75 pre-tax + Roth 457(b) $75
  plan457CurrentMonthly: 150,
  plan457AnnualTarget: 3000, // $250/mo
  plan457Balance: 12324,

  // Paystub actuals (monthly pay): Tax Deferred (TDA) $100 pre-tax + Roth TDA $85
  tdaCurrentMonthly: 185,
  tdaAnnualTarget: 3600, // $300/mo
  tdaBalance: 161338,

  brokerageCurrentMonthly: 0,
  brokerageBalance: 3500,

  // Blended pre-tax share of 457(b)+TDA deferrals: (75+100) / 335
  preTaxSplit: 0.52,


  marketingEducationBudget: 500,
  studentLoanPayment: 390,
  debtPayoffRedirect: 888,

  marginalTaxRate: 0.22,
  expectedReturn: 0.08,
  yearsToRetirement: 16,
  employerPlanBalance: 182000,
};

export type PriorityKey = 'employer' | 'hsa' | 'rothIra' | 'plan457' | 'tda' | 'brokerage';

export interface PriorityRow {
  key: PriorityKey;
  priority: number;
  name: string;
  subtitle: string;
  currentMonthly: number;
  targetMonthly: number;
  percentComplete: number;
  remainingAnnual: number;
  taxTreatment: 'Tax-Deferred' | 'Tax-Free' | 'Mixed' | 'Taxable';
  balance: number;
}

export interface HsaAnalysis {
  routineMonthly: number;
  physicianMonthly: number;
  totalMedicalMonthly: number;
  annualMedical: number;
  currentMonthly: number;
  recommendedMonthly: number;
  netGrowthMonthly: number;
  employerMonthly: number;
  annualGrowth: number;
  projectedBalance1yr: number;
}

export function analyzeHsa(i: WaterfallInputs): HsaAnalysis {
  const physicianMonthly = (i.physicianVisitCost * 4) / 12;
  const totalMedicalMonthly = i.routineMedicalMonthly + physicianMonthly;
  const netGrowthMonthly =
    i.hsaTargetMonthly + i.employerHsaMonthly - totalMedicalMonthly;
  const annualGrowth = netGrowthMonthly * 12;
  return {
    routineMonthly: i.routineMedicalMonthly,
    physicianMonthly,
    totalMedicalMonthly,
    annualMedical: totalMedicalMonthly * 12,
    currentMonthly: i.hsaCurrentMonthly,
    recommendedMonthly: i.hsaTargetMonthly,
    netGrowthMonthly,
    employerMonthly: i.employerHsaMonthly,
    annualGrowth,
    projectedBalance1yr: i.hsaBalance * (1 + i.expectedReturn) + annualGrowth,
  };
}

/** Actual paystub amount wins; otherwise fall back to eligible salary x employer rate. */
export function employerContributionMonthly(i: WaterfallInputs) {
  return i.employerMonthlyActual > 0 ? i.employerMonthlyActual : (i.iuSalary * i.employerRate) / 12;
}

export function buildPriorityRows(i: WaterfallInputs): PriorityRow[] {
  const employerMonthly = employerContributionMonthly(i);
  const hsa = analyzeHsa(i);

  const rows: PriorityRow[] = [
    {
      key: 'employer',
      priority: 1,
      name: 'IU Base Retirement Plan',
      subtitle: 'Employer-funded foundation',
      currentMonthly: employerMonthly,
      targetMonthly: employerMonthly,
      percentComplete: 100,
      remainingAnnual: 0,
      taxTreatment: 'Tax-Deferred',
      balance: i.employerPlanBalance,
    },
    {
      key: 'hsa',
      priority: 2,
      name: 'Health Savings Account',
      subtitle: 'Healthcare spending + tax-free growth',
      currentMonthly: i.hsaCurrentMonthly,
      targetMonthly: i.hsaTargetMonthly,
      percentComplete: pct(i.hsaCurrentMonthly, i.hsaTargetMonthly),
      remainingAnnual: Math.max(0, (i.hsaTargetMonthly - i.hsaCurrentMonthly) * 12),
      taxTreatment: 'Tax-Free',
      balance: i.hsaBalance,
    },
    {
      key: 'rothIra',
      priority: 3,
      name: 'Roth IRA',
      subtitle: 'Tax-free retirement income',
      currentMonthly: i.rothIraCurrentMonthly,
      targetMonthly: i.rothIraAnnualTarget / 12,
      percentComplete: pct(i.rothIraCurrentMonthly * 12, i.rothIraAnnualTarget),
      remainingAnnual: Math.max(0, i.rothIraAnnualTarget - i.rothIraCurrentMonthly * 12),
      taxTreatment: 'Tax-Free',
      balance: i.rothIraBalance,
    },
    {
      key: 'plan457',
      priority: 4,
      name: 'IU 457(b)',
      subtitle: `${Math.round(i.preTaxSplit * 100)}% Pre-Tax / ${Math.round(
        (1 - i.preTaxSplit) * 100
      )}% Roth`,
      currentMonthly: i.plan457CurrentMonthly,
      targetMonthly: i.plan457AnnualTarget / 12,
      percentComplete: pct(i.plan457CurrentMonthly * 12, i.plan457AnnualTarget),
      remainingAnnual: Math.max(0, i.plan457AnnualTarget - i.plan457CurrentMonthly * 12),
      taxTreatment: 'Mixed',
      balance: i.plan457Balance,
    },
    {
      key: 'tda',
      priority: 5,
      name: 'IU Tax Deferred Account (TDA)',
      subtitle: `${Math.round(i.preTaxSplit * 100)}% Pre-Tax / ${Math.round(
        (1 - i.preTaxSplit) * 100
      )}% Roth`,
      currentMonthly: i.tdaCurrentMonthly,
      targetMonthly: i.tdaAnnualTarget / 12,
      percentComplete: pct(i.tdaCurrentMonthly * 12, i.tdaAnnualTarget),
      remainingAnnual: Math.max(0, i.tdaAnnualTarget - i.tdaCurrentMonthly * 12),
      taxTreatment: 'Mixed',
      balance: i.tdaBalance,
    },
    {
      key: 'brokerage',
      priority: 6,
      name: 'Taxable Brokerage',
      subtitle: 'Flexible opportunity & bridge account',
      currentMonthly: i.brokerageCurrentMonthly,
      targetMonthly: i.brokerageCurrentMonthly,
      percentComplete: 100,
      remainingAnnual: 0,
      taxTreatment: 'Taxable',
      balance: i.brokerageBalance,
    },
  ];

  void hsa;
  return rows;
}

function pct(current: number, target: number) {
  if (target <= 0) return 100;
  return Math.min(100, Math.max(0, (current / target) * 100));
}

export interface AllocationSlice {
  key: PriorityKey;
  name: string;
  amount: number;
  note: string;
}

/** Allocate a monthly dollar amount down the waterfall, filling gaps in order. */
export function allocateWaterfall(
  amount: number,
  i: WaterfallInputs,
  opts: { skipHsa?: boolean } = {}
): AllocationSlice[] {
  let remaining = amount;
  const out: AllocationSlice[] = [];

  const push = (key: PriorityKey, name: string, gap: number, note: string) => {
    if (remaining <= 0 || gap <= 0) return;
    const take = Math.min(remaining, gap);
    remaining -= take;
    out.push({ key, name, amount: take, note });
  };

  if (!opts.skipHsa) {
    push(
      'hsa',
      'HSA',
      Math.max(0, i.hsaTargetMonthly - i.hsaCurrentMonthly),
      'Fill HSA operating target'
    );
  }
  push(
    'rothIra',
    'Roth IRA',
    Math.max(0, i.rothIraAnnualTarget / 12 - i.rothIraCurrentMonthly),
    'Fund tax-free retirement income'
  );
  push(
    'plan457',
    'IU 457(b)',
    Math.max(0, i.plan457AnnualTarget / 12 - i.plan457CurrentMonthly),
    `${Math.round(i.preTaxSplit * 100)}% pre-tax / ${Math.round((1 - i.preTaxSplit) * 100)}% Roth`
  );
  push(
    'tda',
    'IU TDA',
    Math.max(0, i.tdaAnnualTarget / 12 - i.tdaCurrentMonthly),
    `${Math.round(i.preTaxSplit * 100)}% pre-tax / ${Math.round((1 - i.preTaxSplit) * 100)}% Roth`
  );
  if (remaining > 0) {
    out.push({
      key: 'brokerage',
      name: 'Taxable Brokerage',
      amount: remaining,
      note: 'Flexible / legacy capital',
    });
    remaining = 0;
  }
  return out;
}

export interface RedirectPlan {
  jan2027Available: number;
  jan2027Slices: AllocationSlice[];
  debtPayoffAvailable: number;
  debtPayoffSlices: AllocationSlice[];
}

export function buildRedirectPlan(i: WaterfallInputs): RedirectPlan {
  const jan2027Available = Math.max(
    0,
    i.marketingEducationBudget - i.studentLoanPayment
  );
  const jan2027Slices = allocateWaterfall(jan2027Available, i);

  // After Jan 2027 the HSA is assumed funded to target
  const afterHsa: WaterfallInputs = { ...i, hsaCurrentMonthly: i.hsaTargetMonthly };
  const debtPayoffSlices = allocateWaterfall(i.debtPayoffRedirect, afterHsa, {
    skipHsa: true,
  });

  return {
    jan2027Available,
    jan2027Slices,
    debtPayoffAvailable: i.debtPayoffRedirect,
    debtPayoffSlices,
  };
}

export interface TaxDiversification {
  deferred: number;
  free: number;
  taxable: number;
  total: number;
  deferredPct: number;
  freePct: number;
  taxablePct: number;
  projected: { deferred: number; free: number; taxable: number };
}

export function buildTaxDiversification(i: WaterfallInputs): TaxDiversification {
  const preTax = i.preTaxSplit;
  const deferred =
    i.employerPlanBalance + i.tdaBalance * preTax + i.plan457Balance * preTax;
  const free =
    i.rothIraBalance +
    i.hsaBalance +
    i.tdaBalance * (1 - preTax) +
    i.plan457Balance * (1 - preTax);
  const taxable = i.brokerageBalance;
  const total = Math.max(1, deferred + free + taxable);

  const grow = (bal: number, monthly: number) => {
    const r = i.expectedReturn;
    const n = i.yearsToRetirement;
    const fvBal = bal * Math.pow(1 + r, n);
    const fvFlow = monthly * 12 * ((Math.pow(1 + r, n) - 1) / (r || 0.0001));
    return fvBal + fvFlow;
  };

  const employerMonthly = employerContributionMonthly(i);
  const hsa = analyzeHsa(i);

  const projected = {
    deferred: grow(
      deferred,
      employerMonthly + i.tdaCurrentMonthly * preTax + i.plan457CurrentMonthly * preTax
    ),
    free: grow(
      free,
      Math.max(0, hsa.netGrowthMonthly) +
        i.rothIraCurrentMonthly +
        i.tdaCurrentMonthly * (1 - preTax) +
        i.plan457CurrentMonthly * (1 - preTax)
    ),
    taxable: grow(taxable, i.brokerageCurrentMonthly),
  };

  return {
    deferred,
    free,
    taxable,
    total,
    deferredPct: (deferred / total) * 100,
    freePct: (free / total) * 100,
    taxablePct: (taxable / total) * 100,
    projected,
  };
}

export function nextBestDollar(i: WaterfallInputs): { name: string; reason: string } {
  const slices = allocateWaterfall(1, i);
  const s = slices[0];
  if (!s) return { name: 'Taxable Brokerage', reason: 'All tax-advantaged targets met.' };
  return { name: s.name, reason: s.note };
}

export function annualTaxSavings(monthly: number, i: WaterfallInputs) {
  return monthly * 12 * i.preTaxSplit * i.marginalTaxRate;
}

export function futureValue(monthly: number, i: WaterfallInputs) {
  const r = i.expectedReturn;
  const n = i.yearsToRetirement;
  return monthly * 12 * ((Math.pow(1 + r, n) - 1) / (r || 0.0001));
}
