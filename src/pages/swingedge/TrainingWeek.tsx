import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import CollapsibleSection from '@/components/swingedge/CollapsibleSection';
import DailyChecklistCard from '@/components/swingedge/DailyChecklistCard';
import CircuitBreakerCard from '@/components/swingedge/CircuitBreakerCard';
import WeeklyReviewSection from '@/components/swingedge/WeeklyReviewSection';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useTrainingProgress } from '@/hooks/use-swingedge-training';
import { TRAINING_WEEKS, weekCompletion } from '@/lib/swingedge/training';
import { curriculumFor, drillCount, lessonsForDay } from '@/lib/swingedge/curriculum';

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

const COUNTERS: { key: keyof CounterState; label: string }[] = [
  { key: 'lessons_completed', label: 'Lessons finished' },
  { key: 'charts_analyzed', label: 'Charts read' },
  { key: 'setups_analyzed', label: 'Setups named' },
  { key: 'candidates_built', label: 'Plans built' },
  { key: 'paper_trades_taken', label: 'Paper trades' },
];

/** Drill ticks are personal working notes, so they stay on the device. */
function useDrillTicks(week: number) {
  const storageKey = `swingedge-drills:week-${week}`;
  const [ticks, setTicks] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  });

  const toggle = useCallback(
    (id: string, value: boolean) => {
      setTicks((prev) => {
        const next = { ...prev, [id]: value };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          /* private mode — state only */
        }
        return next;
      });
    },
    [storageKey],
  );

  return { ticks, toggle };
}

