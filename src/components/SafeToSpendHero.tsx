import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSafeToSpend, type StsScope } from '@/hooks/use-safe-to-spend';
import { useTransactions } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { MODE_CONFIG } from '@/hooks/use-financial-mode';
import { Shield, Zap, Leaf, DollarSign, Calendar, CalendarDays, TrendingUp, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const modeIcons = {
  guardrail: Shield,
  balanced: Zap,
  greenlight: Leaf,
};

type ViewMode = 'combined' | 'personal' | 'business';

const viewLabels: Record<ViewMode, string> = {
  combined: 'Combined',
  personal: 'Personal',
  business: 'Business',
};

interface SafeToSpendHeroProps {
  viewMode?: ViewMode;
}

export function SafeToSpendHero({ viewMode = 'combined' }: SafeToSpendHeroProps) {
  const sts = useSafeToSpend(viewMode as StsScope);
  const { formatCurrency } = useCurrency();
  const { data: transactions } = useTransactions();

  // Day-to-day spending already made against the allowance (bills, savings,
  // transfers, groceries and medical are excluded — see spending rules).
  const spent = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const monthPrefix = todayStr.slice(0, 7);
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    const mondayStr = monday.toISOString().split('T')[0];

    let today = 0, week = 0, month = 0;
    for (const t of (transactions || []) as any[]) {
      if (t.amount >= 0 || t.is_transfer) continue;
      const group = t.categories?.category_groups;
      if (group?.expense_type !== 'flexible') continue;
      const isBiz = group?.budget_type === 'business';
      if (viewMode === 'personal' && isBiz) continue;
      if (viewMode === 'business' && !isBiz) continue;
      if (t.categories?.money_purpose === 'build_wealth') continue;
      const name = (t.categories?.name || '').toLowerCase();
      if (name.includes('grocer') || name.includes('medical') || name.includes('health')) continue;
      if (!t.date?.startsWith(monthPrefix)) continue;
      const amt = Math.abs(t.amount);
      month += amt;
      if (t.date >= mondayStr) week += amt;
      if (t.date === todayStr) today += amt;
    }
    return { today, week, month };
  }, [transactions, viewMode]);


  if (sts.isLoading) {
    return (
      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-6">
          <div className="h-32 bg-muted animate-pulse rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  const config = MODE_CONFIG[sts.mode];
  const ModeIcon = modeIcons[sts.mode];
  const label = `${viewLabels[viewMode]} Safe to Spend`;

  const displayIncome = sts.monthlyIncome;
  const displayExpenses = sts.monthlyObligations + sts.monthlySubscriptions;
  const stsPercent = displayIncome > 0 ? Math.round((sts.monthly / displayIncome) * 100) : 0;
  const isBusinessView = viewMode === 'business';
  const profit = displayIncome - displayExpenses;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <Card className="relative overflow-hidden border-border/50">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-prism-teal/8 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
        
        <CardContent className="relative p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-4">
            <Badge variant="outline" className={`gap-1.5 text-xs border-${config.color}/30 bg-${config.color}/10 text-${config.color}`}>
              <ModeIcon className="h-3 w-3" />
              {config.label} Mode
            </Badge>
            <span className="text-xs text-muted-foreground">{config.description}</span>
          </div>

          <div className="text-center mb-6">
            <p className="text-sm font-medium text-muted-foreground mb-1 uppercase tracking-wider">
              {label}
            </p>
            <div className="font-display text-5xl sm:text-6xl font-extrabold tracking-tight">
              <span className="prism-gradient-text">
                {formatCurrency(sts.monthly)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-2 max-w-md mx-auto">
              {isBusinessView 
                ? 'What your business can spend without affecting cash reserves'
                : 'This is what you can spend without disrupting your financial stability'}
            </p>
            <p className="text-[11px] text-muted-foreground/70 mt-1.5 max-w-md mx-auto">
              Planned surplus − savings − investing − {sts.bufferPercent}% buffer = safe to spend. This is the spending number to trust — Budgets shows the same figure when both pages use the {viewLabels[viewMode]} view.
            </p>
          </div>

          {/* Income-based context bar */}
          {displayIncome > 0 && (
            <div className="mb-6 mx-auto max-w-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {stsPercent}% of {isBusinessView ? 'revenue' : 'income'} is safe to spend
                </span>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground/60" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs text-xs">
                      <p>
                        {isBusinessView 
                          ? `Based on ${formatCurrency(displayIncome)} revenue minus ${formatCurrency(displayExpenses)} in expenses. Net profit: ${formatCurrency(profit)}.`
                          : `Based on ${formatCurrency(displayIncome)} income minus ${formatCurrency(displayExpenses)} in obligations & subscriptions, with a ${sts.bufferPercent}% safety buffer.`
                        }
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-prism-teal"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(stsPercent, 100)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground/60 mt-1">
                <span>{formatCurrency(0)}</span>
                <span>{formatCurrency(displayIncome)}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 sm:gap-6">
            <TimeframePill icon={<DollarSign className="h-4 w-4" />} label="Daily" amount={formatCurrency(sts.daily)} gradient="from-prism-teal to-prism-lime" spent={spent.today} limit={sts.daily} spentLabel="today" formatCurrency={formatCurrency} />
            <TimeframePill icon={<Calendar className="h-4 w-4" />} label="Weekly" amount={formatCurrency(sts.weekly)} gradient="from-prism-sky to-prism-teal" spent={spent.week} limit={sts.weekly} spentLabel="this week" formatCurrency={formatCurrency} />
            <TimeframePill icon={<CalendarDays className="h-4 w-4" />} label="Monthly" amount={formatCurrency(sts.monthly)} gradient="from-prism-violet to-prism-sky" spent={spent.month} limit={sts.monthly} spentLabel="this month" formatCurrency={formatCurrency} />
          </div>
          <p className="text-[10px] text-muted-foreground/70 mt-2 text-center">
            "Spent" counts only day-to-day spending — bills, savings, transfers, groceries and medical are left out.
          </p>


          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-border/30">
            <MiniStat label="Available Cash" value={formatCurrency(sts.totalAvailableCash)} />
            <MiniStat label={isBusinessView ? 'Revenue' : 'Monthly Income'} value={formatCurrency(displayIncome)} />
            <MiniStat label="Budget Expenses" value={formatCurrency(sts.effectiveExpenses)} />
            <MiniStat label={isBusinessView ? 'Net Profit' : 'Subscriptions'} value={isBusinessView ? formatCurrency(profit) : formatCurrency(sts.monthlySubscriptions)} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function TimeframePill({ icon, label, amount, gradient, spent, limit, spentLabel, formatCurrency }: {
  icon: React.ReactNode; label: string; amount: string; gradient: string;
  spent: number; limit: number; spentLabel: string; formatCurrency: (n: number) => string;
}) {
  const left = limit - spent;
  const over = left < 0;
  return (
    <div className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card/80 border border-border/30">
      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${gradient} flex items-center justify-center text-white`}>
        {icon}
      </div>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{label}</span>
      <span className="font-display text-lg sm:text-xl font-bold">{amount}</span>
      <div className="w-full mt-0.5 pt-1.5 border-t border-border/30 text-center">
        <p className="text-[10px] text-muted-foreground">
          Spent {spentLabel}: <span className="font-semibold text-foreground">{formatCurrency(spent)}</span>
        </p>
        <p className={`text-[10px] font-semibold ${over ? 'text-prism-rose' : 'text-prism-teal'}`}>
          {over ? `${formatCurrency(Math.abs(left))} over` : `${formatCurrency(left)} left`}
        </p>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display text-sm font-semibold mt-0.5">{value}</p>
    </div>
  );
}
