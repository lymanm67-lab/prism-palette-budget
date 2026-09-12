import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowRight, CheckCircle2, Circle, Download, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import CircuitBreakerCard from '@/components/swingedge/CircuitBreakerCard';
import DailyChecklistCard from '@/components/swingedge/DailyChecklistCard';
import WeeklyReviewSection from '@/components/swingedge/WeeklyReviewSection';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { usePaperTradeManagement } from '@/hooks/use-swingedge-stops';
import { useGraduation, useTrainingProgress } from '@/hooks/use-swingedge-training';
import { TRAINING_WEEKS, downloadCsv, toCsv, weekCompletion } from '@/lib/swingedge/training';
import { curriculumFor } from '@/lib/swingedge/curriculum';

const COUNTERS: { key: keyof CounterState; label: string }[] = [
  { key: 'lessons_completed', label: 'Lessons finished' },
  { key: 'charts_analyzed', label: 'Charts read' },
  { key: 'setups_analyzed', label: 'Setups named' },
  { key: 'candidates_built', label: 'Plans built' },
  { key: 'paper_trades_taken', label: 'Paper trades' },
];

interface CounterState {
  lessons_completed: number;
  charts_analyzed: number;
  setups_analyzed: number;
  candidates_built: number;
  paper_trades_taken: number;
}

const EMPTY: CounterState = {
  lessons_completed: 0,
  charts_analyzed: 0,
  setups_analyzed: 0,
  candidates_built: 0,
  paper_trades_taken: 0,
};

/* ------------------------------------------------------------ graduation */

