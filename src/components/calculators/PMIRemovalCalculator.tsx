import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Home } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function monthsToLTV(principal: number, rate: number, payment: number, homeValue: number, targetLTV: number) {
  const r = rate / 100 / 12;
  const targetBalance = homeValue * (targetLTV / 100);
  let bal = principal;
  let m = 0;
  const MAX = 600;
  while (bal > targetBalance && m < MAX) {
    const interest = bal * r;
    bal = bal + interest - payment;
    m++;
    if (bal < 0) break;
  }
  return m >= MAX ? Infinity : m;
}

export default function PMIRemovalCalculator() {
  const [homeValue, setHomeValue] = useState(450000);
  const [balance, setBalance] = useState(400000);
  const [rate, setRate] = useState(6.5);
  const [payment, setPayment] = useState(2528);
  const [pmiMonthly, setPmiMonthly] = useState(180);
  const [appreciation, setAppreciation] = useState(3);
  const [extraPayment, setExtraPayment] = useState(0);

  const r = useMemo(() => {
    const currentLTV = (balance / homeValue) * 100;
    const to80 = monthsToLTV(balance, rate, payment + extraPayment, homeValue, 80);
    const to78 = monthsToLTV(balance, rate, payment + extraPayment, homeValue, 78);
    const savingsIfRemoved80 = isFinite(to80) ? pmiMonthly * (to78 - to80) : 0;
    // Appreciation-based: request removal when 80% LTV of appreciated value
    const yearsAppreciation = Math.max(0, Math.log((balance / 0.8) / homeValue) / Math.log(1 + appreciation / 100));
    const monthsAppreciation = yearsAppreciation * 12;
    const totalPmiUntil78 = isFinite(to78) ? pmiMonthly * to78 : 0;
    // If borrower requests at 80% (vs automatic at 78%)
    const savings = isFinite(to80) && isFinite(to78) ? pmiMonthly * (to78 - to80) : 0;
    return { currentLTV, to80, to78, monthsAppreciation, totalPmiUntil78, savings };
  }, [homeValue, balance, rate, payment, pmiMonthly, appreciation, extraPayment]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Home className="h-5 w-5 text-primary" /> PMI Removal</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Current home value</Label><Input type="number" value={homeValue} onChange={e => setHomeValue(+e.target.value)} /></div>
          <div><Label>Loan balance</Label><Input type="number" value={balance} onChange={e => setBalance(+e.target.value)} /></div>
          <div><Label>Interest rate (%)</Label><Input type="number" step="0.05" value={rate} onChange={e => setRate(+e.target.value)} /></div>
          <div><Label>Monthly P&I payment</Label><Input type="number" value={payment} onChange={e => setPayment(+e.target.value)} /></div>
          <div><Label>Monthly PMI premium</Label><Input type="number" value={pmiMonthly} onChange={e => setPmiMonthly(+e.target.value)} /></div>
          <div><Label>Home appreciation (%/yr)</Label><Input type="number" step="0.5" value={appreciation} onChange={e => setAppreciation(+e.target.value)} /></div>
          <div><Label>Extra monthly principal</Label><Input type="number" value={extraPayment} onChange={e => setExtraPayment(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Current LTV</div>
          <div className="text-3xl font-bold text-primary">{r.currentLTV.toFixed(1)}%</div>
          <Progress value={Math.min(100, ((80 - Math.min(80, r.currentLTV)) / (r.currentLTV - 80 + 20)) * 100)} className="mt-3" />
          <div className="text-xs text-muted-foreground mt-1">Target: 80% (request removal) or 78% (auto-cancel)</div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">By paydown → 80% LTV</div>
            <div className="text-xl font-bold">{isFinite(r.to80) ? `${r.to80} months` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Request PMI cancellation</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">By paydown → 78% LTV (auto)</div>
            <div className="text-xl font-bold">{isFinite(r.to78) ? `${r.to78} months` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Lender must auto-cancel</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">By appreciation → 80% LTV</div>
            <div className="text-xl font-bold">{isFinite(r.monthsAppreciation) ? `${Math.round(r.monthsAppreciation)} months` : '—'}</div>
            <div className="text-xs text-muted-foreground mt-1">Requires new appraisal (~$500)</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-xs text-muted-foreground">Savings from requesting early</div>
            <div className="text-xl font-bold text-primary">{fmt(r.savings)}</div>
            <div className="text-xs text-muted-foreground mt-1">vs waiting for auto-cancel</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Under HPA, borrowers may request cancellation at 80% LTV and lenders must auto-cancel at 78% (based on original amortization schedule). Appreciation-based removal usually requires a Broker Price Opinion or appraisal. FHA MIP has different rules — often lifetime for loans after 2013.</div>
      </CardContent>
    </Card>
  );
}
