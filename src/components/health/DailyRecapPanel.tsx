import { useMemo } from 'react';
import { Dumbbell, Footprints, StretchHorizontal, Flame, Trophy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useHealthLogs, useHealthProfile, useTodayLog } from '@/hooks/use-health';
import { weeklyHealthScore, todayISO, addDays } from '@/lib/health/healthEngine';

type Session = Record<string, unknown>;

const KINDS = [
  { key: 'strength', label: 'Strength', icon: Dumbbell, tone: 'text-prism-orange' },
  { key: 'cardio', label: 'Cardio', icon: Footprints, tone: 'text-prism-teal' },
  { key: 'stretch', label: 'Stretch', icon: StretchHorizontal, tone: 'text-primary' },
] as const;

/**
 * Daily recap: session counts by type and how today's movement feeds the
 * Weekly Health Score (movement is the 30-point pillar).
 */
export default function DailyRecapPanel() {
  const { data: today } = useTodayLog();
  const { data: logs = [] } = useHealthLogs();
  const { data: profile } = useHealthProfile();

  const recap = useMemo(() => {
    const t = today as Record<string, unknown> | undefined;
    const sessions: Session[] = Array.isArray(t?.workout_sessions) ? (t!.workout_sessions as Session[]) : [];

    const counts = { strength: 0, cardio: 0, stretch: 0 };
    const minutes = { strength: 0, cardio: 0, stretch: 0 };
    for (const s of sessions) {
      const raw = String(s.kind ?? 'strength');
      const kind = raw === 'cardio' || raw === 'stretch' ? raw : 'strength';
      counts[kind] += 1;
      minutes[kind] += Math.round((Number(s.seconds) || 0) / 60);
    }

    // Cardio logged from the walking/jogging card lands on miles + minutes_walked
    // rather than as a session entry, so credit it here too.
    const miles = Number(t?.miles) || 0;
    const walkMins = Number(t?.minutes_walked) || 0;
    if (counts.cardio === 0 && (miles > 0 || walkMins > 0)) {
      counts.cardio = 1;
      minutes.cardio = walkMins;
    }

    const burn = Math.round(Number(t?.exercise_calories) || 0);
    const totalSessions = counts.strength + counts.cardio + counts.stretch;
    return { counts, minutes, miles, burn, totalSessions };
  }, [today]);

  const score = useMemo(() => weeklyHealthScore(logs as never, (profile ?? null) as never), [logs, profile]);

  const movementDaysThisWeek = useMemo(() => {
    const start = addDays(todayISO(), -6);
    return (logs as Array<Record<string, unknown>>).filter((l) => {
      const d = String(l.log_date);
      if (d < start || d > todayISO()) return false;
      const hasSession = Array.isArray(l.workout_sessions) && (l.workout_sessions as unknown[]).length > 0;
      return hasSession || (Number(l.exercise_calories) || 0) > 0 || (Number(l.miles) || 0) > 0;
    }).length;
  }, [logs]);

  const walkDaysGoal = Math.max(1, Number((profile as Record<string, unknown> | null)?.walk_days_per_week) || 6);
  const movedToday = recap.totalSessions > 0 || recap.burn > 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-prism-amber" /> Daily recap
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          {KINDS.map(({ key, label, icon: Icon, tone }) => (
            <div key={key} className="rounded-lg border bg-muted/20 p-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Icon className={`h-4 w-4 ${tone}`} /> {label}
              </div>
              <p className="mt-1 text-2xl font-semibold tabular-nums">{recap.counts[key]}</p>
              <p className="text-xs text-muted-foreground">
                {recap.counts[key] === 0
                  ? 'None logged yet'
                  : `${recap.minutes[key]} min${key === 'cardio' && recap.miles > 0 ? ` · ${recap.miles.toFixed(2)} mi` : ''}`}
              </p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2 text-sm">
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-prism-orange" /> Calories burned today
          </span>
          <span className="tabular-nums font-medium">{recap.burn} cal</span>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Weekly Health Score</p>
            <Badge variant={score.band === 'green' ? 'default' : 'secondary'}>{score.total}/100</Badge>
          </div>
          <Progress value={score.total} />

          <div className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Movement pillar (from your sessions)</span>
              <span className="tabular-nums font-medium">{score.walking}/30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Nutrition</span>
              <span className="tabular-nums">{score.nutrition}/30</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Protein</span>
              <span className="tabular-nums">{score.protein}/20</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Water</span>
              <span className="tabular-nums">{score.water}/10</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Weigh-in tracking</span>
              <span className="tabular-nums">{score.tracking}/10</span>
            </div>
          </div>

          <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            {movedToday
              ? `Today counts as a movement day — ${movementDaysThisWeek} of ${walkDaysGoal} this week, worth ${score.walking} of 30 points. Any strength, cardio or stretch session earns the full day; extra sessions add calories but not extra points.`
              : `No movement logged yet today. One strength, cardio or stretch session earns the day and lifts the movement pillar toward its 30 points (${movementDaysThisWeek} of ${walkDaysGoal} days so far this week).`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
