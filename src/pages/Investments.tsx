import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAccounts } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, TrendingUp, Briefcase, PiggyBank, Landmark, BarChart3, BookOpen, MoreHorizontal } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Tooltip as UiTooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import PageOverview from '@/components/PageOverview';

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
  const [pageGuideOpen, setPageGuideOpen] = useState(false);

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
    <TooltipProvider delayDuration={300}>
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">Investments</h1>
          <p className="text-sm text-muted-foreground truncate">Track your investment and retirement accounts.</p>
        </div>
        <UiTooltip>
          <TooltipTrigger asChild>
            <span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 w-8 p-0 shrink-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setPageGuideOpen(true)} className="gap-2">
                  <BookOpen className="h-4 w-4" /> Page Guide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            </span>
          </TooltipTrigger>
          <TooltipContent><p>More options</p></TooltipContent>
        </UiTooltip>
      </div>

      {pageGuideOpen && (
        <PageOverview
          title="Investments Overview"
          description="Monitor your investment portfolio, track asset allocation, and review account performance."
          icon={TrendingUp}
          iconColor="text-prism-indigo"
          ttsScript="The Investments page gives you a view of your investment and retirement portfolio. See your total portfolio value at the top. Each investment and savings account is listed with its balance and type. The pie chart shows your asset allocation across different accounts. To add investment accounts, go to the Accounts page and create accounts with the investment or savings type. Update balances regularly for an accurate picture of your net worth."
          features={[
            'Total portfolio value at a glance',
            'Asset allocation pie chart',
            'Track investment and savings accounts',
            'Monitor individual account balances',
          ]}
          demoData={[
            { label: 'Vanguard 401k', value: '$45,000', badge: 'Investment', color: '#8b5cf6' },
            { label: 'Roth IRA', value: '$12,500', badge: 'Investment', color: '#3b82f6' },
            { label: 'Marcus Savings', value: '$8,200', badge: 'Savings', color: '#14b8a6' },
            { label: 'Brokerage', value: '$22,300', badge: 'Investment', color: '#f59e0b' },
          ]}
        />
      )}

      {/* Total Portfolio */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <BarChart3 className="h-5 w-5 sm:h-7 sm:w-7 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground">Total Portfolio Value</p>
              <p className="text-xl sm:text-3xl font-bold truncate">{formatAmount(totalBalance)}</p>
              <p className="text-[11px] sm:text-xs text-muted-foreground">{investmentAccounts.length} account{investmentAccounts.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Chart */}
        {chartData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base sm:text-lg">Asset Allocation</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={2}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatAmount(value)} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Account List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="font-display text-base sm:text-lg">Accounts</CardTitle>
            <CardDescription className="text-xs sm:text-sm">Your investment and savings accounts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
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
                  <div key={account.id} className="flex items-center justify-between gap-2 p-2.5 sm:p-3 rounded-xl border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{account.name}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="secondary" className="text-[10px]">{account.account_type}</Badge>
                          {account.institution && <span className="text-[11px] text-muted-foreground truncate">{account.institution}</span>}
                        </div>
                      </div>
                    </div>
                    <p className="font-semibold text-sm sm:text-base tabular-nums shrink-0">{formatAmount(Number(account.balance))}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </motion.div>
    </TooltipProvider>
  );
};

export default Investments;
