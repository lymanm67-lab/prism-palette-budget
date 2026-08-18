import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar,
} from 'recharts';
import { TrendingUp, Layers, Rocket, RefreshCw } from 'lucide-react';
import { money, NumField, SectionNote, ConfidenceBadge } from './shared';
import {
  buildTimeline, projectPortfolio, milestoneHits, runWaterfall, releasedCash,
  DESTINATION_LABEL, type AssumptionState, type WaterfallStep,
} from '@/lib/blueprint/model';

export function SalaryAccelerator({ state }: { state: AssumptionState }) {
  const rows = useMemo(() => buildTimeline(state).slice(0, 15), [state]);
  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rocket className="h-4 w-4 text-prism-teal" /> Salary & Pay Raise Investment Accelerator
        </CardTitle>
        <SectionNote>
          {state.salaryGrowthPct}% assumed annual increase, with {state.raiseRedirectPct}% of every raise
          redirected to {DESTINATION_LABEL[state.raiseDestination]} while the lifestyle budget holds steady.
        </SectionNote>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-1.5">Year</th><th className="text-left">Age</th>
                <th className="text-right">Annual salary</th><th className="text-right">Monthly</th>
                <th className="text-right">Raise</th><th className="text-right">Cumulative raises</th>
                <th className="text-right">Redirected / mo</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.year} className="border-b border-border/40">
                  <td className="py-1.5">{r.year}</td><td>{r.age}</td>
                  <td className="text-right">{money(r.salary)}</td>
                  <td className="text-right">{money(r.salary / 12)}</td>
                  <td className="text-right">{money(r.raiseAmount)}</td>
                  <td className="text-right">{money(r.cumulativeRaises)}</td>
                  <td className="text-right text-prism-teal">{money(r.raiseRedirectMonthly)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-2"><ConfidenceBadge level="projected" /></div>
      </CardContent>
    </Card>
  );
}

