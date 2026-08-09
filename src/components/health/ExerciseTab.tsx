import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, CalendarDays, Target, Youtube, Flame, Plus, Timer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useHealthProfile, useHealthLogs, useSaveDailyLog, useTodayLog } from '@/hooks/use-health';
import { weightStatus, projectMilestoneDate } from '@/lib/health/healthEngine';
import CardioCard from '@/components/health/CardioCard';
import CoachArtyTimer from '@/components/health/CoachArtyTimer';



type Exercise = {
  name: string;
  group: 'Legs' | 'Chest & Shoulders' | 'Back' | 'Arms' | 'Core' | 'Cardio' | 'Stretch / Mobility';
  setup: string;
  how: string;
  sets: string;
  incline: string;
};

const TOTAL_GYM_EXERCISES: Exercise[] = [
  // Legs
  {
    name: 'Total Gym Squat',
    group: 'Legs',
    setup: 'Feet on squat stand, lie back on glideboard, hands on handles or chest.',
    how: 'Press through mid-foot to extend legs, control the 3-second return. Knees track over toes.',
    sets: '3 x 12–15',
    incline: 'Level 4–6',
  },
  {
    name: 'Single-Leg Press',
    group: 'Legs',
    setup: 'One foot centered on squat stand, other leg bent and relaxed.',
    how: 'Push up slowly, pause at the top, lower under control. Switch legs.',
    sets: '2 x 10 each leg',
    incline: 'Level 3–5',
  },
  {
    name: 'Calf Raise',
    group: 'Legs',
    setup: 'Balls of both feet on the lower edge of the squat stand.',
    how: 'Press up onto the toes, hold 1 second, lower until you feel a calf stretch.',
    sets: '3 x 20',
    incline: 'Level 5–7',
  },
  {
    name: 'Glute / Hip Extension',
    group: 'Legs',
    setup: 'Kneel or lie face down on the glideboard, feet toward the squat stand.',
    how: 'Drive one leg back and up, squeeze the glute, return slowly.',
    sets: '2 x 15 each side',
    incline: 'Level 3–4',
  },
  // Chest & Shoulders
  {
    name: 'Chest Press',
    group: 'Chest & Shoulders',
    setup: 'Lie face up, head toward the top, grip both handles at chest level.',
    how: 'Press hands up and slightly together, elbows soft. Lower to a chest stretch.',
    sets: '3 x 12',
    incline: 'Level 4–6',
  },
  {
    name: 'Chest Fly (Pec Fly)',
    group: 'Chest & Shoulders',
    setup: 'Same as chest press with arms out wide, slight elbow bend.',
    how: 'Sweep arms together in an arc above the chest, then open slowly.',
    sets: '3 x 12',
    incline: 'Level 3–5',
  },
  {
    name: 'Shoulder Press',
    group: 'Chest & Shoulders',
    setup: 'Sit facing away from the tower, handles at shoulder height.',
    how: 'Press overhead without shrugging, lower to ear level.',
    sets: '3 x 10',
    incline: 'Level 4–6',
  },
  {
    name: 'Front Deltoid Raise',
    group: 'Chest & Shoulders',
    setup: 'Lie face up, arms straight down at sides.',
    how: 'Raise straight arms in front to overhead, keep elbows locked soft.',
    sets: '2 x 12',
    incline: 'Level 2–4',
  },
  // Back
  {
    name: 'Seated Row',
    group: 'Back',
    setup: 'Sit facing the tower, knees bent, grip both handles.',
    how: 'Pull elbows back past the ribs, squeeze shoulder blades, release slowly.',
    sets: '3 x 12–15',
    incline: 'Level 4–6',
  },
  {
    name: 'Lat Pull-Down',
    group: 'Back',
    setup: 'Sit facing the tower, arms extended overhead on the handles.',
    how: 'Pull the handles down toward the hips with straight-ish arms.',
    sets: '3 x 12',
    incline: 'Level 4–6',
  },
  {
    name: 'Pull-Up / Chin-Up (assisted)',
    group: 'Back',
    setup: 'Lie face up, head toward the tower, grip the pull-up bar.',
    how: 'Pull the glideboard up the rails, chin toward the bar, lower slowly.',
    sets: '3 x 6–10',
    incline: 'Level 2–4 (lower = easier)',
  },
  {
    name: 'Reverse Fly',
    group: 'Back',
    setup: 'Sit facing the tower, arms crossed holding opposite handles.',
    how: 'Open the arms wide, squeeze upper back, return with control.',
    sets: '2 x 15',
    incline: 'Level 3–4',
  },
  // Arms
  {
    name: 'Biceps Curl',
    group: 'Arms',
    setup: 'Sit facing the tower, palms up on the handles, elbows at the sides.',
    how: 'Curl toward the shoulders keeping elbows pinned, lower for 3 seconds.',
    sets: '3 x 12',
    incline: 'Level 4–6',
  },
  {
    name: 'Triceps Extension',
    group: 'Arms',
    setup: 'Sit facing away from the tower, handles beside the head, elbows bent.',
    how: 'Extend the arms forward/overhead, squeeze the triceps, return slowly.',
    sets: '3 x 12',
    incline: 'Level 4–6',
  },
  {
    name: 'Triceps Kickback',
    group: 'Arms',
    setup: 'Kneel on the glideboard facing away, one handle in hand.',
    how: 'Press the hand straight back, keep the upper arm still.',
    sets: '2 x 12 each arm',
    incline: 'Level 3–5',
  },
  {
    name: 'Forearm / Wrist Curl',
    group: 'Arms',
    setup: 'Seated facing the tower, wrists resting on the knees.',
    how: 'Curl only at the wrist, small controlled range.',
    sets: '2 x 20',
    incline: 'Level 2–3',
  },
  // Core
  {
    name: 'Crunch (glideboard)',
    group: 'Core',
    setup: 'Lie face up, feet on the squat stand, hands behind the head or on chest.',
    how: 'Curl ribs toward hips, exhale at the top, lower slowly.',
    sets: '3 x 15–20',
    incline: 'Level 3–5',
  },
  {
    name: 'Oblique Twist Crunch',
    group: 'Core',
    setup: 'Same as crunch, one hand behind the head.',
    how: 'Crunch up and rotate the shoulder toward the opposite knee.',
    sets: '2 x 15 each side',
    incline: 'Level 3–5',
  },
  {
    name: 'Leg Pull-In',
    group: 'Core',
    setup: 'Lie face up, hands gripping the handles overhead, legs extended.',
    how: 'Draw the knees toward the chest without letting the low back arch.',
    sets: '3 x 12',
    incline: 'Level 2–4',
  },
  {
    name: 'Plank Slide (advanced)',
    group: 'Core',
    setup: 'Hands on the squat stand, feet or knees on the glideboard.',
    how: 'Hold a solid plank while sliding the board in and out a few inches.',
    sets: '3 x 30 seconds',
    incline: 'Level 2–3',
  },
  // Cardio
  {
    name: 'Cardio Pull (rowing tempo)',
    group: 'Cardio',
    setup: 'Seated row position, light incline.',
    how: 'Continuous rowing tempo for time, breathing steadily.',
    sets: '3 x 2 minutes',
    incline: 'Level 2–3',
  },
  {
    name: 'Jump / Press Intervals',
    group: 'Cardio',
    setup: 'Squat position with both feet on the stand.',
    how: 'Fast controlled squat presses (no true jump needed) for intervals.',
    sets: '4 x 45 sec / 30 sec rest',
    incline: 'Level 3–4',
  },
];

