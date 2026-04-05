import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Home, DollarSign, TrendingUp, MapPin,
  ChevronDown, ChevronUp, Info, ArrowRight, Scale,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── State Data ───
// Real median property tax rates, insurance rates, and state income tax rates by state
const STATE_DATA: Record<string, { label: string; propertyTax: number; insurance: number; stateTax: number }> = {
  '': { label: 'Select a state…', propertyTax: 1.35, insurance: 0.55, stateTax: 0 },
  AL: { label: 'Alabama', propertyTax: 0.41, insurance: 0.77, stateTax: 5 },
  AK: { label: 'Alaska', propertyTax: 1.19, insurance: 0.70, stateTax: 0 },
  AZ: { label: 'Arizona', propertyTax: 0.62, insurance: 0.52, stateTax: 2.5 },
  AR: { label: 'Arkansas', propertyTax: 0.62, insurance: 0.76, stateTax: 4.4 },
  CA: { label: 'California', propertyTax: 0.74, insurance: 0.47, stateTax: 9.3 },
  CO: { label: 'Colorado', propertyTax: 0.51, insurance: 0.65, stateTax: 4.4 },
  CT: { label: 'Connecticut', propertyTax: 2.14, insurance: 0.52, stateTax: 5 },
  DE: { label: 'Delaware', propertyTax: 0.57, insurance: 0.38, stateTax: 5.5 },
  DC: { label: 'Washington D.C.', propertyTax: 0.56, insurance: 0.40, stateTax: 6 },
  FL: { label: 'Florida', propertyTax: 0.89, insurance: 1.55, stateTax: 0 },
  GA: { label: 'Georgia', propertyTax: 0.92, insurance: 0.60, stateTax: 5.49 },
  HI: { label: 'Hawaii', propertyTax: 0.28, insurance: 0.35, stateTax: 7.2 },
  ID: { label: 'Idaho', propertyTax: 0.69, insurance: 0.44, stateTax: 5.8 },
  IL: { label: 'Illinois', propertyTax: 2.27, insurance: 0.52, stateTax: 4.95 },
  IN: { label: 'Indiana', propertyTax: 0.85, insurance: 0.46, stateTax: 3.15 },
  IA: { label: 'Iowa', propertyTax: 1.57, insurance: 0.48, stateTax: 5.7 },
  KS: { label: 'Kansas', propertyTax: 1.41, insurance: 0.73, stateTax: 5.7 },
  KY: { label: 'Kentucky', propertyTax: 0.86, insurance: 0.55, stateTax: 4.5 },
  LA: { label: 'Louisiana', propertyTax: 0.55, insurance: 1.30, stateTax: 4.25 },
  ME: { label: 'Maine', propertyTax: 1.36, insurance: 0.42, stateTax: 7.15 },
  MD: { label: 'Maryland', propertyTax: 1.09, insurance: 0.45, stateTax: 5 },
  MA: { label: 'Massachusetts', propertyTax: 1.23, insurance: 0.48, stateTax: 5 },
  MI: { label: 'Michigan', propertyTax: 1.54, insurance: 0.50, stateTax: 4.25 },
  MN: { label: 'Minnesota', propertyTax: 1.12, insurance: 0.53, stateTax: 7.05 },
  MS: { label: 'Mississippi', propertyTax: 0.81, insurance: 0.88, stateTax: 5 },
  MO: { label: 'Missouri', propertyTax: 0.97, insurance: 0.66, stateTax: 4.95 },
  MT: { label: 'Montana', propertyTax: 0.84, insurance: 0.55, stateTax: 5.9 },
  NE: { label: 'Nebraska', propertyTax: 1.73, insurance: 0.62, stateTax: 5.84 },
  NV: { label: 'Nevada', propertyTax: 0.60, insurance: 0.46, stateTax: 0 },
  NH: { label: 'New Hampshire', propertyTax: 2.18, insurance: 0.42, stateTax: 0 },
  NJ: { label: 'New Jersey', propertyTax: 2.49, insurance: 0.42, stateTax: 6.37 },
  NM: { label: 'New Mexico', propertyTax: 0.80, insurance: 0.55, stateTax: 4.9 },
  NY: { label: 'New York', propertyTax: 1.72, insurance: 0.48, stateTax: 6.85 },
  NC: { label: 'North Carolina', propertyTax: 0.84, insurance: 0.50, stateTax: 4.5 },
  ND: { label: 'North Dakota', propertyTax: 0.98, insurance: 0.55, stateTax: 1.95 },
  OH: { label: 'Ohio', propertyTax: 1.56, insurance: 0.44, stateTax: 3.5 },
  OK: { label: 'Oklahoma', propertyTax: 0.90, insurance: 1.05, stateTax: 4.75 },
  OR: { label: 'Oregon', propertyTax: 0.97, insurance: 0.38, stateTax: 8.75 },
  PA: { label: 'Pennsylvania', propertyTax: 1.58, insurance: 0.38, stateTax: 3.07 },
  RI: { label: 'Rhode Island', propertyTax: 1.63, insurance: 0.50, stateTax: 4.75 },
  SC: { label: 'South Carolina', propertyTax: 0.57, insurance: 0.68, stateTax: 6.4 },
  SD: { label: 'South Dakota', propertyTax: 1.31, insurance: 0.55, stateTax: 0 },
  TN: { label: 'Tennessee', propertyTax: 0.71, insurance: 0.62, stateTax: 0 },
  TX: { label: 'Texas', propertyTax: 1.80, insurance: 1.05, stateTax: 0 },
  UT: { label: 'Utah', propertyTax: 0.63, insurance: 0.40, stateTax: 4.65 },
  VT: { label: 'Vermont', propertyTax: 1.90, insurance: 0.40, stateTax: 6.6 },
  VA: { label: 'Virginia', propertyTax: 0.82, insurance: 0.40, stateTax: 5.75 },
  WA: { label: 'Washington', propertyTax: 1.03, insurance: 0.42, stateTax: 0 },
  WV: { label: 'West Virginia', propertyTax: 0.58, insurance: 0.55, stateTax: 5.12 },
  WI: { label: 'Wisconsin', propertyTax: 1.85, insurance: 0.40, stateTax: 5.3 },
  WY: { label: 'Wyoming', propertyTax: 0.61, insurance: 0.55, stateTax: 0 },
};

