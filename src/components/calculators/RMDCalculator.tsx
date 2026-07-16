import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { projectRMDs } from '@/lib/investment/tax';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CalendarDays } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function RMDCalculator() {
  const [balance, setBalance] = useState(750000);
  const [age, setAge] = useState(65);
  const [returnPct, setReturnPct] = useState(6);
  const [taxRate, setTaxRate] = useState(24);

  const rows = useMemo(() => projectRMDs({
    traditionalBalance: balance,
    currentAge: age,
    returnPct,
    throughAge: 95,
  }), [balance, age, returnPct]);

  const first = rows[0];
  const totalRMDs = rows.reduce((s, r) => s + r.rmd, 0);
  const totalTax = totalRMDs * (taxRate / 100);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Required Minimum Distribution (RMD)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Traditional IRA/401(k) balance</Label><Input type="number" value={balance} onChange={e => setBalance(+e.target.value)} /></div>
          <div><Label>Current age</Label><Input type="number" value={age} onChange={e => setAge(+e.target.value)} /></div>
          <div><Label>Expected return (%)</Label><Input type="number" step="0.5" value={returnPct} onChange={e => setReturnPct(+e.target.value)} /></div>
          <div><Label>Marginal tax rate (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">First RMD (age 73)</div>
          <div className="text-3xl font-bold text-primary">{fmt(first?.rmd ?? 0)}</div>
          <div className="text-xs text-muted-foreground mt-1">Projected balance at 73: <strong>{fmt(first?.balance ?? 0)}</strong> · Divisor: {first?.divisor}</div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
              <XAxis dataKey="age" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="rmd" name="RMD" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid md:grid-cols-2 gap-2 text-sm">
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Cumulative RMDs (73–95)</div><div className="font-semibold">{fmt(totalRMDs)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Estimated lifetime tax</div><div className="font-semibold">{fmt(totalTax)}</div></div>
        </div>

        <div className="text-xs text-muted-foreground">RMDs start at age 73 (SECURE Act 2.0). Missed RMDs face a 25% excise tax (10% if corrected quickly). Roth IRAs have no RMD for the original owner. Consider QCDs and Roth conversions before 73 to reduce RMD size.</div>
      </CardContent>
    </Card>
  );
}
