// Foundation Readiness & Financial Sustainability planning engine.
// Planning tool only — not legal, tax, or investment advice.

export type ReadinessCategory = 'mission' | 'community' | 'governance' | 'financial' | 'legal';

export interface ReadinessItem {
  key: string;
  label: string;
}

export interface ReadinessGroup {
  category: ReadinessCategory;
  title: string;
  /** Which of the four scored buckets this group rolls into. */
  bucket: 'mission' | 'governance' | 'financial' | 'operational';
  items: ReadinessItem[];
}

export const READINESS_GROUPS: ReadinessGroup[] = [
  {
    category: 'mission',
    title: 'Mission Readiness',
    bucket: 'mission',
    items: [
      { key: 'mission_statement', label: 'Mission statement approved' },
      { key: 'vision_statement', label: 'Vision statement approved' },
      { key: 'core_values', label: 'Core values defined' },
      { key: 'program_pillars', label: 'Program pillars established' },
      { key: 'five_year_plan', label: 'Five-year strategic plan completed' },
      { key: 'impact_metrics', label: 'Impact metrics created' },
      { key: 'success_measures', label: 'Success measures defined' },
    ],
  },
  {
    category: 'community',
    title: 'Community Readiness',
    bucket: 'operational',
    items: [
      { key: 'needs_assessment', label: 'Community needs assessment completed' },
      { key: 'strategic_partners', label: 'Strategic partners identified' },
      { key: 'pilot_programs', label: 'Pilot programs designed' },
      { key: 'volunteer_network', label: 'Volunteer network established' },
      { key: 'advisory_input', label: 'Community advisory input obtained' },
    ],
  },
  {
    category: 'governance',
    title: 'Governance Readiness',
    bucket: 'governance',
    items: [
      { key: 'board_members', label: 'Board members identified' },
      { key: 'independent_directors', label: 'Independent directors selected' },
      { key: 'committees', label: 'Committees created' },
      { key: 'coi_policy', label: 'Conflict of interest policy approved' },
      { key: 'board_succession', label: 'Board succession plan created' },
      { key: 'officer_roles', label: 'Officer roles assigned' },
    ],
  },
  {
    category: 'financial',
    title: 'Financial Readiness',
    bucket: 'financial',
    items: [
      { key: 'three_year_budget', label: 'Three-year budget completed' },
      { key: 'five_year_budget', label: 'Five-year budget completed' },
      { key: 'funding_strategy', label: 'Funding strategy approved' },
      { key: 'investment_policy', label: 'Investment policy drafted' },
      { key: 'accounting_system', label: 'Accounting system selected' },
      { key: 'banking_plan', label: 'Banking plan completed' },
      { key: 'operating_reserve', label: 'Operating reserve established' },
      { key: 'admin_cost_estimate', label: 'Administrative cost estimate completed' },
    ],
  },
  {
    category: 'legal',
    title: 'Legal Readiness',
    bucket: 'operational',
    items: [
      { key: 'ohio_formation', label: 'Ohio formation checklist completed' },
      { key: 'irs_prep', label: 'IRS filing preparation completed' },
      { key: 'attorney', label: 'Professional attorney identified' },
      { key: 'cpa', label: 'CPA identified' },
      { key: 'insurance', label: 'Insurance reviewed' },
      { key: 'document_vault', label: 'Document vault created' },
    ],
  },
];

export const BUCKETS = [
  { key: 'mission', label: 'Mission Readiness' },
  { key: 'governance', label: 'Governance Readiness' },
  { key: 'financial', label: 'Financial Readiness' },
  { key: 'operational', label: 'Operational Readiness' },
] as const;

export type BucketKey = (typeof BUCKETS)[number]['key'];

export interface ReadinessResult {
  overall: number; // 0-100
  buckets: Record<BucketKey, { score: number; done: number; total: number }>;
  stage: { label: string; tone: string; blurb: string };
  remaining: { group: string; label: string; key: string }[];
  recommendations: string[];
}

export function readinessStage(score: number) {
  if (score >= 90)
    return {
      label: 'Formation Recommended',
      tone: 'text-emerald-500',
      blurb: 'Planning work is substantially complete. Bring the file to your attorney and CPA for formation review.',
    };
  if (score >= 75)
    return {
      label: 'Launch Ready',
      tone: 'text-prism-lime',
      blurb: 'Close to launch. Finish the remaining items so nothing is improvised after formation.',
    };
  if (score >= 50)
    return {
      label: 'Development Stage',
      tone: 'text-prism-amber',
      blurb: 'The structure is taking shape. Focus on governance and the funding plan next.',
    };
  if (score >= 25)
    return {
      label: 'Planning Stage',
      tone: 'text-prism-teal',
      blurb: 'Good foundation of thinking. Keep giving directly while the plan matures.',
    };
  return {
    label: 'Idea Stage',
    tone: 'text-prism-indigo',
    blurb: 'Start with mission, values, and the pillars — the rest builds off those decisions.',
  };
}

