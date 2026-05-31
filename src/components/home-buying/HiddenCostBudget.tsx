import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wrench, AlertTriangle } from 'lucide-react';
import { fmt$ } from '@/lib/home-buying/mortgage-math';

export default function HiddenCostBudget() {
  const [price, setPrice] = useState(350000);
  const [maintPct, setMaintPct] = useState(1.5);
  const [utilities, setUtilities] = useState(220);
  const [hoa, setHoa] = useState(0);
  const [lawn, setLawn] = useState(60);
  const [pest, setPest] = useState(40);

  const reserves = useMemo(() => ({
    Roof: price * 0.015,        // ~$5k–$15k lifecycle reserve
    HVAC: 8000,
    'Water heater': 1800,
    'Appliances': 3500,
    'Exterior paint': 5000,
  }), [price]);

  const annualMaint = (maintPct / 100) * price;
  const monthlyAddOns = utilities + hoa + lawn + pest + annualMaint / 12;
  const totalReserve = Object.values(reserves).reduce((s, v) => s + v, 0);

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <Wrench className="h-5 w-5 text-prism-orange" />
          Hidden Cost & Repair Budget
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div><Label className="text-xs">Home Price</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
          <div><Label className="text-xs">Maintenance % / yr</Label><Input type="number" step="0.1" value={maintPct} onChange={(e) => setMaintPct(+e.target.value)} /></div>
          <div><Label className="text-xs">Utilities / mo</Label><Input type="number" value={utilities} onChange={(e) => setUtilities(+e.target.value)} /></div>
          <div><Label className="text-xs">HOA / mo</Label><Input type="number" value={hoa} onChange={(e) => setHoa(+e.target.value)} /></div>
          <div><Label className="text-xs">Lawn / mo</Label><Input type="number" value={lawn} onChange={(e) => setLawn(+e.target.value)} /></div>
          <div><Label className="text-xs">Pest / mo</Label><Input type="number" value={pest} onChange={(e) => setPest(+e.target.value)} /></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-prism-orange/30 bg-prism-orange/5 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">True Monthly Add-on</p>
            <p className="font-display text-xl font-bold prism-gradient-text">{fmt$(monthlyAddOns)}</p>
            <p className="text-[10px] text-muted-foreground">on top of your mortgage</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Annual Maintenance</p>
            <p className="font-display text-xl font-bold">{fmt$(annualMaint)}</p>
            <p className="text-[10px] text-muted-foreground">{maintPct}% of price</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 text-prism-amber" />
            Major Repair Reserves (build over time)
          </p>
          <div className="rounded-lg border border-border/40 divide-y divide-border/40">
            {Object.entries(reserves).map(([label, value]) => (
              <div key={label} className="flex items-center justify-between p-2.5 text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium">{fmt$(value)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between p-3 bg-muted/30">
              <span className="font-display font-bold">Total Reserve Target</span>
              <span className="font-display text-lg font-bold">{fmt$(totalReserve)}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
