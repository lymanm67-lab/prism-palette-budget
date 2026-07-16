import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CalendarDays, TrendingUp, ShieldAlert, CheckCircle2, DollarSign, Home, Target, Sparkles, RefreshCw } from 'lucide-react';
import { useHpMilestones, useHpTasks, useHpDocuments, useHpRisks, useHpRules, useHpCoach, useRefreshHpCoach } from '@/hooks/use-hp-planner';
import { useHomeBuyingMetrics } from '@/hooks/use-home-buying-metrics';
import { useSafeToSpend } from '@/hooks/use-safe-to-spend';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import DownPaymentDetailsEditor from './DownPaymentDetailsEditor';

const fmt$ = (n: number) => `$${Math.round(n).toLocaleString()}`;

function StatCard({ label, value, sub, icon: Icon, tone = 'default', onClick }: { label: string; value: string; sub?: string; icon: any; tone?: 'default' | 'success' | 'warn' | 'danger'; onClick?: () => void }) {
  const toneClass = tone === 'success' ? 'text-prism-teal' : tone === 'warn' ? 'text-prism-amber' : tone === 'danger' ? 'text-prism-rose' : 'text-foreground';
  const clickable = onClick ? 'cursor-pointer hover:border-prism-amber/60 hover:bg-card/70 transition' : '';
  return (
    <div
      className={`rounded-lg border border-border/40 bg-card/40 p-3 space-y-1 ${clickable}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    >
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        <Icon className="h-3 w-3" />
        <span className="truncate">{label}</span>
      </div>
      <div className={`font-display text-xl font-extrabold ${toneClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

export default function ExecutiveDashboard({ project, onNavigate }: { project: any; onNavigate?: (tab: string) => void }) {
  const { data: milestones = [] } = useHpMilestones(project.id);
  const { data: tasks = [] } = useHpTasks(project.id);
  const { data: docs = [] } = useHpDocuments(project.id);
  const { data: risks = [] } = useHpRisks(project.id);
  const { data: rules = [] } = useHpRules(project.id);
  const metrics = useHomeBuyingMetrics();
  const sts = useSafeToSpend('personal');
  const coach = useHpCoach(project.id, 'executive_summary', null);
  const refreshCoach = useRefreshHpCoach();
  const qc = useQueryClient();

  const handleRefresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ['hp_milestones', project.id] }),
      qc.invalidateQueries({ queryKey: ['hp_tasks', project.id] }),
      qc.invalidateQueries({ queryKey: ['hp_documents', project.id] }),
      qc.invalidateQueries({ queryKey: ['hp_risks', project.id] }),
      qc.invalidateQueries({ queryKey: ['hp_rules', project.id] }),
      qc.invalidateQueries({ queryKey: ['home-buying-metrics'] }),
      qc.invalidateQueries({ queryKey: ['safe-to-spend'] }),
    ]);
    refreshCoach.mutate(
      { projectId: project.id, sectionKey: 'executive_summary', monthIndex: null },
      {
        onSuccess: () => toast.success('Summary and figures refreshed'),
        onError: (e: any) => toast.error(e?.message || 'Refresh failed'),
      }
    );
  };

  const daysRemaining = useMemo(() => {
    const target = new Date(project.target_close_date);
    const now = new Date();
    return Math.max(0, Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  }, [project.target_close_date]);

  const milestonesComplete = milestones.filter((m: any) => m.status === 'complete').length;
  const tasksComplete = tasks.filter((t: any) => t.status === 'complete').length;
  const docsUploaded = docs.filter((d: any) => d.status !== 'missing').length;
  const openRisks = risks.filter((r: any) => r.status === 'open').length;

  const readinessScore = useMemo(() => {
    const parts: number[] = [];
    const milestonePct = milestones.length ? (milestonesComplete / milestones.length) * 100 : 0;
    parts.push(milestonePct);
    const taskPct = tasks.length ? (tasksComplete / tasks.length) * 100 : 0;
    parts.push(taskPct);
    const docPct = docs.length ? (docsUploaded / docs.length) * 100 : 0;
    parts.push(docPct);
    parts.push(...metrics.map((m) => m.pct));
    return parts.length ? Math.round(parts.reduce((a, b) => a + b, 0) / parts.length) : 0;
  }, [milestones, milestonesComplete, tasks, tasksComplete, docs, docsUploaded, metrics]);

  const nextTask = tasks.find((t: any) => t.status !== 'complete');

  // Max affordable price from max_monthly_payment rule
  const paymentRule = rules.find((r: any) => r.rule_type === 'max_payment');
  const maxPI = paymentRule?.value_numeric ? Number(paymentRule.value_numeric) * 0.75 : 0; // ~75% of PITI is P&I
  const monthlyRate = 0.07 / 12;
  const nMonths = 360;
  const maxLoan = maxPI > 0 ? (maxPI * (Math.pow(1 + monthlyRate, nMonths) - 1)) / (monthlyRate * Math.pow(1 + monthlyRate, nMonths)) : 0;
  const maxPrice = maxLoan / 0.9; // 10% down assumption

  const dpMetric = metrics.find((m) => m.label === 'Down Payment');
  const efMetric = metrics.find((m) => m.label === 'Emergency Fund');
  const creditMetric = metrics.find((m) => m.label === 'Credit');
  const dtiMetric = metrics.find((m) => m.label === 'DTI');

  return (
    <div className="space-y-4">
      {/* Hero row: countdown + readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="prism-card-shine border-border/50 lg:col-span-1">
          <CardContent className="p-5 flex flex-col items-center justify-center text-center space-y-2">
            <CalendarDays className="h-8 w-8 text-prism-teal" />
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Target Closing</div>
            <div className="font-display text-3xl font-extrabold prism-gradient-text">
              {new Date(project.target_close_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
            <div className="font-display text-lg">
              <span className="font-extrabold text-prism-amber">{daysRemaining}</span> <span className="text-muted-foreground text-sm">days remaining</span>
            </div>
          </CardContent>
        </Card>

        <Card className="prism-card-shine border-border/50 lg:col-span-2">
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Overall Readiness</div>
                <div className="font-display text-5xl font-extrabold prism-gradient-text">{readinessScore}%</div>
              </div>
              {readinessScore >= 80 && (
                <Badge className="bg-prism-teal/20 text-prism-teal border-prism-teal/40">
                  <Sparkles className="h-3 w-3 mr-1" /> On track
                </Badge>
              )}
            </div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-prism-teal via-prism-amber to-prism-rose transition-all" style={{ width: `${readinessScore}%` }} />
            </div>
            {nextTask && (
              <div className="mt-3 rounded-md bg-prism-amber/10 border border-prism-amber/30 px-3 py-2 text-sm">
                <span className="font-bold">Next action:</span> {nextTask.title}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Metric grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <StatCard label="Credit" value={creditMetric?.value ?? '—'} icon={TrendingUp} tone="success" />
        <StatCard label="DTI" value={dtiMetric?.value ?? '—'} icon={Target} />
        <StatCard label="Down Payment" value={dpMetric?.value ?? '—'} sub={`Target: ${fmt$(project.down_payment_target || 0)}`} icon={DollarSign} />
        <StatCard label="Emergency Fund" value={efMetric?.value ?? '—'} icon={CheckCircle2} />
        <StatCard label="Milestones" value={`${milestonesComplete}/${milestones.length}`} icon={Home} />
        <StatCard label="Open Risks" value={String(openRisks)} sub={openRisks > 0 ? 'Click to review' : undefined} icon={ShieldAlert} tone={openRisks > 5 ? 'warn' : 'default'} onClick={onNavigate ? () => onNavigate('rules') : undefined} />
      </div>

      {/* Secondary numbers */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Max Affordable Price" value={maxPrice > 0 ? fmt$(maxPrice) : '—'} sub="At your payment rule" icon={Home} />
        <StatCard label="Monthly Payment Rule" value={paymentRule?.value_numeric ? fmt$(Number(paymentRule.value_numeric)) : '—'} icon={Target} />
        <StatCard label="Est. Closing Costs" value={project.target_price ? fmt$(Number(project.target_price) * 0.03) : '—'} sub="~3% of price" icon={DollarSign} />
        <StatCard label="Tasks Complete" value={`${tasksComplete}/${tasks.length}`} sub={onNavigate ? 'Click to open list' : undefined} icon={CheckCircle2} onClick={onNavigate ? () => onNavigate('tasks') : undefined} />
      </div>

      {/* AI Executive Summary */}
      <Card className="prism-card-shine border-border/50">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-prism-amber" />
            AI Coach: Executive Summary
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={handleRefresh}
            disabled={refreshCoach.isPending}
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${refreshCoach.isPending ? 'animate-spin' : ''}`} />
            {refreshCoach.isPending ? 'Refreshing…' : 'Refresh'}
          </Button>
        </CardHeader>
        <CardContent>
          {coach.isLoading ? (
            <p className="text-sm text-muted-foreground">Generating personalized summary…</p>
          ) : coach.error ? (
            <p className="text-sm text-muted-foreground">Coach unavailable right now.</p>
          ) : coach.data?.content_md ? (
            <div className="prose prose-sm prose-invert max-w-none">
              <ReactMarkdown>{coach.data.content_md}</ReactMarkdown>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
