import { useEffect, useMemo, useState } from 'react';
import { Sparkles, ArrowRight, Zap, Calendar, ShoppingBag, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Moment } from './moment-types';

interface Scenario {
  id: string;
  tag: string;
  icon: any;
  color: string;
  headline: string;
  body: string;
  cta: string;
  targetMoment: Moment;
  targetCard: number;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'paid',
    tag: 'You just got paid',
    icon: Zap,
    color: 'text-prism-lime',
    headline: 'Deploy this paycheck before it disappears.',
    body: 'Coach splits it into bills, buffer, goals, and Safe-to-Spend — so nothing gets accidentally spent.',
    cta: 'Open Paycheck Deployment',
    targetMoment: 'week',
    targetCard: 8,
  },
  {
    id: 'bill-week',
    tag: 'Bill week incoming',
    icon: Calendar,
    color: 'text-prism-sky',
    headline: 'Three big bills hit before your next paycheck.',
    body: 'Bill Timing Optimizer reshuffles due dates so you stop living paycheck-to-bill.',
    cta: 'Smooth out the month',
    targetMoment: 'month',
    targetCard: 9,
  },
  {
    id: 'impulse',
    tag: 'Tempted to buy something',
    icon: ShoppingBag,
    color: 'text-prism-amber',
    headline: 'Run it through Purchase Guard first.',
    body: 'Fit Score + 24h wait + override-pattern check — catches the buys you usually regret.',
    cta: 'Run a purchase check',
    targetMoment: 'today',
    targetCard: 5,
  },
  {
    id: 'creep',
    tag: 'Subscription & fee creep',
    icon: Repeat,
    color: 'text-prism-rose',
    headline: 'Quiet $9.99s add up to thousands a year.',
    body: 'Money Leak Stopper finds overdraft fees, dormant subs, and silent price hikes — and redirects them to wealth.',
    cta: 'See your leaks',
    targetMoment: 'month',
    targetCard: 6,
  },
];

interface Props {
  monthlyStS: number;
  bufferPercent: number;
  leakCount: number;
  onJump: (moment: Moment, card: number) => void;
}

export function SituationRoom({ monthlyStS, bufferPercent, leakCount, onJump }: Props) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setIdx(i => (i + 1) % SCENARIOS.length), 6000);
    return () => clearInterval(t);
  }, [paused]);

  const s = SCENARIOS[idx];
  const Icon = s.icon;
  const fmt = useMemo(() => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }), []);

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="relative overflow-hidden rounded-xl border border-prism-teal/20 bg-gradient-to-br from-prism-navy/80 via-prism-navy/60 to-prism-teal/10 p-4 sm:p-5 backdrop-blur-sm"
    >
      <div className="absolute -top-16 -right-16 h-56 w-56 rounded-full bg-prism-amber/10 blur-3xl animate-pulse" />
      <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-prism-teal/10 blur-3xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-prism-amber" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-prism-amber">
            PrismMoney™ Coach · Situation Room
          </span>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div key={s.id} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <Badge
              variant="outline"
              className={cn('mb-3 gap-1.5 bg-background/40 border-border/40', s.color)}
            >
              <Icon className="h-3 w-3" />
              {s.tag}
            </Badge>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">
              {s.headline}
            </h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{s.body}</p>
            <div className="mt-4 flex flex-wrap gap-2 items-center">
              <Button
                size="sm"
                onClick={() => onJump(s.targetMoment, s.targetCard)}
                className="bg-prism-teal hover:bg-prism-teal/90 text-prism-navy font-semibold"
              >
                {s.cta} <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
              <span className="text-[11px] text-muted-foreground">
                → Card {s.targetCard}
              </span>
            </div>
          </div>

          {/* Live stat strip */}
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:min-w-[180px]">
            <div className="rounded-lg bg-background/40 border border-border/40 px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Safe to spend</div>
              <div className="font-mono text-sm font-bold text-prism-teal">{fmt.format(monthlyStS)}/mo</div>
            </div>
            <div className="rounded-lg bg-background/40 border border-border/40 px-3 py-2">
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Buffer</div>
              <div className="font-mono text-sm font-bold">{bufferPercent}%</div>
            </div>
            <div className={cn(
              'rounded-lg border px-3 py-2',
              leakCount > 0 ? 'bg-prism-amber/10 border-prism-amber/30' : 'bg-background/40 border-border/40',
            )}>
              <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Leaks</div>
              <div className={cn('font-mono text-sm font-bold', leakCount > 0 && 'text-prism-amber')}>
                {leakCount}
              </div>
            </div>
          </div>
        </div>

        {/* Dots */}
        <div className="mt-5 flex items-center gap-1.5">
          {SCENARIOS.map((sc, i) => (
            <button
              key={sc.id}
              onClick={() => setIdx(i)}
              aria-label={`Show scenario: ${sc.tag}`}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === idx ? 'w-8 bg-prism-teal' : 'w-1.5 bg-border hover:bg-muted-foreground/50',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
