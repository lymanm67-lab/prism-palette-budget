import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Home, DollarSign, TrendingUp,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';

// ─── Inputs ───

interface RentVsBuyInputs {
  // Basics
  homePrice: number;
  monthlyRent: number;
  yearsToStay: number;
  // Mortgage
  mortgageRate: number;
  downPaymentPercent: number;
  mortgageTerm: number;
  pmiRate: number; // annual % of loan, applies when down < 20%
  // Future
  homeAppreciation: number;
  rentGrowth: number;
  investmentReturn: number;
  inflationRate: number;
  // Taxes
  filingStatus: 'single' | 'joint';
  propertyTaxRate: number;
  marginalTaxRate: number;
  otherItemizedDeductions: number;
  // Closing
  buyClosingCostPercent: number;
  sellClosingCostPercent: number;
  // Maintenance & Fees
  maintenanceRate: number;
  homeInsuranceRate: number;
  extraMonthlyUtilities: number;
  hoaMonthly: number;
  hoaDeductionPercent: number;
  // Renting extras
  securityDepositMonths: number;
  brokerFeePercent: number;
  rentersInsuranceRate: number; // annual % of rent
}

const DEFAULTS: RentVsBuyInputs = {
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

// ─── Calculation Engine (NYT model) ───

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
  const monthlyInflation = Math.pow(1 + inflationRate / 100, 1 / 12) - 1;
  const monthlyRentGrowth = Math.pow(1 + rentGrowth / 100, 1 / 12) - 1;
  const monthlyHomeAppreciation = Math.pow(1 + homeAppreciation / 100, 1 / 12) - 1;

  // Standard deduction (2025 tax law approximation)
  const standardDeduction = filingStatus === 'joint' ? 30000 : 15000;

  // ─── BUY SIDE ───
  const buyInitialCosts = downPayment + homePrice * (buyClosingCostPercent / 100);
  let loanBalance = loanAmount;
  let homeValue = homePrice;
  let buyRecurringCosts = 0;
  let buyOpportunityCost = 0; // opportunity cost on initial + recurring
  let totalMortgageInterest = 0;
  let totalPropertyTax = 0;
  let totalInsurance = 0;
  let totalMaintenance = 0;
  let totalHoa = 0;
  let totalPmi = 0;
  let totalUtilities = 0;
  let totalTaxSavings = 0;

  // Track what buyer spent cumulatively (for opportunity cost)
  let buyerCashOutflows = buyInitialCosts;
  let buyerOpportunityPool = buyInitialCosts; // grows at investment rate

  // ─── RENT SIDE ───
  const securityDeposit = monthlyRent * securityDepositMonths;
  const brokerFee = monthlyRent * 12 * (brokerFeePercent / 100);
  const rentInitialCosts = securityDeposit + brokerFee;
  let currentRent = monthlyRent;
  let rentRecurringCosts = 0;
  let renterOpportunityPool = rentInitialCosts;

  const yearlyData: {
    year: number;
    buyTotal: number;
    rentTotal: number;
    advantage: number;
  }[] = [];

  // Annual accumulators for tax deduction calc
  let annualMortgageInterest = 0;
  let annualPropertyTax = 0;
  let annualHoaDeductible = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // ── Buy recurring ──
    const interestPayment = loanBalance * mr;
    const principalPayment = Math.min(monthlyPayment - interestPayment, loanBalance);
    loanBalance = Math.max(0, loanBalance - principalPayment);
    totalMortgageInterest += interestPayment;
    annualMortgageInterest += interestPayment;

    const monthlyPropTax = (homeValue * (propertyTaxRate / 100)) / 12;
    totalPropertyTax += monthlyPropTax;
    annualPropertyTax += monthlyPropTax;

    const monthlyInsurance = (homeValue * (homeInsuranceRate / 100)) / 12;
    totalInsurance += monthlyInsurance;

    const monthlyMaint = (homeValue * (maintenanceRate / 100)) / 12;
    totalMaintenance += monthlyMaint;

    totalHoa += hoaMonthly;
    annualHoaDeductible += hoaMonthly * (hoaDeductionPercent / 100);

    totalUtilities += extraMonthlyUtilities;

    // PMI: applies when LTV > 80%
    let monthlyPmiCost = 0;
    if (loanBalance / homeValue > 0.80) {
      monthlyPmiCost = (loanAmount * (pmiRate / 100)) / 12;
      totalPmi += monthlyPmiCost;
    }

    const buyMonthlyCost = monthlyPayment + monthlyPropTax + monthlyInsurance + monthlyMaint + hoaMonthly + extraMonthlyUtilities + monthlyPmiCost;
    buyRecurringCosts += buyMonthlyCost;

    // Buyer opportunity cost: what they could have earned investing instead
    buyerOpportunityPool *= (1 + monthlyInvestReturn);
    buyerOpportunityPool += buyMonthlyCost;

    homeValue *= (1 + monthlyHomeAppreciation);

    // ── Rent recurring ──
    const monthlyRentersIns = (currentRent * 12 * (rentersInsuranceRate / 100)) / 12;
    const rentMonthlyCost = currentRent + monthlyRentersIns;
    rentRecurringCosts += rentMonthlyCost;

    renterOpportunityPool *= (1 + monthlyInvestReturn);
    renterOpportunityPool += rentMonthlyCost;

    currentRent *= (1 + monthlyRentGrowth);

    // ── Year-end tax deduction calculation ──
    if (m % 12 === 0) {
      const year = m / 12;
      const itemizedDeductions = annualMortgageInterest + annualPropertyTax + annualHoaDeductible + otherItemizedDeductions;
      const taxBenefit = Math.max(0, itemizedDeductions - standardDeduction) * (marginalTaxRate / 100);
      totalTaxSavings += taxBenefit;

      // Reset annual accumulators
      annualMortgageInterest = 0;
      annualPropertyTax = 0;
      annualHoaDeductible = 0;

      // ── Compute totals for this year ──
      const sellCosts = homeValue * (sellClosingCostPercent / 100);
      const buyNetProceeds = homeValue - loanBalance - sellCosts;
      const buyOpCost = buyerOpportunityPool - buyInitialCosts - buyRecurringCosts;

      const buyTotal = buyInitialCosts + buyRecurringCosts + buyOpCost - totalTaxSavings - buyNetProceeds;

      const rentNetProceeds = securityDeposit; // get deposit back
      const rentOpCost = renterOpportunityPool - rentInitialCosts - rentRecurringCosts;
      const rentTotal = rentInitialCosts + rentRecurringCosts + rentOpCost - rentNetProceeds;

      const advantage = rentTotal - buyTotal; // positive = buying is cheaper

      yearlyData.push({ year, buyTotal, rentTotal, advantage });
    }
  }

  // Final totals
  const lastYear = yearlyData[yearlyData.length - 1];
  const finalAdvantage = lastYear?.advantage ?? 0;
  const buyingIsBetter = finalAdvantage > 0;

  // Breakeven
  let breakevenYear = -1;
  for (let i = 1; i < yearlyData.length; i++) {
    const prev = yearlyData[i - 1].advantage;
    const curr = yearlyData[i].advantage;
    if ((prev <= 0 && curr > 0)) {
      const frac = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr));
      breakevenYear = yearlyData[i - 1].year + frac;
      break;
    }
  }

  // Cost breakdown for the table
  const sellCosts = homeValue * (sellClosingCostPercent / 100);
  const buyNetProceeds = homeValue - loanBalance - sellCosts;
  const buyOpCost = buyerOpportunityPool - buyInitialCosts - buyRecurringCosts;
  const rentOpCost = renterOpportunityPool - rentInitialCosts - rentRecurringCosts;

  return {
    monthlyPayment,
    downPayment,
    loanAmount,
    buyingIsBetter,
    finalAdvantage: Math.abs(finalAdvantage),
    breakevenYear,
    yearlyData,
    // Breakdown
    buy: {
      initialCosts: buyInitialCosts,
      recurringCosts: buyRecurringCosts - totalTaxSavings,
      opportunityCost: buyOpCost,
      netProceeds: -buyNetProceeds, // negative = you get money back
      total: lastYear?.buyTotal ?? 0,
    },
    rent: {
      initialCosts: rentInitialCosts,
      recurringCosts: rentRecurringCosts,
      opportunityCost: rentOpCost,
      netProceeds: -securityDeposit,
      total: lastYear?.rentTotal ?? 0,
    },
    details: {
      totalMortgageInterest, totalPropertyTax, totalInsurance,
      totalMaintenance, totalHoa, totalPmi, totalUtilities, totalTaxSavings,
    },
  };
}

