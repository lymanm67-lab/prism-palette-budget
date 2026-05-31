import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { useInvestmentMilestones, useToggleMilestone, useSeedMilestones } from '@/hooks/use-investment-plan';

export function MilestoneTracker() {
  const { data: milestones, isLoading } = useInvestmentMilestones();
  const toggle = useToggleMilestone();
  const seed = useSeedMilestones();

  if (isLoading) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading…</CardContent></Card>;

  if (!milestones || milestones.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center space-y-3">
          <p className="text-sm text-muted-foreground">No milestones yet.</p>
          <Button size="sm" onClick={() => seed.mutate()} disabled={seed.isPending}>
            Add default age milestones
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retirement Milestones</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {milestones.map((m: any) => (
          <button
            key={m.id}
            type="button"
            onClick={() => toggle.mutate({ id: m.id, is_completed: !m.is_completed })}
            disabled={toggle.isPending}
            className="w-full flex items-start gap-3 rounded-lg border border-border/50 p-3 hover:bg-muted/30 text-left transition-colors cursor-pointer disabled:opacity-60"
            aria-pressed={m.is_completed}
          >
            <Checkbox
              checked={m.is_completed}
              className="mt-0.5 pointer-events-none"
              tabIndex={-1}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">Age {m.age}</span>
                <p className={`text-sm font-medium ${m.is_completed ? 'line-through text-muted-foreground' : ''}`}>{m.title}</p>
              </div>
              {m.description && <p className="text-xs text-muted-foreground mt-1">{m.description}</p>}
              <p className="text-[10px] text-muted-foreground/70 mt-1.5">
                {m.is_completed ? 'Click to mark as not done' : 'Click to mark as done'}
              </p>
            </div>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
