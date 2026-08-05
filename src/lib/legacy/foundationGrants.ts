// Grant operations, insurance register, minimum distribution math, expense
// allocation, and peer benchmarking for the Family Foundation module.
// Educational planning only — not legal, tax, or investment advice.

export const GRANT_TYPES = [
  { value: 'grant', label: 'Program grant (organization)' },
  { value: 'scholarship', label: 'Scholarship (individual)' },
  { value: 'hardship', label: 'Hardship / emergency aid' },
  { value: 'capacity', label: 'Capacity building' },
  { value: 'capital', label: 'Capital / facilities' },
] as const;

/** Ordered lifecycle used for the pipeline board and completion math. */
export const GRANT_STAGES = [
  { value: 'inquiry', label: 'Inquiry' },
  { value: 'application', label: 'Application received' },
  { value: 'due_diligence', label: 'Due diligence' },
  { value: 'board_review', label: 'Board / committee review' },
  { value: 'approved', label: 'Approved' },
  { value: 'agreement', label: 'Agreement signed' },
  { value: 'paid', label: 'Funds disbursed' },
  { value: 'reporting', label: 'Reporting' },
  { value: 'closed', label: 'Closed' },
  { value: 'declined', label: 'Declined' },
] as const;

export const OPEN_STAGES = ['inquiry', 'application', 'due_diligence', 'board_review'];

export const COVERAGE_TYPES = [
  { value: 'do', label: 'Directors & officers (D&O)' },
  { value: 'epli', label: 'Employment practices (EPLI)' },
  { value: 'general_liability', label: 'General liability' },
  { value: 'property', label: 'Property' },
  { value: 'cyber', label: 'Cyber liability' },
  { value: 'fidelity_bond', label: 'Fidelity / crime bond' },
  { value: 'volunteer_accident', label: 'Volunteer accident' },
  { value: 'auto', label: 'Hired & non-owned auto' },
  { value: 'umbrella', label: 'Umbrella / excess' },
] as const;

export const INSURANCE_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'bound', label: 'Bound / in force' },
  { value: 'lapsed', label: 'Lapsed' },
  { value: 'not_needed', label: 'Not needed yet' },
] as const;

export const PEER_TYPES = [
  { value: 'family_foundation', label: 'Family foundation' },
  { value: 'private_foundation', label: 'Private foundation' },
  { value: 'community_foundation', label: 'Community foundation' },
  { value: 'operating_foundation', label: 'Operating foundation' },
] as const;

/* -------------------------------- seeds ---------------------------------- */

export const INSURANCE_SEEDS = [
  { coverage_type: 'do', coverage_limit: 1000000, status: 'planned', notes: 'Protects directors personally for governance decisions. Most foundations bind this before the first grant cycle.', sort_order: 1 },
  { coverage_type: 'epli', coverage_limit: 500000, status: 'planned', notes: 'Needed once the foundation has employees or paid contractors.', sort_order: 2 },
  { coverage_type: 'general_liability', coverage_limit: 1000000, status: 'planned', notes: 'Required by most venues, schools, and community partners hosting programs.', sort_order: 3 },
  { coverage_type: 'property', coverage_limit: 250000, status: 'planned', notes: 'Covers owned or leased facilities, equipment, and program supplies.', sort_order: 4 },
  { coverage_type: 'cyber', coverage_limit: 250000, status: 'planned', notes: 'Applicant and scholarship files contain personal data — treat as a breach exposure.', sort_order: 5 },
  { coverage_type: 'fidelity_bond', coverage_limit: 250000, status: 'planned', notes: 'Guards against internal theft where family members handle disbursements.', sort_order: 6 },
  { coverage_type: 'volunteer_accident', coverage_limit: 100000, status: 'planned', notes: 'Covers volunteers at mentoring, build, and workshop events.', sort_order: 7 },
];

/**
 * Illustrative peer profiles for orientation only — replace each row with real
 * figures pulled from a peer's public Form 990-PF before relying on them.
 */
export const BENCHMARK_SEEDS = [
  { peer_name: 'Small Ohio family foundation (illustrative)', peer_type: 'family_foundation', location: 'Ohio', total_assets: 1200000, annual_giving: 60000, operating_expenses: 14000, staff_count: 0, grants_count: 12, payout_pct: 5, source: 'Illustrative planning reference — replace with a real 990-PF', sort_order: 1 },
  { peer_name: 'Mid-size family foundation (illustrative)', peer_type: 'family_foundation', location: 'Midwest', total_assets: 8500000, annual_giving: 440000, operating_expenses: 96000, staff_count: 1, grants_count: 34, payout_pct: 5.2, source: 'Illustrative planning reference — replace with a real 990-PF', sort_order: 2 },
  { peer_name: 'Community foundation affiliate (illustrative)', peer_type: 'community_foundation', location: 'Northeast Ohio', total_assets: 25000000, annual_giving: 1400000, operating_expenses: 480000, staff_count: 4, grants_count: 120, payout_pct: 5.6, source: 'Illustrative planning reference — replace with published annual report', sort_order: 3 },
];

/* ------------------------------- engines --------------------------------- */

