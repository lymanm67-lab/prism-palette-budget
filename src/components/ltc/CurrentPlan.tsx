import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { combinedPremium, annualPremium, cashBenefitMonthly, type LtcState } from '@/lib/ltc/model';
import { money, money2, Note, Field, NumField } from './shared';

export function CurrentPlan({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  if (!policy) return <Note>No policy on file.</Note>;

  const setPolicy = (p: Partial<typeof policy>) =>
    patch({ policies: state.policies.map((q) => (q.id === policy.id ? { ...q, ...p } : q)) });

  const spec: [string, string][] = [
    ['Maximum monthly benefit', `${money(policy.startingMonthlyBenefit)} each`],
    ['Benefit period', `${policy.benefitPeriodMonths} months`],
    ['Initial policy limit', `${money(policy.poolEach)} each`],
    ['Home health care', `${policy.homeCarePct}%`],
    ['Assisted living', `${policy.assistedLivingPct}%`],
    ['Nursing facility', `${policy.nursingPct}%`],
    ['Cash benefit', policy.cashBenefitPct ? `${policy.cashBenefitPct}% of home health care benefit` : 'None'],
    ['Initial cash benefit', policy.cashBenefitPct ? `${money(cashBenefitMonthly(policy))} per month` : '—'],
    ['Elimination period', `${policy.eliminationDays} calendar days`],
    ['Inflation protection', `${policy.inflationPct}% ${policy.inflationCompound ? 'compound' : 'simple'}${policy.inflationLifetime ? ', lifetime' : ''}`],
    ['Ohio Partnership qualified', policy.partnershipQualified ? 'Yes' : 'No'],
    ['Shared care', policy.sharedCare ? 'Yes' : 'No'],
    ['Spouse premium waiver', policy.premiumWaiver ? 'Yes' : 'No'],
    ['Return of premium', 'No'],
  ];

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Current Leading Strategy</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={state.currentPolicyId} onValueChange={(v) => patch({ currentPolicyId: v })}>
              <SelectTrigger className="w-[340px] max-w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {state.policies.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.carrier} — {p.product}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Note>Applies to both Lyman and Kateri.</Note>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5">
            {spec.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1">
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="text-sm font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Premiums</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-4 gap-3 items-end">
          <Field label="Lyman monthly premium">
            <NumField value={policy.premiumLyman ?? 0} onChange={(n) => setPolicy({ premiumLyman: n, combinedMonthlyPremium: n + (policy.premiumKateri ?? 0) })} />
          </Field>
          <Field label="Kateri monthly premium">
            <NumField value={policy.premiumKateri ?? 0} onChange={(n) => setPolicy({ premiumKateri: n, combinedMonthlyPremium: (policy.premiumLyman ?? 0) + n })} />
          </Field>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Combined monthly</p>
            <p className="text-xl font-bold tabular-nums">{money2(combinedPremium(policy))}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Combined annual</p>
            <p className="text-xl font-bold tabular-nums">{money2(annualPremium(policy))}</p>
          </div>
        </CardContent>
      </Card>

      {policy.cashBenefitPct > 0 && (
        <Card className="glass-card border-prism-amber/40">
          <CardContent className="pt-5 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-prism-amber mt-0.5 shrink-0" />
            <p className="text-sm">
              <span className="font-semibold">Verify cash benefit coordination.</span> The {policy.cashBenefitPct}% cash
              benefit is <span className="font-semibold">not</span> treated here as an extra benefit stacked on top of the
              full monthly reimbursement benefit. Confirm exact coordination between cash and reimbursement benefits in the
              policy contract before relying on it.
            </p>
          </CardContent>
        </Card>
      )}

      {policy.notes && <Note>{policy.notes}</Note>}
    </div>
  );
}