export default function TrainingWeek() {
  const params = useParams<{ week: string }>();
  const weekNumber = Math.min(6, Math.max(1, Number(params.week) || 1));
  const week = TRAINING_WEEKS[weekNumber - 1];
  const plan = curriculumFor(weekNumber);

  useTradingTitle(`Week ${weekNumber} — ${week.title}`);
  const { settings } = useTradingSettings();
  const { byWeek, saveWeek, isSaving } = useTrainingProgress();
  const { ticks, toggle } = useDrillTicks(weekNumber);

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
  const targetPct = weekCompletion(week, progress);

  const totalDrills = plan ? drillCount(plan) : 0;
  const tickedDrills = useMemo(
    () => Object.entries(ticks).filter(([, v]) => v).length,
    [ticks],
  );
  const drillPct = totalDrills ? Math.round((Math.min(tickedDrills, totalDrills) / totalDrills) * 100) : 0;

  const targets = week.targets;
  const targetFor = (key: keyof CounterState): number | undefined =>
    ({
      lessons_completed: targets.lessons,
      charts_analyzed: targets.chartsAnalyzed,
      setups_analyzed: targets.setupsAnalyzed,
      candidates_built: targets.candidatesBuilt,
      paper_trades_taken: targets.paperTrades,
    })[key];

  const setCounter = async (key: keyof CounterState, value: number) => {
    try {
      await saveWeek({ week: weekNumber, progress: { [key]: Math.max(0, value) } });
    } catch {
      toast.error('Could not save that');
    }
  };

  const bumpCounter = (key: keyof CounterState) => setCounter(key, progress[key] + 1);

  const tradingWeek = weekNumber >= 4;

  return (
    <div className="space-y-6 p-4 md:p-6">
      <SwingEdgeHeader
        title={`Week ${weekNumber} — ${week.title}`}
        subtitle={week.focus}
        mode={settings.data_mode}
        right={
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost">
              <Link to="/swingedge/training">
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> All six weeks
              </Link>
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {TRAINING_WEEKS.map((w) => {
          const isDone = !!byWeek.get(w.week)?.completed_at;
          return (
            <Button
              key={w.week}
              asChild
              size="sm"
              variant={w.week === weekNumber ? 'default' : 'outline'}
            >
              <Link to={`/swingedge/training/week/${w.week}`}>
                {isDone ? <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> : null}
                Week {w.week}
              </Link>
            </Button>
          );
        })}
      </div>

      <HowToUse
        steps={[
          'Read the outcome and the guardrails at the top. The guardrails matter more than the drills.',
          'Work through the five days in order, ticking each drill as you finish it.',
          'Update the week counters so the overview and the readiness panel stay honest.',
          'Write the weekly review at the end of the week, answering this week’s questions.',
        ]}
        tips={[
          'Days are working days, not calendar days. Taking eight days over week three costs you nothing.',
          'Ticks are your own working notes; the counters are what the readiness checks read.',
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              What this week is for
              {done ? (
                <Badge variant="outline" className="border-prism-lime/50 bg-prism-lime/10 text-prism-lime text-[10px]">
                  Marked done
                </Badge>
              ) : null}
            </CardTitle>
            <CardDescription>{plan?.outcome ?? week.doneWhen}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{week.intent}</p>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Drills ticked</span>
                <span>
                  {Math.min(tickedDrills, totalDrills)} of {totalDrills}
                </span>
              </div>
              <Progress value={drillPct} className="h-1.5" />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Week targets</span>
                <span>{targetPct}%</span>
              </div>
              <Progress value={targetPct} className="h-1.5" />
            </div>
            <p className="rounded-lg border bg-muted/30 p-3 text-sm">
              <span className="font-medium">Move on when: </span>
              {week.doneWhen}
            </p>
            <Button
              size="sm"
              variant={done ? 'outline' : 'default'}
              disabled={isSaving}
              onClick={() => saveWeek({ week: weekNumber, progress: {}, completed: !done })}
            >
              {done ? 'Reopen this week' : 'Mark this week done'}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-prism-amber/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Guardrails for week {weekNumber}</CardTitle>
            <CardDescription>Breaking one of these makes the week worth repeating.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2 text-sm">
              {(plan?.guardrails ?? []).map((g) => (
                <li key={g} className="flex gap-2">
                  <span className="text-prism-amber">·</span>
                  <span>{g}</span>
                </li>
              ))}
            </ul>
            <div className="grid gap-3 sm:grid-cols-2">
              {COUNTERS.filter((c) => targetFor(c.key) !== undefined).map((c) => (
                <div key={c.key} className="space-y-1.5">
                  <Label className="text-xs">
                    {c.label} <span className="text-muted-foreground">of {targetFor(c.key)}</span>
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={progress[c.key]}
                      onChange={(e) => setCounter(c.key, Number(e.target.value))}
                      disabled={isSaving}
                    />
                    <Button size="sm" variant="outline" disabled={isSaving} onClick={() => bumpCounter(c.key)}>
                      +1
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {tradingWeek ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <DailyChecklistCard />
          <CircuitBreakerCard />
        </div>
      ) : (
        <Alert>
          <AlertTitle className="text-sm">No trades this week</AlertTitle>
          <AlertDescription className="text-xs">
            Weeks one to three place no trades at all. That is deliberate: most beginner losses come from trading
            before the market can be read. Paper trading starts in week four.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">The five days</h2>
        {(plan?.days ?? []).map((day) => {
          const lessons = lessonsForDay(day);
          const dayTicks = day.drills.map((_, i) => ticks[`d${day.day}-${i}`] === true);
          const allDone = dayTicks.every(Boolean);
          return (
            <CollapsibleSection
              key={day.day}
              id={`training-w${weekNumber}-day-${day.day}`}
              title={`Day ${day.day} — ${day.title}`}
              description={day.why}
              defaultOpen={!allDone}
              className={allDone ? 'border-prism-lime/40' : undefined}
              headerRight={
                <Badge variant="outline" className="text-[10px]">
                  {dayTicks.filter(Boolean).length}/{day.drills.length}
                </Badge>
              }
            >
              <div className="space-y-4 pt-1">
                {lessons.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Read first
                    </p>
                    {lessons.map((l) => (
                      <div key={l.key} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{l.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {l.module} ·{' '}
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {l.minutes} min
                            </span>
                          </p>
                        </div>
                        <Button asChild size="sm" variant="ghost" className="shrink-0">
                          <Link to={`/swingedge/academy?lesson=${l.key}`}>
                            <BookOpen className="mr-1 h-3.5 w-3.5" /> Read
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Today’s drills</p>
                  {day.drills.map((drill, i) => {
                    const id = `d${day.day}-${i}`;
                    return (
                      <label key={drill} className="flex cursor-pointer gap-3">
                        <Checkbox
                          checked={ticks[id] === true}
                          onCheckedChange={(v) => toggle(id, v === true)}
                          className="mt-0.5"
                        />
                        <span className={cn('text-sm', ticks[id] === true && 'text-muted-foreground line-through')}>
                          {drill}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-2">
                  {day.practice ? (
                    <Button asChild size="sm" variant="outline">
                      <Link to={day.practice.to}>
                        {day.practice.label} <ExternalLink className="ml-1 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  ) : null}
                  {day.counter && targetFor(day.counter) !== undefined ? (
                    <Button size="sm" variant="ghost" disabled={isSaving} onClick={() => bumpCounter(day.counter!)}>
                      Count one more {COUNTERS.find((c) => c.key === day.counter)?.label.toLowerCase()}
                    </Button>
                  ) : null}
                </div>
              </div>
            </CollapsibleSection>
          );
        })}
      </div>

      <WeeklyReviewSection
        id={`training-w${weekNumber}-review`}
        prompts={plan?.reviewPrompts}
        defaultOpen={drillPct === 100}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" size="sm" disabled={weekNumber === 1}>
          <Link to={`/swingedge/training/week/${Math.max(1, weekNumber - 1)}`}>
            <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Week {Math.max(1, weekNumber - 1)}
          </Link>
        </Button>
        {weekNumber < 6 ? (
          <Button asChild size="sm">
            <Link to={`/swingedge/training/week/${weekNumber + 1}`}>
              Week {weekNumber + 1} <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        ) : (
          <Button asChild size="sm">
            <Link to="/swingedge/training">
              Check your readiness <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
