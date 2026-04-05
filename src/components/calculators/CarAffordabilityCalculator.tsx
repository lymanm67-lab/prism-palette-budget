import { useState, useMemo } from 'react';
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

export default function CarAffordabilityCalculator() {
  const { formatCurrency } = useCurrency();
  const [monthlyIncome, setMonthlyIncome] = useState('5000');
  const [existingDebt, setExistingDebt] = useState('500');
  const [downPayment, setDownPayment] = useState('3000');
  const [loanRate, setLoanRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState([60]);
  const [insuranceMonthly, setInsuranceMonthly] = useState('150');
  const [gasMonthly, setGasMonthly] = useState('200');

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
