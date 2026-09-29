import type { ReactNode } from 'react';
import type { AssumptionState } from '@/lib/blueprint/model';
import { projectPortfolio, buildTimeline, milestoneHits } from '@/lib/blueprint/model';
import type { BlueprintState } from '@/lib/budgeting/moneyBlueprint';
import { computeBlueprint } from '@/lib/budgeting/moneyBlueprint';

const NAVY = '#0f2a44';
const TEAL = '#0d9488';
const ORANGE = '#f97316';
const BUCKET_COLORS = ['#0f2a44', '#0d9488', '#f59e0b', '#f97316'];

const $ = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const $k = (n: number) => (Math.abs(n) >= 1e6 ? `$${(n / 1e6).toFixed(2)}M` : `$${Math.round(n / 1000)}k`);

function Page({ n, title, kicker, story, children }: { n: number; title: string; kicker: string; story: string; children: ReactNode }) {
  return (
    <section className="bp-page">
      <div className="bp-band">
        <div>
          <div className="bp-kicker">Chapter {n} · {kicker}</div>
          <div className="bp-title">{title}</div>
        </div>
        <div className="bp-brand">Montgomery Money Blueprint™</div>
      </div>
      <p className="bp-story">{story}</p>
      {children}
      <div className="bp-foot">Page {n + 1} · Figures from saved Blueprint assumptions · Projections are estimates, not guarantees</div>
    </section>
  );
}

function Kpi({ label, value, tone = NAVY, sub }: { label: string; value: string; tone?: string; sub?: string }) {
  return (
    <div className="bp-kpi" style={{ borderTopColor: tone }}>
      <div className="bp-kpi-l">{label}</div>
      <div className="bp-kpi-v" style={{ color: tone }}>{value}</div>
      {sub && <div className="bp-kpi-s">{sub}</div>}
    </div>
  );
}

