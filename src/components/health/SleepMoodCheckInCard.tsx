// Sleep + energy/stress check-in. Used in Morning Kickstart (prompt) and the
// Sleep & Recovery tab (full manual entry + edit of past days).
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Moon, Save, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useHealthLogs, useSaveDailyLog } from '@/hooks/use-health';
import { todayISO } from '@/lib/health/healthEngine';

type Props = {
  /** 'prompt' = compact morning ask, 'full' = manual entry + editable history */
  variant?: 'prompt' | 'full';
};

const RATINGS = [
  ['energy_rating', 'Energy'],
  ['stress_rating', 'Stress'],
  ['mood_rating', 'Mood'],
  ['focus_rating', 'Focus'],
] as const;

export default function SleepMoodCheckInCard({ variant = 'full' }: Props) {
  const { data: logs = [] } = useHealthLogs();
  const save = useSaveDailyLog();

  const [date, setDate] = useState(todayISO());
  const row = useMemo(
    () => (logs as any[]).find((l) => l.log_date === date) ?? null,
    [logs, date],
  );

  const [dirty, setDirty] = useState(false);
  const [form, setForm] = useState<Record<string, any>>({});

  const value = (k: string, fallback: any) =>
    dirty && form[k] !== undefined ? form[k] : (row?.[k] ?? fallback);

  const set = (k: string, v: any) => {
    setForm((f) => ({ ...f, [k]: v }));
    setDirty(true);
  };

  const commit = () => {
    const num = (v: unknown) => {
      const n = parseFloat(String(v));
      return Number.isFinite(n) ? n : null;
    };
    save.mutate(
      {
        log_date: date,
        sleep_hours: num(value('sleep_hours', '')),
        energy_rating: Number(value('energy_rating', 3)),
        stress_rating: Number(value('stress_rating', 3)),
        mood_rating: Number(value('mood_rating', 3)),
        focus_rating: Number(value('focus_rating', 3)),
      },
      {
        onSuccess: () => {
          setDirty(false);
          setForm({});
          toast.success('Sleep & mood check-in saved');
        },
      },
    );
  };

  const done = row?.sleep_hours != null && row?.energy_rating != null;

  const recent = useMemo(
    () =>
      [...(logs as any[])]
        .filter((l) => l.sleep_hours != null || l.energy_rating != null || l.stress_rating != null)
        .sort((a, b) => b.log_date.localeCompare(a.log_date))
        .slice(0, 7),
    [logs],
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span className="flex items-center gap-2">
            <Moon className="h-4 w-4" />
            {variant === 'prompt' ? 'How did you sleep?' : 'Sleep & mood check-in'}
          </span>
          <Badge variant={done ? 'default' : 'outline'}>{done ? 'Logged' : 'Needs entry'}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={date}
              max={todayISO()}
              onChange={(e) => {
                setDate(e.target.value || todayISO());
                setDirty(false);
                setForm({});
              }}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Hours slept last night</Label>
            <Input
              type="number"
              step="0.25"
              min="0"
              max="16"
              placeholder="7.5"
              value={value('sleep_hours', '') ?? ''}
              onChange={(e) => set('sleep_hours', e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {RATINGS.map(([k, label]) => (
            <div key={k} className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{Number(value(k, 3))}/10</span>
              </div>
              <Slider
                min={1}
                max={10}
                step={1}
                value={[Number(value(k, 3))]}
                onValueChange={([v]) => set(k, v)}
              />
            </div>
          ))}
        </div>

        <Button onClick={commit} disabled={save.isPending} className="w-full sm:w-auto">
          <Save className="mr-1 h-4 w-4" /> Save check-in
        </Button>

        {variant === 'full' && recent.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Recent entries — tap to edit
            </p>
            <div className="space-y-1">
              {recent.map((l) => (
                <button
                  key={l.log_date}
                  onClick={() => {
                    setDate(l.log_date);
                    setDirty(false);
                    setForm({});
                  }}
                  className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-muted"
                >
                  <span className="flex items-center gap-2">
                    <Pencil className="h-3 w-3 text-muted-foreground" />
                    {l.log_date}
                  </span>
                  <span className="text-muted-foreground">
                    {l.sleep_hours != null ? `${Number(l.sleep_hours).toFixed(1)}h` : '—'} · E{' '}
                    {l.energy_rating ?? '—'} · S {l.stress_rating ?? '—'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Log sleep in the morning and revisit before bed to update energy and stress — both feed
          your recovery score and Weekly Health Score.
        </p>
      </CardContent>
    </Card>
  );
}
