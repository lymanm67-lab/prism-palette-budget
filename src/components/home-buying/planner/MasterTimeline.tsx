import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { useHpMilestones, useHpTasks, useUpdateMilestone } from '@/hooks/use-hp-planner';

const STATUS_COLORS: Record<string, string> = {
  pending: 'hsl(var(--muted))',
  in_progress: 'hsl(var(--prism-teal))',
  complete: 'hsl(var(--prism-lime))',
  delayed: 'hsl(var(--prism-amber))',
  blocked: 'hsl(var(--prism-rose))',
};

export default function MasterTimeline({ projectId, onSelectMonth }: { projectId: string; onSelectMonth?: (idx: number) => void }) {
  const { data: milestones = [] } = useHpMilestones(projectId);
  const { data: tasks = [] } = useHpTasks(projectId);
  const updateM = useUpdateMilestone();

  const rows = useMemo(() => {
    return milestones.map((m: any) => {
      const monthTasks = tasks.filter((t: any) => t.milestone_id === m.id);
      const done = monthTasks.filter((t: any) => t.status === 'complete').length;
      const pct = monthTasks.length ? Math.round((done / monthTasks.length) * 100) : (m.completion_pct || 0);
      return { ...m, taskDone: done, taskTotal: monthTasks.length, pct };
    });
  }, [milestones, tasks]);

  const totalMonths = milestones.length || 1;

  return (
    <Card className="prism-card-shine border-border/50">
      <CardHeader>
        <CardTitle className="font-display text-lg">Master Timeline</CardTitle>
        <p className="text-xs text-muted-foreground">Every major goal from today to closing. Click a bar to jump to that month.</p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[720px] space-y-1.5">
            {/* Header row */}
            <div className="grid gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-bold pb-2 border-b border-border/40" style={{ gridTemplateColumns: '180px 100px 1fr 80px 80px' }}>
              <div>Month / Goal</div>
              <div>Status</div>
              <div>Progress</div>
              <div>Tasks</div>
              <div className="text-right">Due</div>
            </div>

            {rows.map((m: any) => (
              <div
                key={m.id}
                className="grid gap-2 items-center py-2 border-b border-border/20 hover:bg-card/30 transition-colors cursor-pointer rounded"
                style={{ gridTemplateColumns: '180px 100px 1fr 80px 80px' }}
                onClick={() => onSelectMonth?.(m.month_index)}
              >
                <div className="space-y-0.5 pl-2">
                  <div className="text-[10px] text-muted-foreground font-bold">{m.month_label}</div>
                  <div className="text-sm font-display font-bold truncate">{m.title}</div>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <Select value={m.status} onValueChange={(v) => updateM.mutate({ id: m.id, patch: { status: v } })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="complete">Complete</SelectItem>
                      <SelectItem value="delayed">Delayed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="relative h-6 rounded-full bg-muted/40 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 h-full rounded-full transition-all flex items-center justify-end pr-2"
                    style={{
                      width: `${Math.max(6, (m.month_index + 1) / totalMonths * 100)}%`,
                      background: `linear-gradient(90deg, ${STATUS_COLORS[m.status] || STATUS_COLORS.pending}, hsl(var(--prism-amber)))`,
                      opacity: 0.8,
                    }}
                  >
                    <span className="text-[10px] font-bold text-white/90">{m.pct}%</span>
                  </div>
                </div>
                <div className="text-xs font-mono">{m.taskDone}/{m.taskTotal}</div>
                <div className="text-xs text-right text-muted-foreground pr-2">{m.due_date ? new Date(m.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '—'}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 text-xs">
          {Object.entries(STATUS_COLORS).map(([k, c]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded" style={{ background: c }} />
              <span className="capitalize text-muted-foreground">{k.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
