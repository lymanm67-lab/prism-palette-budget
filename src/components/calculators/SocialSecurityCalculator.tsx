import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { CalendarDays } from 'lucide-react';
import { ssClaimingOptimizer } from '@/lib/investment/income';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function SocialSecurityCalculator() {
  const [pia, setPia] = useState(2500);
  const [life, setLife] = useState(90);

  const r = useMemo(() => ssClaimingOptimizer({ piaAt67: pia, lifeExpectancy: life }), [pia, life]);
  const best = r.results.find(x => x.claimAge === r.recommended)!;

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-primary" /> Social Security Claiming Age</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>PIA at age 67 (monthly benefit)</Label><Input type="number" value={pia} onChange={e => setPia(+e.target.value)} /></div>
          <div><Label>Life expectancy</Label><Input type="number" value={life} onChange={e => setLife(+e.target.value)} /></div>
        </div>

        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={r.results.map(x => ({ age: `Age ${x.claimAge}`, lifetime: Math.round(x.lifetimePV), monthly: Math.round(x.monthly) }))}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age" />
              <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmt(v)} />
              <Bar dataKey="lifetime" fill="hsl(var(--primary))" name="Lifetime PV" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="flex items-center gap-2">
            <div className="text-sm text-muted-foreground">Optimal claiming age:</div>
            <Badge className="text-base">{r.recommended}</Badge>
          </div>
          <div className="text-sm mt-2">Monthly benefit: <strong>{fmt(best.monthly)}</strong> · Lifetime PV: <strong>{fmt(best.lifetimePV)}</strong></div>
        </div>

        <div className="text-xs text-muted-foreground">
          Delaying past 67 adds ~8%/yr up to 70. Claiming at 62 cuts benefit by ~30%. Best age depends heavily on life expectancy — health, family history, and spousal benefits matter.
        </div>
      </CardContent>
    </Card>
  );
}
