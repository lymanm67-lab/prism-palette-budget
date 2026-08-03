// Print / Save-as-PDF renderer for the Virtual Investment & Retirement Planner
// analysis. Renders a self-contained, grayscale-safe document in a new window
// so it prints cleanly on black-and-white printers.

interface AllocationRow {
  asset_class: string;
  actual_pct: number;
  target_pct: number;
  dollars: number;
  status: string;
}

interface ProjectionRow {
  age: number;
  projected_balance: number;
  surplus_vs_goal: number;
  estimated_monthly_income: number;
  legacy_projection: number;
}

export interface AdvisorReportSnapshot {
  profile: Record<string, any>;
  growth_engine?: Record<string, any>;
  projections_with_growth_engine?: ProjectionRow[];
  household_combined?: Record<string, any> | null;
  portfolio: {
    total_value: number;
    weighted_expense_ratio_pct: number;
    model_expense_ratio_pct: number;
    model_used: string;
    needs_rebalance: boolean;
    allocation_vs_target: AllocationRow[];
  };
}

const esc = (s: unknown) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const money = (n: number) =>
  `$${Math.round(Number(n) || 0).toLocaleString('en-US')}`;

/** Minimal, safe markdown -> HTML for the AI response. */
function mdToHtml(md: string): string {
  const lines = esc(md).split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;

  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  const inline = (t: string) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/);
    if (h) {
      closeList();
      const level = Math.min(4, h[1].length + 1);
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      continue;
    }
    const ol = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (ol) {
      if (list !== 'ol') {
        closeList();
        out.push('<ol>');
        list = 'ol';
      }
      out.push(`<li>${inline(ol[2])}</li>`);
      continue;
    }
    const ul = line.match(/^[-*•]\s+(.*)$/);
    if (ul) {
      if (list !== 'ul') {
        closeList();
        out.push('<ul>');
        list = 'ul';
      }
      out.push(`<li>${inline(ul[1])}</li>`);
      continue;
    }
    closeList();
    out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  return out.join('\n');
}

/** Horizontal actual-vs-target allocation bars (grayscale + hatch pattern). */
function allocationChart(rows: AllocationRow[]): string {
  if (!rows.length) return '';
  const barH = 14;
  const gap = 22;
  const labelW = 150;
  const chartW = 320;
  const height = rows.length * (barH * 2 + gap) + 30;
  const max = Math.max(100, ...rows.map((r) => Math.max(r.actual_pct, r.target_pct)));

  const bars = rows
    .map((r, i) => {
      const y = 20 + i * (barH * 2 + gap);
      const aw = (Math.max(0, r.actual_pct) / max) * chartW;
      const tw = (Math.max(0, r.target_pct) / max) * chartW;
      return `
      <text x="0" y="${y + 11}" class="lbl">${esc(r.asset_class)}</text>
      <rect x="${labelW}" y="${y}" width="${aw.toFixed(1)}" height="${barH}" fill="#111" />
      <text x="${labelW + aw + 6}" y="${y + 11}" class="val">${r.actual_pct.toFixed(1)}% actual · ${money(r.dollars)}</text>
      <rect x="${labelW}" y="${y + barH + 3}" width="${tw.toFixed(1)}" height="${barH}" fill="url(#hatch)" stroke="#111" stroke-width="0.8" />
      <text x="${labelW + tw + 6}" y="${y + barH + 14}" class="val">${r.target_pct}% target</text>`;
    })
    .join('');

  return `<svg viewBox="0 0 720 ${height}" width="100%" height="${height}" role="img"
    aria-label="Actual versus target allocation by asset class">
    <defs>
      <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="5" height="5" fill="#fff"/>
        <line x1="0" y1="0" x2="0" y2="5" stroke="#111" stroke-width="1.6"/>
      </pattern>
    </defs>
    ${bars}
  </svg>`;
}

