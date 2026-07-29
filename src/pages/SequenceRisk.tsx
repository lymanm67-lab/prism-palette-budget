import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LegacyStepNav } from '@/components/legacy/LegacyStepNav';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine, Cell,
} from 'recharts';
import {
  ShieldCheck, AlertTriangle, TrendingUp, Layers, Wallet, Gauge, Info,
} from 'lucide-react';
import {
  DEFAULT_SORR, SorrInputs, sequenceIllustration, scenarioDefs, projectScenario,
  strategyComparison, safeWithdrawalAnalysis, monteCarlo, preservationScore, cashReserveTarget,
  improvementActions,
} from '@/lib/retirement/sequenceRisk';

const NAVY = '#0B2341';
const GOLD = '#C9A227';
const GREEN = '#1F7A5A';
const RED = '#B4443C';
const SLATE = '#64748B';

const money = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const compact = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;

function Kpi({ label, value, sub, tone = 'navy' }: { label: string; value: string; sub?: string; tone?: 'navy' | 'gold' | 'green' | 'red' }) {
  const bg = tone === 'gold' ? GOLD : tone === 'green' ? GREEN : tone === 'red' ? RED : NAVY;
  return (
    <div className="rounded-xl p-4 text-white shadow-sm" style={{ background: bg }}>
      <div className="text-[11px] uppercase tracking-wider opacity-75">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {sub && <div className="text-[11px] mt-1 opacity-80">{sub}</div>}
    </div>
  );
}

function Field({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (n: number) => void; step?: number; suffix?: string }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-1 mt-1">
        <input
          type="number" step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
        />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );
}

const INCOME_LAYERS = [
  { n: 1, label: 'Social Security', note: 'Primary lifetime income, inflation-adjusted.', color: GREEN },
  { n: 2, label: 'Kateri OPERS Pension', note: 'Secondary guaranteed income floor.', color: '#2E8B6B' },
  { n: 3, label: 'Cash Reserve', note: 'Buffer so investments are not sold into a decline.', color: GOLD },
  { n: 4, label: 'Investment Portfolio', note: 'Tapped only after guaranteed layers.', color: NAVY },
  { n: 5, label: 'Legacy Assets', note: 'Preserved for heirs and the family trust.', color: SLATE },
];

