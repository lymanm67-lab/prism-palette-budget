import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpendingByCategory, useTransactions, useBudgets, useCategories } from '@/hooks/use-finance-data';
import { formatCurrency } from '@/lib/seed-data';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend, ReferenceLine,
} from 'recharts';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

const Reports = () => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const { data: spendingData, isLoading } = useSpendingByCategory(monthStart, monthEnd);
  const { data: transactions } = useTransactions();
  const { data: budgets } = useBudgets(monthStart);
  const { data: categories } = useCategories();

  const monthlyCashflow = useMemo(() => {
    if (!transactions) return [];
    const map = new Map<string, { month: string; income: number; expenses: number }>();
    for (const t of transactions) {
      const m = t.date.substring(0, 7);
      const label = new Date(t.date).toLocaleDateString('en-US', { month: 'short' });
      const existing = map.get(m) || { month: label, income: 0, expenses: 0 };
      if (t.amount > 0) existing.income += t.amount;
      else existing.expenses += Math.abs(t.amount);
      map.set(m, existing);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [transactions]);

  // Budget vs Actual data
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
        remaining: Math.max(0, b.planned_amount - spent),
        over: Math.max(0, spent - b.planned_amount),
      };
    }).sort((a, b) => b.budget - a.budget);
  }, [budgets, transactions, categories, monthStart]);

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground">Colorful, filterable financial reports.</p>
      </div>

      <Tabs defaultValue="spending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="spending">Spending</TabsTrigger>
          <TabsTrigger value="budget">Budget vs Actual</TabsTrigger>
          <TabsTrigger value="cashflow">Cash Flow</TabsTrigger>
        </TabsList>

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
        </TabsContent>

        <TabsContent value="budget">
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Budget vs Actual — {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetVsActual.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={Math.max(300, budgetVsActual.length * 50 + 60)}>
                    <BarChart data={budgetVsActual} layout="vertical" margin={{ left: 20, right: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                      <YAxis type="category" dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                      <Tooltip
                        formatter={(v: number, name: string) => [formatCurrency(v), name === 'budget' ? 'Budget' : 'Actual']}
                        contentStyle={tooltipStyle}
                      />
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
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.min(pct, 100)}%`,
                                backgroundColor: isOver ? 'hsl(var(--prism-negative))' : item.color,
                              }}
                            />
                          </div>
                          <span className={`text-xs font-medium w-12 text-right ${isOver ? 'text-prism-rose' : 'text-muted-foreground'}`}>
                            {pct}%
                          </span>
                          <span className="text-xs text-muted-foreground w-32 text-right">
                            {formatCurrency(item.actual)} / {formatCurrency(item.budget)}
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

        <TabsContent value="cashflow">
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
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default Reports;
