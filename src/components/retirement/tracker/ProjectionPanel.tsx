import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  MILESTONES,
  RETURN_SCENARIOS,
  compactMoney,
  money,
  projectMilestone,
  projectWealth,
  requiredMonthlyContribution,
  type ProjectionInputs,
} from '@/lib/retirement/investmentTracker';

interface Props {
  inputs: ProjectionInputs;
  onChange: (patch: Partial<ProjectionInputs>) => void;
}

export function ProjectionPanel({ inputs, onChange }: Props) {
  const projection = projectWealth(inputs);
  const current = inputs.startingBalance;
  const finalRow = projection[projection.length - 1];

  const nextMilestone = MILESTONES.find((m) => m > current) ?? MILESTONES[MILESTONES.length - 1];
  const million = projectMilestone(1_000_000, current, projection, inputs.currentAge);
  const fourM = projectMilestone(4_000_000, current, projection, inputs.currentAge);

  const scenarioDates = RETURN_SCENARIOS.map((s) => {
    const rows = projectWealth({ ...inputs, expectedReturnPct: s.pct });
    const hit1 = rows.find((r) => r.endingBalance >= 1_000_000);
    const hit4 = rows.find((r) => r.endingBalance >= 4_000_000);
    return {
      ...s,
      millionYear: hit1 ? `${hit1.year} (age ${hit1.age})` : 'beyond target age',
      fourYear: hit4 ? `${hit4.year} (age ${hit4.age})` : 'beyond target age',
      final: rows[rows.length - 1]?.endingBalance ?? current,
    };
  });

  const chartData = projection.map((r) => ({
    label: String(r.year),
    principal: inputs.startingBalance,
    contributions: projection
      .slice(0, projection.indexOf(r) + 1)
      .reduce((s, x) => s + x.contributions + x.employerContributions + x.lumpSum, 0),
    growth: projection.slice(0, projection.indexOf(r) + 1).reduce((s, x) => s + x.growth, 0),
    total: r.endingBalance,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Wealth projection engine</CardTitle>
          <p className="text-xs text-muted-foreground">
            Projected from today's portfolio through age {inputs.targetAge}. Change any assumption to re-run.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-4">
            <NumField label="Starting balance" value={inputs.startingBalance} onChange={(v) => onChange({ startingBalance: v })} />
            <NumField label="Current age" value={inputs.currentAge} onChange={(v) => onChange({ currentAge: v })} />
            <NumField label="Target age" value={inputs.targetAge} onChange={(v) => onChange({ targetAge: v })} />
            <NumField label="Expected return %" value={inputs.expectedReturnPct} step="0.1" onChange={(v) => onChange({ expectedReturnPct: v })} />
            <NumField label="Monthly employee" value={inputs.monthlyEmployee} onChange={(v) => onChange({ monthlyEmployee: v })} />
            <NumField label="Monthly employer" value={inputs.monthlyEmployer} onChange={(v) => onChange({ monthlyEmployer: v })} />
            <NumField
              label="Annual contribution increase %"
              value={inputs.annualContributionIncreasePct}
              step="0.1"
              onChange={(v) => onChange({ annualContributionIncreasePct: v })}
            />
            <NumField label="Annual lump sum" value={inputs.annualLumpSum} onChange={(v) => onChange({ annualLumpSum: v })} />
            <NumField label="Inflation %" value={inputs.inflationPct} step="0.1" onChange={(v) => onChange({ inflationPct: v })} />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Tile label={`Projected value at age ${inputs.targetAge}`} value={money(finalRow?.endingBalance ?? current)} gold />
            <Tile label="In today's dollars" value={money(finalRow?.realEndingBalance ?? current)} />
            <Tile
              label="Total investment growth"
              value={money(projection.reduce((s, r) => s + r.growth, 0))}
              green
            />
          </div>

          <div>
            <p className="text-xs font-medium mb-2">Compounding visualizer — principal, contributions and growth</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={compactMoney} tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: number | string) => money(Number(v))}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="principal" name="Starting principal" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                <Area type="monotone" dataKey="contributions" name="Contributions" stackId="1" stroke="#0f766e" fill="#0f766e" fillOpacity={0.3} />
                <Area type="monotone" dataKey="growth" name="Investment growth" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.35} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-prism-amber/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-prism-amber">Road to $1 million</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-3xl font-semibold tabular-nums text-foreground">{money(current, 2)}</p>
            <Progress value={million.progressPct} className="h-2" />
            <Line label="Amount remaining" value={money(million.remaining, 2)} />
            <Line label="Percentage complete" value={`${million.progressPct.toFixed(2)}%`} />
            <Line label="Projected millionaire year" value={million.projectedYear ? String(million.projectedYear) : 'Reached'} />
            <Line label="Projected age" value={million.projectedAge ? String(million.projectedAge) : '—'} />
            <Line label="Years remaining" value={million.yearsRemaining != null ? String(million.yearsRemaining) : '—'} />
            <Line
              label="Monthly contribution required (10 yrs)"
              value={money(requiredMonthlyContribution(1_000_000, current, 10, inputs.expectedReturnPct))}
            />
            <Line label="Return assumption" value={`${inputs.expectedReturnPct}%`} />
            <div className="pt-2 border-t border-border/60 space-y-1">
              {scenarioDates.map((s) => (
                <div key={s.pct} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {s.label} ({s.pct}%)
                  </span>
                  <span className="tabular-nums">{s.millionYear}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Road to $4 million</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            <p className="text-3xl font-semibold tabular-nums text-foreground">{fourM.progressPct.toFixed(2)}%</p>
            <Progress value={fourM.progressPct} className="h-2" />
            <Line label="Goal" value={money(4_000_000)} />
            <Line label="Amount remaining" value={money(fourM.remaining, 2)} />
            <Line label="Projected calendar year" value={fourM.projectedYear ? String(fourM.projectedYear) : 'Beyond target age'} />
            <Line label="Projected age at goal" value={fourM.projectedAge ? String(fourM.projectedAge) : '—'} />
            <Line label="Return scenario" value={`${inputs.expectedReturnPct}%`} />
            <Line
              label="Contribution assumption"
              value={`${money(inputs.monthlyEmployee + inputs.monthlyEmployer)}/mo, +${inputs.annualContributionIncreasePct}%/yr`}
            />
            <div className="pt-2 border-t border-border/60 space-y-1">
              {scenarioDates.map((s) => (
                <div key={s.pct} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">
                    {s.label} ({s.pct}%)
                  </span>
                  <span className="tabular-nums">{s.fourYear}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Milestone tracker</CardTitle>
          <p className="text-xs text-muted-foreground">
            Next milestone: <span className="text-prism-amber font-medium">{money(nextMilestone)}</span>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {MILESTONES.map((m) => {
            const p = projectMilestone(m, current, projection, inputs.currentAge);
            return (
              <div key={m} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium flex items-center gap-2">
                    {money(m)}
                    {p.reached && <Badge className="bg-prism-amber text-background text-[10px]">Reached</Badge>}
                  </span>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {p.progressPct.toFixed(2)}% · {money(p.remaining)} remaining
                  </span>
                </div>
                <Progress value={p.progressPct} className="h-1.5 mt-2" />
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {p.reached
                    ? 'Milestone achieved.'
                    : p.projectedYear
                      ? `Projected ${p.projectedYear} at age ${p.projectedAge} · about ${p.yearsRemaining} years away`
                      : `Not reached by age ${inputs.targetAge} at ${inputs.expectedReturnPct}%`}
                </p>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Year-by-year projection</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-2 pr-3">Year</th>
                <th className="py-2 pr-3">Age</th>
                <th className="py-2 pr-3 text-right">Beginning</th>
                <th className="py-2 pr-3 text-right">Employee</th>
                <th className="py-2 pr-3 text-right">Employer</th>
                <th className="py-2 pr-3 text-right">Growth</th>
                <th className="py-2 pr-3 text-right">Ending</th>
                <th className="py-2 text-right">Today's $</th>
              </tr>
            </thead>
            <tbody>
              {projection.map((r) => (
                <tr key={r.year} className="border-b border-border/50">
                  <td className="py-1.5 pr-3">{r.year}</td>
                  <td className="py-1.5 pr-3">{r.age}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.beginningBalance)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.contributions)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{money(r.employerContributions)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums text-emerald-500">{money(r.growth)}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums font-medium">{money(r.endingBalance)}</td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{money(r.realEndingBalance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  step = '1',
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      />
    </div>
  );
}

function Tile({ label, value, gold, green }: { label: string; value: string; gold?: boolean; green?: boolean }) {
  return (
    <div
      className={`rounded-lg border p-3 ${
        gold ? 'border-prism-amber/40 bg-prism-amber/10' : green ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border bg-card/60'
      }`}
    >
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold tabular-nums mt-0.5 ${gold ? 'text-prism-amber' : green ? 'text-emerald-500' : 'text-foreground'}`}>
        {value}
      </p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums font-medium">{value}</span>
    </div>
  );
}
