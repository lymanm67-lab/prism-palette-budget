// Print/PDF binder export for the Dr. Lyman A. Montgomery Family Foundation module.
import { FOUNDATION_NAME, currency, readinessLabel, relationshipPriority, rollupFoundation } from './foundation';

type Any = Record<string, any>;

export type FoundationExportData = {
  settings: Any | null;
  pillars: Any[];
  initiatives: Any[];
  roadmap: Any[];
  relationships: Any[];
  legacyNodes: Any[];
};

const esc = (v: unknown) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const pct = (n: number) => `${Math.round((n || 0) * 100)}%`;

/* ---------- Narrative content: scenarios, pitfalls, tax implications ---------- */

const SCENARIOS: { title: string; body: string }[] = [
  {
    title: 'Scenario A — Slow formation, fast learning',
    body:
      'The foundation files in Year 1 but only funds one financial-literacy cohort and a small emergency housing fund. Grants stay under the annual budget, administrative cost stays near zero because the family serves as volunteer board, and the first impact report is thin but honest. Outcome: readiness climbs on structure rather than dollars, and Year 3 housing due diligence begins with credibility and clean books.',
  },
  {
    title: 'Scenario B — Housing-first push',
    body:
      'Land for the tiny home village closes in Year 3 and construction financing consumes most available capital. Programs in literacy, education, and health hold flat. Outcome: high visible impact and durable assets, but concentration risk — a construction overrun or lease-up delay stalls every other pillar. Mitigation: cap housing at a fixed share of deployable capital and keep a 12-month operating reserve outside the project.',
  },
  {
    title: 'Scenario C — Endowment-first discipline',
    body:
      'The family funds the endowment aggressively and grants only from investment income, targeting roughly a 5 percent annual distribution. Near-term reach is smaller, but grant capacity becomes permanent and survives any single year of family cash flow. Outcome: slowest visible start, strongest hundred-year position.',
  },
  {
    title: 'Scenario D — Partner-leveraged scale',
    body:
      'Recurring community partners, a church, and a county agency co-fund programs the foundation designs. Foundation dollars act as match rather than sole source, multiplying people served per dollar deployed. Outcome: best cost-per-beneficiary, with dependency risk if a partner exits mid-cycle. Mitigation: written multi-year partner agreements with wind-down clauses.',
  },
  {
    title: 'Scenario E — Succession stress test',
    body:
      'A founder becomes unavailable in Year 4. If the family constitution, bylaws, signature authority, and next-generation trustee training are already in place, operations continue through the grant cycle uninterrupted. If not, banking access, grant commitments, and reporting all stall at once. Test this on paper every year at the annual family meeting.',
  },
];

const PITFALLS: { title: string; body: string }[] = [
  {
    title: 'Mixing family money with foundation money',
    body:
      'Never pay a personal or business expense from foundation accounts, even temporarily. Separate bank accounts, separate cards, separate bookkeeping, and documented reimbursements only. Commingling is the single fastest way to lose exempt status and invite penalties.',
  },
  {
    title: 'Self-dealing with insiders',
    body:
      'Buying, selling, leasing, or lending between the foundation and family members, family businesses, or entities they control is generally prohibited for private foundations regardless of how fair the price looks. If the village land, a property manager, or a service vendor touches the family, get counsel before signing.',
  },
  {
    title: 'Paying yourself without a defensible basis',
    body:
      'Compensation to family officers or a program director must be reasonable and documented against comparable roles, approved by disinterested board members, and recorded in minutes.',
  },
  {
    title: 'Missing the annual distribution requirement',
    body:
      'Private foundations must distribute a minimum share of net investment assets each year. Missing it triggers excise tax on the shortfall. Track required distribution monthly, not at year end.',
  },
  {
    title: 'Grants to individuals without a documented process',
    body:
      'Scholarships and hardship grants to individuals need objective published criteria, a nondiscriminatory selection process, and in some cases advance IRS approval. Do not hand out scholarship checks from an informal list.',
  },
  {
    title: 'Vague impact metrics',
    body:
      'Reporting "families helped" without a definition makes the impact report unusable to funders and unauditable later. Define each KPI, its source, and its collection cadence before the program launches.',
  },
  {
    title: 'Concentration and single-donor dependence',
    body:
      'If one household funds everything, one bad year ends the foundation. Build a second and third funding source before scaling programs.',
  },
  {
    title: 'Lobbying and political activity',
    body:
      'Political campaign activity is prohibited and lobbying is sharply limited. Community advocacy is fine; endorsements are not.',
  },
  {
    title: 'Skipping governance hygiene',
    body:
      'No minutes, no conflict-of-interest policy, no document-retention policy, no annual filing calendar — each one is a small omission that becomes a large problem in an examination or a bank underwriting review.',
  },
  {
    title: 'Program sprawl',
    body:
      'Five pillars can become fifteen ad hoc projects. Every new initiative should attach to a pillar, a budget, a KPI, and an owner, or it does not launch.',
  },
];

