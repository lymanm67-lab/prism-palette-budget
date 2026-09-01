/**
 * Shared print-infographic engine.
 *
 * Every report in the app can produce the same one-page, color, Letter-size
 * infographic PDF by describing itself as an `InfographicSpec` and calling
 * `printInfographic(spec)`. The renderer emits a self-contained HTML document
 * into a new window (raw HTML/CSS rather than React so charts always paint in
 * the print context) and opens the print dialog.
 */

export type Tone = 'navy' | 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'grey';

export const INFOGRAPHIC_COLORS: Record<Tone, string> = {
  navy: '#0f1e4d',
  blue: '#1657c8',
  green: '#0f6b3a',
  red: '#c0182a',
  purple: '#3d1a63',
  orange: '#e2711d',
  grey: '#5b6472',
};

const TINT: Record<Tone, string> = {
  navy: '#f4f6fa',
  blue: '#f2f6fd',
  green: '#f2f8f4',
  red: '#fdf3f4',
  purple: '#f6f3fa',
  orange: '#fdf6f0',
  grey: '#f5f6f8',
};

const SLICE_TONES: Tone[] = ['blue', 'green', 'purple', 'orange', 'navy', 'red', 'grey'];
const SLICE_EXTRA = ['#1c8fb0', '#2eb88a', '#8d6b1f', '#7a2f5f'];

export interface InfographicCell {
  text: string;
  tone?: Tone;
  bold?: boolean;
  sub?: string;
  align?: 'left' | 'center' | 'right';
}

export type InfographicRowCell = string | number | InfographicCell;

export interface InfographicTable {
  title: string;
  tone?: Tone;
  /** Panel width, e.g. `3.3in`. Omit to flex-fill the row. */
  width?: string;
  columns: { label: string; align?: 'left' | 'center' | 'right' }[];
  rows: InfographicRowCell[][];
  /** Bold summary row rendered on a tinted background. */
  totalRow?: InfographicRowCell[];
  emptyMessage?: string;
  footerNote?: string;
  footerTone?: Tone;
}

export interface InfographicSlice {
  label: string;
  value: number;
  color?: string;
}

export interface InfographicTrendPoint {
  label: string;
  primary: number;
  secondary: number;
}

export interface InfographicPanel {
  title: string;
  tone?: Tone;
  width?: string;
  /** Checkmark list items. */
  items: string[];
}

export interface InfographicSpec {
  /** Big masthead line, e.g. "MY MONTHLY BUDGET". */
  title: string;
  /** Second masthead line, e.g. "AUGUST 2026". */
  period?: string;
  tagline?: string;
  /** Compact "at a glance" box in the masthead. */
  glance?: { label: string; value: string; tone?: Tone }[];
  glanceTitle?: string;
  kpis?: { title: string; value: string; sub?: string; tone?: Tone }[];
  donut?: {
    title?: string;
    legendHeader?: string;
    totalLabel?: string;
    slices: InfographicSlice[];
    footerNote?: string;
  };
  /** Tables are laid out in rows; give widths to place two side by side. */
  tables?: InfographicTable[];
  trend?: {
    title?: string;
    width?: string;
    points: InfographicTrendPoint[];
    primaryLabel?: string;
    secondaryLabel?: string;
    deltaLabel?: string;
    footerNote?: string;
  };
  panels?: InfographicPanel[];
  /** Navy commitment band at the bottom. */
  commitment?: { label: string; text: string; steps?: string[] };
  slogan?: string;
  disclaimer?: string;
  /** 1 = no shrink. Lower values fit more content on one sheet. */
  zoom?: number;
  /** Page geometry preset. Defaults to letter portrait. */
  format?: InfographicFormat;
}

export type InfographicFormat =
  | 'letter-portrait'
  | 'letter-landscape'
  | 'social'
  | 'presentation';

export const INFOGRAPHIC_FORMATS: Record<
  InfographicFormat,
  { label: string; page: string; width: string; zoom: number }
