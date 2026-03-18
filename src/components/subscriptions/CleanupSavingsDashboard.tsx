import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, AlertTriangle, TrendingDown, Sparkles } from 'lucide-react';

const item = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

function getMonthlyAmount(sub: any): number {
  const amt = sub.average_amount || 0;
  if (sub.frequency === 'weekly') return amt * 4.33;
  if (sub.frequency === 'biweekly') return amt * 2.17;
  if (sub.frequency === 'quarterly') return amt / 3;
  if (sub.frequency === 'yearly') return amt / 12;
  return amt;
}

interface Props {
  subscriptions: any[];
  formatCurrency: (n: number) => string;
}

export function CleanupSavingsDashboard({ subscriptions, formatCurrency }: Props) {
  const stats = useMemo(() => {
    const active = subscriptions.filter(s => !s.is_cancelled);
    const totalMonthly = active.reduce((sum, s) => sum + getMonthlyAmount(s), 0);
    const unusedSubs = active.filter(s => s.usage_status === 'suspected_unused' || s.user_usage_override === 'no_longer_using');
    const unusedMonthly = unusedSubs.reduce((sum, s) => sum + getMonthlyAmount(s), 0);
    const canceledSubs = subscriptions.filter(s => s.cancellation_status === 'canceled');
    const savedMonthly = canceledSubs.reduce((sum, s) => sum + getMonthlyAmount(s), 0);

    return { totalMonthly, unusedMonthly, unusedSubs: unusedSubs.length, savedMonthly };
  }, [subscriptions]);

  if (stats.unusedSubs === 0 && stats.savedMonthly === 0) return null;

  return (
    <motion.div variants={item}>
      <Card className="border-prism-teal/30 bg-gradient-to-r from-prism-teal/5 to-transparent">
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-prism-teal" />
            <h3 className="font-display text-lg font-semibold">Subscription Cleanup</h3>
            <span className="text-xs text-muted-foreground ml-1">Find, review, and cancel unused subscriptions with ease</span>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border/30 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Monthly Spend</p>
              </div>
              <p className="font-display text-xl font-bold">{formatCurrency(stats.totalMonthly)}</p>
            </div>
            <div className="rounded-lg border border-prism-orange/30 p-3 bg-prism-orange/5">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-prism-orange" />
                <p className="text-[10px] uppercase tracking-wider text-prism-orange font-medium">Unused Spend</p>
              </div>
              <p className="font-display text-xl font-bold text-prism-orange">{formatCurrency(stats.unusedMonthly)}</p>
              <p className="text-[10px] text-muted-foreground">{stats.unusedSubs} subscription{stats.unusedSubs !== 1 ? 's' : ''}</p>
            </div>
            <div className="rounded-lg border border-prism-violet/30 p-3 bg-prism-violet/5">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingDown className="h-3.5 w-3.5 text-prism-violet" />
                <p className="text-[10px] uppercase tracking-wider text-prism-violet font-medium">Potential Savings</p>
              </div>
              <p className="font-display text-xl font-bold text-prism-violet">{formatCurrency(stats.unusedMonthly)}/mo</p>
              <p className="text-[10px] text-muted-foreground">{formatCurrency(stats.unusedMonthly * 12)}/yr</p>
            </div>
            {stats.savedMonthly > 0 && (
              <div className="rounded-lg border border-prism-teal/30 p-3 bg-prism-teal/5">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3.5 w-3.5 text-prism-teal" />
                  <p className="text-[10px] uppercase tracking-wider text-prism-teal font-medium">Already Saved</p>
                </div>
                <p className="font-display text-xl font-bold text-prism-teal">{formatCurrency(stats.savedMonthly)}/mo</p>
                <p className="text-[10px] text-muted-foreground">{formatCurrency(stats.savedMonthly * 12)}/yr</p>
              </div>
            )}
          </div>

          {stats.unusedMonthly > 0 && (
            <p className="text-sm text-muted-foreground mt-3 text-center">
              💡 You could save <span className="font-semibold text-prism-teal">{formatCurrency(stats.unusedMonthly)}/month</span> by canceling unused subscriptions.
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
