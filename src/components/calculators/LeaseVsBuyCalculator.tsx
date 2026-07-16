import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Car } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

function pmt(p: number, aRate: number, months: number) {
  if (aRate === 0) return p / months;
  const r = aRate / 100 / 12;
  return (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function LeaseVsBuyCalculator() {
  const [price, setPrice] = useState(38000);
  const [term, setTerm] = useState(36); // months for both
  const [rate, setRate] = useState(7.5);
  const [down, setDown] = useState(3000);
  const [residualPct, setResidualPct] = useState(55); // % of MSRP after term
  const [moneyFactor, setMoneyFactor] = useState(0.00275); // ~6.6% APR
  const [leaseFees, setLeaseFees] = useState(895);
  const [keepAfter, setKeepAfter] = useState(60); // months you'll own it total

  const r = useMemo(() => {
    // BUY
    const loan = price - down;
    const buyMonthly = pmt(loan, rate, term);
    const totalBuyPayments = buyMonthly * term + down;
    // Depreciation estimate: assume 50% value after 60 mo of ownership (linear)
    const yearsHeld = keepAfter / 12;
    const depreciation = price * Math.min(0.75, 0.15 * yearsHeld);
    const residualBuy = price - depreciation;
    const buyNetCost = totalBuyPayments - residualBuy;

    // LEASE
    const residual = price * (residualPct / 100);
    const depFee = (price - residual) / term;
    const financeFee = (price + residual) * moneyFactor;
    const leaseMonthly = depFee + financeFee;
    const totalLease = leaseMonthly * term + leaseFees + down;
    // At end, you own nothing — to reach `keepAfter` months of driving, you'd need another lease cycle
    const additionalLeaseCycles = Math.max(0, Math.ceil((keepAfter - term) / term));
    const leaseFullCost = totalLease + additionalLeaseCycles * totalLease;

    const winner = buyNetCost < leaseFullCost ? 'buy' : 'lease';
    return { buyMonthly, totalBuyPayments, buyNetCost, residualBuy, leaseMonthly, totalLease, leaseFullCost, winner, savings: Math.abs(buyNetCost - leaseFullCost) };
  }, [price, term, rate, down, residualPct, moneyFactor, leaseFees, keepAfter]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Car className="h-5 w-5 text-primary" /> Lease vs Buy (Auto)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Vehicle price (MSRP/negotiated)</Label><Input type="number" value={price} onChange={e => setPrice(+e.target.value)} /></div>
          <div><Label>Down payment / cap reduction</Label><Input type="number" value={down} onChange={e => setDown(+e.target.value)} /></div>
          <div><Label>Term (months)</Label><Input type="number" value={term} onChange={e => setTerm(+e.target.value)} /></div>
          <div><Label>Months you'll keep the car</Label><Input type="number" value={keepAfter} onChange={e => setKeepAfter(+e.target.value)} /></div>
          <div><Label>Loan APR %</Label><Input type="number" step="0.1" value={rate} onChange={e => setRate(+e.target.value)} /></div>
          <div><Label>Residual value %</Label><Input type="number" value={residualPct} onChange={e => setResidualPct(+e.target.value)} /></div>
          <div><Label>Money factor</Label><Input type="number" step="0.00025" value={moneyFactor} onChange={e => setMoneyFactor(+e.target.value)} /></div>
          <div><Label>Lease fees (acquisition, doc)</Label><Input type="number" value={leaseFees} onChange={e => setLeaseFees(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className={`rounded-lg p-4 ${r.winner === 'buy' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/40'}`}>
            <div className="flex justify-between mb-1">
              <div className="font-semibold">Buy (finance)</div>
              {r.winner === 'buy' && <Badge>Winner</Badge>}
            </div>
            <div className="text-sm">Monthly: <strong>{fmt(r.buyMonthly)}</strong></div>
            <div className="text-sm">Total paid over {term} mo: <strong>{fmt(r.totalBuyPayments)}</strong></div>
            <div className="text-sm">Residual value at {keepAfter} mo: <strong>{fmt(r.residualBuy)}</strong></div>
            <div className="text-sm">Net cost of ownership: <strong>{fmt(r.buyNetCost)}</strong></div>
          </div>
          <div className={`rounded-lg p-4 ${r.winner === 'lease' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/40'}`}>
            <div className="flex justify-between mb-1">
              <div className="font-semibold">Lease</div>
              {r.winner === 'lease' && <Badge>Winner</Badge>}
            </div>
            <div className="text-sm">Monthly: <strong>{fmt(r.leaseMonthly)}</strong></div>
            <div className="text-sm">Total single lease: <strong>{fmt(r.totalLease)}</strong></div>
            <div className="text-sm">Total to cover {keepAfter} mo of driving: <strong>{fmt(r.leaseFullCost)}</strong></div>
            <div className="text-xs text-muted-foreground mt-1">(includes rolling into additional lease cycles)</div>
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 p-3 text-sm">
          <strong>{r.winner === 'buy' ? 'Buying' : 'Leasing'}</strong> saves you <strong>{fmt(r.savings)}</strong> over {keepAfter} months. Rule of thumb: buy if you keep cars 5+ years; lease if you always want a new car every 3.
        </div>
      </CardContent>
    </Card>
  );
}
