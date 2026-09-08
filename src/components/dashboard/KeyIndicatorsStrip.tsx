import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Target, PieChart, CreditCard, CalendarClock, Scissors, Flag, TrendingUp, Gauge, ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useCurrency } from '@/hooks/use-currency';
import { useSafeToSpend, type StsScope } from '@/hooks/use-safe-to-spend';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { useDebtPlans } from '@/hooks/use-debt-plans';
import { useGoals } from '@/hooks/use-goals';
import { useFreedCashSources, summarizeFreedCash } from '@/hooks/use-freed-cash';
import { useCreditAccounts } from '@/hooks/use-credit-accounts';

interface Indicator {
  key: string;
  label: string;
  value: string;
  status: string;
  icon: typeof Target;
  tone: 'teal' | 'rose' | 'amber' | 'sky' | 'violet';
  progress?: number;
  to: string;
}

const toneClasses: Record<Indicator['tone'], { text: string; bg: string; bar: string }> = {
  teal: { text: 'text-prism-teal', bg: 'bg-prism-teal/10', bar: 'bg-prism-teal' },
  rose: { text: 'text-prism-rose', bg: 'bg-prism-rose/10', bar: 'bg-prism-rose' },
  amber: { text: 'text-prism-amber', bg: 'bg-prism-amber/10', bar: 'bg-prism-amber' },
  sky: { text: 'text-prism-sky', bg: 'bg-prism-sky/10', bar: 'bg-prism-sky' },
  violet: { text: 'text-prism-violet', bg: 'bg-prism-violet/10', bar: 'bg-prism-violet' },
};

interface PlanInput { id: string; name?: string; strategy?: string | null; extra_payment?: number | null }
interface DebtInput {
  plan_id?: string | null; name?: string; balance: number; minimum_payment: number; interest_rate: number;
  extra_payment?: number | null; sort_order?: number | null;
  forgiveness_eligible?: boolean; forgiveness_date?: string | null;
}

/**
 * Month-by-month payoff projection driven by the payoff plans.
 *
 * Rules:
 *  - Every debt pays its minimum plus its own extra payment each month.
 *  - Each plan's extra payment is thrown at that plan's current target debt,
 *    ordered by the plan's own sort order, then its strategy (avalanche =
 *    highest rate first, snowball = smallest balance first).
 *  - A plan whose name says "starts <Month Year>" holds its extra until then.
 *  - When a debt clears, its whole payment is redirected to the next target:
 *    its own plan first, then vacation loans, then the SBA loan, then the rest.
 *  - Forgiveness-track debts are never accelerated; they drop off on their
 *    forgiveness date and free up their payment then.
 */
function monthsToDebtFree(debts: DebtInput[], plans: PlanInput[]) {
  const now = new Date();
  const monthsFrom = (d: Date) => (d.getFullYear() - now.getFullYear()) * 12 + (d.getMonth() - now.getMonth());

  const planMap = new Map<string, { extra: number; startMonth: number; strategy: string }>();
  for (const p of plans || []) {
    const m = /starts\s+([A-Za-z]+)\s+(\d{4})/i.exec(p.name || '');
    const start = m ? monthsFrom(new Date(`${m[1]} 1, ${m[2]}`)) : 0;
    planMap.set(p.id, {
      extra: Number(p.extra_payment) || 0,
      startMonth: Number.isFinite(start) ? Math.max(start, 0) : 0,
      strategy: (p.strategy || 'snowball').toLowerCase(),
    });
  }

  const fallbackPriority = (name: string) => {
    const n = (name || '').toLowerCase();
    if (n.includes('vacation')) return 1;
    if (n.includes('sba')) return 2;
    return 0;
  };

  const items = debts
    .filter(d => Number(d.balance) > 0)
    .map(d => {
      const fd = d.forgiveness_date ? new Date(d.forgiveness_date) : null;
      return {
        planId: d.plan_id || '',
        balance: Number(d.balance),
        min: Math.max(Number(d.minimum_payment) || 0, 0),
        rate: (Number(d.interest_rate) || 0) / 100 / 12,
        extra: Number(d.extra_payment) || 0,
        sort: Number(d.sort_order) || 0,
        forgiveness: !!d.forgiveness_eligible,
        forgivenessMonth: fd ? monthsFrom(fd) : null,
        priority: fallbackPriority(d.name || ''),
        aprPct: Number(d.interest_rate) || 0,
      };
    });
  if (!items.length) return 0;

  // Order inside each plan by sort order, then by the plan's strategy.
  const planOrder = (planId: string) => {
    const strategy = planMap.get(planId)?.strategy || 'snowball';
    return items
      .filter(d => d.planId === planId && !d.forgiveness)
      .sort((a, b) =>
        a.sort - b.sort ||
        (strategy === 'avalanche' ? b.aprPct - a.aprPct : a.balance - b.balance));
  };
  // Global redirect chain for cash freed after a plan is finished.
  const chain = () => items.filter(d => !d.forgiveness).sort((a, b) => a.priority - b.priority || a.balance - b.balance);

  let redirected = 0;
  let months = 0;

  while (months < 600) {
    if (items.every(d => d.balance <= 0.5)) break;
    months += 1;

    // Forgiveness — the payment stops and joins the redirect pool.
    for (const d of items) {
      if (d.balance > 0.5 && d.forgiveness && d.forgivenessMonth != null && months >= d.forgivenessMonth) {
        d.balance = 0;
        redirected += d.min + d.extra;
      }
    }

    // Interest, then each debt's own payment.
    for (const d of items) {
      if (d.balance <= 0.5) continue;
      d.balance += d.balance * d.rate;
      d.balance -= d.min + d.extra;
      if (d.balance <= 0.5) {
        d.balance = 0;
        redirected += d.min + d.extra;
      }
    }

    // Plan extra payments, then everything freed so far.
    const pools: { amount: number; targets: typeof items }[] = [];
    for (const [planId, p] of planMap) {
      if (p.extra > 0 && months >= p.startMonth) pools.push({ amount: p.extra, targets: planOrder(planId) });
    }
    if (redirected > 0) pools.push({ amount: redirected, targets: chain() });

    for (const pool of pools) {
      let left = pool.amount;
      const targets = pool.targets.length ? pool.targets : chain();
      for (const d of targets) {
        if (left <= 0) break;
        if (d.balance <= 0.5) continue;
        const applied = Math.min(left, d.balance);
        d.balance -= applied;
        left -= applied;
        if (d.balance <= 0.5) {
          d.balance = 0;
          redirected += d.min + d.extra;
        }
      }
      // Unused plan extra spills into the global chain.
      if (left > 0 && pool.targets.length) {
        for (const d of chain()) {
          if (left <= 0) break;
          if (d.balance <= 0.5) continue;
          const applied = Math.min(left, d.balance);
          d.balance -= applied;
          left -= applied;
          if (d.balance <= 0.5) {
            d.balance = 0;
            redirected += d.min + d.extra;
          }
        }
      }
    }
  }
  return months >= 600 ? null : months;
}



