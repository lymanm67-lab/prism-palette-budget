import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend,
} from 'recharts';
import { Quote, Sparkles, TrendingUp, Flag } from 'lucide-react';
import CompoundingStatusCard from '@/components/wealth-os/crossover/CompoundingStatusCard';
import { Speedometer, Flywheel, CrossingArrows } from '@/components/wealth-os/crossover/CompoundingVisuals';
import {
  SCENARIOS,
  runCrossover,
  scenarioSeries,
  crossoverPortfolioFor,
  classifyStatus,
  money,
  moneyShort,
  NAVY,
  GOLD,
  EMERALD,
  OFFICIAL_RETURN_PCT,
} from '@/lib/investment/crossoverEngine';

const STORAGE_KEY = 'compounding-crossover-v1';

const DEFAULTS = {
  balance: 175_346,
  annualContributions: 28_500,
  contributionGrowthPct: 3,
  debtRedirectAnnual: 11_976, // $998/mo redirect
  debtRedirectStartYear: 2027,
  returnPct: OFFICIAL_RETURN_PCT,
  // Kateri — OPERS pension account + Ohio Deferred Compensation
  includeKateri: true,
  kateriBalance: 364_396,
  kateriContributions: 15_000, // 10% OPERS employee deferral + Ohio DC
  view: 'combined' as 'lyman' | 'kateri' | 'combined',
};

const VIEWS: { key: 'lyman' | 'kateri' | 'combined'; label: string }[] = [
  { key: 'lyman', label: 'Lyman' },
  { key: 'kateri', label: 'Kateri' },
  { key: 'combined', label: 'Combined' },
];


function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULTS;
}

const Section = ({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) => (
  <section className="mb-10">
    {eyebrow && (
      <div className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: GOLD }}>
        {eyebrow}
      </div>
    )}
    <h2 className="mb-4 text-2xl font-bold" style={{ color: NAVY }}>
      {title}
    </h2>
    {children}
  </section>
);

const Panel = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}
    style={{ borderColor: '#E2E8F0' }}
  >
    {children}
  </div>
);