export function rollupGrants(grants: any[]) {
  const today = new Date().toISOString().slice(0, 10);
  const active = grants.filter((g) => g.stage !== 'declined');
  const awarded = active.reduce((s, g) => s + Number(g.amount_awarded || 0), 0);
  const paid = active.reduce((s, g) => s + Number(g.amount_paid || 0), 0);
  const requested = grants.reduce((s, g) => s + Number(g.amount_requested || 0), 0);
  const open = grants.filter((g) => OPEN_STAGES.includes(g.stage));
  const peopleServed = active.reduce((s, g) => s + Number(g.people_served || 0), 0);
  const scholarships = active.filter((g) => g.grant_type === 'scholarship');

  const blockers = active.filter(
    (g) =>
      ['approved', 'agreement', 'paid'].includes(g.stage) &&
      (!g.irs_status_verified || !g.conflict_screened || !g.board_approved_at),
  );
  const reportsOverdue = active.filter(
    (g) => g.report_due_date && g.report_due_date < today && !g.report_received_at,
  );
  const unsignedAgreements = active.filter(
    (g) => ['approved', 'agreement', 'paid'].includes(g.stage) && !g.agreement_signed_at,
  );

  const byStage = GRANT_STAGES.map((s) => ({
    ...s,
    rows: grants.filter((g) => g.stage === s.value),
  }));

  return {
    total: grants.length,
    awarded,
    paid,
    unpaid: Math.max(0, awarded - paid),
    requested,
    open,
    peopleServed,
    scholarshipCount: scholarships.length,
    scholarshipDollars: scholarships.reduce((s, g) => s + Number(g.amount_awarded || 0), 0),
    costPerPerson: peopleServed > 0 ? paid / peopleServed : 0,
    blockers,
    reportsOverdue,
    unsignedAgreements,
    byStage,
  };
}

/**
 * Estimated minimum required distribution for a private foundation. The IRS
 * requires roughly 5% of the average fair market value of non-charitable-use
 * assets, reduced by carryover and satisfied by qualifying distributions.
 * Final numbers come from Form 990-PF Part XI — this is a planning estimate.
 */
export function computeMinimumDistribution(input: {
  avgAssets: number;
  marketValue: number;
  carryover: number;
  qualifyingAdmin: number;
  grantsPaid: number;
  policyPct?: number;
}) {
  const base = input.avgAssets > 0 ? input.avgAssets : input.marketValue;
  const rate = 0.05;
  const required = Math.max(0, base * rate - Math.max(0, input.carryover));
  const qualifying = Math.max(0, input.grantsPaid) + Math.max(0, input.qualifyingAdmin);
  const remaining = Math.max(0, required - qualifying);
  const year = new Date().getFullYear();
  return {
    base,
    rate,
    required,
    qualifying,
    grantsPaid: input.grantsPaid,
    qualifyingAdmin: input.qualifyingAdmin,
    carryover: input.carryover,
    remaining,
    surplus: Math.max(0, qualifying - required),
    coverage: required > 0 ? Math.min(1, qualifying / required) : 1,
    // Undistributed income generally must be paid out by the end of the
    // following tax year to avoid the Section 4942 excise tax.
    dueDate: `${year + 1}-12-31`,
    policySpend: base * ((input.policyPct ?? 5) / 100),
  };
}

/** Program / administrative / fundraising split, the ratio funders look at. */
export function expenseAllocation(input: {
  grantsPaid: number;
  programSpend: number;
  adminExpense: number;
  fundraisingExpense: number;
  giftsReceived: number;
}) {
  const program = Math.max(0, input.grantsPaid + input.programSpend);
  const admin = Math.max(0, input.adminExpense);
  const fundraising = Math.max(0, input.fundraisingExpense);
  const total = program + admin + fundraising;
  return {
    program,
    admin,
    fundraising,
    total,
    programPct: total > 0 ? program / total : 0,
    adminPct: total > 0 ? admin / total : 0,
    fundraisingPct: total > 0 ? fundraising / total : 0,
    // Cost to raise a dollar — under $0.20 is generally considered efficient.
    costToRaiseADollar: input.giftsReceived > 0 ? fundraising / input.giftsReceived : 0,
    dollarsGrantedPerAdminDollar: admin > 0 ? program / admin : 0,
  };
}

