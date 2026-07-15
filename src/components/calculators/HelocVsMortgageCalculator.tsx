import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Home, Zap, TrendingDown, CheckCircle2, AlertTriangle, Printer, Save, FileText, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import { QualificationBadge } from '@/components/FinancialProfileCard';
import { useFinancialProfile, profileNumbers, qualifyFor } from '@/hooks/use-financial-profile';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { HELOC_LENDERS, US_STATES, lendersForState } from '@/data/heloc-lenders';
import DocumentUploadCard from '@/components/calculators/DocumentUploadCard';
import CreditImprovementPlan from '@/components/calculators/CreditImprovementPlan';
import HelocReportPreview, { type HelocReportData } from '@/components/calculators/HelocReportPreview';
import PayoffAccelerator from '@/components/calculators/PayoffAccelerator';
import FreedomCenter from '@/components/calculators/mortgage-freedom/FreedomCenter';
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

// ── 2nd-lien HELOC "chunking" strategy ────────────────────────────────────────
// Keep the existing 30-yr mortgage. Draw a chunk from a 2nd-lien HELOC, throw it
// at mortgage principal, then pay the HELOC to zero with monthly surplus. Repeat.
// Auto-optimal chunk = 4 × monthly surplus, rounded to nearest $2,500 (min $2,500).
export function simulate2ndLienHeloc(
  principal: number,
  mortgageRate: number,
  termYears: number,
  helocRate: number,
  monthlyIncome: number,
  monthlyExpenses: number,
  cap = 720,
) {
  const mR = mortgageRate / 100 / 12;
  const hR = helocRate / 100 / 12;
  const n = Math.max(1, Math.round(termYears * 12));
  const mortgagePayment = mR === 0
    ? principal / n
    : (principal * mR * Math.pow(1 + mR, n)) / (Math.pow(1 + mR, n) - 1);
  const surplus = monthlyIncome - monthlyExpenses - mortgagePayment;
  const schedule: { month: number; balance: number; mortgage: number; heloc: number }[] = [
    { month: 0, balance: principal, mortgage: principal, heloc: 0 },
  ];
  if (surplus <= 0) {
    return { months: Infinity, totalInterest: NaN, schedule, chunk: 0, mortgagePayment, surplus };
  }
  const chunk = Math.max(2500, Math.round((surplus * 4) / 2500) * 2500);
  let mBal = principal;
  let hBal = 0;
  let totalInterest = 0;
  for (let m = 1; m <= cap; m++) {
    // Mortgage: regular P&I
    const mInt = mBal * mR;
    const mPrin = Math.min(mBal, mortgagePayment - mInt);
    mBal = Math.max(0, mBal - mPrin);
    totalInterest += mInt;

    if (hBal > 0.01) {
      // Pay HELOC down with monthly surplus (avg daily balance approx)
      const avg = Math.max(0, hBal - surplus / 2);
      const hInt = avg * hR;
      totalInterest += hInt;
      hBal = Math.max(0, hBal + hInt - surplus);
    } else if (mBal > 0.01) {
      // HELOC clear → draw a fresh chunk and throw at mortgage principal
      const draw = Math.min(chunk, mBal);
      mBal = Math.max(0, mBal - draw);
      hBal = draw;
    }

    schedule.push({ month: m, balance: mBal + hBal, mortgage: mBal, heloc: hBal });
    if (mBal <= 0.01 && hBal <= 0.01) {
      return { months: m, totalInterest, schedule, chunk, mortgagePayment, surplus };
    }
  }
  return { months: Infinity, totalInterest: NaN, schedule, chunk, mortgagePayment, surplus };
}

// ── Standalone HELOC: interest-only during draw, then amortizing over repayment period.
//    Mirrors calculator.net's HELOC model, with optional closing costs & fees toggled into APR/total cost.
export function simulateStandaloneHeloc(
  loanAmount: number,
  annualRate: number,
  drawYears: number,
  repayYears: number,
  closingCosts: number = 0,
) {
  const r = annualRate / 100 / 12;
  const drawMonths = Math.max(0, Math.round(drawYears * 12));
  const repayMonths = Math.max(1, Math.round(repayYears * 12));
  const drawPayment = loanAmount * r; // interest-only
  const repayPayment = r === 0
    ? loanAmount / repayMonths
    : (loanAmount * r * Math.pow(1 + r, repayMonths)) / (Math.pow(1 + r, repayMonths) - 1);

  const schedule: { month: number; phase: 'draw' | 'repay'; payment: number; interest: number; principal: number; balance: number }[] = [];
  let balance = loanAmount;
  let totalInterest = 0;

  // Draw period: interest-only, balance stays flat
  for (let m = 1; m <= drawMonths; m++) {
    const interest = balance * r;
    totalInterest += interest;
    schedule.push({ month: m, phase: 'draw', payment: drawPayment, interest, principal: 0, balance });
  }
  // Repayment period: fully amortizing
  for (let m = 1; m <= repayMonths; m++) {
    const interest = balance * r;
    const principal = Math.min(balance, repayPayment - interest);
    balance = Math.max(0, balance - principal);
    totalInterest += interest;
    schedule.push({ month: drawMonths + m, phase: 'repay', payment: repayPayment, interest, principal, balance });
    if (balance <= 0.01) break;
  }

  const totalPayments = drawPayment * drawMonths + repayPayment * schedule.filter(s => s.phase === 'repay').length + closingCosts;
  // Simple APR approximation: solve rate that makes PV of payments equal (loanAmount - closingCosts)
  // Iterative Newton-style approximation.
  const apr = (() => {
    if (closingCosts <= 0 || loanAmount <= 0) return annualRate;
    const cashReceived = loanAmount - closingCosts;
    const totalMonths = drawMonths + schedule.filter(s => s.phase === 'repay').length;
    let guess = annualRate / 100 / 12;
    for (let iter = 0; iter < 60; iter++) {
      const g = guess;
      // PV of interest-only draw + amortizing repayment
      let pv = 0;
      const drawPay = loanAmount * g;
      const rp = g === 0
        ? loanAmount / repayMonths
        : (loanAmount * g * Math.pow(1 + g, repayMonths)) / (Math.pow(1 + g, repayMonths) - 1);
      for (let k = 1; k <= drawMonths; k++) pv += drawPay / Math.pow(1 + g, k);
      for (let k = 1; k <= repayMonths; k++) pv += rp / Math.pow(1 + g, drawMonths + k);
      const diff = pv - cashReceived;
      if (Math.abs(diff) < 0.5) break;
      guess += diff > 0 ? 0.00005 : -0.00005;
      if (guess < 0) guess = 0.00001;
    }
    return guess * 12 * 100;
  })();

  return {
    drawPayment,
    repayPayment,
    totalInterest,
    totalPayments,
    schedule,
    drawMonths,
    repayMonths: schedule.filter(s => s.phase === 'repay').length,
    apr,
  };
}

