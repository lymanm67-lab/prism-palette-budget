import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  SCENARIOS,
  money,
  moneyShort,
  NAVY,
  GOLD,
  EMERALD,
  type CrossoverYear,
} from '@/lib/investment/crossoverEngine';

export interface CrossoverReportProps {
  label: string;
  balance: number;
  contributions: number;
  returnPct: number;
  contributionGrowthPct: number;
  debtRedirectAnnual: number;
  debtRedirectStartYear: number;
  crossoverYear: number | null;
  crossoverPortfolio: number | null;
  rows: CrossoverYear[];
  chartData: Record<string, number>[];
  byScenario: { scenario: (typeof SCENARIOS)[number]; result: { rows: CrossoverYear[]; crossoverYear: number | null } }[];
  household: { key: string; label: string; balance: number; contributions: number; result: { rows: CrossoverYear[]; crossoverYear: number | null } }[];
}

const INK = '#0f172a';
const SUB = '#475569';
const LINE = '#cbd5e1';

/** One printable letter-size page. */
function Page({
  n,
  total,
  label,
  children,
}: {
  n: number;
  total: number;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rpt-page">
      <div className="rpt-body">{children}</div>
      <div className="rpt-foot">
        <span>The Compounding Crossover™ · {label}</span>
        <span>
          Page {n} of {total}
        </span>
      </div>
    </div>
  );
}

const H = ({ eyebrow, title }: { eyebrow: string; title: string }) => (
  <div className="rpt-h">
    <div className="rpt-eyebrow">{eyebrow}</div>
    <h2>{title}</h2>
  </div>
);

const Kpi = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="rpt-kpi" style={{ borderColor: color }}>
    <div className="rpt-kpi-l">{label}</div>
    <div className="rpt-kpi-v" style={{ color }}>
      {value}
    </div>
  </div>
);

