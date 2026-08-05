// Montgomery Charitable Legacy Funding Strategy — planning content and rollups.
// Planning tool only — not legal, tax, or investment advice.

export const MISSION_FIRST_PRINCIPLE =
  'The primary purpose of the Dr. Lyman A. Montgomery Family Foundation is to create lasting charitable impact and preserve the Montgomery family\u2019s values for future generations. Tax efficiency supports the mission but is never the mission itself.';

export const MISSION_STATEMENT =
  'The Foundation exists to strengthen individuals, families, and communities through faith, education, leadership, housing stability, workforce development, scholarships, foster youth support, and generational stewardship. Funding strategies should always support this mission rather than define it.';

export const EXECUTIVE_VISION = [
  'The Dr. Lyman A. Montgomery Family Foundation will become the Montgomery family\u2019s permanent charitable legacy institution. Throughout our lifetime, it will be strengthened by faithful stewardship, annual giving, business success, investment growth, and thoughtful retirement and estate planning. Beyond our lifetime, it will continue investing in faith, education, leadership, foster youth, housing stability, workforce development, and community transformation for generations to come.',
  'The Foundation will not exist to reduce taxes. It will exist to maximize impact. Tax-efficient planning will simply allow more resources to be directed toward the mission.',
];

export const STRATEGIC_PRINCIPLES = [
  'The Foundation exists because of the family\u2019s mission, not because of taxes.',
  'Retirement planning is one funding strategy, not the Foundation\u2019s purpose.',
  'Charitable impact always comes before tax efficiency.',
  'The Foundation should be funded from diversified sources throughout life.',
  'Estate planning should strengthen the Foundation for future generations.',
  'Every significant charitable funding strategy involving retirement accounts, trusts, business interests, or appreciated assets requires professional legal and tax review.',
];

export const FUNDING_WATERFALL = [
  'Personal Giving',
  'Business Success',
  'Investment Growth',
  'Appreciated Assets',
  'Retirement Charitable Planning',
  'Trust Legacy Gifts',
  'Estate Gifts',
  'Multi-Generational Family Giving',
  'Permanent Community Impact',
];

export const FAMILY_LEGACY_CHAIN = [
  'Faith',
  'Family',
  'Stewardship',
  'Businesses',
  'Investments',
  'Foundation',
  'Community',
  'Future Generations',
];

export interface FundingPhase {
  key: string;
  step: string;
  title: string;
  window: string;
  sources: string[];
  objectives: string[];
}

export const FUNDING_PHASES: FundingPhase[] = [
  {
    key: 'p1',
    step: 'Phase One',
    title: 'Building the Foundation',
    window: 'Current through Formation',
    sources: [
      'Personal charitable giving',
      'Speaking income',
      'Consulting income',
      'Book royalties',
      'Business profits (when appropriate)',
      'Investment income',
      'Annual family gifts',
    ],
    objectives: [
      'Build charitable culture',
      'Launch pilot programs',
      'Develop governance',
      'Establish funding discipline',
      'Create an annual charitable budget',
    ],
  },
  {
    key: 'p2',
    step: 'Phase Two',
    title: 'Growing the Foundation',
    window: 'Post-formation growth years',
    sources: [
      'Personal contributions',
      'Business-supported gifts',
      'Appreciated securities',
      'Investment growth',
      'Corporate sponsorships',
      'Outside donations',
      'Community partnerships',
    ],
    objectives: [
      'Increase annual grant capacity',
      'Grow Foundation assets',
      'Expand charitable programs',
      'Strengthen governance',
    ],
  },
  {
    key: 'p3',
    step: 'Phase Three',
    title: 'Retirement Charitable Planning',
    window: 'Retirement years',
    sources: [
      'Taxable retirement distributions',
      'Annual charitable contributions',
      'Investment income',
      'Appreciated securities',
    ],
    objectives: [
      'Set an annual charitable budget before distributions',
      'Review tax impact with a CPA each year',
      'Coordinate giving with retirement income needs',
    ],
  },
  {
    key: 'p4',
    step: 'Phase Four',
    title: 'Legacy & Estate Giving',
    window: 'Beyond our lifetime',
    sources: [
      'Trust charitable provisions',
      'Estate distributions',
      'Retirement beneficiary designations',
      'Life insurance proceeds',
      'Investment assets',
      'Business interests',
      'Intellectual property',
      'Appreciated real estate',
      'Future family contributions',
    ],
    objectives: [
      'Name the Foundation in trust and estate documents',
      'Confirm beneficiary designations annually',
      'Prepare successor trustees and family governance',
    ],
  },
];