export default function HelocVsMortgageCalculator() {
  const { formatCurrency } = useCurrency();
  const { profile } = useFinancialProfile();
  const { household } = useHousehold();
  const pn = profileNumbers(profile);

  const [balance, setBalance] = useState('300000');
  const [mortgageRate, setMortgageRate] = useState('6.75');
  const [termYears, setTermYears] = useState('30');
  const [helocRate, setHelocRate] = useState('8.5');
  const [income, setIncome] = useState('9000');
  // Note: expenses here should NOT include the mortgage payment — in a 1st lien HELOC there is no separate mortgage payment.
  const [expenses, setExpenses] = useState('5500');
  const [reportOpen, setReportOpen] = useState(false);

  // Comparison mode: mortgage only · mortgage vs 1st-lien HELOC · 1st-lien vs 2nd-lien HELOC
  const [mode, setMode] = useState<'mortgage-only' | 'compare' | 'heloc-vs-heloc'>('compare');
  // Scenario: buying a new home vs paying off an existing balance
  const [scenario, setScenario] = useState<'purchase' | 'payoff'>('payoff');

  // Standalone HELOC inputs (draw + repayment + closing costs)
  const [drawYears, setDrawYears] = useState('10');
  const [repayYears, setRepayYears] = useState('20');
  const [includeClosing, setIncludeClosing] = useState(false);
  const [closingCosts, setClosingCosts] = useState('2500');

  // Amortization schedule view toggle
  const [scheduleView, setScheduleView] = useState<'annual' | 'monthly'>('annual');

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

    // Standalone HELOC (interest-only draw → amortizing repayment, w/ optional closing costs)
    const standalone = simulateStandaloneHeloc(
      P,
      hR,
      parseFloat(drawYears) || 0,
      parseFloat(repayYears) || 1,
      includeClosing ? (parseFloat(closingCosts) || 0) : 0,
    );

    // 2nd-lien HELOC "chunking" strategy — keep the mortgage, use HELOC to accelerate principal
    const lien2 = simulate2ndLienHeloc(P, mR, parseInt(termYears) || 30, hR, inc, exp);

    return { mortgage, heloc, interestSaved, monthsSaved, yearsSaved, chartData, standalone, lien2 };
  }, [balance, mortgageRate, termYears, helocRate, income, expenses, drawYears, repayYears, includeClosing, closingCosts]);

  const helocWorks = isFinite(result.heloc.months) && result.heloc.netSurplus > 0;
  const helocBetter = helocWorks && result.interestSaved > 0;

  return (
    <div className="space-y-8 mt-6">
      {/* ─── Step 1 · Personalize your inputs ─── */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Step 1</span>
          <h2 className="text-lg font-semibold text-foreground">Personalize your inputs</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a mortgage statement, pay stub, or HELOC offer to auto-fill your profile. Everything below adapts to your numbers.
        </p>
        <DocumentUploadCard />
      </section>

      {/* ─── Step 2 · Mortgage Freedom Intelligence Center ─── */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Step 2</span>
          <h2 className="text-lg font-semibold text-foreground">Get your recommended path</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Our AI compares every viable payoff strategy against your profile and highlights the fastest, safest route to mortgage freedom.
        </p>
        <Card className="glass-card border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              Mortgage Freedom Intelligence Center
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Compare payoff strategies, stress-test HELOC risk, and see the winning plan for your situation.
            </p>
          </CardHeader>
          <CardContent>
            <FreedomCenter />
          </CardContent>
        </Card>
      </section>

      {/* ─── Step 3 · Detailed scenario modeling ─── */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Step 3</span>
          <h2 className="text-lg font-semibold text-foreground">Model it yourself</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Hands-on calculator: tune the mortgage, HELOC, and cash-flow inputs to stress-test the recommendation and see the amortization schedule.
        </p>
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
          <CalculatorGuide
            title="1st Lien HELOC vs Mortgage"
            icon={Zap}
            iconColor="text-prism-amber"
            instructions={[
              'Enter your current mortgage balance (or the home value if you want to model a new purchase).',
              'Set your current mortgage rate and remaining years, plus the HELOC variable rate you can get.',
              'Enter your monthly gross income that will be deposited into the HELOC account.',
              'Enter your monthly expenses excluding any mortgage payment — the HELOC replaces that payment.',
              'Watch the live comparison: monthly surplus, payoff time, total interest, and the winner badge.',
              'Review the qualification badges to see if your profile fits a mortgage or 1st-lien HELOC.',
              'Use the Compare, Qualify, Lenders, and Learn tabs for deeper details, local lenders, and requirements.',
            ]}
            ttsScript="How to use the 1st Lien HELOC versus Mortgage calculator. First, enter your current mortgage balance. Then set your current mortgage rate and remaining years, plus the HELOC variable rate you expect. Next, enter your monthly gross income that will be deposited into the HELOC account, and your monthly expenses excluding any mortgage payment because the HELOC replaces the payment. The live comparison will show your monthly surplus, payoff time, total interest, and whether the HELOC or mortgage wins. Review the qualification badges to see if your profile fits a mortgage or 1st-lien HELOC. Finally, explore the Compare, Qualify, Lenders, and Learn tabs for deeper details, local lenders, and requirements."
          />

          {/* Mode + Scenario toggle */}
          <div className="flex flex-col gap-3 rounded-xl border border-border/40 bg-muted/20 p-3">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-foreground">Comparison mode</div>
                <p className="text-xs text-muted-foreground">
                  {mode === 'mortgage-only' && 'Plain 30-yr amortized mortgage — payment, payoff time and total interest.'}
                  {mode === 'compare' && 'Traditional mortgage vs. a 1st-lien HELOC "all-in-one" strategy.'}
                  {mode === 'heloc-vs-heloc' && '1st-lien HELOC (replaces mortgage) vs. 2nd-lien HELOC (chunks against mortgage).'}
                </p>
              </div>
              <div className="inline-flex flex-wrap rounded-lg border border-border/60 bg-background p-0.5 self-start">
                <button type="button" onClick={() => setMode('mortgage-only')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    mode === 'mortgage-only' ? 'bg-prism-amber text-background' : 'text-muted-foreground hover:text-foreground')}>
                  Mortgage only
                </button>
                <button type="button" onClick={() => setMode('compare')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    mode === 'compare' ? 'bg-prism-amber text-background' : 'text-muted-foreground hover:text-foreground')}>
                  Mortgage vs 1st-lien
                </button>
                <button type="button" onClick={() => setMode('heloc-vs-heloc')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    mode === 'heloc-vs-heloc' ? 'bg-prism-amber text-background' : 'text-muted-foreground hover:text-foreground')}>
                  1st vs 2nd-lien HELOC
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border/40">
              <div className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Scenario:</span>{' '}
                {scenario === 'purchase'
                  ? 'Buying a home — which financing is cheapest overall?'
                  : 'Already own — which strategy pays off fastest?'}
              </div>
              <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5 self-start">
                <button type="button" onClick={() => setScenario('purchase')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    scenario === 'purchase' ? 'bg-prism-teal text-background' : 'text-muted-foreground hover:text-foreground')}>
                  Home purchase
                </button>
                <button type="button" onClick={() => setScenario('payoff')}
                  className={cn('px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    scenario === 'payoff' ? 'bg-prism-teal text-background' : 'text-muted-foreground hover:text-foreground')}>
                  Home payoff
                </button>
              </div>
            </div>
          </div>

          {/* Mortgage-only mode */}
          {mode === 'mortgage-only' && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Home className="w-3.5 h-3.5" /> Mortgage terms
                </div>
                <div className="space-y-2">
                  <Label>{scenario === 'purchase' ? 'Loan amount' : 'Current balance'}</Label>
                  <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Rate %</Label>
                    <Input type="number" step="0.01" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Term (years)</Label>
                    <Input type="number" value={termYears} onChange={(e) => setTermYears(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Monthly P&amp;I</div>
                  <div className="text-2xl font-bold text-foreground">
                    <AnimatedNumber value={result.mortgage.payment} formatFn={formatCurrency} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Payoff time</div>
                    <div className="text-lg font-bold text-foreground">{(result.mortgage.months / 12).toFixed(1)} yrs</div>
                  </div>
                  <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Total interest</div>
                    <div className="text-lg font-bold text-prism-rose">
                      <AnimatedNumber value={result.mortgage.totalInterest} formatFn={formatCurrency} />
                    </div>
                  </div>
                </div>
                <div className="rounded-lg border border-prism-teal/30 bg-prism-teal/5 p-3 text-xs text-muted-foreground">
                  {scenario === 'purchase'
                    ? 'Baseline for a home purchase. Switch to "Mortgage vs 1st-lien" or "1st vs 2nd-lien" to see if a HELOC-based strategy beats this.'
                    : 'Baseline payoff. Switch modes to see how HELOC strategies could shorten this timeline and cut total interest.'}
                </div>
              </div>
            </div>
          )}

          {/* HELOC vs HELOC — 1st-lien "all-in-one" vs 2nd-lien "chunking" */}
          {mode === 'heloc-vs-heloc' && (
            <>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-prism-amber" /> Shared inputs
                </div>
                <div className="space-y-2">
                  <Label>{scenario === 'purchase' ? 'Home price / loan amount' : 'Current mortgage balance'}</Label>
                  <Input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Mortgage rate %</Label>
                    <Input type="number" step="0.01" value={mortgageRate} onChange={(e) => setMortgageRate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Mortgage term (yrs)</Label>
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
                  <Label>Monthly gross income</Label>
                  <Input type="number" value={income} onChange={(e) => setIncome(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Monthly expenses (excl. mortgage P&amp;I)</Label>
                  <Input type="number" value={expenses} onChange={(e) => setExpenses(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">
                    For 1st-lien: HELOC replaces the mortgage payment. For 2nd-lien: mortgage payment is kept separate; surplus is what's left over.
                  </p>
                </div>
              </div>
            </div>

            {/* 1st vs 2nd side-by-side */}
            <div className="grid md:grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-prism-amber/30 bg-gradient-to-br from-prism-amber/15 to-prism-amber/5 p-4">
                <div className="flex items-center gap-2 text-sm mb-3">
                  <Zap className="w-4 h-4 text-prism-amber" />
                  <span className="font-semibold text-foreground">1st-lien HELOC</span>
                  <span className="text-[11px] text-muted-foreground">(replaces mortgage)</span>
                </div>
                {helocWorks ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Net surplus / mo</span><span className="font-semibold">{formatCurrency(result.heloc.netSurplus)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payoff time</span><span className="font-semibold">{(result.heloc.months / 12).toFixed(1)} yrs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total interest</span><span className="font-semibold text-prism-lime"><AnimatedNumber value={result.heloc.totalInterest} formatFn={formatCurrency} /></span></div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-prism-rose">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>Income doesn't exceed expenses — a 1st-lien HELOC balance would grow.</span>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-prism-teal/30 bg-gradient-to-br from-prism-teal/15 to-prism-teal/5 p-4">
                <div className="flex items-center gap-2 text-sm mb-3">
                  <TrendingDown className="w-4 h-4 text-prism-teal" />
                  <span className="font-semibold text-foreground">2nd-lien HELOC</span>
                  <span className="text-[11px] text-muted-foreground">(chunking on top of mortgage)</span>
                </div>
                {isFinite(result.lien2.months) ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Mortgage P&amp;I / mo</span><span className="font-semibold">{formatCurrency(result.lien2.mortgagePayment)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Auto chunk size</span><span className="font-semibold">{formatCurrency(result.lien2.chunk)}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Payoff time</span><span className="font-semibold">{(result.lien2.months / 12).toFixed(1)} yrs</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Total interest</span><span className="font-semibold text-prism-lime"><AnimatedNumber value={result.lien2.totalInterest} formatFn={formatCurrency} /></span></div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 text-sm text-prism-rose">
                    <AlertTriangle className="w-4 h-4 mt-0.5" />
                    <span>No monthly surplus after the mortgage P&amp;I — chunking needs positive leftover cash flow.</span>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Scenario-aware verdict */}
            {(helocWorks || isFinite(result.lien2.months)) && (() => {
              const l1Int = helocWorks ? result.heloc.totalInterest : Infinity;
              const l2Int = isFinite(result.lien2.totalInterest) ? result.lien2.totalInterest : Infinity;
              const l1Mo = helocWorks ? result.heloc.months : Infinity;
              const l2Mo = isFinite(result.lien2.months) ? result.lien2.months : Infinity;
              // Purchase = optimize total cost. Payoff = optimize speed.
              const winner = scenario === 'purchase'
                ? (l1Int <= l2Int ? '1st' : '2nd')
                : (l1Mo <= l2Mo ? '1st' : '2nd');
              const diff = scenario === 'purchase'
                ? Math.abs(l1Int - l2Int)
                : Math.abs(l1Mo - l2Mo) / 12;
              return (
                <div className="rounded-xl border border-prism-lime/30 bg-prism-lime/10 p-4 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 mt-0.5 text-prism-lime" />
                  <div className="text-sm">
                    <p className="font-semibold text-foreground">
                      Best for {scenario === 'purchase' ? 'home purchase' : 'home payoff'}:{' '}
                      <span className={winner === '1st' ? 'text-prism-amber' : 'text-prism-teal'}>
                        {winner === '1st' ? '1st-lien HELOC' : '2nd-lien HELOC'}
                      </span>
                    </p>
                    <p className="text-muted-foreground mt-1">
                      {scenario === 'purchase'
                        ? <>Saves <span className="font-semibold text-prism-lime">{formatCurrency(diff)}</span> in total interest vs. the other HELOC strategy.</>
                        : <>Pays off <span className="font-semibold text-prism-lime">{diff.toFixed(1)} years sooner</span> than the other HELOC strategy.</>}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-2">
                      1st-lien is best when income comfortably exceeds expenses and you're OK replacing your mortgage. 2nd-lien is best when you want to keep a low fixed mortgage rate and just accelerate principal.
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* Payoff race chart: 1st vs 2nd */}
            {(helocWorks || isFinite(result.lien2.months)) && (
              <div className="h-72 w-full">
                <ResponsiveContainer>
                  <LineChart data={(() => {
                    const maxLen = Math.max(
                      isFinite(result.heloc.months) ? result.heloc.schedule.length : 0,
                      isFinite(result.lien2.months) ? result.lien2.schedule.length : 0,
                    );
                    const step = Math.max(1, Math.floor(maxLen / 60));
                    const rows: any[] = [];
                    for (let i = 0; i < maxLen; i += step) {
                      rows.push({
                        month: i + 1,
                        '1st-lien HELOC': helocWorks ? (result.heloc.schedule[i]?.balance ?? 0) : null,
                        '2nd-lien HELOC': isFinite(result.lien2.months) ? (result.lien2.schedule[i]?.balance ?? 0) : null,
                      });
                    }
                    return rows;
                  })()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={(m) => `${(m / 12).toFixed(0)}y`} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                      formatter={(v: number) => v == null ? '—' : formatCurrency(v)} />
                    <Legend />
                    <Line type="monotone" dataKey="1st-lien HELOC" stroke="hsl(var(--prism-amber))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="2nd-lien HELOC" stroke="hsl(var(--prism-teal))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            </>
          )}

          {/* Legacy Standalone HELOC inputs — kept for detail/APR/schedule under HELOC-vs-HELOC mode */}
          {mode === 'heloc-vs-heloc' && (
            <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-border/40">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-prism-amber" /> Standalone HELOC terms (draw + repay)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Draw period (yrs)</Label>
                    <Input type="number" value={drawYears} onChange={(e) => setDrawYears(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Repayment period (yrs)</Label>
                    <Input type="number" value={repayYears} onChange={(e) => setRepayYears(e.target.value)} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Draw-period monthly pay</span>
                    <span className="font-semibold">{formatCurrency(result.standalone.drawPayment)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Repayment monthly pay</span>
                    <span className="font-semibold">{formatCurrency(result.standalone.repayPayment)}</span>
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Interest-only during draw, fully amortizing during repayment.
                </p>
              </div>
            </div>
          )}

          {/* Standalone HELOC results */}
          {mode === 'heloc-vs-heloc' && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total of payments</div>
                  <div className="text-lg font-bold text-foreground">
                    <AnimatedNumber value={result.standalone.totalPayments} formatFn={formatCurrency} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {result.standalone.drawMonths + result.standalone.repayMonths} monthly payments{includeClosing ? ' + closing costs' : ''}
                  </div>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Total interest</div>
                  <div className="text-lg font-bold text-prism-rose">
                    <AnimatedNumber value={result.standalone.totalInterest} formatFn={formatCurrency} />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-border/40 bg-muted/30 p-3 text-sm space-y-2">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-prism-amber mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium text-foreground">What is the difference?</p>
                      <p className="text-muted-foreground text-xs mt-1">
                        <strong>Draw period:</strong> the window when you can borrow from the HELOC. Payments are usually interest-only, so the principal balance does not go down.
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        <strong>Repayment period:</strong> the window when you can no longer draw funds and must pay both principal and interest until the loan is paid off.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Loan lifetime</div>
                  <div className="text-lg font-bold text-prism-amber">
                    {((result.standalone.drawMonths + result.standalone.repayMonths) / 12).toFixed(1)} yrs
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    {(result.standalone.drawMonths / 12).toFixed(0)} yr draw + {(result.standalone.repayMonths / 12).toFixed(0)} yr repay
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Closing costs & fees — always visible in both modes */}
          <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" /> Closing costs & fees
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeClosing}
                  onChange={(e) => setIncludeClosing(e.target.checked)}
                  className="w-4 h-4 accent-prism-amber"
                />
                Include closing costs and fees
              </label>
            </div>
            {includeClosing && (
              <div className="grid sm:grid-cols-2 gap-3 items-start">
                <div className="space-y-2">
                  <Label>Closing costs & fees ($)</Label>
                  <Input type="number" value={closingCosts} onChange={(e) => setClosingCosts(e.target.value)} />
                  <p className="text-[11px] text-muted-foreground">
                    Origination, appraisal, title, recording, etc. Affects APR and total cost.
                  </p>
                </div>
                <div className="rounded-lg border border-border/40 bg-background/50 p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Note rate</span>
                    <span className="font-semibold">{(parseFloat(helocRate) || 0).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Effective APR</span>
                    <span className="font-semibold text-prism-amber">{result.standalone.apr.toFixed(3)}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Amortization schedule — always visible in both modes */}
          <AmortizationSchedule
            schedule={result.standalone.schedule}
            view={scheduleView}
            onViewChange={setScheduleView}
            formatCurrency={formatCurrency}
          />


          {/* HELOC vs Mortgage inputs */}
          {mode === 'compare' && (
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
          )}

          {/* Results (compare mode only) */}
          {mode === 'compare' && (<>

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

          {/* Qualification from profile */}
          {pn.totalIncome > 0 && (
            <div className="grid md:grid-cols-2 gap-3">
              {(() => {
                const mQ = qualifyFor(profile, result.mortgage.payment, 'mortgage');
                const hQ = qualifyFor(profile, 0, 'heloc');
                return (
                  <>
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Home className="w-3 h-3" /> Mortgage qualification</div>
                      <QualificationBadge verdict={mQ.verdict} reasons={mQ.reasons} dti={mQ.dti} />
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1"><Zap className="w-3 h-3" /> 1st Lien HELOC qualification</div>
                      <QualificationBadge verdict={hQ.verdict} reasons={hQ.reasons} dti={hQ.dti} />
                    </div>
                  </>
                );
              })()}
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
          </>
          )}

          {/* Payoff Accelerator — beat a traditional 30-yr mortgage */}
          {mode === 'compare' && (
            <PayoffAccelerator
              principal={parseFloat(balance) || 0}
              mortgageRate={parseFloat(mortgageRate) || 0}
              termYears={parseInt(termYears) || 30}
              helocRate={parseFloat(helocRate) || 0}
              monthlyIncome={parseFloat(income) || 0}
              monthlyExpenses={parseFloat(expenses) || 0}
              formatCurrency={formatCurrency}
            />
          )}




          {/* Save + Print report actions */}
          <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/40">
            <p className="text-xs text-muted-foreground mr-auto">
              Save your scenario or generate a printable report.
            </p>
            <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
              <FileText className="w-4 h-4 mr-1" /> Preview report
            </Button>
            <Button size="sm" onClick={() => setReportOpen(true)}>
              <Printer className="w-4 h-4 mr-1" /> Save / Print
            </Button>
          </div>
        </CardContent>
      </Card>
      </section>

      {/* ─── Step 4 · Learn, qualify, and shop ─── */}
      <section className="space-y-3">
        <div className="flex items-baseline gap-3">
          <span className="text-xs font-mono uppercase tracking-widest text-primary">Step 4</span>
          <h2 className="text-lg font-semibold text-foreground">Compare, qualify, and shop lenders</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Side-by-side product comparison, qualification requirements, curated lenders, and the education you need to move forward with confidence.
        </p>
      <Tabs defaultValue="compare" className="w-full">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="compare">Compare</TabsTrigger>
          <TabsTrigger value="qualify">Qualify</TabsTrigger>
          <TabsTrigger value="lenders">Lenders</TabsTrigger>
          <TabsTrigger value="learn">Learn</TabsTrigger>
        </TabsList>


        {/* ─── Compare ─── */}
        <TabsContent value="compare" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Two Products, Very Different Outcomes</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                The right choice depends on cash flow, discipline, risk tolerance, and how quickly you want to be debt-free.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
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
                    ].map(([f, m, h]) => (
                      <tr key={f} className="border-t border-border/30">
                        <td className="p-3 font-medium">{f}</td>
                        <td className="p-3 text-muted-foreground">{m}</td>
                        <td className="p-3 text-prism-amber/90">{h}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="text-[11px] text-muted-foreground/70 p-3 border-t border-border/30">
                  *Payoff time on a 1st-lien HELOC depends on your monthly surplus. See your live results in the calculator above.
                </p>
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
                </div>
                <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4 space-y-2">
                  <h4 className="font-semibold text-foreground">When a HELOC Has the Clear Advantage</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Consistent positive cash flow of $500+/mo</li>
                    <li>Goal: pay off the home in under 10 years</li>
                    <li>You value flexibility and equity access</li>
                    <li>You're comfortable with variable rates</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-prism-sky/30 bg-prism-sky/5 p-4">
                <h4 className="font-semibold text-foreground text-sm">What About Rate Risk?</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  HELOC rates are variable — but total exposure is 5–7 years vs. 30 on a mortgage. Even at 12%, the compressed timeline typically wins. Stress-test by bumping the HELOC rate in the calculator above.
                </p>
              </div>

              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-prism-teal/10 to-prism-amber/10 p-4">
                <h4 className="font-semibold text-foreground mb-1">The Bottom Line</h4>
                <p className="text-sm text-muted-foreground">
                  A mortgage optimizes for <span className="text-foreground font-medium">predictability</span>. A 1st lien HELOC optimizes for <span className="text-foreground font-medium">total cost and speed of payoff</span>. With the cash flow and discipline, the HELOC can save hundreds of thousands and decades of debt.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── Qualify ─── */}
        <TabsContent value="qualify" className="mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-lg">Qualification Requirements</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                What most lenders look for. Guidelines vary — always verify with the lender.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-4 space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Home className="w-4 h-4 text-prism-teal" /> Traditional Mortgage
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li><span className="text-foreground font-medium">Credit score:</span> 620+ (conventional), 580+ (FHA), 500 with 10% down (FHA)</li>
                    <li><span className="text-foreground font-medium">DTI:</span> ≤ 43% typical, up to 50% with compensating factors</li>
                    <li><span className="text-foreground font-medium">Down payment:</span> 3–5% conventional, 3.5% FHA, 0% VA/USDA</li>
                    <li><span className="text-foreground font-medium">LTV:</span> up to 97% conventional</li>
                    <li><span className="text-foreground font-medium">Reserves:</span> 0–6 months PITI depending on loan type</li>
                    <li><span className="text-foreground font-medium">Income docs:</span> 2 yrs W-2 / tax returns, 2 mo pay stubs, 2 mo bank statements</li>
                  </ul>
                </div>

                <div className="rounded-xl border border-prism-amber/30 bg-prism-amber/5 p-4 space-y-3">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-prism-amber" /> 1st Lien HELOC
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1.5">
                    <li><span className="text-foreground font-medium">Credit score:</span> 680+ typical, 700–740+ for best rates</li>
                    <li><span className="text-foreground font-medium">DTI:</span> ≤ 43–45%</li>
                    <li><span className="text-foreground font-medium">Equity / CLTV:</span> at least 10–20% equity; max CLTV 80–90%</li>
                    <li><span className="text-foreground font-medium">Positive cash flow:</span> lenders want to see net monthly surplus</li>
                    <li><span className="text-foreground font-medium">Property:</span> primary residence (most)</li>
                    <li><span className="text-foreground font-medium">Docs:</span> mortgage payoff, appraisal or AVM, income + asset verification</li>
                  </ul>
                </div>
              </div>

              <div className="rounded-xl border border-border/40 bg-gradient-to-br from-prism-sky/10 to-prism-teal/10 p-4 space-y-2">
                <h4 className="font-semibold text-foreground text-sm">Before you apply — checklist</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                  <li>Pull your credit reports and know your middle FICO score.</li>
                  <li>Get a recent home value estimate (AVM or appraisal) and current mortgage payoff.</li>
                  <li>Calculate your current CLTV: (mortgage balance) ÷ (home value).</li>
                  <li>Document 2 months of pay stubs, 2 years W-2 / tax returns, and 2 months of asset statements.</li>
                  <li>For a 1st-lien HELOC, confirm the lender will pay off and replace your existing mortgage.</li>
                  <li>Ask about draw period, repayment period, index (Prime), margin, floor rate, ceiling rate, and closing costs.</li>
                </ul>
              </div>

              <p className="text-[11px] text-muted-foreground/60 italic">
                Informational only — not a loan offer, quote, or commitment to lend. Guidelines vary by lender, state, and market conditions.
              </p>
            </CardContent>
          </Card>

          {/* Credit improvement plan — always render; adapts to current score */}
          <CreditImprovementPlan
            currentScore={parseInt(profile.creditScore) || 0}
            targetProduct="heloc"
          />
        </TabsContent>

        {/* ─── Lenders ─── */}
        <TabsContent value="lenders" className="mt-4">
          <LenderDirectory />
        </TabsContent>

        {/* ─── Learn ─── */}
        <TabsContent value="learn" className="mt-4 space-y-4">
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
        </TabsContent>
      </Tabs>
      </section>

      {/* Report preview modal */}
      <HelocReportPreview
        open={reportOpen}
        onOpenChange={setReportOpen}
        householdId={household?.id ?? null}
        data={{
          inputs: {
            balance: parseFloat(balance) || 0,
            mortgageRate: parseFloat(mortgageRate) || 0,
            termYears: parseInt(termYears) || 30,
            helocRate: parseFloat(helocRate) || 0,
            income: parseFloat(income) || 0,
            expenses: parseFloat(expenses) || 0,
          },
          mortgage: {
            payment: result.mortgage.payment,
            totalInterest: result.mortgage.totalInterest,
            months: result.mortgage.months,
          },
          heloc: {
            netSurplus: result.heloc.netSurplus,
            totalInterest: result.heloc.totalInterest,
            months: result.heloc.months,
          },
          interestSaved: result.interestSaved,
          yearsSaved: result.yearsSaved,
          qualification: {
            mortgage: (() => { const q = qualifyFor(profile, result.mortgage.payment, 'mortgage'); return { verdict: q.verdict, dti: q.dti, reasons: q.reasons }; })(),
            heloc:    (() => { const q = qualifyFor(profile, 0, 'heloc');                        return { verdict: q.verdict, dti: q.dti, reasons: q.reasons }; })(),
          },
          profile: {
            creditScore: profile.creditScore,
            totalIncome: pn.totalIncome,
            debts: pn.debts,
            equity: pn.equity,
            ltv: pn.ltv,
          },
        }}
      />
    </div>
  );
}

// ─── Lender Directory (filterable by state, links to lender site) ───
function LenderDirectory() {
  const [stateCode, setStateCode] = useLenderState();
  const [query, setQuery] = useLenderQuery();
  const lenders = useLenderList(stateCode, query);
  const stateName = stateCode === 'all' ? 'all states' : US_STATES.find(s => s.code === stateCode)?.name || stateCode;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-prism-amber" /> 1st Lien HELOC Lender Directory
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Filter by your state to see lenders that operate there. Coverage is a best-effort snapshot — always call to confirm current availability and true 1st-position eligibility.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">State</Label>
            <Select value={stateCode} onValueChange={(v) => setStateCode(v as any)}>
              <SelectTrigger><SelectValue placeholder="Choose state" /></SelectTrigger>
              <SelectContent className="max-h-72">
                <SelectItem value="all">All states</SelectItem>
                {US_STATES.map(s => (
                  <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">City or lender name (optional)</Label>
            <Input
              placeholder="e.g. Tampa, Quorum, credit union"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          {lenders.length} lender{lenders.length === 1 ? '' : 's'} available in <span className="text-foreground font-medium">{stateName}</span>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          {lenders.map((l) => (
            <a
              key={l.name}
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border/40 bg-muted/20 p-4 hover:border-prism-amber/50 hover:bg-prism-amber/5 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <div className="font-semibold text-foreground group-hover:text-prism-amber transition-colors text-sm">{l.name}</div>
                  {l.productName && <div className="text-[11px] text-muted-foreground">{l.productName}</div>}
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border/40 rounded px-1.5 py-0.5 shrink-0">
                  {l.type}
                </span>
              </div>
              {l.hq && <div className="text-[11px] text-muted-foreground mb-1">HQ: {l.hq}</div>}
              <p className="text-xs text-muted-foreground/90">{l.notes}</p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">
                  {l.states === 'nationwide' ? 'Nationwide' : `${l.states.length} states`}
                </span>
                <span className="text-prism-amber group-hover:underline">Visit site →</span>
              </div>
            </a>
          ))}
          {lenders.length === 0 && (
            <div className="col-span-full text-center text-sm text-muted-foreground py-8 rounded-xl border border-dashed border-border/40">
              No lenders matched. Try clearing the search or selecting a different state.
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground/60 italic">
          Directory is not a paid placement or endorsement. State coverage and 1st-lien eligibility change frequently — verify with the lender before applying.
        </p>
      </CardContent>
    </Card>
  );
}

// Tiny local hooks kept inline to avoid an extra file
function useLenderState() {
  const [stateCode, setStateCode] = useState<string | 'all'>('all');
  return [stateCode, setStateCode] as const;
}
function useLenderQuery() {
  const [query, setQuery] = useState('');
  return [query, setQuery] as const;
}
function useLenderList(stateCode: string | 'all', query: string) {
  return useMemo(() => {
    const base = lendersForState(stateCode);
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(l =>
      l.name.toLowerCase().includes(q) ||
      l.type.toLowerCase().includes(q) ||
      (l.hq?.toLowerCase().includes(q) ?? false) ||
      (l.productName?.toLowerCase().includes(q) ?? false),
    );
  }, [stateCode, query]);
}

// ── Amortization schedule table (annual + monthly toggle) ─────────────────
function AmortizationSchedule({
  schedule,
  view,
  onViewChange,
  formatCurrency,
}: {
  schedule: { month: number; phase: 'draw' | 'repay'; payment: number; interest: number; principal: number; balance: number }[];
  view: 'annual' | 'monthly';
  onViewChange: (v: 'annual' | 'monthly') => void;
  formatCurrency: (n: number) => string;
}) {
  const rows = useMemo(() => {
    if (view === 'monthly') return schedule;
    // Group by year (12-month chunks), summing interest + principal, ending balance = last month's balance
    const yearly: { year: number; phase: string; interest: number; principal: number; balance: number }[] = [];
    for (let i = 0; i < schedule.length; i += 12) {
      const chunk = schedule.slice(i, i + 12);
      const interest = chunk.reduce((s, r) => s + r.interest, 0);
      const principal = chunk.reduce((s, r) => s + r.principal, 0);
      const balance = chunk[chunk.length - 1].balance;
      const phases = new Set(chunk.map(c => c.phase));
      yearly.push({
        year: Math.floor(i / 12) + 1,
        phase: phases.size > 1 ? 'draw → repay' : (chunk[0].phase === 'draw' ? 'draw' : 'repay'),
        interest,
        principal,
        balance,
      });
    }
    return yearly;
  }, [schedule, view]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Amortization schedule</h4>
        <div className="inline-flex rounded-lg border border-border/60 bg-background p-0.5">
          <button
            type="button"
            onClick={() => onViewChange('annual')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              view === 'annual' ? 'bg-prism-amber text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Annual
          </button>
          <button
            type="button"
            onClick={() => onViewChange('monthly')}
            className={cn(
              'px-3 py-1 text-xs font-medium rounded-md transition-colors',
              view === 'monthly' ? 'bg-prism-amber text-background' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Monthly
          </button>
        </div>
      </div>

      <div className="overflow-auto max-h-96 rounded-lg border border-border/40">
        <table className="w-full text-xs">
          <thead className="bg-muted/40 sticky top-0">
            <tr className="text-left">
              <th className="p-2 font-semibold">{view === 'annual' ? 'Year' : 'Month'}</th>
              <th className="p-2 font-semibold">Phase</th>
              <th className="p-2 font-semibold text-right">Interest</th>
              <th className="p-2 font-semibold text-right">Principal</th>
              <th className="p-2 font-semibold text-right">Ending balance</th>
            </tr>
          </thead>
          <tbody className="[&_tr:nth-child(even)]:bg-muted/20">
            {rows.map((r: any, idx: number) => (
              <tr key={idx} className="border-t border-border/30">
                <td className="p-2 font-mono">{view === 'annual' ? r.year : r.month}</td>
                <td className="p-2 capitalize text-muted-foreground">{r.phase}</td>
                <td className="p-2 font-mono text-right text-prism-rose/90">{formatCurrency(r.interest)}</td>
                <td className="p-2 font-mono text-right text-prism-lime/90">{formatCurrency(r.principal)}</td>
                <td className="p-2 font-mono text-right">{formatCurrency(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[10px] text-muted-foreground/70 italic">
        Interest-only during the draw period (principal = 0), then fully amortizing during repayment.
      </p>
    </div>
  );
}


