import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function ordTax(income: number, filing: 'single' | 'mfj') {
  const cuts = filing === 'single'
    ? [11925, 48475, 103350, 197300, 250525, 626350]
    : [23850, 96950, 206700, 394600, 501050, 751600];
  const rates = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
  let tax = 0, prev = 0;
  for (let i = 0; i < rates.length; i++) {
    const top = i < cuts.length ? cuts[i] : Infinity;
    if (income <= prev) break;
    tax += (Math.min(income, top) - prev) * rates[i];
    prev = top;
    if (income <= top) break;
  }
  return tax;
}

const STD_DED = { single: 15000, mfj: 30000 };

export default function SelfEmployedTaxCalculator() {
  const [gross, setGross] = useState(120000);
  const [expenses, setExpenses] = useState(20000);
  const [otherIncome, setOtherIncome] = useState(0);
  const [filing, setFiling] = useState<'single' | 'mfj'>('single');
  const [stateRate, setStateRate] = useState(5);

  const r = useMemo(() => {
    const netSE = Math.max(0, gross - expenses);
    // SE tax: 15.3% on 92.35% of net SE earnings, up to SS wage base $176,100 (2025)
    const seBase = netSE * 0.9235;
    const ssTax = Math.min(seBase, 176_100) * 0.124;
    const medicare = seBase * 0.029;
    const seTax = ssTax + medicare;
    const halfSE = seTax / 2;
    // Federal income tax on: netSE + otherIncome - halfSE - std deduction - 20% QBI on netSE (simplified)
    const qbi = netSE * 0.20;
    const taxable = Math.max(0, netSE + otherIncome - halfSE - STD_DED[filing] - qbi);
    const fed = ordTax(taxable, filing);
    const state = Math.max(0, netSE + otherIncome) * (stateRate / 100);
    const total = seTax + fed + state;
    const quarterly = total / 4;
    return { netSE, seTax, fed, state, total, quarterly, taxable, halfSE };
  }, [gross, expenses, otherIncome, filing, stateRate]);

  const dates = ['Apr 15', 'Jun 15', 'Sep 15', 'Jan 15'];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Self-Employed Quarterly Tax (1099)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Gross 1099 income</Label><Input type="number" value={gross} onChange={e => setGross(+e.target.value)} /></div>
          <div><Label>Business expenses</Label><Input type="number" value={expenses} onChange={e => setExpenses(+e.target.value)} /></div>
          <div><Label>Other W-2 / spouse income</Label><Input type="number" value={otherIncome} onChange={e => setOtherIncome(+e.target.value)} /></div>
          <div>
            <Label>Filing status</Label>
            <Select value={filing} onValueChange={v => setFiling(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="mfj">Married filing jointly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>State tax rate (%)</Label><Input type="number" value={stateRate} onChange={e => setStateRate(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Estimated quarterly payment</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.quarterly)}</div>
          <div className="text-xs text-muted-foreground mt-1">Total annual tax: <strong>{fmt(r.total)}</strong> · Effective rate: <strong>{r.netSE > 0 ? ((r.total / r.netSE) * 100).toFixed(1) : 0}%</strong></div>
        </div>

        <div className="grid md:grid-cols-3 gap-2 text-sm">
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Self-employment tax (15.3%)</div><div className="font-semibold">{fmt(r.seTax)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Federal income tax</div><div className="font-semibold">{fmt(r.fed)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">State</div><div className="font-semibold">{fmt(r.state)}</div></div>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">2026 Estimated Payment Schedule</div>
          <div className="grid grid-cols-4 gap-2">
            {dates.map((d, i) => (
              <div key={d} className="rounded border p-2 text-center">
                <div className="text-xs text-muted-foreground">Q{i + 1} — {d}</div>
                <div className="font-semibold text-sm">{fmt(r.quarterly)}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Includes SE tax (Social Security + Medicare), federal income tax with simplified 20% QBI deduction, and half-SE deduction. Excludes local tax, credits, and additional Medicare surtax on high earners. Pay via IRS Direct Pay or Form 1040-ES.</div>
      </CardContent>
    </Card>
  );
}
