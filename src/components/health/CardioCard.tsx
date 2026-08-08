import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarIcon, Footprints, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHealthLogs, useHealthProfile, useSaveDailyLog } from '@/hooks/use-health';
import { toast } from 'sonner';


type Activity = {
  id: string;
  label: string;
  group: 'Walking' | 'Jogging' | 'Running';
  mph: number;
  met: number;
};

const ACTIVITIES: Activity[] = [
  { id: 'walk-slow', label: 'Walking — easy (2.0 mph)', group: 'Walking', mph: 2.0, met: 2.8 },
  { id: 'walk-mod', label: 'Walking — moderate (3.0 mph)', group: 'Walking', mph: 3.0, met: 3.5 },
  { id: 'walk-brisk', label: 'Walking — brisk (3.5 mph)', group: 'Walking', mph: 3.5, met: 4.3 },
  { id: 'walk-fast', label: 'Walking — fast (4.0 mph)', group: 'Walking', mph: 4.0, met: 5.0 },
  { id: 'walk-hill', label: 'Walking — uphill / incline (3.5 mph)', group: 'Walking', mph: 3.5, met: 6.0 },
  { id: 'jog-light', label: 'Jogging — light (4.5 mph)', group: 'Jogging', mph: 4.5, met: 7.0 },
  { id: 'jog-steady', label: 'Jogging — steady (5.0 mph)', group: 'Jogging', mph: 5.0, met: 8.3 },
  { id: 'jog-walk', label: 'Jog / walk intervals', group: 'Jogging', mph: 4.0, met: 6.0 },
  { id: 'run-6', label: 'Running — 6.0 mph (10:00 / mi)', group: 'Running', mph: 6.0, met: 9.8 },
  { id: 'run-7', label: 'Running — 7.0 mph (8:34 / mi)', group: 'Running', mph: 7.0, met: 11.0 },
  { id: 'run-8', label: 'Running — 8.0 mph (7:30 / mi)', group: 'Running', mph: 8.0, met: 11.8 },
];

const STRIDE_FT = 2.5; // approximate steps conversion

export default function CardioCard() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const saveLog = useSaveDailyLog();
  const weight = profile?.current_weight ?? 220;

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activityId, setActivityId] = useState('walk-brisk');

  const [mode, setMode] = useState<'time' | 'distance'>('time');
  const [minutes, setMinutes] = useState('30');
  const [miles, setMiles] = useState('2');

  const activity = ACTIVITIES.find((a) => a.id === activityId) ?? ACTIVITIES[2];

  const result = useMemo(() => {
    const mins = mode === 'time' ? Number(minutes) || 0 : ((Number(miles) || 0) / activity.mph) * 60;
    const dist = mode === 'distance' ? Number(miles) || 0 : (activity.mph * (Number(minutes) || 0)) / 60;
    const kg = weight * 0.4536;
    const calories = (activity.met * 3.5 * kg) / 200 * mins;
    const steps = (dist * 5280) / STRIDE_FT;
    const paceMin = dist > 0 ? mins / dist : 0;
    return {
      mins,
      dist,
      calories,
      steps,
      pace: paceMin
        ? `${Math.floor(paceMin)}:${String(Math.round((paceMin % 1) * 60)).padStart(2, '0')} / mi`
        : '—',
      fatLbs: calories / 3500,
    };
  }, [activity, mode, minutes, miles, weight]);

  const logSession = () => {
    const iso = (date ?? new Date()).toISOString().slice(0, 10);
    const existing = logs.find((l: any) => l.log_date === iso) as any | undefined;
    saveLog.mutate(
      {
        log_date: iso,
        miles: Number(existing?.miles ?? 0) + Number(result.dist.toFixed(2)),
        minutes_walked: Number(existing?.minutes_walked ?? 0) + Math.round(result.mins),
        exercise_calories: Number(existing?.exercise_calories ?? 0) + Math.round(result.calories),
      },
      { onSuccess: () => toast.success('Session logged') },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Footprints className="h-5 w-5 text-prism-teal" />
          Walking, jogging &amp; running
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-3">
            <Label>Activity &amp; pace</Label>
            <Select value={activityId} onValueChange={setActivityId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['Walking', 'Jogging', 'Running'] as const).map((g) => (
                  <div key={g}>
                    <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{g}</p>
                    {ACTIVITIES.filter((a) => a.group === g).map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground')}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                  className={cn('p-3 pointer-events-auto')}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1.5">
            <Label>Enter by</Label>

            <Select value={mode} onValueChange={(v) => setMode(v as 'time' | 'distance')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="distance">Distance</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-mins">Minutes</Label>
            <Input
              id="cardio-mins"
              type="number"
              min="0"
              value={mode === 'time' ? minutes : result.mins.toFixed(0)}
              disabled={mode === 'distance'}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cardio-miles">Miles</Label>
            <Input
              id="cardio-miles"
              type="number"
              min="0"
              step="0.1"
              value={mode === 'distance' ? miles : result.dist.toFixed(2)}
              disabled={mode === 'time'}
              onChange={(e) => setMiles(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-lg border bg-card/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Calories burned</p>
            <p className="mt-1 text-2xl font-semibold">{Math.round(result.calories)}</p>
          </div>
          <div className="rounded-lg border bg-card/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Pace</p>
            <p className="mt-1 text-2xl font-semibold">{result.pace}</p>
          </div>
          <div className="rounded-lg border bg-card/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Est. steps</p>
            <p className="mt-1 text-2xl font-semibold">{Math.round(result.steps).toLocaleString()}</p>
          </div>
          <div className="rounded-lg border bg-card/50 p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Fat equivalent</p>
            <p className="mt-1 text-2xl font-semibold">{result.fatLbs.toFixed(2)} lb</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={logSession} disabled={saveLog.isPending}>
            <Plus className="mr-1 h-4 w-4" /> Log this session
          </Button>
          <span className="text-xs text-muted-foreground">
            Adds the miles and calories burned to that day's log and your nutrition energy balance.
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="secondary">MET {activity.met}</Badge>
          <Badge variant="secondary">{weight} lb body weight</Badge>
          <Badge variant="outline">
            {Math.round(result.calories * 7).toLocaleString()} cal / week if done daily
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Calories use the standard MET formula (MET x 3.5 x kg / 200 x minutes) with your logged weight, so
          the number drops as you get lighter. Steps assume a {STRIDE_FT} ft stride.
        </p>
      </CardContent>
    </Card>
  );
}
