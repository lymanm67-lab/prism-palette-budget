import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts, useTransactions, useSpendingByCategory } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingUp, Wallet, CreditCard, ArrowUpRight, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';
import { useMemo } from 'react';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

const Dashboard = () => {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: transactions } = useTransactions();

  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-31`;
  const { data: spendingData } = useSpendingByCategory(monthStart, monthEnd);

  const totalAssets = (accounts || []).filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = Math.abs((accounts || []).filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
  const netWorth = totalAssets - totalLiabilities;

  const monthlyIncome = useMemo(() => {
    if (!transactions) return 0;
    const prefix = monthStart.substring(0, 7);
    return transactions.filter(t => t.date.startsWith(prefix) && t.amount > 0).reduce((s, t) => s + t.amount, 0);
  }, [transactions, monthStart]);

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

  if (accLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10"><TrendingUp className="h-6 w-6 text-primary" /></div>
            <div><p className="text-sm text-muted-foreground">Net Worth</p><p className="font-display text-xl font-bold">{formatCurrency(netWorth)}</p></div>
          </CardContent></Card>
        </motion.div>
        <motion.div variants={item}>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20"><Wallet className="h-6 w-6 text-accent" /></div>
            <div><p className="text-sm text-muted-foreground">Total Assets</p><p className="font-display text-xl font-bold">{formatCurrency(totalAssets)}</p></div>
          </CardContent></Card>
        </motion.div>
        <motion.div variants={item}>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-prism-rose/10"><CreditCard className="h-6 w-6 text-prism-rose" /></div>
            <div><p className="text-sm text-muted-foreground">Liabilities</p><p className="font-display text-xl font-bold">{formatCurrency(totalLiabilities)}</p></div>
          </CardContent></Card>
        </motion.div>
        <motion.div variants={item}>
          <Card><CardContent className="flex items-center gap-4 p-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-prism-teal/10"><ArrowUpRight className="h-6 w-6 text-prism-teal" /></div>
            <div><p className="text-sm text-muted-foreground">Income (this month)</p><p className="font-display text-xl font-bold">{formatCurrency(monthlyIncome)}</p></div>
          </CardContent></Card>
        </motion.div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {monthlyCashflow.length > 0 && (
          <motion.div variants={item}>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Cash Flow</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyCashflow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend />
                    <Bar dataKey="income" fill="hsl(160, 84%, 39%)" radius={[6, 6, 0, 0]} name="Income" />
                    <Bar dataKey="expenses" fill="hsl(340, 82%, 52%)" radius={[6, 6, 0, 0]} name="Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {spendingData && spendingData.length > 0 && (
          <motion.div variants={item}>
            <Card>
              <CardHeader><CardTitle className="font-display text-lg">Spending Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={spendingData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {spendingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {spendingData.map(cat => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="text-muted-foreground">{cat.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {accounts && accounts.length > 0 && (
        <motion.div variants={item}>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Accounts</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {accounts.map(acc => (
                  <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.institution || 'Manual'} · {acc.account_type}</p>
                    </div>
                    <span className={`font-display text-lg font-semibold ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(!accounts || accounts.length === 0) && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          Add accounts and transactions to see your dashboard come alive.
        </CardContent></Card>
      )}
    </motion.div>
  );
};

export default Dashboard;