export default function SequenceRisk() {
  const [i, setI] = useState<SorrInputs>(DEFAULT_SORR);
  const [mcRuns, setMcRuns] = useState(2000);
  const set = <K extends keyof SorrInputs>(k: K, v: SorrInputs[K]) => setI((p) => ({ ...p, [k]: v }));

  const scenarios = useMemo(() => scenarioDefs(i.expectedReturnPct), [i.expectedReturnPct]);
  const results = useMemo(() => scenarios.map((s) => ({ def: s, res: projectScenario(i, s) })), [i, scenarios]);
  const illustration = useMemo(() => sequenceIllustration({ startBalance: 1_000_000, annualWithdrawal: 50_000 }), []);
  const comparison = useMemo(() => strategyComparison(i, scenarios[1]), [i, scenarios]);
  const swr = useMemo(() => safeWithdrawalAnalysis(i), [i]);
  const mc = useMemo(() => monteCarlo(i, mcRuns), [i, mcRuns]);
  const score = useMemo(() => preservationScore(i), [i]);
  const actions = useMemo(() => improvementActions(i), [i]);
  const reserve = useMemo(() => cashReserveTarget(i), [i]);

  const timelineAges = [i.currentAge, i.retirementAge, 80, 85, 90, 95];
  const timeline = timelineAges.map((age) => {
    const row: Record<string, number | string> = { age: `Age ${age}` };
    results.forEach(({ def, res }) => {
      row[def.label] = res.path.find((p) => p.age === age)?.balance ?? 0;
    });
    return row;
  });

  const coverage = i.annualSpending > 0
    ? Math.round(((i.socialSecurityAnnual + i.pensionAnnual) / i.annualSpending) * 100) : 0;
  const bandTone = score.band === 'Excellent' || score.band === 'Very Good' ? GREEN : score.band === 'Good' ? GOLD : RED;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: GOLD }}>Montgomery Family Wealth Operating System</p>
        <h1 className="text-2xl md:text-3xl font-semibold text-foreground">
          Sequence of Returns Risk Management System™
        </h1>
        <p className="text-sm text-muted-foreground">
          Retirement preservation &amp; resilience dashboard — measure, visualize and stress-test the household plan
          against unfavorable market sequences.
        </p>
      </header>

      {/* Assumption bar */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Gauge className="h-4 w-4" style={{ color: GOLD }} /> Assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground mr-1">Long-term return</span>
            {[6, 8, 10].map((r) => (
              <Button key={r} size="sm" variant={i.expectedReturnPct === r ? 'default' : 'outline'}
                onClick={() => set('expectedReturnPct', r)}>{r}%</Button>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <Field label="Current age" value={i.currentAge} onChange={(v) => set('currentAge', v)} />
            <Field label="Retirement age" value={i.retirementAge} onChange={(v) => set('retirementAge', v)} />
            <Field label="Portfolio today" value={i.portfolio} step={1000} onChange={(v) => set('portfolio', v)} />
            <Field label="Annual contribution" value={i.annualContribution} step={500} onChange={(v) => set('annualContribution', v)} />
            <Field label="Annual spending" value={i.annualSpending} step={1000} onChange={(v) => set('annualSpending', v)} />
            <Field label="Social Security / yr" value={i.socialSecurityAnnual} step={500} onChange={(v) => set('socialSecurityAnnual', v)} />
            <Field label="OPERS pension / yr" value={i.pensionAnnual} step={500} onChange={(v) => set('pensionAnnual', v)} />
            <Field label="Inflation %" value={i.inflationPct} step={0.1} onChange={(v) => set('inflationPct', v)} />
            <Field label="Volatility %" value={i.volatilityPct} step={1} onChange={(v) => set('volatilityPct', v)} />
            <Field label="Withdrawal rate %" value={i.withdrawalRatePct} step={0.5} onChange={(v) => set('withdrawalRatePct', v)} />
            <Field label="End age" value={i.endAge} onChange={(v) => set('endAge', v)} />
          </div>
          <div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">Initial preservation period (0% withdrawals)</span>
              <span className="font-medium">{i.preservationYears} years</span>
            </div>
            <Slider className="mt-2" min={0} max={15} step={1} value={[i.preservationYears]}
              onValueChange={([v]) => set('preservationYears', v)} />
          </div>
        </CardContent>
      </Card>

      {/* Headline KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Resilience score" value={`${score.score}/100`} sub={score.band} tone={score.band === 'Needs Improvement' ? 'red' : 'green'} />
        <Kpi label="Guaranteed income coverage" value={`${coverage}%`} sub="Social Security + OPERS vs spending" tone="navy" />
        <Kpi label="Monte Carlo success" value={`${mc.successRate}%`} sub={`${mc.runs.toLocaleString()} simulations`} tone="gold" />
        <Kpi label="Median legacy at 95" value={compact(mc.median)} sub={`10th ${compact(mc.p10)} · 90th ${compact(mc.p90)}`} tone="navy" />
      </div>

      <Tabs defaultValue="learn">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="learn">What is sequence risk?</TabsTrigger>
          <TabsTrigger value="strategy">Montgomery strategy</TabsTrigger>
          <TabsTrigger value="stress">Stress tests</TabsTrigger>
          <TabsTrigger value="withdrawal">Withdrawal strategy</TabsTrigger>
          <TabsTrigger value="montecarlo">Monte Carlo</TabsTrigger>
          <TabsTrigger value="reserve">Reserve &amp; guardrails</TabsTrigger>
          <TabsTrigger value="score">Resilience score</TabsTrigger>
        </TabsList>

        {/* ---------------- education ---------------- */}
        <TabsContent value="learn" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Info className="h-4 w-4" style={{ color: GOLD }} /> Sequence of Returns Risk, explained</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Sequence of Returns Risk is the risk that poor investment returns occur early in retirement — especially
                during the years when retirement assets are being withdrawn. Two investors can earn the same average
                return over time and still experience very different outcomes depending on the <em>order</em> in which
                those returns arrive.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Investor A — strong returns early</div>
                  <div className="text-xs text-muted-foreground">Average return {illustration.averageReturnA}% · ending balance {money(illustration.finalA)}</div>
                </div>
                <div className="rounded-lg border p-3">
                  <div className="font-medium">Investor B — weak returns early</div>
                  <div className="text-xs text-muted-foreground">Average return {illustration.averageReturnB}% · ending balance {money(illustration.finalB)}</div>
                </div>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={illustration.combined}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} label={{ value: 'Retirement year', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="investorA" name="Investor A (strong early)" stroke={GREEN} strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="investorB" name="Investor B (weak early)" stroke={RED} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                Both investors start with $1,000,000, withdraw $50,000 per year, and earn the same set of annual returns —
                only the order differs. Withdrawals amplify early losses because shares sold in a down market can never
                participate in the recovery.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- strategy ---------------- */}
        <TabsContent value="strategy" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck className="h-4 w-4" style={{ color: GREEN }} /> Montgomery retirement strategy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                {[
                  ['Retirement age', String(i.retirementAge)],
                  ['Initial portfolio withdrawal rate', '0%'],
                  ['Primary retirement income', 'Social Security'],
                  ['Secondary retirement income', 'Kateri OPERS pension'],
                  ['Retirement portfolio', 'Remains fully invested'],
                  ['Initial preservation period', `${i.preservationYears} years`],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-lg border p-3">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{k}</div>
                    <div className="font-medium mt-0.5">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border p-3" style={{ borderColor: GREEN, background: `${GREEN}12` }}>
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} />
                <span className="text-sm font-medium" style={{ color: GREEN }}>
                  Sequence Risk Mitigation: {coverage >= 90 ? 'Strong' : coverage >= 65 ? 'Moderate' : 'Developing'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" style={{ color: GOLD }} /> Retirement income layers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {INCOME_LAYERS.map((l, idx) => (
                <div key={l.n} className="mx-auto rounded-lg px-4 py-3 text-white shadow-sm"
                  style={{ background: l.color, width: `${100 - idx * 9}%` }}>
                  <div className="text-sm font-semibold">Layer {l.n} — {l.label}</div>
                  <div className="text-[11px] opacity-85">{l.note}</div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground pt-2">
                Guaranteed income sources are intended to cover as much of the household's spending as practical before
                investment assets are tapped. Today's modeled coverage is <strong>{coverage}%</strong> of planned spending.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- stress tests ---------------- */}
        <TabsContent value="stress" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            {results.map(({ def, res }) => (
              <Card key={def.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>{def.label}</span>
                    <Badge variant={res.sustainable ? 'default' : 'destructive'}>
                      {res.sustainable ? 'Sustainable' : `Depletes at ${res.depletedAge}`}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-xs text-muted-foreground">{def.description}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      ['Portfolio at retirement', compact(res.path.find((p) => p.age === i.retirementAge)?.balance ?? 0)],
                      ['Legacy value at 95', compact(res.legacyValue)],
                      ['Lowest portfolio value', compact(res.worstBalance)],
                      ['Total withdrawn', compact(res.totalWithdrawn)],
                      ['Years until recovery', res.yearsUntilRecovery !== null ? `${res.yearsUntilRecovery} yrs` : 'n/a'],
                      ['Withdrawal sustainability', res.sustainable ? 'Through age ' + i.endAge : 'At risk'],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-md border p-2">
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</div>
                        <div className="font-medium">{v}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Risk timeline — projected portfolio by scenario</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={timeline}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="age" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Legend />
                    {results.map(({ def }, idx) => (
                      <Bar key={def.key} dataKey={def.label} fill={[NAVY, RED, SLATE, GREEN][idx]} radius={[3, 3, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Full projection paths</CardTitle></CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis type="number" dataKey="age" domain={[i.currentAge, i.endAge]} tick={{ fontSize: 11 }} allowDuplicatedCategory={false} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                    <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l) => `Age ${l}`} />
                    <Legend />
                    <ReferenceLine x={i.retirementAge} stroke={GOLD} strokeDasharray="4 4" label={{ value: 'Retire', fontSize: 10 }} />
                    {results.map(({ def, res }, idx) => (
                      <Line key={def.key} data={res.path} dataKey="balance" name={def.label}
                        stroke={[NAVY, RED, SLATE, GREEN][idx]} strokeWidth={2} dot={false} type="monotone" />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- withdrawal strategy ---------------- */}
        <TabsContent value="withdrawal" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <Card className="border-2" style={{ borderColor: comparison.preferred === 'immediate' ? GOLD : undefined }}>
              <CardHeader className="pb-2"><CardTitle className="text-base">Strategy A — withdraw immediately at retirement</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Portfolio at 95</div><div className="font-medium">{compact(comparison.immediate.finalBalance)}</div></div>
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Lowest balance</div><div className="font-medium">{compact(comparison.immediate.worstBalance)}</div></div>
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Sequence risk</div><div className="font-medium" style={{ color: RED }}>High</div></div>
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Legacy value</div><div className="font-medium">{compact(comparison.immediate.legacyValue)}</div></div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2" style={{ borderColor: comparison.preferred === 'montgomery' ? GREEN : undefined }}>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">Strategy B — Montgomery strategy</CardTitle>
                {comparison.preferred === 'montgomery' && (
                  <Badge style={{ background: GREEN }} className="text-white">Preferred strategy</Badge>
                )}
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <ul className="text-xs text-muted-foreground list-disc pl-4">
                  <li>Use Social Security first</li>
                  <li>Layer in the OPERS pension</li>
                  <li>Delay portfolio withdrawals {i.preservationYears} years</li>
                  <li>Continue compounding untouched</li>
                </ul>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Portfolio at 95</div><div className="font-medium">{compact(comparison.montgomery.finalBalance)}</div></div>
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Legacy value</div><div className="font-medium">{compact(comparison.montgomery.legacyValue)}</div></div>
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Additional growth years</div><div className="font-medium">{comparison.additionalGrowthYears}</div></div>
                  <div className="rounded-md border p-2"><div className="text-[10px] uppercase text-muted-foreground">Legacy uplift</div><div className="font-medium" style={{ color: GREEN }}>+{comparison.legacyUpliftPct}%</div></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Safe withdrawal analysis</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground border-b">
                      <th className="py-2">Rate</th>
                      <th>Probability of success</th>
                      <th>Portfolio longevity</th>
                      <th>Scenarios survived</th>
                      <th>Legacy projection</th>
                      <th>Remaining at 95</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swr.map((r) => (
                      <tr key={r.rate} className="border-b last:border-0">
                        <td className="py-2 font-medium">{r.rate}%</td>
                        <td style={{ color: r.successProbability >= 85 ? GREEN : r.successProbability >= 70 ? GOLD : RED }}>{r.successProbability}%</td>
                        <td>{r.longevity}</td>
                        <td>{r.scenariosSurvived}</td>
                        <td>{compact(r.legacyProjection)}</td>
                        <td>{compact(r.remainingAt95)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5" style={{ color: GOLD }} />
                These are planning scenarios, not guarantees. Actual results depend on market returns, taxes, spending and longevity.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- monte carlo ---------------- */}
        <TabsContent value="montecarlo" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Monte Carlo simulation</CardTitle>
              <div className="flex gap-1">
                {[1000, 2000, 5000, 10000].map((n) => (
                  <Button key={n} size="sm" variant={mcRuns === n ? 'default' : 'outline'} onClick={() => setMcRuns(n)}>
                    {n.toLocaleString()}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                <Kpi label="Probability of success" value={`${mc.successRate}%`} tone={mc.successRate >= 85 ? 'green' : mc.successRate >= 70 ? 'gold' : 'red'} />
                <Kpi label="Median ending portfolio" value={compact(mc.median)} />
                <Kpi label="10th percentile" value={compact(mc.p10)} tone="red" />
                <Kpi label="90th percentile" value={compact(mc.p90)} tone="green" />
                <Kpi label={`Positive through age ${i.endAge}`} value={`${mc.positiveAt95Rate}%`} tone="gold" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mc.distribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} label={{ value: 'Simulation percentile (worst → best)', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => compact(v)} />
                    <Tooltip formatter={(v: number) => money(v)} />
                    <Area type="monotone" dataKey="value" name="Ending portfolio" stroke={NAVY} fill={NAVY} fillOpacity={0.18} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-muted-foreground">
                Results are expressed as probabilities across {mc.runs.toLocaleString()} randomized return paths using a
                {' '}{i.expectedReturnPct}% average return and {i.volatilityPct}% annual volatility — not as certainties.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- reserve & guardrails ---------------- */}
        <TabsContent value="reserve" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" style={{ color: GOLD }} /> Cash reserve strategy</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                {[12, 24, 36].map((m) => (
                  <Button key={m} size="sm" variant={i.cashReserveMonths === m ? 'default' : 'outline'} onClick={() => set('cashReserveMonths', m)}>
                    {m} months
                  </Button>
                ))}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div className="rounded-md border p-3"><div className="text-[10px] uppercase text-muted-foreground">Monthly spending</div><div className="font-medium">{money(reserve.monthlySpend)}</div></div>
                <div className="rounded-md border p-3"><div className="text-[10px] uppercase text-muted-foreground">Guaranteed monthly income</div><div className="font-medium">{money(reserve.guaranteedMonthly)}</div></div>
                <div className="rounded-md border p-3"><div className="text-[10px] uppercase text-muted-foreground">Monthly gap to fund</div><div className="font-medium">{money(reserve.monthlyGap)}</div></div>
                <div className="rounded-md border p-3"><div className="text-[10px] uppercase text-muted-foreground">Reserve target (gap only)</div><div className="font-medium" style={{ color: GREEN }}>{money(reserve.gapOnlyTarget)}</div></div>
              </div>
              <p className="text-xs text-muted-foreground">
                A reserve covering {i.cashReserveMonths} months of spending ({money(reserve.fullSpendTarget)} in full, or{' '}
                {money(reserve.gapOnlyTarget)} covering only the gap above guaranteed income) reduces the need to sell
                investments after a market decline — the single biggest driver of sequence risk.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Dynamic spending guardrails</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="guardrails" className="text-sm">Apply guardrails in projections</Label>
                <Switch id="guardrails" checked={i.guardrailsEnabled} onCheckedChange={(v) => set('guardrailsEnabled', v)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Decline trigger %" value={i.guardrailDropPct} onChange={(v) => set('guardrailDropPct', v)} />
                <Field label="Discretionary spending cut %" value={i.guardrailSpendCutPct} onChange={(v) => set('guardrailSpendCutPct', v)} />
              </div>
              <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
                <li>Reduce discretionary spending when the portfolio falls more than {i.guardrailDropPct}%.</li>
                <li>Pause large gifts or major purchases if desired.</li>
                <li>Re-evaluate planned withdrawals for the year.</li>
                <li>Resume normal spending after the portfolio recovers.</li>
              </ul>
              <p className="text-xs text-muted-foreground">These guardrails are configurable planning options, not automatic requirements.</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------- score ---------------- */}
        <TabsContent value="score" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" style={{ color: GOLD }} /> Portfolio preservation score</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6">
                <div className="rounded-full h-28 w-28 flex flex-col items-center justify-center text-white" style={{ background: bandTone }}>
                  <div className="text-3xl font-semibold">{score.score}</div>
                  <div className="text-[10px] uppercase tracking-wide opacity-85">of 100</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall retirement resilience</div>
                  <div className="text-2xl font-semibold" style={{ color: bandTone }}>{score.band}</div>
                  <div className="text-xs text-muted-foreground mt-1">Recalculates automatically as assumptions change.</div>
                </div>
              </div>
              <div className="space-y-3">
                {score.factors.map((f) => (
                  <div key={f.label}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{f.label}</span>
                      <span className="text-muted-foreground">{f.points}/{f.max}</span>
                    </div>
                    <Progress value={(f.points / f.max) * 100} className="h-2 mt-1" />
                    <div className="text-[11px] text-muted-foreground mt-0.5">{f.note}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Advisor insight */}
      <Card style={{ background: NAVY }} className="text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base" style={{ color: GOLD }}>Executive advisor insight</CardTitle>
        </CardHeader>
        <CardContent className="text-sm leading-relaxed opacity-95">
          The Montgomery retirement strategy is intentionally designed to reduce Sequence of Returns Risk. By working
          until age {i.retirementAge}, relying first on Social Security and Kateri's OPERS pension, maintaining
          flexibility around withdrawals, and allowing retirement investments to remain invested during the early years
          of retirement, the household increases the likelihood of preserving long-term purchasing power and creating a
          stronger financial legacy. While no strategy eliminates market risk, this layered-income approach provides
          greater resilience against unfavorable return sequences than a strategy that relies on immediate portfolio
          withdrawals.
        </CardContent>
      </Card>

      <LegacyStepNav />
    </div>
  );
}
