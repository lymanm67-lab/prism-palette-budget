import { useMemo, useState, type ReactNode } from 'react';
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
import { usePurchaseGuardChecks, useOverridePattern } from '@/hooks/use-purchase-guard';
import { useMoneyLeaks, useScanMoneyLeaks, useUpdateMoneyLeak, type MoneyLeak } from '@/hooks/use-money-leaks';
import { useAdaptiveBuffer, useApplyAdaptiveBuffer } from '@/hooks/use-adaptive-buffer';
import { useModeSettings } from '@/hooks/use-financial-mode';
import { usePaycheckDeployments, useBuildPaycheckDeployment } from '@/hooks/use-paycheck-deploy';
import { PurchaseGuardDialog } from '@/components/coach/PurchaseGuardDialog';
import { PurchaseGuardReviewPrompts } from '@/components/coach/PurchaseGuardReviewPrompts';
import { BillTimingOptimizer } from '@/components/coach/BillTimingOptimizer';
import { WealthRedirector } from '@/components/coach/WealthRedirector';
import { CoachOnboardingTour } from '@/components/coach/CoachOnboardingTour';
import { CoachNudges } from '@/components/coach/CoachNudges';
import { MoneySnapshotBar } from '@/components/coach/MoneySnapshotBar';
import { CoachCard, type Confidence } from '@/components/coach/CoachCard';
import { SituationRoom } from '@/components/coach/SituationRoom';
import { MomentTabs } from '@/components/coach/MomentTabs';
import { CoachSlot } from '@/components/coach/CoachSlot';
import { CARD_MOMENT, type Moment } from '@/components/coach/moment-types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StsEquationView } from '@/components/StsEquationView';
import {
  Activity, Brain, Sparkles, Shield, ShoppingBag, Droplets,
  Wallet, ArrowRight, AlertTriangle, CheckCircle2, Clock, Info,
  Zap, Scale, Settings2, TrendingUp, Loader2, X, RefreshCw, CheckCheck, ArrowRightCircle,
  CalendarClock, CalendarDays, Target,
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
  useSubscriptions(); // prime cache for downstream cards
  const { data: txns } = useTransactions();
  const { data: accounts } = useAccounts();
  const currentMonth = format(startOfMonth(new Date()), 'yyyy-MM-dd');
  const { data: recoveryPlans } = useRecoveryPlans(currentMonth);
  const buildPlan = useBuildRecoveryPlan();
  const updatePlan = useUpdateRecoveryPlan();

  // Over-budget categories this month
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

  // Money leaks (live from engine table)
  const { data: leaksOpen } = useMoneyLeaks('open');
  const leakCount = leaksOpen?.length ?? 0;

  // Data freshness for confidence
  const lastTxnDate = useMemo(() => {
    if (!txns?.length) return null;
    return txns.reduce((max, t) => t.date > max ? t.date : max, '');
  }, [txns]);
  const daysSinceLastTxn = lastTxnDate
    ? Math.floor((Date.now() - new Date(lastTxnDate).getTime()) / 86400000)
    : 999;
  const dataConfidence: Confidence = daysSinceLastTxn <= 7 ? 'high' : daysSinceLastTxn <= 21 ? 'medium' : 'low';

  const hasIssue = (overBudget?.length || 0) > 0 || anomalies.length > 0;

  const [moment, setMoment] = useState<Moment>('all');

  const jumpTo = (m: Moment, card: number) => {
    setMoment(m);
    setTimeout(() => {
      document.getElementById(`coach-card-${card}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  // Default-open: hero trio when "all", else cards matching selected moment.
  const HERO_DEFAULT = [1, 5, 7];
  const isOpenByDefault = (card: number) =>
    moment === 'all' ? HERO_DEFAULT.includes(card) : CARD_MOMENT[card] === moment;

  return (
    <div className="space-y-4 p-3 sm:p-5 max-w-7xl mx-auto">
      <CoachOnboardingTour />

      <SituationRoom
        monthlyStS={sts.monthly}
        bufferPercent={sts.bufferPercent}
        leakCount={leakCount}
        onJump={jumpTo}
      />

      <MomentTabs value={moment} onChange={setMoment} />

      <CoachNudges />

      <MoneySnapshotBar />

      {/* Equal-width column command grid — themed lanes, row-style modules */}
      <div
        key={`grid-${moment}`}
        className="grid grid-cols-1 lg:grid-cols-3 gap-0 rounded-xl border border-border/40 overflow-hidden backdrop-blur-md bg-card/30"
      >

        {/* ─── COLUMN 1 — Intelligence & Review ─── */}
        <div className="lg:border-r border-border/40 flex flex-col">
          <div className="px-4 py-2.5 bg-muted/30 border-b border-border/40 flex items-center justify-between">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Intelligence & Review
            </h3>
            <span className="text-[10px] text-muted-foreground/70 font-mono">01–04</span>
          </div>

        {/* CARD 1 — What Happened */}
        <CoachSlot card={1} moment={moment}>
        <CoachCard
          number={1}
          collapsible
          defaultOpen={isOpenByDefault(1)}
          title="What happened"
          subtitle="Spending issues, budget status, and surprises this month"
          icon={Activity}
          iconColor="text-prism-orange"
          confidence={dataConfidence}
          status={hasIssue ? 'warn' : 'ok'}
          pitfall="Reacting to a single bad week with guilt instead of data."
          tryThis="Treat overages as signals — find the category, not the character flaw."
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
        </CoachSlot>

        {/* CARD 2 — Why It Happened */}
        <CoachSlot card={2} moment={moment}>
        <CoachCard
          number={2}
          collapsible
          defaultOpen={isOpenByDefault(2)}
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
          pitfall="Blaming yourself before checking timing — a delayed paycheck looks like overspending."
          tryThis="Ask: was this an outlier, a trend, or a budget that no longer fits real life?"
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
        </CoachSlot>

        {/* CARD 3 — Recovery Plan */}
        {(() => {
          const topOver = overBudget?.[0];
          const plansForTop = (recoveryPlans || []).filter(
            (p: any) => topOver && p.category_name === topOver.name,
          );
          const activePlan = plansForTop.find((p: any) => p.status === 'active');
          const suggestedPlans = plansForTop.filter((p: any) => p.status === 'suggested');
          const dismissedAll = plansForTop.length > 0 && suggestedPlans.length === 0 && !activePlan;
          const preventionRule = plansForTop[0]?.prevention_rule;
          const patternType = plansForTop[0]?.pattern_type;

          return (
            <>
              <CoachSlot card={3} moment={moment}>
              <CoachCard
                number={3}
                collapsible
                defaultOpen={isOpenByDefault(3)}
                title="Recovery plan"
                subtitle={topOver ? `For ${topOver.name} — ${fmt(topOver.overBy)} over` : 'Fast, balanced, system, or wealth recovery'}
                icon={Sparkles}
                iconColor="text-prism-lime"
                confidence={plansForTop.length ? 'high' : 'medium'}
                status={activePlan ? 'ok' : topOver ? 'warn' : 'ok'}
                pitfall="Going 'cold turkey' on a category — drastic cuts collapse by week two."
                tryThis="Pick the Balanced plan first. Sustainable beats heroic every month."
              >
                {!topOver && (
                  <div className="flex items-center gap-2 text-prism-teal text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Nothing over plan right now.</span>
                  </div>
                )}

                {topOver && plansForTop.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Coach can build four recovery options for <span className="font-semibold text-foreground">{topOver.name}</span> — Fast, Balanced, System, or Wealth.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => buildPlan.mutate({
                        category_id: undefined,
                        category_name: topOver.name,
                        month: currentMonth,
                        overage_amount: Math.round(topOver.overBy * 100) / 100,
                        budget_amount: topOver.planned,
                        spent_amount: topOver.spent,
                      })}
                      disabled={buildPlan.isPending}
                      className="w-full"
                    >
                      {buildPlan.isPending ? (
                        <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Building plan…</>
                      ) : (
                        <>Build recovery plan <Sparkles className="ml-2 h-3 w-3" /></>
                      )}
                    </Button>
                  </div>
                )}

                {topOver && activePlan && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const meta = PLAN_META[activePlan.plan_type] || PLAN_META.balanced;
                        const Icon = meta.icon;
                        return (
                          <>
                            <Icon className={`h-4 w-4 ${meta.color}`} />
                            <span className="text-xs font-bold uppercase tracking-wider">{meta.label} plan active</span>
                          </>
                        );
                      })()}
                    </div>
                    <p className="text-sm font-semibold">{activePlan.title}</p>
                    <p className="text-xs text-muted-foreground">{activePlan.summary}</p>
                    <ul className="space-y-1 text-xs">
                      {(activePlan.steps as string[]).map((s, i) => (
                        <li key={i} className="flex gap-2"><span className="text-prism-teal">›</span><span>{s}</span></li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="outline" className="h-7 text-xs flex-1"
                        onClick={() => updatePlan.mutate({ id: activePlan.id, status: 'completed' })}>
                        Mark complete
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs"
                        onClick={() => updatePlan.mutate({ id: activePlan.id, status: 'dismissed' })}>
                        Switch plan
                      </Button>
                    </div>
                  </div>
                )}

                {topOver && !activePlan && suggestedPlans.length > 0 && (
                  <div className="space-y-2">
                    {patternType && (
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {patternType === 'repeated' ? 'Repeated pattern' : patternType === 'developing' ? 'Developing pattern' : 'One-time outlier'}
                      </Badge>
                    )}
                    <div className="space-y-1.5">
                      {suggestedPlans.map((p: any) => {
                        const meta = PLAN_META[p.plan_type] || PLAN_META.balanced;
                        const Icon = meta.icon;
                        return (
                          <button
                            key={p.id}
                            onClick={() => updatePlan.mutate({ id: p.id, status: 'active' })}
                            className="w-full text-left rounded-md border border-border/40 bg-background/40 hover:bg-background/70 hover:border-prism-teal/40 transition px-2.5 py-2"
                          >
                            <div className="flex items-start gap-2">
                              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${meta.color}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold uppercase tracking-wider">{meta.label}</span>
                                  <span className="font-mono text-[11px] text-muted-foreground">{fmt(p.target_amount)}</span>
                                </div>
                                <p className="text-xs font-medium mt-0.5 truncate">{p.title}</p>
                                <p className="text-[11px] text-muted-foreground truncate">{p.summary}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground italic">Tap a plan to apply it.</p>
                  </div>
                )}

                {topOver && dismissedAll && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">All plans completed or dismissed.</p>
                    <Button size="sm" variant="outline" className="w-full h-8 text-xs"
                      onClick={() => buildPlan.mutate({
                        category_name: topOver.name,
                        month: currentMonth,
                        overage_amount: Math.round(topOver.overBy * 100) / 100,
                        budget_amount: topOver.planned,
                        spent_amount: topOver.spent,
                      })}>
                      Rebuild plans
                    </Button>
                  </div>
                )}
              </CoachCard>
              </CoachSlot>

              {/* CARD 4 — Prevention Rule */}
              <CoachSlot card={4} moment={moment}>
              <CoachCard
                number={4}
                collapsible
                defaultOpen={isOpenByDefault(4)}
                title="Prevention rule"
                subtitle="So it stops repeating"
                icon={Shield}
                iconColor="text-prism-sky"
                confidence={preventionRule ? 'high' : 'medium'}
                status={preventionRule ? 'ok' : topOver ? 'warn' : 'ok'}
                pitfall="Fixing the symptom (a refund, a transfer) without changing the system."
                tryThis="A small standing rule beats a big monthly cleanup. Automate the boring part."
              >
                {preventionRule ? (
                  <div className="space-y-2">
                    <div className="rounded-lg bg-prism-sky/5 border border-prism-sky/20 p-3">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Shield className="h-3 w-3 text-prism-sky" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-prism-sky">System change</span>
                      </div>
                      <p className="text-sm">{preventionRule}</p>
                    </div>
                    {patternType === 'repeated' && (
                      <p className="text-[11px] text-muted-foreground italic">
                        This category trended over 3+ months — a system fix is stronger than a one-time recovery.
                      </p>
                    )}
                  </div>
                ) : topOver ? (
                  <p className="text-sm text-muted-foreground">
                    Build a recovery plan first — Coach will generate a prevention rule alongside it.
                  </p>
                ) : (
                  <div className="flex items-center gap-2 text-prism-teal text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>No prevention needed right now.</span>
                  </div>
                )}
              </CoachCard>
              </CoachSlot>
            </>
          );
        })()}



        {/* CARD 5 — Purchase Guard (extended) */}
        <CoachSlot card={5} moment={moment}><PurchaseGuardCardSection defaultOpen={isOpenByDefault(5)} /></CoachSlot>

        {/* CARD 6 — Money Leak Stopper (engine) */}
        <CoachSlot card={6} moment={moment} span="md2"><MoneyLeakStopperCard defaultOpen={isOpenByDefault(6)} /></CoachSlot>

        {/* CARD 7 — Safe-to-Spend Shield + Adaptive Buffer */}
        <CoachSlot card={7} moment={moment} span="md2lg3"><SafeToSpendShieldCard defaultOpen={isOpenByDefault(7)} /></CoachSlot>

        {/* CARD 8 — Paycheck Deployment */}
        <CoachSlot card={8} moment={moment} span="md2"><PaycheckDeploymentCard defaultOpen={isOpenByDefault(8)} /></CoachSlot>

        {/* CARD 9 — Bill Timing Optimizer */}
        <CoachSlot card={9} moment={moment}><BillTimingCard defaultOpen={isOpenByDefault(9)} /></CoachSlot>

        {/* CARD 10 — Wealth Redirector */}
        <CoachSlot card={10} moment={moment} span="md2lg3"><WealthRedirectorCard defaultOpen={isOpenByDefault(10)} /></CoachSlot>
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

function PurchaseGuardCardSection({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(false);
  const { data: checks } = usePurchaseGuardChecks(20);
  const overrides = useOverridePattern();

  const recent = checks || [];
  const decided = recent.filter((c: any) => c.decision && c.decision !== 'pending');
  const skipped = decided.filter((c: any) => c.decision === 'skipped');
  const waiting = recent.filter((c: any) => c.decision === 'waiting' && c.wait_until && new Date(c.wait_until).getTime() > Date.now());

  const savedFromSkips = skipped.reduce((s: number, c: any) => s + Number(c.amount || 0), 0);
  const avgFit = decided.length
    ? Math.round(decided.reduce((s: number, c: any) => s + (c.fit_score || 0), 0) / decided.length)
    : null;

  return (
    <>
      <CoachCard
        number={5}
        collapsible
        defaultOpen={defaultOpen}
        title="Purchase Guard"
        subtitle="Decide before you buy"
        icon={ShoppingBag}
        iconColor="text-prism-amber"
        confidence={decided.length >= 3 ? 'high' : 'medium'}
        status={overrides.hasPattern ? 'warn' : 'ok'}
        action={
          <Button size="sm" className="h-7 text-xs" onClick={() => setOpen(true)}>
            Run check <Sparkles className="ml-1 h-3 w-3" />
          </Button>
        }
      >
        <p className="text-sm text-muted-foreground mb-3">
          Coach checks Fit Score, FOMO signals, and 24h wait — then logs the decision so patterns surface over time.
        </p>

        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
            <div className="text-muted-foreground text-[10px]">Skipped</div>
            <div className="font-mono font-bold">{fmt(savedFromSkips)}</div>
          </div>
          <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
            <div className="text-muted-foreground text-[10px]">Avg Fit</div>
            <div className="font-mono font-bold">{avgFit ?? '—'}</div>
          </div>
          <div className="rounded-md bg-background/40 border border-border/40 px-2 py-1.5">
            <div className="text-muted-foreground text-[10px]">Waiting</div>
            <div className="font-mono font-bold">{waiting.length}</div>
          </div>
        </div>

        {overrides.hasPattern && (
          <div className="mt-3 rounded-md bg-prism-amber/10 border border-prism-amber/30 px-2.5 py-1.5 text-[11px] text-prism-amber">
            <AlertTriangle className="h-3 w-3 inline mr-1" />
            {overrides.count} overrides in 6 months — Coach will suggest a system rule.
          </div>
        )}

        {recent.length > 0 && (
          <div className="mt-3 space-y-1">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Recent checks</div>
            {recent.slice(0, 3).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between text-xs">
                <span className="truncate capitalize">{c.merchant || c.purpose?.slice(0, 28) || 'Purchase'}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Badge variant="outline" className="text-[9px] py-0 px-1.5">{c.decision}</Badge>
                  <span className="font-mono text-muted-foreground">{fmt(Number(c.amount))}</span>
                </span>
              </div>
            ))}
          </div>
        )}

        <PurchaseGuardReviewPrompts />
      </CoachCard>

      <PurchaseGuardDialog open={open} onOpenChange={setOpen} />
    </>
  );
}

const REDIRECT_LABEL: Record<string, string> = {
  debt: 'High-interest debt',
  hsa: 'HSA',
  roth: 'Roth IRA',
  savings: 'Savings',
  ef: 'Emergency Fund',
  none: 'No redirect',
};

function MoneyLeakStopperCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { data: leaks, isLoading } = useMoneyLeaks('open');
  const scan = useScanMoneyLeaks();
  const update = useUpdateMoneyLeak();

  const list = (leaks || []) as MoneyLeak[];
  const totalMonthly = list.reduce((s, l) => s + Number(l.monthly_cost || 0), 0);
  const totalAnnual = list.reduce((s, l) => s + Number(l.annual_cost || 0), 0);
  const total3yr = list.reduce((s, l) => s + Number(l.three_year_cost || 0), 0);

  return (
    <CoachCard
      number={6}
      collapsible
      defaultOpen={defaultOpen}
      title="Money leak stopper"
      subtitle="Quiet costs that weaken your plan"
      icon={Droplets}
      iconColor="text-prism-rose"
      confidence={list.length > 0 ? 'high' : 'medium'}
      status={list.length > 0 ? 'warn' : 'ok'}
      className=""
      action={
        <Button size="sm" variant="ghost" className="h-7 text-xs"
          onClick={() => scan.mutate()} disabled={scan.isPending}>
          {scan.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          <span className="ml-1">Scan now</span>
        </Button>
      }
    >
      {isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Loading…
        </div>
      )}

      {!isLoading && list.length === 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-prism-teal text-sm">
            <CheckCircle2 className="h-4 w-4" />
            <span>No leaks detected. Run a scan to check fresh data.</span>
          </div>
          <Button size="sm" onClick={() => scan.mutate()} disabled={scan.isPending} className="w-full">
            {scan.isPending ? (<><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Scanning…</>) : (<>Run leak scan <Sparkles className="ml-2 h-3 w-3" /></>)}
          </Button>
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-md bg-prism-rose/5 border border-prism-rose/20 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Monthly</div>
              <div className="font-mono text-sm font-bold text-prism-rose">{fmt(totalMonthly)}</div>
            </div>
            <div className="rounded-md bg-prism-rose/5 border border-prism-rose/20 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Annual</div>
              <div className="font-mono text-sm font-bold text-prism-rose">{fmt(totalAnnual)}</div>
            </div>
            <div className="rounded-md bg-prism-amber/5 border border-prism-amber/20 px-2 py-1.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">3-yr</div>
              <div className="font-mono text-sm font-bold text-prism-amber">{fmt(total3yr)}</div>
            </div>
          </div>

          <div className="space-y-2 max-h-[320px] overflow-auto pr-1">
            {list.slice(0, 8).map(l => (
              <div key={l.id} className="rounded-lg border border-border/40 bg-background/40 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 capitalize">
                        {l.leak_type.replace(/_/g, ' ')}
                      </Badge>
                      {l.risk_level === 'high' && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-prism-rose/10 border-prism-rose/30 text-prism-rose">
                          High risk
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm font-semibold mt-1 truncate">{l.title}</p>
                    {l.recommended_fix && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{l.recommended_fix}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-bold">{fmt(Number(l.monthly_cost))}/mo</div>
                    <div className="font-mono text-[10px] text-muted-foreground">{fmt(Number(l.annual_cost))}/yr</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                    onClick={() => update.mutate({ id: l.id, status: 'fixed' })}>
                    <CheckCheck className="h-3 w-3 mr-1" /> Fixed
                  </Button>
                  {l.suggested_redirect && l.suggested_redirect !== 'none' && (
                    <Button size="sm" variant="outline" className="h-6 text-[10px] px-2 border-prism-lime/40 text-prism-lime hover:bg-prism-lime/10"
                      onClick={() => update.mutate({ id: l.id, status: 'redirected' })}>
                      <ArrowRightCircle className="h-3 w-3 mr-1" />
                      Redirect → {REDIRECT_LABEL[l.suggested_redirect] || l.suggested_redirect}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2 text-muted-foreground"
                    onClick={() => update.mutate({ id: l.id, status: 'dismissed' })}>
                    <X className="h-3 w-3 mr-1" /> Dismiss
                  </Button>
                </div>
              </div>
            ))}
            {list.length > 8 && (
              <p className="text-[11px] text-muted-foreground text-center pt-1">+ {list.length - 8} more leaks</p>
            )}
          </div>
        </>
      )}
    </CoachCard>
  );
}

function SafeToSpendShieldCard({ defaultOpen = true }: { defaultOpen?: boolean }) {
  const sts = useSafeToSpend('personal');
  const { data: accounts } = useAccounts();
  const { data: mode } = useModeSettings();
  const adaptive = useAdaptiveBuffer();
  const apply = useApplyAdaptiveBuffer();

  const isAdaptive = (mode as any)?.buffer_mode === 'adaptive';

  return (
    <CoachCard
      number={7}
      collapsible
      defaultOpen={defaultOpen}
      title="Safe-to-Spend Shield"
      subtitle="What's truly available after bills, pending, and buffer"
      icon={Wallet}
      iconColor="text-prism-teal"
      confidence={accounts && accounts.length > 0 ? 'high' : 'low'}
      status="ok"
      className=""
    >
      <div className="grid gap-4 lg:grid-cols-3">
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

        {/* Adaptive Buffer Panel */}
        <div className="rounded-xl border border-prism-sky/20 bg-prism-sky/5 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-prism-sky" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-prism-sky">Why this buffer?</span>
            </div>
            <Badge variant="outline" className="text-[9px] py-0 px-1.5">
              {isAdaptive ? 'Adaptive' : 'Manual'}
            </Badge>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="font-mono text-2xl font-extrabold">{adaptive.tier}%</span>
            <span className="text-[11px] text-muted-foreground">recommended</span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">{adaptive.explanation}</p>

          {adaptive.triggers.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {adaptive.triggers.map(t => (
                <li key={t.key} className="flex items-start gap-1.5 text-[11px]">
                  <span className="text-prism-amber">›</span>
                  <span className="flex-1">
                    <span className="font-medium">{t.label}</span>
                    {t.detail && <span className="text-muted-foreground"> — {t.detail}</span>}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">+{t.weight}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground italic">No risk signals — minimum buffer applies.</p>
          )}

          <div className="flex gap-1.5 mt-3">
            {!isAdaptive || sts.bufferPercent !== adaptive.tier ? (
              <Button size="sm" className="h-7 text-[11px] flex-1"
                onClick={() => apply.mutate({ mode: 'adaptive', percent: adaptive.tier, triggers: adaptive.triggers })}
                disabled={apply.isPending}>
                {apply.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <>Apply {adaptive.tier}% adaptive</>}
              </Button>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-prism-teal/10 border-prism-teal/30 text-prism-teal">
                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
              </Badge>
            )}
            {isAdaptive && (
              <Button size="sm" variant="ghost" className="h-7 text-[11px]"
                onClick={() => apply.mutate({ mode: 'manual' })}>
                Back to manual
              </Button>
            )}
          </div>
        </div>

        <div>
          <StsEquationView />
        </div>
      </div>
    </CoachCard>
  );
}

function PaycheckDeploymentCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const { data: deployments } = usePaycheckDeployments(3);
  const build = useBuildPaycheckDeployment();
  const next = (deployments || []).find(d => d.status !== 'applied' && d.status !== 'skipped') || deployments?.[0];

  return (
    <CoachCard
      number={8}
      collapsible
      defaultOpen={defaultOpen}
      title="Paycheck deployment"
      subtitle="Every dollar gets a job before it lands"
      icon={CalendarClock}
      iconColor="text-prism-amber"
      confidence={next ? (next.confidence as Confidence) : 'medium'}
      status={next ? 'ok' : 'soon'}
      className=""
      action={
        <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
          <Link to="/coach/paycheck">Open <ArrowRight className="ml-1 h-3 w-3" /></Link>
        </Button>
      }
    >
      {!next && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Build a paycheck plan and Coach will assign each dollar to bills, debt, goals, buffer, and Safe-to-Spend.
          </p>
          <Button size="sm" className="w-full" disabled={build.isPending}
            onClick={() => build.mutate({})}>
            {build.isPending ? <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Deploying…</> : <>Deploy next paycheck <Sparkles className="ml-2 h-3 w-3" /></>}
          </Button>
        </div>
      )}
      {next && (
        <div className="space-y-3">
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Next pay</div>
              <div className="font-display text-lg font-bold">{format(new Date(next.pay_date), 'EEE, MMM d')}</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Net</div>
              <div className="font-mono text-lg font-bold text-prism-teal">{fmt(Number(next.net_amount))}</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[10px]">
            {[
              { l: 'Bills', v: next.bills_amount, c: 'text-prism-sky' },
              { l: 'Debt', v: Number(next.min_debt_amount) + Number(next.extra_debt_amount), c: 'text-prism-rose' },
              { l: 'Save+Invest', v: Number(next.savings_amount) + Number(next.investment_amount), c: 'text-prism-lime' },
              { l: 'Safe-to-Spend', v: next.safe_to_spend_amount, c: 'text-prism-amber' },
            ].map(b => (
              <div key={b.l} className="rounded-md bg-background/40 border border-border/40 px-1.5 py-1.5 text-center">
                <div className="text-muted-foreground truncate">{b.l}</div>
                <div className={`font-mono text-xs font-bold ${b.c}`}>{fmt(Number(b.v))}</div>
              </div>
            ))}
          </div>

          {next.rationale && (
            <p className="text-[11px] text-muted-foreground italic flex gap-1.5">
              <Info className="h-3 w-3 shrink-0 mt-0.5" /> <span>{next.rationale}</span>
            </p>
          )}

          <Button asChild size="sm" variant="outline" className="w-full h-8 text-[11px]">
            <Link to="/coach/paycheck">See full timeline <ArrowRight className="ml-1 h-3 w-3" /></Link>
          </Button>
        </div>
      )}
    </CoachCard>
  );
}

function BillTimingCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <CoachCard
      number={9}
      collapsible
      defaultOpen={defaultOpen}
      title="Bill timing optimizer"
      subtitle="Spread the load before bills pile up"
      icon={CalendarDays}
      iconColor="text-prism-sky"
      confidence="medium"
      status="ok"
    >
      <BillTimingOptimizer />
    </CoachCard>
  );
}

function WealthRedirectorCard({ defaultOpen = false }: { defaultOpen?: boolean }) {
  return (
    <CoachCard
      number={10}
      collapsible
      defaultOpen={defaultOpen}
      title="Wealth redirector"
      subtitle="Turn recovered dollars into a 3-year payoff"
      icon={Target}
      iconColor="text-prism-lime"
      confidence="high"
      status="ok"
      className=""
    >
      <p className="text-sm text-muted-foreground mb-3">
        Found money? Canceled a subscription? Fixed a leak? Project what redirecting it monthly could become.
      </p>
      <WealthRedirector initialMonthly={50} />
    </CoachCard>
  );
}


