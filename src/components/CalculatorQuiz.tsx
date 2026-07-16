import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Sparkles, Home, Car, CreditCard, TrendingUp, PiggyBank, Shield, Target,
  Heart, Plane, Wallet, Receipt, ArrowLeftRight, ChevronRight, RotateCcw,
} from 'lucide-react';

type Goal =
  | 'home' | 'debt' | 'invest' | 'retire' | 'save' | 'car'
  | 'tax' | 'life' | 'travel' | 'income';

interface Calc { id: string; label: string; icon: any; color: string; bg: string; }

const GOALS: { id: Goal; label: string; desc: string; icon: any; color: string }[] = [
  { id: 'home',   label: 'Buy or own a home',      desc: 'Mortgage, affordability, refi, PMI',    icon: Home,          color: 'text-prism-teal' },
  { id: 'debt',   label: 'Pay off debt',           desc: 'Credit cards, loans, student loans',    icon: CreditCard,    color: 'text-prism-rose' },
  { id: 'invest', label: 'Grow investments',       desc: 'Compound growth, 401(k), Roth',         icon: TrendingUp,    color: 'text-prism-lime' },
  { id: 'retire', label: 'Plan for retirement',    desc: 'FIRE, Social Security, RMDs',           icon: Target,        color: 'text-prism-teal' },
  { id: 'save',   label: 'Save for a goal',        desc: 'Emergency fund, HYSA vs CD',            icon: PiggyBank,     color: 'text-prism-amber' },
  { id: 'car',    label: 'Buy or lease a car',     desc: 'Auto loan, affordability, lease',       icon: Car,           color: 'text-prism-sky' },
  { id: 'tax',    label: 'Understand my taxes',    desc: 'Paycheck, cap gains, 1099',             icon: Receipt,       color: 'text-prism-violet' },
  { id: 'life',   label: 'Plan a life event',      desc: 'Wedding, baby, big purchase',           icon: Heart,         color: 'text-prism-rose' },
  { id: 'travel', label: 'Plan a trip',            desc: 'Vacation, honeymoon, currency',         icon: Plane,         color: 'text-prism-sky' },
  { id: 'income', label: 'Grow my income',         desc: 'Salary raise, pricing, offers',         icon: Wallet,        color: 'text-prism-lime' },
];

const RECOMMENDATIONS: Record<Goal, string[]> = {
  home:   ['homeafford', 'mortgage', 'rentvsbuy', 'refi', 'extramtg', 'pmi', 'heloc-vs-mortgage'],
  debt:   ['credit', 'snowvsava', 'debt', 'studentloan', 'truecost'],
  invest: ['compound', 'investment', 'match401k', 'rothtrad', 'wealth'],
  retire: ['retiregoal', 'fire', 'ssclaim', 'rmd', 'rothladder'],
  save:   ['emergency', 'cdhysa', 'compound', 'inflation'],
  car:    ['carafford', 'auto', 'leasevsbuy', 'truecost'],
  tax:    ['paycheck', 'capgains', 'se1099', 'salaryraise', 'rothtrad'],
  life:   ['wedding', 'baby', 'lifeins', 'bigpurchase', 'holiday'],
  travel: ['vacation', 'honeymoon', 'currency'],
  income: ['salaryraise', 'offers', 'pricing', 'paycheck'],
};

interface Props {
  calculators: Calc[];
  onPick: (id: string) => void;
}

export default function CalculatorQuiz({ calculators, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState<Goal | null>(null);

  const recIds = goal ? RECOMMENDATIONS[goal] : [];
  const recs = recIds
    .map(id => calculators.find(c => c.id === id))
    .filter((c): c is Calc => !!c);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-primary/5 p-4 text-left hover:border-primary/60 hover:shadow-lg transition-all group"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-background/60 backdrop-blur-sm group-hover:scale-110 transition-transform">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold">Not sure which calculator to use?</div>
          <div className="text-xs text-muted-foreground">Answer one question — we'll recommend the right ones.</div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      </button>
    );
  }

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">Calculator Finder</span>
          </div>
          <div className="flex items-center gap-1">
            {goal && (
              <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => setGoal(null)}>
                <RotateCcw className="h-3 w-3" /> Start over
              </Button>
            )}
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setOpen(false); setGoal(null); }}>
              Close
            </Button>
          </div>
        </div>

        {!goal ? (
          <>
            <p className="text-xs text-muted-foreground">What are you trying to figure out?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GOALS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setGoal(g.id)}
                  className="flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-3 text-left hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-background/70">
                    <g.icon className={cn('h-4 w-4', g.color)} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{g.label}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{g.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Recommended calculators <span className="text-foreground">— start with the first, it's the best fit.</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recs.map((c, i) => (
                <button
                  key={c.id}
                  onClick={() => onPick(c.id)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl border p-3 text-left transition-all',
                    'bg-gradient-to-br hover:-translate-y-0.5 hover:shadow-md',
                    c.bg,
                    i === 0 ? 'border-primary/60 ring-1 ring-primary/30' : 'border-border/50 hover:border-primary/50',
                  )}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-background/60 group-hover:scale-110 transition-transform">
                    <c.icon className={cn('h-4 w-4', c.color)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate flex items-center gap-1.5">
                      {c.label}
                      {i === 0 && <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Best</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                </button>
              ))}
            </div>
            {recs.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No matches found — try a different goal.</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
