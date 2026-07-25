import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Printer, ImageDown, FileDown, Loader2 } from 'lucide-react';
import { useWealthOSData } from '@/hooks/use-wealth-os';
import { simulate } from '@/lib/legacy/monteCarloSim';
import { exportBinderPNGs, exportBinderPDF } from '@/lib/legacy/wealthOsExport';


/**
 * Montgomery Family Wealth Operating System — Binder Edition
 * 12 print-ready 8.5x11 executive dashboard pages.
 * Fixed brand palette (navy/gold/white/gray) — this is a printed artifact, not app chrome.
 */

const NAVY = '#0B2341';
const GOLD = '#C9A227';
const GRAY = '#E5E7EB';
const SLATE = '#64748B';
const GREEN = '#1F7A5A';

const money = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

const PAGES = [
  'Mission Control', 'Household Assets', 'Real Estate', 'Retirement & Income',
  'Debt Freedom', 'Investment Priority', 'Business', 'Insurance & Risk',
  'Legacy Planning', 'Financial Roadmap', 'Wealth Scorecard', 'Executive Summary',
];

/* ---------- primitives ---------- */

function Page({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`page-${n}`} className="wos-page">
      <header className="wos-head">
        <div>
          <div className="wos-eyebrow">Montgomery Family Wealth Operating System</div>
          <h2 className="wos-title">{title}</h2>
        </div>
        <div className="wos-tab">{String(n).padStart(2, '0')}</div>
      </header>
      <div className="wos-body">{children}</div>
      <footer className="wos-foot">
        <span>Faith • Family • Stewardship • Legacy</span>
        <span>Page {String(n).padStart(2, '0')} of 12 — Confidential Family Office Document</span>
      </footer>
    </section>
  );
}

function Kpi({ label, value, sub, tone = 'navy' }: { label: string; value: string; sub?: string; tone?: 'navy' | 'gold' | 'green' | 'plain' }) {
  const bg = tone === 'navy' ? NAVY : tone === 'gold' ? GOLD : tone === 'green' ? GREEN : '#FFFFFF';
  const fg = tone === 'plain' ? NAVY : '#FFFFFF';
  return (
    <div className="wos-kpi" style={{ background: bg, color: fg, border: tone === 'plain' ? `1px solid ${GRAY}` : 'none' }}>
      <div className="wos-kpi-label" style={{ color: tone === 'plain' ? SLATE : 'rgba(255,255,255,.75)' }}>{label}</div>
      <div className="wos-kpi-value">{value}</div>
      {sub && <div className="wos-kpi-sub" style={{ color: tone === 'plain' ? SLATE : 'rgba(255,255,255,.8)' }}>{sub}</div>}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="wos-seclabel">{children}</div>;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="wos-row" style={{ fontWeight: bold ? 700 : 400 }}>
      <span>{label}</span>
      <span style={{ color: NAVY }}>{value}</span>
    </div>
  );
}

function Bar({ label, pct, value }: { label: string; pct: number; value?: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="wos-row" style={{ border: 'none', padding: '0 0 4px' }}>
        <span style={{ fontSize: 10.5 }}>{label}</span>
        <span style={{ fontSize: 10.5, color: NAVY, fontWeight: 700 }}>{value ?? `${pct}%`}</span>
      </div>
      <div style={{ height: 7, background: GRAY, borderRadius: 99 }}>
        <div style={{ width: `${Math.min(100, pct)}%`, height: '100%', background: `linear-gradient(90deg, ${NAVY}, ${GOLD})`, borderRadius: 99 }} />
      </div>
    </div>
  );
}