export function computeReadiness(checked: Record<string, boolean>): ReadinessResult {
  const buckets = {} as ReadinessResult['buckets'];
  for (const b of BUCKETS) buckets[b.key] = { score: 0, done: 0, total: 0 };

  const remaining: ReadinessResult['remaining'] = [];
  for (const g of READINESS_GROUPS) {
    for (const it of g.items) {
      buckets[g.bucket].total += 1;
      if (checked[it.key]) buckets[g.bucket].done += 1;
      else remaining.push({ group: g.title, label: it.label, key: it.key });
    }
  }
  for (const b of BUCKETS) {
    const x = buckets[b.key];
    x.score = x.total > 0 ? Math.round((x.done / x.total) * 100) : 0;
  }

  // Each of the four categories contributes equally.
  const overall = Math.round(BUCKETS.reduce((s, b) => s + buckets[b.key].score, 0) / BUCKETS.length);

  const weakest = [...BUCKETS].sort((a, b) => buckets[a.key].score - buckets[b.key].score)[0];
  const recommendations: string[] = [];
  if (buckets[weakest.key].score < 100)
    recommendations.push(`${weakest.label} is your lowest category — closing it moves the index the most.`);
  remaining.slice(0, 4).forEach((r) => recommendations.push(`${r.group}: ${r.label}`));
  if (remaining.length === 0) recommendations.push('All planning items are complete — schedule the attorney and CPA formation review.');

  return { overall, buckets, stage: readinessStage(overall), remaining, recommendations };
}

/* ------------------------------ Sustainability ----------------------------- */

export interface SustainabilityInputs {
  assets: number;
  annualContributions: number;
  returnRate: number; // percent
  adminExpenses: number;
  expectedGrants: number;
  inflationRate: number; // percent
  growthRate: number; // percent growth of annual contributions
}

export const DEFAULT_SUSTAINABILITY: SustainabilityInputs = {
  assets: 100000,
  annualContributions: 24000,
  returnRate: 7,
  adminExpenses: 8000,
  expectedGrants: 12000,
  inflationRate: 3,
  growthRate: 3,
};

export interface SustainabilityYear {
  year: number;
  assets: number;
  investmentIncome: number;
  contributions: number;
  admin: number;
  grants: number;
}

export interface SustainabilityResult {
  investmentIncome: number;
  operatingCostRatio: number; // admin / (income + contributions)
  grantCapacity: number;
  yearsOfSustainability: number; // 99 = indefinite
  series: SustainabilityYear[];
  endowmentAt: (y: number) => number;
  longTermGrantPotential: number;
}

export function projectSustainability(i: SustainabilityInputs, years = 30): SustainabilityResult {
  const r = i.returnRate / 100;
  const infl = i.inflationRate / 100;
  const g = i.growthRate / 100;

  const series: SustainabilityYear[] = [];
  let assets = Math.max(0, i.assets);
  let contributions = Math.max(0, i.annualContributions);
  let admin = Math.max(0, i.adminExpenses);
  let grants = Math.max(0, i.expectedGrants);
  let depleted = 0;

  for (let y = 1; y <= years; y++) {
    const income = assets * r;
    assets = assets + income + contributions - admin - grants;
    if (assets <= 0) {
      assets = 0;
      if (!depleted) depleted = y;
    }
    series.push({
      year: y,
      assets: Math.round(assets),
      investmentIncome: Math.round(income),
      contributions: Math.round(contributions),
      admin: Math.round(admin),
      grants: Math.round(grants),
    });
    contributions *= 1 + g;
    admin *= 1 + infl;
    grants *= 1 + infl;
  }

  const investmentIncome = i.assets * r;
  const inflow = investmentIncome + i.annualContributions;
  const operatingCostRatio = inflow > 0 ? i.adminExpenses / inflow : 1;
  const grantCapacity = Math.max(0, inflow - i.adminExpenses);

  return {
    investmentIncome,
    operatingCostRatio,
    grantCapacity,
    yearsOfSustainability: depleted ? depleted : 99,
    series,
    endowmentAt: (y: number) => series[Math.min(series.length, Math.max(1, y)) - 1]?.assets ?? 0,
    longTermGrantPotential: series.reduce((s, x) => s + x.grants, 0),
  };
}

/* ------------------------------ Cost estimator ----------------------------- */

export const COST_LINES = [
  { key: 'cpa', label: 'CPA services' },
  { key: 'legal', label: 'Legal services' },
  { key: 'bookkeeping', label: 'Bookkeeping' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'technology', label: 'Technology' },
  { key: 'investment_mgmt', label: 'Investment management' },
  { key: 'banking', label: 'Banking' },
  { key: 'board_training', label: 'Board training' },
  { key: 'compliance', label: 'Compliance filings' },
  { key: 'admin_support', label: 'Administrative support' },
] as const;

export const DEFAULT_COSTS: Record<string, number> = {
  cpa: 2500,
  legal: 1500,
  bookkeeping: 1200,
  insurance: 900,
  technology: 600,
  investment_mgmt: 1000,
  banking: 240,
  board_training: 500,
  compliance: 600,
  admin_support: 1200,
};

