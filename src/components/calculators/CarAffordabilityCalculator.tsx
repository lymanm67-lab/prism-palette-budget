import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Car, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
import { useFinancialProfile, profileNumbers } from '@/hooks/use-financial-profile';

export default function CarAffordabilityCalculator() {
  const { formatCurrency } = useCurrency();
  const { profile } = useFinancialProfile();
  const pn = profileNumbers(profile);
  const [monthlyIncome, setMonthlyIncome] = useState('5000');
  const [existingDebt, setExistingDebt] = useState('500');
  const [downPayment, setDownPayment] = useState('3000');
  const [loanRate, setLoanRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState([60]);
  const [insuranceMonthly, setInsuranceMonthly] = useState('150');
  const [gasMonthly, setGasMonthly] = useState('200');

  useEffect(() => {
    if (pn.totalIncome > 0) setMonthlyIncome(String(pn.totalIncome));
    if (pn.debts > 0) setExistingDebt(String(pn.debts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.primaryIncome, profile.partnerIncome, profile.monthlyDebts]);


  const result = useMemo(() => {
    const income = parseFloat(monthlyIncome) || 1;
    const debt = parseFloat(existingDebt) || 0;
    const down = parseFloat(downPayment) || 0;
    const rate = parseFloat(loanRate) || 0;
    const months = loanTerm[0] || 1;
    const insurance = parseFloat(insuranceMonthly) || 0;
    const gas = parseFloat(gasMonthly) || 0;
    const maintenance = 100; // estimate

    // Max affordable: 15% of gross income rule for total car costs
    const maxTotalCarCost = income * 0.15;
    const maxPayment = maxTotalCarCost - insurance - gas - maintenance;
    
    // Reverse calc: what loan amount does maxPayment support?
    const r = rate / 100 / 12;
    const maxLoan = r > 0 ? maxPayment * (Math.pow(1 + r, months) - 1) / (r * Math.pow(1 + r, months)) : maxPayment * months;
    const maxCarPrice = Math.max(0, maxLoan + down);

    // DTI impact
    const currentDTI = (debt / income) * 100;
    const newDTI = ((debt + Math.max(0, maxPayment)) / income) * 100;

    // True monthly cost
    const trueMonthly = Math.max(0, maxPayment) + insurance + gas + maintenance;

    // Total cost of ownership over loan term
    const totalOwnership = trueMonthly * months;

    return { maxCarPrice, maxPayment: Math.max(0, maxPayment), trueMonthly, insurance, gas, maintenance, currentDTI, newDTI, totalOwnership, months };
  }, [monthlyIncome, existingDebt, downPayment, loanRate, loanTerm, insuranceMonthly, gasMonthly]);

  const dtiHealthy = result.newDTI < 36;

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Car Affordability" icon={Car} iconColor="text-prism-sky"
        ttsScript="Find out what car you can actually afford without becoming car poor."
        instructions={['Enter income and existing debts', 'Set loan terms and ownership costs', 'See max affordable price and DTI impact']} />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'First Car Buyer', description: 'With $3,000 down on a $18,000 car at 6.5% for 60 months, your payment is ~$293/mo. Keep total car costs under 15% of gross income.' },
          { title: 'Upgrading Responsibly', description: 'Trade in your paid-off car and use the equity as a down payment. A $5,000 trade-in on a $25,000 car drops your monthly payment by $100+.' },
          { title: 'Single Income Household', description: 'On $4,000/mo gross, the 20/4/10 rule means max $800 payment, 4+ year loan, and total car costs under $400/mo. A reliable $15k car fits perfectly.' },
        ]}
        pitfalls={[
          { title: 'Stretching to 84 Months', description: 'Longer loans mean lower payments but higher total cost and negative equity risk. A 7-year loan on a depreciating car is a financial trap.' },
          { title: 'Forgetting Total Ownership Cost', description: 'Insurance ($150/mo), gas ($200/mo), and maintenance ($100/mo) add $450/mo beyond your payment. Budget the full picture.' },
          { title: 'Dealer Payment Negotiation', description: 'Dealers manipulate monthly payments to hide total cost. Always negotiate the out-the-door price, never the payment.' },
          { title: 'Negative Equity Roll-Over', description: 'Rolling $3,000+ of old loan balance into a new car means you are immediately underwater. Pay off the old car first.' },
        ]}
        tips={[
          { title: 'Buy 2-3 Years Used, Certified', description: 'A certified pre-owned car saves 20-35% vs new while still having manufacturer warranty. The biggest depreciation happens in years 1-2.' },
          { title: 'Get Insurance Quotes Before Buying', description: 'Insurance on a sports car vs. a sedan can differ by $100+/mo. Get quotes on your top 3 choices before committing to avoid sticker shock.' },
          { title: 'Save for 20% Down Minimum', description: 'A 20% down payment eliminates negative equity risk, lowers your rate, and reduces monthly payments. On a $25k car, that is $5,000 down.' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2"><Label>Monthly Gross Income</Label><Input type="number" min="0" value={monthlyIncome} onChange={e => setMonthlyIncome(e.target.value)} /></div>
        <div className="space-y-2"><Label>Existing Monthly Debt</Label><Input type="number" min="0" value={existingDebt} onChange={e => setExistingDebt(e.target.value)} /></div>
        <div className="space-y-2"><Label>Down Payment</Label><Input type="number" min="0" value={downPayment} onChange={e => setDownPayment(e.target.value)} /></div>
        <div className="space-y-2"><Label>Loan APR (%)</Label><Input type="number" min="0" step="0.1" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Loan Term: {loanTerm[0]} months</Label><Slider min={24} max={84} step={6} value={loanTerm} onValueChange={setLoanTerm} /></div>
        <div className="space-y-2"><Label>Insurance /mo</Label><Input type="number" min="0" value={insuranceMonthly} onChange={e => setInsuranceMonthly(e.target.value)} /></div>
        <div className="space-y-2"><Label>Gas /mo</Label><Input type="number" min="0" value={gasMonthly} onChange={e => setGasMonthly(e.target.value)} /></div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className={cn('rounded-xl p-4 border text-center', dtiHealthy ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30')}>
          <div className="flex items-center justify-center gap-2 mb-1">
            {dtiHealthy ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}
            <span className="text-xl font-bold">Max Affordable: {formatCurrency(result.maxCarPrice)}</span>
          </div>
          <p className="text-sm text-muted-foreground">Based on the 15% income rule for total car costs</p>
        </div>

        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Max Car Payment', val: result.maxPayment },
            { label: 'True Monthly Cost', val: result.trueMonthly, accent: true },
            { label: 'Total Ownership', val: result.totalOwnership },
            { label: 'Maintenance /mo', val: result.maintenance },
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

        <CalculatorActions calculatorType="caraffordability" inputs={{ monthlyIncome, existingDebt, downPayment, loanRate, loanTerm: loanTerm[0] }}
          results={result} hasResults={true}
          summaryText={`Car: max ${formatCurrency(result.maxCarPrice)}, true monthly cost ${formatCurrency(result.trueMonthly)}, DTI ${result.newDTI.toFixed(1)}%.`} />
      </motion.div>
    </div>
  );
}