/** Column chart of projected balance at each horizon age vs the goal line. */
function projectionChart(rows: ProjectionRow[], goal: number, combined?: { age: number; combined: number }[]): string {
  if (!rows.length) return '';
  const w = 720;
  const h = 260;
  const padL = 70;
  const padB = 40;
  const padT = 20;
  const groups = rows.length;
  const slot = (w - padL - 20) / groups;
  const values = [
    ...rows.map((r) => r.projected_balance),
    ...(combined ?? []).map((c) => c.combined),
    goal || 0,
  ];
  const max = Math.max(1, ...values) * 1.12;
  const y = (v: number) => padT + (h - padT - padB) * (1 - v / max);

  const bars = rows
    .map((r, i) => {
      const cx = padL + i * slot;
      const bw = combined?.length ? slot * 0.32 : slot * 0.45;
      const c = combined?.find((x) => x.age === r.age);
      const mine = `
        <rect x="${cx + slot * 0.1}" y="${y(r.projected_balance)}" width="${bw}"
          height="${h - padB - y(r.projected_balance)}" fill="#111" />
        <text x="${cx + slot * 0.1 + bw / 2}" y="${y(r.projected_balance) - 5}" class="val mid">${money(r.projected_balance)}</text>`;
      const comb = c
        ? `<rect x="${cx + slot * 0.1 + bw + 6}" y="${y(c.combined)}" width="${bw}"
            height="${h - padB - y(c.combined)}" fill="url(#hatch2)" stroke="#111" stroke-width="0.8" />
           <text x="${cx + slot * 0.1 + bw + 6 + bw / 2}" y="${y(c.combined) - 5}" class="val mid">${money(c.combined)}</text>`
        : '';
      return `${mine}${comb}
        <text x="${cx + slot / 2}" y="${h - padB + 16}" class="lbl mid">Age ${r.age}</text>`;
    })
    .join('');

  const goalLine = goal
    ? `<line x1="${padL}" y1="${y(goal)}" x2="${w - 10}" y2="${y(goal)}" stroke="#111" stroke-width="1.2" stroke-dasharray="6 4" />
       <text x="${padL}" y="${y(goal) - 6}" class="val">Goal ${money(goal)}</text>`
    : '';

  return `<svg viewBox="0 0 ${w} ${h}" width="100%" height="${h}" role="img"
    aria-label="Projected balance at each retirement age compared with the goal">
    <defs>
      <pattern id="hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="6" height="6" fill="#fff"/>
        <line x1="0" y1="0" x2="0" y2="6" stroke="#111" stroke-width="1.8"/>
      </pattern>
    </defs>
    <line x1="${padL}" y1="${h - padB}" x2="${w - 10}" y2="${h - padB}" stroke="#111" stroke-width="1"/>
    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${h - padB}" stroke="#111" stroke-width="1"/>
    ${goalLine}
    ${bars}
  </svg>
  <p class="legend"><span class="sw solid"></span> This plan &nbsp;&nbsp;
    ${combined?.length ? '<span class="sw hatch"></span> Household combined &nbsp;&nbsp;' : ''}
    <span class="sw dash"></span> Goal</p>`;
}

/** Fee drag bar: current weighted expense ratio vs model portfolio. */
function feeChart(currentEr: number, modelEr: number, total: number): string {
  const max = Math.max(currentEr, modelEr, 0.2);
  const bar = (label: string, v: number, fill: string) => {
    const width = (v / max) * 420;
    return `<div class="feerow"><span class="feelbl">${label}</span>
      <span class="feebar" style="width:${width.toFixed(1)}px;background:${fill}"></span>
      <span class="val">${v.toFixed(2)}% · ${money((v / 100) * total)}/yr</span></div>`;
  };
  return `<div class="fees">
    ${bar('Current portfolio', currentEr, '#111')}
    ${bar('Model portfolio', modelEr, 'repeating-linear-gradient(45deg,#111 0 2px,#fff 2px 5px)')}
  </div>`;
}

function kpiGrid(snapshot: AdvisorReportSnapshot): string {
  const p = snapshot.profile ?? {};
  const items: [string, string][] = [
    ['Current age', p.current_age ? String(p.current_age) : '—'],
    ['Retirement age', p.retirement_age ? String(p.retirement_age) : '—'],
    ['Horizon', p.horizon_years ? `${p.horizon_years} yrs` : '—'],
    ['Goal', p.goal_amount ? money(p.goal_amount) : '—'],
    ['Portfolio value', money(snapshot.portfolio?.total_value ?? 0)],
    ['Expected return', p.expected_return_pct ? `${p.expected_return_pct}%` : '—'],
  ];
  return `<div class="kpis">${items
    .map(([k, v]) => `<div class="kpi"><span class="k">${esc(k)}</span><span class="v">${esc(v)}</span></div>`)
    .join('')}</div>`;
}

