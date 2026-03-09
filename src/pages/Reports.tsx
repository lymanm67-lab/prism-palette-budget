import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useSpendingByCategory, useTransactionsByDateRange, useBudgets, useCategories, useAccounts, useAllTransactions } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { CalendarIcon, Download, FileText, Loader2, Building2, User, BarChart3 } from 'lucide-react';
import { useMemo, useRef, useState, useCallback } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToPdf, exportToCsv } from '@/lib/export-utils';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { cn } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';
import BusinessReports from '@/components/BusinessReports';
import PageOverview from '@/components/PageOverview';
const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' };

const TREND_COLORS = [
  'hsl(262, 83%, 58%)', 'hsl(160, 84%, 39%)', 'hsl(36, 100%, 57%)',
  'hsl(340, 82%, 52%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)',
  'hsl(24, 95%, 53%)', 'hsl(239, 84%, 67%)',
];

type DateRange = { from: Date; to: Date };

const PRESETS: { label: string; range: () => DateRange }[] = [
  { label: 'This Month', range: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: 'Last Month', range: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: 'Last 3 Months', range: () => ({ from: startOfMonth(subMonths(new Date(), 2)), to: endOfMonth(new Date()) }) },
  { label: 'Last 6 Months', range: () => ({ from: startOfMonth(subMonths(new Date(), 5)), to: endOfMonth(new Date()) }) },
  { label: 'This Year', range: () => ({ from: startOfYear(new Date()), to: endOfYear(new Date()) }) },
  { label: 'Last 7 Days', range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { label: 'Last 30 Days', range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
];

const Reports = () => {
  const { formatCurrency, formatCompact } = useCurrency();
  const [dateRange, setDateRange] = useState<DateRange>(() => ({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  }));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('spending');
  const [reportMode, setReportMode] = useState<'personal' | 'business'>('personal');
  const [spendingChartType, setSpendingChartType] = useState<'pie' | 'bar'>('pie');
  const [showOtherBreakdown, setShowOtherBreakdown] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const startDate = format(dateRange.from, 'yyyy-MM-dd');
  const endDate = format(dateRange.to, 'yyyy-MM-dd');
  const budgetMonth = format(dateRange.from, 'yyyy-MM-01');

  const { data: spendingData, isLoading } = useSpendingByCategory(startDate, endDate);
  const { data: transactions } = useTransactionsByDateRange(startDate, endDate);
  const { data: budgets } = useBudgets(budgetMonth);
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();
  const { data: allTransactions } = useAllTransactions();

  // ==================== CASH FLOW ====================
  const monthlyCashflow = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, { month: string; sortKey: string; income: number; expenses: number; savings: number }>();
    for (const t of transactions) {
      const m = t.date.substring(0, 7);
      const label = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const existing = map.get(m) || { month: label, sortKey: m, income: 0, expenses: 0, savings: 0 };
      if (t.amount > 0) existing.income += t.amount;
      else existing.expenses += Math.abs(t.amount);
      map.set(m, existing);
    }
    const result = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => {
      v.savings = v.income - v.expenses;
      return v;
    });
    return result;
  }, [transactions]);

  // ==================== BUDGET VS ACTUAL ====================
  const budgetVsActual = useMemo(() => {
    if (!budgets || !transactions || !categories) return [];
    const spentMap: Record<string, number> = {};
    for (const t of transactions) {
      if (t.amount < 0 && t.category_id) {
        spentMap[t.category_id] = (spentMap[t.category_id] || 0) + Math.abs(t.amount);
      }
    }
    return budgets.map(b => {
      const cat = b.categories;
      const spent = spentMap[b.category_id] || 0;
      return {
        name: cat?.name || 'Unknown',
        budget: b.planned_amount,
        actual: spent,
        color: cat?.color || 'hsl(var(--primary))',
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [budgets, transactions, categories]);

  // ==================== NET WORTH OVER TIME ====================
  const netWorthTrend = useMemo(() => {
    if (!allTransactions || !accounts) return [];
    const currentNetWorth = (accounts || []).reduce((s, a) => s + a.balance, 0);
    const monthlyDeltas = new Map<string, number>();
    for (const t of allTransactions) {
      const m = t.date.substring(0, 7);
      monthlyDeltas.set(m, (monthlyDeltas.get(m) || 0) + t.amount);
    }
    const months = Array.from(monthlyDeltas.keys()).sort();
    if (months.length === 0) {
      // No transactions yet — show current net worth as a single point
      const label = new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return [{ month: label, netWorth: currentNetWorth }];
    }

    const points: { month: string; netWorth: number }[] = [];
    let runningNetWorth = currentNetWorth;
    for (const m of months) {
      runningNetWorth -= monthlyDeltas.get(m) || 0;
    }
    for (const m of months) {
      runningNetWorth += monthlyDeltas.get(m) || 0;
      const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      points.push({ month: label, netWorth: runningNetWorth });
    }
    return points;
  }, [allTransactions, accounts]);

  // ==================== TOP MERCHANTS ====================
  const topMerchants = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, { name: string; total: number; count: number }>();
    for (const t of transactions) {
      if (t.amount < 0 && t.merchant) {
        const key = t.merchant.toLowerCase();
        const existing = map.get(key) || { name: t.merchant, total: 0, count: 0 };
        existing.total += Math.abs(t.amount);
        existing.count += 1;
        map.set(key, existing);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [transactions]);

  // ==================== SPENDING TRENDS ====================
  const spendingTrends = useMemo(() => {
    if (!transactions || !categories) return { data: [] as Record<string, unknown>[], categoryNames: [] as string[] };
    const monthCatMap = new Map<string, Record<string, number>>();
    const catNames = new Set<string>();

    for (const t of transactions) {
      if (t.amount >= 0) continue;
      const m = t.date.substring(0, 7);
      const catName = t.categories?.name || 'Uncategorized';
      catNames.add(catName);
      if (!monthCatMap.has(m)) monthCatMap.set(m, {});
      const monthData = monthCatMap.get(m)!;
      monthData[catName] = (monthData[catName] || 0) + Math.abs(t.amount);
    }

    const sortedMonths = Array.from(monthCatMap.keys()).sort();
    const data = sortedMonths.map(m => {
      const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      return { month: label, ...monthCatMap.get(m) };
    });

    const catTotals = new Map<string, number>();
    for (const [, monthData] of monthCatMap) {
      for (const [cat, val] of Object.entries(monthData)) {
        catTotals.set(cat, (catTotals.get(cat) || 0) + val);
      }
    }
    const topCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);

    return { data, categoryNames: topCats };
  }, [transactions, categories]);

  // ==================== DAILY SPENDING ====================
  const dailySpending = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.amount < 0) {
        map.set(t.date, (map.get(t.date) || 0) + Math.abs(t.amount));
      }
    }
    const days = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return days.map(([date, amount]) => {
      cumulative += amount;
      const d = new Date(date);
      const label = format(d, 'MMM d');
      return { day: label, daily: amount, cumulative };
    });
  }, [transactions]);

  // ==================== SAVINGS RATE ====================
  const savingsRate = useMemo(() => {
    return monthlyCashflow.map(m => ({
      month: m.month,
      rate: m.income > 0 ? Math.round(((m.income - m.expenses) / m.income) * 100) : 0,
      savings: m.income - m.expenses,
    }));
  }, [monthlyCashflow]);

  const dateLabel = `${format(dateRange.from, 'MMM d, yyyy')} — ${format(dateRange.to, 'MMM d, yyyy')}`;

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current) return;
    toast.info('Generating PDF...');
    try {
      await exportToPdf(reportRef.current, `report-${activeTab}-${startDate}-to-${endDate}`);
      toast.success('PDF downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate PDF');
    }
  }, [activeTab, startDate, endDate]);

  const handleExportCsv = useCallback(() => {
    const filename = `report-${activeTab}-${startDate}-to-${endDate}`;
    try {
      switch (activeTab) {
        case 'spending':
          if (spendingData && spendingData.length > 0) {
            exportToCsv(['Category', 'Color', 'Amount'], spendingData.map(s => [s.name, s.color, s.value]), filename);
          }
          break;
        case 'budget':
          if (budgetVsActual.length > 0) {
            exportToCsv(['Category', 'Budget', 'Actual', 'Difference', '% Used'], budgetVsActual.map(b => [b.name, b.budget, b.actual, b.budget - b.actual, b.budget > 0 ? Math.round((b.actual / b.budget) * 100) : 0]), filename);
          }
          break;
        case 'cashflow':
          if (monthlyCashflow.length > 0) {
            exportToCsv(['Month', 'Income', 'Expenses', 'Savings'], monthlyCashflow.map(m => [m.month, m.income, m.expenses, m.savings]), filename);
          }
          break;
        case 'networth':
          if (netWorthTrend.length > 0) {
            exportToCsv(['Month', 'Net Worth'], netWorthTrend.map(n => [n.month, n.netWorth]), filename);
          }
          break;
        case 'trends':
          if (transactions && transactions.length > 0) {
            exportToCsv(
              ['Date', 'Merchant', 'Category', 'Amount'],
              transactions.filter(t => t.amount < 0).map(t => [t.date, t.merchant || '', t.categories?.name || 'Uncategorized', Math.abs(t.amount)]),
              filename
            );
          }
          break;
        case 'merchants':
          if (topMerchants.length > 0) {
            exportToCsv(['Merchant', 'Total Spent', 'Transaction Count'], topMerchants.map(m => [m.name, m.total, m.count]), filename);
          }
          break;
      }
      toast.success('CSV downloaded!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to generate CSV');
    }
  }, [activeTab, startDate, endDate, spendingData, budgetVsActual, monthlyCashflow, netWorthTrend, transactions, topMerchants]);

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold prism-gradient-text">Reports</h1>
          <p className="text-muted-foreground">Comprehensive financial insights and analytics.</p>
          <PageOverview
            title="Reports Overview"
            description="Deep financial analytics with spending trends, budget comparisons, net worth tracking, and export capabilities."
            icon={BarChart3}
            iconColor="text-prism-orange"
            ttsScript="The Reports page provides deep insights into your finances. View spending by category with pie charts and trend lines. Compare your budget versus actual spending. Track net worth progression over time. See your top merchants by spending volume. The savings rate chart shows what percentage of income you are keeping each month. Switch between Personal and Business views. Export any report as PDF or CSV for tax preparation or record keeping."
            features={[
              'Spending breakdown by category',
              'Budget vs actual comparison',
              'Net worth trend over time',
              'Top merchants analysis',
              'Savings rate tracking',
              'Export to PDF and CSV',
              'Personal and Business report views',
            ]}
            demoData={[
              { label: 'Monthly Spending', value: '$4,230', color: '#ef4444' },
              { label: 'Monthly Income', value: '$6,500', color: '#22c55e' },
              { label: 'Savings Rate', value: '35%', color: '#3b82f6' },
              { label: 'Top Merchant', value: '$340', badge: 'Whole Foods' },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border p-0.5">
            <button
              onClick={() => setReportMode('personal')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                reportMode === 'personal' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-3.5 w-3.5" /> Personal
            </button>
            <button
              onClick={() => setReportMode('business')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                reportMode === 'business' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Building2 className="h-3.5 w-3.5" /> Business
            </button>
          </div>

        {/* Date Range Picker */}
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className={cn("gap-2 text-left font-normal min-w-[260px]")}>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{dateLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex">
              {/* Presets */}
              <div className="border-r border-border p-3 space-y-1 min-w-[140px]">
                <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Quick Select</p>
                {PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    className="block w-full text-left rounded-md px-2 py-1.5 text-sm hover:bg-muted transition-colors"
                    onClick={() => {
                      setDateRange(preset.range());
                      setCalendarOpen(false);
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {/* Calendar */}
              <div className="p-3">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                    } else if (range?.from) {
                      setDateRange({ from: range.from, to: range.from });
                    }
                  }}
                  numberOfMonths={2}
                  className={cn("pointer-events-auto")}
                />
                <div className="flex justify-end pt-2">
                  <Button size="sm" onClick={() => setCalendarOpen(false)}>Apply</Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
              <FileText className="h-4 w-4" />
              Download CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
              <Download className="h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>

      {reportMode === 'business' ? (
        <BusinessReports startDate={startDate} endDate={endDate} budgetMonth={budgetMonth} />
      ) : (
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="merchants">Top Merchants</TabsTrigger>
        </TabsList>

        <div ref={reportRef}>
        {/* ==================== SPENDING ==================== */}
        <TabsContent value="spending">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-display">Spending by Category</CardTitle>
                <div className="flex items-center gap-1 rounded-md border p-0.5">
                  <button onClick={() => setSpendingChartType('pie')} className={`px-2 py-1 text-xs rounded-sm transition-colors ${spendingChartType === 'pie' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Pie</button>
                  <button onClick={() => setSpendingChartType('bar')} className={`px-2 py-1 text-xs rounded-sm transition-colors ${spendingChartType === 'bar' ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground'}`}>Bar</button>
                </div>
              </CardHeader>
              <CardContent>
                {spendingData && spendingData.length > 0 ? (() => {
                  const TOP_N = spendingChartType === 'pie' ? 6 : 10;
                  const top = spendingData.slice(0, TOP_N);
                  const rest = spendingData.slice(TOP_N);
                  const chartData = rest.length > 0
                    ? [...top, { name: 'Other', value: rest.reduce((s, r) => s + r.value, 0), color: 'hsl(var(--muted-foreground))' }]
                    : top;
                  return (
                    <div className="space-y-4">
                      <ResponsiveContainer width="100%" height={340}>
                        {spendingChartType === 'pie' ? (
                          <PieChart>
                            <Pie 
                              data={chartData} 
                              cx="50%" 
                              cy="50%" 
                              innerRadius={65} 
                              outerRadius={105} 
                              paddingAngle={2} 
                              dataKey="value"
                              onClick={(entry) => {
                                if (entry.name === 'Other') {
                                  setShowOtherBreakdown(!showOtherBreakdown);
                                }
                              }}
                              className={chartData.some(d => d.name === 'Other') ? "[&_.recharts-pie-sector:last-child]:cursor-pointer" : ""}
                            >
                              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                            <Legend iconType="circle" iconSize={10} formatter={(value: string) => <span className="text-sm text-foreground">{value}</span>} />
                          </PieChart>
                        ) : (
                          <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                        <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                        <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={85} tick={{ fill: 'hsl(var(--foreground))' }} />
                        <Tooltip cursor={{ fill: 'transparent' }} formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                          {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Bar>
                          </BarChart>
                        )}
                      </ResponsiveContainer>
                      {showOtherBreakdown && rest.length > 0 && spendingChartType === 'pie' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="mt-2 border-t border-border pt-4"
                        >
                          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Categories in "Other"</h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            {rest.map((cat, i) => (
                              <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded hover:bg-muted/50 transition-colors">
                                <div className="flex items-center gap-2 truncate pr-2">
                                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                                  <span className="truncate" title={cat.name}>{cat.name}</span>
                                </div>
                                <span className="font-medium text-foreground shrink-0">{formatCurrency(cat.value)}</span>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  );
                })() : (
                  <p className="py-10 text-center text-muted-foreground">No spending data in this period.</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-display">Category Ranking</CardTitle></CardHeader>
              <CardContent>
                {spendingData && spendingData.length > 0 ? (
                  <div className="space-y-3">
                    {spendingData.map((cat, i) => {
                      const maxVal = spendingData[0]?.value || 1;
                      const pct = (cat.value / maxVal) * 100;
                      return (
                        <div key={cat.name}>
                          <div className="flex items-center justify-between text-sm mb-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-muted-foreground w-5">{i + 1}</span>
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                              <span>{cat.name}</span>
                            </div>
                            <span className="font-semibold text-foreground">{formatCurrency(cat.value)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="py-10 text-center text-muted-foreground">No data yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Daily Spending */}
          {dailySpending.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="font-display">Daily Spending</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => formatCompact(v)} />
                    <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'daily' ? 'Daily' : 'Cumulative']} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Legend />
                    <Area type="monotone" dataKey="cumulative" stroke="hsl(262, 83%, 58%)" fill="hsl(262, 83%, 58%)" fillOpacity={0.15} name="Cumulative" strokeWidth={2} />
                    <Area type="monotone" dataKey="daily" stroke="hsl(199, 89%, 48%)" fill="hsl(199, 89%, 48%)" fillOpacity={0.2} name="Daily" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== BUDGET VS ACTUAL ==================== */}
        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetVsActual.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(300, budgetVsActual.length * 50 + 60)}>
                    <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                      <Tooltip cursor={{ fill: 'transparent' }} formatter={(v: number, name: string) => [formatCurrency(v), name === 'budget' ? 'Budget' : 'Actual']} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                      <Legend />
                      <Bar dataKey="budget" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} name="Budget" barSize={16} />
                      <Bar dataKey="actual" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Actual" barSize={16} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-6 space-y-3">
                    {budgetVsActual.map(item => {
                      const pct = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;
                      const isOver = item.actual > item.budget;
                      return (
                        <div key={item.name} className="flex items-center gap-4 text-sm">
                          <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium w-28 truncate">{item.name}</span>
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isOver ? 'hsl(var(--prism-negative))' : item.color }} />
                          </div>
                          <span className={`text-xs font-medium w-12 text-right ${isOver ? 'text-prism-rose' : 'text-muted-foreground'}`}>{pct}%</span>
                          <span className="text-sm font-semibold text-foreground w-40 text-right">
                            {formatCurrency(item.actual)}{' '}
                            <span className="text-xs font-normal text-muted-foreground">/ {formatCurrency(item.budget)}</span>
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-muted-foreground">Set up budgets to compare against your actual spending.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== CASH FLOW ==================== */}
        <TabsContent value="cashflow">
          <div className="grid gap-6 lg:grid-cols-1">
            <Card>
              <CardHeader><CardTitle className="font-display">Income vs Expenses</CardTitle></CardHeader>
              <CardContent>
                {monthlyCashflow.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={monthlyCashflow}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                       <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                      <Legend />
                      <Bar dataKey="income" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="hsl(340, 82%, 52%)" radius={[6, 6, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-muted-foreground">No transaction data in this period.</p>
                )}
              </CardContent>
            </Card>

            {savingsRate.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-display">Savings Rate</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={savingsRate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: number, name: string) => [name === 'rate' ? `${v}%` : formatCurrency(v), name === 'rate' ? 'Savings Rate' : 'Net Savings']} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                      <Legend />
                      <Area type="monotone" dataKey="rate" stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.15} name="Savings Rate" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    {savingsRate.length > 0 && (() => {
                      const avg = Math.round(savingsRate.reduce((s, r) => s + r.rate, 0) / savingsRate.length);
                      const best = Math.max(...savingsRate.map(r => r.rate));
                      const worst = Math.min(...savingsRate.map(r => r.rate));
                      return (
                        <>
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground">Average</p>
                            <p className="font-display text-lg font-bold text-primary">{avg}%</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground">Best Month</p>
                            <p className="font-display text-lg font-bold text-accent">{best}%</p>
                          </div>
                          <div className="rounded-lg bg-muted/50 p-3">
                            <p className="text-xs text-muted-foreground">Worst Month</p>
                            <p className="font-display text-lg font-bold text-prism-rose">{worst}%</p>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ==================== NET WORTH ==================== */}
        <TabsContent value="networth">
          <Card>
            <CardHeader><CardTitle className="font-display">Net Worth Over Time</CardTitle></CardHeader>
            <CardContent>
              {netWorthTrend.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={netWorthTrend}>
                      <defs>
                        <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(262, 83%, 58%)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                      <Area type="monotone" dataKey="netWorth" stroke="hsl(262, 83%, 58%)" fill="url(#netWorthGrad)" strokeWidth={3} name="Net Worth" />
                    </AreaChart>
                  </ResponsiveContainer>

                  {accounts && accounts.length > 0 && (
                    <div className="mt-6">
                      <h3 className="font-display text-sm font-semibold text-muted-foreground mb-3">Current Balances</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {accounts.map(acc => (
                          <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                            <div>
                              <p className="text-sm font-medium">{acc.name}</p>
                              <p className="text-xs text-muted-foreground capitalize">{acc.account_type}</p>
                            </div>
                            <span className={`font-display font-semibold ${acc.balance >= 0 ? 'text-accent' : 'text-prism-rose'}`}>
                              {formatCurrency(acc.balance)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="py-10 text-center text-muted-foreground">No data for this period.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TRENDS ==================== */}
        <TabsContent value="trends">
          <Card>
            <CardHeader><CardTitle className="font-display">Spending Trends by Category</CardTitle></CardHeader>
            <CardContent>
              {spendingTrends.data.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={spendingTrends.data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Legend />
                    {spendingTrends.categoryNames.map((name, i) => (
                      <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <p className="py-10 text-center text-muted-foreground">No spending trends for this period.</p>
              )}
            </CardContent>
          </Card>

          {monthlyCashflow.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="font-display">Monthly Net Savings</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyCashflow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="savings" name="Net Savings" radius={[6, 6, 0, 0]}>
                      {monthlyCashflow.map((entry, i) => (
                        <Cell key={i} fill={entry.savings >= 0 ? 'hsl(160, 84%, 39%)' : 'hsl(340, 82%, 52%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ==================== TOP MERCHANTS ==================== */}
        <TabsContent value="merchants">
          <Card>
            <CardHeader><CardTitle className="font-display">Top Merchants by Spending</CardTitle></CardHeader>
            <CardContent>
              {topMerchants.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(300, topMerchants.length * 40 + 40)}>
                    <BarChart data={topMerchants} layout="vertical" margin={{ left: 10, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={{ color: 'hsl(var(--foreground))' }} />
                      <Bar dataKey="total" name="Total Spent" radius={[0, 6, 6, 0]} barSize={20}>
                        {topMerchants.map((_, i) => (
                          <Cell key={i} fill={TREND_COLORS[i % TREND_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="mt-6 space-y-2">
                    {topMerchants.map((m, i) => (
                      <div key={m.name} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: TREND_COLORS[i % TREND_COLORS.length] }}>
                            {i + 1}
                          </span>
                          <span className="text-sm font-medium">{m.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-bold text-foreground">{formatCurrency(m.total)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{m.count} txn{m.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-muted-foreground">No merchant data in this period.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </div>
      </Tabs>
      )}
    </motion.div>
  );
};

export default Reports;
