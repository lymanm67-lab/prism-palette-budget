import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { CalendarClock, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  combinedPremium, premiumTracker, type LtcState, type PremiumPayment,
} from '@/lib/ltc/model';
import { money, money2, Note, Field, NumField, StatCard } from './shared';

const monthLabel = (m: string) => {
  const [y, mm] = m.split('-');
  const d = new Date(Number(y), Number(mm) - 1, 1);
  return Number.isNaN(d.getTime()) ? m : d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
};

/**
 * Monthly LTC premium ledger for the binder. Every logged payment is measured
 * against the plan of record (the combined premium on the current policy), so a
 * silent rate increase or a missed month shows up immediately.
 */
export function PremiumTracker({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const t = premiumTracker(state);
  const today = new Date();
  const thisMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const [form, setForm] = useState<Omit<PremiumPayment, 'id'>>({
    month: thisMonth,
    paidOn: today.toISOString().slice(0, 10),
    amountLyman: policy?.premiumLyman || 0,
    amountKateri: policy?.premiumKateri || 0,
    method: '',
    confirmation: '',
    notes: '',
  });

  const log = state.premiumLog || [];

  const addPayment = () => {
    if (!form.month) { toast.error('Pick the month this premium covers'); return; }
    if (log.some((p) => p.month === form.month)) {
      toast.error(`${monthLabel(form.month)} is already logged — delete it first to re-enter.`);
      return;
    }
    patch({ premiumLog: [...log, { ...form, id: crypto.randomUUID() }] });
    toast.success(`${monthLabel(form.month)} premium logged — remember to save the plan`);
  };

  const removePayment = (id: string) => patch({ premiumLog: log.filter((p) => p.id !== id) });

  const yearVarianceTone = Math.abs(t.varianceThisYear) < 1 ? 'good' : t.varianceThisYear > 0 ? 'warn' : 'risk';

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-prism-teal" /> Monthly Premium vs. Plan of Record
          </CardTitle>
          <Note>
            Plan of record: {policy ? `${policy.carrier} — ${policy.product}` : 'no policy selected'} at
            {' '}{money2(t.planOfRecord)} per month ({money(t.annualPlanOfRecord)} per year).
          </Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Plan of record" value={`${money2(t.planOfRecord)}/mo`} sub={`${money(t.annualPlanOfRecord)} per year`} />
          <StatCard
            label={`Paid in ${today.getFullYear()}`}
            value={money2(t.paidThisYear)}
            sub={`Expected to date ${money2(t.expectedThisYear)}`}
          />
          <StatCard
            label="Variance to plan"
            value={`${t.varianceThisYear >= 0 ? '+' : '−'}${money2(Math.abs(t.varianceThisYear))}`}
            sub={t.varianceThisYear > 0 ? 'Paying above plan of record' : t.varianceThisYear < 0 ? 'Behind plan — months unlogged or unpaid' : 'Exactly on plan'}
            tone={yearVarianceTone as 'good' | 'warn' | 'risk'}
          />
          <StatCard
            label="Months on plan"
            value={`${t.monthsOnPlan} / ${t.monthsLogged}`}
            sub={t.averagePaid ? `Average ${money2(t.averagePaid)}/mo` : 'No payments logged yet'}
            tone={t.monthsLogged > 0 && t.monthsOnPlan === t.monthsLogged ? 'good' : 'default'}
          />
        </CardContent>
      </Card>

      {t.missingMonths.length > 0 && (
        <Card className="glass-card border-prism-amber/40">
          <CardContent className="pt-5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-prism-amber mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium">{t.missingMonths.length} month(s) not logged this year</p>
              <p className="text-xs text-muted-foreground">
                {t.missingMonths.map(monthLabel).join(', ')} — a lapsed policy protects nothing, so confirm each one was
                actually paid before logging it.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      {t.monthsLogged > 0 && t.missingMonths.length === 0 && (
        <Card className="glass-card border-prism-lime/40">
          <CardContent className="pt-5 flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-prism-lime mt-0.5 shrink-0" />
            <span>Every month this year is logged and paid. Coverage is in force with no lapse gap.</span>
          </CardContent>
        </Card>
      )}

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Log a premium payment</CardTitle>
          <Note>Enter each spouse's actual drafted amount, not the quoted amount, so rate creep is visible.</Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
          <Field label="Month covered">
            <Input type="month" value={form.month} onChange={(e) => setForm((f) => ({ ...f, month: e.target.value }))} />
          </Field>
          <Field label="Date paid">
            <Input type="date" value={form.paidOn} onChange={(e) => setForm((f) => ({ ...f, paidOn: e.target.value }))} />
          </Field>
          <Field label="Lyman premium">
            <NumField step="0.01" value={form.amountLyman} onChange={(n) => setForm((f) => ({ ...f, amountLyman: n }))} />
          </Field>
          <Field label="Kateri premium">
            <NumField step="0.01" value={form.amountKateri} onChange={(n) => setForm((f) => ({ ...f, amountKateri: n }))} />
          </Field>
          <Field label="Method">
            <Input placeholder="Bank draft, card…" value={form.method || ''} onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))} />
          </Field>
          <Field label="Confirmation #">
            <Input value={form.confirmation || ''} onChange={(e) => setForm((f) => ({ ...f, confirmation: e.target.value }))} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <Input value={form.notes || ''} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Field>
          </div>
          <div className="lg:col-span-4 flex items-center gap-3 flex-wrap">
            <Button size="sm" onClick={addPayment}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Log payment
            </Button>
            <Note>
              Combined entry: {money2((form.amountLyman || 0) + (form.amountKateri || 0))} vs plan {money2(t.planOfRecord)}
            </Note>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Premium ledger ({t.monthsLogged})</CardTitle>
          <Note>
            Lifetime logged premiums {money2(t.lifetimePaid)}. Premium is {(t.incomeShare * 100).toFixed(2)}% of household
            income{t.incomeShare > 0.05 ? ' — above the 5% lapse-risk ceiling.' : '.'}
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {t.monthsLogged === 0 ? (
            <Note>No payments logged yet. Start with the current month so the binder has a payment record of its own.</Note>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Month</th><th className="py-2">Paid on</th><th className="py-2">Lyman</th>
                  <th className="py-2">Kateri</th><th className="py-2">Total paid</th><th className="py-2">Plan of record</th>
                  <th className="py-2">Variance</th><th className="py-2">Status</th><th className="py-2">Reference</th>
                  <th className="py-2 print:hidden"></th>
                </tr>
              </thead>
              <tbody>
                {t.months.map((m) => (
                  <tr key={m.payment.id} className="border-b border-border/30">
                    <td className="py-2 font-medium whitespace-nowrap">{monthLabel(m.month)}</td>
                    <td className="py-2 whitespace-nowrap">{m.payment.paidOn || '—'}</td>
                    <td className="py-2 tabular-nums">{money2(m.lyman)}</td>
                    <td className="py-2 tabular-nums">{money2(m.kateri)}</td>
                    <td className="py-2 tabular-nums font-semibold">{money2(m.paid)}</td>
                    <td className="py-2 tabular-nums">{money2(m.expected)}</td>
                    <td className="py-2 tabular-nums">
                      {m.variance === 0 ? '—' : `${m.variance > 0 ? '+' : '−'}${money2(Math.abs(m.variance))}`}
                    </td>
                    <td className="py-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] whitespace-nowrap ${
                          m.onPlan
                            ? 'border-prism-lime/30 bg-prism-lime/15 text-prism-lime'
                            : m.variance > 0
                              ? 'border-prism-amber/30 bg-prism-amber/15 text-prism-amber'
                              : 'border-destructive/30 bg-destructive/15 text-destructive'
                        }`}
                      >
                        {m.onPlan ? 'On plan' : m.variance > 0 ? 'Above plan' : 'Under plan'}
                      </Badge>
                    </td>
                    <td className="py-2 text-xs text-muted-foreground truncate max-w-[14rem]">
                      {[m.payment.method, m.payment.confirmation, m.payment.notes].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="py-2 print:hidden">
                      <Button size="icon" variant="ghost" onClick={() => removePayment(m.payment.id)} aria-label="Delete payment">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {policy && combinedPremium(policy) > 0 && t.months.some((m) => m.variance > 0.5) && (
            <Note>
              At least one month came in above the plan of record. Check for a rate increase notice and upload it to the
              vault, then re-run the sweet spot before the next renewal.
            </Note>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
