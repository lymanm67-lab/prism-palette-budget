import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Receipt, TrendingUp, Zap, CreditCard, Settings2 } from 'lucide-react';
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
import CollapsibleSection from '@/components/CollapsibleSection';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function amortize(principal: number, annualRate: number, months: number, extraMonthly = 0) {
  const r = annualRate / 100 / 12;
  const payment = r > 0 ? (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1) : principal / months;
  let bal = principal;
  let totalInterest = 0;
  let m = 0;
  while (bal > 0.01 && m < months * 2) {
    m++;
    const int = bal * r;
    totalInterest += int;
    bal = Math.max(0, bal - (payment + extraMonthly - int));
  }
  return { payment, totalInterest, months: m };
}

export default function TrueCostLoanCalculator() {
  const { formatCurrency } = useCurrency();
  const [principal, setPrincipal] = useState('10000');
  const [apr, setApr] = useState('15');
  const [term, setTerm] = useState([36]);
  const [fees, setFees] = useState('300');
  const [investReturn, setInvestReturn] = useState('8');

  // Early payoff
  const [extraMonthly, setExtraMonthly] = useState('50');

  // 0% BT card comparison
  const [btPeriodMonths, setBtPeriodMonths] = useState('18');
  const [btFeePct, setBtFeePct] = useState('3');
  const [btPostRate, setBtPostRate] = useState('24.99');

  const result = useMemo(() => {
    const p = parseFloat(principal) || 0;
    const rate = parseFloat(apr) || 0;
    const months = term[0] || 1;
    const origFees = parseFloat(fees) || 0;
    const investRate = parseFloat(investReturn) || 7;

    const base = amortize(p, rate, months, 0);
    const payment = base.payment;
    const totalInterest = base.totalInterest;
    const totalPaid = payment * base.months + origFees;
    const effectiveAPR = p > 0 ? ((totalPaid / p) ** (12 / months) - 1) * 100 : 0;

    // Opportunity cost (approximate)
    const ir = investRate / 100 / 12;
    let cumInvest = 0;
    const interestPerMonth = totalInterest / months;
    const chartData: { month: number; loanCost: number; investGrowth: number }[] = [];
    for (let m = 1; m <= months; m++) {
      cumInvest = (cumInvest + interestPerMonth) * (1 + ir);
      if (m % 3 === 0 || m === months) {
        chartData.push({ month: m, loanCost: Math.round(interestPerMonth * m + origFees), investGrowth: Math.round(cumInvest) });
      }
    }
    const opportunityCost = cumInvest;
    const trueCost = totalInterest + origFees + opportunityCost;
    const costMultiplier = p > 0 ? totalPaid / p : 0;

    // Early payoff scenario
    const extra = parseFloat(extraMonthly) || 0;
    const early = amortize(p, rate, months, extra);
    const monthsSaved = base.months - early.months;
    const interestSaved = totalInterest - early.totalInterest;

    // 0% BT card comparison
    const btPeriod = parseInt(btPeriodMonths) || 0;
    const btFee = p * ((parseFloat(btFeePct) || 0) / 100);
    const btPostAPR = parseFloat(btPostRate) || 0;
    // If paid off within BT period: total cost = BT fee only
    // If not fully paid: assume monthly payment same as current loan payment
    const btMonthlyIfSame = payment;
    // Balance at end of BT period paying `payment`/mo at 0%
    const balAtEndBt = Math.max(0, p - btMonthlyIfSame * btPeriod);
    let btTotalInterest = 0;
    if (balAtEndBt > 0.01 && btPostAPR > 0) {
      // amortize remainder at post-BT APR
      const remainingMonths = Math.max(1, months - btPeriod);
      const btAmort = amortize(balAtEndBt, btPostAPR, remainingMonths, 0);
      btTotalInterest = btAmort.totalInterest;
    }
    const btTotalCost = btFee + btTotalInterest;
    const btSavingsVsLoan = totalInterest + origFees - btTotalCost;
    const btPaidInPromo = balAtEndBt <= 0.01;

    return {
      payment, totalPaid, totalInterest, effectiveAPR, opportunityCost, trueCost,
      costMultiplier, origFees, chartData, months,
      early: { payoffMonths: early.months, monthsSaved, interestSaved, extra },
      bt: { fee: btFee, postInterest: btTotalInterest, totalCost: btTotalCost, savings: btSavingsVsLoan, paidInPromo, period: btPeriod, balAtEnd: balAtEndBt },
    };
  }, [principal, apr, term, fees, investReturn, extraMonthly, btPeriodMonths, btFeePct, btPostRate]);

  return (
    <div className="space-y-6">
      <CalculatorGuide
        title="True Cost Loan Analyzer"
        icon={Receipt}
        iconColor="text-prism-amber"
        ttsScript="See the real price tag of any loan, plus early-payoff and 0-percent-balance-transfer alternatives."
        instructions={[
          'Enter the loan details and origination fees',
          'Compare early payoff and 0% BT card alternatives',
          'See total interest, effective APR, and opportunity cost',
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
            <p className="text-xs text-muted-foreground mt-1">You pay {result.costMultiplier.toFixed(2)}× the borrowed amount</p>
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

          {/* ─── Early payoff scenario ─── */}
          <CollapsibleSection
            title="What if I pay extra each month?"
            subtitle={result.early.extra > 0 ? `+${formatCurrency(result.early.extra)}/mo saves ${formatCurrency(result.early.interestSaved)} and ${result.early.monthsSaved} months` : 'Add extra to see savings'}
            icon={Zap}
            accent
            defaultOpen
          >
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2 items-end">
                <div className="space-y-2">
                  <Label>Extra monthly payment</Label>
                  <Input type="number" min="0" step="10" value={extraMonthly} onChange={e => setExtraMonthly(e.target.value)} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Rounding your $346 payment up to $400 costs ~$54/mo but can save hundreds in interest and shave months off the loan.
                </div>
              </div>
              <div className="grid gap-3 grid-cols-3">
                <MiniStat label="Payoff in" value={`${result.early.payoffMonths} mo`} accent={result.early.monthsSaved > 0} />
                <MiniStat label="Months saved" value={`${result.early.monthsSaved}`} accent={result.early.monthsSaved > 0} />
                <MiniStat label="Interest saved" value={formatCurrency(result.early.interestSaved)} accent={result.early.interestSaved > 0} />
              </div>
            </div>
          </CollapsibleSection>

          {/* ─── 0% BT card comparison ─── */}
          <CollapsibleSection
            title="0% balance transfer card — worth it?"
            subtitle={result.bt.paidInPromo
              ? `Save ${formatCurrency(result.bt.savings)} (paid off during promo)`
              : `Save ${formatCurrency(result.bt.savings)} — ${formatCurrency(result.bt.balAtEnd)} left when promo ends`}
            icon={CreditCard}
            accent={result.bt.savings > 0}
          >
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2"><Label>Promo period (mo)</Label><Input type="number" min="0" max="24" value={btPeriodMonths} onChange={e => setBtPeriodMonths(e.target.value)} /></div>
              <div className="space-y-2"><Label>Transfer fee (%)</Label><Input type="number" min="0" step="0.5" value={btFeePct} onChange={e => setBtFeePct(e.target.value)} /></div>
              <div className="space-y-2"><Label>Post-promo APR (%)</Label><Input type="number" min="0" step="0.5" value={btPostRate} onChange={e => setBtPostRate(e.target.value)} /></div>
            </div>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 mt-3">
              <MiniStat label="BT fee upfront" value={formatCurrency(result.bt.fee)} />
              <MiniStat label="Post-promo interest" value={formatCurrency(result.bt.postInterest)} />
              <MiniStat label="Total BT cost" value={formatCurrency(result.bt.totalCost)} accent={result.bt.savings > 0} />
            </div>
            <p className="text-[11px] text-muted-foreground mt-3">
              Only wins if you can realistically pay off (or transfer again) before the promo ends. Miss a payment and most cards revoke the promo retroactively.
            </p>
          </CollapsibleSection>

          {/* ─── Chart ─── */}
          <CollapsibleSection title="Interest paid vs what you could've earned" icon={TrendingUp}>
            {result.chartData.length > 0 && (
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
            )}
          </CollapsibleSection>

          <CollapsibleSection title="Scenarios, pitfalls & tips" icon={Settings2}>
            <CalculatorScenariosAndPitfalls
              scenarios={[
                { title: 'Personal Loan ($10k @ 15%)', description: 'Over 36 months you pay $2,479 interest + $300 fees. A 0% BT card with 3% fee could save ~$2,179 if paid off in the promo period.' },
                { title: 'Student Loan ($30k @ 5%)', description: '10-yr term = $8,184 interest. Paying $100 extra/mo saves $2,500+ and shaves 2 years off.' },
                { title: 'Buy Now Pay Later', description: '0% seems free, but missed payments trigger 25–30% APR retroactively. Treat BNPL like any other credit.' },
              ]}
              pitfalls={[
                { title: 'Ignoring Origination Fees', description: 'A 3–5% origination fee on $10k means you receive $9,500–9,700 but repay $10,000+ interest. Effective APR is higher than advertised.' },
                { title: 'Comparing APR Only', description: 'Same APR, different terms = wildly different total costs. Always compare total repayment, not just rate.' },
                { title: 'Missing BT Promo Payments', description: 'Most 0% cards revoke the promo if you miss even one payment. Set autopay for the minimum + your target payoff amount.' },
                { title: 'Refinancing to a Longer Term', description: 'Lower rate but 2× the term can increase total cost. Always compare total repayment amounts side by side.' },
              ]}
              tips={[
                { title: 'Round Up Every Payment', description: 'Rounding $346 → $400 costs $54/mo but saves hundreds in interest and shaves months off the loan.' },
                { title: 'One Extra Payment Per Year', description: 'Use a tax refund or bonus to make a 13th annual payment. On a $10k @ 15% loan, saves $400+.' },
                { title: 'Rate-Chase to 0% BT', description: 'If your credit is 700+, a 0% BT card with 3% fee usually beats a 12%+ personal loan — even factoring in the fee.' },
              ]}
            />
          </CollapsibleSection>

          <CalculatorActions
            calculatorType="truecostloan"
            inputs={{ principal, apr, term: term[0], fees, investReturn, extraMonthly, btPeriodMonths, btFeePct, btPostRate }}
            results={result}
            hasResults={true}
            summaryText={`True Cost: ${formatCurrency(result.trueCost)} (${formatCurrency(result.totalInterest)} interest + ${formatCurrency(result.opportunityCost)} opportunity). Extra ${formatCurrency(result.early.extra)}/mo saves ${formatCurrency(result.early.interestSaved)}.`}
          />
        </motion.div>
      )}
    </div>
  );
}

function MiniStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-lg border p-2', accent ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/40 bg-muted/20')}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn('text-sm font-bold mt-0.5', accent && 'text-emerald-600 dark:text-emerald-400')}>{value}</div>
    </div>
  );
}