export function benchmarkCompare(
  peers: any[],
  ours: { assets: number; giving: number; expenses: number; staff: number; grants: number },
) {
  const nums = (fn: (p: any) => number) =>
    peers.map(fn).filter((n) => Number.isFinite(n) && n > 0).sort((a, b) => a - b);
  const median = (arr: number[]) =>
    arr.length === 0 ? 0 : arr.length % 2 ? arr[(arr.length - 1) / 2] : (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;

  const medAssets = median(nums((p) => Number(p.total_assets)));
  const medGiving = median(nums((p) => Number(p.annual_giving)));
  const medExpenses = median(nums((p) => Number(p.operating_expenses)));
  const medPayout = median(nums((p) => Number(p.payout_pct)));
  const medStaff = median(peers.map((p) => Number(p.staff_count || 0)).sort((a, b) => a - b));
  const medGrants = median(nums((p) => Number(p.grants_count)));

  const ourPayout = ours.assets > 0 ? (ours.giving / ours.assets) * 100 : 0;
  const ourExpenseRatio = ours.giving > 0 ? ours.expenses / ours.giving : 0;
  const medExpenseRatio = medGiving > 0 ? medExpenses / medGiving : 0;

  return {
    peerCount: peers.length,
    rows: [
      { label: 'Total assets', ours: ours.assets, peer: medAssets, money: true },
      { label: 'Annual giving', ours: ours.giving, peer: medGiving, money: true },
      { label: 'Operating expenses', ours: ours.expenses, peer: medExpenses, money: true },
      { label: 'Grants awarded (count)', ours: ours.grants, peer: medGrants, money: false },
      { label: 'Paid staff', ours: ours.staff, peer: medStaff, money: false },
      { label: 'Payout rate %', ours: ourPayout, peer: medPayout, money: false, suffix: '%' },
      { label: 'Expense per giving dollar', ours: ourExpenseRatio, peer: medExpenseRatio, money: false, ratio: true },
    ],
    ourPayout,
    ourExpenseRatio,
  };
}

/* --------------------------- award letter print --------------------------- */

const esc = (s: any) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);

/** Opens a print-ready award (or scholarship) letter for signature. */
export function printAwardLetter(grant: any, foundationName: string) {
  const isScholarship = grant.grant_type === 'scholarship';
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${esc(isScholarship ? 'Scholarship Award Letter' : 'Grant Award Letter')} — ${esc(grant.grantee_name)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;max-width:7.2in;margin:0 auto;padding:0.6in;color:#10203a;line-height:1.55}
  h1{font-size:17pt;margin:0 0 2px;letter-spacing:.3px}
  .sub{font-size:9pt;letter-spacing:1.4px;text-transform:uppercase;color:#8a6d1f;margin-bottom:26px}
  h2{font-size:12pt;margin:22px 0 6px}
  ul{margin:6px 0 0 18px;padding:0}li{margin-bottom:4px}
  .terms{background:#f6f7f9;border-left:3px solid #8a6d1f;padding:10px 14px;margin:16px 0;font-size:10.5pt}
  .sig{margin-top:44px;display:flex;gap:36px}
  .sig div{flex:1;border-top:1px solid #10203a;padding-top:5px;font-size:9.5pt}
  .note{margin-top:30px;font-size:8.5pt;color:#5b6577;border-top:1px solid #dfe3ea;padding-top:8px}
  @media print{@page{margin:.6in}}
</style></head><body>
<h1>${esc(foundationName)}</h1>
<div class="sub">${isScholarship ? 'Scholarship Award Letter' : 'Grant Award Letter'} &middot; ${esc(today)}</div>

<p>${esc(grant.contact_name || grant.grantee_name)}<br>${esc(grant.grantee_name)}</p>

<p>Dear ${esc(grant.contact_name || grant.grantee_name)},</p>

<p>On behalf of the board of ${esc(foundationName)}, it is my privilege to inform you that
${isScholarship ? 'you have been selected to receive a scholarship award' : 'your organization has been approved for a grant'}
in the amount of <strong>${money(Number(grant.amount_awarded || 0))}</strong>${grant.project_title ? ` in support of <em>${esc(grant.project_title)}</em>` : ''}.</p>

${grant.charitable_purpose ? `<h2>Charitable purpose</h2><p>${esc(grant.charitable_purpose)}</p>` : ''}
${grant.purpose ? `<h2>Approved use of funds</h2><p>${esc(grant.purpose)}</p>` : ''}
${grant.selection_criteria ? `<h2>Selection criteria applied</h2><p>${esc(grant.selection_criteria)}</p>` : ''}

<div class="terms"><strong>Conditions of this award</strong>
<ul>
  <li>Funds may be used only for the charitable purpose described above.</li>
  <li>Payment schedule: ${esc(grant.payment_schedule || 'as approved by the board')}.</li>
  <li>A written report on the use of funds and outcomes achieved is due ${esc(grant.report_due_date || 'within twelve months of disbursement')}.</li>
  <li>No portion of these funds may be used for lobbying, political campaign activity, or any non-charitable purpose.</li>
  <li>Records supporting the use of funds must be retained and made available on request.</li>
  ${grant.expenditure_responsibility ? '<li>This award is subject to expenditure responsibility procedures, including reports on the use of funds.</li>' : ''}
</ul></div>

<p>We are grateful for the work you do and look forward to the impact this ${isScholarship ? 'award' : 'partnership'} will make.</p>

<div class="sig"><div>Authorized signature, ${esc(foundationName)}<br>Date</div><div>Accepted by ${esc(grant.grantee_name)}<br>Date</div></div>

<p class="note">Educational planning document generated by the family wealth operating system. Confirm all award terms,
grantee eligibility, and reporting requirements with the foundation's attorney and CPA before issuing funds. The
foundation should not be described as tax exempt until the IRS issues a determination letter.</p>
</body></html>`;

  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 350);
  return true;
}
