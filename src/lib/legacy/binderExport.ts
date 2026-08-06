import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import type { BinderDoc } from './foundationBinder';
import { STATUS_LABELS } from './foundationBinder';

const controlRows = (d: BinderDoc) => [
  ['Document code', d.doc_code],
  ['Version', `v${d.version}.0`],
  ['Status', STATUS_LABELS[d.status] ?? d.status],
  ['Effective', d.effective_on ?? '—'],
  ['Approved', d.approved_on ?? '—'],
  ['Next review', d.review_due_on ?? '—'],
  ['Prepared by', d.prepared_by ?? '—'],
  ['Reviewed by', d.reviewed_by ?? '—'],
  ['Cross-references', (d.cross_refs ?? []).join(', ') || '—'],
];

/** Print-ready HTML for one or many documents (used for PDF via the print dialog). */
export function binderHtml(docs: BinderDoc[], org: string, packetLabel?: string) {
  const body = docs
    .map(
      (d) => `<section class="doc">
<div class="org">${org}</div>
<h1>${d.doc_code} — ${d.title}</h1>
<table>${controlRows(d).map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
${d.purpose ? `<p class="purpose">${d.purpose}</p>` : ''}
<div class="body">${(d.body ?? 'No content generated yet.').replace(/</g, '&lt;')}</div>
<footer>${org} · ${d.doc_code} · v${d.version}.0 · ${STATUS_LABELS[d.status] ?? d.status}</footer>
</section>`,
    )
    .join('');
  return `<!doctype html><html><head><title>${packetLabel ?? 'Foundation Binder'}</title><style>
body{font-family:Georgia,serif;margin:44px;color:#111;line-height:1.55}
.org{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#666}
h1{font-size:19px;margin:2px 0 6px}
table{border-collapse:collapse;margin:14px 0;font-size:11px;width:100%}
td{border:1px solid #ccc;padding:5px 8px}td:first-child{width:150px;color:#555}
.purpose{font-style:italic;color:#444}
.body{white-space:pre-wrap;font-size:13.5px}
footer{margin-top:26px;border-top:1px solid #ccc;padding-top:6px;font-size:10.5px;color:#666}
.doc{page-break-after:always}
.cover{page-break-after:always;text-align:center;margin-top:180px}
h2{font-size:15px}
</style></head><body>
${packetLabel ? `<div class="cover"><div class="org">${org}</div><h1>${packetLabel}</h1><h2>${docs.length} document(s)</h2></div>` : ''}
${body}</body></html>`;
}

export function printBinder(docs: BinderDoc[], org: string, packetLabel?: string) {
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.write(binderHtml(docs, org, packetLabel));
  w.document.close();
  w.focus();
  w.print();
  return true;
}

/** Word (.docx) export for one or many binder documents. */
export async function exportBinderWord(docs: BinderDoc[], org: string, filename: string, packetLabel?: string) {
  const children: Paragraph[] = [];

  if (packetLabel) {
    children.push(
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: org, size: 22, color: '666666' })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: packetLabel, bold: true, size: 40 })] }),
      new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `${docs.length} document(s)`, size: 24 })] }),
      new Paragraph({ pageBreakBefore: true, children: [] }),
    );
  }

  docs.forEach((d, idx) => {
    if (idx > 0 || !packetLabel) children.push(new Paragraph({ pageBreakBefore: idx > 0, children: [] }));
    children.push(
      new Paragraph({ children: [new TextRun({ text: org.toUpperCase(), size: 18, color: '666666' })] }),
      new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: `${d.doc_code} — ${d.title}`, bold: true, size: 32 })] }),
    );
    controlRows(d).forEach(([k, v]) =>
      children.push(new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true, size: 20 }), new TextRun({ text: String(v), size: 20 })] })),
    );
    if (d.purpose) children.push(new Paragraph({ children: [new TextRun({ text: d.purpose, italics: true, size: 22 })] }));
    (d.body ?? 'No content generated yet.').split('\n').forEach((line) => {
      const isHeading = line.length > 0 && line === line.toUpperCase() && /[A-Z]/.test(line) && line.length < 70;
      children.push(
        new Paragraph({
          spacing: { before: isHeading ? 200 : 60, after: 60 },
          children: [new TextRun({ text: line, bold: isHeading, size: isHeading ? 24 : 22 })],
        }),
      );
    });
    children.push(
      new Paragraph({
        spacing: { before: 240 },
        children: [new TextRun({ text: `${org} · ${d.doc_code} · v${d.version}.0 · ${STATUS_LABELS[d.status] ?? d.status}`, size: 18, color: '666666' })],
      }),
    );
  });

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Arial', size: 22 } } } },
    sections: [
      {
        properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
        children,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
