import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, TrendingUp } from 'lucide-react';
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function TrueCostLoanCalculator() {
  const { formatCurrency } = useCurrency();
  const [principal, setPrincipal] = useState('10000');
  const [apr, setApr] = useState('15');
  const [term, setTerm] = useState([36]);
  const [fees, setFees] = useState('300');
  const [investReturn, setInvestReturn] = useState('8');

  const result = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const rate = parseFloat(apr) || 0;
    const months = term[0] || 1;
    const origFees = parseFloat(fees) || 0;
    const investRate = parseFloat(investReturn) || 7;

    const r = rate / 100 / 12;
    const payment = r > 0 ? (p * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) : p / months;
    const totalPaid = payment * months + origFees;
    const totalInterest = totalPaid - p;
    const effectiveAPR = p > 0 ? ((totalPaid / p) ** (12 / months) - 1) * 100 : 0;

    // Opportunity cost: if you invested the interest payments instead at investRate
    const ir = investRate / 100 / 12;
    let opportunityCost = 0;
    const interestPerMonth = totalInterest / months;
    const chartData: { month: number; loanCost: number; investGrowth: number }[] = [];
    let cumLoanCost = origFees;
    let cumInvest = 0;

    for (let m = 1; m <= months; m++) {
      const monthInterest = r > 0 ? (p * r * Math.pow(1 + r, m - 1) - payment * (Math.pow(1 + r, m - 1) - 1)) * r : 0;
      cumLoanCost += (payment - (p / months)) + (m === 1 ? 0 : 0); // simplified
      cumInvest = (cumInvest + interestPerMonth) * (1 + ir);
      if (m % 3 === 0 || m === months) {
        chartData.push({ month: m, loanCost: Math.round(interestPerMonth * m + origFees), investGrowth: Math.round(cumInvest) });
      }
    }
    opportunityCost = cumInvest;

    const trueCost = totalInterest + origFees + opportunityCost;
    const costMultiplier = p > 0 ? totalPaid / p : 0;

    return { payment, totalPaid, totalInterest, effectiveAPR, opportunityCost, trueCost, costMultiplier, origFees, chartData, months };
  }, [principal, apr, term, fees, investReturn]);

  return (
    <div className="space-y-6">
      <CalculatorGuide title="True Cost Loan Analyzer" icon={Receipt} iconColor="text-prism-amber"
        ttsScript="See the real price tag of any loan including opportunity cost."
        instructions={['Enter loan details and fees', 'See total interest, effective APR, and opportunity cost', 'Understand what that money could have earned invested']} />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Personal Loan ($10k at 15%)', description: 'Over 36 months you pay $2,479 in interest plus $300 in fees. That same $346/mo invested at 8% would grow to $13,700. The true cost gap: $5,179.' },
          { title: 'Student Loan ($30k at 5%)', description: 'Lower rate but long term means high total interest. Over 10 years, $30k costs $8,184 in interest. Paying $100 extra/mo saves $2,500+.' },
          { title: 'Buy Now Pay Later', description: 'BNPL at 0% seems free, but missed payments trigger 25-30% APR retroactively. Plus the opportunity cost of fragmented spending adds up.' },
        ]}
        pitfalls={[
          { title: 'Ignoring Origination Fees', description: 'A 3-5% origination fee on a $10k loan means you receive $9,500-9,700 but repay $10,000+ interest. Your effective APR is higher than advertised.' },
          { title: 'Comparing APR Only', description: 'Two loans at the same APR but different terms have vastly different total costs. Always compare total amount repaid, not just the rate.' },
          { title: 'Forgetting Opportunity Cost', description: 'Every dollar spent on loan payments is a dollar not invested. Over 10 years, the opportunity cost can exceed the interest paid.' },
          { title: 'Refinancing Without Math', description: 'A lower rate with a longer term can increase total cost. Always compare total repayment amounts side by side.' },
        ]}
        tips={[
          { title: 'Round Up Every Payment', description: 'Rounding your $346 payment up to $400 costs barely noticeable extra monthly but can shave months off the loan and save hundreds in interest.' },
          { title: 'Make One Extra Payment Per Year', description: 'Use a tax refund or bonus to make a 13th payment annually. On a $10k loan at 15%, this saves $400+ in interest and cuts months off the term.' },
          { title: 'Compare the Opportunity Cost Ratio', description: 'If the loan APR is lower than your expected investment return, the loan may make mathematical sense. But if loan APR exceeds 8-10%, pay it off aggressively.' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2"><Label>Loan Amount</Label><Input type="number" min="0" value={principal} onChange={e => setPrincipal(e.target.value)} /></div>
        <div className="space-y-2"><Label>APR (%)</Label><Input type="number" min="0" step="0.1" value={apr} onChange={e => setApr(e.target.value)} /></div>
        <div className="space-y-2"><Label>Term: {term[0]} months</Label><Slider min={3} max={120} step={3} value={term} onValueChange={setTerm} /></div>
        <div className="space-y-2"><Label>Origination Fees</Label><Input type="number" min="0" value={fees} onChange={e => setFees(e.target.value)} /></div>
        <div className="space-y-2"><Label>Assumed Investment Return (%)</Label><Input type="number" min="0" step="0.5" value={investReturn} onChange={e => setInvestReturn(e.target.value)} /></div>
      </div>

      {(parseFloat(principal) || 0) > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="rounded-xl p-4 border border-destructive/30 bg-destructive/5 text-center">
            <p className="text-sm text-muted-foreground mb-1">True Cost of This Loan</p>
            <p className="text-2xl font-bold text-destructive"><AnimatedNumber value={result.trueCost} formatFn={formatCurrency} /></p>
            <p className="text-xs text-muted-foreground mt-1">You pay {result.costMultiplier.toFixed(2)}x the borrowed amount</p>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {[
              { label: 'Monthly Payment', val: result.payment },
              { label: 'Total Interest', val: result.totalInterest },
              { label: 'Fees', val: result.origFees },
              { label: 'Effective APR', val: result.effectiveAPR, fmt: (n: number) => `${n.toFixed(2)}%` },
              { label: 'Opportunity Cost', val: result.opportunityCost },
              { label: 'Total Paid', val: result.totalPaid, accent: true },
            ].map(r => (
              <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className={cn('text-lg font-bold', r.accent && 'text-primary')}>
                    {r.fmt ? r.fmt(r.val) : <AnimatedNumber value={r.val} formatFn={formatCurrency} />}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {result.chartData.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Interest Paid vs. What You Could've Earned</p>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={result.chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="loanCost" name="Interest + Fees" stroke="hsl(var(--destructive))" fill="hsl(var(--destructive))" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="investGrowth" name="If Invested" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <CalculatorActions calculatorType="truecostloan" inputs={{ principal, apr, term: term[0], fees, investReturn }}
            results={result} hasResults={true}
            summaryText={`True Cost: ${formatCurrency(result.trueCost)} total (${formatCurrency(result.totalInterest)} interest + ${formatCurrency(result.opportunityCost)} opportunity cost).`} />
        </motion.div>
      )}
    </div>
  );
}
