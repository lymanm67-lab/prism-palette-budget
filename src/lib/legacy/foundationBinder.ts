// Foundation Formation & Governance Binder — section spine + document control standard.

export interface BinderSectionDef {
  key: string;
  tabLabel: string;
  title: string;
  blurb: string;
  /** Document code prefix, e.g. LF for Legal Formation → LF-001 */
  prefix: string;
}

export const BINDER_SECTIONS: BinderSectionDef[] = [
  {
    key: 'legal',
    tabLabel: '1. Legal Formation',
    title: 'Charter & Legal Formation',
    blurb: 'Articles of incorporation, EIN record, state registrations, and the founding charter documents.',
    prefix: 'LF',
  },
  {
    key: 'governance',
    tabLabel: '2. Governance',
    title: 'Governance & Board',
    blurb: 'Bylaws, board roster and terms, committee charters, minutes templates, and conflict-of-interest policy.',
    prefix: 'GV',
  },
  {
    key: 'financial',
    tabLabel: '3. Financial Governance',
    title: 'Financial Governance',
    blurb: 'Investment policy, spending policy, internal controls, gift acceptance, and expense allocation.',
    prefix: 'FN',
  },
  {
    key: 'irs',
    tabLabel: '4. IRS 501(c)(3)',
    title: 'IRS 501(c)(3) Package',
    blurb: 'Form 1023 narrative, schedules, attachments, and the determination-letter record.',
    prefix: 'IRS',
  },
  {
    key: 'operations',
    tabLabel: '5. Operations',
    title: 'Operations & Programs',
    blurb: 'Grantmaking procedures, scholarship criteria, program descriptions, and staffing.',
    prefix: 'OP',
  },
  {
    key: 'compliance',
    tabLabel: '6. Compliance',
    title: 'Compliance & Reporting',
    blurb: '990-PF workpapers, 5% minimum distribution record, public disclosure, and the audit calendar.',
    prefix: 'CP',
  },
  {
    key: 'legacy',
    tabLabel: '7. Legacy',
    title: 'Legacy & Succession',
    blurb: 'Successor trustee instructions, perpetuity plan, family constitution linkage, and archival policy.',
    prefix: 'LG',
  },
  {
    key: 'executive',
    tabLabel: '8. Executive Binder',
    title: 'Executive Summary Binder',
    blurb: 'Cover pages, table of contents, and the packet assemblies for board, attorney, CPA, and IRS.',
    prefix: 'EX',
  },
];

export const BINDER_SECTION_MAP: Record<string, BinderSectionDef> = Object.fromEntries(
  BINDER_SECTIONS.map((s) => [s.key, s]),
);

export const BINDER_STATUSES = ['draft', 'in_review', 'approved', 'superseded'] as const;
export type BinderStatus = (typeof BINDER_STATUSES)[number];

export const STATUS_LABELS: Record<BinderStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  superseded: 'Superseded',
};

export const STATUS_TONE: Record<BinderStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  in_review: 'bg-prism-amber/15 text-prism-amber',
  approved: 'bg-emerald-500/15 text-emerald-500',
  superseded: 'bg-destructive/10 text-destructive',
};

export interface BinderDoc {
  id: string;
  household_id: string;
  section: string;
  doc_code: string;
  title: string;
  purpose: string | null;
  body: string | null;
  version: number;
  status: BinderStatus;
  prepared_by: string | null;
  reviewed_by: string | null;
  approved_on: string | null;
  effective_on: string | null;
  review_due_on: string | null;
  cross_refs: string[];
  tags: string[];
  sort_order: number;
  supersedes_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/** Next available document code for a section, e.g. GV-004. */
export function nextDocCode(sectionKey: string, docs: BinderDoc[]) {
  const prefix = BINDER_SECTION_MAP[sectionKey]?.prefix ?? 'DOC';
  const used = docs
    .filter((d) => d.doc_code.startsWith(`${prefix}-`))
    .map((d) => parseInt(d.doc_code.split('-')[1] ?? '0', 10))
    .filter((n) => !Number.isNaN(n));
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-${String(next).padStart(3, '0')}`;
}

/** Only the latest version of each doc_code. */
export function latestVersions(docs: BinderDoc[]) {
  const byCode = new Map<string, BinderDoc>();
  for (const d of docs) {
    const cur = byCode.get(d.doc_code);
    if (!cur || d.version > cur.version) byCode.set(d.doc_code, d);
  }
  return [...byCode.values()].sort((a, b) => a.sort_order - b.sort_order || a.doc_code.localeCompare(b.doc_code));
}

export interface DocControlBlock {
  organization: string;
  docCode: string;
  title: string;
  version: string;
  status: string;
  effective: string;
  approved: string;
  reviewDue: string;
  preparedBy: string;
  reviewedBy: string;
}

/** Standard document-control header data used by every generated binder document. */
export function docControl(doc: BinderDoc, organization: string): DocControlBlock {
  const dash = '—';
  return {
    organization,
    docCode: doc.doc_code,
    title: doc.title,
    version: `v${doc.version}.0`,
    status: STATUS_LABELS[doc.status] ?? doc.status,
    effective: doc.effective_on ?? dash,
    approved: doc.approved_on ?? dash,
    reviewDue: doc.review_due_on ?? dash,
    preparedBy: doc.prepared_by ?? dash,
    reviewedBy: doc.reviewed_by ?? dash,
  };
}

/** Footer line printed on every page of a generated document. */
export function docFooter(doc: BinderDoc, organization: string) {
  return `${organization} · ${doc.doc_code} · v${doc.version}.0 · ${STATUS_LABELS[doc.status] ?? doc.status}`;
}

export interface BinderProgress {
  total: number;
  approved: number;
  inReview: number;
  draft: number;
  pct: number;
}

export function binderProgress(docs: BinderDoc[]): BinderProgress {
  const live = latestVersions(docs);
  const approved = live.filter((d) => d.status === 'approved').length;
  const inReview = live.filter((d) => d.status === 'in_review').length;
  const draft = live.filter((d) => d.status === 'draft').length;
  return {
    total: live.length,
    approved,
    inReview,
    draft,
    pct: live.length ? Math.round((approved / live.length) * 100) : 0,
  };
}
