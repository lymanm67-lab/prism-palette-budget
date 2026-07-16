// Timeline generator: builds month-by-month milestones + weekly tasks
// from today → target close date. Compresses/expands the 13-phase sequence
// proportionally to fit the user's horizon (min 3, max 24 months).

export interface SeedMilestone {
  month_index: number;
  month_label: string;
  title: string;
  description: string;
  tasks: { week_index: number; title: string; priority: 'high' | 'medium' | 'low'; estimated_hours: number }[];
}

const PHASES: Omit<SeedMilestone, 'month_index' | 'month_label'>[] = [
  {
    title: 'Financial Assessment',
    description: 'Baseline your income, debts, savings, and credit. Establish honest numbers before making commitments.',
    tasks: [
      { week_index: 1, title: 'Pull all three credit reports (annualcreditreport.com)', priority: 'high', estimated_hours: 1 },
      { week_index: 1, title: 'List every debt: balance, rate, minimum payment', priority: 'high', estimated_hours: 1.5 },
      { week_index: 2, title: 'Calculate current DTI (obligations / gross income)', priority: 'high', estimated_hours: 1 },
      { week_index: 2, title: 'Document last 24 months of income', priority: 'medium', estimated_hours: 2 },
      { week_index: 3, title: 'Inventory all liquid savings and investment accounts', priority: 'medium', estimated_hours: 1 },
      { week_index: 4, title: 'Set target monthly payment ceiling (personal rule)', priority: 'high', estimated_hours: 0.5 },
    ],
  },
  {
    title: 'Debt Reduction',
    description: 'Reduce revolving balances and pay off small debts. Every $100/mo in eliminated debt raises purchasing power by ~$18K.',
    tasks: [
      { week_index: 1, title: 'Pick strategy: snowball (small first) or avalanche (highest rate first)', priority: 'high', estimated_hours: 0.5 },
      { week_index: 2, title: 'Apply extra $ to target debt; keep minimums on others', priority: 'high', estimated_hours: 0.25 },
      { week_index: 3, title: 'Pay revolving balances below 30% utilization', priority: 'high', estimated_hours: 1 },
      { week_index: 4, title: 'Recalculate DTI; log this month\'s progress', priority: 'medium', estimated_hours: 0.5 },
    ],
  },
  {
    title: 'Credit Optimization',
    description: 'Dispute errors, correct reporting, and let paid-down balances update. Score changes take 30-60 days to appear.',
    tasks: [
      { week_index: 1, title: 'File Metro2 disputes for any inaccurate items', priority: 'high', estimated_hours: 2 },
      { week_index: 2, title: 'Ask for credit limit increases on existing cards (soft pull only)', priority: 'medium', estimated_hours: 1 },
      { week_index: 3, title: 'Do NOT open new credit lines', priority: 'high', estimated_hours: 0 },
      { week_index: 4, title: 'Re-check scores across all bureaus', priority: 'medium', estimated_hours: 0.5 },
    ],
  },
  {
    title: 'Documentation',
    description: 'Assemble the full lender packet. Missing docs are the #1 cause of preapproval delays.',
    tasks: [
      { week_index: 1, title: 'Gather 2 years of tax returns (federal + state)', priority: 'high', estimated_hours: 2 },
      { week_index: 2, title: 'Collect 60 days of pay stubs', priority: 'high', estimated_hours: 1 },
      { week_index: 3, title: 'Save 2 months of bank statements (all accounts)', priority: 'high', estimated_hours: 1 },
      { week_index: 4, title: 'Photograph driver license, get employer verification letter', priority: 'medium', estimated_hours: 1 },
    ],
  },
  {
    title: 'Savings Acceleration',
    description: 'Push down payment + closing costs + 6-month emergency reserve. Never drain the emergency fund for the down payment.',
    tasks: [
      { week_index: 1, title: 'Auto-transfer % of every paycheck to down-payment savings', priority: 'high', estimated_hours: 0.5 },
      { week_index: 2, title: 'Move down-payment funds to HYSA (4%+ APY)', priority: 'medium', estimated_hours: 1 },
      { week_index: 3, title: 'Verify 6 months of expenses in emergency fund', priority: 'high', estimated_hours: 0.5 },
      { week_index: 4, title: 'Log this month\'s savings progress vs. target', priority: 'medium', estimated_hours: 0.5 },
    ],
  },
  {
    title: 'Settlement Completion',
    description: 'Close out any settled debts, get letters of satisfaction. Lenders will not approve while collections are open.',
    tasks: [
      { week_index: 1, title: 'Request paid-in-full letters for every settled account', priority: 'high', estimated_hours: 2 },
      { week_index: 2, title: 'Confirm collections show $0 balance on credit report', priority: 'high', estimated_hours: 1 },
      { week_index: 3, title: 'Save all settlement letters to document vault', priority: 'medium', estimated_hours: 1 },
      { week_index: 4, title: 'Dispute any settled item still showing balance', priority: 'high', estimated_hours: 1 },
    ],
  },
  {
    title: 'Credit Verification',
    description: 'Final credit check before shopping lenders. All updates should now be reflected across all three bureaus.',
    tasks: [
      { week_index: 1, title: 'Pull fresh reports from all three bureaus', priority: 'high', estimated_hours: 1 },
      { week_index: 2, title: 'Confirm utilization under 30% on every card', priority: 'high', estimated_hours: 0.5 },
      { week_index: 3, title: 'Get mid-score estimate for mortgage tier (740+ ideal)', priority: 'medium', estimated_hours: 0.5 },
      { week_index: 4, title: 'Freeze credit at Experian, Equifax, TransUnion until preapproval', priority: 'medium', estimated_hours: 1 },
    ],
  },
  {
    title: 'Mortgage Planning',
    description: 'Decide loan type, learn PITI, understand PMI thresholds, and confirm max home price fits your monthly-payment rule.',
    tasks: [
      { week_index: 1, title: 'Pick loan type: Conv, FHA, VA, USDA (see Loan Type Comparator)', priority: 'high', estimated_hours: 1 },
      { week_index: 2, title: 'Calculate max home price at your payment ceiling', priority: 'high', estimated_hours: 1 },
      { week_index: 3, title: 'Understand PMI removal threshold (20% equity)', priority: 'medium', estimated_hours: 0.5 },
      { week_index: 4, title: 'Confirm state DPA program eligibility', priority: 'medium', estimated_hours: 1 },
    ],
  },
  {
    title: 'Lender Shopping',
    description: 'Rate-shop at least 3-5 lenders within a 14-day window (counts as one credit inquiry). Compare Loan Estimates, not just rates.',
    tasks: [
      { week_index: 1, title: 'Request quotes from 3 conventional lenders', priority: 'high', estimated_hours: 3 },
      { week_index: 2, title: 'Request quotes from 2 credit unions', priority: 'medium', estimated_hours: 2 },
      { week_index: 3, title: 'Compare Loan Estimates line by line', priority: 'high', estimated_hours: 2 },
      { week_index: 4, title: 'Confirm all quotes within your payment rule', priority: 'high', estimated_hours: 1 },
    ],
  },
  {
    title: 'Preapproval',
    description: 'Get a written preapproval letter — not prequalification. Confirms your buying power to sellers.',
    tasks: [
      { week_index: 1, title: 'Submit full application to top 1-2 lenders', priority: 'high', estimated_hours: 3 },
      { week_index: 2, title: 'Provide any additional docs requested', priority: 'high', estimated_hours: 2 },
      { week_index: 3, title: 'Receive written preapproval letter', priority: 'high', estimated_hours: 0.5 },
      { week_index: 4, title: 'Do NOT make large purchases or job changes', priority: 'high', estimated_hours: 0 },
    ],
  },
  {
    title: 'Home Search',
    description: 'Tour homes, evaluate against your rules, log the properties you visit. Never fall in love before running the numbers.',
    tasks: [
      { week_index: 1, title: 'Interview 2-3 buyer\'s agents; pick one', priority: 'high', estimated_hours: 2 },
      { week_index: 2, title: 'Tour 5-10 homes; complete Property Comparison worksheet for each', priority: 'high', estimated_hours: 8 },
      { week_index: 3, title: 'Reject any home that breaks your payment/HOA rule', priority: 'high', estimated_hours: 1 },
      { week_index: 4, title: 'Shortlist top 3 candidates', priority: 'medium', estimated_hours: 2 },
    ],
  },
  {
    title: 'Offer & Due Diligence',
    description: 'Write offer, negotiate, get inspection and appraisal. This is where 30% of deals fall apart — protect yourself with contingencies.',
    tasks: [
      { week_index: 1, title: 'Write offer with inspection + appraisal + financing contingencies', priority: 'high', estimated_hours: 3 },
      { week_index: 2, title: 'Schedule and attend home inspection', priority: 'high', estimated_hours: 4 },
      { week_index: 3, title: 'Review appraisal; renegotiate if low', priority: 'high', estimated_hours: 2 },
      { week_index: 4, title: 'Lock rate; final underwriting', priority: 'high', estimated_hours: 1 },
    ],
  },
  {
    title: 'Closing',
    description: 'Final walkthrough, Closing Disclosure review, wire funds, sign, get keys. Every number on the CD should match the last Loan Estimate.',
    tasks: [
      { week_index: 1, title: 'Receive Closing Disclosure 3 days before closing', priority: 'high', estimated_hours: 2 },
      { week_index: 2, title: 'Compare CD to Loan Estimate line by line', priority: 'high', estimated_hours: 1 },
      { week_index: 3, title: 'Final walkthrough (24-48 hours before closing)', priority: 'high', estimated_hours: 2 },
      { week_index: 4, title: 'Wire down payment + closing costs; sign; get keys', priority: 'high', estimated_hours: 4 },
    ],
  },
];

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(startDate: Date, offset: number): string {
  const d = new Date(startDate);
  d.setMonth(d.getMonth() + offset);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

/**
 * Compresses or expands the 13-phase sequence to fit horizon months.
 * Returns exactly `horizon` milestones. Closing is always the last month.
 */
export function generateTimeline(startDate: Date, targetCloseDate: Date): SeedMilestone[] {
  const horizon = Math.max(3, Math.min(24, monthsBetween(startDate, targetCloseDate) + 1));
  const phaseCount = PHASES.length; // 13

  const milestones: SeedMilestone[] = [];

  if (horizon >= phaseCount) {
    // Expanded: repeat mid phases (Savings, Debt Reduction) to fill extra months
    const filler = ['Savings Acceleration', 'Debt Reduction', 'Credit Optimization'];
    for (let i = 0; i < horizon; i++) {
      const isLast = i === horizon - 1;
      if (isLast) {
        milestones.push({ ...PHASES[phaseCount - 1], month_index: i, month_label: monthLabel(startDate, i) });
      } else if (i < phaseCount - 1) {
        milestones.push({ ...PHASES[i], month_index: i, month_label: monthLabel(startDate, i) });
      } else {
        // Extra months — repeat a filler phase
        const fillerTitle = filler[(i - phaseCount + 1) % filler.length];
        const phase = PHASES.find((p) => p.title === fillerTitle)!;
        milestones.push({ ...phase, title: `${phase.title} (Extended)`, month_index: i, month_label: monthLabel(startDate, i) });
      }
    }
  } else {
    // Compressed: pick evenly-spaced phases, always ending with Closing
    const step = (phaseCount - 1) / (horizon - 1);
    for (let i = 0; i < horizon; i++) {
      const phaseIdx = i === horizon - 1 ? phaseCount - 1 : Math.round(i * step);
      milestones.push({ ...PHASES[phaseIdx], month_index: i, month_label: monthLabel(startDate, i) });
    }
  }

  return milestones;
}

export function defaultRules() {
  return [
    { rule_type: 'max_payment', label: 'Maximum monthly housing payment', value_numeric: 1350, value_text: null, is_active: true },
    { rule_type: 'min_emergency_fund', label: 'Maintain minimum emergency fund (months)', value_numeric: 6, value_text: null, is_active: true },
    { rule_type: 'no_new_debt', label: 'No new debt before closing', value_numeric: null, value_text: 'enforced', is_active: true },
    { rule_type: 'max_hoa', label: 'Reject homes with HOA fees over', value_numeric: 300, value_text: null, is_active: true },
    { rule_type: 'min_retirement_contribution', label: 'Never reduce retirement contributions below (%)', value_numeric: 10, value_text: null, is_active: true },
    { rule_type: 'custom', label: 'Never buy based solely on lender approval', value_numeric: null, value_text: 'enforced', is_active: true },
  ];
}

export function defaultRisks() {
  return [
    { title: 'Interest rate increase before lock', probability: 'medium', impact: 'high', mitigation: 'Lock rate once under contract; consider float-down option', owner: 'Buyer', status: 'open' },
    { title: 'Credit score drop from new inquiry', probability: 'low', impact: 'high', mitigation: 'No new credit lines until after closing', owner: 'Buyer', status: 'open' },
    { title: 'Employment change during underwriting', probability: 'low', impact: 'high', mitigation: 'Avoid job changes 90 days before closing', owner: 'Buyer', status: 'open' },
    { title: 'Large discretionary purchase pre-close', probability: 'medium', impact: 'high', mitigation: 'Postpone furniture/car buys until after keys', owner: 'Buyer', status: 'open' },
    { title: 'Unexpected medical expense', probability: 'low', impact: 'medium', mitigation: 'Maintain full emergency fund; do not tap savings', owner: 'Buyer', status: 'open' },
    { title: 'Low appraisal', probability: 'medium', impact: 'high', mitigation: 'Have appraisal contingency; be ready to renegotiate or walk', owner: 'Buyer', status: 'open' },
    { title: 'Inspection reveals major issues', probability: 'high', impact: 'medium', mitigation: 'Inspection contingency + negotiate credits/repairs', owner: 'Buyer', status: 'open' },
    { title: 'Homeowner insurance premium spike', probability: 'medium', impact: 'medium', mitigation: 'Get quotes before offer; factor into affordability', owner: 'Buyer', status: 'open' },
    { title: 'Property tax reassessment after purchase', probability: 'high', impact: 'medium', mitigation: 'Budget for new assessed value, not seller\'s assessment', owner: 'Buyer', status: 'open' },
  ];
}

export function defaultDocuments() {
  return [
    { doc_type: 'driver_license', label: 'Driver\'s License / State ID' },
    { doc_type: 'pay_stubs', label: 'Pay Stubs (60 days)' },
    { doc_type: 'tax_returns', label: 'Federal Tax Returns (2 years)' },
    { doc_type: 'bank_statements', label: 'Bank Statements (2 months, all accounts)' },
    { doc_type: 'investment_statements', label: 'Investment Account Statements' },
    { doc_type: 'retirement_statements', label: 'Retirement Account Statements' },
    { doc_type: 'settlement_letters', label: 'Debt Settlement / Paid-in-Full Letters' },
    { doc_type: 'student_loan_statements', label: 'Student Loan Statements' },
    { doc_type: 'employment_verification', label: 'Employment Verification Letter' },
    { doc_type: 'insurance_quotes', label: 'Homeowners Insurance Quotes' },
    { doc_type: 'preapproval_letter', label: 'Mortgage Preapproval Letter' },
    { doc_type: 'closing_disclosure', label: 'Closing Disclosure' },
  ];
}
