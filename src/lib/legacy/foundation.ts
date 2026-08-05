// Engine + seed data for the Dr. Lyman A. Montgomery Family Foundation module.

export const FOUNDATION_NAME = 'Dr. Lyman A. Montgomery Family Foundation';

export const DEFAULT_MISSION =
  'To break generational cycles of poverty, poor health, and financial illiteracy by equipping families with housing stability, education, financial discipline, entrepreneurial skill, and a durable sense of purpose.';

export const DEFAULT_VISION =
  'A hundred-year family institution that funds, teaches, and models wealth-building so that every generation of the Montgomery family — and the communities we serve — inherits both capital and character.';

export const DEFAULT_LEGACY_STATEMENT =
  'Wealth is a tool, not a trophy. What we build must outlive us, teach those who follow, and leave the community measurably stronger than we found it.';

export const DEFAULT_VALUES: { title: string; description: string }[] = [
  { title: 'Stewardship', description: 'Every dollar is held in trust for the next generation.' },
  { title: 'Dignity', description: 'We serve people as partners, never as projects.' },
  { title: 'Discipline', description: 'Consistency compounds — in money, health, and character.' },
  { title: 'Education', description: 'Teaching outlasts giving. We transfer knowledge, not just cash.' },
  { title: 'Faith & Family', description: 'Purpose anchors the plan; family carries it forward.' },
  { title: 'Measurable Impact', description: 'If it cannot be measured, it cannot be improved.' },
];

export type PillarSeed = {
  name: string;
  slug: string;
  description: string;
  focus_areas: string[];
  annual_budget: number;
  target_beneficiaries: number;
  kpis: string[];
  color: string;
  sort_order: number;
};

export const PILLAR_SEEDS: PillarSeed[] = [
  {
    name: 'Housing & Stability',
    slug: 'housing',
    description:
      'Safe, affordable housing for young adults aging out of foster care and for medical professionals serving Northeast Ohio.',
    focus_areas: ['Tiny home village', 'Medical professional housing', 'Rent readiness coaching', 'Emergency housing fund'],
    annual_budget: 60000,
    target_beneficiaries: 24,
    kpis: ['Residents housed', 'Average months of stable housing', 'Exit-to-independence rate'],
    color: 'text-prism-rose',
    sort_order: 1,
  },
  {
    name: 'Financial Literacy & Wealth Building',
    slug: 'financial-literacy',
    description:
      'Teach households the order of operations for money: cash flow, debt elimination, credit, investing, and legacy.',
    focus_areas: ['Youth money curriculum', 'Credit repair clinics', 'Homebuyer readiness', 'Prism scholarships'],
    annual_budget: 40000,
    target_beneficiaries: 250,
    kpis: ['Participants completing curriculum', 'Average credit score lift', 'Households reaching positive net worth'],
    color: 'text-prism-teal',
    sort_order: 2,
  },
  {
    name: 'Education & Mentorship',
    slug: 'education',
    description: 'Scholarships, tutoring, and long-term mentoring relationships that follow a young person for years.',
    focus_areas: ['Scholarship fund', 'Mentor matching', 'Trade and certification grants', 'College persistence support'],
    annual_budget: 35000,
    target_beneficiaries: 60,
    kpis: ['Scholarships awarded', 'Mentor match retention at 12 months', 'Credential completion rate'],
    color: 'text-prism-amber',
    sort_order: 3,
  },
  {
    name: 'Health & Longevity',
    slug: 'health',
    description:
      'Preventive care access, nutrition education, and movement programs modeled on the family longevity system.',
    focus_areas: ['Preventive screening access', 'Nutrition education', 'Community fitness', 'Caregiver support'],
    annual_budget: 25000,
    target_beneficiaries: 150,
    kpis: ['Screenings funded', 'Participants improving key vitals', 'Nutrition workshop attendance'],
    color: 'text-prism-lime',
    sort_order: 4,
  },
  {
    name: 'Entrepreneurship & Community Capital',
    slug: 'entrepreneurship',
    description:
      'Micro-grants, coaching, and access to capital for small business owners rebuilding neighborhood economies.',
    focus_areas: ['Micro-grants', 'Business credit coaching', 'Bankability readiness', 'Vendor and supplier networks'],
    annual_budget: 40000,
    target_beneficiaries: 40,
    kpis: ['Businesses funded', 'Jobs created', 'Businesses surviving 24 months'],
    color: 'text-prism-indigo',
    sort_order: 5,
  },
];