function growthTable(snapshot: AdvisorReportSnapshot): string {
  const g = snapshot.growth_engine;
  if (!g) return '';
  const r = g.cash_flow_reallocations ?? {};
  const rows: [string, string][] = [
    ['Annual raise', g.annual_raise_pct != null ? `${g.annual_raise_pct}%` : '—'],
    ['Raise redirected to investing', g.raise_redirect_pct != null ? `${g.raise_redirect_pct}%` : '—'],
    ['Jan 2027 — debt payment freed', r.jan_2027_debt_freed ? `${money(r.jan_2027_debt_freed)}/mo` : '—'],
    ['Jan 2027 — student loan begins', r.jan_2027_student_loan_starts ? `-${money(r.jan_2027_student_loan_starts)}/mo` : '—'],
    ['Jan 2027 — net redirect', r.jan_2027_net_redirect ? `${money(r.jan_2027_net_redirect)}/mo` : '—'],
    ['Jun 2027 — marketing/education freed', r.june_2027_marketing_education_freed ? `${money(r.june_2027_marketing_education_freed)}/mo` : '—'],
    ['Jun 2027 — total redirect', r.june_2027_total_redirect ? `${money(r.june_2027_total_redirect)}/mo` : '—'],
    ['Annual lump sum', g.annual_lump_sum ? `${money(g.annual_lump_sum.amount)} from ${g.annual_lump_sum.start_year}` : '—'],
  ];
  const stepUps = Array.isArray(g.dated_contribution_step_ups) ? g.dated_contribution_step_ups : [];
  const steps = stepUps.length
    ? `<tr><th>Scheduled contribution step-ups</th><td>${stepUps
        .map((s: any) => `+${money(s.amount)}/mo (${esc(s.startDate)})`)
        .join('<br/>')}</td></tr>`
    : '';
  return `<table class="grid">
    <tbody>${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}${steps}</tbody>
  </table>`;
}

function householdTable(snapshot: AdvisorReportSnapshot): string {
  const hh = snapshot.household_combined;
  if (!hh) return '';
  const rows: [string, string][] = [
    ['Spouse', String(hh.spouse_name ?? 'Spouse')],
    ['Spouse balance', money(hh.spouse_current_balance ?? 0)],
    ['Spouse monthly contribution', `${money(hh.spouse_monthly_contribution ?? 0)}/mo`],
    ['Spouse pension', hh.spouse_pension_monthly ? `${money(hh.spouse_pension_monthly)}/mo` : '—'],
    ['Combined balance today', money(hh.combined_now ?? 0)],
  ];
  const at = Array.isArray(hh.combined_at_ages) ? hh.combined_at_ages : [];
  return `<table class="grid"><tbody>
    ${rows.map(([k, v]) => `<tr><th>${esc(k)}</th><td>${esc(v)}</td></tr>`).join('')}
    ${at.map((a: any) => `<tr><th>Combined at age ${esc(a.age)}</th><td>${money(a.combined)}</td></tr>`).join('')}
  </tbody></table>`;
}

const STYLES = `
  @page { size: letter portrait; margin: 0.6in; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font-family: Georgia, "Times New Roman", serif; color: #111; background: #fff;
         margin: 0 auto; padding: 28px; max-width: 780px; font-size: 11.5pt; line-height: 1.5; }
  header { border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 18px; }
  h1 { font-size: 19pt; margin: 0 0 4px; letter-spacing: -0.2px; }
  .sub { font-size: 9.5pt; color: #444; margin: 0; }
  h2 { font-size: 13pt; margin: 22px 0 8px; border-bottom: 1px solid #111; padding-bottom: 3px;
       page-break-after: avoid; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; page-break-after: avoid; }
  p { margin: 6px 0; }
  ul, ol { margin: 6px 0 6px 20px; padding: 0; }
  li { margin: 3px 0; }
  strong { font-weight: 700; }
  code { font-family: "Courier New", monospace; font-size: 10pt; }
  section { page-break-inside: avoid; }
  .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 10px 0 4px; }
  .kpi { border: 1px solid #111; padding: 6px 8px; }
  .kpi .k { display: block; font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #444; }
  .kpi .v { display: block; font-size: 12pt; font-weight: 700; }
  table.grid { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 10pt; }
  table.grid th, table.grid td { border: 1px solid #111; padding: 5px 7px; text-align: left; vertical-align: top; }
  table.grid th { width: 45%; background: #f2f2f2; font-weight: 600; }
  svg { display: block; margin: 8px 0; }
  .lbl { font-size: 9.5px; font-family: Helvetica, Arial, sans-serif; }
  .val { font-size: 9px; font-family: Helvetica, Arial, sans-serif; }
  .mid { text-anchor: middle; }
  .legend { font-size: 9pt; color: #333; }
  .sw { display: inline-block; width: 18px; height: 9px; border: 1px solid #111; vertical-align: middle; margin-right: 4px; }
  .sw.solid { background: #111; }
  .sw.hatch { background: repeating-linear-gradient(45deg, #111 0 2px, #fff 2px 5px); }
  .sw.dash { border: 0; border-top: 2px dashed #111; height: 0; }
  .fees { margin: 8px 0; }
  .feerow { display: flex; align-items: center; gap: 8px; margin: 5px 0; font-size: 10pt; }
  .feelbl { width: 140px; flex: none; }
  .feebar { height: 12px; border: 1px solid #111; flex: none; }
  .disclaimer { margin-top: 22px; border-top: 1px solid #111; padding-top: 8px; font-size: 8.5pt; color: #333; }
  .toolbar { position: sticky; top: 0; background: #fff; border-bottom: 1px solid #111;
             padding: 8px 0 12px; margin-bottom: 14px; display: flex; gap: 8px; }
  .toolbar button { font: inherit; font-size: 10pt; padding: 6px 12px; border: 1px solid #111;
                    background: #fff; cursor: pointer; }
  @media print { .toolbar { display: none; } body { padding: 0; } }
`;

