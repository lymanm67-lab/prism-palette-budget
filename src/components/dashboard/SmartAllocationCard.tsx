import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, X, Settings2 } from 'lucide-react';
import { useTransactions } from '@/hooks/use-finance-data';
import { useDeploymentRules, zoneFor, zoneColor, zoneBarColor, zoneLabel } from '@/hooks/use-deployment-rules';
import { useBuildPaycheckDeployment, usePaycheckDeployments } from '@/hooks/use-paycheck-deploy';
import { useCurrency } from '@/hooks/use-currency';
import { format, parseISO, differenceInDays } from 'date-fns';

const DISMISS_KEY = 'smart-allocation-dismissed-until';

export function SmartAllocationCard() {
  const { data: transactions } = useTransactions();
  const { data: rules } = useDeploymentRules();
  const { data: deployments } = usePaycheckDeployments(10);
  const build = useBuildPaycheckDeployment();
  const { formatCurrency } = useCurrency();
  const [dismissed, setDismissed] = useState(() => {
    const until = localStorage.getItem(DISMISS_KEY);
    return until ? Date.now() < Number(until) : false;
  });

  // Detect last paycheck: aggregate same-day positive deposits (split paychecks)
  // within the last 7 days. Splits commonly route to multiple accounts on one day.
  const lastPaycheck = useMemo(() => {
    if (!transactions) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const income = transactions.filter((t: any) => {
      if (t.amount <= 0 || t.is_transfer) return false;
      if (new Date(t.date) < cutoff) return false;
      const m = (t.merchant || '').toLowerCase();
      const cat = (t.categories?.name || '').toLowerCase();
      return /(payroll|paycheck|salary|wage|direct\s?dep|adp|gusto|paychex|deposit)/i.test(m + ' ' + cat) || t.amount > 150;
    });
    if (!income.length) return null;
    // Group by date, sum amounts
    const byDate = new Map<string, number>();
    for (const t of income) {
      byDate.set(t.date, (byDate.get(t.date) || 0) + Number(t.amount));
    }
    // Pick most recent date with a meaningful total (>$500)
    const sorted = [...byDate.entries()]
      .filter(([, amt]) => amt > 500)
      .sort((a, b) => b[0].localeCompare(a[0]));
    if (!sorted.length) return null;
    const [date, amount] = sorted[0];
    return { date, amount };
  }, [transactions]);

  // Has it already been deployed?
  const alreadyApplied = useMemo(() => {
    if (!lastPaycheck || !deployments) return false;
    return deployments.some(d => d.status === 'applied' && d.pay_date === lastPaycheck.date);
  }, [lastPaycheck, deployments]);

  if (dismissed || !rules || !lastPaycheck || alreadyApplied) return null;

  const net = Math.abs(lastPaycheck.amount);
  const buckets = [
    { key: 'fixed', label: 'Fixed Costs', min: rules.fixed_min, max: rules.fixed_max, target: rules.fixed_target },
    { key: 'invest', label: 'Investments', min: rules.invest_min, max: rules.invest_max, target: rules.invest_target },
    { key: 'savings', label: 'Savings Goals', min: rules.savings_min, max: rules.savings_max, target: rules.savings_target },
    { key: 'guiltfree', label: 'Guilt-Free', min: rules.guiltfree_min, max: rules.guiltfree_max, target: rules.guiltfree_target },
  ];

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 24 * 3600 * 1000));
    setDismissed(true);
  };

  const handleApply = () => {
    build.mutate({
      pay_date: lastPaycheck.date,
      net_amount: net,
      frequency: 'biweekly',
      persist: true,
    });
  };

  const daysAgo = differenceInDays(new Date(), parseISO(lastPaycheck.date));

  return (
    <Card className="border-prism-amber/30 bg-gradient-to-br from-prism-amber/5 to-prism-violet/5">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-prism-amber to-prism-orange flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">Smart Allocation</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(net)} paycheck from {format(parseISO(lastPaycheck.date), 'MMM d')}
                {daysAgo > 0 && ` · ${daysAgo}d ago`} — here's where it goes
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Edit rules">
              <Link to="/coach/deployment-rules"><Settings2 className="h-3.5 w-3.5" /></Link>
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss} title="Dismiss for 24h">
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {buckets.map(b => {
          const amount = net * (b.target / 100);
          const z = zoneFor(b.target, b.min, b.max);
          return (
            <div key={b.key} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{b.label}</span>
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5">{b.min}–{b.max}%</Badge>
                  <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${zoneColor(z)} border-current/30`}>
                    {zoneLabel(z)}
                  </Badge>
                </div>
                <div className="text-right tabular-nums">
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                  <span className="text-muted-foreground ml-1.5 text-xs">{b.target}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div className={`h-full ${zoneBarColor(z)}`} style={{ width: `${Math.min(100, b.target)}%` }} />
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-2 pt-2">
          <Button onClick={handleApply} disabled={build.isPending} className="flex-1">
            {build.isPending ? 'Deploying…' : <>Apply Plan <ArrowRight className="h-3.5 w-3.5 ml-1.5" /></>}
          </Button>
          <Button asChild variant="outline">
            <Link to="/coach/paycheck">Customize</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
