import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAccounts } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, TrendingUp, Briefcase, PiggyBank, Landmark, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const ACCOUNT_ICONS: Record<string, any> = {
  investment: TrendingUp,
  savings: PiggyBank,
  other: Briefcase,
};

const COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const Investments = () => {
  const { data: accounts, isLoading } = useAccounts();
  const { formatCurrency: formatAmount } = useCurrency();

  const investmentAccounts = useMemo(() => {
    if (!accounts) return [];
    return accounts.filter(a => a.account_type === 'investment' || a.account_type === 'savings');
  }, [accounts]);

  const totalBalance = investmentAccounts.reduce((s, a) => s + Number(a.balance), 0);

  const chartData = investmentAccounts.map(a => ({
    name: a.name,
    value: Math.abs(Number(a.balance)),
  }));

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Investments</h1>
        <p className="text-muted-foreground">Track your investment and retirement accounts.</p>
      </div>

      {/* Total Portfolio */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-3xl font-bold">{formatAmount(totalBalance)}</p>
              <p className="text-xs text-muted-foreground">{investmentAccounts.length} account{investmentAccounts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="font-display">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={2}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Account List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-display">Accounts</CardTitle>
            <CardDescription>Your investment and savings accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {investmentAccounts.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Briefcase className="mx-auto h-10 w-10 opacity-30 mb-3" />
                <p>No investment or savings accounts yet.</p>
                <p className="text-xs mt-1">Add one from the Accounts page.</p>
              </div>
            ) : (
              investmentAccounts.map(account => {
                const Icon = ACCOUNT_ICONS[account.account_type] || Landmark;
                return (
                  <div key={account.id} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{account.name}</p>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-[10px]">{account.account_type}</Badge>
                          {account.institution && <span className="text-xs text-muted-foreground">{account.institution}</span>}
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold">{formatAmount(Number(account.balance))}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );
};

export default Investments;