const TAX_NOTES: { title: string; body: string }[] = [
  {
    title: 'Entity choice drives everything',
    body:
      'A private family foundation gives maximum control with heavier rules: excise tax on net investment income, minimum annual distributions, self-dealing prohibitions, and an annual Form 990-PF. A donor-advised fund at a sponsoring charity gives the best deduction treatment and near-zero administration, but the sponsor holds legal control of grants. Many families run both: a DAF for efficient giving now, a foundation for the institution and the name.',
  },
  {
    title: 'Deduction limits differ by vehicle and asset',
    body:
      'Cash gifts to a public charity or DAF generally deduct up to a higher percentage of adjusted gross income than gifts to a private foundation; appreciated property is treated differently again. Gifts of long-term appreciated securities usually beat cash because the gain is not recognized and the charity receives full value.',
  },
  {
    title: 'Appreciated stock over cash',
    body:
      'Donating long-term appreciated holdings avoids the capital gain the family would owe on sale. Keep a running list of the most appreciated lots and give those first; use cash for household needs.',
  },
  {
    title: 'Qualified charitable distributions after 70½',
    body:
      'Once eligible, direct IRA-to-charity distributions can satisfy required distributions without adding to taxable income. QCDs cannot go to a donor-advised fund or, generally, to a private foundation — plan the destination in advance.',
  },
  {
    title: 'Real estate and debt-financed property',
    body:
      'Contributing or holding leveraged real estate inside a charity can create unrelated business taxable income and appraisal requirements. Housing projects funded with construction debt need a structure review before closing, not after.',
  },
  {
    title: 'Bunching and timing',
    body:
      'Concentrating several years of giving into one high-income year can move the family above the standard deduction and increase the value of the deduction. Coordinate with Roth conversions and business income years.',
  },
  {
    title: 'Substantiation',
    body:
      'Written acknowledgment is required for gifts of $250 or more; noncash gifts above $5,000 generally need a qualified appraisal. Keep acknowledgments with the tax file, not the program file.',
  },
  {
    title: 'State-level filings',
    body:
      'Ohio charitable registration and annual reporting are separate from federal exemption. Calendar both, plus any charitable solicitation registration if fundraising crosses state lines.',
  },
];

const DISCLAIMER =
  'Educational planning material only. Nothing here is legal, tax, investment, or accounting advice. Tax rules, dollar thresholds, and percentage limits change and depend on facts specific to the family. Confirm every item with a qualified attorney and CPA before acting.';

/* ---------------------------- HTML builders ---------------------------- */

const S = {
  h1: 'font-size:26px;font-weight:800;letter-spacing:-.01em;margin:0',
  h2: 'font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#b45309;font-weight:700;margin:0 0 10px',
  h3: 'font-size:15px;font-weight:700;margin:0 0 4px;color:#111827',
  p: 'font-size:12.5px;line-height:1.6;color:#374151;margin:0',
  card: 'border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;background:#fff',
  section: 'page-break-inside:avoid;margin-bottom:26px',
};

function statCard(label: string, value: string, sub?: string) {
  return `<div style="flex:1;min-width:130px;padding:12px 14px;border-radius:10px;background:#fffbeb;border:1px solid #fde68a">
    <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#92400e;font-weight:700">${esc(label)}</div>
    <div style="font-size:19px;font-weight:800;color:#111827;margin-top:3px">${esc(value)}</div>
    ${sub ? `<div style="font-size:10.5px;color:#6b7280;margin-top:2px">${esc(sub)}</div>` : ''}
  </div>`;
}

