import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useMoneyRules, useUpsertMoneyRule, useDeleteMoneyRule } from '@/hooks/use-investment-v2';
import { toast } from '@/hooks/use-toast';
import { Zap, Plus, Trash2 } from 'lucide-react';

const empty = {
  name: '', trigger_type: 'date', start_date: '', amount: 0, amount_pct: null,
  destination: '', frequency: 'monthly', reminder: true, status: 'scheduled', notes: '',
};

const statusColor: Record<string, string> = {
  scheduled: 'bg-blue-500/15 text-blue-600',
  active: 'bg-green-500/15 text-green-600',
  paused: 'bg-amber-500/15 text-amber-600',
};

export function MoneyRulesManager({ planId }: { planId?: string }) {
  const { data: rules = [] } = useMoneyRules();
  const upsert = useUpsertMoneyRule();
  const del = useDeleteMoneyRule();
  const [editing, setEditing] = useState<any | null>(null);

  const save = async () => {
    try {
      const row = { ...editing, plan_id: planId };
      if (!row.start_date) row.start_date = null;
      await upsert.mutateAsync(row);
      setEditing(null);
      toast({ title: 'Rule saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" /> Money rules</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">Set automation reminders like "when raise hits, redirect 75% to 401(k)" or "after debt payoff, invest $500/mo".</p>
          {rules.length === 0 && !editing && <p className="text-sm text-muted-foreground">No rules yet.</p>}
          {rules.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium text-sm flex items-center gap-2">
                  {r.name}
                  <Badge variant="outline" className={statusColor[r.status] || ''}>{r.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.trigger_type} {r.start_date ? `· ${r.start_date}` : ''} · {r.amount_pct ? `${r.amount_pct}%` : `$${r.amount}`} → {r.destination} · {r.frequency}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(r)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {!editing && <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add rule</Button>}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing.id ? 'Edit rule' : 'New rule'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Rule name</Label><Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Redirect raise to 401(k)" /></div>
              <div>
                <Label>Trigger</Label>
                <Select value={editing.trigger_type} onValueChange={v => setEditing({ ...editing, trigger_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">On date</SelectItem>
                    <SelectItem value="raise">When raise hits</SelectItem>
                    <SelectItem value="debt_payoff">After debt payoff</SelectItem>
                    <SelectItem value="manual">Manual reminder</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Start date</Label><Input type="date" value={editing.start_date || ''} onChange={e => setEditing({ ...editing, start_date: e.target.value })} /></div>
              <div><Label>Amount ($)</Label><Input type="number" value={editing.amount ?? 0} onChange={e => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
              <div><Label>OR % of source</Label><Input type="number" value={editing.amount_pct ?? ''} onChange={e => setEditing({ ...editing, amount_pct: e.target.value === '' ? null : Number(e.target.value) })} /></div>
              <div className="md:col-span-2"><Label>Destination</Label><Input value={editing.destination || ''} onChange={e => setEditing({ ...editing, destination: e.target.value })} placeholder="401(k), Roth IRA, brokerage…" /></div>
              <div>
                <Label>Frequency</Label>
                <Select value={editing.frequency} onValueChange={v => setEditing({ ...editing, frequency: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">Once</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="biweekly">Biweekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={v => setEditing({ ...editing, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save'}</Button>
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