export default function CrossoverReport(p: CrossoverReportProps) {
  const TOTAL = 4;
  const today = new Date();
  const thisYear = today.getFullYear();
  const doubleYears = 72 / p.returnPct;

  const findMilestone = (mult: number) => p.rows.find((r) => r.endBalance >= p.balance * mult) ?? null;

  const doublings = [1, 2, 3].map((n) => {
    const w = findMilestone(2 ** n);
    return {
      n,
      withoutYear: Math.round(thisYear + doubleYears * n),
      withoutBalance: p.balance * 2 ** n,
      withYear: w?.year ?? null,
      withBalance: w?.endBalance ?? null,
    };
  });

  const tableRows = p.rows.filter((_, i) => i % 3 === 0).slice(0, 9);
  const finalRow = p.rows[p.rows.length - 1];

  const milestones = [
    { label: 'Current position', amount: p.balance, note: 'Contributions are the primary driver of growth.' },
    { label: 'Milestone One', amount: 250_000, note: 'Compounding becomes visible year over year.' },
    { label: 'Milestone Two', amount: 375_000, note: 'Crossover zone — gains begin to match contributions.' },
    { label: 'Milestone Three', amount: 500_000, note: 'Portfolio becomes the primary wealth engine.' },
    { label: 'Milestone Four', amount: 1_000_000, note: 'Annual gains may exceed a full-time salary.' },
  ].map((m) => {
    const hit = p.rows.find((r) => r.endBalance >= m.amount);
    return { ...m, year: m.amount <= p.balance ? thisYear : hit?.year ?? null };
  });

  return (
    <div className="rpt-root">
      <style>{`
      .rpt-root { color: ${INK}; background: #e2e8f0; }
      .rpt-page {
        width: 7.5in;
        min-height: 10in;
        margin: 0 auto 24px;
        background: #fff;
        padding: 0.35in 0.4in 0.5in;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        box-shadow: 0 8px 24px rgba(15,23,42,.18);
        font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
        font-size: 10.5pt;
        line-height: 1.45;
      }
      .rpt-body { flex: 1 1 auto; }
      .rpt-foot {
        margin-top: 14px; padding-top: 6px; border-top: 1px solid ${LINE};
        display: flex; justify-content: space-between;
        font-size: 8pt; color: ${SUB};
      }
      .rpt-h { margin: 0 0 10px; }
      .rpt-eyebrow { font-size: 7.5pt; font-weight: 700; letter-spacing: .18em; text-transform: uppercase; color: ${GOLD}; }
      .rpt-h h2 { margin: 2px 0 0; font-size: 16pt; font-weight: 700; color: ${NAVY}; }
      .rpt-root p { margin: 0 0 8px; }
      .rpt-hero { background: ${NAVY}; color: #fff; border-radius: 10px; padding: 22px 24px; }
      .rpt-hero h1 { margin: 6px 0 4px; font-size: 24pt; font-weight: 800; }
      .rpt-hero .sub { font-size: 9.5pt; color: rgba(255,255,255,.82); }
      .rpt-hero .eb { font-size: 8pt; font-weight: 700; letter-spacing: .22em; text-transform: uppercase; color: ${GOLD}; }
      .rpt-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
      .rpt-kpi { border: 1.5px solid ${LINE}; border-radius: 8px; padding: 10px 12px; }
      .rpt-kpi-l { font-size: 7.5pt; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: ${SUB}; }
      .rpt-kpi-v { font-size: 15pt; font-weight: 800; margin-top: 2px; }
      .rpt-card { border: 1px solid ${LINE}; border-radius: 8px; padding: 12px 14px; margin-bottom: 12px; }
      .rpt-card.tint { background: #f8fafc; }
      table.rpt { width: 100%; border-collapse: collapse; font-size: 9pt; }
      table.rpt th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .06em; color: ${SUB}; padding: 4px 6px; border-bottom: 1.5px solid ${LINE}; }
      table.rpt td { padding: 4px 6px; border-bottom: 1px solid #e2e8f0; }
      table.rpt td.num, table.rpt th.num { text-align: right; font-variant-numeric: tabular-nums; }
      .rpt-note { font-size: 8pt; color: ${SUB}; }
      .rpt-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
      @media print {
        .rpt-root { background: #fff; }
        .rpt-page {
          width: auto; min-height: 0; margin: 0; padding: 0;
          box-shadow: none; break-after: page; page-break-after: always;
        }
        .rpt-page:last-child { break-after: auto; page-break-after: auto; }
        .rpt-card, .rpt-kpi, table.rpt, .recharts-wrapper { break-inside: avoid; page-break-inside: avoid; }
      }
      `}</style>

      {/* ---------- Page 1 — Cover & executive summary ---------- */}
      <Page n={1} total={TOTAL} label={p.label}>
        <div className="rpt-hero">
          <div className="eb">Montgomery Family Wealth Operating System</div>
          <h1>The Compounding Crossover™</h1>
          <div className="sub">
            {p.label} · Prepared{' '}
            {today.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </div>
        </div>

        <div className="rpt-kpis">
          <Kpi label="Crossover year" value={p.crossoverYear ? String(p.crossoverYear) : '—'} color={GOLD} />
          <Kpi label="Portfolio at crossover" value={p.crossoverPortfolio ? moneyShort(p.crossoverPortfolio) : '—'} color={EMERALD} />
          <Kpi label="Balance today" value={money(p.balance)} color={NAVY} />
        </div>

        <div className="rpt-card">
          <H eyebrow="Executive narrative" title="Where the engine takes over" />
          <p>
            This report models the point at which <strong>{p.label}</strong>&apos;s invested capital begins
            producing more annual growth than the household contributes from earned income — the
            Compounding Crossover™. Starting from a balance of <strong>{money(p.balance)}</strong> with{' '}
            <strong>{money(p.contributions)}</strong> in annual contributions and a long-term return of{' '}
            <strong>{p.returnPct}%</strong>, the crossover is projected for{' '}
            <strong>{p.crossoverYear ?? 'a year beyond the modeled horizon'}</strong>
            {p.crossoverPortfolio ? (
              <>
                {' '}with a portfolio of <strong>{money(p.crossoverPortfolio)}</strong>
              </>
            ) : null}
            .
          </p>
          <p>
            Before the crossover, savings discipline drives wealth. After it, market compounding leads and
            the portfolio becomes self-propelling. At the end of the modeled horizon ({finalRow?.year}) the
            projection reaches <strong>{money(finalRow?.endBalance ?? p.balance)}</strong>.
          </p>
        </div>

        <div className="rpt-card tint">
          <H eyebrow="Inputs" title="Planning assumptions" />
          <table className="rpt">
            <tbody>
              <tr>
                <td>Starting invested balance</td>
                <td className="num">{money(p.balance)}</td>
              </tr>
              <tr>
                <td>Annual contributions (employee + employer)</td>
                <td className="num">{money(p.contributions)}</td>
              </tr>
              <tr>
                <td>Annual contribution growth (raises + deferral increases)</td>
                <td className="num">{p.contributionGrowthPct}%</td>
              </tr>
              <tr>
                <td>Debt-payment redirect beginning {p.debtRedirectStartYear}</td>
                <td className="num">{money(p.debtRedirectAnnual)}/yr</td>
              </tr>
              <tr>
                <td>Expected long-term return</td>
                <td className="num">{p.returnPct}%</td>
              </tr>
              <tr>
                <td>Years to double (Rule of 72)</td>
                <td className="num">{doubleYears.toFixed(1)} yrs</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="rpt-note">
          Projections are illustrative, assume steady returns and contributions, and are not a guarantee of
          future performance.
        </p>
      </Page>

      {/* ---------- Page 2 — Growth projection ---------- */}
      <Page n={2} total={TOTAL} label={p.label}>
        <H eyebrow="The projection" title="Portfolio growth by return scenario" />
        <div className="rpt-card">
          <LineChart
            width={620}
            height={280}
            data={p.chartData}
            margin={{ top: 8, right: 12, left: 8, bottom: 24 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="year" tick={{ fontSize: 9, fill: SUB }} interval={2} angle={-35} dy={10} height={40} />
            <YAxis tick={{ fontSize: 9, fill: SUB }} tickFormatter={(v) => moneyShort(Number(v))} width={56} />
            <Legend wrapperStyle={{ fontSize: 9 }} />
            {p.crossoverYear ? (
              <ReferenceLine x={p.crossoverYear} stroke={GOLD} strokeDasharray="4 4" label={{ value: 'Crossover', fontSize: 9, fill: GOLD, position: 'top' }} />
            ) : null}
            {SCENARIOS.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={`${s.returnPct}% · ${s.label}`}
                stroke={s.color}
                strokeWidth={s.returnPct === p.returnPct ? 2.5 : 1.5}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </div>

        <div className="rpt-card">
          <H eyebrow="Detail" title={`Projection at ${p.returnPct}% (every third year)`} />
          <table className="rpt">
            <thead>
              <tr>
                <th>Year</th>
                <th className="num">Start balance</th>
                <th className="num">Contributions</th>
                <th className="num">Investment growth</th>
                <th className="num">End balance</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.year}>
                  <td style={{ fontWeight: 600, color: r.crossed ? EMERALD : INK }}>
                    {r.year}
                    {r.crossed ? ' ✦' : ''}
                  </td>
                  <td className="num">{money(r.startBalance)}</td>
                  <td className="num">{money(r.contributions)}</td>
                  <td className="num" style={{ color: r.crossed ? EMERALD : INK }}>{money(r.growth)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>{money(r.endBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rpt-note" style={{ marginTop: 8 }}>
            ✦ marks years in which investment growth equals or exceeds contributions.
          </p>
        </div>
      </Page>

      {/* ---------- Page 3 — Rule of 72 ---------- */}
      <Page n={3} total={TOTAL} label={p.label}>
        <H eyebrow="The math" title="The Rule of 72 — how fast money doubles" />
        <div className="rpt-two">
          {SCENARIOS.map((s) => (
            <div className="rpt-card" key={s.key} style={{ borderColor: s.color }}>
              <div style={{ fontSize: '13pt', fontWeight: 800, color: s.color }}>{s.returnPct}% return</div>
              <div style={{ fontSize: '10pt', fontWeight: 600 }}>
                Doubles every {(72 / s.returnPct).toFixed(1)} years
              </div>
              <div className="rpt-note">72 ÷ {s.returnPct} = years to double · {s.label}</div>
            </div>
          ))}
          <div className="rpt-card tint">
            <div style={{ fontSize: '10pt', fontWeight: 700, color: NAVY }}>Why it matters</div>
            <div className="rpt-note">
              Each doubling is larger than every prior doubling combined. The final doublings — not the first
              — create most of the wealth.
            </div>
          </div>
        </div>

        <div className="rpt-card">
          <H eyebrow="Doubling schedule" title={`${p.label} @ ${p.returnPct}% — with and without contributions`} />
          <table className="rpt">
            <thead>
              <tr>
                <th>Doubling</th>
                <th className="num">Year (no contributions)</th>
                <th className="num">Balance</th>
                <th className="num">Year (with contributions)</th>
                <th className="num">Balance</th>
              </tr>
            </thead>
            <tbody>
              {doublings.map((d) => (
                <tr key={d.n}>
                  <td style={{ fontWeight: 600 }}>{['First', 'Second', 'Third'][d.n - 1]} double</td>
                  <td className="num">{d.withoutYear}</td>
                  <td className="num">{money(d.withoutBalance)}</td>
                  <td className="num" style={{ color: EMERALD, fontWeight: 600 }}>{d.withYear ?? '—'}</td>
                  <td className="num" style={{ color: EMERALD }}>{d.withBalance ? money(d.withBalance) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="rpt-note" style={{ marginTop: 8 }}>
            Without contributions, doubling depends on balance alone. With ongoing contributions each doubling
            arrives sooner and the balance at each milestone is larger — every dollar added starts its own
            doubling clock.
          </p>
        </div>

        <div className="rpt-card">
          <H eyebrow="Household" title="Crossover by owner" />
          <table className="rpt">
            <thead>
              <tr>
                <th>Owner</th>
                <th className="num">Balance today</th>
                <th className="num">Annual contributions</th>
                <th className="num">Crossover year</th>
              </tr>
            </thead>
            <tbody>
              {p.household.map((h) => (
                <tr key={h.key}>
                  <td style={{ fontWeight: 600 }}>{h.label}</td>
                  <td className="num">{money(h.balance)}</td>
                  <td className="num">{money(h.contributions)}</td>
                  <td className="num" style={{ fontWeight: 600, color: GOLD }}>{h.result.crossoverYear ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Page>

      {/* ---------- Page 4 — Scenarios, milestones, disclosure ---------- */}
      <Page n={4} total={TOTAL} label={p.label}>
        <H eyebrow="Comparison" title="Scenario outcomes" />
        <div className="rpt-card">
          <table className="rpt">
            <thead>
              <tr>
                <th>Scenario</th>
                <th className="num">Return</th>
                <th className="num">Crossover year</th>
                <th className="num">Ending balance</th>
              </tr>
            </thead>
            <tbody>
              {p.byScenario.map(({ scenario, result }) => (
                <tr key={scenario.key}>
                  <td style={{ fontWeight: 600, color: scenario.color }}>
                    {scenario.label}
                    {scenario.official ? ' (planning standard)' : ''}
                  </td>
                  <td className="num">{scenario.returnPct}%</td>
                  <td className="num">{result.crossoverYear ?? '—'}</td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {money(result.rows[result.rows.length - 1]?.endBalance ?? 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <H eyebrow="Timeline" title="Compounding milestones" />
        <div className="rpt-card">
          <table className="rpt">
            <thead>
              <tr>
                <th>Milestone</th>
                <th className="num">Portfolio</th>
                <th className="num">Projected year</th>
                <th>What it means</th>
              </tr>
            </thead>
            <tbody>
              {milestones.map((m) => (
                <tr key={m.label}>
                  <td style={{ fontWeight: 600 }}>{m.label}</td>
                  <td className="num">{money(m.amount)}</td>
                  <td className="num" style={{ color: GOLD, fontWeight: 600 }}>{m.year ?? '—'}</td>
                  <td className="rpt-note">{m.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rpt-card tint">
          <H eyebrow="Disclosure" title="Important information" />
          <p className="rpt-note">
            The Compounding Crossover™ projections in this report are educational illustrations generated
            from the assumptions listed on page 1. Actual results will vary with market performance,
            contribution changes, taxes, fees, and the timing of withdrawals. Returns are modeled as steady
            annual rates; real markets are volatile and sequence-of-returns risk can materially change
            outcomes. This document is not investment, tax, or legal advice and is not a guarantee of future
            performance.
          </p>
          <p className="rpt-note">
            Prepared by the Montgomery Family Wealth Operating System ·{' '}
            {today.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
      </Page>
    </div>
  );
}
