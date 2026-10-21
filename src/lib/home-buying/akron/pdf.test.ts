import { describe, expect, it } from 'vitest';
import { PDFDocument } from 'pdf-lib';
import { AKRON_FIELDS } from './fields';
import { buildAkronPdf } from './pdf';

async function template() {
  const doc = await PDFDocument.create();
  for (let i = 0; i < 9; i++) doc.addPage([612, 792]).drawText(`Original page ${i + 1}`, { x: 20, y: 750 });
  return doc.save();
}

describe('Akron original application rules', () => {
  it('preserves all nine US Letter pages in both exports', async () => {
    const source = await template();
    for (const flatten of [true, false]) {
      const doc = await PDFDocument.load(await buildAkronPdf(source, {}, flatten));
      expect(doc.getPageCount()).toBe(9);
      expect(doc.getPages().map((p) => p.getSize())).toEqual(Array(9).fill({ width: 612, height: 792 }));
    }
  });
  it('includes seven creditor rows per applicant, seven household rows and twelve checklist entries', () => {
    expect(AKRON_FIELDS.filter((f) => f.id.startsWith('applicant_creditor_'))).toHaveLength(28);
    expect(AKRON_FIELDS.filter((f) => f.id.startsWith('coapplicant_creditor_'))).toHaveLength(28);
    expect(AKRON_FIELDS.filter((f) => f.id.startsWith('member_'))).toHaveLength(35);
    expect(AKRON_FIELDS.filter((f) => f.kind === 'checkbox')).toHaveLength(12);
  });
  it('keeps office-only areas uneditable', () => {
    expect(AKRON_FIELDS.filter((f) => f.page === 5 && f.y < 290)).toHaveLength(0);
    expect(AKRON_FIELDS.filter((f) => f.page === 8).every((f) => f.x + f.width < 155)).toBe(true);
    expect(AKRON_FIELDS.filter((f) => f.page === 1 || f.page === 9)).toHaveLength(0);
  });
  it('round-trips both applicants, tables, dates and checked values in editable export', async () => {
    const values = { applicant_name: 'Practice Applicant', coapplicant_name: 'Practice Co Applicant', member_7_income: '50000', coapplicant_creditor_7_balance: '1234.56', guide_applicant_date: '10/21/2026', included_1: true, included_12: true };
    const doc = await PDFDocument.load(await buildAkronPdf(await template(), values, false));
    const form = doc.getForm();
    for (const [id, value] of Object.entries(values)) {
      if (typeof value === 'string') expect(form.getTextField(id).getText()).toBe(value);
      else expect(form.getCheckBox(id).isChecked()).toBe(value);
    }
    expect(form.getCheckBox('included_2').isChecked()).toBe(false);
    expect(form.getFields()).toHaveLength(AKRON_FIELDS.length);
  });
  it('flattens completed copies for printing', async () => {
    const doc = await PDFDocument.load(await buildAkronPdf(await template(), { applicant_name: 'Practice Applicant' }, true));
    expect(doc.getForm().getFields()).toHaveLength(0);
  });
  it('keeps every field in bounds with unique ids and no intersecting entry rectangles', () => {
    expect(new Set(AKRON_FIELDS.map((f) => f.id)).size).toBe(AKRON_FIELDS.length);
    for (const f of AKRON_FIELDS) {
      expect(f.x).toBeGreaterThanOrEqual(0); expect(f.y).toBeGreaterThanOrEqual(0);
      expect(f.x + f.width).toBeLessThanOrEqual(612); expect(f.y + f.height).toBeLessThanOrEqual(792);
      for (const g of AKRON_FIELDS) {
        if (f === g || f.page !== g.page) continue;
        const overlap = f.x < g.x + g.width && f.x + f.width > g.x && f.y < g.y + g.height && f.y + f.height > g.y;
        expect(overlap, `${f.id} overlaps ${g.id}`).toBe(false);
      }
    }
  });
});