// Montgomery Tiny Home Village (Goal 2) — pure calculation engine, field definitions, and seed data.
// Educational planning estimates only. Not legal, tax, or investment advice.

// ============================================================
// Statements
// ============================================================

export const VILLAGE_MISSION =
  'The Montgomery family will create a safe and supportive tiny home community where young adults aging out of foster care can build stability, develop life skills, strengthen their finances, and prepare for independent adulthood.';

export const VILLAGE_LEGACY_STATEMENT =
  'This village will not simply provide a small house. It will provide a stable place from which a young adult can build a larger life.';

export const SHARED_FAMILY_LEGACY_STATEMENT =
  'The Montgomery family will use real estate to build both assets and opportunity. Goal 1 will serve medical professionals who care for others. Goal 2 will help young adults leaving foster care build the foundation they need to care for themselves, their families, and their futures.';

export const FUNDING_CONNECTION_STATEMENT =
  'Professional medical housing may help generate wealth and contribute funding, but the tiny home village remains a complete long-term goal with its own partners, funding strategy, development plan, operating model, and measures of success.';

export const PRELIMINARY_COST_WARNING =
  'These figures are preliminary planning ranges only. Final costs will depend on land, zoning, utilities, construction type, accessibility requirements, local labor, professional services, and the number of shared facilities.';

export const VILLAGE_MILESTONE = {
  title: 'Develop and Open the Montgomery Tiny Home Village',
  description:
    'Plan, fund, build, and operate a supportive tiny home village that provides young adults aging out of foster care with stable housing, mentoring, financial education, employment preparation, life-skills development, and a structured path toward independent living.',
  successMeasures: [
    'Safe housing provided',
    'Resident stability',
    'Employment and education progress',
    'Financial capability',
    'Successful transition to permanent housing',
    'Sustainable village operations',
    'Strong community partnerships',
    'Measurable long-term resident outcomes',
  ],
};

// ============================================================
// Progress tracks
// ============================================================

export const PROGRESS_TRACKS: { key: string; label: string }[] = [
  { key: 'research', label: 'Research completion' },
  { key: 'partnerships', label: 'Partnership development' },
  { key: 'site', label: 'Site selection' },
  { key: 'zoning', label: 'Zoning approval' },
  { key: 'funding', label: 'Funding' },
  { key: 'design', label: 'Design' },
  { key: 'construction', label: 'Construction' },
  { key: 'program', label: 'Program development' },
  { key: 'staffing', label: 'Staffing' },
  { key: 'launch', label: 'Launch readiness' },
];

// ============================================================
// Development phases + task seeds
// ============================================================

