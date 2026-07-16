import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Shield } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function EmergencyFundCalculator() {
  const [expenses, setExpenses] = useState(4500);
  const [months, setMonths] = useState(6);
  const [current, setCurrent] = useState(3000);
  const [monthlySave, setMonthlySave] = useState(500);

  const r = useMemo(() => {
    const target = expenses * months;
    const gap = Math.max(0, target - current);
    const monthsToGoal = monthlySave > 0 ? Math.ceil(gap / monthlySave) : Infinity;
    const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
    return { target, gap, monthsToGoal, pct };
  }, [expenses, months, current, monthlySave]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Emergency Fund Target</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Monthly essential expenses</Label><Input type="number" value={expenses} onChange={e => setExpenses(+e.target.value)} /></div>
          <div><Label>Months of coverage target</Label><Input type="number" value={months} onChange={e => setMonths(+e.target.value)} /></div>
          <div><Label>Current savings</Label><Input type="number" value={current} onChange={e => setCurrent(+e.target.value)} /></div>
          <div><Label>Monthly contribution</Label><Input type="number" value={monthlySave} onChange={e => setMonthlySave(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Target emergency fund</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.target)}</div>
          <Progress value={r.pct} className="mt-3" />
          <div className="text-xs text-muted-foreground mt-1">{r.pct.toFixed(0)}% funded — {fmt(r.gap)} to go</div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Time to full funding</div><div className="text-xl font-bold">{isFinite(r.monthsToGoal) ? `${r.monthsToGoal} months` : '—'}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Gap remaining</div><div className="text-xl font-bold">{fmt(r.gap)}</div></div>
        </div>

        <div className="text-xs text-muted-foreground">
          Rule of thumb: 3 months if dual income + stable jobs, 6 months for single income, 12 months if self-employed or in a volatile industry. Park it in a high-yield savings account.
        </div>
      </CardContent>
    </Card>
  );
}