function GrowthTable({ balances }: { balances: number[] }) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
          <th className="pb-1">Return</th>
          <th className="pb-1 text-right">Annual Growth</th>
        </tr>
      </thead>
      <tbody>
        {SCENARIOS.map((s) => {
          const lo = balances[0] * (s.returnPct / 100);
          const hi = balances[balances.length - 1] * (s.returnPct / 100);
          return (
            <tr key={s.key} className="border-t" style={{ borderColor: '#F1F5F9' }}>
              <td className="py-1.5 font-semibold" style={{ color: s.color }}>
                {s.returnPct}%
              </td>
              <td className="py-1.5 text-right font-medium" style={{ color: NAVY }}>
                {lo === hi ? money(lo) : `${moneyShort(lo)} – ${moneyShort(hi)}`}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function CompoundingCrossover() {
  const [state, setState] = useState(loadState);
  const set = (patch: Partial<typeof DEFAULTS>) => {
    const next = { ...state, ...patch };
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  };

  const kOn = state.includeKateri;
  const eff = useMemo(() => {
    if (state.view === 'kateri') {
      return { balance: state.kateriBalance, contributions: state.kateriContributions, redirect: 0, label: 'Kateri' };
    }
    if (state.view === 'combined' && kOn) {
      return {
        balance: state.balance + state.kateriBalance,
        contributions: state.annualContributions + state.kateriContributions,
        redirect: state.debtRedirectAnnual,
        label: 'Household (Lyman + Kateri)',
      };
    }
    return { balance: state.balance, contributions: state.annualContributions, redirect: state.debtRedirectAnnual, label: 'Lyman' };
  }, [state, kOn]);

  const engineInputs = useMemo(
    () => ({
      currentBalance: eff.balance,
      annualContributions: eff.contributions,
      contributionGrowthPct: state.contributionGrowthPct,
      debtRedirectAnnual: eff.redirect,
      debtRedirectStartYear: state.debtRedirectStartYear,
    }),
    [eff, state.contributionGrowthPct, state.debtRedirectStartYear],
  );


  const active = useMemo(
    () => runCrossover({ ...engineInputs, returnPct: state.returnPct }),
    [engineInputs, state.returnPct],
  );

  const { data: chartData, byScenario } = useMemo(
    () => scenarioSeries(engineInputs, 30),
    [engineInputs],
  );

  const activeScenario = SCENARIOS.find((s) => s.returnPct === state.returnPct) ?? SCENARIOS[1];
  const momentumPct = Math.min(100, (eff.balance / 1_000_000) * 100);

  const milestones = [
    { label: 'Current', amount: eff.balance, note: 'Contributions are the primary driver.' },
    { label: 'Milestone One', amount: 250_000, note: 'Compounding becomes noticeable.' },
    { label: 'Milestone Two', amount: 375_000, note: 'Compounding Crossover™ — gains match contributions.' },
    { label: 'Milestone Three', amount: 500_000, note: 'Portfolio becomes the primary wealth engine.' },
    { label: 'Milestone Four', amount: 1_000_000, note: 'Annual gains may exceed a full-time salary.' },
  ];

  const expectedFinal = byScenario.find((b) => b.scenario.key === 'expected')!.result.rows.slice(-1)[0].endBalance;

  return (
    <div className="min-h-screen" style={{ background: '#F8FAFC' }}>
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <header className="mb-8 rounded-2xl p-8 text-white" style={{ background: NAVY }}>
          <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: GOLD }}>
            Montgomery Family Wealth Operating System
          </div>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">The Compounding Crossover™</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/80">
            The Compounding Crossover™ is the moment when your annual investment earnings become equal to
            or greater than your annual retirement contributions. From this point forward, your
            portfolio — not your paycheck — becomes the primary engine of wealth creation.
          </p>
        </header>

        {/* 1. Investment assumptions */}
        <Section eyebrow="Investment Assumptions" title="Long-Term Investment Growth Assumptions">
          <div className="grid gap-4 md:grid-cols-3">
            {SCENARIOS.map((s) => (
              <Panel key={s.key} className={s.official ? 'ring-2' : ''}>
                <div className="flex items-start justify-between">
                  <div className="text-sm font-semibold" style={{ color: s.color }}>
                    {s.label}
                  </div>
                  {s.official && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ background: EMERALD }}
                    >
                      OFFICIAL
                    </span>
                  )}
                </div>
                <div className="mt-2 text-4xl font-bold" style={{ color: s.color }}>
                  {s.returnPct}%
                </div>
                <p className="mt-2 text-xs text-slate-600">{s.purpose}</p>
                <div className="mt-3 rounded-lg p-3" style={{ background: '#F8FAFC' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                    Est. annual growth today
                  </div>
                  <div className="text-lg font-bold" style={{ color: NAVY }}>
                    {money(eff.balance * (s.returnPct / 100))}
                  </div>
                </div>
                {s.note && <p className="mt-3 text-[11px] italic leading-relaxed text-slate-500">{s.note}</p>}
              </Panel>
            ))}
          </div>
        </Section>

        {/* 2. Live dashboard */}
        <Section eyebrow="Live Model" title="Live Compounding Dashboard">
          <div className="grid gap-4 lg:grid-cols-3">
            <Panel>
              <h3 className="mb-3 text-sm font-bold" style={{ color: NAVY }}>
                Assumptions
              </h3>
              <label className="mb-3 block text-xs font-semibold text-slate-500">
                Current retirement balance
                <input
                  type="number"
                  value={state.balance}
                  onChange={(e) => set({ balance: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-medium text-slate-900"
                  style={{ borderColor: '#CBD5E1' }}
                />
              </label>
              <label className="mb-3 block text-xs font-semibold text-slate-500">
                Annual contributions (employee + employer)
                <input
                  type="number"
                  value={state.annualContributions}
                  onChange={(e) => set({ annualContributions: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-medium text-slate-900"
                  style={{ borderColor: '#CBD5E1' }}
                />
              </label>
              <label className="mb-3 block text-xs font-semibold text-slate-500">
                Annual contribution growth (raises &amp; deferral increases), %
                <input
                  type="number"
                  value={state.contributionGrowthPct}
                  onChange={(e) => set({ contributionGrowthPct: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-medium text-slate-900"
                  style={{ borderColor: '#CBD5E1' }}
                />
              </label>
              <label className="mb-3 block text-xs font-semibold text-slate-500">
                Debt redirect, annual (from {state.debtRedirectStartYear})
                <input
                  type="number"
                  value={state.debtRedirectAnnual}
                  onChange={(e) => set({ debtRedirectAnnual: Number(e.target.value) || 0 })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-medium text-slate-900"
                  style={{ borderColor: '#CBD5E1' }}
                />
              </label>
              <div className="text-xs font-semibold text-slate-500">Planning scenario</div>
              <div className="mt-1 flex gap-2">
                {SCENARIOS.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => set({ returnPct: s.returnPct })}
                    className="flex-1 rounded-md border px-2 py-2 text-xs font-bold transition"
                    style={{
                      borderColor: state.returnPct === s.returnPct ? s.color : '#CBD5E1',
                      background: state.returnPct === s.returnPct ? s.color : 'white',
                      color: state.returnPct === s.returnPct ? 'white' : s.color,
                    }}
                  >
                    {s.returnPct}%
                  </button>
                ))}
              </div>
            </Panel>

            <div className="lg:col-span-2">
              <CompoundingStatusCard
                balance={eff.balance}
                annualContributions={eff.contributions}
                returnPct={state.returnPct}
                contributionGrowthPct={state.contributionGrowthPct}
                debtRedirectAnnual={eff.redirect}
                debtRedirectStartYear={state.debtRedirectStartYear}
              />
              <Panel className="mt-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Projected crossover date
                    </div>
                    <div className="text-xl font-bold" style={{ color: EMERALD }}>
                      {active.crossoverYear ?? 'Beyond horizon'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Balance at crossover
                    </div>
                    <div className="text-xl font-bold" style={{ color: NAVY }}>
                      {active.crossoverBalance ? moneyShort(active.crossoverBalance) : '—'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Status
                    </div>
                    <div className="text-xl font-bold" style={{ color: GOLD }}>
                      {classifyStatus(eff.balance, active.crossoverPortfolio)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-slate-500">
                  Because contributions rise with raises and redirected debt payments, the mathematical
                  crossover target also rises over time — while the larger contributions get you there sooner.
                </p>
              </Panel>
            </div>
          </div>
        </Section>

        {/* 3. Phases */}
        <Section eyebrow="The Power of Compounding" title="Five Phases of the Wealth Journey">
          <div className="space-y-4">
            {/* Phase 1 */}
            <Panel>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                    Phase One
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: NAVY }}>
                    Foundation Building
                  </h3>
                  <div className="mt-2 text-3xl font-bold" style={{ color: EMERALD }}>
                    {money(eff.balance)}
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-600">
                    "You are building the engine."
                  </p>
                </div>
                <ul className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                  {['Salary', 'Employer contributions (9%)', 'Retirement contributions', 'Increasing savings rate', 'Cash-flow redirects', 'Debt redirection strategy'].map((x) => (
                    <li key={x} className="rounded-lg px-3 py-2" style={{ background: '#F8FAFC' }}>
                      ✓ {x}
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            {/* Phase 2 */}
            <Panel>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                    Phase Two
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: NAVY }}>
                    Momentum — $250,000 to $300,000
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Compounding becomes noticeable. Investment returns make a visible contribution to
                    annual portfolio growth, though contributions remain the dominant driver.
                  </p>
                </div>
                <GrowthTable balances={[250_000, 300_000]} />
              </div>
            </Panel>

            {/* Phase 3 */}
            <Panel>
              <div className="text-xs font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                Phase Three
              </div>
              <h3 className="text-xl font-bold" style={{ color: NAVY }}>
                The Compounding Crossover™
              </h3>
              <p className="mb-4 text-sm font-semibold text-slate-600">
                Your Portfolio Begins Working as Hard as You Do
              </p>
              <div className="grid gap-6 md:grid-cols-2">
                <CrossingArrows />
                <div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                        <th className="pb-1">Scenario</th>
                        <th className="pb-1 text-right">Return</th>
                        <th className="pb-1 text-right">Crossover Portfolio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {SCENARIOS.map((s) => (
                        <tr key={s.key} className="border-t" style={{ borderColor: '#F1F5F9' }}>
                          <td className="py-2 font-semibold" style={{ color: s.color }}>
                            {s.label}
                            {s.official ? ' (Official)' : ''}
                          </td>
                          <td className="py-2 text-right">{s.returnPct}%</td>
                          <td className="py-2 text-right font-bold" style={{ color: NAVY }}>
                            {moneyShort(crossoverPortfolioFor(27_000, s.returnPct))} –{' '}
                            {moneyShort(crossoverPortfolioFor(30_000, s.returnPct))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 rounded-lg p-3 text-sm" style={{ background: '#F8FAFC' }}>
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Live calculation
                    </div>
                    <div className="mt-1">
                      {money(eff.contributions)} ÷ {state.returnPct}% ={' '}
                      <span className="font-bold" style={{ color: EMERALD }}>
                        {money(active.crossoverPortfolio)}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Compounding Crossover = Annual Retirement Contributions ÷ Expected Annual Return
                    </p>
                  </div>
                </div>
              </div>
            </Panel>

            {/* Phase 4 */}
            <Panel>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                    Phase Four
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: NAVY }}>
                    Compounding Acceleration — $500,000
                  </h3>
                  <p className="mb-3 text-sm font-semibold text-slate-600">
                    The Portfolio Becomes the Primary Wealth Engine
                  </p>
                  <GrowthTable balances={[500_000]} />
                </div>
                <Speedometer
                  value={momentumPct}
                  label="Compounding Momentum"
                  caption={`${moneyShort(eff.balance)} of the $1M flywheel threshold`}
                />
              </div>
            </Panel>

            {/* Phase 5 */}
            <Panel>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                  <div className="text-xs font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                    Phase Five
                  </div>
                  <h3 className="text-xl font-bold" style={{ color: NAVY }}>
                    Financial Flywheel — $1,000,000
                  </h3>
                  <p className="mb-3 text-sm font-semibold text-slate-600">
                    Your Money Starts Working Harder Than You Do
                  </p>
                  <GrowthTable balances={[1_000_000]} />
                </div>
                <Flywheel
                  speed={Math.max(0.4, eff.balance / 500_000)}
                  caption="Flywheel speed scales with portfolio size"
                />
              </div>
            </Panel>
          </div>
        </Section>

        {/* 4. Probability & outcomes */}
        <Section eyebrow="Probability & Outcomes" title="Retirement Growth Comparison">
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            {byScenario.map(({ scenario, result }) => {
              const final = result.rows[result.rows.length - 1].endBalance;
              const diff = final - expectedFinal;
              return (
                <Panel key={scenario.key}>
                  <div className="text-sm font-semibold" style={{ color: scenario.color }}>
                    {scenario.label} · {scenario.returnPct}%
                  </div>
                  <div className="mt-1 text-3xl font-bold" style={{ color: NAVY }}>
                    {moneyShort(final)}
                  </div>
                  <div className="text-xs text-slate-500">Projected portfolio in 30 years</div>
                  <div className="mt-2 text-sm font-semibold" style={{ color: diff === 0 ? EMERALD : diff > 0 ? GOLD : '#2563EB' }}>
                    {diff === 0
                      ? 'Official planning baseline'
                      : `${diff > 0 ? '+' : '−'}${moneyShort(Math.abs(diff))} (${((Math.abs(diff) / expectedFinal) * 100).toFixed(0)}%) vs. 8%`}
                  </div>
                </Panel>
              );
            })}
          </div>
          <Panel>
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tickFormatter={(v) => moneyShort(v)} tick={{ fontSize: 11, fill: '#64748B' }} width={64} />
                  <Tooltip formatter={(v: number) => money(v)} />
                  <Legend />
                  {SCENARIOS.map((s) => (
                    <Line
                      key={s.key}
                      type="monotone"
                      dataKey={s.key}
                      name={`${s.returnPct}% ${s.label}`}
                      stroke={s.color}
                      strokeWidth={s.official ? 3 : 2}
                      dot={false}
                    />
                  ))}
                  <ReferenceLine y={active.crossoverPortfolio} stroke={EMERALD} strokeDasharray="5 5" label={{ value: 'Crossover', fontSize: 10, fill: EMERALD, position: 'insideTopLeft' }} />
                  <ReferenceLine y={500_000} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: '$500k', fontSize: 10, fill: '#64748B', position: 'insideTopLeft' }} />
                  <ReferenceLine y={1_000_000} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: '$1M', fontSize: 10, fill: '#64748B', position: 'insideTopLeft' }} />
                  <ReferenceLine y={2_000_000} stroke="#94A3B8" strokeDasharray="3 3" label={{ value: '$2M', fontSize: 10, fill: '#64748B', position: 'insideTopLeft' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </Section>

        {/* 5. Why compounding wins */}
        <Section eyebrow="Infographic" title="Why Compounding Eventually Wins">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                stage: 'Stage One',
                title: 'You Build the Portfolio.',
                items: ['Salary', 'Contributions', 'Discipline'],
                share: 15,
                color: '#2563EB',
              },
              {
                stage: 'Stage Two',
                title: 'You and Your Investments Work Together.',
                items: ['Contributions', 'Market returns'],
                share: 50,
                color: EMERALD,
              },
              {
                stage: 'Stage Three',
                title: 'The Portfolio Builds Itself.',
                items: ['Market appreciation', 'Dividend reinvestment', 'Compound interest'],
                share: 85,
                color: GOLD,
              },
            ].map((s) => (
              <Panel key={s.stage}>
                <div className="text-xs font-bold uppercase tracking-wide" style={{ color: s.color }}>
                  {s.stage}
                </div>
                <h3 className="mt-1 text-base font-bold" style={{ color: NAVY }}>
                  {s.title}
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {s.items.map((i) => (
                    <li key={i}>• {i}</li>
                  ))}
                </ul>
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-[10px] font-semibold uppercase text-slate-500">
                    <span>Growth-driven share</span>
                    <span>{s.share}%</span>
                  </div>
                  <div className="flex h-3 overflow-hidden rounded-full bg-slate-200">
                    <div style={{ width: `${100 - s.share}%`, background: NAVY }} />
                    <div style={{ width: `${s.share}%`, background: s.color }} />
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>Contributions</span>
                    <span>Investment growth</span>
                  </div>
                </div>
              </Panel>
            ))}
          </div>
        </Section>

        {/* 6. Milestones */}
        <Section eyebrow="Timeline" title="Compounding Milestones">
          <Panel>
            <div className="relative grid gap-6 md:grid-cols-5">
              <div className="absolute left-0 right-0 top-6 hidden h-0.5 md:block" style={{ background: '#E2E8F0' }} />
              {milestones.map((m) => {
                const reached = eff.balance >= m.amount;
                return (
                  <div key={m.label} className="relative">
                    <div
                      className="mb-3 flex h-12 w-12 items-center justify-center rounded-full text-white"
                      style={{ background: reached ? EMERALD : NAVY }}
                    >
                      <Flag className="h-5 w-5" />
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: GOLD }}>
                      {m.label}
                    </div>
                    <div className="text-lg font-bold" style={{ color: NAVY }}>
                      {moneyShort(m.amount)}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{m.note}</p>
                  </div>
                );
              })}
            </div>
          </Panel>
        </Section>

        {/* 7. Advisor note */}
        <Section eyebrow="Family Office" title="Advisor's Note">
          <div className="rounded-2xl p-6 text-white" style={{ background: NAVY }}>
            <Quote className="mb-3 h-6 w-6" style={{ color: GOLD }} />
            <p className="text-sm leading-relaxed text-white/90">
              Most investors believe wealth is created through extraordinary investment returns. In
              reality, lasting wealth is built through extraordinary consistency. The Montgomery Family
              Wealth Operating System is intentionally designed to accelerate the Compounding Crossover™
              by increasing retirement contributions, capturing employer contributions, redirecting debt
              payments into investments, investing salary increases, and maintaining long-term discipline
              across multiple market cycles.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs" style={{ color: GOLD }}>
              <Sparkles className="h-4 w-4" /> Montgomery Family Office
            </div>
          </div>
        </Section>

        <p className="pb-10 text-center text-[11px] text-slate-400">
          <TrendingUp className="mr-1 inline h-3 w-3" />
          8% is the official planning assumption of the Montgomery Family Wealth Operating System. The 6%
          and 10% scenarios are comparison models. Actual investment returns will vary over time.
        </p>
      </div>
    </div>
  );
}