export const PHASES: { phase: number; title: string; tasks: string[] }[] = [
  {
    phase: 1,
    title: 'Phase 1: Vision and Feasibility',
    tasks: [
      'Define the village mission',
      'Identify the target resident population',
      'Determine the proposed age range',
      'Determine the expected length of stay',
      'Estimate the number of tiny homes',
      'Research foster care transition needs',
      'Identify possible counties and cities',
      'Conduct a preliminary feasibility study',
      'Estimate startup and operating costs',
      'Review potential legal structures',
      'Identify early community partners',
    ],
  },
  {
    phase: 2,
    title: 'Phase 2: Community and Partner Validation',
    tasks: [
      'Meet with county children services',
      'Meet with foster care agencies',
      'Interview young adults with lived foster care experience',
      'Meet with workforce development organizations',
      'Contact community colleges and trade schools',
      'Identify mental health and wellness partners',
      'Identify financial education partners',
      'Identify employers willing to hire residents',
      'Identify transportation partners',
      'Identify mentoring organizations',
      'Identify churches and community organizations',
      'Document letters of interest and support',
    ],
  },
  {
    phase: 3,
    title: 'Phase 3: Site Identification and Approval',
    tasks: [
      'Establish land requirements',
      'Identify potential properties',
      'Review zoning classifications',
      'Confirm tiny home regulations',
      'Review minimum dwelling-size requirements',
      'Confirm water and sewer access',
      'Confirm utility availability',
      'Complete environmental review',
      'Review road and emergency access',
      'Review public transportation access',
      'Review proximity to employment and education',
      'Meet with local planning officials',
      'Complete neighborhood engagement',
      'Submit zoning or land-use applications',
      'Record approvals and restrictions',
    ],
  },
  {
    phase: 4,
    title: 'Phase 4: Organizational and Funding Structure',
    tasks: [
      'Determine whether the village will operate through a nonprofit',
      'Consider a nonprofit and for-profit partnership',
      'Consider a charitable subsidiary or affiliated organization',
      'Establish governing documents',
      'Form an advisory council or board',
      'Create a conflict-of-interest policy',
      'Establish financial controls',
      'Create a capital campaign',
      'Identify grant opportunities',
      'Identify foundation funding',
      'Identify government housing programs',
      'Identify corporate sponsors',
      'Identify church and community partners',
      'Identify social impact investors',
      'Create a donor management system',
    ],
  },
  {
    phase: 5,
    title: 'Phase 5: Design and Construction',
    tasks: [
      'Select architect or design professional',
      'Develop the site plan',
      'Select tiny home designs',
      'Design the community center',
      'Design accessible units',
      'Plan utility connections',
      'Plan parking and transportation access',
      'Plan security and lighting',
      'Plan landscaping and outdoor spaces',
      'Develop the construction budget',
      'Select contractors',
      'Obtain permits',
      'Establish the construction schedule',
      'Track inspections',
      'Track change orders',
      'Track actual construction costs',
      'Complete final occupancy approvals',
    ],
  },
  {
    phase: 6,
    title: 'Phase 6: Program and Operations Development',
    tasks: [
      'Develop resident eligibility standards',
      'Create the application process',
      'Create the resident selection process',
      'Develop resident agreements',
      'Establish community rules',
      'Establish grievance procedures',
      'Establish safety procedures',
      'Establish emergency procedures',
      'Establish visitor policies',
      'Establish drug and alcohol policies',
      'Establish employment and education expectations',
      'Develop mentoring procedures',
      'Develop financial education requirements',
      'Develop savings expectations',
      'Develop transition and graduation plans',
      'Establish property management procedures',
      'Establish maintenance procedures',
      'Select technology and recordkeeping systems',
    ],
  },
  {
    phase: 7,
    title: 'Phase 7: Staffing and Launch',
    tasks: [
      'Hire or appoint village director',
      'Hire or contract case-management support',
      'Recruit mentors',
      'Train volunteers',
      'Establish property management support',
      'Establish overnight emergency contacts',
      'Complete staff background checks',
      'Finalize partner agreements',
      'Begin resident outreach',
      'Review applications',
      'Select the first resident group',
      'Conduct resident orientation',
      'Open the village',
      'Complete the first 90-day review',
      'Complete the first-year impact review',
    ],
  },
];

export const TASK_STATUSES = ['not_started', 'in_progress', 'blocked', 'complete'] as const;

export const TASK_STATUS_LABELS: Record<string, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  blocked: 'Blocked',
  complete: 'Complete',
};

// ============================================================
// Site planner
// ============================================================

export const SITE_SCORE_CRITERIA: { key: string; label: string }[] = [
  { key: 'price', label: 'Purchase price' },
  { key: 'zoning', label: 'Zoning compatibility' },
  { key: 'infrastructure', label: 'Infrastructure access' },
  { key: 'transportation', label: 'Transportation access' },
  { key: 'employment', label: 'Employment access' },
  { key: 'education', label: 'Education access' },
  { key: 'healthcare', label: 'Healthcare access' },
  { key: 'neighborhood', label: 'Neighborhood compatibility' },
  { key: 'expansion', label: 'Expansion potential' },
  { key: 'safety', label: 'Safety' },
  { key: 'dev_cost', label: 'Total development cost' },
  { key: 'risk', label: 'Overall project risk' },
];

export type SiteRecommendation =
  | 'Strong Village Site'
  | 'Promising, Additional Review Needed'
  | 'Approval Risk'
  | 'Financial Risk'
  | 'Do Not Pursue';

