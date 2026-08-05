import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useFdnRoadmap, useFdnPillars, useSaveFdnRow, useDeleteFdnRow } from '@/hooks/use-foundation';
import { currency, ROADMAP_STATUSES } from '@/lib/legacy/foundation';

const empty = {
  id: '',
  year: new Date().getFullYear() + 1,
  phase_label: '',
  title: '',
  description: '',
  pillar_id: '',
  target_amount: 0,
  status: 'planned',
  sort_order: 99,
  milestones: [] as any[],
};

/** Milestones are stored as strings on seed rows and as {text, done} once checked off. */
function normalizeMilestones(m: any[]): { text: string; done: boolean }[] {
  return (m ?? []).map((x) => (typeof x === 'string' ? { text: x, done: false } : { text: x.text, done: !!x.done }));
}

export default function RoadmapTab() {
  const { data: roadmap = [] } = useFdnRoadmap();
  const { data: pillars = [] } = useFdnPillars();
  const save = useSaveFdnRow('fdn_roadmap');
  const remove = useDeleteFdnRow('fdn_roadmap');
  const [draft, setDraft] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  const totalTarget = (roadmap as any[]).reduce((s, r) => s + Number(r.target_amount || 0), 0);

  const submit = () => {
    const payload: any = {
      ...draft,
      year: Number(draft.year) || new Date().getFullYear(),
      target_amount: Number(draft.target_amount) || 0,
      sort_order: Number(draft.sort_order) || 0,
      pillar_id: draft.pillar_id || null,
      milestones: normalizeMilestones(draft.milestones),
    };
    if (!payload.id) delete payload.id;
    save.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const toggleMilestone = (row: any, idx: number) => {
    const ms = normalizeMilestones(row.milestones);
    ms[idx] = { ...ms[idx], done: !ms[idx].done };
    save.mutate({ id: row.id, milestones: ms });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Five-year build plan · {currency(totalTarget)} cumulative funding target
        </p>
        <Button
          size="sm"
          onClick={() => {
            setDraft({ ...empty, sort_order: (roadmap as any[]).length + 1 });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add phase
        </Button>
      </div>

      <div className="relative space-y-4 border-l border-border/60 pl-6">
        {(roadmap as any[]).map((r) => {
          const ms = normalizeMilestones(r.milestones);
          const done = ms.filter((m) => m.done).length;
          const pct = ms.length > 0 ? (done / ms.length) * 100 : 0;
          const pillar = (pillars as any[]).find((p) => p.id === r.pillar_id);
          return (
            <Card key={r.id} className="glass-card">
              <span className="absolute -left-[7px] mt-6 h-3 w-3 rounded-full bg-prism-amber" aria-hidden />
              <CardHeader className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">
                    {r.year} — {r.title}
                  </CardTitle>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {r.status}
                    </Badge>
                    <Select value={r.status} onValueChange={(v) => save.mutate({ id: r.id, status: v })}>
                      <SelectTrigger className="h-8 w-32 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ROADMAP_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit phase"
                      onClick={() => {
                        setDraft({
                          ...empty,
                          ...r,
                          description: r.description ?? '',
                          phase_label: r.phase_label ?? '',
                          pillar_id: r.pillar_id ?? '',
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label="Delete phase" onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {r.phase_label}
                  {pillar ? ` · ${pillar.name}` : ''} · Target {currency(Number(r.target_amount))}
                </p>
                {r.description && <p className="text-sm text-muted-foreground">{r.description}</p>}
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Milestones complete</span>
                    <span>
                      {done} / {ms.length}
                    </span>
                  </div>
                  <Progress value={pct} className="mt-1 h-2" />
                </div>
                <div className="space-y-2">
                  {ms.map((m, idx) => (
                    <label key={idx} className="flex items-start gap-2 text-sm">
                      <Checkbox checked={m.done} onCheckedChange={() => toggleMilestone(r, idx)} className="mt-0.5" />
                      <span className={m.done ? 'text-muted-foreground line-through' : ''}>{m.text}</span>
                    </label>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit phase' : 'New phase'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Year</Label>
                <Input
                  type="number"
                  value={draft.year}
                  onChange={(e) => setDraft({ ...draft, year: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Phase label</Label>
                <Input
                  value={draft.phase_label}
                  onChange={(e) => setDraft({ ...draft, phase_label: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Funding target</Label>
                <Input
                  type="number"
                  value={draft.target_amount}
                  onChange={(e) => setDraft({ ...draft, target_amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Pillar (optional)</Label>
                <Select value={draft.pillar_id} onValueChange={(v) => setDraft({ ...draft, pillar_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pillar" />
                  </SelectTrigger>
                  <SelectContent>
                    {(pillars as any[]).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Milestones (one per line)</Label>
              <Textarea
                rows={5}
                value={normalizeMilestones(draft.milestones)
                  .map((m) => m.text)
                  .join('\n')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    milestones: e.target.value
                      .split('\n')
                      .filter((l) => l.trim())
                      .map((l) => ({ text: l.trim(), done: false })),
                  })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!draft.title || save.isPending}>
              Save phase
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
