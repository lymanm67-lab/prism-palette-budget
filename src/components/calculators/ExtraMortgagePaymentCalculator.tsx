import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function simulate(principal: number, annualRate: number, payment: number, extra: number) {
  const r = annualRate / 100 / 12;
  let bal = principal;
  let months = 0;
  let interestPaid = 0;
  const MAX = 720;
  while (bal > 0.01 && months < MAX) {
    const i = bal * r;
    const total = payment + extra;
    const principalPay = Math.min(bal, total - i);
    interestPaid += i;
    bal -= principalPay;
    months++;
    if (principalPay <= 0) return { months: Infinity, interestPaid: Infinity };
  }
  return { months, interestPaid };
}

export default function ExtraMortgagePaymentCalculator() {
  const [balance, setBalance] = useState(350000);
  const [rate, setRate] = useState(6.5);
  const [payment, setPayment] = useState(2212);
  const [extra, setExtra] = useState(200);

  const r = useMemo(() => {
    const base = simulate(balance, rate, payment, 0);
    const withExtra = simulate(balance, rate, payment, extra);
    // Biweekly = 26 half-payments = 13 monthlies/year = 1/12 extra per month
    const biweeklyExtra = payment / 12;
    const biweekly = simulate(balance, rate, payment, biweeklyExtra);
    // One extra payment/year = extra/12 per month equivalent = payment/12
    const oneExtraYr = simulate(balance, rate, payment, payment / 12);
    const monthsSaved = base.months - withExtra.months;
    const interestSaved = base.interestPaid - withExtra.interestPaid;
    return { base, withExtra, biweekly, oneExtraYr, monthsSaved, interestSaved };
  }, [balance, rate, payment, extra]);

  const yrsMo = (m: number) => isFinite(m) ? `${Math.floor(m / 12)}y ${m % 12}mo` : '—';

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5 text-primary" /> Extra Mortgage Payment Payoff</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Loan balance</Label><Input type="number" value={balance} onChange={e => setBalance(+e.target.value)} /></div>
          <div><Label>Interest rate (%)</Label><Input type="number" step="0.05" value={rate} onChange={e => setRate(+e.target.value)} /></div>
          <div><Label>Monthly P&I payment</Label><Input type="number" value={payment} onChange={e => setPayment(+e.target.value)} /></div>
          <div><Label>Extra principal per month</Label><Input type="number" value={extra} onChange={e => setExtra(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Interest saved with +{fmt(extra)}/mo</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.interestSaved)}</div>
          <div className="text-xs text-muted-foreground mt-1">Payoff <strong>{r.monthsSaved} months</strong> sooner ({yrsMo(r.monthsSaved)})</div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Baseline (no extra)</div>
            <div className="text-xs text-muted-foreground">Payoff time</div>
            <div className="text-lg font-bold">{yrsMo(r.base.months)}</div>
            <div className="text-xs">Interest: {fmt(r.base.interestPaid)}</div>
          </div>
          <div className="rounded-lg border p-3 border-primary/40">
            <div className="text-sm font-medium">With +{fmt(extra)}/mo</div>
            <div className="text-xs text-muted-foreground">Payoff time</div>
            <div className="text-lg font-bold text-primary">{yrsMo(r.withExtra.months)}</div>
            <div className="text-xs">Interest: {fmt(r.withExtra.interestPaid)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">Biweekly (26/yr)</div>
            <div className="text-xs text-muted-foreground">Payoff time</div>
            <div className="text-lg font-bold">{yrsMo(r.biweekly.months)}</div>
            <div className="text-xs">Interest saved: {fmt(r.base.interestPaid - r.biweekly.interestPaid)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">One extra payment/yr</div>
            <div className="text-xs text-muted-foreground">Payoff time</div>
            <div className="text-lg font-bold">{yrsMo(r.oneExtraYr.months)}</div>
            <div className="text-xs">Interest saved: {fmt(r.base.interestPaid - r.oneExtraYr.interestPaid)}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">Make sure the extra applies to <strong>principal</strong>, not next month's payment — check your lender's payoff instructions. Compare against investing the same amount at your expected after-tax return before committing.</div>
      </CardContent>
    </Card>
  );
}
