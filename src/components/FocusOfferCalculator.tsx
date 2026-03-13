import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useCurrency } from '@/hooks/use-currency';
import { cn } from '@/lib/utils';
import {
  Target, TrendingUp, Users, Calendar, DollarSign, BarChart3, Percent,
  Scale, Activity, ArrowUpRight, ArrowDownRight, Minus,
} from 'lucide-react';
import AnimatedNumber from '@/components/AnimatedNumber';
import CalculatorInsight from '@/components/CalculatorInsight';
import CalculatorActions from '@/components/CalculatorActions';
import CalculatorGuide from '@/components/CalculatorGuide';
import CalculatorScenariosAndPitfalls from '@/components/CalculatorScenariosAndPitfalls';

type Timeframe = 'weekly' | 'monthly' | 'quarterly' | 'yearly';

const TIMEFRAME_CONFIG: Record<Timeframe, { label: string; months: number; weeks: number; days: number }> = {
  weekly: { label: 'Weekly', months: 0.25, weeks: 1, days: 7 },
  monthly: { label: 'Monthly', months: 1, weeks: 4, days: 30 },
  quarterly: { label: 'Quarterly', months: 3, weeks: 13, days: 90 },
  yearly: { label: 'Yearly', months: 12, weeks: 52, days: 365 },
};

interface Offer {
  name: string;
  price: number;
  cost: number;
}