export type RoadmapSeed = {
  year: number;
  phase_label: string;
  title: string;
  description: string;
  target_amount: number;
  milestones: string[];
  sort_order: number;
};

export const ROADMAP_SEEDS: RoadmapSeed[] = [
  {
    year: 2027,
    phase_label: 'Year 1 — Formation',
    title: 'Stand up the foundation',
    description:
      'Legal formation, governance, first funding commitment, and one pilot program per priority pillar.',
    target_amount: 50000,
    milestones: [
      'File articles of incorporation and bylaws',
      'Apply for 501(c)(3) determination',
      'Seat the initial board and advisors',
      'Open foundation banking and accounting',
      'Launch one financial literacy pilot cohort',
    ],
    sort_order: 1,
  },
  {
    year: 2028,
    phase_label: 'Year 2 — Proof',
    title: 'Prove the model in two pillars',
    description: 'Document outcomes, publish the first impact report, and secure recurring partners.',
    target_amount: 100000,
    milestones: [
      'Publish first annual impact report',
      'Sign three recurring community partners',
      'Formalize scholarship application process',
      'Begin tiny home village site due diligence',
    ],
    sort_order: 2,
  },
  {
    year: 2029,
    phase_label: 'Year 3 — Build',
    title: 'Break ground on housing',
    description: 'Move housing from planning to construction while scaling literacy and mentorship.',
    target_amount: 250000,
    milestones: [
      'Close on village land',
      'Complete phase one construction financing',
      'Scale literacy curriculum to 250 participants',
      'Launch entrepreneurship micro-grant round one',
    ],
    sort_order: 3,
  },
  {
    year: 2030,
    phase_label: 'Year 4 — Scale',
    title: 'Scale programs and staff',
    description: 'Hire the first program director and formalize measurement across all five pillars.',
    target_amount: 400000,
    milestones: [
      'Hire program director',
      'All five pillars operating with KPIs',
      'Second housing phase under way',
      'Establish donor-advised fund pipeline',
    ],
    sort_order: 4,
  },
  {
    year: 2031,
    phase_label: 'Year 5 — Endowment',
    title: 'Fund the endowment and succession',
    description: 'Reach the first endowment milestone and hand operating roles to the next generation.',
    target_amount: 1000000,
    milestones: [
      'Endowment reaches first milestone',
      'Next-generation family members seated on board',
      'Succession and continuity plan ratified',
      'Five-year cumulative impact report published',
    ],
    sort_order: 5,
  },
];

export type LegacyNodeSeed = {
  title: string;
  node_type: string;
  generation: string;
  description: string;
  linked_value: string;
  sort_order: number;
};

export const LEGACY_NODE_SEEDS: LegacyNodeSeed[] = [
  {
    title: 'The Founder’s Story',
    node_type: 'story',
    generation: 'g1',
    description: 'How discipline, debt elimination, and faith turned a paycheck into an institution.',
    linked_value: 'Discipline',
    sort_order: 1,
  },
  {
    title: 'Prism Money Operating System',
    node_type: 'institution',
    generation: 'g1',
    description: 'The tooling and playbook the family uses to run its money — taught, not just inherited.',
    linked_value: 'Education',
    sort_order: 2,
  },
  {
    title: 'Family Constitution',
    node_type: 'value',
    generation: 'g1',
    description: 'Written rules for how money, roles, and decisions pass between generations.',
    linked_value: 'Stewardship',
    sort_order: 3,
  },
  {
    title: 'Real Estate Portfolio',
    node_type: 'asset',
    generation: 'g2',
    description: 'Medical professional housing and the tiny home village as income and impact engines.',
    linked_value: 'Dignity',
    sort_order: 4,
  },
  {
    title: 'Foundation Endowment',
    node_type: 'asset',
    generation: 'g2',
    description: 'Perpetual capital that funds grants without consuming principal.',
    linked_value: 'Measurable Impact',
    sort_order: 5,
  },
  {
    title: 'Next-Generation Stewards',
    node_type: 'value',
    generation: 'g3',
    description: 'Trained family trustees who can read a balance sheet and run a grant cycle.',
    linked_value: 'Faith & Family',
    sort_order: 6,
  },
];

