// Operations layer for the Family Foundation: funding, investments, governance,
// compliance, impact, succession. Educational planning only.

export const DONOR_TYPES = ['individual', 'family', 'corporate', 'foundation', 'daf', 'government', 'faith'] as const;
export const GIFT_TYPES = ['cash', 'stock', 'qcd', 'daf_grant', 'grant', 'pledge', 'in_kind', 'bequest'] as const;
export const ASSET_CLASSES = [
  'equity',
  'fixed_income',
  'cash',
  'real_estate',
  'private',
  'alternatives',
] as const;
export const GOVERNANCE_TYPES = ['board_member', 'officer', 'committee', 'meeting', 'policy'] as const;
export const COMPLIANCE_CATEGORIES = [
  'filing',
  'registration',
  'policy',
  'insurance',
  'audit',
  'grant_admin',
] as const;
export const COMPLIANCE_STATUSES = ['not_started', 'in_progress', 'filed', 'complete', 'overdue'] as const;
export const SUCCESSION_STATUSES = ['identified', 'training', 'ready', 'transitioned', 'vacant'] as const;
export const DOC_CATEGORIES = [
  'formation',
  'irs',
  'governance',
  'financial',
  'grants',
  'insurance',
  'contracts',
  'impact',
] as const;

export const currency0 = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

export const pct = (n: number) => `${Math.round((n || 0) * 100)}%`;

/* ------------------------------- seeds ---------------------------------- */

export const COMPLIANCE_SEEDS = [
  { item: 'Articles of incorporation filed with Ohio Secretary of State', category: 'filing', authority: 'Ohio SOS', frequency: 'one_time', sort_order: 1 },
  { item: 'Bylaws adopted by the board', category: 'governance', authority: 'Board', frequency: 'one_time', sort_order: 2 },
  { item: 'IRS Form 1023 — 501(c)(3) exemption application', category: 'irs', authority: 'IRS', frequency: 'one_time', sort_order: 3 },
  { item: 'EIN obtained (Form SS-4)', category: 'irs', authority: 'IRS', frequency: 'one_time', sort_order: 4 },
  { item: 'Form 990-PF annual return', category: 'filing', authority: 'IRS', frequency: 'annual', sort_order: 5 },
  { item: 'Ohio charitable trust registration & annual report', category: 'registration', authority: 'Ohio AG', frequency: 'annual', sort_order: 6 },
  { item: '5% minimum distribution requirement met', category: 'filing', authority: 'IRS', frequency: 'annual', sort_order: 7 },
  { item: 'Conflict-of-interest policy signed by all directors', category: 'policy', authority: 'Board', frequency: 'annual', sort_order: 8 },
  { item: 'Document retention & whistleblower policies adopted', category: 'policy', authority: 'Board', frequency: 'one_time', sort_order: 9 },
  { item: 'Investment & spending policy statement adopted', category: 'policy', authority: 'Board', frequency: 'annual', sort_order: 10 },
  { item: 'Directors & officers (D&O) liability insurance in force', category: 'insurance', authority: 'Carrier', frequency: 'annual', sort_order: 11 },
  { item: 'General liability / property insurance in force', category: 'insurance', authority: 'Carrier', frequency: 'annual', sort_order: 12 },
  { item: 'Annual financial review or audit completed', category: 'audit', authority: 'CPA', frequency: 'annual', sort_order: 13 },
  { item: 'Grant agreements and expenditure responsibility files current', category: 'grant_admin', authority: 'Board', frequency: 'annual', sort_order: 14 },
  { item: 'Self-dealing review — no prohibited transactions with disqualified persons', category: 'filing', authority: 'IRS', frequency: 'annual', sort_order: 15 },
  { item: 'Board minutes signed and archived for every meeting', category: 'governance', authority: 'Board', frequency: 'annual', sort_order: 16 },
];

