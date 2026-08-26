import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Pencil, Plus, Trash2, X, Check, Lock } from 'lucide-react';
import {
  useDeleteRule,
  useRules,
  useSaveCategoryRule,
  useSaveNormalization,
} from '@/hooks/use-rules-manager';

export function RulesList() {
  const { data, isLoading } = useRules();
  const del = useDeleteRule();
  const saveNorm = useSaveNormalization();
  const saveCat = useSaveCategoryRule();
  const { toast } = useToast();

  const [editNorm, setEditNorm] = useState<string | null>(null);
  const [editCat, setEditCat] = useState<string | null>(null);
  const [draftNorm, setDraftNorm] = useState({ raw: '', name: '' });
  const [draftCat, setDraftCat] = useState({ pattern: '', categoryId: '' });
  const [newNorm, setNewNorm] = useState({ raw: '', name: '' });
  const [newCat, setNewCat] = useState({ pattern: '', categoryId: '' });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading rules…</p>;

  const catName = (id: string | null) => data.categories.find((c) => c.id === id)?.name || 'Uncategorized';

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast({ title: msg });
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Merchant naming rules</CardTitle>
          <p className="text-xs text-muted-foreground">
            Rewrites messy bank descriptions into clean merchant names during import (e.g. Movable Feast → Lovable AI Services).
          </p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.normalizations.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
              {editNorm === r.id ? (
                <>
                  <Input value={draftNorm.raw} onChange={(e) => setDraftNorm({ ...draftNorm, raw: e.target.value })} placeholder="Bank text" className="h-8" />
                  <span className="text-muted-foreground">→</span>
                  <Input value={draftNorm.name} onChange={(e) => setDraftNorm({ ...draftNorm, name: e.target.value })} placeholder="Clean name" className="h-8" />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => run(async () => { await saveNorm.mutateAsync({ id: r.id, raw_pattern: draftNorm.raw, normalized_name: draftNorm.name }); setEditNorm(null); }, 'Rule updated')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditNorm(null)}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-mono flex-1 truncate">{r.raw_pattern}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm font-medium flex-1 truncate">{r.normalized_name}</span>
                  {r.is_global ? (
                    <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" />Built-in</Badge>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditNorm(r.id); setDraftNorm({ raw: r.raw_pattern, name: r.normalized_name }); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => run(() => del.mutateAsync({ table: 'merchant_normalizations', id: r.id }), 'Rule deleted')}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Input value={newNorm.raw} onChange={(e) => setNewNorm({ ...newNorm, raw: e.target.value })} placeholder="Bank text contains…" className="h-9" />
            <span className="text-muted-foreground">→</span>
            <Input value={newNorm.name} onChange={(e) => setNewNorm({ ...newNorm, name: e.target.value })} placeholder="Clean merchant name" className="h-9" />
            <Button size="sm" disabled={!newNorm.raw || !newNorm.name} onClick={() => run(async () => { await saveNorm.mutateAsync({ raw_pattern: newNorm.raw, normalized_name: newNorm.name }); setNewNorm({ raw: '', name: '' }); }, 'Rule added')}>
              <Plus className="mr-1 h-4 w-4" />Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Category rules</CardTitle>
          <p className="text-xs text-muted-foreground">Sends matching merchants to a category automatically.</p>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.categoryRules.length === 0 && (
            <p className="text-sm text-muted-foreground">No category rules yet.</p>
          )}
          {data.categoryRules.map((r) => (
            <div key={r.id} className="flex items-center gap-2 rounded-lg border border-border p-3">
              {editCat === r.id ? (
                <>
                  <Input value={draftCat.pattern} onChange={(e) => setDraftCat({ ...draftCat, pattern: e.target.value })} className="h-8" />
                  <span className="text-muted-foreground">→</span>
                  <Select value={draftCat.categoryId} onValueChange={(v) => setDraftCat({ ...draftCat, categoryId: v })}>
                    <SelectTrigger className="h-8 flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
                    <SelectContent>
                      {data.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => run(async () => { await saveCat.mutateAsync({ id: r.id, merchant_pattern: draftCat.pattern, category_id: draftCat.categoryId }); setEditCat(null); }, 'Rule updated')}>
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditCat(null)}><X className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="text-sm font-mono flex-1 truncate">{r.merchant_pattern}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm font-medium flex-1 truncate">{catName(r.category_id)}</span>
                  {r.is_ai_generated && <Badge variant="outline">AI</Badge>}
                  <Badge variant="secondary">{r.match_count} hits</Badge>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditCat(r.id); setDraftCat({ pattern: r.merchant_pattern, categoryId: r.category_id }); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => run(() => del.mutateAsync({ table: 'categorization_rules', id: r.id }), 'Rule deleted')}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          ))}
          <div className="flex items-center gap-2 pt-2">
            <Input value={newCat.pattern} onChange={(e) => setNewCat({ ...newCat, pattern: e.target.value })} placeholder="Merchant contains…" className="h-9" />
            <span className="text-muted-foreground">→</span>
            <Select value={newCat.categoryId} onValueChange={(v) => setNewCat({ ...newCat, categoryId: v })}>
              <SelectTrigger className="h-9 flex-1"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                {data.categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button size="sm" disabled={!newCat.pattern || !newCat.categoryId} onClick={() => run(async () => { await saveCat.mutateAsync({ merchant_pattern: newCat.pattern, category_id: newCat.categoryId }); setNewCat({ pattern: '', categoryId: '' }); }, 'Rule added')}>
              <Plus className="mr-1 h-4 w-4" />Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
