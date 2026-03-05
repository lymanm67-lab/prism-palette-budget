import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAccounts, useTransactions, useSpendingByCategory } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import {
  TrendingUp, Wallet, CreditCard, ArrowUpRight, Loader2,
  Sparkles, ChevronRight, Building2, PiggyBank
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

const tooltipStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 8px 32px -8px rgba(0,0,0,0.15)' };

const STAT_CARDS = [
  { key: 'netWorth', label: 'Net Worth', icon: TrendingUp, gradient: 'from-prism-violet to-prism-indigo', glow: 'prism-glow' },
  { key: 'totalAssets', label: 'Total Assets', icon: Wallet, gradient: 'from-prism-teal to-prism-lime', glow: 'prism-glow-teal' },
  { key: 'totalLiabilities', label: 'Liabilities', icon: CreditCard, gradient: 'from-prism-rose to-prism-orange', glow: 'prism-glow-warm' },
  { key: 'monthlyIncome', label: 'Income (this month)', icon: ArrowUpRight, gradient: 'from-prism-sky to-prism-teal', glow: 'prism-glow-teal' },
];

const Dashboard = () => {
  const { formatCurrency, formatCompact } = useCurrency();
  const { data: accounts, isLoading: accLoading } = useAccounts();
  const { data: transactions } = useTransactions();
  const navigate = useNavigate();

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

  const statValues: Record<string, number> = { netWorth, totalAssets, totalLiabilities, monthlyIncome };

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

  if (accLoading) return (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-2xl prism-gradient prism-glow flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading your finances…</p>
      </div>
    </div>
  );

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Header with gradient accent */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Dashboard</span>
          </h1>
          <p className="text-muted-foreground mt-1">Your financial overview at a glance.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <button
            onClick={() => navigate('/reports')}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition-all hover:bg-primary/20 hover:gap-2.5"
          >
            View Reports <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((stat) => (
          <motion.div key={stat.key} variants={item}>
            <Card className={`prism-card-shine border-border/50 hover-lift hover-glow-violet hover-icon-bounce`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`stat-card-icon icon-target bg-gradient-to-br ${stat.gradient}`}>
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</p>
                  <p className="font-display text-xl font-bold mt-0.5">{formatCurrency(statValues[stat.key])}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {monthlyCashflow.length > 0 && (
          <motion.div variants={item}>
            <Card className="prism-card-shine border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-teal to-prism-sky flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 text-white" />
                  </div>
                  Cash Flow
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={monthlyCashflow}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={v => formatCompact(v)} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
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
            <Card className="prism-card-shine border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="font-display text-lg flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-violet to-prism-rose flex items-center justify-center">
                    <PiggyBank className="h-3.5 w-3.5 text-white" />
                  </div>
                  Spending Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={spendingData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                      {spendingData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-3 space-y-2">
                  {spendingData.slice(0, 6).map(cat => (
                    <div key={cat.name} className="flex items-center justify-between text-sm group">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-block h-3 w-3 rounded-full ring-2 ring-background" style={{ backgroundColor: cat.color }} />
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{cat.name}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(cat.value)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>

      {/* Accounts */}
      {accounts && accounts.length > 0 && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-sky to-prism-indigo flex items-center justify-center">
                  <Building2 className="h-3.5 w-3.5 text-white" />
                </div>
                Accounts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {accounts.map((acc) => (
                  <div key={acc.id} className="flex items-center justify-between rounded-xl border border-border/30 p-3.5 interactive-row hover-border-glow cursor-pointer"
                    onClick={() => navigate('/accounts')}>
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                        acc.balance >= 0
                          ? 'bg-prism-teal/10 text-prism-teal'
                          : 'bg-prism-rose/10 text-prism-rose'
                      }`}>
                        {acc.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{acc.institution || 'Manual'} · {acc.account_type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-display text-lg font-semibold ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                        {formatCurrency(acc.balance)}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {(!accounts || accounts.length === 0) && (
        <motion.div variants={item}>
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-2xl prism-gradient prism-glow flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">Welcome to PrismBudget!</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Add accounts and transactions to see your dashboard come alive with vibrant insights.
              </p>
              <button
                onClick={() => navigate('/accounts')}
                className="mt-4 flex items-center gap-2 rounded-xl prism-gradient px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Wallet className="h-4 w-4" /> Add Your First Account
              </button>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dashboard;