// ─── Inputs ───
interface RentVsBuyInputs {
  state: string;
  homePrice: number;
  monthlyRent: number;
  yearsToStay: number;
  mortgageRate: number;
  downPaymentPercent: number;
  mortgageTerm: number;
  pmiRate: number;
  homeAppreciation: number;
  rentGrowth: number;
  investmentReturn: number;
  inflationRate: number;
  filingStatus: 'single' | 'joint';
  propertyTaxRate: number;
  marginalTaxRate: number;
  otherItemizedDeductions: number;
  buyClosingCostPercent: number;
  sellClosingCostPercent: number;
  maintenanceRate: number;
  homeInsuranceRate: number;
  extraMonthlyUtilities: number;
  hoaMonthly: number;
  hoaDeductionPercent: number;
  securityDepositMonths: number;
  brokerFeePercent: number;
  rentersInsuranceRate: number;
}

const DEFAULTS: RentVsBuyInputs = {
  state: '',
  homePrice: 500000,
  monthlyRent: 2000,
  yearsToStay: 10,
  mortgageRate: 6.75,
  downPaymentPercent: 20,
  mortgageTerm: 30,
  pmiRate: 0,
  homeAppreciation: 3,
  rentGrowth: 3,
  investmentReturn: 4.5,
  inflationRate: 3,
  filingStatus: 'single',
  propertyTaxRate: 1.35,
  marginalTaxRate: 20,
  otherItemizedDeductions: 0,
  buyClosingCostPercent: 4,
  sellClosingCostPercent: 6,
  maintenanceRate: 1,
  homeInsuranceRate: 0.55,
  extraMonthlyUtilities: 100,
  hoaMonthly: 0,
  hoaDeductionPercent: 0,
  securityDepositMonths: 1,
  brokerFeePercent: 0,
  rentersInsuranceRate: 1,
};

