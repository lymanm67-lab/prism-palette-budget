import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Home, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';

interface Props {
  homeValue: number;
  principalInterest: number; // monthly P&I
}

export default function EscrowBreakdown({ homeValue, principalInterest }: Props) {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  // Sensible defaults — property tax ≈ 1.1% national avg, insurance ≈ 0.35% of home value
  const [annualTax, setAnnualTax] = useState(Math.round(homeValue * 0.011));
  const [annualInsurance, setAnnualInsurance] = useState(Math.round(homeValue * 0.0035));
  const [monthlyPmi, setMonthlyPmi] = useState(0);
  const [monthlyHoa, setMonthlyHoa] = useState(0);

  const view = useMemo(() => {
    const monthlyTax = annualTax / 12;
    const monthlyInsurance = annualInsurance / 12;
    const escrow = monthlyTax + monthlyInsurance + monthlyPmi;
    const piti = principalInterest + escrow;
    const pitiPlusHoa = piti + monthlyHoa;
    const grossMonthlyIncome = p.totalIncome; // already monthly
    const frontEndDti = grossMonthlyIncome > 0 ? (pitiPlusHoa / grossMonthlyIncome) * 100 : 0;
    const effectiveRateAddOn = homeValue > 0 ? ((annualTax + annualInsurance) / homeValue) * 100 : 0;
    return { monthlyTax, monthlyInsurance, escrow, piti, pitiPlusHoa, frontEndDti, effectiveRateAddOn };
  }, [annualTax, annualInsurance, monthlyPmi, monthlyHoa, principalInterest, p.totalIncome, homeValue]);

  const dtiOk = view.frontEndDti > 0 && view.frontEndDti <= 28;
  const dtiWarn = view.frontEndDti > 28 && view.frontEndDti <= 36;

  return (
    <Card className="glass-card border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" />
          Escrow &amp; True Monthly Payment (PITI)
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your <span className="font-mono">$</span>-figure mortgage payment is only part of the story. Add taxes, insurance, PMI, and HOA to see your <span className="font-semibold text-foreground">true housing cost</span>.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inputs */}
        <div className="grid md:grid-cols-4 gap-3">
          <NumInput label="Annual property tax" prefix="$" value={annualTax} onChange={setAnnualTax} hint={`~${(annualTax / Math.max(homeValue, 1) * 100).toFixed(2)}% of home value`} />
          <NumInput label="Annual insurance" prefix="$" value={annualInsurance} onChange={setAnnualInsurance} hint="Homeowners policy" />
          <NumInput label="Monthly PMI" prefix="$" value={monthlyPmi} onChange={setMonthlyPmi} hint="0 if LTV ≤ 80%" />
          <NumInput label="Monthly HOA" prefix="$" value={monthlyHoa} onChange={setMonthlyHoa} hint="Condo/townhome dues" />
        </div>

        {/* Breakdown */}
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-primary mb-3">Monthly payment breakdown</div>
          <div className="space-y-1.5 text-sm">
            <Row label="Principal &amp; Interest (P&amp;I)" value={formatCurrency(principalInterest)} />
            <Row label="Property tax" value={formatCurrency(view.monthlyTax)} muted />
            <Row label="Insurance" value={formatCurrency(view.monthlyInsurance)} muted />
            {monthlyPmi > 0 && <Row label="PMI" value={formatCurrency(monthlyPmi)} muted />}
            <div className="border-t border-border/50 my-1.5" />
            <Row label="PITI (what your servicer collects)" value={formatCurrency(view.piti)} bold />
            {monthlyHoa > 0 && (
              <>
                <Row label="+ HOA dues" value={formatCurrency(monthlyHoa)} muted />
                <div className="border-t border-border/50 my-1.5" />
                <Row label="True monthly housing cost" value={formatCurrency(view.pitiPlusHoa)} bold accent />
              </>
            )}
          </div>
        </div>

        {/* Insights */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className={cn(
            'rounded-xl border p-3 flex items-start gap-2',
            dtiOk ? 'border-emerald-500/40 bg-emerald-500/5' :
            dtiWarn ? 'border-amber-500/40 bg-amber-500/5' :
            'border-rose-500/40 bg-rose-500/5'
          )}>
            {dtiOk
              ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              : <AlertTriangle className={cn('h-4 w-4 shrink-0 mt-0.5', dtiWarn ? 'text-amber-500' : 'text-rose-500')} />}
            <div className="text-xs">
              <div className="font-semibold text-foreground">
                Front-end DTI: {view.frontEndDti.toFixed(1)}%
              </div>
              <div className="text-muted-foreground mt-0.5">
                {p.totalIncome === 0 ? 'Set your income in Profile to see this.' :
                 dtiOk ? 'Comfortable. Lenders like ≤28% housing-to-income.' :
                 dtiWarn ? 'Tight. Lenders accept up to 36% but you\'ll feel it monthly.' :
                 'Stretched. Above 36% is a red flag for lenders and your cash flow.'}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/50 bg-card/50 p-3 text-xs">
            <div className="font-semibold text-foreground">Escrow adds {view.effectiveRateAddOn.toFixed(2)}% to your effective housing rate</div>
            <div className="text-muted-foreground mt-0.5">
              Tax + insurance = {formatCurrency(annualTax + annualInsurance)}/yr on a {formatCurrency(homeValue)} home. These <span className="font-semibold text-foreground">never go away</span> — even after mortgage payoff, you'll owe this forever. Budget accordingly.
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NumInput({ label, value, onChange, prefix, hint }: { label: string; value: number; onChange: (v: number) => void; prefix?: string; hint?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-2 text-[10px] text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn('h-8 text-xs', prefix && 'pl-5')}
        />
      </div>
      {hint && <p className="text-[9px] text-muted-foreground leading-tight">{hint}</p>}
    </div>
  );
}

function Row({ label, value, muted, bold, accent }: { label: string; value: string; muted?: boolean; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex justify-between items-baseline">
      <span
        className={cn(
          muted && 'text-muted-foreground',
          bold && 'font-semibold text-foreground',
          accent && 'text-primary'
        )}
        dangerouslySetInnerHTML={{ __html: label }}
      />
      <span className={cn(
        'font-mono tabular-nums',
        bold && 'font-bold',
        accent && 'text-primary text-base'
      )}>{value}</span>
    </div>
  );
}
