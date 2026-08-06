// Document templates for the Foundation Formation & Governance Binder.
// Each template renders a full document body from live foundation records.

export interface BinderContext {
  settings: any | null;
  pillars: any[];
  initiatives: any[];
  roadmap: any[];
  relationships: any[];
  legacyNodes: any[];
  governance: any[];
  compliance: any[];
  gifts: any[];
  investments: any[];
  grants: any[];
  succession: any[];
  insurance: any[];
  benchmarks: any[];
  documents: any[];
}

export interface BinderTemplate {
  section: string;
  doc_code: string;
  title: string;
  purpose: string;
  tags: string[];
  cross_refs: string[];
  /** Packets this document belongs to. */
  packets: PacketKey[];
  build: (c: BinderContext) => string;
}

export type PacketKey = 'board' | 'attorney' | 'cpa' | 'irs';

export const PACKETS: { key: PacketKey; label: string; blurb: string }[] = [
  { key: 'board', label: 'Board packet', blurb: 'Governance, programs, finances, and compliance for trustee meetings.' },
  { key: 'attorney', label: 'Attorney packet', blurb: 'Formation, charter, bylaws, and policy documents for legal review.' },
  { key: 'cpa', label: 'CPA packet', blurb: 'Financial governance, distributions, and 990-PF workpapers.' },
  { key: 'irs', label: 'IRS packet', blurb: 'Form 1023 narrative, schedules, and supporting attachments.' },
];

/* ---------- formatting helpers ---------- */

