import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useFdnRelationships, useSaveFdnRow, useDeleteFdnRow } from '@/hooks/use-foundation';
import { RELATIONSHIP_CATEGORIES, relationshipPriority } from '@/lib/legacy/foundation';

const empty = {
  id: '',
  name: '',
  organization: '',
  role: '',
  category: 'partner',
  influence: 3,
  strength: 3,
  email: '',
  phone: '',
  notes: '',
  last_contact_at: '',
  next_touch_at: '',
};

const QUADRANTS = [
  { key: 'champions', title: 'Champions — invest and activate', hint: 'High influence, strong relationship' },
  { key: 'targets', title: 'Priority targets — build the relationship', hint: 'High influence, weak relationship' },
  { key: 'supporters', title: 'Supporters — keep warm', hint: 'Lower influence, strong relationship' },
  { key: 'prospects', title: 'Prospects — nurture over time', hint: 'Lower influence, weak relationship' },
];

export default function RelationshipMapTab() {
  const { data: rows = [] } = useFdnRelationships();
  const save = useSaveFdnRow('fdn_relationships');
  const remove = useDeleteFdnRow('fdn_relationships');
  const [draft, setDraft] = useState<any>(empty);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(
    () => (rows as any[]).filter((r) => filter === 'all' || r.category === filter),
    [rows, filter],
  );

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = { champions: [], targets: [], supporters: [], prospects: [] };
    filtered.forEach((r) => {
      const hiInfluence = Number(r.influence) >= 4;
      const strong = Number(r.strength) >= 4;
      if (hiInfluence && strong) g.champions.push(r);
      else if (hiInfluence) g.targets.push(r);
      else if (strong) g.supporters.push(r);
      else g.prospects.push(r);
    });
    Object.values(g).forEach((arr) => arr.sort((a, b) => relationshipPriority(b) - relationshipPriority(a)));
    return g;
  }, [filtered]);

  const submit = () => {
    const payload: any = {
      ...draft,
      influence: Number(draft.influence) || 1,
      strength: Number(draft.strength) || 1,
      last_contact_at: draft.last_contact_at || null,
      next_touch_at: draft.next_touch_at || null,
    };
    if (!payload.id) delete payload.id;
    save.mutate(payload, { onSuccess: () => setOpen(false) });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {RELATIONSHIP_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          onClick={() => {
            setDraft(empty);
            setOpen(true);
          }}
        >
          <Plus className="mr-1 h-4 w-4" /> Add contact
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {QUADRANTS.map((q) => (
          <Card key={q.key} className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">{q.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{q.hint}</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {grouped[q.key].length === 0 && <p className="text-sm text-muted-foreground">No contacts here yet.</p>}
              {grouped[q.key].map((r: any) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/50 p-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {[r.role, r.organization].filter(Boolean).join(' · ') || '—'}
                    </p>
                    {r.next_touch_at && (
                      <p className="text-xs text-prism-amber">Next touch: {r.next_touch_at}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {r.category}
                    </Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Edit contact"
                      onClick={() => {
                        setDraft({
                          ...empty,
                          ...r,
                          organization: r.organization ?? '',
                          role: r.role ?? '',
                          email: r.email ?? '',
                          phone: r.phone ?? '',
                          notes: r.notes ?? '',
                          last_contact_at: r.last_contact_at ?? '',
                          next_touch_at: r.next_touch_at ?? '',
                        });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Delete contact"
                      onClick={() => remove.mutate(r.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? 'Edit contact' : 'New contact'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Organization</Label>
                <Input
                  value={draft.organization}
                  onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Category</Label>
                <Select value={draft.category} onValueChange={(v) => setDraft({ ...draft, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Influence (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={draft.influence}
                  onChange={(e) => setDraft({ ...draft, influence: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Relationship strength (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={draft.strength}
                  onChange={(e) => setDraft({ ...draft, strength: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Last contact</Label>
                <Input
                  type="date"
                  value={draft.last_contact_at ?? ''}
                  onChange={(e) => setDraft({ ...draft, last_contact_at: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>Next touch</Label>
                <Input
                  type="date"
                  value={draft.next_touch_at ?? ''}
                  onChange={(e) => setDraft({ ...draft, next_touch_at: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea rows={3} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={!draft.name || save.isPending}>
              Save contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
