import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useHouseholdProfile, useSaveHouseholdProfile, ageFromDob } from '@/hooks/use-household-profile';

const FIELDS: [string, string, 'date' | 'number'][] = [
  ['lyman_dob', 'Lyman birthday', 'date'],
  ['kateri_dob', 'Kateri birthday', 'date'],
  ['lyman_gross_monthly', 'Lyman gross / mo ($)', 'number'],
  ['lyman_net_monthly', 'Lyman net / mo ($)', 'number'],
  ['kateri_gross_monthly', 'Kateri gross / mo ($)', 'number'],
  ['kateri_net_monthly', 'Kateri net / mo ($)', 'number'],
  ['household_net_monthly', 'Household net pay / mo ($)', 'number'],
  ['net_pay_effective_from', 'Net pay starts', 'date'],
];

export function HouseholdProfileCard() {
  const { data } = useHouseholdProfile();
  const save = useSaveHouseholdProfile();
  const [form, setForm] = useState<Record<string, any>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const submit = async () => {
    const patch: Record<string, any> = {};
    for (const [k, , t] of FIELDS) {
      const v = form[k];
      patch[k] = v === '' || v == null ? null : t === 'number' ? Number(v) : v;
    }
    try { await save.mutateAsync(patch); toast({ title: 'Household profile saved' }); }
    catch (e: any) { toast({ title: 'Save failed', description: e.message, variant: 'destructive' }); }
  };

  const la = ageFromDob(form.lyman_dob ?? null);
  const ka = ageFromDob(form.kateri_dob ?? null);

  return (
    <Card className="wos-page">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCircle className="h-4 w-4 text-prism-teal" /> Household profile (master record)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Enter these once. Ages and salary in the Blueprint come from here. Lyman is {la ?? 'not set'}, Kateri is {ka ?? 'not set'}.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FIELDS.map(([k, label, t]) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs">{label}</Label>
              <Input type={t} value={form[k] ?? ''} placeholder="Not set yet"
                onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
        </div>
        <Button onClick={submit} disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save profile'}</Button>
      </CardContent>
    </Card>
  );
}
