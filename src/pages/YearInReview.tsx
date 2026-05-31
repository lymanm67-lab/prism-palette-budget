import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllTransactions, useCategories } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, DollarSign, ShoppingBag, PiggyBank, Calendar, Sparkles, Award, Target } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line } from 'recharts';
import { format, parseISO, startOfYear, endOfYear } from 'date-fns';
import PageOverview from '@/components/PageOverview';
import { SkeletonCard } from '@/components/SkeletonCard';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const COLORS = ['hsl(var(--primary))', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16'];

const YearInReview = () => {
  const { formatCurrency } = useCurrency();
  const { data: transactions, isLoading } = useAllTransactions();
  const { data: categories } = useCategories();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const yearData = useMemo(() => {
    if (!transactions) return null;

    const yearStart = `${selectedYear}-01-01`;
    const yearEnd = `${selectedYear}-12-31`;
    const yearTxns = transactions.filter(t => t.date >= yearStart && t.date <= yearEnd);

    // Monthly breakdown
    const monthlyData = MONTHS.map((month, i) => {
      const monthStr = `${selectedYear}-${String(i + 1).padStart(2, '0')}`;
      const monthTxns = yearTxns.filter(t => t.date.startsWith(monthStr));
      const income = monthTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
      const expenses = monthTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
      return { month, income, expenses, net: income - expenses };
    });

    // Total income & expenses
    const totalIncome = yearTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0);
    const totalExpenses = yearTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0);
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Spending by category
    const categorySpending: Record<string, { name: string; color: string; value: number }> = {};
    for (const t of yearTxns) {
      if (t.amount < 0 && t.category_id) {
        const cat = categories?.find(c => c.id === t.category_id);
        const name = cat?.name || 'Uncategorized';
        const color = cat?.color || '#888';
        if (!categorySpending[name]) categorySpending[name] = { name, color, value: 0 };
        categorySpending[name].value += Math.abs(t.amount);
      }
    }
    const topCategories = Object.values(categorySpending).sort((a, b) => b.value - a.value).slice(0, 8);

    // Top merchants
    const merchantSpending: Record<string, number> = {};
    for (const t of yearTxns) {
      if (t.amount < 0 && t.merchant) {
        const m = t.merchant.trim();
        merchantSpending[m] = (merchantSpending[m] || 0) + Math.abs(t.amount);
      }
    }
    const topMerchants = Object.entries(merchantSpending)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));

    // Best & worst months
    const bestMonth = monthlyData.reduce((best, m) => m.net > best.net ? m : best, monthlyData[0]);
    const worstMonth = monthlyData.reduce((worst, m) => m.net < worst.net ? m : worst, monthlyData[0]);

    // Average monthly spending
    const avgMonthlySpending = totalExpenses / 12;
    const avgMonthlyIncome = totalIncome / 12;

    return {
      monthlyData,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      topCategories,
      topMerchants,
      bestMonth,
      worstMonth,
      avgMonthlySpending,
      avgMonthlyIncome,
      transactionCount: yearTxns.length,
    };
  }, [transactions, categories, selectedYear]);

  const availableYears = useMemo(() => {
    if (!transactions?.length) return [currentYear];
    const years = new Set(transactions.map(t => parseInt(t.date.substring(0, 4))));
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions, currentYear]);

  if (isLoading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (!yearData) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        No transaction data available.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">{selectedYear} Year in Review</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            <span className="text-xs uppercase tracking-wider text-primary/80 mr-2">Full year story</span>
            Your annual financial summary
          </p>
        </div>
        <PageOverview
          title="Year in Review"
          description="See your annual spending patterns, top categories, favorite merchants, and savings rate at a glance."
          icon={Sparkles}
          iconColor="text-prism-amber"
          ttsScript="Year in Review gives you a comprehensive look at your finances over the entire year. See your total income vs expenses, savings rate, month-over-month trends, top spending categories, and most frequented merchants."
          features={[
            'Annual income vs expenses summary',
            'Month-by-month spending trends',
            'Top spending categories breakdown',
            'Most frequented merchants',
            'Best and worst financial months',
            'Savings rate calculation',
          ]}
        />
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSelectedYear(y => y - 1)} disabled={!availableYears.includes(selectedYear - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableYears.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={() => setSelectedYear(y => y + 1)} disabled={!availableYears.includes(selectedYear + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="prism-card-shine">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Income</p>
                <p className="text-xl font-bold font-display text-emerald-600 dark:text-emerald-400">{formatCurrency(yearData.totalIncome)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="prism-card-shine">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="h-5 w-5 text-rose-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Expenses</p>
                <p className="text-xl font-bold font-display text-rose-600 dark:text-rose-400">{formatCurrency(yearData.totalExpenses)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="prism-card-shine">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <PiggyBank className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Net Savings</p>
                <p className={`text-xl font-bold font-display ${yearData.netSavings >= 0 ? 'text-primary' : 'text-rose-600 dark:text-rose-400'}`}>
                  {formatCurrency(yearData.netSavings)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="prism-card-shine">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Savings Rate</p>
                <p className={`text-xl font-bold font-display ${yearData.savingsRate >= 20 ? 'text-emerald-600 dark:text-emerald-400' : yearData.savingsRate >= 10 ? 'text-amber-600' : 'text-rose-600'}`}>
                  {yearData.savingsRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Monthly Income vs Expenses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData.monthlyData}>
                <XAxis dataKey="month" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 8 }}
                />
                <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Award className="h-5 w-5 text-primary" />
              Top Spending Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={yearData.topCategories}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {yearData.topCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Merchants */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Top 10 Merchants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {yearData.topMerchants.map((merchant, i) => (
                <div key={merchant.name} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground w-6">{i + 1}.</span>
                  <span className="flex-1 text-sm font-medium truncate">{merchant.name}</span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(merchant.value)}</span>
                </div>
              ))}
              {yearData.topMerchants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No merchant data available</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Highlights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-5 text-center">
            <Sparkles className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Best Month</p>
            <p className="text-lg font-bold font-display text-emerald-600 dark:text-emerald-400">{yearData.bestMonth.month}</p>
            <p className="text-sm text-muted-foreground">+{formatCurrency(yearData.bestMonth.net)} net</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-500/5 border-rose-500/20">
          <CardContent className="p-5 text-center">
            <TrendingDown className="h-8 w-8 text-rose-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Toughest Month</p>
            <p className="text-lg font-bold font-display text-rose-600 dark:text-rose-400">{yearData.worstMonth.month}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(yearData.worstMonth.net)} net</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-5 text-center">
            <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Avg Monthly Spend</p>
            <p className="text-lg font-bold font-display text-primary">{formatCurrency(yearData.avgMonthlySpending)}</p>
            <p className="text-sm text-muted-foreground">{yearData.transactionCount} transactions</p>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default YearInReview;
