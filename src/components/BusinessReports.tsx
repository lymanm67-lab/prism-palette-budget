import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCurrency } from '@/hooks/use-currency';
import { useBusinessTransactions, useBusinessBudgets, useBusinessCategoryGroups, useBusinessProfiles } from '@/hooks/use-business-data';
import { useAccounts } from '@/hooks/use-finance-data';
import { format } from 'date-fns';
import { Loader2, TrendingUp, TrendingDown, DollarSign, AlertTriangle, Receipt, Building2, PieChart as PieChartIcon, BarChart3, Target, Percent, Filter } from 'lucide-react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
  AreaChart, Area, LineChart, Line,
} from 'recharts';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', color: 'hsl(var(--foreground))' };
const tooltipItemStyle = { color: 'hsl(var(--foreground))' };
const tooltipLabelStyle = { color: 'hsl(var(--foreground))' };
const COLORS = [
  'hsl(262, 83%, 58%)', 'hsl(160, 84%, 39%)', 'hsl(36, 100%, 57%)',
  'hsl(340, 82%, 52%)', 'hsl(199, 89%, 48%)', 'hsl(142, 71%, 45%)',
  'hsl(24, 95%, 53%)', 'hsl(239, 84%, 67%)',
];

interface Props {
  startDate: string;
  endDate: string;
  budgetMonth: string;
}

const EmptyState = ({ message }: { message: string }) => (
  <p className="py-10 text-center text-muted-foreground">{message}</p>
);