function LineChart({ series, height = 190 }: { series: { label: string; color: string; points: { x: number; y: number }[] }[]; height?: number }) {
  const W = 680, H = height, P = 40;
  const all = series.flatMap((s) => s.points);
  if (!all.length) return null;
  const xs = all.map((p) => p.x), ys = all.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y1 = Math.max(...ys, 1);
  const sx = (x: number) => P + ((x - x0) / Math.max(1, x1 - x0)) * (W - P - 10);
  const sy = (y: number) => H - 22 - (y / y1) * (H - 34);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * y1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: 'block' }}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P} x2={W - 10} y1={sy(t)} y2={sy(t)} stroke="#e2e8f0" />
          <text x={P - 4} y={sy(t) + 3} fontSize="9" textAnchor="end" fill="#475569">{$k(t)}</text>
        </g>
      ))}
      {[x0, Math.round((x0 + x1) / 2), x1].map((x) => (
        <text key={x} x={sx(x)} y={H - 6} fontSize="9" textAnchor="middle" fill="#475569">Age {x}</text>
      ))}
      {series.map((s) => (
        <polyline key={s.label} fill="none" stroke={s.color} strokeWidth="2.5"
          points={s.points.map((p) => `${sx(p.x)},${sy(p.y)}`).join(' ')} />
      ))}
      {series.map((s, i) => (
        <g key={s.label + 'l'} transform={`translate(${P + 8 + i * 170},10)`}>
          <rect width="10" height="10" fill={s.color} rx="2" />
          <text x="14" y="9" fontSize="10" fill="#0f172a">{s.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Bars({ items }: { items: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div className="bp-bars">
      {items.map((i) => (
        <div key={i.label} className="bp-bar-row">
          <div className="bp-bar-l">{i.label}</div>
          <div className="bp-bar-t"><div style={{ width: `${(i.value / max) * 100}%`, background: i.color }} /></div>
          <div className="bp-bar-v">{$(i.value)}</div>
        </div>
      ))}
    </div>
  );
}

export function BlueprintPrintReport({ state, plan }: { state: AssumptionState; plan?: BlueprintState }) {
  const bp = plan ? computeBlueprint(plan) : null;
  const net = plan?.income.netMonthly ?? 0;
  const bs = plan?.balanceSheet;
  const timeline = buildTimeline(state);
  const primary = projectPortfolio(state, state.primaryReturnPct);
  const stretch = projectPortfolio(state, state.stretchReturnPct);
  const hits = milestoneHits(state, state.primaryReturnPct);
  const at = (age: number) => primary.find((p) => p.age === age)?.balance ?? 0;
  const debts = [...state.debts].sort((a, b) => (a.payoffDate || '').localeCompare(b.payoffDate || ''));
  const totalDebt = debts.reduce((s, d) => s + (d.balance || 0), 0);
  const freed = debts.reduce((s, d) => s + (d.releasedCashFlow ?? d.requiredPayment + d.extraPayment), 0);
  const firstYear = timeline[0];
  const legacyRows = timeline.filter((r) => r.age >= 70 && r.age <= 85 && r.age % 3 === 1);

  return (
    <div className="bp-report">
      <style>{`
        .bp-report { display: none; }
        @media print {
          @page { size: letter; margin: 0.55in 0.6in; }
          html, body { width: auto !important; margin: 0 !important; padding: 0 !important; }
          .blueprint-print, .blueprint-print * { max-width: none !important; }
          .blueprint-print { padding: 0 !important; margin: 0 !important; width: 100% !important; }
          .blueprint-print > *:not(.bp-report) { display: none !important; }
          .bp-report { display: block !important; font-family: Georgia, 'Times New Roman', serif; width: 100% !important; }
          .bp-report * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .bp-page { page-break-after: always; break-after: page; padding: 0; min-height: 9.6in; display: flex; flex-direction: column; }
          .bp-page > .bp-foot { margin-top: auto; }
          .bp-page:last-child { page-break-after: auto; }
          .bp-band { display:flex; justify-content:space-between; align-items:flex-end; background:${NAVY} !important; padding:12px 16px; border-bottom:4px solid ${ORANGE}; border-radius:8px; }
          .bp-band * { color:#fff !important; }
          .bp-kicker { font: 600 9px/1 system-ui, sans-serif; letter-spacing:.14em; text-transform:uppercase; opacity:.85; }
          .bp-title { font-size:20px; font-weight:700; margin-top:4px; }
          .bp-brand { font: 500 9px system-ui, sans-serif; opacity:.8; }
          .bp-story { font-size:11.5px; line-height:1.5; color:#1e293b !important; margin:10px 2px 10px; border-left:3px solid ${TEAL}; padding-left:10px; }
          .bp-h { font: 700 11px system-ui, sans-serif; color:${TEAL} !important; text-transform:uppercase; letter-spacing:.08em; margin:12px 0 5px; }
          .bp-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; }
          .bp-grid3 { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
          .bp-kpi { background:#f1f5f9 !important; border-top:3px solid; border-radius:6px; padding:7px 9px; }
          .bp-kpi-l { font: 600 8.5px system-ui, sans-serif; text-transform:uppercase; color:#475569 !important; letter-spacing:.06em; }
          .bp-kpi-v { font: 700 16px system-ui, sans-serif; margin-top:2px; }
          .bp-kpi-s { font: 400 8.5px system-ui, sans-serif; color:#64748b !important; }
          .bp-box { background:#f8fafc !important; border:1px solid #cbd5e1; border-radius:6px; padding:8px 10px; }
          .bp-report table { width:100%; border-collapse:collapse; font: 10px system-ui, sans-serif; }
          .bp-report thead tr { background:${TEAL} !important; }
          .bp-report th { color:#fff !important; text-align:left; padding:4px 6px; font-weight:600; }
          .bp-report td { padding:3.5px 6px; border-bottom:1px solid #e2e8f0; color:#0f172a !important; }
          .bp-report tbody tr:nth-child(even) { background:#ecfdf5 !important; }
          .bp-report .r { text-align:right; font-variant-numeric: tabular-nums; }
          .bp-stack { display:flex; height:22px; border-radius:5px; overflow:hidden; }
          .bp-stack div { display:flex; align-items:center; justify-content:center; font: 700 9px system-ui, sans-serif; color:#fff !important; }
          .bp-bars { display:flex; flex-direction:column; gap:4px; font: 10px system-ui, sans-serif; }
          .bp-bar-row { display:grid; grid-template-columns:150px 1fr 80px; gap:8px; align-items:center; }
          .bp-bar-t { background:#e2e8f0 !important; height:10px; border-radius:5px; overflow:hidden; }
          .bp-bar-t div { height:100%; }
          .bp-bar-v { text-align:right; font-weight:600; }
          .bp-foot { margin-top:12px; padding-top:5px; border-top:1px solid #cbd5e1; font: 8.5px system-ui, sans-serif; color:#64748b !important; }
          .bp-cover { background: linear-gradient(135deg, ${NAVY}, ${TEAL}) !important; border-radius:10px; padding:40px 30px; border-bottom:6px solid ${ORANGE}; margin-bottom:14px; }
          .bp-cover * { color:#fff !important; }
        }
      `}</style>

      {/* Cover + At a glance */}
      <section className="bp-page">
        <div className="bp-cover">
          <div style={{ font: '600 10px system-ui', letterSpacing: '.2em', textTransform: 'uppercase' }}>Household Wealth Report</div>
          <div style={{ fontSize: 30, fontWeight: 700, marginTop: 6 }}>The Montgomery Money Blueprint™</div>
          <div style={{ fontSize: 13, marginTop: 8 }}>Lyman (age {state.currentAge}) &amp; Kateri (age {state.spouseCurrentAge}) · As of {state.asOf}</div>
        </div>
        <p className="bp-story">
          This report follows your money from this month's paycheck to the finish line. Each chapter answers one question:
          where the money goes today, how debt becomes wealth, how the portfolio grows, how the household is protected,
          and what retirement and legacy look like from age 70 to 85.
        </p>
        <div className="bp-h">At a glance</div>
        <div className="bp-grid">
          <Kpi label="Monthly take-home" value={$(net)} tone={NAVY} />
          <Kpi label="Freedom spending" value={$(bp?.freedomTotal ?? 0)} tone={TEAL} sub="left after the plan" />
          <Kpi label="Net worth" value={$(bp?.netWorth ?? 0)} tone={ORANGE} />
          <Kpi label="Portfolio" value={$(state.portfolioBalance)} tone={NAVY} sub="Lyman" />
        </div>
        <div className="bp-h">Portfolio at key ages ({state.primaryReturnPct}% return)</div>
        <div className="bp-grid">
          {[65, 70, 75, 85].map((a, i) => <Kpi key={a} label={`Age ${a}`} value={$k(at(a))} tone={BUCKET_COLORS[i]} />)}
        </div>
        <div className="bp-h">The roadmap</div>
        <table>
          <thead><tr><th>Chapter</th><th>Question it answers</th></tr></thead>
          <tbody>
            <tr><td>1 · Where the money goes</td><td>Is each paycheck working to plan?</td></tr>
            <tr><td>2 · Debt freedom</td><td>When is each debt gone, and where does the freed cash go?</td></tr>
            <tr><td>3 · Growth</td><td>How big does the portfolio get, and when are milestones reached?</td></tr>
            <tr><td>4 · Protection</td><td>Is the household protected against shocks and care costs?</td></tr>
            <tr><td>5 · Retirement &amp; legacy</td><td>What does income look like from 70 to 85?</td></tr>
          </tbody>
        </table>
        <div className="bp-foot">Page 1 · Prepared from saved Blueprint assumptions</div>
      </section>

      <Page n={1} kicker="Today" title="Where the money goes"
        story={`Each month ${$(net)} comes in. The Blueprint gives every dollar a job in four groups: Foundation Costs cover the basics, Wealth Engine invests, Future Fund saves for goals, and Freedom Spending is guilt-free money.`}>
        {bp && (
          <>
            <div className="bp-stack">
              {bp.buckets.map((b, i) => (
                <div key={b.key} style={{ width: `${Math.max(b.pct, 4)}%`, background: BUCKET_COLORS[i] }}>{Math.round(b.pct)}%</div>
              ))}
            </div>
            <div className="bp-h">The four groups vs. their targets</div>
            <table>
              <thead><tr><th>Group</th><th className="r">Monthly</th><th className="r">Share</th><th className="r">Target</th><th>Status</th></tr></thead>
              <tbody>
                {bp.buckets.map((b) => (
                  <tr key={b.key}>
                    <td>{b.label}</td><td className="r">{$(b.total)}</td><td className="r">{b.pct.toFixed(1)}%</td>
                    <td className="r">{b.min}–{b.max}%</td>
                    <td style={{ color: b.status === 'in' ? '#047857' : '#c2410c', fontWeight: 600 }}>{b.status === 'in' ? 'On target' : b.status === 'over' ? 'Above' : 'Below'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="bp-h">Largest Foundation costs</div>
            <Bars items={[...(plan?.buckets.foundation ?? [])].sort((a, b) => b.amount - a.amount).slice(0, 8)
              .map((r, i) => ({ label: r.label.split('(')[0].trim(), value: r.amount, color: i % 2 ? TEAL : NAVY }))} />
            <p className="bp-story" style={{ marginTop: 10 }}>Savings rate: <b>{bp.savingsRatePct.toFixed(1)}%</b> of take-home goes to the Wealth Engine and Future Fund.</p>
          </>
        )}
      </Page>

      <Page n={2} kicker="Today → Tomorrow" title="Debt freedom"
        story={`${$(totalDebt)} of debt remains across ${debts.length} accounts. As each one is paid off, its payment is redirected into wealth building, releasing about ${$(freed)} a month in total.`}>
        <div className="bp-grid3">
          <Kpi label="Debt remaining" value={$(totalDebt)} tone="#b91c1c" />
          <Kpi label="Cash freed when done" value={`${$(freed)}/mo`} tone={TEAL} />
          <Kpi label="Last payoff" value={debts[debts.length - 1]?.payoffDate || '—'} tone={NAVY} />
        </div>
        <div className="bp-h">Payoff timeline</div>
        <table>
          <thead><tr><th>Debt</th><th className="r">Balance</th><th className="r">Rate</th><th className="r">Payment</th><th>Paid off</th><th className="r">Freed / mo</th></tr></thead>
          <tbody>
            {debts.map((d) => (
              <tr key={d.key}>
                <td>{d.label}</td><td className="r">{$(d.balance)}</td><td className="r">{d.ratePct}%</td>
                <td className="r">{$(d.requiredPayment + d.extraPayment)}</td><td>{d.actualPayoffDate ? `${d.actualPayoffDate} ✓` : d.payoffDate || '—'}</td>
                <td className="r">{$(d.releasedCashFlow ?? d.requiredPayment + d.extraPayment)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="bp-h">Balances by debt</div>
        <Bars items={debts.filter((d) => d.balance > 0).map((d, i) => ({ label: d.label, value: d.balance, color: i % 2 ? ORANGE : '#b91c1c' }))} />
      </Page>

      <Page n={3} kicker="Tomorrow" title="Growth & investing"
        story={`Starting from ${$(state.portfolioBalance)}, contributions of about ${$(firstYear?.totalMonthly ?? 0)} a month plus compounding grow the portfolio. The chart compares the ${state.primaryReturnPct}% plan with a ${state.stretchReturnPct}% stretch case.`}>
        <div className="bp-box">
          <LineChart series={[
            { label: `Plan ${state.primaryReturnPct}%`, color: TEAL, points: primary.map((p) => ({ x: p.age, y: p.balance })) },
            { label: `Stretch ${state.stretchReturnPct}%`, color: ORANGE, points: stretch.map((p) => ({ x: p.age, y: p.balance })) },
            { label: 'Money put in', color: NAVY, points: primary.map((p) => ({ x: p.age, y: p.contributions })) },
          ]} />
        </div>
        <div className="bp-h">Milestones</div>
        <table>
          <thead><tr><th>Milestone</th><th>Reached</th><th className="r">Age</th><th className="r">From contributions</th><th className="r">From growth</th></tr></thead>
          <tbody>
            {hits.map((h) => (
              <tr key={h.amount}><td>{$k(h.amount)}</td><td>{h.year ?? 'Not reached'}</td><td className="r">{h.age ?? '—'}</td>
                <td className="r">{$(h.contributionsAtHit)}</td><td className="r">{$(h.growthAtHit)}</td></tr>
            ))}
          </tbody>
        </table>
        {firstYear && (
          <>
            <div className="bp-h">This year's monthly contributions</div>
            <Bars items={[
              { label: 'Your contribution', value: firstYear.employeeMonthly, color: NAVY },
              { label: 'Employer contribution', value: firstYear.employerMonthly, color: TEAL },
              { label: 'Voluntary', value: firstYear.voluntaryMonthly, color: '#f59e0b' },
              { label: 'Freed debt cash', value: firstYear.debtRedirectMonthly, color: ORANGE },
              { label: 'Budget surplus', value: firstYear.budgetSurplusMonthly, color: '#64748b' },
            ]} />
          </>
        )}
      </Page>

      <Page n={4} kicker="Defense" title="Net worth & protection"
        story="A plan is only as strong as its defenses. This chapter shows what the household owns and owes, how much cash is on hand, and how health and long-term care costs are covered.">
        <div className="bp-grid">
          <Kpi label="Assets" value={$(bs?.assets ?? 0)} tone={NAVY} />
          <Kpi label="Investments" value={$(bs?.investments ?? 0)} tone={TEAL} />
          <Kpi label="Cash savings" value={$(bs?.savings ?? 0)} tone="#f59e0b" sub="Emergency target $7,000" />
          <Kpi label="Debt" value={$(bs?.debt ?? 0)} tone="#b91c1c" />
        </div>
        <div className="bp-h">Balance sheet</div>
        <Bars items={[
          { label: 'Assets', value: bs?.assets ?? 0, color: NAVY },
          { label: 'Investments', value: bs?.investments ?? 0, color: TEAL },
          { label: 'Savings', value: bs?.savings ?? 0, color: '#f59e0b' },
          { label: 'Debt', value: bs?.debt ?? 0, color: '#b91c1c' },
        ]} />
        <div className="bp-h">Emergency fund progress</div>
        <div className="bp-bar-t" style={{ height: 14 }}>
          <div style={{ width: `${Math.min(100, ((bs?.savings ?? 0) / 7000) * 100)}%`, background: TEAL }} />
        </div>
        <div className="bp-h">Long-term care quotes</div>
        <table>
          <thead><tr><th>Quote</th><th className="r">Monthly premium</th><th className="r">Annual premium</th><th className="r">Monthly benefit</th></tr></thead>
          <tbody>
            {state.ltcQuotes.length ? state.ltcQuotes.map((q: any, i) => (
              <tr key={i}><td>{q.carrier ?? q.label ?? `Quote ${i + 1}`}</td><td className="r">{$(q.monthlyPremium)}</td>
                <td className="r">{$(q.monthlyPremium * 12)}</td><td className="r">{$(q.startingMonthlyBenefit)}</td></tr>
            )) : <tr><td colSpan={4}>No quotes saved yet</td></tr>}
          </tbody>
        </table>
      </Page>

      <Page n={5} kicker="The finish line" title="Retirement & legacy"
        story={`From age ${state.legacyWindowStartAge}, Social Security (from ${state.socialSecurityStartAge}) and Kateri's pension add to portfolio withdrawals. Required minimum distributions begin at ${state.rmdAge}. Pension and Social Security are income, never counted as net worth.`}>
        <div className="bp-grid">
          <Kpi label="Portfolio at 70" value={$k(at(70))} tone={TEAL} />
          <Kpi label="Portfolio at 85" value={$k(at(85))} tone={NAVY} />
          <Kpi label="Social Security" value={`${$(state.socialSecurityMonthly)}/mo`} tone="#f59e0b" sub={`from age ${state.socialSecurityStartAge}`} />
          <Kpi label="Roth conversion" value={`${$(state.rothConversionAnnual)}/yr`} tone={ORANGE} />
        </div>
        <div className="bp-h">Household income, ages 70–85</div>
        <table>
          <thead><tr><th className="r">Age</th><th className="r">Year</th><th className="r">Social Security</th><th className="r">Pension</th><th className="r">Other</th><th className="r">Total / mo</th><th className="r">Portfolio</th></tr></thead>
          <tbody>
            {legacyRows.map((r) => (
              <tr key={r.year}><td className="r">{r.age}</td><td className="r">{r.year}</td><td className="r">{$(r.socialSecurityMonthly)}</td>
                <td className="r">{$(r.pensionMonthly)}</td><td className="r">{$(r.otherIncomeMonthly)}</td>
                <td className="r"><b>{$(r.householdIncomeMonthly)}</b></td><td className="r">{$k(at(r.age))}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="bp-h">The story in one sentence</div>
        <p className="bp-story">
          Today's {$(net)} monthly plan, the {$(freed)}/mo freed from debt, and steady contributions carry the portfolio from{' '}
          {$(state.portfolioBalance)} to about {$k(at(70))} by age 70, with guaranteed income layered on top for the legacy years.
        </p>
      </Page>
    </div>
  );
}
