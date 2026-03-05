import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSpendingByCategory, useTransactions } from '@/hooks/use-finance-data';
import { formatCurrency } from '@/lib/seed-data';
import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' };

const Reports = () => {
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const { data: spendingData, isLoading } = useSpendingByCategory(monthStart, monthEnd);
  const { data: transactions } = useTransactions();

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
                    <Bar dataKey="income" fill="#2eb88a" radius={[6, 6, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="#e5547a" radius={[6, 6, 0, 0]} name="Expenses" />
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
