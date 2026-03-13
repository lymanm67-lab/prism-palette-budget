import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Home, Car, CreditCard, TrendingUp, Calculator, DollarSign, Percent, CalendarDays, PiggyBank, Sparkles, BookOpen, MoreHorizontal,
  Target,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import PageOverview from '@/components/PageOverview';
import CalculatorInsight from '@/components/CalculatorInsight';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorChart from '@/components/CalculatorChart';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorHistory from '@/components/CalculatorHistory';
import FocusOfferCalculator from '@/components/FocusOfferCalculator';
import CalculatorGuide from '@/components/CalculatorGuide';

// ─── Calculation helpers ───

function calcLoanPayment(principal: number, annualRate: number, months: number): number {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function calcAmortization(principal: number, annualRate: number, months: number) {
  const payment = calcLoanPayment(principal, annualRate, months);
  const r = annualRate / 100 / 12;
  let balance = principal;
  let totalInterest = 0;
  const schedule: { month: number; payment: number; principal: number; interest: number; balance: number }[] = [];

  for (let m = 1; m <= months; m++) {
    const interestPortion = balance * r;
    const principalPortion = payment - interestPortion;
    balance = Math.max(0, balance - principalPortion);
    totalInterest += interestPortion;
    schedule.push({ month: m, payment, principal: principalPortion, interest: interestPortion, balance });
  }
  return { payment, totalInterest, totalPaid: payment * months, schedule };
}

function calcCompoundInterest(principal: number, monthlyContribution: number, annualRate: number, years: number) {
  const r = annualRate / 100 / 12;
  const months = years * 12;
  let balance = principal;
  const schedule: { month: number; balance: number; contributions: number; interest: number }[] = [];
  let totalContributions = principal;
  let totalInterest = 0;

  for (let m = 1; m <= months; m++) {
    const interest = balance * r;
    balance += interest + monthlyContribution;
    totalContributions += monthlyContribution;
    totalInterest += interest;
    if (m % 12 === 0 || m === months) {
      schedule.push({ month: m, balance, contributions: totalContributions, interest: totalInterest });
    }
  }
  return { finalBalance: balance, totalContributions, totalInterest, schedule };
}

function calcCreditCardPayoff(balance: number, apr: number, monthlyPayment: number) {
  if (monthlyPayment <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 };
  const r = apr / 100 / 12;
  let bal = balance;
  let months = 0;
  let totalInterest = 0;
  const MAX = 600;

  while (bal > 0.01 && months < MAX) {
    months++;
    const interest = bal * r;
    totalInterest += interest;
    bal = bal + interest - monthlyPayment;
    if (bal < 0) bal = 0;
  }
  return { months, totalInterest, totalPaid: balance + totalInterest };
}

// ─── Calculator configs ───

// Wealth multiplier data (based on compound growth assumptions)
const WEALTH_MULTIPLIER_DATA = [
  { age: 20, multiplier: 88.35 }, { age: 25, multiplier: 44.04 },
  { age: 30, multiplier: 23.06 }, { age: 35, multiplier: 12.25 },
  { age: 40, multiplier: 7.34 }, { age: 45, multiplier: 4.46 },
  { age: 50, multiplier: 2.85 }, { age: 55, multiplier: 1.91 },
  { age: 60, multiplier: 1.35 },
];

function calcWealthMultiplier(currentAge: number): number {
  // Assumed lifetime rate of return starts at 10% for age 20, decreasing 0.1% per year, terminal 5.5% at 65
  const retirementAge = 65;
  const years = retirementAge - currentAge;
  if (years <= 0) return 1;
  let multiplier = 1;
  for (let y = 0; y < years; y++) {
    const age = currentAge + y;
    const rate = Math.max(0.055, 0.10 - (age - 20) * 0.001);
    multiplier *= (1 + rate);
  }
  return multiplier;
}

function calcMonthlyToMillion(currentAge: number, target: number = 1000000): number {
  const retirementAge = 65;
  const years = retirementAge - currentAge;
  if (years <= 0) return target;
  const months = years * 12;
  // Use average rate for simplification
  const avgRate = Math.max(0.055, 0.10 - ((currentAge + 65) / 2 - 20) * 0.001);
  const r = avgRate / 12;
  // FV of annuity: target = pmt * ((1+r)^n - 1) / r
  const fvFactor = (Math.pow(1 + r, months) - 1) / r;
  return target / fvFactor;
}

const CALCULATORS = [
  { id: 'mortgage', label: 'Mortgage', icon: Home, color: 'text-prism-teal', bg: 'from-prism-teal/20 to-prism-teal/5' },
  { id: 'auto', label: 'Auto Loan', icon: Car, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5' },
  { id: 'credit', label: 'Credit Card', icon: CreditCard, color: 'text-prism-rose', bg: 'from-prism-rose/20 to-prism-rose/5' },
  { id: 'investment', label: 'Investment', icon: TrendingUp, color: 'text-prism-lime', bg: 'from-prism-lime/20 to-prism-lime/5' },
  { id: 'debt', label: 'General Debt', icon: DollarSign, color: 'text-prism-amber', bg: 'from-prism-amber/20 to-prism-amber/5' },
  { id: 'wealth', label: 'Wealth Multiplier', icon: PiggyBank, color: 'text-prism-indigo', bg: 'from-prism-indigo/20 to-prism-indigo/5' },
  { id: 'offers', label: 'Focus Offer', icon: Target, color: 'text-prism-lime', bg: 'from-prism-lime/20 to-prism-lime/5' },
];

// ─── Shared result card with gradient ───
const ResultCard = ({ label, value, sub, accent, numericValue, formatFn }: { label: string; value: string; sub?: string; accent?: boolean; numericValue?: number; formatFn?: (n: number) => string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3 }}
    className={cn(
      'p-3 rounded-xl border transition-all',
      accent
        ? 'bg-gradient-to-br from-primary/15 to-primary/5 border-primary/20 shadow-sm shadow-primary/5'
        : 'bg-gradient-to-br from-muted/60 to-muted/30 border-border/40'
    )}
  >
    <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
    <p className={cn('font-display text-lg font-bold mt-0.5', accent && 'text-primary')}>
      {numericValue !== undefined && formatFn ? (
        <AnimatedNumber value={numericValue} formatFn={formatFn} />
      ) : (
        value
      )}
    </p>
    {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
  </motion.div>
);

// ─── Component ───
const Calculators = () => {
  const { formatCurrency } = useCurrency();
  const [activeCalc, setActiveCalc] = useState('mortgage');
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const handleRestore = (type: string, inputs: Record<string, any>) => {
    setActiveCalc(type);
    if (type === 'mortgage') setMortgageForm(inputs as any);
    else if (type === 'auto') setAutoForm(inputs as any);
    else if (type === 'creditcard') setCcForm(inputs as any);
    else if (type === 'investment') setInvestForm(inputs as any);
    else if (type === 'debt') setDebtForm(inputs as any);
  };

  // Mortgage
  const [mortgageForm, setMortgageForm] = useState({ price: '350000', down: '70000', rate: '6.5', years: '30' });
  const mortgageResult = useMemo(() => {
    const principal = (parseFloat(mortgageForm.price) || 0) - (parseFloat(mortgageForm.down) || 0);
    const months = (parseFloat(mortgageForm.years) || 30) * 12;
    return calcAmortization(Math.max(0, principal), parseFloat(mortgageForm.rate) || 0, months);
  }, [mortgageForm]);

  // Auto
  const [autoForm, setAutoForm] = useState({ price: '35000', down: '5000', rate: '5.9', years: '5', tradeIn: '0' });
  const autoResult = useMemo(() => {
    const principal = (parseFloat(autoForm.price) || 0) - (parseFloat(autoForm.down) || 0) - (parseFloat(autoForm.tradeIn) || 0);
    const months = (parseFloat(autoForm.years) || 5) * 12;
    return calcAmortization(Math.max(0, principal), parseFloat(autoForm.rate) || 0, months);
  }, [autoForm]);

  // Credit card
  const [ccForm, setCcForm] = useState({ balance: '8000', apr: '22.99', payment: '250' });
  const ccResult = useMemo(() => {
    return calcCreditCardPayoff(
      parseFloat(ccForm.balance) || 0,
      parseFloat(ccForm.apr) || 0,
      parseFloat(ccForm.payment) || 0,
    );
  }, [ccForm]);

  // CC payoff schedule for chart
  const ccPayoffSchedule = useMemo(() => {
    const bal = parseFloat(ccForm.balance) || 0;
    const apr = parseFloat(ccForm.apr) || 0;
    const pmt = parseFloat(ccForm.payment) || 0;
    if (pmt <= 0 || bal <= 0) return [];
    const r = apr / 100 / 12;
    let b = bal;
    const pts: { label: string; balance: number; paid: number }[] = [];
    let totalPaid = 0;
    let m = 0;
    while (b > 0.01 && m < 600) {
      m++;
      const interest = b * r;
      b = Math.max(0, b + interest - pmt);
      totalPaid += pmt;
      if (m % Math.max(1, Math.ceil(ccResult.months / 20)) === 0 || b <= 0.01) {
        pts.push({ label: `Mo ${m}`, balance: b, paid: totalPaid });
      }
    }
    return pts;
  }, [ccForm, ccResult.months]);

  // Investment
  const [investForm, setInvestForm] = useState({ initial: '10000', monthly: '500', rate: '8', years: '20' });
  const investResult = useMemo(() => {
    return calcCompoundInterest(
      parseFloat(investForm.initial) || 0,
      parseFloat(investForm.monthly) || 0,
      parseFloat(investForm.rate) || 0,
      parseFloat(investForm.years) || 0,
    );
  }, [investForm]);

  // General debt
  const [debtForm, setDebtForm] = useState({ balance: '25000', rate: '7', payment: '500' });
  const debtResult = useMemo(() => {
    const r = (parseFloat(debtForm.rate) || 0) / 100 / 12;
    const balance = parseFloat(debtForm.balance) || 0;
    const payment = parseFloat(debtForm.payment) || 0;
    if (payment <= 0 || balance <= 0) return { months: 0, totalInterest: 0, totalPaid: 0 };
    let bal = balance, months = 0, totalInterest = 0;
    while (bal > 0.01 && months < 600) {
      months++;
      const interest = bal * r;
      totalInterest += interest;
      bal = bal + interest - payment;
      if (bal < 0) bal = 0;
    }
    return { months, totalInterest, totalPaid: balance + totalInterest };
  }, [debtForm]);

  // Debt payoff schedule for chart
  const debtPayoffSchedule = useMemo(() => {
    const bal0 = parseFloat(debtForm.balance) || 0;
    const r = (parseFloat(debtForm.rate) || 0) / 100 / 12;
    const pmt = parseFloat(debtForm.payment) || 0;
    if (pmt <= 0 || bal0 <= 0) return [];
    let b = bal0;
    const pts: { label: string; balance: number; paid: number }[] = [];
    let totalPaid = 0;
    let m = 0;
    while (b > 0.01 && m < 600) {
      m++;
      const interest = b * r;
      b = Math.max(0, b + interest - pmt);
      totalPaid += pmt;
      if (m % Math.max(1, Math.ceil(debtResult.months / 20)) === 0 || b <= 0.01) {
        pts.push({ label: `Mo ${m}`, balance: b, paid: totalPaid });
      }
    }
    return pts;
  }, [debtForm, debtResult.months]);

  // Wealth multiplier
  const [wealthAge, setWealthAge] = useState('30');
  const handleWealthAgeChange = (v: string) => {
    const num = parseInt(v);
    if (v === '') { setWealthAge(''); return; }
    if (!isNaN(num)) setWealthAge(String(Math.min(64, Math.max(18, num))));
  };
  const wealthResult = useMemo(() => {
    const age = Math.min(64, Math.max(18, parseInt(wealthAge) || 30));
    const multiplier = calcWealthMultiplier(age);
    const monthlyTo1M = calcMonthlyToMillion(age, 1000000);
    const monthlyTo2M = calcMonthlyToMillion(age, 2000000);
    return { multiplier, monthlyTo1M, monthlyTo2M, age };
  }, [wealthAge]);



  const InputField = ({ label, value, onChange, icon: Icon, suffix }: { label: string; value: string; onChange: (v: string) => void; icon?: any; suffix?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {Icon && <Icon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />}
        <Input
          type="number"
          step="any"
          value={value}
          onChange={e => onChange(e.target.value)}
          className={`h-9 text-sm ${Icon ? 'pl-8' : ''} ${suffix ? 'pr-10' : ''}`}
        />
        {suffix && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">Financial Calculators</h1>
          <p className="text-sm text-muted-foreground truncate">Mortgage, auto, credit card, investment, debt & revenue planning.</p>
        </div>
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent><p>More options</p></TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem className="gap-2" onSelect={() => setPageGuideOpen(true)}>
              <BookOpen className="h-4 w-4" /> Page Guide
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {pageGuideOpen && (
        <PageOverview
          title="Financial Calculators"
          description="Seven powerful calculators for mortgage, auto loans, credit cards, investments, general debt, wealth projection, and revenue goal planning."
          icon={Calculator}
          iconColor="text-prism-indigo"
          ttsScript="The Calculators page offers seven financial calculators to help you plan. The Mortgage calculator shows monthly payments, total interest, and amortization schedules. The Auto Loan calculator factors in down payment and trade-in value. The Credit Card calculator shows how long it takes to pay off a balance. The Investment calculator projects compound growth over time. The General Debt calculator handles any loan type. The Wealth Multiplier shows how much each dollar invested today will grow by retirement. The Focus Offer Calculator helps you plan how many sales you need to hit your revenue goals."
          features={[
            'Mortgage payment and amortization calculator',
            'Auto loan with trade-in value',
            'Credit card payoff timeline',
            'Investment compound growth projections',
            'General debt calculator',
            'Wealth multiplier by age',
            'Focus Offer revenue planning',
          ]}
          demoData={[
            { label: 'Mortgage Payment', value: '$1,896/mo', badge: '$350k @ 6.5%' },
            { label: 'Auto Payment', value: '$575/mo', badge: '$30k @ 5.9%' },
            { label: 'CC Payoff', value: '42 months', badge: '$8k @ 22.99%' },
            { label: 'Wealth Multiplier', value: '23x', badge: 'Age 30' },
            { label: 'Focus Offer', value: '10 sales', badge: '$10k @ $1,000' },
          ]}
        />
      )}

      {/* Calculator tabs — icon-only with tooltips on mobile, full labels on desktop */}
      <Tabs value={activeCalc} onValueChange={setActiveCalc}>
        <TabsList className="flex h-auto w-full gap-1 bg-muted/50 p-1">
          {CALCULATORS.map(c => (
            <Tooltip key={c.id}>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={c.id}
                  className="flex-1 gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg px-2 py-2 sm:px-3"
                >
                  <c.icon className={`h-4 w-4 shrink-0 ${c.color}`} />
                  <span className="hidden sm:inline text-xs truncate">{c.label}</span>
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="sm:hidden">
                <p>{c.label}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </TabsList>

        {/* ─── MORTGAGE ─── */}
        <TabsContent value="mortgage" className="mt-6">
          <CalculatorGuide
            title="Mortgage Calculator"
            icon={Home}
            iconColor="text-prism-teal"
            ttsScript="The Mortgage Calculator helps you estimate your monthly home loan payment. Enter the home price, your down payment, the interest rate, and the loan term in years. You'll see your monthly payment, total interest paid over the life of the loan, and an amortization chart showing how your balance decreases over time. The payment breakdown bar shows the split between principal and interest."
            instructions={[
              'Enter the full home purchase price',
              'Add your down payment amount — the loan is calculated on the difference',
              'Set the annual interest rate and loan term in years',
              'Results update instantly: monthly payment, total interest, and total cost',
              'The amortization chart shows your remaining balance over time',
              'Use Save to keep results, Copy to clipboard, or Export as a text file',
            ]}
          />
          <div className="grid gap-6 lg:grid-cols-2 mt-4">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <Home className="h-5 w-5 text-prism-teal" /> Mortgage Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField label="Home Price" value={mortgageForm.price} onChange={v => setMortgageForm(f => ({ ...f, price: v }))} icon={DollarSign} />
                <InputField label="Down Payment" value={mortgageForm.down} onChange={v => setMortgageForm(f => ({ ...f, down: v }))} icon={DollarSign} />
                <InputField label="Interest Rate" value={mortgageForm.rate} onChange={v => setMortgageForm(f => ({ ...f, rate: v }))} icon={Percent} suffix="%" />
                <InputField label="Loan Term" value={mortgageForm.years} onChange={v => setMortgageForm(f => ({ ...f, years: v }))} icon={CalendarDays} suffix="years" />
                <div className="text-xs text-muted-foreground">
                  Loan Amount: {formatCurrency(Math.max(0, (parseFloat(mortgageForm.price) || 0) - (parseFloat(mortgageForm.down) || 0)))}
                </div>
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50">
              <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Monthly Payment" value={formatCurrency(mortgageResult.payment)} numericValue={mortgageResult.payment} formatFn={formatCurrency} accent />
                  <ResultCard label="Total Interest" value={formatCurrency(mortgageResult.totalInterest)} numericValue={mortgageResult.totalInterest} formatFn={formatCurrency} />
                  <ResultCard label="Total Paid" value={formatCurrency(mortgageResult.totalPaid)} numericValue={mortgageResult.totalPaid} formatFn={formatCurrency} />
                  <ResultCard label="Interest / Principal" value={`${mortgageResult.totalPaid > 0 ? Math.round((mortgageResult.totalInterest / mortgageResult.totalPaid) * 100) : 0}%`} sub="of total cost" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Remaining Balance Over Time</p>
                  <CalculatorChart type="amortization" data={mortgageResult.schedule} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Payment Breakdown</p>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    <div className="bg-prism-teal transition-all" style={{ width: `${mortgageResult.totalPaid > 0 ? ((mortgageResult.totalPaid - mortgageResult.totalInterest) / mortgageResult.totalPaid) * 100 : 0}%` }} />
                    <div className="bg-prism-rose transition-all" style={{ width: `${mortgageResult.totalPaid > 0 ? (mortgageResult.totalInterest / mortgageResult.totalPaid) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-teal inline-block" /> Principal</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-rose inline-block" /> Interest</span>
                  </div>
                </div>
                <CalculatorActions
                  calculatorType="mortgage"
                  inputs={mortgageForm}
                  results={{ payment: mortgageResult.payment, totalInterest: mortgageResult.totalInterest, totalPaid: mortgageResult.totalPaid }}
                  hasResults={mortgageResult.payment > 0}
                  summaryText={`Mortgage Calculator\nPrice: ${mortgageForm.price} | Down: ${mortgageForm.down} | Rate: ${mortgageForm.rate}% | Term: ${mortgageForm.years}yr\nMonthly Payment: ${formatCurrency(mortgageResult.payment)}\nTotal Interest: ${formatCurrency(mortgageResult.totalInterest)}\nTotal Paid: ${formatCurrency(mortgageResult.totalPaid)}`}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
          <CalculatorInsight
            calculatorType="mortgage"
            inputs={mortgageForm}
            results={{ payment: mortgageResult.payment, totalInterest: mortgageResult.totalInterest, totalPaid: mortgageResult.totalPaid }}
            hasResults={mortgageResult.payment > 0}
          />
        </TabsContent>
        <TabsContent value="auto" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <Car className="h-5 w-5 text-prism-sky" /> Auto Loan Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField label="Vehicle Price" value={autoForm.price} onChange={v => setAutoForm(f => ({ ...f, price: v }))} icon={DollarSign} />
                <InputField label="Down Payment" value={autoForm.down} onChange={v => setAutoForm(f => ({ ...f, down: v }))} icon={DollarSign} />
                <InputField label="Trade-in Value" value={autoForm.tradeIn} onChange={v => setAutoForm(f => ({ ...f, tradeIn: v }))} icon={DollarSign} />
                <InputField label="Interest Rate" value={autoForm.rate} onChange={v => setAutoForm(f => ({ ...f, rate: v }))} icon={Percent} suffix="%" />
                <InputField label="Loan Term" value={autoForm.years} onChange={v => setAutoForm(f => ({ ...f, years: v }))} icon={CalendarDays} suffix="years" />
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50">
              <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Monthly Payment" value={formatCurrency(autoResult.payment)} numericValue={autoResult.payment} formatFn={formatCurrency} accent />
                  <ResultCard label="Total Interest" value={formatCurrency(autoResult.totalInterest)} numericValue={autoResult.totalInterest} formatFn={formatCurrency} />
                  <ResultCard label="Total Paid" value={formatCurrency(autoResult.totalPaid)} numericValue={autoResult.totalPaid} formatFn={formatCurrency} />
                  <ResultCard label="Loan Amount" value={formatCurrency(Math.max(0, (parseFloat(autoForm.price)||0) - (parseFloat(autoForm.down)||0) - (parseFloat(autoForm.tradeIn)||0)))} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Remaining Balance Over Time</p>
                  <CalculatorChart type="amortization" data={autoResult.schedule} />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Cost Breakdown</p>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    <div className="bg-prism-sky transition-all" style={{ width: `${autoResult.totalPaid > 0 ? ((autoResult.totalPaid - autoResult.totalInterest) / autoResult.totalPaid) * 100 : 0}%` }} />
                    <div className="bg-prism-rose transition-all" style={{ width: `${autoResult.totalPaid > 0 ? (autoResult.totalInterest / autoResult.totalPaid) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-sky inline-block" /> Principal</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-rose inline-block" /> Interest</span>
                  </div>
                </div>
                <CalculatorActions
                  calculatorType="auto"
                  inputs={autoForm}
                  results={{ payment: autoResult.payment, totalInterest: autoResult.totalInterest, totalPaid: autoResult.totalPaid }}
                  hasResults={autoResult.payment > 0}
                  summaryText={`Auto Loan Calculator\nPrice: ${autoForm.price} | Down: ${autoForm.down} | Rate: ${autoForm.rate}% | Term: ${autoForm.years}yr\nMonthly Payment: ${formatCurrency(autoResult.payment)}\nTotal Interest: ${formatCurrency(autoResult.totalInterest)}\nTotal Paid: ${formatCurrency(autoResult.totalPaid)}`}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
          <CalculatorInsight
            calculatorType="auto"
            inputs={autoForm}
            results={{ payment: autoResult.payment, totalInterest: autoResult.totalInterest, totalPaid: autoResult.totalPaid }}
            hasResults={autoResult.payment > 0}
          />
        </TabsContent>
        <TabsContent value="credit" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <CreditCard className="h-5 w-5 text-prism-rose" /> Credit Card Payoff
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField label="Current Balance" value={ccForm.balance} onChange={v => setCcForm(f => ({ ...f, balance: v }))} icon={DollarSign} />
                <InputField label="APR" value={ccForm.apr} onChange={v => setCcForm(f => ({ ...f, apr: v }))} icon={Percent} suffix="%" />
                <InputField label="Monthly Payment" value={ccForm.payment} onChange={v => setCcForm(f => ({ ...f, payment: v }))} icon={DollarSign} />
                {parseFloat(ccForm.payment) > 0 && parseFloat(ccForm.payment) <= (parseFloat(ccForm.balance) || 0) * (parseFloat(ccForm.apr) || 0) / 100 / 12 && (
                  <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-xs font-medium">
                    ⚠️ Payment is less than monthly interest. Balance will never be paid off!
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50">
              <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Months to Payoff" value={ccResult.months > 0 ? `${ccResult.months} months` : '—'} accent sub={ccResult.months > 0 ? `${Math.floor(ccResult.months / 12)}y ${ccResult.months % 12}m` : undefined} />
                  <ResultCard label="Total Interest" value={formatCurrency(ccResult.totalInterest)} numericValue={ccResult.totalInterest} formatFn={formatCurrency} />
                  <ResultCard label="Total Paid" value={formatCurrency(ccResult.totalPaid)} numericValue={ccResult.totalPaid} formatFn={formatCurrency} />
                  <ResultCard label="Interest Ratio" value={`${ccResult.totalPaid > 0 ? Math.round((ccResult.totalInterest / ccResult.totalPaid) * 100) : 0}%`} sub="of total paid" />
                </div>
                {ccPayoffSchedule.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Payoff Timeline</p>
                    <CalculatorChart type="payoff" data={ccPayoffSchedule} />
                  </div>
                )}
                {ccResult.months > 0 && (
                  <div className="p-3 rounded-xl bg-muted/50 text-xs space-y-1">
                    <p className="font-medium">💡 Tip: Increasing your payment by {formatCurrency(50)}/mo could save you:</p>
                    {(() => {
                      const faster = calcCreditCardPayoff(parseFloat(ccForm.balance)||0, parseFloat(ccForm.apr)||0, (parseFloat(ccForm.payment)||0)+50);
                      const saved = ccResult.totalInterest - faster.totalInterest;
                      return <p className="text-prism-teal font-bold">{formatCurrency(saved)} in interest and {ccResult.months - faster.months} fewer months</p>;
                    })()}
                  </div>
                )}
                <CalculatorActions
                  calculatorType="creditcard"
                  inputs={ccForm}
                  results={{ months: ccResult.months, totalInterest: ccResult.totalInterest, totalPaid: ccResult.totalPaid }}
                  hasResults={ccResult.months > 0}
                  summaryText={`Credit Card Payoff\nBalance: $${ccForm.balance} | APR: ${ccForm.apr}% | Payment: $${ccForm.payment}/mo\nPayoff: ${ccResult.months} months\nTotal Interest: ${formatCurrency(ccResult.totalInterest)}\nTotal Paid: ${formatCurrency(ccResult.totalPaid)}`}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
          <CalculatorInsight
            calculatorType="credit"
            inputs={ccForm}
            results={{ months: ccResult.months, totalInterest: ccResult.totalInterest, totalPaid: ccResult.totalPaid }}
            hasResults={ccResult.months > 0}
          />
        </TabsContent>
        <TabsContent value="investment" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-prism-lime" /> Investment Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField label="Initial Investment" value={investForm.initial} onChange={v => setInvestForm(f => ({ ...f, initial: v }))} icon={DollarSign} />
                <InputField label="Monthly Contribution" value={investForm.monthly} onChange={v => setInvestForm(f => ({ ...f, monthly: v }))} icon={DollarSign} />
                <InputField label="Annual Return" value={investForm.rate} onChange={v => setInvestForm(f => ({ ...f, rate: v }))} icon={Percent} suffix="%" />
                <InputField label="Time Horizon" value={investForm.years} onChange={v => setInvestForm(f => ({ ...f, years: v }))} icon={CalendarDays} suffix="years" />
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50">
              <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Final Balance" value={formatCurrency(investResult.finalBalance)} numericValue={investResult.finalBalance} formatFn={formatCurrency} accent />
                  <ResultCard label="Total Contributions" value={formatCurrency(investResult.totalContributions)} numericValue={investResult.totalContributions} formatFn={formatCurrency} />
                  <ResultCard label="Total Earnings" value={formatCurrency(investResult.totalInterest)} numericValue={investResult.totalInterest} formatFn={formatCurrency} />
                  <ResultCard label="Growth" value={`${investResult.totalContributions > 0 ? Math.round(((investResult.finalBalance - investResult.totalContributions) / investResult.totalContributions) * 100) : 0}%`} sub="return on investment" />
                </div>
                {investResult.schedule.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Growth Over Time</p>
                    <CalculatorChart type="growth" data={investResult.schedule} />
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Composition</p>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    <div className="bg-prism-lime transition-all" style={{ width: `${investResult.finalBalance > 0 ? (investResult.totalContributions / investResult.finalBalance) * 100 : 0}%` }} />
                    <div className="bg-prism-teal transition-all" style={{ width: `${investResult.finalBalance > 0 ? (investResult.totalInterest / investResult.finalBalance) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-lime inline-block" /> Contributions</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-teal inline-block" /> Earnings</span>
                  </div>
                </div>
                <CalculatorActions
                  calculatorType="investment"
                  inputs={investForm}
                  results={{ finalBalance: investResult.finalBalance, totalContributions: investResult.totalContributions, totalInterest: investResult.totalInterest }}
                  hasResults={investResult.finalBalance > 0}
                  summaryText={`Investment Calculator\nInitial: $${investForm.initial} | Monthly: $${investForm.monthly} | Rate: ${investForm.rate}% | Years: ${investForm.years}\nFinal Balance: ${formatCurrency(investResult.finalBalance)}\nTotal Contributions: ${formatCurrency(investResult.totalContributions)}\nTotal Earnings: ${formatCurrency(investResult.totalInterest)}`}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
          <CalculatorInsight
            calculatorType="investment"
            inputs={investForm}
            results={{ finalBalance: investResult.finalBalance, totalContributions: investResult.totalContributions, totalInterest: investResult.totalInterest }}
            hasResults={investResult.finalBalance > 0}
          />
        </TabsContent>
        <TabsContent value="debt" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <DollarSign className="h-5 w-5 text-prism-amber" /> General Debt Calculator
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputField label="Total Debt" value={debtForm.balance} onChange={v => setDebtForm(f => ({ ...f, balance: v }))} icon={DollarSign} />
                <InputField label="Interest Rate" value={debtForm.rate} onChange={v => setDebtForm(f => ({ ...f, rate: v }))} icon={Percent} suffix="%" />
                <InputField label="Monthly Payment" value={debtForm.payment} onChange={v => setDebtForm(f => ({ ...f, payment: v }))} icon={DollarSign} />
              </CardContent>
            </Card>
            <Card className="prism-card-shine border-border/50">
              <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Payoff Time" value={debtResult.months > 0 ? `${Math.floor(debtResult.months / 12)}y ${debtResult.months % 12}m` : '—'} accent />
                  <ResultCard label="Total Interest" value={formatCurrency(debtResult.totalInterest)} numericValue={debtResult.totalInterest} formatFn={formatCurrency} />
                  <ResultCard label="Total Paid" value={formatCurrency(debtResult.totalPaid)} numericValue={debtResult.totalPaid} formatFn={formatCurrency} />
                  <ResultCard label="Interest Cost" value={`${debtResult.totalPaid > 0 ? Math.round((debtResult.totalInterest / debtResult.totalPaid) * 100) : 0}%`} sub="of total" />
                </div>
                {debtPayoffSchedule.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Payoff Timeline</p>
                    <CalculatorChart type="payoff" data={debtPayoffSchedule} />
                  </div>
                )}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Payment Breakdown</p>
                  <div className="flex gap-1 h-4 rounded-full overflow-hidden">
                    <div className="bg-prism-amber transition-all" style={{ width: `${debtResult.totalPaid > 0 ? ((parseFloat(debtForm.balance)||0) / debtResult.totalPaid) * 100 : 0}%` }} />
                    <div className="bg-prism-rose transition-all" style={{ width: `${debtResult.totalPaid > 0 ? (debtResult.totalInterest / debtResult.totalPaid) * 100 : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-amber inline-block" /> Principal</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-rose inline-block" /> Interest</span>
                  </div>
                </div>
                <CalculatorActions
                  calculatorType="debt"
                  inputs={debtForm}
                  results={{ months: debtResult.months, totalInterest: debtResult.totalInterest, totalPaid: debtResult.totalPaid }}
                  hasResults={debtResult.months > 0}
                  summaryText={`Debt Payoff Calculator\nBalance: $${debtForm.balance} | Rate: ${debtForm.rate}% | Payment: $${debtForm.payment}/mo\nPayoff: ${Math.floor(debtResult.months/12)}y ${debtResult.months%12}m\nTotal Interest: ${formatCurrency(debtResult.totalInterest)}\nTotal Paid: ${formatCurrency(debtResult.totalPaid)}`}
                  onOpenHistory={() => setHistoryOpen(true)}
                />
              </CardContent>
            </Card>
          </div>
          <CalculatorInsight
            calculatorType="debt"
            inputs={debtForm}
            results={{ months: debtResult.months, totalInterest: debtResult.totalInterest, totalPaid: debtResult.totalPaid }}
            hasResults={debtResult.months > 0}
          />
        </TabsContent>

        {/* ─── FOCUS OFFER CALCULATOR ─── */}
        <TabsContent value="offers" className="mt-6">
          <FocusOfferCalculator onOpenHistory={() => setHistoryOpen(true)} />
        </TabsContent>
      </Tabs>
      <CalculatorHistory open={historyOpen} onOpenChange={setHistoryOpen} onRestore={handleRestore} />
    </motion.div>
    </TooltipProvider>
  );
};

export default Calculators;