function Donut({ slices, total }: { slices: { label: string; value: number; color: string }[]; total: number }) {
  let acc = 0;
  const r = 62, c = 2 * Math.PI * r;
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <svg width={170} height={170} viewBox="0 0 170 170">
        <g transform="translate(85,85) rotate(-90)">
          <circle r={r} fill="none" stroke={GRAY} strokeWidth={26} />
          {slices.map((s) => {
            const frac = s.value / total;
            const el = (
              <circle key={s.label} r={r} fill="none" stroke={s.color} strokeWidth={26}
                strokeDasharray={`${c * frac} ${c}`} strokeDashoffset={-c * acc} />
            );
            acc += frac;
            return el;
          })}
        </g>
        <text x={85} y={80} textAnchor="middle" fontSize={9} fill={SLATE} letterSpacing={1}>TOTAL</text>
        <text x={85} y={97} textAnchor="middle" fontSize={14} fontWeight={700} fill={NAVY}>{money(total)}</text>
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map((s) => (
          <div key={s.label} className="wos-legend">
            <span style={{ width: 9, height: 9, borderRadius: 2, background: s.color, display: 'inline-block' }} />
            <span style={{ flex: 1 }}>{s.label}</span>
            <strong style={{ color: NAVY }}>{money(s.value)}</strong>
            <span style={{ color: SLATE, width: 42, textAlign: 'right' }}>{((s.value / total) * 100).toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Milestone({ date, items, tone = 'navy' }: { date: string; items: { label: string; value?: string }[]; tone?: 'navy' | 'gold' | 'green' }) {
  const dot = tone === 'gold' ? GOLD : tone === 'green' ? GREEN : NAVY;
  return (
    <div className="wos-mile">
      <div className="wos-mile-dot" style={{ background: dot }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800, color: NAVY, fontSize: 12, letterSpacing: .3 }}>{date}</div>
        <div style={{ marginTop: 4 }}>
          {items.map((i) => (
            <div key={i.label} className="wos-row" style={{ padding: '3px 0' }}>
              <span>{i.label}</span>{i.value && <span style={{ color: NAVY, fontWeight: 700 }}>{i.value}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Check({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="wos-check">
      <span className="wos-check-box" style={{ background: done ? GREEN : '#fff', borderColor: done ? GREEN : GRAY, color: '#fff' }}>
        {done ? '✓' : ''}
      </span>
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{ fontSize: 9.5, letterSpacing: .6, color: done ? GREEN : GOLD, fontWeight: 700 }}>
        {done ? 'COMPLETE' : 'IN PROGRESS'}
      </span>
    </div>
  );
}

/* ---------- charts ---------- */

function LineChart({ points, label }: { points: { date: string; netWorth: number }[]; label: string }) {
  const W = 640, H = 190, P = 34;
  if (points.length < 2) {
    return <div className="wos-card" style={{ color: SLATE, fontSize: 10.5, textAlign: 'center', padding: 24 }}>
      Not enough history yet — this chart fills in as daily net-worth snapshots accumulate.
    </div>;
  }
  const vals = points.map((p) => p.netWorth);
  const min = Math.min(...vals) * 0.97, max = Math.max(...vals) * 1.03;
  const x = (i: number) => P + (i / (points.length - 1)) * (W - P * 2);
  const y = (v: number) => H - P - ((v - min) / Math.max(max - min, 1)) * (H - P * 2);
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.netWorth).toFixed(1)}`).join(' ');
  const area = `${d} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} stroke={GRAY} strokeWidth={1} />
      ))}
      <path d={area} fill="rgba(11,35,65,.08)" />
      <path d={d} fill="none" stroke={NAVY} strokeWidth={2.5} />
      <circle cx={x(points.length - 1)} cy={y(vals[vals.length - 1])} r={4} fill={GOLD} />
      <text x={P} y={16} fontSize={9} fill={SLATE} letterSpacing={1}>{label.toUpperCase()}</text>
      <text x={W - P} y={16} fontSize={11} fontWeight={700} fill={NAVY} textAnchor="end">{money(vals[vals.length - 1])}</text>
      <text x={P} y={H - 10} fontSize={8.5} fill={SLATE}>{points[0].date}</text>
      <text x={W - P} y={H - 10} fontSize={8.5} fill={SLATE} textAnchor="end">{points[points.length - 1].date}</text>
    </svg>
  );
}

function BandChart({ mean, p10, p90 }: { mean: number[]; p10: number[]; p90: number[] }) {
  const W = 640, H = 200, P = 34;
  const n = mean.length;
  const max = Math.max(...p90) * 1.05 || 1;
  const x = (i: number) => P + (i / Math.max(n - 1, 1)) * (W - P * 2);
  const y = (v: number) => H - P - (v / max) * (H - P * 2);
  const path = (arr: number[]) => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const band = `${path(p90)} L${x(n - 1)},${y(p10[n - 1])} ${p10.slice().reverse().map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')} Z`;
  const fmt = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 0.5, 1].map((f) => (
        <line key={f} x1={P} x2={W - P} y1={P + f * (H - P * 2)} y2={P + f * (H - P * 2)} stroke={GRAY} strokeWidth={1} />
      ))}
      <path d={band} fill="rgba(201,162,39,.22)" />
      <path d={path(mean)} fill="none" stroke={NAVY} strokeWidth={2.5} />
      <text x={P} y={16} fontSize={9} fill={SLATE} letterSpacing={1}>PROJECTED ESTATE — 10TH / MEAN / 90TH PERCENTILE</text>
      <text x={W - P} y={16} fontSize={11} fontWeight={700} fill={NAVY} textAnchor="end">{fmt(mean[n - 1] || 0)}</text>
      <text x={P} y={H - 10} fontSize={8.5} fill={SLATE}>Today</text>
      <text x={W - P} y={H - 10} fontSize={8.5} fill={SLATE} textAnchor="end">{n - 1} years</text>
    </svg>
  );
}

/* ---------- data ---------- */

const FALLBACK_ASSETS = [
  { key: 'retirement', label: 'Retirement Assets', value: 175346, color: NAVY },
  { key: 'business', label: 'Business Interests', value: 550000, color: GOLD },
  { key: 'realEstate', label: 'Real Estate (Ownership Interest)', value: 142000, color: '#1D4E89' },
  { key: 'intellectualProperty', label: 'Intellectual Property', value: 50000, color: '#8A7420' },
  { key: 'personalProperty', label: 'Personal Property & Vehicles', value: 57000, color: '#3F6E9C' },
  { key: 'brokerage', label: 'Brokerage', value: 5000, color: GREEN },
  { key: 'hsa', label: 'HSA', value: 1200, color: '#9AA7B5' },
  { key: 'emergency', label: 'Emergency Fund', value: 350, color: '#C4CBD3' },
];

/* ---------- main ---------- */

