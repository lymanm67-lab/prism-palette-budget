import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { simulate, type SimInputs } from '@/lib/legacy/monteCarloSim';
import { useHundredYearScenarios, useSaveHundredYearScenario, useLegacyWorth } from '@/hooks/use-financial-os';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, Legend, BarChart, Bar } from 'recharts';
import { Save, Sparkles } from 'lucide-react';

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);

export function HundredYearSimulator() {
  const { data: lw } = useLegacyWorth();
  const { data: scenarios } = useHundredYearScenarios();
  const save = useSaveHundredYearScenario();

  const [horizon, setHorizon] = useState(100);
  const [expectedReturn, setExpectedReturn] = useState(0.07);
  const [stdDev, setStdDev] = useState(0.15);
  const [inflation, setInflation] = useState(0.03);
  const [taxRate, setTaxRate] = useState(0.15);
  const [distributionPct, setDistributionPct] = useState(0.03);
  const [charitablePct, setCharitablePct] = useState(0.1);
  const [additionalContrib, setAdditionalContrib] = useState(10000);
  const [contribGrowth, setContribGrowth] = useState(0.03);
  const [businessGrowth, setBusinessGrowth] = useState(0);
  const [lifeInsurance, setLifeInsurance] = useState(0);
  const [generations, setGenerations] = useState(3);
  const [name, setName] = useState('Baseline');

  const startingPrincipal = lw?.inputs.investableAssets ?? 100000;

  const result = useMemo(() => {
    const inputs: SimInputs = {
      startingPrincipal, horizonYears: horizon, expectedReturn, returnStdDev: stdDev,
      inflation, taxRate, annualDistributionPct: distributionPct, charitablePct,
      additionalContribution: additionalContrib, contributionGrowth: contribGrowth,
      businessGrowth, lifeInsuranceProceeds: lifeInsurance, generations, runs: 300,
    };
    return simulate(inputs);
  }, [startingPrincipal, horizon, expectedReturn, stdDev, inflation, taxRate, distributionPct, charitablePct, additionalContrib, contribGrowth, businessGrowth, lifeInsurance, generations]);

  const chartData = useMemo(() => {
    return result.meanPath.map((mean, y) => ({
      year: y,
      mean,
      p10: result.p10Path[y],
      p90: result.p90Path[y],
    }));
  }, [result]);

  const tornado = useMemo(() => result.tornado?.map(t => ({
    label: t.input, high: t.impactHigh, low: t.impactLow,
  })) || [], [result]);

  return (
    <div className="space-y-6">
      {/* Inputs */}
      <Card>
        <CardHeader><CardTitle className="text-base">Assumptions</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <SliderField label="Horizon (yrs)" value={horizon} min={25} max={100} step={25} onChange={setHorizon} display={String(horizon)} />
            <SliderField label="Expected return" value={expectedReturn * 100} min={2} max={12} step={0.5} onChange={v => setExpectedReturn(v / 100)} display={`${(expectedReturn * 100).toFixed(1)}%`} />
            <SliderField label="Volatility (σ)" value={stdDev * 100} min={5} max={25} step={1} onChange={v => setStdDev(v / 100)} display={`${(stdDev * 100).toFixed(0)}%`} />
            <SliderField label="Inflation" value={inflation * 100} min={0} max={8} step={0.25} onChange={v => setInflation(v / 100)} display={`${(inflation * 100).toFixed(2)}%`} />
            <SliderField label="Tax drag" value={taxRate * 100} min={0} max={40} step={1} onChange={v => setTaxRate(v / 100)} display={`${(taxRate * 100).toFixed(0)}%`} />
            <SliderField label="Annual distribution" value={distributionPct * 100} min={0} max={8} step={0.25} onChange={v => setDistributionPct(v / 100)} display={`${(distributionPct * 100).toFixed(2)}%`} />
            <SliderField label="Charitable share of distributions" value={charitablePct * 100} min={0} max={100} step={5} onChange={v => setCharitablePct(v / 100)} display={`${(charitablePct * 100).toFixed(0)}%`} />
            <SliderField label="Generations to plan" value={generations} min={1} max={5} step={1} onChange={setGenerations} display={String(generations)} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><Label className="text-xs">Annual contribution</Label><Input type="number" value={additionalContrib} onChange={e => setAdditionalContrib(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Contribution growth</Label><Input type="number" step="0.005" value={contribGrowth} onChange={e => setContribGrowth(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Business injection (every 10y)</Label><Input type="number" value={businessGrowth} onChange={e => setBusinessGrowth(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Life insurance @ y25</Label><Input type="number" value={lifeInsurance} onChange={e => setLifeInsurance(Number(e.target.value) || 0)} /></div>
            <div><Label className="text-xs">Starting principal (auto)</Label><Input type="number" value={startingPrincipal} disabled /></div>
            <div>
              <Label className="text-xs">Scenario name</Label>
              <Input value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatTile label="Nominal FV" value={fmt(result.nominalFv)} />
        <StatTile label="Real (today's $)" value={fmt(result.realFv)} />
        <StatTile label="Principal preserved" value={`${(result.probabilityPreserved * 100).toFixed(0)}%`} />
        <StatTile label="Generations supported" value={String(result.generationsSupported)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Projected wealth path (mean + 10th/90th percentile)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData}>
              <XAxis dataKey="year" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => fmt(Number(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="p90" stroke="hsl(var(--prism-teal))" fill="hsl(var(--prism-teal))" fillOpacity={0.15} name="90th pct" />
              <Area type="monotone" dataKey="mean" stroke="hsl(var(--prism-amber))" fill="hsl(var(--prism-amber))" fillOpacity={0.3} name="Mean" />
              <Area type="monotone" dataKey="p10" stroke="hsl(var(--prism-rose))" fill="hsl(var(--prism-rose))" fillOpacity={0.1} name="10th pct" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {tornado.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Assumption sensitivity (±20%)</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={tornado} layout="vertical">
                <XAxis type="number" tickFormatter={(v) => fmt(v)} tick={{ fontSize: 10 }} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10 }} width={130} />
                <Tooltip formatter={(v: any) => fmt(Number(v))} />
                <Bar dataKey="low" fill="hsl(var(--prism-rose))" />
                <Bar dataKey="high" fill="hsl(var(--prism-teal))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={() => save.mutate({
          name, horizon_years: horizon,
          inputs: { expectedReturn, stdDev, inflation, taxRate, distributionPct, charitablePct, additionalContrib, contribGrowth, businessGrowth, lifeInsurance, generations, startingPrincipal },
          results: { nominalFv: result.nominalFv, realFv: result.realFv, probabilityPreserved: result.probabilityPreserved, generationsSupported: result.generationsSupported },
        })} disabled={save.isPending}>
          <Save className="h-3.5 w-3.5 mr-1.5" /> Save scenario
        </Button>
      </div>

      {scenarios && scenarios.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Saved scenarios</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {scenarios.map((s: any) => (
              <div key={s.id} className="flex items-center justify-between text-sm p-2 rounded border border-border/40">
                <span className="font-medium">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {s.horizon_years}y · {fmt(Number(s.results?.nominalFv || 0))} · {((s.results?.probabilityPreserved || 0) * 100).toFixed(0)}% preserved
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SliderField({ label, value, min, max, step, onChange, display }: any) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <Label>{label}</Label>
        <span className="text-muted-foreground">{display}</span>
      </div>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([v]) => onChange(v)} />
    </div>
  );
}
function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
