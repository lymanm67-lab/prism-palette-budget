import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, DollarSign } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

type Debt = { id: string; name: string; balance: number; rate: number; minPayment: number };

function simulate(debts: Debt[], extra: number, method: 'snowball' | 'avalanche') {
  const arr = debts.map(d => ({ ...d }));
  const sorted = [...arr].sort((a, b) =>
    method === 'snowball' ? a.balance - b.balance : b.rate - a.rate,
  );
  const focusOrder = sorted.map(d => d.id);
  let month = 0;
  let totalInterest = 0;
  const MAX = 600;
  while (arr.some(d => d.balance > 0.01) && month < MAX) {
    month++;
    // Accrue interest and pay minimums
    for (const d of arr) {
      if (d.balance <= 0) continue;
      const interest = d.balance * d.rate / 100 / 12;
      totalInterest += interest;
      d.balance += interest;
      const pay = Math.min(d.minPayment, d.balance);
      d.balance -= pay;
    }
    // Apply extra + freed-up minimums to focus target
    let pool = extra;
    // Add freed minimums from paid-off debts
    for (const d of arr) if (d.balance <= 0.01) pool += d.minPayment;
    for (const id of focusOrder) {
      if (pool <= 0) break;
      const target = arr.find(d => d.id === id);
      if (!target || target.balance <= 0.01) continue;
      const apply = Math.min(pool, target.balance);
      target.balance -= apply;
      pool -= apply;
    }
  }
  return { months: month, totalInterest };
}

export default function SnowballVsAvalancheCalculator() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: '1', name: 'Credit Card A', balance: 4500, rate: 24.99, minPayment: 120 },
    { id: '2', name: 'Credit Card B', balance: 1800, rate: 19.99, minPayment: 55 },
    { id: '3', name: 'Auto loan', balance: 12000, rate: 7.5, minPayment: 320 },
  ]);
  const [extra, setExtra] = useState(300);

  const snow = useMemo(() => simulate(debts, extra, 'snowball'), [debts, extra]);
  const ava = useMemo(() => simulate(debts, extra, 'avalanche'), [debts, extra]);

  const update = (id: string, patch: Partial<Debt>) => setDebts(debts.map(d => d.id === id ? { ...d, ...patch } : d));
  const add = () => setDebts([...debts, { id: crypto.randomUUID(), name: 'New debt', balance: 1000, rate: 15, minPayment: 30 }]);
  const remove = (id: string) => setDebts(debts.filter(d => d.id !== id));

  const winner = ava.totalInterest < snow.totalInterest ? 'avalanche' : 'snowball';
  const savings = Math.abs(snow.totalInterest - ava.totalInterest);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5 text-primary" /> Debt Snowball vs Avalanche</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {debts.map(d => (
            <div key={d.id} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-3"><Label className="text-xs">Name</Label><Input value={d.name} onChange={e => update(d.id, { name: e.target.value })} /></div>
              <div className="col-span-3"><Label className="text-xs">Balance</Label><Input type="number" value={d.balance} onChange={e => update(d.id, { balance: +e.target.value })} /></div>
              <div className="col-span-2"><Label className="text-xs">APR %</Label><Input type="number" step="0.1" value={d.rate} onChange={e => update(d.id, { rate: +e.target.value })} /></div>
              <div className="col-span-3"><Label className="text-xs">Min pmt</Label><Input type="number" value={d.minPayment} onChange={e => update(d.id, { minPayment: +e.target.value })} /></div>
              <div className="col-span-1"><Button variant="ghost" size="icon" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4" /></Button></div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={add}><Plus className="h-4 w-4 mr-1" /> Add debt</Button>
        </div>

        <div><Label>Extra monthly payment (above minimums)</Label><Input type="number" value={extra} onChange={e => setExtra(+e.target.value)} /></div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className={`rounded-lg p-4 ${winner === 'snowball' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/40'}`}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold">Snowball</div>
              {winner === 'snowball' && <Badge>Winner</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mb-2">Smallest balance first (motivation wins)</div>
            <div className="text-sm">Payoff: <strong>{Math.floor(snow.months / 12)}y {snow.months % 12}m</strong></div>
            <div className="text-sm">Total interest: <strong>{fmt(snow.totalInterest)}</strong></div>
          </div>
          <div className={`rounded-lg p-4 ${winner === 'avalanche' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/40'}`}>
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold">Avalanche</div>
              {winner === 'avalanche' && <Badge>Winner</Badge>}
            </div>
            <div className="text-xs text-muted-foreground mb-2">Highest APR first (math wins)</div>
            <div className="text-sm">Payoff: <strong>{Math.floor(ava.months / 12)}y {ava.months % 12}m</strong></div>
            <div className="text-sm">Total interest: <strong>{fmt(ava.totalInterest)}</strong></div>
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 p-3 text-sm">
          <strong>{winner === 'avalanche' ? 'Avalanche' : 'Snowball'}</strong> saves you <strong>{fmt(savings)}</strong> in interest. Snowball wins on behavior; avalanche wins on math — pick the one you'll actually stick with.
        </div>
      </CardContent>
    </Card>
  );
}