export function scoreSite(scores: Record<string, number> = {}): {
  total: number;
  average: number;
  scored: number;
  recommendation: SiteRecommendation;
  reason: string;
} {
  const values = SITE_SCORE_CRITERIA.map((c) => Number(scores[c.key]) || 0);
  const scored = values.filter((v) => v > 0).length;
  const total = values.reduce((a, b) => a + b, 0);
  const average = scored ? total / scored : 0;

  const zoning = Number(scores.zoning) || 0;
  const neighborhood = Number(scores.neighborhood) || 0;
  const price = Number(scores.price) || 0;
  const devCost = Number(scores.dev_cost) || 0;
  const risk = Number(scores.risk) || 0;

  if (!scored) {
    return { total, average, scored, recommendation: 'Promising, Additional Review Needed', reason: 'Not yet scored.' };
  }
  if (average < 2.2 || risk === 1) {
    return { total, average, scored, recommendation: 'Do Not Pursue', reason: 'Overall scoring is too weak to justify further cost.' };
  }
  if ((zoning > 0 && zoning <= 2) || (neighborhood > 0 && neighborhood <= 2)) {
    return { total, average, scored, recommendation: 'Approval Risk', reason: 'Zoning or neighborhood compatibility is the limiting factor.' };
  }
  if ((price > 0 && price <= 2) || (devCost > 0 && devCost <= 2)) {
    return { total, average, scored, recommendation: 'Financial Risk', reason: 'Purchase price or total development cost is the limiting factor.' };
  }
  if (average >= 4.3) {
    return { total, average, scored, recommendation: 'Strong Village Site', reason: 'Scores strongly across access, approval, and cost.' };
  }
  return { total, average, scored, recommendation: 'Promising, Additional Review Needed', reason: 'Viable, but additional diligence is required.' };
}

export const SITE_APPROVAL_STATUSES = [
  'Not Started',
  'Researching',
  'Pre-Application Meeting',
  'Application Submitted',
  'Conditionally Approved',
  'Approved',
  'Denied',
];

export const SUPPORT_LEVELS = ['Unknown', 'Opposed', 'Mixed', 'Neutral', 'Supportive', 'Strongly Supportive'];

// ============================================================
// Development budget
// ============================================================

export interface BudgetField {
  key: string;
  label: string;
  perHome?: boolean;
}

export interface BudgetGroup {
  key: 'land' | 'utility' | 'housing' | 'shared' | 'professional';
  label: string;
  fields: BudgetField[];
}

export const BUDGET_GROUPS: BudgetGroup[] = [
  {
    key: 'land',
    label: 'Land and Site Costs',
    fields: [
      { key: 'land_purchase', label: 'Land purchase' },
      { key: 'closing_costs', label: 'Closing costs' },
      { key: 'survey', label: 'Survey' },
      { key: 'environmental_assessment', label: 'Environmental assessment' },
      { key: 'soil_testing', label: 'Soil testing' },
      { key: 'demolition', label: 'Demolition' },
      { key: 'site_clearing', label: 'Site clearing' },
      { key: 'grading', label: 'Grading' },
      { key: 'drainage', label: 'Drainage' },
      { key: 'roads_walkways', label: 'Roads and walkways' },
      { key: 'parking', label: 'Parking' },
      { key: 'landscaping', label: 'Landscaping' },
      { key: 'fencing', label: 'Fencing' },
      { key: 'exterior_lighting', label: 'Exterior lighting' },
      { key: 'security_systems', label: 'Security systems' },
    ],
  },
  {
    key: 'utility',
    label: 'Utility and Infrastructure Costs',
    fields: [
      { key: 'water_connection', label: 'Water connection' },
      { key: 'sewer_connection', label: 'Sewer connection' },
      { key: 'septic_system', label: 'Septic system' },
      { key: 'electrical_service', label: 'Electrical service' },
      { key: 'gas_propane', label: 'Natural gas or propane' },
      { key: 'internet_infrastructure', label: 'Internet infrastructure' },
      { key: 'stormwater', label: 'Stormwater management' },
      { key: 'fire_safety', label: 'Fire-safety infrastructure' },
      { key: 'waste_collection', label: 'Waste collection setup' },
    ],
  },
  {
    key: 'housing',
    label: 'Housing Construction Costs',
    fields: [
      { key: 'delivery', label: 'Delivery cost per home', perHome: true },
      { key: 'foundation', label: 'Foundation per home', perHome: true },
      { key: 'installation', label: 'Installation per home', perHome: true },
      { key: 'furnishings', label: 'Furnishings per home', perHome: true },
      { key: 'appliances', label: 'Appliances per home', perHome: true },
      { key: 'accessibility', label: 'Accessibility modifications per home', perHome: true },
      { key: 'permits', label: 'Permits' },
      { key: 'inspections', label: 'Inspections' },
    ],
  },
  {
    key: 'shared',
    label: 'Shared Facility Costs',
    fields: [
      { key: 'community_center', label: 'Community center' },
      { key: 'training_room', label: 'Training room' },
      { key: 'computer_lab', label: 'Computer lab' },
      { key: 'offices', label: 'Offices' },
      { key: 'counseling_space', label: 'Counseling space' },
      { key: 'shared_kitchen', label: 'Shared kitchen' },
      { key: 'laundry', label: 'Laundry facilities' },
      { key: 'storage', label: 'Storage' },
      { key: 'maintenance_building', label: 'Maintenance building' },
      { key: 'outdoor_gathering', label: 'Outdoor gathering space' },
    ],
  },
  {
    key: 'professional',
    label: 'Professional and Administrative Costs',
    fields: [
      { key: 'architecture', label: 'Architecture' },
      { key: 'engineering', label: 'Engineering' },
      { key: 'legal', label: 'Legal' },
      { key: 'accounting', label: 'Accounting' },
      { key: 'grant_writing', label: 'Grant writing' },
      { key: 'project_management', label: 'Project management' },
      { key: 'insurance', label: 'Insurance' },
      { key: 'marketing', label: 'Marketing' },
      { key: 'fundraising', label: 'Fundraising' },
      { key: 'technology', label: 'Technology systems' },
      { key: 'pre_opening_staffing', label: 'Pre-opening staffing' },
      { key: 'resident_recruitment', label: 'Resident recruitment' },
    ],
  },
];

