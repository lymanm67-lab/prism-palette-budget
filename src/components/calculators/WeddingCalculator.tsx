import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Heart, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

const ALLOCATION = [
  { key: 'venue', label: 'Venue & Catering', pct: 0.40 },
  { key: 'photo', label: 'Photo & Video', pct: 0.12 },
  { key: 'attire', label: 'Attire & Beauty', pct: 0.08 },
  { key: 'flowers', label: 'Flowers & Décor', pct: 0.10 },
  { key: 'music', label: 'Music & Entertainment', pct: 0.08 },
  { key: 'planner', label: 'Planner & Officiant', pct: 0.06 },
  { key: 'invites', label: 'Invitations & Paper', pct: 0.03 },
  { key: 'favors', label: 'Favors & Gifts', pct: 0.03 },
  { key: 'misc', label: 'Miscellaneous / Buffer', pct: 0.10 },
];

export default function WeddingCalculator() {
  const { formatCurrency } = useCurrency();
  const [totalBudget, setTotalBudget] = useState('25000');
  const [guestCount, setGuestCount] = useState('100');
  const [monthsToSave, setMonthsToSave] = useState([12]);
  const [currentSavings, setCurrentSavings] = useState('0');

  const result = useMemo(() => {
    const budget = parseFloat(totalBudget) || 0;
    const guests = parseInt(guestCount) || 1;
    const saved = parseFloat(currentSavings) || 0;
    const perGuest = budget / guests;
    const breakdown = ALLOCATION.map(a => ({ ...a, amount: budget * a.pct }));
    const remaining = Math.max(0, budget - saved);
    const monthly = remaining / (monthsToSave[0] || 1);
    return { budget, guests, perGuest, breakdown, saved, remaining, monthly, months: monthsToSave[0] };
  }, [totalBudget, guestCount, monthsToSave, currentSavings]);

  const canAfford = result.remaining <= 0;

  return (
    <div className="space-y-6">
      <CalculatorGuide title="Wedding Budget Planner" icon={Heart} iconColor="text-prism-rose"
        ttsScript="Plan your wedding without going into debt."
        instructions={['Set your total budget and guest count', 'See suggested allocation by category', 'Set a savings timeline']} />

      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Budget Wedding ($10k)', description: 'Backyard venue, DIY décor, and a food truck can deliver a beautiful wedding for under $10k. Focus spending on photography — those memories last forever.' },
          { title: 'Mid-Range ($25k)', description: 'Average US wedding cost. Allocate 40% to venue/catering, negotiate package deals, and consider off-season dates for 20-30% savings.' },
          { title: 'Destination Wedding', description: 'Often cheaper than local — smaller guest list means lower catering costs. A 30-person destination wedding can cost less than a 150-person local one.' },
        ]}
        pitfalls={[
          { title: 'Going Into Debt', description: 'The average couple takes 1-2 years to pay off wedding debt. If you cannot pay cash, scale back — the marriage matters more than the party.' },
          { title: 'Ignoring the Per-Guest Cost', description: 'Each guest costs $150-300 in food, drinks, favors, and seating. Cutting 20 guests saves $3,000-6,000 instantly.' },
          { title: 'Skipping the Buffer', description: 'Unexpected costs (alterations, tips, last-minute rentals) add 10-15%. Always keep a miscellaneous buffer in your budget.' },
          { title: 'Vendor Deposits Are Non-Refundable', description: 'Booking too early or without contracts means losing deposits if plans change. Read every cancellation policy.' },
        ]}
        tips={[
          { title: 'Book Off-Season (Nov-Mar)', description: 'Venues and vendors discount 20-40% during off-peak months. A January wedding at the same venue can save $5,000+.' },
          { title: 'Negotiate Package Deals', description: 'Ask venues if they bundle catering, bar, and linens. Bundled packages often save 15-25% vs. booking each vendor separately.' },
          { title: 'Limit the Bar Menu', description: 'A curated selection of 2 signature cocktails, beer, and wine costs 40-50% less than a full open bar with no noticeable impact on guest satisfaction.' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2"><Label>Total Budget</Label><Input type="number" min="0" value={totalBudget} onChange={e => setTotalBudget(e.target.value)} /></div>
        <div className="space-y-2"><Label>Guest Count</Label><Input type="number" min="1" value={guestCount} onChange={e => setGuestCount(e.target.value)} /></div>
        <div className="space-y-2"><Label>Already Saved</Label><Input type="number" min="0" value={currentSavings} onChange={e => setCurrentSavings(e.target.value)} /></div>
        <div className="space-y-2">
          <Label>Months to Save: {monthsToSave[0]}</Label>
          <Slider min={1} max={36} step={1} value={monthsToSave} onValueChange={setMonthsToSave} />
        </div>
      </div>

      {result.budget > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className={cn('rounded-xl p-4 border text-center', canAfford ? 'bg-green-500/10 border-green-500/30' : 'bg-amber-500/10 border-amber-500/30')}>
            {canAfford
              ? <div className="flex items-center justify-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-500" /><span className="font-semibold">You've saved enough!</span></div>
              : <div className="flex items-center justify-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><span className="font-semibold">Save {formatCurrency(result.monthly)}/mo for {result.months} months</span></div>
            }
            <p className="text-sm text-muted-foreground mt-1">Cost per guest: {formatCurrency(result.perGuest)}</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Suggested Allocation</p>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {result.breakdown.map(b => (
                <div key={b.key} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-3 py-2">
                  <span className="text-sm">{b.label} <span className="text-muted-foreground">({(b.pct * 100).toFixed(0)}%)</span></span>
                  <span className="font-semibold text-sm">{formatCurrency(b.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          <CalculatorActions calculatorType="wedding" inputs={{ totalBudget, guestCount, currentSavings, monthsToSave: monthsToSave[0] }}
            results={result} hasResults={result.budget > 0}
            summaryText={`Wedding: ${formatCurrency(result.budget)} budget, ${result.guests} guests, save ${formatCurrency(result.monthly)}/mo.`} />
        </motion.div>
      )}
    </div>
  );
}
