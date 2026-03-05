import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAccounts, useAllTransactions, useCategories } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import {
  format, startOfMonth, endOfMonth, subMonths, addMonths,
  parseISO, isWithinInterval, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subQuarters, subYears,
} from 'date-fns';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';

type Period = 'monthly' | 'quarterly' | 'yearly';
type GroupBy = 'category' | 'group' | 'merchant';

const CashFlow = () => {
  const { data: transactions, isLoading } = useAllTransactions();
  const { data: categories } = useCategories();
  const { formatCurrency: fmt } = useCurrency();

  const [period, setPeriod] = useState<Period>('monthly');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [viewType, setViewType] = useState<'bar' | 'area'>('bar');

  // Build the full timeline chart data (up to 24 months / 8 quarters / 3 years)
  const chartData = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();

    if (period === 'monthly') {
      return Array.from({ length: 24 }, (_, i) => {
        const m = subMonths(now, 23 - i);
        const ms = startOfMonth(m);
        const me = endOfMonth(m);
        const txns = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: ms, end: me }) && !t.is_transfer;
        });
        const inc = txns.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
        const exp = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        return {
          label: format(m, 'MMM'),
          yearLabel: format(m, 'yyyy'),
          fullLabel: format(m, 'MMM yyyy'),
          income: inc,
          expenses: -exp,
          net: inc - exp,
        };
      });
    }

    if (period === 'quarterly') {
      return Array.from({ length: 8 }, (_, i) => {
        const q = subQuarters(now, 7 - i);
        const qs = startOfQuarter(q);
        const qe = endOfQuarter(q);
        const txns = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start: qs, end: qe }) && !t.is_transfer;
        });
        const inc = txns.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
        const exp = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        return {
          label: `Q${Math.ceil((q.getMonth() + 1) / 3)}`,
          yearLabel: format(q, 'yyyy'),
          fullLabel: `Q${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, 'yyyy')}`,
          income: inc,
          expenses: -exp,
          net: inc - exp,
        };
      });
    }

    // Yearly
    return Array.from({ length: 5 }, (_, i) => {
      const y = subYears(now, 4 - i);
      const ys = startOfYear(y);
      const ye = endOfYear(y);
      const txns = transactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: ys, end: ye }) && !t.is_transfer;
      });
      const inc = txns.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
      const exp = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      return {
        label: format(y, 'yyyy'),
        yearLabel: '',
        fullLabel: format(y, 'yyyy'),
        income: inc,
        expenses: -exp,
        net: inc - exp,
      };
    });
  }, [transactions, period]);

  // Current period's data (last item)
  const currentPeriod = chartData[chartData.length - 1];
  const currentIncome = currentPeriod?.income || 0;
  const currentExpenses = Math.abs(currentPeriod?.expenses || 0);
  const totalSavings = currentIncome - currentExpenses;
  const savingsRate = currentIncome > 0 ? Math.round((totalSavings / currentIncome) * 100) : 0;

  // Current period transactions for breakdown
  const currentPeriodTxns = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();
    let start: Date, end: Date;
    if (period === 'monthly') {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else if (period === 'quarterly') {
      start = startOfQuarter(now);
      end = endOfQuarter(now);
    } else {
      start = startOfYear(now);
      end = endOfYear(now);
    }
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start, end }) && !t.is_transfer;
    });
  }, [transactions, period]);

  // Category breakdowns
  const { incomeBreakdown, expenseBreakdown } = useMemo(() => {
    const incMap: Record<string, { name: string; color: string; amount: number }> = {};
    const expMap: Record<string, { name: string; color: string; amount: number }> = {};

    const catMap = new Map<string, { name: string; color: string }>();
    if (categories) {
      for (const c of categories) catMap.set(c.id, { name: c.name, color: c.color });
    }

    for (const t of currentPeriodTxns) {
      const cat = t.category_id ? catMap.get(t.category_id) : null;
      const key = groupBy === 'merchant'
        ? (t.merchant || 'Uncategorized')
        : (t.category_id || 'uncategorized');
      const label = groupBy === 'merchant'
        ? (t.merchant || 'Uncategorized')
        : (cat?.name || 'Uncategorized');
      const color = cat?.color || '#94a3b8';

      if (t.amount > 0) {
        if (!incMap[key]) incMap[key] = { name: label, color, amount: 0 };
        incMap[key].amount += Number(t.amount);
      } else {
        if (!expMap[key]) expMap[key] = { name: label, color, amount: 0 };
        expMap[key].amount += Math.abs(Number(t.amount));
      }
    }

    const sortDesc = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
    return {
      incomeBreakdown: Object.values(incMap).sort(sortDesc),
      expenseBreakdown: Object.values(expMap).sort(sortDesc),
    };
  }, [currentPeriodTxns, categories, groupBy]);

  const totalIncomeBreakdown = incomeBreakdown.reduce((s, i) => s + i.amount, 0);
  const totalExpenseBreakdown = expenseBreakdown.reduce((s, i) => s + i.amount, 0);

  // Custom tooltip
  const ChartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload) return null;
    return (
      <div className="rounded-lg border bg-popover p-3 shadow-md text-sm">
        <p className="font-medium mb-1">{label}</p>
        {payload.map((p: any) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium">{fmt(Math.abs(p.value))}</span>
          </div>
        ))}
      </div>
    );
  };

  // Horizontal bar for breakdown
  const renderBreakdown = (
    title: string,
    items: { name: string; color: string; amount: number }[],
    total: number,
    bgClass: string,
  ) => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold">{title}</h3>
        <div className="flex items-center gap-1 border rounded-lg overflow-hidden text-xs">
          {(['category', 'merchant'] as GroupBy[]).map(g => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={cn('px-3 py-1.5 capitalize transition-colors', groupBy === g ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No {title.toLowerCase()} this period.</p>
      ) : (
        <div className="space-y-1.5">
          {items.map((item, idx) => {
            const pct = total > 0 ? (item.amount / total) * 100 : 0;
            return (
              <div key={idx} className="relative">
                <div
                  className={cn('flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors relative overflow-hidden', bgClass)}
                >
                  {/* Proportional fill bar */}
                  <div
                    className="absolute inset-y-0 left-0 opacity-60 rounded-lg"
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                  />
                  <div className="flex items-center gap-2 relative z-10">
                    <span className="h-3 w-3 rounded-full shrink-0 border border-background/50" style={{ backgroundColor: item.color }} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <span className="text-sm font-semibold tabular-nums relative z-10">
                    {fmt(item.amount)} ({pct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Cash Flow</h1>
        <div className="flex items-center gap-2">
          <div className="flex border rounded-lg overflow-hidden text-sm">
            {(['monthly', 'quarterly', 'yearly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={cn('px-4 py-2 capitalize transition-colors', period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Chart — Monarch style with income bars up, expense bars down, net line */}
      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} stackOffset="sign">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v >= 0 ? '' : '-'}$${Math.abs(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} className="stroke-border" />
              <Bar dataKey="income" fill="hsl(152, 57%, 58%)" name="Income" radius={[3, 3, 0, 0]} stackId="stack" />
              <Bar dataKey="expenses" fill="hsl(0, 80%, 80%)" name="Expenses" radius={[0, 0, 3, 3]} stackId="stack" />
              <Line type="monotone" dataKey="net" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="Net" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Current Period Title */}
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{currentPeriod?.fullLabel || ''}</h2>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>View</span>
          <Select value={viewType} onValueChange={(v: any) => setViewType(v)}>
            <SelectTrigger className="w-[120px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="area">Summary</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards — Monarch style */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x border rounded-xl overflow-hidden bg-card">
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{fmt(currentIncome)}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Income</p>
        </div>
        <div className="p-4 text-center">
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">{fmt(currentExpenses)}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Expenses</p>
        </div>
        <div className="p-4 text-center">
          <p className={cn('text-2xl font-bold tabular-nums', totalSavings >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
            {totalSavings < 0 ? '-' : ''}{fmt(Math.abs(totalSavings))}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Savings</p>
        </div>
        <div className="p-4 text-center">
          <p className={cn('text-2xl font-bold tabular-nums', savingsRate >= 0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400')}>
            {savingsRate}%
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Savings Rate</p>
        </div>
      </div>

      {/* Income Breakdown */}
      {renderBreakdown('Income', incomeBreakdown, totalIncomeBreakdown, 'bg-emerald-500/5 hover:bg-emerald-500/10')}

      {/* Expense Breakdown */}
      {renderBreakdown('Expenses', expenseBreakdown, totalExpenseBreakdown, 'bg-rose-500/5 hover:bg-rose-500/10')}
    </motion.div>
  );
};

export default CashFlow;
