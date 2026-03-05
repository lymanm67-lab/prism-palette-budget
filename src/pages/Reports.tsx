import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpendingByCategory, useTransactions, useBudgets, useCategories, useAccounts } from '@/hooks/use-finance-data';
import { formatCurrency } from '@/lib/seed-data';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

const TREND_COLORS = [
  'hsl(262, 83%, 58%)', 'hsl(160, 84%, 39%)', 'hsl(36, 100%, 57%)',
  'hsl(340, 82%, 52%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)',
  'hsl(24, 95%, 53%)', 'hsl(239, 84%, 67%)',
];

const Reports = () => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const { data: spendingData, isLoading } = useSpendingByCategory(monthStart, monthEnd);
  const { data: transactions } = useTransactions();
  const { data: budgets } = useBudgets(monthStart);
  const { data: categories } = useCategories();
  const { data: accounts } = useAccounts();

  // ==================== CASH FLOW ====================
  const monthlyCashflow = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, { month: string; income: number; expenses: number; savings: number }>();
    for (const t of transactions) {
      const m = t.date.substring(0, 7);
      const label = new Date(t.date).toLocaleDateString('en-US', { month: 'short' });
      const existing = map.get(m) || { month: label, income: 0, expenses: 0, savings: 0 };
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
    const monthPrefix = monthStart.substring(0, 7);
    const spentMap: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date.startsWith(monthPrefix) && t.amount < 0 && t.category_id) {
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
  }, [budgets, transactions, categories, monthStart]);

  // ==================== NET WORTH OVER TIME ====================
  const netWorthTrend = useMemo(() => {
    if (!transactions || !accounts) return [];
    // Calculate current net worth from accounts
    const currentNetWorth = (accounts || []).reduce((s, a) => s + a.balance, 0);
    // Walk backwards through months applying transaction deltas
    const monthlyDeltas = new Map<string, number>();
    for (const t of transactions) {
      const m = t.date.substring(0, 7);
      monthlyDeltas.set(m, (monthlyDeltas.get(m) || 0) + t.amount);
    }
    const months = Array.from(monthlyDeltas.keys()).sort();
    if (months.length === 0) return [];

    // Build forward from earliest month
    const points: { month: string; netWorth: number }[] = [];
    let runningNetWorth = currentNetWorth;
    // First subtract all deltas to get starting point
    for (const m of months) {
      runningNetWorth -= monthlyDeltas.get(m) || 0;
    }
    // Then add them back month by month
    for (const m of months) {
      runningNetWorth += monthlyDeltas.get(m) || 0;
      const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      points.push({ month: label, netWorth: runningNetWorth });
    }
    return points;
  }, [transactions, accounts]);

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

  // ==================== SPENDING TRENDS (by category over months) ====================
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
      const label = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' });
      return { month: label, ...monthCatMap.get(m) };
    });

    // Top 6 categories by total spend
    const catTotals = new Map<string, number>();
    for (const [, monthData] of monthCatMap) {
      for (const [cat, val] of Object.entries(monthData)) {
        catTotals.set(cat, (catTotals.get(cat) || 0) + val);
      }
    }
    const topCats = Array.from(catTotals.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name]) => name);

    return { data, categoryNames: topCats };
  }, [transactions, categories]);

  // ==================== DAILY SPENDING (current month) ====================
  const dailySpending = useMemo(() => {
    if (!transactions) return [];
    const monthPrefix = monthStart.substring(0, 7);
    const map = new Map<string, number>();
    for (const t of transactions) {
      if (t.date.startsWith(monthPrefix) && t.amount < 0) {
        map.set(t.date, (map.get(t.date) || 0) + Math.abs(t.amount));
      }
    }
    const days = Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
    let cumulative = 0;
    return days.map(([date, amount]) => {
      cumulative += amount;
      const day = new Date(date).getDate();
      return { day: `${day}`, daily: amount, cumulative };
    });
  }, [transactions, monthStart]);

  // ==================== SAVINGS RATE ====================
  const savingsRate = useMemo(() => {
    return monthlyCashflow.map(m => ({
      month: m.month,
      rate: m.income > 0 ? Math.round(((m.income - m.expenses) / m.income) * 100) : 0,
      savings: m.income - m.expenses,
    }));
  }, [monthlyCashflow]);

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Comprehensive financial insights and analytics.</p>
      </div>

      <Tabs defaultValue="spending" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
          <TabsTrigger value="networth">Net Worth</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="merchants">Top Merchants</TabsTrigger>
        </TabsList>

        {/* ==================== SPENDING ==================== */}
        <TabsContent value="spending">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="font-display">Spending by Category</CardTitle></CardHeader>
              <CardContent>
                {spendingData && spendingData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={spendingData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {spendingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-muted-foreground">Add some transactions to see spending data.</p>
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
                            <span className="font-medium">{formatCurrency(cat.value)}</span>
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

          {/* Daily Spending for current month */}
          {dailySpending.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="font-display">Daily Spending — {now.toLocaleDateString('en-US', { month: 'long' })}</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={dailySpending}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `$${v}`} />
                    <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'daily' ? 'Daily' : 'Cumulative']} contentStyle={tooltipStyle} />
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
              <CardTitle className="font-display">Budget vs Actual — {now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetVsActual.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(300, budgetVsActual.length * 50 + 60)}>
                    <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                      <Tooltip formatter={(v: number, name: string) => [formatCurrency(v), name === 'budget' ? 'Budget' : 'Actual']} contentStyle={tooltipStyle} />
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
                          <span className="text-xs text-muted-foreground w-32 text-right">{formatCurrency(item.actual)} / {formatCurrency(item.budget)}</span>
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
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                      <Legend />
                      <Bar dataKey="income" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Income" />
                      <Bar dataKey="expenses" fill="hsl(340, 82%, 52%)" radius={[6, 6, 0, 0]} name="Expenses" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="py-10 text-center text-muted-foreground">Add transactions to see cash flow data.</p>
                )}
              </CardContent>
            </Card>

            {/* Savings Rate */}
            {savingsRate.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="font-display">Savings Rate</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={savingsRate}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v: number, name: string) => [name === 'rate' ? `${v}%` : formatCurrency(v), name === 'rate' ? 'Savings Rate' : 'Net Savings']} contentStyle={tooltipStyle} />
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
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="netWorth" stroke="hsl(262, 83%, 58%)" fill="url(#netWorthGrad)" strokeWidth={3} name="Net Worth" />
                    </AreaChart>
                  </ResponsiveContainer>

                  {/* Account breakdown */}
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
                <p className="py-10 text-center text-muted-foreground">Add accounts and transactions to track your net worth over time.</p>
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
                <>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={spendingTrends.data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v}`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                      <Legend />
                      {spendingTrends.categoryNames.map((name, i) => (
                        <Line key={name} type="monotone" dataKey={name} stroke={TREND_COLORS[i % TREND_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <p className="py-10 text-center text-muted-foreground">Add transactions across multiple months to see spending trends.</p>
              )}
            </CardContent>
          </Card>

          {/* Monthly Net Savings Trend */}
          {monthlyCashflow.length > 0 && (
            <Card className="mt-6">
              <CardHeader><CardTitle className="font-display">Monthly Net Savings</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={monthlyCashflow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
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
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v}`} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
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
                          <span className="text-sm font-semibold">{formatCurrency(m.total)}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{m.count} txn{m.count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="py-10 text-center text-muted-foreground">Add transactions with merchant names to see your top spending destinations.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Reports;
