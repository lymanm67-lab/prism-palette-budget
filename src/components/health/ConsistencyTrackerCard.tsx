// Consistency Tracker — points, level, streak and habit heat strip.
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Flame, Trophy, Sparkles, ChevronRight } from 'lucide-react';
import { useHealthLogs, useHealthMeals, useHealthProfile } from '@/hooks/use-health';
import { HABITS, buildConsistency } from '@/lib/health/consistency';

export default function ConsistencyTrackerCard({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { data: rawLogs = [], isLoading } = useHealthLogs();
  const { data: meals = [] } = useHealthMeals();
  const { data: profile } = useHealthProfile();

  // Merge logged drinks/meals into the daily logs so water logged in Nutrition counts here too.
  const logs = useMemo(() => mergeMealsIntoLogs(rawLogs as any[], meals as any[]), [rawLogs, meals]);

  const c = useMemo(() => buildConsistency(logs as any, meals as any, profile ?? null), [logs, meals, profile]);

  const waterGoal = profile?.water_goal_oz ?? 100;
  const waterToday = useMemo(() => {
    const t = todayISO();
    return Math.round(Number((logs as any[]).find((l) => l.log_date === t)?.water_oz ?? 0));
  }, [logs]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-40 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }

  const ring = (
    <div className="relative flex h-28 w-28 shrink-0 items-center justify-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90">
        <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r="52"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 52}
          strokeDashoffset={2 * Math.PI * 52 * (1 - c.pct7 / 100)}
        />
      </svg>
      <div className="text-center">
        <p className="text-2xl font-bold tabular-nums">{c.pct7}%</p>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">7-day</p>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-prism-amber" /> Consistency Tracker
          </span>
          <Badge variant="secondary">{c.level.name}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          {ring}
          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-prism-orange" />
              <span className="text-xl font-semibold tabular-nums">{c.streak}</span>
              <span className="text-sm text-muted-foreground">day streak · best {c.bestStreak}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sparkles className="h-4 w-4 text-prism-teal" />
              <span className="font-semibold tabular-nums">{c.totalPoints.toLocaleString()}</span>
              <span className="text-muted-foreground">points · {c.weekPoints} this week</span>
            </div>
            <p className="text-xs text-muted-foreground">30-day consistency {c.pct30}%</p>
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{c.level.name} level</span>
            <span>
              {c.level.pointsToNext === null
                ? 'Top level reached'
                : `${c.level.pointsToNext.toLocaleString()} points to next level`}
            </span>
          </div>
          <Progress value={c.level.progressPct} />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {HABITS.map((h) => {
            const rate = Math.round((c.weekHitRate[h.key] ?? 0) * 7);
            return (
              <Badge key={h.key} variant={rate >= 5 ? 'default' : rate >= 3 ? 'secondary' : 'outline'}>
                {h.short} {rate}/7
              </Badge>
            );
          })}
        </div>

        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Last 30 days</p>
          <div className="flex flex-wrap gap-1">
            {c.days.map((d) => (
              <span
                key={d.date}
                title={`${d.date} — ${d.hitCount}/${HABITS.length} habits`}
                className={`h-3.5 w-3.5 rounded-sm ${
                  d.perfect
                    ? 'bg-primary'
                    : d.hitCount >= 3
                      ? 'bg-primary/60'
                      : d.hitCount >= 1
                        ? 'bg-primary/30'
                        : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>

        {!compact && (
          <div className="flex flex-wrap gap-1.5">
            {c.badges.map((b) => (
              <Badge key={b.key} variant={b.earned ? 'default' : 'outline'} className={b.earned ? '' : 'opacity-50'}>
                {b.label}
              </Badge>
            ))}
          </div>
        )}

        <p className="text-sm text-muted-foreground">{c.motivation}</p>

        {compact && (
          <Button variant="outline" size="sm" onClick={() => navigate('/health')}>
            Open Health OS <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
