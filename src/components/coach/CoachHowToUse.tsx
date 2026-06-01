import { useState } from 'react';
import { ChevronDown, BookOpen, Search, Shield, Compass } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    n: 1,
    title: 'Review',
    icon: Search,
    color: 'text-prism-orange',
    body: 'Start in Intelligence & Review (cards 1–4). See what happened, why, recovery options, and prevention rules.',
  },
  {
    n: 2,
    title: 'Protect',
    icon: Shield,
    color: 'text-prism-sky',
    body: 'Move to Live Protection (cards 5–8). Run Purchase Guard, fix money leaks, and check your Safe-to-Spend shield.',
  },
  {
    n: 3,
    title: 'Plan',
    icon: Compass,
    color: 'text-prism-lime',
    body: 'Finish in Strategy & Flow (cards 8–12). Deploy your paycheck, time bills, and redirect surplus to wealth.',
  },
];

export function CoachHowToUse() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border/40 bg-card/30 backdrop-blur-md overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-background/30 transition-colors"
        aria-expanded={open}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <BookOpen className="h-4 w-4 text-prism-teal shrink-0" />
          <div className="text-left min-w-0">
            <div className="text-sm font-semibold text-foreground">How to use this page</div>
            <div className="text-[11px] text-muted-foreground truncate">
              12 cards organized into 3 simple steps — Review → Protect → Plan
            </div>
          </div>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-muted-foreground transition-transform shrink-0',
          open && 'rotate-180',
        )} />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 grid gap-2 sm:grid-cols-3 animate-in fade-in-0 slide-in-from-top-1 duration-200">
          {STEPS.map(s => {
            const Icon = s.icon;
            return (
              <div
                key={s.n}
                className="rounded-lg border border-border/40 bg-background/40 p-3 flex flex-col gap-1.5"
              >
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'h-6 w-6 rounded-full bg-background border border-border/60 flex items-center justify-center text-[11px] font-bold font-mono',
                    s.color,
                  )}>
                    {s.n}
                  </span>
                  <Icon className={cn('h-4 w-4', s.color)} />
                  <span className="text-sm font-semibold">{s.title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{s.body}</p>
              </div>
            );
          })}
          <p className="sm:col-span-3 text-[11px] text-muted-foreground italic pt-1">
            Tip: each card is collapsed by default — tap a card to open it. Use the moment tabs above to focus on just the cards relevant to right now.
          </p>
        </div>
      )}
    </div>
  );
}
