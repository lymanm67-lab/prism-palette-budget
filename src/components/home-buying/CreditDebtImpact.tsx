import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, TrendingDown } from 'lucide-react';
import { calcMortgage, estimateRateForFico, fmt$ } from '@/lib/home-buying/mortgage-math';

export default function CreditDebtImpact() {
  const [price, setPrice] = useState(350000);
  const [downPct, setDownPct] = useState(10);
  const [fico, setFico] = useState(700);
  const [monthlyDebt, setMonthlyDebt] = useState(600);
  const [grossIncome, setGrossIncome] = useState(7500);

  const bands = useMemo(() => {
    return [620, 660, 700, 740, 760, 800].map((band) => {
      const rate = estimateRateForFico(band);
      const m = calcMortgage({ price, downPct, ratePct: rate, termYears: 30 });
      return { band, rate, monthly: m.monthlyPI, totalInterest: m.totalInterest };
    });
  }, [price, downPct]);

  const mine = useMemo(() => calcMortgage({ price, downPct, ratePct: estimateRateForFico(fico), termYears: 30 }), [price, downPct, fico]);
  const at740 = useMemo(() => calcMortgage({ price, downPct, ratePct: estimateRateForFico(Math.max(fico, 740)), termYears: 30 }), [price, downPct, fico]);
  const savings = mine.totalInterest - at740.totalInterest;

  const housingMax = grossIncome * 0.28;
  const totalDtiMax = grossIncome * 0.36;
  const remainingDtiRoom = Math.max(0, totalDtiMax - monthlyDebt - mine.monthlyPI);

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <CreditCard className="h-5 w-5 text-prism-indigo" />
          Credit & Debt Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div><Label className="text-xs">Home Price</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
          <div><Label className="text-xs">Down %</Label><Input type="number" value={downPct} onChange={(e) => setDownPct(+e.target.value)} /></div>
          <div><Label className="text-xs">Your FICO</Label><Input type="number" value={fico} onChange={(e) => setFico(+e.target.value)} /></div>
          <div><Label className="text-xs">Other Debts/mo</Label><Input type="number" value={monthlyDebt} onChange={(e) => setMonthlyDebt(+e.target.value)} /></div>
          <div><Label className="text-xs">Gross Income/mo</Label><Input type="number" value={grossIncome} onChange={(e) => setGrossIncome(+e.target.value)} /></div>
        </div>

        {fico < 740 && savings > 0 && (
          <div className="rounded-lg border border-prism-teal/30 bg-prism-teal/5 p-4">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-bold flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-prism-teal" /> Raise FICO to 740 →
            </p>
            <p className="font-display text-2xl font-bold prism-gradient-text mt-1">{fmt$(savings)} saved</p>
            <p className="text-xs text-muted-foreground">over the life of a 30-year loan</p>
          </div>
        )}

        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Rate by FICO Band (30-yr)</p>
          <div className="rounded-lg border border-border/40 divide-y divide-border/40">
            {bands.map((b) => (
              <div key={b.band} className={`flex items-center justify-between p-2.5 text-sm ${b.band <= fico && fico < b.band + 20 ? 'bg-prism-teal/5' : ''}`}>
                <span className="font-mono">{b.band}+</span>
                <span className="text-muted-foreground">{b.rate.toFixed(2)}%</span>
                <span className="font-mono font-medium">{fmt$(b.monthly)}/mo</span>
                <span className="text-xs text-muted-foreground">{fmt$(b.totalInterest)} total interest</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-border/40 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Housing Max (28%)</p>
            <p className="font-display text-lg font-bold">{fmt$(housingMax)}/mo</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-card/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Your P&I</p>
            <p className="font-display text-lg font-bold">{fmt$(mine.monthlyPI)}/mo</p>
          </div>
          <div className={`rounded-lg border p-3 ${remainingDtiRoom > 0 ? 'border-prism-teal/30 bg-prism-teal/5' : 'border-prism-rose/40 bg-prism-rose/5'}`}>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">DTI Room (36%)</p>
            <p className="font-display text-lg font-bold">{fmt$(remainingDtiRoom)}/mo</p>
          </div>
        </div>

        {monthlyDebt > 0 && (
          <p className="text-xs text-muted-foreground">
            💡 Paying off <strong>{fmt$(monthlyDebt)}/mo</strong> in other debts gives you that much more DTI headroom and could qualify you for a larger loan.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
