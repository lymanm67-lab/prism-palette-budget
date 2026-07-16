import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function InflationCalculator() {
  const [amount, setAmount] = useState(100000);
  const [years, setYears] = useState(25);
  const [inflation, setInflation] = useState(3);

  const r = useMemo(() => {
    const factor = Math.pow(1 + inflation / 100, years);
    const futureNominal = amount * factor; // what it takes then to match today
    const realValue = amount / factor; // purchasing power of today's $amount then
    const rows = [];
    for (let y = 0; y <= years; y++) {
      const f = Math.pow(1 + inflation / 100, y);
      rows.push({ year: y, real: Math.round(amount / f), needed: Math.round(amount * f) });
    }
    return { futureNominal, realValue, rows };
  }, [amount, years, inflation]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Inflation & Purchasing Power</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Amount today</Label><Input type="number" value={amount} onChange={e => setAmount(+e.target.value)} /></div>
          <div><Label>Years ahead</Label><Input type="number" value={years} onChange={e => setYears(+e.target.value)} /></div>
          <div><Label>Inflation rate %</Label><Input type="number" step="0.1" value={inflation} onChange={e => setInflation(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-4">
            <div className="text-xs text-muted-foreground">In {years} years, {fmt(amount)} will feel like</div>
            <div className="text-2xl font-bold">{fmt(r.realValue)}</div>
            <div className="text-xs text-muted-foreground mt-1">(purchasing power in today's dollars)</div>
          </div>
          <div className="rounded-lg bg-primary/10 p-4">
            <div className="text-xs text-muted-foreground">To buy what {fmt(amount)} buys today, you'll need</div>
            <div className="text-2xl font-bold text-primary">{fmt(r.futureNominal)}</div>
            <div className="text-xs text-muted-foreground mt-1">(future dollars, {years} years out)</div>
          </div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={r.rows}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Line type="monotone" dataKey="real" stroke="hsl(var(--muted-foreground))" name="Real value" dot={false} />
              <Line type="monotone" dataKey="needed" stroke="hsl(var(--primary))" name="$ needed" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
