import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import {
  FREED_CASH_FREQUENCIES,
  FREED_CASH_SOURCE_TYPES,
  FREED_CASH_STATUSES,
  monthlySavings,
  useDeleteFreedCashSource,
  useSaveFreedCashSource,
  type FreedCashSource,
} from '@/hooks/use-freed-cash';

const fmt = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });

type Draft = Partial<FreedCashSource> & { id?: string };

const emptyDraft: Draft = {
  name: '',
  vendor: '',
  category: '',
  entity_scope: 'personal',
  source_type: 'cancellation',
  original_amount: 0,
  new_amount: 0,
  billing_frequency: 'monthly',
  added_fees: 0,
  effective_date: new Date().toISOString().slice(0, 10),
  status: 'pending',
  classification: 'optional',
  is_temporary: false,
  resume_date: null,
  confidence: 'estimated',
  durability: 'permanent',
  expires_on: null,
  notes: '',
};


const statusTone: Record<string, string> = {
  verified: 'bg-primary/15 text-primary',
  confirmed: 'bg-prism-teal/15 text-prism-teal',
  reversed: 'bg-destructive/15 text-destructive',
};

export function FreedCashSourceList({ sources }: { sources: FreedCashSource[] }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const save = useSaveFreedCashSource();
  const remove = useDeleteFreedCashSource();

  const openNew = () => {
    setDraft({ ...emptyDraft });
    setOpen(true);
  };
  const openEdit = (s: FreedCashSource) => {
    setDraft({ ...s });
    setOpen(true);
  };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (!draft.name?.trim()) return;
    await save.mutateAsync({
      id: draft.id,
      name: draft.name.trim(),
      vendor: draft.vendor || null,
      category: draft.category || null,
      entity_scope: draft.entity_scope || 'personal',
      source_type: draft.source_type || 'cancellation',
      original_amount: Number(draft.original_amount) || 0,
      new_amount: Number(draft.new_amount) || 0,
      billing_frequency: draft.billing_frequency || 'monthly',
      added_fees: Number(draft.added_fees) || 0,
      effective_date: draft.effective_date || new Date().toISOString().slice(0, 10),
      status: draft.status || 'pending',
      classification: draft.classification || 'optional',
      is_temporary: !!draft.is_temporary,
      resume_date: draft.is_temporary ? draft.resume_date || null : null,
      notes: draft.notes || null,
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="text-base">Freed cash sources</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Every recurring expense must earn its place. Log what changed, then verify it on a statement.
          </p>
        </div>
        <Button size="sm" onClick={openNew}>
          <Plus className="mr-1 h-4 w-4" /> Add source
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {sources.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No freed cash logged yet. Add a cancellation, reduction or negotiated bill to start tracking.
          </p>
        )}

        {sources.map((s) => (
          <div
            key={s.id}
            className="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{s.name}</span>
                <Badge variant="secondary" className={statusTone[s.status] ?? ''}>
                  {FREED_CASH_STATUSES.find((x) => x.value === s.status)?.label ?? s.status}
                </Badge>
                <Badge variant="outline">{s.entity_scope === 'business' ? 'Business' : 'Personal'}</Badge>
                <Badge variant="outline">
                  {FREED_CASH_SOURCE_TYPES.find((x) => x.value === s.source_type)?.label ?? s.source_type}
                </Badge>
                {s.classification === 'essential' && <Badge variant="outline">Essential</Badge>}
                {s.is_temporary && <Badge variant="outline">Temporary</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {fmt(Number(s.original_amount))} → {fmt(Number(s.new_amount))}
                {Number(s.added_fees) > 0 && ` (+${fmt(Number(s.added_fees))} fees)`} ·{' '}
                {FREED_CASH_FREQUENCIES.find((x) => x.value === s.billing_frequency)?.label} · effective{' '}
                {s.effective_date}
                {s.vendor ? ` · ${s.vendor}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold">{fmt(monthlySavings(s))}/mo</p>
                <p className="text-xs text-muted-foreground">{fmt(monthlySavings(s) * 12)}/yr</p>
              </div>
              <Button size="icon" variant="ghost" onClick={() => openEdit(s)} aria-label="Edit source">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => remove.mutate(s.id)}
                aria-label="Remove source"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit freed cash source' : 'Add freed cash source'}</DialogTitle>
            <DialogDescription>
              True savings = original amount − new amount − any added fees, normalized to monthly.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fc-name">What changed</Label>
              <Input
                id="fc-name"
                value={draft.name ?? ''}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Canceled Adobe Creative Cloud"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="fc-vendor">Vendor</Label>
                <Input id="fc-vendor" value={draft.vendor ?? ''} onChange={(e) => set('vendor', e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fc-category">Category</Label>
                <Input
                  id="fc-category"
                  value={draft.category ?? ''}
                  onChange={(e) => set('category', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Type</Label>
                <Select value={draft.source_type} onValueChange={(v) => set('source_type', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREED_CASH_SOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Scope</Label>
                <Select value={draft.entity_scope} onValueChange={(v) => set('entity_scope', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="fc-orig">Original amount</Label>
                <Input
                  id="fc-orig"
                  type="number"
                  step="0.01"
                  value={draft.original_amount ?? 0}
                  onChange={(e) => set('original_amount', Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fc-new">New amount</Label>
                <Input
                  id="fc-new"
                  type="number"
                  step="0.01"
                  value={draft.new_amount ?? 0}
                  onChange={(e) => set('new_amount', Number(e.target.value))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fc-fees">Added fees</Label>
                <Input
                  id="fc-fees"
                  type="number"
                  step="0.01"
                  value={draft.added_fees ?? 0}
                  onChange={(e) => set('added_fees', Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Billing frequency</Label>
                <Select value={draft.billing_frequency} onValueChange={(v) => set('billing_frequency', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREED_CASH_FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="fc-date">Effective date</Label>
                <Input
                  id="fc-date"
                  type="date"
                  value={draft.effective_date ?? ''}
                  onChange={(e) => set('effective_date', e.target.value)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label>Status</Label>
                <Select value={draft.status} onValueChange={(v) => set('status', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREED_CASH_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Classification</Label>
                <Select value={draft.classification} onValueChange={(v) => set('classification', v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="optional">Optional</SelectItem>
                    <SelectItem value="essential">Essential</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="fc-temp">Temporary pause</Label>
                <p className="text-xs text-muted-foreground">Savings expected to end on a resume date.</p>
              </div>
              <Switch
                id="fc-temp"
                checked={!!draft.is_temporary}
                onCheckedChange={(v) => set('is_temporary', v)}
              />
            </div>

            {draft.is_temporary && (
              <div className="grid gap-1.5">
                <Label htmlFor="fc-resume">Resume date</Label>
                <Input
                  id="fc-resume"
                  type="date"
                  value={draft.resume_date ?? ''}
                  onChange={(e) => set('resume_date', e.target.value)}
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <Label htmlFor="fc-notes">Notes</Label>
              <Textarea
                id="fc-notes"
                value={draft.notes ?? ''}
                onChange={(e) => set('notes', e.target.value)}
                rows={2}
              />
            </div>

            <p className="text-sm">
              True monthly savings:{' '}
              <span className="font-semibold">
                {fmt(
                  monthlySavings({
                    original_amount: Number(draft.original_amount) || 0,
                    new_amount: Number(draft.new_amount) || 0,
                    added_fees: Number(draft.added_fees) || 0,
                    billing_frequency: draft.billing_frequency || 'monthly',
                  }),
                )}
              </span>
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={save.isPending || !draft.name?.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