export interface BudgetRow {
  homes_count: number;
  cost_per_home: number;
  contingency_pct: number;
  funding_secured: number;
  line_items: Record<string, number>;
}

export interface BudgetTotals {
  land: number;
  utility: number;
  housing: number;
  shared: number;
  professional: number;
  homesBase: number;
  subtotal: number;
  contingency: number;
  total: number;
  perHome: number;
  perResident: number;
  fundingGap: number;
  pctFunded: number;
}

export function computeBudget(row: BudgetRow, residents?: number): BudgetTotals {
  const li = row.line_items ?? {};
  const homes = Math.max(0, Number(row.homes_count) || 0);
  const val = (k: string) => Number(li[k]) || 0;

  const groupTotal = (g: BudgetGroup) =>
    g.fields.reduce((sum, f) => sum + val(f.key) * (f.perHome ? homes : 1), 0);

  const land = groupTotal(BUDGET_GROUPS[0]);
  const utility = groupTotal(BUDGET_GROUPS[1]);
  const homesBase = homes * (Number(row.cost_per_home) || 0);
  const housing = groupTotal(BUDGET_GROUPS[2]) + homesBase;
  const shared = groupTotal(BUDGET_GROUPS[3]);
  const professional = groupTotal(BUDGET_GROUPS[4]);

  const subtotal = land + utility + housing + shared + professional;
  const contingency = subtotal * ((Number(row.contingency_pct) || 0) / 100);
  const total = subtotal + contingency;
  const residentCount = residents && residents > 0 ? residents : homes;

  const secured = Number(row.funding_secured) || 0;

  return {
    land,
    utility,
    housing,
    shared,
    professional,
    homesBase,
    subtotal,
    contingency,
    total,
    perHome: homes ? total / homes : 0,
    perResident: residentCount ? total / residentCount : 0,
    fundingGap: Math.max(0, total - secured),
    pctFunded: total > 0 ? (secured / total) * 100 : 0,
  };
}

export const BUDGET_SCENARIOS = ['low', 'expected', 'high'] as const;

// Preliminary planning scenarios (ranges only — must be replaced with local bids).
export const PRELIMINARY_SCENARIOS = [
  {
    name: 'Small Pilot Village',
    homes: 6,
    center: 'Small shared facility',
    landLow: 150000, landHigh: 350000,
    homesLow: 600000, homesHigh: 1200000,
    sharedLow: 250000, sharedHigh: 600000,
    totalLow: 1000000, totalHigh: 2150000,
  },
  {
    name: 'Medium Village',
    homes: 12,
    center: 'Full training and support facility',
    landLow: 250000, landHigh: 600000,
    homesLow: 1200000, homesHigh: 2400000,
    sharedLow: 500000, sharedHigh: 1000000,
    totalLow: 1950000, totalHigh: 4000000,
  },
  {
    name: 'Expanded Village',
    homes: 20,
    center: 'Comprehensive resident development center',
    landLow: 350000, landHigh: 900000,
    homesLow: 2000000, homesHigh: 4000000,
    sharedLow: 750000, sharedHigh: 1500000,
    totalLow: 3100000, totalHigh: 6400000,
  },
];

