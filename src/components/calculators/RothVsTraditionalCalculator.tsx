import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Scale } from 'lucide-react';
import { rothVsTraditional } from '@/lib/investment/tax';

const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

export default function RothVsTraditionalCalculator() {
  const [annual, setAnnual] = useState(7000);
  const [years, setYears] = useState(30);
  const [ret, setRet] = useState(8);
  const [nowPct, setNowPct] = useState(22);
  const [retPct, setRetPct] = useState(15);

  const r = useMemo(() => rothVsTraditional({
    annualContribution: annual, years, returnPct: ret,
    marginalNow: nowPct / 100, marginalRetire: retPct / 100,
  }), [annual, years, ret, nowPct, retPct]);

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Scale className="h-5 w-5 text-primary" /> Roth vs Traditional</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-3 gap-3">
          <div><Label>Annual contribution</Label><Input type="number" value={annual} onChange={e => setAnnual(+e.target.value)} /></div>
          <div><Label>Years to retirement</Label><Input type="number" value={years} onChange={e => setYears(+e.target.value)} /></div>
          <div><Label>Expected return %</Label><Input type="number" value={ret} onChange={e => setRet(+e.target.value)} /></div>
          <div><Label>Marginal tax rate NOW %</Label><Input type="number" value={nowPct} onChange={e => setNowPct(+e.target.value)} /></div>
          <div><Label>Marginal tax rate at RETIREMENT %</Label><Input type="number" value={retPct} onChange={e => setRetPct(+e.target.value)} /></div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div className={`rounded-lg p-4 ${r.winner === 'roth' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/40'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold">Roth (post-tax)</div>
              {r.winner === 'roth' && <Badge>Winner</Badge>}
            </div>
            <div className="text-2xl font-bold">{fmt(r.roth)}</div>
            <div className="text-xs text-muted-foreground mt-1">Contribute after tax; withdraw tax-free.</div>
          </div>
          <div className={`rounded-lg p-4 ${r.winner === 'traditional' ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/40'}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="text-sm font-semibold">Traditional (pre-tax)</div>
              {r.winner === 'traditional' && <Badge>Winner</Badge>}
            </div>
            <div className="text-2xl font-bold">{fmt(r.traditional)}</div>
            <div className="text-xs text-muted-foreground mt-1">Deduct now; taxed at withdrawal.</div>
          </div>
        </div>

        <div className="rounded-lg bg-primary/5 p-3 text-sm">
          {r.winner === 'roth' ? 'Roth' : 'Traditional'} wins by <strong>{fmt(r.differenceUSD)}</strong> in after-tax value. Rule of thumb: if you expect a <em>higher</em> tax rate in retirement, prefer Roth. If <em>lower</em>, prefer Traditional.
        </div>
      </CardContent>
    </Card>
  );
}
