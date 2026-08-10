/**
 * Montgomery Dynamic Retirement Contribution, Debt Reallocation, PSLF and
 * Compounding Milestone Engine.
 *
 * Data rules enforced here:
 *  - Retirement projections start from the retirement-only balance ($181,504.70).
 *  - Self-directed brokerage money never counts toward retirement milestones.
 *  - The $390 student-loan payment is household cash flow, never a contribution,
 *    until PSLF forgiveness is CONFIRMED. Then it becomes a contribution and the
 *    loan payment stops. Never both at once.
 *  - The $888 debt payoff releases $888, but only $498 is redirected while the
 *    $390 loan obligation is alive.
 *  - The planned $3,000/year wealth contribution is invested systematically as the
 *    $250/month Monthly Wealth Accelerator beginning January 2028. The old $3,000
 *    annual tax-refund lump sum is REMOVED — never count both.
 *  - Actual tax refunds are optional, default $0, and excluded from baseline projections.
 *  - HSA is excluded from the retirement portfolio.
 */

export const RETIREMENT_BASELINE = 181_504.70;
export const SELF_DIRECTED_BASELINE = 2_608.91;
export const TOTAL_PORTFOLIO_BASELINE = RETIREMENT_BASELINE + SELF_DIRECTED_BASELINE;
export const BASELINE_MONTH = '2026-08';

export const DEBT_FREED_MONTHLY = 888;
export const STUDENT_LOAN_MONTHLY = 390;
export const NET_DEBT_REALLOCATION = DEBT_FREED_MONTHLY - STUDENT_LOAN_MONTHLY; // 498
export const PSLF_START_MONTH = '2027-01';
export const PSLF_STARTING_REMAINING = 65;

export const RETURN_SCENARIOS = [6, 7, 8, 9, 10] as const;
export const PLANNING_RETURN = 7;

export const MILESTONE_LADDER = [
  200_000, 250_000, 500_000, 750_000, 1_000_000,
  1_500_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000,
];

export type SourceCategory =
  | 'employee_base'
  | 'employer'
  | 'accelerator'
  | 'debt_reallocation'
  | 'loan_reallocation'
  | 'step_up'
  | 'wealth_accelerator'
  | 'tax_refund'
  | 'raise_reallocation'
  | 'lump_sum'
  | 'obligation';

export type TaxClass = 'pre_tax' | 'roth' | 'employer_pre_tax' | 'taxable' | 'cash_flow';

export interface ContributionSource {
  id: string;
  label: string;
  category: SourceCategory;
  /** Monthly recurring amount. 0 for annual-only sources. */
  monthlyAmount: number;
  /** Annual lump sum amount (tax refund / other lump sums). */
  annualAmount?: number;
  /** Month (1-12) the annual lump is invested. */
  annualMonth?: number;
  startMonth: string; // YYYY-MM
  endMonth?: string | null;
  frequency: 'monthly' | 'annual';
  destination: string;
  taxClass: TaxClass;
  active: boolean;
  notes?: string;
  /** true when this is committed cash flow, not an investment. */
  isObligation?: boolean;
}

export interface EngineConfig {
  startingBalance: number;
  currentAge: number;
  returnPct: number;
  /** Qualifying PSLF payments already made. */
  pslfPaymentsCompleted: number;
  pslfConfirmed: boolean;
  /** Overrides the estimated forgiveness month when confirmed. */
  pslfActualMonth: string | null;
  /** Scenario knob: flat extra monthly contribution starting next month. */
  extraMonthly: number;
  /** Scenario knob: single bad year (negative return) applied in this year. */
  badYear: number | null;
  badYearReturnPct: number;
  refundAmount: number;
  refundMonth: number;
  refundStartYear: number;
  /** Disabled source ids (scenario testing "stop a step-up"). */
  disabledSources: string[];
  projectToAge: number;
}

export const DEFAULT_CONFIG: EngineConfig = {
  startingBalance: RETIREMENT_BASELINE,
  currentAge: 59,
  returnPct: PLANNING_RETURN,
  pslfPaymentsCompleted: 0,
  pslfConfirmed: false,
  pslfActualMonth: null,
  extraMonthly: 0,
  badYear: null,
  badYearReturnPct: -12,
  refundAmount: 0,
  refundMonth: 4,
  refundStartYear: 2028,
  disabledSources: [],
  projectToAge: 85,
};