// ─── Engine ───
function calcMonthlyMortgage(principal: number, annualRate: number, months: number) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function runRentVsBuy(inputs: RentVsBuyInputs) {
  const {
    homePrice, monthlyRent, yearsToStay, mortgageRate, downPaymentPercent,
    mortgageTerm, pmiRate, homeAppreciation, rentGrowth, investmentReturn,
    inflationRate, filingStatus, propertyTaxRate, marginalTaxRate,
    otherItemizedDeductions, buyClosingCostPercent, sellClosingCostPercent,
    maintenanceRate, homeInsuranceRate, extraMonthlyUtilities, hoaMonthly,
    hoaDeductionPercent, securityDepositMonths, brokerFeePercent, rentersInsuranceRate,
  } = inputs;

  const downPayment = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPayment;
  const monthlyPayment = calcMonthlyMortgage(loanAmount, mortgageRate, mortgageTerm * 12);
  const mr = mortgageRate / 100 / 12;
  const totalMonths = yearsToStay * 12;
  const monthlyInvestReturn = Math.pow(1 + investmentReturn / 100, 1 / 12) - 1;
  const monthlyRentGrowth = Math.pow(1 + rentGrowth / 100, 1 / 12) - 1;
  const monthlyHomeAppreciation = Math.pow(1 + homeAppreciation / 100, 1 / 12) - 1;
  const standardDeduction = filingStatus === 'joint' ? 30000 : 15000;

  const buyInitialCosts = downPayment + homePrice * (buyClosingCostPercent / 100);
  let loanBalance = loanAmount;
  let homeValue = homePrice;
  let buyRecurringCosts = 0;
  let totalTaxSavings = 0;
  let buyerOpportunityPool = buyInitialCosts;

  const securityDeposit = monthlyRent * securityDepositMonths;
  const brokerFee = monthlyRent * 12 * (brokerFeePercent / 100);
  const rentInitialCosts = securityDeposit + brokerFee;
  let currentRent = monthlyRent;
  let rentRecurringCosts = 0;
  let renterOpportunityPool = rentInitialCosts;

  const yearlyData: { year: number; buyTotal: number; rentTotal: number; advantage: number }[] = [];
  let annualMortgageInterest = 0, annualPropertyTax = 0, annualHoaDeductible = 0;

  for (let m = 1; m <= totalMonths; m++) {
    const interestPayment = loanBalance * mr;
    const principalPayment = Math.min(monthlyPayment - interestPayment, loanBalance);
    loanBalance = Math.max(0, loanBalance - principalPayment);
    annualMortgageInterest += interestPayment;

    const monthlyPropTax = (homeValue * (propertyTaxRate / 100)) / 12;
    annualPropertyTax += monthlyPropTax;
    const monthlyInsurance = (homeValue * (homeInsuranceRate / 100)) / 12;
    const monthlyMaint = (homeValue * (maintenanceRate / 100)) / 12;
    annualHoaDeductible += hoaMonthly * (hoaDeductionPercent / 100);

    let monthlyPmiCost = 0;
    if (loanBalance / homeValue > 0.80) {
      monthlyPmiCost = (loanAmount * (pmiRate / 100)) / 12;
    }

    const buyMonthlyCost = monthlyPayment + monthlyPropTax + monthlyInsurance + monthlyMaint + hoaMonthly + extraMonthlyUtilities + monthlyPmiCost;
    buyRecurringCosts += buyMonthlyCost;
    buyerOpportunityPool *= (1 + monthlyInvestReturn);
    buyerOpportunityPool += buyMonthlyCost;
    homeValue *= (1 + monthlyHomeAppreciation);

    const monthlyRentersIns = (currentRent * 12 * (rentersInsuranceRate / 100)) / 12;
    const rentMonthlyCost = currentRent + monthlyRentersIns;
    rentRecurringCosts += rentMonthlyCost;
    renterOpportunityPool *= (1 + monthlyInvestReturn);
    renterOpportunityPool += rentMonthlyCost;
    currentRent *= (1 + monthlyRentGrowth);

    if (m % 12 === 0) {
      const year = m / 12;
      const itemizedDeductions = annualMortgageInterest + annualPropertyTax + annualHoaDeductible + otherItemizedDeductions;
      const taxBenefit = Math.max(0, itemizedDeductions - standardDeduction) * (marginalTaxRate / 100);
      totalTaxSavings += taxBenefit;
      annualMortgageInterest = 0; annualPropertyTax = 0; annualHoaDeductible = 0;

      const sellCosts = homeValue * (sellClosingCostPercent / 100);
      const buyNetProceeds = homeValue - loanBalance - sellCosts;
      const buyOpCost = buyerOpportunityPool - buyInitialCosts - buyRecurringCosts;
      const buyTotal = buyInitialCosts + buyRecurringCosts + buyOpCost - totalTaxSavings - buyNetProceeds;
      const rentOpCost = renterOpportunityPool - rentInitialCosts - rentRecurringCosts;
      const rentTotal = rentInitialCosts + rentRecurringCosts + rentOpCost - securityDeposit;

      yearlyData.push({ year, buyTotal, rentTotal, advantage: rentTotal - buyTotal });
    }
  }

  const lastYear = yearlyData[yearlyData.length - 1];
  const finalAdvantage = lastYear?.advantage ?? 0;

  let breakevenYear = -1;
  for (let i = 1; i < yearlyData.length; i++) {
    const prev = yearlyData[i - 1].advantage;
    const curr = yearlyData[i].advantage;
    if (prev <= 0 && curr > 0) {
      const frac = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
      breakevenYear = yearlyData[i - 1].year + frac;
      break;
    }
  }

  const sellCosts = homeValue * (sellClosingCostPercent / 100);
  const buyNetProceeds = homeValue - loanBalance - sellCosts;
  const buyOpCost = buyerOpportunityPool - buyInitialCosts - buyRecurringCosts;
  const rentOpCost = renterOpportunityPool - rentInitialCosts - rentRecurringCosts;

  return {
    monthlyPayment, downPayment, loanAmount,
    buyingIsBetter: finalAdvantage > 0,
    finalAdvantage: Math.abs(finalAdvantage),
    breakevenYear, yearlyData,
    buy: {
      initialCosts: buyInitialCosts,
      recurringCosts: buyRecurringCosts - totalTaxSavings,
      opportunityCost: buyOpCost,
      netProceeds: -buyNetProceeds,
      total: lastYear?.buyTotal ?? 0,
    },
    rent: {
      initialCosts: rentInitialCosts,
      recurringCosts: rentRecurringCosts,
      opportunityCost: rentOpCost,
      netProceeds: -securityDeposit,
      total: lastYear?.rentTotal ?? 0,
    },
  };
}