export interface FundingTier {
  tier: string;
  title: string;
  items: string[];
}

export const FUNDING_TIERS: FundingTier[] = [
  {
    tier: 'Tier One',
    title: 'Annual Personal Giving',
    items: ['Cash Contributions', 'Speaking Revenue', 'Book Royalties', 'Consulting Revenue', 'Annual Family Giving'],
  },
  {
    tier: 'Tier Two',
    title: 'Business Success',
    items: ['Business Contributions', 'Investment Income', 'Appreciated Securities', 'Special Gifts'],
  },
  {
    tier: 'Tier Three',
    title: 'Retirement Planning',
    items: [
      'Taxable Retirement Distributions',
      'Annual Charitable Contributions',
      'Future Retirement Strategies',
      'Professional Tax Review',
    ],
  },
  {
    tier: 'Tier Four',
    title: 'Legacy Planning',
    items: [
      'Trust Gifts',
      'Estate Gifts',
      'Retirement Beneficiary Planning',
      'Life Insurance',
      'Business Succession',
      'Future Family Endowment',
    ],
  },
];

export interface FundingSourceDef {
  key: string;
  label: string;
  tier: 1 | 2 | 3 | 4;
  needsReview: boolean;
}

export const FUNDING_SOURCES: FundingSourceDef[] = [
  { key: 'personal_giving', label: 'Personal Giving', tier: 1, needsReview: false },
  { key: 'speaking_revenue', label: 'Speaking Revenue', tier: 1, needsReview: false },
  { key: 'book_royalties', label: 'Book Royalties', tier: 1, needsReview: false },
  { key: 'business_giving', label: 'Business Giving', tier: 2, needsReview: true },
  { key: 'investment_income', label: 'Investment Income', tier: 2, needsReview: false },
  { key: 'appreciated_securities', label: 'Appreciated Securities', tier: 2, needsReview: true },
  { key: 'corporate_sponsors', label: 'Corporate Sponsors', tier: 2, needsReview: false },
  { key: 'outside_donations', label: 'Outside Donations', tier: 2, needsReview: false },
  { key: 'community_grants', label: 'Community Grants', tier: 2, needsReview: false },
  { key: 'retirement_contributions', label: 'Retirement Contributions', tier: 3, needsReview: true },
  { key: 'trust_gifts', label: 'Trust Gifts', tier: 4, needsReview: true },
  { key: 'estate_gifts', label: 'Estate Gifts', tier: 4, needsReview: true },
  { key: 'life_insurance', label: 'Life Insurance', tier: 4, needsReview: true },
];

export interface FundingSourceState {
  current?: number;
  annualGoal?: number;
  lifetimeGoal?: number;
  priorYear?: number;
  reviewed?: boolean;
}

export type FundingSourceMap = Record<string, FundingSourceState>;

export function summarizeFunding(map: FundingSourceMap) {
  let current = 0;
  let annualGoal = 0;
  let lifetimeGoal = 0;
  let reviewNeeded = 0;
  for (const src of FUNDING_SOURCES) {
    const s = map[src.key] ?? {};
    current += s.current ?? 0;
    annualGoal += s.annualGoal ?? 0;
    lifetimeGoal += s.lifetimeGoal ?? 0;
    if (src.needsReview && !s.reviewed) reviewNeeded += 1;
  }
  return {
    current,
    annualGoal,
    lifetimeGoal,
    reviewNeeded,
    annualPct: annualGoal > 0 ? Math.min(100, (current / annualGoal) * 100) : 0,
  };
}