export function defaultSources(): ContributionSource[] {
  const D = 'IU / TIAA retirement accounts';
  return [
    { id: 'ee-tda', label: 'Tax Deferred Account (TDA)', category: 'employee_base', monthlyAmount: 100, startMonth: BASELINE_MONTH, frequency: 'monthly', destination: 'IU TDA 403(b)', taxClass: 'pre_tax', active: true, notes: 'July 2026 paystub' },
    { id: 'ee-457', label: 'IU 457(b)', category: 'employee_base', monthlyAmount: 75, startMonth: BASELINE_MONTH, frequency: 'monthly', destination: 'IU 457(b)', taxClass: 'pre_tax', active: true, notes: 'July 2026 paystub' },
    { id: 'ee-roth-tda', label: 'Roth TDA', category: 'employee_base', monthlyAmount: 85, startMonth: BASELINE_MONTH, frequency: 'monthly', destination: 'IU TDA 403(b) Roth', taxClass: 'roth', active: true, notes: 'July 2026 paystub' },
    { id: 'ee-roth-457', label: 'Roth 457(b)', category: 'employee_base', monthlyAmount: 75, startMonth: BASELINE_MONTH, frequency: 'monthly', destination: 'IU 457(b) Roth', taxClass: 'roth', active: true, notes: 'July 2026 paystub' },
    { id: 'er-base', label: 'IU Base Retirement Plan (employer)', category: 'employer', monthlyAmount: 532.05, startMonth: BASELINE_MONTH, frequency: 'monthly', destination: 'IU Retirement Plan', taxClass: 'employer_pre_tax', active: true, notes: 'Employer money — never counted as employee contribution' },
    { id: 'accelerator', label: 'First Million Accelerator', category: 'accelerator', monthlyAmount: 208, startMonth: '2027-01', frequency: 'monthly', destination: D, taxClass: 'roth', active: true, notes: 'Retirement accelerator beginning January 2027' },
    { id: 'loan-payment', label: 'Student Loan Payment (IDR)', category: 'obligation', monthlyAmount: STUDENT_LOAN_MONTHLY, startMonth: PSLF_START_MONTH, frequency: 'monthly', destination: 'Loan servicer', taxClass: 'cash_flow', active: true, isObligation: true, notes: 'Committed household cash flow. Not an investment. 65 qualifying payments remaining at start.' },
    { id: 'debt-realloc', label: 'Debt Freedom Reallocation', category: 'debt_reallocation', monthlyAmount: NET_DEBT_REALLOCATION, startMonth: '2027-09', frequency: 'monthly', destination: D, taxClass: 'roth', active: true, notes: '$888 debt payment ends − $390 student loan obligation = $498 redirected' },
    { id: 'wealth-accel', label: 'Monthly Wealth Accelerator', category: 'wealth_accelerator', monthlyAmount: 250, startMonth: '2028-01', frequency: 'monthly', destination: D, taxClass: 'roth', active: true, notes: '$250/month from January 2028 = $3,000/year invested systematically. Replaces the old annual tax-refund lump sum. Designate pretax or Roth destination.' },
    { id: 'refund', label: 'Optional tax refund investment', category: 'tax_refund', monthlyAmount: 0, annualAmount: 0, annualMonth: 4, startMonth: '2028-01', frequency: 'annual', destination: D, taxClass: 'roth', active: false, notes: 'Extra only. Defaults to $0 and is never assumed in baseline projections — enter an actual refund to include it.' },
    { id: 'step-1', label: 'Retirement Step-Up #1', category: 'step_up', monthlyAmount: 500, startMonth: '2028-06', frequency: 'monthly', destination: D, taxClass: 'roth', active: true },
    { id: 'step-2', label: 'Retirement Step-Up #2', category: 'step_up', monthlyAmount: 200, startMonth: '2029-01', frequency: 'monthly', destination: D, taxClass: 'roth', active: true },
    { id: 'step-3', label: 'Retirement Step-Up #3', category: 'step_up', monthlyAmount: 500, startMonth: '2030-01', frequency: 'monthly', destination: D, taxClass: 'roth', active: true },
    { id: 'loan-realloc', label: 'Student Loan Reallocation (after PSLF)', category: 'loan_reallocation', monthlyAmount: STUDENT_LOAN_MONTHLY, startMonth: PSLF_START_MONTH, frequency: 'monthly', destination: D, taxClass: 'roth', active: true, notes: 'Activates only when PSLF forgiveness is CONFIRMED = YES' },
  ];
}

/* ------------------------------- month math ------------------------------- */

