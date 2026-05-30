import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useInvestmentPensions, useUpsertPension, useDeletePension } from '@/hooks/use-investment-v2';
import { toast } from '@/hooks/use-toast';
import { Building2, Plus, Trash2, AlertTriangle } from 'lucide-react';

const empty = {
  provider: '', owner: 'self', monthly_amount: 0, start_age: 65,
  cola_pct: 0, survivor_pct: 0, is_taxable: true, use_mode: 'income', lump_sum_amount: null, notes: '',
};

export function PensionPlanner({ planId }: { planId?: string }) {
  const { data: pensions = [] } = useInvestmentPensions(planId);
  const upsert = useUpsertPension();
  const del = useDeletePension();
  const [editing, setEditing] = useState<any | null>(null);

  if (!planId) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Complete the Setup wizard first.</CardContent></Card>;
  }

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...editing, plan_id: planId });
      setEditing(null);
      toast({ title: 'Pension saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  const monthlyTotal = pensions
    .filter((p: any) => p.use_mode === 'income')
    .reduce((s: number, p: any) => s + Number(p.monthly_amount || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Building2 className="h-4 w-4 text-primary" /> Pension income</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-md border bg-muted/40 p-3 text-sm flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5" />
            <p>Pensions provide income, not a liquid balance. Survivor %, COLA, and taxability vary — verify with your plan administrator.</p>
          </div>
          {pensions.length === 0 && !editing && (
            <p className="text-sm text-muted-foreground">No pensions added yet.</p>
          )}
          {pensions.map((p: any) => (
            <div key={p.id} className="flex items-center justify-between border rounded-md p-3">
              <div>
                <div className="font-medium text-sm">{p.provider} <Badge variant="outline" className="ml-1">{p.owner}</Badge></div>
                <div className="text-xs text-muted-foreground">
                  ${Number(p.monthly_amount).toLocaleString()}/mo starts age {p.start_age} · COLA {p.cola_pct}% · Survivor {p.survivor_pct}% · {p.use_mode}
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditing(p)}>Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => del.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          ))}
          {!editing && <Button onClick={() => setEditing({ ...empty })}><Plus className="h-4 w-4 mr-1" /> Add pension</Button>}
          {monthlyTotal > 0 && (
            <p className="text-sm pt-2 border-t">Total pension income: <span className="font-semibold">${monthlyTotal.toLocaleString()}/mo</span></p>
          )}
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader><CardTitle className="text-base">{editing.id ? 'Edit pension' : 'New pension'}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div><Label>Provider</Label><Input value={editing.provider} onChange={e => setEditing({ ...editing, provider: e.target.value })} /></div>
              <div>
                <Label>Owner</Label>
                <Select value={editing.owner} onValueChange={v => setEditing({ ...editing, owner: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="self">Self</SelectItem><SelectItem value="spouse">Spouse</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Monthly amount ($)</Label><Input type="number" value={editing.monthly_amount} onChange={e => setEditing({ ...editing, monthly_amount: Number(e.target.value) })} /></div>
              <div><Label>Start age</Label><Input type="number" value={editing.start_age ?? 65} onChange={e => setEditing({ ...editing, start_age: Number(e.target.value) })} /></div>
              <div><Label>COLA %</Label><Input type="number" value={editing.cola_pct} onChange={e => setEditing({ ...editing, cola_pct: Number(e.target.value) })} /></div>
              <div><Label>Survivor %</Label><Input type="number" value={editing.survivor_pct} onChange={e => setEditing({ ...editing, survivor_pct: Number(e.target.value) })} /></div>
              <div>
                <Label>Use mode</Label>
                <Select value={editing.use_mode} onValueChange={v => setEditing({ ...editing, use_mode: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="invest">Invest while working</SelectItem>
                    <SelectItem value="lump">Lump sum</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Lump sum ($, optional)</Label><Input type="number" value={editing.lump_sum_amount ?? ''} onChange={e => setEditing({ ...editing, lump_sum_amount: e.target.value === '' ? null : Number(e.target.value) })} /></div>
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
