import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MOCK_ACCOUNTS, MONTHLY_CASHFLOW, NET_WORTH_HISTORY, SPENDING_BY_CATEGORY, formatCurrency } from '@/lib/seed-data';
import { TrendingUp, TrendingDown, Wallet, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend } from 'recharts';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const totalAssets = MOCK_ACCOUNTS.filter(a => a.balance > 0).reduce((s, a) => s + a.balance, 0);
const totalLiabilities = Math.abs(MOCK_ACCOUNTS.filter(a => a.balance < 0).reduce((s, a) => s + a.balance, 0));
const netWorth = totalAssets - totalLiabilities;
const latestCashflow = MONTHLY_CASHFLOW[MONTHLY_CASHFLOW.length - 1];

const CHART_COLORS = ['#7c5cf5', '#2eb88a', '#e5a525', '#e5547a', '#3b9fe5', '#5cb850', '#f58c25', '#5c6cf5'];

const Dashboard = () => {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Your financial overview at a glance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div variants={item}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Net Worth</p>
                <p className="font-display text-xl font-bold">{formatCurrency(netWorth)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                <Wallet className="h-6 w-6 text-accent" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Assets</p>
                <p className="font-display text-xl font-bold">{formatCurrency(totalAssets)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-prism-rose/10">
                <CreditCard className="h-6 w-6 text-prism-rose" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Liabilities</p>
                <p className="font-display text-xl font-bold">{formatCurrency(totalLiabilities)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={item}>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-prism-teal/10">
                <ArrowUpRight className="h-6 w-6 text-prism-teal" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Income (Mar)</p>
                <p className="font-display text-xl font-bold">{formatCurrency(latestCashflow.income)}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Net Worth Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={NET_WORTH_HISTORY}>
                  <defs>
                    <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c5cf5" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7c5cf5" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Area type="monotone" dataKey="net" stroke="#7c5cf5" strokeWidth={2.5} fill="url(#netGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Cash Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={MONTHLY_CASHFLOW}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                  <Legend />
                  <Bar dataKey="income" fill="#2eb88a" radius={[4, 4, 0, 0]} name="Income" />
                  <Bar dataKey="expenses" fill="#e5547a" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Spending + Accounts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <motion.div variants={item} className="lg:col-span-1">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-display text-lg">Spending Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={SPENDING_BY_CATEGORY} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                    {SPENDING_BY_CATEGORY.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1.5">
                {SPENDING_BY_CATEGORY.map((cat) => (
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

        <motion.div variants={item} className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="font-display text-lg">Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_ACCOUNTS.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/50">
                    <div>
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.institution} · {acc.type}</p>
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
      </div>
    </motion.div>
  );
};

export default Dashboard;
