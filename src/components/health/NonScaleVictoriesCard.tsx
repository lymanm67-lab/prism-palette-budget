import { CheckCircle2, Circle, Trophy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useHealthAchievements, useHealthDelete, useHealthUpsert } from '@/hooks/use-health';
import { NON_SCALE_VICTORIES } from '@/lib/health/longevityHabits';
import { todayISO, formatDate } from '@/lib/health/healthEngine';

/** Section 17: non-scale victories, stored as achievements. */
export default function NonScaleVictoriesCard() {
  const { data: rows = [] } = useHealthAchievements();
  const upsert = useHealthUpsert('health_achievements');
  const remove = useHealthDelete('health_achievements');

  const byKey = new Map(
    (rows as Record<string, unknown>[])
      .filter((r) => String(r.badge_key ?? '').startsWith('nsv:'))
      .map((r) => [String(r.badge_key).slice(4), r]),
  );

  const toggle = (key: string, label: string) => {
    const existing = byKey.get(key);
    if (existing) remove.mutate(String(existing.id));
    else upsert.mutate({ badge_key: `nsv:${key}`, label, earned_on: todayISO() });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="h-4 w-4 text-prism-amber" /> Non-scale victories
        </CardTitle>
        <CardDescription>
          These matter as much as the scale. Tap one when you notice it.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
        {NON_SCALE_VICTORIES.map((v) => {
          const hit = byKey.get(v.key);
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => toggle(v.key, v.label)}
              className="flex items-center gap-2 rounded-md p-2 text-left text-sm hover:bg-muted/50"
            >
              {hit ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-prism-teal" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className="min-w-0 flex-1">{v.label}</span>
              {hit?.earned_on && (
                <span className="text-xs text-muted-foreground">{formatDate(String(hit.earned_on))}</span>
              )}
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
}
