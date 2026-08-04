import { useState } from 'react';
import { CheckCircle2, Circle, Clock, AlertOctagon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useThvTasks, useThvUpsert } from '@/hooks/use-tiny-home-village';
import { PHASES, TASK_STATUSES, TASK_STATUS_LABELS, pct } from '@/lib/legacy/tinyHomeVillage';

const ICONS: Record<string, typeof Circle> = {
  not_started: Circle,
  in_progress: Clock,
  blocked: AlertOctagon,
  complete: CheckCircle2,
};

const TONE: Record<string, string> = {
  not_started: 'text-muted-foreground',
  in_progress: 'text-prism-amber',
  blocked: 'text-prism-rose',
  complete: 'text-prism-teal',
};

export default function VillagePhasesTab() {
  const { data: tasks = [] } = useThvTasks();
  const upsert = useThvUpsert('thv_tasks');
  const [openPhase, setOpenPhase] = useState<number | null>(1);

  const cycle = (t: any) => {
    const i = TASK_STATUSES.indexOf(t.status);
    upsert.mutate({ id: t.id, status: TASK_STATUSES[(i + 1) % TASK_STATUSES.length] });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-muted/20">
        <CardContent className="p-4 text-xs text-muted-foreground">
          Click a task icon to move it through Not started → In progress → Blocked → Complete. Assign an owner and
          due date to anything you are actively working.
        </CardContent>
      </Card>

      {PHASES.map((p) => {
        const rows = tasks.filter((t) => t.phase === p.phase);
        const done = rows.filter((t) => t.status === 'complete').length;
        const progress = rows.length ? (done / rows.length) * 100 : 0;
        const isOpen = openPhase === p.phase;

        return (
          <Card key={p.phase} className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <button
                className="flex w-full flex-col gap-2 text-left"
                onClick={() => setOpenPhase(isOpen ? null : p.phase)}
              >
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {done}/{rows.length} · {pct(progress)}
                  </span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </button>
            </CardHeader>

            {isOpen && (
              <CardContent className="space-y-2">
                {rows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tasks yet for this phase.</p>
                )}
                {rows.map((t) => {
                  const Icon = ICONS[t.status] ?? Circle;
                  return (
                    <div
                      key={t.id}
                      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/40 bg-muted/20 p-2"
                    >
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn('h-8 w-8 shrink-0', TONE[t.status])}
                        onClick={() => cycle(t)}
                        aria-label={`Task status: ${TASK_STATUS_LABELS[t.status]}`}
                      >
                        <Icon className="h-4 w-4" />
                      </Button>
                      <span
                        className={cn(
                          'min-w-[180px] flex-1 text-sm',
                          t.status === 'complete' && 'text-muted-foreground line-through',
                        )}
                      >
                        {t.title}
                      </span>
                      <Select value={t.status} onValueChange={(v) => upsert.mutate({ id: t.id, status: v })}>
                        <SelectTrigger className="h-8 w-[140px] text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TASK_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {TASK_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        key={t.owner ?? ''}
                        defaultValue={t.owner ?? ''}
                        placeholder="Owner"
                        onBlur={(e) =>
                          e.target.value !== (t.owner ?? '') && upsert.mutate({ id: t.id, owner: e.target.value })
                        }
                        className="h-8 w-[130px] text-xs"
                      />
                      <Input
                        key={t.due_date ?? ''}
                        type="date"
                        defaultValue={t.due_date ?? ''}
                        onBlur={(e) =>
                          e.target.value !== (t.due_date ?? '') &&
                          upsert.mutate({ id: t.id, due_date: e.target.value || null })
                        }
                        className="h-8 w-[145px] text-xs"
                      />
                    </div>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}
