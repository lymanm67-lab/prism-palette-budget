// Foundation Operating Document builder — assembles a board-ready document from
// the live foundation records, then renders it to Word (.docx) or print/PDF.
// Planning tool only — not legal, tax, or investment advice.
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
  Footer,
  PageNumber,
} from 'docx';

export const DOC_STEPS = [
  { key: 'review', label: 'Foundation Dashboard', blurb: 'Confirm the snapshot the document will be built from.' },
  { key: 'mission', label: 'Mission', blurb: 'Purpose, vision, values, and the legacy statement.' },
  { key: 'board', label: 'Board', blurb: 'Directors, officers, and standing committees.' },
  { key: 'policies', label: 'Policies', blurb: 'The governing policies the board adopts.' },
  { key: 'programs', label: 'Programs', blurb: 'Pillars, initiatives, and grantmaking focus.' },
  { key: 'funding', label: 'Funding', blurb: 'Gifts, endowment, and spending policy.' },
  { key: 'compliance', label: 'Compliance', blurb: 'Filings, registrations, and the annual calendar.' },
  { key: 'generate', label: 'Generate Document', blurb: 'Export to Word or PDF.' },
] as const;

export type DocStepKey = (typeof DOC_STEPS)[number]['key'];

/** The 19 governing policies a private foundation board typically adopts. */
export const POLICY_LIBRARY: { id: string; name: string; summary: string }[] = [
  { id: 'coi', name: 'Conflict of Interest Policy', summary: 'Annual disclosure by every director and officer; recusal from any vote involving a personal interest.' },
  { id: 'selfdealing', name: 'Self-Dealing Prevention Policy', summary: 'No sales, loans, leases, or compensation arrangements with disqualified persons under IRC §4941.' },
  { id: 'retention', name: 'Document Retention & Destruction Policy', summary: 'Retention schedule for governance, financial, grant, and tax records.' },
  { id: 'whistleblower', name: 'Whistleblower Protection Policy', summary: 'Confidential reporting channel and anti-retaliation protection.' },
  { id: 'investment', name: 'Investment Policy Statement', summary: 'Asset allocation targets, rebalancing bands, prudent-investor standard, advisor review cadence.' },
  { id: 'spending', name: 'Spending & Distribution Policy', summary: 'Annual payout rate and the process for meeting the 5% minimum distribution requirement.' },
  { id: 'grantmaking', name: 'Grantmaking Policy', summary: 'Eligibility, application intake, due diligence, award limits, and decline notice.' },
  { id: 'expenditure', name: 'Expenditure Responsibility Policy', summary: 'Required steps when granting to non-public charities under IRC §4945.' },
  { id: 'scholarship', name: 'Scholarship Selection Procedure', summary: 'Objective, non-discriminatory criteria and an independent selection committee.' },
  { id: 'gift', name: 'Gift Acceptance Policy', summary: 'Which asset types are accepted, appraisal thresholds, and refusal authority.' },
  { id: 'reserve', name: 'Operating Reserve Policy', summary: 'Target months of operating expense held in liquid reserves.' },
  { id: 'compensation', name: 'Compensation Policy', summary: 'Comparability data, board approval, and contemporaneous documentation of any pay.' },
  { id: 'expense', name: 'Expense Reimbursement & Travel Policy', summary: 'Substantiation requirements and disallowed personal expenses.' },
  { id: 'board', name: 'Board Governance & Term Policy', summary: 'Board size, terms, independence, attendance, and removal.' },
  { id: 'succession', name: 'Succession & Family Participation Policy', summary: 'How next-generation family members qualify for and rotate into governance roles.' },
  { id: 'diversity', name: 'Nondiscrimination Policy', summary: 'Programs and grants administered without regard to protected characteristics.' },
  { id: 'disclosure', name: 'Public Disclosure Policy', summary: 'Form 990-PF and exemption application available for public inspection on request.' },
  { id: 'financial', name: 'Financial Controls Policy', summary: 'Dual signatures, monthly reconciliation, annual review or audit.' },
  { id: 'privacy', name: 'Donor & Grantee Privacy Policy', summary: 'How personal data is stored, shared, and anonymized in reporting.' },
];

