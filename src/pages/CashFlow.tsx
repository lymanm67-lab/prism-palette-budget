import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAccounts, useAllTransactions } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, isWithinInterval } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const d = subMonths(new Date(), i);
  return { value: format(d, 'yyyy-MM'), label: format(d, 'MMMM yyyy') };
});

const CashFlow = () => {
  const { data: transactions, isLoading } = useAllTransactions();
  const { data: accounts } = useAccounts();
  const { formatCurrency: formatAmount } = useCurrency();
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [scope, setScope] = useState<'all' | 'personal' | 'business'>('all');

  const monthStart = startOfMonth(parseISO(selectedMonth + '-01'));
  const monthEnd = endOfMonth(monthStart);

  const filtered = useMemo(() => {
    if (!transactions) return [];
    return transactions.filter(t => {
      const d = parseISO(t.date);
      return isWithinInterval(d, { start: monthStart, end: monthEnd }) && !t.is_transfer;
    });
  }, [transactions, monthStart, monthEnd]);

  const income = filtered.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
  const expenses = filtered.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
  const net = income - expenses;

  // Daily chart data
  const dailyData = useMemo(() => {
    const days: Record<string, { income: number; expenses: number }> = {};
    filtered.forEach(t => {
      const day = format(parseISO(t.date), 'MMM d');
      if (!days[day]) days[day] = { income: 0, expenses: 0 };
      if (t.amount > 0) days[day].income += Number(t.amount);
      else days[day].expenses += Math.abs(Number(t.amount));
    });
    return Object.entries(days).map(([day, vals]) => ({ day, ...vals, net: vals.income - vals.expenses }));
  }, [filtered]);

  // 6-month trend
  const trendData = useMemo(() => {
    if (!transactions) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const m = subMonths(new Date(), 5 - i);
      const ms = startOfMonth(m);
      const me = endOfMonth(m);
      const txns = transactions.filter(t => {
        const d = parseISO(t.date);
        return isWithinInterval(d, { start: ms, end: me }) && !t.is_transfer;
      });
      const inc = txns.filter(t => t.amount > 0).reduce((s, t) => s + Number(t.amount), 0);
      const exp = txns.filter(t => t.amount < 0).reduce((s, t) => s + Math.abs(Number(t.amount)), 0);
      return { month: format(m, 'MMM'), income: inc, expenses: exp, net: inc - exp };
    });
  }, [transactions]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Cash Flow</h1>
          <p className="text-muted-foreground">Track money in and out across all accounts.</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={scope} onValueChange={(v: any) => setScope(v)}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="personal">Personal</SelectItem>
              <SelectItem value="business">Business</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Income</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatAmount(income)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expenses</p>
                <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatAmount(expenses)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-rose-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Cash Flow</p>
                <p className={`text-2xl font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {net >= 0 ? '+' : ''}{formatAmount(net)}
                </p>
              </div>
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                {net > 0 ? <TrendingUp className="h-5 w-5 text-emerald-500" /> : net < 0 ? <TrendingDown className="h-5 w-5 text-rose-500" /> : <Minus className="h-5 w-5 text-muted-foreground" />}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">This Month</TabsTrigger>
          <TabsTrigger value="trend">6-Month Trend</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly">
          <Card>
            <CardHeader><CardTitle className="font-display">Daily Cash Flow</CardTitle></CardHeader>
            <CardContent>
              {dailyData.length === 0 ? (
                <p className="text-center text-muted-foreground py-10">No transactions this month.</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="income" fill="hsl(var(--chart-2))" name="Income" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" fill="hsl(var(--chart-1))" name="Expenses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trend">
          <Card>
            <CardHeader><CardTitle className="font-display">6-Month Trend</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="income" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.2} name="Income" />
                  <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.2} name="Expenses" />
                  <Area type="monotone" dataKey="net" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" fillOpacity={0.1} name="Net" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default CashFlow;
