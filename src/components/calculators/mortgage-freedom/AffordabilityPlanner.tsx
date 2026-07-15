import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Home, ChevronDown, Settings2, TrendingUp, BarChart3 } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';

// Solve iteratively for max home price given a target PITI budget.
function solveMaxHome(maxPITI: number, rate: number, term: number, downPct: number, taxRate: number, insurance: number, hoa: number) {
  if (maxPITI <= 0) return { maxHome: 0, loan: 0, pi: 0, tax: 0 };
  const r = rate / 100 / 12;
  const n = term * 12;
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
  const pi = r === 0 ? loan / n : (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const tax = (maxHome * taxRate) / 100 / 12;
  return { maxHome, loan, pi, tax };
}

export default function AffordabilityPlanner() {
  const { profile } = useFinancialProfile();
  const p = profileNumbers(profile);
  const { formatCurrency } = useCurrency();

  const [rate, setRate] = useState(6.75);
  const [term, setTerm] = useState(30);
  const [downPct, setDownPct] = useState(20);
  const [taxRate, setTaxRate] = useState(1.1);
  const [insurance, setInsurance] = useState(1400);
  const [hoa, setHoa] = useState(0);
  const [dtiTarget, setDtiTarget] = useState(36);

  const [inputsOpen, setInputsOpen] = useState(true);
  const [resultOpen, setResultOpen] = useState(true);
  const [scenariosOpen, setScenariosOpen] = useState(false);

  const income = p.totalIncome || 8000;
  const otherDebts = p.debts || 0;

  const result = useMemo(() => {
    const maxPITI = (income * dtiTarget) / 100 - otherDebts;
    const solved = solveMaxHome(maxPITI, rate, term, downPct, taxRate, insurance, hoa);
    const downPayment = solved.maxHome - solved.loan;
    const monthlyIns = insurance / 12;
    const piti = solved.pi + solved.tax + monthlyIns + hoa;
    const front = income > 0 ? (piti / income) * 100 : 0;
    const back = income > 0 ? ((piti + otherDebts) / income) * 100 : 0;
    return {
      maxPITI: Math.max(0, maxPITI),
      maxHome: solved.maxHome,
      maxLoan: solved.loan,
      downPayment,
      monthlyTax: solved.tax,
      monthlyIns,
      hoaMonthly: hoa,
      principal: solved.pi,
      front, back, piti,
    };
  }, [income, otherDebts, rate, term, downPct, taxRate, insurance, hoa, dtiTarget]);

  // Income scenarios — show max home at a spread of monthly gross incomes.
  const scenarios = useMemo(() => {
    const anchors = [4000, 6000, 8000, 10000, 12500, 15000, 20000, 25000];
    // Add user's current income if not already close to an anchor
    const withUser = anchors.includes(Math.round(income / 500) * 500)
      ? anchors
      : [...anchors, Math.round(income)].sort((a, b) => a - b);
    return withUser.map((inc) => {
      const maxPITI = (inc * dtiTarget) / 100 - otherDebts;
      const solved = solveMaxHome(maxPITI, rate, term, downPct, taxRate, insurance, hoa);
      return {
        income: inc,
        annual: inc * 12,
        maxPITI: Math.max(0, maxPITI),
        maxHome: solved.maxHome,
        downPayment: solved.maxHome - solved.loan,
        isYou: Math.abs(inc - income) < 250,
      };
    });
  }, [income, otherDebts, rate, term, downPct, taxRate, insurance, hoa, dtiTarget]);

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Home className="h-5 w-5 text-primary" /> Affordability Planner
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          How much home can you actually afford at {formatCurrency(income)}/mo income? Front-end / back-end DTI with full PITI.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* ─── Inputs ─── */}
        <Collapsible open={inputsOpen} onOpenChange={setInputsOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Assumptions & inputs</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', inputsOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
              <NumberInput label="Rate %" step={0.125} value={rate} onChange={setRate} />
              <NumberInput label="Term (yrs)" value={term} onChange={setTerm} />
              <NumberInput label="Down payment %" value={downPct} onChange={setDownPct} />
              <NumberInput label="Property tax %/yr" step={0.05} value={taxRate} onChange={setTaxRate} />
              <NumberInput label="Insurance $/yr" value={insurance} onChange={setInsurance} />
              <NumberInput label="HOA $/mo" value={hoa} onChange={setHoa} />
              <div className="space-y-2 sm:col-span-2 md:col-span-3">
                <Label className="text-xs flex justify-between">
                  <span>Target back-end DTI</span><span className="text-primary font-mono">{dtiTarget}%</span>
                </Label>
                <Slider value={[dtiTarget]} min={28} max={45} step={1} onValueChange={(v) => setDtiTarget(v[0])} />
                <p className="text-[10px] text-muted-foreground">Conservative 36%, stretch 43%, FHA max 45%.</p>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* ─── Your result ─── */}
        <Collapsible open={resultOpen} onOpenChange={setResultOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 px-3 py-2.5 hover:bg-primary/10 transition-colors">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">Your max home price</span>
              <span className="text-sm font-bold text-primary ml-2">{formatCurrency(result.maxHome)}</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', resultOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="space-y-3">
              <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-4">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Max Home Price</div>
                <div className="text-4xl font-bold text-primary mt-1">{formatCurrency(result.maxHome)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Loan {formatCurrency(result.maxLoan)} · Down {formatCurrency(result.downPayment)}
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
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
          </CollapsibleContent>
        </Collapsible>

        {/* ─── Income scenarios ─── */}
        <Collapsible open={scenariosOpen} onOpenChange={setScenariosOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-lg border border-border/40 bg-muted/20 px-3 py-2.5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">How much can I afford at different incomes?</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', scenariosOpen && 'rotate-180')} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <p className="text-xs text-muted-foreground mb-2">
              Same rate ({rate}%), term ({term}yr), down ({downPct}%), taxes/ins, and {dtiTarget}% DTI — just varying gross monthly income. Your other debts ({formatCurrency(otherDebts)}/mo) are held constant.
            </p>
            <div className="overflow-x-auto rounded-lg border border-border/40">
              <table className="w-full text-xs">
                <thead className="bg-muted/40">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-semibold">Gross monthly</th>
                    <th className="px-3 py-2 font-semibold hidden sm:table-cell">Annual</th>
                    <th className="px-3 py-2 font-semibold">Max PITI</th>
                    <th className="px-3 py-2 font-semibold">Max home price</th>
                    <th className="px-3 py-2 font-semibold hidden md:table-cell">Down payment</th>
                  </tr>
                </thead>
                <tbody>
                  {scenarios.map((s, i) => (
                    <tr
                      key={i}
                      className={cn(
                        'border-t border-border/30',
                        s.isYou && 'bg-primary/10 font-semibold'
                      )}
                    >
                      <td className="px-3 py-2">
                        {formatCurrency(s.income)}
                        {s.isYou && <span className="ml-2 text-[10px] text-primary uppercase tracking-wider">You</span>}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell">{formatCurrency(s.annual)}</td>
                      <td className="px-3 py-2">{formatCurrency(s.maxPITI)}</td>
                      <td className="px-3 py-2 text-primary">{formatCurrency(s.maxHome)}</td>
                      <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">{formatCurrency(s.downPayment)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2 italic">
              Rule of thumb: max home price ≈ 3–4× annual gross income at today's rates. Higher rates shrink this multiple.
            </p>
          </CollapsibleContent>
        </Collapsible>
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
