import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plane, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';

const DESTINATION_TIERS = [
  { id: 'budget', label: 'Budget (Domestic / Road Trip)', dailyCost: 100, flightCost: 200 },
  { id: 'mid', label: 'Mid-Range (Domestic Flight)', dailyCost: 200, flightCost: 450 },
  { id: 'premium', label: 'Premium (International)', dailyCost: 350, flightCost: 900 },
  { id: 'luxury', label: 'Luxury (Resort / Overseas)', dailyCost: 600, flightCost: 1800 },
  { id: 'custom', label: 'Custom', dailyCost: 0, flightCost: 0 },
];

export default function VacationCalculator() {
  const { formatCurrency } = useCurrency();
  const [travelers, setTravelers] = useState('2');
  const [nights, setNights] = useState('5');
  const [tier, setTier] = useState('mid');
  const [customDaily, setCustomDaily] = useState('');
  const [customFlight, setCustomFlight] = useState('');
  const [monthsToSave, setMonthsToSave] = useState([6]);
  const [currentSavings, setCurrentSavings] = useState('0');

  const result = useMemo(() => {
    const t = parseInt(travelers) || 1;
    const n = parseInt(nights) || 1;
    const selected = DESTINATION_TIERS.find(d => d.id === tier)!;
    const daily = tier === 'custom' ? (parseFloat(customDaily) || 0) : selected.dailyCost;
    const flight = tier === 'custom' ? (parseFloat(customFlight) || 0) : selected.flightCost;
    const lodging = daily * n;
    const flights = flight * t;
    const food = 60 * t * n;
    const activities = 40 * t * n;
    const misc = 30 * t * n;
    const totalCost = lodging + flights + food + activities + misc;
    const saved = parseFloat(currentSavings) || 0;
    const remaining = Math.max(0, totalCost - saved);
    const months = monthsToSave[0] || 1;
    const monthlySavings = remaining / months;
    return { lodging, flights, food, activities, misc, totalCost, saved, remaining, monthlySavings, months };
  }, [travelers, nights, tier, customDaily, customFlight, monthsToSave, currentSavings]);

  const canAfford = result.remaining <= 0;

  return (
    <div className="space-y-6">
      <CalculatorGuide
        title="Vacation Planner"
        icon={Plane}
        iconColor="text-prism-sky"
        ttsScript="Plan a vacation you can afford without going into debt."
        instructions={['Select destination tier and trip details', 'See total cost breakdown', 'Set a savings timeline to pay cash']}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Destination Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {DESTINATION_TIERS.map(d => <SelectItem key={d.id} value={d.id}>{d.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Travelers</Label>
          <Input type="number" min="1" value={travelers} onChange={e => setTravelers(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Nights</Label>
          <Input type="number" min="1" value={nights} onChange={e => setNights(e.target.value)} />
        </div>
        {tier === 'custom' && (
          <>
            <div className="space-y-2">
              <Label>Daily Lodging Cost</Label>
              <Input type="number" min="0" value={customDaily} onChange={e => setCustomDaily(e.target.value)} placeholder="$ per night" />
            </div>
            <div className="space-y-2">
              <Label>Flight Cost (per person)</Label>
              <Input type="number" min="0" value={customFlight} onChange={e => setCustomFlight(e.target.value)} placeholder="$ per person" />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label>Already Saved</Label>
          <Input type="number" min="0" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} placeholder="$0" />
        </div>
        <div className="space-y-2 sm:col-span-2 lg:col-span-3">
          <Label>Months to Save: {monthsToSave[0]}</Label>
          <Slider min={1} max={24} step={1} value={monthsToSave} onValueChange={setMonthsToSave} />
        </div>
      </div>

      {result.totalCost > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className={cn('rounded-xl p-4 border text-center', canAfford ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30')}>
            <div className="flex items-center justify-center gap-2 mb-1">
              {canAfford ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <AlertTriangle className="h-5 w-5 text-amber-500" />}
              <span className="font-semibold">{canAfford ? "You've saved enough!" : `Save ${formatCurrency(result.monthlySavings)}/mo for ${result.months} months`}</span>
            </div>
          </div>

          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
            {[
              { label: 'Total Trip Cost', val: result.totalCost, accent: true },
              { label: 'Lodging', val: result.lodging },
              { label: 'Flights', val: result.flights },
              { label: 'Food & Dining', val: result.food },
              { label: 'Activities', val: result.activities },
              { label: 'Miscellaneous', val: result.misc },
            ].map(r => (
              <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className={cn('text-lg font-bold', r.accent && 'text-primary')}>
                    <AnimatedNumber value={r.val} formatFn={formatCurrency} />
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <CalculatorActions
            calculatorType="vacation"
            inputs={{ travelers, nights, tier, currentSavings, monthsToSave: monthsToSave[0] }}
            results={result}
            hasResults={result.totalCost > 0}
            summaryText={`Vacation: ${formatCurrency(result.totalCost)} total, save ${formatCurrency(result.monthlySavings)}/mo for ${result.months} months.`}
          />
        </motion.div>
      )}
    </div>
  );
}
