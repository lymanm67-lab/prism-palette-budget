import { useMemo, useState, useEffect } from 'react';
import { LegacyStepNav } from '@/components/legacy/LegacyStepNav';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, LineChart, Line, ReferenceLine, Cell,
} from 'recharts';
import {
  DEFAULT_INPUTS, EngineInputs, runEngine, milestones, crossover, ruleOf72, SCENARIOS,
} from '@/lib/retirement/preservationEngine';

const NAVY = '#0B2341';
const GOLD = '#C9A227';
const GREEN = '#1F7A5A';
const SLATE = '#64748B';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const compact = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

const STORAGE_KEY = 'retirement-preservation-v1';

function Kpi({ label, value, sub, tone = 'navy' }: { label: string; value: string; sub?: string; tone?: 'navy' | 'gold' | 'green' }) {
  const bg = tone === 'gold' ? GOLD : tone === 'green' ? GREEN : NAVY;
  return (
    <div className="rounded-xl p-4 text-white shadow-sm" style={{ background: bg }}>
      <div className="text-[11px] uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] mt-1 opacity-80">{sub}</div>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-5 md:p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold" style={{ color: NAVY }}>{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function NumField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 mt-1">
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

export default function RetirementPreservation() {
  const [inputs, setInputs] = useState<EngineInputs>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_INPUTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }
    return { ...DEFAULT_INPUTS, lymanBalance: 175346 };
  });
  const [showInputs, setShowInputs] = useState(false);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs)); } catch { /* ignore */ }
  }, [inputs]);

  const set = (k: keyof EngineInputs) => (v: number) => setInputs((s) => ({ ...s, [k]: v }));

  const rows = useMemo(() => runEngine(inputs), [inputs]);
  const scenarioRows = useMemo(
    () => SCENARIOS.map((s) => ({ ...s, rows: runEngine({ ...inputs, returnRate: s.rate }) })),
    [inputs],
  );
  const ms = useMemo(() => milestones(rows, inputs), [rows, inputs]);
  const cross = useMemo(() => crossover(rows, inputs.returnRate), [rows, inputs.returnRate]);
  const r72 = useMemo(() => ruleOf72(rows[0].householdAssets, inputs.returnRate), [rows, inputs.returnRate]);

  const now = rows[0];
  const next = rows[1] ?? rows[0];
  const atRetire = rows.find((r) => r.lymanAge === inputs.lymanRetireAge) ?? rows[rows.length - 1];

  const chartData = rows.map((r) => ({
    year: r.year,
    age: r.lymanAge,
    Lyman: Math.round(r.lymanBalance),
    'Kateri DC': Math.round(r.kateriDc),
    'Kateri OPERS': Math.round(r.kateriOpers),
    phase: r.phase,
  }));

  const scenarioChart = scenarioRows[0].rows.map((_, idx) => {
    const point: Record<string, number> = { year: scenarioRows[0].rows[idx].year, age: scenarioRows[0].rows[idx].lymanAge };
    scenarioRows.forEach((s) => { point[`${s.rate * 100}%`] = Math.round(s.rows[idx].householdAssets); });
    return point;
  });

  const waterfall = rows.slice(1, 17).map((r) => ({
    year: r.year,
    Contributions: Math.round(r.contributions),
    Growth: Math.round(r.growth),
  }));

  const kateriRetireYear = rows.find((r) => r.kateriAge === inputs.kateriRetireAge)?.year;
  const lymanRetireYear = rows.find((r) => r.lymanAge === inputs.lymanRetireAge)?.year;

  const pyramid = [
    { layer: 'Layer 1', title: 'Social Security', detail: `${money(inputs.socialSecurityMonthly)}/mo · ${money(inputs.socialSecurityMonthly * 12)}/yr`, w: 100, color: NAVY },
    { layer: 'Layer 2', title: 'Kateri OPERS Pension', detail: `${money(inputs.kateriPensionMonthly)}/mo · ${money(inputs.kateriPensionMonthly * 12)}/yr`, w: 84, color: GOLD },
    { layer: 'Layer 3', title: 'Investment Growth', detail: 'Compounding continues — untouched', w: 68, color: GREEN },
    { layer: 'Layer 4', title: 'Retirement Account Withdrawals', detail: 'Only if needed — 0% initial rate', w: 52, color: SLATE },
    { layer: 'Layer 5', title: 'Legacy Assets Reserved for Heirs', detail: 'Multi-generational wealth transfer', w: 36, color: '#7C3AED' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <header className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, #123A6B)` }}>
        <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Montgomery Family Wealth Operating System</div>
        <h1 className="text-2xl md:text-3xl font-semibold mt-1">Retirement Preservation &amp; Legacy Growth Engine™</h1>
        <p className="text-sm opacity-80 mt-2 max-w-3xl">
          Multi-phase household retirement strategy — accumulation, transition, and portfolio preservation.
        </p>
        <div className="mt-4 inline-flex items-center rounded-full px-4 py-1.5 text-xs font-medium" style={{ background: GOLD, color: NAVY }}>
          Retirement Strategy: Social Security First • Portfolio Preservation Second
        </div>
      </header>

      <HealthHorizonBanner />


      {/* Assumption controls */}
      <Section title="Planning Assumptions" subtitle="Every projection below recalculates instantly when these change.">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {SCENARIOS.map((s) => (
            <button
              key={s.rate}
              onClick={() => setInputs((p) => ({ ...p, returnRate: s.rate }))}
              className="rounded-full px-4 py-1.5 text-xs font-medium border transition"
              style={inputs.returnRate === s.rate
                ? { background: s.color, color: '#fff', borderColor: s.color }
                : { color: s.color, borderColor: s.color }}
            >
              {(s.rate * 100).toFixed(0)}% {s.label}
            </button>
          ))}
          <button onClick={() => setShowInputs((v) => !v)} className="ml-auto text-xs underline text-muted-foreground">
            {showInputs ? 'Hide' : 'Edit'} household inputs
          </button>
        </div>
        {showInputs && (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border-t pt-4">
            <NumField label="Lyman Age" value={inputs.lymanAge} onChange={set('lymanAge')} />
            <NumField label="Lyman Retirement Age" value={inputs.lymanRetireAge} onChange={set('lymanRetireAge')} />
            <NumField label="Lyman Salary" value={inputs.lymanSalary} onChange={set('lymanSalary')} step={500} />
            <NumField label="Lyman Retirement Balance" value={inputs.lymanBalance} onChange={set('lymanBalance')} step={500} />
            <NumField label="Employee Deferral %" value={inputs.lymanEmployeePct * 100} onChange={(v) => set('lymanEmployeePct')(v / 100)} step={0.5} suffix="%" />
            <NumField label="Employer Contribution %" value={inputs.lymanEmployerPct * 100} onChange={(v) => set('lymanEmployerPct')(v / 100)} step={0.5} suffix="%" />
            <NumField label="Annual Salary Increase %" value={inputs.salaryRaise * 100} onChange={(v) => set('salaryRaise')(v / 100)} step={0.25} suffix="%" />
            <NumField label="Debt Redirect $/mo" value={inputs.debtRedirectMonthly} onChange={set('debtRedirectMonthly')} step={10} />
            <NumField label="Marketing Redirect $/mo (net)" value={inputs.marketingRedirectMonthly} onChange={set('marketingRedirectMonthly')} step={10} />
            <NumField label="Kateri Age" value={inputs.kateriAge} onChange={set('kateriAge')} />
            <NumField label="Kateri Retirement Age" value={inputs.kateriRetireAge} onChange={set('kateriRetireAge')} />
            <NumField label="Kateri Salary" value={inputs.kateriSalary} onChange={set('kateriSalary')} step={500} />
            <NumField label="Kateri OPERS Balance" value={inputs.kateriOpers} onChange={set('kateriOpers')} step={100} />
            <NumField label="Kateri Deferred Comp" value={inputs.kateriDeferredComp} onChange={set('kateriDeferredComp')} step={100} />
            <NumField label="Kateri DC $/mo" value={inputs.kateriDcMonthly} onChange={set('kateriDcMonthly')} step={25} />
            <NumField label="OPERS Pension $/mo" value={inputs.kateriPensionMonthly} onChange={set('kateriPensionMonthly')} step={50} />
            <NumField label="Social Security $/mo" value={inputs.socialSecurityMonthly} onChange={set('socialSecurityMonthly')} step={50} />
          </div>
        )}
      </Section>

      {/* Household retirement engine */}
      <Section title="Household Retirement Engine" subtitle="Individual balances, combined capital, and annual household funding.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Kpi label="Lyman Retirement Account" value={money(now.lymanBalance)} tone="navy" />
          <Kpi label="Kateri OPERS" value={money(inputs.kateriOpers)} tone="gold" />
          <Kpi label="Kateri Deferred Comp" value={money(inputs.kateriDeferredComp)} tone="gold" />
          <Kpi label="Combined Household Capital" value={money(now.householdAssets)} tone="green" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3 mt-3">
          <Kpi label="Annual Household Contributions" value={money(next.contributions)} sub="Employee + employer + redirects + DC" tone="navy" />
          <Kpi label="Estimated Annual Growth" value={money(now.householdAssets * inputs.returnRate)} sub={`at ${pct(inputs.returnRate)}`} tone="green" />
          <Kpi
            label="Household Readiness Score"
            value={`${Math.round(Math.min(100, (atRetire.householdAssets / 2_000_000) * 100))}/100`}
            sub={`Projected ${compact(atRetire.householdAssets)} at Lyman age ${inputs.lymanRetireAge}`}
            tone="gold"
          />
        </div>
      </Section>

      {/* Three-phase model */}
      <Section title="Three-Phase Retirement Model" subtitle="The engine switches phases automatically as each spouse retires.">
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            {
              n: 'Phase One', t: 'Wealth Accumulation',
              range: `${rows[0].year} – ${kateriRetireYear ?? '—'}`,
              color: NAVY,
              bullets: ['Employee contributions', 'Employer 9% contributions', '3% annual salary growth', 'Debt redirects', 'Marketing redirect', 'Deferred compensation', 'Compound growth'],
              badge: 'Both Spouses Accumulating',
            },
            {
              n: 'Phase Two', t: 'Household Transition',
              range: `${kateriRetireYear ?? '—'} – ${lymanRetireYear ?? '—'}`,
              color: GOLD,
              bullets: ["Kateri's contributions stop", 'OPERS pension begins', 'DC stays invested', 'Lyman keeps working', 'Employer contributions continue', 'Debt redirects continue', 'Salary growth continues'],
              badge: 'One Spouse Retired • One Spouse Accumulating Wealth',
            },
            {
              n: 'Phase Three', t: 'Retirement Preservation',
              range: `${lymanRetireYear ?? '—'} – ${rows[rows.length - 1].year}`,
              color: GREEN,
              bullets: ['Employment income ends', 'Employee contributions stop', 'Employer contributions stop', 'Social Security begins', 'Portfolio remains fully invested', 'Growth continues through 80 & 85'],
              badge: 'Portfolio Withdrawal Rate: 0% (Initial Strategy)',
            },
          ].map((p) => (
            <div key={p.n} className="rounded-xl border overflow-hidden">
              <div className="p-4 text-white" style={{ background: p.color }}>
                <div className="text-[11px] uppercase tracking-wider opacity-80">{p.n}</div>
                <div className="text-lg font-semibold">{p.t}</div>
                <div className="text-xs opacity-80 mt-0.5">{p.range}</div>
              </div>
              <ul className="p-4 space-y-1.5 text-sm">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-2"><span style={{ color: p.color }}>•</span><span>{b}</span></li>
                ))}
              </ul>
              <div className="px-4 pb-4">
                <div className="rounded-lg px-3 py-2 text-[11px] font-medium" style={{ background: `${p.color}15`, color: p.color }}>
                  {p.badge}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Growth curve */}
      <Section title="Household Wealth Timeline" subtitle={`Stacked retirement capital at ${pct(inputs.returnRate)} — phase transitions marked.`}>
        <div style={{ height: 320 }}>
          <ResponsiveContainer>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => compact(Number(v))} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="Lyman" stackId="1" stroke={NAVY} fill={NAVY} fillOpacity={0.85} />
              <Area type="monotone" dataKey="Kateri OPERS" stackId="1" stroke={GOLD} fill={GOLD} fillOpacity={0.8} />
              <Area type="monotone" dataKey="Kateri DC" stackId="1" stroke={GREEN} fill={GREEN} fillOpacity={0.8} />
              {kateriRetireYear && <ReferenceLine x={kateriRetireYear} stroke={GOLD} strokeDasharray="4 4" label={{ value: 'Kateri 62', fontSize: 10, fill: GOLD }} />}
              {lymanRetireYear && <ReferenceLine x={lymanRetireYear} stroke={GREEN} strokeDasharray="4 4" label={{ value: 'Lyman 75', fontSize: 10, fill: GREEN }} />}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Social Security Bridge */}
      <Section title="Social Security Bridge Strategy™" subtitle="Guaranteed income first — the portfolio keeps compounding.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="Estimated Monthly Social Security" value={money(inputs.socialSecurityMonthly)} tone="navy" />
          <Kpi label="Estimated Annual Social Security" value={money(inputs.socialSecurityMonthly * 12)} tone="navy" />
          <Kpi label="Primary Retirement Income Source" value="Social Security" tone="gold" />
          <Kpi label="Retirement Portfolio" value="Preserved" tone="green" />
          <Kpi label="Initial Withdrawal Rate" value="0%" tone="green" />
          <Kpi label="Portfolio Status" value="Continuing to Compound" tone="gold" />
        </div>
        <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
          The Montgomery retirement strategy intentionally delays retirement account withdrawals. Social Security serves as the
          first layer of retirement income while investment assets remain invested, allowing continued tax-deferred compounding
          and increasing flexibility for future healthcare expenses, legacy planning, and family wealth transfer.
        </p>
      </Section>

      {/* Contribution engine */}
      <Section title="Contribution Engine" subtitle="Every dollar flowing into retirement, and when it starts.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <th className="py-2 pr-3">Source</th><th className="py-2 pr-3">Mechanics</th><th className="py-2 pr-3 text-right">Annual (Year 1)</th><th className="py-2 text-right">Ends</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr><td className="py-2 pr-3 font-medium">Employee Contributions</td><td className="py-2 pr-3 text-muted-foreground">{pct(inputs.lymanEmployeePct)} of salary</td><td className="py-2 pr-3 text-right">{money(inputs.lymanSalary * inputs.lymanEmployeePct)}</td><td className="py-2 text-right">Age {inputs.lymanRetireAge}</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Employer Contributions</td><td className="py-2 pr-3 text-muted-foreground">{pct(inputs.lymanEmployerPct)} of salary, grows with raises</td><td className="py-2 pr-3 text-right">{money(inputs.lymanSalary * inputs.lymanEmployerPct)}</td><td className="py-2 text-right">Age {inputs.lymanRetireAge}</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Salary Growth</td><td className="py-2 pr-3 text-muted-foreground">{pct(inputs.salaryRaise)} annually</td><td className="py-2 pr-3 text-right">{money(inputs.lymanSalary * inputs.salaryRaise)}</td><td className="py-2 text-right">Age {inputs.lymanRetireAge}</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Marketing &amp; Education Redirect</td><td className="py-2 pr-3 text-muted-foreground">$500 − $390 student loan = $110/mo · begins Jan 2027</td><td className="py-2 pr-3 text-right">{money(inputs.marketingRedirectMonthly * 12)}</td><td className="py-2 text-right">Age {inputs.lymanRetireAge}</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Debt Freedom Redirect</td><td className="py-2 pr-3 text-muted-foreground">${inputs.debtRedirectMonthly}/mo after payoff · begins Sept 2027</td><td className="py-2 pr-3 text-right">{money(inputs.debtRedirectMonthly * 12)}</td><td className="py-2 text-right">Age {inputs.lymanRetireAge}</td></tr>
              <tr><td className="py-2 pr-3 font-medium">Kateri Deferred Compensation</td><td className="py-2 pr-3 text-muted-foreground">${inputs.kateriDcMonthly}/mo</td><td className="py-2 pr-3 text-right">{money(inputs.kateriDcMonthly * 12)}</td><td className="py-2 text-right">Age {inputs.kateriRetireAge}</td></tr>
            </tbody>
          </table>
        </div>
        <div className="mt-5" style={{ height: 260 }}>
          <ResponsiveContainer>
            <BarChart data={waterfall} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => compact(Number(v))} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Contributions" stackId="a" fill={NAVY} />
              <Bar dataKey="Growth" stackId="a" fill={GOLD} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Crossover */}
      <Section title="Compounding Crossover™" subtitle="Annual household contributions ÷ selected investment return.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi label="Current Household Contributions" value={money(cross.annualContrib)} tone="navy" />
          <Kpi label="Estimated Annual Investment Growth" value={money(cross.growth)} tone="green" />
          <Kpi label="Current Household Retirement Capital" value={money(cross.capital)} tone="navy" />
          <Kpi label="Estimated Crossover Portfolio" value={money(cross.target)} sub={`${money(cross.annualContrib)} ÷ ${pct(inputs.returnRate)}`} tone="gold" />
          <Kpi label="Progress Toward Crossover" value={pct(cross.progress)} tone="gold" />
          <Kpi
            label="Compounding Status"
            value={cross.achieved ? 'Crossover Achieved' : 'Building'}
            sub={cross.crossYear ? `Projected crossover ${cross.crossYear} (age ${cross.crossAge})` : 'Beyond projection horizon'}
            tone="green"
          />
        </div>
        <div className="mt-4 h-3 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${cross.progress * 100}%`, background: `linear-gradient(90deg, ${NAVY}, ${GOLD})` }} />
        </div>
      </Section>

      {/* Rule of 72 */}
      <Section title="Law of 72 Dashboard" subtitle="How fast today's household retirement capital doubles.">
        <div className="grid gap-3 sm:grid-cols-3">
          {SCENARIOS.map((s) => (
            <div key={s.rate} className="rounded-xl border p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{(s.rate * 100).toFixed(0)}% Return</div>
              <div className="text-2xl font-semibold mt-1" style={{ color: s.color }}>{(72 / (s.rate * 100)).toFixed(1)} yrs</div>
              <div className="text-xs text-muted-foreground">to double</div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-4 mt-4">
          <Kpi label="Current Retirement Capital" value={money(r72.doubles[0].value / 2)} tone="navy" />
          {r72.doubles.map((d) => (
            <Kpi key={d.n} label={`After ${d.n} Doubling${d.n > 1 ? 's' : ''}`} value={money(d.value)} sub={`~${d.years.toFixed(1)} years`} tone={d.n === 3 ? 'green' : 'gold'} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {[1_000_000, 2_000_000, 4_000_000].map((m) => {
            const hit = r72.doubles.find((d) => d.value >= m);
            return (
              <div key={m} className="rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: hit ? GREEN : SLATE, color: hit ? GREEN : SLATE }}>
                {compact(m)} milestone {hit ? `· reached after ${hit.n} doubling${hit.n > 1 ? 's' : ''}` : '· beyond 3 doublings'}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
          The Rule of 72 estimates how long the current retirement capital takes to double. Actual results in this system may
          exceed these estimates because ongoing contributions, employer retirement funding, salary growth, and cash-flow
          redirects continue increasing the portfolio during the accumulation years.
        </p>
      </Section>

      {/* Milestones */}
      <Section title="Retirement Milestone Dashboard" subtitle="Projected household retirement assets under all three scenarios.">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                <th className="py-2 pr-3">Milestone</th>
                {SCENARIOS.map((s) => <th key={s.rate} className="py-2 pr-3 text-right" style={{ color: s.color }}>{(s.rate * 100).toFixed(0)}% {s.label}</th>)}
                <th className="py-2 pr-3 text-right">Guaranteed Income</th>
                <th className="py-2 text-right">Portfolio</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {ms.map((m) => {
                const perScenario = scenarioRows.map((s) => s.rows.find((r) => r.year === m.row.year) ?? s.rows[s.rows.length - 1]);
                return (
                  <tr key={m.key}>
                    <td className="py-2 pr-3 font-medium">{m.label}<div className="text-[11px] text-muted-foreground">{m.row.year}</div></td>
                    {perScenario.map((r, idx) => (
                      <td key={idx} className="py-2 pr-3 text-right">
                        {money(r.householdAssets)}
                        <div className="text-[11px] text-muted-foreground">growth {money(r.householdAssets * SCENARIOS[idx].rate)}</div>
                      </td>
                    ))}
                    <td className="py-2 pr-3 text-right">
                      {money(m.row.guaranteedIncome)}
                      <div className="text-[11px] text-muted-foreground">
                        SS {money(m.row.socialSecurityIncome)} · Pension {money(m.row.pensionIncome)}
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: `${GREEN}18`, color: GREEN }}>Preserved · 0%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="mt-5" style={{ height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={scenarioChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => compact(Number(v))} tick={{ fontSize: 11 }} width={60} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {SCENARIOS.map((s) => (
                <Line key={s.rate} type="monotone" dataKey={`${s.rate * 100}%`} stroke={s.color} strokeWidth={s.rate === 0.08 ? 3 : 2} dot={false} />
              ))}
              {lymanRetireYear && <ReferenceLine x={lymanRetireYear} stroke={NAVY} strokeDasharray="4 4" label={{ value: 'Retirement', fontSize: 10, fill: NAVY }} />}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Section>

      {/* Income pyramid */}
      <Section title="Household Retirement Income Pyramid" subtitle="Income sources in order of use — guaranteed income supports retirement first.">
        <div className="flex flex-col items-center gap-2">
          {pyramid.map((p) => (
            <div key={p.layer} className="rounded-lg px-4 py-3 text-white text-center transition-all" style={{ width: `${p.w}%`, background: p.color }}>
              <div className="text-[10px] uppercase tracking-widest opacity-75">{p.layer}</div>
              <div className="font-semibold text-sm">{p.title}</div>
              <div className="text-[11px] opacity-85">{p.detail}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Advisor insight */}
      <Section title="Family Office Advisor Insight">
        <div className="rounded-xl p-5 text-white leading-relaxed text-sm" style={{ background: NAVY }}>
          The Montgomery Family Wealth Operating System is intentionally designed to separate retirement from portfolio
          liquidation. Rather than beginning retirement-account withdrawals immediately upon retirement, the household plans to
          use Social Security and pension income as the first layers of retirement income. This strategy allows investment
          assets to remain invested for additional years, maximizing the long-term benefits of compound growth while preserving
          flexibility for healthcare needs, charitable giving, and multi-generational wealth transfer.
        </div>
      </Section>
      <LegacyStepNav />
    </div>
  );
}
