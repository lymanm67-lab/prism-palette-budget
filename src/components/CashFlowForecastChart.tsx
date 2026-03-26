import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccounts, useTransactions } from '@/hooks/use-finance-data';
import { useRecurringTransactions } from '@/hooks/use-recurring';
import { useCurrency } from '@/hooks/use-currency';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';

export function CashFlowForecastChart() {
  const { data: accounts } = useAccounts();
  const { data: transactions } = useTransactions();
  const { data: recurring } = useRecurringTransactions();
  const { formatCurrency } = useCurrency();

  const { forecastData, minBalance, shortfallDay } = useMemo(() => {
    const cashBalance = (accounts || [])
      .filter(a => a.is_active && (a.account_type === 'checking' || a.account_type === 'savings'))
      .reduce((s, a) => s + a.balance, 0);

    // Calculate average daily income/expense from recent transactions
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentTxns = (transactions || []).filter(t => new Date(t.date) >= thirtyDaysAgo);
    const dailyIncome = recentTxns.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0) / 30;
    const dailyExpense = recentTxns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(t.amount), 0) / 30;

    // Build upcoming recurring bills
    const upcomingBills: { day: number; amount: number }[] = [];
    for (const rec of (recurring || []).filter((r: any) => r.is_active && r.amount < 0)) {
      const dueDate = new Date((rec as any).next_due_date);
      if (dueDate >= now) {
        const dayOffset = Math.round((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (dayOffset <= 30) {
          upcomingBills.push({ day: dayOffset, amount: Math.abs((rec as any).amount) });
        }
      }
    }

    // Project 30 days
    let balance = cashBalance;
    let min = cashBalance;
    let shortfall: number | null = null;
    const data = [];

    for (let i = 0; i <= 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() + i);
      const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      if (i > 0) {
        balance += dailyIncome;
        balance -= dailyExpense;
        
        // Deduct upcoming bills on their day
        for (const bill of upcomingBills) {
          if (bill.day === i) balance -= bill.amount;
        }
      }

      if (balance < min) min = balance;
      if (balance < 0 && shortfall === null) shortfall = i;

      data.push({
        day: label,
        balance: Math.round(balance),
        projected: i > 0 ? Math.round(balance) : undefined,
        actual: i === 0 ? Math.round(balance) : undefined,
      });
    }

    return { forecastData: data, minBalance: min, shortfallDay: shortfall };
  }, [accounts, transactions, recurring]);

  if (!forecastData.length || !accounts?.length) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-sky to-prism-teal flex items-center justify-center">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            30-Day Cash Forecast
          </CardTitle>
          {shortfallDay !== null && (
            <Badge variant="destructive" className="gap-1 text-xs">
              <AlertTriangle className="h-3 w-3" />
              Shortfall in {shortfallDay}d
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={forecastData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
              <defs>
                <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--prism-teal))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--prism-teal))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={10} interval={4} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={10} tickFormatter={v => `$${(v / 1000).toFixed(0)}K`} />
              <Tooltip
                formatter={(v: number) => formatCurrency(v)}
                contentStyle={{
                  background: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px',
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="hsl(var(--prism-teal))"
                strokeWidth={2}
                fill="url(#forecastGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
            <span>Today</span>
            <span>Projected min: <span className={`font-semibold ${minBalance < 0 ? 'text-prism-rose' : 'text-prism-teal'}`}>{formatCurrency(minBalance)}</span></span>
            <span>+30 days</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
