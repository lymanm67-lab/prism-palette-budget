import { ReactNode, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useSaveFdnOpsRow, useDeleteFdnOpsRow, type FdnOpsTable } from '@/hooks/use-foundation-ops';

export type FdnField = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'date' | 'select' | 'textarea' | 'switch';
  options?: readonly { value: string; label: string }[];
  full?: boolean;
};

type Props = {
  table: FdnOpsTable;
  title: string;
  description?: string;
  addLabel: string;
  fields: FdnField[];
  empty: Record<string, any>;
  rows: any[];
  renderRow: (row: any) => ReactNode;
  requiredKey?: string;
  numericKeys?: string[];
  dateKeys?: string[];
  headerAction?: ReactNode;
};

export default function FdnCrudCard({
  table,
  title,
  description,
  addLabel,
  fields,
  empty,
  rows,
  renderRow,
  requiredKey,
  numericKeys = [],
  dateKeys = [],
  headerAction,
}: Props) {
  const save = useSaveFdnOpsRow(table);
  const remove = useDeleteFdnOpsRow(table);
  const [draft, setDraft] = useState<Record<string, any>>(empty);
  const [open, setOpen] = useState(false);

  const startNew = () => {
    setDraft({ ...empty, id: '' });
    setOpen(true);
  };

  const startEdit = (row: any) => {
    const next: Record<string, any> = { ...empty, id: row.id };
    Object.keys(empty).forEach((k) => {
      next[k] = row[k] ?? empty[k];
    });
    setDraft(next);
    setOpen(true);
  };

  const submit = () => {
    const payload: Record<string, any> = { ...draft };
    numericKeys.forEach((k) => {
      payload[k] = Number(payload[k]) || 0;
    });
    dateKeys.forEach((k) => {
      payload[k] = payload[k] || null;
    });
    if (!payload.id) delete payload.id;
    save.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  const requiredOk = !requiredKey || String(draft[requiredKey] ?? '').trim().length > 0;

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          {headerAction}
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1 h-4 w-4" /> {addLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>}
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/50 p-3"
          >
            <div className="min-w-0 flex-1">{renderRow(row)}</div>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" aria-label={`Edit ${title}`} onClick={() => startEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label={`Delete ${title}`} onClick={() => remove.mutate(row.id)}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? `Edit — ${title}` : addLabel}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={`space-y-1 ${f.full ? 'sm:col-span-2' : ''}`}>
                <Label htmlFor={`fdn-${f.key}`}>{f.label}</Label>
                {f.type === 'select' ? (
                  <Select value={String(draft[f.key] ?? '')} onValueChange={(v) => setDraft({ ...draft, [f.key]: v })}>
                    <SelectTrigger id={`fdn-${f.key}`}>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : f.type === 'textarea' ? (
                  <Textarea
                    id={`fdn-${f.key}`}
                    rows={3}
                    value={draft[f.key] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  />
                ) : f.type === 'switch' ? (
                  <div className="flex h-10 items-center">
                    <Switch
                      id={`fdn-${f.key}`}
                      checked={!!draft[f.key]}
                      onCheckedChange={(v) => setDraft({ ...draft, [f.key]: v })}
                    />
                  </div>
                ) : (
                  <Input
                    id={`fdn-${f.key}`}
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={draft[f.key] ?? ''}
                    onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!requiredOk || save.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