function GraduationPanel() {
  const { result, closedCount } = useGraduation();
  const tone =
    result.status === 'READY_FOR_SMALL_LIVE'
      ? { dot: 'bg-prism-lime', badge: 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime' }
      : result.status === 'BUILDING'
        ? { dot: 'bg-prism-amber', badge: 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber' }
        : { dot: 'bg-prism-rose', badge: 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose' };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex flex-wrap items-center gap-2 text-base">
          <span className={cn('h-2.5 w-2.5 rounded-full', tone.dot)} />
          <GraduationCap className="h-4 w-4 text-muted-foreground" />
          Are you ready for real money?
          <Badge variant="outline" className={cn('text-[10px]', tone.badge)}>
            {result.passedCount} of {result.checks.length} checks
          </Badge>
        </CardTitle>
        <CardDescription>{result.headline}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Not one of these checks is about how much money you made. Six weeks of paper trading is far too short
          a run to tell profit from luck, but it is long enough to show your habits — and habits are what carry
          over to real money.
        </p>
        <div className="space-y-2">
          {result.checks.map((check) => (
            <div key={check.label} className="flex gap-3 rounded-lg border p-3">
              {check.passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-prism-lime" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted-foreground">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <Alert>
          <AlertTitle className="text-sm">Read this before your first live trade</AlertTitle>
          <AlertDescription className="text-xs">{result.caveat}</AlertDescription>
        </Alert>
        {closedCount === 0 ? (
          <Button asChild variant="outline" size="sm">
            <Link to="/swingedge/planner">
              Build your first plan <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* --------------------------------------------------------------- one week */

function WeekCard({ weekNumber }: { weekNumber: number }) {
  const week = TRAINING_WEEKS[weekNumber - 1];
  const { byWeek, saveWeek, isSaving } = useTrainingProgress();
  const stored = byWeek.get(weekNumber);
  const progress: CounterState = stored
    ? {
        lessons_completed: stored.lessons_completed,
        charts_analyzed: stored.charts_analyzed,
        setups_analyzed: stored.setups_analyzed,
        candidates_built: stored.candidates_built,
        paper_trades_taken: stored.paper_trades_taken,
      }
    : EMPTY;
  const done = !!stored?.completed_at;
  const pct = weekCompletion(week, progress);

  const bump = async (key: keyof CounterState, value: number) => {
    try {
      await saveWeek({ week: weekNumber, progress: { [key]: Math.max(0, value) } });
    } catch {
      toast.error('Could not save that');
    }
  };

  const targets = week.targets;
  const targetFor = (key: keyof CounterState): number | undefined =>
    ({
      lessons_completed: targets.lessons,
      charts_analyzed: targets.chartsAnalyzed,
      setups_analyzed: targets.setupsAnalyzed,
      candidates_built: targets.candidatesBuilt,
      paper_trades_taken: targets.paperTrades,
    })[key];

  return (
    <CollapsibleSection
      id={`training-week-${weekNumber}`}
      title={`Week ${weekNumber} — ${week.title}`}
      description={`${week.focus} · ${pct}% of this week's targets`}
      defaultOpen={!done && pct < 100}
      className={done ? 'border-prism-lime/40' : undefined}
    >
      <div className="space-y-4 pt-1">
        <Progress value={pct} className="h-1.5" />
        <p className="text-sm text-muted-foreground">{week.intent}</p>
        {curriculumFor(weekNumber)?.outcome ? (
          <p className="text-sm">
            <span className="font-medium">By Friday: </span>
            {curriculumFor(weekNumber)?.outcome}
          </p>
        ) : null}

        <div>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            This week
          </p>
          <ul className="space-y-1.5 text-sm">
            {week.activities.map((a) => (
              <li key={a} className="flex gap-2">
                <span className="text-prism-teal">·</span>
                <span>{a}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {COUNTERS.filter((c) => targetFor(c.key) !== undefined).map((c) => (
            <div key={c.key} className="space-y-1.5">
              <Label className="text-xs">
                {c.label}{' '}
                <span className="text-muted-foreground">of {targetFor(c.key)}</span>
              </Label>
              <Input
                type="number"
                min={0}
                value={progress[c.key]}
                onChange={(e) => bump(c.key, Number(e.target.value))}
                disabled={isSaving}
              />
            </div>
          ))}
        </div>

        <p className="rounded-lg border bg-muted/30 p-3 text-sm">
          <span className="font-medium">Move on when: </span>
          {week.doneWhen}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to={`/swingedge/training/week/${weekNumber}`}>
              Open week {weekNumber} day by day <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
          <Button
            size="sm"
            variant={done ? 'outline' : 'secondary'}
            disabled={isSaving}
            onClick={() => saveWeek({ week: weekNumber, progress: {}, completed: !done })}
          >
            {done ? 'Reopen this week' : 'Mark this week done'}
          </Button>
        </div>
      </div>
    </CollapsibleSection>
  );
}


/* -------------------------------------------------------------- the page */

export default function TrainingMode() {
  useTradingTitle('Six-week training');
  const { settings } = useTradingSettings();
  const { currentWeek } = useTrainingProgress();
  const { trades } = usePaperTradeManagement();

  const exportTrades = () => {
    const closed = trades.filter((t) => t.status === 'CLOSED');
    if (!closed.length) {
      toast.error('No closed trades to export yet');
      return;
    }
    const columns = [
      'symbol',
      'setup_type',
      'entry_date',
      'entry_price',
      'exit_date',
      'exit_price',
      'shares',
      'planned_loss',
      'actual_simulated_loss',
      'slippage',
      'gap_difference',
      'realized_pl',
      'execution_score',
      'signal_quality',
      'outcome_class',
      'exit_reason',
    ];
    downloadCsv(
      'swingedge-closed-trades.csv',
      toCsv(columns, closed as unknown as Record<string, unknown>[]),
    );
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SwingEdgeHeader
        title="Six-week training"
        subtitle="A structured way in: read the market first, place trades last"
        mode={settings.data_mode}
        right={
          <Button size="sm" variant="outline" onClick={exportTrades}>
            <Download className="mr-1 h-3.5 w-3.5" /> Export trades
          </Button>
        }
      />

      <HowToUse
        steps={[
          'Tick the five questions on the daily checklist before you plan anything.',
          'Work through the current week below and update the counts as you go.',
          'Write the weekly review every week, including the best trade you decided to skip.',
          'Check the readiness panel. Every box has to be green before you risk real money, and none of them is about profit.',
        ]}
        tips={[
          'Weeks 1 to 3 involve no trades at all. That is deliberate — most beginner losses come from trading before you can read the market.',
          'If a losing run pauses you, the pause exists for the review, not as a punishment. Write it and carry on.',
          'Taking longer than six weeks costs you nothing. Going live early can cost a lot.',
        ]}
        defaultOpen
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <DailyChecklistCard />
        <CircuitBreakerCard />
      </div>

      <GraduationPanel />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">The six weeks</h2>
          <Badge variant="outline" className="text-[10px]">
            Currently on week {currentWeek}
          </Badge>
        </div>
        {TRAINING_WEEKS.map((w) => (
          <WeekCard key={w.week} weekNumber={w.week} />
        ))}
      </div>

      <WeeklyReviewSection />
    </div>
  );
}