export function monthIndex(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return y * 12 + (m - 1);
}
export function indexToMonth(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} ${y}`;
}
export function shortMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTH_NAMES[m - 1].slice(0, 3)} ${y}`;
}
export function addMonths(month: string, n: number): string {
  return indexToMonth(monthIndex(month) + n);
}

/* ---------------------------------- PSLF ---------------------------------- */

export interface PslfStatus {
  startingRemaining: number;
  completed: number;
  remaining: number;
  pctComplete: number;
  monthlyPayment: number;
  estimatedForgivenessMonth: string;
  actualForgivenessMonth: string | null;
  confirmed: boolean;
  /** Month the $390 becomes a retirement contribution (null until confirmed). */
  reallocationMonth: string | null;
  cashFlowReleased: number;
}

export function pslfStatus(cfg: EngineConfig): PslfStatus {
  const completed = Math.max(0, Math.min(PSLF_STARTING_REMAINING, Math.round(cfg.pslfPaymentsCompleted)));
  const remaining = PSLF_STARTING_REMAINING - completed;
  // Payment #1 is January 2027; final qualifying payment lands 64 months later.
  const finalPaymentMonth = addMonths(PSLF_START_MONTH, PSLF_STARTING_REMAINING - 1);
  const estimated = addMonths(finalPaymentMonth, 1);
  const actual = cfg.pslfConfirmed ? (cfg.pslfActualMonth || estimated) : null;
  return {
    startingRemaining: PSLF_STARTING_REMAINING,
    completed,
    remaining,
    pctComplete: (completed / PSLF_STARTING_REMAINING) * 100,
    monthlyPayment: STUDENT_LOAN_MONTHLY,
    estimatedForgivenessMonth: estimated,
    actualForgivenessMonth: actual,
    confirmed: cfg.pslfConfirmed,
    reallocationMonth: actual,
    cashFlowReleased: STUDENT_LOAN_MONTHLY,
  };
}

/* --------------------------- source activity math -------------------------- */

export interface ActiveSource {
  source: ContributionSource;
  monthly: number;
}

/** Monthly recurring investment amount of one source in a given month. */
export function sourceMonthlyAt(
  s: ContributionSource,
  month: string,
  cfg: EngineConfig,
  pslf: PslfStatus,
): number {
  if (!s.active || cfg.disabledSources.includes(s.id)) return 0;
  if (s.frequency !== 'monthly') return 0;
  const idx = monthIndex(month);
  if (idx < monthIndex(s.startMonth)) return 0;
  if (s.endMonth && idx > monthIndex(s.endMonth)) return 0;

  if (s.id === 'loan-payment') {
    // Obligation stops once forgiveness is confirmed and effective.
    if (pslf.reallocationMonth && idx >= monthIndex(pslf.reallocationMonth)) return 0;
    return s.monthlyAmount;
  }
  if (s.id === 'loan-realloc') {
    // Only after CONFIRMED forgiveness — never simultaneous with the payment.
    if (!pslf.reallocationMonth || idx < monthIndex(pslf.reallocationMonth)) return 0;
    return s.monthlyAmount;
  }
  return s.monthlyAmount;
}

/** Investment-only monthly total (obligations excluded). */
export function monthlyInvestmentAt(
  sources: ContributionSource[],
  month: string,
  cfg: EngineConfig,
  pslf: PslfStatus,
): number {
  let total = 0;
  for (const s of sources) {
    if (s.isObligation) continue;
    total += sourceMonthlyAt(s, month, cfg, pslf);
  }
  if (monthIndex(month) > monthIndex(BASELINE_MONTH)) total += cfg.extraMonthly;
  return total;
}

export function annualLumpAt(
  sources: ContributionSource[],
  month: string,
  cfg: EngineConfig,
): number {
  const [y, m] = month.split('-').map(Number);
  let total = 0;
  for (const s of sources) {
    if (s.frequency !== 'annual' || !s.active || cfg.disabledSources.includes(s.id)) continue;
    const amount = s.id === 'refund' ? cfg.refundAmount : (s.annualAmount ?? 0);
    const lumpMonth = s.id === 'refund' ? cfg.refundMonth : (s.annualMonth ?? 4);
    const startYear = s.id === 'refund' ? cfg.refundStartYear : Number(s.startMonth.slice(0, 4));
    if (y >= startYear && m === lumpMonth) total += amount;
  }
  return total;
}

/* ------------------------------- projection -------------------------------- */