const SPLIT_STRETCH_EXERCISES: Exercise[] = [
  {
    name: 'Seated Forward Fold',
    group: 'Stretch / Mobility',
    setup: 'Sit on the split stretch machine seat, legs extended straight out, back tall.',
    how: 'Hinge forward from the hips, keeping the back flat, until you feel a gentle hamstring stretch. Hold and breathe.',
    sets: '3 x 30–45 sec',
    incline: 'Light tension',
  },
  {
    name: 'Straddle / Pancake Fold',
    group: 'Stretch / Mobility',
    setup: 'Open legs wide to a comfortable straddle on the machine, knees and toes pointing up.',
    how: 'Slowly fold forward between the legs, leading with the chest. Stop at the first point of tension.',
    sets: '3 x 30–45 sec',
    incline: 'Light tension',
  },
  {
    name: 'Middle Split Hold',
    group: 'Stretch / Mobility',
    setup: 'Position the machine so the legs extend out to the sides at a moderate angle.',
    how: 'Let gravity and the machine assist the inner-thigh stretch. Hold steady, no bouncing.',
    sets: '3 x 30 sec',
    incline: 'Moderate assist',
  },
  {
    name: 'Front Split Hold',
    group: 'Stretch / Mobility',
    setup: 'One leg forward, one leg back, supported by the machine rails.',
    how: 'Square the hips and sink into the stretch, keeping the torso upright. Hold and breathe deeply.',
    sets: '2 x 30 sec each side',
    incline: 'Moderate assist',
  },
  {
    name: 'Hip Flexor / Lunge Stretch',
    group: 'Stretch / Mobility',
    setup: 'One foot forward, back knee resting on the pad, torso tall.',
    how: 'Gently push the hips forward until you feel the front of the hip and thigh open.',
    sets: '2 x 45 sec each side',
    incline: 'Light tension',
  },
  {
    name: 'Butterfly / Groin Stretch',
    group: 'Stretch / Mobility',
    setup: 'Sit with soles of the feet together, knees fall outward with machine-assisted support.',
    how: 'Keep the spine long and gently allow the inner thighs to release.',
    sets: '3 x 30 sec',
    incline: 'Light tension',
  },
  {
    name: 'Calf & Hamstring Combo',
    group: 'Stretch / Mobility',
    setup: 'Legs extended, flex the feet back toward the shins using the machine strap.',
    how: 'Hold the dorsiflexed position to stretch calves and back of the legs together.',
    sets: '3 x 30 sec',
    incline: 'Light tension',
  },
  {
    name: 'Figure-Four Glute Stretch',
    group: 'Stretch / Mobility',
    setup: 'Lie on your back, cross one ankle over the opposite knee.',
    how: 'Use the machine to gently draw the supporting leg toward the chest until the glute releases.',
    sets: '2 x 45 sec each side',
    incline: 'Light assist',
  },
  {
    name: 'Spinal Decompression Hang',
    group: 'Stretch / Mobility',
    setup: 'Secure upper body, let the lower body be gently weighted or supported in a relaxed hang.',
    how: 'Breathe slowly and let the spine lengthen. Do not force the range.',
    sets: '2 x 45 sec',
    incline: 'Body weight only',
  },
];

