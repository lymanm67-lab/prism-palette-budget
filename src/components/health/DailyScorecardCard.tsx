import { useMemo } from 'react';
import { CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useHealthLogs, useHealthMeals, useHealthProfile, useSaveDailyLog } from '@/hooks/use-health';
import { mergeMealsIntoLogs } from '@/lib/health/mealRollup';
import { todayISO, type DailyLog } from '@/lib/health/healthEngine';
import { scorecardFor, scorecardHistory } from '@/lib/health/longevityHabits';

/** Section 20: the daily longevity scorecard. Consistency beats perfection. */
export default function DailyScorecardCard() {
  const { data: logs = [] } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const { data: profile } = useHealthProfile();
  const save = useSaveDailyLog();

  const merged = useMemo(
    () => mergeMealsIntoLogs(logs as Record<string, unknown>[], meals) as unknown as DailyLog[],
    [logs, meals],
  );
  const today = merged.find((l) => l.log_date === todayISO());
  const card = useMemo(() => scorecardFor(today as never, (profile ?? null) as never), [today, profile]);
  const history = useMemo(
    () => scorecardHistory(merged as never, (profile ?? null) as never, 30),
    [merged, profile],
  );

  const week = history.slice(-7);
  const weekAvg = week.reduce((s, d) => s + d.done, 0) / Math.max(1, week.length);
  const monthRate = (history.filter((d) => d.done >= 7).length / history.length) * 100;

  const toggle = (key: string, current: boolean) => {
    const existing = ((today as Record<string, unknown> | undefined)?.scorecard ?? {}) as Record<string, boolean>;
    save.mutate({ log_date: todayISO(), scorecard: { ...existing, [key]: !current } });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <ListChecks className="h-4 w-4 text-primary" /> Daily Longevity Scorecard
        </CardTitle>
        <CardDescription>Consistency beats perfection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <p className="text-2xl font-bold">
              {card.done}/{card.total}
            </p>
            <p className="text-xs text-muted-foreground">Today</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{weekAvg.toFixed(1)}/10</p>
            <p className="text-xs text-muted-foreground">7-day average</p>
          </div>
          <div>
            <p className="text-lg font-semibold">{Math.round(monthRate)}%</p>
            <p className="text-xs text-muted-foreground">30-day consistency</p>
          </div>
        </div>
        <Progress value={card.pct} className="h-2" />

        <div className="grid gap-1 sm:grid-cols-2">
          {card.items.map((i) => (
            <button
              key={i.key}
              type="button"
              onClick={() => toggle(i.key, i.done)}
              className="flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted/50"
            >
              {i.done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-prism-teal" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">{i.label}</span>
              {i.auto && i.done && (
                <Badge variant="outline" className="text-[10px]">
                  auto
                </Badge>
              )}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