export const GOVERNANCE_SEEDS = [
  { record_type: 'board_member', name: 'Dr. Lyman A. Montgomery', role: 'Founder & Board Chair', committee: 'Executive', sort_order: 1 },
  { record_type: 'officer', name: 'Treasurer (to be seated)', role: 'Treasurer', committee: 'Finance & Audit', status: 'vacant', sort_order: 2 },
  { record_type: 'officer', name: 'Secretary (to be seated)', role: 'Secretary', committee: 'Governance', status: 'vacant', sort_order: 3 },
  { record_type: 'board_member', name: 'Independent director (to be recruited)', role: 'Director', committee: 'Grants', status: 'vacant', is_independent: true, sort_order: 4 },
  { record_type: 'committee', name: 'Finance & Audit Committee', role: 'Oversees budget, investments, 990-PF, audit', sort_order: 5 },
  { record_type: 'committee', name: 'Grants Committee', role: 'Reviews applications, due diligence, awards', sort_order: 6 },
  { record_type: 'committee', name: 'Governance & Nominating Committee', role: 'Board recruitment, policies, succession', sort_order: 7 },
];

export const SUCCESSION_SEEDS = [
  { role_title: 'Board Chair', current_holder: 'Dr. Lyman A. Montgomery', generation: 'g2', readiness: 1, status: 'identified', training_plan: 'Shadow chair for two full grant cycles; lead one annual meeting.', sort_order: 1 },
  { role_title: 'Treasurer / Finance Lead', generation: 'g2', readiness: 1, status: 'vacant', training_plan: 'Read the 990-PF line by line; build the annual budget with the CPA.', sort_order: 2 },
  { role_title: 'Grants Committee Chair', generation: 'g2', readiness: 1, status: 'vacant', training_plan: 'Run due diligence on three grantees under supervision.', sort_order: 3 },
  { role_title: 'Family Historian / Story Keeper', generation: 'g3', readiness: 1, status: 'identified', training_plan: 'Record two founder interviews per year; maintain the legacy map.', sort_order: 4 },
  { role_title: 'Investment Committee Liaison', generation: 'g2', readiness: 1, status: 'vacant', training_plan: 'Attend advisor reviews; present allocation vs policy annually.', sort_order: 5 },
];

export const IMPACT_SEEDS = [
  { metric_name: 'Residents housed in stable housing', unit: 'people', target: 24, sort_order: 1 },
  { metric_name: 'Participants completing financial literacy curriculum', unit: 'people', target: 250, sort_order: 2 },
  { metric_name: 'Average credit score lift', unit: 'points', target: 75, sort_order: 3 },
  { metric_name: 'Scholarships awarded', unit: 'awards', target: 60, sort_order: 4 },
  { metric_name: 'Preventive screenings funded', unit: 'screenings', target: 150, sort_order: 5 },
  { metric_name: 'Businesses funded through micro-grants', unit: 'businesses', target: 40, sort_order: 6 },
  { metric_name: 'Jobs created by grantee businesses', unit: 'jobs', target: 25, sort_order: 7 },
  { metric_name: 'Dollars granted per dollar of overhead', unit: 'ratio', target: 8, sort_order: 8 },
];

/* ------------------------------ engines ---------------------------------- */

export function rollupFunding(gifts: any[]) {
  const received = gifts.reduce((s, g) => s + Number(g.amount || 0), 0);
  const pledged = gifts.reduce((s, g) => s + Number(g.pledge_total || 0), 0);
  const outstanding = gifts.reduce((s, g) => s + Number(g.pledge_balance || 0), 0);
  const restricted = gifts.filter((g) => g.is_restricted).reduce((s, g) => s + Number(g.amount || 0), 0);
  const donors = new Set(gifts.map((g) => (g.donor_name || '').trim().toLowerCase()).filter(Boolean));
  const unacknowledged = gifts.filter((g) => Number(g.amount) > 0 && !g.acknowledged_at).length;
  const noReceipt = gifts.filter((g) => Number(g.amount) > 0 && !g.receipt_sent).length;
  const byType: Record<string, number> = {};
  gifts.forEach((g) => {
    byType[g.gift_type] = (byType[g.gift_type] || 0) + Number(g.amount || 0);
  });
  const top = [...gifts]
    .filter((g) => Number(g.amount) > 0)
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5);
  return {
    received,
    pledged,
    outstanding,
    restricted,
    unrestricted: Math.max(0, received - restricted),
    donorCount: donors.size,
    giftCount: gifts.length,
    averageGift: gifts.length ? received / gifts.length : 0,
    unacknowledged,
    noReceipt,
    byType,
    top,
  };
}

