import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Flag, TrendingDown, Info, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useHealthLogs, useHealthMeals, useHealthProfile, useSaveDailyLog } from '@/hooks/use-health';
import { mergeMealsIntoLogs } from '@/lib/health/mealRollup';
import { formatDate, todayISO, type DailyLog } from '@/lib/health/healthEngine';
import {
  buildWeightProgram,
  CORRECTION_ACTIONS,
  PLATEAU_CHECKLIST,
  ZONES,
} from '@/lib/health/weightProgram';
import NonScaleVictoriesCard from '@/components/health/NonScaleVictoriesCard';
import { DisclaimerBlock } from '@/components/investment/DisclaimerBlock';

const lbs = (n: number | null | undefined, digits = 1) =>
  n == null ? '—' : `${n.toFixed(digits)} lbs`;

/** Sections 1, 2, 3, 15, 16, 17 — the weight roadmap, trend, milestones, maintenance and plateau logic. */
export default function WeightRoadmapTab() {
  const { data: logs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const { data: profile } = useHealthProfile();
  const save = useSaveDailyLog();

  const merged = useMemo(
    () => mergeMealsIntoLogs(logs as Record<string, unknown>[], meals) as unknown as DailyLog[],
    [logs, meals],
  );
  const wp = useMemo(() => buildWeightProgram((profile ?? null) as never, merged), [profile, merged]);

  const [entry, setEntry] = useState({
    date: todayISO(),
    weight: '',
    waist: '',
    body_fat: '',
    resting_hr: '',
    bp_systolic: '',
    bp_diastolic: '',
  });
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const num = (v: string) => (v.trim() === '' ? null : Number(v));

  const submit = () => {
    const payload: Record<string, unknown> = { log_date: entry.date };
    if (num(entry.weight) != null) payload.weight = num(entry.weight);
    if (num(entry.resting_hr) != null) payload.resting_hr = num(entry.resting_hr);
    if (num(entry.bp_systolic) != null) payload.bp_systolic = num(entry.bp_systolic);
    if (num(entry.bp_diastolic) != null) payload.bp_diastolic = num(entry.bp_diastolic);
    save.mutate(payload, {
      onSuccess: () =>
        setEntry({ ...entry, weight: '', resting_hr: '', bp_systolic: '', bp_diastolic: '' }),
    });
  };

  const zoneTone =
    wp.zone === 'action'
      ? 'border-destructive/50 bg-destructive/10'
      : wp.zone === 'yellow'
        ? 'border-prism-amber/50 bg-prism-amber/10'
        : 'border-prism-teal/50 bg-prism-teal/10';

  return (
    <div className="space-y-6">
      {/* Mode banner */}
      <Card className={cn(wp.mode === 'maintenance' ? zoneTone : 'border-primary/30 bg-primary/5')}>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {wp.mode === 'maintenance' ? (
                <ShieldCheck className="h-5 w-5 text-prism-teal" />
              ) : (
                <TrendingDown className="h-5 w-5 text-primary" />
              )}
              <span className="font-semibold">
                {wp.mode === 'maintenance' ? 'Maintenance Mode' : 'Weight Loss Mode'}
              </span>
              {wp.zone && (
                <Badge variant={wp.zone === 'green' ? 'secondary' : 'destructive'} className="capitalize">
                  {wp.zone === 'action' ? 'Action zone' : `${wp.zone} zone`}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {wp.mode === 'maintenance'
                ? (wp.zoneMessage ?? '')
                : `Working target: April 2027 for about 175 lbs, with a healthy landing window of February to May 2027.`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{lbs(wp.avg7 ?? wp.latest)}</p>
            <p className="text-xs text-muted-foreground">7-day average</p>
          </div>
        </CardContent>
      </Card>

      {wp.resetMode && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Maintenance Reset Mode
            </CardTitle>
            <CardDescription>
              Temporarily restore structured tracking until the trend returns to 173–180 lbs.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
            {[
              'Structured calorie tracking every day',
              'Six walking days per week',
              'Three strength workouts when appropriate',
              'Weekly weigh-in trend monitoring',
            ].map((s) => (
              <p key={s} className="flex items-center gap-2">
                <Circle className="h-3 w-3 text-destructive" /> {s}
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 2: trend metrics */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: '7-day average', value: lbs(wp.avg7) },
          { label: '30-day average', value: lbs(wp.avg30) },
          { label: 'Weekly change', value: wp.weeklyChange == null ? '—' : `${wp.weeklyChange > 0 ? '+' : ''}${wp.weeklyChange.toFixed(1)} lbs` },
          { label: 'Total lost', value: lbs(wp.lost) },
          { label: 'Of start weight', value: `${wp.pctOfStartLost.toFixed(1)}%` },
          { label: 'To goal', value: lbs(wp.remaining) },
        ].map((s) => (
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
            <Flag className="h-4 w-4 text-primary" /> Weight Loss Roadmap
          </CardTitle>
          <CardDescription>
            {wp.remaining > 0
              ? `At your recent trend, the projected date for ${wp.goal} lbs is ${formatDate(wp.projectedGoalDate)}.`
              : 'Goal reached. The mission is now maintenance and healthspan.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={wp.progressPct * 100} className="h-2" />
          <ol className="space-y-2">
            {wp.steps.map((s) => (
              <li
                key={s.weight}
                className={cn(
                  'flex flex-wrap items-center gap-3 rounded-lg border p-3',
                  s.isCurrentTarget && 'border-primary bg-primary/5',
                  s.reached && 'bg-muted/30',
                )}
              >
                {s.reached ? (
                  <CheckCircle2 className="h-5 w-5 text-prism-teal" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className="w-20 font-semibold">{s.weight} lbs</span>
                <span className="min-w-0 flex-1 text-sm text-muted-foreground">{s.message}</span>
                <span className="text-xs text-muted-foreground">
                  {s.reached
                    ? s.reachedOn
                      ? `Reached ${formatDate(s.reachedOn)}`
                      : 'Reached'
                    : s.projectedDate
                      ? `Projected ${formatDate(s.projectedDate)}`
                      : ''}
                </span>
                {s.weight === 200 && wp.hundredsClub && <Badge>Welcome to the 100s</Badge>}
                {s.isCurrentTarget && <Badge variant="outline">Next</Badge>}
              </li>
            ))}
          </ol>
          <p className="text-xs italic text-muted-foreground">
            Projections are estimates and actual weight loss will vary. Slower progress is not failure — trends
            matter more than any single weigh-in.
          </p>
        </CardContent>
      </Card>

      {/* Section 1: monthly targets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Projected monthly targets</CardTitle>
          <CardDescription>Working plan toward roughly 175 lbs by April 2027.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {wp.monthly.map((m) => (
            <div key={m.key} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.label}</span>
                {m.status !== 'future' && (
                  <Badge
                    variant={m.status === 'behind' ? 'outline' : 'secondary'}
                    className="capitalize"
                  >
                    {m.status === 'on-track' ? 'On track' : m.status}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Target {m.low}–{m.high} lbs
                {m.actual != null && ` · actual avg ${m.actual.toFixed(1)}`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Section 15: zones */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Maintenance zones</CardTitle>
          <CardDescription>Applied automatically once you reach about 175 lbs.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-prism-teal/40 bg-prism-teal/5 p-3">
            <p className="font-semibold text-prism-teal">Green zone</p>
            <p className="text-sm text-muted-foreground">{ZONES.greenLow}–{ZONES.greenHigh} lbs</p>
          </div>
          <div className="rounded-lg border border-prism-amber/40 bg-prism-amber/5 p-3">
            <p className="font-semibold text-prism-amber">Yellow zone</p>
            <p className="text-sm text-muted-foreground">{ZONES.greenHigh + 1}–{ZONES.yellowHigh} lbs</p>
          </div>
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="font-semibold text-destructive">Action zone</p>
            <p className="text-sm text-muted-foreground">{ZONES.action} lbs or higher</p>
          </div>
          {wp.zone && wp.zone !== 'green' && (
            <div className="sm:col-span-3 space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Small correction recommended</p>
              <ul className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                {CORRECTION_ACTIONS.map((a) => (
                  <li key={a}>• {a}</li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 16: plateau protocol */}
      <Card className={cn(wp.plateau.active && 'border-prism-amber/50')}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Info className="h-4 w-4 text-prism-amber" /> Plateau Protocol
          </CardTitle>
          <CardDescription>
            {wp.plateau.active
              ? 'The trend has been flat for about three weeks. This is normal — work the checklist before changing calories.'
              : 'If the trend does not move for 14 to 21 days, work this checklist before changing anything.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {PLATEAU_CHECKLIST.map((q, i) => (
            <button
              key={q}
              type="button"
              onClick={() => setChecked((c) => ({ ...c, [i]: !c[i] }))}
              className="flex w-full items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted/50"
            >
              {checked[i] ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-prism-teal" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              {q}
            </button>
          ))}
          <p className="text-xs text-muted-foreground">
            Only after completing the checklist should you consider changing calorie or activity targets.
          </p>
        </CardContent>
      </Card>

      {/* Section 2 entry form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Log a measurement</CardTitle>
          <CardDescription>Weigh-ins, resting heart rate and blood pressure.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div>
              <Label className="text-xs">Date</Label>
              <Input type="date" value={entry.date} onChange={(e) => setEntry({ ...entry, date: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Weight (lbs)</Label>
              <Input inputMode="decimal" value={entry.weight} onChange={(e) => setEntry({ ...entry, weight: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Resting HR</Label>
              <Input inputMode="numeric" value={entry.resting_hr} onChange={(e) => setEntry({ ...entry, resting_hr: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">BP systolic</Label>
              <Input inputMode="numeric" value={entry.bp_systolic} onChange={(e) => setEntry({ ...entry, bp_systolic: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">BP diastolic</Label>
              <Input inputMode="numeric" value={entry.bp_diastolic} onChange={(e) => setEntry({ ...entry, bp_diastolic: e.target.value })} />
            </div>
          </div>
          <Button onClick={submit} disabled={save.isPending}>
            Save measurement
          </Button>
          <p className="text-xs text-muted-foreground">
            Waist and body fat live on the Profile tab so the goal calculations stay in one place.
          </p>
        </CardContent>
      </Card>

      <NonScaleVictoriesCard />
      <DisclaimerBlock variant="short" />
    </div>
  );
}