> = {
  'letter-portrait': { label: 'Letter · portrait', page: 'letter portrait', width: '7.8in', zoom: 0.73 },
  'letter-landscape': { label: 'Letter · landscape', page: 'letter landscape', width: '10.3in', zoom: 0.78 },
  social: { label: 'Social square (1080)', page: '1080px 1080px', width: '10.4in', zoom: 0.95 },
  presentation: { label: 'Presentation 16:9', page: '13.33in 7.5in', width: '12.6in', zoom: 0.82 },
};


const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export const money = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  });

export const pct = (n: number) => `${(Number.isFinite(n) ? n : 0).toFixed(2)}%`;

const color = (tone?: Tone) => INFOGRAPHIC_COLORS[tone ?? 'navy'];

function sliceColor(i: number, provided?: string) {
  if (provided) return provided;
  return i < SLICE_TONES.length
    ? INFOGRAPHIC_COLORS[SLICE_TONES[i]]
    : SLICE_EXTRA[(i - SLICE_TONES.length) % SLICE_EXTRA.length];
}

function donutSvg(slices: InfographicSlice[], total: number, totalLabel: string) {
  const cx = 110;
  const cy = 110;
  const r = 88;
  const inner = 54;
  let angle = -Math.PI / 2;
  const paths = slices
    .map((s, i) => {
      const frac = total > 0 ? s.value / total : 0;
      const sweep = frac * Math.PI * 2;
      const a0 = angle;
      const a1 = angle + sweep;
      angle = a1;
      const large = sweep > Math.PI ? 1 : 0;
      const p = (rad: number, a: number) => [cx + rad * Math.cos(a), cy + rad * Math.sin(a)];
      const [x0, y0] = p(r, a0);
      const [x1, y1] = p(r, a1);
      const [xi1, yi1] = p(inner, a1);
      const [xi0, yi0] = p(inner, a0);
      const [lx, ly] = p((r + inner) / 2, (a0 + a1) / 2);
      const label =
        frac >= 0.05
          ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="700">${(frac * 100).toFixed(1)}%</text>`
          : '';
      return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${xi1.toFixed(1)} ${yi1.toFixed(1)} A ${inner} ${inner} 0 ${large} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z" fill="${sliceColor(i, s.color)}" />${label}`;
    })
    .join('');

  return `<svg width="220" height="220" viewBox="0 0 220 220">
    ${paths || `<circle cx="${cx}" cy="${cy}" r="${(r + inner) / 2}" fill="none" stroke="#dfe3ea" stroke-width="${r - inner}" />`}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="15" font-weight="800" fill="${INFOGRAPHIC_COLORS.navy}">${money(total)}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="9" letter-spacing="1" fill="${INFOGRAPHIC_COLORS.grey}">${esc(totalLabel.toUpperCase())}</text>
  </svg>`;
}