const ALL_EXERCISES = [...TOTAL_GYM_EXERCISES, ...SPLIT_STRETCH_EXERCISES];

const GROUPS = ['Legs', 'Chest & Shoulders', 'Back', 'Arms', 'Core', 'Cardio', 'Stretch / Mobility'] as const;

const WEEK_PLAN: { day: string; focus: string; picks: string[]; note: string }[] = [
  {
    day: 'Monday',
    focus: 'Total Gym — Push',
    picks: ['Chest Press', 'Chest Fly (Pec Fly)', 'Shoulder Press', 'Triceps Extension', 'Crunch (glideboard)'],
    note: '35 min. Follow with a 20-minute walk.',
  },
  {
    day: 'Tuesday',
    focus: 'Walk + Core',
    picks: ['Leg Pull-In', 'Oblique Twist Crunch', 'Plank Slide (advanced)'],
    note: 'Priority is the daily mileage goal; core is 10 minutes.',
  },
  {
    day: 'Wednesday',
    focus: 'Total Gym — Pull',
    picks: ['Seated Row', 'Lat Pull-Down', 'Pull-Up / Chin-Up (assisted)', 'Biceps Curl', 'Reverse Fly'],
    note: '35 min. Slow 3-second lowering on every rep.',
  },
  {
    day: 'Thursday',
    focus: 'Walk + Split Stretch Machine',
    picks: ['Seated Forward Fold', 'Straddle / Pancake Fold', 'Hip Flexor / Lunge Stretch', 'Calf & Hamstring Combo'],
    note: '20–25 min on the split stretch machine after your walk. Improves recovery and range of motion for Total Gym work.',
  },
  {
    day: 'Friday',
    focus: 'Total Gym — Legs',
    picks: ['Total Gym Squat', 'Single-Leg Press', 'Calf Raise', 'Glute / Hip Extension'],
    note: '30 min. Add one core set if energy is good.',
  },
  {
    day: 'Saturday',
    focus: 'Metabolic circuit',
    picks: ['Jump / Press Intervals', 'Seated Row', 'Chest Press', 'Crunch (glideboard)'],
    note: 'Circuit style, minimal rest, 25 minutes.',
  },
  {
    day: 'Sunday',
    focus: 'Rest / long walk',
    picks: [],
    note: 'Full recovery day. Weigh-in and plan the week.',
  },
];

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function ExerciseTab() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const [group, setGroup] = useState<string>('all');
  const [coachExercise, setCoachExercise] = useState<string | null>(null);

  const { data: today } = useTodayLog();
  const saveLog = useSaveDailyLog();
  const [strengthMins, setStrengthMins] = useState('30');
  const [stretchMins, setStretchMins] = useState('20');

  const status = useMemo(() => weightStatus(profile ?? null, logs), [profile, logs]);
  const goal = profile?.goal_weight ?? 175;

  const paces = useMemo(() => {
    const current = status?.current ?? profile?.current_weight ?? 220;
    const toGo = Math.max(0, current - goal);
    return [1, 1.5, 2].map((rate) => {
      const weeks = Math.ceil(toGo / rate);
      const iso = new Date(Date.now() + weeks * 7 * 86400000).toISOString().slice(0, 10);
      return { rate, weeks, date: iso };
    });
  }, [status, profile, goal]);

  const projected = projectMilestoneDate(goal, status);
  const filtered =
    group === 'all' ? ALL_EXERCISES : ALL_EXERCISES.filter((e) => e.group === group);

  const strengthWeight = status?.current ?? profile?.current_weight ?? 220;
  const strengthBurn = Math.round(
    ((Number(strengthMins) || 0) / 60) * 3.5 * (strengthWeight / 2.205) * 1.05,
  );
  // Stretching is lower intensity (~2.5 METs) but still contributes to daily burn.
  const stretchBurn = Math.round(
    ((Number(stretchMins) || 0) / 60) * 2.5 * (strengthWeight / 2.205) * 1.05,
  );
  const loggedBurn = Number((today as any)?.exercise_calories ?? 0);

  const logStrength = () => {
    if (strengthBurn <= 0) {
      toast.error('Enter session minutes');
      return;
    }
    saveLog.mutate(
      {
        log_date: todayISO(),
        exercise_calories: loggedBurn + strengthBurn,
      },
        { onSuccess: () => toast.success('Strength session burn logged') },
      );
    };

    const logStretch = () => {
      if (stretchBurn <= 0) {
        toast.error('Enter stretch minutes');
        return;
      }
      saveLog.mutate(
        {
          log_date: todayISO(),
          exercise_calories: loggedBurn + stretchBurn,
        },
        { onSuccess: () => toast.success('Stretch session burn logged') },
      );
    };

    return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-prism-orange" /> Log a strength session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Minutes on the Total Gym</Label>
              <Input
                type="number"
                min="0"
                value={strengthMins}
                onChange={(e) => setStrengthMins(e.target.value)}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Estimated burn</p>
              <p className="text-lg font-semibold tabular-nums">{strengthBurn} cal</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Logged today</p>
              <p className="text-lg font-semibold tabular-nums">{Math.round(loggedBurn)} cal</p>
            </div>
          </div>
          <Button size="sm" onClick={logStrength} disabled={saveLog.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add to today's burn
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Timer className="h-4 w-4 text-prism-teal" /> Log a split stretch machine session
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Minutes stretching</Label>
              <Input
                type="number"
                min="0"
                value={stretchMins}
                onChange={(e) => setStretchMins(e.target.value)}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Estimated burn</p>
              <p className="text-lg font-semibold tabular-nums">{stretchBurn} cal</p>
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Logged today</p>
              <p className="text-lg font-semibold tabular-nums">{Math.round(loggedBurn)} cal</p>
            </div>
          </div>
          <Button size="sm" onClick={logStretch} disabled={saveLog.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Add to today's burn
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-prism-teal" />
            Featured Total Gym workout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://www.google.com/search?tbm=vid&q=8V5tJm2Gu_g+Total+Gym"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-video w-full overflow-hidden rounded-lg border"
          >
            <img
              src="https://i.ytimg.com/vi/8V5tJm2Gu_g/hqdefault.jpg"
              alt="Featured Total Gym full-body workout demonstration thumbnail"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/25">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg">
                <Youtube className="h-7 w-7" />
              </span>
            </span>
          </a>
          <p className="text-sm text-muted-foreground">
            Opens in Google Videos, avoiding the direct YouTube connection blocked by some browsers. Follow
            along for form cues, then use the library below to build your push / pull / legs week.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-prism-sky" />
            Featured split stretch machine routine
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <a
            href="https://www.google.com/search?tbm=vid&q=split+stretch+machine+routine+full+body+stretching"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block aspect-video w-full overflow-hidden rounded-lg border"
          >
            <img
              src="/placeholder.svg"
              alt="Split stretch machine routine demonstration thumbnail"
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <span className="absolute inset-0 flex items-center justify-center bg-foreground/25">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg">
                <Youtube className="h-7 w-7" />
              </span>
            </span>
          </a>
          <p className="text-sm text-muted-foreground">
            Search for a split stretch machine routine to follow along. Use the library below to build a
            hamstring, hip, and groin mobility sequence.
          </p>
        </CardContent>
      </Card>

      <CardioCard />

      <Card>


        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-prism-rose" />
            Goal date — {goal} lb
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            {paces.map((p) => (
              <div key={p.rate} className="rounded-lg border bg-card/50 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {p.rate} lb / week
                </p>
                <p className="mt-1 text-lg font-semibold">{fmtDate(p.date)}</p>
                <p className="text-xs text-muted-foreground">{p.weeks} weeks to go</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            Based on your actual logged trend, projected arrival at {goal} lb is{' '}
            <span className="font-medium text-foreground">{fmtDate(projected)}</span>. A 175 lb target
            keeps roughly 8–10 lb more lean mass than 160 lb, which is easier to hold at 59 and better for
            strength work.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-prism-teal" />
            Weekly strength + mobility schedule
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {WEEK_PLAN.map((d) => (
            <div key={d.day} className="rounded-lg border bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <p className="font-semibold">{d.day}</p>
                <Badge variant="secondary">{d.focus}</Badge>
              </div>
              {d.picks.length > 0 && (
                <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                  {d.picks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              <p className="mt-2 text-xs text-muted-foreground">{d.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-prism-amber" />
            Exercise library — Total Gym & Stretch Machine
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            Print
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={group} onValueChange={setGroup}>
            <TabsList className="flex h-auto w-full flex-wrap justify-start">
              <TabsTrigger value="all">All</TabsTrigger>
              {GROUPS.map((g) => (
                <TabsTrigger key={g} value={g}>
                  {g}
                </TabsTrigger>
              ))}
            </TabsList>
            <TabsContent value={group} className="mt-4 grid gap-3 md:grid-cols-2">
              {filtered.map((e) => (
                <div key={e.name} className="rounded-lg border bg-card/50 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold">{e.name}</p>
                    <Badge variant="outline">{e.group}</Badge>
                  </div>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Setup: </span>
                    {e.setup}
                  </p>
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Execution: </span>
                    {e.how}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    <Badge variant="secondary">{e.sets}</Badge>
                    <Badge variant="secondary">{e.incline}</Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 w-full"
                    onClick={() => setCoachExercise(e.name)}
                  >
                    <Timer className="mr-1 h-4 w-4" /> Start with Coach Arty
                  </Button>

                  <a
                    href={`https://www.google.com/search?tbm=vid&q=${encodeURIComponent(
                      e.group === 'Stretch / Mobility'
                        ? `split stretch machine ${e.name} demonstration`
                        : `Total Gym ${e.name} exercise demonstration`,
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center gap-3 rounded-md border bg-background/60 p-2 transition-colors hover:bg-accent"
                  >
                    <span className="flex h-10 w-16 items-center justify-center rounded bg-destructive/15">
                      <Youtube className="h-5 w-5 text-destructive" />
                    </span>
                    <span className="text-xs">
                      <span className="block font-medium">Find video demonstration</span>
                      <span className="text-muted-foreground">
                        {e.group === 'Stretch / Mobility' ? 'Split stretch machine' : 'Total Gym'} {e.name}
                      </span>
                    </span>
                  </a>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <CoachArtyTimer
        open={!!coachExercise}
        onOpenChange={(o) => !o && setCoachExercise(null)}
        exerciseName={coachExercise ?? 'Total Gym Squat'}
        isStretch={SPLIT_STRETCH_EXERCISES.some((e) => e.name === coachExercise)}
        options={ALL_EXERCISES.map((e) => ({
          name: e.name,
          group: e.group,
          isStretch: e.group === 'Stretch / Mobility',
        }))}
      />

    </div>

  );
}
