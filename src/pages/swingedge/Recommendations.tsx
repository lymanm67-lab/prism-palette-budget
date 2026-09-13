import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  ListChecks,
  Sparkles,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTradingTitle } from '@/hooks/use-swingedge';
import {
  useCircuitBreaker,
  useDailyChecklist,
  useGraduation,
  useReadinessPoints,
  useWeeklyReviews,
} from '@/hooks/use-swingedge-training';
import { usePaperTradeManagement, useTradePlans } from '@/hooks/use-swingedge-stops';
import { useAcademyProgress, useTradeJournal } from '@/hooks/use-swingedge-lists';
import { weekStartOf } from '@/lib/swingedge/training';

interface Recommendation {
  /** Lower sorts first. */
  rank: number;
  title: string;
  why: string;
  cta: string;
  to: string;
  tone: 'urgent' | 'action' | 'routine';
}

const TONE_BADGE: Record<Recommendation['tone'], { label: string; className: string }> = {
  urgent: { label: 'Do first', className: 'border-rose-500/40 bg-rose-500/10 text-rose-300' },
  action: { label: 'Next up', className: 'border-amber-500/40 bg-amber-500/10 text-amber-300' },
  routine: { label: 'Routine', className: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' },
};

const GRADUATION_LABEL: Record<string, string> = {
  NOT_READY: 'Stay on paper for now',
  BUILDING: 'Habits are forming',
  READY_FOR_SMALL_LIVE: 'Ready to consider small live trades',
};

/**
 * Recommendations — reads the whole trading record (breakers, points, plans,
 * trades, journal, reviews) and answers one question: "what should I do next?"
 * Ranked so the first card is always the right place to start.
 */
export default function Recommendations() {
  useTradingTitle('Recommendations');

  const breaker = useCircuitBreaker();
  const points = useReadinessPoints();
  const graduation = useGraduation();
  const checklist = useDailyChecklist();
  const { trades } = usePaperTradeManagement();
  const { plans } = useTradePlans();
  const { entries } = useTradeJournal();
  const { reviews } = useWeeklyReviews();
  const { completedCount, totalLessons } = useAcademyProgress();

  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const weekStart = weekStartOf(today);

    // 1. A tripped breaker outranks everything — trading is paused until reviewed.
    if (breaker.assessment.tripped && !breaker.assessment.canOpenNewTrade) {
      recs.push({
        rank: 1,
        title: 'Finish your circuit-breaker review',
        why: `${breaker.assessment.headline}. New paper trades are blocked until the review is written — this is risk control, not punishment.`,
        cta: 'Open Training',
        to: '/swingedge/training',
        tone: 'urgent',
      });
    }

    // 2. Points gate — paper trading stays locked until 150 points.
    if (!points.canPaperTrade) {
      const lessonsLeft = totalLessons - completedCount;
      recs.push({
        rank: 2,
        title: `Earn ${points.pointsToPaperTrade} more readiness points`,
        why:
          lessonsLeft > 0
            ? `Paper trading unlocks at 150 points. Fastest path: finish the remaining ${lessonsLeft} Academy lesson${lessonsLeft === 1 ? '' : 's'} (10 points each) and pass quizzes (+5).`
            : 'Paper trading unlocks at 150 points. Complete training weeks (20 points each) to close the gap.',
        cta: lessonsLeft > 0 ? 'Open Academy' : 'Open Training',
        to: lessonsLeft > 0 ? '/swingedge/academy' : '/swingedge/training',
        tone: 'urgent',
      });
    }

    // 3. Today's pre-trade checklist.
    if (!checklist.complete) {
      recs.push({
        rank: 3,
        title: "Do today's pre-trade checklist",
        why: 'Five quick checks — market condition, earnings, heat room, stop defined, size calculated — before any trade decision today.',
        cta: 'Open Dashboard',
        to: '/swingedge',
        tone: 'action',
      });
    }

    // 4. Closed trades with no journal entry teach nothing.
    const journaledIds = new Set((entries ?? []).map((e) => e.paper_trade_id).filter(Boolean));
    const unjournaled = trades.filter((t) => t.status === 'CLOSED' && !journaledIds.has(t.id));
    if (unjournaled.length > 0) {
      recs.push({
        rank: 4,
        title: `Journal ${unjournaled.length} closed trade${unjournaled.length === 1 ? '' : 's'}`,
        why: `${unjournaled.map((t) => t.symbol).slice(0, 4).join(', ')}${unjournaled.length > 4 ? '…' : ''} closed without a journal entry. An unjournaled trade teaches nothing and earns no points.`,
        cta: 'Open Journal',
        to: '/swingedge/journal',
        tone: 'action',
      });
    }

    // 5. Saved plans sitting unexecuted.
    const openPlans = plans.filter((p) => p.status === 'OPEN');
    if (openPlans.length > 0 && points.canPaperTrade) {
      recs.push({
        rank: 5,
        title: `Act on ${openPlans.length} saved trade plan${openPlans.length === 1 ? '' : 's'}`,
        why: `${openPlans.map((p) => p.symbol).slice(0, 4).join(', ')}${openPlans.length > 4 ? '…' : ''} planned but not executed. Revalidate the setup first — a stale plan is not a trade.`,
        cta: 'Open Trade Planner',
        to: '/swingedge/planner',
        tone: 'action',
      });
    }

    // 6. This week's review.
    const hasThisWeek = reviews.some((r) => r.week_start === weekStart);
    if (!hasThisWeek) {
      recs.push({
        rank: 6,
        title: "Write this week's review",
        why: 'Reviews are worth 25 points and are how the graduation checks measure rule-following. Five minutes, once a week.',
        cta: 'Open Training',
        to: '/swingedge/training',
        tone: 'routine',
      });
    }

    // 7. Academy unfinished (and not already the top priority).
    if (points.canPaperTrade && completedCount < totalLessons) {
      recs.push({
        rank: 7,
        title: 'Finish the remaining Academy lessons',
        why: `${completedCount} of ${totalLessons} complete. The rest still earn points and close knowledge gaps the scanner assumes you have.`,
        cta: 'Open Academy',
        to: '/swingedge/academy',
        tone: 'routine',
      });
    }

    // 8. Nothing pressing — keep the routine moving.
    if (recs.length === 0) {
      recs.push({
        rank: 8,
        title: 'Run the scanner',
        why: 'You are caught up. The routine is: scan, analyze the best candidate, plan the trade, journal the result.',
        cta: 'Open Scanner',
        to: '/swingedge/scanner',
        tone: 'routine',
      });
    }

    return recs.sort((a, b) => a.rank - b.rank);
  }, [breaker.assessment, points, checklist.complete, trades, plans, entries, reviews, completedCount, totalLessons]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-sm text-muted-foreground">
          One ranked list built from your breakers, points, plans, trades and journal. Start at the
          top.
        </p>
      </div>

      {/* Where you stand */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Sparkles className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Readiness points</p>
              <p className="text-sm font-semibold">
                {points.total} pts — {points.headline}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle
              className={`h-5 w-5 shrink-0 ${breaker.assessment.tripped && !breaker.assessment.canOpenNewTrade ? 'text-rose-400' : 'text-emerald-400'}`}
            />
            <div>
              <p className="text-xs text-muted-foreground">Circuit breakers</p>
              <p className="text-sm font-semibold">{breaker.assessment.headline}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <GraduationCap className="h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Live-readiness</p>
              <p className="text-sm font-semibold">
                {GRADUATION_LABEL[graduation.status] ?? graduation.status} ({graduation.passedCount}/
                {graduation.checks.length} checks)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranked recommendations */}
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <Card
            key={rec.rank + rec.title}
            className={i === 0 ? 'border-primary/40 bg-primary/5' : undefined}
          >
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-start gap-3">
                <span
                  className={
                    i === 0
                      ? 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground'
                      : 'flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground'
                  }
                >
                  {i + 1}
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {i === 0 && (
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        Start here
                      </span>
                    )}
                    <Badge variant="outline" className={TONE_BADGE[rec.tone].className}>
                      {TONE_BADGE[rec.tone].label}
                    </Badge>
                    <span className="font-semibold">{rec.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.why}</p>
                </div>
              </div>
              <Button asChild variant={i === 0 ? 'default' : 'outline'} size="sm" className="shrink-0">
                <Link to={rec.to}>
                  {rec.cta}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4" /> The routine this list is built on
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>1. Checklist before anything else — five checks, every trading day.</p>
          <p>2. Scanner finds candidates; Analyzer confirms the best one.</p>
          <p>3. Trade Planner sets entry, stop, target and size from the invalidation.</p>
          <p>4. Paper trade it, journal every closed trade, review the week.</p>
          <p className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            <span>
              <ClipboardCheck className="mr-1 inline h-4 w-4" />
              Breakers and points always outrank new trades — discipline first, opportunity second.
            </span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
