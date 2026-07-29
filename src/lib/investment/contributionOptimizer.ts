// Intelligent Contribution Optimizer™
// Cash-flow based retirement funding strategy for the Montgomery Household.
// Recommends affordable, incremental contribution increases instead of IRS maximums.

export interface PayrollBaseline {
  netPayMonthly: number;
  hsaMonthly: number;
  tradTdaMonthly: number;
  trad457Monthly: number;
  rothTdaMonthly: number;
  roth457Monthly: number;
  rothIraMonthly: number;
  employerMonthly: number;

  // Household cash-flow context
  livingExpensesMonthly: number;
  debtPaymentsMonthly: number;

  // Planned cash-flow events
  marketingBudget: number; // 500
  studentLoanPayment: number; // 390
  debtPayoffRedirect: number; // 888

  // Growth assumptions
  expectedReturn: number; // 0.08
  yearsToAge75: number;
}

export const DEFAULT_PAYROLL_BASELINE: PayrollBaseline = {
  netPayMonthly: 4464.91,
  hsaMonthly: 116.66,
  tradTdaMonthly: 100,
  trad457Monthly: 75,
  rothTdaMonthly: 85,
  roth457Monthly: 75,
  rothIraMonthly: 0,
  employerMonthly: 532.05,

  livingExpensesMonthly: 2800,
  debtPaymentsMonthly: 888,

  marketingBudget: 500,
  studentLoanPayment: 390,
  debtPayoffRedirect: 888,

  expectedReturn: 0.08,
  yearsToAge75: 16,
};

export const TARGET_MIN_PCT = 0.10;
export const TARGET_MAX_PCT = 0.20;

export function employeeContributionTotal(p: PayrollBaseline) {
  return (
    p.hsaMonthly +
    p.tradTdaMonthly +
    p.trad457Monthly +
    p.rothTdaMonthly +
    p.roth457Monthly +
    p.rothIraMonthly
  );
}

export interface ContributionCap {
  current: number;
  currentPct: number;
  recommendedPct: number;
  recommendedMonthly: number;
  maxComfortable: number;
  cashRemaining: number;
  withinRange: boolean;
  flag: string | null;
}

export function buildContributionCap(p: PayrollBaseline): ContributionCap {
  const current = employeeContributionTotal(p);
  const currentPct = p.netPayMonthly > 0 ? current / p.netPayMonthly : 0;
  const maxComfortable = p.netPayMonthly * TARGET_MAX_PCT;
  // Recommend a gentle step toward the middle of the range, capped by the max.
  const recommendedPct = Math.min(
    TARGET_MAX_PCT,
    Math.max(TARGET_MIN_PCT, currentPct + 0.02)
  );
  const recommendedMonthly = p.netPayMonthly * recommendedPct;
  const cashRemaining =
    p.netPayMonthly - p.livingExpensesMonthly - p.debtPaymentsMonthly - p.rothIraMonthly;

  const withinRange = currentPct >= TARGET_MIN_PCT && currentPct <= TARGET_MAX_PCT;
  let flag: string | null = null;
  if (currentPct > TARGET_MAX_PCT) {
    flag = 'Contributions exceed 20% of net pay. Hold elections steady and let raises close the gap.';
  } else if (currentPct < TARGET_MIN_PCT) {
    flag = 'Contributions are below the 10% floor. Add small increases as cash flow allows.';
  }

  return {
    current,
    currentPct,
    recommendedPct,
    recommendedMonthly,
    maxComfortable,
    cashRemaining,
    withinRange,
    flag,
  };
}

export type FlexibilityBand = 'comfortable' | 'moderate' | 'aggressive';

export interface AffordabilityMeter {
  netPay: number;
  contributions: number;
  livingExpenses: number;
  debtPayments: number;
  disposable: number;
  disposablePct: number;
  score: number; // 0-100
  band: FlexibilityBand;
  bandLabel: string;
}

