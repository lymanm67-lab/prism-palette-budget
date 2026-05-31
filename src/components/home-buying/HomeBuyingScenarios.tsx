import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Plus, X, GitCompare } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { STATE_DATA } from '@/lib/state-data';
import { calcMortgage, buildEquityCurve, fmt$, type MortgageInputs } from '@/lib/home-buying/mortgage-math';

interface Scenario extends MortgageInputs { id: string; name: string; state: string; }

const COLORS = ['hsl(var(--prism-teal))', 'hsl(var(--prism-amber))', 'hsl(var(--prism-indigo))'];

const makeScenario = (n: number, state = 'OH'): Scenario => {
  const s = STATE_DATA[state];
  return {
    id: crypto.randomUUID(),
    name: `Scenario ${n}`,
    state,
    price: 350000,
    downPct: 10,
    ratePct: 7.0,
    termYears: 30,
    propertyTaxPct: s.propertyTax,
    insurancePct: s.insurance,
    hoaMonthly: 0,
    pmiPct: 0.5,
  };
};

export default function HomeBuyingScenarios() {
  const [scenarios, setScenarios] = useState<Scenario[]>([makeScenario(1), makeScenario(2)]);

  const update = (id: string, patch: Partial<Scenario>) => {
    setScenarios((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      const merged = { ...s, ...patch };
      if (patch.state && patch.state !== s.state) {
        const st = STATE_DATA[patch.state];
        merged.propertyTaxPct = st.propertyTax;
        merged.insurancePct = st.insurance;
      }
      return merged;
    }));
  };

  const chartData = useMemo(() => {
    const curves = scenarios.map((s) => buildEquityCurve(s));
    const maxYears = Math.max(...curves.map((c) => c.length));
    return Array.from({ length: maxYears }, (_, i) => {
      const row: Record<string, number> = { year: i + 1 };
      curves.forEach((c, idx) => {
        if (c[i]) row[scenarios[idx].name] = Math.round(c[i].equity);
      });
      return row;
    });
  }, [scenarios]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-xl font-bold flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-prism-teal" />
          Compare Scenarios
        </h3>
        {scenarios.length < 3 && (
          <Button size="sm" variant="outline" onClick={() => setScenarios((s) => [...s, makeScenario(s.length + 1)])}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Scenario
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {scenarios.map((s, idx) => {
          const m = calcMortgage(s);
          return (
            <Card key={s.id} className="prism-card-shine border-border/50">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <Input
                  value={s.name}
                  onChange={(e) => update(s.id, { name: e.target.value })}
                  className="h-7 text-sm font-display font-bold border-0 px-0 focus-visible:ring-0"
                />
                {scenarios.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setScenarios((prev) => prev.filter((p) => p.id !== s.id))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-[10px]">Price</Label><Input className="h-8" type="number" value={s.price} onChange={(e) => update(s.id, { price: +e.target.value })} /></div>
                  <div><Label className="text-[10px]">Down %</Label><Input className="h-8" type="number" value={s.downPct} onChange={(e) => update(s.id, { downPct: +e.target.value })} /></div>
                  <div><Label className="text-[10px]">Rate %</Label><Input className="h-8" type="number" step="0.05" value={s.ratePct} onChange={(e) => update(s.id, { ratePct: +e.target.value })} /></div>
                  <div><Label className="text-[10px]">Term (yrs)</Label><Input className="h-8" type="number" value={s.termYears} onChange={(e) => update(s.id, { termYears: +e.target.value })} /></div>
                  <div className="col-span-2">
                    <Label className="text-[10px]">State</Label>
                    <Select value={s.state} onValueChange={(v) => update(s.id, { state: v })}>
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-[10px]">HOA/mo</Label><Input className="h-8" type="number" value={s.hoaMonthly} onChange={(e) => update(s.id, { hoaMonthly: +e.target.value })} /></div>
                  <div><Label className="text-[10px]">Tax %</Label><Input className="h-8" type="number" step="0.01" value={s.propertyTaxPct} onChange={(e) => update(s.id, { propertyTaxPct: +e.target.value })} /></div>
                </div>

                <div className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">P&I</span><span className="font-mono">{fmt$(m.monthlyPI)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax + Ins + PMI + HOA</span><span className="font-mono">{fmt$(m.monthlyTax + m.monthlyInsurance + m.monthlyPmi + m.monthlyHoa)}</span></div>
                  <div className="flex justify-between text-sm pt-1.5 border-t border-border/30">
                    <span className="font-display font-bold">Total PITI</span>
                    <span className="font-display font-bold prism-gradient-text">{fmt$(m.monthlyPITI)}/mo</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Total Interest</span><span className="font-mono">{fmt$(m.totalInterest)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2"><CardTitle className="text-sm font-display">Equity Build-Up (per scenario)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis dataKey="year" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} />
                <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmt$(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }} />
                <Legend />
                {scenarios.map((s, i) => (
                  <Line key={s.id} type="monotone" dataKey={s.name} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