export type DocBuilderState = {
  adoptedPolicies?: string[];
  preparedBy?: string;
  adoptionDate?: string;
  includeSignature?: boolean;
  notes?: string;
};

export type DocSection = {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { columns: string[]; rows: string[][] };
};

export type DocSourceData = {
  settings: any | null;
  pillars: any[];
  initiatives: any[];
  governance: any[];
  compliance: any[];
  gifts: any[];
  investments: any[];
  builder: DocBuilderState;
};

const money = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(
    Number(n) || 0,
  );

const dash = (v: any) => (v === null || v === undefined || v === '' ? '—' : String(v));

export function documentTitle(settings: any | null) {
  return `${settings?.foundation_name ?? 'Family Foundation'} — Foundation Operating Document`;
}

/** Assembles the ordered document model from live records. */
export function buildFoundationDocument(d: DocSourceData): DocSection[] {
  const s = d.settings;
  const adopted = new Set(d.builder.adoptedPolicies ?? []);
  const boardMembers = d.governance.filter((g) => g.record_type === 'board_member' || g.record_type === 'officer');
  const committees = d.governance.filter((g) => g.record_type === 'committee');
  const endowment = d.investments.reduce((t, i) => t + Number(i.market_value ?? 0), 0);
  const giftsTotal = d.gifts.reduce((t, g) => t + Number(g.amount ?? 0), 0);
  const sections: DocSection[] = [];

  sections.push({
    heading: '1. Foundation Snapshot',
    table: {
      columns: ['Item', 'Value'],
      rows: [
        ['Foundation name', dash(s?.foundation_name)],
        ['Founding year', dash(s?.founding_year)],
        ['Tagline', dash(s?.tagline)],
        ['Directors and officers of record', String(boardMembers.length)],
        ['Impact pillars', String(d.pillars.length)],
        ['Active initiatives', String(d.initiatives.filter((i) => i.status !== 'complete').length)],
        ['Endowment market value', money(endowment)],
        ['Gifts recorded to date', money(giftsTotal)],
        ['Annual grant budget', money(Number(s?.annual_grant_budget ?? 0))],
        ['Spending policy', s?.spending_policy_pct ? `${Number(s.spending_policy_pct)}% of average net assets` : '—'],
        ['Prepared by', dash(d.builder.preparedBy)],
        ['Board adoption date', dash(d.builder.adoptionDate)],
      ],
    },
  });

  sections.push({
    heading: '2. Mission, Vision, and Values',
    paragraphs: [
      `Mission. ${dash(s?.mission)}`,
      `Vision. ${dash(s?.vision)}`,
      `Legacy statement. ${dash(s?.legacy_statement)}`,
    ],
    bullets: (s?.core_values ?? []).map((v: any) =>
      typeof v === 'string' ? v : [v?.title ?? v?.name, v?.description].filter(Boolean).join(' — ')
    ),
  });

  sections.push({
    heading: '3. Board of Directors and Officers',
    paragraphs: [
      'The board holds fiduciary responsibility for the foundation: it approves the budget, adopts policies, awards grants, and oversees investments. Independent directors are seated to strengthen objectivity in grant and compensation decisions.',
    ],
    table: {
      columns: ['Name', 'Role', 'Committee', 'Independent', 'Status'],
      rows: boardMembers.map((g) => [
        dash(g.name),
        dash(g.role),
        dash(g.committee),
        g.is_independent ? 'Yes' : 'No',
        dash(g.status ?? 'active'),
      ]),
    },
  });

  sections.push({
    heading: '4. Standing Committees',
    table: {
      columns: ['Committee', 'Charge'],
      rows: committees.map((c) => [dash(c.name), dash(c.role)]),
    },
  });

  sections.push({
    heading: '5. Governing Policies',
    paragraphs: [
      'The following policies are adopted by resolution of the board and reviewed annually. Policies marked "Pending" are drafted but not yet adopted.',
    ],
    table: {
      columns: ['Policy', 'Summary', 'Status'],
      rows: POLICY_LIBRARY.map((p) => [p.name, p.summary, adopted.has(p.id) ? 'Adopted' : 'Pending']),
    },
  });

  sections.push({
    heading: '6. Programs and Impact Pillars',
    table: {
      columns: ['Pillar', 'Focus', 'Annual budget', 'Target served'],
      rows: d.pillars.map((p) => [
        dash(p.name),
        (p.focus_areas ?? []).join('; ') || dash(p.description),
        money(Number(p.annual_budget ?? 0)),
        dash(p.target_beneficiaries),
      ]),
    },
  });

  sections.push({
    heading: '7. Current Initiatives',
    table: {
      columns: ['Initiative', 'Lead', 'Budget', 'Deployed', 'Status'],
      rows: d.initiatives.map((i) => [
        dash(i.title),
        dash(i.lead_name),
        money(Number(i.budget ?? 0)),
        money(Number(i.spent ?? 0)),
        dash(i.status),
      ]),
    },
  });

  sections.push({
    heading: '8. Funding and Endowment',
    paragraphs: [
      `The foundation is funded through coordinated lifetime and estate gifts. Gifts recorded to date total ${money(giftsTotal)}, with an endowment market value of ${money(endowment)} against a target of ${money(Number(s?.endowment_target ?? 0))}.`,
      'Investments are managed under the Investment Policy Statement using a prudent-investor standard, with allocation reviewed against policy targets at least annually.',
    ],
    table: {
      columns: ['Holding', 'Asset class', 'Market value', 'Target allocation'],
      rows: d.investments.map((i) => [
        dash(i.name),
        dash(i.asset_class),
        money(Number(i.market_value ?? 0)),
        i.target_allocation_pct ? `${Number(i.target_allocation_pct)}%` : '—',
      ]),
    },
  });

  sections.push({
    heading: '9. Recent Gifts and Pledges',
    table: {
      columns: ['Donor', 'Type', 'Amount', 'Date', 'Restriction'],
      rows: d.gifts.slice(0, 25).map((g) => [
        dash(g.donor_name),
        dash(g.gift_type),
        money(Number(g.amount ?? 0)),
        dash(g.gift_date),
        g.is_restricted ? dash(g.restriction_note ?? 'Restricted') : 'Unrestricted',
      ]),
    },
  });

  sections.push({
    heading: '10. Compliance Calendar',
    paragraphs: [
      'Private foundations file Form 990-PF annually, must satisfy the 5% minimum distribution requirement, and register with the state charitable authority. The board reviews this calendar at every regular meeting.',
    ],
    table: {
      columns: ['Requirement', 'Authority', 'Frequency', 'Status', 'Due'],
      rows: d.compliance.map((c) => [
        dash(c.item),
        dash(c.authority),
        dash(c.frequency),
        dash(c.status ?? 'not_started'),
        dash(c.due_date),
      ]),
    },
  });

  if (d.builder.notes?.trim()) {
    sections.push({ heading: '11. Board Notes', paragraphs: [d.builder.notes.trim()] });
  }

  if (d.builder.includeSignature) {
    sections.push({
      heading: 'Certification and Adoption',
      paragraphs: [
        `The undersigned certify that this document was reviewed and adopted by the board of ${dash(s?.foundation_name)} on ${dash(d.builder.adoptionDate)}.`,
      ],
      bullets: [
        'Board Chair — signature ______________________________  Date __________',
        'Secretary — signature ______________________________  Date __________',
        'Treasurer — signature ______________________________  Date __________',
      ],
    });
  }

  sections.push({
    heading: 'Disclaimer',
    paragraphs: [
      'This document is generated from planning records for internal board use only. It is not legal, tax, accounting, or investment advice. Confirm every structure, policy, and filing with a licensed attorney and CPA before relying on it.',
    ],
  });

  return sections;
}