export default function WealthOS() {
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null);
  const { data: live } = useWealthOSData();

  const ASSETS = useMemo(
    () => FALLBACK_ASSETS.map((a) => ({
      ...a,
      value: live?.buckets ? ((live.buckets as any)[a.key] || 0) : a.value,
    })).filter((a) => a.value > 0),
    [live],
  );
  const ASSET_TOTAL = ASSETS.reduce((a, b) => a + b.value, 0) || 1;

  const sim = useMemo(() => simulate({
    startingPrincipal: Math.max(live?.netWorth ?? ASSET_TOTAL, 1000),
    horizonYears: 30, expectedReturn: 0.07, returnStdDev: 0.15, inflation: 0.03,
    taxRate: 0.15, annualDistributionPct: 0, charitablePct: 0,
    additionalContribution: 24000, contributionGrowth: 0.03, businessGrowth: 0,
    lifeInsuranceProceeds: 0, generations: 1, runs: 300,
  }), [live?.netWorth, ASSET_TOTAL]);

  const jump = (i: number) => {
    setActive(i);
    document.getElementById(`page-${i + 1}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const runExport = async (kind: 'png' | 'pdf') => {
    setBusy(kind);
    try {
      if (kind === 'png') await exportBinderPNGs();
      else await exportBinderPDF();
    } finally {
      setBusy(null);
    }
  };


  return (
    <div className="wos-root">
      <style>{`
        .wos-root { background:#F1F3F6; padding: 16px 0 64px; }
        .wos-page { width: 8.5in; min-height: 11in; margin: 0 auto 22px; background:#fff;
          box-shadow: 0 10px 30px rgba(11,35,65,.12); padding: 0.55in 0.6in 0.45in;
          display:flex; flex-direction:column; font-family: ui-sans-serif, "Helvetica Neue", Arial, sans-serif;
          color:#111827; font-size: 11px; }
        .wos-head { display:flex; justify-content:space-between; align-items:flex-end;
          border-bottom: 3px solid ${NAVY}; padding-bottom: 10px; }
        .wos-eyebrow { font-size:8.5px; letter-spacing:.18em; text-transform:uppercase; color:${GOLD}; font-weight:800; }
        .wos-title { font-size: 22px; font-weight: 800; color:${NAVY}; letter-spacing:-.01em; margin-top:3px; }
        .wos-tab { width:46px; height:46px; border-radius:10px; background:${NAVY}; color:${GOLD};
          display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:800; }
        .wos-body { flex:1; padding-top: 16px; }
        .wos-foot { border-top:1px solid ${GRAY}; margin-top:14px; padding-top:8px; display:flex;
          justify-content:space-between; font-size:8.5px; color:${SLATE}; letter-spacing:.04em; }
        .wos-grid3 { display:grid; grid-template-columns: repeat(3,1fr); gap:10px; }
        .wos-grid2 { display:grid; grid-template-columns: repeat(2,1fr); gap:10px; }
        .wos-grid4 { display:grid; grid-template-columns: repeat(4,1fr); gap:10px; }
        .wos-kpi { border-radius:12px; padding:12px 14px; }
        .wos-kpi-label { font-size:8.5px; letter-spacing:.13em; text-transform:uppercase; font-weight:700; }
        .wos-kpi-value { font-size:19px; font-weight:800; margin-top:4px; line-height:1.15; }
        .wos-kpi-sub { font-size:9px; margin-top:2px; }
        .wos-seclabel { font-size:9px; letter-spacing:.16em; text-transform:uppercase; font-weight:800;
          color:${NAVY}; border-left:3px solid ${GOLD}; padding-left:8px; margin:18px 0 10px; }
        .wos-row { display:flex; justify-content:space-between; gap:12px; padding:5px 0;
          border-bottom:1px solid ${GRAY}; font-size:11px; }
        .wos-legend { display:flex; align-items:center; gap:8px; font-size:10px; padding:4px 0; border-bottom:1px solid ${GRAY}; }
        .wos-card { border:1px solid ${GRAY}; border-radius:12px; padding:12px 14px; }
        .wos-mile { display:flex; gap:12px; padding-bottom:14px; position:relative; }
        .wos-mile:not(:last-child)::before { content:''; position:absolute; left:5px; top:16px; bottom:0; width:2px; background:${GRAY}; }
        .wos-mile-dot { width:12px; height:12px; border-radius:99px; margin-top:3px; flex:none; z-index:1; }
        .wos-check { display:flex; align-items:center; gap:10px; padding:7px 0; border-bottom:1px solid ${GRAY}; font-size:11px; }
        .wos-check-box { width:16px; height:16px; border-radius:4px; border:1.5px solid; display:flex;
          align-items:center; justify-content:center; font-size:10px; font-weight:800; flex:none; }
        .wos-quote { background:${NAVY}; color:#fff; border-radius:12px; padding:16px 20px; text-align:center;
          font-size:12.5px; font-style:italic; line-height:1.6; }
        .wos-nav { position:sticky; top:0; z-index:20; background:${NAVY}; padding:8px 12px; display:flex;
          gap:6px; overflow-x:auto; align-items:center; }
        .wos-nav button { color:#fff; font-size:10px; font-weight:700; padding:5px 9px; border-radius:6px;
          white-space:nowrap; opacity:.7; }
        .wos-nav button.on { background:${GOLD}; color:${NAVY}; opacity:1; }
        @media print {
          .wos-root { background:#fff; padding:0; }
          .wos-noprint { display:none !important; }
          .wos-page { box-shadow:none; margin:0; page-break-after:always; width:auto; min-height:auto; }
          @page { size: letter portrait; margin: 0.4in; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* Navigation */}
      <div className="wos-nav wos-noprint">
        <span style={{ color: GOLD, fontSize: 10, fontWeight: 800, letterSpacing: '.12em', paddingRight: 6 }}>BINDER</span>
        {PAGES.map((p, i) => (
          <button key={p} className={active === i ? 'on' : ''} onClick={() => jump(i)}>
            {String(i + 1).padStart(2, '0')} {p}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', paddingLeft: 10, display: 'flex', gap: 6 }}>
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => runExport('png')} className="gap-1.5 h-7 text-xs">
            {busy === 'png' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageDown className="h-3.5 w-3.5" />} PNG Stack
          </Button>
          <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => runExport('pdf')} className="gap-1.5 h-7 text-xs">
            {busy === 'pdf' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />} PDF
          </Button>
          <Button size="sm" variant="secondary" onClick={() => window.print()} className="gap-1.5 h-7 text-xs">
            <Printer className="h-3.5 w-3.5" /> Print Binder
          </Button>
        </div>

      </div>

      {/* COVER */}
      <section className="wos-page" style={{ background: NAVY, color: '#fff', justifyContent: 'space-between', textAlign: 'center' }}>
        <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, fontSize: 9, letterSpacing: '.3em', color: GOLD, fontWeight: 800 }}>
          FAMILY OFFICE • CONFIDENTIAL
        </div>
        <div>
          <svg width="120" height="140" viewBox="0 0 120 140" style={{ margin: '0 auto 26px' }}>
            <path d="M60 6 L112 26 V74 C112 108 88 126 60 134 C32 126 8 108 8 74 V26 Z"
              fill="none" stroke={GOLD} strokeWidth="3" />
            <path d="M60 18 L100 33 V74 C100 100 82 114 60 121 C38 114 20 100 20 74 V33 Z"
              fill="rgba(201,162,39,.10)" stroke="rgba(201,162,39,.5)" strokeWidth="1" />
            <path d="M60 40 V96 M40 58 H80" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
            <text x="60" y="112" textAnchor="middle" fill={GOLD} fontSize="9" letterSpacing="3">MMXXVI</text>
          </svg>
          <h1 style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.12, letterSpacing: '-.02em' }}>
            The Montgomery Family<br />Wealth Operating System
          </h1>
          <div style={{ width: 90, height: 3, background: GOLD, margin: '22px auto' }} />
          <p style={{ fontSize: 13, lineHeight: 1.8, color: 'rgba(255,255,255,.8)', maxWidth: '5.6in', margin: '0 auto' }}>
            A Comprehensive Strategy for Financial Independence, Retirement Security,
            Asset Protection, Family Stewardship, and Legacy Creation
          </p>
          <div style={{ marginTop: 34, fontSize: 12, letterSpacing: '.35em', color: GOLD, fontWeight: 700 }}>
            FAITH • FAMILY • STEWARDSHIP • LEGACY
          </div>
        </div>
        <div style={{ borderTop: `1px solid rgba(255,255,255,.2)`, paddingTop: 12, fontSize: 9, color: 'rgba(255,255,255,.6)', letterSpacing: '.1em' }}>
          BINDER EDITION • TWELVE EXECUTIVE DASHBOARDS
        </div>
      </section>

      {/* PAGE 1 */}
      <Page n={1} title="Mission Control Dashboard">
        <SectionLabel>Employment</SectionLabel>
        <div className="wos-grid3">
          <Kpi label="Annual Salary" value="$70,940.04" tone="navy" />
          <Kpi label="Monthly Gross" value="$5,911.67" tone="plain" />
          <Kpi label="Monthly Net" value="$4,464.91" tone="plain" />
          <Kpi label="Annual Raise" value="3%" tone="gold" />
          <Kpi label="Status" value="Verified" sub="Paystub confirmed" tone="green" />
          <Kpi label="Employer Contribution" value="$532.05" sub="per month • 9% non-elective" tone="plain" />
        </div>

        <SectionLabel>Retirement</SectionLabel>
        <div className="wos-grid3">
          <Kpi label="Current Retirement Assets" value="$175,346" tone="navy" />
          <Kpi label="Combined Savings Rate" value="28.66%" sub="Employee + Employer" tone="gold" />
          <Kpi label="Employee Goal" value="30%" sub="Target by Dec 2026" tone="plain" />
        </div>
        <div style={{ marginTop: 12 }}>
          <Bar label="Progress to 30% Employee Savings Goal" pct={95.5} value="28.66% of 30%" />
        </div>

        <SectionLabel>Wealth Snapshot</SectionLabel>
        <div className="wos-grid4">
          <Kpi label="Brokerage" value="$5,000" tone="plain" />
          <Kpi label="Emergency Fund" value="$350" tone="plain" />
          <Kpi label="HSA" value="$1,200" tone="plain" />
          <Kpi label="Business Value" value="$550,000" tone="navy" />
          <Kpi label="Intellectual Property" value="$50,000" tone="gold" />
          <Kpi label="Business Revenue" value="~$25,000" sub="per year" tone="plain" />
          <Kpi label="Real Estate Interest" value="~$142,000" tone="plain" />
          <Kpi label="Personal Property" value="$57,000" tone="plain" />
        </div>

        <SectionLabel>Mission Statement</SectionLabel>
        <div className="wos-quote">
          Honor God through faithful stewardship, intentional wealth building, responsible risk
          management, and leaving a legacy that strengthens future generations.
        </div>
      </Page>

      {/* PAGE 2 */}
      <Page n={2} title="Household Asset Dashboard">
        <SectionLabel>Asset Allocation</SectionLabel>
        <Donut slices={ASSETS} total={ASSET_TOTAL} />

        <SectionLabel>Asset Categories</SectionLabel>
        <div className="wos-grid2">
          <div className="wos-card">
            <Row label="Retirement Assets" value="$175,346" />
            <Row label="Real Estate (Interest)" value="$142,000" />
            <Row label="Business Interests" value="$550,000" />
            <Row label="Intellectual Property" value="$50,000" />
            <Row label="Brokerage Account" value="$5,000" />
          </div>
          <div className="wos-card">
            <Row label="HSA" value="$1,200" />
            <Row label="Emergency Fund" value="$350" />
            <Row label="Personal Property" value="$32,000" />
            <Row label="Vehicles" value="$25,000" />
            <Row label="Total Household Assets" value={money(ASSET_TOTAL)} bold />
          </div>
        </div>

        <SectionLabel>Personal Property Detail</SectionLabel>
        <div className="wos-grid4">
          <Kpi label="Jewelry" value="$25,000" tone="plain" />
          <Kpi label="Firearms" value="$7,000" tone="plain" />
          <Kpi label="2023 Jaguar" value="$25,000" tone="plain" />
          <Kpi label="Total Personal Property" value="$57,000" tone="navy" />
        </div>
      </Page>

      {/* PAGE 3 */}
      <Page n={3} title="Real Estate Dashboard">
        <SectionLabel>Property Portfolio</SectionLabel>
        <div className="wos-grid3">
          {[
            { addr: '124 Cambridge Avenue', own: '20% ownership', mv: '$85,000', oi: '$17,000' },
            { addr: '152–154 Cambridge Avenue', own: '50% ownership', mv: '$90,000', oi: '$45,000' },
            { addr: '213 Allies Street', own: 'Kateri Montgomery', mv: '$80,000', oi: '$80,000' },
          ].map((p) => (
            <div key={p.addr} className="wos-card" style={{ borderTop: `4px solid ${GOLD}` }}>
              <div style={{ fontWeight: 800, color: NAVY, fontSize: 12.5, lineHeight: 1.3 }}>{p.addr}</div>
              <div style={{ fontSize: 9.5, color: SLATE, marginTop: 3, marginBottom: 8 }}>{p.own}</div>
              <Row label="Est. Market Value" value={p.mv} />
              <Row label="Ownership Interest" value={p.oi} bold />
            </div>
          ))}
        </div>

        <SectionLabel>Portfolio Totals</SectionLabel>
        <div className="wos-grid2">
          <Kpi label="Total Household Market Value" value="$255,000" tone="navy" />
          <Kpi label="Household Ownership Interest" value="~$142,000" tone="gold" />
        </div>

        <SectionLabel>Ownership Interest by Property</SectionLabel>
        <Bar label="124 Cambridge Avenue" pct={12} value="$17,000" />
        <Bar label="152–154 Cambridge Avenue" pct={32} value="$45,000" />
        <Bar label="213 Allies Street" pct={56} value="$80,000" />
      </Page>

      {/* PAGE 4 */}
      <Page n={4} title="Retirement & Income Strategy">
        <div className="wos-grid3">
          <Kpi label="Current Salary" value="$70,940.04" tone="navy" />
          <Kpi label="Current Savings Rate" value="28.66%" tone="gold" />
          <Kpi label="Projected Retirement Portfolio" value="$1.2M+" sub="At current trajectory" tone="green" />
        </div>

        <SectionLabel>Income Sources in Retirement</SectionLabel>
        <div className="wos-grid4">
          <Kpi label="Employer Contributions" value="$532.05/mo" sub="9% non-elective" tone="plain" />
          <Kpi label="Social Security" value="Scheduled" sub="Claim strategy under review" tone="plain" />
          <Kpi label="OPERS" value="Pension" sub="Spousal benefit" tone="plain" />
          <Kpi label="Deferred Compensation" value="Active" sub="Supplemental" tone="plain" />
        </div>

        <SectionLabel>Salary Growth Timeline (3% Annual)</SectionLabel>
        <Milestone date="JULY 2026" tone="gold" items={[{ label: 'Annual Salary', value: '$70,940.04' }, { label: 'Monthly Gross', value: '$5,911.67' }]} />
        <Milestone date="JULY 2027" items={[{ label: 'Annual Salary (3% raise)', value: '$73,068.24' }]} />
        <Milestone date="JULY 2028" items={[{ label: 'Annual Salary (3% raise)', value: '$75,260.29' }]} />
        <Milestone date="JULY 2029" items={[{ label: 'Annual Salary (3% raise)', value: '$77,518.10' }]} />
        <Milestone date="JULY 2030" tone="green" items={[{ label: 'Annual Salary (3% raise)', value: '$79,843.64' }]} />
      </Page>

      {/* PAGE 5 */}
      <Page n={5} title="Debt Freedom & Cash Flow Acceleration">
        <Kpi label="Monthly Cash Flow Redirected" value="$1,373 / month" sub="Fully deployed to retirement and wealth building by August 2027" tone="navy" />

        <SectionLabel>Acceleration Timeline</SectionLabel>
        <Milestone date="MAY 2027" tone="gold" items={[
          { label: 'Marketing & Education obligation ends', value: '$500/mo' },
          { label: 'Redirect to Retirement', value: '$500/mo' },
        ]} />
        <Milestone date="MAY – AUGUST 2027" items={[
          { label: 'Vacation Loan balance', value: '$3,500' },
          { label: 'Loan 1 payment', value: '$220/mo' },
          { label: 'Loan 2 payment', value: '$155/mo' },
          { label: 'Redirect on payoff', value: '$375/mo' },
        ]} />
        <Milestone date="AUGUST 2027" tone="green" items={[
          { label: 'Consumer Debt Eliminated', value: '✓' },
          { label: 'Redirect', value: '$498/mo' },
        ]} />

        <SectionLabel>Redirect Composition</SectionLabel>
        <Bar label="Marketing & Education redirect" pct={36} value="$500/mo" />
        <Bar label="Vacation loan redirect" pct={27} value="$375/mo" />
        <Bar label="Consumer debt redirect" pct={36} value="$498/mo" />
        <div className="wos-grid3" style={{ marginTop: 14 }}>
          <Kpi label="Annualized Redirect" value="$16,476" tone="gold" />
          <Kpi label="Debt-Free Target" value="Aug 2027" tone="plain" />
          <Kpi label="Destination" value="Retirement" sub="To 30% employee deferral" tone="plain" />
        </div>
      </Page>

      {/* PAGE 6 */}
      <Page n={6} title="Investment Priority Dashboard">
        <SectionLabel>The Priority Ladder</SectionLabel>
        {[
          ['Employer Match', 'Capture every available employer dollar first', 'Complete'],
          ['Retirement Contributions to 30%', 'Employee deferral target by December 2026', 'In Progress'],
          ['Fully Fund HSA', 'Triple-tax-advantaged; invest above cash floor', 'In Progress'],
          ['Emergency Fund', 'Current balance $350 — rebuild to 3–6 months', 'Priority'],
          ['Brokerage Investments', 'Taxable flexibility bridge before retirement age', 'Next'],
          ['Business Growth', 'Reinvest into revenue-producing IP and services', 'Next'],
          ['Legacy Investments', 'Trust-funded, multi-generational allocations', 'Future'],
        ].map(([t, d, s], i) => (
          <div key={t} className="wos-card" style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8, borderLeft: `4px solid ${i < 1 ? GREEN : i < 4 ? GOLD : NAVY}` }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: NAVY, color: GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flex: 'none' }}>
              {i + 1}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: NAVY, fontSize: 12 }}>{t}</div>
              <div style={{ fontSize: 10, color: SLATE, marginTop: 2 }}>{d}</div>
            </div>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.1em', textTransform: 'uppercase', color: i < 1 ? GREEN : i < 4 ? GOLD : SLATE }}>{s}</div>
          </div>
        ))}
        <div className="wos-quote" style={{ marginTop: 14 }}>
          Every dollar is assigned before it is spent. The ladder is worked top to bottom, and never skipped.
        </div>
      </Page>

      {/* PAGE 7 */}
      <Page n={7} title="Business Dashboard">
        <div className="wos-grid3">
          <Kpi label="Annual Revenue" value="~$25,000" tone="plain" />
          <Kpi label="Business Valuation" value="~$550,000" tone="navy" />
          <Kpi label="Intellectual Property" value="~$50,000" tone="gold" />
        </div>

        <SectionLabel>Revenue Pillars</SectionLabel>
        <div className="wos-grid3">
          {[
            ['Books', 'Published works and royalties'],
            ['Courses', 'Structured curriculum and cohorts'],
            ['Speaking', 'Keynotes, workshops, panels'],
            ['Consulting', 'Advisory and implementation'],
            ['Digital Products', 'Templates, tools, subscriptions'],
            ['Intellectual Property', 'Licensing and brand equity'],
          ].map(([t, d]) => (
            <div key={t} className="wos-card" style={{ borderTop: `3px solid ${NAVY}` }}>
              <div style={{ fontWeight: 800, color: NAVY, fontSize: 11.5 }}>{t}</div>
              <div style={{ fontSize: 9.5, color: SLATE, marginTop: 3, lineHeight: 1.5 }}>{d}</div>
            </div>
          ))}
        </div>

        <SectionLabel>Enterprise Value Composition</SectionLabel>
        <Bar label="Operating business value" pct={92} value="$550,000" />
        <Bar label="Intellectual property" pct={8} value="$50,000" />
        <div className="wos-grid2" style={{ marginTop: 14 }}>
          <Kpi label="Total Enterprise Value" value="$600,000" tone="navy" />
          <Kpi label="Revenue-to-Value Multiple" value="24x" sub="Growth of revenue is the primary lever" tone="gold" />
        </div>
      </Page>

      {/* PAGE 8 */}
      <Page n={8} title="Insurance & Risk Protection">
        <SectionLabel>Coverage in Force</SectionLabel>
        <div className="wos-grid2">
          <Kpi label="Life Insurance — Personal Policy" value="$500,000" tone="navy" />
          <Kpi label="Employer Group Life" value="$250,000" tone="plain" />
          <Kpi label="Disability" value="~70% Salary Replacement" tone="gold" />
          <Kpi label="Long-Term Care" value="In Place" tone="green" />
        </div>

        <SectionLabel>Beneficiaries</SectionLabel>
        <div className="wos-card">
          <Row label="Primary Beneficiary" value="Spouse" />
          <Row label="Contingent Beneficiaries" value="Children" />
          <Row label="Trust Named as Beneficiary" value="Montgomery Family Legacy Trust" />
          <Row label="Last Beneficiary Audit" value="Annual review required" bold />
        </div>

        <SectionLabel>Protection Coverage Level</SectionLabel>
        <Bar label="Life insurance vs. 10x income benchmark" pct={106} value="$750,000 total" />
        <Bar label="Disability income replacement" pct={70} value="70%" />
        <Bar label="Long-term care readiness" pct={100} value="Covered" />
        <Bar label="Emergency liquidity (3-month target)" pct={3} value="$350" />

        <div className="wos-quote" style={{ marginTop: 16 }}>
          Protection precedes accumulation. A plan without insurance is a plan with a single point of failure.
        </div>
      </Page>

      {/* PAGE 9 */}
      <Page n={9} title="Legacy Planning Dashboard">
        <SectionLabel>Estate Document Status</SectionLabel>
        {[
          ['Trust', true], ['Will', true], ['Powers of Attorney', true], ['Healthcare Directives', true],
          ['Beneficiary Designations', true], ['Family Constitution', false],
          ['Family Wealth Operating System', true], ['Annual Review', false],
          ['Estate Review', false], ['Trust Funding', false],
        ].map(([l, d]) => <Check key={l as string} label={l as string} done={d as boolean} />)}

        <SectionLabel>Overall Estate Readiness</SectionLabel>
        <Bar label="Documents complete" pct={60} value="6 of 10" />
        <div className="wos-grid3" style={{ marginTop: 12 }}>
          <Kpi label="Complete" value="6" tone="green" />
          <Kpi label="In Progress" value="4" tone="gold" />
          <Kpi label="Estate Readiness" value="60%" tone="navy" />
        </div>
        <div className="wos-card" style={{ marginTop: 14 }}>
          <div style={{ fontWeight: 800, color: NAVY, fontSize: 11.5, marginBottom: 6 }}>Immediate Next Steps</div>
          <Row label="1. Fund the trust — retitle qualifying assets" value="Priority" />
          <Row label="2. Draft and ratify the Family Constitution" value="Q3" />
          <Row label="3. Schedule annual estate review with counsel" value="Q4" />
        </div>
      </Page>

      {/* PAGE 10 */}
      <Page n={10} title="Financial Roadmap">
        <SectionLabel>Multi-Year Execution Timeline</SectionLabel>
        <Milestone date="2026" tone="green" items={[{ label: 'Salary Increase — 3%', value: 'Completed' }]} />
        <Milestone date="2027" tone="gold" items={[
          { label: 'Marketing Redirect', value: 'Completed' },
          { label: 'Vacation Loan', value: 'Paid' },
          { label: 'Consumer Debt', value: 'Paid' },
          { label: 'Increase Retirement Contributions', value: 'To 30%' },
        ]} />
        <Milestone date="2028" items={[
          { label: 'Increase Brokerage', value: 'Scale' },
          { label: 'Increase Business Revenue', value: 'Scale' },
          { label: 'Increase Retirement Contributions', value: 'Maintain 30%' },
        ]} />
        <Milestone date="2030 +" items={[
          { label: 'Net Worth Expansion', value: 'Compound' },
          { label: 'Estate Growth', value: 'Fund trust' },
          { label: 'Legacy Planning', value: 'Multi-generational' },
        ]} />

        <SectionLabel>Roadmap Progress</SectionLabel>
        <Bar label="2026 objectives" pct={100} value="Complete" />
        <Bar label="2027 objectives" pct={45} value="In progress" />
        <Bar label="2028 objectives" pct={10} value="Planned" />
        <Bar label="2030+ objectives" pct={0} value="Future" />

        <SectionLabel>Net Worth Trend</SectionLabel>
        <LineChart points={live?.history || []} label="Household net worth" />
      </Page>

      {/* PAGE 11 */}
      <Page n={11} title="Annual Family Wealth Scorecard">
        <SectionLabel>Tracked Annually</SectionLabel>
        <div className="wos-grid3">
          <Kpi label="Net Worth" value={money(live?.netWorth ?? ASSET_TOTAL)} tone="navy" />
          <Kpi label="Retirement Assets" value={money(live?.buckets.retirement || 175346)} tone="navy" />
          <Kpi label="Business Value" value={money(live?.buckets.business || 550000)} tone="gold" />
          <Kpi label="Business Revenue" value="~$25,000" tone="plain" />
          <Kpi label="Real Estate Equity" value={money(live?.buckets.realEstate || 142000)} tone="plain" />
          <Kpi label="Brokerage" value={money(live?.buckets.brokerage || 5000)} tone="plain" />
          <Kpi label="HSA" value={money(live?.buckets.hsa || 1200)} tone="plain" />
          <Kpi label="Emergency Fund" value={money(live?.buckets.emergency || 350)} sub="Rebuild priority" tone="gold" />
          <Kpi label="Debt Remaining" value={money(live?.totalLiabilities ?? 3500)} tone="plain" />
          <Kpi label="Savings Rate" value="28.66%" tone="green" />
          <Kpi label="Estate Readiness" value={`${Math.round(live?.estate.pct ?? 60)}%`} tone="green" />
          <Kpi label="Annual Review Date" value="December" tone="plain" />
        </div>

        <SectionLabel>30-Year Wealth Projection (Monte Carlo, 300 runs)</SectionLabel>
        <BandChart mean={sim.meanPath} p10={sim.p10Path} p90={sim.p90Path} />
        <div className="wos-grid3" style={{ marginTop: 10 }}>
          <Kpi label="Median Outcome (30 yr)" value={money(Math.round(sim.meanPath[sim.meanPath.length - 1] || 0))} tone="navy" />
          <Kpi label="Downside (10th pct)" value={money(Math.round(sim.p10Path[sim.p10Path.length - 1] || 0))} tone="plain" />
          <Kpi label="Upside (90th pct)" value={money(Math.round(sim.p90Path[sim.p90Path.length - 1] || 0))} tone="gold" />
        </div>


        <SectionLabel>Year-Over-Year Tracking Grid</SectionLabel>
        <div className="wos-card">
          {['Net Worth', 'Retirement Assets', 'Business Value', 'Real Estate Equity', 'Debt Remaining', 'Savings Rate', 'Estate Readiness'].map((m) => (
            <div key={m} className="wos-row">
              <span style={{ flex: 1 }}>{m}</span>
              <span style={{ width: 90, textAlign: 'right', color: SLATE }}>Prior Year ____</span>
              <span style={{ width: 90, textAlign: 'right', color: SLATE }}>This Year ____</span>
              <span style={{ width: 70, textAlign: 'right', color: SLATE }}>Δ ____</span>
            </div>
          ))}
        </div>
      </Page>

      {/* PAGE 12 */}
      <Page n={12} title="Family Office Executive Summary">
        <div className="wos-grid3">
          {[
            ['Faith', 'Stewardship as an act of obedience and gratitude.'],
            ['Family', 'Shared understanding, shared discipline, shared benefit.'],
            ['Financial Independence', 'Income from assets exceeds income from labor.'],
            ['Retirement', '28.66% combined savings rate; 30% employee target.'],
            ['Business', '$550K valuation, $50K IP, ~$25K annual revenue.'],
            ['Real Estate', '$255K market value; ~$142K ownership interest.'],
            ['Insurance', '$750K life, 70% disability, LTC in force.'],
            ['Estate Planning', '60% readiness; trust funding is the gating item.'],
            ['Legacy', 'Each generation stronger than the one before it.'],
          ].map(([t, d]) => (
            <div key={t} className="wos-card" style={{ borderLeft: `3px solid ${GOLD}` }}>
              <div style={{ fontWeight: 800, color: NAVY, fontSize: 11.5 }}>{t}</div>
              <div style={{ fontSize: 9.5, color: SLATE, marginTop: 3, lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>

        <div className="wos-grid2" style={{ marginTop: 16 }}>
          <div>
            <SectionLabel>Guiding Principles &amp; Mission</SectionLabel>
            <div className="wos-card" style={{ fontSize: 10.5, lineHeight: 1.65, color: '#374151' }}>
              Honor God through faithful stewardship, intentional wealth building, responsible
              risk management, and leaving a legacy that strengthens future generations.
            </div>
          </div>
          <div>
            <SectionLabel>Current Priorities</SectionLabel>
            <div className="wos-card">
              <Row label="Rebuild emergency fund" value="From $350" />
              <Row label="Reach 30% employee deferral" value="Dec 2026" />
              <Row label="Eliminate consumer debt" value="Aug 2027" />
            </div>
          </div>
        </div>

        <SectionLabel>Next Milestones</SectionLabel>
        <div className="wos-grid4">
          <Kpi label="Jul 2026" value="3% Raise" tone="plain" />
          <Kpi label="May 2027" value="$500/mo Redirect" tone="gold" />
          <Kpi label="Aug 2027" value="Debt Free" tone="green" />
          <Kpi label="Annual Review" value="December" tone="navy" />
        </div>

        <div className="wos-quote" style={{ marginTop: 18 }}>
          “Every dollar has a purpose. Every asset has a plan.<br />
          Every generation leaves the next stronger than the last.”
        </div>
      </Page>
    </div>
  );
}