// ============================================================
// Operating budget
// ============================================================

export const OPERATING_EXPENSE_FIELDS: { key: string; label: string }[] = [
  { key: 'property_management', label: 'Property management' },
  { key: 'village_director', label: 'Village director' },
  { key: 'resident_support_staff', label: 'Resident support staff' },
  { key: 'case_management', label: 'Case-management services' },
  { key: 'security', label: 'Security' },
  { key: 'utilities', label: 'Utilities' },
  { key: 'internet', label: 'Internet' },
  { key: 'insurance', label: 'Insurance' },
  { key: 'property_taxes', label: 'Property taxes, if applicable' },
  { key: 'repairs', label: 'Repairs' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'landscaping', label: 'Landscaping' },
  { key: 'snow_removal', label: 'Snow removal' },
  { key: 'cleaning', label: 'Cleaning' },
  { key: 'program_supplies', label: 'Program supplies' },
  { key: 'transportation_assistance', label: 'Transportation assistance' },
  { key: 'emergency_assistance', label: 'Resident emergency assistance' },
  { key: 'food_household', label: 'Food and household support' },
  { key: 'financial_education', label: 'Financial education' },
  { key: 'employment_programs', label: 'Employment programs' },
  { key: 'mental_health_referrals', label: 'Mental health referrals' },
  { key: 'technology', label: 'Technology' },
  { key: 'legal', label: 'Legal' },
  { key: 'accounting', label: 'Accounting' },
  { key: 'fundraising', label: 'Fundraising' },
  { key: 'volunteer_training', label: 'Volunteer training' },
  { key: 'reserve_contributions', label: 'Reserve contributions' },
];

export const OPERATING_INCOME_FIELDS: { key: string; label: string }[] = [
  { key: 'earned_income', label: 'Earned income' },
  { key: 'donations', label: 'Donations' },
  { key: 'grants', label: 'Grants' },
  { key: 'sponsorships', label: 'Sponsorships' },
  { key: 'resident_contributions', label: 'Resident contributions' },
];

export interface OperatingTotals {
  monthlyExpense: number;
  annualExpense: number;
  costPerHome: number;
  costPerResident: number;
  annualIncome: number;
  fundingGap: number;
  requiredReserve: number;
}

// All operating amounts are entered as MONTHLY figures.
export function computeOperating(
  expenses: Record<string, number>,
  income: Record<string, number>,
  homes: number,
  residents: number,
  reserveMonths: number,
): OperatingTotals {
  const monthlyExpense = OPERATING_EXPENSE_FIELDS.reduce((s, f) => s + (Number(expenses?.[f.key]) || 0), 0);
  const monthlyIncome = OPERATING_INCOME_FIELDS.reduce((s, f) => s + (Number(income?.[f.key]) || 0), 0);
  const annualExpense = monthlyExpense * 12;
  const annualIncome = monthlyIncome * 12;
  return {
    monthlyExpense,
    annualExpense,
    costPerHome: homes > 0 ? annualExpense / homes : 0,
    costPerResident: residents > 0 ? annualExpense / residents : 0,
    annualIncome,
    fundingGap: annualExpense - annualIncome,
    requiredReserve: monthlyExpense * (Number(reserveMonths) || 0),
  };
}

// ============================================================
// Resident housing model
// ============================================================

export const HOUSING_MODELS = [
  'Transitional housing',
  'Supportive housing',
  'Affordable rental housing',
  'Graduated-rent housing',
  'Education-based residency',
  'Employment-based residency',
  'Savings-matched residency',
  'Rent-to-independence program',
];

