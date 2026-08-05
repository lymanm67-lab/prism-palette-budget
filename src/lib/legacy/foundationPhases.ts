// Foundation planning spine: turns the module's tabs into one ordered operating
// flow — Plan, Set Up, Operate, Legacy — where each step's output becomes the
// next step's input. Educational planning only; not legal or tax advice.

export type PhaseKey = 'plan' | 'setup' | 'operate' | 'legacy';

export interface PhaseMeta {
  key: PhaseKey;
  label: string;
  purpose: string;
}

export const PHASES: PhaseMeta[] = [
  {
    key: 'plan',
    label: 'Phase 1 — Plan',
    purpose:
      'Decide what the foundation exists to do, who it serves, what it will cost, and how it will be funded before a single form is filed.',
  },
  {
    key: 'setup',
    label: 'Phase 2 — Set Up',
    purpose:
      'Turn the plan into a legal entity with governance, policies, insurance, and an exemption on file so money can move lawfully.',
  },
  {
    key: 'operate',
    label: 'Phase 3 — Operate',
    purpose:
      'Run the annual cycle: raise it, invest it, grant it, measure it, file it. This is where the 5% distribution requirement lives.',
  },
  {
    key: 'legacy',
    label: 'Phase 4 — Legacy',
    purpose:
      'Make the work outlast the founders — successors trained, records searchable, benchmarks watched, and the generational map written.',
  },
];

export interface FlowContext {
  settings: any | null;
  pillars: any[];
  initiatives: any[];
  roadmap: any[];
  relationships: any[];
  gifts: any[];
  investments: any[];
  governance: any[];
  compliance: any[];
  grants: any[];
  impact: any[];
  succession: any[];
  documents: any[];
  insurance: any[];
  legacyNodes: any[];
}

export interface FlowStep {
  id: string;
  phase: PhaseKey;
  title: string;
  /** Plain-English job of this step. */
  what: string;
  /** What this step hands to the next one. */
  output: string;
  /** Which tab does the work. */
  tab: string;
  tabLabel: string;
  /** 0-1 completion. */
  progress: number;
  /** Live count / status line pulled from your data. */
  status: string;
  done: boolean;
}

const compliant = (rows: any[], needle: string) =>
  rows.find((r) => String(r.item ?? '').toLowerCase().includes(needle));

const isDone = (row: any) => !!row && ['filed', 'complete'].includes(String(row.status));

const ratio = (n: number, target: number) => (target <= 0 ? 0 : Math.max(0, Math.min(1, n / target)));

const sum = (rows: any[], field: string) => rows.reduce((t, r) => t + Number(r[field] ?? 0), 0);

