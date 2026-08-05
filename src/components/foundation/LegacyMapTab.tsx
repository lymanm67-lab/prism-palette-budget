import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useFdnLegacyNodes, useFdnSettings, useSaveFdnRow, useDeleteFdnRow } from '@/hooks/use-foundation';
import { GENERATIONS, LEGACY_NODE_TYPES } from '@/lib/legacy/foundation';

const empty = {
  id: '',
  title: '',
  node_type: 'value',
  generation: 'g1',
  description: '',
  linked_value: '',
  sort_order: 99,
};

const TYPE_COLOR: Record<string, string> = {
  value: 'text-prism-teal',
  asset: 'text-prism-amber',
  story: 'text-prism-rose',
  institution: 'text-prism-indigo',
};

export default function LegacyMapTab() {
  const { data: nodes = [] } = useFdnLegacyNodes();
  const { data: settings } = useFdnSettings();
  const save = useSaveFdnRow('fdn_legacy_nodes');
  const remove = useDeleteFdnRow('fdn_legacy_nodes');
  const [draft, setDraft] = useState<any>(empty);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-6">
      {settings?.legacy_statement && (
        <Card className="glass-card border-prism-amber/30">
          <CardContent className="p-6">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Legacy statement</p>
            <p className="mt-2 text-lg font-medium">{settings.legacy_statement}</p>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          What passes forward, generation by generation — values, assets, stories, and institutions.
        </p>
        <Button
          size="sm"
          onClick={() => {
            setDraft({ ...empty, sort_order: (nodes as any[]).length + 1 });
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add node
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {GENERATIONS.map((g) => {
          const rows = (nodes as any[]).filter((n) => n.generation === g.value);
          return (
            <Card key={g.value} className="glass-card">
              <CardHeader>
                <CardTitle className="text-base">{g.label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {rows.length === 0 && <p className="text-sm text-muted-foreground">Nothing mapped yet.</p>}
                {rows.map((n) => (
                  <div
                    key={n.id}
                    className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-border/50 p-3"
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-medium ${TYPE_COLOR[n.node_type] ?? ''}`}>{n.title}</p>
                      {n.description && <p className="text-xs text-muted-foreground">{n.description}</p>}
                      {n.linked_value && (
                        <p className="mt-1 text-xs text-muted-foreground">Anchored in: {n.linked_value}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className="text-xs">
                        {n.node_type}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Edit node"
                        onClick={() => {
                          setDraft({
                            ...empty,
                            ...n,
                            description: n.description ?? '',
                            linked_value: n.linked_value ?? '',
                          });
                          setOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" aria-label="Delete node" onClick={() => remove.mutate(n.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit legacy node' : 'New legacy node'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Type</Label>
                <Select value={draft.node_type} onValueChange={(v) => setDraft({ ...draft, node_type: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGACY_NODE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Generation</Label>
                <Select value={draft.generation} onValueChange={(v) => setDraft({ ...draft, generation: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GENERATIONS.map((g) => (
                      <SelectItem key={g.value} value={g.value}>
                        {g.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Anchored in which core value</Label>
              <Input
                value={draft.linked_value}
                onChange={(e) => setDraft({ ...draft, linked_value: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit(draft, save, setOpen)} disabled={!draft.title || save.isPending}>
              Save node
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function submit(draft: any, save: any, setOpen: (v: boolean) => void) {
  return () => {
    const payload: any = { ...draft, sort_order: Number(draft.sort_order) || 0 };
    if (!payload.id) delete payload.id;
    save.mutate(payload, { onSuccess: () => setOpen(false) });
  };
}
