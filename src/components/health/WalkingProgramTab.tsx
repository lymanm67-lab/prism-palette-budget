import { useMemo } from 'react';
import { Footprints, Dumbbell, Flame } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { useHealthLogs, useHealthProfile } from '@/hooks/use-health';
import { buildWalkingProgram, WALK_DAYS_GOAL, WEEKLY_MILE_TARGET } from '@/lib/health/walkingProgram';
import { formatDate } from '@/lib/health/healthEngine';

/** Section 4: the walking program — 6 days a week, 1–3 miles a day. */
export default function WalkingProgramTab() {
  const { data: logs = [] } = useHealthLogs();
  const { data: profile } = useHealthProfile();
  const wp = useMemo(() => buildWalkingProgram(logs as never, (profile ?? null) as never), [logs, profile]);

  const stats = [
    { label: 'Miles today', value: wp.todayMiles.toFixed(2) },
    { label: 'This week', value: wp.weekMiles.toFixed(1) },
    { label: 'This month', value: wp.monthMiles.toFixed(1) },
    { label: 'Walking days this week', value: `${wp.weekDaysWalked}/${WALK_DAYS_GOAL}` },
    { label: 'Average distance', value: wp.avgDaily ? `${wp.avgDaily.toFixed(2)} mi` : '—' },
    { label: 'Average pace', value: wp.avgPaceLabel },
    { label: 'Current streak', value: `${wp.streak} d` },
    { label: 'Longest streak', value: `${wp.longestStreak} d` },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-lg font-semibold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4 text-prism-teal" /> Progressive weekly target
          </CardTitle>
          <CardDescription>{wp.nextTargetNote}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>
              {wp.weekMiles.toFixed(1)} of {wp.weeklyTarget} miles this week
            </span>
            <span className="text-muted-foreground">
              Long-term band {WEEKLY_MILE_TARGET.min}–{WEEKLY_MILE_TARGET.max} mi
            </span>
          </div>
          <Progress value={wp.weekProgressPct} className="h-2" />
          <div className="flex items-center justify-between text-sm">
            <span>
              {wp.weekDaysWalked} of {WALK_DAYS_GOAL} walking days
            </span>
            {wp.fourWeekAvg != null && (
              <span className="text-muted-foreground">
                4-week average {wp.fourWeekAvg.toFixed(1)} mi/week
              </span>
            )}
          </div>
          <Progress value={wp.daysGoalPct} className="h-2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Suggested weekly schedule</CardTitle>
          <CardDescription>Build the habit first. Mileage follows consistency.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {wp.week.map((d) => {
            const hit = d.rest ? true : d.actualMiles >= d.planned * 0.75;
            return (
              <div
                key={d.date}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                  d.isToday && 'border-primary bg-primary/5',
                  d.isFuture && 'opacity-70',
                )}
              >
                <span className="w-24 text-sm font-semibold">{d.day}</span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">{d.note}</span>
                <span className="text-xs text-muted-foreground">{formatDate(d.date)}</span>
                {!d.rest && (
                  <Badge variant={hit ? 'secondary' : 'outline'}>{d.actualMiles.toFixed(1)} mi</Badge>
                )}
                {d.strengthPlanned && (
                  <Badge variant={d.strengthDone ? 'secondary' : 'outline'} className="gap-1">
                    <Dumbbell className="h-3 w-3" /> {d.strengthDone ? 'Done' : 'Total Gym'}
                  </Badge>
                )}
                {d.rest && <Badge variant="outline">Recovery</Badge>}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
          <Flame className="mt-0.5 h-4 w-4 shrink-0 text-prism-orange" />
          Walking is the cardiovascular base of the whole plan: 6 days a week at 1–3 miles builds to roughly
          {` ${WEEKLY_MILE_TARGET.min}–${WEEKLY_MILE_TARGET.max} `}miles a week without stressing your joints.
          Log distance from the Exercise tab — it flows straight into these totals.
        </CardContent>
      </Card>
    </div>
  );
}