function bar(fraction: number, color = '#b45309') {
  const w = Math.max(0, Math.min(100, Math.round((fraction || 0) * 100)));
  return `<div style="height:8px;background:#f3f4f6;border-radius:999px;overflow:hidden">
    <div style="height:8px;width:${w}%;background:${color};border-radius:999px"></div>
  </div>`;
}

function table(headers: string[], rows: string[][]) {
  if (!rows.length) return `<div style="${S.p};color:#9ca3af">No records yet.</div>`;
  return `<table style="width:100%;border-collapse:collapse;font-size:11.5px">
    <thead><tr>${headers
      .map(
        (h) =>
          `<th style="text-align:left;padding:7px 9px;background:#f9fafb;border-bottom:1px solid #e5e7eb;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280">${esc(h)}</th>`,
      )
      .join('')}</tr></thead>
    <tbody>${rows
      .map(
        (r) =>
          `<tr>${r
            .map((c) => `<td style="padding:7px 9px;border-bottom:1px solid #f3f4f6;color:#374151">${c}</td>`)
            .join('')}</tr>`,
      )
      .join('')}</tbody>
  </table>`;
}

function narrativeBlocks(items: { title: string; body: string }[], accent: string) {
  return items
    .map(
      (i) => `<div style="page-break-inside:avoid;margin-bottom:12px;padding-left:12px;border-left:3px solid ${accent}">
        <div style="${S.h3}">${esc(i.title)}</div>
        <div style="${S.p}">${esc(i.body)}</div>
      </div>`,
    )
    .join('');
}

/** Timeline visual: vertical phase rail with funding target bars and milestone checklists. */
function timelineHtml(roadmap: Any[]) {
  if (!roadmap.length) return `<div style="${S.p};color:#9ca3af">No roadmap phases yet.</div>`;
  const max = Math.max(...roadmap.map((r) => Number(r.target_amount || 0)), 1);
  return roadmap
    .map((r) => {
      const ms: string[] = Array.isArray(r.milestones) ? r.milestones : [];
      const doneList: string[] = Array.isArray(r.completed_milestones) ? r.completed_milestones : [];
      const done = ms.filter((m) => doneList.includes(m)).length;
      return `<div style="display:flex;gap:12px;page-break-inside:avoid;margin-bottom:14px">
        <div style="width:8px;flex:none;display:flex;flex-direction:column;align-items:center">
          <div style="width:11px;height:11px;border-radius:999px;background:${
            r.status === 'complete' ? '#16a34a' : r.status === 'at_risk' ? '#dc2626' : '#b45309'
          }"></div>
          <div style="flex:1;width:2px;background:#e5e7eb"></div>
        </div>
        <div style="flex:1;${S.card}">
          <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#b45309;font-weight:700">${esc(
                r.phase_label || r.year,
              )}</div>
              <div style="${S.h3}">${esc(r.title)}</div>
            </div>
            <div style="text-align:right;font-size:11px;color:#6b7280">
              <div style="font-weight:700;color:#111827">${esc(currency(Number(r.target_amount || 0)))}</div>
              <div>${esc(String(r.status || 'planned').replace('_', ' '))}</div>
            </div>
          </div>
          <div style="${S.p};margin:6px 0 8px">${esc(r.description)}</div>
          <div style="margin-bottom:8px">${bar(Number(r.target_amount || 0) / max)}</div>
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:700;margin-bottom:3px">Milestones ${done}/${ms.length}</div>
          <ul style="margin:0;padding-left:16px;font-size:11.5px;color:#374151;line-height:1.55">
            ${ms
              .map((m) => `<li>${doneList.includes(m) ? '&#10003; ' : '&#9633; '}${esc(m)}</li>`)
              .join('')}
          </ul>
        </div>
      </div>`;
    })
    .join('');
}

