import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTransactions, useAccounts, useCategories, useSpendingByCategory } from '@/hooks/use-finance-data';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useCurrency } from '@/hooks/use-currency';
import { subDays, format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import {
  ChevronLeft, ChevronRight, X, Sparkles, DollarSign,
  Clock, TrendingUp, CalendarCheck, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';

const TOTAL_SLIDES = 5;

interface WeeklyRecapProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WeeklyRecap({ open, onOpenChange }: WeeklyRecapProps) {
  const [slide, setSlide] = useState(0);
  const [direction, setDirection] = useState(0); // -1 back, 1 forward
  const { formatCurrency } = useCurrency();
  const { data: transactions } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: recurring } = useRecurringTransactions();

  const now = new Date();
  const weekEnd = endOfDay(now);
  const weekStart = startOfDay(subDays(now, 6));
  const prevWeekEnd = startOfDay(subDays(now, 7));
  const prevWeekStart = startOfDay(subDays(now, 13));
  const dateLabel = `${format(weekStart, 'MMMM do')}–${format(weekEnd, 'do')}`;

  // This week & last week transactions
  const { thisWeek, lastWeek } = useMemo(() => {
    if (!transactions) return { thisWeek: [], lastWeek: [] };
    return {
      thisWeek: transactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: weekStart, end: weekEnd }) && !t.is_transfer;
      }),
      lastWeek: transactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: prevWeekStart, end: prevWeekEnd }) && !t.is_transfer;
      }),
    };
  }, [transactions, weekStart, weekEnd, prevWeekStart, prevWeekEnd]);

  const thisIncome = thisWeek.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const thisExpenses = thisWeek.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const lastIncome = lastWeek.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const lastExpenses = lastWeek.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);

  const spendingChange = lastExpenses > 0 ? Math.round(((thisExpenses - lastExpenses) / lastExpenses) * 100) : 0;

  // Net worth
  const totalAssets = (accounts || []).filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = Math.abs((accounts || []).filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

  // Daily net worth trend (simplified: use daily net cash flow as proxy)
  const dailyNetWorth = useMemo(() => {
    const days: { date: string; label: string; value: number }[] = [];
    let running = netWorth;
    // Go backwards from today, subtract each day's net to approximate
    for (let i = 6; i >= 0; i--) {
      const d = subDays(now, i);
      const dayStr = format(d, 'yyyy-MM-dd');
      const dayTxns = thisWeek.filter(t => t.date === dayStr);
      const dayNet = dayTxns.reduce((s, t) => s + Number(t.amount), 0);
      if (i === 0) {
        days.push({ date: dayStr, label: format(d, 'MMM d'), value: running });
      } else {
        // Approximate by subtracting future days' net
        const futureTxns = thisWeek.filter(t => {
          const td = parseISO(t.date);
          return td > d;
        });
        const futureNet = futureTxns.reduce((s, t) => s + Number(t.amount), 0);
        days.push({ date: dayStr, label: format(d, 'MMM d'), value: running - futureNet });
      }
    }
    return days;
  }, [thisWeek, netWorth, now]);

  const netWorthChange = dailyNetWorth.length >= 2 ? dailyNetWorth[dailyNetWorth.length - 1].value - dailyNetWorth[0].value : 0;
  const netWorthPct = dailyNetWorth[0]?.value > 0 ? ((netWorthChange / dailyNetWorth[0].value) * 100).toFixed(1) : '0';

  // Spending by category (donut)
  const spendingByCategory = useMemo(() => {
    const catMap = new Map<string, { name: string; color: string }>();
    if (categories) for (const c of categories) catMap.set(c.id, { name: c.name, color: c.color });

    const map: Record<string, { name: string; color: string; value: number }> = {};
    for (const t of thisWeek) {
      if (t.amount >= 0) continue;
      const cat = t.category_id ? catMap.get(t.category_id) : null;
      const key = cat?.name || 'Uncategorized';
      if (!map[key]) map[key] = { name: key, color: cat?.color || '#94a3b8', value: 0 };
      map[key].value += Math.abs(Number(t.amount));
    }
    return Object.values(map).sort((a, b) => b.value - a.value);
  }, [thisWeek, categories]);

  const topCategories = spendingByCategory.slice(0, 2).map(c => c.name);

  // Upcoming recurring (next 14 days)
  const upcomingRecurring = useMemo(() => {
    if (!recurring) return [];
    const cutoff = subDays(now, -14);
    return recurring.filter(r => {
      const d = parseISO(r.next_due_date);
      return d >= now && d <= cutoff && r.is_active;
    }).sort((a, b) => a.next_due_date.localeCompare(b.next_due_date));
  }, [recurring, now]);

  const upcomingTotal = upcomingRecurring.reduce((s, r) => s + Math.abs(Number(r.amount)), 0);

  const goNext = () => { if (slide < TOTAL_SLIDES - 1) { setDirection(1); setSlide(s => s + 1); } };
  const goBack = () => { if (slide > 0) { setDirection(-1); setSlide(s => s - 1); } };
  const handleClose = () => { onOpenChange(false); setTimeout(() => setSlide(0), 300); };

  const slideVariants = {
    enter: (dir: number) => ({ x: dir > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -300 : 300, opacity: 0 }),
  };

  const SLIDE_COLORS = ['bg-primary', 'bg-primary', 'bg-primary', 'bg-primary', 'bg-primary'];

  const renderSlide = () => {
    switch (slide) {
      // ========== SLIDE 0: Overview ==========
      case 0:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Overview | {dateLabel}
              </p>
              <h2 className="font-display text-2xl font-bold mt-2">
                Your weekly recap is ready to review
              </h2>
              <p className="text-muted-foreground mt-2">
                We've analyzed your finances over the last week, and we've pulled together the top insights to get you up to speed. Here's what we'll walk you through in depth...
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-xl border p-3.5">
                <DollarSign className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">
                  Your net worth {netWorthChange >= 0 ? 'increased' : 'decreased'} by <strong>{formatCurrency(Math.abs(netWorthChange))}</strong> ({netWorthPct}%) from last week
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3.5">
                <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">
                  Your spending {spendingChange <= 0 ? 'decreased' : 'increased'} by <strong>{Math.abs(spendingChange)}%</strong> from last week
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border p-3.5">
                <CalendarCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">
                  You have <strong>{upcomingRecurring.length}</strong> upcoming recurring transactions
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Your recap reflects your connected accounts, transaction categorization, and recurring items. If anything looks off, you can review and adjust ahead of next week's recap.
            </p>
          </div>
        );

      // ========== SLIDE 1: Net Worth ==========
      case 1:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Net worth | {dateLabel}
              </p>
              <h2 className="font-display text-2xl font-bold mt-2">
                Net worth {netWorthChange >= 0 ? 'increased' : 'decreased'} to{' '}
                <span className={netWorthChange >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                  {formatCurrency(netWorth)}
                </span>{' '}
                ({netWorthChange >= 0 ? '+' : ''}{formatCurrency(netWorthChange)}, {netWorthChange >= 0 ? '+' : ''}{netWorthPct}%) this week
              </h2>
            </div>

            <div className="rounded-xl border p-4">
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={dailyNetWorth}>
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} className="text-xs" />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} domain={['dataMin - 1000', 'dataMax + 1000']} className="text-xs" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <p className="text-sm text-muted-foreground">
              Your net worth {netWorthChange >= 0 ? 'grew' : 'fell'} by <strong>{formatCurrency(Math.abs(netWorthChange))}</strong> ({netWorthChange >= 0 ? '+' : ''}{netWorthPct}%) to <strong>{formatCurrency(netWorth)}</strong> this week.
            </p>
          </div>
        );

      // ========== SLIDE 2: Spending ==========
      case 2:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Spending | {dateLabel}
              </p>
              <h2 className="font-display text-2xl font-bold mt-2">
                You spent <span className="text-foreground">{formatCurrency(thisExpenses)}</span> this week
                {spendingChange !== 0 && (
                  <>, {spendingChange < 0 ? 'down' : 'up'}{' '}
                  <span className={spendingChange < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}>
                    {Math.abs(spendingChange)}%
                  </span> vs. last week</>
                )}
              </h2>
            </div>

            {spendingByCategory.length > 0 && (
              <div className="rounded-xl border p-4 flex items-center gap-6">
                <div className="relative w-[160px] h-[160px] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={spendingByCategory} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value">
                        {spendingByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">{formatCurrency(thisExpenses)}</span>
                    <span className="text-[10px] text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="space-y-2 flex-1">
                  {spendingByCategory.slice(0, 5).map(c => (
                    <div key={c.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        <span className="truncate max-w-[120px]">{c.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-sm text-muted-foreground">
              You spent <strong>{formatCurrency(thisExpenses)}</strong> this week
              {spendingChange !== 0 && <>, <strong>{Math.abs(spendingChange)}%</strong> {spendingChange < 0 ? 'less' : 'more'} than last week's <strong>{formatCurrency(lastExpenses)}</strong></>}
              {topCategories.length > 0 && <>, with most activity in <strong>{topCategories.join('</strong> and <strong>')}</strong></>}.
            </p>
          </div>
        );

      // ========== SLIDE 3: Recurring ==========
      case 3:
        return (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> Recurring | {dateLabel}
              </p>
              <h2 className="font-display text-2xl font-bold mt-2">
                You have <span className="text-foreground">{upcomingRecurring.length}</span> recurring transactions scheduled over the next 2 weeks
                {upcomingTotal > 0 && <>, including <strong>{formatCurrency(upcomingTotal)}</strong> in expenses</>}.
              </h2>
            </div>

            {upcomingRecurring.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-4 py-2.5 border-b text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <span>Recurring Transaction</span>
                  <span className="text-right">Category</span>
                  <span className="text-right w-[80px]">Amount</span>
                </div>
                <div className="divide-y max-h-[240px] overflow-y-auto">
                  {upcomingRecurring.slice(0, 8).map(r => (
                    <div key={r.id} className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{r.merchant || 'Unnamed'}</p>
                        <p className="text-xs text-muted-foreground capitalize">{r.frequency}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {(r as any).categories && (
                          <>
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: (r as any).categories.color }} />
                            <span className="text-xs text-muted-foreground truncate max-w-[80px]">{(r as any).categories.name}</span>
                          </>
                        )}
                      </div>
                      <div className="text-right w-[80px]">
                        <p className="text-sm font-semibold">{formatCurrency(Math.abs(Number(r.amount)))}</p>
                        <p className="text-[10px] text-muted-foreground">{format(parseISO(r.next_due_date), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-6 text-center">No upcoming recurring transactions.</p>
            )}
          </div>
        );

      // ========== SLIDE 4: Wrap-up ==========
      case 4:
        return (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-semibold text-primary flex items-center gap-1.5">
                <Sparkles className="h-4 w-4" /> That's a wrap | {dateLabel}
              </p>
              <h2 className="font-display text-2xl font-bold mt-2">
                Another week reviewed—nice work!
              </h2>
              <p className="text-muted-foreground mt-3">
                Weekly check-ins help you spot trends and stay proactive with your money. Patterns can shift week to week but keep checking in and see real progress over time!
              </p>
            </div>

            <p className="text-xs text-muted-foreground">
              Note: Your recap reflects your connected accounts, transaction categorization, and recurring items. If anything looks off, you can review and adjust ahead of next week's recap.
            </p>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ThumbsUp className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <ThumbsDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Bottom CTA labels
  const ctaLabels = [
    'Check it out',
    'Next up: spending',
    'Next up: upcoming transactions',
    'Finish reviewing your recap',
    'Ask follow up questions',
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden [&>button]:hidden">
        {/* Top bar: back arrow + dots + close */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div className="w-8">
            {slide > 0 && (
              <button onClick={goBack} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  i <= slide ? 'bg-primary w-5' : 'bg-muted w-2',
                )}
              />
            ))}
          </div>

          <button onClick={handleClose} className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Slide content */}
        <div className="relative min-h-[380px] px-6 pb-2 overflow-hidden">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={slide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
            >
              {renderSlide()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom CTA */}
        <div className="px-6 pb-6 pt-2">
          <Button
            onClick={slide < TOTAL_SLIDES - 1 ? goNext : handleClose}
            className="w-full h-12 text-sm font-semibold rounded-xl"
          >
            {ctaLabels[slide]}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
