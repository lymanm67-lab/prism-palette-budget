import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { PiggyBank } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function CDvsHYSACalculator() {
  const [amount, setAmount] = useState(25000);
  const [cdApy, setCdApy] = useState(4.5);
  const [cdTermMonths, setCdTermMonths] = useState(12);
  const [hysaApy, setHysaApy] = useState(4.0);
  const [hysaRateDrop, setHysaRateDrop] = useState(1.0); // % over term
  const [taxRate, setTaxRate] = useState(24);
  const [compound, setCompound] = useState<'monthly' | 'daily'>('monthly');

  const r = useMemo(() => {
    const years = cdTermMonths / 12;
    const n = compound === 'monthly' ? 12 : 365;
    // CD fixed
    const cdFinal = amount * Math.pow(1 + (cdApy / 100) / n, n * years);
    const cdInterest = cdFinal - amount;
    // HYSA linear rate decay from hysaApy → hysaApy - hysaRateDrop over term (avg)
    const avgHysa = Math.max(0, hysaApy - hysaRateDrop / 2);
    const hysaFinal = amount * Math.pow(1 + (avgHysa / 100) / n, n * years);
    const hysaInterest = hysaFinal - amount;
    const cdAfterTax = cdInterest * (1 - taxRate / 100);
    const hysaAfterTax = hysaInterest * (1 - taxRate / 100);
    return { cdFinal, cdInterest, hysaFinal, hysaInterest, cdAfterTax, hysaAfterTax, winner: cdAfterTax > hysaAfterTax ? 'CD' : 'HYSA', edge: Math.abs(cdAfterTax - hysaAfterTax) };
  }, [amount, cdApy, cdTermMonths, hysaApy, hysaRateDrop, taxRate, compound]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><PiggyBank className="h-5 w-5 text-primary" /> CD vs HYSA Yield</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Deposit amount</Label><Input type="number" value={amount} onChange={e => setAmount(+e.target.value)} /></div>
          <div><Label>Term (months)</Label><Input type="number" value={cdTermMonths} onChange={e => setCdTermMonths(+e.target.value)} /></div>
          <div><Label>CD APY (%)</Label><Input type="number" step="0.05" value={cdApy} onChange={e => setCdApy(+e.target.value)} /></div>
          <div><Label>HYSA current APY (%)</Label><Input type="number" step="0.05" value={hysaApy} onChange={e => setHysaApy(+e.target.value)} /></div>
          <div><Label>Expected HYSA rate drop (%)</Label><Input type="number" step="0.1" value={hysaRateDrop} onChange={e => setHysaRateDrop(+e.target.value)} /></div>
          <div><Label>Marginal tax rate (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(+e.target.value)} /></div>
          <div>
            <Label>Compounding</Label>
            <Select value={compound} onValueChange={v => setCompound(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Better after-tax pick</div>
          <div className="text-3xl font-bold text-primary">{r.winner}</div>
          <div className="text-xs text-muted-foreground mt-1">Advantage: <strong>{fmt(r.edge)}</strong> after tax over {cdTermMonths} months</div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">CD ({cdApy}% fixed)</div>
            <div className="text-xs text-muted-foreground">Ending balance</div>
            <div className="text-xl font-bold">{fmt(r.cdFinal)}</div>
            <div className="text-xs mt-1">Interest: {fmt(r.cdInterest)} · After-tax: {fmt(r.cdAfterTax)}</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="text-sm font-medium">HYSA (avg {(hysaApy - hysaRateDrop / 2).toFixed(2)}%)</div>
            <div className="text-xs text-muted-foreground">Ending balance</div>
            <div className="text-xl font-bold">{fmt(r.hysaFinal)}</div>
            <div className="text-xs mt-1">Interest: {fmt(r.hysaInterest)} · After-tax: {fmt(r.hysaAfterTax)}</div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">CDs lock rate; HYSA is liquid but variable. If you expect Fed cuts, CDs typically win. Interest is taxed as ordinary income federally, state-tax-free only on Treasuries.</div>
      </CardContent>
    </Card>
  );
}