export function buildAffordabilityMeter(p: PayrollBaseline): AffordabilityMeter {
  const contributions = employeeContributionTotal(p);
  // Payroll deductions already reduce net pay; the Roth IRA is funded post-tax.
  const disposable =
    p.netPayMonthly - p.livingExpensesMonthly - p.debtPaymentsMonthly - p.rothIraMonthly;
  const disposablePct = p.netPayMonthly > 0 ? disposable / p.netPayMonthly : 0;
  const score = Math.max(0, Math.min(100, Math.round(disposablePct * 400)));

  let band: FlexibilityBand = 'aggressive';
  if (score >= 60) band = 'comfortable';
  else if (score >= 35) band = 'moderate';

  const bandLabel =
    band === 'comfortable' ? 'Comfortable' : band === 'moderate' ? 'Moderate' : 'Aggressive';

  return {
    netPay: p.netPayMonthly,
    contributions,
    livingExpenses: p.livingExpensesMonthly,
    debtPayments: p.debtPaymentsMonthly,
    disposable,
    disposablePct,
    score,
    band,
    bandLabel,
  };
}

export interface PhaseAllocation {
  account: string;
  amount: number;
}

export interface PhasePlan {
  id: 'phase1' | 'phase2' | 'phase3';
  title: string;
  window: string;
  available: number;
  summary: string;
  lines: PhaseAllocation[];
  note?: string;
}

export function buildPhases(p: PayrollBaseline): PhasePlan[] {
  const phase2Available = Math.max(0, p.marketingBudget - p.studentLoanPayment);
  const hsaBump = Math.min(phase2Available, 33.34);
  const rothBump = Math.max(0, phase2Available - hsaBump);

  return [
    {
      id: 'phase1',
      title: 'Phase 1 — Maintain Current Elections',
      window: 'Current through December 2026',
      available: 0,
      summary:
        'No major contribution increases are recommended until planned cash-flow improvements occur.',
      lines: [
        { account: 'HSA', amount: p.hsaMonthly },
        { account: 'Traditional TDA', amount: p.tradTdaMonthly },
        { account: 'Traditional 457(b)', amount: p.trad457Monthly },
        { account: 'Roth TDA', amount: p.rothTdaMonthly },
        { account: 'Roth 457(b)', amount: p.roth457Monthly },
      ],
    },
    {
      id: 'phase2',
      title: 'Phase 2 — First Affordable Increase',
      window: 'Beginning January 2027',
      available: phase2Available,
      summary: `Marketing budget $${p.marketingBudget.toLocaleString()} less student loan payment $${p.studentLoanPayment.toLocaleString()} frees $${phase2Available.toFixed(
        0
      )}/month.`,
      lines: [
        { account: 'HSA increase', amount: hsaBump },
        { account: 'Roth IRA increase', amount: rothBump },
      ],
      note: 'Only one or two accounts are increased in this phase — no simultaneous across-the-board increases.',
    },
    {
      id: 'phase3',
      title: 'Phase 3 — Staged Debt-Payoff Redeployment',
      window: 'After consumer debt payoff',
      available: p.debtPayoffRedirect,
      summary: `$${p.debtPayoffRedirect.toLocaleString()}/month of freed debt payments is deployed in stages — each stage begins only after the previous one reaches its target.`,
      lines: buildStages(p).map((s) => ({ account: s.name, amount: s.amount })),
    },
  ];
}

export interface Stage {
  stage: number;
  name: string;
  amount: number;
  target: number;
  description: string;
}

