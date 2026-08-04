import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Trophy, Gift, Award, CheckCircle2 } from 'lucide-react';
import {
  BADGES,
  earnedBadgeKeys,
  formatDate,
  projectMilestoneDate,
  todayISO,
  walkTotals,
  weightStatus,
} from '@/lib/health/healthEngine';
import {
  useHealthAchievements,
  useHealthLogs,
  useHealthMilestones,
  useHealthProfile,
  useHealthSeed,
  useHealthUpsert,
} from '@/hooks/use-health';

export default function MilestonesTab() {
  useHealthSeed();
  const { data: profile } = useHealthProfile();
  const { data: logs = [] } = useHealthLogs();
  const { data: milestones = [] } = useHealthMilestones();
  const { data: achievements = [] } = useHealthAchievements();
  const saveMilestone = useHealthUpsert('health_milestones');

  const status = weightStatus(profile ?? null, logs);
  const totals = walkTotals(logs, profile ?? null);
  const earned = earnedBadgeKeys(logs, totals, status, profile ?? null);
  const storedKeys = new Set(achievements.map((a) => a.badge_key));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4 text-prism-amber" /> Weight milestones &amp; rewards
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {milestones.length === 0 && (
            <p className="text-sm text-muted-foreground">Setting up your milestone ladder…</p>
          )}
          {milestones.map((m) => {
            const target = Number(m.weight_target);
            const hit = m.actual_date != null || (status ? status.current <= target : false);
            const eta = projectMilestoneDate(target, status);
            const start = status?.start ?? profile?.start_weight ?? target;
            const pct = status
              ? Math.min(1, Math.max(0, (start - status.current) / Math.max(1, start - target)))
              : 0;
            return (
              <div
                key={m.id}
                className={`rounded-lg border p-4 ${hit ? 'border-prism-lime/40 bg-prism-lime/5' : ''}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      {hit && <CheckCircle2 className="h-4 w-4 text-prism-lime" />}
                      {target} lb
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <Gift className="h-3.5 w-3.5" /> {m.reward ?? 'Set a reward'}
                    </p>
                  </div>
                  <div className="text-right">
                    {hit ? (
                      <Badge variant="outline" className="border-prism-lime/30 bg-prism-lime/15 text-prism-lime">
                        Achieved {m.actual_date ? formatDate(m.actual_date) : ''}
                      </Badge>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground">Projected</p>
                        <p className="text-sm font-medium">{eta ? formatDate(eta) : '—'}</p>
                      </>
                    )}
                  </div>
                </div>
                <Progress value={pct * 100} className="mt-3 h-1.5" />
                {!m.actual_date && hit && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3"
                    onClick={() => saveMilestone.mutate({ id: m.id, actual_date: todayISO() })}
                  >
                    Mark achieved &amp; claim reward
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Award className="h-4 w-4 text-prism-teal" /> Achievement badges
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {BADGES.map((b) => {
              const has = earned.includes(b.key) || storedKeys.has(b.key);
              return (
                <div
                  key={b.key}
                  className={`rounded-lg border p-3 text-center ${
                    has ? 'border-prism-amber/40 bg-prism-amber/10' : 'opacity-60'
                  }`}
                >
                  <Award
                    className={`mx-auto h-6 w-6 ${has ? 'text-prism-amber' : 'text-muted-foreground'}`}
                  />
                  <p className="mt-2 text-sm font-medium">{b.label}</p>
                  <p className="text-xs capitalize text-muted-foreground">{b.group}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
