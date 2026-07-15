import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Home } from 'lucide-react';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

// Front-end DTI 28% / back-end 36% rule of thumb, PITI-based.
export default function AffordabilityPlanner() {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  const [rate, setRate] = useState(6.75);
  const [term, setTerm] = useState(30);
  const [downPct, setDownPct] = useState(20);
  const [taxRate, setTaxRate] = useState(1.1); // % of home value / yr
  const [insurance, setInsurance] = useState(1400); // annual
  const [hoa, setHoa] = useState(0);
  const [dtiTarget, setDtiTarget] = useState(36);

  const result = useMemo(() => {
    const income = p.totalIncome || 8000;
    const otherDebts = p.debts || 0;
    const maxPITI = (income * dtiTarget) / 100 - otherDebts;
    if (maxPITI <= 0) {
      return { maxPITI: 0, maxHome: 0, maxLoan: 0, downPayment: 0, monthlyTax: 0, monthlyIns: 0, hoaMonthly: hoa, principal: 0, interest: 0, front: 0, back: 0 };
    }
    const r = rate / 100 / 12;
    const n = term * 12;

    // Solve iteratively for home price: PITI = P&I(loan) + taxes(home) + ins + hoa
    let lo = 0, hi = 5_000_000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const loan = mid * (1 - downPct / 100);
      const pi = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
      const tax = (mid * taxRate) / 100 / 12;
      const ins = insurance / 12;
      const piti = pi + tax + ins + hoa;
      if (piti > maxPITI) hi = mid; else lo = mid;
    }
    const maxHome = Math.floor(lo);
    const loan = maxHome * (1 - downPct / 100);
    const downPayment = maxHome - loan;
    const pi = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const monthlyTax = (maxHome * taxRate) / 100 / 12;
    const monthlyIns = insurance / 12;
    const piti = pi + monthlyTax + monthlyIns + hoa;
    const front = (piti / income) * 100;
    const back = ((piti + otherDebts) / income) * 100;

    return { maxPITI, maxHome, maxLoan: loan, downPayment, monthlyTax, monthlyIns, hoaMonthly: hoa, principal: pi, interest: 0, front, back, piti };
  }, [p.totalIncome, p.debts, rate, term, downPct, taxRate, insurance, hoa, dtiTarget]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" /> Affordability Planner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          How much home can you actually afford at {formatCurrency(p.totalIncome)}/mo income? Front-end / back-end DTI with full PITI.
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <NumberInput label="Rate %" step={0.125} value={rate} onChange={setRate} />
            <NumberInput label="Term (yrs)" value={term} onChange={setTerm} />
            <NumberInput label="Down payment %" value={downPct} onChange={setDownPct} />
            <NumberInput label="Property tax %/yr" step={0.05} value={taxRate} onChange={setTaxRate} />
            <NumberInput label="Insurance $/yr" value={insurance} onChange={setInsurance} />
            <NumberInput label="HOA $/mo" value={hoa} onChange={setHoa} />
            <div className="space-y-2">
              <Label className="text-xs flex justify-between">
                <span>Target back-end DTI</span><span className="text-primary font-mono">{dtiTarget}%</span>
              </Label>
              <Slider value={[dtiTarget]} min={28} max={45} step={1} onValueChange={(v) => setDtiTarget(v[0])} />
              <p className="text-[10px] text-muted-foreground">Conservative 36%, stretch 43%, FHA max 45%.</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Home Price</div>
              <div className="text-4xl font-bold text-primary mt-1">{formatCurrency(result.maxHome)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                Loan {formatCurrency(result.maxLoan)} · Down {formatCurrency(result.downPayment)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <StatBox label="Max PITI" value={formatCurrency(result.maxPITI)} />
              <StatBox label="P&I" value={formatCurrency(result.principal)} />
              <StatBox label="Tax/mo" value={formatCurrency(result.monthlyTax)} />
              <StatBox label="Ins/mo" value={formatCurrency(result.monthlyIns)} />
              <StatBox label="Front-end DTI" value={`${result.front.toFixed(1)}%`} accent={result.front <= 28} />
              <StatBox label="Back-end DTI" value={`${result.back.toFixed(1)}%`} accent={result.back <= dtiTarget} />
            </div>
            <div className={cn(
              'rounded-lg border p-3 text-xs',
              result.back <= 36 ? 'border-emerald-500/40 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
              : result.back <= 43 ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-400'
              : 'border-rose-500/40 bg-rose-500/5 text-rose-700 dark:text-rose-400'
            )}>
              {result.back <= 36 && 'Comfortable — plenty of margin for savings, investing, and life.'}
              {result.back > 36 && result.back <= 43 && 'Stretched — cash flow will be tight; keep 3–6 mo reserves.'}
              {result.back > 43 && 'Risky — most lenders won\'t approve; consider a cheaper home or larger down payment.'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NumberInput({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value) || 0)} className="h-9" />
    </div>
  );
}

function StatBox({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-2', accent ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50 bg-card/50')}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-semibold mt-0.5">{value}</div>
    </div>
  );
}
