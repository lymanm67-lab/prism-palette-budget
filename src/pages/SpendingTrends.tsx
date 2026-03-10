import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAllTransactions, useCategories } from '@/hooks/use-finance-data';
import { useAccounts } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, TrendingUp, TrendingDown, ArrowUpDown, BarChart3, Download, FileText } from 'lucide-react';
import { useMemo, useRef, useState, useCallback } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportToPdf, exportToCsv } from '@/lib/export-utils';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { subMonths, format, startOfMonth } from 'date-fns';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, Cell, AreaChart, Area,
} from 'recharts';
import PageOverview from '@/components/PageOverview';

const COLORS = [
  'hsl(262, 83%, 58%)', 'hsl(160, 84%, 39%)', 'hsl(36, 100%, 57%)',
  'hsl(340, 82%, 52%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)',
  'hsl(24, 95%, 53%)', 'hsl(239, 84%, 67%)', 'hsl(280, 65%, 60%)',
  'hsl(14, 90%, 55%)',
];

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };
const tooltipItemStyle = { color: 'hsl(var(--foreground))' };
const tooltipLabelStyle = { color: 'hsl(var(--foreground))' };

const MONTH_OPTIONS = [
  { label: 'Last 3 Months', value: 3 },
  { label: 'Last 6 Months', value: 6 },
  { label: 'Last 12 Months', value: 12 },
];

