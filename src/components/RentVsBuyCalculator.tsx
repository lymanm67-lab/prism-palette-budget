import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Home, DollarSign, Percent, CalendarDays, TrendingUp, TrendingDown,
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

interface RentVsBuyInputs {
  homePrice: number;
  downPaymentPercent: number;
  mortgageRate: number;
  mortgageTerm: number;
  monthlyRent: number;
  yearsToStay: number;
  // Advanced
  homeAppreciation: number;
  rentGrowth: number;
  investmentReturn: number;
  propertyTaxRate: number;
  homeInsurance: number;
  maintenanceRate: number;
  buyClosingCostPercent: number;
  sellClosingCostPercent: number;
  marginalTaxRate: number;
  hoaMonthly: number;
  inflationRate: number;
}

const DEFAULTS: RentVsBuyInputs = {
  homePrice: 400000,
  downPaymentPercent: 20,
  mortgageRate: 6.5,
  mortgageTerm: 30,
  monthlyRent: 2000,
  yearsToStay: 7,
  homeAppreciation: 3,
  rentGrowth: 3,
  investmentReturn: 7,
  propertyTaxRate: 1.2,
  homeInsurance: 1200,
  maintenanceRate: 1,
  buyClosingCostPercent: 3,
  sellClosingCostPercent: 6,
  marginalTaxRate: 22,
  hoaMonthly: 0,
  inflationRate: 2.5,
};

