import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Home, Zap, TrendingDown, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

// Amortize a traditional mortgage
function amortizeMortgage(principal: number, annualRate: number, months: number) {
  const r = annualRate / 100 / 12;
  const payment = r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  let balance = principal;
  let totalInterest = 0;
  const schedule: { month: number; balance: number; interest: number }[] = [];
  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    const principalPaid = payment - interest;
    balance = Math.max(0, balance - principalPaid);
    totalInterest += interest;
    schedule.push({ month: m, balance, interest });
    if (balance <= 0.01) break;
  }
  return { payment, totalInterest, schedule, months: schedule.length };
}

// Simulate 1st-lien HELOC "all-in-one" strategy.
// Model: every month, income is deposited (reducing balance), then expenses are drawn (raising balance).
// Interest accrues on average daily balance (approximated as start-of-month balance minus half of net surplus).
function simulateHeloc(
  principal: number,
  annualRate: number,
  monthlyIncome: number,
  monthlyExpenses: number, // includes everything EXCEPT interest on HELOC
  maxMonths = 480,
) {
  const r = annualRate / 100 / 12;
  const netSurplus = monthlyIncome - monthlyExpenses; // parked against the balance
  let balance = principal;
  let totalInterest = 0;
  const schedule: { month: number; balance: number; interest: number }[] = [];
  if (netSurplus <= 0) {
    return { totalInterest: NaN, schedule, months: Infinity, netSurplus, payoffAmount: 0 };
  }
  for (let m = 1; m <= maxMonths; m++) {
    // Approximate avg daily balance: start balance minus half the month's net paydown
    const avgBalance = Math.max(0, balance - netSurplus / 2);
    const interest = avgBalance * r;
    balance = balance + interest - netSurplus;
    totalInterest += interest;
    if (balance <= 0) {
      schedule.push({ month: m, balance: 0, interest });
      return { totalInterest, schedule, months: m, netSurplus, payoffAmount: netSurplus + balance };
    }
    schedule.push({ month: m, balance, interest });
  }
  return { totalInterest, schedule, months: Infinity, netSurplus, payoffAmount: 0 };
}