/** Builds the full binder HTML and opens the browser print dialog (Save as PDF). */
export function exportFoundationBinder(data: FoundationExportData) {
  const { settings, pillars, initiatives, roadmap, relationships, legacyNodes } = data;
  const roll = rollupFoundation(pillars as any, initiatives as any, roadmap as any, settings as any);
  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const values: Any[] = Array.isArray(settings?.core_values) ? settings!.core_values : [];

  const pillarsHtml = pillars
    .map((p) => {
      const own = initiatives.filter((i) => i.pillar_id === p.id);
      const spent = own.reduce((s, i) => s + Number(i.spent || 0), 0);
      const budget = own.reduce((s, i) => s + Number(i.budget || 0), 0);
      return `<div style="${S.card};page-break-inside:avoid;margin-bottom:12px">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline">
          <div style="${S.h3}">${esc(p.name)}</div>
          <div style="font-size:11px;color:#6b7280">${esc(p.status)} &middot; ${esc(currency(Number(p.annual_budget || 0)))}/yr</div>
        </div>
        <div style="${S.p};margin:4px 0 8px">${esc(p.description)}</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:11px;color:#374151;margin-bottom:8px">
          <span><strong>People:</strong> ${Number(p.actual_beneficiaries || 0)} / ${Number(p.target_beneficiaries || 0)}</span>
          <span><strong>Initiatives:</strong> ${own.length}</span>
          <span><strong>Committed:</strong> ${esc(currency(budget))}</span>
          <span><strong>Deployed:</strong> ${esc(currency(spent))}</span>
        </div>
        ${bar(Number(p.target_beneficiaries) ? Number(p.actual_beneficiaries || 0) / Number(p.target_beneficiaries) : 0)}
        <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:10px">
          <div style="flex:1;min-width:180px">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:700">Focus areas</div>
            <div style="${S.p}">${esc((p.focus_areas || []).join(' &middot; ')).replace(/&amp;middot;/g, '·')}</div>
          </div>
          <div style="flex:1;min-width:180px">
            <div style="font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:#6b7280;font-weight:700">KPIs</div>
            <div style="${S.p}">${esc((p.kpis || []).join(' · '))}</div>
          </div>
        </div>
        ${
          own.length
            ? `<div style="margin-top:10px">${table(
                ['Initiative', 'Status', 'Budget', 'Spent', 'People'],
                own.map((i) => [
                  esc(i.title),
                  esc(i.status),
                  esc(currency(Number(i.budget || 0))),
                  esc(currency(Number(i.spent || 0))),
                  `${Number(i.actual_beneficiaries || 0)} / ${Number(i.target_beneficiaries || 0)}`,
                ]),
              )}</div>`
            : ''
        }
      </div>`;
    })
    .join('');

  const relRows = [...relationships]
    .sort((a, b) => relationshipPriority(b as any) - relationshipPriority(a as any))
    .map((r) => [
      esc(r.name),
      esc(r.category ?? ''),
      esc(r.organization ?? ''),
      String(Number(r.influence || 0)),
      String(Number(r.strength || 0)),
      esc(r.next_action ?? ''),
    ]);

  const legacyRows = legacyNodes.map((n) => [
    esc(n.title),
    esc(n.node_type ?? ''),
    esc(String(n.generation ?? '').toUpperCase()),
    esc(n.linked_value ?? ''),
    esc(n.description ?? ''),
  ]);

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>${esc(FOUNDATION_NAME)} — Foundation Binder</title>
<style>
  @page { size: letter; margin: 0.6in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif; color:#111827; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .pb { page-break-before: always; } }
</style></head><body>
<div style="max-width:720px;margin:0 auto">

  <div style="border-bottom:3px solid #b45309;padding-bottom:12px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end;gap:16px">
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:.12em;color:#b45309;font-weight:700">PrismMoney&trade; &middot; Legacy Foundation Binder</div>
      <h1 style="${S.h1}">${esc(FOUNDATION_NAME)}</h1>
      <div style="${S.p};margin-top:4px">${esc(settings?.tagline ?? '')}</div>
    </div>
    <div style="font-size:11px;color:#9ca3af;text-align:right;white-space:nowrap">Generated<br/>${esc(now)}</div>
  </div>

  <!-- Executive dashboard -->
  <div style="${S.section}">
    <h2 style="${S.h2}">1. Executive Dashboard</h2>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      ${statCard('Legacy readiness', `${roll.readiness}`, readinessLabel(roll.readiness))}
      ${statCard('Endowment', currency(roll.endowmentCurrent), `of ${currency(roll.endowmentTarget)} (${pct(roll.endowmentProgress)})`)}
      ${statCard('Committed', currency(roll.committed), `${currency(roll.deployed)} deployed`)}
      ${statCard('People served', `${roll.peopleServed}`, `target ${roll.targetPeople} (${pct(roll.reachProgress)})`)}
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      ${statCard('Annual pillar budget', currency(roll.annualBudget))}
      ${statCard('Active pillars', `${roll.activePillars} / ${pillars.length}`)}
      ${statCard('Active initiatives', `${roll.activeInitiatives}`)}
      ${statCard('Cost per person', currency(roll.costPerBeneficiary))}
    </div>
    <div style="${S.card}">
      <div style="font-size:11px;color:#374151;margin-bottom:4px"><strong>Roadmap execution</strong> — ${roll.roadmapComplete} of ${roll.roadmapTotal} phases complete (${pct(roll.roadmapProgress)})</div>
      ${bar(roll.roadmapProgress, '#16a34a')}
      <div style="font-size:11px;color:#374151;margin:10px 0 4px"><strong>Capital deployment</strong> — ${pct(roll.deploymentRate)} of committed dollars deployed</div>
      ${bar(roll.deploymentRate, '#0d9488')}
    </div>
  </div>

  <!-- Mission -->
  <div style="${S.section}">
    <h2 style="${S.h2}">2. Mission, Vision &amp; Values</h2>
    <div style="${S.card};margin-bottom:10px">
      <div style="${S.h3}">Mission</div><div style="${S.p}">${esc(settings?.mission ?? '')}</div>
      <div style="${S.h3};margin-top:10px">Vision</div><div style="${S.p}">${esc(settings?.vision ?? '')}</div>
      <div style="${S.h3};margin-top:10px">Legacy statement</div><div style="${S.p}">${esc(settings?.legacy_statement ?? '')}</div>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${values
        .map(
          (v) => `<div style="flex:1;min-width:200px;${S.card}">
            <div style="${S.h3}">${esc(v.title)}</div><div style="${S.p}">${esc(v.description)}</div></div>`,
        )
        .join('')}
    </div>
  </div>

  <!-- Pillars -->
  <div class="pb">
    <h2 style="${S.h2}">3. Five Impact Pillars</h2>
    ${pillarsHtml || `<div style="${S.p};color:#9ca3af">No pillars yet.</div>`}
  </div>

  <!-- Timeline -->
  <div class="pb">
    <h2 style="${S.h2}">4. Five-Year Roadmap &amp; Timeline</h2>
    ${timelineHtml(roadmap)}
  </div>

  <!-- Relationships -->
  <div style="${S.section}">
    <h2 style="${S.h2}">5. Relationship Map — Outreach Priority</h2>
    ${table(['Name', 'Category', 'Organization', 'Influence', 'Strength', 'Next action'], relRows)}
  </div>

  <!-- Legacy map -->
  <div style="${S.section}">
    <h2 style="${S.h2}">6. Generational Legacy Map</h2>
    ${table(['Node', 'Type', 'Generation', 'Value', 'Description'], legacyRows)}
  </div>

  <!-- Narrative -->
  <div class="pb">
    <h2 style="${S.h2}">7. Strategic Narrative — Scenarios</h2>
    ${narrativeBlocks(SCENARIOS, '#b45309')}
  </div>

  <div style="${S.section}">
    <h2 style="${S.h2}">8. Pitfalls to Avoid</h2>
    ${narrativeBlocks(PITFALLS, '#dc2626')}
  </div>

  <div class="pb">
    <h2 style="${S.h2}">9. Tax Implications &amp; Considerations</h2>
    ${narrativeBlocks(TAX_NOTES, '#0d9488')}
    <div style="${S.card};background:#fef2f2;border-color:#fecaca;margin-top:10px">
      <div style="${S.h3};color:#b91c1c">Disclaimer</div>
      <div style="${S.p}">${esc(DISCLAIMER)}</div>
    </div>
  </div>

  <div style="margin-top:28px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:10.5px;color:#9ca3af;display:flex;justify-content:space-between">
    <span>Generated by PrismMoney&trade; — Legacy Foundation module</span>
    <span>Educational planning only — not legal, tax, or investment advice</span>
  </div>
</div>
<script>window.onload=function(){setTimeout(function(){window.print();},350);};</script>
</body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  return true;
}