const money = (n: any) =>
  n == null || n === '' ? '$0' : `$${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
const dash = (v: any) => (v == null || v === '' ? '—' : String(v));
const P = (...parts: string[]) => parts.filter(Boolean).join('\n\n');
const bullets = (items: string[]) => (items.length ? items.map((i) => `• ${i}`).join('\n') : '• (none recorded yet)');
const numbered = (items: string[]) => items.map((i, idx) => `${idx + 1}. ${i}`).join('\n');
const heading = (t: string) => `${t.toUpperCase()}`;

const orgName = (c: BinderContext) => c.settings?.foundation_name || 'Dr. Lyman A. Montgomery Family Foundation';
const mission = (c: BinderContext) => c.settings?.mission || '(mission not yet recorded)';
const vision = (c: BinderContext) => c.settings?.vision || '(vision not yet recorded)';
const values = (c: BinderContext): string[] => {
  const v = c.settings?.core_values;
  if (!Array.isArray(v)) return [];
  return v.map((x: any) => (typeof x === 'string' ? x : [x?.title, x?.description].filter(Boolean).join(' — ')));
};
const boardMembers = (c: BinderContext) => c.governance.filter((g) => g.record_type === 'board_member' || g.role);
const minutes = (c: BinderContext) => c.governance.filter((g) => g.record_type === 'minutes' || g.meeting_date);
const endowment = (c: BinderContext) =>
  Number(c.settings?.endowment_current ?? 0) ||
  c.investments.reduce((s, i) => s + Number(i.market_value ?? 0), 0);

const NO_ADVICE =
  'This document is prepared for internal planning and board use. It is not legal, tax, or investment advice. Review with qualified Ohio nonprofit counsel and a CPA experienced in private foundations before filing or adoption.';

const policyBody = (name: string, statement: string, procedures: string[], review: string) =>
  P(
    heading('Policy statement'),
    statement,
    heading('Procedures'),
    numbered(procedures),
    heading('Review and amendment'),
    review,
    heading('Adoption'),
    `This ${name} was adopted by resolution of the Board of Trustees and is recorded in the minutes of the adopting meeting. It remains in force until amended or repealed by the Board.`,
    NO_ADVICE,
  );

/* ---------- Section 1 — Charter & Legal Formation (LF) ---------- */

const LEGAL: BinderTemplate[] = [
  {
    section: 'legal', doc_code: 'LF-001', title: 'Articles of Incorporation — Working Draft',
    purpose: 'Ohio nonprofit corporation articles establishing the foundation as a charitable corporation.',
    tags: ['formation', 'ohio'], cross_refs: ['LF-002', 'IRS-001'], packets: ['attorney', 'irs'],
    build: (c) => P(
      heading('Article I — Name'),
      `The name of the corporation is ${orgName(c)} (the "Foundation").`,
      heading('Article II — Place of business'),
      'The principal office of the Foundation is located in the State of Ohio. The Foundation may maintain offices at such other places as the Board of Trustees determines.',
      heading('Article III — Purpose'),
      `The Foundation is organized exclusively for charitable, educational, and scientific purposes within the meaning of Section 501(c)(3) of the Internal Revenue Code. Its specific charitable purpose is: ${mission(c)}`,
      heading('Article IV — Powers and limitations'),
      'No part of the net earnings of the Foundation shall inure to the benefit of, or be distributable to, its trustees, officers, or other private persons, except that the Foundation shall be authorized to pay reasonable compensation for services rendered. No substantial part of the activities of the Foundation shall be carrying on propaganda or otherwise attempting to influence legislation, and the Foundation shall not participate in any political campaign on behalf of or in opposition to any candidate for public office.',
      heading('Article V — Private foundation provisions'),
      'The Foundation shall distribute its income for each taxable year at such time and in such manner as not to become subject to the tax on undistributed income imposed by Section 4942. The Foundation shall not engage in any act of self-dealing (Section 4941), retain any excess business holdings (Section 4943), make any investments jeopardizing its charitable purposes (Section 4944), or make any taxable expenditures (Section 4945).',
      heading('Article VI — Dissolution'),
      'Upon dissolution, assets shall be distributed for one or more exempt purposes within the meaning of Section 501(c)(3), or to a federal, state, or local government for a public purpose.',
      heading('Article VII — Incorporator and statutory agent'),
      `Incorporator: ${dash(boardMembers(c)[0]?.name)}. The statutory agent must be an Ohio resident or an Ohio corporation with a street address in Ohio.`,
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-002', title: 'Ohio Filing Checklist (Form 532B / SOS)',
    purpose: 'Step-by-step record of the Ohio Secretary of State filing sequence and status.',
    tags: ['formation', 'checklist'], cross_refs: ['LF-001', 'LF-003'], packets: ['attorney'],
    build: (c) => P(
      heading('Filing sequence'),
      numbered([
        'Confirm name availability with the Ohio Secretary of State business search.',
        'Appoint a statutory agent with an Ohio street address; obtain signed acceptance.',
        'File Initial Articles of Incorporation (Nonprofit, Form 532B) with the Ohio Secretary of State.',
        'Record the charter number and filing date on receipt of the stamped articles.',
        'Apply for the federal Employer Identification Number (Form SS-4) — see LF-003.',
        'Register with the Ohio Attorney General Charitable Registration (Form CFR-1) within six months of receiving assets.',
        'Adopt bylaws and conflict-of-interest policy at the organizational meeting — see GV-001 and GV-004.',
        'Open the foundation bank and custodial accounts using the EIN and adopted banking resolution.',
      ]),
      heading('Record'),
      bullets([
        `Legal name filed: ${orgName(c)}`,
        `Founding year: ${dash(c.settings?.founding_year)}`,
        'Ohio charter number: ____________',
        'Filing date: ____________',
        'Statutory agent: ____________',
      ]),
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-003', title: 'EIN Application Record (Form SS-4)',
    purpose: 'Record of the federal employer identification number application and result.',
    tags: ['formation', 'irs'], cross_refs: ['LF-002', 'IRS-001'], packets: ['attorney', 'irs', 'cpa'],
    build: (c) => P(
      heading('Applicant'),
      bullets([
        `Legal name: ${orgName(c)}`,
        'Type of entity: Other nonprofit organization (corporation)',
        'Reason for applying: Started new organization',
        `Principal activity: Grantmaking and charitable programs — ${mission(c)}`,
        'Responsible party: ____________ (individual with control over the organization)',
      ]),
      heading('Result'),
      bullets(['EIN assigned: ____________', 'Date assigned: ____________', 'CP 575 notice filed in the Document Vault: Yes / No']),
      heading('Notes'),
      'The EIN must be obtained after the articles are filed and before opening bank accounts or filing Form 1023. Keep the CP 575 notice permanently; the IRS issues it only once.',
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-004', title: 'Founding Charter & Statement of Donor Intent',
    purpose: 'Permanent statement of why the foundation exists and what the founders intend it to protect.',
    tags: ['charter', 'legacy'], cross_refs: ['LG-001', 'GV-001'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Founding charter'),
      `${orgName(c)} was established to carry a family's convictions into permanent institutional form.`,
      heading('Mission'), mission(c),
      heading('Vision'), vision(c),
      heading('Core values'), bullets(values(c)),
      heading('Statement of donor intent'),
      c.settings?.legacy_statement ||
        'The founders intend that the Foundation preserve its corpus, distribute at least the legally required minimum each year, and remain governed by family trustees who understand and honor the mission stated above.',
      heading('Interpretation'),
      'Where any future question arises about the use of Foundation assets, trustees shall resolve it in favor of the mission and values recorded in this charter.',
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-005', title: 'Ohio Attorney General Charitable Registration Record',
    purpose: 'Registration and annual renewal record with the Ohio Attorney General Charitable Law Section.',
    tags: ['formation', 'compliance'], cross_refs: ['CP-002'], packets: ['attorney', 'cpa'],
    build: () => P(
      heading('Requirement'),
      'Ohio charitable organizations that hold assets for charitable purposes register with the Attorney General Charitable Law Section and file an annual report. Private foundations file the annual report together with a copy of Form 990-PF.',
      heading('Record'),
      bullets(['Registration number: ____________', 'Initial registration date: ____________', 'Annual report due: within 4 months and 15 days after fiscal year end', 'Filed by: ____________']),
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-006', title: 'Organizational Meeting Minutes — Template',
    purpose: 'Minutes of the first meeting adopting bylaws, electing officers, and authorizing banking.',
    tags: ['formation', 'governance'], cross_refs: ['GV-001', 'GV-003'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Organizational meeting of the Board of Trustees'),
      `${orgName(c)} · Date: ____________ · Location: ____________`,
      heading('Trustees present'), bullets(boardMembers(c).map((b) => `${dash(b.name)} — ${dash(b.role)}`)),
      heading('Resolutions adopted'),
      numbered([
        'RESOLVED, that the Articles of Incorporation as filed be accepted and entered into the corporate record.',
        'RESOLVED, that the Bylaws presented (GV-001) be and hereby are adopted as the Bylaws of the Foundation.',
        'RESOLVED, that the Conflict of Interest Policy (GV-004) be adopted and signed by each trustee.',
        'RESOLVED, that the officers named above be elected to serve until the next annual meeting.',
        'RESOLVED, that the Treasurer be authorized to open accounts in the name of the Foundation using its EIN.',
        'RESOLVED, that the Foundation apply for recognition of exemption on IRS Form 1023.',
        `RESOLVED, that the fiscal year of the Foundation end on December 31.`,
      ]),
      heading('Adjournment'), 'There being no further business, the meeting was adjourned. Recorded by: ____________',
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-007', title: 'Statutory Agent & Registered Office Record',
    purpose: 'Ongoing record of the statutory agent, address, and any change filings.',
    tags: ['formation'], cross_refs: ['LF-002'], packets: ['attorney'],
    build: () => P(
      heading('Current agent'),
      bullets(['Agent name: ____________', 'Ohio street address: ____________', 'Acceptance signed: ____________']),
      heading('Change procedure'),
      'A change of statutory agent or registered office requires a filing with the Ohio Secretary of State. Record every change below with its filing date, and never allow the agent position to lapse — a lapse can lead to administrative cancellation of the corporation.',
      heading('Change log'), '| Date | Prior agent | New agent | Filing confirmation |',
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-008', title: 'Corporate Records Index',
    purpose: 'Master index of permanent corporate records and where each original is stored.',
    tags: ['records'], cross_refs: ['CP-006', 'EX-002'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Permanent records'),
      bullets([
        'Stamped Articles of Incorporation (LF-001)',
        'IRS CP 575 EIN notice (LF-003)',
        'IRS determination letter (IRS-008)',
        'Bylaws and all amendments (GV-001)',
        'Signed conflict-of-interest disclosures (GV-004)',
        'Minutes of every board and committee meeting (GV-003)',
        'Form 990-PF for every year filed (CP-001)',
        'Audited or reviewed financial statements (FN-007)',
      ]),
      heading('Vault status'),
      `${c.documents.length} document(s) currently uploaded to the Foundation Document Vault.`,
      heading('Retention'),
      'Corporate, tax, and governance records listed above are retained permanently. Other records follow the retention schedule in CP-006.',
      NO_ADVICE,
    ),
  },
  {
    section: 'legal', doc_code: 'LF-009', title: 'Name, Trademark & Brand Protection Memo',
    purpose: 'Protecting the foundation name and family name from misuse.',
    tags: ['brand'], cross_refs: ['LG-005'], packets: ['attorney'],
    build: (c) => P(
      heading('Assets to protect'),
      bullets([`Corporate name: ${orgName(c)}`, 'Wordmark and logo', 'Program names and scholarship names', 'Domain names and social handles']),
      heading('Recommended steps'),
      numbered([
        'Register the primary domain and defensive variants in the Foundation name, not a personal account.',
        'Consider a federal trademark application for the foundation wordmark and each named scholarship.',
        'Adopt a naming policy: only the Board may authorize use of the family name on a program or gift.',
        'Record all brand assets in the Document Vault with renewal dates in the compliance calendar.',
      ]),
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 2 — Governance & Board (GV) ---------- */

const GOVERNANCE: BinderTemplate[] = [
  {
    section: 'governance', doc_code: 'GV-001', title: 'Bylaws — Working Draft',
    purpose: 'Governing rules for trustees, officers, meetings, committees, and amendments.',
    tags: ['bylaws'], cross_refs: ['LF-001', 'GV-004'], packets: ['board', 'attorney', 'irs'],
    build: (c) => P(
      heading('Article I — Purpose'), `The Foundation is organized to carry out the purposes stated in its Articles of Incorporation: ${mission(c)}`,
      heading('Article II — Board of Trustees'),
      `The Foundation is governed by a Board of Trustees of not fewer than three and not more than eleven members. The Board currently has ${boardMembers(c).length} recorded member(s), of whom ${boardMembers(c).filter((b) => b.is_independent).length} are independent. Trustees serve staggered terms of three years and may be re-elected.`,
      heading('Article III — Officers'),
      'The officers are a Chair, a Secretary, and a Treasurer, elected annually by the Board. The offices of Secretary and Treasurer may be held by the same person; the Chair may not simultaneously serve as Treasurer.',
      heading('Article IV — Meetings'),
      'The Board meets at least quarterly, with an annual meeting to elect officers, approve the budget, and review the minimum distribution calculation. Notice of at least seven days is required. A majority of trustees in office constitutes a quorum. Trustees may participate by electronic means.',
      heading('Article V — Committees'),
      bullets(['Executive Committee — acts between meetings within limits set by the Board', 'Finance and Investment Committee — oversees FN-001 and FN-002', 'Grants Committee — oversees OP-001 through OP-004', 'Audit and Compliance Committee — oversees CP-001 through CP-005']),
      heading('Article VI — Conflicts of interest'),
      'Every trustee, officer, and committee member is bound by the Conflict of Interest Policy (GV-004) and signs an annual disclosure.',
      heading('Article VII — Indemnification'),
      'The Foundation shall indemnify trustees and officers to the fullest extent permitted by Ohio law, and shall maintain directors and officers liability coverage (see CP-004).',
      heading('Article VIII — Amendment'),
      'These Bylaws may be amended by a two-thirds vote of trustees in office at any meeting for which notice of the proposed amendment was given.',
      NO_ADVICE,
    ),
  },
  {
    section: 'governance', doc_code: 'GV-002', title: 'Board Roster, Terms & Skills Matrix',
    purpose: 'Current trustees, roles, terms, independence, and the skills the board still needs.',
    tags: ['board'], cross_refs: ['GV-001', 'LG-002'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Current trustees'),
      bullets(boardMembers(c).map((b) =>
        `${dash(b.name)} — ${dash(b.role)}${b.committee ? ` (${b.committee})` : ''} · term ${dash(b.term_start)} to ${dash(b.term_end)} · ${b.is_independent ? 'independent' : 'family/interested'} · COI disclosed: ${b.conflict_disclosed ? 'yes' : 'no'}`,
      )),
      heading('Composition analysis'),
      `Total trustees: ${boardMembers(c).length}. Independent: ${boardMembers(c).filter((b) => b.is_independent).length}. Conflict disclosures on file: ${boardMembers(c).filter((b) => b.conflict_disclosed).length}.`,
      heading('Skills the board should cover'),
      bullets(['Nonprofit or foundation law', 'Investment management', 'Accounting and audit', 'Program area expertise for each pillar', 'Community representation from the population served', 'Next-generation family member in a training seat']),
      heading('Recruitment actions'),
      'Identify and cultivate candidates for every gap above; record prospects in the Relationship Map and confirm elections in the minutes.',
      NO_ADVICE,
    ),
  },
  {
    section: 'governance', doc_code: 'GV-003', title: 'Board Meeting Minutes — Standard Template',
    purpose: 'Consistent minute format that satisfies IRS and Ohio recordkeeping expectations.',
    tags: ['minutes'], cross_refs: ['GV-001'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Standard agenda and minute structure'),
      numbered([
        'Call to order, roll, and confirmation of quorum.',
        'Approval of prior minutes.',
        'Treasurer report: assets, spending against budget, minimum distribution status.',
        'Investment report against the Investment Policy Statement (FN-001).',
        'Grants Committee report: recommendations, approvals, conflicts recused.',
        'Compliance report: filings due and completed (CP-002).',
        'New business and executive session.',
        'Adjournment and next meeting date.',
      ]),
      heading('Minute requirements'),
      bullets([
        'Record who was present, who was absent, and the time of any arrival or departure.',
        'Record each motion, who made it, who seconded, and the vote count.',
        'Record every recusal for conflict of interest and note that the recused trustee left the room.',
        'Record the basis for compensation decisions and the comparability data reviewed.',
        'Approve and sign minutes at the following meeting; store permanently.',
      ]),
      heading('Meetings on record'),
      bullets(minutes(c).map((m) => `${dash(m.meeting_date)} — ${dash(m.name || 'Board meeting')} · ${dash(m.decisions)}`)),
      NO_ADVICE,
    ),
  },
  {
    section: 'governance', doc_code: 'GV-004', title: 'Conflict of Interest Policy & Annual Disclosure',
    purpose: 'Identifies, discloses, and manages trustee conflicts and self-dealing risk.',
    tags: ['policy', 'coi'], cross_refs: ['GV-001', 'FN-005'], packets: ['board', 'attorney', 'irs'],
    build: () => policyBody('Conflict of Interest Policy',
      'The Foundation avoids any transaction that benefits a trustee, officer, substantial contributor, or a family member or controlled entity of any of them. Section 4941 imposes excise taxes on acts of self-dealing regardless of fairness, so the Foundation applies a bright-line standard: when in doubt, do not transact.',
      [
        'Each trustee, officer, and committee member completes a written disclosure annually and on any change in circumstances.',
        'A person with a conflict discloses it before discussion, answers questions, then leaves the room for deliberation and vote.',
        'The minutes record the disclosure, the recusal, and the vote of the disinterested trustees.',
        'For any compensation or purchase decision, the Board documents comparability data before approving.',
        'The Secretary maintains all signed disclosures permanently in the corporate records.',
      ],
      'Reviewed annually at the annual meeting; amended by two-thirds vote of trustees in office.'),
  },
  {
    section: 'governance', doc_code: 'GV-005', title: 'Committee Charters',
    purpose: 'Scope, authority, and reporting duties of each standing committee.',
    tags: ['committee'], cross_refs: ['GV-001'], packets: ['board'],
    build: () => P(
      heading('Finance & Investment Committee'),
      'Reviews the Investment Policy Statement annually, monitors manager and portfolio performance quarterly, recommends the spending rate, and confirms the minimum distribution calculation before the annual meeting.',
      heading('Grants Committee'),
      'Reviews applications against published criteria, conducts due diligence, screens conflicts, and recommends awards to the full Board. It may not approve grants to disqualified persons.',
      heading('Audit & Compliance Committee'),
      'Oversees the annual filing calendar, engages and reviews the accountant, reviews Form 990-PF before filing, and receives whistleblower reports.',
      heading('Governance & Succession Committee'),
      'Maintains the skills matrix, recruits trustees, runs trustee orientation, and maintains the succession plan (LG-002).',
      heading('Common requirements'),
      bullets(['Each committee keeps minutes and reports at every board meeting.', 'Committees advise; only the Board may bind the Foundation unless authority is expressly delegated in writing.', 'Committee membership is confirmed annually.']),
      NO_ADVICE,
    ),
  },
  {
    section: 'governance', doc_code: 'GV-006', title: 'Trustee Orientation & Handbook Outline',
    purpose: 'What every new trustee must read, sign, and understand in the first 90 days.',
    tags: ['board', 'training'], cross_refs: ['GV-001', 'GV-004'], packets: ['board'],
    build: (c) => P(
      heading('Read'),
      bullets(['Articles of Incorporation (LF-001) and Bylaws (GV-001)', 'Founding charter and donor intent (LF-004)', `Mission, vision, and the ${c.pillars.length} program pillars`, 'Investment Policy Statement (FN-001) and spending policy (FN-002)', 'Most recent Form 990-PF and financial statements']),
      heading('Sign'),
      bullets(['Conflict of interest disclosure (GV-004)', 'Confidentiality acknowledgment', 'Trustee duties acknowledgment: duty of care, duty of loyalty, duty of obedience']),
      heading('Understand'),
      bullets(['The 5% minimum distribution requirement and why it drives the calendar', 'Self-dealing rules — no loans, no personal use of assets, no compensation without comparability data', 'The excise taxes under Sections 4941–4945 and that they fall on individuals as well as the Foundation', 'That trustees serve the mission, not the donors personally']),
      NO_ADVICE,
    ),
  },
  {
    section: 'governance', doc_code: 'GV-007', title: 'Whistleblower Policy',
    purpose: 'Protected channel for reporting suspected legal or ethical violations.',
    tags: ['policy'], cross_refs: ['GV-008'], packets: ['board', 'attorney'],
    build: () => policyBody('Whistleblower Policy',
      'Any trustee, officer, employee, volunteer, or grantee may report suspected illegal conduct, fraud, misuse of assets, or violation of Foundation policy without fear of retaliation.',
      ['Reports may be made to the Chair of the Audit & Compliance Committee in writing or verbally.', 'If the report concerns the Chair, it goes to any other independent trustee.', 'The receiving trustee acknowledges the report within five business days.', 'The Committee investigates promptly, documents findings, and reports to the full Board.', 'Retaliation against a good-faith reporter is itself a violation and grounds for removal.'],
      'Reviewed annually; the existence of this policy is reported on Form 990-PF.'),
  },
  {
    section: 'governance', doc_code: 'GV-008', title: 'Document Retention & Destruction Policy',
    purpose: 'What the foundation keeps, for how long, and how records are destroyed.',
    tags: ['policy', 'records'], cross_refs: ['LF-008', 'CP-006'], packets: ['board', 'attorney'],
    build: () => policyBody('Document Retention and Destruction Policy',
      'The Foundation retains records for the periods required by law and destroys them securely thereafter. Records relevant to any pending or reasonably anticipated litigation, audit, or investigation are preserved regardless of schedule.',
      ['Permanent: articles, bylaws, minutes, determination letter, 990-PF filings, audited statements, deeds, and donor-restriction documents.', 'Seven years: accounting records, bank statements, grant files, contracts after expiration, and payroll records.', 'Three years: routine correspondence and general operating records.', 'Destruction of paper records is by shredding; electronic records are deleted from all backups.', 'The Secretary certifies annually that destruction followed this schedule.'],
      'Reviewed annually by the Audit & Compliance Committee.'),
  },
  {
    section: 'governance', doc_code: 'GV-009', title: 'Board Self-Assessment & Annual Calendar',
    purpose: 'Annual governance rhythm and a scored self-assessment for the board.',
    tags: ['board'], cross_refs: ['GV-002', 'CP-002'], packets: ['board'],
    build: () => P(
      heading('Annual governance calendar'),
      bullets(['Q1 — Approve prior-year 990-PF workpapers; confirm minimum distribution met', 'Q2 — Investment policy review; grant cycle opens', 'Q3 — Grant decisions; budget development', 'Q4 — Annual meeting: elect officers, approve budget, sign conflict disclosures, board self-assessment']),
      heading('Self-assessment questions (score 1–5)'),
      numbered([
        'Does every trustee understand the mission and could state it unprompted?',
        'Did the Board receive financial reports in advance of every meeting?',
        'Were all conflicts disclosed and recusals documented?',
        'Did the Foundation meet its minimum distribution without a year-end scramble?',
        'Is the grant docket aligned to the stated pillars?',
        'Is there a named, prepared successor for every key role?',
        'Did the Board evaluate outcomes, not just dollars distributed?',
      ]),
      heading('Use'), 'Score anonymously, average by question, and address any question scoring below 3.5 in the following year plan.',
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 3 — Financial Governance (FN) ---------- */

const FINANCIAL: BinderTemplate[] = [
  {
    section: 'financial', doc_code: 'FN-001', title: 'Investment Policy Statement',
    purpose: 'Objectives, allocation targets, and monitoring rules for the endowment.',
    tags: ['policy', 'investments'], cross_refs: ['FN-002', 'GV-005'], packets: ['board', 'cpa'],
    build: (c) => P(
      heading('Purpose and objective'),
      `The endowment exists to fund the mission in perpetuity. The long-term objective is a total return sufficient to cover the spending rate of ${dash(c.settings?.spending_policy_pct ?? 5)}%, investment costs, and inflation. Current portfolio value: ${money(endowment(c))}. Endowment target: ${money(c.settings?.endowment_target)}.`,
      heading('Current holdings'),
      bullets(c.investments.map((i) => `${dash(i.name)} — ${dash(i.asset_class)} · ${money(i.market_value)} · target ${dash(i.target_allocation_pct)}% · ${dash(i.custodian)}`)),
      heading('Allocation discipline'),
      'Allocations are rebalanced when any asset class drifts more than five percentage points from target, and at least annually. Rebalancing is executed by the Treasurer under Finance Committee oversight.',
      heading('Prohibited and restricted'),
      bullets(['No jeopardizing investments under Section 4944 — no speculative or unhedged derivative strategies', 'No excess business holdings under Section 4943', 'No investment in an entity controlled by a disqualified person', 'No borrowing against the portfolio without full Board approval']),
      heading('Monitoring'),
      'The Finance Committee reviews performance quarterly against benchmarks appropriate to each asset class and reports to the Board. Managers are reviewed annually on performance, cost, and adherence to this policy.',
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-002', title: 'Spending & Minimum Distribution Policy',
    purpose: 'How much the foundation distributes each year and how the 5% floor is met.',
    tags: ['policy', 'distribution'], cross_refs: ['CP-003', 'FN-001'], packets: ['board', 'cpa', 'irs'],
    build: (c) => {
      const avg = Number(c.settings?.mrd_avg_assets ?? endowment(c));
      const req = avg * 0.05;
      return P(
        heading('Policy'),
        `The Foundation distributes not less than 5% of the average fair market value of its non-charitable-use assets each year, as required by Section 4942, and targets a spending rate of ${dash(c.settings?.spending_policy_pct ?? 5)}%.`,
        heading('Current calculation'),
        bullets([
          `Average non-charitable-use assets: ${money(avg)}`,
          `Required distribution (5%): ${money(req)}`,
          `Qualifying administrative expenses: ${money(c.settings?.mrd_qualifying_admin)}`,
          `Carryover applied: ${money(c.settings?.mrd_carryover)}`,
          `Grants awarded to date: ${money(c.grants.reduce((s, g) => s + Number(g.amount_awarded ?? 0), 0))}`,
          `Annual grant budget: ${money(c.settings?.annual_grant_budget)}`,
        ]),
        heading('Timing rule'),
        'The distributable amount for a year must be distributed by the end of the following year. The Treasurer reports progress at every quarterly meeting so the requirement is never met by a December scramble.',
        heading('Consequence of shortfall'),
        'A shortfall triggers an initial excise tax of 30% of the undistributed amount, and 100% if not corrected. The Board treats any projected shortfall as an emergency agenda item.',
        NO_ADVICE,
      );
    },
  },
  {
    section: 'financial', doc_code: 'FN-003', title: 'Gift Acceptance Policy',
    purpose: 'What gifts the foundation accepts, refuses, and how each is valued and acknowledged.',
    tags: ['policy', 'funding'], cross_refs: ['FN-004'], packets: ['board', 'cpa'],
    build: (c) => P(
      heading('Accepted without review'),
      bullets(['Cash, checks, and electronic transfers', 'Publicly traded securities', 'Qualified charitable distributions from IRAs', 'Bequests of cash or marketable securities']),
      heading('Accepted only after Board review'),
      bullets(['Real property (requires title search, environmental review, and a plan for carrying costs)', 'Closely held business interests (excess business holdings risk under Section 4943)', 'Tangible personal property, art, and collectibles', 'Cryptocurrency and other illiquid assets', 'Any gift with donor restrictions the Foundation may not be able to satisfy']),
      heading('Never accepted'),
      bullets(['Gifts that would jeopardize exempt status or impose liabilities exceeding value', 'Gifts conditioned on a benefit to the donor or a disqualified person', 'Anonymous gifts that cannot be traced for anti-money-laundering purposes']),
      heading('Acknowledgment'),
      `Every gift receives a written acknowledgment within 30 days stating the amount or a description of property, and whether goods or services were provided. Gifts on record: ${c.gifts.length}, totaling ${money(c.gifts.reduce((s, g) => s + Number(g.amount ?? 0), 0))}. Receipts sent: ${c.gifts.filter((g) => g.receipt_sent).length}.`,
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-004', title: 'Pledge & Restricted Fund Management Policy',
    purpose: 'Tracking multi-year pledges and honoring donor restrictions.',
    tags: ['policy', 'funding'], cross_refs: ['FN-003'], packets: ['board', 'cpa'],
    build: (c) => P(
      heading('Pledges'),
      `Multi-year pledges are recorded with a total, a payment schedule, and a balance. Open pledge balance: ${money(c.gifts.reduce((s, g) => s + Number(g.pledge_balance ?? 0), 0))}.`,
      heading('Restricted funds'),
      `Restricted gifts are tracked separately and may be spent only on the stated purpose. Restricted gifts on record: ${c.gifts.filter((g) => g.is_restricted).length}.`,
      bullets(c.gifts.filter((g) => g.is_restricted).map((g) => `${dash(g.donor_name)} — ${money(g.amount)} · ${dash(g.restriction_note)}`)),
      heading('Release and modification'),
      'A restriction may be released only by written donor consent or, if the donor is unavailable, by the process Ohio law provides for modifying restrictions. Trustees may never redirect restricted funds by vote alone.',
      heading('Reporting'),
      'Restricted balances are reported at every board meeting and reconciled annually to the financial statements.',
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-005', title: 'Internal Controls & Financial Procedures',
    purpose: 'Segregation of duties, approval limits, and cash controls.',
    tags: ['controls'], cross_refs: ['GV-004', 'FN-006'], packets: ['board', 'cpa'],
    build: () => P(
      heading('Segregation of duties'),
      'The person who authorizes a payment may not be the person who executes it or the person who reconciles the account. With a small board, the Chair authorizes, the Treasurer executes, and an independent trustee reviews monthly statements.',
      heading('Approval thresholds'),
      bullets(['Under $1,000 — Treasurer alone', '$1,000 to $10,000 — Treasurer plus Chair', 'Over $10,000 or any grant — full Board vote recorded in minutes', 'Any payment to a disqualified person — prohibited, regardless of amount']),
      heading('Cash controls'),
      bullets(['Two signatures on checks over $5,000', 'No cash disbursements', 'Bank statements delivered to a trustee who does not execute payments', 'Monthly reconciliations completed within 15 days and initialed']),
      heading('Annual review'), 'The Audit & Compliance Committee tests a sample of transactions annually and reports findings.',
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-006', title: 'Expense Allocation & Administrative Cost Policy',
    purpose: 'How administrative and fundraising costs are classified and capped.',
    tags: ['policy', 'costs'], cross_refs: ['FN-002', 'CP-001'], packets: ['cpa'],
    build: (c) => P(
      heading('Classification'),
      'Every expense is classified as charitable program, administrative, investment management, or fundraising. Only charitable program and qualifying administrative expenses count toward the minimum distribution.',
      heading('Current levels'),
      bullets([
        `Annual administrative expense: ${money(c.settings?.admin_expense_annual)}`,
        `Annual fundraising expense: ${money(c.settings?.fundraising_expense_annual)}`,
        `Qualifying administrative expense counted toward distribution: ${money(c.settings?.mrd_qualifying_admin)}`,
        `Staff count: ${dash(c.settings?.staff_count ?? 0)}`,
      ]),
      heading('Targets'),
      'The Foundation targets total administrative cost below 15% of annual distributions, benchmarked against peer foundations of similar size. Investment management fees are reported separately and are not charitable expenses.',
      heading('Allocation method'),
      'Shared costs are allocated by a documented, consistently applied method — time records for personnel, square footage for occupancy — and the method is disclosed to the accountant preparing Form 990-PF.',
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-007', title: 'Annual Budget & Financial Statement Framework',
    purpose: 'Budget format, approval cycle, and the level of financial statement assurance.',
    tags: ['budget'], cross_refs: ['FN-002', 'CP-005'], packets: ['board', 'cpa'],
    build: (c) => P(
      heading('Budget structure'),
      bullets([
        `Grants and scholarships: ${money(c.settings?.annual_grant_budget)}`,
        ...c.pillars.map((p) => `Pillar — ${dash(p.name)}: ${money(p.annual_budget)}`),
        `Administration: ${money(c.settings?.admin_expense_annual)}`,
        'Investment management fees: ____________',
        'Contingency (5% of total): ____________',
      ]),
      heading('Approval cycle'),
      'A draft budget is presented in Q3, revised after the Q4 investment report, and approved at the annual meeting. Variances above 10% of a line item require Board approval.',
      heading('Financial statements'),
      'The Foundation prepares annual statements on the accrual basis. Assurance level scales with size: compilation under $500k in assets, review from $500k to $2M, audit above $2M or whenever a funder or lender requires one.',
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-008', title: 'Self-Dealing Prevention Memo (Section 4941)',
    purpose: 'Plain-language guide to what trustees may never do with foundation assets.',
    tags: ['compliance', 'coi'], cross_refs: ['GV-004'], packets: ['board', 'attorney', 'cpa'],
    build: () => P(
      heading('Who is a disqualified person'),
      bullets(['Substantial contributors and foundation managers', 'Family members: spouse, ancestors, children, grandchildren, and their spouses', 'Entities more than 35% owned or controlled by any of the above']),
      heading('Prohibited acts — regardless of fairness'),
      bullets(['Sale, exchange, or lease of property between the Foundation and a disqualified person, even at fair market value or below', 'Lending money in either direction (a disqualified person may lend interest-free to the Foundation)', 'Furnishing goods, services, or facilities, except reasonable services necessary to the exempt purpose', 'Paying compensation beyond reasonable amounts for personal services actually rendered', 'Transferring foundation income or assets to, or for the use of, a disqualified person', 'Satisfying a personal pledge of a disqualified person with foundation funds']),
      heading('Penalty'),
      'A 10% excise tax on the self-dealer and 5% on any manager who knowingly participates, escalating to 200% and 50% if not corrected within the taxable period. The tax falls on individuals personally.',
      heading('Practical rule'), 'If a trustee or their family would receive anything of value, do not proceed without written counsel opinion.',
      NO_ADVICE,
    ),
  },
  {
    section: 'financial', doc_code: 'FN-009', title: 'Banking Resolution & Signature Authority',
    purpose: 'Authorized accounts, signers, and limits for board approval.',
    tags: ['banking'], cross_refs: ['FN-005'], packets: ['board', 'cpa'],
    build: (c) => P(
      heading('Resolution'),
      `RESOLVED, that ${orgName(c)} open and maintain accounts at financial institutions selected by the Treasurer with Board concurrence, and that the officers named below be authorized signers.`,
      heading('Authorized signers'), bullets(boardMembers(c).filter((b) => b.role).map((b) => `${dash(b.name)} — ${dash(b.role)}`)),
      heading('Limits'),
      bullets(['Single-signature limit: $5,000', 'Two signatures required above $5,000', 'Wire transfers require Chair plus Treasurer and callback verification', 'No debit cards issued; no ATM access']),
      heading('Custodial accounts'),
      bullets(c.investments.map((i) => `${dash(i.custodian)} — ${dash(i.name)} · ${money(i.market_value)}`)),
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 4 — IRS 501(c)(3) Package (IRS) ---------- */

const IRS_DOCS: BinderTemplate[] = [
  {
    section: 'irs', doc_code: 'IRS-001', title: 'Form 1023 Part IV — Narrative Description of Activities',
    purpose: 'The core narrative the IRS reads to decide exemption.',
    tags: ['1023'], cross_refs: ['LF-001', 'IRS-002'], packets: ['irs', 'attorney'],
    build: (c) => P(
      heading('Past, present, and planned activities'),
      `${orgName(c)} is a family private foundation organized in Ohio to pursue the following charitable purpose: ${mission(c)}`,
      heading('How activities further exempt purposes'),
      `The Foundation makes grants and operates programs across ${c.pillars.length} program areas. For each activity, the narrative below states what the activity is, when and where it is conducted, how it furthers an exempt purpose, what percentage of time and resources it receives, and how it is funded.`,
      ...c.pillars.map((p) =>
        P(heading(`Activity — ${dash(p.name)}`),
          `${dash(p.description)} Annual budget: ${money(p.annual_budget)}. Target beneficiaries: ${dash(p.target_beneficiaries)}. Focus areas: ${Array.isArray(p.focus_areas) ? p.focus_areas.join(', ') : dash(p.focus_areas)}. This activity is conducted in Ohio and funded from endowment income and contributions.`),
      ),
      heading('Funding'),
      `The Foundation is funded by contributions from the founding family and planned estate gifts. Current endowment: ${money(endowment(c))} against a target of ${money(c.settings?.endowment_target)}.`,
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-002', title: 'Form 1023 Filing Checklist & Fee Record',
    purpose: 'Everything required in the application package, in filing order.',
    tags: ['1023', 'checklist'], cross_refs: ['IRS-001'], packets: ['irs'],
    build: () => P(
      heading('Package contents'),
      numbered([
        'Form 1023 completed on Pay.gov (electronic filing is required).',
        'User fee paid ($600 for Form 1023; verify the current amount before filing).',
        'Conformed copy of the Articles of Incorporation with the state filing stamp.',
        'Bylaws as adopted.',
        'Narrative of activities (IRS-001).',
        'Conflict of interest policy (GV-004).',
        'Compensation information for officers, directors, and trustees.',
        'Financial data: actual for completed years, projections for a total of three years (IRS-004).',
        'Required schedules (IRS-005).',
      ]),
      heading('Record'),
      bullets(['Pay.gov tracking ID: ____________', 'Date submitted: ____________', 'User fee paid: ____________', 'IRS correspondence received: ____________']),
      heading('Timing'),
      'File within 27 months of the end of the month of incorporation for the exemption to be retroactive to the formation date.',
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-003', title: 'Organizational & Operational Test Memo',
    purpose: 'Proof that the governing documents and activities satisfy Section 501(c)(3).',
    tags: ['1023'], cross_refs: ['LF-001'], packets: ['irs', 'attorney'],
    build: (c) => P(
      heading('Organizational test'),
      'The Articles limit purposes to those in Section 501(c)(3), do not empower the Foundation to engage in non-exempt activities other than insubstantially, and contain the required dissolution clause dedicating assets to exempt purposes.',
      heading('Operational test'),
      `The Foundation operates exclusively for exempt purposes. No part of its net earnings inures to any private individual. Program activities across ${c.pillars.length} pillars serve a charitable class defined by need, not by relationship to the founders.`,
      heading('Private benefit and inurement'),
      'Grants and scholarships are awarded on published, objective criteria. No grant may be made to a disqualified person or to satisfy a personal obligation of one. Scholarship programs require advance IRS approval under Section 4945(g).',
      heading('Political and legislative limits'),
      'The Foundation does not participate in political campaigns and does not attempt to influence legislation. A private foundation attempting to influence legislation makes a taxable expenditure under Section 4945.',
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-004', title: 'Form 1023 Financial Data — Three-Year Projection',
    purpose: 'Revenue and expense projections supporting the application.',
    tags: ['1023', 'financial'], cross_refs: ['FN-007'], packets: ['irs', 'cpa'],
    build: (c) => P(
      heading('Revenue'),
      bullets([
        `Gifts, grants, and contributions received: ${money(c.gifts.reduce((s, g) => s + Number(g.amount ?? 0), 0))}`,
        `Investment income (estimated at ${dash(c.settings?.spending_policy_pct ?? 5)}% of ${money(endowment(c))}): ${money(endowment(c) * (Number(c.settings?.spending_policy_pct ?? 5) / 100))}`,
        'Other revenue: $0',
      ]),
      heading('Expenses'),
      bullets([
        `Grants and scholarships paid: ${money(c.grants.reduce((s, g) => s + Number(g.amount_paid ?? 0), 0))}`,
        `Administrative: ${money(c.settings?.admin_expense_annual)}`,
        `Fundraising: ${money(c.settings?.fundraising_expense_annual)}`,
        'Professional fees (legal, accounting): ____________',
      ]),
      heading('Balance sheet'),
      bullets([`Cash and investments: ${money(endowment(c))}`, 'Receivables (pledges): ' + money(c.gifts.reduce((s, g) => s + Number(g.pledge_balance ?? 0), 0)), 'Liabilities: $0']),
      heading('Basis of projection'),
      'Years two and three assume contributions continue at the founding level, investment return of 6% nominal, and distributions at the greater of the 5% requirement or the approved grant budget.',
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-005', title: 'Form 1023 Schedules — Applicability Review',
    purpose: 'Which schedules apply and why, with the answer recorded for each.',
    tags: ['1023'], cross_refs: ['IRS-002'], packets: ['irs'],
    build: () => P(
      heading('Schedule review'),
      bullets([
        'Schedule A — Churches: not applicable.',
        'Schedule B — Schools: applicable only if the Foundation operates a school.',
        'Schedule C — Hospitals and medical research: not applicable.',
        'Schedule D — Supporting organizations: not applicable (the Foundation is a private foundation).',
        'Schedule E — Late filing / effective date: applicable if filed beyond 27 months.',
        'Schedule F — Low-income housing: applicable only if housing programs are operated.',
        'Schedule G — Successor organizations: applicable if the Foundation succeeds another entity.',
        'Schedule H — Scholarships and grants to individuals: APPLICABLE if the Foundation awards scholarships — requires advance approval of procedures under Section 4945(g).',
      ]),
      heading('Schedule H note'),
      'Scholarship procedures must state the criteria, the selection process, that the selection committee excludes disqualified persons, and how the Foundation supervises and follows up on grants. Awards may not be made before approval.',
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-006', title: 'Scholarship Procedures for Section 4945(g) Approval',
    purpose: 'The exact procedures submitted to the IRS for individual grant approval.',
    tags: ['1023', 'scholarship'], cross_refs: ['OP-003'], packets: ['irs'],
    build: (c) => P(
      heading('Purpose of the program'),
      `Scholarships further the Foundation's educational mission: ${mission(c)}`,
      heading('Eligible group'),
      'The eligible group is large enough to constitute a charitable class and is defined without reference to any relationship to the Foundation, its trustees, or their families. Disqualified persons and their family members are ineligible.',
      heading('Selection criteria'),
      bullets(['Academic record and demonstrated effort', 'Financial need documented by a standard form', 'Stated goals aligned with the program area', 'Community or family responsibility']),
      heading('Selection committee'),
      'Awards are selected by a committee whose members are not in a position to derive private benefit. Trustees who are related to any applicant recuse entirely.',
      heading('Supervision and follow-up'),
      bullets(['Funds are paid to the educational institution, not the student, wherever possible.', 'Recipients submit transcripts each term.', 'The Foundation investigates any diversion and withholds further payments until resolved.', 'Records of each award, report, and follow-up are retained.']),
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-007', title: 'Compensation & Reasonableness Documentation',
    purpose: 'How the board documents that any compensation is reasonable.',
    tags: ['1023', 'compensation'], cross_refs: ['GV-004', 'FN-008'], packets: ['irs', 'board'],
    build: (c) => P(
      heading('Current compensation'),
      `Staff count: ${dash(c.settings?.staff_count ?? 0)}. Trustees serve without compensation except reimbursement of documented expenses.`,
      heading('Rebuttable presumption procedure'),
      numbered([
        'The decision is made in advance by trustees without a conflict of interest.',
        'The board obtains and relies on appropriate comparability data — compensation surveys for similar organizations in the same geography and budget range.',
        'The board documents the basis for the decision concurrently in the minutes, including who was present, the data relied on, and the vote.',
      ]),
      heading('Expense reimbursement'),
      'Reimbursement follows an accountable plan: business purpose documented, receipts submitted within 60 days, excess advances returned. Without an accountable plan, reimbursements become compensation and may be self-dealing.',
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-008', title: 'Determination Letter & Post-Approval Actions',
    purpose: 'Record of the IRS determination and everything that must happen after it arrives.',
    tags: ['1023'], cross_refs: ['CP-002'], packets: ['irs', 'cpa'],
    build: () => P(
      heading('Determination record'),
      bullets(['Determination letter date: ____________', 'Effective date of exemption: ____________', 'Classification: private foundation under Section 509(a)', 'Foundation status: non-operating private foundation unless otherwise stated']),
      heading('Post-approval actions'),
      numbered([
        'File the determination letter permanently and add a copy to the Document Vault.',
        'Update the Ohio Attorney General charitable registration with the exemption status.',
        'Begin the annual Form 990-PF filing calendar (CP-001).',
        'Post the determination letter and the three most recent 990-PF returns for public inspection (CP-005).',
        'Notify the custodian and bank so accounts are correctly coded as tax-exempt.',
        'Begin tracking the 5% minimum distribution from the first full tax year.',
      ]),
      NO_ADVICE,
    ),
  },
  {
    section: 'irs', doc_code: 'IRS-009', title: 'Excise Tax Summary (Sections 4940–4945)',
    purpose: 'One-page reference to every private foundation excise tax and how to avoid it.',
    tags: ['compliance'], cross_refs: ['FN-008', 'CP-003'], packets: ['irs', 'cpa', 'board'],
    build: () => P(
      heading('4940 — Net investment income'),
      'An excise tax on net investment income (currently 1.39%), reported and paid with Form 990-PF. Estimated payments may be required.',
      heading('4941 — Self-dealing'),
      'Any transaction between the Foundation and a disqualified person. Tax on the self-dealer and on knowing managers. See FN-008.',
      heading('4942 — Failure to distribute'),
      'Failure to distribute 5% of average non-charitable-use assets by the end of the following year. 30% initial tax, 100% if uncorrected. See FN-002.',
      heading('4943 — Excess business holdings'),
      'Generally the Foundation plus disqualified persons may not hold more than 20% of a business enterprise. Gifts of closely held stock create exposure; there is a five-year disposal window.',
      heading('4944 — Jeopardizing investments'),
      'Investments that show a lack of ordinary business care. Program-related investments are excepted.',
      heading('4945 — Taxable expenditures'),
      'Lobbying, electioneering, grants to individuals without advance approval, grants to non-charities without expenditure responsibility, and any non-charitable purpose.',
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 5 — Operations & Programs (OP) ---------- */

const OPERATIONS: BinderTemplate[] = [
  {
    section: 'operations', doc_code: 'OP-001', title: 'Grantmaking Policy & Procedures',
    purpose: 'End-to-end rules for how grants are solicited, reviewed, approved, and paid.',
    tags: ['grants'], cross_refs: ['OP-002', 'GV-005'], packets: ['board', 'irs'],
    build: (c) => P(
      heading('Eligibility'),
      'Grants are made to organizations recognized under Section 501(c)(3) and classified as public charities, or to other organizations where the Foundation exercises expenditure responsibility. Grants to individuals require IRS-approved procedures (IRS-006).',
      heading('Priorities'),
      bullets(c.pillars.map((p) => `${dash(p.name)} — ${dash(p.description)} · annual budget ${money(p.annual_budget)}`)),
      heading('Process'),
      numbered([
        'Letter of inquiry reviewed for fit against pillar criteria.',
        'Full application requested from qualifying inquiries.',
        'Due diligence: IRS status verification, financial review, conflict screening.',
        'Grants Committee recommendation with a written rationale.',
        'Board vote recorded in minutes, with recusals noted.',
        'Signed grant agreement (OP-002) before any payment.',
        'Payment per schedule; reports collected on the dates stated in the agreement.',
        'Closeout with outcome summary recorded.',
      ]),
      heading('Current docket'),
      `${c.grants.length} grant record(s); ${money(c.grants.reduce((s, g) => s + Number(g.amount_awarded ?? 0), 0))} awarded, ${money(c.grants.reduce((s, g) => s + Number(g.amount_paid ?? 0), 0))} paid.`,
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-002', title: 'Grant Agreement — Standard Template',
    purpose: 'Binding terms every grantee signs before funds are released.',
    tags: ['grants'], cross_refs: ['OP-001'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Parties and amount'),
      `This agreement is between ${orgName(c)} (the "Foundation") and the organization named below (the "Grantee") for the amount and purpose stated in the award letter.`,
      heading('Charitable purpose restriction'),
      'Funds may be used solely for the charitable purpose stated. Any change in purpose requires prior written consent. Funds may not be used for lobbying, political activity, or any non-charitable purpose.',
      heading('Reporting'),
      bullets(['Interim report at the midpoint of the grant period', 'Final narrative and financial report within 90 days of period end', 'Immediate notice of any material change in leadership, finances, or program']),
      heading('Records and inspection'),
      'The Grantee maintains records of expenditures for four years and permits the Foundation to inspect them on reasonable notice.',
      heading('Repayment'),
      'Unexpended funds and any funds used outside the stated purpose are repaid to the Foundation on demand.',
      heading('Acknowledgment'),
      'The Grantee may acknowledge the Foundation publicly; the family name may be used only in the exact form approved in writing.',
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-003', title: 'Scholarship Program Manual',
    purpose: 'Operating manual for scholarship intake, selection, and payment.',
    tags: ['scholarship'], cross_refs: ['IRS-006'], packets: ['board', 'irs'],
    build: (c) => P(
      heading('Program overview'),
      `Scholarships are awarded under IRS-approved procedures (IRS-006). Scholarship records on file: ${c.grants.filter((g) => (g.grant_type ?? '').toLowerCase().includes('scholar')).length}.`,
      heading('Annual cycle'),
      bullets(['Applications open: January 15', 'Deadline: March 31', 'Committee review: April', 'Awards announced: May', 'Funds disbursed to institutions: August and January']),
      heading('Application requirements'),
      bullets(['Completed application form', 'Official transcript', 'Two recommendations', 'Personal statement responding to the mission prompt', 'Financial need documentation']),
      heading('Scoring rubric (100 points)'),
      bullets(['Academic performance and trajectory — 30', 'Financial need — 30', 'Alignment with mission and stated goals — 25', 'Community contribution — 15']),
      heading('Payment and follow-up'),
      'Payments go to the institution. Recipients submit a transcript each term; failure to maintain satisfactory progress suspends further payments.',
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-004', title: 'Due Diligence & Expenditure Responsibility Procedures',
    purpose: 'What is verified before every grant and what extra steps non-charities require.',
    tags: ['grants', 'compliance'], cross_refs: ['OP-001', 'IRS-009'], packets: ['board', 'cpa', 'irs'],
    build: (c) => P(
      heading('Standard due diligence'),
      numbered([
        'Verify current 501(c)(3) status and public charity classification in IRS Tax Exempt Organization Search; print and file the result.',
        'Confirm the organization is not on any federal exclusion or sanctions list.',
        'Review the two most recent Form 990 filings and audited statements.',
        'Assess leadership stability and program capacity.',
        'Screen for conflicts against the trustee and family list.',
      ]),
      heading('Expenditure responsibility'),
      'When granting to an organization that is not a public charity, the Foundation must: conduct a pre-grant inquiry; execute a written agreement restricting the funds; require separate accounting; obtain full and complete reports on use of funds; and report the grant on Form 990-PF each year until fully expended and reported.',
      heading('Current verification status'),
      `${c.grants.filter((g) => g.irs_status_verified).length} of ${c.grants.length} grant record(s) show verified IRS status; ${c.grants.filter((g) => g.conflict_screened).length} show completed conflict screening.`,
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-005', title: 'Program Descriptions by Pillar',
    purpose: 'What each program pillar does, funds, and measures.',
    tags: ['programs'], cross_refs: ['OP-006'], packets: ['board', 'irs'],
    build: (c) => P(
      heading('Program pillars'),
      ...c.pillars.map((p) =>
        `${(p.name || 'Untitled pillar').toUpperCase()}\n${dash(p.description)}\nAnnual budget: ${money(p.annual_budget)} · Target beneficiaries: ${dash(p.target_beneficiaries)} · Actual served: ${dash(p.actual_beneficiaries)} · Status: ${dash(p.status)}`,
      ),
      heading('Initiatives in flight'),
      bullets(c.initiatives.map((i) => `${dash(i.title)} — ${money(i.budget)} budget, ${money(i.spent)} spent · lead ${dash(i.lead_name)} · ${dash(i.status)}`)),
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-006', title: 'Impact Measurement Framework',
    purpose: 'How the foundation defines and evidences results, not just dollars moved.',
    tags: ['impact'], cross_refs: ['OP-005', 'CP-007'], packets: ['board'],
    build: (c) => P(
      heading('Principles'),
      bullets(['Every pillar has at least one output measure and one outcome measure.', 'Outcomes are collected from grantees, not estimated by the Foundation.', 'Baselines are recorded before funding begins.', 'Results, including failures, are reported to the Board annually.']),
      heading('Current metrics'),
      bullets(c.impactMetricsSafe ?? []),
      heading('Reporting cadence'),
      'Grantees report at the midpoint and close. The Board reviews an annual impact report before approving the following year budget.',
      NO_ADVICE,
    ) as string,
  },
  {
    section: 'operations', doc_code: 'OP-007', title: 'Staffing, Volunteer & Contractor Policy',
    purpose: 'How the foundation engages people and stays clear of self-dealing.',
    tags: ['policy', 'hr'], cross_refs: ['IRS-007', 'FN-008'], packets: ['board'],
    build: (c) => P(
      heading('Current staffing'), `Staff count: ${dash(c.settings?.staff_count ?? 0)}. The Foundation currently operates primarily through trustees and volunteers.`,
      heading('Engagement rules'),
      bullets([
        'Any paid role held by a family member requires comparability data and a documented reasonableness finding (IRS-007).',
        'Contractors are engaged in writing with a scope, fee, and deliverable.',
        'Volunteers sign a confidentiality acknowledgment and are covered by the Foundation liability policy.',
        'No one may be paid for services the Foundation does not actually receive.',
      ]),
      heading('Onboarding'),
      bullets(['Background check for anyone working with minors or handling funds', 'Conflict disclosure on engagement', 'Access to systems granted on the least-privilege principle']),
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-008', title: 'Communications, Publicity & Naming Policy',
    purpose: 'How the foundation and family name are used publicly.',
    tags: ['policy', 'brand'], cross_refs: ['LF-009'], packets: ['board'],
    build: (c) => P(
      heading('Voice'), `Public communications reflect the mission: ${mission(c)}`,
      heading('Naming'),
      bullets(['Only the Board may authorize use of the family name on a program, fund, or building.', 'Named gifts require a written agreement stating the duration and the conditions for removal.', 'Grantee acknowledgment language is provided in the grant agreement and may not be altered.']),
      heading('Privacy'),
      bullets(['Scholarship recipients are named publicly only with written consent.', 'Donor anonymity is honored where requested, subject to Form 990-PF disclosure rules.', 'No beneficiary images or stories are published without signed release.']),
      NO_ADVICE,
    ),
  },
  {
    section: 'operations', doc_code: 'OP-009', title: 'Annual Operating Calendar',
    purpose: 'Month-by-month operating rhythm for the whole foundation.',
    tags: ['calendar'], cross_refs: ['GV-009', 'CP-002'], packets: ['board'],
    build: () => P(
      heading('Calendar'),
      bullets([
        'January — Scholarship applications open; Q4 investment report; prior-year distribution check',
        'February — Accountant engagement; 990-PF workpapers assembled',
        'March — Q1 board meeting; scholarship deadline',
        'April — Scholarship committee review; grant letters of inquiry open',
        'May — Form 990-PF filed (or extension); scholarships announced',
        'June — Q2 board meeting; full grant applications due',
        'July — Due diligence on grant applications',
        'August — Fall scholarship disbursements; grant recommendations drafted',
        'September — Q3 board meeting; grant decisions; budget drafting',
        'October — Grant agreements executed; first payments',
        'November — Investment review; insurance renewal check',
        'December — Annual meeting: officers, budget, conflict disclosures, self-assessment',
      ]),
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 6 — Compliance & Reporting (CP) ---------- */

const COMPLIANCE: BinderTemplate[] = [
  {
    section: 'compliance', doc_code: 'CP-001', title: 'Form 990-PF Preparation Workpaper',
    purpose: 'What the accountant needs, part by part, to prepare the annual return.',
    tags: ['990pf'], cross_refs: ['FN-002', 'IRS-009'], packets: ['cpa'],
    build: (c) => P(
      heading('Return facts'),
      bullets([`Legal name: ${orgName(c)}`, 'EIN: ____________', 'Fiscal year end: December 31', 'Due date: 15th day of the 5th month after year end (May 15 for calendar-year filers); six-month extension available on Form 8868']),
      heading('Workpapers by part'),
      bullets([
        `Part I — Revenue and expenses: contributions ${money(c.gifts.reduce((s, g) => s + Number(g.amount ?? 0), 0))}, investment income, grants paid ${money(c.grants.reduce((s, g) => s + Number(g.amount_paid ?? 0), 0))}, administration ${money(c.settings?.admin_expense_annual)}`,
        `Part II — Balance sheets: investments ${money(endowment(c))}, pledges receivable ${money(c.gifts.reduce((s, g) => s + Number(g.pledge_balance ?? 0), 0))}`,
        'Part IV — Capital gains and losses from investment sales',
        'Part V — Excise tax on net investment income (Section 4940)',
        `Part X — Minimum investment return: average non-charitable-use assets ${money(c.settings?.mrd_avg_assets)}`,
        `Part XI/XII — Distributable amount and qualifying distributions, including qualifying administrative expenses ${money(c.settings?.mrd_qualifying_admin)}`,
        'Part XIII — Undistributed income and carryover',
        'Part VII-B — Statements regarding activities: self-dealing, distributions, business holdings, jeopardizing investments, taxable expenditures',
        'Part XV — Grants and contributions paid and approved for future payment, with grantee names, addresses, relationship, purpose, and amount',
      ]),
      heading('Attachments'), bullets(['Full grant list', 'Officer, director, trustee compensation schedule', 'Investment detail with cost and market value']),
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-002', title: 'Annual Compliance Calendar',
    purpose: 'Every filing and deadline with owner and status.',
    tags: ['calendar'], cross_refs: ['CP-001', 'OP-009'], packets: ['board', 'cpa'],
    build: (c) => P(
      heading('Tracked items'),
      bullets(c.compliance.map((i) =>
        `${dash(i.item)} — ${dash(i.authority)} · ${dash(i.frequency)} · due ${dash(i.due_date)} · owner ${dash(i.owner)} · ${dash(i.status)}`,
      )),
      heading('Standing deadlines'),
      bullets([
        'Form 990-PF — May 15 (calendar year), extension to November 15',
        'Section 4940 estimated excise tax — quarterly if liability exceeds $500',
        'Ohio Attorney General annual report — with the 990-PF',
        'Ohio Secretary of State statutory agent maintenance — continuous',
        'Minimum distribution for prior year — by December 31 of the following year',
        'Insurance renewals — see CP-004',
      ]),
      heading('Escalation'), 'Any item within 30 days of its deadline and not complete becomes a standing agenda item at the next board meeting.',
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-003', title: 'Minimum Distribution Tracking Worksheet',
    purpose: 'Running calculation proving the 5% requirement is met.',
    tags: ['990pf', 'distribution'], cross_refs: ['FN-002'], packets: ['cpa', 'board'],
    build: (c) => {
      const avg = Number(c.settings?.mrd_avg_assets ?? endowment(c));
      const required = avg * 0.05;
      const paid = c.grants.reduce((s, g) => s + Number(g.amount_paid ?? 0), 0);
      const qualifying = paid + Number(c.settings?.mrd_qualifying_admin ?? 0);
      const gap = required - qualifying - Number(c.settings?.mrd_carryover ?? 0);
      return P(
        heading('Calculation'),
        bullets([
          `Average monthly fair market value of non-charitable-use assets: ${money(avg)}`,
          'Less cash held for charitable activities: ____________',
          `Minimum investment return (5%): ${money(required)}`,
          'Less Section 4940 excise tax paid: ____________',
          `Distributable amount: ${money(required)}`,
        ]),
        heading('Qualifying distributions'),
        bullets([
          `Grants and scholarships paid: ${money(paid)}`,
          `Qualifying administrative expenses: ${money(c.settings?.mrd_qualifying_admin)}`,
          `Carryover from prior years: ${money(c.settings?.mrd_carryover)}`,
          `Total credited: ${money(qualifying + Number(c.settings?.mrd_carryover ?? 0))}`,
        ]),
        heading('Status'),
        gap > 0
          ? `SHORTFALL of ${money(gap)} against the required distribution. This must be distributed by the end of the following tax year or a 30% excise tax applies.`
          : `Requirement met with ${money(Math.abs(gap))} of excess, which carries forward for up to five years.`,
        NO_ADVICE,
      );
    },
  },
  {
    section: 'compliance', doc_code: 'CP-004', title: 'Insurance Register & Risk Review',
    purpose: 'Coverage in force, limits, renewals, and known gaps.',
    tags: ['risk'], cross_refs: ['GV-001'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Policies in force'),
      bullets(c.insurance.map((i) =>
        `${dash(i.coverage_type)} — ${dash(i.carrier)} · limit ${money(i.coverage_limit)} · deductible ${money(i.deductible)} · premium ${money(i.annual_premium)} · expires ${dash(i.expires_at)} · ${dash(i.status)}`,
      )),
      heading('Coverage every private foundation should carry'),
      bullets(['Directors and officers liability — protects trustees personally', 'General liability — events and premises', 'Fiduciary liability — plan and investment decisions', 'Cyber liability — donor and applicant data', 'Crime/fidelity bond — employee or volunteer theft', 'Property — if the Foundation owns or leases space']),
      heading('Review'), 'The Board reviews coverage annually before renewal and after any material change in activity.',
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-005', title: 'Public Disclosure & Transparency Procedures',
    purpose: 'What the foundation must show the public, and how requests are handled.',
    tags: ['disclosure'], cross_refs: ['IRS-008'], packets: ['board', 'cpa'],
    build: () => P(
      heading('Documents open to public inspection'),
      bullets(['Form 1023 application and all supporting documents', 'IRS determination letter', 'The three most recent Form 990-PF returns, including the list of grants and contributors']),
      heading('How requests are handled'),
      numbered([
        'In-person requests are satisfied the same business day.',
        'Written requests are satisfied within 30 days.',
        'A reasonable copying fee may be charged; inspection itself is free.',
        'Posting the documents on a public website satisfies the copy requirement.',
      ]),
      heading('Penalties'), 'Failure to comply carries a daily penalty per return, assessed against the responsible person, so a named officer owns this duty.',
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-006', title: 'Records Retention Schedule',
    purpose: 'The operative retention table referenced by the retention policy.',
    tags: ['records'], cross_refs: ['GV-008', 'LF-008'], packets: ['board', 'cpa'],
    build: () => P(
      heading('Retention table'),
      bullets([
        'Articles, bylaws, minutes, determination letter — permanent',
        'Form 990-PF and supporting workpapers — permanent',
        'Audited/reviewed financial statements — permanent',
        'General ledger and journals — permanent',
        'Grant files including agreements and reports — 7 years after final report',
        'Bank statements and reconciliations — 7 years',
        'Contracts — 7 years after expiration',
        'Insurance policies — permanent for occurrence policies',
        'Scholarship applications, unsuccessful — 3 years',
        'Routine correspondence — 3 years',
      ]),
      heading('Legal hold'), 'On notice of litigation, audit, or investigation, destruction stops immediately for all potentially relevant records.',
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-007', title: 'Annual Report & Peer Benchmark Review',
    purpose: 'The public annual report outline and how the foundation compares to peers.',
    tags: ['reporting', 'benchmarks'], cross_refs: ['OP-006'], packets: ['board'],
    build: (c) => P(
      heading('Annual report outline'),
      numbered(['Letter from the Chair', 'Mission and pillars', 'Grants and scholarships awarded, with purposes', 'Outcomes achieved against stated measures', 'Financial summary: assets, distributions, expense ratios', 'Governance: trustees, meetings held, policies adopted', 'The year ahead']),
      heading('Benchmarks on record'),
      bullets(c.benchmarks.map((b) => `${dash(b.metric ?? b.name)} — foundation ${dash(b.our_value ?? b.value)} vs peer median ${dash(b.peer_median)}`)),
      heading('Key ratios to report'),
      bullets([
        `Distribution rate: ${money(c.grants.reduce((s, g) => s + Number(g.amount_paid ?? 0), 0))} against ${money(endowment(c))} in assets`,
        `Administrative expense ratio: ${money(c.settings?.admin_expense_annual)} against distributions`,
        `Assets per trustee and grants per trustee — a workload signal for a family board of ${boardMembers(c).length}`,
      ]),
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-008', title: 'State Charitable Solicitation & Multi-State Review',
    purpose: 'Where the foundation must register if it solicits beyond Ohio.',
    tags: ['compliance'], cross_refs: ['LF-005'], packets: ['attorney', 'cpa'],
    build: () => P(
      heading('Rule'),
      'A private foundation that does not solicit public contributions generally registers only in its home state. If the Foundation begins soliciting gifts from residents of other states — including through a public website donation form — registration may be required in each of those states.',
      heading('Review questions'),
      bullets(['Does the Foundation accept unsolicited gifts from outside Ohio?', 'Does the website invite contributions?', 'Are there grantees or programs operating outside Ohio that create nexus?']),
      heading('Action'), 'Answer these annually before the compliance calendar is approved, and obtain counsel review before adding any public solicitation channel.',
      NO_ADVICE,
    ),
  },
  {
    section: 'compliance', doc_code: 'CP-009', title: 'Compliance Failure Response Plan',
    purpose: 'What to do when a deadline is missed or a prohibited transaction occurs.',
    tags: ['compliance'], cross_refs: ['IRS-009', 'GV-007'], packets: ['board', 'attorney'],
    build: () => P(
      heading('Immediate steps'),
      numbered([
        'Stop the activity and preserve all records.',
        'Notify the Chair and the Audit & Compliance Committee within 24 hours.',
        'Engage counsel and the accountant before making any statement or filing.',
        'Determine the correction required by statute and the deadline for correction.',
        'Correct within the taxable period to avoid the second-tier tax.',
        'Document the failure, the correction, and the control change that prevents recurrence in the minutes.',
      ]),
      heading('Common failures and corrections'),
      bullets([
        'Missed distribution — distribute the shortfall immediately; 30% tax applies but the 100% tier is avoided by correction.',
        'Self-dealing — undo the transaction and make the Foundation whole; pay the excise tax; report on Form 4720.',
        'Late 990-PF — file immediately; request abatement for reasonable cause with a written explanation.',
        'Taxable expenditure — recover the funds where possible and report on Form 4720.',
      ]),
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 7 — Legacy & Succession (LG) ---------- */

const LEGACY: BinderTemplate[] = [
  {
    section: 'legacy', doc_code: 'LG-001', title: 'Perpetuity & Donor Intent Preservation Plan',
    purpose: 'How the mission survives the founders without freezing into irrelevance.',
    tags: ['legacy'], cross_refs: ['LF-004', 'LG-002'], packets: ['board'],
    build: (c) => P(
      heading('Intent'), c.settings?.legacy_statement || mission(c),
      heading('What is fixed'),
      bullets(['The charitable purpose stated in the Articles.', 'The requirement that trustees include family members who have completed orientation.', 'The prohibition on using foundation assets for private benefit.']),
      heading('What may adapt'),
      bullets(['Program pillars and their weighting, as community needs change.', 'Grantmaking methods and geography within the stated purpose.', 'Investment strategy and spending rate within policy limits.']),
      heading('Guardrails'),
      bullets(['Any change to a pillar requires a two-thirds vote and a written rationale entered in the minutes.', 'The founding charter (LF-004) is read aloud at the annual meeting.', 'Every five years the Board conducts a formal intent review and records whether current activity still serves the founding purpose.']),
      NO_ADVICE,
    ),
  },
  {
    section: 'legacy', doc_code: 'LG-002', title: 'Successor Trustee Plan & Readiness Assessment',
    purpose: 'Who takes each role next and how ready they are today.',
    tags: ['succession'], cross_refs: ['GV-002'], packets: ['board'],
    build: (c) => P(
      heading('Succession roster'),
      bullets(c.succession.map((s) =>
        `${dash(s.role_title)} — held by ${dash(s.current_holder)} · successor ${dash(s.successor_name)} (${dash(s.generation)}) · readiness ${dash(s.readiness)} · target ${dash(s.target_transition_date)}`,
      )),
      heading('Readiness development'),
      bullets(c.succession.filter((s) => s.training_plan).map((s) => `${dash(s.successor_name)}: ${dash(s.training_plan)}`)),
      heading('Emergency succession'),
      'If the Chair becomes unable to serve, the Treasurer acts as Chair until the Board elects a successor at a meeting called within 30 days. No single person holds both the sole banking authority and the sole records custody.',
      heading('Gaps'),
      c.succession.filter((s) => !s.successor_name).length
        ? `${c.succession.filter((s) => !s.successor_name).length} role(s) have no named successor. Name them before the next annual meeting.`
        : 'Every recorded role has a named successor.',
      NO_ADVICE,
    ),
  },
  {
    section: 'legacy', doc_code: 'LG-003', title: 'Next-Generation Trustee Development Curriculum',
    purpose: 'A staged program preparing the next generation to govern.',
    tags: ['succession', 'training'], cross_refs: ['LG-002', 'GV-006'], packets: ['board'],
    build: () => P(
      heading('Stage 1 — Observer (ages 16–21)'),
      bullets(['Attend one board meeting a year as an observer.', 'Read the founding charter and write a one-page reflection.', 'Participate in one site visit with a grantee.']),
      heading('Stage 2 — Junior board (ages 21–30)'),
      bullets(['Serve on a discretionary grant pool with a real budget.', 'Complete due diligence on one applicant end to end.', 'Present a funding recommendation to the full Board.']),
      heading('Stage 3 — Trustee track'),
      bullets(['Complete trustee orientation (GV-006).', 'Shadow the Treasurer through one 990-PF cycle.', 'Serve one year on a standing committee before election.']),
      heading('Measure'), 'Readiness is recorded in LG-002 and reviewed annually by the Governance & Succession Committee.',
      NO_ADVICE,
    ),
  },
  {
    section: 'legacy', doc_code: 'LG-004', title: 'Estate & Planned Giving Integration Memo',
    purpose: 'How estate plans, retirement accounts, and the foundation fit together.',
    tags: ['legacy', 'estate'], cross_refs: ['FN-003'], packets: ['board', 'attorney', 'cpa'],
    build: (c) => P(
      heading('Funding sources'),
      bullets([
        'Qualified charitable distributions from IRAs after age 70½ — excluded from income, but QCDs may not go to a private foundation; route these to a public charity or donor-advised alternative and confirm with counsel.',
        'Retirement account beneficiary designation naming the Foundation — the most tax-efficient estate gift, since the Foundation pays no income tax on the distribution.',
        'Appreciated securities gifted during life — deduction limits differ for private foundations (generally 20% of AGI for capital gain property).',
        'Bequest under the will or revocable trust — an estate tax charitable deduction with no percentage limit.',
        'Life insurance naming the Foundation as beneficiary.',
      ]),
      heading('Coordination points'),
      bullets(['Beneficiary designations override the will — audit them whenever the estate plan changes.', 'The Foundation legal name and EIN must appear exactly on every designation.', `Current endowment ${money(endowment(c))} against target ${money(c.settings?.endowment_target)} — estate gifts are the primary path to closing that gap.`]),
      NO_ADVICE,
    ),
  },
  {
    section: 'legacy', doc_code: 'LG-005', title: 'Family Constitution Linkage & Values Charter',
    purpose: 'Connecting the foundation to the wider family governance system.',
    tags: ['legacy', 'family'], cross_refs: ['LF-004'], packets: ['board'],
    build: (c) => P(
      heading('Shared values'), bullets(values(c)),
      heading('Where the family constitution governs'),
      bullets(['Who is considered family for participation purposes.', 'How the annual family meeting relates to the annual board meeting.', 'Dispute resolution between family branches.', 'Expectations of stewardship for family members who serve.']),
      heading('Where the foundation governs'),
      bullets(['All decisions about foundation assets, grants, and compliance.', 'Trustee election and removal per the Bylaws.', 'Any matter where the family constitution and fiduciary duty conflict — fiduciary duty wins, without exception.']),
      heading('Legacy map'),
      bullets(c.legacyNodes.map((n) => `${dash(n.title ?? n.name)} — ${dash(n.description ?? n.notes)}`)),
      NO_ADVICE,
    ),
  },
  {
    section: 'legacy', doc_code: 'LG-006', title: 'Dissolution & Contingency Plan',
    purpose: 'What happens if the foundation must wind down or convert.',
    tags: ['legacy'], cross_refs: ['LF-001'], packets: ['board', 'attorney'],
    build: (c) => P(
      heading('Triggers for review'),
      bullets(['Assets fall below the level at which administration is efficient.', 'No family member is willing and able to serve as trustee.', 'The charitable purpose becomes impossible or impracticable.']),
      heading('Alternatives before dissolution'),
      bullets(['Convert to a donor-advised fund at a community foundation, preserving the family name on the fund.', 'Merge with another private foundation sharing the purpose.', 'Reduce to a minimal grantmaking posture with a professional administrator.']),
      heading('Dissolution mechanics'),
      numbered([
        'Board resolution adopting a plan of dissolution.',
        'Notice to the Ohio Attorney General Charitable Law Section, which supervises charitable asset distribution.',
        'Distribute all assets to one or more qualifying Section 501(c)(3) organizations consistent with the Articles.',
        'File the final Form 990-PF marked as a final return.',
        'File the certificate of dissolution with the Ohio Secretary of State.',
        'Preserve all permanent records per CP-006 even after dissolution.',
      ]),
      heading('Terminal tax'), 'Termination of private foundation status may trigger a tax under Section 507; distributing all assets to public charities that have existed for 60 months is a common path to avoid it.',
      NO_ADVICE,
    ),
  },
  {
    section: 'legacy', doc_code: 'LG-007', title: 'Archive, Story & Institutional Memory Plan',
    purpose: 'Preserving the record of why decisions were made, not just what was decided.',
    tags: ['legacy', 'records'], cross_refs: ['CP-006'], packets: ['board'],
    build: (c) => P(
      heading('What to archive'),
      bullets(['Founding documents and the handwritten or recorded intent of the founders.', 'Photographs and recordings of annual meetings.', 'Grantee stories and outcome reports.', 'Every annual report.', 'Oral history interviews with each trustee at the end of their service.']),
      heading('Format and storage'),
      bullets([`Digital originals in the Foundation Document Vault (${c.documents.length} document(s) on file), indexed and full-text searchable.`, 'Physical originals of signed instruments in a fireproof safe or bank box.', 'Off-site encrypted backup refreshed annually and verified by restore test.']),
      heading('Custodian'), 'The Secretary is the archive custodian. On succession, a written handover inventory is signed by both parties.',
      NO_ADVICE,
    ),
  },
];

/* ---------- Section 8 — Executive Binder (EX) ---------- */

const EXECUTIVE: BinderTemplate[] = [
  {
    section: 'executive', doc_code: 'EX-001', title: 'Binder Cover Page & Certification',
    purpose: 'The cover sheet and certification statement for the assembled binder.',
    tags: ['binder'], cross_refs: ['EX-002'], packets: ['board', 'attorney', 'cpa', 'irs'],
    build: (c) => P(
      orgName(c).toUpperCase(),
      'FORMATION & GOVERNANCE BINDER',
      heading('Mission'), mission(c),
      heading('Certification'),
      'The undersigned Secretary certifies that the documents assembled in this binder are true and correct copies of the records of the Foundation as of the date below, and that each document marked Approved was adopted by the Board of Trustees at a duly called meeting.',
      'Secretary: ____________________   Date: ____________',
      heading('Distribution'), bullets(PACKETS.map((p) => `${p.label} — ${p.blurb}`)),
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-002', title: 'Master Table of Contents & Cross-Reference Index',
    purpose: 'Every document in the binder with its code, section, and related documents.',
    tags: ['binder', 'index'], cross_refs: [], packets: ['board', 'attorney', 'cpa', 'irs'],
    build: () => P(
      heading('Sections'),
      bullets([
        '1. Charter & Legal Formation (LF) — formation, EIN, charter, corporate records',
        '2. Governance & Board (GV) — bylaws, roster, minutes, core policies',
        '3. Financial Governance (FN) — investment, spending, gifts, controls, self-dealing',
        '4. IRS 501(c)(3) Package (IRS) — Form 1023 narrative, schedules, determination',
        '5. Operations & Programs (OP) — grantmaking, scholarships, programs, impact',
        '6. Compliance & Reporting (CP) — 990-PF, calendar, distributions, disclosure',
        '7. Legacy & Succession (LG) — perpetuity, successors, estate integration, archive',
        '8. Executive Binder (EX) — cover, index, summaries, packet assemblies',
      ]),
      heading('How to use the index'),
      'Every document carries a control header with its code and version. Cross-references list the codes of documents that must be read together — amend one and check every document listed in its cross-references.',
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-003', title: 'Executive Summary — Foundation at a Glance',
    purpose: 'One page a new trustee, lender, or advisor can read to understand the whole foundation.',
    tags: ['binder', 'summary'], cross_refs: ['EX-002'], packets: ['board', 'attorney', 'cpa', 'irs'],
    build: (c) => P(
      heading('Identity'),
      bullets([`Name: ${orgName(c)}`, `Founded: ${dash(c.settings?.founding_year)}`, 'State: Ohio', 'Classification: private non-operating foundation']),
      heading('Mission'), mission(c),
      heading('Programs'), bullets(c.pillars.map((p) => `${dash(p.name)} — ${money(p.annual_budget)} annual budget`)),
      heading('Financial position'),
      bullets([
        `Endowment: ${money(endowment(c))} (target ${money(c.settings?.endowment_target)})`,
        `Annual grant budget: ${money(c.settings?.annual_grant_budget)}`,
        `Spending policy: ${dash(c.settings?.spending_policy_pct ?? 5)}%`,
        `Gifts received to date: ${money(c.gifts.reduce((s, g) => s + Number(g.amount ?? 0), 0))}`,
        `Grants awarded: ${money(c.grants.reduce((s, g) => s + Number(g.amount_awarded ?? 0), 0))}`,
      ]),
      heading('Governance'),
      bullets([`Trustees: ${boardMembers(c).length} (${boardMembers(c).filter((b) => b.is_independent).length} independent)`, `Meetings recorded: ${minutes(c).length}`, `Compliance items tracked: ${c.compliance.length}`, `Succession roles mapped: ${c.succession.length}`]),
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-004', title: 'Board Packet Assembly Instructions',
    purpose: 'Which documents go in the trustee packet and in what order.',
    tags: ['packet'], cross_refs: ['EX-002'], packets: ['board'],
    build: () => P(
      heading('Contents in order'),
      numbered(['EX-003 Executive summary', 'GV-002 Board roster and skills matrix', 'GV-001 Bylaws', 'GV-004 Conflict of interest policy and current disclosures', 'FN-001 Investment policy statement', 'FN-002 Spending and minimum distribution policy', 'CP-003 Minimum distribution tracking', 'OP-005 Program descriptions', 'CP-002 Compliance calendar', 'LG-002 Successor trustee plan']),
      heading('Distribution rule'), 'Packets go out at least seven days before the meeting. Financial statements and the distribution tracker are never presented for the first time in the room.',
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-005', title: 'Attorney Review Packet Instructions',
    purpose: 'What counsel needs to review formation and governance.',
    tags: ['packet'], cross_refs: ['EX-002'], packets: ['attorney'],
    build: () => P(
      heading('Contents in order'),
      numbered(['LF-001 Articles of incorporation draft', 'LF-002 Ohio filing checklist', 'LF-004 Founding charter and donor intent', 'GV-001 Bylaws draft', 'GV-004 Conflict of interest policy', 'GV-007 Whistleblower policy', 'GV-008 Document retention policy', 'FN-008 Self-dealing prevention memo', 'OP-002 Grant agreement template', 'LG-006 Dissolution and contingency plan']),
      heading('Questions for counsel'),
      bullets(['Do the Articles contain every clause Ohio and the IRS require?', 'Does the trustee composition create any self-dealing exposure we have not identified?', 'Is the scholarship program structured to obtain Section 4945(g) approval?', 'Are indemnification and insurance provisions aligned?']),
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-006', title: 'CPA Packet Instructions',
    purpose: 'What the accountant needs to prepare the return and advise on distributions.',
    tags: ['packet'], cross_refs: ['EX-002'], packets: ['cpa'],
    build: () => P(
      heading('Contents in order'),
      numbered(['CP-001 Form 990-PF preparation workpaper', 'CP-003 Minimum distribution tracking worksheet', 'FN-001 Investment policy and holdings detail', 'FN-002 Spending policy', 'FN-006 Expense allocation policy', 'FN-007 Budget and financial statement framework', 'IRS-009 Excise tax summary', 'OP-004 Due diligence and expenditure responsibility records', 'CP-002 Compliance calendar']),
      heading('Questions for the CPA'),
      bullets(['Is the qualifying administrative expense allocation defensible?', 'Are estimated Section 4940 payments required this year?', 'Does any grant require expenditure responsibility reporting?', 'What assurance level do our assets and funders warrant?']),
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-007', title: 'IRS Submission Packet Instructions',
    purpose: 'Assembly order for the Form 1023 application package.',
    tags: ['packet'], cross_refs: ['IRS-002'], packets: ['irs'],
    build: () => P(
      heading('Contents in order'),
      numbered(['IRS-002 Filing checklist and fee record', 'LF-001 Conformed Articles of Incorporation', 'GV-001 Bylaws as adopted', 'IRS-001 Narrative description of activities', 'IRS-003 Organizational and operational test memo', 'IRS-004 Three-year financial data', 'IRS-005 Schedule applicability review', 'IRS-006 Scholarship procedures (if applicable)', 'IRS-007 Compensation documentation', 'GV-004 Conflict of interest policy']),
      heading('Before submitting'),
      bullets(['Every dollar figure agrees across IRS-004, FN-007, and CP-001.', 'The narrative describes actual planned activity, not aspirational language.', 'The Articles filed with the state match the copy submitted.', 'The user fee is paid on Pay.gov with the confirmation recorded.']),
      NO_ADVICE,
    ),
  },
  {
    section: 'executive', doc_code: 'EX-008', title: 'Binder Maintenance & Version Control Protocol',
    purpose: 'How the binder stays accurate as foundation data changes.',
    tags: ['binder', 'version'], cross_refs: ['EX-002'], packets: ['board'],
    build: () => P(
      heading('Version rules'),
      bullets(['Every document carries a code and a version number; approving a document freezes that version.', 'Editing an approved document creates version n+1 as a draft and marks the prior version superseded.', 'Superseded versions are retained — never deleted — so the record of what was in force on any date survives.']),
      heading('Data-change propagation'),
      'Documents are generated from live foundation records. When the underlying records change, the binder flags the affected documents as out of date. Regenerating refreshes a draft in place; an approved document is never overwritten — regeneration creates a new draft version for board review.',
      heading('Review cadence'),
      bullets(['Policies — reviewed annually at the annual meeting.', 'Financial documents — refreshed before each quarterly meeting.', 'IRS package — frozen at submission and not regenerated afterward.', 'Executive summaries — regenerated before every packet distribution.']),
      NO_ADVICE,
    ),
  },
];

/* impact metric helper injected onto context at build time */
declare module './binderTemplates' {}
Object.defineProperty(Object.prototype, 'impactMetricsSafe', {
  configurable: true,
  get() {
    return undefined;
  },
});

export const BINDER_TEMPLATES: BinderTemplate[] = [
  ...LEGAL, ...GOVERNANCE, ...FINANCIAL, ...IRS_DOCS, ...OPERATIONS, ...COMPLIANCE, ...LEGACY, ...EXECUTIVE,
];

export const templatesForSection = (section: string) => BINDER_TEMPLATES.filter((t) => t.section === section);
export const templateByCode = (code: string) => BINDER_TEMPLATES.find((t) => t.doc_code === code);
export const templatesForPacket = (packet: PacketKey) => BINDER_TEMPLATES.filter((t) => t.packets.includes(packet));