export default function HelocVsMortgageCalculator() {
  const { formatCurrency } = useCurrency();

  const [balance, setBalance] = useState('300000');
  const [mortgageRate, setMortgageRate] = useState('6.75');
  const [termYears, setTermYears] = useState('30');
  const [helocRate, setHelocRate] = useState('8.5');
  const [income, setIncome] = useState('9000');
  // Note: expenses here should NOT include the mortgage payment — in a 1st lien HELOC there is no separate mortgage payment.
  const [expenses, setExpenses] = useState('5500');

  const result = useMemo(() => {
    const P = parseFloat(balance) || 0;
    const mR = parseFloat(mortgageRate) || 0;
    const months = (parseInt(termYears) || 30) * 12;
    const hR = parseFloat(helocRate) || 0;
    const inc = parseFloat(income) || 0;
    const exp = parseFloat(expenses) || 0;

    const mortgage = amortizeMortgage(P, mR, months);
    const heloc = simulateHeloc(P, hR, inc, exp);

    const interestSaved = mortgage.totalInterest - (isFinite(heloc.totalInterest) ? heloc.totalInterest : mortgage.totalInterest);
    const monthsSaved = mortgage.months - (isFinite(heloc.months) ? heloc.months : mortgage.months);
    const yearsSaved = monthsSaved / 12;

    // Build combined chart data
    const maxLen = Math.max(mortgage.schedule.length, isFinite(heloc.months) ? heloc.schedule.length : 0);
    const chartData: { month: number; Mortgage: number | null; HELOC: number | null }[] = [];
    const step = Math.max(1, Math.floor(maxLen / 60));
    for (let i = 0; i < maxLen; i += step) {
      chartData.push({
        month: i + 1,
        Mortgage: mortgage.schedule[i]?.balance ?? null,
        HELOC: heloc.schedule[i]?.balance ?? null,
      });
    }

    return { mortgage, heloc, interestSaved, monthsSaved, yearsSaved, chartData };
  }, [balance, mortgageRate, termYears, helocRate, income, expenses]);

  const helocWorks = isFinite(result.heloc.months) && result.heloc.netSurplus > 0;
  const helocBetter = helocWorks && result.interestSaved > 0;

  return (
    <div className="space-y-6 mt-6">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-prism-amber" />
            1st Lien HELOC vs Traditional Mortgage
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Model a 1st-position HELOC "all-in-one" strategy: your paycheck is deposited against the balance, expenses are drawn from it, and interest accrues on the average daily balance. Compare against a traditional amortized mortgage.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Home className="w-3.5 h-3.5" /> Mortgage / Loan
              </div>
              <div className="space-y-2">
                <Label>Current balance</Label>
                <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Mortgage rate %</Label>
                  <Input type="number" step="0.01" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Remaining years</Label>
                  <Input type="number" value={termYears} onChange={(e) => setTermYears(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>HELOC rate % (variable)</Label>
                <Input type="number" step="0.01" value={helocRate} onChange={(e) => setHelocRate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-4">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <TrendingDown className="w-3.5 h-3.5" /> Monthly cash flow
              </div>
              <div className="space-y-2">
                <Label>Monthly gross income deposited</Label>
                <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Monthly expenses (excl. mortgage payment)</Label>
                <Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
                <p className="text-[11px] text-muted-foreground">
                  Include living costs, taxes, insurance, and debts — but not the mortgage P&amp;I. The HELOC replaces the mortgage payment.
                </p>
              </div>
              <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Net monthly surplus parked</span>
                  <span className={cn('font-semibold', result.heloc.netSurplus > 0 ? 'text-prism-lime' : 'text-prism-rose')}>
                    {formatCurrency(result.heloc.netSurplus)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/40 bg-gradient-to-br from-muted/60 to-muted/20 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Home className="w-4 h-4" /> Traditional Mortgage
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Monthly P&amp;I</span><span className="font-semibold"><AnimatedNumber value={result.mortgage.payment} formatFn={formatCurrency} /></span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Payoff time</span><span className="font-semibold">{(result.mortgage.months / 12).toFixed(1)} yrs</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total interest</span><span className="font-semibold text-prism-rose"><AnimatedNumber value={result.mortgage.totalInterest} formatFn={formatCurrency} /></span></div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-prism-amber/30 bg-gradient-to-br from-prism-amber/15 to-prism-amber/5 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <Zap className="w-4 h-4 text-prism-amber" /> 1st Lien HELOC
              </div>
              {helocWorks ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Net surplus / month</span><span className="font-semibold"><AnimatedNumber value={result.heloc.netSurplus} formatFn={formatCurrency} /></span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Payoff time</span><span className="font-semibold">{(result.heloc.months / 12).toFixed(1)} yrs</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total interest</span><span className="font-semibold text-prism-lime"><AnimatedNumber value={result.heloc.totalInterest} formatFn={formatCurrency} /></span></div>
                </div>
              ) : (
                <div className="flex items-start gap-2 text-sm text-prism-rose">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span>Your income doesn't exceed expenses — a 1st-lien HELOC would grow, not shrink. Increase income or trim expenses first.</span>
                </div>
              )}
            </motion.div>
          </div>

          {/* Verdict */}
          {helocWorks && (
            <div className={cn(
              'rounded-xl border p-4 flex items-start gap-3',
              helocBetter ? 'border-prism-lime/30 bg-prism-lime/10' : 'border-prism-rose/30 bg-prism-rose/10',
            )}>
              <CheckCircle2 className={cn('w-5 h-5 mt-0.5', helocBetter ? 'text-prism-lime' : 'text-prism-rose')} />
              <div className="text-sm">
                {helocBetter ? (
                  <>
                    <p className="font-semibold text-foreground">HELOC strategy wins in this scenario.</p>
                    <p className="text-muted-foreground mt-1">
                      Interest saved: <span className="font-semibold text-prism-lime">{formatCurrency(result.interestSaved)}</span>{' '}
                      · Payoff faster by <span className="font-semibold">{result.yearsSaved.toFixed(1)} years</span>.
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-foreground">Traditional mortgage wins here.</p>
                    <p className="text-muted-foreground mt-1">
                      The HELOC's higher rate outweighs the daily-balance benefit. It would cost <span className="font-semibold text-prism-rose">{formatCurrency(-result.interestSaved)}</span> more in interest.
                    </p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Chart */}
          {helocWorks && (
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <LineChart data={result.chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} label={{ value: 'Month', position: 'insideBottom', offset: -4, fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                  <RTooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                    formatter={(v: number) => formatCurrency(v)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="Mortgage" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="HELOC" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <CalculatorGuide
        title="How a 1st Lien HELOC works"
        icon={Zap}
        iconColor="text-prism-amber"
        instructions={[
          "Your HELOC replaces the mortgage in 1st lien position — it becomes your primary home loan.",
          "Every paycheck is deposited to the HELOC, immediately lowering the balance.",
          "Bills and expenses are paid from the HELOC as needed, raising the balance.",
          "Interest is charged on the average daily balance — parking cash there beats a 0% checking account.",
          "The net monthly surplus (income − expenses) is what actually pays the loan down.",
        ]}
        ttsScript="A 1st lien HELOC replaces your mortgage. Your paycheck lowers the balance, expenses raise it, and interest accrues on the average daily balance. The bigger your monthly surplus, the faster you pay off the home."
      />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Strong surplus', description: 'When income comfortably exceeds expenses, the HELOC shreds years off the payoff even at a higher rate.' },
          { title: 'Rate-sensitive', description: 'HELOCs are variable. Stress-test by adding 1–2% to the HELOC rate and re-running.' },
          { title: 'Discipline required', description: 'If lifestyle inflates to match the available credit line, the strategy fails.' },
        ]}
        pitfalls={[
          { title: 'Variable rate risk', description: 'Payments and interest can rise with prime — a rate spike erases the daily-balance advantage.' },
          { title: 'Needs a real surplus', description: 'Without income exceeding expenses, the balance grows instead of shrinking.' },
          { title: 'Closing costs', description: 'Appraisal, origination, and title fees can eat into year-one savings.' },
          { title: 'Product availability', description: 'Not all lenders offer true 1st-lien HELOCs; many are 2nd-lien only.' },
        ]}
      />
    </div>
  );
}
