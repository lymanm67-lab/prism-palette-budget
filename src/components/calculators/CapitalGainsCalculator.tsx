import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Receipt } from 'lucide-react';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

// 2025 simplified LTCG brackets (single)
function ltcgRate(income: number, filing: 'single' | 'mfj') {
  const t = filing === 'single'
    ? [{ upTo: 48_350, rate: 0 }, { upTo: 533_400, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }]
    : [{ upTo: 96_700, rate: 0 }, { upTo: 600_050, rate: 0.15 }, { upTo: Infinity, rate: 0.20 }];
  for (const b of t) if (income <= b.upTo) return b.rate;
  return 0.20;
}
// 2025 simplified ordinary brackets (single/mfj) for short-term
function ordRate(income: number, filing: 'single' | 'mfj') {
  const s = [11925, 48475, 103350, 197300, 250525, 626350];
  const m = [23850, 96950, 206700, 394600, 501050, 751600];
  const cuts = filing === 'single' ? s : m;
  const rates = [0.10, 0.12, 0.22, 0.24, 0.32, 0.35, 0.37];
  for (let i = 0; i < cuts.length; i++) if (income <= cuts[i]) return rates[i];
  return rates[rates.length - 1];
}

export default function CapitalGainsCalculator() {
  const [proceeds, setProceeds] = useState(50000);
  const [basis, setBasis] = useState(30000);
  const [holding, setHolding] = useState<'short' | 'long'>('long');
  const [income, setIncome] = useState(120000);
  const [filing, setFiling] = useState<'single' | 'mfj'>('single');
  const [stateRate, setStateRate] = useState(5);

  const r = useMemo(() => {
    const gain = proceeds - basis;
    const fedRate = holding === 'long' ? ltcgRate(income, filing) : ordRate(income, filing);
    const niit = income > (filing === 'single' ? 200_000 : 250_000) && gain > 0 ? 0.038 : 0;
    const fed = Math.max(0, gain) * fedRate;
    const niitTax = Math.max(0, gain) * niit;
    const st = Math.max(0, gain) * (stateRate / 100);
    const total = fed + niitTax + st;
    return { gain, fedRate, fed, niitTax, st, total, net: gain - total };
  }, [proceeds, basis, holding, income, filing, stateRate]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Receipt className="h-5 w-5 text-primary" /> Capital Gains Tax</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div><Label>Sale proceeds</Label><Input type="number" value={proceeds} onChange={e => setProceeds(+e.target.value)} /></div>
          <div><Label>Cost basis</Label><Input type="number" value={basis} onChange={e => setBasis(+e.target.value)} /></div>
          <div>
            <Label>Holding period</Label>
            <Select value={holding} onValueChange={v => setHolding(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="long">Long-term (&gt; 1 year)</SelectItem>
                <SelectItem value="short">Short-term (≤ 1 year)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Filing status</Label>
            <Select value={filing} onValueChange={v => setFiling(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="mfj">Married filing jointly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Other taxable income</Label><Input type="number" value={income} onChange={e => setIncome(+e.target.value)} /></div>
          <div><Label>State tax rate (%)</Label><Input type="number" value={stateRate} onChange={e => setStateRate(+e.target.value)} /></div>
        </div>

        <div className="rounded-lg bg-primary/10 p-4">
          <div className="text-sm text-muted-foreground">Total tax owed</div>
          <div className="text-3xl font-bold text-primary">{fmt(r.total)}</div>
          <div className="text-xs text-muted-foreground mt-1">Net proceeds after tax: <strong>{fmt(r.net)}</strong></div>
        </div>

        <div className="grid md:grid-cols-4 gap-2 text-sm">
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Realized gain</div><div className="font-semibold">{fmt(r.gain)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">Federal ({(r.fedRate * 100).toFixed(0)}%)</div><div className="font-semibold">{fmt(r.fed)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">NIIT (3.8%)</div><div className="font-semibold">{fmt(r.niitTax)}</div></div>
          <div className="rounded bg-muted/40 p-2"><div className="text-xs text-muted-foreground">State</div><div className="font-semibold">{fmt(r.st)}</div></div>
        </div>

        <div className="text-xs text-muted-foreground">Estimate only — excludes AMT, wash-sale rules, and state-specific treatment. Long-term gains held &gt; 1 year get preferential rates.</div>
      </CardContent>
    </Card>
  );
}
