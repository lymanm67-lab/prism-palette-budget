import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useInvestmentSpouse, useUpsertSpouse } from '@/hooks/use-investment-v2';
import { toast } from '@/hooks/use-toast';
import { Users } from 'lucide-react';

export function SpouseHouseholdPanel({ planId }: { planId?: string }) {
  const { data: spouse } = useInvestmentSpouse(planId);
  const upsert = useUpsertSpouse();
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (spouse) setForm(spouse);
  }, [spouse]);

  if (!planId) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Complete the Setup wizard first.</CardContent></Card>;
  }

  const num = (v: string) => (v === '' ? null : Number(v));
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  const save = async () => {
    try {
      await upsert.mutateAsync({ ...form, plan_id: planId });
      toast({ title: 'Spouse details saved' });
    } catch (e: any) {
      toast({ title: 'Save failed', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4 text-primary" /> Spouse / Household partner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">Add your partner's retirement inputs. These appear alongside yours in totals.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><Label>Name</Label><Input value={form.name || ''} onChange={e => set('name', e.target.value)} /></div>
          <div><Label>Current age</Label><Input type="number" value={form.current_age ?? ''} onChange={e => set('current_age', num(e.target.value))} /></div>
          <div><Label>Retirement age</Label><Input type="number" value={form.retirement_age ?? ''} onChange={e => set('retirement_age', num(e.target.value))} /></div>
          <div><Label>Current balance ($)</Label><Input type="number" value={form.current_balance ?? 0} onChange={e => set('current_balance', Number(e.target.value))} /></div>
          <div><Label>Employee monthly ($)</Label><Input type="number" value={form.monthly_employee_contribution ?? 0} onChange={e => set('monthly_employee_contribution', Number(e.target.value))} /></div>
          <div><Label>Employer monthly ($)</Label><Input type="number" value={form.monthly_employer_contribution ?? 0} onChange={e => set('monthly_employer_contribution', Number(e.target.value))} /></div>
          <div><Label>Expected return %</Label><Input type="number" value={form.expected_return_pct ?? 7} onChange={e => set('expected_return_pct', Number(e.target.value))} /></div>
          <div><Label>Est. Social Security ($/mo)</Label><Input type="number" value={form.ss_monthly_estimate ?? ''} onChange={e => set('ss_monthly_estimate', num(e.target.value))} /></div>
          <div><Label>SS claiming age</Label><Input type="number" value={form.ss_claiming_age ?? ''} onChange={e => set('ss_claiming_age', num(e.target.value))} /></div>
        </div>
        <Button onClick={save} disabled={upsert.isPending}>{upsert.isPending ? 'Saving…' : 'Save spouse details'}</Button>
        <p className="text-[11px] text-muted-foreground italic">Verify pension survivor and Social Security spousal benefits with a qualified advisor.</p>
      </CardContent>
    </Card>
  );
}