function calcMonthlyMortgage(principal: number, annualRate: number, months: number) {
  if (annualRate === 0) return principal / months;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

function runRentVsBuy(inputs: RentVsBuyInputs) {
  const {
    homePrice, downPaymentPercent, mortgageRate, mortgageTerm,
    monthlyRent, yearsToStay, homeAppreciation, rentGrowth,
    investmentReturn, propertyTaxRate, homeInsurance, maintenanceRate,
    buyClosingCostPercent, sellClosingCostPercent, marginalTaxRate,
    hoaMonthly, inflationRate,
  } = inputs;

  const downPayment = homePrice * (downPaymentPercent / 100);
  const loanAmount = homePrice - downPayment;
  const buyClosingCosts = homePrice * (buyClosingCostPercent / 100);
  const monthlyPayment = calcMonthlyMortgage(loanAmount, mortgageRate, mortgageTerm * 12);
  const mr = mortgageRate / 100 / 12;

  const totalMonths = yearsToStay * 12;
  const monthlyInvestReturn = Math.pow(1 + investmentReturn / 100, 1 / 12) - 1;
  const monthlyHomeAppreciation = Math.pow(1 + homeAppreciation / 100, 1 / 12) - 1;
  const monthlyRentGrowth = Math.pow(1 + rentGrowth / 100, 1 / 12) - 1;

  // --- BUYING SCENARIO ---
  let loanBalance = loanAmount;
  let totalBuyCost = downPayment + buyClosingCosts;
  let homeValue = homePrice;
  let totalMortgageInterest = 0;
  let totalPropertyTax = 0;
  let totalInsurance = 0;
  let totalMaintenance = 0;
  let totalHoa = 0;

  // --- RENTING SCENARIO ---
  let renterInvestment = downPayment + buyClosingCosts; // renter invests what buyer spent upfront
  let totalRentPaid = 0;
  let currentRent = monthlyRent;
  let rentersInsurance = 15; // ~$15/mo typical

  const yearlyData: {
    year: number;
    buyCostCumulative: number;
    rentCostCumulative: number;
    buyNetWorth: number;
    rentNetWorth: number;
    advantage: number; // positive = buying wins
  }[] = [];

  let buyCostCumulative = downPayment + buyClosingCosts;
  let rentCostCumulative = 0;

  for (let m = 1; m <= totalMonths; m++) {
    // --- Buy side ---
    const interestPayment = loanBalance * mr;
    const principalPayment = monthlyPayment - interestPayment;
    loanBalance = Math.max(0, loanBalance - principalPayment);
    totalMortgageInterest += interestPayment;

    const monthlyPropTax = (homeValue * (propertyTaxRate / 100)) / 12;
    const monthlyInsurance = homeInsurance / 12;
    const monthlyMaintenance = (homeValue * (maintenanceRate / 100)) / 12;
    totalPropertyTax += monthlyPropTax;
    totalInsurance += monthlyInsurance;
    totalMaintenance += monthlyMaintenance;
    totalHoa += hoaMonthly;

    // Tax benefit from mortgage interest deduction
    const taxSavings = interestPayment * (marginalTaxRate / 100);

    const monthlyBuyCost = monthlyPayment + monthlyPropTax + monthlyInsurance + monthlyMaintenance + hoaMonthly - taxSavings;
    buyCostCumulative += monthlyBuyCost;

    homeValue *= (1 + monthlyHomeAppreciation);

    // --- Rent side ---
    totalRentPaid += currentRent;
    rentCostCumulative += currentRent + rentersInsurance;

    // Renter invests the difference if buying costs more
    const rentSideMonthlyCost = currentRent + rentersInsurance;
    const diff = monthlyBuyCost - rentSideMonthlyCost;
    if (diff > 0) {
      renterInvestment = renterInvestment * (1 + monthlyInvestReturn) + diff;
    } else {
      renterInvestment = renterInvestment * (1 + monthlyInvestReturn);
    }

    currentRent *= (1 + monthlyRentGrowth);

    // Yearly snapshot
    if (m % 12 === 0) {
      const year = m / 12;
      const sellCosts = homeValue * (sellClosingCostPercent / 100);
      const buyEquity = homeValue - loanBalance - sellCosts;
      const buyNetWorth = buyEquity;
      const rentNetWorth = renterInvestment;

      yearlyData.push({
        year,
        buyCostCumulative,
        rentCostCumulative,
        buyNetWorth,
        rentNetWorth,
        advantage: buyNetWorth - rentNetWorth,
      });
    }
  }

  // Final numbers
  const sellCosts = homeValue * (sellClosingCostPercent / 100);
  const buyEquity = homeValue - loanBalance - sellCosts;
  const finalAdvantage = buyEquity - renterInvestment;

  // Find breakeven year
  let breakevenYear = -1;
  for (let i = 1; i < yearlyData.length; i++) {
    const prev = yearlyData[i - 1].advantage;
    const curr = yearlyData[i].advantage;
    if (prev <= 0 && curr > 0) {
      // Linear interpolation
      const frac = Math.abs(prev) / (Math.abs(prev) + curr);
      breakevenYear = yearlyData[i - 1].year + frac;
      break;
    }
  }

  return {
    monthlyPayment,
    downPayment,
    buyClosingCosts,
    loanAmount,
    homeValueAtEnd: homeValue,
    buyEquity,
    renterInvestment,
    totalRentPaid,
    totalMortgageInterest,
    totalPropertyTax,
    totalInsurance,
    totalMaintenance,
    totalHoa,
    finalAdvantage,
    buyingIsBetter: finalAdvantage > 0,
    breakevenYear,
    yearlyData,
    buyCostCumulative,
    rentCostCumulative,
  };
}

const SliderField = ({
  label, value, onChange, min, max, step, suffix, prefix, formatValue,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step: number; suffix?: string; prefix?: string;
  formatValue?: (v: number) => string;
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
    name: `Year ${d.year}`,
    year: d.year,
    'Buying Net Worth': Math.round(d.buyNetWorth),
    'Renting Net Worth': Math.round(d.rentNetWorth),
  }));

  return (
    <>
      <CalculatorGuide
        title="Rent vs. Buy Calculator"
        icon={Home}
        iconColor="text-prism-teal"
        ttsScript="The Rent vs Buy Calculator helps you decide whether it's financially better to rent or buy a home. It models the full cost of ownership including mortgage, taxes, insurance, maintenance, and opportunity cost of your down payment. It compares this against renting and investing the difference. Adjust your assumptions to see how long you'd need to stay for buying to make sense."
        instructions={[
          'Enter the home price and your down payment percentage',
          'Set your expected monthly rent for a comparable home',
          'Choose how many years you plan to stay',
          'Expand Advanced Settings to fine-tune appreciation, taxes, and more',
          'The chart shows when buying breaks even vs renting',
          'The verdict tells you which option wins for your timeline',
        ]}
      />
      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Short-Term Stay (1–3 years)', description: 'Renting almost always wins. Closing costs eat your equity before appreciation kicks in.' },
          { title: 'Long-Term Stay (7+ years)', description: 'Buying usually wins. Home appreciation compounds and mortgage paydown builds equity faster than rent savings invested.' },
          { title: 'High-Growth Market', description: 'Increase home appreciation to 5–6%. Buying breaks even faster, but beware — past performance ≠ future results.' },
          { title: 'High Interest Rates', description: 'When mortgage rates are 7%+, renting and investing the difference at 7–10% can outperform buying.' },
        ]}
        pitfalls={[
          { title: 'Ignoring Opportunity Cost', description: 'Your down payment could earn 7–10% invested. This calculator accounts for that — most simple calculators don\'t.' },
          { title: 'Underestimating Maintenance', description: 'Budget 1–2% of home value annually. A $400k home costs $4k–$8k/year in upkeep.' },
          { title: 'Forgetting Selling Costs', description: 'Agent fees + closing costs typically run 5–6% of sale price. On a $450k home, that\'s $27k.' },
          { title: 'Emotional vs Financial', description: 'This calculator shows the financial answer. Stability, customization, and pride of ownership have real value too.' },
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-2 mt-4">
        {/* Inputs */}
        <Card className="prism-card-shine border-border/50">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Home className="h-5 w-5 text-prism-teal" /> Rent vs. Buy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Core inputs */}
            <SliderField label="Home Price" value={inputs.homePrice} onChange={v => update('homePrice', v)}
              min={100000} max={2000000} step={10000} prefix="$" />
            <SliderField label="Down Payment" value={inputs.downPaymentPercent} onChange={v => update('downPaymentPercent', v)}
              min={0} max={100} step={1} suffix="%"
              formatValue={v => `${v}% ($${Math.round(inputs.homePrice * v / 100).toLocaleString()})`} />
            <SliderField label="Mortgage Rate" value={inputs.mortgageRate} onChange={v => update('mortgageRate', v)}
              min={2} max={12} step={0.125} suffix="%" />
            <SliderField label="Monthly Rent (comparable home)" value={inputs.monthlyRent} onChange={v => update('monthlyRent', v)}
              min={500} max={10000} step={50} prefix="$" />
            <SliderField label="How Long Will You Stay?" value={inputs.yearsToStay} onChange={v => update('yearsToStay', v)}
              min={1} max={30} step={1} suffix=" years" />

            {/* Advanced toggle */}
            <Button
              variant="ghost" size="sm"
              className="w-full text-xs text-muted-foreground gap-1"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            </Button>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 pt-2 border-t border-border/30"
              >
                <SliderField label="Home Appreciation" value={inputs.homeAppreciation} onChange={v => update('homeAppreciation', v)}
                  min={-2} max={10} step={0.5} suffix="%/yr" />
                <SliderField label="Rent Growth" value={inputs.rentGrowth} onChange={v => update('rentGrowth', v)}
                  min={0} max={8} step={0.5} suffix="%/yr" />
                <SliderField label="Investment Return" value={inputs.investmentReturn} onChange={v => update('investmentReturn', v)}
                  min={0} max={15} step={0.5} suffix="%/yr" />
                <SliderField label="Property Tax Rate" value={inputs.propertyTaxRate} onChange={v => update('propertyTaxRate', v)}
                  min={0} max={4} step={0.1} suffix="%/yr" />
                <SliderField label="Home Insurance (annual)" value={inputs.homeInsurance} onChange={v => update('homeInsurance', v)}
                  min={0} max={10000} step={100} prefix="$" suffix="/yr" />
                <SliderField label="Maintenance" value={inputs.maintenanceRate} onChange={v => update('maintenanceRate', v)}
                  min={0} max={4} step={0.25} suffix="%/yr" />
                <SliderField label="Buying Closing Costs" value={inputs.buyClosingCostPercent} onChange={v => update('buyClosingCostPercent', v)}
                  min={0} max={6} step={0.5} suffix="%" />
                <SliderField label="Selling Closing Costs" value={inputs.sellClosingCostPercent} onChange={v => update('sellClosingCostPercent', v)}
                  min={0} max={10} step={0.5} suffix="%" />
                <SliderField label="Marginal Tax Rate" value={inputs.marginalTaxRate} onChange={v => update('marginalTaxRate', v)}
                  min={0} max={50} step={1} suffix="%" />
                <SliderField label="HOA Fees" value={inputs.hoaMonthly} onChange={v => update('hoaMonthly', v)}
                  min={0} max={1500} step={25} prefix="$" suffix="/mo" />
                <SliderField label="Loan Term" value={inputs.mortgageTerm} onChange={v => update('mortgageTerm', v)}
                  min={10} max={30} step={5} suffix=" years" />
              </motion.div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
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
                {result.buyingIsBetter ? 'Buying Wins' : 'Renting Wins'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                by <span className="font-bold text-foreground">
                  <AnimatedNumber value={Math.abs(result.finalAdvantage)} formatFn={formatCurrency} />
                </span>
              </p>
              {result.breakevenYear > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Buying breaks even at ~{result.breakevenYear.toFixed(1)} years
                </p>
              )}
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-prism-teal/10 to-prism-teal/5 border border-prism-teal/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Home className="h-3 w-3" /> Buying
                </p>
                <p className="font-display text-lg font-bold mt-1">
                  <AnimatedNumber value={result.buyEquity} formatFn={formatCurrency} />
                </p>
                <p className="text-[11px] text-muted-foreground">net equity after selling</p>
              </div>
              <div className="p-3 rounded-xl bg-gradient-to-br from-prism-amber/10 to-prism-amber/5 border border-prism-amber/20">
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> Renting
                </p>
                <p className="font-display text-lg font-bold mt-1">
                  <AnimatedNumber value={result.renterInvestment} formatFn={formatCurrency} />
                </p>
                <p className="text-[11px] text-muted-foreground">investment portfolio</p>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2 font-medium">Net Worth: Buying vs Renting Over Time</p>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <defs>
                        <linearGradient id="buyGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="rentGrad" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="Buying Net Worth" stroke="hsl(var(--prism-teal))" fill="url(#buyGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="Renting Net Worth" stroke="hsl(var(--prism-amber))" fill="url(#rentGrad)" strokeWidth={2} />
                      {result.breakevenYear > 0 && (
                        <ReferenceLine x={`Year ${Math.round(result.breakevenYear)}`} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" label={{ value: 'Break-even', fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      )}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-teal inline-block" /> Buying</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-prism-amber inline-block" /> Renting</span>
                </div>
              </div>
            )}

            {/* Cost breakdown */}
            <div className="space-y-2 pt-3 border-t border-border/30">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Buying Cost Breakdown</p>
              {[
                { label: 'Mortgage Payment', value: result.monthlyPayment, suffix: '/mo' },
                { label: 'Down Payment', value: result.downPayment },
                { label: 'Closing Costs (buy)', value: result.buyClosingCosts },
                { label: 'Total Interest Paid', value: result.totalMortgageInterest },
                { label: 'Property Taxes', value: result.totalPropertyTax },
                { label: 'Insurance', value: result.totalInsurance },
                { label: 'Maintenance', value: result.totalMaintenance },
                ...(result.totalHoa > 0 ? [{ label: 'HOA Fees', value: result.totalHoa }] : []),
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="font-mono text-xs">{formatCurrency(row.value)}{row.suffix || ''}</span>
                </div>
              ))}
            </div>

            <CalculatorActions
              calculatorType="rentvsbuy"
              inputs={inputs as any}
              results={{
                finalAdvantage: result.finalAdvantage,
                buyEquity: result.buyEquity,
                renterInvestment: result.renterInvestment,
                buyingIsBetter: result.buyingIsBetter,
              }}
              hasResults={true}
              summaryText={`# 🏠 Rent vs. Buy Calculator\n\n**Inputs**\n- **Home Price:** ${formatCurrency(inputs.homePrice)}\n- **Down Payment:** ${inputs.downPaymentPercent}%\n- **Mortgage Rate:** ${inputs.mortgageRate}%\n- **Monthly Rent:** ${formatCurrency(inputs.monthlyRent)}\n- **Years to Stay:** ${inputs.yearsToStay}\n\n**Verdict: ${result.buyingIsBetter ? 'Buying Wins' : 'Renting Wins'}** by ${formatCurrency(Math.abs(result.finalAdvantage))}\n\n- **Buy Equity:** ${formatCurrency(result.buyEquity)}\n- **Rent Portfolio:** ${formatCurrency(result.renterInvestment)}${result.breakevenYear > 0 ? `\n- **Break-even:** ~${result.breakevenYear.toFixed(1)} years` : ''}`}
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
                  { label: result.buyingIsBetter ? 'Buying Wins by' : 'Renting Wins by', value: formatCurrency(Math.abs(result.finalAdvantage)), highlight: true },
                  { label: 'Buy Equity', value: formatCurrency(result.buyEquity) },
                  { label: 'Rent Portfolio', value: formatCurrency(result.renterInvestment) },
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
