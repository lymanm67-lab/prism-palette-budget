import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';

function payment(balance: number, apr: number, months: number) {
  const r = apr / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function totalInterest(balance: number, apr: number, months: number, monthlyPayment: number) {
  const r = apr / 100 / 12;
  let bal = balance;
  let total = 0;
  for (let m = 1; m <= months; m++) {
    const interest = bal * r;
    const principal = monthlyPayment - interest;
    if (principal <= 0) return Infinity;
    total += interest;
    bal = Math.max(0, bal - principal);
    if (bal <= 0.01) return total;
  }
  return total;
}

export default function RefinanceCheck({ currentBalance, currentRate, currentPayment, remainingYears }: {
  currentBalance?: number; currentRate?: number; currentPayment?: number; remainingYears?: number;
}) {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  const [balance, setBalance] = useState(currentBalance ?? p.mortgageBalance ?? 350000);
  const [oldRate, setOldRate] = useState(currentRate ?? 6.5);
  const [oldPayment, setOldPayment] = useState(currentPayment ?? 0);
  const [oldYears, setOldYears] = useState(remainingYears ?? 28);
  const [newRate, setNewRate] = useState(5.75);
  const [newTerm, setNewTerm] = useState(15);
  const [closingCosts, setClosingCosts] = useState(6000);

  useEffect(() => {
    if (oldPayment === 0) setOldPayment(Math.round(payment(balance, oldRate, oldYears * 12)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const analysis = useMemo(() => {
    const newMonthlyPayment = payment(balance + closingCosts, newRate, newTerm * 12);
    const monthlyDelta = newMonthlyPayment - oldPayment;

    const oldTotalInterest = totalInterest(balance, oldRate, oldYears * 12, oldPayment);
    const newTotalInterest = totalInterest(balance + closingCosts, newRate, newTerm * 12, newMonthlyPayment);
    const interestSaved = oldTotalInterest - newTotalInterest;

    // Break-even: closing costs ÷ monthly interest savings (approximation via first-year interest delta)
    const oldFirstYearInterest = balance * (oldRate / 100);
    const newFirstYearInterest = (balance + closingCosts) * (newRate / 100);
    const annualInterestSavings = oldFirstYearInterest - newFirstYearInterest;
    const breakEvenYears = annualInterestSavings > 0 ? closingCosts / annualInterestSavings : Infinity;

    const yearsSaved = oldYears - newTerm;
    const worthIt = interestSaved > closingCosts * 2 && (newRate < oldRate || yearsSaved >= 5);

    return {
      newMonthlyPayment,
      monthlyDelta,
      oldTotalInterest,
      newTotalInterest,
      interestSaved,
      breakEvenYears,
      yearsSaved,
      worthIt,
    };
  }, [balance, oldRate, oldYears, oldPayment, newRate, newTerm, closingCosts]);

  return (
    <Card className="glass-card border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-transparent">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <RefreshCw className="h-5 w-5 text-primary" />
          Refinance-First Check
          <Badge variant="secondary" className="ml-auto text-[10px]">Start here</Badge>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Before optimizing extra payments, ask: <span className="font-semibold text-foreground">would a refi to a shorter term at today's rate beat everything else?</span>
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          {/* Current */}
          <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your current loan</div>
            <NumInput label="Balance" prefix="$" value={balance} onChange={setBalance} />
            <div className="grid grid-cols-3 gap-2">
              <NumInput label="Rate %" step={0.125} value={oldRate} onChange={setOldRate} />
              <NumInput label="Years left" value={oldYears} onChange={setOldYears} />
              <NumInput label="Payment" prefix="$" value={oldPayment} onChange={setOldPayment} />
            </div>
          </div>

          {/* New */}
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-4 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wider text-primary">Refi scenario</div>
            <div className="grid grid-cols-3 gap-2">
              <NumInput label="New rate %" step={0.125} value={newRate} onChange={setNewRate} />
              <NumInput label="New term (yr)" value={newTerm} onChange={setNewTerm} />
              <NumInput label="Closing $" prefix="$" value={closingCosts} onChange={setClosingCosts} />
            </div>
            <div className="text-[10px] text-muted-foreground">
              15yr rates are typically 0.5–0.75% below 30yr. Closing costs run 2–5% of balance.
            </div>
          </div>
        </div>

        {/* Verdict */}
        <div className={cn(
          'rounded-xl border p-4 flex items-start gap-3',
          analysis.worthIt ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5'
        )}>
          {analysis.worthIt
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
            : <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />}
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm">
              {analysis.worthIt
                ? `Refi likely wins: save ${formatCurrency(analysis.interestSaved)}, pay off ${analysis.yearsSaved} yr sooner`
                : `Refi is questionable — run the numbers carefully`}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {analysis.worthIt
                ? `Payment changes by ${analysis.monthlyDelta >= 0 ? '+' : ''}${formatCurrency(analysis.monthlyDelta)}/mo. Break-even on closing costs in ~${isFinite(analysis.breakEvenYears) ? analysis.breakEvenYears.toFixed(1) : '—'} yr. If you plan to stay in the home past break-even, this often beats extra-principal or HELOC strategies.`
                : `Interest saved (${formatCurrency(analysis.interestSaved)}) doesn't clearly justify ${formatCurrency(closingCosts)} in closing costs. Consider extra-principal instead, or shop a lower-cost refi.`}
            </div>
          </div>
        </div>

        {/* Detail grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <Stat label="New payment" value={formatCurrency(analysis.newMonthlyPayment)} sub={`vs ${formatCurrency(oldPayment)} now`} />
          <Stat label="Interest saved" value={formatCurrency(analysis.interestSaved)} sub="over life of loan" good />
          <Stat label="Break-even" value={isFinite(analysis.breakEvenYears) ? `${analysis.breakEvenYears.toFixed(1)} yr` : '—'} sub="to recoup closing" />
          <Stat label="Years saved" value={`${analysis.yearsSaved} yr`} sub={`${newTerm}yr vs ${oldYears}yr`} good={analysis.yearsSaved > 0} />
        </div>

        <div className="rounded-lg border border-border/50 bg-muted/10 p-3 text-[11px] text-muted-foreground">
          <TrendingDown className="h-3.5 w-3.5 inline mr-1 text-primary" />
          <span className="font-semibold text-foreground">Why check refi first?</span> A rate drop compounds against your entire remaining balance every month — extra-principal only helps at the margin. If today's 15yr rate is meaningfully below your current rate, refi typically dominates. If not, keep your rate and focus on payoff acceleration below.
        </div>
      </CardContent>
    </Card>
  );
}

function NumInput({ label, value, onChange, step = 1, prefix }: { label: string; value: number; onChange: (v: number) => void; step?: number; prefix?: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-2 text-[10px] text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          step={step}
          value={value || ''}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={cn('h-8 text-xs', prefix && 'pl-5')}
        />
      </div>
    </div>
  );
}

function Stat({ label, value, sub, good }: { label: string; value: string; sub: string; good?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-2', good ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/50 bg-card/50')}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold text-sm mt-0.5">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  );
}
