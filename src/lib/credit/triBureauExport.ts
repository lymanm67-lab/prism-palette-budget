// CSV + printable-PDF export for the tri-bureau simulator.

import type { InfographicSpec } from '@/lib/reports/infographic';
import { BUREAU_PROFILE, type BureauEstimate, type CardUtilization, type Sensitivity } from './triBureauModel';
import type { TimelineStep } from './triBureauTimeline';
import type { BureauChecklist, DataWarning } from './triBureauChecklist';

export interface ExportPayload {
  estimates: BureauEstimate[];
  cards: CardUtilization[];
  timeline: TimelineStep[];
  checklists: BureauChecklist[];
  /** Plain-English data-quality caveats, embedded in every export. */
  warnings: DataWarning[];
  sensitivity: Sensitivity;
  actionSummary: string[];
  baseMiddle: number | null;
  simMiddle: number | null;
  programs: { program: string; ok: boolean; note: string }[];
  lender: {
    price: number;
    downPct: number;
    rateNow: number;
    rateSim: number;
    pitiNow: number | null;
    pitiSim: number | null;
    frontEnd: number;
    backEndNow: number;
    backEndSim: number;
    ltv: number;
  };
}

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const range = (e: BureauEstimate) =>
  e.projected == null ? '—' : `${Math.max(300, e.projected - e.margin)}–${Math.min(850, e.projected + e.margin)}`;

// ─── CSV ───

