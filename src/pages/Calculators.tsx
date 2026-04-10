import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATE_DATA } from '@/lib/state-data';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Home, Car, CreditCard, TrendingUp, Calculator, DollarSign, Percent, CalendarDays, PiggyBank, Sparkles, BookOpen, MoreHorizontal,
  Target, Shield, Wallet, CheckCircle2, Scale, MapPin, Plane, Heart, Palmtree, ShoppingBag, Gift, Baby, Receipt, Tag, ArrowLeftRight,
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
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import RentVsBuyCalculator from '@/components/RentVsBuyCalculator';
import VacationCalculator from '@/components/calculators/VacationCalculator';
import WeddingCalculator from '@/components/calculators/WeddingCalculator';
import HoneymoonCalculator from '@/components/calculators/HoneymoonCalculator';
import BigPurchaseCalculator from '@/components/calculators/BigPurchaseCalculator';
import HolidayGiftCalculator from '@/components/calculators/HolidayGiftCalculator';
import BabyCostCalculator from '@/components/calculators/BabyCostCalculator';
import CarAffordabilityCalculator from '@/components/calculators/CarAffordabilityCalculator';
import TrueCostLoanCalculator from '@/components/calculators/TrueCostLoanCalculator';
import PricingCalculator from '@/components/calculators/PricingCalculator';
import CurrencyExchangeCalculator from '@/components/calculators/CurrencyExchangeCalculator';

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

