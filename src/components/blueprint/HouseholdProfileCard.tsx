import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useHouseholdProfile, useSaveHouseholdProfile, ageFromDob } from '@/hooks/use-household-profile';
import { useProfileLiveNumbers } from '@/hooks/use-profile-live-numbers';

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

const OVERRIDE_FIELDS: [string, string][] = [
  ['investments_total_override', 'Investments total ($)'],
  ['debt_balance_override', 'Debt balance ($)'],
  ['debt_minimums_override', 'Debt minimums / mo ($)'],
  ['budget_expenses_override', 'Budget expenses / mo ($)'],
];

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export function HouseholdProfileCard() {
  const { data } = useHouseholdProfile();
  const live = useProfileLiveNumbers();
  const save = useSaveHouseholdProfile();
  const [form, setForm] = useState<Record<string, any>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const submit = async () => {
    const patch: Record<string, any> = {};
    for (const [k, , t] of FIELDS) {
      const v = form[k];
      patch[k] = v === '' || v == null ? null : t === 'number' ? Number(v) : v;
    }
    for (const [k] of OVERRIDE_FIELDS) {
      const v = form[k];
      patch[k] = v === '' || v == null ? null : Number(v);
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
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-xs text-muted-foreground">
            Live numbers — leave a box blank to use the app's own figure, or type a number to override it everywhere.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {OVERRIDE_FIELDS.map(([k, label]) => {
              const liveVal =
                k === 'investments_total_override' ? (live.investmentsLive != null ? live.investmentsLive : null)
                : k === 'debt_balance_override' ? (live.hasDebts ? live.debtBalance : null)
                : k === 'debt_minimums_override' ? (live.hasDebts ? live.debtMinimums : null)
                : (live.hasBudget ? live.budgetExpenses : null);
              const overridden = form[k] !== '' && form[k] != null;
              return (
                <div key={k} className="space-y-1">
                  <Label className="text-xs">{label}</Label>
                  <Input type="number" value={form[k] ?? ''}
                    placeholder={liveVal != null ? `Live: ${money(liveVal)}` : 'Not available yet'}
                    onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
                  <div className="text-xs text-muted-foreground">
                    {overridden
                      ? `Using your number: ${money(Number(form[k]))}`
                      : liveVal != null
                        ? `Using live: ${money(liveVal)}`
                        : 'Not available yet'}
                    {k === 'investments_total_override' && live.hasInvestments && !overridden &&
                      ` · Retirement ${money(live.retirement)} · Self-directed ${money(live.selfDirected)}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