export const RESIDENCY_RULE_FIELDS: { key: string; label: string; type: 'text' | 'number' }[] = [
  { key: 'age_range', label: 'Resident age range', type: 'text' },
  { key: 'max_stay_months', label: 'Maximum length of stay (months)', type: 'number' },
  { key: 'monthly_contribution', label: 'Monthly resident contribution ($)', type: 'number' },
  { key: 'security_deposit', label: 'Security deposit ($)', type: 'number' },
  { key: 'required_savings_pct', label: 'Required savings percentage (%)', type: 'number' },
  { key: 'employment_expectation', label: 'Employment expectation', type: 'text' },
  { key: 'education_expectation', label: 'Education expectation', type: 'text' },
  { key: 'mentoring_expectation', label: 'Mentoring expectation', type: 'text' },
  { key: 'financial_education_requirement', label: 'Financial education requirement', type: 'text' },
  { key: 'community_service_expectation', label: 'Community service expectation', type: 'text' },
  { key: 'completion_requirements', label: 'Program completion requirements', type: 'text' },
  { key: 'extension_policy', label: 'Extension policy', type: 'text' },
  { key: 'graduation_criteria', label: 'Graduation criteria', type: 'text' },
];

export const RESIDENT_READINESS_KEYS: { key: string; label: string }[] = [
  { key: 'employed', label: 'Employed' },
  { key: 'enrolled_education', label: 'Enrolled in education' },
  { key: 'finished_financial_ed', label: 'Completed financial education' },
  { key: 'has_bank_account', label: 'Banking access established' },
  { key: 'credit_improved', label: 'Credit improved' },
  { key: 'reliable_transportation', label: 'Reliable transportation' },
  { key: 'mentor_assigned', label: 'Mentor assigned' },
];

export function residentReadiness(r: Record<string, unknown>): number {
  const hits = RESIDENT_READINESS_KEYS.filter((k) => !!r[k.key]).length;
  const savingsBonus = (Number(r.emergency_savings) || 0) >= 1000 ? 1 : 0;
  return Math.round(((hits + savingsBonus) / (RESIDENT_READINESS_KEYS.length + 1)) * 100);
}

// ============================================================
// Resident support programs
// ============================================================

export const PROGRAM_SEEDS = [
  'Financial literacy',
  'Budget development',
  'Credit education',
  'Banking access',
  'Emergency savings',
  'Employment preparation',
  'Resume support',
  'Interview preparation',
  'Career coaching',
  'Trade and certification pathways',
  'College support',
  'Transportation planning',
  'Cooking and nutrition',
  'Household management',
  'Conflict resolution',
  'Mental health referrals',
  'Healthcare navigation',
  'Mentoring',
  'Entrepreneurship',
  'Tenant education',
  'Homeownership preparation',
];

export const PROGRAM_STATUSES = ['Planned', 'In Development', 'Partner Needed', 'Piloting', 'Active', 'Paused'];

// ============================================================
// Partners
// ============================================================

export const PARTNER_CATEGORIES = [
  'County children services',
  'Foster care agencies',
  'Independent living programs',
  'Housing organizations',
  'Workforce development agencies',
  'Employers',
  'Trade schools',
  'Community colleges',
  'Universities',
  'Banks',
  'Credit unions',
  'Financial educators',
  'Mental health providers',
  'Healthcare providers',
  'Legal aid',
  'Transportation providers',
  'Churches',
  'Fraternities and sororities',
  'Foundations',
  'Corporate sponsors',
  'Construction companies',
  'Architects',
  'Real estate professionals',
  'Mentoring organizations',
];

export const PARTNER_STATUSES = [
  'Researching',
  'Not Contacted',
  'Contacted',
  'Follow-Up Needed',
  'Meeting Scheduled',
  'Letter of Support',
  'Proposed Partner',
  'Active Partner',
  'Declined',
  'Inactive',
];

// ============================================================
// Funding
// ============================================================

export const FUNDING_CATEGORIES = [
  'Montgomery family contributions',
  'Medical housing profit allocation',
  'Private donations',
  'Major donors',
  'Foundation grants',
  'Government grants',
  'Housing grants',
  'Community development funds',
  'Corporate sponsorships',
  'Church partnerships',
  'Fraternity and sorority partnerships',
  'Capital campaign',
  'Fundraising events',
  'Naming opportunities',
  'Social impact investments',
  'Low-interest community development loans',
  'In-kind construction support',
  'Donated land',
  'Donated tiny homes',
  'Donated furnishings',
  'Volunteer labor',
];

