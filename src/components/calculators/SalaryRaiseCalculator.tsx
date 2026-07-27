import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function SalaryRaiseCalculator() {
  const [current, setCurrent] = useState(85000);
  const [raisePct, setRaisePct] = useState(5);
  const [taxRate, setTaxRate] = useState(28);
  const [fica, setFica] = useState(7.65);
  const [inflation, setInflation] = useState(3);
  const [investPct, setInvestPct] = useState(50);
  const [years, setYears] = useState(20);
  const [investReturn, setInvestReturn] = useState(8);

  const r = useMemo(() => {
    const gross = current * (raisePct / 100);
    const takeHomeAdd = gross * (1 - (taxRate + fica) / 100);
    const realAdd = takeHomeAdd - current * (inflation / 100);
    const monthlyAdd = takeHomeAdd / 12;
    const invested = takeHomeAdd * (investPct / 100);
    // FV of annual invested amount growing at return over years
    const rr = investReturn / 100;
    const fv = rr > 0 ? invested * ((Math.pow(1 + rr, years) - 1) / rr) : invested * years;
    return { gross, takeHomeAdd, realAdd, monthlyAdd, invested, fv, newSalary: current + gross };
  }, [current, raisePct, taxRate, fica, inflation, investPct, years, investReturn]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Salary Raise Impact</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Current salary</Label><Input type="number" value={current} onChange={e => setCurrent(+e.target.value)} /></div>
          <div><Label>Raise (%)</Label><Input type="number" step="0.5" value={raisePct} onChange={e => setRaisePct(+e.target.value)} /></div>
          <div><Label>Marginal tax rate (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(+e.target.value)} /></div>
          <div><Label>FICA (%)</Label><Input type="number" step="0.1" value={fica} onChange={e => setFica(+e.target.value)} /></div>
          <div><Label>Inflation (%)</Label><Input type="number" step="0.1" value={inflation} onChange={e => setInflation(+e.target.value)} /></div>
          <div><Label>% of raise invested</Label><Input type="number" value={investPct} onChange={e => setInvestPct(+e.target.value)} /></div>
          <div><Label>Investment return (%)</Label><Input type="number" step="0.5" value={investReturn} onChange={e => setInvestReturn(+e.target.value)} /></div>
          <div><Label>Horizon (years)</Label><Input type="number" value={years} onChange={e => setYears(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Extra take-home per year</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.takeHomeAdd)}</div>
          <div className="text-xs text-muted-foreground mt-1">{fmt(r.monthlyAdd)}/mo · New salary: <strong>{fmt(r.newSalary)}</strong></div>
        </div>

        <div className="grid md:grid-cols-3 gap-2 text-sm">
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Gross raise</div><div className="font-semibold">{fmt(r.gross)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Real (inflation-adj.)</div><div className="font-semibold">{fmt(r.realAdd)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Invested per year</div><div className="font-semibold">{fmt(r.invested)}</div></div>
        </div>

        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium">If you invest {investPct}% of every raise dollar…</div>
          <div className="text-2xl font-bold text-primary mt-1">{fmt(r.fv)}</div>
          <div className="text-xs text-muted-foreground">in {years} years at {investReturn}% average return</div>
        </div>

        <div className="text-xs text-muted-foreground">Lifestyle-creep check: if you spend the whole raise, your real progress is only <strong>{fmt(r.realAdd)}</strong>/yr after inflation. Automate the invest slice before it hits checking.</div>
      </CardContent>
    </Card>
  );
}