function trendSvg(points: InfographicTrendPoint[]) {
  if (!points.length) return '';
  const w = 240;
  const h = 150;
  const padL = 46;
  const padB = 34;
  const GREY = INFOGRAPHIC_COLORS.grey;
  const max = Math.max(...points.flatMap((p) => [p.primary, p.secondary]), 1) * 1.12;
  const bw = (w - padL - 10) / points.length;
  const scale = (v: number) => 7 + (h - padB - 7) * (1 - v / max);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map((f) => f * max)
    .map(
      (v) =>
        `<line x1="${padL}" x2="${w}" y1="${scale(v).toFixed(1)}" y2="${scale(v).toFixed(1)}" stroke="#dfe3ea" stroke-width="1" />
         <text x="${padL - 5}" y="${(scale(v) + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="${GREY}">$${Math.round(v).toLocaleString()}</text>`,
    )
    .join('');
  const bars = points
    .map((p, i) => {
      const x = padL + i * bw;
      const y0 = scale(p.primary);
      const y1 = scale(p.secondary);
      const base = h - padB;
      const net = p.primary - p.secondary;
      return `
      <rect x="${(x + bw * 0.1).toFixed(1)}" y="${y0.toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${(base - y0).toFixed(1)}" fill="${INFOGRAPHIC_COLORS.green}" />
      <rect x="${(x + bw * 0.45).toFixed(1)}" y="${y1.toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${(base - y1).toFixed(1)}" fill="${INFOGRAPHIC_COLORS.blue}" />
      <text x="${(x + bw * 0.25).toFixed(1)}" y="${(y0 - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${INFOGRAPHIC_COLORS.navy}">$${Math.round(p.primary).toLocaleString()}</text>
      <text x="${(x + bw * 0.6).toFixed(1)}" y="${(y1 - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${INFOGRAPHIC_COLORS.blue}">$${Math.round(p.secondary).toLocaleString()}</text>
      <text x="${(x + bw * 0.42).toFixed(1)}" y="${(base + 11).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${net < 0 ? INFOGRAPHIC_COLORS.red : INFOGRAPHIC_COLORS.green}">${net < 0 ? '-' : '+'}$${Math.abs(Math.round(net)).toLocaleString()}</text>
      <text x="${(x + bw * 0.42).toFixed(1)}" y="${(base + 22).toFixed(1)}" text-anchor="middle" font-size="8" fill="${INFOGRAPHIC_COLORS.navy}">${esc(p.label)}</text>`;
    })
    .join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${grid}${bars}</svg>`;
}

function cellHtml(cell: InfographicRowCell, colAlign?: 'left' | 'center' | 'right') {
  const c: InfographicCell =
    typeof cell === 'object' && cell !== null ? cell : { text: String(cell ?? '') };
  const align = c.align ?? colAlign ?? 'center';
  const style = [
    'padding:5px 8px',
    'border-bottom:1px solid #eceef2',
    `text-align:${align}`,
    'font-size:10px',
    c.bold ? 'font-weight:700' : '',
    c.tone ? `color:${color(c.tone)}` : '',
  ]
    .filter(Boolean)
    .join(';');
  const sub = c.sub
    ? `<div style="font-size:8.5px;font-weight:400;color:${INFOGRAPHIC_COLORS.grey}">${esc(c.sub)}</div>`
    : '';
  return `<td style="${style}">${esc(c.text)}${sub}</td>`;
}

function tableHtml(t: InfographicTable) {
  const tone = t.tone ?? 'navy';
  const head = t.columns
    .map((c) => `<th class="th" style="text-align:${c.align ?? 'center'}">${esc(c.label)}</th>`)
    .join('');
  const body = t.rows.length
    ? t.rows.map((r) => `<tr>${r.map((c, i) => cellHtml(c, t.columns[i]?.align)).join('')}</tr>`).join('')
    : `<tr><td colspan="${t.columns.length}" style="padding:16px;text-align:center;font-size:10px;color:${INFOGRAPHIC_COLORS.green};font-weight:700">${esc(t.emptyMessage ?? 'Nothing to report.')}</td></tr>`;
  const total = t.totalRow
    ? `<tr style="background:${TINT.navy}">${t.totalRow
        .map((c, i) => {
          const cell: InfographicCell =
            typeof c === 'object' && c !== null ? { ...c, bold: true } : { text: String(c ?? ''), bold: true };
          return cellHtml(cell, t.columns[i]?.align);
        })
        .join('')}</tr>`
    : '';
  const footer = t.footerNote
    ? `<div style="background:${TINT[t.footerTone ?? tone]};color:${color(t.footerTone ?? tone)};font-size:9.5px;font-weight:700;text-align:center;padding:5px">${esc(t.footerNote)}</div>`
    : '';
  return `<div class="panel" style="${t.width ? `width:${t.width}` : 'flex:1'}">
    <div class="panel-head" style="background:${color(tone)}">${esc(t.title)}</div>
    <table><thead><tr>${head}</tr></thead><tbody>${body}${total}</tbody></table>
    ${footer}
  </div>`;
}

function panelHtml(p: InfographicPanel) {
  const items = p.items
    .map(
      (i) =>
        `<div style="display:flex;align-items:center;gap:7px;padding:4px 0"><span style="display:inline-block;flex:0 0 13px;width:13px;height:13px;border-radius:50%;background:${INFOGRAPHIC_COLORS.green};color:#fff;font-size:9px;text-align:center;line-height:13px">✓</span><span style="font-size:9.5px;font-weight:600;color:${INFOGRAPHIC_COLORS.blue}">${esc(i)}</span></div>`,
    )
    .join('');
  return `<div class="panel" style="${p.width ? `width:${p.width}` : 'flex:1'}">
    <div class="panel-head" style="background:${color(p.tone ?? 'purple')}">${esc(p.title)}</div>
    <div style="padding:8px 10px">${items}</div>
  </div>`;
}

/** Render a spec to a complete, self-contained HTML document. */
export function renderInfographic(spec: InfographicSpec): string {
  const NAVY = INFOGRAPHIC_COLORS.navy;
  const GREEN = INFOGRAPHIC_COLORS.green;
  const GREY = INFOGRAPHIC_COLORS.grey;
  const ORANGE = INFOGRAPHIC_COLORS.orange;

  const glance = spec.glance?.length
    ? `<div style="width:2.1in" class="panel">
        <div class="panel-head" style="background:${NAVY}">${esc(spec.glanceTitle ?? 'At a Glance')}</div>
        <table>${spec.glance
          .map(
            (g) =>
              `<tr><td style="padding:4px 8px;font-size:9.5px;font-weight:700">${esc(g.label)}</td><td style="padding:4px 8px;font-size:11px;font-weight:800;text-align:right;color:${color(g.tone ?? 'blue')}">${esc(g.value)}</td></tr>`,
          )
          .join('')}</table>
      </div>`
    : '';

  const kpis = spec.kpis?.length
    ? `<div style="display:flex;gap:8px;margin-top:10px">${spec.kpis
        .map((k) => {
          const tone = k.tone ?? 'blue';
          return `<div style="flex:1;border:1px solid ${color(tone)}33;background:${TINT[tone]};border-radius:10px;padding:10px 12px;text-align:center;min-width:0">
            <div style="font-size:9px;font-weight:800;letter-spacing:0.05em;color:${color(tone)};text-transform:uppercase">${esc(k.title)}</div>
            <div style="font-size:19px;font-weight:800;color:${color(tone)};margin:3px 0">${esc(k.value)}</div>
            <div style="font-size:8px;color:${GREY}">${esc(k.sub ?? '')}</div>
          </div>`;
        })
        .join('')}</div>`
    : '';

  let donutBlock = '';
  if (spec.donut) {
    const slices = spec.donut.slices.filter((s) => s.value > 0);
    const total = slices.reduce((s, x) => s + x.value, 0);
    const legend = slices
      .map(
        (s, i) => `<tr>
          <td style="padding:3px 6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sliceColor(i, s.color)}"></span></td>
          <td style="padding:2px 5px;font-size:9px;line-height:1.15;color:${NAVY}">${esc(s.label)}</td>
          <td style="padding:3px 6px;font-size:9.5px;text-align:right;font-weight:600">${money(s.value)}</td>
          <td style="padding:3px 6px;font-size:9.5px;text-align:right;color:${GREY}">${total > 0 ? ((s.value / total) * 100).toFixed(1) : '0.0'}%</td>
        </tr>`,
      )
      .join('');
    donutBlock = `<div class="panel" style="flex:1">
      <div class="panel-head" style="background:${NAVY}">${esc(spec.donut.title ?? 'Where My Money Went')}</div>
      <div style="display:flex;align-items:center;gap:6px;padding:8px">
        <div style="flex:0 0 200px">${donutSvg(slices, total, spec.donut.totalLabel ?? 'Total')}</div>
        <table style="flex:1;table-layout:fixed"><colgroup><col style="width:16px"/><col/><col style="width:72px"/><col style="width:50px"/></colgroup>
        <thead><tr><th></th><th class="th" style="text-align:left">${esc(spec.donut.legendHeader ?? 'Category')}</th><th class="th" style="text-align:right">Amount</th><th class="th" style="text-align:right">% of Total</th></tr></thead>
        <tbody>${legend}</tbody></table>
      </div>
      ${spec.donut.footerNote ? `<div style="background:${NAVY};color:#fff;text-align:center;font-size:11px;font-style:italic;font-weight:700;padding:5px">${esc(spec.donut.footerNote)}</div>` : ''}
    </div>`;
  }

  const trendBlock = spec.trend
    ? `<div class="panel" style="${spec.trend.width ? `width:${spec.trend.width}` : 'flex:1'}">
        <div class="panel-head" style="background:${NAVY}">${esc(spec.trend.title ?? 'Trend')}</div>
        <div style="padding:6px;text-align:center">
          <div style="font-size:8.5px;margin-bottom:2px"><span style="color:${GREEN};font-weight:700">■ ${esc(spec.trend.primaryLabel ?? 'Budgeted')}</span> &nbsp; <span style="color:${INFOGRAPHIC_COLORS.blue};font-weight:700">■ ${esc(spec.trend.secondaryLabel ?? 'Actual')}</span> &nbsp; <span style="color:${INFOGRAPHIC_COLORS.red};font-weight:700">■ ${esc(spec.trend.deltaLabel ?? 'Over / (Under)')}</span></div>
          ${trendSvg(spec.trend.points) || `<div style="padding:30px;font-size:10px;color:${GREY}">Not enough history yet.</div>`}
        </div>
        ${spec.trend.footerNote ? `<div style="background:${TINT.navy};color:${NAVY};font-size:9.5px;font-style:italic;font-weight:700;text-align:center;padding:5px">${esc(spec.trend.footerNote)}</div>` : ''}
      </div>`
    : '';

  // Tables: fixed-width ones pair up with the next flexible one in the same row.
  const tableRows: string[] = [];
  const tables = spec.tables ?? [];
  for (let i = 0; i < tables.length; ) {
    const a = tables[i];
    const b = tables[i + 1];
    if (a.width && b && b.width) {
      tableRows.push(`<div style="display:flex;gap:8px;margin-top:10px">${tableHtml(a)}${tableHtml(b)}</div>`);
      i += 2;
    } else {
      tableRows.push(`<div style="display:flex;gap:8px;margin-top:10px">${tableHtml(a)}</div>`);
      i += 1;
    }
  }

  const bottom =
    trendBlock || spec.panels?.length
      ? `<div style="display:flex;gap:8px;margin-top:10px">${trendBlock}${(spec.panels ?? []).map(panelHtml).join('')}</div>`
      : '';

  const commitment = spec.commitment
    ? `<div style="margin-top:10px;background:${NAVY};color:#fff;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:14px">
        <div style="flex:1.2">
          <div style="font-size:10px;font-weight:800;color:${ORANGE};letter-spacing:0.04em">${esc(spec.commitment.label)}</div>
          <div style="font-size:9px;line-height:1.4">${esc(spec.commitment.text)}</div>
        </div>
        ${
          spec.commitment.steps?.length
            ? `<div style="flex:2;display:flex;align-items:center;justify-content:space-around;font-size:8px;font-weight:800;letter-spacing:0.04em;text-align:center">${spec.commitment.steps
                .map((s) => `<span>${esc(s).replace(/\n/g, '<br/>')}</span>`)
                .join('<span>→</span>')}</div>`

            : ''
        }
      </div>`
    : '';

  const fmt = INFOGRAPHIC_FORMATS[spec.format ?? 'letter-portrait'];

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(spec.title)}${spec.period ? ` — ${esc(spec.period)}` : ''}</title>
<style>
  @page { size: ${fmt.page}; margin: 0.35in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${NAVY}; background: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  .panel { border: 1px solid #d7dbe3; border-radius: 10px; overflow: hidden; }
  .panel-head { color: #fff; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-align: center; padding: 6px; text-transform: uppercase; }
  .th { font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; color: ${GREY}; text-transform: uppercase; padding: 5px 8px; border-bottom: 1.5px solid #d7dbe3; }
</style></head>
<body>
<div id="sheet" style="max-width:${fmt.width};margin:0 auto;zoom:${spec.zoom ?? fmt.zoom}">

  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border-bottom:2px solid ${NAVY};padding-bottom:8px">
    <div style="flex:1;text-align:center">
      <div style="font-size:30px;font-weight:900;letter-spacing:-0.5px;color:${NAVY}">${esc(spec.title.toUpperCase())}</div>
      ${spec.period ? `<div style="font-size:22px;font-weight:800;color:${GREEN};margin-top:-2px">${esc(spec.period.toUpperCase())}</div>` : ''}
      ${spec.tagline ? `<div style="font-size:11px;font-style:italic;font-weight:700;color:${NAVY};margin-top:2px">${esc(spec.tagline)}</div>` : ''}
    </div>
    ${glance}
  </div>
  ${kpis}
  ${donutBlock ? `<div style="display:flex;gap:8px;margin-top:10px">${donutBlock}</div>` : ''}
  ${tableRows.join('')}
  ${bottom}
  ${commitment}
  ${spec.slogan ? `<div style="text-align:center;font-size:10.5px;font-weight:900;letter-spacing:0.08em;color:${ORANGE};margin-top:6px">${esc(spec.slogan)}</div>` : ''}
  <div style="text-align:center;font-size:7.5px;color:${GREY};margin-top:4px">PrismMoney™ · Generated ${new Date().toLocaleString()} · ${esc(spec.disclaimer ?? 'For personal financial planning only')}</div>
</div>
</body></html>`;
}

