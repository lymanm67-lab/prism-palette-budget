import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, TrendingUp, AlertTriangle } from 'lucide-react';
import {
  analyzeRenewals, combinedPremium, RENEWAL_RESPONSE_LABEL,
  type LtcState, type RenewalNotice,
} from '@/lib/ltc/model';
import { PLAN_MAX_MONTHLY } from '@/lib/ltc/careplan';
import { money, money2, Note, Field, NumField, Select, StatCard } from './shared';

const RESPONSES: RenewalNotice['response'][] = [
  'pending', 'accepted', 'reducedBenefit', 'shortenedPeriod', 'reducedInflation', 'nonforfeiture', 'declined',
];

export function RenewalTracker({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const analysis = analyzeRenewals(state, policy);
  const renewals = state.renewals || [];
  const [open, setOpen] = useState(false);

  const setRenewals = (list: RenewalNotice[]) => patch({ renewals: list });
  const update = (id: string, p: Partial<RenewalNotice>) =>
    setRenewals(renewals.map((r) => (r.id === id ? { ...r, ...p } : r)));

  const add = () => {
    const last = analysis.currentPremium || (policy ? combinedPremium(policy) : 0);
    setRenewals([
      ...renewals,
      {
        id: crypto.randomUUID(),
        effectiveDate: new Date().toISOString().slice(0, 10),
        noticeDate: new Date().toISOString().slice(0, 10),
        carrier: policy?.carrier || '',
        oldMonthlyPremium: last,
        newMonthlyPremium: last,
        monthlyBenefit: policy?.startingMonthlyBenefit ?? PLAN_MAX_MONTHLY,
        response: 'pending',
      },
    ]);
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-prism-amber" /> LTC Renewal & Rate Increase Tracker
            </CardTitle>
            <Note>
              LTC premiums are not guaranteed level. Log every carrier rate action here, how it was answered, and what the
              premium became — a policy that becomes unaffordable and lapses protects nothing.
            </Note>
          </div>
          <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 mr-1" /> Log a rate notice</Button>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Premium in force" value={`${money2(analysis.currentPremium)}/mo`} sub={`${money2(analysis.currentPremium * 12)} per year`} tone="info" />
          <StatCard
            label="Cumulative increase"
            value={`${analysis.cumulativePct.toFixed(1)}%`}
            sub={`From ${money2(analysis.originalPremium)}/mo at issue`}
            tone={analysis.cumulativePct > 0 ? 'warn' : 'good'}
          />
          <StatCard
            label="Average annual increase"
            value={`${analysis.averageAnnualPct.toFixed(1)}%`}
            sub={`${analysis.acceptedCount} accepted · ${analysis.pendingCount} pending`}
          />
          <StatCard
            label="Premium share of income"
            value={`${(analysis.premiumShare * 100).toFixed(1)}%`}
            sub="5% is the lapse guardrail"
            tone={analysis.premiumShare > 0.05 ? 'risk' : 'good'}
          />
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Five-year premium outlook</CardTitle>
          <Note>Projected at the average increase observed in your own rate history.</Note>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid sm:grid-cols-3 gap-3">
            <StatCard label="Premium in 5 years" value={`${money2(analysis.projectedIn5Years)}/mo`} sub={`${money2(analysis.projectedIn5Years * 12)} per year`} tone={analysis.breachesGuardrail ? 'warn' : 'default'} />
            <StatCard label="Share of income then" value={`${(analysis.projected5YrShare * 100).toFixed(1)}%`} sub="Household income held flat" tone={analysis.breachesGuardrail ? 'risk' : 'good'} />
            <StatCard label="Plan maximum defended" value={`${money(PLAN_MAX_MONTHLY)}/mo`} sub="Benefit to protect before accepting a cut" tone="info" />
          </div>
          {analysis.breachesGuardrail && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm">
                At this pace the premium passes 5% of household income within five years. Before accepting the next
                increase, price the landing options: shorten the benefit period, trim the inflation rider, or reduce the
                monthly benefit — but keep the {money(PLAN_MAX_MONTHLY)}/mo plan maximum intact if at all possible, since
                that is what buys the weekly care hours.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base">Rate action history</CardTitle>
            <Note>{renewals.length ? `${renewals.length} logged notice${renewals.length === 1 ? '' : 's'}.` : 'No rate notices logged yet.'}</Note>
          </div>
          {renewals.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>{open ? 'Done editing' : 'Edit'}</Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Log the first notice when it arrives. Until then the tracker uses the current quoted premium of{' '}
              {money2(policy ? combinedPremium(policy) : 0)}/mo as the baseline.
            </p>
          )}

          {analysis.rows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="py-2">Effective</th>
                    <th className="py-2">Carrier</th>
                    <th className="py-2">Old premium</th>
                    <th className="py-2">New premium</th>
                    <th className="py-2">Increase</th>
                    <th className="py-2">Benefit after</th>
                    <th className="py-2">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.rows.map((r) => (
                    <tr key={r.id} className="border-b border-border/30">
                      <td className="py-2 tabular-nums">{r.effectiveDate}</td>
                      <td className="py-2">{r.carrier || '—'}</td>
                      <td className="py-2 tabular-nums">{money2(r.oldMonthlyPremium)}</td>
                      <td className="py-2 tabular-nums font-semibold">{money2(r.newMonthlyPremium)}</td>
                      <td className={`py-2 tabular-nums ${r.increaseDollars > 0 ? 'text-destructive' : 'text-prism-positive'}`}>
                        {money2(r.increaseDollars)} ({r.increasePct.toFixed(1)}%)
                      </td>
                      <td className="py-2 tabular-nums">{r.monthlyBenefit ? `${money(r.monthlyBenefit)}/mo` : '—'}</td>
                      <td className="py-2">
                        <Badge variant={r.response === 'pending' ? 'outline' : 'secondary'}>
                          {RENEWAL_RESPONSE_LABEL[r.response]}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {open && renewals.map((r) => (
            <div key={r.id} className="rounded-lg border border-border/60 bg-card/60 p-3 space-y-3">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Field label="Effective date">
                  <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={r.effectiveDate} onChange={(e) => update(r.id, { effectiveDate: e.target.value })} />
                </Field>
                <Field label="Notice received">
                  <input type="date" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={r.noticeDate || ''} onChange={(e) => update(r.id, { noticeDate: e.target.value })} />
                </Field>
                <Field label="Carrier">
                  <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={r.carrier} onChange={(e) => update(r.id, { carrier: e.target.value })} />
                </Field>
                <Field label="Filed increase %">
                  <NumField step="0.1" value={r.filingPct ?? 0} onChange={(n) => update(r.id, { filingPct: n })} />
                </Field>
                <Field label="Old monthly premium">
                  <NumField step="0.01" value={r.oldMonthlyPremium} onChange={(n) => update(r.id, { oldMonthlyPremium: n })} />
                </Field>
                <Field label="New monthly premium">
                  <NumField step="0.01" value={r.newMonthlyPremium} onChange={(n) => update(r.id, { newMonthlyPremium: n })} />
                </Field>
                <Field label="Monthly benefit after">
                  <NumField value={r.monthlyBenefit ?? 0} onChange={(n) => update(r.id, { monthlyBenefit: n })} />
                </Field>
                <Field label="How it was handled">
                  <Select value={r.response} onChange={(v) => update(r.id, { response: v as RenewalNotice['response'] })}
                    options={RESPONSES.map((v) => ({ value: v, label: RENEWAL_RESPONSE_LABEL[v] }))} />
                </Field>
              </div>
              <div className="flex items-end gap-2">
                <Field label="Notes" className="flex-1">
                  <input className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={r.notes || ''} onChange={(e) => update(r.id, { notes: e.target.value })} />
                </Field>
                <Button size="sm" variant="ghost" className="text-destructive"
                  onClick={() => setRenewals(renewals.filter((x) => x.id !== r.id))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}

          <p className="text-[11px] text-muted-foreground">
            Click <span className="font-semibold">Save plan</span> at the top of the page to persist rate notices.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
