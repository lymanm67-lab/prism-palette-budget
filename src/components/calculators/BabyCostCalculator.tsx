import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Baby } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';
import { STATE_DATA } from '@/lib/state-data';

const CHILDCARE_OPTIONS = [
  { id: 'none', label: 'Stay-at-Home Parent', monthly: 0 },
  { id: 'family', label: 'Family / Informal', monthly: 400 },
  { id: 'home', label: 'Home Daycare', monthly: 900 },
  { id: 'center', label: 'Daycare Center', monthly: 1400 },
  { id: 'nanny', label: 'Nanny / Au Pair', monthly: 2500 },
];

const COST_CATEGORIES = [
  { label: 'Diapers & Wipes', monthly: 80 },
  { label: 'Formula / Food', monthly: 150 },
  { label: 'Clothing', monthly: 60 },
  { label: 'Health / Insurance Add-on', monthly: 200 },
  { label: 'Gear & Nursery (amortized)', monthly: 100 },
  { label: 'Miscellaneous', monthly: 75 },
];

export default function BabyCostCalculator() {
  const { formatCurrency } = useCurrency();
  const [childcare, setChildcare] = useState('center');
  const [state, setState] = useState('');
  const [monthsUntilBirth, setMonthsUntilBirth] = useState('6');

  const result = useMemo(() => {
    const cc = CHILDCARE_OPTIONS.find(c => c.id === childcare)!;
    // State adjustment factor (higher cost states get a multiplier)
    const stateData = STATE_DATA[state];
    const costFactor = stateData ? (1 + (stateData.stateTax / 100) * 0.3) : 1; // rough proxy

    const baseCosts = COST_CATEGORIES.map(c => ({ ...c, adjusted: Math.round(c.monthly * costFactor) }));
    const monthlyBasics = baseCosts.reduce((s, c) => s + c.adjusted, 0);
    const monthlyChildcare = Math.round(cc.monthly * costFactor);
    const totalMonthly = monthlyBasics + monthlyChildcare;
    const yearOneCost = totalMonthly * 12;
    const oneTimeCosts = Math.round(3500 * costFactor); // crib, stroller, car seat, etc.
    const totalFirstYear = yearOneCost + oneTimeCosts;
    const months = parseInt(monthsUntilBirth) || 1;
    const monthlySavings = totalFirstYear / months;

    return { baseCosts, monthlyChildcare, monthlyBasics, totalMonthly, yearOneCost, oneTimeCosts, totalFirstYear, monthlySavings, months };
  }, [childcare, state, monthsUntilBirth]);

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Baby Cost Estimator" icon={Baby} iconColor="text-prism-sky"
        ttsScript="Estimate the first year costs of a new baby."
        instructions={['Select childcare plan and state', 'See monthly and annual cost breakdown', 'Plan your savings runway']} />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Stay-at-Home Parent', description: 'Eliminating childcare saves $10,800-30,000/year but reduces household income. Calculate the net — sometimes the savings exceed the lost salary after taxes and commuting costs.' },
          { title: 'Daycare Center', description: 'Average $1,400/mo nationally but varies wildly by state. In Massachusetts, infant daycare averages $2,100/mo. Factor in your state\'s actual costs.' },
          { title: 'Dual Income with Nanny Share', description: 'Splitting a nanny with another family cuts costs 30-40% while keeping both parents working. A $2,500/mo nanny becomes $1,250-1,500 each.' },
        ]}
        pitfalls={[
          { title: 'Underestimating Year-One Costs', description: 'The first year averages $12,000-15,000 beyond childcare. Diapers alone cost $70-80/mo. Budget for the real number, not the rosy estimate.' },
          { title: 'Buying Everything New', description: 'Babies outgrow clothes in weeks and use gear for months. Buying used cribs, strollers, and clothes saves 60-80% with minimal difference.' },
          { title: 'Ignoring Insurance Changes', description: 'Adding a baby to your health plan can cost $200-500/mo more. Check your employer\'s rates before the baby arrives.' },
          { title: 'No Emergency Buffer', description: 'Unexpected medical bills, formula switches, and early childcare needs happen. Keep 3 months of baby expenses in reserve.' },
        ]}
        tips={[
          { title: 'Use a Dependent Care FSA', description: 'Contribute up to $5,000/year pre-tax for childcare expenses. At a 25% tax bracket, that saves $1,250 in taxes annually — free money.' },
          { title: 'Buy Diapers in Bulk on Sale', description: 'Subscribe-and-save programs (Amazon, Target) plus couponing can cut diaper costs by 30-40%. Stock up during sales — babies go through 8-10/day.' },
          { title: 'Accept Hand-Me-Downs Aggressively', description: 'Post on local parent groups that you accept all baby items. Most parents are desperate to offload gear. You can save $2,000+ in the first year this way.' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2"><Label>State</Label>
          <Select value={state} onValueChange={setState}><SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
            <SelectContent>{Object.entries(STATE_DATA).filter(([k]) => k).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Childcare Plan</Label>
          <Select value={childcare} onValueChange={setChildcare}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CHILDCARE_OPTIONS.map(c => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2"><Label>Months Until Birth</Label>
          <Input type="number" min="1" value={monthsUntilBirth} onChange={e => setMonthsUntilBirth(e.target.value)} />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: 'Monthly Total', val: result.totalMonthly, accent: true },
            { label: 'Year One Total', val: result.totalFirstYear, accent: true },
            { label: 'One-Time Gear', val: result.oneTimeCosts },
            { label: `Save/mo (${result.months}mo)`, val: result.monthlySavings },
          ].map(r => (
            <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{r.label}</p>
                <p className={cn('text-lg font-bold', r.accent && 'text-primary')}><AnimatedNumber value={r.val} formatFn={formatCurrency} /></p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Monthly Breakdown</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
              <span className="text-sm">Childcare</span><span className="font-semibold text-sm">{formatCurrency(result.monthlyChildcare)}</span>
            </div>
            {result.baseCosts.map(c => (
              <div key={c.label} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                <span className="text-sm">{c.label}</span><span className="font-semibold text-sm">{formatCurrency(c.adjusted)}</span>
              </div>
            ))}
          </div>
        </div>

        <CalculatorActions calculatorType="baby" inputs={{ childcare, state, monthsUntilBirth }}
          results={result} hasResults={true}
          summaryText={`Baby: ${formatCurrency(result.totalFirstYear)} first year, ${formatCurrency(result.totalMonthly)}/mo ongoing.`} />
      </motion.div>
    </div>
  );
}
