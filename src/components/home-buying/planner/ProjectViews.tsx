import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useHpTasks, useUpdateTask } from '@/hooks/use-hp-planner';
import { Checkbox } from '@/components/ui/checkbox';

const COLS = [
  { key: 'pending', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
  { key: 'blocked', label: 'Blocked' },
];

export function KanbanView({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useHpTasks(projectId);
  const update = useUpdateTask();

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { pending: [], in_progress: [], complete: [], blocked: [] };
    tasks.forEach((t: any) => { (g[t.status] || (g[t.status] = [])).push(t); });
    return g;
  }, [tasks]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      {COLS.map((col) => (
        <Card key={col.key} className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">
              {col.label} <Badge variant="outline" className="ml-1">{(grouped[col.key] || []).length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 max-h-96 overflow-auto">
            {(grouped[col.key] || []).map((t: any) => (
              <div key={t.id} className="rounded-md border border-border/30 bg-card/30 p-2 space-y-1">
                <div className="text-xs">{t.title}</div>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px]">{t.priority}</Badge>
                  {t.due_date && <span>{new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
                </div>
                <div className="flex gap-1">
                  {COLS.filter((c) => c.key !== col.key).slice(0, 2).map((c) => (
                    <button
                      key={c.key}
                      onClick={() => update.mutate({ id: t.id, patch: { status: c.key, completed_at: c.key === 'complete' ? new Date().toISOString() : null } })}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-primary/20"
                    >
                      → {c.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CalendarView({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useHpTasks(projectId);
  const update = useUpdateTask();

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    tasks.forEach((t: any) => {
      if (!t.due_date) return;
      const key = new Date(t.due_date).toISOString().slice(0, 7); // YYYY-MM
      (g[key] || (g[key] = [])).push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [tasks]);

  return (
    <div className="space-y-4">
      {grouped.map(([month, items]) => (
        <Card key={month} className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">
              {new Date(month + '-01').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              <Badge variant="outline" className="ml-2">{items.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {items.sort((a: any, b: any) => a.due_date.localeCompare(b.due_date)).map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 rounded-md border border-border/30 bg-card/30 px-3 py-1.5">
                <Checkbox
                  checked={t.status === 'complete'}
                  onCheckedChange={(v) => update.mutate({ id: t.id, patch: { status: v ? 'complete' : 'pending', completed_at: v ? new Date().toISOString() : null } })}
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm truncate ${t.status === 'complete' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</div>
                </div>
                <Badge variant="outline" className="text-[10px]">{t.priority}</Badge>
                <div className="text-[10px] text-muted-foreground w-16 text-right">{new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function CriticalPathView({ projectId }: { projectId: string }) {
  const { data: tasks = [] } = useHpTasks(projectId);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const overdue = tasks.filter((t: any) => t.status !== 'complete' && t.due_date && new Date(t.due_date) < today);
  const upcoming = tasks.filter((t: any) => {
    if (t.status === 'complete' || !t.due_date) return false;
    const d = new Date(t.due_date);
    const in14 = new Date(today); in14.setDate(in14.getDate() + 14);
    return d >= today && d <= in14;
  });
  const blocked = tasks.filter((t: any) => t.status === 'blocked');
  const high = tasks.filter((t: any) => t.priority === 'high' && t.status !== 'complete');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {[
        { title: 'Overdue', items: overdue, color: 'text-prism-rose' },
        { title: 'Upcoming (14 days)', items: upcoming, color: 'text-prism-amber' },
        { title: 'Blocked', items: blocked, color: 'text-prism-rose' },
        { title: 'High Priority (Open)', items: high, color: 'text-prism-teal' },
      ].map((s) => (
        <Card key={s.title} className="prism-card-shine border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className={`text-sm font-display ${s.color}`}>{s.title} ({s.items.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 max-h-64 overflow-auto">
            {s.items.map((t: any) => (
              <div key={t.id} className="text-xs rounded-md border border-border/30 bg-card/30 px-2 py-1.5 flex items-center gap-2">
                <span className="flex-1 truncate">{t.title}</span>
                {t.due_date && <span className="text-[10px] text-muted-foreground">{new Date(t.due_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>}
              </div>
            ))}
            {s.items.length === 0 && <div className="text-xs italic text-muted-foreground">Nothing here.</div>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