const SpendingTrends = () => {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: allTransactions, isLoading } = useAllTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const [monthCount, setMonthCount] = useState(6);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportPdf = useCallback(async () => {
    if (!reportRef.current) return;
    toast.info('Generating PDF...');
    try {
      await exportToPdf(reportRef.current, `spending-trends-${monthCount}mo`);
      toast.success('PDF downloaded!');
    } catch { toast.error('Failed to generate PDF'); }
  }, [monthCount]);



  // Build month range
  const monthRange = useMemo(() => {
    const months: string[] = [];
    for (let i = monthCount - 1; i >= 0; i--) {
      months.push(format(startOfMonth(subMonths(new Date(), i)), 'yyyy-MM'));
    }
    return months;
  }, [monthCount]);

  // Aggregate spending by month × category
  const { monthlyData, categoryNames, categoryColorMap, categoryTotals } = useMemo(() => {
    if (!allTransactions || !categories) return { monthlyData: [], categoryNames: [], categoryColorMap: {} as Record<string, string>, categoryTotals: {} as Record<string, number> };

    // Build set of investment account IDs to exclude
    const investmentAccountIds = new Set<string>();
    if (accounts) {
      for (const a of accounts) {
        if (a.account_type === 'investment') investmentAccountIds.add(a.id);
      }
    }

    const catMap = new Map(categories.map(c => [c.id, c]));
    const monthCatMap = new Map<string, Record<string, number>>();
    const catTotals: Record<string, number> = {};

    for (const m of monthRange) monthCatMap.set(m, {});

    for (const t of allTransactions) {
      if (t.amount >= 0) continue;
      // Exclude investment account transactions from spending analysis
      if (investmentAccountIds.has(t.account_id)) continue;
      const m = t.date.substring(0, 7);
      if (!monthCatMap.has(m)) continue;
      const cat = t.category_id ? catMap.get(t.category_id) : null;
      const catName = cat?.name || 'Uncategorized';
      const data = monthCatMap.get(m)!;
      data[catName] = (data[catName] || 0) + Math.abs(t.amount);
      catTotals[catName] = (catTotals[catName] || 0) + Math.abs(t.amount);
    }

    const topCats = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name);

    const colorMap: Record<string, string> = {};
    topCats.forEach((name, i) => { colorMap[name] = COLORS[i % COLORS.length]; });

    const data = monthRange.map(m => {
      const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const raw = monthCatMap.get(m) || {};
      const entry: Record<string, unknown> = { month: label, total: 0 };
      for (const cat of topCats) {
        entry[cat] = raw[cat] || 0;
        entry.total = (entry.total as number) + (raw[cat] || 0);
      }
      return entry;
    });

    return { monthlyData: data, categoryNames: topCats, categoryColorMap: colorMap, categoryTotals: catTotals };
  }, [allTransactions, categories, monthRange]);

  const handleExportCsv = useCallback(() => {
    try {
      const headers = ['Month', ...categoryNames, 'Total'];
      const rows = monthlyData.map(d => [
        d.month as string,
        ...categoryNames.map(n => (d[n] as number) || 0),
        (d.total as number) || 0,
      ]);
      exportToCsv(headers, rows as (string | number)[][], `spending-trends-${monthCount}mo`);
      toast.success('CSV downloaded!');
    } catch { toast.error('Failed to generate CSV'); }
  }, [monthlyData, categoryNames, monthCount]);

  // Month-over-month changes
  const momChanges = useMemo(() => {
    if (monthlyData.length < 2) return [];
    const curr = monthlyData[monthlyData.length - 1];
    const prev = monthlyData[monthlyData.length - 2];
    return categoryNames.map(name => {
      const currVal = (curr[name] as number) || 0;
      const prevVal = (prev[name] as number) || 0;
      const change = prevVal > 0 ? ((currVal - prevVal) / prevVal) * 100 : currVal > 0 ? 100 : 0;
      return { name, current: currVal, previous: prevVal, change };
    }).sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  }, [monthlyData, categoryNames]);

  // Single category data for line chart
  const singleCategoryData = useMemo(() => {
    if (selectedCategory === 'all') return null;
    return monthlyData.map(d => ({
      month: d.month as string,
      amount: (d[selectedCategory] as number) || 0,
    }));
  }, [selectedCategory, monthlyData]);

  // Summary stats
  const totalSpent = monthlyData.reduce((s, d) => s + ((d.total as number) || 0), 0);
  const avgMonthly = monthlyData.length > 0 ? totalSpent / monthlyData.length : 0;
  const lastMonthTotal = monthlyData.length > 0 ? (monthlyData[monthlyData.length - 1].total as number) || 0 : 0;
  const prevMonthTotal = monthlyData.length > 1 ? (monthlyData[monthlyData.length - 2].total as number) || 0 : 0;
  const momTotal = prevMonthTotal > 0 ? ((lastMonthTotal - prevMonthTotal) / prevMonthTotal) * 100 : 0;

  if (isLoading) return (
    <div className="p-8 space-y-6">
      <div className="mb-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded-lg mb-2" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
      <div className="h-[400px] bg-muted animate-pulse rounded-lg" />
    </div>
  );

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold prism-gradient-text">Spending Trends</h1>
          <p className="text-muted-foreground">Compare spending by category across months.</p>
          <PageOverview
            title="Spending Trends"
            description="Deep dive into how your spending by category evolves month-over-month with interactive charts."
            icon={BarChart3}
            iconColor="text-prism-orange"
            ttsScript="The Spending Trends page shows how your spending evolves over time. View a stacked bar chart comparing categories across months, drill into individual category trends, and see month-over-month changes at a glance."
            features={[
              'Stacked bar chart by category',
              'Individual category trend lines',
              'Month-over-month change indicators',
              'Adjustable time window',
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(monthCount)} onValueChange={v => setMonthCount(Number(v))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map(o => (
                <SelectItem key={o.value} value={String(o.value)}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportCsv} className="gap-2">
                <FileText className="h-4 w-4" /> Download CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                <Download className="h-4 w-4" /> Download PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards — wrap in ref for PDF export */}
      <div ref={reportRef}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Total Spent ({monthCount}mo)</p>
            <p className="font-display text-2xl font-bold mt-1">{formatCurrency(totalSpent)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Monthly Average</p>
            <p className="font-display text-2xl font-bold mt-1">{formatCurrency(avgMonthly)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs font-medium text-muted-foreground">Month-over-Month</p>
            <p className={cn("font-display text-2xl font-bold mt-1 flex items-center gap-1", momTotal > 0 ? 'text-prism-rose' : 'text-accent')}>
              {momTotal > 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {momTotal > 0 ? '+' : ''}{momTotal.toFixed(1)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart */}
      <Card>
        <CardHeader><CardTitle className="font-display">Monthly Spending by Category</CardTitle></CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Legend />
                {categoryNames.map((name, i) => (
                  <Bar key={name} dataKey={name} stackId="spending" fill={categoryColorMap[name]} radius={i === categoryNames.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="py-10 text-center text-muted-foreground">No spending data for this period.</p>
          )}
        </CardContent>
      </Card>

      {/* Category Drill-down */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-display">Category Trend</CardTitle>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categoryNames.map(name => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {selectedCategory === 'all' ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Legend />
                {categoryNames.map(name => (
                  <Line key={name} type="monotone" dataKey={name} stroke={categoryColorMap[name]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : singleCategoryData ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={singleCategoryData}>
                <defs>
                  <linearGradient id="catGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={categoryColorMap[selectedCategory] || COLORS[0]} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={categoryColorMap[selectedCategory] || COLORS[0]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                <Area type="monotone" dataKey="amount" stroke={categoryColorMap[selectedCategory] || COLORS[0]} fill="url(#catGrad)" strokeWidth={3} name={selectedCategory} />
              </AreaChart>
            </ResponsiveContainer>
          ) : null}
        </CardContent>
      </Card>

      {/* Month-over-Month Changes */}
      {momChanges.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="font-display">Month-over-Month Changes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {momChanges.map(item => (
                <div key={item.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: categoryColorMap[item.name] }} />
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">{formatCurrency(item.previous)} → {formatCurrency(item.current)}</span>
                    <Badge variant={item.change > 5 ? 'destructive' : item.change < -5 ? 'default' : 'secondary'} className="min-w-[60px] justify-center">
                      {item.change > 0 ? '+' : ''}{item.change.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      </div>
    </motion.div>
  );
};

export default SpendingTrends;
