import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Mail, CreditCard, Plus, Hourglass, Search, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { StepKind, TimelineStep } from '@/lib/credit/triBureauTimeline';

const ICON: Record<StepKind, typeof Mail> = {
  dispute: Mail,
  limit: Plus,
  paydown: CreditCard,
  wait: Hourglass,
  verify: FileCheck2,
  apply: Search,
};

const TONE: Record<StepKind, string> = {
  dispute: 'text-prism-rose',
  limit: 'text-prism-sky',
  paydown: 'text-prism-lime',
  wait: 'text-prism-amber',
  verify: 'text-prism-teal',
  apply: 'text-primary',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function TriBureauTimelinePanel({ steps }: { steps: TimelineStep[] }) {
  const cash = steps.reduce((s, x) => s + x.cash, 0);
  const months = steps.length ? Math.max(...steps.map(s => s.monthOffset)) : 0;

  return (
    <Card className="glass-card border-prism-teal/30">
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-prism-teal" /> Step-by-Step Action Timeline
            </CardTitle>
            <CardDescription>
              Your stacked scenario sequenced in the order the bureaus actually update — dispute first, pay down
              before statement cut, apply last.
            </CardDescription>
          </div>
          {steps.length > 0 && (
            <div className="flex gap-1.5">
              <Badge variant="outline" className="text-[10px]">{months} month plan</Badge>
              {cash > 0 && <Badge variant="secondary" className="text-[10px]">{fmt(cash)} cash needed</Badge>}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {steps.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Stack at least one action above and your sequenced plan appears here with dates and expected score impact.
          </p>
        ) : (
          <ol className="relative space-y-3 pl-6 before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-px before:bg-border/60">
            {steps.map((s, i) => {
              const Icon = ICON[s.kind];
              return (
                <li key={`${s.kind}-${i}`} className="relative">
                  <span className={cn('absolute -left-6 top-1 rounded-full bg-background border border-border/60 p-1', TONE[s.kind])}>
                    <Icon className="h-3 w-3" />
                  </span>
                  <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5 space-y-1">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{s.dateLabel}</p>
                        <p className="text-sm font-medium">{s.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        {s.impact !== 0 && (
                          <p className={cn('text-sm font-bold tabular-nums', s.impact > 0 ? 'text-prism-lime' : 'text-prism-rose')}>
                            {s.impact > 0 ? '+' : ''}{s.impact} pts
                          </p>
                        )}
                        {s.cumulative != null && (
                          <p className="text-[10px] text-muted-foreground">score ≈ {s.cumulative}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">{s.detail}</p>
                    {s.cash > 0 && (
                      <p className="text-[11px] text-prism-amber">Cash required: {fmt(s.cash)}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
