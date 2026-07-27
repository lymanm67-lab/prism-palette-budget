import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PiggyBank } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function CompoundInterestCalculator() {
  const [principal, setPrincipal] = useState(10000);
  const [monthly, setMonthly] = useState(500);
  const [years, setYears] = useState(20);
  const [rate, setRate] = useState(8);

  const r = useMemo(() => {
    const m = rate / 100 / 12;
    let bal = principal;
    const rows: { year: number; balance: number; contributed: number }[] = [];
    let contributed = principal;
    for (let y = 1; y <= years; y++) {
      for (let k = 0; k < 12; k++) {
        bal = bal * (1 + m) + monthly;
        contributed += monthly;
      }
      rows.push({ year: y, balance: Math.round(bal), contributed: Math.round(contributed) });
    }
    return { rows, final: bal, contributed, growth: bal - contributed };
  }, [principal, monthly, years, rate]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary" /> Compound Interest / Savings Goal</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Starting balance</Label><Input type="number" value={principal} onChange={e => setPrincipal(+e.target.value)} /></div>
          <div><Label>Monthly contribution</Label><Input type="number" value={monthly} onChange={e => setMonthly(+e.target.value)} /></div>
          <div><Label>Years</Label><Input type="number" value={years} onChange={e => setYears(+e.target.value)} /></div>
          <div><Label>Annual return %</Label><Input type="number" value={rate} onChange={e => setRate(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Final balance</div><div className="text-xl font-bold text-primary">{fmt(r.final)}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Total contributed</div><div className="text-xl font-bold">{fmt(r.contributed)}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Growth (interest)</div><div className="text-xl font-bold">{fmt(r.growth)}</div></div>
        </div>

        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={r.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Line type="monotone" dataKey="balance" stroke="hsl(var(--primary))" strokeWidth={2} name="Balance" dot={false} />
              <Line type="monotone" dataKey="contributed" stroke="hsl(var(--muted-foreground))" strokeWidth={2} name="Contributed" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
