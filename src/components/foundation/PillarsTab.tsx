import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  useFdnPillars,
  useFdnInitiatives,
  useSaveFdnRow,
  useDeleteFdnRow,
} from '@/hooks/use-foundation';
import { currency, INITIATIVE_STATUSES, PILLAR_STATUSES } from '@/lib/legacy/foundation';

const emptyInitiative = {
  id: '',
  pillar_id: '',
  title: '',
  description: '',
  budget: 0,
  spent: 0,
  target_beneficiaries: 0,
  actual_beneficiaries: 0,
  status: 'planned',
  lead_name: '',
  start_date: '',
  end_date: '',
};

export default function PillarsTab() {
  const { data: pillars = [] } = useFdnPillars();
  const { data: initiatives = [] } = useFdnInitiatives();
  const savePillar = useSaveFdnRow('fdn_pillars');
  const saveInitiative = useSaveFdnRow('fdn_initiatives');
  const deleteInitiative = useDeleteFdnRow('fdn_initiatives');

  const [draft, setDraft] = useState<any>(emptyInitiative);
  const [open, setOpen] = useState(false);

  const openNew = (pillarId: string) => {
    setDraft({ ...emptyInitiative, pillar_id: pillarId });
    setOpen(true);
  };
  const openEdit = (row: any) => {
    setDraft({ ...emptyInitiative, ...row, description: row.description ?? '', lead_name: row.lead_name ?? '', start_date: row.start_date ?? '', end_date: row.end_date ?? '' });
    setOpen(true);
  };

  const submit = () => {
    const payload: any = {
      ...draft,
      budget: Number(draft.budget) || 0,
      spent: Number(draft.spent) || 0,
      target_beneficiaries: Number(draft.target_beneficiaries) || 0,
      actual_beneficiaries: Number(draft.actual_beneficiaries) || 0,
      start_date: draft.start_date || null,
      end_date: draft.end_date || null,
      pillar_id: draft.pillar_id || null,
    };
    if (!payload.id) delete payload.id;
    saveInitiative.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-6">
      {(pillars as any[]).map((p) => {
        const rows = (initiatives as any[]).filter((i) => i.pillar_id === p.id);
        const committed = rows.reduce((s, i) => s + Number(i.budget || 0), 0);
        const deployed = rows.reduce((s, i) => s + Number(i.spent || 0), 0);
        const served = Math.max(
          Number(p.actual_beneficiaries || 0),
          rows.reduce((s, i) => s + Number(i.actual_beneficiaries || 0), 0),
        );
        const reach = Number(p.target_beneficiaries) > 0 ? (served / Number(p.target_beneficiaries)) * 100 : 0;

        return (
          <Card key={p.id} className="glass-card">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className={`text-base ${p.color}`}>{p.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={p.status}
                    onValueChange={(v) => savePillar.mutate({ id: p.id, status: v })}
                  >
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PILLAR_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline" onClick={() => openNew(p.id)}>
                    <Plus className="mr-1 h-4 w-4" /> Initiative
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{p.description}</p>
              <div className="flex flex-wrap gap-1">
                {(p.focus_areas ?? []).map((f: string) => (
                  <Badge key={f} variant="secondary" className="text-xs">
                    {f}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-muted-foreground">Annual budget</p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      className="h-8"
                      defaultValue={Number(p.annual_budget)}
                      onBlur={(e) => savePillar.mutate({ id: p.id, annual_budget: Number(e.target.value) || 0 })}
                    />
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Target people</p>
                  <Input
                    type="number"
                    className="h-8"
                    defaultValue={Number(p.target_beneficiaries)}
                    onBlur={(e) => savePillar.mutate({ id: p.id, target_beneficiaries: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">People served</p>
                  <Input
                    type="number"
                    className="h-8"
                    defaultValue={Number(p.actual_beneficiaries)}
                    onBlur={(e) => savePillar.mutate({ id: p.id, actual_beneficiaries: Number(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Committed / deployed</p>
                  <p className="mt-1 text-sm font-medium">
                    {currency(committed)} / {currency(deployed)}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Reach against target</span>
                  <span>{Math.round(reach)}%</span>
                </div>
                <Progress value={Math.min(100, reach)} className="mt-1 h-2" />
              </div>

              {(p.kpis ?? []).length > 0 && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">KPIs: </span>
                  {(p.kpis ?? []).join(' · ')}
                </div>
              )}

              <div className="space-y-2">
                {rows.length === 0 && (
                  <p className="text-sm text-muted-foreground">No initiatives yet for this pillar.</p>
                )}
                {rows.map((i) => (
                  <div
                    key={i.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{i.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {currency(Number(i.spent))} of {currency(Number(i.budget))} · {i.actual_beneficiaries}/
                        {i.target_beneficiaries} people
                        {i.lead_name ? ` · Lead: ${i.lead_name}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-xs">
                        {i.status}
                      </Badge>
                      <Button size="icon" variant="ghost" aria-label="Edit initiative" onClick={() => openEdit(i)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Delete initiative"
                        onClick={() => deleteInitiative.mutate(i.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <span className="hidden" />
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit initiative' : 'New initiative'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                <Label>Pillar</Label>
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
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => setDraft({ ...draft, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INITIATIVE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Budget</Label>
                <Input
                  type="number"
                  value={draft.budget}
                  onChange={(e) => setDraft({ ...draft, budget: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Spent</Label>
                <Input
                  type="number"
                  value={draft.spent}
                  onChange={(e) => setDraft({ ...draft, spent: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Target people</Label>
                <Input
                  type="number"
                  value={draft.target_beneficiaries}
                  onChange={(e) => setDraft({ ...draft, target_beneficiaries: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>People served</Label>
                <Input
                  type="number"
                  value={draft.actual_beneficiaries}
                  onChange={(e) => setDraft({ ...draft, actual_beneficiaries: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Lead</Label>
                <Input
                  value={draft.lead_name}
                  onChange={(e) => setDraft({ ...draft, lead_name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={draft.start_date ?? ''}
                  onChange={(e) => setDraft({ ...draft, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={draft.end_date ?? ''}
                  onChange={(e) => setDraft({ ...draft, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!draft.title || saveInitiative.isPending}>
              Save initiative
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
