import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  RETURN_SCENARIOS, money, projectMilestone, projectWealth, type ProjectionInputs,
} from '@/lib/retirement/investmentTracker';
import { RETIREMENT_MILESTONES } from '@/lib/investment/portfolio';

interface Props {
  retirementStart: number;
  totalStart: number;
  monthlyEmployee: number;
  monthlyEmployer: number;
  monthlySelfDirected: number;
}

export function ProjectionsPanel({
  retirementStart, totalStart, monthlyEmployee, monthlyEmployer, monthlySelfDirected,
}: Props) {
  const [returnPct, setReturnPct] = useState(7);
  const [ee, setEe] = useState(String(monthlyEmployee));
  const [er, setEr] = useState(String(monthlyEmployer));
  const [sd, setSd] = useState(String(monthlySelfDirected));

  const base: Omit<ProjectionInputs, 'startingBalance' | 'monthlyEmployee' | 'monthlyEmployer'> = {
    currentAge: 59,
    targetAge: 85,
    annualContributionIncreasePct: 3,
    annualLumpSum: 0,
    expectedReturnPct: returnPct,
    inflationPct: 3,
    startYear: new Date().getFullYear(),
  };

  const retirementProjection = useMemo(
    () => projectWealth({ ...base, startingBalance: retirementStart, monthlyEmployee: Number(ee || 0), monthlyEmployer: Number(er || 0) }),
    [base, retirementStart, ee, er],
  );

  const totalProjection = useMemo(
    () => projectWealth({
      ...base,
      startingBalance: totalStart,
      monthlyEmployee: Number(ee || 0) + Number(sd || 0),
      monthlyEmployer: Number(er || 0),
    }),
    [base, totalStart, ee, er, sd],
  );

  const scenarioRows = RETURN_SCENARIOS.map((s) => {
    const rows = projectWealth({
      ...base,
      expectedReturnPct: s.pct,
      startingBalance: retirementStart,
      monthlyEmployee: Number(ee || 0),
      monthlyEmployer: Number(er || 0),
    });
    const at85 = rows[rows.length - 1]?.endingBalance ?? retirementStart;
    const million = rows.find((r) => r.endingBalance >= 1_000_000);
    const fourM = rows.find((r) => r.endingBalance >= 4_000_000);
    return { ...s, at85, million, fourM };
  });

  const nextRetirement = RETIREMENT_MILESTONES.find((m) => m > retirementStart) ?? RETIREMENT_MILESTONES.at(-1)!;
  const nextTotal = RETIREMENT_MILESTONES.find((m) => m > totalStart) ?? RETIREMENT_MILESTONES.at(-1)!;

  const chartData = retirementProjection.map((r, i) => ({
    age: r.age,
    retirement: r.endingBalance,
    total: totalProjection[i]?.endingBalance ?? r.endingBalance,
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="border-prism-amber/30">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Retirement milestone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-2xl font-semibold tabular-nums">{money(retirementStart, 2)}</p>
            <p className="text-muted-foreground">Next: {money(nextRetirement)} · remaining {money(Math.max(0, nextRetirement - retirementStart), 2)}</p>
            <Progress value={Math.min(100, (retirementStart / nextRetirement) * 100)} className="h-1.5 mt-1" />
            <p className="text-[10px] text-muted-foreground">Retirement investments only.</p>
          </CardContent>
        </Card>
        <Card className="border-prism-amber/30">
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Total investment milestone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <p className="text-2xl font-semibold tabular-nums">{money(totalStart, 2)}</p>
            <p className="text-muted-foreground">Next: {money(nextTotal)} · remaining {money(Math.max(0, nextTotal - totalStart), 2)}</p>
            <Progress value={Math.min(100, (totalStart / nextTotal) * 100)} className="h-1.5 mt-1" />
            <p className="text-[10px] text-muted-foreground">Retirement plus self-directed investments.</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Projection assumptions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-[11px]">Employee monthly</Label>
              <Input type="number" value={ee} onChange={(e) => setEe(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Employer monthly</Label>
              <Input type="number" value={er} onChange={(e) => setEr(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Self-directed monthly</Label>
              <Input type="number" value={sd} onChange={(e) => setSd(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Expected return</Label>
              <div className="flex flex-wrap gap-1">
                {RETURN_SCENARIOS.map((s) => (
                  <Button
                    key={s.pct}
                    size="sm"
                    variant={returnPct === s.pct ? 'default' : 'outline'}
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setReturnPct(s.pct)}
                  >
                    {s.pct}%
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gTot" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(38 92% 50%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(38 92% 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="age" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => money(v)} />
                <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l) => `Age ${l}`} />
                <Area type="monotone" dataKey="total" name="Total investment wealth" stroke="hsl(38 92% 50%)" fill="url(#gTot)" />
                <Area type="monotone" dataKey="retirement" name="Retirement investments" stroke="hsl(var(--primary))" fill="url(#gRet)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="text-left py-1.5">Scenario</th>
                  <th className="text-right">Retirement at 85</th>
                  <th className="text-right">$1M reached</th>
                  <th className="text-right">$4M reached</th>
                </tr>
              </thead>
              <tbody>
                {scenarioRows.map((s) => (
                  <tr key={s.pct} className="border-b border-border/30">
                    <td className="py-1.5">{s.pct}% · {s.label}</td>
                    <td className="text-right tabular-nums">{money(s.at85)}</td>
                    <td className="text-right">{s.million ? `${s.million.year} · age ${s.million.age}` : 'Beyond age 85'}</td>
                    <td className="text-right">{s.fourM ? `${s.fourM.year} · age ${s.fourM.age}` : 'Beyond age 85'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Retirement milestone ladder</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {RETIREMENT_MILESTONES.map((m) => {
            const p = projectMilestone(m, retirementStart, retirementProjection, 59);
            return (
              <div key={m} className="rounded-lg border border-border/60 p-2.5">
                <p className="text-[11px] text-prism-amber">{money(m)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.reached ? 'Reached' : p.projectedYear ? `${p.projectedYear} · age ${p.projectedAge}` : 'Beyond age 85'}
                </p>
                <Progress value={p.progressPct} className="h-1 mt-1" />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