export default function FocusOfferCalculator({ onOpenHistory }: { onOpenHistory?: () => void }) {
  const { formatCurrency } = useCurrency();
  const [searchParams, setSearchParams] = useSearchParams();

  // Read shared link params once at mount time (before parent clears them)
  const initialParams = useMemo(() => {
    const url = new URL(window.location.href);
    const sp = url.searchParams;
    if (sp.get('calc') !== 'offers') return null;
    return {
      goal: sp.get('goal') || '',
      timeframe: (sp.get('timeframe') as Timeframe) || 'monthly',
      fixedCosts: sp.get('fixedCosts') || '',
      actualRevenue: sp.get('actualRevenue') || '',
      offers: Array.from({ length: 3 }, (_, i) => ({
        name: sp.get(`o${i}n`) || '',
        price: parseFloat(sp.get(`o${i}p`) || '0') || 0,
        cost: parseFloat(sp.get(`o${i}c`) || '0') || 0,
      })),
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Core state
  const [timeframe, setTimeframe] = useState<Timeframe>(initialParams?.timeframe || 'monthly');
  const [revenueGoal, setRevenueGoal] = useState(initialParams?.goal || '');
  const [fixedCosts, setFixedCosts] = useState(initialParams?.fixedCosts || '');
  const [actualRevenue, setActualRevenue] = useState(initialParams?.actualRevenue || '');
  const [offers, setOffers] = useState<Offer[]>(
    initialParams?.offers && initialParams.offers.some(o => o.price > 0)
      ? initialParams.offers
      : [
          { name: '', price: 0, cost: 0 },
          { name: '', price: 0, cost: 0 },
          { name: '', price: 0, cost: 0 },
        ]
  );

  // Clean up URL params after restoring
  useEffect(() => {
    if (initialParams) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const goal = parseFloat(revenueGoal) || 0;
  const fixed = parseFloat(fixedCosts) || 0;
  const actual = parseFloat(actualRevenue) || 0;
  const tf = TIMEFRAME_CONFIG[timeframe];

  const updateOffer = (index: number, field: keyof Offer, value: string) => {
    setOffers(prev => prev.map((o, i) =>
      i === index ? { ...o, [field]: field === 'name' ? value : (parseFloat(value) || 0) } : o
    ));
  };

  const activeOffers = useMemo(() => offers.filter(o => o.price > 0), [offers]);

  // ─── Core results ───
  const offerResults = useMemo(() => {
    if (goal <= 0 || activeOffers.length === 0) return null;
    return activeOffers.map(offer => {
      const unitsNeeded = Math.ceil(goal / offer.price);
      const margin = offer.price - offer.cost;
      const marginPct = offer.price > 0 ? (margin / offer.price) * 100 : 0;
      const grossRevenue = unitsNeeded * offer.price;
      const totalCost = unitsNeeded * offer.cost;
      const netProfit = grossRevenue - totalCost;
      return {
        name: offer.name || 'Unnamed Offer',
        price: offer.price,
        cost: offer.cost,
        unitsNeeded,
        weeklyUnits: Math.ceil(unitsNeeded / tf.weeks),
        dailyUnits: Math.ceil(unitsNeeded / tf.days),
        grossRevenue,
        totalCost,
        netProfit,
        margin,
        marginPct,
      };
    });
  }, [goal, activeOffers, tf]);

  // ─── Blended scenario ───
  const blendedResult = useMemo(() => {
    if (!offerResults || offerResults.length < 2) return null;
    const splitGoal = goal / offerResults.length;
    return offerResults.map(r => ({
      ...r,
      unitsNeeded: Math.ceil(splitGoal / r.price),
      weeklyUnits: Math.ceil(Math.ceil(splitGoal / r.price) / tf.weeks),
      grossRevenue: Math.ceil(splitGoal / r.price) * r.price,
      netProfit: Math.ceil(splitGoal / r.price) * (r.price - r.cost),
    }));
  }, [offerResults, goal, tf]);

  // ─── Break-even ───
  const breakEvenResults = useMemo(() => {
    if (fixed <= 0 || activeOffers.length === 0) return null;
    return activeOffers.map(offer => {
      const margin = offer.price - offer.cost;
      if (margin <= 0) return { name: offer.name || 'Unnamed', units: Infinity, revenue: 0, margin: 0 };
      const units = Math.ceil(fixed / margin);
      return {
        name: offer.name || 'Unnamed',
        units,
        revenue: units * offer.price,
        margin,
      };
    });
  }, [fixed, activeOffers]);

  // ─── Scenarios ───
  const scenarios = useMemo(() => {
    if (goal <= 0 || activeOffers.length === 0) return null;
    const multipliers = [
      { label: 'Conservative', factor: 0.7, color: 'text-prism-amber' },
      { label: 'Realistic', factor: 1.0, color: 'text-primary' },
      { label: 'Stretch', factor: 1.3, color: 'text-prism-teal' },
    ];
    return multipliers.map(m => ({
      ...m,
      target: goal * m.factor,
      offers: activeOffers.map(offer => ({
        name: offer.name || 'Unnamed',
        units: Math.ceil((goal * m.factor) / offer.price),
        revenue: Math.ceil((goal * m.factor) / offer.price) * offer.price,
        profit: Math.ceil((goal * m.factor) / offer.price) * (offer.price - offer.cost),
      })),
    }));
  }, [goal, activeOffers]);

  // ─── Revenue tracker ───
  const trackerPct = goal > 0 ? Math.min(100, (actual / goal) * 100) : 0;
  const trackerStatus = trackerPct >= 100 ? 'achieved' : trackerPct >= 75 ? 'on-track' : trackerPct >= 50 ? 'behind' : 'at-risk';
  const statusConfig = {
    achieved: { label: 'Goal Achieved! 🎉', color: 'text-prism-teal', bg: 'bg-prism-teal/10 border-prism-teal/30' },
    'on-track': { label: 'On Track', color: 'text-primary', bg: 'bg-primary/10 border-primary/30' },
    behind: { label: 'Behind Pace', color: 'text-prism-amber', bg: 'bg-prism-amber/10 border-prism-amber/30' },
    'at-risk': { label: 'At Risk', color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/30' },
  };

  const summaryText = offerResults ? `# 🎯 Focus Offer Calculator (${tf.label})\n\n**Inputs**\n- **Revenue Goal:** $${goal.toLocaleString()}\n- **Timeframe:** ${tf.label}\n- **Fixed Costs:** $${fixedCosts.toLocaleString()}\n\n**Results**\n${offerResults.map(r => `- **${r.name}:** ${r.unitsNeeded} units → $${r.grossRevenue.toLocaleString()} revenue (profit: $${r.netProfit.toLocaleString()})`).join('\n')}` : '';

  return (
    <div className="space-y-6">
      <CalculatorGuide
        title="Focus Offer / Revenue Goal"
        icon={Target}
        iconColor="text-prism-lime"
        ttsScript="The Focus Offer Calculator helps you plan how many sales you need to hit your revenue goal. Start by choosing a timeframe: weekly, monthly, quarterly, or yearly. Then set your revenue target, fixed costs, and actual revenue earned so far. Add up to three offers with a name, price, and cost per unit. The Sales Breakdown tab shows how many units of each offer you need to sell per period, per week, and per day. The Scenarios tab compares conservative, realistic, and stretch targets. The Break-Even tab shows how many units you need to cover your fixed costs. The Blended tab splits your goal evenly across all offers. The Revenue Tracker gauge shows your progress toward the goal with a status indicator."
        instructions={[
          'Choose a timeframe: weekly, monthly, quarterly, or yearly',
          'Set your revenue goal for that period',
          'Add fixed costs for break-even analysis',
          'Enter actual revenue earned so far to track progress',
          'Name up to 3 offers with price and cost per unit',
          'View Sales Breakdown, Scenarios, Break-Even, and Blended tabs',
          'The Revenue Tracker shows progress with a visual gauge',
        ]}
      />
      <CalculatorScenariosAndPitfalls
        scenarios={[
          { title: 'Premium 1:1 Service', description: 'A $3,000 coaching package means only 4 sales to hit $10k/mo. Fewer clients, higher margins, more personal attention.' },
          { title: 'Low-Ticket Funnel', description: 'A $47 digital product needs 213 sales for $10k. Works best with large email lists or paid traffic at scale.' },
          { title: 'Tiered Offer Stack', description: 'Combine a $97 course + $497 group program + $2k 1:1 coaching. Blended pricing captures all budget levels.' },
          { title: 'Recurring Revenue', description: 'A $97/mo membership with 100 members generates $9,700/mo predictably. Focus on retention over acquisition.' },
        ]}
        pitfalls={[
          { title: 'Underpricing Your Offer', description: 'Charging too little means you need unrealistic sales volume. Price based on value delivered, not competitor rates.' },
          { title: 'Ignoring Cost of Delivery', description: 'A $1,000 offer with $600 in costs gives only $400 profit. Always calculate true margins before setting goals.' },
          { title: 'Too Many Offers', description: 'Spreading focus across 5+ offers dilutes marketing efforts. One strong offer outperforms three mediocre ones.' },
          { title: 'No Tracking Habit', description: 'Setting a goal without tracking actual revenue weekly leads to surprises. Update the tracker regularly.' },
        ]}
      />
      {/* ─── GOAL & TIMEFRAME ─── */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-prism-lime" /> Revenue Goal
          </CardTitle>
          <CardDescription>Set your target and timeframe</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Timeframe toggle */}
          <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
            {(Object.keys(TIMEFRAME_CONFIG) as Timeframe[]).map(tf => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  'flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-all',
                  timeframe === tf
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {TIMEFRAME_CONFIG[tf].label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{TIMEFRAME_CONFIG[timeframe].label} Revenue Goal</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="10,000"
                  value={revenueGoal}
                  onChange={e => setRevenueGoal(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Fixed Costs ({TIMEFRAME_CONFIG[timeframe].label})</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="2,000"
                  value={fixedCosts}
                  onChange={e => setFixedCosts(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Actual Revenue (so far)</Label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  inputMode="numeric"
                  placeholder="0"
                  value={actualRevenue}
                  onChange={e => setActualRevenue(e.target.value.replace(/[^0-9.]/g, ''))}
                  className="h-9 text-sm pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── OFFERS ─── */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-prism-lime" /> Your Offers
          </CardTitle>
          <CardDescription>Add cost per unit to calculate profit margins</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {offers.map((offer, i) => (
              <div key={i} className="space-y-3 p-4 rounded-xl bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                  <span className="text-sm font-medium">Offer {i + 1}</span>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder={i === 0 ? 'e.g. 1:1 Coaching' : i === 1 ? 'e.g. Group Program' : 'e.g. Digital Course'}
                    value={offer.name}
                    onChange={e => updateOffer(i, 'name', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={offer.price || ''}
                    onChange={e => updateOffer(i, 'price', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Cost per Unit ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={offer.cost || ''}
                    onChange={e => updateOffer(i, 'cost', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                {offer.price > 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Margin: <span className={cn('font-semibold', offer.price - offer.cost > 0 ? 'text-prism-teal' : 'text-destructive')}>
                      {Math.round(((offer.price - offer.cost) / offer.price) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ─── REVENUE TRACKER GAUGE ─── */}
      {goal > 0 && (
        <Card className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="font-display flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-prism-lime" /> Revenue Tracker
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold">
                  <AnimatedNumber value={actual} formatFn={formatCurrency} />
                </p>
                <p className="text-xs text-muted-foreground">of {formatCurrency(goal)} goal</p>
              </div>
              <div className={cn('px-3 py-1.5 rounded-full border text-xs font-semibold', statusConfig[trackerStatus].bg)}>
                <span className={statusConfig[trackerStatus].color}>{statusConfig[trackerStatus].label}</span>
              </div>
            </div>
            <div className="space-y-1">
              <Progress value={trackerPct} className="h-3" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0%</span>
                <span className="font-semibold">{Math.round(trackerPct)}%</span>
                <span>100%</span>
              </div>
            </div>
            {goal > actual && actual > 0 && (
              <p className="text-xs text-muted-foreground">
                Remaining: <span className="font-semibold text-foreground">{formatCurrency(goal - actual)}</span>
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* ─── RESULTS TABS ─── */}
      {!offerResults ? (
        <Card className="prism-card-shine border-border/50">
          <CardContent className="py-12 text-center">
            <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Enter your revenue goal and offer prices to see your sales breakdown.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="breakdown" className="space-y-4">
          <TabsList className="w-full grid grid-cols-4 h-9">
            <TabsTrigger value="breakdown" className="text-xs">Sales Breakdown</TabsTrigger>
            <TabsTrigger value="scenarios" className="text-xs">Scenarios</TabsTrigger>
            <TabsTrigger value="breakeven" className="text-xs">Break-Even</TabsTrigger>
            <TabsTrigger value="blended" className="text-xs">Blended</TabsTrigger>
          </TabsList>

          {/* ─ Sales Breakdown ─ */}
          <TabsContent value="breakdown">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-prism-lime" /> Sales Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-xs text-muted-foreground">If you only sold one offer, here's what it takes to hit {formatCurrency(goal)} {tf.label.toLowerCase()}:</p>
                <div className="grid gap-4 md:grid-cols-3">
                  {offerResults.map((r, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="p-4 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/40 space-y-3"
                    >
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">Offer</p>
                        <p className="font-semibold text-foreground">{r.name}</p>
                        <p className="text-sm text-muted-foreground">{formatCurrency(r.price)} each</p>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <p className="text-xl font-bold text-primary">{r.unitsNeeded}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">/ {timeframe === 'weekly' ? 'wk' : timeframe === 'monthly' ? 'mo' : timeframe === 'quarterly' ? 'qtr' : 'yr'}</p>
                        </div>
                        <div className="rounded-lg bg-accent/50 p-2">
                          <p className="text-xl font-bold text-foreground">{r.weeklyUnits}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">/ week</p>
                        </div>
                        <div className="rounded-lg bg-muted p-2">
                          <p className="text-xl font-bold text-foreground">{r.dailyUnits}</p>
                          <p className="text-[10px] text-muted-foreground uppercase">/ day</p>
                        </div>
                      </div>
                      {/* Profit margin */}
                      {r.cost > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Gross Revenue</span>
                            <span className="font-medium">{formatCurrency(r.grossRevenue)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Total Cost</span>
                            <span className="font-medium text-destructive">-{formatCurrency(r.totalCost)}</span>
                          </div>
                          <div className="border-t border-border/50 pt-1 flex justify-between text-xs">
                            <span className="font-semibold">Net Profit</span>
                            <span className={cn('font-bold', r.netProfit >= 0 ? 'text-prism-teal' : 'text-destructive')}>
                              {formatCurrency(r.netProfit)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Percent className="h-3 w-3" />
                            <span className={cn('font-semibold', r.marginPct >= 50 ? 'text-prism-teal' : r.marginPct >= 20 ? 'text-prism-amber' : 'text-destructive')}>
                              {Math.round(r.marginPct)}% margin
                            </span>
                          </div>
                        </div>
                      )}
                      {r.cost === 0 && (
                        <div className={cn(
                          'text-xs rounded-md p-2 text-center font-medium bg-prism-teal/10 text-prism-teal'
                        )}>
                          = {formatCurrency(r.grossRevenue)} revenue
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
                <CalculatorActions
                  calculatorType="offers"
                  inputs={{
                    goal: revenueGoal,
                    timeframe,
                    fixedCosts,
                    actualRevenue,
                    ...offers.reduce((acc, o, i) => ({
                      ...acc,
                      [`o${i}n`]: o.name,
                      [`o${i}p`]: o.price || '',
                      [`o${i}c`]: o.cost || '',
                    }), {}),
                  }}
                  results={{ offers: offerResults }}
                  hasResults={true}
                  summaryText={summaryText}
                  onOpenHistory={onOpenHistory}
                  printData={{
                    inputs: [
                      { label: 'Revenue Goal', value: formatCurrency(goal) },
                      { label: 'Timeframe', value: tf.label },
                      { label: 'Fixed Costs', value: fixed > 0 ? formatCurrency(fixed) : 'N/A' },
                      ...activeOffers.map((o, i) => ({ label: `Offer ${i+1}`, value: `${o.name || 'Unnamed'} — ${formatCurrency(o.price)} (cost: ${formatCurrency(o.cost)})` })),
                    ],
                    results: offerResults ? offerResults.map(r => ({
                      label: r.name,
                      value: `${r.unitsNeeded} sales needed (${formatCurrency(r.netProfit)} profit)`,
                      highlight: r === offerResults[0],
                    })) : [],
                    notes: breakEvenResults ? `Break-even: ${breakEvenResults.map(b => `${b.name}: ${b.units === Infinity ? 'N/A' : b.units + ' units'}`).join(' | ')}` : undefined,
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─ Scenario Comparison ─ */}
          <TabsContent value="scenarios">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-prism-lime" /> Scenario Comparison
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {scenarios && scenarios.map((scenario, si) => (
                  <div key={si} className="rounded-xl border border-border/40 overflow-hidden">
                    <div className={cn('px-4 py-2 flex items-center justify-between', si === 1 ? 'bg-primary/10' : 'bg-muted/30')}>
                      <div className="flex items-center gap-2">
                        {si === 0 ? <ArrowDownRight className={cn('h-4 w-4', scenario.color)} /> : si === 2 ? <ArrowUpRight className={cn('h-4 w-4', scenario.color)} /> : <Minus className={cn('h-4 w-4', scenario.color)} />}
                        <span className={cn('text-sm font-semibold', scenario.color)}>{scenario.label}</span>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(scenario.target)}</span>
                    </div>
                    <div className="p-3 space-y-2">
                      {scenario.offers.map((o, oi) => (
                        <div key={oi} className="flex items-center justify-between text-xs px-2">
                          <span className="text-muted-foreground">{o.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono">{o.units} units</span>
                            <span className="font-semibold">{formatCurrency(o.revenue)}</span>
                            {o.profit !== o.revenue && (
                              <span className={cn('text-[10px]', o.profit >= 0 ? 'text-prism-teal' : 'text-destructive')}>
                                net {formatCurrency(o.profit)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─ Break-Even Analysis ─ */}
          <TabsContent value="breakeven">
            <Card className="prism-card-shine border-border/50">
              <CardHeader>
                <CardTitle className="font-display flex items-center gap-2 text-lg">
                  <Scale className="h-5 w-5 text-prism-lime" /> Break-Even Analysis
                </CardTitle>
                <CardDescription>
                  Units needed to cover {formatCurrency(fixed)} in fixed costs
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!breakEvenResults || fixed <= 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    Enter your fixed costs above to see break-even analysis.
                  </p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-3">
                    {breakEvenResults.map((r, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                        className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-muted/40 to-muted/10 text-center space-y-2"
                      >
                        <p className="text-xs text-muted-foreground font-medium">{r.name}</p>
                        {r.units === Infinity ? (
                          <p className="text-sm text-destructive font-semibold">Negative margin — can't break even</p>
                        ) : (
                          <>
                            <p className="text-3xl font-bold text-primary">
                              <AnimatedNumber value={r.units} />
                            </p>
                            <p className="text-xs text-muted-foreground">units to break even</p>
                            <div className="text-xs space-y-0.5 pt-1 border-t border-border/30">
                              <p>Revenue at break-even: <span className="font-semibold">{formatCurrency(r.revenue)}</span></p>
                              <p>Margin per unit: <span className="font-semibold text-prism-teal">{formatCurrency(r.margin)}</span></p>
                            </div>
                          </>
                        )}
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─ Blended Scenario ─ */}
          <TabsContent value="blended">
            {blendedResult ? (
              <Card className="prism-card-shine border-border/50">
                <CardHeader>
                  <CardTitle className="font-display flex items-center gap-2 text-lg">
                    <Calendar className="h-5 w-5 text-prism-lime" /> Blended Scenario
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">Split your {formatCurrency(goal)} goal evenly across all {blendedResult.length} offers:</p>
                  <div className="grid gap-4 md:grid-cols-3">
                    {blendedResult.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.unitsNeeded} sales · {r.weeklyUnits}/wk
                          </p>
                          {r.cost > 0 && (
                            <p className="text-xs text-prism-teal">net {formatCurrency(r.netProfit)}</p>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-primary whitespace-nowrap">
                          {formatCurrency(r.grossRevenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="prism-card-shine border-border/50">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Add prices to at least 2 offers to see the blended scenario.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      <CalculatorInsight
        calculatorType="offers"
        inputs={{ goal: revenueGoal, timeframe, fixedCosts }}
        results={{ offers: offerResults }}
        hasResults={!!offerResults && offerResults.length > 0}
      />
    </div>
  );
}