export function ContributionTimeline({ state }: { state: AssumptionState }) {
  const rows = useMemo(() => buildTimeline(state), [state]);
  const chart = rows.map((r) => ({
    age: r.age,
    Employee: Math.round(r.employeeMonthly + r.scheduledMonthly + r.voluntaryMonthly),
    Employer: Math.round(r.employerMonthly),
    'Debt redirects': Math.round(r.debtRedirectMonthly),
    'Raise redirects': Math.round(r.raiseRedirectMonthly),
  }));
  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-prism-teal" /> Retirement Contribution Engine — through age {state.retirementAge}
        </CardTitle>
        <SectionNote>Employer and employee dollars stay separated so nothing is counted twice.</SectionNote>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Employee" stackId="a" fill="hsl(var(--primary))" />
              <Bar dataKey="Employer" stackId="a" fill="hsl(var(--prism-teal))" />
              <Bar dataKey="Debt redirects" stackId="a" fill="hsl(var(--prism-lime))" />
              <Bar dataKey="Raise redirects" stackId="a" fill="hsl(var(--prism-amber))" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground sticky top-0 bg-card">
              <tr className="border-b">
                <th className="text-left py-1.5">Year</th><th className="text-left">Age</th>
                <th className="text-right">Employee</th><th className="text-right">Employer</th>
                <th className="text-right">Debt redirect</th><th className="text-right">Raise redirect</th>
                <th className="text-right">Monthly total</th><th className="text-right">Annual total</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {rows.map((r) => (
                <tr key={r.year} className="border-b border-border/40">
                  <td className="py-1.5">{r.year}</td><td>{r.age}</td>
                  <td className="text-right">{money(r.employeeMonthly + r.scheduledMonthly + r.voluntaryMonthly)}</td>
                  <td className="text-right">{money(r.employerMonthly)}</td>
                  <td className="text-right">{money(r.debtRedirectMonthly)}</td>
                  <td className="text-right">{money(r.raiseRedirectMonthly)}</td>
                  <td className="text-right font-semibold">{money(r.totalMonthly)}</td>
                  <td className="text-right font-semibold">{money(r.totalAnnual)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function InvestmentWaterfall({
  state, patch,
}: { state: AssumptionState; patch: (p: Partial<AssumptionState>) => void }) {
  const rows = useMemo(() => buildTimeline(state), [state]);
  const availableAnnual = rows[0]?.totalAnnual ?? 0;
  const { fills, unallocated } = useMemo(
    () => runWaterfall(state.waterfall, availableAnnual), [state.waterfall, availableAnnual]);

  const setStep = (i: number, p: Partial<WaterfallStep>) =>
    patch({ waterfall: state.waterfall.map((s, ix) => (ix === i ? { ...s, ...p } : s)) });
  const move = (i: number, dir: -1 | 1) => {
    const next = [...state.waterfall];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    patch({ waterfall: next });
  };

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="h-4 w-4 text-prism-teal" /> Investment Waterfall
        </CardTitle>
        <SectionNote>
          Available investment cash {money(availableAnnual)}/yr flows down the priority order. Annual limits are
          editable fields — never hard-coded — so excess spills to the next eligible destination.
        </SectionNote>
      </CardHeader>
      <CardContent className="space-y-3">
        {fills.map((f, i) => {
          const pctFilled = f.room > 0 ? (f.filled / f.room) * 100 : f.filled > 0 ? 100 : 0;
          return (
            <div key={f.key} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">{i + 1}</Badge>
                  <span className="text-sm font-medium">{f.label}</span>
                  {!f.eligible && <Badge variant="secondary" className="text-[10px]">Not eligible</Badge>}
                </div>
                <div className="flex gap-1 print:hidden">
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)}>↑</Button>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)}>↓</Button>
                </div>
              </div>
              <Progress value={pctFilled} />
              <div className="grid gap-2 sm:grid-cols-3 text-xs">
                <div>
                  <Label className="text-[11px]">Annual limit</Label>
                  <NumField value={f.annualLimit} onChange={(n) => setStep(i, { annualLimit: n })} />
                </div>
                <div>
                  <Label className="text-[11px]">Already committed / yr</Label>
                  <NumField value={f.committedAnnual} onChange={(n) => setStep(i, { committedAnnual: n })} />
                </div>
                <div className="flex flex-col justify-end">
                  <p className="text-muted-foreground">Filled this year</p>
                  <p className="font-semibold tabular-nums">{money(f.filled)} <span className="text-muted-foreground">/ room {money(f.room)}</span></p>
                </div>
              </div>
            </div>
          );
        })}
        <div className="rounded-lg bg-prism-amber/10 p-3 text-sm">
          Unallocated overflow: <strong>{money(unallocated)}</strong> — add another destination or raise a limit.
        </div>
      </CardContent>
    </Card>
  );
}

