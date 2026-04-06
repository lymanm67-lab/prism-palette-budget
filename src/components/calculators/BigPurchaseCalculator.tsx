import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ShoppingBag, TrendingDown, PiggyBank } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

export default function BigPurchaseCalculator() {
  const { formatCurrency } = useCurrency();
  const [itemCost, setItemCost] = useState('5000');
  const [loanRate, setLoanRate] = useState('12');
  const [loanTerm, setLoanTerm] = useState([24]);
  const [monthlySavings, setMonthlySavings] = useState('300');

  const result = useMemo(() => {
    const cost = parseFloat(itemCost) || 0;
    const rate = parseFloat(loanRate) || 0;
    const months = loanTerm[0] || 1;
    const savePm = parseFloat(monthlySavings) || 1;

    // Loan path
    const r = rate / 100 / 12;
    const loanPayment = r > 0 ? (cost * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) : cost / months;
    const totalWithInterest = loanPayment * months;
    const totalInterest = totalWithInterest - cost;

    // Save path
    const monthsToSave = Math.ceil(cost / savePm);

    // Opportunity cost: what that interest could earn invested at 7%
    const investRate = 0.07 / 12;
    let investGrowth = 0;
    for (let m = 0; m < months; m++) investGrowth = (investGrowth + (loanPayment - (cost / months))) * (1 + investRate);

    return { cost, loanPayment, totalWithInterest, totalInterest, monthsToSave, investGrowth, months };
  }, [itemCost, loanRate, loanTerm, monthlySavings]);

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Big Purchase Planner" icon={ShoppingBag} iconColor="text-prism-amber"
        ttsScript="Compare saving vs. financing for any major purchase."
        instructions={['Enter the item cost', 'Compare loan cost vs. saving timeline', 'See the true cost of financing']} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2"><Label>Item Cost</Label><Input type="number" min="0" value={itemCost} onChange={e => setItemCost(e.target.value)} /></div>
        <div className="space-y-2"><Label>Loan APR (%)</Label><Input type="number" min="0" step="0.1" value={loanRate} onChange={e => setLoanRate(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Loan Term: {loanTerm[0]} months</Label>
          <Slider min={3} max={72} step={1} value={loanTerm} onValueChange={setLoanTerm} />
        </div>
        <div className="space-y-2"><Label>Monthly Savings Capacity</Label><Input type="number" min="1" value={monthlySavings} onChange={e => setMonthlySavings(e.target.value)} /></div>
      </div>

      {result.cost > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-destructive font-semibold"><TrendingDown className="h-5 w-5" /> Finance It</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Monthly Payment</span><span className="font-bold">{formatCurrency(result.loanPayment)}</span></div>
                  <div className="flex justify-between"><span>Total Paid</span><span className="font-bold">{formatCurrency(result.totalWithInterest)}</span></div>
                  <div className="flex justify-between text-destructive"><span>Interest Cost</span><span className="font-bold">{formatCurrency(result.totalInterest)}</span></div>
                  <div className="flex justify-between text-muted-foreground"><span>Opportunity Cost</span><span>{formatCurrency(result.investGrowth)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-green-600 font-semibold"><PiggyBank className="h-5 w-5" /> Save For It</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Months to Save</span><span className="font-bold">{result.monthsToSave}</span></div>
                  <div className="flex justify-between"><span>Total Paid</span><span className="font-bold">{formatCurrency(result.cost)}</span></div>
                  <div className="flex justify-between text-green-600"><span>You Save</span><span className="font-bold">{formatCurrency(result.totalInterest)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
          <CalculatorActions calculatorType="bigpurchase" inputs={{ itemCost, loanRate, loanTerm: loanTerm[0], monthlySavings }}
            results={result} hasResults={result.cost > 0}
            summaryText={`Big Purchase: ${formatCurrency(result.cost)} item — financing costs ${formatCurrency(result.totalInterest)} in interest vs. ${result.monthsToSave} months saving.`} />
        </motion.div>
      )}
    </div>
  );
}