export function buildTriBureauCsv(p: ExportPayload): string {
  const rows: (string | number)[][] = [];
  const add = (...cells: (string | number)[]) => rows.push(cells);

  add('Prism Tri-Bureau Score Simulator — Directional Estimates (NOT FICO scores)');
  add('Generated', new Date().toLocaleString('en-US'));
  add('');

  add('SECTION', 'FIELD', 'VALUE', 'DETAIL');
  add('Summary', 'Qualifying score (middle) now', p.baseMiddle ?? '—', 'Middle of three is what underwriting uses');
  add('Summary', 'Qualifying score projected', p.simMiddle ?? '—', '');
  add('Summary', 'Projected change', (p.simMiddle ?? 0) - (p.baseMiddle ?? 0), 'points');
  add('');

  add('DATA QUALITY WARNINGS', 'SEVERITY', 'ISSUE');
  if (p.warnings.length === 0) {
    add('', 'ok', 'No data-quality issues detected — all required fields present on all three bureaus.');
  } else {
    for (const w of p.warnings) {
      add('', w.severity === 'blocking' ? 'BLOCKING — do not rely on this output' : 'DEGRADES accuracy', w.text);
    }
  }
  add('');

  add('BUREAU', 'MORTGAGE MODEL', 'CURRENT', 'PROJECTED', 'DELTA', 'RANGE (±MARGIN)', 'UTIL NOW %', 'UTIL PROJ %', 'TRADELINES', 'DEROGS NOW', 'DEROGS PROJ', 'INQ 12MO NOW', 'INQ 12MO PROJ');
  for (const e of p.estimates) {
    add(
      e.bureau,
      BUREAU_PROFILE[e.bureau].mortgageModel,
      e.base ?? '—',
      e.projected ?? '—',
      e.delta,
      range(e),
      e.aggregateUtil.toFixed(1),
      e.simAggregateUtil.toFixed(1),
      e.tradelineCount,
      e.derogCount,
      e.simDerogCount,
      e.inquiries12mo,
      e.simInquiries12mo,
    );
  }
  add('');

  add('LOAN PROGRAM', 'QUALIFIES AT PROJECTED SCORE', 'NOTE');
  for (const pr of p.programs) add(pr.program, pr.ok ? 'Yes' : 'No', pr.note);
  add('');

  add('SCENARIO ACTION');
  for (const a of p.actionSummary) add(a);
  if (p.actionSummary.length === 0) add('(no actions stacked)');
  add('');

  add('ASSUMPTION', 'VALUE');
  add('Utilization averaging window (statement cycles)', p.sensitivity.utilWindowMonths);
  add('Inquiry scoring window (months)', p.sensitivity.inquiryWindowMonths);
  add('Assumed dispute deletion lag (months)', p.sensitivity.disputeLagMonths);
  add('');

  add('CARD', 'BUREAU', 'BALANCE NOW', 'BALANCE PROJ', 'LIMIT NOW', 'LIMIT PROJ', 'UTIL NOW %', 'UTIL PROJ %', 'BAND', 'EFFECT NOW (PTS)', 'EFFECT PROJ (PTS)');
  for (const c of p.cards) {
    add(c.name, c.bureau, c.balance, c.simBalance, c.limit, c.simLimit, c.util.toFixed(1), c.simUtil.toFixed(1), c.band, c.effect, c.simEffect);
  }
  add('');

  add('WHEN', 'STEP', 'TYPE', 'CASH REQUIRED', 'EXPECTED PTS', 'CUMULATIVE SCORE', 'DETAIL');
  for (const s of p.timeline) {
    add(s.dateLabel, s.title, s.kind, s.cash || '', s.impact, s.cumulative ?? '—', s.detail);
  }
  if (p.timeline.length === 0) add('—', '(no timeline — stack at least one action)', '', '', '', '', '');
  add('');

  add('LENDER MAPPING', 'NOW', 'PROJECTED', 'NOTE');
  add('Target price', usd(p.lender.price), usd(p.lender.price), '');
  add('Down payment %', `${p.lender.downPct}%`, `${p.lender.downPct}%`, `LTV ${p.lender.ltv.toFixed(0)}%`);
  add('Est. 30-yr rate', `${p.lender.rateNow.toFixed(2)}%`, `${p.lender.rateSim.toFixed(2)}%`, 'Rate tier driven by qualifying score');
  add('PITI', p.lender.pitiNow != null ? usd(p.lender.pitiNow) : '—', p.lender.pitiSim != null ? usd(p.lender.pitiSim) : '—', 'Incl. taxes, insurance, PMI');
  add('Back-end DTI', `${p.lender.backEndNow.toFixed(1)}%`, `${p.lender.backEndSim.toFixed(1)}%`, 'Conventional 43–45%, FHA up to 56.9%');
  add('Front-end DTI', '', `${p.lender.frontEnd.toFixed(1)}%`, 'Target 28–31%');
  add('');

  add('DATA CHECKLIST — BUREAU', 'FIELD', 'STATUS', 'REQUIREMENT', 'DETAIL', 'ACCOUNTS');
  for (const cl of p.checklists) {
    for (const it of cl.items) {
      add(cl.bureau, it.field, it.severity, it.requirement, it.detail, it.accounts.join('; '));
    }
  }
  add('');
  add('Disclaimer', 'These are rules-based directional estimates, not FICO or VantageScore output. Only licensees running the real algorithms against live bureau data can produce actual scores.');

  return rows
    .map(r =>
      r
        .map(cell => {
          const s = String(cell ?? '');
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\n');
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── PDF / print infographic spec ───

export function buildTriBureauSpec(p: ExportPayload): InfographicSpec {
  const delta = (p.simMiddle ?? 0) - (p.baseMiddle ?? 0);

  return {
    title: 'TRI-BUREAU SCORE SIMULATOR',
    period: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    tagline: 'Directional per-bureau projections, scenario stack, timeline and lender mapping',
    glanceTitle: 'At a glance',
    glance: [
      { label: 'Qualifying now', value: p.baseMiddle != null ? String(p.baseMiddle) : '—' },
      { label: 'Qualifying projected', value: p.simMiddle != null ? String(p.simMiddle) : '—', tone: delta >= 0 ? 'green' : 'red' },
      { label: 'Change', value: `${delta > 0 ? '+' : ''}${delta} pts`, tone: delta >= 0 ? 'green' : 'red' },
      { label: 'Actions stacked', value: String(p.actionSummary.length) },
      {
        label: 'Data quality',
        value:
          p.warnings.some(w => w.severity === 'blocking')
            ? 'UNRELIABLE'
            : p.warnings.length
              ? `${p.warnings.length} caveats`
              : 'Complete',
        tone: p.warnings.some(w => w.severity === 'blocking') ? 'red' : p.warnings.length ? 'orange' : 'green',
      },
    ],
    kpis: p.estimates.map(e => ({
      title: `${e.bureau} · ${BUREAU_PROFILE[e.bureau].mortgageModel}`,
      value: e.projected != null ? String(e.projected) : '—',
      sub: e.base == null ? 'no tradelines on file' : `from ${e.base} · range ${range(e)} · ${e.delta > 0 ? '+' : ''}${e.delta} pts`,
      tone: e.delta > 0 ? 'green' : e.delta < 0 ? 'red' : 'grey',
    })),
    tables: [
      {
        title: 'Per-bureau detail',
        tone: 'navy',
        columns: [
          { label: 'Bureau' },
          { label: 'Now', align: 'right' },
          { label: 'Proj.', align: 'right' },
          { label: 'Range', align: 'right' },
          { label: 'Util', align: 'right' },
          { label: 'Derogs', align: 'right' },
          { label: 'Inq 12mo', align: 'right' },
        ],
        rows: p.estimates.map(e => [
          e.bureau,
          e.base ?? '—',
          { text: String(e.projected ?? '—'), bold: true, tone: e.delta > 0 ? 'green' : e.delta < 0 ? 'red' : 'grey', align: 'right' as const },
          range(e),
          `${e.aggregateUtil.toFixed(0)}% → ${e.simAggregateUtil.toFixed(0)}%`,
          `${e.derogCount} → ${e.simDerogCount}`,
          `${e.inquiries12mo} → ${e.simInquiries12mo}`,
        ]),
        footerNote: 'Each bureau is scored only on the tradelines it reports, under the mortgage model lenders pull from it.',
      },
      {
        title: 'Action timeline',
        tone: 'blue',
        columns: [
          { label: 'When' },
          { label: 'Step' },
          { label: 'Cash', align: 'right' },
          { label: 'Pts', align: 'right' },
          { label: 'Score', align: 'right' },
        ],
        rows: p.timeline.map(s => [
          s.dateLabel,
          s.title,
          s.cash ? usd(s.cash) : '—',
          { text: `${s.impact > 0 ? '+' : ''}${s.impact}`, tone: s.impact > 0 ? 'green' : s.impact < 0 ? 'red' : 'grey', align: 'right' as const },
          { text: String(s.cumulative ?? '—'), bold: true, align: 'right' as const },
        ]),
        emptyMessage: 'Stack at least one action to generate a timeline.',
        footerNote: 'Pay-downs must post before the statement cut date to report at the lower balance.',
      },
      {
        title: 'Lender mapping',
        tone: 'green',
        width: '3.4in',
        columns: [{ label: 'Driver' }, { label: 'Now', align: 'right' }, { label: 'Projected', align: 'right' }],
        rows: [
          ['Qualifying score', p.baseMiddle ?? '—', { text: String(p.simMiddle ?? '—'), bold: true, align: 'right' as const }],
          ['Est. 30-yr rate', `${p.lender.rateNow.toFixed(2)}%`, `${p.lender.rateSim.toFixed(2)}%`],
          ['PITI', p.lender.pitiNow != null ? usd(p.lender.pitiNow) : '—', p.lender.pitiSim != null ? usd(p.lender.pitiSim) : '—'],
          ['Back-end DTI', `${p.lender.backEndNow.toFixed(0)}%`, `${p.lender.backEndSim.toFixed(0)}%`],
          ['Front-end DTI', '—', `${p.lender.frontEnd.toFixed(0)}%`],
          ['LTV', `${p.lender.ltv.toFixed(0)}%`, `${p.lender.ltv.toFixed(0)}%`],
        ],
        footerNote: `Target price ${usd(p.lender.price)} at ${p.lender.downPct}% down. Score sets the rate tier; DTI and LTV set approval.`,
      },
      {
        title: 'Qualification badges',
        tone: 'purple',
        width: '3.4in',
        columns: [{ label: 'Program' }, { label: 'At projected score', align: 'right' }],
        rows: p.programs.map(pr => [
          pr.program,
          { text: pr.ok ? 'QUALIFIES' : 'NOT YET', tone: pr.ok ? 'green' : 'red', bold: true, align: 'right' as const },
        ]),
        footerNote: 'Based on the middle of three scores — the number underwriting qualifies you on.',
      },
    ],
    panels: [
      {
        title: p.warnings.some(w => w.severity === 'blocking')
          ? 'DATA QUALITY WARNINGS — output is unreliable'
          : 'Data quality warnings',
        tone: p.warnings.some(w => w.severity === 'blocking') ? 'red' : 'orange',
        items: p.warnings.length
          ? p.warnings.slice(0, 10).map(w => `${w.severity === 'blocking' ? '[BLOCKING] ' : '[degrades] '}${w.text}`)
          : ['No data-quality issues detected — all required fields present on all three bureaus.'],
      },
      {
        title: 'Scenario stack',
        tone: 'orange',
        items: p.actionSummary.length ? p.actionSummary : ['No actions stacked — this is your baseline file.'],
      },
      {
        title: 'Assumptions used',
        tone: 'grey',
        items: [
          `Utilization averaged over ${p.sensitivity.utilWindowMonths} statement cycle(s)`,
          `Hard inquiries scored for ${p.sensitivity.inquiryWindowMonths} months`,
          `Disputed items assumed deleted in ${p.sensitivity.disputeLagMonths} month(s)`,
          'Factor weights: derogs 35%, utilization 30%, age 15%, mix 10%, depth 10%',
          'Anchored to reported bureau scores where available; modeled delta applied',
        ],
      },
      {
        title: 'Data gaps to close',
        tone: 'red',
        items: (() => {
          const gaps = p.checklists.flatMap(cl =>
            cl.items.filter(i => i.severity !== 'ok').map(i => `${cl.bureau}: ${i.field} — ${i.detail}`),
          );
          return gaps.length ? gaps.slice(0, 8) : ['All required fields present on all three bureaus.'];
        })(),
      },
    ],
    disclaimer:
      'These are rules-based directional estimates, NOT FICO or VantageScore results. Only licensees running the real algorithms against live bureau data can produce actual scores. For planning use only — not credit or financial advice.',
    zoom: 0.72,
  };
}
