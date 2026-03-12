import { useState, useMemo } from 'react';
import { DollarSign, Target, TrendingUp, Calculator, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import PageOverview from '@/components/PageOverview';

interface Offer {
  name: string;
  price: number;
}

const DEFAULT_OFFERS: Offer[] = [
  { name: '', price: 0 },
  { name: '', price: 0 },
  { name: '', price: 0 },
];

const PLACEHOLDERS = [
  { name: 'e.g. 1:1 Coaching', label: 'First Offer' },
  { name: 'e.g. Group Program', label: 'Second Offer' },
  { name: 'e.g. Digital Course', label: 'Third Offer' },
];

const MoneyMath = () => {
  const [revenueGoal, setRevenueGoal] = useState('');
  const [offers, setOffers] = useState<Offer[]>(DEFAULT_OFFERS);

  const goal = parseFloat(revenueGoal) || 0;

  const updateOffer = (index: number, field: keyof Offer, value: string) => {
    setOffers(prev => prev.map((o, i) =>
      i === index ? { ...o, [field]: field === 'price' ? (parseFloat(value) || 0) : value } : o
    ));
  };

  const activeOffers = useMemo(() =>
    offers.filter(o => o.price > 0),
    [offers]
  );

  const results = useMemo(() => {
    if (goal <= 0 || activeOffers.length === 0) return null;

    return activeOffers.map(offer => {
      const unitsNeeded = Math.ceil(goal / offer.price);
      const weeklyUnits = Math.ceil(unitsNeeded / 4);
      const dailyUnits = Math.ceil(unitsNeeded / 30);
      return {
        name: offer.name || 'Unnamed Offer',
        price: offer.price,
        unitsNeeded,
        weeklyUnits,
        dailyUnits,
        totalRevenue: unitsNeeded * offer.price,
      };
    });
  }, [goal, activeOffers]);

  // Blended scenario: if multiple offers, split goal evenly
  const blendedResult = useMemo(() => {
    if (!results || results.length < 2) return null;
    const splitGoal = goal / results.length;
    return results.map(r => ({
      ...r,
      unitsNeeded: Math.ceil(splitGoal / r.price),
      weeklyUnits: Math.ceil(Math.ceil(splitGoal / r.price) / 4),
    }));
  }, [results, goal]);

  return (
    <div className="space-y-6 pb-8">
      <PageOverview
        title="Money Math"
        description="Price your offers. Hit your goals. Calculate exactly how many sales you need."
        icon={Calculator}
        ttsScript="Calculate exactly how many sales of each offer you need to hit your monthly revenue goal."
        features={['Revenue goal planning', 'Per-offer breakdowns', 'Weekly & daily targets', 'Blended scenario analysis']}
      />

      {/* Revenue Goal */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Target className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Monthly Revenue Goal</h2>
        </div>
        <Card>
          <CardContent className="pt-5 pb-5">
            <Label className="text-xs text-muted-foreground uppercase tracking-wide">How much do you want to make per month?</Label>
            <div className="relative mt-2">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
              <Input
                type="text"
                inputMode="numeric"
                placeholder="10,000"
                value={revenueGoal}
                onChange={e => setRevenueGoal(e.target.value.replace(/[^0-9.]/g, ''))}
                className="pl-7 text-lg font-semibold h-11"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Offers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Your Offers</h2>
          <span className="text-xs text-muted-foreground">(up to 3)</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {offers.map((offer, i) => (
            <Card key={i} className="relative overflow-hidden">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                  <CardTitle className="text-sm font-semibold">{PLACEHOLDERS[i].label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 px-4 pb-4">
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Offer Name</Label>
                  <Input
                    placeholder={PLACEHOLDERS[i].name}
                    value={offer.name}
                    onChange={e => updateOffer(i, 'name', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Price ($)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={offer.price || ''}
                    onChange={e => updateOffer(i, 'price', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Results */}
      {!results ? (
        <div className="text-center py-16">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground/20 mb-3" />
          <p className="text-sm text-muted-foreground">Enter your monthly revenue goal to start your money math.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Individual offer breakdowns */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Sales Breakdown</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">If you only sold one offer, here's what it takes to hit ${goal.toLocaleString()}/mo:</p>
            <div className="grid gap-4 md:grid-cols-3">
              {results.map((r, i) => (
                <Card key={i} className="border-primary/20">
                  <CardContent className="pt-5 pb-5 space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Offer</p>
                      <p className="font-semibold text-foreground">{r.name}</p>
                      <p className="text-sm text-muted-foreground">${r.price.toLocaleString()} each</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded-lg bg-primary/10 p-2">
                        <p className="text-xl font-bold text-primary">{r.unitsNeeded}</p>
                        <p className="text-[10px] text-muted-foreground uppercase">/ month</p>
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
                    <div className={cn(
                      'text-xs rounded-md p-2 text-center font-medium',
                      r.totalRevenue >= goal ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
                    )}>
                      = ${r.totalRevenue.toLocaleString()} revenue
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Blended scenario */}
          {blendedResult && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Blended Scenario</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">Split your ${goal.toLocaleString()} goal evenly across all {blendedResult.length} offers:</p>
              <Card>
                <CardContent className="pt-5 pb-5">
                  <div className="grid gap-4 md:grid-cols-3">
                    {blendedResult.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.unitsNeeded} sales/mo · {r.weeklyUnits}/wk
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary whitespace-nowrap">
                          ${(r.unitsNeeded * r.price).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MoneyMath;
