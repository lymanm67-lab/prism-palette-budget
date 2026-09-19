import { useMemo, useState } from 'react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isSameDay, isSameMonth,
  parseISO, startOfMonth, startOfWeek, subMonths,
} from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, CalendarDays, CreditCard, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { buildDueItems, type DueItem } from '@/lib/bills/dueDates';

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
const fmtExact = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function BillsCalendar() {
  const { data: subscriptions } = useSubscriptions();
  const { data: recurring } = useRecurringTransactions();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState<Date | null>(new Date());

  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const gridStart = startOfWeek(monthStart);
  const gridEnd = endOfWeek(monthEnd);

  const items = useMemo(
    () => buildDueItems(subscriptions, recurring, gridStart, gridEnd),
    [subscriptions, recurring, gridStart.getTime(), gridEnd.getTime()],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, DueItem[]>();
    for (const it of items) {
      const list = map.get(it.date) || [];
      list.push(it);
      map.set(it.date, list);
    }
    return map;
  }, [items]);

  const monthItems = items.filter(i => isSameMonth(parseISO(i.date), monthStart));
  const monthTotal = monthItems.reduce((s, i) => s + i.amount, 0);

  const missingDates = useMemo(() => {
    const subsMissing = (subscriptions || []).filter(
      (s: any) => !s.is_cancelled && !s.next_expected_date && !s.last_charge_date,
    ).length;
    const billsMissing = (recurring || []).filter(
      (b: any) => b.is_active !== false && Number(b.amount || 0) < 0 && !b.next_due_date,
    ).length;
    return subsMissing + billsMissing;
  }, [subscriptions, recurring]);

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const selectedItems = selected ? byDay.get(format(selected, 'yyyy-MM-dd')) || [] : [];

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-prism-sky" /> When bills are due
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => subMonths(m, 1))} aria-label="Previous month">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-semibold w-28 text-center">{format(monthStart, 'MMMM yyyy')}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonth(m => addMonths(m, 1))} aria-label="Next month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {monthItems.length} due {monthItems.length === 1 ? 'item' : 'items'} this month · {fmt(monthTotal)} total
            {missingDates > 0 && ` · ${missingDates} without a due date yet`}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map(day => {
              const key = format(day, 'yyyy-MM-dd');
              const dayItems = byDay.get(key) || [];
              const total = dayItems.reduce((s, i) => s + i.amount, 0);
              const inMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());
              const isSel = selected && isSameDay(day, selected);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(day)}
                  className={cn(
                    'min-h-[62px] rounded-lg border p-1 text-left transition-colors',
                    inMonth ? 'border-border/40 bg-card' : 'border-transparent bg-muted/20 opacity-50',
                    dayItems.length > 0 && inMonth && 'border-prism-sky/40 bg-prism-sky/5',
                    isSel && 'ring-1 ring-prism-violet/50',
                  )}
                >
                  <span className={cn('text-[11px] font-semibold', isToday && 'text-prism-violet')}>
                    {format(day, 'd')}
                  </span>
                  {total > 0 && (
                    <>
                      <div className="font-mono text-[11px] font-bold text-prism-rose leading-tight">{fmt(total)}</div>
                      <div className="text-[9px] text-muted-foreground truncate">
                        {dayItems.length === 1 ? dayItems[0].name : `${dayItems.length} items`}
                      </div>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            {selected ? format(selected, 'EEEE, MMM d') : 'Pick a day'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {selectedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due on this day.</p>
          ) : (
            <ul className="space-y-1.5">
              {selectedItems.map(it => (
                <li key={it.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/30 p-2">
                  <span className="flex items-center gap-2 min-w-0">
                    {it.kind === 'subscription'
                      ? <CreditCard className="h-3.5 w-3.5 text-prism-violet shrink-0" />
                      : <Receipt className="h-3.5 w-3.5 text-prism-sky shrink-0" />}
                    <span className="text-sm truncate">{it.name}</span>
                    <Badge variant="outline" className="text-[9px] h-4 shrink-0">
                      {it.kind === 'subscription' ? 'Subscription' : 'Bill'}
                    </Badge>
                  </span>
                  <span className="font-mono text-sm font-bold text-prism-rose shrink-0">{fmtExact(it.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default BillsCalendar;