export function rollupInvestments(holdings: any[], settings: any | null) {
  const marketValue = holdings.reduce((s, h) => s + Number(h.market_value || 0), 0);
  const basis = holdings.reduce((s, h) => s + Number(h.cost_basis || 0), 0);
  const income = holdings.reduce((s, h) => s + Number(h.market_value || 0) * (Number(h.income_yield || 0) / 100), 0);
  const gain = marketValue - basis;
  const byClass: Record<string, { value: number; target: number }> = {};
  holdings.forEach((h) => {
    const c = h.asset_class || 'equity';
    byClass[c] = byClass[c] || { value: 0, target: 0 };
    byClass[c].value += Number(h.market_value || 0);
    byClass[c].target += Number(h.target_allocation_pct || 0);
  });
  const drift = Object.entries(byClass).map(([cls, v]) => {
    const actualPct = marketValue > 0 ? (v.value / marketValue) * 100 : 0;
    return { cls, value: v.value, actualPct, targetPct: v.target, drift: actualPct - v.target };
  });
  // Private foundations must distribute ~5% of net investment assets annually.
  const requiredDistribution = marketValue * 0.05;
  const spendingPolicyPct = Number(settings?.spending_policy_pct ?? 5);
  return {
    marketValue,
    basis,
    gain,
    gainPct: basis > 0 ? gain / basis : 0,
    income,
    requiredDistribution,
    spendingPolicyPct,
    plannedSpend: marketValue * (spendingPolicyPct / 100),
    drift: drift.sort((a, b) => Math.abs(b.drift) - Math.abs(a.drift)),
    holdingCount: holdings.length,
  };
}

export function rollupCompliance(items: any[]) {
  const today = new Date().toISOString().slice(0, 10);
  const done = items.filter((i) => i.completed_at || i.status === 'complete' || i.status === 'filed');
  const overdue = items.filter(
    (i) => !i.completed_at && i.due_date && i.due_date < today && i.status !== 'complete' && i.status !== 'filed',
  );
  const upcoming = items
    .filter((i) => !i.completed_at && i.due_date && i.due_date >= today)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)))
    .slice(0, 6);
  const score = items.length ? done.length / items.length : 0;
  return { total: items.length, done: done.length, overdue, upcoming, score };
}

export function rollupGovernance(rows: any[]) {
  const members = rows.filter((r) => r.record_type === 'board_member' || r.record_type === 'officer');
  const seated = members.filter((r) => r.status !== 'vacant');
  const independent = seated.filter((r) => r.is_independent);
  const committees = rows.filter((r) => r.record_type === 'committee');
  const meetings = rows
    .filter((r) => r.record_type === 'meeting' && r.meeting_date)
    .sort((a, b) => String(b.meeting_date).localeCompare(String(a.meeting_date)));
  const year = new Date().getFullYear();
  const meetingsThisYear = meetings.filter((m) => String(m.meeting_date).startsWith(String(year))).length;
  const disclosures = seated.filter((r) => r.conflict_disclosed).length;
  const score =
    (Math.min(1, seated.length / 3) * 0.35 +
      Math.min(1, committees.length / 3) * 0.2 +
      Math.min(1, meetingsThisYear / 4) * 0.25 +
      (seated.length ? disclosures / seated.length : 0) * 0.2);
  return {
    seated: seated.length,
    vacancies: members.length - seated.length,
    independent: independent.length,
    committees: committees.length,
    meetings,
    meetingsThisYear,
    disclosures,
    score,
  };
}

