import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

async function shoot(el: HTMLElement) {
  return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
}

function pages(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>('.wos-page'));
}

/** Download every binder page as an individual PNG image. */
export async function exportBinderPNGs(prefix = 'montgomery-wealth-os') {
  const els = pages();
  for (let i = 0; i < els.length; i++) {
    const canvas = await shoot(els[i]);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `${prefix}-${String(i).padStart(2, '0')}.png`;
    a.click();
    await new Promise((r) => setTimeout(r, 200));
  }
  return els.length;
}

/** Render the whole binder into one letter-portrait PDF (one page per dashboard). */
export async function exportBinderPDF(filename = 'montgomery-wealth-os.pdf') {
  const els = pages();
  const pdf = new jsPDF({ unit: 'in', format: 'letter', orientation: 'portrait' });
  const W = 8.5, H = 11;
  for (let i = 0; i < els.length; i++) {
    const canvas = await shoot(els[i]);
    const ratio = canvas.height / canvas.width;
    let w = W, h = W * ratio;
    if (h > H) { h = H; w = H / ratio; }
    if (i > 0) pdf.addPage('letter', 'portrait');
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', (W - w) / 2, (H - h) / 2, w, h);
  }
  pdf.save(filename);
  return els.length;
}