/** Open the spec in a new window and trigger the print dialog. */
export function printInfographic(spec: InfographicSpec): boolean {
  const w = window.open('', '_blank', 'width=1000,height=1200');
  if (!w) return false;
  w.document.write(renderInfographic(spec));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
  return true;
}

/** Rasterise the spec offscreen and download it as a PNG or a single-page PDF. */
export async function exportInfographic(
  spec: InfographicSpec,
  kind: 'png' | 'pdf',
  filename = 'prism-report',
): Promise<void> {
  const [{ default: html2canvas }, jspdf] = await Promise.all([
    import('html2canvas'),
    kind === 'pdf' ? import('jspdf') : Promise.resolve(null as any),
  ]);

  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1400px;height:2000px;border:0;';
  document.body.appendChild(frame);

  try {
    const doc = frame.contentDocument!;
    doc.open();
    doc.write(renderInfographic(spec));
    doc.close();
    await new Promise((r) => setTimeout(r, 350));

    const target = (doc.getElementById('sheet') as HTMLElement) || doc.body;
    const canvas = await html2canvas(target, { scale: 2, backgroundColor: '#ffffff', logging: false });

    if (kind === 'png') {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png');
      a.download = `${filename}.png`;
      a.click();
      return;
    }

    const landscape = canvas.width >= canvas.height;
    const pdf = new jspdf.jsPDF({
      orientation: landscape ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'letter',
    });
    const pw = pdf.internal.pageSize.getWidth();
    const ph = pdf.internal.pageSize.getHeight();
    const scale = Math.min(pw / canvas.width, ph / canvas.height);
    const w = canvas.width * scale;
    const h = canvas.height * scale;
    pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pw - w) / 2, (ph - h) / 2, w, h);
    pdf.save(`${filename}.pdf`);
  } finally {
    frame.remove();
  }
}

