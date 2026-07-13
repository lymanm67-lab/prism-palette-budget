import { useState, useMemo, useEffect } from 'react';
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
import { QualificationBadge } from '@/components/FinancialProfileCard';
import { useFinancialProfile, profileNumbers, qualifyFor } from '@/hooks/use-financial-profile';
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
  const { profile } = useFinancialProfile();
  const pn = profileNumbers(profile);

  const [balance, setBalance] = useState('300000');
  const [mortgageRate, setMortgageRate] = useState('6.75');
  const [termYears, setTermYears] = useState('30');
  const [helocRate, setHelocRate] = useState('8.5');
  const [income, setIncome] = useState('9000');
  // Note: expenses here should NOT include the mortgage payment — in a 1st lien HELOC there is no separate mortgage payment.
  const [expenses, setExpenses] = useState('5500');

  // Auto-fill from profile whenever it has values
  useEffect(() => {
    if (pn.totalIncome > 0) setIncome(String(pn.totalIncome));
    if (pn.expenses > 0 || pn.debts > 0) setExpenses(String(pn.expenses + pn.debts));
    if (pn.mortgageBalance > 0) setBalance(String(pn.mortgageBalance));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.primaryIncome, profile.partnerIncome, profile.monthlyExpenses, profile.monthlyDebts, profile.mortgageBalance]);

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

      {/* Educational deep-dive: Two Products, Very Different Outcomes */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Two Products, Very Different Outcomes</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Both a traditional mortgage and a 1st lien HELOC finance your home, but the mechanics differ fundamentally. The right choice depends on cash flow, discipline, risk tolerance, and how quickly you want to be debt-free.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Comparison table */}
          <div className="overflow-x-auto rounded-lg border border-border/40">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Feature</th>
                  <th className="p-3 font-semibold">Traditional Mortgage</th>
                  <th className="p-3 font-semibold text-prism-amber">1st Lien HELOC</th>
                </tr>
              </thead>
              <tbody className="[&_tr:nth-child(even)]:bg-muted/20">
                {[
                  ['Interest type', 'Fixed or adjustable', 'Variable (prime-based)'],
                  ['Interest calculation', 'Monthly amortization', 'Average daily balance'],
                  ['Typical payoff', '15–30 years', '5–7 years*'],
                  ['Equity access', 'Requires refi or 2nd lien', 'Built-in revolving access'],
                  ['Payment flexibility', 'Fixed monthly payment', 'Interest-only min + surplus'],
                  ['Checking features', 'None', 'Debit card, bill pay, checks'],
                  ['Sweep functionality', 'Not available', 'Automatic fund optimization'],
                  ['Emergency fund access', 'Separate account needed', 'Built-in via available equity'],
                  ['Rate stability', 'Fixed for life of loan', 'Variable (index + margin)'],
                  ['Minimum payment', 'Full P&I required', 'Interest-only option'],
                  ['Typical total interest', '$380k–$500k', '$50k–$100k'],
                ].map(([f, m, h]) => (
                  <tr key={f} className="border-t border-border/30">
                    <td className="p-3 font-medium">{f}</td>
                    <td className="p-3 text-muted-foreground">{m}</td>
                    <td className="p-3 text-prism-amber/90">{h}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
              <h4 className="font-semibold text-foreground">The Interest Cost Reality</h4>
              <p className="text-sm text-muted-foreground">
                On a $300,000 balance, a 30-year mortgage at 7% generates ~$418,527 in total interest. Monthly payment is $1,996, and it takes until year 18 before more than half goes to principal.
              </p>
              <p className="text-sm text-muted-foreground">
                The same $300,000 on a 1st lien HELOC at 7.5% with $4,400/mo surplus generates ~$106,000 in interest and is paid off in ~8.5 years. Difference: <span className="text-prism-lime font-semibold">~$312,500</span> stays in your pocket.
              </p>
            </div>
            <div className="rounded-xl border border-prism-sky/30 bg-prism-sky/5 p-4 space-y-2">
              <h4 className="font-semibold text-foreground">What About Rate Risk?</h4>
              <p className="text-sm text-muted-foreground">
                HELOC rates are variable and can rise — but total exposure is 5–7 years vs. 30 on a mortgage. Even at 12%, the compressed timeline typically wins on total interest. Stress-test by bumping the HELOC rate above and re-running.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-2">
              <h4 className="font-semibold text-foreground">When a Mortgage Still Makes Sense</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Cash flow is negative or break-even</li>
                <li>No cushion — you need a predictable fixed payment</li>
                <li>Less than ~10% equity available</li>
                <li>You can't commit to discipline for 5–7 years</li>
              </ul>
              <p className="text-xs text-muted-foreground/80 italic">A mortgage is a safety net for those who need structure. There's no shame in predictability.</p>
            </div>
            <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4 space-y-2">
              <h4 className="font-semibold text-foreground">When a HELOC Has the Clear Advantage</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                <li>Consistent positive cash flow of $500+/mo</li>
                <li>Goal: pay off the home in under 10 years</li>
                <li>You value flexibility and equity access</li>
                <li>You're intentional and comfortable with variable rates</li>
              </ul>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-gradient-to-br from-prism-teal/10 to-prism-amber/10 p-4">
            <h4 className="font-semibold text-foreground mb-1">The Bottom Line</h4>
            <p className="text-sm text-muted-foreground">
              A mortgage optimizes for <span className="text-foreground font-medium">predictability</span>. A 1st lien HELOC optimizes for <span className="text-foreground font-medium">total cost and speed of payoff</span>. With the cash flow and discipline, the HELOC can save hundreds of thousands and decades of debt. Without them, a mortgage keeps you safe.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Reference: <a href="https://firstlienheloc.com/calculator/" target="_blank" rel="noopener noreferrer" className="underline hover:text-prism-amber">firstlienheloc.com/calculator</a>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lenders & Qualification Requirements */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-lg">Lenders &amp; Qualification Requirements</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            First-lien HELOCs are a niche product — only a subset of banks and credit unions offer true 1st-position lines. Traditional mortgages are available from nearly every bank, credit union, and mortgage broker.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {/* Traditional Mortgage requirements */}
            <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Home className="w-4 h-4 text-prism-teal" /> Traditional Mortgage — Qualify
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li><span className="text-foreground font-medium">Credit score:</span> 620+ (conventional), 580+ (FHA), 500 with 10% down (FHA)</li>
                <li><span className="text-foreground font-medium">DTI:</span> ≤ 43% typical, up to 50% with compensating factors</li>
                <li><span className="text-foreground font-medium">Down payment:</span> 3–5% conventional, 3.5% FHA, 0% VA/USDA</li>
                <li><span className="text-foreground font-medium">LTV:</span> up to 97% conventional</li>
                <li><span className="text-foreground font-medium">Reserves:</span> 0–6 months PITI depending on loan type</li>
                <li><span className="text-foreground font-medium">Income docs:</span> 2 yrs W-2 / tax returns, 2 mo pay stubs, 2 mo bank statements</li>
              </ul>
              <div className="pt-2 border-t border-border/40">
                <p className="text-xs font-semibold text-foreground mb-1.5">Common lenders</p>
                <p className="text-xs text-muted-foreground">Rocket Mortgage, Chase, Wells Fargo, Bank of America, U.S. Bank, PenFed, Navy Federal, loanDepot, Better.com, local credit unions, and any licensed mortgage broker.</p>
              </div>
            </div>

            {/* 1st Lien HELOC requirements */}
            <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4 space-y-3">
              <h4 className="font-semibold text-foreground flex items-center gap-2">
                <Zap className="w-4 h-4 text-prism-amber" /> 1st Lien HELOC — Qualify
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1.5">
                <li><span className="text-foreground font-medium">Credit score:</span> 680+ typical, 700–740+ for best rates</li>
                <li><span className="text-foreground font-medium">DTI:</span> ≤ 43–45%</li>
                <li><span className="text-foreground font-medium">Equity / CLTV:</span> at least 10–20% equity; max CLTV 80–90%</li>
                <li><span className="text-foreground font-medium">Positive cash flow:</span> lenders want to see net monthly surplus — the whole strategy depends on it</li>
                <li><span className="text-foreground font-medium">Property:</span> primary residence (most), some allow 2nd home / investment at lower CLTV</li>
                <li><span className="text-foreground font-medium">Docs:</span> mortgage payoff, appraisal or AVM, income + asset verification, homeowners insurance</li>
              </ul>
              <div className="pt-2 border-t border-prism-amber/30">
                <p className="text-xs font-semibold text-foreground mb-1.5">Lenders that offer true 1st-lien HELOCs</p>
                <p className="text-xs text-muted-foreground">
                  Quorum Federal Credit Union, Andrews Federal Credit Union, Signature Federal Credit Union, Hitch, CMG Financial "All In One Loan", Northpointe Bank, Aven, Figure (select markets), and various regional credit unions. Availability varies by state — call to confirm 1st-position eligibility.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border/40 bg-gradient-to-br from-prism-sky/10 to-prism-teal/10 p-4 space-y-2">
            <h4 className="font-semibold text-foreground text-sm">Before you apply — checklist</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>Pull your credit reports and know your middle FICO score.</li>
              <li>Get a recent home value estimate (AVM or appraisal) and current mortgage payoff.</li>
              <li>Calculate your current CLTV: (mortgage balance) ÷ (home value).</li>
              <li>Document 2 months of pay stubs, 2 years W-2 / tax returns, and 2 months of asset statements.</li>
              <li>For a 1st-lien HELOC, confirm the lender will pay off and replace your existing mortgage (not sit behind it).</li>
              <li>Ask about draw period, repayment period, index (Prime), margin, floor rate, ceiling rate, and closing costs.</li>
            </ul>
            <p className="text-xs text-muted-foreground/70 pt-1">
              Sources: Bankrate, NerdWallet, Quorum FCU product matrix, Spring EQ correspondent guidelines, rate.com.
            </p>
          </div>

          <p className="text-[11px] text-muted-foreground/60 italic">
            Informational only — not a loan offer, quote, or commitment to lend. Guidelines vary by lender, state, and market conditions. Always verify current requirements directly with the lender.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
