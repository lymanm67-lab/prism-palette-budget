import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Play, Trash2, Pencil, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Rule {
  id: string;
  household_id: string;
  name: string;
  match_type: 'merchant' | 'description_keyword' | 'category';
  match_value: string;
  date_range_start: string | null;
  date_range_end: string | null;
  amount_min: number | null;
  amount_max: number | null;
  business_profile_id: string | null;
  business_category_id: string | null;
  personal_category_id: string | null;
  business_split_pct: number;
  notes: string | null;
  is_active: boolean;
  priority: number;
  last_run_at: string | null;
  last_run_match_count: number;
}

const emptyRule: Partial<Rule> = {
  name: '',
  match_type: 'description_keyword',
  match_value: '',
  business_split_pct: 100,
  is_active: true,
  priority: 100,
};

export default function AutoSplitRules() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Partial<Rule> | null>(null);
  const [running, setRunning] = useState(false);

  const { data: rules = [] } = useQuery({
    queryKey: ['auto_split_rules', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('auto_split_rules')
        .select('*')
        .eq('household_id', household!.id)
        .order('priority');
      if (error) throw error;
      return data as Rule[];
    },
  });

  const { data: issues = [] } = useQuery({
    queryKey: ['data_quality_issues', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_quality_issues')
        .select('*')
        .eq('household_id', household!.id)
        .is('resolved_at', null)
        .order('detected_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ['business_profiles', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await supabase
        .from('business_profiles')
        .select('id, business_name')
        .eq('household_id', household!.id);
      return data ?? [];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['cats-for-rules', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await supabase
        .from('categories')
        .select('id, name, group_id, category_groups!inner(name, budget_type, household_id)')
        .eq('category_groups.household_id', household!.id);
      return (data ?? []) as any[];
    },
  });

  const businessCats = useMemo(
    () => categories.filter((c: any) => c.category_groups.budget_type === 'business'),
    [categories]
  );
  const personalCats = useMemo(
    () => categories.filter((c: any) => c.category_groups.budget_type === 'personal'),
    [categories]
  );

  const saveMutation = useMutation({
    mutationFn: async (r: Partial<Rule>) => {
      if (r.id) {
        const { error } = await supabase.from('auto_split_rules').update(r).eq('id', r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('auto_split_rules')
          .insert({ ...r, household_id: household!.id } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto_split_rules'] });
      setEditing(null);
      toast({ title: 'Rule saved' });
    },
    onError: (e: any) => toast({ title: 'Save failed', description: e.message, variant: 'destructive' }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('auto_split_rules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auto_split_rules'] });
      toast({ title: 'Rule deleted' });
    },
  });

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('data_quality_issues')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['data_quality_issues'] }),
  });

  const runNow = async () => {
    if (!household) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke('monthly-budget-hygiene', {
        body: { household_id: household.id, force: true },
      });
      if (error) throw error;
      const summary = (data?.results?.[household.id] ?? {}) as Record<string, number>;
      toast({
        title: 'Hygiene run complete',
        description: `Splits applied: ${summary.splits_applied ?? 0} · Issues found: ${
          (summary.duplicate_categories ?? 0) +
          (summary.uncategorized_flagged ?? 0) +
          (summary.pending_contributions ?? 0)
        }`,
      });
      qc.invalidateQueries({ queryKey: ['data_quality_issues'] });
      qc.invalidateQueries({ queryKey: ['auto_split_rules'] });
    } catch (e: any) {
      toast({ title: 'Run failed', description: e.message, variant: 'destructive' });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Helmet>
        <title>Auto-Split Rules & Budget Hygiene | PrismMoney™</title>
        <meta
          name="description"
          content="Automate transaction splits and monthly budget hygiene to keep your books clean for accounting and taxes."
        />
      </Helmet>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Auto-Split Rules & Budget Hygiene</h1>
          <p className="text-muted-foreground text-sm">
            Rules run automatically on the 1st of each month and keep your business/personal splits, income carry-forward,
            and category cleanliness on track.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={runNow} disabled={running} variant="secondary">
            <Play className="w-4 h-4 mr-2" />
            {running ? 'Running…' : 'Run now'}
          </Button>
          <Button onClick={() => setEditing(emptyRule)}>
            <Plus className="w-4 h-4 mr-2" />
            New rule
          </Button>
        </div>
      </div>

      {issues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Budget Health — {issues.length} item(s) to review
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {issues.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-2 border rounded p-3">
                <div>
                  <div className="font-medium text-sm">{i.title}</div>
                  {i.description && (
                    <div className="text-xs text-muted-foreground">{i.description}</div>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => resolveMutation.mutate(i.id)}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Resolve
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Active rules</CardTitle>
          <CardDescription>
            Match incoming transactions by merchant, keyword, or category, then split between business and personal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {rules.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No rules yet. Create your first one — e.g., "International Travel → Dove Love Travel (Jan–Jun)".
            </p>
          )}
          {rules.map((r) => (
            <div key={r.id} className="border rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{r.name}</span>
                  {!r.is_active && <Badge variant="outline">Paused</Badge>}
                  <Badge variant="secondary">
                    {r.business_split_pct}% business / {(100 - Number(r.business_split_pct)).toFixed(0)}% personal
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  Match {r.match_type.replace('_', ' ')}: <code>{r.match_value}</code>
                  {r.date_range_start && ` · ${r.date_range_start} → ${r.date_range_end ?? 'ongoing'}`}
                  {r.last_run_at && ` · last matched ${r.last_run_match_count} txn(s)`}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="icon" variant="ghost" onClick={() => setEditing(r)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(r.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? 'Edit rule' : 'New rule'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label>Name</Label>
                <Input
                  value={editing.name ?? ''}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="International Travel → Dove Love Travel"
                />
              </div>
              <div>
                <Label>Match type</Label>
                <Select
                  value={editing.match_type}
                  onValueChange={(v: any) => setEditing({ ...editing, match_type: v })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchant">Merchant contains</SelectItem>
                    <SelectItem value="description_keyword">Description/notes contains</SelectItem>
                    <SelectItem value="category">Category equals</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Match value</Label>
                {editing.match_type === 'category' ? (
                  <Select
                    value={editing.match_value}
                    onValueChange={(v) => setEditing({ ...editing, match_value: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="Pick category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.category_groups.name} → {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editing.match_value ?? ''}
                    onChange={(e) => setEditing({ ...editing, match_value: e.target.value })}
                    placeholder="delta, hilton, airfare…"
                  />
                )}
              </div>
              <div>
                <Label>Date range start</Label>
                <Input
                  type="date"
                  value={editing.date_range_start ?? ''}
                  onChange={(e) => setEditing({ ...editing, date_range_start: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Date range end</Label>
                <Input
                  type="date"
                  value={editing.date_range_end ?? ''}
                  onChange={(e) => setEditing({ ...editing, date_range_end: e.target.value || null })}
                />
              </div>
              <div>
                <Label>Min amount</Label>
                <Input
                  type="number" step="0.01"
                  value={editing.amount_min ?? ''}
                  onChange={(e) => setEditing({ ...editing, amount_min: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>Max amount</Label>
                <Input
                  type="number" step="0.01"
                  value={editing.amount_max ?? ''}
                  onChange={(e) => setEditing({ ...editing, amount_max: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label>Business profile</Label>
                <Select
                  value={editing.business_profile_id ?? ''}
                  onValueChange={(v) => setEditing({ ...editing, business_profile_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pick LLC" /></SelectTrigger>
                  <SelectContent>
                    {profiles.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.business_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Business split %</Label>
                <Input
                  type="number" min={0} max={100} step="1"
                  value={editing.business_split_pct ?? 100}
                  onChange={(e) => setEditing({ ...editing, business_split_pct: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label>Business category</Label>
                <Select
                  value={editing.business_category_id ?? ''}
                  onValueChange={(v) => setEditing({ ...editing, business_category_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pick business category" /></SelectTrigger>
                  <SelectContent>
                    {businessCats.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.category_groups.name} → {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Personal category</Label>
                <Select
                  value={editing.personal_category_id ?? ''}
                  onValueChange={(v) => setEditing({ ...editing, personal_category_id: v })}
                >
                  <SelectTrigger><SelectValue placeholder="Pick personal category" /></SelectTrigger>
                  <SelectContent>
                    {personalCats.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.category_groups.name} → {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 flex items-center justify-between border rounded p-2">
                <Label>Active</Label>
                <Switch
                  checked={editing.is_active ?? true}
                  onCheckedChange={(v) => setEditing({ ...editing, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => editing && saveMutation.mutate(editing)} disabled={saveMutation.isPending}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
