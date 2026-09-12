import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useCircuitBreaker } from '@/hooks/use-swingedge-training';
import {
  CONSECUTIVE_REVIEW_QUESTIONS,
  DAILY_REVIEW_PROMPT,
  WEEKLY_REVIEW_PROMPT,
  type BreakerKey,
} from '@/lib/swingedge/circuitBreaker';
import { OUTCOME_LABEL, type OutcomeClass } from '@/lib/swingedge/execution';

const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const outcomeLabel = (value: string | null) =>
  value && value in OUTCOME_LABEL ? OUTCOME_LABEL[value as OutcomeClass] : 'Not classified';

/**
 * The pause card. It never tells the user they traded badly — it reports a
 * pattern and asks for a written review before the next plan.
 *
 * Every ceiling is stated in R first, then in dollars derived from the current
 * trading account balance.
 */
export default function CircuitBreakerCard() {
  const {
    assessment,
    tally,
    limits,
    oneR,
    heatPct,
    contributing,
    lastReview,
    completeReview,
    isSaving,
  } = useCircuitBreaker();
  const [notes, setNotes] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const { daily, weekly, consecutive } = assessment.breakers;
  const tripped = assessment.tripped;

  // One review at a time: the widest live breaker is the one asked for first.
  const active: BreakerKey | null = assessment.reviewsRequired[0] ?? null;
  const activeTrades = useMemo(() => {
    if (active === 'DAILY') return contributing.daily;
    if (active === 'WEEKLY') return contributing.weekly;
    if (active === 'CONSECUTIVE') return contributing.consecutive;
    return [];
  }, [active, contributing]);

  const statusTone = tripped
    ? 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber'
    : 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime';

  const submit = async () => {
    if (!active) return;
    if (notes.trim().length < 40) {
      toast.error('Write a little more — the review is the point of the pause');
      return;
    }
    if (active === 'CONSECUTIVE') {
      const unanswered = CONSECUTIVE_REVIEW_QUESTIONS.filter(
        (q) => !(answers[q] ?? '').trim(),
      ).length;
      if (unanswered > 0) {
        toast.error(`Answer all ${CONSECUTIVE_REVIEW_QUESTIONS.length} questions — ${unanswered} left`);
        return;
      }
    }
    try {
      await completeReview({ breaker: active, notes: notes.trim(), answers });
      toast.success('Review saved — you can plan again');
      setNotes('');
      setAnswers({});
    } catch {
      toast.error('Could not save that review');
    }
  };

  return (
    <Card className={tripped ? 'border-prism-amber/50' : undefined}>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          {tripped ? (
            <AlertTriangle className="h-4 w-4 text-prism-amber" />
          ) : (
            <ShieldCheck className="h-4 w-4 text-prism-lime" />
          )}
          Trading pause
          <Badge variant="outline" className={`${statusTone} text-[10px] uppercase`}>
            {assessment.headline}
          </Badge>
          <span className="text-xs font-normal text-muted-foreground">
            1R = {money(oneR)} · limits move with your account balance
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {assessment.reason ??
            'Nothing is stopping you from planning a trade. These limits are the ones you set yourself, and they are here to catch a losing run before it turns into a bigger decision.'}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Today</p>
            <p className="mt-1 text-lg font-semibold">{money(tally.dailyLoss)}</p>
            <p className="text-xs text-muted-foreground">
              {daily.usedR}R of {limits.dailyLossR}R · {money(daily.limit)}
            </p>
            <Progress value={daily.pct} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">This week</p>
            <p className="mt-1 text-lg font-semibold">{money(tally.weeklyLoss)}</p>
            <p className="text-xs text-muted-foreground">
              {weekly.usedR}R of {limits.weeklyLossR}R · {money(weekly.limit)}
            </p>
            <Progress value={weekly.pct} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Consecutive losses
            </p>
            <p className="mt-1 text-lg font-semibold">
              {tally.consecutiveLosses}
              <span className="text-xs font-normal text-muted-foreground">
                {' '}
                of {limits.consecutiveLosses}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">Any dollar amount, any day</p>
            <Progress value={consecutive.pct} className="mt-2 h-1.5" />
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              Portfolio heat
            </p>
            <p className="mt-1 text-lg font-semibold">{heatPct}%</p>
            <p className="text-xs text-muted-foreground">
              of {limits.maxPortfolioHeatPct}% · {money(assessment.heat.limit)} open risk
            </p>
            <Progress
              value={
                limits.maxPortfolioHeatPct > 0
                  ? Math.min(100, Math.round((heatPct / limits.maxPortfolioHeatPct) * 100))
                  : 0
              }
              className="mt-2 h-1.5"
            />
          </div>
        </div>

        {tripped ? (
          <div className="space-y-3 rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3">
            <p className="text-sm font-medium">
              {active === 'DAILY'
                ? 'Daily trading pause — daily review required'
                : active === 'WEEKLY'
                  ? 'Weekly trading pause — weekly review required'
                  : 'Review required'}
            </p>
            <p className="text-xs text-muted-foreground">
              Scanner, Analyzer, Watchlists, Academy, Journal, Performance and trade review all stay
              open. Only new paper trades wait for the review.
            </p>

            {activeTrades.length > 0 ? (
              <div className="rounded-md border bg-background/60">
                <p className="border-b px-3 py-2 text-xs font-medium">
                  {active === 'CONSECUTIVE'
                    ? 'The current run of losses'
                    : 'Trades behind this figure'}
                </p>
                <ul className="divide-y text-sm">
                  {activeTrades.slice(0, 8).map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                      <span className="font-medium">{t.symbol}</span>
                      <span className="text-xs text-muted-foreground">{t.exit_date}</span>
                      <span className="text-xs text-muted-foreground">
                        {money(t.realized_pl ?? 0)}
                        {oneR > 0
                          ? ` · ${Math.round((Math.abs(t.realized_pl ?? 0) / oneR) * 100) / 100}R`
                          : ''}
                      </span>
                      <Badge variant="outline" className="ml-auto text-[10px]">
                        {outcomeLabel(t.outcome_class)}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <p className="border-t px-3 py-2 text-xs text-muted-foreground">
                  A trade that followed the plan and lost 1R is a good loss. Losing money is not the
                  same as trading badly.
                </p>
              </div>
            ) : null}

            {active === 'CONSECUTIVE' ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Three losses in a row do not mean the strategy failed. Answer these to tell
                  ordinary variance from an execution problem.
                </p>
                {CONSECUTIVE_REVIEW_QUESTIONS.map((q) => (
                  <div key={q} className="space-y-1">
                    <label className="text-xs font-medium">{q}</label>
                    <Textarea
                      value={answers[q] ?? ''}
                      onChange={(e) => setAnswers((prev) => ({ ...prev, [q]: e.target.value }))}
                      rows={2}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {assessment.reviewSteps.map((step) => (
                  <li key={step} className="flex gap-2">
                    <span className="text-prism-amber">·</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            )}

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                active === 'DAILY'
                  ? DAILY_REVIEW_PROMPT
                  : active === 'WEEKLY'
                    ? WEEKLY_REVIEW_PROMPT
                    : 'What happened across these trades, and what will you do differently?'
              }
              rows={4}
            />
            <Button onClick={submit} disabled={isSaving} size="sm">
              Save review and continue
            </Button>
            <p className="text-xs text-muted-foreground">
              This is risk control and learning, not punishment. It does not stop an order at your
              broker — it stops SwingEdge approving the next plan, which is usually the trade that
              costs the most.
            </p>
          </div>
        ) : lastReview ? (
          <div className="flex gap-2 rounded-lg border p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
            <span>
              <span className="font-medium text-foreground">Last review: </span>
              {lastReview}
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
