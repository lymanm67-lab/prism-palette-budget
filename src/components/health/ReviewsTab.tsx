import { useMemo, useState } from 'react';
import { CalendarDays, ClipboardList } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHealthLogs, useHealthMeals, useHealthProfile } from '@/hooks/use-health';
import { mergeMealsIntoLogs } from '@/lib/health/mealRollup';
import { formatDate, type DailyLog } from '@/lib/health/healthEngine';
import {
  MONTHLY_REVIEW_QUESTION,
  maintenanceReadiness,
  monthlyReview,
  weeklyReview,
  type PeriodReview,
} from '@/lib/health/reviews';
import { JOURNAL_PROMPTS } from '@/lib/health/longevityHabits';

const val = (n: number | null | undefined, suffix = '', digits = 1) =>
  n == null ? '—' : `${n.toFixed(digits)}${suffix}`;

function ReviewBlock({ r }: { r: PeriodReview }) {
  const rows: [string, string][] = [
    ['Starting weight', val(r.startWeight, ' lbs')],
    ['Ending weight', val(r.endWeight, ' lbs')],
    ['Average weight', val(r.avgWeight, ' lbs')],
    ['Weight change', r.weightChange == null ? '—' : `${r.weightChange > 0 ? '+' : ''}${r.weightChange.toFixed(1)} lbs`],
    ['Miles walked', val(r.miles, ' mi')],
    ['Walking days', String(r.walkDays)],
    ['Strength workouts', String(r.strengthSessions)],
    ['Average calories', val(r.avgCalories, '', 0)],
    ['Average protein', val(r.avgProtein, 'g', 0)],
    ['Average sleep', val(r.avgSleep, ' h')],
    ['Average water', val(r.avgWater, ' oz', 0)],
    ['Mood trend', val(r.moodTrend, '/10')],
    ['Energy trend', val(r.energyTrend, '/10')],
    ['Days logged', String(r.daysLogged)],
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(([k, v]) => (
          <p key={k} className="flex justify-between border-b border-border/40 py-1">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </p>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-prism-teal/40 bg-prism-teal/5 p-3">
          <p className="text-sm font-semibold">Wins</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {r.wins.length ? r.wins.map((w) => <li key={w}>• {w}</li>) : <li>Log a few days to see wins.</li>}
          </ul>
        </div>
        <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3">
          <p className="text-sm font-semibold">Challenges</p>
          <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
            {r.challenges.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid gap-2 text-sm sm:grid-cols-3">
        <p className="rounded-lg border p-3">
          <span className="text-muted-foreground">Priority next: </span>
          {r.priority}
        </p>
        <p className="rounded-lg border p-3">
          <span className="text-muted-foreground">Keep doing: </span>
          {r.continueHabit}
        </p>
        <p className="rounded-lg border p-3">
          <span className="text-muted-foreground">Improve: </span>
          {r.improveHabit}
        </p>
      </div>
    </div>
  );
}

/** Sections 21 and 22: weekly and monthly reviews, plus the journal prompts. */
export default function ReviewsTab() {
  const { data: logs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const { data: profile } = useHealthProfile();
  const [weekOffset, setWeekOffset] = useState(0);

  const merged = useMemo(
    () => mergeMealsIntoLogs(logs as Record<string, unknown>[], meals) as unknown as DailyLog[],
    [logs, meals],
  );
  const week = useMemo(
    () => weeklyReview(merged as never, (profile ?? null) as never, weekOffset),
    [merged, profile, weekOffset],
  );
  const month = useMemo(() => monthlyReview(merged as never, (profile ?? null) as never), [merged, profile]);
  const readiness = useMemo(() => maintenanceReadiness(merged as never), [merged]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4 text-primary" /> Weekly Health Review
              </CardTitle>
              <CardDescription>
                {week.label} · {formatDate(week.start)} to {formatDate(week.end)}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setWeekOffset((o) => o - 1)}>
                Previous
              </Button>
              <Button size="sm" variant="outline" disabled={weekOffset >= 0} onClick={() => setWeekOffset((o) => o + 1)}>
                Next
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ReviewBlock r={week} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-4 w-4 text-prism-teal" /> Monthly Longevity Review
          </CardTitle>
          <CardDescription>{month.label}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ReviewBlock r={month} />
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Maintenance readiness</p>
            <p className="text-sm text-muted-foreground">{readiness.note}</p>
            {readiness.ready && <Badge className="mt-2">Ready for maintenance</Badge>}
          </div>
          <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm font-medium">
            {MONTHLY_REVIEW_QUESTION}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Reflection prompts</CardTitle>
          <CardDescription>Two minutes at night keeps the habits honest.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
          {JOURNAL_PROMPTS.map((p) => (
            <p key={p} className="rounded-lg border p-3">
              {p}
            </p>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
