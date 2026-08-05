import { useMemo, useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Save, Info } from 'lucide-react';
import {
  DEFAULT_SUSTAINABILITY,
  projectSustainability,
  COST_LINES,
  DEFAULT_COSTS,
  costRollup,
  FUNDING_SOURCES,
  emptyFundingRow,
  money,
  type SustainabilityInputs,
  type FundingRow,
} from '@/lib/legacy/foundationReadiness';
import { useFdnReadinessState } from '@/hooks/use-foundation-readiness';

const FIELDS: { key: keyof SustainabilityInputs; label: string; suffix?: string }[] = [
  { key: 'assets', label: 'Foundation assets' },
  { key: 'annualContributions', label: 'Annual contributions' },
  { key: 'returnRate', label: 'Expected investment return', suffix: '%' },
  { key: 'adminExpenses', label: 'Administrative expenses' },
  { key: 'expectedGrants', label: 'Expected grants' },
  { key: 'inflationRate', label: 'Inflation rate', suffix: '%' },
  { key: 'growthRate', label: 'Projected contribution growth', suffix: '%' },
];

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export default function SustainabilityTab() {
  const { state, patch, isSaving } = useFdnReadinessState();

  const [inputs, setInputs] = useState<SustainabilityInputs>({
    ...DEFAULT_SUSTAINABILITY,
    ...((state.sustainability ?? {}) as any),
  });
  const [costs, setCosts] = useState<Record<string, number>>({ ...DEFAULT_COSTS, ...(state.costs ?? {}) });
  const [funding, setFunding] = useState<Record<string, FundingRow>>(() => {
    const base: Record<string, FundingRow> = {};
    FUNDING_SOURCES.forEach((s) => (base[s] = { ...emptyFundingRow(), ...((state.funding ?? {})[s] ?? {}) }));
    return base;
  });
  const [horizon, setHorizon] = useState('30');

  // Hydrate once saved data arrives.
  useEffect(() => {
    if (state.sustainability) setInputs((p) => ({ ...p, ...(state.sustainability as any) }));
    if (state.costs) setCosts((p) => ({ ...p, ...state.costs }));
    if (state.funding) {
      setFunding((p) => {
        const next = { ...p };
        Object.entries(state.funding as any).forEach(([k, v]) => (next[k] = { ...next[k], ...(v as any) }));
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sustainability, state.costs, state.funding]);

  const result = useMemo(() => projectSustainability(inputs, 30), [inputs]);
  const cost = useMemo(() => costRollup(costs, inputs.expectedGrants, inputs.inflationRate), [
    costs,
    inputs.expectedGrants,
    inputs.inflationRate,
  ]);

  const years = Number(horizon);
  const chartData = result.series.slice(0, years).map((s) => ({
    year: `Y${s.year}`,
    Endowment: s.assets,
    Grants: s.grants,
    Admin: s.admin,
  }));

  const fundingTotals = FUNDING_SOURCES.reduce(
    (acc, s) => {
      acc.current += Number(funding[s]?.current) || 0;
      acc.annual += Number(funding[s]?.annualGoal) || 0;
      acc.lifetime += Number(funding[s]?.lifetimeGoal) || 0;
      return acc;
    },
    { current: 0, annual: 0, lifetime: 0 },
  );

  const saveAll = () =>
    patch({
      sustainability: inputs as any,
      costs,
      funding: funding as any,
    });

  return (
    <div className="space-y-6">
      <Card className="glass-card border-prism-teal/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Financial Sustainability Analyzer</CardTitle>
          <p className="text-xs text-muted-foreground">
            Model whether investment income plus annual contributions can carry administration and grantmaking over
            time. Planning illustration only.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label htmlFor={`fdn-sus-${f.key}`} className="text-xs">
                  {f.label} {f.suffix ? `(${f.suffix})` : ''}
                </Label>
                <Input
                  id={`fdn-sus-${f.key}`}
                  type="number"
                  value={inputs[f.key]}
                  onChange={(e) => setInputs({ ...inputs, [f.key]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={saveAll} disabled={isSaving}>
            <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save assumptions'}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Annual investment income" value={money(result.investmentIncome)} sub={`At ${inputs.returnRate}% return`} />
        <Stat
          label="Operating cost ratio"
          value={`${Math.round(result.operatingCostRatio * 100)}%`}
          sub="Administration ÷ (investment income + contributions)"
        />
        <Stat label="Grant capacity" value={money(result.grantCapacity)} sub="Available after administration" />
        <Stat
          label="Years of sustainability"
          value={result.yearsOfSustainability >= 99 ? '30+' : String(result.yearsOfSustainability)}
          sub={result.yearsOfSustainability >= 99 ? 'Assets hold across the 30-year projection' : 'Assets reach zero in this year'}
        />
        <Stat label={`Endowment at year ${years}`} value={money(result.endowmentAt(years))} sub="Projected growth" />
        <Stat
          label="Long-term grant potential"
          value={money(result.series.slice(0, years).reduce((s, x) => s + x.grants, 0))}
          sub={`Cumulative grants over ${years} years`}
        />
      </div>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-base">Projection</CardTitle>
          <Tabs value={horizon} onValueChange={setHorizon}>
            <TabsList>
              {['5', '10', '20', '30'].map((y) => (
                <TabsTrigger key={y} value={y} className="text-xs">
                  {y}y
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
              <XAxis dataKey="year" tick={{ fontSize: 11 }} className="!bg-transparent" />
              <YAxis
                tick={{ fontSize: 11 }}
                className="!bg-transparent"
                tickFormatter={(v) => `$${Math.round(Number(v) / 1000)}k`}
              />
              <Tooltip formatter={(v: any) => money(Number(v))} />
              <Area type="monotone" dataKey="Endowment" stroke="hsl(var(--primary))" fill="hsl(var(--primary) / 0.2)" />
              <Area type="monotone" dataKey="Grants" stroke="hsl(var(--chart-2, var(--primary)))" fill="transparent" />
              <Area type="monotone" dataKey="Admin" stroke="hsl(var(--destructive))" fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost estimator */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Foundation Cost Estimator</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {COST_LINES.map((l) => (
              <div key={l.key} className="space-y-1">
                <Label htmlFor={`fdn-cost-${l.key}`} className="text-xs">
                  {l.label}
                </Label>
                <Input
                  id={`fdn-cost-${l.key}`}
                  type="number"
                  value={costs[l.key] ?? 0}
                  onChange={(e) => setCosts({ ...costs, [l.key]: Number(e.target.value) })}
                />
              </div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Total annual operating cost" value={money(cost.total)} />
            <Stat
              label="Cost per dollar granted"
              value={cost.costPerDollarGranted ? `$${cost.costPerDollarGranted.toFixed(2)}` : '—'}
            />
            <Stat label="Administrative expense ratio" value={`${Math.round(cost.adminExpenseRatio * 100)}%`} />
            <Stat label="Projected 5-year cost" value={money(cost.fiveYear)} />
            <Stat label="Projected 10-year cost" value={money(cost.tenYear)} />
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={saveAll} disabled={isSaving}>
            <Save className="h-4 w-4" /> Save cost estimate
          </Button>
        </CardContent>
      </Card>

      {/* Funding strategy */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
            Funding Strategy Dashboard
            <span className="flex gap-2 text-xs font-normal text-muted-foreground">
              <Badge variant="secondary">Current {money(fundingTotals.current)}</Badge>
              <Badge variant="secondary">Annual goal {money(fundingTotals.annual)}</Badge>
              <Badge variant="secondary">Lifetime {money(fundingTotals.lifetime)}</Badge>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground">
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Current</th>
                  <th className="pb-2">Annual goal</th>
                  <th className="pb-2">Lifetime goal</th>
                  <th className="pb-2">Growth %</th>
                  <th className="pb-2">Pro reviewed</th>
                </tr>
              </thead>
              <tbody>
                {FUNDING_SOURCES.map((s) => {
                  const row = funding[s] ?? emptyFundingRow();
                  const set = (part: Partial<FundingRow>) => setFunding({ ...funding, [s]: { ...row, ...part } });
                  return (
                    <tr key={s} className="border-t border-border/40">
                      <td className="py-2 pr-3">{s}</td>
                      {(['current', 'annualGoal', 'lifetimeGoal', 'growthRate'] as const).map((k) => (
                        <td key={k} className="py-1.5 pr-3">
                          <Input
                            type="number"
                            aria-label={`${s} ${k}`}
                            className="h-8 w-28"
                            value={row[k]}
                            onChange={(e) => set({ [k]: Number(e.target.value) } as any)}
                          />
                        </td>
                      ))}
                      <td className="py-1.5">
                        <Switch
                          checked={row.reviewed}
                          aria-label={`${s} professionally reviewed`}
                          onCheckedChange={(v) => set({ reviewed: v })}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={saveAll} disabled={isSaving}>
            <Save className="h-4 w-4" /> Save funding strategy
          </Button>
        </CardContent>
      </Card>

      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3 w-3 shrink-0" />
        Actual investment returns and administrative expenses vary. Planning illustrations only — not legal, tax,
        accounting, or investment advice.
      </p>
    </div>
  );
}