export const FUNDING_STATUSES = [
  'Researching',
  'Identified',
  'Preparing Request',
  'Requested',
  'Under Review',
  'Committed',
  'Received',
  'Declined',
  'Withdrawn',
];

export interface FundingRollup {
  cashReceived: number;
  pledges: number;
  pendingRequests: number;
  inKind: number;
  remainingCashGap: number;
  remainingTotalGap: number;
  pctFunded: number;
  nextDeadline: { source: string; date: string } | null;
  largestUnsecuredCategory: { category: string; amount: number } | null;
}

export function rollupFunding(rows: any[], projectGoal: number): FundingRollup {
  let cashReceived = 0;
  let pledges = 0;
  let pendingRequests = 0;
  let inKind = 0;
  const unsecuredByCategory: Record<string, number> = {};
  let nextDeadline: { source: string; date: string } | null = null;

  for (const r of rows ?? []) {
    const received = Number(r.received_amount) || 0;
    const committed = Number(r.committed_amount) || 0;
    const requested = Number(r.requested_amount) || 0;
    const target = Number(r.target_amount) || 0;

    if (r.is_inkind) {
      inKind += received || committed || requested || target;
    } else {
      cashReceived += received;
      pledges += Math.max(0, committed - received);
      if (['Requested', 'Under Review', 'Preparing Request'].includes(r.status)) {
        pendingRequests += Math.max(0, requested - committed);
      }
    }

    const unsecured = Math.max(0, target - Math.max(received, committed));
    if (unsecured > 0) {
      unsecuredByCategory[r.category] = (unsecuredByCategory[r.category] || 0) + unsecured;
    }

    if (r.application_deadline && !['Received', 'Declined', 'Withdrawn'].includes(r.status)) {
      if (!nextDeadline || r.application_deadline < nextDeadline.date) {
        nextDeadline = { source: r.source, date: r.application_deadline };
      }
    }
  }

  const largest = Object.entries(unsecuredByCategory).sort((a, b) => b[1] - a[1])[0];

  return {
    cashReceived,
    pledges,
    pendingRequests,
    inKind,
    remainingCashGap: Math.max(0, projectGoal - cashReceived - pledges),
    remainingTotalGap: Math.max(0, projectGoal - cashReceived - pledges - inKind),
    pctFunded: projectGoal > 0 ? ((cashReceived + pledges + inKind) / projectGoal) * 100 : 0,
    nextDeadline,
    largestUnsecuredCategory: largest ? { category: largest[0], amount: largest[1] } : null,
  };
}

// ============================================================
// Wealth With Purpose funding connection
// ============================================================

export const ALLOCATION_MODES: { value: string; label: string }[] = [
  { value: 'percent_net_profit', label: 'A percentage of annual medical housing net profit' },
  { value: 'fixed_annual', label: 'A fixed annual contribution' },
  { value: 'percent_sale', label: 'A percentage of property sale proceeds' },
  { value: 'percent_refi', label: 'A percentage of refinancing proceeds' },
  { value: 'separate_charitable', label: 'A separate charitable contribution' },
  { value: 'none', label: 'No automatic allocation' },
];

export const SUGGESTED_ALLOCATION_PCTS = [5, 10, 15, 20];

export function computeAllocation(s: any, saleProceeds = 0, refiProceeds = 0): number {
  const profit = Number(s?.mh_annual_net_profit) || 0;
  const pct = (Number(s?.allocation_percent) || 0) / 100;
  switch (s?.allocation_mode) {
    case 'percent_net_profit': return profit * pct;
    case 'fixed_annual': return Number(s?.allocation_fixed_annual) || 0;
    case 'percent_sale': return saleProceeds * ((Number(s?.allocation_sale_percent) || 0) / 100);
    case 'percent_refi': return refiProceeds * ((Number(s?.allocation_refi_percent) || 0) / 100);
    case 'separate_charitable': return Number(s?.allocation_fixed_annual) || 0;
    default: return 0;
  }
}

// ============================================================
// Risk register
// ============================================================

export const RISK_SEEDS = [
  'Zoning denial',
  'Land-use restrictions',
  'Neighborhood opposition',
  'Construction cost increases',
  'Utility access',
  'Funding shortfall',
  'Grant restrictions',
  'Operating deficit',
  'Staffing shortages',
  'Resident safety',
  'Insurance limitations',
  'Legal liability',
  'Partner withdrawal',
  'Transportation barriers',
  'Employment access',
  'Program capacity',
  'Property maintenance',
  'Leadership succession',
  'Mission drift',
  'Resident privacy',
];

