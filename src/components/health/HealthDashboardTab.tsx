import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Footprints, TrendingDown, Sparkles, Quote } from 'lucide-react';
import HealthRing from './HealthRing';
import QuickLogPanel from './QuickLogPanel';
import AnimatedNumber from '@/components/AnimatedNumber';
import { useHealthLogs, useHealthMeals, useHealthProfile } from '@/hooks/use-health';
import { mergeMealsIntoLogs } from '@/lib/health/mealRollup';
import {
  bmiBand,
  fmtMiles,
  formatDate,
  formatPace,
  motivationForToday,
  todayISO,

  walkTotals,
  weeklyHealthScore,
  weightStatus,
} from '@/lib/health/healthEngine';


const bandTone = {
  green: 'bg-prism-lime/15 text-prism-lime border-prism-lime/30',
  yellow: 'bg-prism-amber/15 text-prism-amber border-prism-amber/30',
  red: 'bg-prism-rose/15 text-prism-rose border-prism-rose/30',
} as const;

const bandLabel = { green: 'Excellent', yellow: 'Needs attention', red: 'Action required' } as const;

export default function HealthDashboardTab() {
  const { data: profile, isLoading } = useHealthProfile();
  const { data: rawLogs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();

  // Meals/drinks logged in Nutrition roll into the daily-log numbers so the
  // Command Center reflects everything that was actually logged.
  const logs = useMemo(() => mergeMealsIntoLogs(rawLogs as any[], meals as any[]), [rawLogs, meals]);
  const todayKey = todayISO();
  const today = useMemo(
    () => (logs as any[]).find((l) => l.log_date === todayKey),
    [logs, todayKey],
  );

  if (isLoading || !profile) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-48 w-full" />
        ))}
      </div>
    );
  }

  const status = weightStatus(profile, logs as any);
  const totals = walkTotals(logs as any, profile);
  const score = weeklyHealthScore(logs as any, profile);
  const weeklyGoal = profile.daily_miles_goal * profile.walk_days_per_week;
  const band = bmiBand(status?.bmi ?? null);

  const proteinPct = (today?.protein_g ?? 0) / (profile.protein_goal_g || 1);
  const waterPct = (today?.water_oz ?? 0) / (profile.water_goal_oz || 1);


  return (
    <div className="space-y-6">
      {/* Hero: weight + score */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2 overflow-hidden border-0 prism-gradient">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div className="text-prism-on-dark">
                <p className="text-xs uppercase tracking-wide text-prism-on-dark-muted">
                  Primary health goal
                </p>
                <p className="mt-1 text-4xl font-bold tabular-nums">
                  <AnimatedNumber
                    value={status?.current ?? profile.current_weight}
                    formatFn={(n) => n.toFixed(1)}
                  />
                  <span className="ml-1 text-lg font-medium">lb</span>
                </p>
                <p className="mt-1 text-sm text-prism-on-dark-muted">
                  {profile.start_weight} lb start → {profile.goal_weight} lb goal
                </p>
                <div className="mt-4 flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-prism-on-dark-muted">Pounds lost</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {(status?.lost ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-prism-on-dark-muted">Remaining</p>
                    <p className="text-xl font-semibold tabular-nums">
                      {(status?.remaining ?? 0).toFixed(1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-prism-on-dark-muted">Est. goal date</p>
                    <p className="text-xl font-semibold">
                      {formatDate(status?.projectedGoalDate ?? profile.target_date)}
                    </p>
                    <p className="text-xs text-prism-on-dark-muted">
                      {status?.lbsPerWeek && status.lbsPerWeek > 0.05
                        ? `at ${status.lbsPerWeek.toFixed(1)} lb/week actual`
                        : 'at planned 1.5 lb/week'}
                    </p>
                  </div>

                </div>
              </div>
              <HealthRing
                value={status?.progressPct ?? 0}
                size={148}
                primary={`${Math.round((status?.progressPct ?? 0) * 100)}%`}
                secondary="to goal"
                tone="amber"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Weekly Health Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums">{score.total}</span>
              <span className="text-muted-foreground">/ 100</span>
              <Badge variant="outline" className={bandTone[score.band]}>
                {bandLabel[score.band]}
              </Badge>
            </div>
            {([
              ['Walking', score.walking, 30],
              ['Nutrition', score.nutrition, 30],
              ['Protein', score.protein, 20],
              ['Water', score.water, 10],
              ['Weight tracking', score.tracking, 10],
            ] as const).map(([label, val, max]) => (
              <div key={label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="tabular-nums">
                    {val}/{max}
                  </span>
                </div>
                <Progress value={(val / max) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Rings */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex justify-center p-6">
            <HealthRing
              value={totals.week / (weeklyGoal || 1)}
              primary={fmtMiles(totals.week)}
              secondary={`of ${weeklyGoal.toFixed(1)} mi`}
              label="Weekly mileage"
              tone="teal"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex justify-center p-6">
            <HealthRing
              value={totals.today / (profile.daily_miles_goal || 1)}
              primary={fmtMiles(totals.today)}
              secondary={`of ${profile.daily_miles_goal} mi`}
              label="Today's walk"
              tone="lime"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex justify-center p-6">
            <HealthRing
              value={proteinPct}
              primary={`${Math.round(today?.protein_g ?? 0)}g`}
              secondary={`of ${profile.protein_goal_g}g`}
              label="Protein today"
              tone="amber"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex justify-center p-6">
            <HealthRing
              value={waterPct}
              primary={`${Math.round(today?.water_oz ?? 0)}oz`}
              secondary={`of ${profile.water_goal_oz}oz`}
              label="Water today"
              tone="sky"
            />
          </CardContent>
        </Card>
      </div>

      {/* Walking dashboard stats */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Footprints className="h-4 w-4 text-prism-teal" /> Walking dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
            {([
              ['Today', fmtMiles(totals.today)],
              ['This week', fmtMiles(totals.week)],
              ['This month', fmtMiles(totals.month)],
              ['This year', fmtMiles(totals.year)],
              ['Lifetime', fmtMiles(totals.lifetime)],
              ['Days hit this week', `${totals.weekDaysHit}/${profile.walk_days_per_week}`],
              ['Current streak', `${totals.streak} d`],
              ['Longest streak', `${totals.longestStreak} d`],
              ['Average pace', formatPace(totals.avgPace)],
              ['Calories burned', Math.round(totals.calories).toLocaleString()],
              ['Time walked', `${Math.round(totals.minutes)} min`],
              ['Est. fat burned', `${totals.fatPounds.toFixed(1)} lb`],
              ['Active minutes', `${totals.activeMinutes.toLocaleString()}`],
              ['Steps logged', totals.steps.toLocaleString()],
            ] as const).map(([label, val]) => (
              <div key={label} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{val}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Body metrics + motivation */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-prism-lime" /> Body composition
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">BMI</p>
                <p className="text-lg font-semibold tabular-nums">
                  {status?.bmi ? status.bmi.toFixed(1) : '—'}
                </p>
                <p className="text-xs text-muted-foreground">{band.label}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Waist</p>
                <p className="text-lg font-semibold tabular-nums">
                  {status?.waist ? `${status.waist}"` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Est. body fat</p>
                <p className="text-lg font-semibold tabular-nums">
                  {status?.bodyFat ? `${status.bodyFat.toFixed(1)}%` : '—'}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Trailing rate</p>
                <p className="text-lg font-semibold tabular-nums">
                  {status?.lbsPerWeek ? `${status.lbsPerWeek.toFixed(2)} lb/wk` : '—'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-prism-amber/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Quote className="h-4 w-4 text-prism-amber" /> Motivation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium leading-relaxed">{motivationForToday()}</p>
            <p className="text-xs text-muted-foreground">{motivationForToday(1)}</p>
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-prism-orange" />
              {totals.streak > 0
                ? `${totals.streak}-day walking streak alive.`
                : 'Start a new streak with today’s walk.'}
            </div>
          </CardContent>
        </Card>
      </div>

      <QuickLogPanel />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Educational tracking only. Body-fat, calorie and longevity figures are estimates, not medical
        advice. Talk with your physician before changing diet or exercise.
      </p>
    </div>
  );
}