export function printAdvisorReport(opts: {
  analysisMarkdown: string;
  snapshot: AdvisorReportSnapshot;
  title?: string;
}) {
  const { analysisMarkdown, snapshot } = opts;
  const title = opts.title || 'AI Investment & Retirement Analysis';
  const generated = new Date().toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  const projections = snapshot.projections_with_growth_engine ?? [];
  const combined = (snapshot.household_combined?.combined_at_ages ?? undefined) as
    | { age: number; combined: number }[]
    | undefined;

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8" />
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>${STYLES}</style>
</head><body>
<div class="toolbar">
  <button onclick="window.print()">Print / Save as PDF</button>
  <button onclick="window.close()">Close</button>
</div>
<header>
  <h1>${esc(title)}</h1>
  <p class="sub">PrismMoney™ · Generated ${esc(generated)} · Educational analysis only — not investment, tax, or legal advice.</p>
</header>

<section>
  <h2>Plan Snapshot</h2>
  ${kpiGrid(snapshot)}
</section>

${
  projections.length
    ? `<section>
  <h2>Projected Balance by Retirement Age</h2>
  ${projectionChart(projections, Number(snapshot.profile?.goal_amount ?? 0), combined)}
  <table class="grid"><tbody>
    <tr><th>Age</th><td>${projections.map((p) => p.age).join(' &nbsp;|&nbsp; ')}</td></tr>
    <tr><th>Projected balance</th><td>${projections.map((p) => money(p.projected_balance)).join(' &nbsp;|&nbsp; ')}</td></tr>
    <tr><th>Surplus vs goal</th><td>${projections.map((p) => money(p.surplus_vs_goal)).join(' &nbsp;|&nbsp; ')}</td></tr>
    <tr><th>Est. monthly income</th><td>${projections.map((p) => money(p.estimated_monthly_income)).join(' &nbsp;|&nbsp; ')}</td></tr>
  </tbody></table>
</section>`
    : ''
}

${
  snapshot.growth_engine
    ? `<section><h2>Growth Engine — Raises &amp; Reallocations</h2>${growthTable(snapshot)}</section>`
    : ''
}

${
  snapshot.household_combined
    ? `<section><h2>Household Combined</h2>${householdTable(snapshot)}</section>`
    : ''
}

<section>
  <h2>Allocation vs Target — ${esc(snapshot.portfolio?.model_used ?? '')}</h2>
  ${allocationChart(snapshot.portfolio?.allocation_vs_target ?? [])}
  <p class="legend"><span class="sw solid"></span> Actual &nbsp;&nbsp; <span class="sw hatch"></span> Target</p>
</section>

<section>
  <h2>Fee Drag</h2>
  ${feeChart(
    Number(snapshot.portfolio?.weighted_expense_ratio_pct ?? 0),
    Number(snapshot.portfolio?.model_expense_ratio_pct ?? 0),
    Number(snapshot.portfolio?.total_value ?? 0),
  )}
</section>

<section>
  <h2>AI Planner Analysis</h2>
  ${mdToHtml(analysisMarkdown)}
</section>

<p class="disclaimer">This report is generated for educational and planning purposes only. It is not
investment, tax, or legal advice and is not a substitute for a licensed fiduciary advisor. No trades
are placed by PrismMoney™. Projections use the stated assumptions and are not guarantees.</p>
<script>window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 350); });</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
