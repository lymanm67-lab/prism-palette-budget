import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useInvestmentLegacy, useUpsertLegacy } from '@/hooks/use-investment-v2';
import { toast } from '@/hooks/use-toast';
import { Heart, Plus, Trash2 } from 'lucide-react';

function useAccounts() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['accounts-for-legacy', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data } = await supabase.from('accounts').select('id,name,type,balance').eq('household_id', household!.id).is('deleted_at', null);
      return data || [];
    },
  });
}

export function LegacyPlanner({ planId }: { planId?: string }) {
  const { data: legacy } = useInvestmentLegacy(planId);
  const { data: accounts = [] } = useAccounts();
  const upsert = useUpsertLegacy();
  const [form, setForm] = useState<any>({
    name: 'Legacy Goal', target_amount: 0, target_year: new Date().getFullYear() + 30,
    included_account_ids: [], excluded_account_ids: [], beneficiaries: [], advisors: [],
    has_will: false, has_trust: false, has_poa: false, notes: '',
  });

  useEffect(() => { if (legacy) setForm(legacy); }, [legacy]);

  if (!planId) return <Card><CardContent className="p-6 text-sm text-muted-foreground">Complete the Setup wizard first.</CardContent></Card>;

  const toggleAccount = (id: string, included: boolean) => {
    setForm((f: any) => {
      const inc = new Set(f.included_account_ids || []);
      const exc = new Set(f.excluded_account_ids || []);
      if (included) { inc.add(id); exc.delete(id); } else { inc.delete(id); exc.add(id); }
      return { ...f, included_account_ids: [...inc], excluded_account_ids: [...exc] };
    });
  };

  const addContact = (type: 'beneficiaries' | 'advisors') => {
    setForm((f: any) => ({ ...f, [type]: [...(f[type] || []), { name: '', relationship: '', contact: '' }] }));
  };
  const updateContact = (type: 'beneficiaries' | 'advisors', idx: number, key: string, val: string) => {
    setForm((f: any) => {
      const arr = [...(f[type] || [])];
      arr[idx] = { ...arr[idx], [key]: val };
      return { ...f, [type]: arr };
    });
  };
  const removeContact = (type: 'beneficiaries' | 'advisors', idx: number) => {
    setForm((f: any) => ({ ...f, [type]: (f[type] || []).filter((_: any, i: number) => i !== idx) }));
  };

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...form, plan_id: planId });
      toast({ title: 'Legacy plan saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  const includedTotal = accounts
    .filter((a: any) => (form.included_account_ids || []).includes(a.id))
    .reduce((s: number, a: any) => s + Number(a.balance || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><Heart className="h-4 w-4 text-primary" /> Legacy planning</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div><Label>Goal name</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Target amount ($)</Label><Input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: Number(e.target.value) })} /></div>
            <div><Label>Target year</Label><Input type="number" value={form.target_year ?? ''} onChange={e => setForm({ ...form, target_year: Number(e.target.value) })} /></div>
          </div>

          <div>
            <Label className="text-sm">Accounts to include in legacy</Label>
            <p className="text-xs text-muted-foreground mb-2">Currently included: <span className="font-semibold">${includedTotal.toLocaleString()}</span></p>
            <div className="border rounded-md divide-y max-h-60 overflow-auto">
              {accounts.length === 0 && <p className="p-3 text-xs text-muted-foreground">No accounts found.</p>}
              {accounts.map((a: any) => {
                const included = (form.included_account_ids || []).includes(a.id);
                return (
                  <label key={a.id} className="flex items-center justify-between p-2 text-sm cursor-pointer hover:bg-muted/40">
                    <div className="flex items-center gap-2">
                      <Checkbox checked={included} onCheckedChange={(v) => toggleAccount(a.id, !!v)} />
                      <span>{a.name}</span>
                      <span className="text-xs text-muted-foreground">({a.type})</span>
                    </div>
                    <span className="text-xs">${Number(a.balance || 0).toLocaleString()}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.has_will} onCheckedChange={v => setForm({ ...form, has_will: !!v })} /> Will in place</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.has_trust} onCheckedChange={v => setForm({ ...form, has_trust: !!v })} /> Trust funded</label>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.has_poa} onCheckedChange={v => setForm({ ...form, has_poa: !!v })} /> POA assigned</label>
          </div>

          {(['beneficiaries', 'advisors'] as const).map(type => (
            <div key={type}>
              <div className="flex items-center justify-between mb-2">
                <Label className="capitalize">{type}</Label>
                <Button size="sm" variant="outline" onClick={() => addContact(type)}><Plus className="h-3 w-3 mr-1" /> Add</Button>
              </div>
              <div className="space-y-2">
                {(form[type] || []).map((c: any, i: number) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-7 gap-2 items-center">
                    <Input className="md:col-span-2" placeholder="Name" value={c.name} onChange={e => updateContact(type, i, 'name', e.target.value)} />
                    <Input className="md:col-span-2" placeholder={type === 'beneficiaries' ? 'Relationship' : 'Role (CPA, attorney…)'} value={c.relationship} onChange={e => updateContact(type, i, 'relationship', e.target.value)} />
                    <Input className="md:col-span-2" placeholder="Contact / email" value={c.contact} onChange={e => updateContact(type, i, 'contact', e.target.value)} />
                    <Button size="icon" variant="ghost" onClick={() => removeContact(type, i)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save legacy plan'}</Button>
          <p className="text-[11px] text-muted-foreground italic">Legacy planning involves legal and tax decisions. Work with a qualified estate attorney and tax professional.</p>
        </CardContent>
      </Card>
    </div>
  );
}
