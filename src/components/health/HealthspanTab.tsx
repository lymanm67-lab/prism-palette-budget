import { useMemo } from 'react';
import { HeartPulse, Wallet, Activity } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle } from 'lucide-react';
import {
  useHealthAchievements,
  useHealthDelete,
  useHealthLogs,
  useHealthMeals,
  useHealthProfile,
  useHealthUpsert,
} from '@/hooks/use-health';
import { mergeMealsIntoLogs } from '@/lib/health/mealRollup';
import { todayISO, type DailyLog } from '@/lib/health/healthEngine';
import { buildWeightProgram } from '@/lib/health/weightProgram';
import { FUNCTIONAL_CHECKS } from '@/lib/health/walkingProgram';
import {
  DECADE_GOALS,
  HEALTHSPAN_FINANCIAL,
  longevityHabitsScore,
} from '@/lib/health/longevityHabits';
import HealthMissionBanner from '@/components/health/HealthMissionBanner';

/** Sections 13, 14, 19 and the Functional Longevity checks. */
export default function HealthspanTab() {
  const { data: logs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const { data: profile } = useHealthProfile();
  const { data: achievements = [] } = useHealthAchievements();
  const upsert = useHealthUpsert('health_achievements');
  const remove = useHealthDelete('health_achievements');

  const merged = useMemo(
    () => mergeMealsIntoLogs(logs as Record<string, unknown>[], meals) as unknown as DailyLog[],
    [logs, meals],
  );
  const wp = useMemo(() => buildWeightProgram((profile ?? null) as never, merged), [profile, merged]);
  const habits = useMemo(
    () =>
      longevityHabitsScore(merged as never, (profile ?? null) as never, {
        weightPct: wp.progressPct * 100,
      }),
    [merged, profile, wp.progressPct],
  );

  const fnByKey = new Map(
    (achievements as Record<string, unknown>[])
      .filter((a) => String(a.badge_key ?? '').startsWith('fn:'))
      .map((a) => [String(a.badge_key).slice(3), a]),
  );
  const toggleFn = (key: string, label: string) => {
    const existing = fnByKey.get(key);
    if (existing) remove.mutate(String(existing.id));
    else upsert.mutate({ badge_key: `fn:${key}`, label, earned_on: todayISO() });
  };

  const age = 59;

  return (
    <div className="space-y-6">
      <HealthMissionBanner />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartPulse className="h-4 w-4 text-prism-rose" /> Healthspan First
          </CardTitle>
          <CardDescription>
            Longevity Habits Score measures the behaviours that support healthy aging over the last 30 days. It
            does not predict life expectancy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-4">
            <p className="text-3xl font-bold">{habits.score}</p>
            <Badge variant={habits.band === 'green' ? 'secondary' : 'outline'}>
              {habits.band === 'green' ? 'Strong consistency' : habits.band === 'yellow' ? 'Building' : 'Getting started'}
            </Badge>
            {habits.strongest && (
              <p className="text-xs text-muted-foreground">
                Strongest: {habits.strongest} · Focus next: {habits.weakest}
              </p>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {habits.categories.map((c) => (
              <div key={c.key} className="space-y-1 rounded-lg border p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{c.label}</span>
                  <span className="text-muted-foreground">{c.pct}%</span>
                </div>
                <Progress value={c.pct} className="h-1.5" />
                <p className="text-xs text-muted-foreground">{c.note || c.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="h-4 w-4 text-prism-teal" /> Functional longevity checks
          </CardTitle>
          <CardDescription>Independence is the real fitness test. Tap each one you can do today.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-1 sm:grid-cols-2">
          {FUNCTIONAL_CHECKS.map((f) => {
            const hit = fnByKey.get(f.key);
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => toggleFn(f.key, f.label)}
                className="flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted/50"
              >
                {hit ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-prism-teal" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                {f.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Healthspan goals by decade</CardTitle>
          <CardDescription>
            Remain capable, mobile, mentally engaged, spiritually grounded, socially connected, and independent
            for as long as possible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {DECADE_GOALS.map((d) => (
            <div
              key={d.age}
              className={`rounded-lg border p-4 ${d.age <= age + 1 ? 'border-primary/50 bg-primary/5' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">Age {d.age}</span>
                {d.age <= age + 1 && <Badge>Current decade</Badge>}
              </div>
              <div className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
                {[
                  ['Weight', d.weight],
                  ['Walking', d.walking],
                  ['Strength', d.strength],
                  ['Mobility', d.mobility],
                  ['Balance', d.balance],
                  ['Cognitive', d.cognitive],
                  ['Social', d.social],
                  ['Preventive care', d.preventive],
                  ['Healthcare funding', d.financial],
                  ['Purpose', d.purpose],
                ].map(([k, v]) => (
                  <p key={k as string}>
                    <span className="text-muted-foreground">{k}: </span>
                    {v}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-prism-amber" /> Healthspan financial readiness
          </CardTitle>
          <CardDescription>Wealth supports health. Health protects wealth.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {HEALTHSPAN_FINANCIAL.map((f) => (
            <div key={f.key} className="rounded-lg border p-3">
              <p className="text-sm font-medium">{f.label}</p>
              <p className="text-xs text-muted-foreground">{f.hint}</p>
            </div>
          ))}
          <p className="sm:col-span-2 text-xs text-muted-foreground">
            Balances and coverage are tracked in the Wealth modules — Accounts, Insurance and the Retirement
            Hub — so health decisions and healthcare funding stay connected.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
