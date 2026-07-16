import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function pmt(p: number, aRate: number, months: number) {
  if (aRate === 0) return p / months;
  const r = aRate / 100 / 12;
  return (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function StudentLoanCalculator() {
  const [balance, setBalance] = useState(40000);
  const [rate, setRate] = useState(6.5);
  const [term, setTerm] = useState(10);
  const [extra, setExtra] = useState(0);
  const [plan, setPlan] = useState<'standard' | 'save' | 'pslf'>('standard');
  const [income, setIncome] = useState(70000);

  const r = useMemo(() => {
    const standardPay = pmt(balance, rate, term * 12);
    // SAVE plan: 10% of discretionary income (income - 225% of poverty ≈ $34k single)
    const disc = Math.max(0, income - 34000);
    const savePay = disc * 0.10 / 12;
    // PSLF: 120 qualifying payments then forgiveness
    const pslfTotalPaid = savePay * 120;

    // Standard with extra
    let bal = balance;
    let months = 0;
    let totalInt = 0;
    const monthlyR = rate / 100 / 12;
    const MAX = 600;
    while (bal > 0.01 && months < MAX) {
      months++;
      const interest = bal * monthlyR;
      totalInt += interest;
      bal = bal + interest - standardPay - extra;
      if (bal < 0) bal = 0;
    }

    return {
      standardPay, standardTotalInt: totalInt, standardMonths: months,
      standardTotal: balance + totalInt,
      savePay, savePayCap: standardPay,
      pslfTotalPaid, pslfForgiven: Math.max(0, balance * 2 - pslfTotalPaid),
    };
  }, [balance, rate, term, extra, income]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /> Student Loan Payoff / SAVE / PSLF</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Loan balance</Label><Input type="number" value={balance} onChange={e => setBalance(+e.target.value)} /></div>
          <div><Label>Interest rate %</Label><Input type="number" step="0.1" value={rate} onChange={e => setRate(+e.target.value)} /></div>
          <div><Label>Standard term (years)</Label><Input type="number" value={term} onChange={e => setTerm(+e.target.value)} /></div>
          <div><Label>Extra monthly payment</Label><Input type="number" value={extra} onChange={e => setExtra(+e.target.value)} /></div>
          <div><Label>Annual income</Label><Input type="number" value={income} onChange={e => setIncome(+e.target.value)} /></div>
          <div><Label>Repayment plan</Label>
            <Select value={plan} onValueChange={(v: any) => setPlan(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard</SelectItem>
                <SelectItem value="save">SAVE (income-driven)</SelectItem>
                <SelectItem value="pslf">PSLF (public service)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {plan === 'standard' && (
          <>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-lg bg-primary/10 p-3"><div className="text-xs text-muted-foreground">Monthly payment</div><div className="text-xl font-bold text-primary">{fmt(r.standardPay + extra)}</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Payoff time</div><div className="text-xl font-bold">{Math.floor(r.standardMonths / 12)}y {r.standardMonths % 12}m</div></div>
              <div className="rounded-lg bg-muted/40 p-3"><div className="text-xs text-muted-foreground">Total interest</div><div className="text-xl font-bold">{fmt(r.standardTotalInt)}</div></div>
            </div>
          </>
        )}

        {plan === 'save' && (
          <div className="rounded-lg bg-primary/10 p-4 space-y-2">
            <div className="text-sm text-muted-foreground">SAVE plan monthly payment (10% of discretionary)</div>
            <div className="text-2xl font-bold text-primary">{fmt(Math.min(r.savePay, r.savePayCap))}/mo</div>
            <div className="text-xs text-muted-foreground">Forgiveness after 20–25 years of qualifying payments. Interest doesn't capitalize if payment is below interest charge.</div>
          </div>
        )}

        {plan === 'pslf' && (
          <div className="rounded-lg bg-primary/10 p-4 space-y-2">
            <div className="text-sm text-muted-foreground">PSLF: 120 qualifying payments</div>
            <div className="text-2xl font-bold text-primary">~{fmt(r.pslfTotalPaid)} paid over 10 years</div>
            <div className="text-xs text-muted-foreground">Remaining balance forgiven tax-free. Requires 501(c)(3) or gov employment. File PSLF Form annually.</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
