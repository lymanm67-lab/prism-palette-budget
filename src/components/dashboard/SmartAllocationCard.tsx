import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sparkles, ArrowRight, X, Settings2 } from 'lucide-react';
import { useTransactions } from '@/hooks/use-finance-data';
import { useDeploymentRules, zoneFor, zoneColor, zoneBarColor, zoneLabel, DEFAULT_RULES } from '@/hooks/use-deployment-rules';
import { useBuildPaycheckDeployment, usePaycheckDeployments } from '@/hooks/use-paycheck-deploy';
import { useCurrency } from '@/hooks/use-currency';
import { format, parseISO, differenceInDays } from 'date-fns';

const DISMISS_KEY = 'smart-allocation-dismissed-until';
const IU_MONTHLY_NET_PAY = 4362.78;
const EVERBANK_PAYSTUB_SPLIT = 300;

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

  // Detect last paycheck: find an anchor payroll-like deposit, then include
  // ALL positive non-transfer deposits within a 4-day window (splits often
  // route to different banks under different descriptors — EverBank, SoFi, etc.).
  const lastPaycheck = useMemo(() => {
    if (!transactions) return null;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 10);
    const PAYROLL_RE = /(payroll|paycheck|salary|wage|direct\s?dep|adp|gusto|paychex|indiana\s?univ|employer|ach\/)/i;
    const recentDeposits = transactions.filter((t: any) => {
      if (t.amount <= 0 || t.is_transfer) return false;
      if (new Date(t.date) < cutoff) return false;
      return true;
    });
    if (!recentDeposits.length) return null;
    // Find the most recent payroll anchor
    const anchor = [...recentDeposits]
      .sort((a, b) => b.date.localeCompare(a.date))
      .find((t: any) => {
        const m = (t.merchant || '') + ' ' + (t.categories?.name || '');
        return PAYROLL_RE.test(m) && t.amount >= 100;
      });
    if (!anchor) return null;
    const anchorDate = new Date(anchor.date);
    const windowStart = new Date(anchorDate); windowStart.setDate(windowStart.getDate() - 4);
    const windowEnd = new Date(anchorDate); windowEnd.setDate(windowEnd.getDate() + 4);
    // Include any deposit ≥$50 in the window (catches small split routes like EverBank $300)
    const cluster = recentDeposits.filter((t: any) => {
      const d = new Date(t.date);
      return d >= windowStart && d <= windowEnd && Number(t.amount) >= 50;
    });
    let amount = cluster.reduce((s, t: any) => s + Number(t.amount), 0);
    const anchorText = `${anchor.merchant || ''} ${anchor.categories?.name || ''}`;
    const missingEverBankSplit = Math.abs(IU_MONTHLY_NET_PAY - amount - EVERBANK_PAYSTUB_SPLIT) < 1;
    if (PAYROLL_RE.test(anchorText) && missingEverBankSplit) {
      amount = IU_MONTHLY_NET_PAY;
    }
    if (amount <= 500) return null;
    return { date: anchor.date, amount };
  }, [transactions]);



  // Has it already been deployed?
  const alreadyApplied = useMemo(() => {
    if (!lastPaycheck || !deployments) return false;
    return deployments.some(d => d.status === 'applied' && d.pay_date === lastPaycheck.date);
  }, [lastPaycheck, deployments]);

  if (dismissed || !rules || !lastPaycheck || alreadyApplied) return null;

  const net = Math.abs(lastPaycheck.amount);
  const num = (v: any, d: number) => {
    const n = typeof v === 'number' ? v : Number(v);
    return Number.isFinite(n) ? n : d;
  };
  // Known monthly actuals (from paystub + reconciled bills). Replace with calc once
  // category groups get conscious_bucket tagging (see plan).
  const ACTUAL_FIXED = 2709;        // personal bills + personal subscriptions
  const ACTUAL_INVEST_SELF = 451.66;   // TDA + 457(b) + Roth-TDA + Roth-457(b) + HSA payroll deductions
  const ACTUAL_INVEST_EMPLOYER = 516.56; // employer contribution from paystub
  const ACTUAL_INVEST = ACTUAL_INVEST_SELF + ACTUAL_INVEST_EMPLOYER; // 968.22
  const ACTUAL_SAVINGS_KIKOFF = 30;     // Kikoff credit builder monthly avg
  const ACTUAL_SAVINGS_CK = 20;         // Credit Karma credit builder monthly
  const ACTUAL_SAVINGS = ACTUAL_SAVINGS_KIKOFF + ACTUAL_SAVINGS_CK; // 50

  const buckets = [
    { key: 'fixed', label: 'Fixed Costs', min: num(rules.fixed_min, DEFAULT_RULES.fixed_min), max: num(rules.fixed_max, DEFAULT_RULES.fixed_max), target: num(rules.fixed_target, DEFAULT_RULES.fixed_target), actual: ACTUAL_FIXED },
    { key: 'invest', label: 'Investments', min: num(rules.invest_min, DEFAULT_RULES.invest_min), max: num(rules.invest_max, DEFAULT_RULES.invest_max), target: num(rules.invest_target, DEFAULT_RULES.invest_target), actual: ACTUAL_INVEST, actualNote: `$${ACTUAL_INVEST_SELF.toFixed(2)} you + $${ACTUAL_INVEST_EMPLOYER.toFixed(2)} employer` },
    { key: 'savings', label: 'Savings Goals', min: num(rules.savings_min, DEFAULT_RULES.savings_min), max: num(rules.savings_max, DEFAULT_RULES.savings_max), target: num(rules.savings_target, DEFAULT_RULES.savings_target), actual: ACTUAL_SAVINGS, actualNote: `$${ACTUAL_SAVINGS_KIKOFF} Kikoff + $${ACTUAL_SAVINGS_CK} Credit Karma` },
    { key: 'guiltfree', label: 'Guilt-Free', min: num(rules.guiltfree_min, DEFAULT_RULES.guiltfree_min), max: num(rules.guiltfree_max, DEFAULT_RULES.guiltfree_max), target: num(rules.guiltfree_target, DEFAULT_RULES.guiltfree_target) },
  ] as Array<{ key: string; label: string; min: number; max: number; target: number; actual?: number; actualNote?: string }>;

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
          const targetAmount = net * (b.target / 100);
          const actualPct = b.actual != null ? (b.actual / net) * 100 : null;
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
                  {b.actual != null && actualPct != null ? (
                    <>
                      <span className="font-semibold">{formatCurrency(b.actual)}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">{actualPct.toFixed(0)}% actual</span>
                      <span className="text-muted-foreground/70 ml-1.5 text-[10px]">· {b.target}% target</span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">{formatCurrency(targetAmount)}</span>
                      <span className="text-muted-foreground ml-1.5 text-xs">{b.target}% target</span>
                    </>
                  )}
                </div>
              </div>
              {b.actualNote && (
                <p className="text-[10px] text-muted-foreground -mt-0.5">{b.actualNote}</p>
              )}
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden relative">
                <div className={`h-full ${zoneBarColor(z)} opacity-40`} style={{ width: `${Math.min(100, b.target)}%` }} />
                {actualPct != null && (
                  <div className={`h-full ${zoneBarColor(z)} absolute top-0 left-0`} style={{ width: `${Math.min(100, actualPct)}%` }} />
                )}
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