export interface MonthPoint {
  month: string;
  balance: number;
  growth: number;
  employee: number;
  employer: number;
  accelerator: number;
  debtRealloc: number;
  loanRealloc: number;
  stepUps: number;
  wealthAccel: number;
  raise: number;
  refund: number;
  contributions: number; // all investment dollars this month (incl. refund lump)
  loanPayment: number; // obligation, not invested
  age: number;
}

export interface YearRow {
  year: number;
  employee: number;
  employer: number;
  debtRealloc: number;
  loanRealloc: number;
  refund: number;
  accelerator: number;
  stepUps: number;
  wealthAccel: number;
  raise: number;
  growth: number;
  endingBalance: number;
}

export interface MilestoneHit {
  target: number;
  reached: boolean;
  month: string | null;
  age: number | null;
  remaining: number;
  pctComplete: number;
  annualContributionsAtHit: number | null;
  expectedAnnualGrowthAtHit: number | null;
}

export interface CrossoverPoint {
  reached: boolean;
  month: string | null;
  age: number | null;
  balance: number | null;
  annualGrowth: number | null;
  annualContributions: number | null;
}

export interface ProjectionResult {
  returnPct: number;
  months: MonthPoint[];
  years: YearRow[];
  milestones: MilestoneHit[];
  personalCrossover: CrossoverPoint;
  totalFundingCrossover: CrossoverPoint;
  endingBalance: number;
  totals: {
    employee: number; employer: number; accelerator: number; debtRealloc: number;
    loanRealloc: number; stepUps: number; wealthAccel: number; raise: number; refund: number; growth: number;
  };
}

const CATEGORY_KEY: Record<SourceCategory, keyof MonthPoint | null> = {
  employee_base: 'employee',
  employer: 'employer',
  accelerator: 'accelerator',
  debt_reallocation: 'debtRealloc',
  loan_reallocation: 'loanRealloc',
  step_up: 'stepUps',
  wealth_accelerator: 'wealthAccel',
  raise_reallocation: 'raise',
  tax_refund: 'refund',
  lump_sum: 'refund',
  obligation: null,
};