export function PortfolioSimulator({ state }: { state: AssumptionState }) {
  const [scenario, setScenario] = useState(state.primaryReturnPct);
  const paths = useMemo(
    () => state.returnScenarios.map((r) => ({ r, path: projectPortfolio(state, r) })), [state]);
  const chart = useMemo(() => {
    const base = paths[0]?.path ?? [];
    return base.map((_, i) => {
      const row: Record<string, number> = { age: base[i].age };
      paths.forEach((p) => { row[`${p.r}%`] = Math.round(p.path[i]?.balance ?? 0); });
      return row;
    });
  }, [paths]);
  const hits = useMemo(() => milestoneHits(state, scenario), [state, scenario]);

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">Portfolio Growth Simulator</CardTitle>
            <SectionNote>All values PROJECTED. Retirement age {state.retirementAge}; planning return {state.primaryReturnPct}%, stretch {state.stretchReturnPct}%.</SectionNote>
          </div>
          <div className="flex flex-wrap gap-1 print:hidden">
            {state.returnScenarios.map((r) => (
              <Button key={r} size="sm" variant={r === scenario ? 'default' : 'outline'} onClick={() => setScenario(r)}>
                {r}%
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
              <Tooltip formatter={(v: number) => money(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {state.returnScenarios.map((r) => (
                <Line
                  key={r} dataKey={`${r}%`} dot={false}
                  strokeWidth={r === state.primaryReturnPct || r === state.stretchReturnPct ? 2.5 : 1}
                  stroke={
                    r === state.primaryReturnPct ? 'hsl(var(--primary))'
                      : r === state.stretchReturnPct ? 'hsl(var(--prism-teal))'
                        : 'hsl(var(--muted-foreground))'
                  }
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-muted-foreground">
              <tr className="border-b">
                <th className="text-left py-1.5">Milestone</th><th className="text-left">Projected year</th>
                <th className="text-left">Age</th><th className="text-left">Years away</th>
                <th className="text-right">Contributions</th><th className="text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {hits.map((h) => (
                <tr key={h.amount} className="border-b border-border/40">
                  <td className="py-1.5 font-medium">{money(h.amount)}</td>
                  <td>{h.year ?? <span className="text-muted-foreground">beyond age {state.retirementAge}</span>}</td>
                  <td>{h.age ?? '—'}</td>
                  <td>{h.yearsFromNow ?? '—'}</td>
                  <td className="text-right">{h.year ? money(h.contributionsAtHit) : '—'}</td>
                  <td className="text-right text-prism-teal">{h.year ? money(h.growthAtHit) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge level="projected" />
          <SectionNote>at {scenario}% return</SectionNote>
        </div>
      </CardContent>
    </Card>
  );
}

export function WealthRoadmap({ state }: { state: AssumptionState }) {
  const hits = useMemo(() => milestoneHits(state, state.primaryReturnPct), [state]);
  const roadmap = [500_000, 1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000];
  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Wealth Roadmap</CardTitle>
        <SectionNote>Achieved milestones with no documented date are labelled honestly — no dates are invented.</SectionNote>
      </CardHeader>
      <CardContent className="space-y-2">
        {state.achievedMilestones.map((m) => (
          <div key={`a-${m.amount}`} className="flex items-center justify-between rounded-lg border border-prism-teal/40 bg-prism-teal/5 p-3 text-sm">
            <span className="font-semibold">{money(m.amount)}</span>
            <Badge variant="outline" className="text-[10px]">
              {m.date ? `ACHIEVED ${m.date}` : 'ACHIEVED — DATE NOT DOCUMENTED'}
            </Badge>
          </div>
        ))}
        {roadmap.map((amount) => {
          const hit = hits.find((h) => h.amount === amount);
          return (
            <div key={amount} className="flex items-center justify-between rounded-lg border border-border/60 p-3 text-sm">
              <span className="font-semibold">{money(amount)}</span>
              <span className="text-muted-foreground text-xs">
                {hit?.year ? `PROJECTED ${hit.year} (age ${hit.age})` : `PROJECTED beyond age ${state.retirementAge}`}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function CompoundingFlywheel({ state }: { state: AssumptionState }) {
  const rows = useMemo(() => buildTimeline(state), [state]);
  const first = rows[0];
  const path = useMemo(() => projectPortfolio(state, state.primaryReturnPct), [state]);
  const end = path[path.length - 1];
  const debtRelease = state.debts.reduce((s, d) => s + releasedCash(d), 0);

  const stages = [
    { label: 'EARN', value: money((first?.salary ?? 0) / 12) + '/mo salary' },
    { label: 'REDIRECT', value: money(debtRelease + (first?.raiseRedirectMonthly ?? 0)) + '/mo freed' },
    { label: 'OPTIMIZE', value: `${state.waterfall.length}-step waterfall` },
    { label: 'COMPOUND', value: money(state.portfolioBalance) + ' today' },
    { label: 'RECYCLE', value: money(first?.employerMonthly ?? 0) + '/mo employer' },
    { label: 'PROTECT', value: `${state.ltcQuotes.length} LTC option${state.ltcQuotes.length === 1 ? '' : 's'}` },
    { label: 'LEGACY', value: money(end?.balance ?? 0) + ` at ${state.retirementAge}` },
  ];

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCw className="h-4 w-4 text-prism-teal" /> Wealth Compounding Flywheel
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((s, i) => (
            <div key={s.label} className="rounded-lg border border-border/60 bg-card/60 p-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{i + 1}. {s.label}</p>
              <p className="text-sm font-semibold tabular-nums mt-1">{s.value}</p>
            </div>
          ))}
          <div className="rounded-lg border-2 border-primary/50 bg-primary/10 p-3 flex items-center justify-center text-center">
            <p className="text-sm font-bold">DON'T BREAK THE COMPOUNDING CYCLE</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
