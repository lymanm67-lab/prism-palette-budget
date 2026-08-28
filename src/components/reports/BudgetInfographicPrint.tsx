import { useCallback } from 'react';
import { LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface InfographicCategory {
  category?: string;
  group?: string;
  spent?: number;
  budget?: number;
}

export interface InfographicTrendPoint {
  label: string;
  budget: number;
  actual: number;
}

interface Props {
  monthLabel: string;
  daysInMonth: number;
  categories: InfographicCategory[];
  trend?: InfographicTrendPoint[];
}

const NAVY = '#0f1e4d';
const BLUE = '#1657c8';
const GREEN = '#0f6b3a';
const RED = '#c0182a';
const PURPLE = '#3d1a63';
const ORANGE = '#e2711d';
const GREY = '#5b6472';

const SLICE_COLORS = [BLUE, GREEN, PURPLE, ORANGE, '#1c8fb0', '#2eb88a', GREY];

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const pct = (n: number) => `${n.toFixed(2)}%`;

/** Purpose buckets used by the "Budget Breakdown by Purpose" band. */
function purposeOf(group: string) {
  const g = group.toLowerCase();
  if (/(debt|loan|repayment)/.test(g)) return 'debt';
  if (/(saving|invest|emergency|retire|growth|stock|goal|wealth|fund|asset|equity|future)/.test(g)) return 'future';
  if (/(housing|utilit|insurance|food|grocer|transport|health|medical|tax)/.test(g)) return 'needs';
  return 'wants';
}


/** Build an SVG donut from group totals. */
function donutSvg(slices: { label: string; value: number; color: string }[], total: number) {
  const cx = 110;
  const cy = 110;
  const r = 88;
  const inner = 54;
  let angle = -Math.PI / 2;
  const paths = slices
    .map((s) => {
      const frac = total > 0 ? s.value / total : 0;
      const sweep = frac * Math.PI * 2;
      const a0 = angle;
      const a1 = angle + sweep;
      angle = a1;
      const large = sweep > Math.PI ? 1 : 0;
      const x0 = cx + r * Math.cos(a0);
      const y0 = cy + r * Math.sin(a0);
      const x1 = cx + r * Math.cos(a1);
      const y1 = cy + r * Math.sin(a1);
      const xi1 = cx + inner * Math.cos(a1);
      const yi1 = cy + inner * Math.sin(a1);
      const xi0 = cx + inner * Math.cos(a0);
      const yi0 = cy + inner * Math.sin(a0);
      const mid = (a0 + a1) / 2;
      const lr = (r + inner) / 2;
      const lx = cx + lr * Math.cos(mid);
      const ly = cy + lr * Math.sin(mid);
      const label =
        frac >= 0.05
          ? `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" fill="#fff" font-size="12" font-weight="700">${(frac * 100).toFixed(1)}%</text>`
          : '';
      return `<path d="M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L ${xi1.toFixed(1)} ${yi1.toFixed(1)} A ${inner} ${inner} 0 ${large} 0 ${xi0.toFixed(1)} ${yi0.toFixed(1)} Z" fill="${s.color}" />${label}`;
    })
    .join('');

  return `<svg width="220" height="220" viewBox="0 0 220 220">
    ${paths}
    <text x="${cx}" y="${cy - 6}" text-anchor="middle" font-size="15" font-weight="800" fill="${NAVY}">${money(total)}</text>
    <text x="${cx}" y="${cy + 12}" text-anchor="middle" font-size="9" letter-spacing="1" fill="${GREY}">TOTAL SPENT</text>
  </svg>`;
}

function trendSvg(points: InfographicTrendPoint[]) {
  if (!points.length) return '';
  const w = 240;
  const h = 150;
  const padL = 46;
  const padB = 34;
  const max = Math.max(...points.flatMap((p) => [p.budget, p.actual]), 1) * 1.12;
  const bw = (w - padL - 10) / points.length;
  const scale = (v: number) => 7 + (h - padB - 7) * (1 - v / max);
  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  const grid = gridVals
    .map(
      (v) =>
        `<line x1="${padL}" x2="${w}" y1="${scale(v).toFixed(1)}" y2="${scale(v).toFixed(1)}" stroke="#dfe3ea" stroke-width="1" />
         <text x="${padL - 5}" y="${(scale(v) + 3).toFixed(1)}" text-anchor="end" font-size="7" fill="${GREY}">$${Math.round(v).toLocaleString()}</text>`
    )
    .join('');
  const bars = points
    .map((p, i) => {
      const x = padL + i * bw;
      const y0 = scale(p.budget);
      const y1 = scale(p.actual);
      const base = h - padB;
      const net = p.budget - p.actual;
      return `
      <rect x="${(x + bw * 0.1).toFixed(1)}" y="${y0.toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${(base - y0).toFixed(1)}" fill="${GREEN}" />
      <rect x="${(x + bw * 0.45).toFixed(1)}" y="${y1.toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${(base - y1).toFixed(1)}" fill="${BLUE}" />
      <text x="${(x + bw * 0.25).toFixed(1)}" y="${(y0 - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${NAVY}">$${Math.round(p.budget).toLocaleString()}</text>
      <text x="${(x + bw * 0.6).toFixed(1)}" y="${(y1 - 3).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${BLUE}">$${Math.round(p.actual).toLocaleString()}</text>
      <text x="${(x + bw * 0.42).toFixed(1)}" y="${(base + 11).toFixed(1)}" text-anchor="middle" font-size="7.5" font-weight="700" fill="${net < 0 ? RED : GREEN}">${net < 0 ? '-' : '+'}$${Math.abs(Math.round(net)).toLocaleString()}</text>
      <text x="${(x + bw * 0.42).toFixed(1)}" y="${(base + 22).toFixed(1)}" text-anchor="middle" font-size="8" fill="${NAVY}">${p.label}</text>`;
    })
    .join('');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${grid}${bars}</svg>`;
}

export default function BudgetInfographicPrint({ monthLabel, daysInMonth, categories, trend = [] }: Props) {
  const handlePrint = useCallback(() => {
    // ---- aggregate by group -------------------------------------------------
    const groups = new Map<string, { group: string; spent: number; budget: number; cats: InfographicCategory[] }>();
    for (const c of categories) {
      const key = (c.group || 'Uncategorized').trim();
      if (!groups.has(key)) groups.set(key, { group: key, spent: 0, budget: 0, cats: [] });
      const g = groups.get(key)!;
      g.spent += c.spent || 0;
      g.budget += c.budget || 0;
      g.cats.push(c);
    }
    const allGroups = Array.from(groups.values()).sort((a, b) => b.spent - a.spent);
    const totalSpent = allGroups.reduce((s, g) => s + g.spent, 0);
    const totalBudget = allGroups.reduce((s, g) => s + g.budget, 0);
    const variance = totalBudget - totalSpent;
    const utilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const avgDaily = daysInMonth > 0 ? totalSpent / daysInMonth : 0;

    // donut: top 6 groups + "All Other Categories"
    const top = allGroups.slice(0, 6);
    const rest = allGroups.slice(6);
    const restSpent = rest.reduce((s, g) => s + g.spent, 0);
    const slices = [
      ...top.map((g, i) => ({ label: g.group, value: g.spent, color: SLICE_COLORS[i] })),
      ...(restSpent > 0 ? [{ label: 'All Other Categories', value: restSpent, color: GREY }] : []),
    ];

    const legend = slices
      .map(
        (s) => `<tr>
          <td style="padding:3px 6px"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${s.color}"></span></td>
          <td style="padding:2px 5px;font-size:9px;line-height:1.15;color:${NAVY}">${s.label}</td>
          <td style="padding:3px 6px;font-size:9.5px;text-align:right;font-weight:600">${money(s.value)}</td>
          <td style="padding:3px 6px;font-size:9.5px;text-align:right;color:${GREY}">${totalSpent > 0 ? ((s.value / totalSpent) * 100).toFixed(1) : '0.0'}%</td>
        </tr>`
      )
      .join('');

    // ---- over-budget categories --------------------------------------------
    const over = categories
      .map((c) => ({ ...c, over: (c.spent || 0) - (c.budget || 0) }))
      .filter((c) => (c.budget || 0) > 0 && c.over > 0)
      .sort((a, b) => b.over - a.over)
      .slice(0, 8);

    const overRows = over
      .map(
        (c) => `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eceef2">
          <div style="font-weight:700;color:${RED};font-size:10.5px">${c.category ?? ''}</div>
          <div style="font-size:8.5px;color:${GREY}">${c.group ?? ''}</div>
        </td>
        <td style="padding:6px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px">${money(c.budget || 0)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px;color:${RED};font-weight:700">${money(c.spent || 0)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px;color:${RED};font-weight:700">+${money(c.over)}<div style="font-weight:400;font-size:8.5px">(${(c.budget ? (c.over / c.budget) * 100 : 0).toFixed(0)}%)</div></td>
      </tr>`
      )
      .join('');

    // ---- budget vs actual by group ------------------------------------------
    const groupRows = allGroups
      .map((g) => {
        const v = g.budget - g.spent;
        const vp = g.budget > 0 ? (v / g.budget) * 100 : 0;
        const color = v < 0 ? RED : GREEN;
        const drivers = g.cats
          .slice()
          .sort((a, b) => (b.spent || 0) - (a.spent || 0))
          .slice(0, 5)
          .map((c) => c.category)
          .filter(Boolean)
          .join(', ');
        return `<tr>
          <td style="padding:5px 8px;border-bottom:1px solid #eceef2;font-weight:700;font-size:10px;color:${v < 0 ? RED : NAVY}">${g.group}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px">${money(g.budget)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px">${money(g.spent)}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px;color:${color};font-weight:700">${v < 0 ? '-' : '+'}${money(Math.abs(v))}</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eceef2;text-align:center;font-size:10px;color:${color};font-weight:700">${vp.toFixed(2)}%</td>
          <td style="padding:5px 8px;border-bottom:1px solid #eceef2;font-size:8.5px;color:${BLUE}">${drivers}</td>
        </tr>`;
      })
      .join('');

    // ---- purpose buckets ----------------------------------------------------
    const buckets: Record<string, number> = { needs: 0, debt: 0, wants: 0, future: 0 };
    for (const g of allGroups) buckets[purposeOf(g.group)] += g.spent;
    const purposeMeta = [
      { key: 'needs', title: 'NEEDS', sub: "Essentials I can't live without", color: NAVY },
      { key: 'debt', title: 'DEBT & OBLIGATIONS', sub: 'Payments to build freedom', color: GREEN },
      { key: 'wants', title: 'WANTS & LIFESTYLE', sub: 'Quality of life choices', color: BLUE },
      { key: 'future', title: 'FUTURE & GROWTH', sub: 'Investing in my tomorrow', color: ORANGE },
    ];
    const purposeCards = purposeMeta
      .map((p) => {
        const val = buckets[p.key];
        const share = totalSpent > 0 ? (val / totalSpent) * 100 : 0;
        return `<div style="flex:1;text-align:center;padding:0 3px;min-width:0">
          <div style="font-size:7px;font-weight:800;letter-spacing:0.02em;color:${p.color}">${p.title}</div>
          <div style="font-size:17px;font-weight:800;color:${p.color};margin-top:4px">${share.toFixed(1)}%</div>
          <div style="font-size:10px;font-weight:700;color:${BLUE}">${money(val)}</div>
          <div style="font-size:6.5px;color:${GREY};margin-top:3px">${p.sub}</div>
        </div>`;
      })
      .join('');

    const priorities = [
      'Stay in my home as long as possible',
      'Have choices in the care I receive',
      'Protect my savings and retirement income',
      'Avoid being a burden to my family',
      'Leave a legacy, not a cleanup',
    ]
      .map(
        (p) =>
          `<div style="display:flex;align-items:center;gap:7px;padding:4px 0"><span style="display:inline-block;width:13px;height:13px;border-radius:50%;background:${GREEN};color:#fff;font-size:9px;text-align:center;line-height:13px">✓</span><span style="font-size:9.5px;font-weight:600;color:${BLUE}">${p}</span></div>`
      )
      .join('');

    const kpi = (title: string, value: string, sub: string, color: string, bg: string) => `
      <div style="flex:1;border:1px solid ${color}33;background:${bg};border-radius:10px;padding:10px 12px;text-align:center">
        <div style="font-size:9px;font-weight:800;letter-spacing:0.05em;color:${color};text-transform:uppercase">${title}</div>
        <div style="font-size:19px;font-weight:800;color:${color};margin:3px 0">${value}</div>
        <div style="font-size:8px;color:${GREY}">${sub}</div>
      </div>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>My Monthly Budget — ${monthLabel}</title>
<style>
  @page { size: letter portrait; margin: 0.35in; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: ${NAVY}; background: #fff; }
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  table { border-collapse: collapse; width: 100%; }
  .panel { border: 1px solid #d7dbe3; border-radius: 10px; overflow: hidden; }
  .panel-head { color: #fff; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-align: center; padding: 6px; text-transform: uppercase; }
  .th { font-size: 8.5px; font-weight: 800; letter-spacing: 0.04em; color: ${GREY}; text-transform: uppercase; padding: 5px 8px; border-bottom: 1.5px solid #d7dbe3; }
</style></head>
<body>
<div style="max-width:7.8in;margin:0 auto;zoom:0.73">

  <!-- Masthead -->
  <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:14px;border-bottom:2px solid ${NAVY};padding-bottom:8px">
    <div style="flex:1;text-align:center">
      <div style="font-size:30px;font-weight:900;letter-spacing:-0.5px;color:${NAVY}">MY MONTHLY BUDGET</div>
      <div style="font-size:22px;font-weight:800;color:${GREEN};margin-top:-2px">${monthLabel.toUpperCase()}</div>
      <div style="font-size:11px;font-style:italic;font-weight:700;color:${NAVY};margin-top:2px">Plan Today. Spend Wisely. Build Wealth. Live Free.</div>
    </div>
    <div style="width:2.1in" class="panel">
      <div class="panel-head" style="background:${NAVY}">Month at a Glance</div>
      <table>
        <tr><td style="padding:4px 8px;font-size:9.5px;font-weight:700">Budgeted</td><td style="padding:4px 8px;font-size:11px;font-weight:800;text-align:right;color:${BLUE}">${money(totalBudget)}</td></tr>
        <tr><td style="padding:4px 8px;font-size:9.5px;font-weight:700">Spent</td><td style="padding:4px 8px;font-size:11px;font-weight:800;text-align:right;color:${RED}">${money(totalSpent)}</td></tr>
        <tr><td style="padding:4px 8px;font-size:9.5px;font-weight:700">${variance >= 0 ? 'Under Budget' : 'Over Budget'}</td><td style="padding:4px 8px;font-size:11px;font-weight:800;text-align:right;color:${variance >= 0 ? GREEN : RED}">${money(Math.abs(variance))}</td></tr>
      </table>
    </div>
  </div>

  <!-- KPI row -->
  <div style="display:flex;gap:8px;margin-top:10px">
    ${kpi('Budgeted', money(totalBudget), 'What I planned to spend', GREEN, '#f2f8f4')}
    ${kpi('Actual Spent', money(totalSpent), 'What I actually spent', BLUE, '#f2f6fd')}
    ${kpi(variance >= 0 ? 'Under Budget' : 'Over Budget', money(Math.abs(variance)), variance >= 0 ? 'I stayed under budget by' : 'I went over budget by', variance >= 0 ? GREEN : RED, variance >= 0 ? '#f2f8f4' : '#fdf3f4')}
    ${kpi('Budget Utilization', pct(utilization), 'of my budget used', PURPLE, '#f6f3fa')}
    ${kpi('Average Daily Spend', money(avgDaily), `${daysInMonth} days`, ORANGE, '#fdf6f0')}
  </div>

  <!-- Donut + over budget -->
  <div style="display:flex;gap:8px;margin-top:10px">
    <div class="panel" style="flex:1">
      <div class="panel-head" style="background:${NAVY}">Where My Money Went</div>
      <div style="display:flex;align-items:center;gap:6px;padding:8px">
        <div style="flex:0 0 200px">${donutSvg(slices, totalSpent)}</div>
        <table style="flex:1;table-layout:fixed"><colgroup><col style="width:16px"/><col/><col style="width:72px"/><col style="width:50px"/></colgroup><thead><tr><th></th><th class="th" style="text-align:left">Category Group</th><th class="th" style="text-align:right">Spent</th><th class="th" style="text-align:right">% of Total</th></tr></thead><tbody>${legend}</tbody></table>

      </div>
      <div style="background:${NAVY};color:#fff;text-align:center;font-size:11px;font-style:italic;font-weight:700;padding:5px">Every dollar has a purpose.</div>
    </div>
    <div class="panel" style="width:3.3in">
      <div class="panel-head" style="background:${RED}">Top Over Budget Categories</div>
      <table><thead><tr><th class="th" style="text-align:left">Category</th><th class="th">Budget</th><th class="th">Actual</th><th class="th">Over</th></tr></thead>
      <tbody>${overRows || `<tr><td colspan="4" style="padding:16px;text-align:center;font-size:10px;color:${GREEN};font-weight:700">No categories over budget this month.</td></tr>`}</tbody></table>
      <div style="background:#fdf3f4;color:${RED};font-size:9.5px;font-weight:700;text-align:center;padding:5px">⚠ Review and adjust to bring over-budget areas in line.</div>
    </div>
  </div>

  <!-- Budget vs actual -->
  <div class="panel" style="margin-top:10px">
    <div class="panel-head" style="background:${NAVY}">Budget vs Actual by Category Group</div>
    <table><thead><tr>
      <th class="th" style="text-align:left">Category Group</th><th class="th">Budgeted</th><th class="th">Actual</th><th class="th">Variance ($)</th><th class="th">Variance (%)</th><th class="th" style="text-align:left">Key Drivers / Notes</th>
    </tr></thead><tbody>${groupRows}
      <tr style="background:#f4f6fa">
        <td style="padding:6px 8px;font-weight:900;font-size:11px">TOTAL</td>
        <td style="padding:6px 8px;text-align:center;font-weight:900;font-size:11px;color:${BLUE}">${money(totalBudget)}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:900;font-size:11px;color:${RED}">${money(totalSpent)}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:900;font-size:11px;color:${variance >= 0 ? GREEN : RED}">${variance >= 0 ? '+' : '-'}${money(Math.abs(variance))}</td>
        <td style="padding:6px 8px;text-align:center;font-weight:900;font-size:11px">${pct(utilization)}</td>
        <td></td>
      </tr>
    </tbody></table>
  </div>

  <!-- Bottom band -->
  <div style="display:flex;gap:8px;margin-top:10px">
    <div class="panel" style="flex:1.6">
      <div class="panel-head" style="background:${GREEN}">Budget Breakdown by Purpose</div>
      <div style="display:flex;padding:10px 4px">${purposeCards}</div>
      <div style="background:#f2f6fd;color:${BLUE};font-size:9.5px;font-style:italic;font-weight:700;text-align:center;padding:5px">Smart choices today create financial freedom tomorrow.</div>
    </div>
    <div class="panel" style="width:2.6in">
      <div class="panel-head" style="background:${NAVY}">Monthly Trend (3-Month View)</div>
      <div style="padding:6px;text-align:center">
        <div style="font-size:8.5px;margin-bottom:2px"><span style="color:${GREEN};font-weight:700">■ Budgeted</span> &nbsp; <span style="color:${BLUE};font-weight:700">■ Actual</span> &nbsp; <span style="color:${RED};font-weight:700">■ Over / (Under)</span></div>
        ${trendSvg(trend) || `<div style="padding:30px;font-size:10px;color:${GREY}">Not enough history yet.</div>`}
      </div>
      <div style="background:#f4f6fa;color:${NAVY};font-size:9.5px;font-style:italic;font-weight:700;text-align:center;padding:5px">Staying consistent builds long-term wealth.</div>
    </div>
    <div class="panel" style="width:1.85in">
      <div class="panel-head" style="background:${PURPLE}">My Financial Priorities</div>
      <div style="padding:8px 10px">${priorities}</div>
    </div>
  </div>

  <!-- Commitment footer -->
  <div style="margin-top:10px;background:${NAVY};color:#fff;border-radius:10px;padding:10px 14px;display:flex;align-items:center;gap:14px">
    <div style="flex:1.2">
      <div style="font-size:10px;font-weight:800;color:${ORANGE};letter-spacing:0.04em">MY COMMITMENT:</div>
      <div style="font-size:9px;line-height:1.4">I will take action today to secure my future and protect what matters most.</div>
    </div>
    <div style="flex:2;display:flex;align-items:center;justify-content:space-around;font-size:8px;font-weight:800;letter-spacing:0.04em;text-align:center">
      <span>TAKE ACTION<br/>TODAY</span><span>→</span><span>BUILD SECURITY<br/>OVER TIME</span><span>→</span><span>PROTECT MYSELF<br/>&amp; MY FAMILY</span><span>→</span><span>LEAVE A LEGACY<br/>OF LOVE</span>
    </div>
  </div>
  <div style="text-align:center;font-size:10.5px;font-weight:900;letter-spacing:0.08em;color:${ORANGE};margin-top:6px">DISCIPLINE TODAY. FREEDOM TOMORROW. LEGACY FOREVER.</div>
  <div style="text-align:center;font-size:7.5px;color:${GREY};margin-top:4px">PrismMoney™ · Generated ${new Date().toLocaleString()} · For personal financial planning only</div>
</div>
</body></html>`;

    const w = window.open('', '_blank', 'width=1000,height=1200');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  }, [monthLabel, daysInMonth, categories, trend]);

  return (
    <Button variant="outline" onClick={handlePrint} className="gap-2">
      <LayoutTemplate className="h-4 w-4" />
      Print Infographic
    </Button>
  );
}
