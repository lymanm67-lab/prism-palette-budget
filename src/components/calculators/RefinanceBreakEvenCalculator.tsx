import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function pmt(p: number, aRate: number, months: number) {
  if (aRate === 0) return p / months;
  const r = aRate / 100 / 12;
  return (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function RefinanceBreakEvenCalculator() {
  const [balance, setBalance] = useState(320000);
  const [currentRate, setCurrentRate] = useState(6.75);
  const [currentTerm, setCurrentTerm] = useState(28); // years remaining
  const [newRate, setNewRate] = useState(5.5);
  const [newTerm, setNewTerm] = useState(30);
  const [closingCosts, setClosingCosts] = useState(6500);

  const r = useMemo(() => {
    const oldPay = pmt(balance, currentRate, currentTerm * 12);
    const newPay = pmt(balance, newRate, newTerm * 12);
    const monthlySavings = oldPay - newPay;
    const breakEvenMonths = monthlySavings > 0 ? closingCosts / monthlySavings : Infinity;
    const totalOldInterest = oldPay * currentTerm * 12 - balance;
    const totalNewInterest = newPay * newTerm * 12 - balance;
    return { oldPay, newPay, monthlySavings, breakEvenMonths, totalOldInterest, totalNewInterest };
  }, [balance, currentRate, currentTerm, newRate, newTerm, closingCosts]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> Refinance Break-Even</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Current balance</Label><Input type="number" value={balance} onChange={e => setBalance(+e.target.value)} /></div>
          <div><Label>Closing costs</Label><Input type="number" value={closingCosts} onChange={e => setClosingCosts(+e.target.value)} /></div>
          <div><Label>Current rate %</Label><Input type="number" step="0.125" value={currentRate} onChange={e => setCurrentRate(+e.target.value)} /></div>
          <div><Label>Years remaining</Label><Input type="number" value={currentTerm} onChange={e => setCurrentTerm(+e.target.value)} /></div>
          <div><Label>New rate %</Label><Input type="number" step="0.125" value={newRate} onChange={e => setNewRate(+e.target.value)} /></div>
          <div><Label>New term (years)</Label><Input type="number" value={newTerm} onChange={e => setNewTerm(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Current payment</div><div className="text-xl font-bold">{fmt(r.oldPay)}</div></div>
          <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">New payment</div><div className="text-xl font-bold">{fmt(r.newPay)}</div></div>
          <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Monthly savings</div><div className="text-xl font-bold text-primary">{fmt(r.monthlySavings)}</div></div>
        </div>

        <div className="rounded-lg bg-primary/5 p-4">
          <div className="text-sm text-muted-foreground">Break-even point</div>
          <div className="text-3xl font-bold text-primary">
            {isFinite(r.breakEvenMonths) ? `${r.breakEvenMonths.toFixed(1)} months` : 'Never — new rate isn\'t lower'}
          </div>
          {isFinite(r.breakEvenMonths) && (
            <div className="text-xs text-muted-foreground mt-1">
              You recover ${Math.round(closingCosts).toLocaleString()} in closing costs after {(r.breakEvenMonths / 12).toFixed(1)} years. Only refi if you'll stay past this point.
            </div>
          )}
        </div>

        <div className="text-sm rounded-lg border p-3 space-y-1">
          <div className="flex justify-between"><span>Total interest — current loan</span><span>{fmt(r.totalOldInterest)}</span></div>
          <div className="flex justify-between"><span>Total interest — refinanced loan</span><span>{fmt(r.totalNewInterest)}</span></div>
          <div className="flex justify-between font-semibold pt-1 border-t">
            <span>Lifetime difference</span>
            <span className={r.totalNewInterest < r.totalOldInterest ? 'text-primary' : 'text-destructive'}>
              {r.totalNewInterest < r.totalOldInterest ? '−' : '+'}{fmt(Math.abs(r.totalOldInterest - r.totalNewInterest))}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
