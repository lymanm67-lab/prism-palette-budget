import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldOff, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';

// Months for balance to reach targetLTV of homeValue via extra-principal each month.
function monthsToLtv(balance: number, apr: number, monthlyPayment: number, homeValue: number, targetLtv: number, extra = 0, maxMonths = 720) {
  const targetBalance = homeValue * targetLtv;
  const r = apr / 100 / 12;
  let bal = balance;
  for (let m = 1; m <= maxMonths; m++) {
    const interest = bal * r;
    const principal = (monthlyPayment + extra) - interest;
    if (principal <= 0) return Infinity;
    bal = Math.max(0, bal - principal);
    if (bal <= targetBalance) return m;
  }
  return Infinity;
}

export default function PmiDropoff({ balance, homeValue, rate, monthlyPayment }: {
  balance?: number; homeValue?: number; rate?: number; monthlyPayment?: number;
}) {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  const bal = balance ?? p.mortgageBalance ?? 350000;
  const hv = homeValue ?? p.homeValue ?? 500000;
  const apr = rate ?? 6.5;
  const pmt = monthlyPayment ?? 0;

  const [monthlyPmi, setMonthlyPmi] = useState(180); // typical: 0.5-1% annual / 12
  const [extra, setExtra] = useState(200);

  const currentLtv = hv > 0 ? (bal / hv) * 100 : 0;
  const hasPmi = currentLtv > 80;

  const analysis = useMemo(() => {
    if (!hasPmi || pmt === 0) return null;
    const baseline = monthsToLtv(bal, apr, pmt, hv, 0.78, 0);
    const accelerated = monthsToLtv(bal, apr, pmt, hv, 0.78, extra);
    const monthsSaved = baseline - accelerated;
    const pmiSaved = monthsSaved * monthlyPmi;
    return { baseline, accelerated, monthsSaved, pmiSaved };
  }, [bal, apr, pmt, hv, extra, monthlyPmi, hasPmi]);

  if (!hasPmi) {
    return (
      <Card className="glass-card border-emerald-500/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            PMI Status: You're Clear
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Your LTV is <span className="font-mono font-semibold text-foreground">{currentLtv.toFixed(1)}%</span> — below the 80% threshold, so no PMI applies. Nothing to accelerate here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card border-amber-500/40 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldOff className="h-5 w-5 text-amber-500" />
          PMI Drop-off Milestone
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Your LTV is <span className="font-mono font-semibold text-foreground">{currentLtv.toFixed(1)}%</span>. At 78% LTV, PMI drops off automatically — free money on the table.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Your monthly PMI</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">$</span>
              <Input type="number" value={monthlyPmi || ''} onChange={(e) => setMonthlyPmi(parseFloat(e.target.value) || 0)} className="h-9 pl-6" />
            </div>
            <p className="text-[10px] text-muted-foreground">Check your statement — typically 0.5–1% of balance annually.</p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Extra principal / month</Label>
            <div className="relative">
              <span className="absolute left-2.5 top-2 text-xs text-muted-foreground">$</span>
              <Input type="number" value={extra || ''} onChange={(e) => setExtra(parseFloat(e.target.value) || 0)} className="h-9 pl-6" />
            </div>
            <p className="text-[10px] text-muted-foreground">Applied every month until PMI drops off.</p>
          </div>
        </div>

        {analysis && (
          <>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-border/50 bg-card/50 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">At current pace</div>
                <div className="font-semibold text-sm mt-0.5">{isFinite(analysis.baseline) ? `${(analysis.baseline / 12).toFixed(1)} yr` : '—'}</div>
                <div className="text-[10px] text-muted-foreground">to hit 78% LTV</div>
              </div>
              <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">With +{formatCurrency(extra)}/mo</div>
                <div className="font-semibold text-sm mt-0.5">{isFinite(analysis.accelerated) ? `${(analysis.accelerated / 12).toFixed(1)} yr` : '—'}</div>
                <div className="text-[10px] text-muted-foreground">to hit 78% LTV</div>
              </div>
              <div className="rounded-lg border border-primary/40 bg-primary/5 p-2.5">
                <div className="text-[10px] uppercase tracking-wider text-primary">PMI saved</div>
                <div className="font-semibold text-sm mt-0.5 text-primary">{formatCurrency(analysis.pmiSaved)}</div>
                <div className="text-[10px] text-muted-foreground">{analysis.monthsSaved} months earlier</div>
              </div>
            </div>

            <div className={cn(
              'rounded-lg border p-3 text-xs',
              analysis.pmiSaved > extra * 12
                ? 'border-emerald-500/40 bg-emerald-500/5'
                : 'border-amber-500/40 bg-amber-500/5'
            )}>
              <span className="font-semibold text-foreground">Verdict: </span>
              {analysis.pmiSaved > extra * 12
                ? `Killing PMI ${analysis.monthsSaved} months early saves ${formatCurrency(analysis.pmiSaved)} — that's a ${((analysis.pmiSaved / (extra * analysis.accelerated)) * 100).toFixed(0)}% return on your extra payments before you even count avoided interest. Do this.`
                : `You'd save ${formatCurrency(analysis.pmiSaved)} in PMI. Also request cancellation manually once you hit 80% LTV (federal law requires servicer approval) — don't wait for 78%.`}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
