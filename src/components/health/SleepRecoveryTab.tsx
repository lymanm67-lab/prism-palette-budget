import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Moon, BatteryCharging, Waves, BedDouble } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useHealthLogs, useHealthProfile } from '@/hooks/use-health';
import { sleepSummary } from '@/lib/health/sleepRecovery';

const h = (v: number | null) => (v == null ? '—' : `${v.toFixed(1)}h`);
const r1 = (v: number | null) => (v == null ? '—' : v.toFixed(1));

export default function SleepRecoveryTab() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();

  const target = Number((profile as any)?.sleep_target_hours ?? 7.5) || 7.5;
  const s = useMemo(() => sleepSummary(logs, target, 30), [logs, target]);

  const chart = s.series.map((p) => ({
    date: p.date.slice(5),
    sleep: p.sleep,
    energy: p.energy,
    stress: p.stress,
  }));
  const sleepPoints = chart.filter((p) => p.sleep != null).length;
  const moodPoints = chart.filter((p) => p.energy != null || p.stress != null).length;


  const scoreTone =
    s.recoveryScore >= 80
      ? 'text-prism-lime'
      : s.recoveryScore >= 60
        ? 'text-prism-teal'
        : s.recoveryScore >= 40
          ? 'text-prism-amber'
          : 'text-destructive';

  const stats = [
    { icon: Moon, label: '7-day avg sleep', value: h(s.avgSleep7), sub: `target ${target}h` },
    { icon: BedDouble, label: '30-day avg sleep', value: h(s.avgSleep30), sub: `${s.nights} nights logged` },
    { icon: BatteryCharging, label: 'Sleep debt (7d)', value: `${s.sleepDebt}h`, sub: 'hours below target' },
    { icon: Waves, label: 'Consistency', value: s.consistencyPct == null ? '—' : `${s.consistencyPct}%`, sub: 'nights on target' },
  ];

  return (
    <div className="space-y-6">
      <Card className="border-0 prism-gradient-violet">
        <CardContent className="p-6">
          <p className="text-xs uppercase tracking-wide text-prism-on-dark-muted">Recovery score</p>
          <div className="mt-2 flex flex-wrap items-end gap-3">
            <span className="text-4xl font-bold text-prism-on-dark">{s.recoveryScore}</span>
            <span className="text-sm text-prism-on-dark-muted">/ 100 · {s.recoveryLabel}</span>
          </div>
          <Progress value={s.recoveryScore} className="mt-4 h-2 bg-white/20" />
          <p className="mt-3 text-sm text-prism-on-dark">{s.restDayReason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="outline" className="border-white/30 bg-white/10 text-prism-on-dark">
              {s.restDayRecommended ? 'Rest day recommended' : 'Cleared to train'}
            </Badge>
            <Badge variant="outline" className="border-white/30 bg-white/10 text-prism-on-dark">
              {s.shortNights} short nights (30d)
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((st) => (
          <Card key={st.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <st.icon className="h-4 w-4" />
                <span className="text-xs">{st.label}</span>
              </div>
              <p className={`mt-2 text-2xl font-semibold ${scoreTone}`}>{st.value}</p>
              <p className="text-xs text-muted-foreground">{st.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sleep hours — last 30 days</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px]">
          {sleepPoints === 0 ? (
            <p className="text-sm text-muted-foreground">
              Log sleep hours on the Command Center (or import from Apple Health) to see trends here.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chart.filter((p) => p.sleep != null)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="!bg-transparent" />
                <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} className="!bg-transparent" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <ReferenceLine y={target} stroke="hsl(var(--primary))" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="sleep"
                  name="Sleep (h)"
                  stroke="hsl(var(--primary))"
                  fill="hsl(var(--primary) / 0.2)"
                  connectNulls
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}

        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Energy vs. stress</CardTitle>
        </CardHeader>
        <CardContent className="h-[240px]">
          {moodPoints === 0 ? (
            <p className="text-sm text-muted-foreground">No energy or stress ratings logged yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart.filter((p) => p.energy != null || p.stress != null)}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="!bg-transparent" />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} className="!bg-transparent" />
                <Tooltip
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 8,
                    color: 'hsl(var(--foreground))',
                  }}
                />
                <Line type="monotone" dataKey="energy" name="Energy" stroke="hsl(var(--chart-2))" connectNulls dot={{ r: 3 }} />
                <Line type="monotone" dataKey="stress" name="Stress" stroke="hsl(var(--chart-4))" connectNulls dot={{ r: 3 }} />

              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">What the numbers say</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            Average energy <strong>{r1(s.avgEnergy)}</strong>/10, stress{' '}
            <strong>{r1(s.avgStress)}</strong>/10, mood <strong>{r1(s.avgMood)}</strong>/10 across the
            last 30 days.
          </p>
          <p className="text-muted-foreground">
            Sleep debt is the total hours below your {target}h target over the last 7 nights. Paying it
            back with one or two 9-hour nights restores energy faster than a single long weekend
            sleep-in.
          </p>
          <p className="text-muted-foreground">
            Educational only — not medical advice. Talk to your clinician about persistent sleep issues.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
