import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { ListChecks, Search } from 'lucide-react';
import { useHpTasks, useUpdateTask, useHpMilestones } from '@/hooks/use-hp-planner';

type FilterStatus = 'all' | 'open' | 'complete';

export default function TasksMasterList({ projectId, onOpenMonth }: { projectId: string; onOpenMonth?: (monthIndex: number) => void }) {
  const { data: tasks = [] } = useHpTasks(projectId);
  const { data: milestones = [] } = useHpMilestones(projectId);
  const updateTask = useUpdateTask();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<FilterStatus>('all');
  const [milestoneId, setMilestoneId] = useState<string>('all');

  const milestoneById = useMemo(() => {
    const m: Record<string, any> = {};
    for (const ms of milestones) m[ms.id] = ms;
    return m;
  }, [milestones]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks
      .filter((t: any) => (status === 'all' ? true : status === 'complete' ? t.status === 'complete' : t.status !== 'complete'))
      .filter((t: any) => (milestoneId === 'all' ? true : t.milestone_id === milestoneId))
      .filter((t: any) => (q ? t.title.toLowerCase().includes(q) : true));
  }, [tasks, search, status, milestoneId]);

  // Group by milestone → week
  const grouped = useMemo(() => {
    const byMilestone: Record<string, any[]> = {};
    for (const t of filtered) {
      (byMilestone[t.milestone_id] ||= []).push(t);
    }
    return Object.entries(byMilestone)
      .map(([mid, list]) => ({
        milestone: milestoneById[mid],
        tasks: list.sort((a: any, b: any) => (a.week_index ?? 0) - (b.week_index ?? 0)),
      }))
      .sort((a, b) => (a.milestone?.month_index ?? 0) - (b.milestone?.month_index ?? 0));
  }, [filtered, milestoneById]);

  const done = tasks.filter((t: any) => t.status === 'complete').length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-lg flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-prism-teal" />
          All Tasks
          <Badge variant="outline" className="ml-2 text-[10px]">
            {done}/{tasks.length} · {pct}%
          </Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground">Every task across every month, in one place. Check items off here or jump to the month view.</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search tasks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-sm"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as FilterStatus)}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open only</SelectItem>
              <SelectItem value="complete">Complete only</SelectItem>
            </SelectContent>
          </Select>
          <Select value={milestoneId} onValueChange={setMilestoneId}>
            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {milestones.map((m: any) => (
                <SelectItem key={m.id} value={m.id}>
                  M{m.month_index + 1} · {m.month_label || m.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {grouped.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center">No tasks match those filters.</div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ milestone, tasks: list }) => (
              <div key={milestone?.id ?? 'unknown'} className="rounded-md border border-border/30 bg-card/30">
                <button
                  type="button"
                  className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-card/50 transition"
                  onClick={() => milestone && onOpenMonth?.(milestone.month_index)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                      M{(milestone?.month_index ?? 0) + 1}
                    </span>
                    <span className="text-sm font-semibold">{milestone?.month_label || milestone?.title || 'Unassigned'}</span>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {list.filter((t: any) => t.status === 'complete').length}/{list.length}
                  </Badge>
                </button>
                <div className="divide-y divide-border/20">
                  {list.map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2 px-3 py-2">
                      <Checkbox
                        checked={t.status === 'complete'}
                        onCheckedChange={(v) =>
                          updateTask.mutate({
                            id: t.id,
                            patch: {
                              status: v ? 'complete' : 'pending',
                              completed_at: v ? new Date().toISOString() : null,
                            },
                          })
                        }
                      />
                      <div className={`flex-1 text-sm ${t.status === 'complete' ? 'line-through text-muted-foreground' : ''}`}>
                        {t.title}
                      </div>
                      {typeof t.week_index === 'number' && (
                        <Badge variant="outline" className="text-[10px] shrink-0">W{t.week_index + 1}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