// ─── UI Components ───

const SliderField = ({
  label, value, onChange, min, max, step, suffix, prefix, formatValue, hint,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string; prefix?: string;
  formatValue?: (v: number) => string; hint?: string;
}) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between">
      <Label className="text-xs">{label}</Label>
      <span className="text-xs font-mono font-medium text-foreground">
        {prefix}{formatValue ? formatValue(value) : value.toLocaleString()}{suffix}
      </span>
    </div>
    <Slider
      value={[value]}
      onValueChange={([v]) => onChange(v)}
      min={min} max={max} step={step}
      className="py-1"
    />
    {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
  </div>
);

const CostRow = ({ label, buy, rent, formatCurrency: fmt }: { label: string; buy: number; rent: number; formatCurrency: (n: number) => string }) => (
  <div className="flex items-center justify-between text-sm py-1.5 border-b border-border/20 last:border-0">
    <span className="text-muted-foreground text-xs flex-1">{label}</span>
    <span className="font-mono text-xs w-24 text-right">{fmt(buy)}</span>
    <span className="font-mono text-xs w-24 text-right">{fmt(rent)}</span>
  </div>
);

interface RentVsBuyCalculatorProps {
  onOpenHistory: () => void;
}

export default function RentVsBuyCalculator({ onOpenHistory }: RentVsBuyCalculatorProps) {
  const { formatCurrency } = useCurrency();
  const [inputs, setInputs] = useState<RentVsBuyInputs>(DEFAULTS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const update = (key: keyof RentVsBuyInputs, value: number) =>
    setInputs(prev => ({ ...prev, [key]: value }));

  const result = useMemo(() => runRentVsBuy(inputs), [inputs]);

  const chartData = result.yearlyData.map(d => ({
    name: `Yr ${d.year}`,
    year: d.year,
    Buy: Math.round(d.buyTotal),
    Rent: Math.round(d.rentTotal),
  }));

  return (
    <>
      <CalculatorGuide
        title="Rent vs. Buy Calculator"
        icon={Home}
        iconColor="text-prism-teal"
        ttsScript="The Rent vs Buy Calculator helps you decide whether it's financially better to rent or buy a home. Modeled after the New York Times Upshot calculator, it considers mortgage payments, property taxes, maintenance, insurance, closing costs, opportunity cost of your down payment, tax deductions, PMI, and more. It compares the total cost of buying against renting and investing the difference over your chosen time horizon."
        instructions={[
          'Set the home price and your comparable monthly rent — these are the two most important inputs',
          'Choose how long you plan to stay — buying tends to win the longer you stay',
          'Adjust mortgage details: rate, down payment, and term',
          'Expand Advanced Settings for property taxes, insurance, appreciation rates, and more',
          'The cost breakdown table shows exactly where the money goes for each scenario',
          'The chart tracks cumulative total cost over time to show when buying breaks even',
        ]}
      />
      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Short-Term Stay (1–3 years)', description: 'Renting almost always wins. Buying closing costs (3–4%) and selling costs (6%) eat your equity before appreciation kicks in.' },
          { title: 'Long-Term Stay (7+ years)', description: 'Buying usually wins. Home appreciation compounds and you stop paying rent increases. The break-even is typically 4–7 years.' },
          { title: 'High-Growth Market', description: 'Increase home appreciation to 5–6%. Buying breaks even faster, but beware — past performance ≠ future results.' },
          { title: 'High Interest Rates', description: 'When mortgage rates are 7%+, the opportunity cost shrinks (investment returns matter less) but monthly payments are much higher.' },
        ]}
        pitfalls={[
          { title: 'Ignoring Opportunity Cost', description: 'Your down payment could earn 4–7% invested. This calculator accounts for that — most simple calculators don\'t.' },
          { title: 'Underestimating Maintenance', description: 'Budget 1–2% of home value annually. A $500k home costs $5k–$10k/year in upkeep.' },
          { title: 'Forgetting Selling Costs', description: 'Agent fees + closing costs typically run 5–6% of sale price. On a $550k home, that\'s $33k.' },
          { title: 'Tax Deduction Overestimation', description: 'You only benefit if your itemized deductions exceed the standard deduction ($15k single / $30k joint). Many buyers get no tax benefit.' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2 mt-4">
        {/* ─── INPUTS ─── */}
        <Card className="prism-card-shine border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Home className="h-5 w-5 text-prism-teal" /> Rent vs. Buy
            </CardTitle>
            <p className="text-xs text-muted-foreground">Adjust the basics, then fine-tune advanced settings for a more accurate estimate.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* The Basics */}
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">The Basics</p>
            <SliderField label="Home Price" value={inputs.homePrice} onChange={v => update('homePrice', v)}
              min={100000} max={2000000} step={10000} prefix="$" />
            <SliderField label="Monthly Rent" value={inputs.monthlyRent} onChange={v => update('monthlyRent', v)}
              min={500} max={20000} step={50} prefix="$"
              hint="Target rent for a comparable home — allows direct comparison" />
            <SliderField label="How Long Will You Stay?" value={inputs.yearsToStay} onChange={v => update('yearsToStay', v)}
              min={1} max={40} step={1} suffix=" years"
              hint="Buying tends to win the longer you stay — upfront costs are spread over more years" />

            {/* Mortgage */}
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-3 border-t border-border/30">Mortgage Details</p>
            <SliderField label="Mortgage Rate" value={inputs.mortgageRate} onChange={v => update('mortgageRate', v)}
              min={0} max={15} step={0.125} suffix="%"
              formatValue={v => `${v.toFixed(2)}%`}
              hint={`${formatCurrency(result.monthlyPayment)} per month`} />
            <SliderField label="Down Payment" value={inputs.downPaymentPercent} onChange={v => {
              update('downPaymentPercent', v);
              // Auto-set PMI when down < 20%
              if (v < 20 && inputs.pmiRate === 0) update('pmiRate', 0.5);
              if (v >= 20 && inputs.pmiRate > 0) update('pmiRate', 0);
            }}
              min={0} max={100} step={1} suffix="%"
              formatValue={v => `${v}% (${formatCurrency(inputs.homePrice * v / 100)})`} />
            <SliderField label="Loan Term" value={inputs.mortgageTerm} onChange={v => update('mortgageTerm', v)}
              min={10} max={30} step={5} suffix=" years" />
            <SliderField label="Private Mortgage Insurance (PMI)" value={inputs.pmiRate} onChange={v => update('pmiRate', v)}
              min={0} max={2} step={0.05} suffix="%"
              hint={inputs.downPaymentPercent < 20 ? 'Required when down payment is less than 20%' : 'Not required with 20%+ down payment'}
              formatValue={v => `${v.toFixed(2)}% (${formatCurrency((inputs.homePrice * (1 - inputs.downPaymentPercent / 100)) * v / 100 / 12)}/mo)`}
            />

            {/* Advanced */}
            <Button
              variant="ghost" size="sm"
              className="w-full text-xs text-muted-foreground gap-1"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced Options
            </Button>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-5 pt-2"
              >
                {/* Future */}
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">What Does the Future Hold?</p>
                <SliderField label="Home Price Growth Rate" value={inputs.homeAppreciation} onChange={v => update('homeAppreciation', v)}
                  min={-5} max={15} step={0.5} suffix="%/yr" />
                <SliderField label="Rent Growth Rate" value={inputs.rentGrowth} onChange={v => update('rentGrowth', v)}
                  min={-5} max={15} step={0.5} suffix="%/yr" />
                <SliderField label="Investment Return Rate" value={inputs.investmentReturn} onChange={v => update('investmentReturn', v)}
                  min={-10} max={20} step={0.5} suffix="%/yr"
                  hint="What you'd earn investing the down payment instead" />
                <SliderField label="Inflation Rate" value={inputs.inflationRate} onChange={v => update('inflationRate', v)}
                  min={-5} max={10} step={0.5} suffix="%/yr" />

                {/* Taxes */}
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-3 border-t border-border/30">Taxes</p>
                <div className="space-y-1">
                  <Label className="text-xs">Filing Status</Label>
                  <div className="flex gap-2">
                    {(['single', 'joint'] as const).map(s => (
                      <button key={s} onClick={() => setInputs(prev => ({ ...prev, filingStatus: s }))}
                        className={cn(
                          'flex-1 rounded-lg px-3 py-2 text-xs font-medium border transition-colors',
                          inputs.filingStatus === s
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/50 text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        {s === 'single' ? 'Individual Return' : 'Joint Return'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground">Standard deduction: {formatCurrency(inputs.filingStatus === 'joint' ? 30000 : 15000)}</p>
                </div>
                <SliderField label="Property Tax Rate" value={inputs.propertyTaxRate} onChange={v => update('propertyTaxRate', v)}
                  min={0} max={10} step={0.05} suffix="%"
                  formatValue={v => `${v.toFixed(2)}% (${formatCurrency(inputs.homePrice * v / 100)}/yr)`} />
                <SliderField label="Marginal Tax Rate" value={inputs.marginalTaxRate} onChange={v => update('marginalTaxRate', v)}
                  min={0} max={50} step={1} suffix="%" />
                <SliderField label="Other Itemized Deductions" value={inputs.otherItemizedDeductions} onChange={v => update('otherItemizedDeductions', v)}
                  min={0} max={60000} step={1000} prefix="$" />

                {/* Closing */}
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-3 border-t border-border/30">Closing Costs</p>
                <SliderField label="Costs of Buying Home" value={inputs.buyClosingCostPercent} onChange={v => update('buyClosingCostPercent', v)}
                  min={0} max={10} step={0.5} suffix="%"
                  formatValue={v => `${v}% (${formatCurrency(inputs.homePrice * v / 100)})`} />
                <SliderField label="Costs of Selling Home" value={inputs.sellClosingCostPercent} onChange={v => update('sellClosingCostPercent', v)}
                  min={0} max={10} step={0.5} suffix="%"
                  hint="Includes agent commissions, transfer taxes, etc." />

                {/* Maintenance & Fees */}
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-3 border-t border-border/30">Maintenance & Fees</p>
                <SliderField label="Maintenance / Renovation" value={inputs.maintenanceRate} onChange={v => update('maintenanceRate', v)}
                  min={0} max={10} step={0.25} suffix="%/yr"
                  formatValue={v => `${v.toFixed(2)}% (${formatCurrency(inputs.homePrice * v / 100)}/yr)`} />
                <SliderField label="Homeowner's Insurance" value={inputs.homeInsuranceRate} onChange={v => update('homeInsuranceRate', v)}
                  min={0} max={10} step={0.05} suffix="%/yr"
                  formatValue={v => `${v.toFixed(2)}% (${formatCurrency(inputs.homePrice * v / 100)}/yr)`} />
                <SliderField label="Extra Monthly Utilities" value={inputs.extraMonthlyUtilities} onChange={v => update('extraMonthlyUtilities', v)}
                  min={0} max={2000} step={25} prefix="$" suffix="/mo" />
                <SliderField label="Monthly HOA / Common Fees" value={inputs.hoaMonthly} onChange={v => update('hoaMonthly', v)}
                  min={0} max={8000} step={25} prefix="$" suffix="/mo" />
                {inputs.hoaMonthly > 0 && (
                  <SliderField label="HOA Fees Deduction" value={inputs.hoaDeductionPercent} onChange={v => update('hoaDeductionPercent', v)}
                    min={0} max={100} step={5} suffix="%" />
                )}

                {/* Renting extras */}
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-3 border-t border-border/30">Additional Renting Costs</p>
                <SliderField label="Security Deposit" value={inputs.securityDepositMonths} onChange={v => update('securityDepositMonths', v)}
                  min={0} max={12} step={1} suffix=" months"
                  formatValue={v => `${v} mo (${formatCurrency(inputs.monthlyRent * v)})`} />
                <SliderField label="Broker's Fee" value={inputs.brokerFeePercent} onChange={v => update('brokerFeePercent', v)}
                  min={0} max={50} step={1} suffix="%"
                  formatValue={v => `${v}% (${formatCurrency(inputs.monthlyRent * 12 * v / 100)})`} />
                <SliderField label="Renter's Insurance" value={inputs.rentersInsuranceRate} onChange={v => update('rentersInsuranceRate', v)}
                  min={0} max={10} step={0.25} suffix="%"
                  formatValue={v => `${v.toFixed(2)}% (${formatCurrency(inputs.monthlyRent * 12 * v / 100)}/yr)`} />
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* ─── RESULTS ─── */}
        <Card className="prism-card-shine border-border/50">
          <CardHeader>
            <CardTitle className="font-display text-lg">The Verdict</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Hero verdict */}
            <div className={cn(
              'text-center p-5 rounded-xl border',
              result.buyingIsBetter
                ? 'bg-gradient-to-br from-prism-teal/15 to-prism-lime/10 border-prism-teal/25'
                : 'bg-gradient-to-br from-prism-amber/15 to-prism-rose/10 border-prism-amber/25'
            )}>
              <div className="flex items-center justify-center gap-2 mb-1">
                {result.buyingIsBetter
                  ? <Home className="h-5 w-5 text-prism-teal" />
                  : <DollarSign className="h-5 w-5 text-prism-amber" />}
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  After {inputs.yearsToStay} year{inputs.yearsToStay !== 1 ? 's' : ''}
                </p>
              </div>
              <p className={cn(
                'font-display text-2xl font-extrabold',
                result.buyingIsBetter ? 'text-prism-teal' : 'text-prism-amber'
              )}>
                {result.buyingIsBetter ? 'Buying is cheaper' : 'Renting saves you'}
              </p>
              <p className="text-lg font-bold text-foreground mt-1">
                <AnimatedNumber value={result.finalAdvantage} formatFn={formatCurrency} />
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                over {inputs.yearsToStay} years
              </p>
              {result.breakevenYear > 0 && (
                <p className="text-xs text-muted-foreground mt-2 border-t border-border/20 pt-2">
                  Buying breaks even at ~{result.breakevenYear.toFixed(1)} years
                </p>
              )}
            </div>

            {/* NYT-style cost breakdown table */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/40">
                <span className="flex-1">{inputs.yearsToStay} years</span>
                <span className="w-24 text-right text-prism-teal">Buy</span>
                <span className="w-24 text-right text-prism-amber">Rent</span>
              </div>
              <CostRow label="Initial costs" buy={result.buy.initialCosts} rent={result.rent.initialCosts} formatCurrency={formatCurrency} />
              <CostRow label="Recurring costs" buy={result.buy.recurringCosts} rent={result.rent.recurringCosts} formatCurrency={formatCurrency} />
              <CostRow label="Opportunity costs" buy={result.buy.opportunityCost} rent={result.rent.opportunityCost} formatCurrency={formatCurrency} />
              <CostRow label="Net proceeds" buy={result.buy.netProceeds} rent={result.rent.netProceeds} formatCurrency={formatCurrency} />
              <div className="flex items-center justify-between text-sm py-2 border-t border-border/40 font-bold">
                <span className="flex-1 text-xs uppercase tracking-wider">Total</span>
                <span className={cn('font-mono text-xs w-24 text-right', result.buyingIsBetter ? 'text-prism-teal' : '')}>{formatCurrency(result.buy.total)}</span>
                <span className={cn('font-mono text-xs w-24 text-right', !result.buyingIsBetter ? 'text-prism-amber' : '')}>{formatCurrency(result.rent.total)}</span>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 1 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Total Cost Over Time</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <defs>
                        <linearGradient id="buyGradRvB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="rentGradRvB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--prism-amber))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--prism-amber))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <RechartsTooltip
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid hsl(var(--border))' }}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Area type="monotone" dataKey="Buy" stroke="hsl(var(--prism-teal))" fill="url(#buyGradRvB)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Rent" stroke="hsl(var(--prism-amber))" fill="url(#rentGradRvB)" strokeWidth={2} />
                      {result.breakevenYear > 0 && result.breakevenYear <= inputs.yearsToStay && (
                        <ReferenceLine x={`Yr ${Math.round(result.breakevenYear)}`} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-teal inline-block" /> Buy Total Cost</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-amber inline-block" /> Rent Total Cost</span>
                </div>
              </div>
            )}

            {/* Methodology note */}
            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/20">
              The calculator tallies the full cost of buying (mortgage, taxes, insurance, maintenance, closing costs, opportunity cost of down payment) 
              against renting (rent, renter's insurance, broker fees) plus investing the difference. Tax deductions only apply when itemized deductions exceed 
              the standard deduction ({formatCurrency(inputs.filingStatus === 'joint' ? 30000 : 15000)}). All figures in current dollars.
            </p>

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
              summaryText={`# 🏠 Rent vs. Buy Calculator\n\n**Inputs**\n- **Home Price:** ${formatCurrency(inputs.homePrice)}\n- **Down Payment:** ${inputs.downPaymentPercent}%\n- **Mortgage Rate:** ${inputs.mortgageRate}%\n- **Monthly Rent:** ${formatCurrency(inputs.monthlyRent)}\n- **Years to Stay:** ${inputs.yearsToStay}\n\n**Verdict: ${result.buyingIsBetter ? 'Buying is cheaper' : 'Renting saves you'} ${formatCurrency(result.finalAdvantage)}** over ${inputs.yearsToStay} years\n\n| | Buy | Rent |\n|---|---|---|\n| Initial costs | ${formatCurrency(result.buy.initialCosts)} | ${formatCurrency(result.rent.initialCosts)} |\n| Recurring costs | ${formatCurrency(result.buy.recurringCosts)} | ${formatCurrency(result.rent.recurringCosts)} |\n| Opportunity costs | ${formatCurrency(result.buy.opportunityCost)} | ${formatCurrency(result.rent.opportunityCost)} |\n| Net proceeds | ${formatCurrency(result.buy.netProceeds)} | ${formatCurrency(result.rent.netProceeds)} |\n| **Total** | **${formatCurrency(result.buy.total)}** | **${formatCurrency(result.rent.total)}** |${result.breakevenYear > 0 ? `\n\nBuying breaks even at ~${result.breakevenYear.toFixed(1)} years` : ''}`}
              onOpenHistory={onOpenHistory}
              printData={{
                inputs: [
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
          </CardContent>
        </Card>
      </div>
    </>
  );
}