// ─── UI Components ───

const InteractiveSlider = ({
  label, value, onChange, min, max, step, suffix, prefix, formatValue, hint, tooltip,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string; prefix?: string;
  formatValue?: (v: number) => string; hint?: string; tooltip?: string;
}) => (
  <div className="group space-y-2 py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors -mx-3">
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Label className="text-xs font-medium text-foreground">{label}</Label>
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3 w-3 text-muted-foreground/60 cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[220px] text-xs"><p>{tooltip}</p></TooltipContent>
          </Tooltip>
        )}
      </div>
      <span className="text-sm font-semibold font-mono text-foreground tabular-nums">
        {prefix}{formatValue ? formatValue(value) : value.toLocaleString()}{suffix}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min} max={max} step={step}
      className="py-0.5"
    />
    {hint && <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>}
  </div>
);

interface RentVsBuyCalculatorProps {
  onOpenHistory: () => void;
}

export default function RentVsBuyCalculator({ onOpenHistory }: RentVsBuyCalculatorProps) {
  const { formatCurrency } = useCurrency();
  const [inputs, setInputs] = useState<RentVsBuyInputs>(DEFAULTS);
  const [showMortgage, setShowMortgage] = useState(false);
  const [showFuture, setShowFuture] = useState(false);
  const [showTaxes, setShowTaxes] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [showRenting, setShowRenting] = useState(false);

  const update = (key: keyof RentVsBuyInputs, value: number | string) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const handleStateChange = (stateCode: string) => {
    const data = STATE_DATA[stateCode];
    if (!data || stateCode === '') return;
    setInputs(prev => ({
      ...prev,
      state: stateCode,
      propertyTaxRate: data.propertyTax,
      homeInsuranceRate: data.insurance,
      marginalTaxRate: Math.min(50, Math.round(prev.marginalTaxRate + data.stateTax)),
    }));
  };

  const result = useMemo(() => runRentVsBuy(inputs), [inputs]);

  const chartData = result.yearlyData.map(d => ({
    name: `Yr ${d.year}`,
    year: d.year,
    Buy: Math.round(d.buyTotal),
    Rent: Math.round(d.rentTotal),
  }));

  // Inline verdict for sliders
  const verdictColor = result.buyingIsBetter ? 'text-prism-teal' : 'text-prism-amber';
  const verdictBg = result.buyingIsBetter
    ? 'from-prism-teal/12 to-prism-lime/8 border-prism-teal/20'
    : 'from-prism-amber/12 to-prism-rose/8 border-prism-amber/20';

  const AdvancedSection = ({
    title, open, onToggle, children,
  }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) => (
    <div className="border-t border-border/30">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-1 pb-3"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return (
    <>
      <CalculatorGuide
        title="Rent vs. Buy Calculator"
        icon={Home}
        iconColor="text-prism-teal"
        ttsScript="The Rent vs Buy Calculator helps you decide whether it's financially better to rent or buy a home. Modeled after the New York Times Upshot calculator, it considers mortgage payments, property taxes, maintenance, insurance, closing costs, opportunity cost of your down payment, tax deductions, PMI, and more."
        instructions={[
          'Select your state to auto-fill property tax and insurance rates',
          'Set the home price and comparable monthly rent',
          'Choose how long you plan to stay',
          'Expand sections to fine-tune mortgage, taxes, and closing costs',
          'The verdict updates instantly as you adjust each slider',
        ]}
      />
      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Short-Term (1–3 yrs)', description: 'Renting almost always wins. Closing costs eat equity before appreciation kicks in.' },
          { title: 'Long-Term (7+ yrs)', description: 'Buying usually wins. Appreciation compounds and you escape rising rents.' },
          { title: 'High-Growth Market', description: 'Bump appreciation to 5–6%. Buying breaks even faster — but past performance ≠ future results.' },
          { title: 'High Rates (7%+)', description: 'Monthly payments are steep, but opportunity cost shrinks too. Run both scenarios.' },
        ]}
        pitfalls={[
          { title: 'Ignoring Opportunity Cost', description: 'Your down payment could earn 4–7% invested. This calculator models that.' },
          { title: 'Underestimating Maintenance', description: 'Budget 1–2% of home value/year. A $500k home = $5k–$10k annually.' },
          { title: 'Tax Deduction Fantasy', description: 'Only helps if itemized deductions exceed the standard deduction ($15k/$30k).' },
          { title: 'Forgetting Selling Costs', description: 'Agent fees + closing run 5–6%. On a $550k sale, that\'s $33k gone.' },
        ]}
      />

      {/* ── Live Verdict Banner ── */}
      <motion.div
        layout
        className={cn(
          'mt-4 p-4 rounded-2xl border bg-gradient-to-r flex flex-col sm:flex-row items-center justify-between gap-3',
          verdictBg
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl bg-background/60', verdictColor)}>
            {result.buyingIsBetter ? <Home className="h-5 w-5" /> : <DollarSign className="h-5 w-5" />}
          </div>
          <div>
            <p className={cn('font-display text-xl font-extrabold', verdictColor)}>
              {result.buyingIsBetter ? 'Buying is cheaper' : 'Renting saves you'}
              <span className="text-foreground ml-2">
                <AnimatedNumber value={result.finalAdvantage} formatFn={formatCurrency} />
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              over {inputs.yearsToStay} year{inputs.yearsToStay !== 1 ? 's' : ''}
              {result.breakevenYear > 0 && ` · Buying breaks even at ~${result.breakevenYear.toFixed(1)} years`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Scale className="h-3.5 w-3.5" />
          <span>{formatCurrency(result.buy.total)}</span>
          <span>vs</span>
          <span>{formatCurrency(result.rent.total)}</span>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5 mt-6">
        {/* ─── LEFT: INPUTS (3 cols) ─── */}
        <div className="lg:col-span-3 space-y-4">
          {/* The Basics */}
          <Card className="prism-card-shine border-border/50 overflow-hidden">
            <div className="bg-gradient-to-r from-prism-teal/10 to-prism-sky/5 px-5 py-3 border-b border-border/30">
              <h3 className="font-display text-sm font-bold flex items-center gap-2">
                <Home className="h-4 w-4 text-prism-teal" /> The Basics
              </h3>
              <p className="text-[11px] text-muted-foreground">The most important factors — start here.</p>
            </div>
            <CardContent className="pt-4 space-y-1">
              {/* State selector */}
              <div className="py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors -mx-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-prism-violet" />
                    <Label className="text-xs font-medium">State</Label>
                  </div>
                </div>
                <Select value={inputs.state} onValueChange={handleStateChange}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select your state for accurate rates…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {Object.entries(STATE_DATA).filter(([k]) => k !== '').map(([code, data]) => (
                      <SelectItem key={code} value={code}>
                        <span className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground w-6">{code}</span>
                          {data.label}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            Tax {data.propertyTax}% · Ins {data.insurance}%
                          </span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {inputs.state && (
                  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[10px] text-prism-teal mt-1.5">
                    ✓ Property tax, insurance, and state tax updated for {STATE_DATA[inputs.state]?.label}
                  </motion.p>
                )}
              </div>

              <InteractiveSlider label="Home Price" value={inputs.homePrice} onChange={v => update('homePrice', v)}
                min={100000} max={2000000} step={10000} prefix="$"
                tooltip="A very important factor, but not the only one. Our estimate improves as you enter more details." />
              <InteractiveSlider label="Monthly Rent" value={inputs.monthlyRent} onChange={v => update('monthlyRent', v)}
                min={500} max={20000} step={50} prefix="$"
                tooltip="Set a target rent for a comparable home to allow direct comparison of costs."
                hint="What you'd pay for a comparable rental" />
              <InteractiveSlider label="How Long Will You Stay?" value={inputs.yearsToStay} onChange={v => update('yearsToStay', v)}
                min={1} max={40} step={1} suffix=" yrs"
                tooltip="Buying tends to be more appealing the longer you stay because upfront fees are spread over many years."
                hint={inputs.yearsToStay <= 3 ? '⚠️ Short stays usually favor renting' : inputs.yearsToStay >= 7 ? '✓ Longer stays typically favor buying' : 'The break-even is usually 4–7 years'} />
            </CardContent>
          </Card>

          {/* Collapsible sections */}
          <Card className="prism-card-shine border-border/50">
            <CardContent className="pt-4">
              <AdvancedSection title="Mortgage Details" open={showMortgage} onToggle={() => setShowMortgage(!showMortgage)}>
                <InteractiveSlider label="Mortgage Rate" value={inputs.mortgageRate} onChange={v => update('mortgageRate', v)}
                  min={0} max={15} step={0.125} suffix="%"
                  formatValue={v => v.toFixed(2)}
                  hint={`${formatCurrency(result.monthlyPayment)}/mo`}
                  tooltip="The calculator assumes a fixed-rate mortgage." />
                <InteractiveSlider label="Down Payment" value={inputs.downPaymentPercent}
                  onChange={v => {
                    update('downPaymentPercent', v);
                    if (v < 20 && inputs.pmiRate === 0) update('pmiRate', 0.5);
                    if (v >= 20) update('pmiRate', 0);
                  }}
                  min={0} max={100} step={1}
                  formatValue={v => `${v}%`}
                  hint={formatCurrency(inputs.homePrice * inputs.downPaymentPercent / 100)} />
                <InteractiveSlider label="Loan Term" value={inputs.mortgageTerm} onChange={v => update('mortgageTerm', v)}
                  min={10} max={30} step={5} suffix=" yrs" />
                <InteractiveSlider label="PMI" value={inputs.pmiRate} onChange={v => update('pmiRate', v)}
                  min={0} max={2} step={0.05} suffix="%"
                  formatValue={v => v.toFixed(2)}
                  tooltip="Private mortgage insurance is required when down payment is less than 20%."
                  hint={inputs.downPaymentPercent < 20 ? `${formatCurrency((inputs.homePrice * (1 - inputs.downPaymentPercent / 100)) * inputs.pmiRate / 100 / 12)}/mo (first yr.)` : 'Not required with 20%+ down'} />
              </AdvancedSection>

              <AdvancedSection title="What Does the Future Hold?" open={showFuture} onToggle={() => setShowFuture(!showFuture)}>
                <InteractiveSlider label="Home Price Growth" value={inputs.homeAppreciation} onChange={v => update('homeAppreciation', v)}
                  min={-5} max={15} step={0.5} suffix="%/yr"
                  tooltip="How much home prices, rents and stock prices change can have a large impact on your outcome." />
                <InteractiveSlider label="Rent Growth" value={inputs.rentGrowth} onChange={v => update('rentGrowth', v)}
                  min={-5} max={15} step={0.5} suffix="%/yr" />
                <InteractiveSlider label="Investment Return" value={inputs.investmentReturn} onChange={v => update('investmentReturn', v)}
                  min={-10} max={20} step={0.5} suffix="%/yr"
                  tooltip="The return you could earn by investing your down payment instead of buying." />
                <InteractiveSlider label="Inflation" value={inputs.inflationRate} onChange={v => update('inflationRate', v)}
                  min={-5} max={10} step={0.5} suffix="%/yr" />
              </AdvancedSection>

              <AdvancedSection title="Taxes" open={showTaxes} onToggle={() => setShowTaxes(!showTaxes)}>
                <div className="py-2 px-3 -mx-3">
                  <Label className="text-xs font-medium">Filing Status</Label>
                  <div className="flex gap-2 mt-1.5">
                    {(['single', 'joint'] as const).map(s => (
                      <button key={s} onClick={() => setInputs(prev => ({ ...prev, filingStatus: s }))}
                        className={cn(
                          'flex-1 rounded-lg px-3 py-2 text-xs font-medium border transition-all',
                          inputs.filingStatus === s
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted/30 text-muted-foreground border-border hover:bg-muted/60'
                        )}>
                        {s === 'single' ? 'Individual' : 'Joint Return'}
                      </button>
                    ))}
                  </div>
                </div>
                <InteractiveSlider label="Property Tax" value={inputs.propertyTaxRate} onChange={v => update('propertyTaxRate', v)}
                  min={0} max={10} step={0.05} suffix="%"
                  formatValue={v => v.toFixed(2)}
                  hint={`${formatCurrency(inputs.homePrice * inputs.propertyTaxRate / 100)} first year`}
                  tooltip="Property taxes and mortgage-interest costs are significant but also deductible." />
                <InteractiveSlider label="Marginal Tax Rate" value={inputs.marginalTaxRate} onChange={v => update('marginalTaxRate', v)}
                  min={0} max={50} step={1} suffix="%"
                  tooltip="The higher your marginal tax rate, the bigger your mortgage interest deduction." />
                <InteractiveSlider label="Other Itemized Deductions" value={inputs.otherItemizedDeductions} onChange={v => update('otherItemizedDeductions', v)}
                  min={0} max={60000} step={1000} prefix="$" />
              </AdvancedSection>

              <AdvancedSection title="Closing Costs" open={showCosts} onToggle={() => setShowCosts(!showCosts)}>
                <InteractiveSlider label="Buying Costs" value={inputs.buyClosingCostPercent} onChange={v => update('buyClosingCostPercent', v)}
                  min={0} max={10} step={0.5} suffix="%"
                  hint={formatCurrency(inputs.homePrice * inputs.buyClosingCostPercent / 100)} />
                <InteractiveSlider label="Selling Costs" value={inputs.sellClosingCostPercent} onChange={v => update('sellClosingCostPercent', v)}
                  min={0} max={10} step={0.5} suffix="%"
                  tooltip="Includes agent commissions, transfer taxes, and other fees." />
                <InteractiveSlider label="Maintenance/Renovation" value={inputs.maintenanceRate} onChange={v => update('maintenanceRate', v)}
                  min={0} max={10} step={0.25} suffix="%/yr"
                  hint={`${formatCurrency(inputs.homePrice * inputs.maintenanceRate / 100)} first year`} />
                <InteractiveSlider label="Homeowner's Insurance" value={inputs.homeInsuranceRate} onChange={v => update('homeInsuranceRate', v)}
                  min={0} max={10} step={0.05} suffix="%/yr"
                  formatValue={v => v.toFixed(2)}
                  hint={`${formatCurrency(inputs.homePrice * inputs.homeInsuranceRate / 100)} first year`} />
                <InteractiveSlider label="Extra Monthly Utilities" value={inputs.extraMonthlyUtilities} onChange={v => update('extraMonthlyUtilities', v)}
                  min={0} max={2000} step={25} prefix="$" suffix="/mo" />
                <InteractiveSlider label="HOA / Common Fees" value={inputs.hoaMonthly} onChange={v => update('hoaMonthly', v)}
                  min={0} max={8000} step={25} prefix="$" suffix="/mo" />
              </AdvancedSection>

              <AdvancedSection title="Additional Renting Costs" open={showRenting} onToggle={() => setShowRenting(!showRenting)}>
                <InteractiveSlider label="Security Deposit" value={inputs.securityDepositMonths} onChange={v => update('securityDepositMonths', v)}
                  min={0} max={12} step={1} suffix=" mo"
                  hint={formatCurrency(inputs.monthlyRent * inputs.securityDepositMonths)} />
                <InteractiveSlider label="Broker's Fee" value={inputs.brokerFeePercent} onChange={v => update('brokerFeePercent', v)}
                  min={0} max={50} step={1} suffix="%"
                  hint={formatCurrency(inputs.monthlyRent * 12 * inputs.brokerFeePercent / 100)} />
                <InteractiveSlider label="Renter's Insurance" value={inputs.rentersInsuranceRate} onChange={v => update('rentersInsuranceRate', v)}
                  min={0} max={10} step={0.25} suffix="%"
                  formatValue={v => v.toFixed(2)}
                  hint={`${formatCurrency(inputs.monthlyRent * 12 * inputs.rentersInsuranceRate / 100)} first year`} />
              </AdvancedSection>
            </CardContent>
          </Card>
        </div>

        {/* ─── RIGHT: RESULTS (2 cols) ─── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Cost Comparison Table */}
          <Card className="prism-card-shine border-border/50 overflow-hidden">
            <div className="bg-gradient-to-r from-prism-navy/8 to-prism-indigo/5 px-5 py-3 border-b border-border/30">
              <h3 className="font-display text-sm font-bold">Cost Breakdown</h3>
              <p className="text-[10px] text-muted-foreground">{inputs.yearsToStay}-year comparison</p>
            </div>
            <CardContent className="pt-3 pb-4">
              {/* Header */}
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 mb-1 border-b border-border/40">
                <span className="flex-1" />
                <span className="w-24 text-right text-prism-teal">Buy</span>
                <span className="w-24 text-right text-prism-amber">Rent</span>
              </div>
              {[
                { label: 'Initial costs', buy: result.buy.initialCosts, rent: result.rent.initialCosts },
                { label: 'Recurring costs', buy: result.buy.recurringCosts, rent: result.rent.recurringCosts },
                { label: 'Opportunity costs', buy: result.buy.opportunityCost, rent: result.rent.opportunityCost },
                { label: 'Net proceeds', buy: result.buy.netProceeds, rent: result.rent.netProceeds },
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/15 last:border-0 text-xs">
                  <span className="text-muted-foreground flex-1">{row.label}</span>
                  <span className="font-mono w-24 text-right tabular-nums">{formatCurrency(row.buy)}</span>
                  <span className="font-mono w-24 text-right tabular-nums">{formatCurrency(row.rent)}</span>
                </div>
              ))}
              {/* Total */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t-2 border-border/50 text-sm font-bold">
                <span className="flex-1 text-xs uppercase tracking-wider">Total</span>
                <span className={cn('font-mono w-24 text-right tabular-nums text-xs', result.buyingIsBetter && 'text-prism-teal')}>
                  {formatCurrency(result.buy.total)}
                </span>
                <span className={cn('font-mono w-24 text-right tabular-nums text-xs', !result.buyingIsBetter && 'text-prism-amber')}>
                  {formatCurrency(result.rent.total)}
                </span>
              </div>

              {/* Visual bar comparison */}
              <div className="mt-4 space-y-1.5">
                {[
                  { label: 'Buy', value: result.buy.total, color: 'bg-prism-teal' },
                  { label: 'Rent', value: result.rent.total, color: 'bg-prism-amber' },
                ].map(bar => {
                  const maxVal = Math.max(result.buy.total, result.rent.total);
                  const pct = maxVal > 0 ? (bar.value / maxVal) * 100 : 0;
                  return (
                    <div key={bar.label} className="flex items-center gap-2 text-xs">
                      <span className="w-8 text-muted-foreground font-medium">{bar.label}</span>
                      <div className="flex-1 h-5 bg-muted/50 rounded-md overflow-hidden">
                        <motion.div
                          className={cn('h-full rounded-md', bar.color)}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(2, pct)}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chart */}
          {chartData.length > 1 && (
            <Card className="prism-card-shine border-border/50 overflow-hidden">
              <div className="px-5 py-3 border-b border-border/30">
                <h3 className="font-display text-sm font-bold">Total Cost Over Time</h3>
              </div>
              <CardContent className="pt-3 pb-4">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <defs>
                        <linearGradient id="buyGradRvB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="rentGradRvB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--prism-amber))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--prism-amber))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="Buy" stroke="hsl(var(--prism-teal))" fill="url(#buyGradRvB)" strokeWidth={2.5} dot={false} />
                      <Area type="monotone" dataKey="Rent" stroke="hsl(var(--prism-amber))" fill="url(#rentGradRvB)" strokeWidth={2.5} dot={false} />
                      {result.breakevenYear > 0 && result.breakevenYear <= inputs.yearsToStay && (
                        <ReferenceLine x={`Yr ${Math.round(result.breakevenYear)}`} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-5 text-[11px] text-muted-foreground mt-2">
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-prism-teal inline-block" /> Buy</span>
                  <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-prism-amber inline-block" /> Rent</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Methodology */}
          <div className="text-[10px] text-muted-foreground px-1 leading-relaxed">
            The calculator tallies buying costs (mortgage, taxes, insurance, maintenance, closing costs, opportunity cost on down payment) 
            against renting (rent, insurance, broker fees) plus investing the difference. Tax deductions apply only when itemized deductions 
            exceed the standard deduction ({formatCurrency(inputs.filingStatus === 'joint' ? 30000 : 15000)}). All figures in current dollars.
          </div>

          <CalculatorActions
            calculatorType="rentvsbuy"
            inputs={inputs as any}
            results={{
              finalAdvantage: result.finalAdvantage,
              buyTotal: result.buy.total,
              rentTotal: result.rent.total,
              buyingIsBetter: result.buyingIsBetter,
            }}
            hasResults={true}
            summaryText={`# 🏠 Rent vs. Buy Calculator\n\n**Inputs**\n- **State:** ${inputs.state || 'Not selected'}\n- **Home Price:** ${formatCurrency(inputs.homePrice)}\n- **Down Payment:** ${inputs.downPaymentPercent}%\n- **Mortgage Rate:** ${inputs.mortgageRate}%\n- **Monthly Rent:** ${formatCurrency(inputs.monthlyRent)}\n- **Years to Stay:** ${inputs.yearsToStay}\n\n**Verdict: ${result.buyingIsBetter ? 'Buying is cheaper' : 'Renting saves you'} ${formatCurrency(result.finalAdvantage)}** over ${inputs.yearsToStay} years\n\n| | Buy | Rent |\n|---|---|---|\n| Initial costs | ${formatCurrency(result.buy.initialCosts)} | ${formatCurrency(result.rent.initialCosts)} |\n| Recurring costs | ${formatCurrency(result.buy.recurringCosts)} | ${formatCurrency(result.rent.recurringCosts)} |\n| Opportunity costs | ${formatCurrency(result.buy.opportunityCost)} | ${formatCurrency(result.rent.opportunityCost)} |\n| Net proceeds | ${formatCurrency(result.buy.netProceeds)} | ${formatCurrency(result.rent.netProceeds)} |\n| **Total** | **${formatCurrency(result.buy.total)}** | **${formatCurrency(result.rent.total)}** |${result.breakevenYear > 0 ? `\n\nBuying breaks even at ~${result.breakevenYear.toFixed(1)} years` : ''}`}
            onOpenHistory={onOpenHistory}
            printData={{
              inputs: [
                { label: 'State', value: inputs.state ? STATE_DATA[inputs.state]?.label || inputs.state : 'Not selected' },
                { label: 'Home Price', value: formatCurrency(inputs.homePrice) },
                { label: 'Down Payment', value: `${inputs.downPaymentPercent}% (${formatCurrency(result.downPayment)})` },
                { label: 'Mortgage Rate', value: `${inputs.mortgageRate}%` },
                { label: 'Monthly Rent', value: formatCurrency(inputs.monthlyRent) },
                { label: 'Years to Stay', value: `${inputs.yearsToStay}` },
              ],
              results: [
                { label: result.buyingIsBetter ? 'Buying saves' : 'Renting saves', value: formatCurrency(result.finalAdvantage), highlight: true },
                { label: 'Buy Total Cost', value: formatCurrency(result.buy.total) },
                { label: 'Rent Total Cost', value: formatCurrency(result.rent.total) },
                ...(result.breakevenYear > 0 ? [{ label: 'Break-even', value: `${result.breakevenYear.toFixed(1)} years` }] : []),
              ],
            }}
          />
        </div>
      </div>
    </>
  );
}
