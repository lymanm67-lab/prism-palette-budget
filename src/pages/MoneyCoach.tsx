import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { format, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { useSpendingAnomalies } from '@/hooks/use-spending-anomalies';
import { useSubscriptions } from '@/hooks/use-subscriptions';
import { useTransactions } from '@/hooks/use-finance-data';
import { useAccounts } from '@/hooks/use-finance-data';
import { useRecoveryPlans, useBuildRecoveryPlan, useUpdateRecoveryPlan } from '@/hooks/use-recovery-plans';
import { CoachCard, type Confidence } from '@/components/coach/CoachCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StsEquationView } from '@/components/StsEquationView';
import PageOverview from '@/components/PageOverview';
import {
  Activity, Brain, Sparkles, Shield, ShoppingBag, Droplets,
  Wallet, ArrowRight, AlertTriangle, CheckCircle2, Clock, Info,
  Zap, Scale, Settings2, TrendingUp, Loader2, X,
} from 'lucide-react';

const PLAN_META: Record<string, { label: string; icon: any; color: string }> = {
  fast: { label: 'Fast', icon: Zap, color: 'text-prism-orange' },
  balanced: { label: 'Balanced', icon: Scale, color: 'text-prism-teal' },
  system: { label: 'System', icon: Settings2, color: 'text-prism-sky' },
  wealth: { label: 'Wealth', icon: TrendingUp, color: 'text-prism-lime' },
};

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

export default function MoneyCoach() {
  const { household } = useHousehold();
  const sts = useSafeToSpend('personal');
  const anomalies = useSpendingAnomalies(0.5);
  const { data: subs } = useSubscriptions();
  const { data: txns } = useTransactions();
  const { data: accounts } = useAccounts();
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: recoveryPlans } = useRecoveryPlans(currentMonth);
  const buildPlan = useBuildRecoveryPlan();
  const updatePlan = useUpdateRecoveryPlan();

  // Over-budget categories this month
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: overBudget } = useQuery({
    queryKey: ['coach-over-budget', household?.id, currentMonth],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, planned_amount, categories(id, name)')
        .eq('household_id', household!.id)
        .eq('month', currentMonth);
      if (error) throw error;
      const monthPrefix = currentMonth.slice(0, 7);
      const txnsByCat = new Map<string, number>();
      for (const t of (txns || [])) {
        if (t.amount >= 0 || t.is_transfer || !t.date.startsWith(monthPrefix) || !t.category_id) continue;
        txnsByCat.set(t.category_id, (txnsByCat.get(t.category_id) || 0) + Math.abs(t.amount));
      }
      return (data || [])
        .map((b: any) => {
          const catId = b.categories?.id;
          const spent = catId ? (txnsByCat.get(catId) || 0) : 0;
          const overBy = spent - b.planned_amount;
          return { id: b.id, name: b.categories?.name || 'Uncategorized', planned: b.planned_amount, spent, overBy };
        })
        .filter(c => c.overBy > 0)
        .sort((a, b) => b.overBy - a.overBy);
    },
  });

  // Money leaks: zombie/unused subscriptions
  const leaks = useMemo(() => {
    if (!subs) return [];
    return subs
      .filter((s: any) => s.is_active && !s.is_cancelled)
      .map((s: any) => {
        const monthly = Math.abs(s.average_amount || 0);
        const lastSeen = s.last_charged_date ? new Date(s.last_charged_date).getTime() : null;
        const daysSince = lastSeen ? Math.floor((Date.now() - lastSeen) / 86400000) : 999;
        const isZombie = daysSince > 60;
        return { id: s.id, merchant: s.merchant, monthly, annual: monthly * 12, isZombie, daysSince };
      })
      .filter(l => l.isZombie)
      .sort((a, b) => b.annual - a.annual)
      .slice(0, 5);
  }, [subs]);

  // Data freshness for confidence
  const lastTxnDate = useMemo(() => {
    if (!txns?.length) return null;
    return txns.reduce((max, t) => t.date > max ? t.date : max, '');
  }, [txns]);
  const daysSinceLastTxn = lastTxnDate
    ? Math.floor((Date.now() - new Date(lastTxnDate).getTime()) / 86400000)
    : 999;
  const dataConfidence: Confidence = daysSinceLastTxn <= 7 ? 'high' : daysSinceLastTxn <= 21 ? 'medium' : 'low';

  const totalLeakMonthly = leaks.reduce((s, l) => s + l.monthly, 0);
  const totalLeakAnnual = leaks.reduce((s, l) => s + l.annual, 0);

  const hasIssue = (overBudget?.length || 0) > 0 || anomalies.length > 0;

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-prism-teal/20 bg-gradient-to-br from-prism-navy/80 via-prism-navy/60 to-prism-teal/10 p-6 sm:p-8 backdrop-blur-sm">
        <div className="absolute -top-12 -right-12 h-48 w-48 rounded-full bg-prism-amber/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-prism-teal/10 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-prism-amber" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-prism-amber">PrismMoney™ Coach</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            What happened, why, and what to do next.
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
            Most apps tell you the score. Coach calls the next play — explaining patterns, protecting your next paycheck,
            and turning leaks into wealth.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <Badge variant="outline" className="bg-background/40 border-border/40">
              True Safe-to-Spend: <span className="ml-1 font-bold text-prism-teal">{fmt(sts.monthly)}</span>/mo
            </Badge>
            <Badge variant="outline" className="bg-background/40 border-border/40">
              Buffer: <span className="ml-1 font-bold">{sts.bufferPercent}%</span>
            </Badge>
            {leaks.length > 0 && (
              <Badge variant="outline" className="bg-prism-amber/10 border-prism-amber/30 text-prism-amber">
                {leaks.length} potential leak{leaks.length === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <PageOverview
        title="How Coach works"
        description="Coach turns your data into the next play — what changed, why, what to do, and how to prevent it."
        icon={Sparkles}
        iconColor="text-prism-amber"
        ttsScript="PrismMoney Coach explains what happened with your money, why it happened, what to do next, and how to prevent the same issue from repeating. Each card is wired to your live data."
        features={[
          'Cards 1 and 2 explain what shifted and why.',
          'Cards 3 and 4 build a recovery plan and prevention rule.',
          'Card 5 is Purchase Guard — decide before you buy.',
          'Card 6 finds money leaks. Card 7 shows true Safe-to-Spend.',
          'Every recommendation includes a confidence level.',
        ]}
      />


      {/* Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* CARD 1 — What Happened */}
        <CoachCard
          number={1}
          title="What happened"
          subtitle="Spending issues, budget status, and surprises this month"
          icon={Activity}
          iconColor="text-prism-orange"
          confidence={dataConfidence}
          status={hasIssue ? 'warn' : 'ok'}
        >
          {!hasIssue && (
            <div className="flex items-center gap-2 text-prism-teal">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm">Your plan is on track this month.</span>
            </div>
          )}
          {overBudget && overBudget.length > 0 && (
            <div className="space-y-2 mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Over budget</p>
              {overBudget.slice(0, 3).map(c => (
                <div key={c.id} className="flex items-center justify-between text-sm">
                  <span className="truncate">{c.name}</span>
                  <span className="font-mono font-semibold text-prism-rose">+{fmt(c.overBy)}</span>
                </div>
              ))}
              {overBudget.length > 3 && (
                <p className="text-[11px] text-muted-foreground">+ {overBudget.length - 3} more</p>
              )}
            </div>
          )}
          {anomalies.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Spending spikes</p>
              {anomalies.slice(0, 2).map((a, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate capitalize">{a.merchant}</span>
                  <span className="font-mono font-semibold text-prism-amber">+{Math.round(a.percentageIncrease * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </CoachCard>

        {/* CARD 2 — Why It Happened */}
        <CoachCard
          number={2}
          title="Why it happened"
          subtitle="Root cause, trend vs outlier"
          icon={Brain}
          iconColor="text-prism-violet"
          confidence={hasIssue ? 'medium' : 'high'}
          status={hasIssue ? 'warn' : 'ok'}
          action={hasIssue ? (
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/spending-trends">Analyze <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          ) : undefined}
        >
          {!hasIssue ? (
            <p className="text-sm text-muted-foreground">No patterns to explain right now. Coach will check again as new transactions land.</p>
          ) : (
            <div className="space-y-2 text-sm">
              <p className="text-muted-foreground">
                Coach is checking whether this is a one-time event, a repeated trend, a timing issue, or a budget design problem.
              </p>
              <div className="rounded-md bg-muted/30 p-2 text-xs">
                <span className="font-semibold">Likely cause: </span>
                {anomalies.length > 0 ? 'Recent merchant spike' : 'Category trending above plan'} — Coach is still gathering data to label this as outlier or pattern.
              </div>
            </div>
          )}
        </CoachCard>

        {/* CARD 3 — Recovery Plan (Phase 2 placeholder) */}
        <CoachCard
          number={3}
          title="Recovery plan"
          subtitle="Fast, balanced, system, or wealth recovery"
          icon={Sparkles}
          iconColor="text-prism-lime"
          status="soon"
        >
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-prism-amber font-semibold">
              <Clock className="h-3 w-3" /> Coming next
            </div>
            <p>When a category goes over plan, Coach will build four recovery options: Fast (cut Safe-to-Spend), Balanced (spread over weeks), System (fix bill timing), Wealth (redirect recovered $ to debt or savings).</p>
          </div>
        </CoachCard>

        {/* CARD 4 — Prevention Rule (Phase 2 placeholder) */}
        <CoachCard
          number={4}
          title="Prevention rule"
          subtitle="System changes so it stops repeating"
          icon={Shield}
          iconColor="text-prism-sky"
          status="soon"
        >
          <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground space-y-1">
            <div className="flex items-center gap-1.5 text-prism-amber font-semibold">
              <Clock className="h-3 w-3" /> Coming next
            </div>
            <p>Coach will suggest due-date changes, category caps, alerts, sinking funds, or buffer adjustments to prevent the same issue next month.</p>
          </div>
        </CoachCard>

        {/* CARD 5 — Purchase Guard (links to existing Guardrails) */}
        <CoachCard
          number={5}
          title="Purchase Guard"
          subtitle="Decide before you buy"
          icon={ShoppingBag}
          iconColor="text-prism-amber"
          confidence="high"
          status="ok"
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/settings">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          }
        >
          <p className="text-sm text-muted-foreground mb-3">
            Coach helps you pause before spending. It asks: is this a need, want, or strategic investment? Can it wait 24 hours?
            Does it protect or weaken your plan?
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
              <div className="font-bold">$50+</div>
              <div className="text-muted-foreground">Auto trigger</div>
            </div>
            <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
              <div className="font-bold">48h</div>
              <div className="text-muted-foreground">Cool-off period</div>
            </div>
          </div>
          <p className="mt-3 text-[10px] text-muted-foreground italic">
            Fit Score, FOMO detection, and override tracking arrive in the next phase.
          </p>
        </CoachCard>

        {/* CARD 6 — Money Leak Stopper */}
        <CoachCard
          number={6}
          title="Money leak stopper"
          subtitle="Quiet costs that weaken your plan"
          icon={Droplets}
          iconColor="text-prism-rose"
          confidence={subs ? 'high' : 'medium'}
          status={leaks.length > 0 ? 'warn' : 'ok'}
          action={
            <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
              <Link to="/subscriptions">All leaks <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          }
        >
          {leaks.length === 0 ? (
            <div className="flex items-center gap-2 text-prism-teal text-sm">
              <CheckCircle2 className="h-4 w-4" />
              <span>No obvious leaks. Coach will keep watching.</span>
            </div>
          ) : (
            <>
              <div className="rounded-lg bg-prism-rose/5 border border-prism-rose/20 p-2.5 mb-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Potential recovery</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="font-mono text-lg font-bold text-prism-rose">{fmt(totalLeakMonthly)}/mo</span>
                  <span className="text-xs text-muted-foreground">≈ {fmt(totalLeakAnnual)}/yr</span>
                </div>
              </div>
              <div className="space-y-1.5">
                {leaks.slice(0, 3).map(l => (
                  <div key={l.id} className="flex items-center justify-between text-sm">
                    <span className="truncate capitalize">{l.merchant}</span>
                    <span className="text-xs text-muted-foreground">
                      {fmt(l.monthly)}/mo · idle {l.daysSince}d
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CoachCard>

        {/* CARD 7 — Safe-to-Spend Shield (spans 2 cols on lg) */}
        <CoachCard
          number={7}
          title="Safe-to-Spend Shield"
          subtitle="What's truly available after bills, pending, and buffer"
          icon={Wallet}
          iconColor="text-prism-teal"
          confidence={accounts && accounts.length > 0 ? 'high' : 'low'}
          status="ok"
          className="md:col-span-2 lg:col-span-3"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">True monthly Safe-to-Spend</div>
              <div className="font-mono text-3xl font-extrabold text-prism-teal mt-1">{fmt(sts.monthly)}</div>
              <div className="text-xs text-muted-foreground mt-1">
                ≈ {fmt(sts.weekly)}/wk · {fmt(sts.daily)}/day
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[10px]">Available cash</div>
                  <div className="font-mono font-bold">{fmt(sts.totalAvailableCash)}</div>
                </div>
                <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[10px]">Smart Buffer</div>
                  <div className="font-mono font-bold">{sts.bufferPercent}%</div>
                </div>
                <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[10px]">Monthly income</div>
                  <div className="font-mono font-bold">{fmt(sts.monthlyIncome)}</div>
                </div>
                <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
                  <div className="text-muted-foreground text-[10px]">Obligations</div>
                  <div className="font-mono font-bold">{fmt(sts.effectiveExpenses)}</div>
                </div>
              </div>
            </div>
            <div>
              <StsEquationView />
            </div>
          </div>
        </CoachCard>
      </div>

      {/* Educational disclaimer */}
      <div className="rounded-lg border border-border/40 bg-muted/20 p-3 flex gap-2 text-[11px] text-muted-foreground">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <p>
          PrismMoney™ Coach provides educational guidance and decision-support tools based on your data and best-practice money rules.
          It does not provide legal, tax, investment, Social Security, pension, or individualized financial advisory services.
          Please consult qualified professionals before making major financial decisions.
        </p>
      </div>
    </div>
  );
}