export function KeyIndicatorsStrip({ scope, monthlyExpenses, budgetedSpend, netWorth }: { scope: StsScope; monthlyExpenses: number; budgetedSpend?: number; netWorth: number }) {
  const navigate = useNavigate();
  const { formatCurrency, formatCompact } = useCurrency();
  const sts = useSafeToSpend(scope);
  const { data: debts } = useHouseholdDebts();
  const { data: plans } = useDebtPlans();
  const { data: goals } = useGoals();
  const { data: freedSources } = useFreedCashSources();
  const { accounts: creditAccounts } = useCreditAccounts() as any;

  const indicators = useMemo<Indicator[]>(() => {
    // ── Budget ──
    const plannedSurplus = sts.budgetIncome - sts.budgetExpenses;
    // Compare like with like: only spending the expense plan covers (budgetedSpend)
    // counts against the plan, so this tile agrees with the Budgets page.
    const planSpend = budgetedSpend ?? monthlyExpenses;
    const budgetUsedPct = sts.budgetExpenses > 0 ? Math.min((planSpend / sts.budgetExpenses) * 100, 999) : 0;

    // ── Debt ──
    const debtList = (debts || []) as any[];
    const totalDebt = debtList.reduce((s, d) => s + Number(d.balance || 0), 0);
    const minPayments = debtList.reduce((s, d) => s + Number(d.minimum_payment || 0), 0);
    const totalExtra = ((plans || []) as any[]).reduce((s, p) => s + Number(p.extra_payment || 0), 0)
      + debtList.reduce((s, d) => s + Number(d.extra_payment || 0), 0);
    const months = monthsToDebtFree(debtList as any, (plans || []) as any[]);
    const payoffLabel = months == null
      ? 'Add payments to project'
      : months === 0 ? 'Debt free' : `${Math.floor(months / 12)}y ${months % 12}m with ${formatCurrency(totalExtra)}/mo extra, redirected as each clears`;
    const payoffDate = months && months > 0
      ? new Date(new Date().setMonth(new Date().getMonth() + months)).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '—';

    // ── Freed cash ──
    const freed = summarizeFreedCash((freedSources || []).filter((s: any) => scope === 'combined' || s.entity_scope === scope || s.entity_scope === 'all'));

    // ── Goals ──
    const goalList = ((goals || []) as any[]).filter(g => !g.is_completed);
    const goalTarget = goalList.reduce((s, g) => s + Number(g.target_amount || 0), 0);
    const goalSaved = goalList.reduce((s, g) => s + Number(g.current_amount || 0), 0);
    const goalPct = goalTarget > 0 ? (goalSaved / goalTarget) * 100 : 0;
    const onTrack = goalList.filter(g => Number(g.target_amount || 0) > 0 && Number(g.current_amount || 0) / Number(g.target_amount) >= 0.5).length;

    // ── Credit utilization (revolving only) ──
    const revolving = ((creditAccounts || []) as any[]).filter(a => {
      const t = (a.account_type || '').toLowerCase();
      return (t.includes('revolv') || t.includes('credit')) && Number(a.credit_limit || 0) > 0;
    });
    const revBal = revolving.reduce((s, a) => s + Number(a.balance || 0), 0);
    const revLimit = revolving.reduce((s, a) => s + Number(a.credit_limit || 0), 0);
    const util = revLimit > 0 ? (revBal / revLimit) * 100 : null;

    return [
      {
        key: 'budget',
        label: 'Planned surplus',
        value: formatCurrency(plannedSurplus),
        status: 'Budgeted income minus budgeted expenses',
        icon: Target,
        tone: plannedSurplus >= 0 ? 'teal' : 'rose',
        to: '/budgets',
      },
      {
        key: 'budget-used',
        label: 'Budget used',
        value: sts.budgetExpenses > 0 ? `${Math.round(budgetUsedPct)}%` : 'Not set',
        status: sts.budgetExpenses > 0 ? `${formatCurrency(planSpend)} of ${formatCurrency(sts.budgetExpenses)}` : 'Set budgets to track this',
        icon: PieChart,
        tone: budgetUsedPct > 100 ? 'rose' : budgetUsedPct > 85 ? 'amber' : 'teal',
        progress: Math.min(budgetUsedPct, 100),
        to: budgetUsedPct > 100 ? '/budgets?over=1' : '/budgets',
      },
      {
        key: 'debt',
        label: 'Total debt',
        value: formatCompact(totalDebt),
        status: minPayments > 0 ? `${formatCurrency(minPayments)}/mo minimums` : `${debtList.length} debts tracked`,
        icon: CreditCard,
        tone: totalDebt > 0 ? 'rose' : 'teal',
        to: '/debt-payoff',
      },
      {
        key: 'payoff',
        label: 'Debt-free date',
        value: payoffDate,
        status: payoffLabel,
        icon: CalendarClock,
        tone: 'amber',
        to: '/debt-payoff',
      },
      {
        key: 'freed',
        label: 'Freed cash',
        value: `${formatCurrency(freed.monthlyVerified)}/mo`,
        status: freed.monthlyPipeline > 0 ? `${formatCurrency(freed.monthlyPipeline)}/mo still unverified` : `${freed.verifiedCount} verified wins`,
        icon: Scissors,
        tone: 'violet',
        to: '/planning/freed-cash',
      },
      {
        key: 'goals',
        label: 'Goals funded',
        value: goalTarget > 0 ? `${Math.round(goalPct)}%` : 'No goals',
        status: goalList.length ? `${onTrack} of ${goalList.length} at least halfway` : 'Add a goal to start',
        icon: Flag,
        tone: 'sky',
        progress: Math.min(goalPct, 100),
        to: '/goals',
      },
      {
        key: 'networth',
        label: 'Net worth',
        value: formatCurrency(netWorth).replace(/\.\d{2}$/, ''),
        status: 'Assets minus what you owe',
        icon: TrendingUp,
        tone: netWorth >= 0 ? 'teal' : 'rose',
        to: '/reports',
      },
      {
        key: 'credit',
        label: 'Card utilization',
        value: util == null ? 'No data' : `${Math.round(util)}%`,
        status: util == null ? 'Import a credit report' : `${formatCurrency(revBal)} of ${formatCurrency(revLimit)} limits`,
        icon: Gauge,
        tone: util == null ? 'sky' : util > 30 ? 'rose' : util > 10 ? 'amber' : 'teal',
        progress: util == null ? undefined : Math.min(util, 100),
        to: '/capital/credit-health',
      },
    ] as Indicator[];
  }, [sts, monthlyExpenses, budgetedSpend, netWorth, debts, plans, goals, freedSources, creditAccounts, scope, formatCurrency, formatCompact]);

  if (sts.isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-[92px] rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-base font-semibold">Key indicators</h2>
        <p className="text-xs text-muted-foreground">Plan targets and balances — Safe to Spend above is your spending number</p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicators.map((ind, i) => {
          const tone = toneClasses[ind.tone];
          const Icon = ind.icon;
          return (
            <motion.button
              key={ind.key}
              type="button"
              onClick={() => navigate(ind.to)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.03 }}
              className="text-left"
            >
              <Card className="prism-card-shine h-full border-border/50 transition-colors hover:border-primary/40">
                <CardContent className="p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className={`h-7 w-7 rounded-lg flex items-center justify-center ${tone.bg}`}>
                      <Icon className={`h-3.5 w-3.5 ${tone.text}`} />
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{ind.label}</p>
                  <p className={`font-display text-lg font-bold ${tone.text}`}>{ind.value}</p>
                  {typeof ind.progress === 'number' && (
                    <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                      <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${ind.progress}%` }} />
                    </div>
                  )}
                  <p className="mt-1 text-[11px] leading-tight text-muted-foreground line-clamp-2">{ind.status}</p>
                </CardContent>
              </Card>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export default KeyIndicatorsStrip;
