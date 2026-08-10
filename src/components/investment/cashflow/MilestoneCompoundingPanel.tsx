import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { money } from '@/lib/retirement/investmentTracker';
import {
  illustrativeGrowthAt, monthLabel, RETURN_SCENARIOS,
  type ProjectionResult, type EngineConfig,
} from '@/lib/retirement/cashflowEngine';

interface Props {
  projection: ProjectionResult;
  scenarios: ProjectionResult[];
  retirementTotal: number;
  config: EngineConfig;
}

export function MilestoneCompoundingPanel({ projection, scenarios, retirementTotal, config }: Props) {
  const growth250 = illustrativeGrowthAt(250_000);

  const millionAttribution = useMemo(() => {
    const hit = projection.milestones.find((m) => m.target === 1_000_000);
    const cut = hit?.month;
    const rows = cut ? projection.months.filter((m) => m.month <= cut) : projection.months;
    const acc = { employee: 0, employer: 0, debtRealloc: 0, loanRealloc: 0, refund: 0, accelerator: 0, stepUps: 0, raise: 0, growth: 0 };
    for (const m of rows) {
      acc.employee += m.employee; acc.employer += m.employer; acc.debtRealloc += m.debtRealloc;
      acc.loanRealloc += m.loanRealloc; acc.refund += m.refund; acc.accelerator += m.accelerator;
      acc.stepUps += m.stepUps; acc.raise += m.raise; acc.growth += m.growth;
    }
    const contributions = acc.employee + acc.employer + acc.debtRealloc + acc.loanRealloc + acc.refund + acc.accelerator + acc.stepUps + acc.raise;
    const total = contributions + acc.growth + config.startingBalance;
    return { acc, contributions, total, reachedMonth: cut ?? null };
  }, [projection, config.startingBalance]);

  const yearChart = useMemo(
    () => projection.years.map((y) => ({
      year: y.year,
      Employee: Math.round(y.employee + y.accelerator + y.stepUps + y.raise),
      Employer: Math.round(y.employer),
      'Debt reallocation': Math.round(y.debtRealloc),
      'Loan reallocation': Math.round(y.loanRealloc),
      'Tax refund': Math.round(y.refund),
      'Investment growth': Math.round(y.growth),
    })),
    [projection],
  );

  const balanceChart = useMemo(() => {
    const byYear = new Map<number, Record<string, number>>();
    scenarios.forEach((s) => {
      s.years.forEach((y) => {
        const row = byYear.get(y.year) ?? { year: y.year };
        row[`${s.returnPct}%`] = Math.round(y.endingBalance);
        byYear.set(y.year, row);
      });
    });
    return [...byYear.values()];
  }, [scenarios]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">$200,000 milestone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-2xl font-semibold tabular-nums">{money(retirementTotal, 2)}</p>
            <Progress value={(retirementTotal / 200_000) * 100} className="h-2" />
            <p className="text-muted-foreground">
              {money(Math.max(0, 200_000 - retirementTotal), 2)} remaining ·{' '}
              {((retirementTotal / 200_000) * 100).toFixed(2)}% complete
            </p>
            <ScenarioDates target={200_000} scenarios={scenarios} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">The $250K compounding milestone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <p className="text-2xl font-semibold tabular-nums">{money(retirementTotal, 2)}</p>
            <Progress value={(retirementTotal / 250_000) * 100} className="h-2" />
            <p className="text-muted-foreground">
              {money(Math.max(0, 250_000 - retirementTotal), 2)} remaining ·{' '}
              {((retirementTotal / 250_000) * 100).toFixed(2)}% complete
            </p>
            <ScenarioDates target={250_000} scenarios={scenarios} />
            <p className="text-[10px] text-muted-foreground">
              As the portfolio grows, investment returns can become an increasingly large contributor to annual
              wealth creation. This is not a guaranteed mathematical tipping point.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">What $250,000 can produce</CardTitle>
          <p className="text-[11px] text-muted-foreground">Illustrative annual growth — not guaranteed.</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 grid-cols-2 sm:grid-cols-5">
            {growth250.map((g) => (
              <div key={g.returnPct} className="rounded-lg border border-border bg-card/50 p-3 text-center">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.returnPct}%</p>
                <p className="text-lg font-semibold tabular-nums">{money(g.growth)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CrossoverCard
          title="Compounding Crossover"
          subtitle="Expected annual investment growth exceeds annual personal retirement contributions"
          point={projection.personalCrossover}
          returnPct={projection.returnPct}
        />
        <CrossoverCard
          title="Total Funding Crossover"
          subtitle="Growth exceeds employee + employer + scheduled reallocations"
          point={projection.totalFundingCrossover}
          returnPct={projection.returnPct}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Contributions vs compounding</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Watch the transition from contribution-driven growth to compounding-driven growth.
          </p>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Employee" stackId="c" fill="hsl(var(--primary))" />
                <Bar dataKey="Employer" stackId="c" fill="hsl(var(--muted-foreground))" />
                <Bar dataKey="Debt reallocation" stackId="c" fill="hsl(var(--prism-amber))" />
                <Bar dataKey="Loan reallocation" stackId="c" fill="hsl(var(--destructive))" />
                <Bar dataKey="Tax refund" stackId="c" fill="hsl(var(--secondary-foreground))" />
                <Bar dataKey="Investment growth" stackId="c" fill="hsl(142 71% 45%)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Retirement projection scenarios through age {config.projectToAge}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={balanceChart}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`} />
                <Tooltip
                  formatter={(v: number) => money(v)}
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                {RETURN_SCENARIOS.map((r, i) => (
                  <Area
                    key={r}
                    type="monotone"
                    dataKey={`${r}%`}
                    stroke={`hsl(${200 - i * 30} 70% 50%)`}
                    fill="transparent"
                    strokeWidth={r === config.returnPct ? 2.5 : 1.2}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Projections are mathematical illustrations. Returns do not arrive smoothly and actual results will
            fluctuate.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Milestone tracker</CardTitle>
          <p className="text-[11px] text-muted-foreground">At {projection.returnPct}% planning return.</p>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-[10px]">Milestone</TableHead>
                <TableHead className="text-[10px]">Remaining</TableHead>
                <TableHead className="text-[10px]">% complete</TableHead>
                <TableHead className="text-[10px]">Projected</TableHead>
                <TableHead className="text-[10px]">Age</TableHead>
                <TableHead className="text-[10px]">Annual contributions then</TableHead>
                <TableHead className="text-[10px]">Expected annual growth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projection.milestones.map((m) => (
                <TableRow key={m.target}>
                  <TableCell className="text-xs font-medium">{money(m.target)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{money(m.remaining, 2)}</TableCell>
                  <TableCell className="text-xs tabular-nums">{m.pctComplete.toFixed(2)}%</TableCell>
                  <TableCell className="text-xs">{m.month ? monthLabel(m.month) : `Beyond age ${config.projectToAge}`}</TableCell>
                  <TableCell className="text-xs tabular-nums">{m.age ?? '—'}</TableCell>
                  <TableCell className="text-xs tabular-nums">{m.annualContributionsAtHit ? money(m.annualContributionsAtHit) : '—'}</TableCell>
                  <TableCell className="text-xs tabular-nums">{m.expectedAnnualGrowthAtHit ? money(m.expectedAnnualGrowthAtHit) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Road to the first $1 million</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            {millionAttribution.reachedMonth
              ? `Projected ${monthLabel(millionAttribution.reachedMonth)} at ${projection.returnPct}%.`
              : `Not reached by age ${config.projectToAge} at ${projection.returnPct}%.`}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-4 text-xs">
            <Kv label="Starting balance" value={money(config.startingBalance, 2)} />
            <Kv label="Personally contributed" value={money(millionAttribution.acc.employee + millionAttribution.acc.accelerator + millionAttribution.acc.stepUps + millionAttribution.acc.raise)} />
            <Kv label="Employer contributions" value={money(millionAttribution.acc.employer)} />
            <Kv label="Debt reallocation" value={money(millionAttribution.acc.debtRealloc)} />
            <Kv label="Student loan reallocation" value={money(millionAttribution.acc.loanRealloc)} />
            <Kv label="Tax refund investments" value={money(millionAttribution.acc.refund)} />
            <Kv label="Investment growth" value={money(millionAttribution.acc.growth)} />
            <Kv label="Total" value={money(millionAttribution.total)} />
          </div>
          <div className="flex h-3 overflow-hidden rounded-full">
            <div
              className="bg-primary"
              style={{ width: `${(millionAttribution.contributions / millionAttribution.total) * 100}%` }}
            />
            <div className="bg-emerald-500 flex-1" />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Contributions {((millionAttribution.contributions / millionAttribution.total) * 100).toFixed(1)}% ·
            Compounding {((millionAttribution.acc.growth / millionAttribution.total) * 100).toFixed(1)}% ·
            Starting balance {((config.startingBalance / millionAttribution.total) * 100).toFixed(1)}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function ScenarioDates({ target, scenarios }: { target: number; scenarios: ProjectionResult[] }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {scenarios.map((s) => {
        const m = s.milestones.find((x) => x.target === target);
        return (
          <div key={s.returnPct} className="rounded-md border border-border bg-card/50 p-1.5 text-center">
            <p className="text-[9px] uppercase text-muted-foreground">{s.returnPct}%</p>
            <p className="text-[10px] font-medium">{m?.month ? monthLabel(m.month).replace(' ', ' ') : '—'}</p>
          </div>
        );
      })}
    </div>
  );
}

function CrossoverCard({
  title, subtitle, point, returnPct,
}: {
  title: string; subtitle: string;
  point: ProjectionResult['personalCrossover']; returnPct: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          {title}
          <Badge variant="outline" className="text-[10px]">{returnPct}% assumption</Badge>
        </CardTitle>
        <p className="text-[11px] text-muted-foreground">{subtitle}</p>
      </CardHeader>
      <CardContent className="grid gap-2 grid-cols-2 text-xs">
        <Kv label="Estimated balance" value={point.balance ? money(point.balance) : 'Not reached'} />
        <Kv label="Estimated date" value={point.month ? monthLabel(point.month) : '—'} />
        <Kv label="Estimated age" value={point.age ? String(point.age) : '—'} />
        <Kv label="Expected annual growth" value={point.annualGrowth ? money(point.annualGrowth) : '—'} />
        <Kv label="Annual contributions" value={point.annualContributions ? money(point.annualContributions) : '—'} />
      </CardContent>
    </Card>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-semibold tabular-nums text-xs mt-0.5">{value}</p>
    </div>
  );
}