export function trendFor(s: FundingSourceState): 'up' | 'down' | 'flat' {
  const cur = s.current ?? 0;
  const prior = s.priorYear ?? 0;
  if (cur > prior) return 'up';
  if (cur < prior) return 'down';
  return 'flat';
}

// ---------- Retirement giving ----------

export const QCD_NOTE =
  'Under current IRS rules, Qualified Charitable Distributions generally cannot be made directly to most private foundations. Taxable retirement distributions and charitable gifts should be evaluated annually with a CPA and estate-planning attorney.';

export const RETIREMENT_GUIDANCE =
  'The Foundation should not be established solely to receive Required Minimum Distributions. Instead, retirement distributions become one component of a broader charitable funding strategy.';

export const RETIREMENT_WORKFLOW = [
  'Receive taxable retirement distribution',
  'Determine annual charitable budget',
  'Review tax impact',
  'Approve charitable contribution',
  'Transfer contribution to Foundation',
  'Issue acknowledgment',
  'Record charitable impact',
];

export interface RetirementGivingState {
  retirementAge?: number;
  currentAge?: number;
  traditionalBalance?: number;
  rothBalance?: number;
  taxableBalance?: number;
  projectedAnnualDistribution?: number;
  annualGivingGoal?: number;
  incomeNeed?: number;
  returnPct?: number;
  yearsOfGiving?: number;
}

export const RETIREMENT_DEFAULTS: RetirementGivingState = {
  currentAge: 59,
  retirementAge: 70,
  traditionalBalance: 178220,
  rothBalance: 0,
  taxableBalance: 0,
  projectedAnnualDistribution: 0,
  annualGivingGoal: 12000,
  incomeNeed: 90000,
  returnPct: 7,
  yearsOfGiving: 30,
};

/** Simple, non-tax projection of balance at retirement and lifetime giving capacity. */
export function projectRetirementGiving(s: RetirementGivingState) {
  const st = { ...RETIREMENT_DEFAULTS, ...s };
  const years = Math.max(0, (st.retirementAge ?? 70) - (st.currentAge ?? 59));
  const r = (st.returnPct ?? 7) / 100;
  const balanceAtRetirement =
    ((st.traditionalBalance ?? 0) + (st.rothBalance ?? 0) + (st.taxableBalance ?? 0)) * (1 + r) ** years;
  const rmdFirstYear = balanceAtRetirement / 26.5; // Uniform Lifetime divisor at 73, illustrative
  const lifetimeGiving = (st.annualGivingGoal ?? 0) * (st.yearsOfGiving ?? 30);
  const givingShareOfDistribution =
    (st.projectedAnnualDistribution ?? 0) > 0
      ? ((st.annualGivingGoal ?? 0) / (st.projectedAnnualDistribution ?? 1)) * 100
      : 0;
  return {
    years,
    balanceAtRetirement,
    rmdFirstYear,
    lifetimeGiving,
    givingShareOfDistribution,
  };
}

export const ESTATE_ITEMS = [
  { key: 'trust_provisions', label: 'Trust charitable provisions drafted' },
  { key: 'fdn_beneficiary', label: 'Foundation named as beneficiary' },
  { key: 'estate_gifting', label: 'Estate gifting plan documented' },
  { key: 'charitable_bequests', label: 'Charitable bequests in will' },
  { key: 'contingent_beneficiaries', label: 'Contingent charitable beneficiaries named' },
  { key: 'successor_funding', label: 'Successor funding plan in place' },
  { key: 'family_governance', label: 'Family governance charter adopted' },
];

export const ESTATE_NOTE =
  'The Foundation is intended to become a permanent charitable institution supported by lifetime giving and future estate planning.';

export const LEGACY_PRINCIPLE = 'The Foundation is designed to continue serving communities long after the founders\u2019 lifetimes.';

export const TAX_LAW_NOTE = 'Tax laws change over time. Retirement-related charitable strategies should be reviewed annually.';