const BusinessReports = ({ startDate, endDate, budgetMonth }: Props) => {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: transactions, isLoading: txnLoading } = useBusinessTransactions(startDate, endDate);
  const { data: budgets, isLoading: budLoading } = useBusinessBudgets(budgetMonth);
  const { data: groups } = useBusinessCategoryGroups();
  const { data: businessProfiles } = useBusinessProfiles();
  const { data: accounts } = useAccounts();
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');

  // Filtered transactions based on selected business profile
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    if (selectedBusiness === 'all') return transactions;
    return transactions.filter((t: any) => t._business_profile_id === selectedBusiness);
  }, [transactions, selectedBusiness]);

  // Filtered budgets based on selected business profile
  const filteredBudgets = useMemo(() => {
    if (!budgets) return [];
    if (selectedBusiness === 'all') return budgets;
    return budgets.filter((b: any) => b._business_profile_id === selectedBusiness);
  }, [budgets, selectedBusiness]);

  // Build a lookup from business_profile_id -> business_name
  const bizProfileNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (businessProfiles) {
      for (const bp of businessProfiles) map[bp.id] = bp.business_name;
    }
    return map;
  }, [businessProfiles]);

  // 1. P&L Summary
  const pnl = useMemo(() => {
    if (!filteredTransactions.length) return { revenue: 0, expenses: 0, net: 0, byBusiness: [] as { name: string; revenue: number; expenses: number; net: number }[] };
    const bizMap = new Map<string, { revenue: number; expenses: number }>();
    let totalRevenue = 0, totalExpenses = 0;

    for (const t of filteredTransactions) {
      const bpId = (t as any)._business_profile_id;
      const biz = bpId && bizProfileNameMap[bpId] ? bizProfileNameMap[bpId] : 'Unlinked';

      if (!bizMap.has(biz)) bizMap.set(biz, { revenue: 0, expenses: 0 });
      const entry = bizMap.get(biz)!;

      if (t.amount > 0) { entry.revenue += t.amount; totalRevenue += t.amount; }
      else { entry.expenses += Math.abs(t.amount); totalExpenses += Math.abs(t.amount); }
    }

    const byBusiness = Array.from(bizMap.entries()).map(([name, v]) => ({
      name, revenue: v.revenue, expenses: v.expenses, net: v.revenue - v.expenses,
    }));

    return { revenue: totalRevenue, expenses: totalExpenses, net: totalRevenue - totalExpenses, byBusiness };
  }, [filteredTransactions, bizProfileNameMap]);

  // 2. Expense Breakdown
  const expenseBreakdown = useMemo(() => {
    if (!filteredTransactions.length) return [];
    const map = new Map<string, { name: string; color: string; value: number }>();
    for (const t of filteredTransactions) {
      if (t.amount >= 0) continue;
      const catName = (t.categories as any)?.name || 'Uncategorized';
      const catColor = (t.categories as any)?.color || '#888';
      const e = map.get(catName) || { name: catName, color: catColor, value: 0 };
      e.value += Math.abs(t.amount);
      map.set(catName, e);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // 3. Revenue by Source
  const revenueBySource = useMemo(() => {
    if (!filteredTransactions.length) return [];
    const map = new Map<string, { name: string; color: string; value: number }>();
    for (const t of filteredTransactions) {
      if (t.amount <= 0) continue;
      const catName = (t.categories as any)?.name || 'Uncategorized';
      const catColor = (t.categories as any)?.color || '#888';
      const e = map.get(catName) || { name: catName, color: catColor, value: 0 };
      e.value += t.amount;
      map.set(catName, e);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // 4. Monthly Revenue Trend
  const monthlyRevenue = useMemo(() => {
    if (!filteredTransactions.length) return [];
    const map = new Map<string, { month: string; sortKey: string; revenue: number; expenses: number }>();
    for (const t of filteredTransactions) {
      const m = t.date.substring(0, 7);
      const label = new Date(t.date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const e = map.get(m) || { month: label, sortKey: m, revenue: 0, expenses: 0 };
      if (t.amount > 0) e.revenue += t.amount;
      else e.expenses += Math.abs(t.amount);
      map.set(m, e);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [filteredTransactions]);

  // 5. Budget vs Actual (Business)
  const bizBudgetVsActual = useMemo(() => {
    if (!filteredBudgets.length || !filteredTransactions.length) return [];
    const spentMap: Record<string, number> = {};
    for (const t of filteredTransactions) {
      if (t.amount < 0 && t.category_id) {
        spentMap[t.category_id] = (spentMap[t.category_id] || 0) + Math.abs(t.amount);
      }
    }
    return filteredBudgets.map(b => {
      const cat = b.categories as any;
      return {
        name: cat?.name || 'Unknown',
        group: cat?.category_groups?.name || '',
        budget: b.planned_amount,
        actual: spentMap[b.category_id] || 0,
        color: cat?.color || 'hsl(var(--primary))',
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [filteredBudgets, filteredTransactions]);

  // 6. Expense by Business
  const expenseByBusiness = useMemo(() => {
    if (!pnl.byBusiness.length) return [];
    return pnl.byBusiness.map((b, i) => ({ ...b, color: COLORS[i % COLORS.length] }));
  }, [pnl]);

  // 7. Top Business Expenses (individual transactions)
  const topExpenses = useMemo(() => {
    if (!filteredTransactions.length) return [];
    return filteredTransactions
      .filter(t => t.amount < 0)
      .sort((a, b) => a.amount - b.amount)
      .slice(0, 15)
      .map(t => ({
        date: t.date,
        merchant: t.merchant || 'Unknown',
        category: (t.categories as any)?.name || 'Uncategorized',
        amount: Math.abs(t.amount),
        account: (t.accounts as any)?.name || '',
      }));
  }, [filteredTransactions]);

  // 8. Expense Ratio (ops expense / revenue)
  const expenseRatios = useMemo(() => {
    if (!pnl.byBusiness.length) return [];
    return pnl.byBusiness
      .filter(b => b.revenue > 0)
      .map((b, i) => ({
        name: b.name,
        ratio: Math.round((b.expenses / b.revenue) * 100),
        color: COLORS[i % COLORS.length],
      }));
  }, [pnl]);

  // 9. Category Group Spending
  const groupSpending = useMemo(() => {
    if (!filteredTransactions.length) return [];
    const map = new Map<string, { name: string; value: number }>();
    for (const t of filteredTransactions) {
      if (t.amount >= 0) continue;
      const groupName = (t.categories as any)?.category_groups?.name || 'Other';
      const e = map.get(groupName) || { name: groupName, value: 0 };
      e.value += Math.abs(t.amount);
      map.set(groupName, e);
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredTransactions]);

  // 10. Tax Deductible Summary
  const taxDeductions = useMemo(() => {
    if (!expenseBreakdown.length) return { total: 0, categories: [] as typeof expenseBreakdown };
    // All business expenses are potentially deductible
    const total = expenseBreakdown.reduce((s, e) => s + e.value, 0);
    return { total, categories: expenseBreakdown };
  }, [expenseBreakdown]);

  if (txnLoading || budLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      {businessProfiles && businessProfiles.length > 0 && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by business" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Businesses</SelectItem>
              {businessProfiles.map(bp => (
                <SelectItem key={bp.id} value={bp.id}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5" />
                    {bp.business_name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBusiness !== 'all' && (
            <Badge variant="secondary" className="text-xs">
              Filtered: {businessProfiles.find(bp => bp.id === selectedBusiness)?.business_name}
            </Badge>
          )}
        </div>
      )}
    <Tabs defaultValue="pnl" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="pnl" className="text-xs">P&L</TabsTrigger>
        <TabsTrigger value="expenses" className="text-xs">Expenses</TabsTrigger>
        <TabsTrigger value="revenue" className="text-xs">Revenue</TabsTrigger>
        <TabsTrigger value="trend" className="text-xs">Trends</TabsTrigger>
        <TabsTrigger value="biz-budget" className="text-xs">Budget</TabsTrigger>
        <TabsTrigger value="by-business" className="text-xs">By Business</TabsTrigger>
        <TabsTrigger value="top-expenses" className="text-xs">Top Expenses</TabsTrigger>
        <TabsTrigger value="ratios" className="text-xs">Ratios</TabsTrigger>
        <TabsTrigger value="groups" className="text-xs">By Group</TabsTrigger>
        <TabsTrigger value="tax" className="text-xs">Tax Summary</TabsTrigger>
      </TabsList>

      {/* 1. P&L */}
      <TabsContent value="pnl">
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <Card><CardContent className="pt-6 text-center">
            <TrendingUp className="mx-auto h-5 w-5 text-accent mb-1" />
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="font-display text-2xl font-bold text-accent">{formatCurrency(pnl.revenue)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <TrendingDown className="mx-auto h-5 w-5 text-destructive mb-1" />
            <p className="text-xs text-muted-foreground">Total Expenses</p>
            <p className="font-display text-2xl font-bold text-destructive">{formatCurrency(pnl.expenses)}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <DollarSign className="mx-auto h-5 w-5 text-primary mb-1" />
            <p className="text-xs text-muted-foreground">Net Profit/Loss</p>
            <p className={`font-display text-2xl font-bold ${pnl.net >= 0 ? 'text-accent' : 'text-destructive'}`}>{formatCurrency(pnl.net)}</p>
          </CardContent></Card>
        </div>
        {pnl.byBusiness.length > 0 ? (
          <Card>
            <CardHeader><CardTitle className="font-display">P&L by Business</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={pnl.byBusiness}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => formatCompact(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  <Legend />
                  <Bar dataKey="revenue" fill="hsl(160, 84%, 39%)" name="Revenue" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="hsl(340, 82%, 52%)" name="Expenses" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="net" fill="hsl(262, 83%, 58%)" name="Net" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : <EmptyState message="No business transaction data in this period." />}
      </TabsContent>

      {/* 2. Expense Breakdown */}
      <TabsContent value="expenses">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display">Business Expense Breakdown</CardTitle></CardHeader>
            <CardContent>
              {expenseBreakdown.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={expenseBreakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {expenseBreakdown.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No expense data." />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display">Expense Ranking</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {expenseBreakdown.slice(0, 10).map((cat, i) => {
                  const maxVal = expenseBreakdown[0]?.value || 1;
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
                        <div className="h-full rounded-full" style={{ width: `${(cat.value / maxVal) * 100}%`, backgroundColor: cat.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* 3. Revenue by Source */}
      <TabsContent value="revenue">
        <Card>
          <CardHeader><CardTitle className="font-display">Revenue by Source</CardTitle></CardHeader>
          <CardContent>
            {revenueBySource.length > 0 ? (
              <div className="grid gap-6 lg:grid-cols-2">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={revenueBySource} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {revenueBySource.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-3">
                  {revenueBySource.map((src, i) => (
                    <div key={src.name} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: src.color }} />
                        <span className="text-sm font-medium">{src.name}</span>
                      </div>
                      <span className="text-sm font-semibold text-accent">{formatCurrency(src.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState message="No revenue data in this period." />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 4. Monthly Revenue & Expense Trends */}
      <TabsContent value="trend">
        <Card>
          <CardHeader><CardTitle className="font-display">Monthly Business Trends</CardTitle></CardHeader>
          <CardContent>
            {monthlyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => formatCompact(v)} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} />
                  <Legend />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(160, 84%, 39%)" fill="hsl(160, 84%, 39%)" fillOpacity={0.15} name="Revenue" strokeWidth={2} />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(340, 82%, 52%)" fill="hsl(340, 82%, 52%)" fillOpacity={0.15} name="Expenses" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No trend data." />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 5. Business Budget vs Actual */}
      <TabsContent value="biz-budget">
        <Card>
          <CardHeader><CardTitle className="font-display">Business Budget vs Actual</CardTitle></CardHeader>
          <CardContent>
            {bizBudgetVsActual.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(300, bizBudgetVsActual.length * 40 + 60)}>
                  <BarChart data={bizBudgetVsActual} layout="vertical" margin={{ left: 20, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => formatCompact(v)} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} width={120} />
                    <Tooltip cursor={{ fill: 'transparent' }} formatter={(v: number, name: string) => [formatCurrency(v), name === 'budget' ? 'Budget' : 'Actual']} contentStyle={tooltipStyle} />
                    <Legend />
                    <Bar dataKey="budget" fill="hsl(262, 83%, 58%)" radius={[0, 4, 4, 0]} name="Budget" barSize={14} />
                    <Bar dataKey="actual" fill="hsl(199, 89%, 48%)" radius={[0, 4, 4, 0]} name="Actual" barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2">
                  {bizBudgetVsActual.map(item => {
                    const pct = item.budget > 0 ? Math.round((item.actual / item.budget) * 100) : 0;
                    const isOver = item.actual > item.budget;
                      return (
                        <div key={item.name} className="flex items-center gap-3 text-sm">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="w-32 truncate">{item.name}</span>
                          <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: isOver ? 'hsl(var(--destructive))' : item.color }} />
                          </div>
                          <span className={`text-xs w-10 text-right ${isOver ? 'text-destructive' : 'text-muted-foreground'}`}>{pct}%</span>
                          <span className="text-sm font-semibold text-foreground w-44 text-right">
                            {formatCurrency(item.actual)}{' '}
                            <span className="text-xs font-normal text-muted-foreground">/ {formatCurrency(item.budget)}</span>
                          </span>
                        </div>
                      );
                  })}
                </div>
              </>
            ) : <EmptyState message="No business budgets set for this month." />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 6. Expense by Business */}
      <TabsContent value="by-business">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="font-display">Expenses by Business</CardTitle></CardHeader>
            <CardContent>
              {expenseByBusiness.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={expenseByBusiness} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="expenses"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {expenseByBusiness.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No data." />}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="font-display">Revenue by Business</CardTitle></CardHeader>
            <CardContent>
              {expenseByBusiness.filter(b => b.revenue > 0).length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={expenseByBusiness.filter(b => b.revenue > 0)} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="revenue"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {expenseByBusiness.filter(b => b.revenue > 0).map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              ) : <EmptyState message="No revenue data." />}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* 7. Top Business Expenses */}
      <TabsContent value="top-expenses">
        <Card>
          <CardHeader><CardTitle className="font-display">Top Business Expenses</CardTitle></CardHeader>
          <CardContent>
            {topExpenses.length > 0 ? (
              <div className="space-y-2">
                {topExpenses.map((t, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors border border-border/30">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/10 text-[10px] font-bold text-destructive">{i + 1}</span>
                      <div>
                        <p className="text-sm font-medium">{t.merchant}</p>
                        <p className="text-xs text-muted-foreground">{t.category} · {format(new Date(t.date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-destructive">{formatCurrency(t.amount)}</span>
                  </div>
                ))}
              </div>
            ) : <EmptyState message="No expense transactions." />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 8. Expense Ratios */}
      <TabsContent value="ratios">
        <Card>
          <CardHeader><CardTitle className="font-display">Expense-to-Revenue Ratio by Business</CardTitle></CardHeader>
          <CardContent>
            {expenseRatios.length > 0 ? (
              <div className="space-y-6">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={expenseRatios}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v: number) => `${v}%`} contentStyle={tooltipStyle} />
                    <Bar dataKey="ratio" name="Expense Ratio" radius={[6, 6, 0, 0]}>
                      {expenseRatios.map((e, i) => (
                        <Cell key={i} fill={e.ratio > 80 ? 'hsl(340, 82%, 52%)' : e.ratio > 60 ? 'hsl(36, 100%, 57%)' : 'hsl(160, 84%, 39%)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="grid gap-3 sm:grid-cols-3">
                  {expenseRatios.map((r) => (
                    <div key={r.name} className="rounded-lg border border-border/50 p-4 text-center">
                      <p className="text-sm font-medium text-muted-foreground">{r.name}</p>
                      <p className={`font-display text-3xl font-bold ${r.ratio > 80 ? 'text-destructive' : r.ratio > 60 ? 'text-[hsl(var(--prism-amber))]' : 'text-accent'}`}>{r.ratio}%</p>
                      <Badge variant={r.ratio > 80 ? 'destructive' : 'secondary'} className="mt-1 text-[10px]">
                        {r.ratio > 80 ? 'High' : r.ratio > 60 ? 'Moderate' : 'Healthy'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            ) : <EmptyState message="Need revenue data to calculate ratios." />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 9. Category Group Spending */}
      <TabsContent value="groups">
        <Card>
          <CardHeader><CardTitle className="font-display">Spending by Category Group</CardTitle></CardHeader>
          <CardContent>
            {groupSpending.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={Math.max(250, groupSpending.length * 35 + 40)}>
                  <BarChart data={groupSpending} layout="vertical" margin={{ left: 30, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={v => formatCompact(v)} />
                    <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={10} width={160} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Spent" radius={[0, 6, 6, 0]} barSize={16}>
                      {groupSpending.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : <EmptyState message="No group spending data." />}
          </CardContent>
        </Card>
      </TabsContent>

      {/* 10. Tax Deduction Summary */}
      <TabsContent value="tax">
        <Card>
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" /> Potential Tax Deductions Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--prism-amber))]" />
                <span className="text-sm font-medium">Disclaimer</span>
              </div>
              <p className="text-xs text-muted-foreground">This is a summary of business expenses that may be tax-deductible. Consult a CPA for actual deduction eligibility.</p>
            </div>

            <div className="text-center mb-6">
              <p className="text-xs text-muted-foreground">Total Potential Deductions</p>
              <p className="font-display text-4xl font-bold text-primary">{formatCurrency(taxDeductions.total)}</p>
              {pnl.revenue > 0 && (
                <p className="text-sm text-muted-foreground mt-1">
                  {Math.round((taxDeductions.total / pnl.revenue) * 100)}% of business revenue
                </p>
              )}
            </div>

            {taxDeductions.categories.length > 0 ? (
              <div className="space-y-2">
                {taxDeductions.categories.map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold">{formatCurrency(cat.value)}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{taxDeductions.total > 0 ? Math.round((cat.value / taxDeductions.total) * 100) : 0}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <EmptyState message="No business expenses recorded." />}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
    </div>
  );
};

export default BusinessReports;
