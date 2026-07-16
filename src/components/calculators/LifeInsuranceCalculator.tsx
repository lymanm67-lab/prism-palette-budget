import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function LifeInsuranceCalculator() {
  const [debts, setDebts] = useState(280000); // D — mortgage + debts
  const [income, setIncome] = useState(85000); // I — annual
  const [yearsIncome, setYearsIncome] = useState(10);
  const [mortgage, setMortgage] = useState(0); // if not in debts
  const [education, setEducation] = useState(200000); // E — kids' college
  const [existing, setExisting] = useState(50000);
  const [finalExpenses, setFinalExpenses] = useState(15000);

  const r = useMemo(() => {
    const D = debts + mortgage + finalExpenses;
    const I = income * yearsIncome;
    const M = mortgage; // shown separately if desired
    const E = education;
    const need = D + I + E;
    const gap = Math.max(0, need - existing);
    return { D, I, M, E, need, gap };
  }, [debts, income, yearsIncome, mortgage, education, existing, finalExpenses]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Life Insurance Need (DIME method)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Debts (excl. mortgage)</Label><Input type="number" value={debts} onChange={e => setDebts(+e.target.value)} /></div>
          <div><Label>Mortgage balance</Label><Input type="number" value={mortgage} onChange={e => setMortgage(+e.target.value)} /></div>
          <div><Label>Annual income to replace</Label><Input type="number" value={income} onChange={e => setIncome(+e.target.value)} /></div>
          <div><Label>Years to replace income</Label><Input type="number" value={yearsIncome} onChange={e => setYearsIncome(+e.target.value)} /></div>
          <div><Label>Education fund (kids)</Label><Input type="number" value={education} onChange={e => setEducation(+e.target.value)} /></div>
          <div><Label>Final expenses (funeral, etc.)</Label><Input type="number" value={finalExpenses} onChange={e => setFinalExpenses(+e.target.value)} /></div>
          <div className="md:col-span-2"><Label>Existing life insurance</Label><Input type="number" value={existing} onChange={e => setExisting(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Recommended coverage</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.need)}</div>
          <div className="text-sm mt-1">Additional needed after existing coverage: <strong>{fmt(r.gap)}</strong></div>
        </div>

        <div className="text-sm rounded-lg border p-3 space-y-1">
          <div className="flex justify-between"><span>D — Debts + mortgage + final expenses</span><span>{fmt(r.D)}</span></div>
          <div className="flex justify-between"><span>I — Income replacement ({yearsIncome}× ${income.toLocaleString()})</span><span>{fmt(r.I)}</span></div>
          <div className="flex justify-between"><span>E — Education for children</span><span>{fmt(r.E)}</span></div>
          <div className="flex justify-between font-semibold pt-1 border-t"><span>Total need</span><span>{fmt(r.need)}</span></div>
        </div>

        <div className="text-xs text-muted-foreground">
          Term life is usually the right choice — 20 or 30-year level term matching the years until kids are independent + mortgage payoff. Whole/universal life is rarely a good deal.
        </div>
      </CardContent>
    </Card>
  );
}
