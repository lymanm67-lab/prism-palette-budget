import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import { AKRON_FIELDS } from './fields';

export type AkronAnswers = Record<string, string | boolean>;
/** Browser-only answers; source pages are retained without reflow or rasterization. */
export async function buildAkronPdf(source: Uint8Array, answers: AkronAnswers, flatten: boolean) {
  const original = await PDFDocument.load(source);
  if (original.getPageCount() !== 9) throw new Error('The original nine-page application is required.');
  const pdf = await PDFDocument.create();
  // The scanned source's first eight pages use landscape media boxes rotated 270°.
  // Preserve their exact content while making the entry coordinate space upright.
  for (const sourcePage of original.getPages()) {
    const embedded = await pdf.embedPage(sourcePage);
    const page = pdf.addPage([612, 792]);
    if (sourcePage.getRotation().angle === 270) page.drawPage(embedded, { x: 612, y: 0, rotate: degrees(90) });
    else page.drawPage(embedded, { x: 0, y: 0 });
  }
  const form = pdf.getForm();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  for (const f of AKRON_FIELDS) {
    const page = pdf.getPage(f.page - 1);
    const rect = { x: f.x, y: 792 - f.y - f.height, width: f.width, height: f.height, borderWidth: 0, borderColor: undefined, backgroundColor: undefined };
    const value = answers[f.id];
    if (f.kind === 'checkbox') {
      const check = form.createCheckBox(f.id);
      check.addToPage(page, { ...rect, borderWidth: 0.5, borderColor: rgb(0, 0, 0) });
      if (value === true) check.check();
    } else if (f.kind === 'signature' && typeof value === 'string' && value.startsWith('data:image/png')) {
      const image = await pdf.embedPng(value);
      const fitted = image.scaleToFit(f.width, f.height);
      page.drawImage(image, { x: f.x, y: rect.y, width: fitted.width, height: fitted.height });
    } else {
      const text = form.createTextField(f.id);
      text.addToPage(page, { ...rect, font });
      const content = typeof value === 'string' ? value : '';
      const maximum = Math.min(10, f.height - 3);
      const measured = content ? font.widthOfTextAtSize(content, maximum) : 0;
      text.setFontSize(measured > f.width - 4 ? maximum * (f.width - 4) / measured : maximum);
      if (typeof value === 'string' && value) text.setText(value);
    }
  }
  form.updateFieldAppearances(font);
  if (flatten) form.flatten();
  return pdf.save({ useObjectStreams: false });
}

export function akronDownload(bytes: Uint8Array, filename: string) {
  const blob = new Blob([new Uint8Array(bytes).buffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}