export function rollupImpact(metrics: any[]) {
  const scored = metrics.map((m) => {
    const target = Number(m.target || 0);
    const actual = Number(m.actual || 0);
    const baseline = Number(m.baseline || 0);
    const denom = target - baseline;
    const progress = denom > 0 ? Math.max(0, Math.min(1, (actual - baseline) / denom)) : target > 0 ? Math.min(1, actual / target) : 0;
    return { ...m, progress };
  });
  const average = scored.length ? scored.reduce((s, m) => s + m.progress, 0) / scored.length : 0;
  const onTrack = scored.filter((m) => m.progress >= 0.7).length;
  const atRisk = scored.filter((m) => m.progress < 0.35);
  return { metrics: scored, average, onTrack, atRisk, total: scored.length };
}

export function rollupSuccession(rows: any[]) {
  const filled = rows.filter((r) => r.successor_name);
  const ready = rows.filter((r) => r.status === 'ready' || r.status === 'transitioned');
  const avgReadiness = rows.length ? rows.reduce((s, r) => s + Number(r.readiness || 0), 0) / rows.length : 0;
  const coverage = rows.length ? filled.length / rows.length : 0;
  const score = coverage * 0.5 + (avgReadiness / 5) * 0.5;
  return { total: rows.length, filled: filled.length, ready: ready.length, avgReadiness, coverage, score };
}

/**
 * Institutional Legacy Score — blends the six operating dimensions of a real
 * private foundation with the strategic readiness already tracked on the
 * executive dashboard.
 */
export function legacyScore(input: {
  readiness: number; // 0-100 strategic readiness from rollupFoundation
  funding: ReturnType<typeof rollupFunding>;
  investments: ReturnType<typeof rollupInvestments>;
  compliance: ReturnType<typeof rollupCompliance>;
  governance: ReturnType<typeof rollupGovernance>;
  impact: ReturnType<typeof rollupImpact>;
  succession: ReturnType<typeof rollupSuccession>;
  endowmentTarget: number;
}) {
  const fundingScore = input.endowmentTarget > 0
    ? Math.min(1, (input.funding.received + input.funding.outstanding) / input.endowmentTarget)
    : Math.min(1, input.funding.received / 100000);
  const investmentScore = input.investments.marketValue > 0
    ? Math.min(1, 0.6 + 0.4 * (1 - Math.min(1, Math.abs(input.investments.drift[0]?.drift ?? 0) / 25)))
    : 0;

  const dimensions = [
    { key: 'strategy', label: 'Strategy & readiness', value: input.readiness / 100, weight: 0.2 },
    { key: 'funding', label: 'Funding & donors', value: fundingScore, weight: 0.15 },
    { key: 'investments', label: 'Endowment & investments', value: investmentScore, weight: 0.15 },
    { key: 'governance', label: 'Governance', value: input.governance.score, weight: 0.15 },
    { key: 'compliance', label: 'Compliance', value: input.compliance.score, weight: 0.15 },
    { key: 'impact', label: 'Measured impact', value: input.impact.average, weight: 0.1 },
    { key: 'succession', label: 'Succession', value: input.succession.score, weight: 0.1 },
  ];

  const total = Math.round(dimensions.reduce((s, d) => s + d.value * d.weight, 0) * 100);
  const weakest = [...dimensions].sort((a, b) => a.value - b.value).slice(0, 3);
  return { total, dimensions, weakest, label: legacyScoreLabel(total) };
}

export function legacyScoreLabel(score: number) {
  if (score >= 85) return 'Perpetual institution';
  if (score >= 70) return 'Institutional';
  if (score >= 50) return 'Operating';
  if (score >= 30) return 'Emerging';
  if (score >= 15) return 'Forming';
  return 'Pre-launch';
}
