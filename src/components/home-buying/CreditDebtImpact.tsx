import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, TrendingDown } from 'lucide-react';
import { calcMortgage, estimateRateForFico, fmt$ } from '@/lib/home-buying/mortgage-math';
import { LOAN_DTI_LIMITS, LOAN_PROGRAM_OPTIONS, type LoanProgram } from '@/lib/home-buying/loan-dti-limits';
import { loadMortgageFico, saveMortgageFico, qualifyingFico, eligiblePrograms, BUREAU_MODEL, type MortgageFico } from '@/lib/home-buying/mortgage-fico';

export default function CreditDebtImpact({ price: priceProp, onPriceChange }: { price?: number; onPriceChange?: (n: number) => void } = {}) {
  const [priceLocal, setPriceLocal] = useState(350000);
  const price = priceProp ?? priceLocal;
  const setPrice = (n: number) => { onPriceChange ? onPriceChange(n) : setPriceLocal(n); };
  const [downPct, setDownPct] = useState(10);
  const [scores, setScoresState] = useState<MortgageFico>(() => loadMortgageFico());
  const setScores = (s: MortgageFico) => { setScoresState(s); saveMortgageFico(s); };
  const qualifying = qualifyingFico(scores);
  const [ficoOverride, setFicoOverride] = useState<number | null>(null);
  const fico = ficoOverride ?? qualifying ?? 700;
  const setFico = (n: number) => setFicoOverride(n);
  const [monthlyDebt, setMonthlyDebt] = useState(600);
  const [grossIncome, setGrossIncome] = useState(7500);
  const [program, setProgram] = useState<LoanProgram>('conventional');


  const limits = LOAN_DTI_LIMITS[program];

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

  // Approximate PITI = P&I × ~1.33 (adds tax/ins/PMI). Users can refine in the Affordability calc.
  const estimatedPITI = mine.monthlyPI * 1.33;
  const housingMax = grossIncome * (limits.frontEndPct / 100);
  const totalDtiMax = grossIncome * (limits.backEndPct / 100);
  const stretchDtiMax = grossIncome * (limits.backEndStretchPct / 100);
  const frontEndActual = grossIncome > 0 ? (estimatedPITI / grossIncome) * 100 : 0;
  const backEndActual = grossIncome > 0 ? ((estimatedPITI + monthlyDebt) / grossIncome) * 100 : 0;
  const remainingDtiRoom = Math.max(0, totalDtiMax - monthlyDebt - estimatedPITI);
  const frontEndOk = frontEndActual <= limits.frontEndPct;
  const backEndOk = backEndActual <= limits.backEndPct;
  const backEndStretch = backEndActual > limits.backEndPct && backEndActual <= limits.backEndStretchPct;

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display">
          <CreditCard className="h-5 w-5 text-prism-indigo" />
          Credit & Debt Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div><Label className="text-xs">Home Price</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
          <div><Label className="text-xs">Down %</Label><Input type="number" value={downPct} onChange={(e) => setDownPct(+e.target.value)} /></div>
          <div><Label className="text-xs">Your FICO</Label><Input type="number" value={fico} onChange={(e) => setFico(+e.target.value)} /></div>
          <div><Label className="text-xs">Other Debts/mo</Label><Input type="number" value={monthlyDebt} onChange={(e) => setMonthlyDebt(+e.target.value)} /></div>
          <div><Label className="text-xs">Gross Income/mo</Label><Input type="number" value={grossIncome} onChange={(e) => setGrossIncome(+e.target.value)} /></div>
          <div>
            <Label className="text-xs">Loan Program</Label>
            <Select value={program} onValueChange={(v) => setProgram(v as LoanProgram)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LOAN_PROGRAM_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{LOAN_DTI_LIMITS[p].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        {/* DTI panel — driven by selected loan program */}
        <div className="rounded-lg border border-border/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {limits.label} DTI Guidelines
            </p>
            <span className="text-[10px] text-muted-foreground">
              Front-end {limits.frontEndPct}% · Back-end {limits.backEndPct}% (stretch {limits.backEndStretchPct}%)
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border/40 bg-card/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Housing Max ({limits.frontEndPct}%)</p>
              <p className="font-display text-lg font-bold">{fmt$(housingMax)}/mo</p>
              <p className="text-[10px] text-muted-foreground">P&amp;I + tax + ins + HOA</p>
            </div>
            <div className={`rounded-lg border p-3 ${frontEndOk ? 'border-prism-teal/30 bg-prism-teal/5' : 'border-prism-rose/40 bg-prism-rose/5'}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Est. Front-end DTI</p>
              <p className="font-display text-lg font-bold">{frontEndActual.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">~{fmt$(estimatedPITI)}/mo PITI</p>
            </div>
            <div className="rounded-lg border border-border/40 bg-card/40 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Back-end Max ({limits.backEndPct}%)</p>
              <p className="font-display text-lg font-bold">{fmt$(totalDtiMax)}/mo</p>
              <p className="text-[10px] text-muted-foreground">Stretch: {fmt$(stretchDtiMax)}</p>
            </div>
            <div className={`rounded-lg border p-3 ${backEndOk ? 'border-prism-teal/30 bg-prism-teal/5' : backEndStretch ? 'border-prism-amber/40 bg-prism-amber/5' : 'border-prism-rose/40 bg-prism-rose/5'}`}>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Est. Back-end DTI</p>
              <p className="font-display text-lg font-bold">{backEndActual.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">Room: {fmt$(remainingDtiRoom)}/mo</p>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground italic">{limits.notes}</p>
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