export const PILLAR_STATUSES = ['planned', 'active', 'scaling', 'paused'] as const;
export const INITIATIVE_STATUSES = ['idea', 'planned', 'active', 'complete', 'paused'] as const;
export const ROADMAP_STATUSES = ['planned', 'in_progress', 'complete', 'at_risk'] as const;
export const RELATIONSHIP_CATEGORIES = [
  'funder',
  'partner',
  'advisor',
  'community',
  'family',
  'government',
  'faith',
] as const;
export const LEGACY_NODE_TYPES = ['value', 'asset', 'story', 'institution'] as const;
export const GENERATIONS = [
  { value: 'g1', label: 'Generation 1 — Founders' },
  { value: 'g2', label: 'Generation 2 — Children' },
  { value: 'g3', label: 'Generation 3 — Grandchildren' },
  { value: 'g4', label: 'Generation 4+ — Beyond' },
];

export type PillarRow = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  focus_areas: string[] | null;
  annual_budget: number;
  target_beneficiaries: number;
  actual_beneficiaries: number;
  kpis: string[] | null;
  status: string;
  color: string;
  sort_order: number;
};

export type InitiativeRow = {
  id: string;
  pillar_id: string | null;
  title: string;
  description: string | null;
  budget: number;
  spent: number;
  target_beneficiaries: number;
  actual_beneficiaries: number;
  status: string;
  lead_name: string | null;
  start_date: string | null;
  end_date: string | null;
};

/** Rolls pillar + initiative data into the numbers the executive dashboard shows. */
export function rollupFoundation(
  pillars: PillarRow[],
  initiatives: InitiativeRow[],
  roadmap: { status: string; target_amount: number }[],
  settings: { endowment_current?: number; endowment_target?: number; annual_grant_budget?: number } | null,
) {
  const annualBudget = pillars.reduce((s, p) => s + Number(p.annual_budget || 0), 0);
  const committed = initiatives.reduce((s, i) => s + Number(i.budget || 0), 0);
  const deployed = initiatives.reduce((s, i) => s + Number(i.spent || 0), 0);
  const targetPeople = pillars.reduce((s, p) => s + Number(p.target_beneficiaries || 0), 0);
  const actualPeople = pillars.reduce((s, p) => s + Number(p.actual_beneficiaries || 0), 0);
  const initiativePeople = initiatives.reduce((s, i) => s + Number(i.actual_beneficiaries || 0), 0);
  const activePillars = pillars.filter((p) => p.status === 'active' || p.status === 'scaling').length;
  const activeInitiatives = initiatives.filter((i) => i.status === 'active').length;
  const endowmentCurrent = Number(settings?.endowment_current ?? 0);
  const endowmentTarget = Number(settings?.endowment_target ?? 0);
  const roadmapComplete = roadmap.filter((r) => r.status === 'complete').length;

  const peopleServed = Math.max(actualPeople, initiativePeople);
  const deploymentRate = committed > 0 ? deployed / committed : 0;
  const endowmentProgress = endowmentTarget > 0 ? Math.min(1, endowmentCurrent / endowmentTarget) : 0;
  const reachProgress = targetPeople > 0 ? Math.min(1, peopleServed / targetPeople) : 0;
  const roadmapProgress = roadmap.length > 0 ? roadmapComplete / roadmap.length : 0;
  const pillarProgress = pillars.length > 0 ? activePillars / pillars.length : 0;

  // Legacy readiness: balanced blend of capital, reach, execution, and structure.
  const readiness = Math.round(
    (endowmentProgress * 0.3 + reachProgress * 0.25 + roadmapProgress * 0.25 + pillarProgress * 0.2) * 100,
  );

  return {
    annualBudget,
    committed,
    deployed,
    remaining: Math.max(0, committed - deployed),
    deploymentRate,
    targetPeople,
    peopleServed,
    reachProgress,
    activePillars,
    activeInitiatives,
    endowmentCurrent,
    endowmentTarget,
    endowmentProgress,
    roadmapComplete,
    roadmapTotal: roadmap.length,
    roadmapProgress,
    readiness,
    costPerBeneficiary: peopleServed > 0 ? deployed / peopleServed : 0,
  };
}

export function readinessLabel(score: number) {
  if (score >= 80) return 'Institutional';
  if (score >= 60) return 'Operating';
  if (score >= 35) return 'Emerging';
  if (score >= 15) return 'Forming';
  return 'Pre-launch';
}

export function relationshipPriority(r: { influence: number; strength: number }) {
  // High influence + low relationship strength = highest priority outreach.
  return Number(r.influence || 0) * 2 - Number(r.strength || 0);
}

export const currency = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