function calcCompoundInterest(
  principal: number,
  contribution: number,
  annualRate: number,
  years: number,
  compoundFreq: 'monthly' | 'annually' = 'monthly',
  contribTiming: 'end' | 'beginning' = 'end',
  contribFreq: 'monthly' | 'annually' = 'monthly',
) {
  const periodsPerYear = compoundFreq === 'monthly' ? 12 : 1;
  const totalPeriods = years * periodsPerYear;
  const ratePerPeriod = annualRate / 100 / periodsPerYear;

  // Normalize contribution to per-compound-period amount
  let contribPerPeriod = contribution;
  if (contribFreq === 'monthly' && compoundFreq === 'annually') {
    contribPerPeriod = contribution * 12;
  } else if (contribFreq === 'annually' && compoundFreq === 'monthly') {
    contribPerPeriod = contribution / 12;
  }

  let balance = principal;
  let totalContributions = principal;
  let totalInterest = 0;

  // Detailed schedule per period
  const detailedSchedule: { period: number; deposit: number; interest: number; balance: number }[] = [];

  for (let p = 1; p <= totalPeriods; p++) {
    let periodDeposit = contribPerPeriod;
    let periodInterest = 0;

    if (contribTiming === 'beginning') {
      balance += periodDeposit;
      periodInterest = balance * ratePerPeriod;
      balance += periodInterest;
    } else {
      periodInterest = balance * ratePerPeriod;
      balance += periodInterest + periodDeposit;
    }

    totalContributions += periodDeposit;
    totalInterest += periodInterest;
    detailedSchedule.push({ period: p, deposit: periodDeposit, interest: periodInterest, balance });
  }

  // Summary schedule (yearly) for chart compatibility
  const schedule: { month: number; balance: number; contributions: number; interest: number }[] = [];
  if (compoundFreq === 'monthly') {
    for (let i = 0; i < detailedSchedule.length; i++) {
      const entry = detailedSchedule[i];
      if ((i + 1) % 12 === 0 || i === detailedSchedule.length - 1) {
        schedule.push({ month: entry.period, balance: entry.balance, contributions: totalContributions, interest: totalInterest });
      }
    }
  } else {
    detailedSchedule.forEach(entry => {
      schedule.push({ month: entry.period, balance: entry.balance, contributions: totalContributions, interest: totalInterest });
    });
  }

  return { finalBalance: balance, totalContributions, totalInterest, schedule, detailedSchedule, periodsPerYear };
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

const CALCULATOR_GROUPS = [
  {
    label: 'Essentials',
    items: [
      { id: 'safetospend', label: 'Safe-to-Spend', icon: Shield, color: 'text-prism-teal', bg: 'from-prism-teal/20 to-prism-teal/5' },
      { id: 'rentvsbuy', label: 'Rent vs Buy', icon: Scale, color: 'text-prism-violet', bg: 'from-prism-violet/20 to-prism-violet/5' },
    ],
  },
  {
    label: 'Loans & Debt',
    items: [
      { id: 'mortgage', label: 'Mortgage', icon: Home, color: 'text-prism-teal', bg: 'from-prism-teal/20 to-prism-teal/5' },
      { id: 'auto', label: 'Auto Loan', icon: Car, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5' },
      { id: 'credit', label: 'Credit Card Payoff', icon: CreditCard, color: 'text-prism-rose', bg: 'from-prism-rose/20 to-prism-rose/5' },
      { id: 'debt', label: 'General Debt', icon: DollarSign, color: 'text-prism-amber', bg: 'from-prism-amber/20 to-prism-amber/5' },
      { id: 'truecost', label: 'True Cost Loan', icon: Receipt, color: 'text-prism-rose', bg: 'from-prism-rose/20 to-prism-rose/5' },
      { id: 'carafford', label: 'Car Affordability', icon: Car, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5' },
    ],
  },
  {
    label: 'Life Events',
    items: [
      { id: 'vacation', label: 'Vacation Planner', icon: Plane, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5' },
      { id: 'wedding', label: 'Wedding Budget', icon: Heart, color: 'text-prism-rose', bg: 'from-prism-rose/20 to-prism-rose/5' },
      { id: 'honeymoon', label: 'Honeymoon Fund', icon: Palmtree, color: 'text-prism-lime', bg: 'from-prism-lime/20 to-prism-lime/5' },
      { id: 'bigpurchase', label: 'Big Purchase', icon: ShoppingBag, color: 'text-prism-amber', bg: 'from-prism-amber/20 to-prism-amber/5' },
      { id: 'holiday', label: 'Holiday & Gifts', icon: Gift, color: 'text-prism-rose', bg: 'from-prism-rose/20 to-prism-rose/5' },
      { id: 'baby', label: 'Baby Cost', icon: Baby, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5' },
    ],
  },
  {
    label: 'Savings & Growth',
    items: [
      { id: 'investment', label: 'Investment', icon: TrendingUp, color: 'text-prism-lime', bg: 'from-prism-lime/20 to-prism-lime/5' },
      { id: 'wealth', label: 'Wealth Multiplier', icon: PiggyBank, color: 'text-prism-indigo', bg: 'from-prism-indigo/20 to-prism-indigo/5' },
    ],
  },
  {
    label: 'Travel',
    items: [
      { id: 'currency', label: 'Currency Exchange', icon: ArrowLeftRight, color: 'text-prism-sky', bg: 'from-prism-sky/20 to-prism-sky/5' },
    ],
  },
  {
    label: 'Business',
    items: [
      { id: 'offers', label: 'Focus Offer', icon: Target, color: 'text-prism-lime', bg: 'from-prism-lime/20 to-prism-lime/5' },
      { id: 'pricing', label: 'Pricing', icon: Tag, color: 'text-prism-amber', bg: 'from-prism-amber/20 to-prism-amber/5' },
    ],
  },
];

const CALCULATORS = CALCULATOR_GROUPS.flatMap(g => g.items);

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
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeCalc, setActiveCalc] = useState('safetospend');
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  // Safe-to-Spend calculator
  const [stsForm, setStsForm] = useState({
    income: '', recurringBills: '', subscriptions: '', alreadySpent: '', bufferPercent: '15',
  });
  const stsResult = useMemo(() => {
    const income = parseFloat(stsForm.income) || 0;
    const bills = parseFloat(stsForm.recurringBills) || 0;
    const subs = parseFloat(stsForm.subscriptions) || 0;
    const spent = parseFloat(stsForm.alreadySpent) || 0;
    const buffer = parseFloat(stsForm.bufferPercent) || 15;

    const remaining = income - bills - subs - spent;
    const bufferAmount = remaining * (buffer / 100);
    const monthly = Math.max(0, remaining - bufferAmount);

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const daysRemaining = Math.max(1, daysInMonth - now.getDate() + 1);
    const daily = monthly / daysRemaining;
    const weekly = monthly / Math.max(1, daysRemaining / 7);

    return { income, bills, subs, spent, remaining, bufferAmount, monthly, daily, weekly, buffer, daysRemaining };
  }, [stsForm]);

  const stsSteps = useMemo(() => {
    const income = parseFloat(stsForm.income) || 0;
    const bills = parseFloat(stsForm.recurringBills) || 0;
    const subs = parseFloat(stsForm.subscriptions) || 0;
    const spent = parseFloat(stsForm.alreadySpent) || 0;
    return [
      { label: 'Monthly Income', done: income > 0 },
      { label: 'Recurring Bills', done: bills > 0 },
      { label: 'Subscriptions', done: subs > 0 },
      { label: 'Already Spent', done: spent > 0 },
    ];
  }, [stsForm]);

  const handleRestore = (type: string, inputs: Record<string, any>) => {
    setActiveCalc(type);
    if (type === 'safetospend') setStsForm(inputs as any);
    else if (type === 'mortgage') setMortgageForm(inputs as any);
    else if (type === 'auto') setAutoForm(inputs as any);
    else if (type === 'creditcard') setCcForm(inputs as any);
    else if (type === 'investment') setInvestForm(inputs as any);
    else if (type === 'debt') setDebtForm(inputs as any);
  };

  // Mortgage
  const [mortgageForm, setMortgageForm] = useState({ price: '350000', down: '70000', rate: '6.5', years: '30', state: '', propertyTaxRate: '1.35', insuranceRate: '0.55' });
  const mortgageResult = useMemo(() => {
    const principal = (parseFloat(mortgageForm.price) || 0) - (parseFloat(mortgageForm.down) || 0);
    const months = (parseFloat(mortgageForm.years) || 30) * 12;
    const amort = calcAmortization(Math.max(0, principal), parseFloat(mortgageForm.rate) || 0, months);
    const homePrice = parseFloat(mortgageForm.price) || 0;
    const monthlyPropTax = (homePrice * (parseFloat(mortgageForm.propertyTaxRate) || 0) / 100) / 12;
    const monthlyInsurance = (homePrice * (parseFloat(mortgageForm.insuranceRate) || 0) / 100) / 12;
    const totalMonthly = amort.payment + monthlyPropTax + monthlyInsurance;
    return { ...amort, monthlyPropTax, monthlyInsurance, totalMonthly };
  }, [mortgageForm]);

  const handleMortgageStateChange = (stateCode: string) => {
    const data = STATE_DATA[stateCode];
    if (!data || stateCode === '') return;
    setMortgageForm(f => ({
      ...f,
      state: stateCode,
      propertyTaxRate: data.propertyTax.toString(),
      insuranceRate: data.insurance.toString(),
    }));
  };

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
  const [investForm, setInvestForm] = useState({
    initial: '10000', monthly: '500', rate: '8', years: '20',
    compoundFreq: 'monthly' as 'monthly' | 'annually',
    contribTiming: 'end' as 'end' | 'beginning',
    contribFreq: 'monthly' as 'monthly' | 'annually',
  });
  const [scheduleView, setScheduleView] = useState<'annual' | 'monthly'>('annual');
  const investResult = useMemo(() => {
    return calcCompoundInterest(
      parseFloat(investForm.initial) || 0,
      parseFloat(investForm.monthly) || 0,
      parseFloat(investForm.rate) || 0,
      parseFloat(investForm.years) || 0,
      investForm.compoundFreq,
      investForm.contribTiming,
      investForm.contribFreq,
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

  // Restore state from URL query params (shared links)
  useEffect(() => {
    const calc = searchParams.get('calc');
    if (!calc) return;

    setActiveCalc(calc);

    // Helper to get param or keep default
    const p = (key: string) => searchParams.get(key);

    if (calc === 'mortgage') {
      setMortgageForm(f => ({
        ...f,
        price: p('price') ?? f.price,
        down: p('down') ?? f.down,
        rate: p('rate') ?? f.rate,
        years: p('years') ?? f.years,
      }));
    } else if (calc === 'auto') {
      setAutoForm(f => ({
        price: p('price') ?? f.price,
        down: p('down') ?? f.down,
        rate: p('rate') ?? f.rate,
        years: p('years') ?? f.years,
        tradeIn: p('tradeIn') ?? f.tradeIn,
      }));
    } else if (calc === 'credit') {
      setCcForm(f => ({
        balance: p('balance') ?? f.balance,
        apr: p('apr') ?? f.apr,
        payment: p('payment') ?? f.payment,
      }));
    } else if (calc === 'investment') {
      setInvestForm(f => ({
        ...f,
        initial: p('initial') ?? f.initial,
        monthly: p('monthly') ?? f.monthly,
        rate: p('rate') ?? f.rate,
        years: p('years') ?? f.years,
      }));
    } else if (calc === 'debt') {
      setDebtForm(f => ({
        balance: p('balance') ?? f.balance,
        rate: p('rate') ?? f.rate,
        payment: p('payment') ?? f.payment,
      }));
    } else if (calc === 'wealth') {
      const age = p('age');
      if (age) setWealthAge(age);
    }

    // Clean up query params after restoring (skip for 'offers' — child handles its own)
    if (calc !== 'offers') {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps


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

      {/* Calculator selector — flat grid, all calculators visible */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
        {CALCULATORS.map(c => {
          const isActive = activeCalc === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setActiveCalc(c.id)}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-center transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25 scale-[1.03]'
                  : 'bg-gradient-to-br from-muted/60 to-muted/30 border-border/40 hover:border-primary/40 hover:shadow-sm hover:scale-[1.01]'
              )}
            >
              <c.icon className={cn('h-5 w-5', isActive ? 'text-primary-foreground' : c.color)} />
              <span className="text-[11px] sm:text-xs font-medium leading-tight truncate w-full">{c.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Calculator content ─── */}
      {activeCalc === 'safetospend' && (
        <div className="mt-6">
          <CalculatorGuide
            title="Safe-to-Spend Calculator"
            icon={Shield}
            iconColor="text-prism-teal"
            ttsScript="The Safe-to-Spend Calculator helps you figure out exactly how much you can safely spend each day, week, and month. Enter your monthly income, recurring bills, subscriptions, and what you've already spent. Choose a safety buffer percentage. The calculator shows your safe spending limits instantly. Once you're happy with the numbers, they match what you'll see on your dashboard."
            instructions={[
              'Enter your total monthly income (salary, freelance, business revenue)',
              'Enter your total recurring monthly bills (rent, utilities, loans, insurance)',
              'Enter your monthly subscription costs (Netflix, gym, software, etc.)',
              'Enter how much you have already spent this month',
              'Set your safety buffer — 15% for Guardrail, 10% for Balanced, 5% for Green Light',
              'Review your Daily, Weekly, and Monthly Safe-to-Spend results',
            ]}
          />
          <CalculatorScenariosAndPitfalls
            scenarios={[
              { title: 'New to Budgeting', description: 'Start with a 15-20% buffer (Guardrail Mode). This protects you while you learn your spending patterns. You can reduce it later.' },
              { title: 'Entrepreneur', description: 'Use your average monthly revenue, not your best month. Variable income needs a higher buffer (15-20%) to handle slow months.' },
              { title: 'Dual Income Household', description: 'Combine both incomes and all shared bills. Switch to the Combined view on the dashboard to see the full picture.' },
              { title: 'Paying Off Debt', description: 'Include minimum debt payments in recurring bills. Any extra debt payments reduce your Safe-to-Spend but accelerate freedom.' },
            ]}
            pitfalls={[
              { title: 'Forgetting Subscriptions', description: 'The average person has 12+ subscriptions. Check your bank statements or use the Subscriptions page to catch them all.' },
              { title: 'Using Gross Instead of Net', description: 'Enter your take-home pay (after taxes), not your gross salary. Using gross inflates your Safe-to-Spend.' },
              { title: 'Skipping the Buffer', description: 'A 0% buffer means zero margin for error. Life is unpredictable — even 5% provides meaningful protection.' },
            ]}
            tips={[
              { title: 'Round Down Your Income', description: 'Use a slightly lower income number than your actual take-home. The extra becomes automatic savings you never miss.' },
              { title: 'Automate Your Buffer', description: 'Set up an auto-transfer on payday to move your buffer amount to savings before you can spend it.' },
              { title: 'Review Weekly, Not Daily', description: 'Checking daily creates anxiety. A weekly review gives you enough data to course-correct without stress.' },
            ]}
          />

          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            {/* Input card with step indicators */}
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <Shield className="h-5 w-5 text-prism-teal" />
                  Calculate Your Safe-to-Spend
                </CardTitle>
                {/* Step progress */}
                <div className="flex items-center gap-2 pt-2">
                  {stsSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs">
                      {step.done
                        ? <CheckCircle2 className="h-3.5 w-3.5 text-prism-teal" />
                        : <div className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40" />
                      }
                      <span className={step.done ? 'text-foreground font-medium' : 'text-muted-foreground'}>{step.label}</span>
                      {i < stsSteps.length - 1 && <span className="text-muted-foreground/30 mx-1">→</span>}
                    </div>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Step 1: Income */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-prism-teal/15 text-[10px] font-bold text-prism-teal">1</span>
                    Monthly Net Income
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Your take-home pay after taxes — salary, freelance, business revenue combined</p>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number" placeholder="e.g. 6000"
                      value={stsForm.income}
                      onChange={e => setStsForm(f => ({ ...f, income: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Step 2: Bills */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-prism-rose/15 text-[10px] font-bold text-prism-rose">2</span>
                    Monthly Recurring Bills
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Rent/mortgage, utilities, car payment, insurance, loans, etc.</p>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number" placeholder="e.g. 2500"
                      value={stsForm.recurringBills}
                      onChange={e => setStsForm(f => ({ ...f, recurringBills: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Step 3: Subscriptions */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-prism-amber/15 text-[10px] font-bold text-prism-amber">3</span>
                    Monthly Subscriptions
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Netflix, Spotify, gym, software, cloud storage, etc.
                    {!stsForm.subscriptions && (
                      <> — Not sure? <a href="/subscriptions" className="text-primary underline underline-offset-2 hover:text-primary/80">Review your subscriptions</a> first.</>
                    )}
                  </p>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number" placeholder="e.g. 200"
                      value={stsForm.subscriptions}
                      onChange={e => setStsForm(f => ({ ...f, subscriptions: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Step 4: Already Spent */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-prism-violet/15 text-[10px] font-bold text-prism-violet">4</span>
                    Already Spent This Month
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Total discretionary spending so far this month (dining, shopping, etc.)</p>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number" placeholder="e.g. 800"
                      value={stsForm.alreadySpent}
                      onChange={e => setStsForm(f => ({ ...f, alreadySpent: e.target.value }))}
                      className="pl-9"
                    />
                  </div>
                </div>

                {/* Buffer */}
                <div className="space-y-1.5 pt-2 border-t border-border/30">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-prism-teal" />
                    Safety Buffer
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="flex rounded-lg border border-border p-0.5 flex-1">
                      {[
                        { label: 'Guardrail', value: '15', color: 'text-prism-teal' },
                        { label: 'Balanced', value: '10', color: 'text-prism-amber' },
                        { label: 'Green Light', value: '5', color: 'text-prism-lime' },
                      ].map(mode => (
                        <button
                          key={mode.value}
                          onClick={() => setStsForm(f => ({ ...f, bufferPercent: mode.value }))}
                          className={cn(
                            'flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors',
                            stsForm.bufferPercent === mode.value
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                    <div className="relative w-20">
                      <Input
                        type="number" min="0" max="50"
                        value={stsForm.bufferPercent}
                        onChange={e => setStsForm(f => ({ ...f, bufferPercent: e.target.value }))}
                        className="pr-6 text-center text-sm"
                      />
                      <Percent className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results card */}
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display text-lg">Your Safe-to-Spend</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Big hero number */}
                <div className="text-center p-4 rounded-xl bg-gradient-to-br from-primary/10 to-prism-teal/10 border border-primary/20">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Monthly Safe-to-Spend</p>
                  <p className="font-display text-4xl font-extrabold prism-gradient-text">
                    <AnimatedNumber value={stsResult.monthly} formatFn={formatCurrency} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{stsResult.daysRemaining} days remaining this month</p>
                </div>

                {/* Daily + Weekly */}
                <div className="grid grid-cols-2 gap-3">
                  <ResultCard label="Daily Safe-to-Spend" value={formatCurrency(stsResult.daily)} numericValue={stsResult.daily} formatFn={formatCurrency} accent sub={`${stsResult.daysRemaining} days left`} />
                  <ResultCard label="Weekly Safe-to-Spend" value={formatCurrency(stsResult.weekly)} numericValue={stsResult.weekly} formatFn={formatCurrency} accent />
                </div>

                {/* Breakdown */}
                <div className="space-y-2 pt-3 border-t border-border/30">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">How It's Calculated</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Monthly Income', value: stsResult.income, color: 'text-prism-teal', sign: '' },
                      { label: 'Recurring Bills', value: stsResult.bills, color: 'text-prism-rose', sign: '−' },
                      { label: 'Subscriptions', value: stsResult.subs, color: 'text-prism-amber', sign: '−' },
                      { label: 'Already Spent', value: stsResult.spent, color: 'text-prism-violet', sign: '−' },
                      { label: `Safety Buffer (${stsResult.buffer}%)`, value: stsResult.bufferAmount, color: 'text-prism-sky', sign: '−' },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.sign} {row.label}</span>
                        <span className={cn('font-mono font-medium', row.color)}>{formatCurrency(row.value)}</span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-sm font-bold pt-2 border-t border-border/30">
                      <span>= Safe-to-Spend</span>
                      <span className="text-primary font-display text-lg">{formatCurrency(stsResult.monthly)}</span>
                    </div>
                  </div>
                </div>

                {/* Income percentage bar */}
                {stsResult.income > 0 && (
                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{Math.round((stsResult.monthly / stsResult.income) * 100)}% of income is safe to spend</span>
                    </div>
                    <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-primary to-prism-teal"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(100, (stsResult.monthly / stsResult.income) * 100)}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                      />
                    </div>
                  </div>
                )}

                <CalculatorActions
                  calculatorType="safetospend"
                  inputs={stsForm}
                  results={{ daily: stsResult.daily, weekly: stsResult.weekly, monthly: stsResult.monthly }}
                  hasResults={stsResult.income > 0}
                  summaryText={`# 🛡️ Safe-to-Spend\n\n**Inputs**\n- **Monthly Income:** ${formatCurrency(stsResult.income)}\n- **Recurring Bills:** ${formatCurrency(stsResult.bills)}\n- **Subscriptions:** ${formatCurrency(stsResult.subs)}\n- **Already Spent:** ${formatCurrency(stsResult.spent)}\n- **Safety Buffer:** ${stsResult.buffer}%\n\n**Results**\n- **Daily:** ${formatCurrency(stsResult.daily)}\n- **Weekly:** ${formatCurrency(stsResult.weekly)}\n- **Monthly:** ${formatCurrency(stsResult.monthly)}`}
                  onOpenHistory={() => setHistoryOpen(true)}
                  printData={{
                    inputs: [
                      { label: 'Monthly Income', value: formatCurrency(stsResult.income) },
                      { label: 'Recurring Bills', value: formatCurrency(stsResult.bills) },
                      { label: 'Subscriptions', value: formatCurrency(stsResult.subs) },
                      { label: 'Already Spent', value: formatCurrency(stsResult.spent) },
                      { label: 'Safety Buffer', value: `${stsResult.buffer}%` },
                    ],
                    results: [
                      { label: 'Monthly Safe-to-Spend', value: formatCurrency(stsResult.monthly), highlight: true },
                      { label: 'Weekly Safe-to-Spend', value: formatCurrency(stsResult.weekly) },
                      { label: 'Daily Safe-to-Spend', value: formatCurrency(stsResult.daily) },
                    ],
                  }}
                />
              </CardContent>
            </Card>
          </div>

          <CalculatorInsight
            calculatorType="safetospend"
            inputs={stsForm}
            results={{ daily: stsResult.daily, weekly: stsResult.weekly, monthly: stsResult.monthly, buffer: stsResult.buffer }}
            hasResults={stsResult.income > 0}
          />
        </div>)}

      {activeCalc === 'rentvsbuy' && (<div className="mt-6">
        <RentVsBuyCalculator onOpenHistory={() => setHistoryOpen(true)} />
      </div>)}

      {activeCalc === 'mortgage' && (<div className="mt-6">
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
        <CalculatorScenariosAndPitfalls
          scenarios={[
            { title: 'First-Time Buyer', description: 'Put 20% down to avoid PMI. On a $350k home, that\'s $70k down — saving $150–250/mo in private mortgage insurance.' },
            { title: 'Refinancing', description: 'Dropping from 7% to 5.5% on a $280k balance saves ~$300/mo. Break-even on closing costs in about 18 months.' },
            { title: 'Extra Payments', description: 'Adding just $200/mo to a 30-year mortgage can cut 5–7 years off the loan and save tens of thousands in interest.' },
            { title: '15 vs 30 Year', description: 'A 15-year term has higher payments but saves 50–60% in total interest. Compare both using this calculator.' },
          ]}
          pitfalls={[
            { title: 'Ignoring Taxes & Insurance', description: 'Your actual monthly housing cost includes taxes, insurance, and possibly HOA — often $500–1,000+ beyond the mortgage.' },
            { title: 'Maxing Out Your Budget', description: 'Just because you qualify for a $400k loan doesn\'t mean you should. Keep total housing under 28% of gross income.' },
            { title: 'Skipping Rate Comparison', description: 'Even 0.25% lower rate on a $300k loan saves $15,000+ over 30 years. Always shop multiple lenders.' },
            { title: 'Forgetting Closing Costs', description: 'Budget 2–5% of the home price for closing costs. On a $350k home, that\'s $7k–$17.5k due at signing.' },
          ]}
          tips={[
            { title: 'Make Biweekly Payments', description: 'Paying half your mortgage every two weeks equals 13 full payments per year instead of 12. On a $300k loan, this saves $30k+ in interest and shaves 4-5 years off.' },
            { title: 'Recast After a Lump Sum', description: 'If you make a large extra payment, ask your lender to recast (re-amortize). This lowers your monthly payment permanently without refinancing fees.' },
            { title: 'Buy Points If Staying 7+ Years', description: 'Paying 1% upfront to lower your rate by 0.25% breaks even around year 5-7. If you plan to stay longer, it saves thousands.' },
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
              {/* State selector */}
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-prism-violet" />
                  State
                </Label>
                <Select value={mortgageForm.state} onValueChange={handleMortgageStateChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select state for accurate tax & insurance rates…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {Object.entries(STATE_DATA).filter(([k]) => k !== '').map(([code, data]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground w-6">{code}</span>
                          {data.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mortgageForm.state && (
                  <p className="text-[10px] text-prism-teal">
                    ✓ Property tax & insurance updated for {STATE_DATA[mortgageForm.state]?.label}
                  </p>
                )}
              </div>
              <InputField label="Home Price" value={mortgageForm.price} onChange={v => setMortgageForm(f => ({ ...f, price: v }))} icon={DollarSign} />
              <InputField label="Down Payment" value={mortgageForm.down} onChange={v => setMortgageForm(f => ({ ...f, down: v }))} icon={DollarSign} />
              <InputField label="Interest Rate" value={mortgageForm.rate} onChange={v => setMortgageForm(f => ({ ...f, rate: v }))} icon={Percent} suffix="%" />
              <InputField label="Loan Term" value={mortgageForm.years} onChange={v => setMortgageForm(f => ({ ...f, years: v }))} icon={CalendarDays} suffix="years" />
              <InputField label="Property Tax Rate" value={mortgageForm.propertyTaxRate} onChange={v => setMortgageForm(f => ({ ...f, propertyTaxRate: v }))} icon={Percent} suffix="%" />
              <InputField label="Insurance Rate" value={mortgageForm.insuranceRate} onChange={v => setMortgageForm(f => ({ ...f, insuranceRate: v }))} icon={Percent} suffix="%" />
              <div className="text-xs text-muted-foreground">
                Loan Amount: {formatCurrency(Math.max(0, (parseFloat(mortgageForm.price) || 0) - (parseFloat(mortgageForm.down) || 0)))}
              </div>
            </CardContent>
          </Card>
          <Card className="prism-card-shine border-border/50">
            <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ResultCard label="Total Monthly" value={formatCurrency(mortgageResult.totalMonthly)} numericValue={mortgageResult.totalMonthly} formatFn={formatCurrency} accent sub="P&I + Tax + Insurance" />
                <ResultCard label="P&I Payment" value={formatCurrency(mortgageResult.payment)} numericValue={mortgageResult.payment} formatFn={formatCurrency} sub="Principal & Interest only" />
                <ResultCard label="Property Tax" value={formatCurrency(mortgageResult.monthlyPropTax)} numericValue={mortgageResult.monthlyPropTax} formatFn={formatCurrency} sub={`${mortgageForm.propertyTaxRate}%/yr`} />
                <ResultCard label="Insurance" value={formatCurrency(mortgageResult.monthlyInsurance)} numericValue={mortgageResult.monthlyInsurance} formatFn={formatCurrency} sub={`${mortgageForm.insuranceRate}%/yr`} />
                <ResultCard label="Total Interest" value={formatCurrency(mortgageResult.totalInterest)} numericValue={mortgageResult.totalInterest} formatFn={formatCurrency} />
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
                summaryText={`# 🏠 Mortgage Calculator\n\n**Inputs**\n${mortgageForm.state ? `- **State:** ${STATE_DATA[mortgageForm.state]?.label}\n` : ''}- **Home Price:** ${formatCurrency(Number(mortgageForm.price))}\n- **Down Payment:** ${formatCurrency(Number(mortgageForm.down))}\n- **Interest Rate:** ${mortgageForm.rate}%\n- **Term:** ${mortgageForm.years} years\n- **Property Tax:** ${mortgageForm.propertyTaxRate}%\n- **Insurance:** ${mortgageForm.insuranceRate}%\n\n**Results**\n- **Total Monthly:** ${formatCurrency(mortgageResult.totalMonthly)}\n- **P&I Payment:** ${formatCurrency(mortgageResult.payment)}\n- **Property Tax:** ${formatCurrency(mortgageResult.monthlyPropTax)}/mo\n- **Insurance:** ${formatCurrency(mortgageResult.monthlyInsurance)}/mo\n- **Total Interest:** ${formatCurrency(mortgageResult.totalInterest)}\n- **Total Paid:** ${formatCurrency(mortgageResult.totalPaid)}`}
                onOpenHistory={() => setHistoryOpen(true)}
                printData={{
                  inputs: [
                    ...(mortgageForm.state ? [{ label: 'State', value: STATE_DATA[mortgageForm.state]?.label || mortgageForm.state }] : []),
                    { label: 'Home Price', value: `$${Number(mortgageForm.price).toLocaleString()}` },
                    { label: 'Down Payment', value: `$${Number(mortgageForm.down).toLocaleString()}` },
                    { label: 'Interest Rate', value: `${mortgageForm.rate}%` },
                    { label: 'Loan Term', value: `${mortgageForm.years} years` },
                    { label: 'Property Tax', value: `${mortgageForm.propertyTaxRate}%` },
                    { label: 'Insurance', value: `${mortgageForm.insuranceRate}%` },
                    { label: 'Loan Amount', value: formatCurrency(Math.max(0, (parseFloat(mortgageForm.price)||0) - (parseFloat(mortgageForm.down)||0))) },
                  ],
                  results: [
                    { label: 'Total Monthly', value: formatCurrency(mortgageResult.totalMonthly), highlight: true },
                    { label: 'P&I Payment', value: formatCurrency(mortgageResult.payment) },
                    { label: 'Monthly Tax', value: formatCurrency(mortgageResult.monthlyPropTax) },
                    { label: 'Monthly Insurance', value: formatCurrency(mortgageResult.monthlyInsurance) },
                    { label: 'Total Interest', value: formatCurrency(mortgageResult.totalInterest) },
                    { label: 'Total Paid', value: formatCurrency(mortgageResult.totalPaid) },
                    { label: 'Interest Ratio', value: `${mortgageResult.totalPaid > 0 ? Math.round((mortgageResult.totalInterest / mortgageResult.totalPaid) * 100) : 0}%` },
                  ],
                }}
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
      </div>)}
      {activeCalc === 'auto' && (<div className="mt-6">
        <CalculatorGuide
          title="Auto Loan Calculator"
          icon={Car}
          iconColor="text-prism-sky"
          ttsScript="The Auto Loan Calculator estimates your monthly car payment. Enter the vehicle price, down payment, trade-in value if applicable, interest rate, and loan term. Your monthly payment, total interest, and total cost are calculated instantly. The amortization chart tracks your remaining balance, and the cost breakdown bar shows how much goes to principal versus interest."
          instructions={[
            'Enter the vehicle purchase price',
            'Add your down payment and trade-in value (if any)',
            'Set the annual interest rate and loan term',
            'Results show monthly payment, total interest, and total cost',
            'The chart tracks your remaining balance over the loan term',
          ]}
        />
        <CalculatorScenariosAndPitfalls
          scenarios={[
            { title: 'New vs Used', description: 'A 2-year-old certified pre-owned car can save 20–30% vs new while still having warranty coverage.' },
            { title: 'Short-Term Loan', description: 'A 3-year loan at 5.9% on $30k costs $2,800 in interest vs $4,700 on a 5-year term.' },
            { title: 'Large Trade-In', description: 'A $10k trade-in on a $35k car drops your loan to $25k — reducing payments by $170+/mo on a 5-year loan.' },
            { title: '0% Dealer Financing', description: 'Compare 0% APR vs a cash discount. Sometimes the rebate beats the free financing.' },
          ]}
          pitfalls={[
            { title: 'Stretching to 7+ Years', description: 'Longer terms mean lower payments but much more interest — and you may owe more than the car is worth.' },
            { title: 'Ignoring Total Cost', description: 'Focus on total cost, not monthly payment. Dealers love stretching terms to make expensive cars seem affordable.' },
            { title: 'Skipping Pre-Approval', description: 'Get pre-approved from your bank before the dealership. Dealer financing often has higher rates.' },
            { title: 'Negative Equity Roll-In', description: 'Rolling an old loan balance into a new car loan starts you underwater immediately.' },
          ]}
          tips={[
            { title: 'Get Pre-Approved First', description: 'Walk into the dealership with a pre-approved rate from your bank or credit union. This gives you leverage to negotiate and often beats dealer financing.' },
            { title: 'Negotiate the Out-the-Door Price', description: 'Dealers pad profit into monthly payment negotiations. Always negotiate the total price first, then discuss financing separately.' },
            { title: 'Make One Extra Payment Per Year', description: 'One additional payment annually on a 60-month loan saves months of interest and builds equity faster, especially important if you trade in.' },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
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
                summaryText={`# 🚗 Auto Loan Calculator\n\n**Inputs**\n- **Vehicle Price:** ${formatCurrency(Number(autoForm.price))}\n- **Down Payment:** ${formatCurrency(Number(autoForm.down))}\n- **Interest Rate:** ${autoForm.rate}%\n- **Term:** ${autoForm.years} years\n\n**Results**\n- **Monthly Payment:** ${formatCurrency(autoResult.payment)}\n- **Total Interest:** ${formatCurrency(autoResult.totalInterest)}\n- **Total Paid:** ${formatCurrency(autoResult.totalPaid)}`}
                onOpenHistory={() => setHistoryOpen(true)}
                printData={{
                  inputs: [
                    { label: 'Vehicle Price', value: `$${Number(autoForm.price).toLocaleString()}` },
                    { label: 'Down Payment', value: `$${Number(autoForm.down).toLocaleString()}` },
                    { label: 'Trade-in Value', value: `$${Number(autoForm.tradeIn).toLocaleString()}` },
                    { label: 'Interest Rate', value: `${autoForm.rate}%` },
                    { label: 'Loan Term', value: `${autoForm.years} years` },
                  ],
                  results: [
                    { label: 'Monthly Payment', value: formatCurrency(autoResult.payment), highlight: true },
                    { label: 'Total Interest', value: formatCurrency(autoResult.totalInterest) },
                    { label: 'Total Paid', value: formatCurrency(autoResult.totalPaid) },
                    { label: 'Loan Amount', value: formatCurrency(Math.max(0, (parseFloat(autoForm.price)||0) - (parseFloat(autoForm.down)||0) - (parseFloat(autoForm.tradeIn)||0))) },
                  ],
                }}
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
      </div>)}
      {activeCalc === 'credit' && (<div className="mt-6">
        <CalculatorGuide
          title="Credit Card Payoff"
          icon={CreditCard}
          iconColor="text-prism-rose"
          ttsScript="The Credit Card Payoff Calculator shows how long it will take to pay off your credit card balance. Enter your current balance, the annual percentage rate or APR, and your monthly payment amount. You'll see the number of months to payoff, total interest paid, and total cost. If your payment is too low to cover monthly interest, you'll get a warning. A helpful tip shows how much you could save by paying an extra fifty dollars per month."
          instructions={[
            'Enter your current credit card balance',
            'Add your card\'s APR (annual percentage rate)',
            'Set the monthly payment you plan to make',
            'Results show months to payoff, total interest, and total cost',
            'Warning appears if your payment doesn\'t cover monthly interest',
            'A tip shows savings from increasing your payment by $50/mo',
          ]}
        />
        <CalculatorScenariosAndPitfalls
          scenarios={[
            { title: 'Balance Transfer', description: 'Moving $8k from 23% to a 0% intro card saves ~$150/mo in interest. Pay it off before the promo ends.' },
            { title: 'Aggressive Payoff', description: 'Doubling your payment from $250 to $500/mo on $8k cuts payoff time in half and saves thousands.' },
            { title: 'Minimum Payment Trap', description: 'Paying only $160/mo on $8k at 23% takes 9+ years and costs $9,000+ in interest alone.' },
            { title: 'Debt Snowball', description: 'Pay off the smallest card first for a quick win, then roll that payment into the next card.' },
          ]}
          pitfalls={[
            { title: 'Paying Only the Minimum', description: 'Minimum payments maximize interest for the lender. Even $50 extra/mo makes a massive difference.' },
            { title: 'Continuing to Charge', description: 'Adding new charges while paying off a balance erases your progress. Freeze the card during payoff.' },
            { title: 'Ignoring the APR', description: 'A "low" payment on a 25%+ APR card means most of your payment goes to interest, not principal.' },
            { title: 'Missing a Payment', description: 'One missed payment can trigger a penalty APR of 29%+ and damage your credit score significantly.' },
          ]}
          tips={[
            { title: 'Balance Transfer to 0% Promo', description: 'Move high-APR balances to a 0% intro card. Every dollar goes to principal for 12-21 months. Just pay it off before the promo ends.' },
            { title: 'Pay Biweekly Instead of Monthly', description: 'Splitting your payment in half and paying every two weeks adds an extra full payment per year, cutting months off your payoff timeline.' },
            { title: 'Call and Negotiate Your Rate', description: 'If you have a good payment history, call your issuer and ask for a lower APR. Success rate is 60-70% and can save hundreds in interest.' },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
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
                summaryText={`# 💳 Credit Card Payoff\n\n**Inputs**\n- **Balance:** ${formatCurrency(Number(ccForm.balance))}\n- **APR:** ${ccForm.apr}%\n- **Monthly Payment:** ${formatCurrency(Number(ccForm.payment))}\n\n**Results**\n- **Payoff Time:** ${ccResult.months} months\n- **Total Interest:** ${formatCurrency(ccResult.totalInterest)}\n- **Total Paid:** ${formatCurrency(ccResult.totalPaid)}`}
                onOpenHistory={() => setHistoryOpen(true)}
                printData={{
                  inputs: [
                    { label: 'Current Balance', value: `$${Number(ccForm.balance).toLocaleString()}` },
                    { label: 'APR', value: `${ccForm.apr}%` },
                    { label: 'Monthly Payment', value: `$${Number(ccForm.payment).toLocaleString()}/mo` },
                  ],
                  results: [
                    { label: 'Months to Payoff', value: `${ccResult.months} months (${Math.floor(ccResult.months/12)}y ${ccResult.months%12}m)`, highlight: true },
                    { label: 'Total Interest', value: formatCurrency(ccResult.totalInterest) },
                    { label: 'Total Paid', value: formatCurrency(ccResult.totalPaid) },
                    { label: 'Interest Ratio', value: `${ccResult.totalPaid > 0 ? Math.round((ccResult.totalInterest / ccResult.totalPaid) * 100) : 0}%` },
                  ],
                }}
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
      </div>)}
      {activeCalc === 'investment' && (<div className="mt-6">
        <CalculatorGuide
          title="Investment Calculator"
          icon={TrendingUp}
          iconColor="text-prism-lime"
          ttsScript="The Investment Calculator projects how your money grows over time with compound interest. Enter your initial investment, monthly contribution, expected annual return rate, and time horizon in years. You'll see the final balance, total contributions, total earnings, and your overall return on investment percentage. The growth chart visualizes how your portfolio builds year by year, and the composition bar shows contributions versus earnings."
          instructions={[
            'Enter your initial lump-sum investment',
            'Set a monthly contribution amount',
            'Choose an expected annual return rate',
            'Set your investment time horizon in years',
            'Results show final balance, total contributions, and earnings',
            'The growth chart shows your portfolio value over time',
          ]}
        />
        <CalculatorScenariosAndPitfalls
          scenarios={[
            { title: 'Starting at 25', description: '$500/mo at 8% for 40 years grows to $1.74M. Starting at 35 yields only $745k — less than half.' },
            { title: 'Employer Match', description: 'If your employer matches 50% up to 6%, contribute at least 6%. That\'s an instant 50% return on your money.' },
            { title: 'Lump Sum vs DCA', description: 'Historically, investing a lump sum beats dollar-cost averaging 2/3 of the time, but DCA reduces emotional risk.' },
            { title: 'Roth vs Traditional', description: 'If you expect higher taxes in retirement, Roth contributions grow tax-free. Compare the growth difference here.' },
          ]}
          pitfalls={[
            { title: 'Waiting to Start', description: 'Every year you delay costs exponentially. Starting 5 years late on $500/mo at 8% costs over $250k in lost growth.' },
            { title: 'Unrealistic Returns', description: 'Historical S&P 500 averages ~10% before inflation, ~7% after. Don\'t plan on 12%+ returns.' },
            { title: 'Wrong Account Type for Your Tax Bracket', description: 'High earners benefit more from Traditional (tax deduction now). Lower earners benefit from Roth (tax-free growth). Picking wrong costs thousands.' },
            { title: 'Panic Selling', description: 'Missing just the 10 best market days over 20 years can cut your returns in half. Stay invested.' },
          ]}
          tips={[
            { title: 'Max Your Employer Match First', description: 'Employer 401(k) match is free money — a 100% instant return. Always contribute enough to get the full match before investing elsewhere.' },
            { title: 'Backdoor Roth If Over Income Limit', description: 'High earners can contribute to a Traditional IRA then convert to Roth. Legal, IRS-approved, and lets you access tax-free growth.' },
            { title: 'Tax-Loss Harvest Annually', description: 'Sell losing investments to offset gains and reduce your tax bill by up to $3,000/year. Reinvest immediately in a similar (not identical) fund.' },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
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
                summaryText={`# 📈 Investment Calculator\n\n**Inputs**\n- **Initial Investment:** ${formatCurrency(Number(investForm.initial))}\n- **Monthly Contribution:** ${formatCurrency(Number(investForm.monthly))}\n- **Expected Return:** ${investForm.rate}%\n- **Time Horizon:** ${investForm.years} years\n\n**Results**\n- **Final Balance:** ${formatCurrency(investResult.finalBalance)}\n- **Total Contributions:** ${formatCurrency(investResult.totalContributions)}\n- **Total Earnings:** ${formatCurrency(investResult.totalInterest)}`}
                onOpenHistory={() => setHistoryOpen(true)}
                printData={{
                  inputs: [
                    { label: 'Initial Investment', value: `$${Number(investForm.initial).toLocaleString()}` },
                    { label: 'Monthly Contribution', value: `$${Number(investForm.monthly).toLocaleString()}` },
                    { label: 'Annual Return', value: `${investForm.rate}%` },
                    { label: 'Time Horizon', value: `${investForm.years} years` },
                  ],
                  results: [
                    { label: 'Final Balance', value: formatCurrency(investResult.finalBalance), highlight: true },
                    { label: 'Total Contributions', value: formatCurrency(investResult.totalContributions) },
                    { label: 'Total Earnings', value: formatCurrency(investResult.totalInterest) },
                    { label: 'ROI', value: `${investResult.totalContributions > 0 ? Math.round(((investResult.finalBalance - investResult.totalContributions) / investResult.totalContributions) * 100) : 0}%` },
                  ],
                }}
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
      </div>)}
      {activeCalc === 'debt' && (<div className="mt-6">
        <CalculatorGuide
          title="General Debt Calculator"
          icon={DollarSign}
          iconColor="text-prism-amber"
          ttsScript="The General Debt Calculator works for any type of loan — student loans, personal loans, or other debts. Enter the total debt balance, the annual interest rate, and your planned monthly payment. You'll see the payoff timeline in years and months, total interest paid, total cost, and a payoff chart. The payment breakdown bar shows how much of your total goes to principal versus interest."
          instructions={[
            'Enter your total debt balance',
            'Set the annual interest rate',
            'Enter your planned monthly payment',
            'Results show payoff time, total interest, and total cost',
            'The payoff chart tracks your declining balance',
            'Works for any loan type: student, personal, medical, etc.',
          ]}
        />
        <CalculatorScenariosAndPitfalls
          scenarios={[
            { title: 'Student Loan Payoff', description: '$25k at 5% with $400/mo takes 5.8 years. Bumping to $600/mo saves 2+ years and $1,500 in interest.' },
            { title: 'Medical Debt', description: 'Many hospitals offer 0% payment plans. A $10k bill at 0% with $300/mo takes just 34 months — no interest.' },
            { title: 'Consolidation', description: 'Combining multiple debts into one lower-rate loan simplifies payments and can reduce total interest by 30–50%.' },
            { title: 'Windfall Application', description: 'Applying a $5k tax refund to a $25k loan at 7% saves $4,200+ in interest over the loan\'s life.' },
          ]}
          pitfalls={[
            { title: 'Spending the Windfall Mentally', description: 'The moment you receive a lump sum your brain starts spending it. Allocate it on paper within 48 hours before impulse decisions erode the opportunity.' },
            { title: 'Ignoring High-Rate Debts', description: 'Always prioritize the highest-rate debt first (avalanche method) to minimize total interest paid.' },
            { title: 'Refinancing Without Math', description: 'A lower rate with a longer term can actually cost more in total interest. Always compare total cost.' },
            { title: 'Skipping the Tax Hit', description: 'Bonuses, settlements, and inheritance can trigger unexpected taxes. Set aside 25-30% for taxes before allocating the rest.' },
          ]}
          tips={[
            { title: 'Use the 50/30/20 Windfall Split', description: 'Allocate 50% to debt payoff, 30% to investments, and 20% to something you enjoy. This balances financial progress with reward.' },
            { title: 'Target Highest-Rate Debt First', description: 'Applying your windfall to the highest-interest debt saves the most money long-term. Even partial payoff reduces the interest snowball.' },
            { title: 'Keep It Quiet', description: 'Do not announce your windfall publicly. Financial pressure from others is real and leads to guilt-driven spending that erodes the opportunity.' },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
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
                summaryText={`# 💰 Debt Payoff Calculator\n\n**Inputs**\n- **Balance:** ${formatCurrency(Number(debtForm.balance))}\n- **Interest Rate:** ${debtForm.rate}%\n- **Monthly Payment:** ${formatCurrency(Number(debtForm.payment))}\n\n**Results**\n- **Payoff Time:** ${Math.floor(debtResult.months/12)}y ${debtResult.months%12}m\n- **Total Interest:** ${formatCurrency(debtResult.totalInterest)}\n- **Total Paid:** ${formatCurrency(debtResult.totalPaid)}`}
                onOpenHistory={() => setHistoryOpen(true)}
                printData={{
                  inputs: [
                    { label: 'Total Debt', value: `$${Number(debtForm.balance).toLocaleString()}` },
                    { label: 'Interest Rate', value: `${debtForm.rate}%` },
                    { label: 'Monthly Payment', value: `$${Number(debtForm.payment).toLocaleString()}/mo` },
                  ],
                  results: [
                    { label: 'Payoff Time', value: `${Math.floor(debtResult.months/12)}y ${debtResult.months%12}m`, highlight: true },
                    { label: 'Total Interest', value: formatCurrency(debtResult.totalInterest) },
                    { label: 'Total Paid', value: formatCurrency(debtResult.totalPaid) },
                    { label: 'Interest Cost', value: `${debtResult.totalPaid > 0 ? Math.round((debtResult.totalInterest / debtResult.totalPaid) * 100) : 0}%` },
                  ],
                }}
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
      </div>)}

      {/* ─── WEALTH MULTIPLIER ─── */}
      {activeCalc === 'wealth' && (<div className="mt-6">
        <CalculatorGuide
          title="Wealth Multiplier"
          icon={PiggyBank}
          iconColor="text-prism-indigo"
          ttsScript="The Wealth Multiplier shows how much every dollar you invest today could grow by retirement at age 65. Enter your current age and see the multiplier effect of compound growth. You'll also see how much you'd need to invest monthly to reach one million and two million dollars by retirement. The younger you start, the more powerful the multiplier becomes."
          instructions={[
            'Enter your current age (18–64)',
            'See how much each $1 invested today becomes by age 65',
            'View the monthly investment needed to reach $1M and $2M',
            'The chart shows the multiplier declining as you age — start early!',
          ]}
        />
        <CalculatorScenariosAndPitfalls
          scenarios={[
            { title: 'Age 25 Investor', description: 'At 25, every $1 becomes ~$44 by 65. Investing just $200/mo from 25 yields over $500k by retirement.' },
            { title: 'Late Starter at 40', description: 'Starting at 40 means a 7x multiplier instead of 44x. You\'ll need $2,800+/mo to reach $1M — but it\'s still possible.' },
            { title: 'Power of 10 Years', description: 'Starting at 25 vs 35 with $500/mo means $1M+ more at retirement. A decade of compound growth is irreplaceable.' },
            { title: 'Couple Investing Together', description: 'Two people investing $500/mo each starting at 30 can accumulate $2.5M+ by 65 through combined growth.' },
          ]}
          pitfalls={[
            { title: 'Thinking It\'s Too Late', description: 'Even starting at 50, a 15-year runway with disciplined saving can build significant wealth. Every year counts.' },
            { title: 'Cashing Out Early', description: 'Withdrawing retirement funds early triggers penalties and taxes, plus you lose all future compounding.' },
            { title: 'Lifestyle Inflation', description: 'As income grows, increase investments — not just spending. Saving your raises is the fastest path to wealth.' },
            { title: 'Underestimating the Multiplier Effect', description: 'At age 25, $1 invested becomes ~$10+ by retirement. At 45, it only becomes ~$3. The multiplier shrinks fast — start now.' },
          ]}
          tips={[
            { title: 'Increase Contributions 1% Annually', description: 'Bump your savings rate by 1% each year (or with each raise). You will not feel the difference, but over 20 years it adds six figures.' },
            { title: 'Reinvest All Dividends', description: 'Dividend reinvestment compounds your returns automatically. A 2% dividend reinvested over 30 years can double your ending balance.' },
            { title: 'Use Tax-Advantaged Accounts First', description: 'Max out 401(k), IRA, and HSA before taxable brokerage accounts. Tax-deferred growth is the single biggest wealth accelerator.' },
          ]}
        />
        <div className="grid gap-6 lg:grid-cols-2 mt-4">
          <Card className="prism-card-shine border-border/50">
            <CardHeader>
              <CardTitle className="font-display flex items-center gap-2 text-lg">
                <PiggyBank className="h-5 w-5 text-prism-indigo" /> Wealth Multiplier
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InputField label="Current Age" value={wealthAge} onChange={handleWealthAgeChange} icon={CalendarDays} suffix="years" />
              <p className="text-xs text-muted-foreground">
                Based on compound growth assumptions: returns start at ~10% at age 20 and gradually decrease to ~5.5% approaching retirement at 65.
              </p>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="text-xs text-muted-foreground mb-2 font-medium">Multiplier by Age</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {WEALTH_MULTIPLIER_DATA.map(d => (
                    <div key={d.age} className={cn(
                      'text-center p-1.5 rounded-lg text-xs transition-colors',
                      parseInt(wealthAge) === d.age ? 'bg-primary text-primary-foreground' : 'bg-muted/50'
                    )}>
                      <p className="font-bold">{d.multiplier.toFixed(0)}x</p>
                      <p className="text-[10px] text-muted-foreground">{d.age}</p>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="prism-card-shine border-border/50">
            <CardHeader><CardTitle className="font-display text-lg">Results</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <ResultCard label="Wealth Multiplier" value={`${wealthResult.multiplier.toFixed(1)}x`} accent sub={`At age ${wealthResult.age}`} />
                <ResultCard label="$1 Becomes" value={formatCurrency(wealthResult.multiplier)} sub="by age 65" />
                <ResultCard label="Monthly for $1M" value={formatCurrency(wealthResult.monthlyTo1M)} numericValue={wealthResult.monthlyTo1M} formatFn={formatCurrency} sub="to reach $1,000,000" />
                <ResultCard label="Monthly for $2M" value={formatCurrency(wealthResult.monthlyTo2M)} numericValue={wealthResult.monthlyTo2M} formatFn={formatCurrency} sub="to reach $2,000,000" />
              </div>
              <CalculatorActions
                calculatorType="wealth"
                inputs={{ age: wealthAge }}
                results={{ multiplier: wealthResult.multiplier, monthlyTo1M: wealthResult.monthlyTo1M, monthlyTo2M: wealthResult.monthlyTo2M }}
                hasResults={true}
                summaryText={`# 🌟 Wealth Multiplier\n\n**Inputs**\n- **Current Age:** ${wealthAge}\n\n**Results**\n- **Multiplier:** ${wealthResult.multiplier.toFixed(1)}x\n- **Monthly to reach $1M:** ${formatCurrency(wealthResult.monthlyTo1M)}\n- **Monthly to reach $2M:** ${formatCurrency(wealthResult.monthlyTo2M)}`}
                onOpenHistory={() => setHistoryOpen(true)}
                printData={{
                  inputs: [
                    { label: 'Current Age', value: `${wealthAge} years` },
                    { label: 'Retirement Age', value: '65 years' },
                    { label: 'Years to Grow', value: `${65 - (parseInt(wealthAge) || 30)} years` },
                  ],
                  results: [
                    { label: 'Wealth Multiplier', value: `${wealthResult.multiplier.toFixed(1)}x`, highlight: true },
                    { label: '$1 Becomes', value: formatCurrency(wealthResult.multiplier) },
                    { label: 'Monthly for $1M', value: formatCurrency(wealthResult.monthlyTo1M) },
                    { label: 'Monthly for $2M', value: formatCurrency(wealthResult.monthlyTo2M) },
                  ],
                }}
              />
            </CardContent>
          </Card>
        </div>
        <CalculatorInsight
          calculatorType="wealth"
          inputs={{ age: wealthAge }}
          results={{ multiplier: wealthResult.multiplier, monthlyTo1M: wealthResult.monthlyTo1M, monthlyTo2M: wealthResult.monthlyTo2M }}
          hasResults={true}
        />
      </div>)}


      {activeCalc === 'offers' && (<div className="mt-6">
        <FocusOfferCalculator onOpenHistory={() => setHistoryOpen(true)} />
      </div>)}

      {activeCalc === 'vacation' && (<div className="mt-6"><VacationCalculator /></div>)}
      {activeCalc === 'wedding' && (<div className="mt-6"><WeddingCalculator /></div>)}
      {activeCalc === 'honeymoon' && (<div className="mt-6"><HoneymoonCalculator /></div>)}
      {activeCalc === 'bigpurchase' && (<div className="mt-6"><BigPurchaseCalculator /></div>)}
      {activeCalc === 'holiday' && (<div className="mt-6"><HolidayGiftCalculator /></div>)}
      {activeCalc === 'baby' && (<div className="mt-6"><BabyCostCalculator /></div>)}
      {activeCalc === 'carafford' && (<div className="mt-6"><CarAffordabilityCalculator /></div>)}
      {activeCalc === 'truecost' && (<div className="mt-6"><TrueCostLoanCalculator /></div>)}
      {activeCalc === 'pricing' && (<div className="mt-6"><PricingCalculator /></div>)}
      {activeCalc === 'currency' && <CurrencyExchangeCalculator />}
      
      <CalculatorHistory open={historyOpen} onOpenChange={setHistoryOpen} onRestore={handleRestore} />
    </motion.div>
    </TooltipProvider>
  );
};

export default Calculators;
