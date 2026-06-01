import { format, parseISO } from 'date-fns';
import { useBillTiming } from '@/hooks/use-bill-timing';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar, AlertTriangle, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export function BillTimingOptimizer() {
  const { collisions, totalCash, upcomingCount } = useBillTiming();

  if (upcomingCount === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No upcoming recurring bills in the next 30 days.
      </p>
    );
  }

  if (collisions.length === 0) {
    return (
      <div className="flex items-center gap-2 text-prism-teal text-sm">
        <CheckCircle2 className="h-4 w-4" />
        <span>No bill collisions in the next 30 days. Cash on hand: {fmt(totalCash)}.</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Calendar className="h-3 w-3" />
        Cash on hand {fmt(totalCash)} · {collisions.length} collision window{collisions.length === 1 ? '' : 's'} detected
      </div>

      {collisions.map((c, idx) => (
        <Card key={idx} className="p-3 bg-prism-amber/5 border-prism-amber/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-prism-amber" />
                <span className="text-xs font-bold">
                  {format(parseISO(c.window_start), 'MMM d')} – {format(parseISO(c.window_end), 'MMM d')}
                </span>
                <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-prism-amber/10 border-prism-amber/30 text-prism-amber">
                  {c.bills.length} bills
                </Badge>
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-sm font-bold text-prism-rose">{fmt(c.total)}</span>
                <span className="text-[10px] text-muted-foreground">vs {fmt(c.cash_available)} cash</span>
              </div>
            </div>
          </div>

          <ul className="space-y-1 mb-2">
            {c.bills.map(b => (
              <li key={b.id} className="flex items-center justify-between text-[11px]">
                <span className="truncate">{format(parseISO(b.due_date), 'MMM d')} · {b.merchant}</span>
                <span className="font-mono text-muted-foreground">{fmt(b.amount)}</span>
              </li>
            ))}
          </ul>

          {c.suggested_shifts.length > 0 && (
            <div className="border-t border-border/40 pt-2 mt-2 space-y-1">
              <p className="text-[10px] uppercase tracking-wider font-bold text-prism-sky">Suggested due-date shifts</p>
              {c.suggested_shifts.map(s => (
                <div key={s.id} className="flex items-center justify-between text-[11px]">
                  <span className="truncate">{s.merchant}</span>
                  <span className="flex items-center gap-1.5 font-mono">
                    {format(parseISO(s.from_date), 'MMM d')}
                    <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-prism-sky">{format(parseISO(s.suggested_date), 'MMM d')}</span>
                  </span>
                </div>
              ))}
              <Button size="sm" variant="ghost" asChild className="h-6 w-full text-[11px] mt-1">
                <Link to="/recurring">
                  Adjust in Recurring <ExternalLink className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
