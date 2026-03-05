import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAccounts, useAllTransactions, useCategories, useCategoryGroups } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import {
  format, startOfMonth, endOfMonth, subMonths, addMonths,
  parseISO, isWithinInterval, startOfQuarter, endOfQuarter,
  startOfYear, endOfYear, subQuarters, subYears,
} from 'date-fns';
import { Loader2, CalendarIcon, X, ArrowLeft } from 'lucide-react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

type Period = 'monthly' | 'quarterly' | 'yearly';
type GroupBy = 'category' | 'group' | 'merchant';

interface ChartDatum {
  label: string;
  yearLabel: string;
  fullLabel: string;
  income: number;
  expenses: number;
  net: number;
  start: Date;
  end: Date;
  index: number;
}

const CashFlow = () => {
  const { data: transactions, isLoading } = useAllTransactions();
  const { data: categories } = useCategories();
  const { data: categoryGroups } = useCategoryGroups();
  const { formatCurrency: fmt } = useCurrency();

  const [period, setPeriod] = useState<Period>('monthly');
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [viewType, setViewType] = useState<'bar' | 'area'>('bar');

  // Date range filter
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  // Drill-down state: selected chart bar index
  const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

  // Build timeline chart data with start/end dates attached
  const chartData: ChartDatum[] = useMemo(() => {
    if (!transactions) return [];
    const now = new Date();

    const buildPeriods = (count: number, getRange: (i: number) => { start: Date; end: Date; label: string; yearLabel: string; fullLabel: string }) => {
      return Array.from({ length: count }, (_, i) => {
        const { start, end, label, yearLabel, fullLabel } = getRange(i);
        const txns = transactions.filter(t => {
          const d = parseISO(t.date);
          return isWithinInterval(d, { start, end }) && !t.is_transfer;
        });
        const inc = txns.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
        const exp = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
        return { label, yearLabel, fullLabel, income: inc, expenses: -exp, net: inc - exp, start, end, index: i };
      });
    };

    if (period === 'monthly') {
      return buildPeriods(24, (i) => {
        const m = subMonths(now, 23 - i);
        return { start: startOfMonth(m), end: endOfMonth(m), label: format(m, 'MMM'), yearLabel: format(m, 'yyyy'), fullLabel: format(m, 'MMM yyyy') };
      });
    }
    if (period === 'quarterly') {
      return buildPeriods(8, (i) => {
        const q = subQuarters(now, 7 - i);
        return { start: startOfQuarter(q), end: endOfQuarter(q), label: `Q${Math.ceil((q.getMonth() + 1) / 3)}`, yearLabel: format(q, 'yyyy'), fullLabel: `Q${Math.ceil((q.getMonth() + 1) / 3)} ${format(q, 'yyyy')}` };
      });
    }
    return buildPeriods(5, (i) => {
      const y = subYears(now, 4 - i);
      return { start: startOfYear(y), end: endOfYear(y), label: format(y, 'yyyy'), yearLabel: '', fullLabel: format(y, 'yyyy') };
    });
  }, [transactions, period]);

  // Filter chart data by date range
  const filteredChartData = useMemo(() => {
    if (!dateFrom && !dateTo) return chartData;
    return chartData.filter(d => {
      if (dateFrom && d.end < dateFrom) return false;
      if (dateTo && d.start > dateTo) return false;
      return true;
    });
  }, [chartData, dateFrom, dateTo]);

  // The selected period for breakdown (drill-down or last visible)
  const selectedPeriod = useMemo(() => {
    if (selectedBarIndex !== null) {
      return filteredChartData.find(d => d.index === selectedBarIndex) || filteredChartData[filteredChartData.length - 1];
    }
    return filteredChartData[filteredChartData.length - 1];
  }, [selectedBarIndex, filteredChartData]);

  const currentIncome = selectedPeriod?.income || 0;
  const currentExpenses = Math.abs(selectedPeriod?.expenses || 0);
  const totalSavings = currentIncome - currentExpenses;
  const savingsRate = currentIncome > 0 ? Math.round((totalSavings / currentIncome) * 100) : 0;

  // Transactions for the selected period
  const selectedPeriodTxns = useMemo(() => {
    if (!transactions || !selectedPeriod) return [];
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: selectedPeriod.start, end: selectedPeriod.end }) && !t.is_transfer;
    });
  }, [transactions, selectedPeriod]);

  // Category breakdowns
  const { incomeBreakdown, expenseBreakdown } = useMemo(() => {
    const incMap: Record<string, { name: string; color: string; amount: number }> = {};
    const expMap: Record<string, { name: string; color: string; amount: number }> = {};
    const catMap = new Map<string, { name: string; color: string; group_id: string }>();
    if (categories) {
      for (const c of categories) catMap.set(c.id, { name: c.name, color: c.color, group_id: c.group_id });
    }
    const groupMap = new Map<string, { name: string; color: string }>();
    if (categoryGroups) {
      for (const g of categoryGroups) groupMap.set(g.id, { name: g.name, color: g.color });
    }
    for (const t of selectedPeriodTxns) {
      const cat = t.category_id ? catMap.get(t.category_id) : null;
      let key: string, label: string, color: string;
      if (groupBy === 'merchant') {
        key = t.merchant || 'Uncategorized';
        label = key;
        color = cat?.color || '#94a3b8';
      } else if (groupBy === 'group') {
        const grp = cat ? groupMap.get(cat.group_id) : null;
        key = cat?.group_id || 'uncategorized';
        label = grp?.name || 'Uncategorized';
        color = grp?.color || '#94a3b8';
      } else {
        key = t.category_id || 'uncategorized';
        label = cat?.name || 'Uncategorized';
        color = cat?.color || '#94a3b8';
      }
      if (t.amount > 0) {
        if (!incMap[key]) incMap[key] = { name: label, color, amount: 0 };
        incMap[key].amount += Number(t.amount);
      } else {
        if (!expMap[key]) expMap[key] = { name: label, color, amount: 0 };
        expMap[key].amount += Math.abs(Number(t.amount));
      }
    }
    const sortDesc = (a: { amount: number }, b: { amount: number }) => b.amount - a.amount;
    return { incomeBreakdown: Object.values(incMap).sort(sortDesc), expenseBreakdown: Object.values(expMap).sort(sortDesc) };
  }, [selectedPeriodTxns, categories, categoryGroups, groupBy]);

  const totalIncomeBreakdown = incomeBreakdown.reduce((s, i) => s + i.amount, 0);
  const totalExpenseBreakdown = expenseBreakdown.reduce((s, i) => s + i.amount, 0);

  const handleBarClick = useCallback((data: any) => {
    if (data?.activePayload?.[0]?.payload) {
      const clickedItem = data.activePayload[0].payload as ChartDatum;
      setSelectedBarIndex(prev => prev === clickedItem.index ? null : clickedItem.index);
    }
  }, []);

  const clearDateRange = () => { setDateFrom(undefined); setDateTo(undefined); };
  const hasDateFilter = dateFrom || dateTo;

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
        <p className="text-xs text-muted-foreground mt-1">Click to drill in</p>
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
          {(['category', 'group', 'merchant'] as GroupBy[]).map(g => (
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
                <div className={cn('flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors relative overflow-hidden', bgClass)}>
                  <div className="absolute inset-y-0 left-0 opacity-60 rounded-lg" style={{ width: `${pct}%`, backgroundColor: item.color }} />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="font-display text-2xl font-bold">Cash Flow</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Date range filters */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('gap-2 text-sm', dateFrom && 'border-primary')}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateFrom ? format(dateFrom, 'MMM d, yyyy') : 'From'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <span className="text-muted-foreground text-sm">→</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('gap-2 text-sm', dateTo && 'border-primary')}>
                <CalendarIcon className="h-3.5 w-3.5" />
                {dateTo ? format(dateTo, 'MMM d, yyyy') : 'To'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          {hasDateFilter && (
            <Button variant="ghost" size="sm" onClick={clearDateRange} className="gap-1 h-8 text-xs">
              <X className="h-3 w-3" /> Clear
            </Button>
          )}

          <div className="flex border rounded-lg overflow-hidden text-sm">
            {(['monthly', 'quarterly', 'yearly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setSelectedBarIndex(null); }}
                className={cn('px-4 py-2 capitalize transition-colors', period === p ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline Chart */}
      <Card>
        <CardContent className="p-4">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={filteredChartData} stackOffset="sign" onClick={handleBarClick} className="cursor-pointer">
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
              <XAxis dataKey="label" className="text-xs" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs" tick={{ fontSize: 11 }} tickFormatter={(v) => `${v >= 0 ? '' : '-'}$${Math.abs(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<ChartTooltip />} />
              <ReferenceLine y={0} className="stroke-border" />
              <Bar dataKey="income" name="Income" radius={[3, 3, 0, 0]} stackId="stack">
                {filteredChartData.map((entry) => (
                  <Cell
                    key={`inc-${entry.index}`}
                    fill={selectedBarIndex === entry.index ? 'hsl(152, 57%, 45%)' : 'hsl(152, 57%, 58%)'}
                    stroke={selectedBarIndex === entry.index ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={selectedBarIndex === entry.index ? 2 : 0}
                  />
                ))}
              </Bar>
              <Bar dataKey="expenses" name="Expenses" radius={[0, 0, 3, 3]} stackId="stack">
                {filteredChartData.map((entry) => (
                  <Cell
                    key={`exp-${entry.index}`}
                    fill={selectedBarIndex === entry.index ? 'hsl(0, 80%, 65%)' : 'hsl(0, 80%, 80%)'}
                    stroke={selectedBarIndex === entry.index ? 'hsl(var(--foreground))' : 'none'}
                    strokeWidth={selectedBarIndex === entry.index ? 2 : 0}
                  />
                ))}
              </Bar>
              <Line type="monotone" dataKey="net" stroke="hsl(var(--foreground))" strokeWidth={2} dot={false} name="Net" />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Selected Period Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedBarIndex !== null && (
            <Button variant="ghost" size="sm" onClick={() => setSelectedBarIndex(null)} className="gap-1.5 h-8">
              <ArrowLeft className="h-3.5 w-3.5" /> All
            </Button>
          )}
          <h2 className="font-display text-xl font-bold">
            {selectedBarIndex !== null ? selectedPeriod?.fullLabel : 'Current Period'}
          </h2>
        </div>
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

      {/* Summary Cards */}
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

      {/* Breakdowns */}
      {renderBreakdown('Income', incomeBreakdown, totalIncomeBreakdown, 'bg-emerald-500/5 hover:bg-emerald-500/10')}
      {renderBreakdown('Expenses', expenseBreakdown, totalExpenseBreakdown, 'bg-rose-500/5 hover:bg-rose-500/10')}
    </motion.div>
  );
};

export default CashFlow;