/** Stage targets sized to the household budget, not IRS maximums. */
export function buildStages(p: PayrollBaseline): Stage[] {
  const phase2Available = Math.max(0, p.marketingBudget - p.studentLoanPayment);
  const rothAfterPhase2 = p.rothIraMonthly + Math.max(0, phase2Available - 33.34);

  const targets = [
    { name: 'Roth IRA', target: 583.33, current: rothAfterPhase2, desc: 'Fill tax-free retirement income first.' },
    { name: 'IU 457(b)', target: 400, current: p.trad457Monthly + p.roth457Monthly, desc: 'Add penalty-free early-access capacity.' },
    { name: 'IU TDA', target: 400, current: p.tradTdaMonthly + p.rothTdaMonthly, desc: 'Increase pre-tax deferral to lower taxable income.' },
  ];

  let remaining = p.debtPayoffRedirect;
  const stages: Stage[] = [];

  targets.forEach((t, idx) => {
    const gap = Math.max(0, t.target - t.current);
    const amount = Math.min(remaining, gap);
    remaining -= amount;
    stages.push({
      stage: idx + 1,
      name: t.name,
      amount,
      target: t.target,
      description: t.desc,
    });
  });

  stages.push({
    stage: 4,
    name: 'Taxable Brokerage',
    amount: Math.max(0, remaining),
    target: Math.max(0, remaining),
    description: 'Flexible bridge and legacy capital once tax-advantaged stages are filled.',
  });

  return stages;
}

export interface SmartRecommendation {
  account: string;
  increase: number;
  newMonthly: number;
  rationale: string;
  impactAtAge75: number;
  affordable: boolean;
}

export function futureValueAt75(monthly: number, p: PayrollBaseline) {
  const r = p.expectedReturn;
  const n = p.yearsToAge75;
  if (r <= 0) return monthly * 12 * n;
  return monthly * 12 * ((Math.pow(1 + r, n) - 1) / r);
}

/** Next affordable increases — small steps, never IRS maximums. */
export function buildSmartRecommendations(p: PayrollBaseline): SmartRecommendation[] {
  const cap = buildContributionCap(p);
  const meter = buildAffordabilityMeter(p);
  const headroom = Math.max(0, Math.min(cap.maxComfortable - cap.current, meter.disposable));

  const candidates = [
    {
      account: 'HSA',
      increase: 25,
      current: p.hsaMonthly,
      rationale: 'Triple tax advantage — covers medical costs now, compounds tax-free later.',
    },
    {
      account: 'Roth IRA',
      increase: 50,
      current: p.rothIraMonthly,
      rationale: 'Tax-free retirement income; funded outside payroll for flexibility.',
    },
    {
      account: 'IU 457(b)',
      increase: 25,
      current: p.trad457Monthly + p.roth457Monthly,
      rationale: 'Penalty-free access after separation from service.',
    },
    {
      account: 'IU TDA',
      increase: 25,
      current: p.tradTdaMonthly + p.rothTdaMonthly,
      rationale: 'Lowers current taxable income at the 22% marginal rate.',
    },
  ];

  let budget = headroom;
  return candidates.map((c) => {
    const affordable = budget >= c.increase;
    if (affordable) budget -= c.increase;
    return {
      account: c.account,
      increase: c.increase,
      newMonthly: c.current + c.increase,
      rationale: c.rationale,
      impactAtAge75: futureValueAt75(c.increase, p),
      affordable,
    };
  });
}

export interface WaterfallStep {
  label: string;
  detail: string;
  amount: number | null;
}

export function buildCashFlowWaterfall(p: PayrollBaseline): WaterfallStep[] {
  const phase2 = Math.max(0, p.marketingBudget - p.studentLoanPayment);
  return [
    {
      label: 'Current Payroll',
      detail: `${employeeContributionTotal(p).toFixed(2)}/mo employee + ${p.employerMonthly.toFixed(2)}/mo employer`,
      amount: null,
    },
    { label: 'January 2027', detail: 'Marketing budget shift less student loan payment', amount: phase2 },
    { label: 'Debt Payoff', detail: 'Consumer debt eliminated', amount: p.debtPayoffRedirect },
    { label: 'Future Raises', detail: '3% annually, half redirected to investing', amount: null },
    { label: 'Future Bonuses', detail: 'Optional lump-sum deployment', amount: null },
    { label: 'Investment Allocation Engine', detail: 'Staged into HSA → Roth IRA → 457(b) → TDA → brokerage', amount: null },
  ];
}