export function costRollup(costs: Record<string, number>, grantsPerYear: number, inflation = 3) {
  const total = COST_LINES.reduce((s, l) => s + (Number(costs[l.key]) || 0), 0);
  const infl = inflation / 100;
  const project = (yrs: number) => {
    let c = total;
    let sum = 0;
    for (let y = 0; y < yrs; y++) {
      sum += c;
      c *= 1 + infl;
    }
    return Math.round(sum);
  };
  return {
    total,
    costPerDollarGranted: grantsPerYear > 0 ? total / grantsPerYear : 0,
    adminExpenseRatio: total + grantsPerYear > 0 ? total / (total + grantsPerYear) : 0,
    fiveYear: project(5),
    tenYear: project(10),
  };
}

/* ------------------------------ Funding sources ---------------------------- */

export const FUNDING_SOURCES = [
  'Personal giving',
  'Business contributions',
  'Book royalties',
  'Speaking revenue',
  'Investment income',
  'Appreciated securities',
  'Trust gifts',
  'Estate gifts',
  'Retirement-related charitable giving',
  'Outside donations',
  'Corporate sponsors',
  'Grants received',
] as const;

export interface FundingRow {
  current: number;
  annualGoal: number;
  lifetimeGoal: number;
  growthRate: number;
  reviewed: boolean;
}

export const emptyFundingRow = (): FundingRow => ({
  current: 0,
  annualGoal: 0,
  lifetimeGoal: 0,
  growthRate: 0,
  reviewed: false,
});

/* -------------------------------- Milestones ------------------------------- */

export const READINESS_MILESTONES = [
  'Mission approved',
  'Board created',
  'Policies completed',
  'Attorney retained',
  'CPA retained',
  'Formation budget approved',
  'Funding strategy approved',
  'Pilot programs completed',
  'Community partnerships',
  'Operating reserve goal',
  'Foundation formation',
  'IRS recognition',
  'First grant awarded',
  'Annual impact report',
  'Legacy endowment milestone',
] as const;

export const milestoneKey = (label: string) => 'ms_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_');

/* -------------------------------- Scenarios -------------------------------- */

export const SCENARIOS = [
  {
    id: 'a',
    name: 'Scenario A — Small Family Foundation',
    range: '$25,000 to $100,000',
    characteristics: [
      'Focused scholarships',
      'Small community grants',
      'Heavy reliance on annual family contributions',
      'Higher administrative cost percentage',
    ],
    recommendation:
      'Consider continuing direct charitable giving until sustainable annual funding exists.',
    tone: 'border-prism-amber/40',
  },
  {
    id: 'b',
    name: 'Scenario B — Growing Family Foundation',
    range: '$100,000 to $500,000',
    characteristics: ['Regular annual grants', 'Growing investment portfolio', 'Board governance', 'Professional accounting'],
    recommendation:
      'May be appropriate when annual contributions and charitable programs are sustainable.',
    tone: 'border-prism-teal/40',
  },
  {
    id: 'c',
    name: 'Scenario C — Legacy Endowment Foundation',
    range: '$500,000+',
    characteristics: [
      'Permanent endowment',
      'Multi-generational giving',
      'Investment-driven growth',
      'Expanded charitable impact',
      'Long-term sustainability',
    ],
    recommendation: 'Investment earnings can carry an increasing share of grants and operations.',
    tone: 'border-prism-lime/40',
  },
] as const;

export const STRATEGY_STAGES = [
  {
    stage: 'Stage One — Planning',
    items: [
      'Develop governance',
      'Write policies',
      'Design charitable programs',
      'Identify board members',
      'Complete estate planning review',
      'Build the Foundation module in Prism',
    ],
    note: 'No legal entity required.',
  },
  {
    stage: 'Stage Two — Launch',
    items: [
      'Mission is clearly defined',
      'Funding is sustainable',
      'Board is active',
      'Programs are ready',
      'Professional advisors have completed legal and tax review',
    ],
    note: 'Illustrative planning target: roughly $250,000 to $500,000 in assets or committed funding, together with sustainable annual contributions. Planning target, not a legal requirement.',
  },
  {
    stage: 'Stage Three — Legacy Endowment',
    items: [
      'Investment earnings increasingly support grants and operations',
      'Multi-generational trustee involvement',
      'Permanent endowment discipline',
    ],
    note: 'This milestone represents increased financial capacity, not a legal requirement for formation.',
  },
] as const;

export const EXECUTIVE_SUMMARY =
  'The success of the Dr. Lyman A. Montgomery Family Foundation will be measured by mission readiness, governance, sustainable funding, charitable impact, and long-term stewardship, not by reaching an arbitrary asset value. While many advisors use $1 million as a practical benchmark for long-term sustainability, the optimal time to launch the Foundation depends on the family\u2019s vision, financial capacity, governance readiness, and commitment to creating lasting community impact.';

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
