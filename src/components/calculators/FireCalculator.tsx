import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function FireCalculator() {
  const [expenses, setExpenses] = useState(60000);
  const [swr, setSwr] = useState(4);
  const [current, setCurrent] = useState(150000);
  const [monthlySave, setMonthlySave] = useState(2500);
  const [returnPct, setReturnPct] = useState(7);

  const r = useMemo(() => {
    const fireNumber = expenses * (100 / swr);
    const leanFire = expenses * 0.6 * 25;
    const fatFire = expenses * 1.5 * 25;
    const coastFire = fireNumber / Math.pow(1 + returnPct / 100, 25); // if 25 yrs from now

    // Years to FIRE
    const m = returnPct / 100 / 12;
    let bal = current;
    let months = 0;
    const MAX = 12 * 60;
    while (bal < fireNumber && months < MAX) {
      bal = bal * (1 + m) + monthlySave;
      months++;
    }
    const yearsToFire = months / 12;
    const pct = Math.min(100, (current / fireNumber) * 100);
    return { fireNumber, leanFire, fatFire, coastFire, yearsToFire, pct, achievable: months < MAX };
  }, [expenses, swr, current, monthlySave, returnPct]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> FIRE Number (4% Rule)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Annual expenses in retirement</Label><Input type="number" value={expenses} onChange={e => setExpenses(+e.target.value)} /></div>
          <div><Label>Safe withdrawal rate %</Label><Input type="number" step="0.25" value={swr} onChange={e => setSwr(+e.target.value)} /></div>
          <div><Label>Current invested assets</Label><Input type="number" value={current} onChange={e => setCurrent(+e.target.value)} /></div>
          <div><Label>Monthly contribution</Label><Input type="number" value={monthlySave} onChange={e => setMonthlySave(+e.target.value)} /></div>
          <div><Label>Expected return %</Label><Input type="number" value={returnPct} onChange={e => setReturnPct(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Your FIRE number</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.fireNumber)}</div>
          <Progress value={r.pct} className="mt-3" />
          <div className="text-xs text-muted-foreground mt-1">{r.pct.toFixed(1)}% of the way there</div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Lean FIRE</div><div className="text-lg font-bold">{fmt(r.leanFire)}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Coast FIRE (25y)</div><div className="text-lg font-bold">{fmt(r.coastFire)}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Fat FIRE</div><div className="text-lg font-bold">{fmt(r.fatFire)}</div></div>
        </div>

        <div className="rounded-lg bg-primary/5 p-3 text-sm">
          Years to FIRE: <strong>{r.achievable ? r.yearsToFire.toFixed(1) : '> 60'}</strong> at current contribution rate.
        </div>
      </CardContent>
    </Card>
  );
}