/* ------------------------------ Word export ------------------------------ */

const BORDER = { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' };
const BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CONTENT_WIDTH = 9360;

function cell(text: string, width: number, header = false) {
  return new TableCell({
    borders: BORDERS,
    width: { size: width, type: WidthType.DXA },
    shading: header ? { fill: 'EFEFEF', type: ShadingType.CLEAR, color: 'auto' } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text, bold: header, size: 20 })] })],
  });
}

function docxTable(columns: string[], rows: string[][]) {
  const widths = columns.map(() => Math.floor(CONTENT_WIDTH / columns.length));
  widths[0] += CONTENT_WIDTH - widths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: columns.map((c, i) => cell(c, widths[i], true)) }),
      ...rows.map((r) => new TableRow({ children: widths.map((w, i) => cell(r[i] ?? '—', w)) })),
    ],
  });
}

export async function exportFoundationDocx(sections: DocSection[], title: string) {
  const children: any[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: title, bold: true, size: 34 })],
      spacing: { after: 120 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
          size: 20,
          color: '666666',
        }),
      ],
      spacing: { after: 320 },
    }),
  ];

  for (const s of sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(s.heading)] }));
    for (const p of s.paragraphs ?? []) {
      children.push(new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: p, size: 22 })] }));
    }
    for (const b of s.bullets ?? []) {
      children.push(new Paragraph({ numbering: { reference: 'fdn-bullets', level: 0 }, children: [new TextRun({ text: b, size: 22 })] }));
    }
    if (s.table && s.table.rows.length > 0) {
      children.push(docxTable(s.table.columns, s.table.rows));
      children.push(new Paragraph({ children: [new TextRun('')] }));
    } else if (s.table) {
      children.push(new Paragraph({ children: [new TextRun({ text: 'No records entered yet.', italics: true, size: 20, color: '888888' })] }));
    }
  }

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Arial', size: 22 } } },
      paragraphStyles: [
        {
          id: 'Heading1',
          name: 'Heading 1',
          basedOn: 'Normal',
          next: 'Normal',
          quickFormat: true,
          run: { size: 26, bold: true, font: 'Arial' },
          paragraph: { spacing: { before: 280, after: 140 }, outlineLevel: 0 },
        },
      ],
    },
    numbering: {
      config: [
        {
          reference: 'fdn-bullets',
          levels: [
            {
              level: 0,
              format: 'bullet' as any,
              text: '\u2022',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: 'Page ', size: 18, color: '888888' }), new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' })],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^\w\- ]/g, '').replace(/\s+/g, '-')}.docx`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* --------------------------- print / PDF export --------------------------- */

const esc = (v: string) =>
  v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function foundationDocumentHtml(sections: DocSection[], title: string) {
  const body = sections
    .map((s) => {
      const paras = (s.paragraphs ?? []).map((p) => `<p>${esc(p)}</p>`).join('');
      const bullets = (s.bullets ?? []).length
        ? `<ul>${(s.bullets ?? []).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>`
        : '';
      let table = '';
      if (s.table && s.table.rows.length > 0) {
        table = `<table><thead><tr>${s.table.columns
          .map((c) => `<th>${esc(c)}</th>`)
          .join('')}</tr></thead><tbody>${s.table.rows
          .map((r) => `<tr>${s.table!.columns.map((_, i) => `<td>${esc(r[i] ?? '—')}</td>`).join('')}</tr>`)
          .join('')}</tbody></table>`;
      } else if (s.table) {
        table = '<p class="muted">No records entered yet.</p>';
      }
      return `<section><h2>${esc(s.heading)}</h2>${paras}${bullets}${table}</section>`;
    })
    .join('');

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
@page { size: letter; margin: 0.75in; }
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111827;line-height:1.55;font-size:12px}
h1{font-size:22px;text-align:center;margin-bottom:4px}
.sub{text-align:center;color:#6b7280;font-size:11px;margin-bottom:24px}
section{margin-bottom:20px;break-inside:avoid}
h2{font-size:14px;color:#111827;border-bottom:2px solid #6366f1;padding-bottom:4px;margin-bottom:8px}
p{margin-bottom:8px}
ul{margin:0 0 8px 18px}
li{margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:8px}
th,td{border:1px solid #d1d5db;padding:5px 7px;text-align:left;vertical-align:top;font-size:11px}
th{background:#f3f4f6;font-weight:700}
.muted{color:#9ca3af;font-style:italic}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body><h1>${esc(title)}</h1><div class="sub">Generated ${new Date().toLocaleString(
    'en-US',
  )}</div>${body}</body></html>`;
}

export function printFoundationDocument(sections: DocSection[], title: string) {
  const w = window.open('', '_blank', 'width=850,height=1000');
  if (!w) return false;
  w.document.write(foundationDocumentHtml(sections, title));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}
