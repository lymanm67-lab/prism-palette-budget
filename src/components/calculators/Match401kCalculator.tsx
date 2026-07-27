import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function Match401kCalculator() {
  const [salary, setSalary] = useState(85000);
  const [contribPct, setContribPct] = useState(6);
  const [matchPct, setMatchPct] = useState(50); // employer matches 50% of...
  const [matchCap, setMatchCap] = useState(6); // ...up to 6% of salary
  const [years, setYears] = useState(30);
  const [returnPct, setReturnPct] = useState(8);

  const r = useMemo(() => {
    const employee = salary * (contribPct / 100);
    const matched = salary * (Math.min(contribPct, matchCap) / 100) * (matchPct / 100);
    const total = employee + matched;
    const missing = matchCap > contribPct
      ? salary * ((matchCap - contribPct) / 100) * (matchPct / 100)
      : 0;
    const rate = returnPct / 100;
    const fv = (annual: number) => annual * ((Math.pow(1 + rate, years) - 1) / rate);
    return {
      employee, matched, total, missing,
      fvEmployee: fv(employee), fvMatched: fv(matched), fvMissing: fv(missing),
      fvTotal: fv(total),
    };
  }, [salary, contribPct, matchPct, matchCap, years, returnPct]);

  const chart = [
    { name: 'Your contributions', value: r.fvEmployee },
    { name: 'Employer match', value: r.fvMatched },
    ...(r.missing > 0 ? [{ name: 'Match you\'re leaving on the table', value: r.fvMissing }] : []),
  ];

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> 401(k) Employer Match Optimizer</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Annual salary</Label><Input type="number" value={salary} onChange={e => setSalary(+e.target.value)} /></div>
          <div><Label>Your contribution %</Label><Input type="number" value={contribPct} onChange={e => setContribPct(+e.target.value)} /></div>
          <div><Label>Years to retirement</Label><Input type="number" value={years} onChange={e => setYears(+e.target.value)} /></div>
          <div><Label>Employer matches (%)</Label><Input type="number" value={matchPct} onChange={e => setMatchPct(+e.target.value)} /></div>
          <div><Label>Up to (% of salary)</Label><Input type="number" value={matchCap} onChange={e => setMatchCap(+e.target.value)} /></div>
          <div><Label>Expected return %</Label><Input type="number" value={returnPct} onChange={e => setReturnPct(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">You contribute (yr)</div><div className="text-xl font-bold">{fmt(r.employee)}</div></div>
          <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Employer match (yr)</div><div className="text-xl font-bold text-primary">{fmt(r.matched)}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Total contribution (yr)</div><div className="text-xl font-bold">{fmt(r.total)}</div></div>
        </div>

        {r.missing > 0 && (
          <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm">
            <strong>Free money alert:</strong> raising your contribution to {matchCap}% would capture <strong>{fmt(r.missing)}/yr</strong> more from your employer — <strong>{fmt(r.fvMissing)}</strong> over {years} years.
          </div>
        )}

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Legend />
              <Bar dataKey="value" fill="hsl(var(--primary))" name={`Value at ${years} yrs`} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-primary/5 p-3 text-sm">
          Projected balance in {years} yrs from this year's contribution: <strong>{fmt(r.fvTotal)}</strong>.
        </div>
      </CardContent>
    </Card>
  );
}
