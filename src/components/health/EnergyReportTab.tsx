import { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Flame, Printer, Save, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import {
  caloriesFromMiles,
  energyBalance,
  fatPoundsFromCalories,
  weightStatus,
} from '@/lib/health/healthEngine';
import {
  useHealthLogs,
  useHealthMeals,
  useHealthProfile,
  useHealthUpsert,
} from '@/hooks/use-health';

const RANGES = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

export default function EnergyReportTab() {
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const saveReport = useHealthUpsert('health_coach_reports');
  const [range, setRange] = useState('30');

  const days = Number(range);
  const calorieGoal = Number((profile as any)?.calorie_goal ?? 1700);
  const waterGoal = Number(profile?.water_goal_oz ?? 100);
  const goalWeight = Number(profile?.goal_weight ?? 175);
  const status = useMemo(() => weightStatus(profile ?? null, logs), [profile, logs]);
  const currentWeight = Number(status?.current ?? profile?.current_weight ?? 220);

  const series = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    const byDay = new Map<string, any>();
    for (const l of logs as any[]) byDay.set(l.log_date, l);

    const mealsByDay = new Map<string, number>();
    for (const m of meals as any[]) {
      mealsByDay.set(m.meal_date, (mealsByDay.get(m.meal_date) ?? 0) + (Number(m.calories) || 0));
    }

    const out: {
      date: string;
      label: string;
      caloriesIn: number;
      burned: number;
      walkingBurn: number;
      exerciseBurn: number;
      net: number;
      waterOz: number;
      miles: number;
      weight: number | null;
    }[] = [];

    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const log = byDay.get(iso);
      const miles = Number(log?.miles ?? 0);
      const weight = log?.weight != null ? Number(log.weight) : null;
      const eb = energyBalance({
        caloriesIn: mealsByDay.get(iso) ?? 0,
        miles,
        weightLb: weight ?? currentWeight,
        exerciseCalories: Number(log?.exercise_calories ?? 0),
        calorieGoal,
      });
      out.push({
        date: iso,
        label: iso.slice(5),
        caloriesIn: Math.round(eb.caloriesIn),
        burned: Math.round(eb.burned),
        walkingBurn: Math.round(eb.walkingBurn),
        exerciseBurn: Math.round(eb.exerciseBurn),
        net: Math.round(eb.net),
        waterOz: Math.round(Number(log?.water_oz ?? 0)),
        miles,
        weight,
      });
    }
    return out;
  }, [logs, meals, days, calorieGoal, currentWeight]);

  const totals = useMemo(() => {
    const loggedDays = series.filter((d) => d.caloriesIn > 0 || d.burned > 0).length || 1;
    const sum = (f: (d: typeof series[number]) => number) => series.reduce((s, d) => s + f(d), 0);
    const caloriesIn = sum((d) => d.caloriesIn);
    const burned = sum((d) => d.burned);
    const deficit = sum((d) => Math.max(0, calorieGoal - d.net));
    return {
      loggedDays,
      caloriesIn,
      burned,
      exerciseBurn: sum((d) => d.exerciseBurn),
      walkingBurn: sum((d) => d.walkingBurn),
      miles: sum((d) => d.miles),
      avgIn: Math.round(caloriesIn / loggedDays),
      avgBurn: Math.round(burned / loggedDays),
      avgWater: Math.round(sum((d) => d.waterOz) / loggedDays),
      projectedLbs: fatPoundsFromCalories(deficit),
    };
  }, [series, calorieGoal]);

  const weightSeries = useMemo(() => {
    const points = series.filter((d) => d.weight != null);
    return series.map((d, i) => ({
      label: d.label,
      weight: d.weight,
      target:
        Math.max(
          goalWeight,
          (points[0]?.weight ?? currentWeight) - (1.5 / 7) * i,
        ),
    }));
  }, [series, goalWeight, currentWeight]);

  const lbsToGo = Math.max(0, currentWeight - goalWeight);

  const saveSnapshot = () => {
    const lines = [
      `# Energy Balance Report — last ${days} days`,
      '',
      `- Days logged: ${totals.loggedDays}`,
      `- Calories consumed: ${totals.caloriesIn.toLocaleString()} (avg ${totals.avgIn.toLocaleString()}/day, goal ${calorieGoal.toLocaleString()})`,
      `- Total calories burned: ${totals.burned.toLocaleString()} (walking ${totals.walkingBurn.toLocaleString()}, exercise ${totals.exerciseBurn.toLocaleString()})`,
      `- Miles walked: ${totals.miles.toFixed(1)}`,
      `- Average water: ${totals.avgWater} oz/day (goal ${waterGoal} oz)`,
      `- Projected fat loss from deficit: ${totals.projectedLbs.toFixed(1)} lb`,
      `- Current weight ${currentWeight} lb → goal ${goalWeight} lb (${lbsToGo.toFixed(1)} lb to go)`,
    ].join('\n');

    saveReport.mutate(
      {
        report_type: 'energy',
        content: lines,
        metrics: {
          range_days: days,
          calories_in: totals.caloriesIn,
          calories_burned: totals.burned,
          exercise_burn: totals.exerciseBurn,
          walking_burn: totals.walkingBurn,
          miles: totals.miles,
          avg_water_oz: totals.avgWater,
          projected_lbs: totals.projectedLbs,
        },
      },
      { onSuccess: () => toast.success('Report saved') },
    );
  };

  const kpis = [
    { label: 'Total calories burned', value: totals.burned.toLocaleString(), hint: `${totals.miles.toFixed(1)} mi walked` },
    { label: 'Exercise burn', value: totals.exerciseBurn.toLocaleString(), hint: 'Total Gym & strength sessions' },
    { label: 'Calories consumed', value: totals.caloriesIn.toLocaleString(), hint: `avg ${totals.avgIn.toLocaleString()}/day` },
    { label: 'Avg water', value: `${totals.avgWater} oz`, hint: `goal ${waterGoal} oz/day` },
    { label: 'Projected fat loss', value: `${totals.projectedLbs.toFixed(1)} lb`, hint: 'from logged deficit' },
    { label: 'To goal weight', value: `${lbsToGo.toFixed(1)} lb`, hint: `${currentWeight} → ${goalWeight} lb` },
  ];

  return (
    <div className="space-y-6 print-area">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
            <span className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-prism-orange" /> Meals vs. exercise &amp; hydration report
            </span>
            <span className="flex flex-wrap items-center gap-2 no-print">
              <Tabs value={range} onValueChange={setRange}>
                <TabsList>
                  {RANGES.map((r) => (
                    <TabsTrigger key={r.value} value={r.value}>
                      {r.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <Button size="sm" variant="outline" onClick={saveSnapshot} disabled={saveReport.isPending}>
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
              <Button size="sm" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Print
              </Button>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {kpis.map((k) => (
              <div key={k.label} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground">{k.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums">{k.value}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{k.hint}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Calories in vs. calories burned</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="caloriesIn" name="Consumed" fill="hsl(var(--prism-amber))" radius={[3, 3, 0, 0]} />
              <Bar dataKey="walkingBurn" name="Walking burn" stackId="burn" fill="hsl(var(--prism-teal))" />
              <Bar dataKey="exerciseBurn" name="Exercise burn" stackId="burn" fill="hsl(var(--prism-lime))" />
              <Line type="monotone" dataKey="net" name="Net calories" stroke="hsl(var(--prism-rose))" dot={false} strokeWidth={2} />
              <ReferenceLine
                y={calorieGoal}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="4 4"
                label={{ value: `Goal ${calorieGoal}`, position: 'insideTopRight', fontSize: 11 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Water consumption vs. goal</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="waterOz" name="Water (oz)" fill="hsl(var(--prism-sky))" radius={[3, 3, 0, 0]} />
                <ReferenceLine y={waterGoal} stroke="hsl(var(--muted-foreground))" strokeDasharray="4 4" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-prism-lime" /> Weight vs. target trajectory
            </CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weightSeries} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="weight" name="Logged weight" stroke="hsl(var(--prism-amber))" connectNulls dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="target" name="Target pace (1.5 lb/wk)" stroke="hsl(var(--prism-teal))" strokeDasharray="5 4" dot={false} />
                <ReferenceLine y={goalWeight} stroke="hsl(var(--prism-lime))" strokeDasharray="4 4" label={{ value: `Goal ${goalWeight}`, position: 'insideTopRight', fontSize: 11 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Daily detail</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3">Date</th>
                <th className="py-2 pr-3 text-right">Consumed</th>
                <th className="py-2 pr-3 text-right">Walking</th>
                <th className="py-2 pr-3 text-right">Exercise</th>
                <th className="py-2 pr-3 text-right">Total burned</th>
                <th className="py-2 pr-3 text-right">Net</th>
                <th className="py-2 pr-3 text-right">Water</th>
                <th className="py-2 text-right">Weight</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((d) => (
                <tr key={d.date} className="border-b last:border-0">
                  <td className="py-1.5 pr-3">{d.date}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{d.caloriesIn}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{d.walkingBurn}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{d.exerciseBurn}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{d.burned}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{d.net}</td>
                  <td className="py-1.5 pr-3 text-right tabular-nums">{d.waterOz} oz</td>
                  <td className="py-1.5 text-right tabular-nums">{d.weight ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Badge variant="secondary">
              Walking burn ≈ {Math.round(caloriesFromMiles(1, currentWeight))} cal per mile at {currentWeight} lb
            </Badge>
            <Badge variant="outline">Educational estimates only — not medical advice.</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
