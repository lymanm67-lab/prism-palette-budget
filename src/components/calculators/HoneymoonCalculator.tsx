import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Palmtree, CheckCircle2, AlertTriangle } from 'lucide-react';
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
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

const TIERS = [
  { id: 'budget', label: 'Budget Getaway', total: 2500 },
  { id: 'mid', label: 'Mid-Range Escape', total: 6000 },
  { id: 'premium', label: 'Dream Destination', total: 12000 },
  { id: 'luxury', label: 'Luxury Experience', total: 25000 },
  { id: 'custom', label: 'Custom Amount', total: 0 },
];

export default function HoneymoonCalculator() {
  const { formatCurrency } = useCurrency();
  const [tier, setTier] = useState('mid');
  const [customAmount, setCustomAmount] = useState('');
  const [weddingDate, setWeddingDate] = useState('');
  const [currentSavings, setCurrentSavings] = useState('0');

  const result = useMemo(() => {
    const selected = TIERS.find(t => t.id === tier)!;
    const tripCost = tier === 'custom' ? (parseFloat(customAmount) || 0) : selected.total;
    const saved = parseFloat(currentSavings) || 0;
    const remaining = Math.max(0, tripCost - saved);
    let monthsUntil = 12;
    if (weddingDate) {
      const diff = (new Date(weddingDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30.44);
      monthsUntil = Math.max(1, Math.ceil(diff));
    }
    const monthly = remaining / monthsUntil;
    return { tripCost, saved, remaining, monthly, monthsUntil };
  }, [tier, customAmount, weddingDate, currentSavings]);

  const canAfford = result.remaining <= 0;

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Honeymoon Fund" icon={Palmtree} iconColor="text-prism-lime"
        ttsScript="Save for the honeymoon of your dreams without debt."
        instructions={['Choose a trip tier or enter a custom amount', 'Enter your wedding date for countdown', 'See monthly savings needed']} />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Budget Getaway ($2,500)', description: 'A domestic road trip or off-season beach stay. Drive instead of fly, use Airbnb, and cook some meals to stretch the budget further.' },
          { title: 'Mid-Range Escape ($6,000)', description: 'International flights + a nice resort. Book 6-8 months ahead for best rates. Consider all-inclusive to control costs.' },
          { title: 'Delayed Honeymoon', description: 'Take a short "mini-moon" after the wedding and save for a dream trip 6-12 months later. Less financial stress and better deals.' },
        ]}
        pitfalls={[
          { title: 'Booking on Credit', description: 'Putting the entire honeymoon on a credit card at 20%+ APR can add $1,000+ in interest. Save first, travel debt-free.' },
          { title: 'Forgetting Travel Insurance', description: 'A $200 travel insurance policy can save thousands if flights cancel or illness strikes. Always worth it for international trips.' },
          { title: 'Peak Season Pricing', description: 'Traveling during holidays or summer can cost 40-60% more. Shifting dates by 2-3 weeks can save thousands.' },
          { title: 'Currency Exchange Fees', description: 'ATM fees and poor exchange rates abroad can cost 3-5% of your spending. Get a no-foreign-transaction-fee card before you go.' },
        ]}
        tips={[
          { title: 'Use a Honeymoon Registry', description: 'Ask wedding guests to contribute to your honeymoon fund instead of physical gifts. Sites like Honeyfund make this easy and socially acceptable.' },
          { title: 'Book Flights on Tuesday', description: 'Airlines often release deals on Tuesday afternoons. Use Google Flights price tracking to alert you when fares drop for your destination.' },
          { title: 'Go All-Inclusive', description: 'All-inclusive resorts remove surprise costs for food, drinks, and activities. You will know your exact total before booking — no budget anxiety on the trip.' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2"><Label>Trip Tier</Label>
          <Select value={tier} onValueChange={setTier}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TIERS.map(t => <SelectItem key={t.id} value={t.id}>{t.label}{t.total > 0 ? ` (~${formatCurrency(t.total)})` : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {tier === 'custom' && <div className="space-y-2"><Label>Trip Cost</Label><Input type="number" min="0" value={customAmount} onChange={e => setCustomAmount(e.target.value)} /></div>}
        <div className="space-y-2"><Label>Wedding Date</Label><Input type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} /></div>
        <div className="space-y-2"><Label>Already Saved</Label><Input type="number" min="0" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} /></div>
      </div>

      {result.tripCost > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className={cn('rounded-xl p-4 border text-center', canAfford ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30')}>
            {canAfford
              ? <div className="flex items-center justify-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="font-semibold">You're fully funded!</span></div>
              : <div className="flex items-center justify-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><span className="font-semibold">Save {formatCurrency(result.monthly)}/mo for {result.monthsUntil} months</span></div>}
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Trip Cost', val: result.tripCost, accent: true },
              { label: 'Already Saved', val: result.saved },
              { label: 'Still Needed', val: result.remaining },
              { label: 'Monthly Target', val: result.monthly, accent: true },
            ].map(r => (
              <Card key={r.label} className={cn('border', r.accent && 'border-primary/30 bg-primary/5')}>
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">{r.label}</p>
                  <p className={cn('text-lg font-bold', r.accent && 'text-primary')}><AnimatedNumber value={r.val} formatFn={formatCurrency} /></p>
                </CardContent>
              </Card>
            ))}
          </div>
          <CalculatorActions calculatorType="honeymoon" inputs={{ tier, customAmount, weddingDate, currentSavings }}
            results={result} hasResults={result.tripCost > 0}
            summaryText={`Honeymoon: ${formatCurrency(result.tripCost)} trip, save ${formatCurrency(result.monthly)}/mo.`} />
        </motion.div>
      )}
    </div>
  );
}
