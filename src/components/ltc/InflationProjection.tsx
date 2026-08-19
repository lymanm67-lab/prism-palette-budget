import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { benefitAtYear, careCostAtAge, inflationFactor, type LtcState } from '@/lib/ltc/model';
import { money, Note, Field, NumField } from './shared';

export function InflationProjection({ state }: { state: LtcState }) {
  const h = state.household;
  const current = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];

  const [startBenefit, setStartBenefit] = useState(current?.startingMonthlyBenefit ?? 2100);
  const [startPool, setStartPool] = useState(current?.poolEach ?? 75600);
  const [inflPct, setInflPct] = useState(current?.inflationPct ?? 3);
  const [compound, setCompound] = useState(current?.inflationCompound ?? true);
  const [currentAge, setCurrentAge] = useState(h.lymanAge);
  const [targetAge, setTargetAge] = useState(85);

  const policyLike = useMemo(() => ({
    ...(current || ({} as any)),
    startingMonthlyBenefit: startBenefit, poolEach: startPool,
    inflationPct: inflPct, inflationCompound: compound, inflationLifetime: true,
  }), [current, startBenefit, startPool, inflPct, compound]);

  const yearRows = [1, 5, 10, 15, 20, 25, 30].map((y) => benefitAtYear(policyLike as any, y));
  const ageRows = [65, 70, 75, 80, 85, 90].map((age) => {
    const years = Math.max(0, age - currentAge);
    const f = inflationFactor(inflPct, years, compound);
    return {
      age,
      monthly: startBenefit * f,
      pool: startPool * f,
      cost: careCostAtAge(h, currentAge, age),
    };
  });

  const chartData = Array.from({ length: Math.max(1, targetAge - currentAge + 1) }, (_, i) => {
    const age = currentAge + i;
    return {
      age,
      benefit: Math.round(startBenefit * inflationFactor(inflPct, i, compound)),
      cost: Math.round(careCostAtAge(h, currentAge, age)),
    };
  });

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Inflation Projection Calculator</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <Field label="Starting monthly benefit"><NumField value={startBenefit} onChange={setStartBenefit} /></Field>
          <Field label="Starting benefit pool"><NumField value={startPool} onChange={setStartPool} /></Field>
          <Field label="Inflation %"><NumField value={inflPct} onChange={setInflPct} step="0.1" /></Field>
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wide text-muted-foreground block">Compound</span>
            <div className="flex items-center gap-2 h-10">
              <Switch checked={compound} onCheckedChange={setCompound} />
              <span className="text-xs">{compound ? 'Compound' : 'Simple'}</span>
            </div>
          </div>
          <Field label="Current age"><NumField value={currentAge} onChange={setCurrentAge} /></Field>
          <Field label="Target age"><NumField value={targetAge} onChange={setTargetAge} /></Field>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Benefit and pool growth by policy year</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Year</th><th className="py-2">Monthly benefit</th><th className="py-2">Policy limit</th>
                </tr>
              </thead>
              <tbody>
                {yearRows.map((r) => (
                  <tr key={r.year} className="border-b border-border/30">
                    <td className="py-1.5">Year {r.year}</td>
                    <td className="py-1.5 tabular-nums font-semibold">{money(r.monthlyBenefit)}</td>
                    <td className="py-1.5 tabular-nums">{money(r.pool)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Benefit vs {h.city} care cost by age</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Age</th><th className="py-2">Benefit</th><th className="py-2">Pool</th><th className="py-2">Care cost</th>
                </tr>
              </thead>
              <tbody>
                {ageRows.map((r) => (
                  <tr key={r.age} className="border-b border-border/30">
                    <td className="py-1.5">{r.age}</td>
                    <td className="py-1.5 tabular-nums font-semibold">{money(r.monthly)}</td>
                    <td className="py-1.5 tabular-nums">{money(r.pool)}</td>
                    <td className="py-1.5 tabular-nums text-muted-foreground">{money(r.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Projected LTC benefit vs projected LTC cost</CardTitle></CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
              <Tooltip formatter={(v: number) => money(v)} labelFormatter={(l) => `Age ${l}`} />
              <Legend />
              <Line type="monotone" dataKey="benefit" name="LTC benefit" stroke="hsl(var(--prism-lime))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cost" name="Care cost" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Note>
        Benefit growth uses the policy inflation rider; care cost growth uses the {h.careCostGrowthPct}% assumption on the
        Care Cost Gap tab. A crossing point is expected — the plan transfers the largest share of the risk, not all of it.
      </Note>
    </div>
  );
}
