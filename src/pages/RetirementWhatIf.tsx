import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceArea, CartesianGrid, Legend, BarChart, Bar,
} from 'recharts';
import { ageFromDob, DEFAULT_PHASES, project, ssMonthly, type Phases, type WhatIfInputs } from '@/lib/retirement/whatIf';
import { STATE_TAX } from '@/lib/retirement/stateTax';

const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const LYMAN_AGE = ageFromDob('1967-06-25');
const KATERI_AGE = ageFromDob('1970-08-25');
const COLORS = ['hsl(var(--primary))', 'hsl(var(--prism-amber, 38 92% 50%))', 'hsl(var(--chart-2, 160 70% 40%))', 'hsl(var(--prism-violet, 262 83% 65%))'];
const tooltipStyle = { backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--popover-foreground))' };

function SliderRow({ label, value, min, max, step = 1, onChange, fmt = String }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm"><span>{label}</span><span className="font-semibold">{fmt(value)}</span></div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0])} aria-label={label} />
    </div>
  );
}

function Num({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

export default function RetirementWhatIf() {
  const [retireAges, setRetireAges] = useState([70, 75, 80, 85]);
  const [kateriRetire, setKateriRetire] = useState(65);
  const [life, setLife] = useState(100);
  const [ssAge, setSsAge] = useState(67);
  const [phases, setPhases] = useState<Phases>(DEFAULT_PHASES);
  const [portfolio, setPortfolio] = useState(184602);
  const [contrib, setContrib] = useState(12000);
  const [spending, setSpending] = useState(48000);
  const [medical, setMedical] = useState(7000);
  const [otherIncome, setOtherIncome] = useState(0);
  const [ret, setRet] = useState(6);
  const [homeValue, setHomeValue] = useState(185000);
  const [compareStates, setCompareStates] = useState(['OH', 'FL', 'TX', 'TN']);

  const baseInputs = (retireAge: number, state = 'OH'): WhatIfInputs => ({
    currentAge: LYMAN_AGE, retireAge, lifeExpectancy: life, ssClaimAge: ssAge, portfolio,
    annualContribution: contrib, annualReturn: ret / 100, inflation: 0.025, baseSpending: spending,
    medicalSpending: medical, medicalInflation: 0.05, otherIncome, phases, state, homeValue,
  });

  const scenarios = useMemo(() => retireAges.map((a) => ({ age: a, r: project(baseInputs(a)) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [retireAges, life, ssAge, phases, portfolio, contrib, spending, medical, otherIncome, ret, homeValue]);

  const chart = scenarios[0].r.rows.map((row, i) => {
    const o: Record<string, number> = { age: row.age };
    scenarios.forEach((s, k) => { o[`s${k}`] = Math.round(s.r.rows[i].balance); });
    o.spend = Math.round(scenarios[1]?.r.rows[i].spending + scenarios[1]?.r.rows[i].medical);
    o.income = Math.round(scenarios[1]?.r.rows[i].socialSecurity + scenarios[1]?.r.rows[i].otherIncome);
    return o;
  });

  const stateResults = useMemo(() => compareStates.map((code) => {
    const r = project(baseInputs(retireAges[1], code));
    const yrs = r.rows.filter((x) => x.phase !== 'Working').length || 1;
    return { code, name: STATE_TAX.find((s) => s.code === code)!.name, r, perYear: r.lifetimeStateTax / yrs };
  }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [compareStates, retireAges, life, ssAge, phases, portfolio, contrib, spending, medical, otherIncome, ret, homeValue]);
  const ohio = stateResults.find((s) => s.code === 'OH');

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-xl font-semibold">What-If Lab</h2>
        <p className="text-sm text-muted-foreground">
          Try different retirement ages, spending phases and states. Nothing here is saved or changes your real plan.
          Ages from birthdays: Lyman {LYMAN_AGE}, Kateri {KATERI_AGE}.
        </p>
        <p className="text-sm mt-1">
          Goal: live on Social Security + Kateri's pension and leave retirement accounts untouched. Each scenario shows whether that income covers spending
          {otherIncome === 0 && <span className="text-prism-amber"> — enter Kateri's yearly pension below to test it</span>}.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Starting figures (edit to test)</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Num label="Portfolio today" value={portfolio} onChange={setPortfolio} />
          <Num label="Yearly contributions until retirement" value={contrib} onChange={setContrib} />
          <Num label="Base retirement spending / yr (today's $)" value={spending} onChange={setSpending} />
          <Num label="Medical costs / yr (today's $)" value={medical} onChange={setMedical} />
          <Num label="Kateri's pension / yr (today's $)" value={otherIncome} onChange={setOtherIncome} />
          <Num label="Expected return %" value={ret} onChange={setRet} />
          <Num label="Home value (property tax)" value={homeValue} onChange={setHomeValue} />
        </CardContent>
      </Card>

      {/* 1. Timeline sliders */}
      <Card>
        <CardHeader><CardTitle className="text-base">1. What-if timeline</CardTitle></CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            {retireAges.map((a, k) => (
              <SliderRow key={k} label={`Scenario ${String.fromCharCode(65 + k)}: Lyman retires at`} value={a} min={55} max={85}
                onChange={(v) => setRetireAges((p) => p.map((x, j) => (j === k ? v : x)))} />
            ))}
            <SliderRow label="Kateri retires at (reference)" value={kateriRetire} min={55} max={70} onChange={setKateriRetire} />
            <SliderRow label="Life expectancy" value={life} min={85} max={100} onChange={setLife} />
            <SliderRow label="Social Security claim age" value={ssAge} min={62} max={70} onChange={setSsAge}
              fmt={(v) => `${v} · ${usd(ssMonthly(v))}/mo`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {scenarios.map((s, k) => (
              <div key={k} className="rounded-lg border bg-card/60 p-3 text-sm">
                <p className="font-semibold">Scenario {String.fromCharCode(65 + k)} · retire at {s.age}</p>
                <p className="mt-1">Money lasts: {s.r.depletionAge ? <Badge variant="destructive">runs out at {s.r.depletionAge}</Badge> : <Badge>through age {life}</Badge>}</p>
                {(() => {
                  const gaps = s.r.rows.filter((x) => x.withdrawal > 0.5);
                  return gaps.length === 0
                    ? <p className="mt-1"><Badge variant="secondary">No retirement withdrawals needed</Badge></p>
                    : <p className="mt-1 text-xs text-muted-foreground">Social Security + pension fall short from age {gaps[0].age} by {usd(gaps[0].withdrawal)}/yr — that gap would be pulled from savings.</p>;
                })()}
                <p className="text-muted-foreground mt-1">Left at {life}: {usd(s.r.endingBalance)}</p>
              </div>
            ))}
          </div>

          <div className="h-80">
            <ResponsiveContainer>
              <ComposedChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <ReferenceArea x1={retireAges[1]} x2={phases.goGoEnd} fill="hsl(var(--primary))" fillOpacity={0.06} label={{ value: 'Go-Go', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <ReferenceArea x1={phases.goGoEnd + 1} x2={phases.slowGoEnd} fill="hsl(var(--primary))" fillOpacity={0.12} label={{ value: 'Slow-Go', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <ReferenceArea x1={phases.slowGoEnd + 1} x2={life} fill="hsl(var(--primary))" fillOpacity={0.18} label={{ value: 'No-Go', fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <XAxis dataKey="age" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${Math.round(v / 1000)}k`} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => usd(v)} />
                <Legend />
                {scenarios.map((s, k) => (
                  <Line key={k} dataKey={`s${k}`} name={`Balance · retire ${s.age}`} stroke={COLORS[k]} dot={false} strokeWidth={2} />
                ))}
                <Area dataKey="spend" name={`Spending (B)`} fill="hsl(var(--destructive))" stroke="hsl(var(--destructive))" fillOpacity={0.15} />
                <Area dataKey="income" name={`SS + other income (B)`} fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.15} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 2. Phases */}
      <Card>
        <CardHeader><CardTitle className="text-base">2. Spending phases (Go-Go / Slow-Go / No-Go)</CardTitle></CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <SliderRow label="Go-Go ends at age" value={phases.goGoEnd} min={65} max={85} onChange={(v) => setPhases({ ...phases, goGoEnd: v, slowGoEnd: Math.max(v + 1, phases.slowGoEnd) })} />
          <SliderRow label="Slow-Go ends at age" value={phases.slowGoEnd} min={phases.goGoEnd + 1} max={95} onChange={(v) => setPhases({ ...phases, slowGoEnd: v })} />
          <SliderRow label="Go-Go spending (travel, active)" value={Math.round(phases.goGoPct * 100)} min={70} max={150} fmt={(v) => `${v}%`} onChange={(v) => setPhases({ ...phases, goGoPct: v / 100 })} />
          <SliderRow label="Slow-Go spending" value={Math.round(phases.slowGoPct * 100)} min={50} max={120} fmt={(v) => `${v}%`} onChange={(v) => setPhases({ ...phases, slowGoPct: v / 100 })} />
          <SliderRow label="No-Go spending (plus 1.5× medical)" value={Math.round(phases.noGoPct * 100)} min={40} max={120} fmt={(v) => `${v}%`} onChange={(v) => setPhases({ ...phases, noGoPct: v / 100 })} />
          <p className="text-xs text-muted-foreground self-end">
            Percentages are of your base retirement spending. Medical costs grow 5%/yr (other costs 2.5%) and rise 50% in No-Go years.
          </p>
        </CardContent>
      </Card>

      {/* 3. State relocation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">3. State relocation tax comparison</CardTitle>
          <p className="text-xs text-muted-foreground">Uses Scenario B (retire at {retireAges[1]}). Estimate — verify with a tax advisor.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATE_TAX.map((s) => {
              const on = compareStates.includes(s.code);
              return (
                <button key={s.code} onClick={() => setCompareStates((p) => on ? p.filter((c) => c !== s.code || c === 'OH') : [...p, s.code])}
                  className={`rounded-full border px-3 py-1 text-xs ${on ? 'bg-primary text-primary-foreground border-primary' : 'text-muted-foreground'}`}>
                  {s.name}
                </button>
              );
            })}
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={stateResults.map((s) => ({ name: s.name, tax: Math.round(s.perYear) }))}>
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => `$${v}`} width={60} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => usd(v)} />
                <Bar dataKey="tax" name="Avg state + property tax / yr" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground text-xs">
                <tr><th className="text-left py-1">State</th><th className="text-right">Avg tax / yr</th><th className="text-right">Lifetime tax</th><th className="text-right">vs Ohio (lifetime)</th><th className="text-right">Money lasts</th></tr>
              </thead>
              <tbody>
                {stateResults.map((s) => {
                  const diff = ohio ? ohio.r.lifetimeStateTax - s.r.lifetimeStateTax : 0;
                  return (
                    <tr key={s.code} className="border-t">
                      <td className="py-1">{s.name}</td>
                      <td className="text-right">{usd(s.perYear)}</td>
                      <td className="text-right">{usd(s.r.lifetimeStateTax)}</td>
                      <td className={`text-right ${diff > 0 ? 'text-primary' : diff < 0 ? 'text-destructive' : ''}`}>{diff === 0 ? '—' : `${diff > 0 ? 'saves ' : 'costs '}${usd(Math.abs(diff))}`}</td>
                      <td className="text-right">{s.r.depletionAge ? `to ${s.r.depletionAge}` : `past ${life}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