export const RISK_RATINGS = ['Low', 'Moderate', 'High', 'Critical'];
export const RISK_STATUSES = ['Open', 'Monitoring', 'Mitigating', 'Accepted', 'Closed'];

export function overallRiskRating(probability: string, financial: string, program: string): string {
  const score = (v: string) => RISK_RATINGS.indexOf(v) + 1 || 2;
  const avg = (score(probability) + score(financial) + score(program)) / 3;
  if (avg >= 3.6) return 'Critical';
  if (avg >= 2.8) return 'High';
  if (avg >= 1.8) return 'Moderate';
  return 'Low';
}

// ============================================================
// Impact metrics
// ============================================================

export const IMPACT_METRICS: { key: string; label: string; kind: 'count' | 'pct' | 'money' | 'months' }[] = [
  { key: 'homes_completed', label: 'Homes completed', kind: 'count' },
  { key: 'residents_housed', label: 'Residents housed', kind: 'count' },
  { key: 'avg_length_of_stay', label: 'Average length of stay', kind: 'months' },
  { key: 'housing_stability', label: 'Housing stability', kind: 'pct' },
  { key: 'residents_employed', label: 'Residents employed', kind: 'count' },
  { key: 'residents_education', label: 'Residents enrolled in education', kind: 'count' },
  { key: 'residents_certifications', label: 'Residents earning certifications', kind: 'count' },
  { key: 'residents_financial_ed', label: 'Residents completing financial education', kind: 'count' },
  { key: 'residents_bank_accounts', label: 'Residents opening bank accounts', kind: 'count' },
  { key: 'residents_savings', label: 'Residents establishing emergency savings', kind: 'count' },
  { key: 'residents_credit', label: 'Residents improving credit', kind: 'count' },
  { key: 'residents_transportation', label: 'Residents obtaining reliable transportation', kind: 'count' },
  { key: 'residents_permanent_housing', label: 'Residents transitioning to permanent housing', kind: 'count' },
  { key: 'residents_completed', label: 'Residents completing the program', kind: 'count' },
  { key: 'mentor_participation', label: 'Mentor participation', kind: 'count' },
  { key: 'volunteer_participation', label: 'Volunteer participation', kind: 'count' },
  { key: 'employer_partnerships', label: 'Employer partnerships', kind: 'count' },
  { key: 'community_partnerships', label: 'Community partnerships', kind: 'count' },
  { key: 'resident_satisfaction', label: 'Resident satisfaction', kind: 'pct' },
  { key: 'annual_operating_cost', label: 'Annual operating cost', kind: 'money' },
  { key: 'cost_per_resident', label: 'Cost per resident', kind: 'money' },
  { key: 'funds_raised', label: 'Funds raised', kind: 'money' },
  { key: 'program_completion_rate', label: 'Program completion rate', kind: 'pct' },
];

// ============================================================
// Documents
// ============================================================

export const DOCUMENT_TYPES = [
  'Feasibility studies',
  'Community-needs assessments',
  'Land evaluations',
  'Surveys',
  'Environmental reports',
  'Zoning correspondence',
  'Site plans',
  'Architectural plans',
  'Construction bids',
  'Grant applications',
  'Donor agreements',
  'Partner agreements',
  'Resident policies',
  'Resident agreements',
  'Program curriculum',
  'Safety policies',
  'Emergency procedures',
  'Insurance',
  'Legal opinions',
  'Board approvals',
  'Financial reports',
  'Impact reports',
];

export const DOCUMENT_TAGS = [
  'Land',
  'Zoning',
  'Construction',
  'Funding',
  'Grants',
  'Residents',
  'Programs',
  'Partners',
  'Legal',
  'Insurance',
  'Operations',
  'Impact',
];

export const DOCUMENT_STATUSES = ['Draft', 'In Review', 'Final', 'Signed', 'Expired'];

// ============================================================
// Formatting helpers
// ============================================================

export const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number.isFinite(n) ? n : 0,
  );

export const moneyRange = (lo: number, hi: number) => `${money(lo)} – ${money(hi)}`;

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(0)}%`;
