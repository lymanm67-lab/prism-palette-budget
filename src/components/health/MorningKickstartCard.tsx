// Morning Kickstart — the ordered wake-up ritual, right rail on the Health page.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, Pause, Play, RotateCcw, Sunrise, Volume2, VolumeX } from 'lucide-react';
import { toast } from 'sonner';
import {
  KICKSTART_STEPS,
  MINDFULNESS_PRESETS,
  MINDFULNESS_TYPES,
  kickstartProgress,
  parseKickstart,
  type KickstartStepKey,
} from '@/lib/health/kickstart';
import { cueAt, sessionsForType, type GuidedSession } from '@/lib/health/guidedSessions';
import { useCoachVoice } from '@/hooks/use-coach-voice';
import { useHealthLogs, useSaveDailyLog, useTodayLog } from '@/hooks/use-health';
import { todayISO } from '@/lib/health/healthEngine';
import CoachArtyTimer from '@/components/health/CoachArtyTimer';


export default function MorningKickstartCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { data: today, isLoading } = useTodayLog();
  const { data: logs = [] } = useHealthLogs();
  const saveLog = useSaveDailyLog();

  const state = useMemo(() => parseKickstart((today as any)?.kickstart_steps), [today]);
  const progress = kickstartProgress(state);

  const [mtype, setMtype] = useState<string>((today as any)?.mindfulness_type ?? 'Prayer');
  const [minutes, setMinutes] = useState('5');
  const [intention, setIntention] = useState<string>((today as any)?.intention_note ?? '');
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [coachOpen, setCoachOpen] = useState(false);

  useEffect(() => {
    setIntention((today as any)?.intention_note ?? '');
    if ((today as any)?.mindfulness_type) setMtype((today as any).mindfulness_type);
  }, [today]);

  const markStep = (key: KickstartStepKey, extra: Record<string, unknown> = {}) => {
    saveLog.mutate({
      log_date: todayISO(),
      kickstart_steps: { ...state, [key]: true },
      ...extra,
    });
  };

  // Meditation countdown.
  useEffect(() => {
    if (!timerRunning || secondsLeft <= 0) return;
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setTimerRunning(false);
          markStep('mindfulness', {
            mindfulness_minutes: Number(minutes) || 0,
            mindfulness_type: mtype,
            intention_note: intention || null,
          });
          toast.success('Prayer / meditation logged — good start.');
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerRunning, secondsLeft, minutes, mtype, intention]);

  const startTimer = () => {
    setSecondsLeft(Math.max(1, Number(minutes) || 5) * 60);
    setTimerRunning(true);
  };

  const reflections = useMemo(
    () =>
      logs
        .filter((l: any) => l.intention_note)
        .slice(0, 7)
        .map((l: any) => ({ date: l.log_date, note: String(l.intention_note), type: l.mindfulness_type })),
    [logs],
  );

  const prayerStreak = useMemo(() => {
    let streak = 0;
    const byDate = new Map(logs.map((l: any) => [l.log_date, l]));
    for (let i = 0; i < 400; i += 1) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      const l = byDate.get(d) as any;
      const done = l && (Number(l.mindfulness_minutes ?? 0) > 0 || parseKickstart(l.kickstart_steps).mindfulness);
      if (done) streak += 1;
      else if (i === 0) continue;
      else break;
    }
    return streak;
  }, [logs]);

  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const stepAction = (key: KickstartStepKey) => {
    switch (key) {
      case 'mindfulness':
        startTimer();
        break;
      case 'hydrate':
        markStep('hydrate', { water_oz: Number((today as any)?.water_oz ?? 0) + 16 });
        toast.success('16 oz logged');
        break;
      case 'breakfast':
        markStep('breakfast');
        navigate('/health?tab=nutrition');
        break;
      case 'strength':
        setCoachOpen(true);
        break;
      case 'walk':
        markStep('walk');
        navigate('/health?tab=exercise');
        break;
      case 'supplements':
        markStep('supplements');
        toast.success('Supplements marked');
        break;
    }
  };

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-prism-amber" /> Morning Kickstart
            </span>
            <Badge variant="secondary">
              {progress.done}/{progress.total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={progress.pct} />
          <p className="text-sm text-muted-foreground">
            {progress.complete
              ? 'Full ritual done today. That is how a day gets won.'
              : `Next: ${progress.nextStep?.title}`}
          </p>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{prayerStreak}-day prayer / meditation streak</span>
            <Button size="sm" variant="outline" onClick={() => navigate('/health')}>
              Open
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Sunrise className="h-4 w-4 text-prism-amber" /> Morning Kickstart
            </span>
            <Badge variant="secondary">
              {progress.done}/{progress.total}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={progress.pct} />
          {isLoading ? (
            <div className="h-24 animate-pulse rounded-lg bg-muted" />
          ) : (
            <ol className="space-y-2">
              {KICKSTART_STEPS.map((s) => {
                const done = !!state[s.key];
                const isNext = progress.nextStep?.key === s.key;
                return (
                  <li
                    key={s.key}
                    className={`rounded-lg border p-3 ${isNext ? 'border-primary/50 bg-primary/5' : 'bg-card/50'}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="flex items-center gap-2 text-sm font-medium">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px]">
                            {done ? <Check className="h-3 w-3 text-primary" /> : s.order}
                          </span>
                          {s.title}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">{s.detail}</p>
                      </div>
                      {!done && (
                        <Button size="sm" variant={isNext ? 'default' : 'outline'} onClick={() => stepAction(s.key)}>
                          {s.action}
                        </Button>
                      )}
                    </div>

                    {s.key === 'mindfulness' && !done && (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <Select value={mtype} onValueChange={setMtype}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MINDFULNESS_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>
                                  {t}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={minutes} onValueChange={setMinutes}>
                            <SelectTrigger className="h-9">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MINDFULNESS_PRESETS.map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                  {m} minutes
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Today's intention</Label>
                          <Input
                            value={intention}
                            placeholder="Lead with patience today."
                            onChange={(e) => setIntention(e.target.value)}
                          />
                        </div>
                        {secondsLeft > 0 && (
                          <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3">
                            <span className="text-2xl font-semibold tabular-nums">{mmss(secondsLeft)}</span>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" onClick={() => setTimerRunning((r) => !r)}>
                                {timerRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setTimerRunning(false);
                                  setSecondsLeft(0);
                                }}
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="w-full"
                          onClick={() =>
                            markStep('mindfulness', {
                              mindfulness_minutes: Number(minutes) || 0,
                              mindfulness_type: mtype,
                              intention_note: intention || null,
                            })
                          }
                        >
                          Mark done without the timer
                        </Button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ol>
          )}

          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Prayer / meditation streak</p>
            <p className="text-2xl font-semibold tabular-nums">{prayerStreak} days</p>
          </div>

          {reflections.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Recent intentions</p>
              {reflections.map((r) => (
                <div key={r.date} className="rounded-lg border bg-card/50 p-2 text-xs">
                  <span className="text-muted-foreground">
                    {r.date}
                    {r.type ? ` · ${r.type}` : ''}
                  </span>
                  <p className="mt-0.5">{r.note}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CoachArtyTimer
        open={coachOpen}
        onOpenChange={setCoachOpen}
        exerciseName="Total Gym full body"
        onComplete={() => markStep('strength')}
      />
    </>
  );
}