export function runProjection(
  sources: ContributionSource[],
  cfg: EngineConfig,
  returnPct = cfg.returnPct,
): ProjectionResult {
  const pslf = pslfStatus(cfg);
  const months: MonthPoint[] = [];
  const totalMonths = Math.max(12, (cfg.projectToAge - cfg.currentAge) * 12);
  let balance = cfg.startingBalance;

  const totals = { employee: 0, employer: 0, accelerator: 0, debtRealloc: 0, loanRealloc: 0, stepUps: 0, wealthAccel: 0, raise: 0, refund: 0, growth: 0 };
  const milestoneHits = new Map<number, MonthPoint>();
  let personal: CrossoverPoint = { reached: false, month: null, age: null, balance: null, annualGrowth: null, annualContributions: null };
  let funding: CrossoverPoint = { reached: false, month: null, age: null, balance: null, annualGrowth: null, annualContributions: null };

  for (let i = 0; i < totalMonths; i++) {
    const month = addMonths(BASELINE_MONTH, i);
    const year = Number(month.slice(0, 4));
    const annualRate = cfg.badYear === year ? cfg.badYearReturnPct : returnPct;
    const monthlyRate = annualRate / 100 / 12;

    const growth = balance * monthlyRate;
    balance += growth;
    totals.growth += growth;

    const point: MonthPoint = {
      month, balance: 0, growth, employee: 0, employer: 0, accelerator: 0,
      debtRealloc: 0, loanRealloc: 0, stepUps: 0, wealthAccel: 0, raise: 0, refund: 0,
      contributions: 0, loanPayment: 0,
      age: cfg.currentAge + Math.floor(i / 12),
    };

    for (const s of sources) {
      const amt = sourceMonthlyAt(s, month, cfg, pslf);
      if (!amt) continue;
      if (s.isObligation) { point.loanPayment += amt; continue; }
      const key = CATEGORY_KEY[s.category];
      if (key) (point[key] as number) += amt;
      point.contributions += amt;
    }
    if (i > 0 && cfg.extraMonthly) {
      point.raise += cfg.extraMonthly;
      point.contributions += cfg.extraMonthly;
    }
    const lump = annualLumpAt(sources, month, cfg);
    if (lump) { point.refund += lump; point.contributions += lump; }

    balance += point.contributions;
    point.balance = balance;

    totals.employee += point.employee;
    totals.employer += point.employer;
    totals.accelerator += point.accelerator;
    totals.debtRealloc += point.debtRealloc;
    totals.loanRealloc += point.loanRealloc;
    totals.stepUps += point.stepUps;
    totals.wealthAccel += point.wealthAccel;
    totals.raise += point.raise;
    totals.refund += point.refund;

    const expectedAnnualGrowth = balance * (returnPct / 100);
    const annualEmployee = (point.employee + point.accelerator + point.debtRealloc + point.loanRealloc + point.stepUps + point.wealthAccel + point.raise) * 12;
    const annualAll = annualEmployee + point.employer * 12;
    if (!personal.reached && expectedAnnualGrowth > annualEmployee && annualEmployee > 0) {
      personal = { reached: true, month, age: point.age, balance, annualGrowth: expectedAnnualGrowth, annualContributions: annualEmployee };
    }
    if (!funding.reached && expectedAnnualGrowth > annualAll && annualAll > 0) {
      funding = { reached: true, month, age: point.age, balance, annualGrowth: expectedAnnualGrowth, annualContributions: annualAll };
    }

    for (const t of MILESTONE_LADDER) {
      if (!milestoneHits.has(t) && balance >= t) milestoneHits.set(t, point);
    }
    months.push(point);
  }

  const yearMap = new Map<number, YearRow>();
  for (const p of months) {
    const y = Number(p.month.slice(0, 4));
    const row = yearMap.get(y) ?? { year: y, employee: 0, employer: 0, debtRealloc: 0, loanRealloc: 0, refund: 0, accelerator: 0, stepUps: 0, wealthAccel: 0, raise: 0, growth: 0, endingBalance: 0 };
    row.employee += p.employee; row.employer += p.employer; row.debtRealloc += p.debtRealloc;
    row.loanRealloc += p.loanRealloc; row.refund += p.refund; row.accelerator += p.accelerator;
    row.stepUps += p.stepUps; row.wealthAccel += p.wealthAccel; row.raise += p.raise; row.growth += p.growth;
    row.endingBalance = p.balance;
    yearMap.set(y, row);
  }

  const milestones: MilestoneHit[] = MILESTONE_LADDER.map((target) => {
    const hit = milestoneHits.get(target);
    const contribAtHit = hit
      ? (hit.employee + hit.employer + hit.accelerator + hit.debtRealloc + hit.loanRealloc + hit.stepUps + hit.wealthAccel + hit.raise) * 12
      : null;
    return {
      target,
      reached: !!hit,
      month: hit?.month ?? null,
      age: hit?.age ?? null,
      remaining: Math.max(0, target - cfg.startingBalance),
      pctComplete: Math.min(100, (cfg.startingBalance / target) * 100),
      annualContributionsAtHit: contribAtHit,
      expectedAnnualGrowthAtHit: hit ? hit.balance * (returnPct / 100) : null,
    };
  });

  return {
    returnPct,
    months,
    years: [...yearMap.values()],
    milestones,
    personalCrossover: personal,
    totalFundingCrossover: funding,
    endingBalance: balance,
    totals,
  };
}

/* --------------------------- ladder + reallocation -------------------------- */

export interface LadderStep {
  label: string;
  amount: number;
  effective: string;
  kind: 'base' | 'add' | 'annual' | 'variable';
  note?: string;
}

export function contributionLadder(sources: ContributionSource[], pslf: PslfStatus, cfg: EngineConfig): LadderStep[] {
  const base = sources
    .filter((s) => (s.category === 'employee_base' || s.category === 'employer') && s.active)
    .reduce((sum, s) => sum + s.monthlyAmount, 0);
  const steps: LadderStep[] = [
    { label: 'Baseline combined retirement funding', amount: base, effective: monthLabel(BASELINE_MONTH), kind: 'base', note: 'Employee $335 + employer $532.05' },
    { label: 'First Million Accelerator', amount: 208, effective: monthLabel('2027-01'), kind: 'add' },
    { label: 'Debt Freedom Reallocation', amount: NET_DEBT_REALLOCATION, effective: monthLabel('2027-09'), kind: 'add', note: '$888 freed − $390 student loan obligation' },
    { label: 'Monthly Wealth Accelerator', amount: 250, effective: monthLabel('2028-01'), kind: 'add', note: '$250/month = $3,000/year invested systematically (replaces the annual tax-refund lump sum)' },
    { label: 'Retirement Step-Up #1', amount: 500, effective: monthLabel('2028-06'), kind: 'add' },
    { label: 'Retirement Step-Up #2', amount: 200, effective: monthLabel('2029-01'), kind: 'add' },
    { label: 'Retirement Step-Up #3', amount: 500, effective: monthLabel('2030-01'), kind: 'add' },
    {
      label: 'Student Loan Reallocation after PSLF',
      amount: STUDENT_LOAN_MONTHLY,
      effective: pslf.confirmed && pslf.reallocationMonth
        ? monthLabel(pslf.reallocationMonth)
        : `Pending — est. ${monthLabel(pslf.estimatedForgivenessMonth)}`,
      kind: 'add',
      note: pslf.confirmed ? 'Forgiveness confirmed' : 'Requires PSLF Forgiveness Confirmed = YES',
    },
    { label: 'Future pay raise reallocation', amount: cfg.extraMonthly, effective: 'When confirmed', kind: 'variable', note: 'Only counted when you confirm the amount' },
    { label: 'Optional tax refund investment', amount: cfg.refundAmount, effective: cfg.refundAmount > 0 ? `Each ${MONTH_NAMES[cfg.refundMonth - 1]} from ${cfg.refundStartYear}` : 'Not assumed — $0 by default', kind: 'annual', note: 'Extra only. Enter an actual refund to include it; never counted alongside the $250/month accelerator as the same money.' },
  ];
  return steps;
}

