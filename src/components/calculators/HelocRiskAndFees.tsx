import { useMemo, useState } from 'react';
import { AlertTriangle, Info, Percent, ShieldAlert, Receipt } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useCurrency } from '@/hooks/use-currency';
import CollapsibleSection from '@/components/CollapsibleSection';

interface Props {
  helocBalance: number;
  helocRate: number;
  monthlySurplus: number;
}

/**
 * HELOC-specific risk, fees & tax modeling.
 * Covers three internet-standard gaps competitor HELOC calcs address:
 *   1. Variable-rate stress (what if prime rises 1–3%?)
 *   2. Real closing/annual fees + true APR
 *   3. TCJA tax-deductibility flag (only if used to buy/build/improve the home)
 */
export default function HelocRiskAndFees({ helocBalance, helocRate, monthlySurplus }: Props) {
  const { formatCurrency } = useCurrency();

  const [rateShock, setRateShock] = useState<number>(2);
  const [closingCosts, setClosingCosts] = useState<string>('2500');
  const [annualFee, setAnnualFee] = useState<string>('75');
  const [earlyTerm, setEarlyTerm] = useState<string>('500');
  const [usedForHome, setUsedForHome] = useState<boolean>(false);
  const [taxBracket, setTaxBracket] = useState<string>('24');
  const [itemizes, setItemizes] = useState<boolean>(false);

  const shocked = useMemo(() => {
    const scenarios = [0, 1, 2, 3].map(delta => {
      const rate = helocRate + delta;
      const annualInterest = helocBalance * (rate / 100);
      const monthlyInterest = annualInterest / 12;
      const surplusAfter = monthlySurplus - (monthlyInterest - helocBalance * (helocRate / 100) / 12);
      const survives = surplusAfter > 0;
      return { delta, rate, monthlyInterest, surplusAfter, survives };
    });
    return scenarios;
  }, [helocBalance, helocRate, monthlySurplus]);

  const currentShockRow = shocked.find(s => s.delta === rateShock);

  const feesTotal = useMemo(() => {
    const closing = parseFloat(closingCosts) || 0;
    const annual = parseFloat(annualFee) || 0;
    const early = parseFloat(earlyTerm) || 0;
    // Assume 5-yr average HELOC life
    return { closing, annual5yr: annual * 5, early, total: closing + annual * 5 };
  }, [closingCosts, annualFee, earlyTerm]);

  const tax = useMemo(() => {
    const bracket = (parseFloat(taxBracket) || 0) / 100;
    const deductible = usedForHome && itemizes;
    const effectiveRate = deductible ? helocRate * (1 - bracket) : helocRate;
    const annualInterest = helocBalance * (helocRate / 100);
    const annualSavings = deductible ? annualInterest * bracket : 0;
    return { deductible, effectiveRate, annualSavings };
  }, [helocRate, helocBalance, taxBracket, usedForHome, itemizes]);

  return (
    <Card className="glass-card border-amber-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldAlert className="h-5 w-5 text-amber-500" /> HELOC risk, fees & tax
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          The three things every HELOC calculator on the internet gets wrong: variable-rate risk, real fees, and when interest is actually deductible.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ─── Variable-rate stress test ─── */}
        <CollapsibleSection
          title="Variable-rate stress test"
          subtitle="HELOCs are prime-based — what if rates rise?"
          icon={Percent}
          defaultOpen
        >
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs flex justify-between">
                <span>Rate shock</span>
                <span className="text-primary font-mono">+{rateShock}% (new rate {(helocRate + rateShock).toFixed(2)}%)</span>
              </Label>
              <Slider value={[rateShock]} min={0} max={5} step={0.5} onValueChange={v => setRateShock(v[0])} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {shocked.map(s => (
                <div
                  key={s.delta}
                  className={cn(
                    'rounded-lg border p-2 text-xs cursor-pointer transition-colors',
                    s.delta === rateShock ? 'border-primary bg-primary/10' : 'border-border/40 bg-muted/20 hover:bg-muted/40',
                    !s.survives && 'border-destructive/40 bg-destructive/5'
                  )}
                  onClick={() => setRateShock(s.delta)}
                >
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">+{s.delta}%</div>
                  <div className="font-bold">{s.rate.toFixed(2)}%</div>
                  <div className="text-[10px] text-muted-foreground">{formatCurrency(s.monthlyInterest)}/mo int</div>
                  <div className={cn('text-[10px] font-semibold mt-0.5', s.survives ? 'text-emerald-600' : 'text-destructive')}>
                    {s.survives ? '✓ survives' : '✗ tight'}
                  </div>
                </div>
              ))}
            </div>
            {currentShockRow && !currentShockRow.survives && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive flex gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div>
                  At +{rateShock}%, your surplus after HELOC interest drops to {formatCurrency(currentShockRow.surplusAfter)}/mo.
                  Consider a rate-cap product or fixed-rate lock option.
                </div>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground italic">
              Since 2022, prime rose from 3.25% → 8.5% (+525 bps). A HELOC strategy that only works at today's rate is fragile.
            </p>
          </div>
        </CollapsibleSection>

        {/* ─── Fees & true APR ─── */}
        <CollapsibleSection
          title="Real fees & closing costs"
          subtitle={`~${formatCurrency(feesTotal.total)} over a typical 5-yr HELOC`}
          icon={Receipt}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label className="text-xs">Closing costs ($)</Label>
              <Input type="number" min="0" value={closingCosts} onChange={e => setClosingCosts(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Annual fee ($)</Label>
              <Input type="number" min="0" value={annualFee} onChange={e => setAnnualFee(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Early-termination fee ($)</Label>
              <Input type="number" min="0" value={earlyTerm} onChange={e => setEarlyTerm(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
            <FeeStat label="Upfront closing" value={formatCurrency(feesTotal.closing)} />
            <FeeStat label="5-yr annual fees" value={formatCurrency(feesTotal.annual5yr)} />
            <FeeStat label="Early-term risk" value={formatCurrency(feesTotal.early)} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-3">
            Typical HELOC: $0–$4,000 closing (some lenders waive), $50–$100 annual, $300–$500 if closed in first 3 years. Add these to compare true cost vs. cash-out refi.
          </p>
        </CollapsibleSection>

        {/* ─── Tax deductibility ─── */}
        <CollapsibleSection
          title="Tax deductibility (TCJA rules)"
          subtitle={tax.deductible ? `Effective rate: ${tax.effectiveRate.toFixed(2)}% — saves ${formatCurrency(tax.annualSavings)}/yr` : 'Not deductible with current use'}
          icon={Info}
          accent={tax.deductible}
        >
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs">
              <div className="font-semibold text-amber-700 dark:text-amber-400 mb-1">TCJA rule (2018–2025+)</div>
              HELOC interest is <strong>only deductible</strong> if the proceeds are used to <em>buy, build, or substantially improve</em> the home securing the loan. Using it to pay off credit cards, buy a car, or invest → <strong>not deductible</strong>.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm rounded-lg border border-border/40 bg-muted/20 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={usedForHome} onChange={e => setUsedForHome(e.target.checked)} />
                Used for home improvements
              </label>
              <label className="flex items-center gap-2 text-sm rounded-lg border border-border/40 bg-muted/20 px-3 py-2 cursor-pointer">
                <input type="checkbox" checked={itemizes} onChange={e => setItemizes(e.target.checked)} />
                I itemize (vs. standard deduction)
              </label>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs">Marginal tax bracket (%)</Label>
                <Input type="number" min="0" max="50" value={taxBracket} onChange={e => setTaxBracket(e.target.value)} />
              </div>
            </div>
            <div className={cn('rounded-lg border p-3 text-sm', tax.deductible ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-border/40 bg-muted/20 text-muted-foreground')}>
              {tax.deductible ? (
                <>
                  <strong>Effective rate: {tax.effectiveRate.toFixed(2)}%</strong> (stated {helocRate}% × (1 − {taxBracket}%)). Annual tax savings ~{formatCurrency(tax.annualSavings)}.
                </>
              ) : (
                <>Stated rate {helocRate}% is your true cost. Deduction requires <strong>both</strong> home-improvement use <strong>and</strong> itemizing.</>
              )}
            </div>
          </div>
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}

function FeeStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/20 p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  );
}
