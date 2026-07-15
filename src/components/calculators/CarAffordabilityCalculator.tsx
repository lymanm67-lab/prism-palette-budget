import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, AlertTriangle, CheckCircle2, Settings2, TrendingDown, Calculator, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import CollapsibleSection from '@/components/CollapsibleSection';
import CarLeaseCompare from './CarLeaseCompare';
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';

export default function CarAffordabilityCalculator() {
  const { formatCurrency } = useCurrency();
  const { profile } = useFinancialProfile();
  const pn = profileNumbers(profile);

  const [monthlyIncome, setMonthlyIncome] = useState('5000');
  const [existingDebt, setExistingDebt] = useState('500');
  const [downPayment, setDownPayment] = useState('3000');
  const [tradeIn, setTradeIn] = useState('0');
  const [tradeInOwed, setTradeInOwed] = useState('0');
  const [loanRate, setLoanRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState([60]);
  const [salesTaxPct, setSalesTaxPct] = useState('7');
  const [docFees, setDocFees] = useState('500');
  const [insuranceMonthly, setInsuranceMonthly] = useState('150');
  const [gasMonthly, setGasMonthly] = useState('200');
  const [maintenanceMonthly, setMaintenanceMonthly] = useState('100');
  const [condition, setCondition] = useState<'new' | 'used'>('used');

  useEffect(() => {
    if (pn.totalIncome > 0) setMonthlyIncome(String(pn.totalIncome));
    if (pn.debts > 0) setExistingDebt(String(pn.debts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.primaryIncome, profile.partnerIncome, profile.monthlyDebts]);

  const result = useMemo(() => {
    const income = parseFloat(monthlyIncome) || 1;
    const debt = parseFloat(existingDebt) || 0;
    const down = parseFloat(downPayment) || 0;
    const trade = parseFloat(tradeIn) || 0;
    const owed = parseFloat(tradeInOwed) || 0;
    const netTradeEquity = trade - owed; // negative = rolling over
    const rate = parseFloat(loanRate) || 0;
    const months = loanTerm[0] || 1;
    const taxPct = parseFloat(salesTaxPct) || 0;
    const doc = parseFloat(docFees) || 0;
    const insurance = parseFloat(insuranceMonthly) || 0;
    const gas = parseFloat(gasMonthly) || 0;
    const maintenance = parseFloat(maintenanceMonthly) || 0;

    // 20/4/10 rule: 20% down, ≤48-mo term, ≤10% gross for total transportation
    const maxTotalTransport = income * 0.10; // 10% rule
    const maxPayment = Math.max(0, maxTotalTransport - insurance - gas - maintenance);

    // Reverse-solve: max out-the-door price given max payment.
    // OTD ≈ price * (1 + tax) + doc.  Loan = OTD - down - netTradeEquity.
    const r = rate / 100 / 12;
    const maxLoan = r > 0
      ? maxPayment * (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months))
      : maxPayment * months;
    // OTD = maxLoan + down + netTradeEquity ; price = (OTD - doc) / (1 + tax)
    const maxOtd = maxLoan + down + netTradeEquity;
    const maxCarPrice = Math.max(0, (maxOtd - doc) / (1 + taxPct / 100));

    // 20/4/10 checks
    const downPct = maxCarPrice > 0 ? (down / maxCarPrice) * 100 : 0;
    const rule20 = downPct >= 20;
    const rule4 = months <= 48;
    const rule10 = (maxPayment + insurance + gas + maintenance) / income <= 0.10;

    // DTI
    const currentDTI = (debt / income) * 100;
    const newDTI = ((debt + maxPayment) / income) * 100;

    const trueMonthly = maxPayment + insurance + gas + maintenance;
    const totalOwnership = trueMonthly * months;
    const totalInterest = Math.max(0, maxPayment * months - maxLoan);

    // Depreciation curve (year 1 = 20% new / 12% used, then 15%/yr, floor 20% at 10yrs)
    const y1Drop = condition === 'new' ? 0.20 : 0.12;
    const depreciation: { year: number; value: number; loanBalance: number; underwater: boolean }[] = [];
    let curValue = maxCarPrice;
    let bal = maxLoan;
    for (let y = 1; y <= Math.min(10, Math.ceil(months / 12) + 2); y++) {
      const drop = y === 1 ? y1Drop : 0.15;
      curValue = curValue * (1 - drop);
      // Amortize 12 months of loan
      for (let mm = 0; mm < 12 && bal > 0.01; mm++) {
        const int = bal * r;
        bal = Math.max(0, bal - (maxPayment - int));
      }
      depreciation.push({ year: y, value: curValue, loanBalance: bal, underwater: bal > curValue });
    }
    const monthsUnderwater = depreciation.filter(d => d.underwater).length * 12;

    // Negative equity rollover warning
    const rollingNegative = owed > trade;
    const negativeEquityAmount = rollingNegative ? owed - trade : 0;

    return {
      maxCarPrice, maxPayment, maxLoan, maxOtd, trueMonthly, insurance, gas, maintenance,
      currentDTI, newDTI, totalOwnership, totalInterest, months,
      rule20, rule4, rule10, downPct, netTradeEquity, rollingNegative, negativeEquityAmount,
      depreciation, monthsUnderwater, taxAmount: maxCarPrice * (taxPct / 100), docFees: doc,
    };
  }, [monthlyIncome, existingDebt, downPayment, tradeIn, tradeInOwed, loanRate, loanTerm, salesTaxPct, docFees, insuranceMonthly, gasMonthly, maintenanceMonthly, condition]);

  const dtiHealthy = result.newDTI < 36;
  const allRulesPass = result.rule20 && result.rule4 && result.rule10;

  return (
    <div className="space-y-6">
      <CalculatorGuide
        title="Car Affordability"
        icon={Car}
        iconColor="text-prism-sky"
        ttsScript="Find out what car you can actually afford using the 20/4/10 rule."
        instructions={[
          '20/4/10 rule: 20% down, ≤4-year loan, ≤10% of gross for total transportation',
          'Enter income, existing debt, and all trade-in details',
          'Check for negative equity roll-over and underwater risk',
        ]}
      />

      {/* ─── Basic inputs (always visible) ─── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2"><Label>Monthly Gross Income</Label><Input type="number" min="0" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} /></div>
        <div className="space-y-2"><Label>Existing Monthly Debt</Label><Input type="number" min="0" value={existingDebt} onChange={e => setExistingDebt(e.target.value)} /></div>
        <div className="space-y-2"><Label>Down Payment</Label><Input type="number" min="0" value={downPayment} onChange={e => setDownPayment(e.target.value)} /></div>
        <div className="space-y-2"><Label>Loan APR (%)</Label><Input type="number" min="0" step="0.1" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Loan Term: {loanTerm[0]} months</Label><Slider min={24} max={84} step={6} value={loanTerm} onValueChange={setLoanTerm} /></div>
        <div className="space-y-2">
          <Label>Vehicle condition</Label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setCondition('new')}
              className={cn('flex-1 h-10 rounded-md border text-sm font-medium transition-colors', condition === 'new' ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:bg-muted/40')}
            >New</button>
            <button
              type="button"
              onClick={() => setCondition('used')}
              className={cn('flex-1 h-10 rounded-md border text-sm font-medium transition-colors', condition === 'used' ? 'border-primary bg-primary/10 text-primary' : 'border-border/40 hover:bg-muted/40')}
            >Used (2–3yr)</button>
          </div>
        </div>
      </div>

      {/* ─── Trade-in ─── */}
      <CollapsibleSection title="Trade-in" subtitle="Optional — include your current car" icon={Car}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Trade-in value ($)</Label><Input type="number" min="0" value={tradeIn} onChange={e => setTradeIn(e.target.value)} /></div>
          <div className="space-y-2"><Label>Still owed on trade-in ($)</Label><Input type="number" min="0" value={tradeInOwed} onChange={e => setTradeInOwed(e.target.value)} /></div>
        </div>
        {result.rollingNegative && (
          <div className="mt-3 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
            <div className="flex items-center gap-2 font-semibold mb-1"><AlertTriangle className="h-4 w-4" /> Negative equity warning</div>
            You owe {formatCurrency(result.negativeEquityAmount)} more on your trade-in than it's worth. Rolling this into a new loan means you start underwater and stay there for years. Pay it off first if you can.
          </div>
        )}
        {!result.rollingNegative && result.netTradeEquity > 0 && (
          <div className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-emerald-700 dark:text-emerald-400">
            Net trade equity: <strong>{formatCurrency(result.netTradeEquity)}</strong> — this reduces your loan directly.
          </div>
        )}
      </CollapsibleSection>

      {/* ─── Taxes, fees & ownership costs ─── */}
      <CollapsibleSection title="Taxes, fees & ownership costs" subtitle="Sales tax, doc fees, insurance, gas, maintenance" icon={Settings2}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2"><Label>Sales tax (%)</Label><Input type="number" min="0" step="0.1" value={salesTaxPct} onChange={e => setSalesTaxPct(e.target.value)} /></div>
          <div className="space-y-2"><Label>Doc / reg fees ($)</Label><Input type="number" min="0" value={docFees} onChange={e => setDocFees(e.target.value)} /></div>
          <div className="space-y-2"><Label>Insurance /mo</Label><Input type="number" min="0" value={insuranceMonthly} onChange={e => setInsuranceMonthly(e.target.value)} /></div>
          <div className="space-y-2"><Label>Gas /mo</Label><Input type="number" min="0" value={gasMonthly} onChange={e => setGasMonthly(e.target.value)} /></div>
          <div className="space-y-2"><Label>Maintenance /mo</Label><Input type="number" min="0" value={maintenanceMonthly} onChange={e => setMaintenanceMonthly(e.target.value)} /></div>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">Typical: 6–9% sales tax, $200–$800 doc fees, $150/mo insurance, $100/mo maintenance (higher on new luxury).</p>
      </CollapsibleSection>

      {/* ─── Main result ─── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className={cn('rounded-xl p-4 border text-center', dtiHealthy ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30')}>
          <div className="flex items-center justify-center gap-2 mb-1">
            {dtiHealthy ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
            <span className="text-xl font-bold">Max Affordable: {formatCurrency(result.maxCarPrice)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Sticker price (pre-tax). Out-the-door ≈ {formatCurrency(result.maxOtd)} including {formatCurrency(result.taxAmount)} tax + {formatCurrency(result.docFees)} fees.</p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Max Car Payment', val: result.maxPayment },
            { label: 'True Monthly Cost', val: result.trueMonthly, accent: true },
            { label: 'Total Interest', val: result.totalInterest },
            { label: 'Total Ownership', val: result.totalOwnership },
          ].map(r => (
            <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className={cn('text-lg font-bold', r.accent && 'text-primary')}><AnimatedNumber value={r.val} formatFn={formatCurrency} /></p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="flex justify-between text-sm"><span>Debt-to-Income Ratio</span><span className={cn('font-bold', dtiHealthy ? 'text-green-600' : 'text-destructive')}>{result.newDTI.toFixed(1)}%</span></div>
            <Progress value={Math.min(100, result.newDTI)} className="h-2" />
            <p className="text-xs text-muted-foreground">Current: {result.currentDTI.toFixed(1)}% → With car: {result.newDTI.toFixed(1)}% (target: under 36%)</p>
          </CardContent>
        </Card>

        {/* ─── 20/4/10 rule check ─── */}
        <CollapsibleSection
          title="20/4/10 rule check"
          subtitle="The industry gold standard for car affordability"
          icon={ShieldCheck}
          accent={allRulesPass}
          defaultOpen
          badge={
            <span className={cn('text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full', allRulesPass ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400' : 'bg-amber-500/20 text-amber-700 dark:text-amber-400')}>
              {allRulesPass ? 'All pass' : `${[result.rule20, result.rule4, result.rule10].filter(Boolean).length}/3`}
            </span>
          }
        >
          <div className="grid gap-2 sm:grid-cols-3">
            <RuleBadge pass={result.rule20} title="20% down" detail={`You: ${result.downPct.toFixed(0)}% (need ≥ 20%)`} />
            <RuleBadge pass={result.rule4} title="≤ 4-year loan" detail={`You: ${result.months / 12} years`} />
            <RuleBadge pass={result.rule10} title="≤ 10% of income" detail={`Total transport: ${((result.trueMonthly / (parseFloat(monthlyIncome) || 1)) * 100).toFixed(1)}%`} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            The 20/4/10 rule (Money.com, NerdWallet) is stricter than the 15% rule but keeps you safe from negative equity and being "car poor."
          </p>
        </CollapsibleSection>

        {/* ─── Depreciation / underwater risk ─── */}
        <CollapsibleSection
          title="Depreciation & underwater risk"
          subtitle={result.monthsUnderwater > 0 ? `Underwater for ~${result.monthsUnderwater} months` : 'No underwater risk projected'}
          icon={TrendingDown}
          iconColor={result.monthsUnderwater > 24 ? 'text-destructive' : 'text-primary'}
        >
          <p className="text-xs text-muted-foreground mb-3">
            {condition === 'new' ? 'New cars lose ~20% in year 1' : 'Used cars (2–3 yr) lose ~12% in year 1'}, then ~15%/yr. You're underwater when the loan balance exceeds the car's value.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="px-3 py-2 font-semibold">Year</th>
                  <th className="px-3 py-2 font-semibold">Car value</th>
                  <th className="px-3 py-2 font-semibold">Loan balance</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {result.depreciation.slice(0, 7).map(d => (
                  <tr key={d.year} className="border-t border-border/30">
                    <td className="px-3 py-2">Yr {d.year}</td>
                    <td className="px-3 py-2">{formatCurrency(d.value)}</td>
                    <td className="px-3 py-2">{formatCurrency(d.loanBalance)}</td>
                    <td className={cn('px-3 py-2 font-semibold', d.underwater ? 'text-destructive' : 'text-emerald-600')}>
                      {d.underwater ? `Underwater ${formatCurrency(d.loanBalance - d.value)}` : 'Positive equity'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CollapsibleSection>

        {/* ─── New vs Used vs Lease ─── */}
        <CarLeaseCompare yearsHeld={Math.min(10, Math.max(3, Math.round(loanTerm[0] / 12)))} />

        {/* ─── Scenarios ─── */}
        <CollapsibleSection title="Scenarios, pitfalls & tips" icon={Calculator}>
          <CalculatorScenariosAndPitfalls
            scenarios={[
              { title: 'First Car Buyer', description: 'With $3,000 down on an $18,000 used car at 6.5% for 48 months, payment ≈ $358. Insurance + gas + maintenance add ~$450, so budget $800/mo total.' },
              { title: 'Upgrading Responsibly', description: 'A paid-off $5,000 trade-in becomes your down payment. On a $25,000 car with 20% down + 4-yr loan, monthly payment stays under $400.' },
              { title: 'Single Income $4k/mo', description: '20/4/10 → max $400/mo total transportation. A reliable 3-year-old $15k car with $3k down fits comfortably.' },
            ]}
            pitfalls={[
              { title: 'Stretching to 84 Months', description: 'The average new-car loan is now 68 months. Anything over 60 months means you\'re underwater for most of the loan and total interest balloons.' },
              { title: 'Payment-only Negotiation', description: 'Dealers manipulate monthly payments by stretching term or hiding fees in APR. Always negotiate out-the-door price, not the payment.' },
              { title: 'Negative Equity Roll-Over', description: 'Rolling $3,000+ of old loan balance into a new car means you\'re instantly underwater and pay interest on a car you no longer own.' },
              { title: 'New Car Depreciation Cliff', description: 'A $35k new car is worth $28k after year 1 and $19k after year 4 — you\'ve paid $16k in interest + depreciation to drive it.' },
            ]}
            tips={[
              { title: 'Buy 2–3 Years Used, Certified', description: 'The first owner absorbs 20–30% depreciation. A CPO car has manufacturer warranty and saves 25–35% over new.' },
              { title: 'Get Insurance Quotes First', description: 'Insurance on the same car can differ $50–100/mo by trim, engine, or ZIP. Quote your top 3 choices before you sign.' },
              { title: 'Gap Insurance if < 20% Down', description: 'If you\'re underwater and total the car, gap coverage pays the difference. Only $20–40/mo for the first 2–3 years.' },
            ]}
          />
        </CollapsibleSection>

        <CalculatorActions
          calculatorType="caraffordability"
          inputs={{ monthlyIncome, existingDebt, downPayment, tradeIn, tradeInOwed, loanRate, loanTerm: loanTerm[0], salesTaxPct, docFees, condition }}
          results={result}
          hasResults={true}
          summaryText={`Car: max ${formatCurrency(result.maxCarPrice)}, true monthly ${formatCurrency(result.trueMonthly)}, DTI ${result.newDTI.toFixed(1)}%. 20/4/10 rule: ${allRulesPass ? 'PASS' : 'partial'}.`}
        />
      </motion.div>
    </div>
  );
}

function RuleBadge({ pass, title, detail }: { pass: boolean; title: string; detail: string }) {
  return (
    <div className={cn('rounded-lg border p-3 flex items-start gap-2', pass ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-amber-500/40 bg-amber-500/5')}>
      {pass ? <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />}
      <div className="min-w-0">
        <div className="text-xs font-bold">{title}</div>
        <div className="text-[11px] text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