export function buildFlow(ctx: FlowContext): FlowStep[] {
  const s = ctx.settings ?? {};
  const values = Array.isArray(s.core_values) ? s.core_values : [];
  const activePillars = ctx.pillars.filter((p) => p.status !== 'archived');
  const fundedPillars = activePillars.filter((p) => Number(p.annual_budget ?? 0) > 0);
  const board = ctx.governance.filter((g) => g.record_type === 'board_member' && g.status !== 'former');
  const policies = ctx.governance.filter((g) => g.record_type === 'policy');
  const signedPolicies = policies.filter((g) => g.status === 'adopted' || g.status === 'complete');
  const meetings = ctx.governance.filter((g) => g.record_type === 'meeting');
  const activePolicies = ctx.insurance.filter((i) => i.status !== 'lapsed');
  const awarded = ctx.grants.filter((g) => Number(g.amount_awarded ?? 0) > 0);
  const paid = sum(ctx.grants, 'amount_paid');
  const mrd = (Number(s.mrd_avg_assets ?? 0) * Number(s.spending_policy_pct ?? 5)) / 100;
  const measured = ctx.impact.filter((m) => Number(m.actual ?? 0) > 0);
  const filings = ctx.compliance.filter((c) => c.category === 'filing' || c.category === 'irs');
  const filingsDone = filings.filter(isDone);
  const successors = ctx.succession.filter((r) => ['ready', 'training', 'transitioned'].includes(String(r.readiness)));
  const indexed = ctx.documents.filter((d) => d.ocr_status === 'indexed');
  const milestones = ctx.roadmap.flatMap((r) => (Array.isArray(r.milestones) ? r.milestones : []));
  const milestonesDone = milestones.filter((m: any) => m?.done);

  const steps: FlowStep[] = [
    {
      id: 'mission',
      phase: 'plan',
      title: 'Write the mission, vision, and values',
      what: 'Name the problem the foundation exists to solve and the beliefs that constrain how it works.',
      output: 'Mission language every grant decision, pillar, and donor conversation is measured against.',
      tab: 'mission',
      tabLabel: 'Mission & Values',
      progress: ([s.mission, s.vision, s.legacy_statement].filter(Boolean).length + (values.length > 0 ? 1 : 0)) / 4,
      status: `${[s.mission, s.vision, s.legacy_statement].filter(Boolean).length}/3 statements written · ${values.length} core values`,
      done: !!s.mission && !!s.vision && values.length > 0,
    },
    {
      id: 'pillars',
      phase: 'plan',
      title: 'Define the impact pillars and annual budgets',
      what: 'Split the mission into the few program areas you will actually fund, each with a budget and beneficiary target.',
      output: 'Budgeted pillars that give grants, initiatives, and impact metrics something to attach to.',
      tab: 'pillars',
      tabLabel: 'Five Pillars',
      progress: ratio(fundedPillars.length, Math.max(3, activePillars.length)),
      status: `${activePillars.length} pillars · ${fundedPillars.length} with a budget · ${ctx.initiatives.length} initiatives`,
      done: fundedPillars.length >= 3,
    },
    {
      id: 'roadmap',
      phase: 'plan',
      title: 'Build the multi-year roadmap',
      what: 'Sequence the build across years so formation, funding, and first grants do not all land at once.',
      output: 'Dated phases and milestone checklists that drive what Set Up and Operate work on next.',
      tab: 'roadmap',
      tabLabel: '5-Year Roadmap',
      progress: milestones.length === 0 ? 0 : ratio(milestonesDone.length, milestones.length),
      status: `${ctx.roadmap.length} phases · ${milestonesDone.length}/${milestones.length} milestones checked`,
      done: ctx.roadmap.length >= 3 && milestones.length > 0,
    },
    {
      id: 'funding-plan',
      phase: 'plan',
      title: 'Set the endowment target and funding sources',
      what: 'Decide the corpus you are building toward, the annual grant budget, and which gift vehicles fund it.',
      output: 'The dollar targets the funding, endowment, and distribution math all run on.',
      tab: 'funding',
      tabLabel: 'Funding & Donors',
      progress:
        (Number(s.endowment_target ?? 0) > 0 ? 0.4 : 0) +
        (Number(s.annual_grant_budget ?? 0) > 0 ? 0.3 : 0) +
        (ctx.relationships.length > 0 ? 0.3 : 0),
      status: `Target ${Math.round(Number(s.endowment_target ?? 0)).toLocaleString()} · ${ctx.relationships.length} funder relationships mapped`,
      done: Number(s.endowment_target ?? 0) > 0 && ctx.relationships.length > 0,
    },
    {
      id: 'formation',
      phase: 'setup',
      title: 'Form the entity (articles, EIN, bylaws)',
      what: 'File the nonprofit corporation, obtain the EIN, and adopt bylaws at an organizing board meeting.',
      output: 'A legal entity and charter documents that the IRS exemption application depends on.',
      tab: 'compliance',
      tabLabel: 'Compliance',
      progress:
        [compliant(ctx.compliance, 'articles'), compliant(ctx.compliance, 'ein'), compliant(ctx.compliance, 'bylaws')].filter(
          isDone,
        ).length / 3,
      status: `${[compliant(ctx.compliance, 'articles'), compliant(ctx.compliance, 'ein'), compliant(ctx.compliance, 'bylaws')].filter(isDone).length}/3 formation items complete`,
      done: [compliant(ctx.compliance, 'articles'), compliant(ctx.compliance, 'ein'), compliant(ctx.compliance, 'bylaws')].every(
        isDone,
      ),
    },
    {
      id: 'board',
      phase: 'setup',
      title: 'Seat the board and adopt governing policies',
      what: 'Recruit directors with staggered terms, then adopt conflict-of-interest, investment, grantmaking, and records policies.',
      output: 'Signed policies and a board of record — the authority every grant approval and filing relies on.',
      tab: 'governance',
      tabLabel: 'Governance',
      progress: ratio(board.length, 3) * 0.5 + (policies.length ? ratio(signedPolicies.length, policies.length) * 0.5 : 0),
      status: `${board.length} directors · ${signedPolicies.length}/${policies.length} policies adopted · ${meetings.length} meetings logged`,
      done: board.length >= 3 && policies.length > 0 && signedPolicies.length === policies.length,
    },
    {
      id: 'exemption',
      phase: 'setup',
      title: 'File Form 1023 and state registrations',
      what: 'Apply for 501(c)(3) recognition and register to solicit charitable funds where required.',
      output: 'A determination letter — the document donors, DAFs, and QCD custodians ask for before giving.',
      tab: 'compliance',
      tabLabel: 'Compliance',
      progress: filings.length === 0 ? 0 : ratio(filingsDone.length, filings.length),
      status: `${filingsDone.length}/${filings.length} filings and registrations on file`,
      done: isDone(compliant(ctx.compliance, '1023')),
    },
    {
      id: 'risk',
      phase: 'setup',
      title: 'Place insurance and open the document vault',
      what: 'Bind D&O and liability coverage, then store formation, IRS, and policy originals where they can be found.',
      output: 'A protected, searchable record set that audits, grantees, and successors can be pointed at.',
      tab: 'risk',
      tabLabel: 'Risk & Benchmarks',
      progress: ratio(activePolicies.length, 2) * 0.6 + ratio(ctx.documents.length, 5) * 0.4,
      status: `${activePolicies.length} active policies · ${ctx.documents.length} documents stored (${indexed.length} searchable)`,
      done: activePolicies.length >= 1 && ctx.documents.length >= 3,
    },
    {
      id: 'gifts',
      phase: 'operate',
      title: 'Record gifts and pledges as they arrive',
      what: 'Log every gift by donor, vehicle, and date — cash, stock, QCD, DAF grant, pledge, or bequest.',
      output: 'Funded balance and average assets, which set the required distribution for the year.',
      tab: 'funding',
      tabLabel: 'Funding & Donors',
      progress: ratio(sum(ctx.gifts, 'amount'), Math.max(1, Number(s.annual_grant_budget ?? 0))),
      status: `${ctx.gifts.length} gifts recorded · ${Math.round(sum(ctx.gifts, 'amount')).toLocaleString()} received`,
      done: ctx.gifts.length > 0,
    },
    {
      id: 'endowment',
      phase: 'operate',
      title: 'Invest the corpus to the policy allocation',
      what: 'Hold the endowment in the target mix and watch drift against the investment policy statement.',
      output: 'Average asset value and spendable return that the 5% distribution calculator draws from.',
      tab: 'investments',
      tabLabel: 'Endowment',
      progress: ratio(sum(ctx.investments, 'market_value'), Math.max(1, Number(s.endowment_target ?? 0))),
      status: `${Math.round(sum(ctx.investments, 'market_value')).toLocaleString()} invested across ${ctx.investments.length} holdings`,
      done: ctx.investments.length > 0,
    },
    {
      id: 'grants',
      phase: 'operate',
      title: 'Run the grant and scholarship cycle',
      what: 'Move each request through intake, IRS verification, conflict screening, board approval, payment, and reporting.',
      output: 'Qualifying distributions and people-served counts that satisfy the 5% rule and feed impact reporting.',
      tab: 'grants',
      tabLabel: 'Grants & Scholarships',
      progress: mrd > 0 ? ratio(paid, mrd) : ratio(awarded.length, 3),
      status:
        mrd > 0
          ? `${Math.round(paid).toLocaleString()} paid of ${Math.round(mrd).toLocaleString()} required · ${awarded.length} awards`
          : `${awarded.length} awards · ${Math.round(paid).toLocaleString()} paid`,
      done: mrd > 0 ? paid >= mrd : awarded.length > 0,
    },
    {
      id: 'impact',
      phase: 'operate',
      title: 'Measure outcomes against pillar targets',
      what: 'Record actuals for each pillar metric so results, not intentions, drive next year’s budget.',
      output: 'Evidence for the annual report, donor renewals, and the institutional legacy score.',
      tab: 'impact',
      tabLabel: 'Impact & Legacy Score',
      progress: ctx.impact.length === 0 ? 0 : ratio(measured.length, ctx.impact.length),
      status: `${measured.length}/${ctx.impact.length} metrics have current results`,
      done: ctx.impact.length > 0 && measured.length >= Math.ceil(ctx.impact.length / 2),
    },
    {
      id: 'filings',
      phase: 'operate',
      title: 'Close the year: 990-PF, audit calendar, renewals',
      what: 'File the annual return, confirm the distribution requirement was met, and renew registrations and coverage.',
      output: 'A clean compliance year and public disclosure copy — the baseline the next cycle starts from.',
      tab: 'compliance',
      tabLabel: 'Compliance',
      progress: ctx.compliance.length === 0 ? 0 : ratio(ctx.compliance.filter(isDone).length, ctx.compliance.length),
      status: `${ctx.compliance.filter(isDone).length}/${ctx.compliance.length} compliance items complete`,
      done: ctx.compliance.length > 0 && isDone(compliant(ctx.compliance, '990')),
    },
    {
      id: 'succession',
      phase: 'legacy',
      title: 'Name and train successors for every key role',
      what: 'Identify who takes the chair, the investment seat, and the grant committee, and track their readiness.',
      output: 'A board that survives a founder transition without pausing grantmaking.',
      tab: 'succession',
      tabLabel: 'Succession',
      progress: ctx.succession.length === 0 ? 0 : ratio(successors.length, ctx.succession.length),
      status: `${successors.length}/${ctx.succession.length} roles have an identified or trained successor`,
      done: ctx.succession.length > 0 && successors.length >= Math.ceil(ctx.succession.length / 2),
    },
    {
      id: 'vault',
      phase: 'legacy',
      title: 'Index the vault so decisions stay findable',
      what: 'Run indexing on every stored document so clauses, dates, and board decisions are searchable by anyone who inherits the work.',
      output: 'An institutional memory successors and auditors can query in seconds.',
      tab: 'documents',
      tabLabel: 'Document Vault',
      progress: ctx.documents.length === 0 ? 0 : ratio(indexed.length, ctx.documents.length),
      status: `${indexed.length}/${ctx.documents.length} documents indexed and searchable`,
      done: ctx.documents.length > 0 && indexed.length === ctx.documents.length,
    },
    {
      id: 'benchmarks',
      phase: 'legacy',
      title: 'Benchmark against peer foundations',
      what: 'Compare payout rate, expense ratios, and cost per beneficiary to peer medians and correct drift early.',
      output: 'Outside perspective that keeps admin cost and payout defensible over decades.',
      tab: 'risk',
      tabLabel: 'Risk & Benchmarks',
      progress: ratio(ctx.insurance.length > 0 ? 1 : 0, 1) * 0.3 + ratio(Number(s.admin_expense_annual ?? 0) > 0 ? 1 : 0, 1) * 0.7,
      status:
        Number(s.admin_expense_annual ?? 0) > 0
          ? 'Expense allocation entered — ratios comparable to peers'
          : 'Enter admin and fundraising expense to compare ratios',
      done: Number(s.admin_expense_annual ?? 0) > 0,
    },
    {
      id: 'legacy-map',
      phase: 'legacy',
      title: 'Write the generational legacy map',
      what: 'Record what passes to each generation — values, assets, stories, and institutions — and who stewards each.',
      output: 'The founding narrative that anchors the foundation after the founders are gone.',
      tab: 'legacy',
      tabLabel: 'Legacy Map',
      progress: ratio(ctx.legacyNodes.length, 5),
      status: `${ctx.legacyNodes.length} legacy nodes recorded`,
      done: ctx.legacyNodes.length >= 3,
    },
  ];

  return steps;
}

export interface PhaseSummary extends PhaseMeta {
  steps: FlowStep[];
  progress: number;
  done: number;
  total: number;
  state: 'complete' | 'active' | 'upcoming';
}

/** Groups steps into phases and marks exactly one phase active (the earliest unfinished one). */
export function summarizeFlow(steps: FlowStep[]): { phases: PhaseSummary[]; nextStep: FlowStep | null; overall: number } {
  const grouped = PHASES.map((p) => {
    const list = steps.filter((s) => s.phase === p.key);
    const done = list.filter((s) => s.done).length;
    return {
      ...p,
      steps: list,
      done,
      total: list.length,
      progress: list.length === 0 ? 0 : list.reduce((t, s) => t + Math.max(0, Math.min(1, s.progress)), 0) / list.length,
      state: (done === list.length ? 'complete' : 'upcoming') as PhaseSummary['state'],
    };
  });

  const activeIndex = grouped.findIndex((p) => p.state !== 'complete');
  if (activeIndex >= 0) grouped[activeIndex].state = 'active';

  const nextStep = steps.find((s) => !s.done) ?? null;
  const overall = steps.length === 0 ? 0 : steps.filter((s) => s.done).length / steps.length;
  return { phases: grouped, nextStep, overall };
}
