// Coach Arty — guided exercise timer with voice narration.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX, Droplets, Dumbbell } from 'lucide-react';
import { toast } from 'sonner';
import {
  DEFAULT_ITEM,
  buildPhases,
  finishCue,
  phaseCue,
  sessionCalories,
  tickCue,
  totalSeconds,
  WATER_CUE,
  type Phase,
  type Verbosity,
} from '@/lib/health/coachArty';
import { useCoachVoice } from '@/hooks/use-coach-voice';
import { useWorkoutMusic, type MusicStyle } from '@/hooks/use-workout-music';
import { Slider } from '@/components/ui/slider';
import { Music, Music2 } from 'lucide-react';
import { useHealthProfile, useSaveDailyLog, useTodayLog } from '@/hooks/use-health';
import { todayISO } from '@/lib/health/healthEngine';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exerciseName: string;
  /** When true, defaults are tuned for static stretching holds instead of reps. */
  isStretch?: boolean;
  /** Optional picker list so the session can be switched without closing the dialog. */
  options?: { name: string; group?: string; isStretch?: boolean }[];
  /** Called after the session is logged (e.g. to tick the Kickstart step). */
  onComplete?: () => void;
};

const WATER_EVERY_SETS = 3;

export default function CoachArtyTimer({ open, onOpenChange, exerciseName, isStretch, options, onComplete }: Props) {
  const { data: profile } = useHealthProfile();
  const { data: today } = useTodayLog();
  const saveLog = useSaveDailyLog();

  const [selected, setSelected] = useState(exerciseName);
  useEffect(() => {
    if (open) setSelected(exerciseName);
  }, [open, exerciseName]);

  const picked = options?.find((o) => o.name === selected);
  const name = picked?.name ?? selected ?? exerciseName;
  const stretch = picked ? !!picked.isStretch : !!isStretch;

  const defaults = stretch
    ? { sets: 3, reps: 5, workSeconds: 45, restSeconds: 15 }
    : DEFAULT_ITEM;

  const [sets, setSets] = useState(String(defaults.sets));
  const [reps, setReps] = useState(String(defaults.reps));
  const [work, setWork] = useState(String(defaults.workSeconds));
  const [rest, setRest] = useState(String(defaults.restSeconds));
  const [voiceOn, setVoiceOn] = useState(true);
  const [verbosity, setVerbosity] = useState<Verbosity>('full');


  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [waterPrompt, setWaterPrompt] = useState(false);
  const [setsDone, setSetsDone] = useState(0);
  const loggedRef = useRef(false);

  const { speak, stop, speaking } = useCoachVoice(voiceOn);
  const music = useWorkoutMusic();
  const [musicOn, setMusicOn] = useState(true);

  // Duck the track under Coach Arty and ease it back during rest periods.
  useEffect(() => {
    music.duck(speaking ? 0.3 : 1);
  }, [speaking, music]);

  const phases = useMemo(
    () =>
      buildPhases([
        {
          name: name,
          sets: Math.max(1, Number(sets) || 1),
          reps: Math.max(1, Number(reps) || 1),
          workSeconds: Math.max(5, Number(work) || 30),
          restSeconds: Math.max(5, Number(rest) || 30),
        },
      ]),
    [name, sets, reps, work, rest],
  );

  const phase: Phase | undefined = phases[index];
  const planSeconds = useMemo(() => totalSeconds(phases), [phases]);
  const weight = profile?.current_weight ?? 220;
  const met = stretch ? 2.5 : 3.5;
  const calories = sessionCalories(elapsed, weight, met);

  const reset = useCallback(() => {
    stop();
    setRunning(false);
    setStarted(false);
    setIndex(0);
    setRemaining(0);
    setElapsed(0);
    setSetsDone(0);
    setWaterPrompt(false);
    loggedRef.current = false;
  }, [stop]);

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    setSets(String(defaults.sets));
    setReps(String(defaults.reps));
    setWork(String(defaults.workSeconds));
    setRest(String(defaults.restSeconds));
  }, [stretch, name]);

  const logSession = useCallback(
    (seconds: number, doneSets: number) => {
      if (loggedRef.current || seconds < 30) return;
      loggedRef.current = true;
      const burn = sessionCalories(seconds, weight, met);
      const prior = Number((today as any)?.exercise_calories ?? 0);
      const priorSessions = Array.isArray((today as any)?.workout_sessions)
        ? ((today as any).workout_sessions as unknown[])
        : [];
      saveLog.mutate(
        {
          log_date: todayISO(),
          exercise_calories: prior + burn,
          workout_sessions: [
            ...priorSessions,
            {
              exercise: name,
              sets: doneSets,
              reps: Number(reps) || 0,
              seconds,
              calories: burn,
              coach: 'Coach Arty',
              at: new Date().toISOString(),
            },
          ],
        },
        { onSuccess: () => toast.success(`Session logged — ${burn} cal`) },
      );
      onComplete?.();
    },
    [name, met, onComplete, reps, saveLog, today, weight],
  );

  const advance = useCallback(
    (from: number) => {
      const current = phases[from];
      const nextIdx = from + 1;
      const next = phases[nextIdx];
      if (current?.kind === 'work') {
        setSetsDone((s) => {
          const done = s + 1;
          if (done > 0 && done % WATER_EVERY_SETS === 0) {
            setWaterPrompt(true);
            void speak(WATER_CUE);
          }
          return done;
        });
      }
      if (!next || next.kind === 'done') {
        setIndex(phases.length - 1);
        setRunning(false);
        setRemaining(0);
        setElapsed((secs) => {
          const totalDone = secs;
          const doneSets = phases.filter((p) => p.kind === 'work').length;
          void speak(finishCue(doneSets, Math.round(totalDone / 60), sessionCalories(totalDone, weight, met)));
          logSession(totalDone, doneSets);
          return secs;
        });
        return;
      }
      setIndex(nextIdx);
      setRemaining(next.seconds);
      void speak(phaseCue(next, phases[nextIdx + 1], verbosity, nextIdx, stretch));
    },
    [stretch, logSession, phases, speak, verbosity, weight],
  );

  // Countdown loop.
  useEffect(() => {
    if (!running || !phase || phase.kind === 'done') return;
    const id = window.setInterval(() => {
      setElapsed((e) => e + 1);
      setRemaining((r) => {
        const next = r - 1;
        if (next <= 0) {
          advance(index);
          return 0;
        }
        const cue = tickCue(phase, next, verbosity, stretch);
        if (cue) void speak(cue);
        return next;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running, phase, index, advance, speak, verbosity, stretch]);

  const start = () => {
    const first = phases[0];
    setStarted(true);
    setRunning(true);
    setIndex(0);
    setRemaining(first.seconds);
    setElapsed(0);
    setSetsDone(0);
    loggedRef.current = false;
    void speak(phaseCue(first, phases[1], verbosity, 0, stretch));
  };

  const logWater = () => {
    const prior = Number((today as any)?.water_oz ?? 0);
    saveLog.mutate(
      { log_date: todayISO(), water_oz: prior + 8 },
      { onSuccess: () => toast.success('8 oz logged') },
    );
    setWaterPrompt(false);
  };

  const pct = phase && phase.seconds > 0 ? ((phase.seconds - remaining) / phase.seconds) * 100 : 0;
  const ringColor =
    phase?.kind === 'rest' ? 'hsl(var(--primary))' : phase?.kind === 'work' ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))';
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5 text-prism-teal" />
            Coach Arty — {name}
          </DialogTitle>
        </DialogHeader>

        {!started ? (
          <div className="space-y-4">
            {options && options.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Exercise</Label>
                <Select value={selected} onValueChange={setSelected}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an exercise" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {options.map((o) => (
                      <SelectItem key={o.name} value={o.name}>
                        {o.group ? `${o.group} — ${o.name}` : o.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Sets</Label>
                <Input type="number" min="1" value={sets} onChange={(e) => setSets(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {stretch ? 'Breaths / hold count' : 'Target reps'}
                </Label>
                <Input type="number" min="1" value={reps} onChange={(e) => setReps(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Work seconds</Label>
                <Input type="number" min="5" value={work} onChange={(e) => setWork(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Rest seconds</Label>
                <Input type="number" min="5" value={rest} onChange={(e) => setRest(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-2">
                {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                <span className="text-sm">Coach Arty voice</span>
              </div>
              <Switch checked={voiceOn} onCheckedChange={setVoiceOn} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Coaching style</Label>
              <Select value={verbosity} onValueChange={(v) => setVerbosity(v as Verbosity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full coaching — cues plus motivation</SelectItem>
                  <SelectItem value="cues">
                    Cues only — sets, {stretch ? 'breaths' : 'reps'}, rest
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary">{mmss(planSeconds)} planned</Badge>
              <Badge variant="outline">~{sessionCalories(planSeconds, weight, met)} cal</Badge>
              <span>Water reminder every {WATER_EVERY_SETS} sets</span>
            </div>

            <Button className="w-full" onClick={start}>
              <Play className="mr-2 h-4 w-4" /> Start session
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative mx-auto flex h-48 w-48 items-center justify-center">
              <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
                <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="52"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 52}
                  strokeDashoffset={2 * Math.PI * 52 * (1 - pct / 100)}
                />
              </svg>
              <div className="text-center">
                <p className="text-4xl font-bold tabular-nums">{mmss(remaining)}</p>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {phase?.kind === 'done' ? 'complete' : phase?.kind}
                </p>
              </div>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold">{phase?.label}</p>
              {phase?.kind === 'work' && (
                <p className="text-sm text-muted-foreground">
                  {phase.reps} {stretch ? 'breaths — hold steady' : 'reps — controlled tempo'}
                </p>
              )}
            </div>

            {waterPrompt && (
              <div className="flex items-center justify-between rounded-lg border border-primary/40 bg-primary/5 p-3">
                <span className="flex items-center gap-2 text-sm">
                  <Droplets className="h-4 w-4 text-primary" /> Water break — drink 8 oz
                </span>
                <Button size="sm" variant="outline" onClick={logWater}>
                  Log 8 oz
                </Button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg border bg-card/50 p-2">
                <p className="text-xs text-muted-foreground">Sets done</p>
                <p className="font-semibold tabular-nums">{setsDone}</p>
              </div>
              <div className="rounded-lg border bg-card/50 p-2">
                <p className="text-xs text-muted-foreground">Elapsed</p>
                <p className="font-semibold tabular-nums">{mmss(elapsed)}</p>
              </div>
              <div className="rounded-lg border bg-card/50 p-2">
                <p className="text-xs text-muted-foreground">Burn</p>
                <p className="font-semibold tabular-nums">{calories} cal</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {phase?.kind !== 'done' && (
                <Button variant="outline" size="sm" onClick={() => setRunning((r) => !r)}>
                  {running ? <Pause className="mr-1 h-4 w-4" /> : <Play className="mr-1 h-4 w-4" />}
                  {running ? 'Pause' : 'Resume'}
                </Button>
              )}
              {phase?.kind !== 'done' && (
                <Button variant="outline" size="sm" onClick={() => advance(index)}>
                  <SkipForward className="mr-1 h-4 w-4" /> Skip
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={reset}>
                <RotateCcw className="mr-1 h-4 w-4" /> Restart
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setVoiceOn((v) => !v)}>
                {voiceOn ? <Volume2 className="mr-1 h-4 w-4" /> : <VolumeX className="mr-1 h-4 w-4" />}
                {voiceOn ? 'Mute' : 'Unmute'}
              </Button>
            </div>

            {phase?.kind === 'done' && (
              <Button className="w-full" onClick={() => onOpenChange(false)}>
                Done — close
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