export interface ReallocationRow {
  obligation: string;
  previousMonthly: number;
  endsOn: string;
  released: number;
  destinations: { label: string; amount: number }[];
  effective: string;
  status: 'scheduled' | 'pending_confirmation' | 'active';
}

export function reallocationPlan(pslf: PslfStatus): ReallocationRow[] {
  return [
    {
      obligation: 'Consumer / installment debt payment',
      previousMonthly: DEBT_FREED_MONTHLY,
      endsOn: monthLabel('2027-08'),
      released: DEBT_FREED_MONTHLY,
      destinations: [
        { label: 'Student loan obligation', amount: STUDENT_LOAN_MONTHLY },
        { label: 'Retirement investments', amount: NET_DEBT_REALLOCATION },
      ],
      effective: monthLabel('2027-09'),
      status: 'scheduled',
    },
    {
      obligation: 'Student loan payment (PSLF)',
      previousMonthly: STUDENT_LOAN_MONTHLY,
      endsOn: pslf.confirmed && pslf.actualForgivenessMonth
        ? monthLabel(pslf.actualForgivenessMonth)
        : `After forgiveness — est. ${monthLabel(pslf.estimatedForgivenessMonth)}`,
      released: STUDENT_LOAN_MONTHLY,
      destinations: [{ label: 'Retirement investments', amount: STUDENT_LOAN_MONTHLY }],
      effective: pslf.reallocationMonth ? monthLabel(pslf.reallocationMonth) : 'Requires confirmed forgiveness',
      status: pslf.confirmed ? 'active' : 'pending_confirmation',
    },
  ];
}

/** §15 timeline of scheduled changes. */
export function contributionTimeline(pslf: PslfStatus, cfg: EngineConfig) {
  return [
    { when: 'August 2026', headline: 'Baseline combined retirement funding', detail: '$867.05/month — employee $335 + employer $532.05' },
    { when: 'January 2027', headline: 'First Million Accelerator +$208', detail: 'Student loan payment of $390 begins as household obligation (not an investment)' },
    { when: 'September 2027', headline: 'Debt payment ends — net +$498 to retirement', detail: '$888 freed, $390 continues funding the student loan' },
    { when: 'January 2028', headline: 'Monthly Wealth Accelerator +$250/month', detail: '$3,000/year invested systematically — replaces the old annual tax-refund lump sum' },
    { when: 'June 2028', headline: 'Retirement Step-Up #1 +$500/month', detail: 'Cash-flow driven increase' },
    { when: 'January 2029', headline: 'Retirement Step-Up #2 +$200/month', detail: 'Cash-flow driven increase' },
    { when: 'January 2030', headline: 'Retirement Step-Up #3 +$500/month', detail: 'Cash-flow driven increase' },
    {
      when: pslf.confirmed && pslf.reallocationMonth ? monthLabel(pslf.reallocationMonth) : `Est. ${monthLabel(pslf.estimatedForgivenessMonth)}`,
      headline: 'PSLF forgiveness confirmed → +$390/month to retirement',
      detail: pslf.confirmed ? 'Reallocation active' : 'Locked until PSLF Forgiveness Confirmed = YES',
    },
  ];
}

export function illustrativeGrowthAt(balance: number) {
  return RETURN_SCENARIOS.map((r) => ({ returnPct: r, growth: balance * (r / 100) }));
}
