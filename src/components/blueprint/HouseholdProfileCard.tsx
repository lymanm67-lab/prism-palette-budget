import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  ['investments_total_override', 'Lyman portfolio ($)'],
  ['debt_balance_override', 'Debt balance ($)'],
  ['debt_minimums_override', 'Debt minimums / mo ($)'],
  ['budget_expenses_override', 'Budget expenses / mo ($)'],
];

const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

// Lyman is paid monthly (x1), Kateri twice a month (x2).
const PERSON = {
  lyman: { label: 'Lyman', mult: 1, freq: 'monthly' },
  kateri: { label: 'Kateri', mult: 2, freq: 'twice a month' },
} as const;
type Person = keyof typeof PERSON;

const toDataUrl = (f: File) => new Promise<string>((res, rej) => {
  const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(f);
});

export function HouseholdProfileCard() {
  const { data } = useHouseholdProfile();
  const live = useProfileLiveNumbers();
  const save = useSaveHouseholdProfile();
  const [form, setForm] = useState<Record<string, any>>({});
  const [parsing, setParsing] = useState<Person | null>(null);
  const [stubs, setStubs] = useState<Partial<Record<Person, any>>>({});
  useEffect(() => { if (data) setForm(data); }, [data]);

  const uploadStub = async (who: Person, file?: File) => {
    if (!file) return;
    setParsing(who);
    try {
      const image = await toDataUrl(file);
      const { data: r, error } = await supabase.functions.invoke('parse-paystub', { body: { image, filename: file.name } });
      if (error || r?.error) throw new Error(r?.error || error?.message);
      const m = PERSON[who].mult;
      const gross = r.gross_pay != null ? Math.round(r.gross_pay * m * 100) / 100 : null;
      const net = r.net_pay != null ? Math.round(r.net_pay * m * 100) / 100 : null;
      setForm((f) => ({
        ...f,
        ...(gross != null ? { [`${who}_gross_monthly`]: gross } : {}),
        ...(net != null ? { [`${who}_net_monthly`]: net } : {}),
      }));
      setStubs((s) => ({ ...s, [who]: { ...r, gross, net, m } }));
      toast({ title: `${PERSON[who].label}'s paystub read`, description: 'Check the numbers, then tap Save profile.' });
    } catch (e: any) {
      toast({ title: 'Could not read paystub', description: e.message, variant: 'destructive' });
    } finally { setParsing(null); }
  };

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
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(PERSON) as Person[]).map((who) => {
            const s = stubs[who];
            return (
              <div key={who} className="rounded-md border border-border p-3 space-y-2">
                <Label className="text-xs">Upload {PERSON[who].label}'s paystub (paid {PERSON[who].freq})</Label>
                <Input type="file" accept="image/*,application/pdf" disabled={parsing !== null}
                  onChange={(e) => { uploadStub(who, e.target.files?.[0]); e.target.value = ''; }} />
                {parsing === who && <p className="text-xs text-muted-foreground">Reading paystub…</p>}
                {s && (
                  <div className="text-xs space-y-1">
                    <div className="text-muted-foreground">
                      {s.employer_name || 'Employer not found'} · {s.pay_period_start || '?'} to {s.pay_period_end || '?'}
                    </div>
                    <div>Per check: gross {s.gross_pay != null ? money(s.gross_pay) : 'not found'} · net {s.net_pay != null ? money(s.net_pay) : 'not found'}</div>
                    <div className="font-medium">Monthly (×{s.m}): gross {s.gross != null ? money(s.gross) : 'not found'} · net {s.net != null ? money(s.net) : 'not found'}</div>
                    {Array.isArray(s.deductions) && s.deductions.length > 0 && (
                      <ul className="mt-1 max-h-32 overflow-auto text-muted-foreground">
                        {s.deductions.map((d: any, i: number) => (
                          <li key={i}>{d.name}{d.is_pretax ? ' (pre-tax)' : ''}: {money(Number(d.amount) || 0)} → {money((Number(d.amount) || 0) * s.m)}/mo</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
                    {k === 'investments_total_override' && live.investmentsLive != null &&
                      ` · Combined household ${money(live.investmentsLive)}`}
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
