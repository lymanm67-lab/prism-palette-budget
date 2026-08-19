import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, TrendingUp, Link2 } from 'lucide-react';
import {
  careCostAtAge, combinedPremium, fvMonthly, simulateCareEvent, type LtcState,
} from '@/lib/ltc/model';
import { useWealthOSData } from '@/hooks/use-wealth-os';
import { money, money2, Note, Field, NumField, StatCard } from './shared';


const DURATIONS = [1, 2, 3, 5];
const RETURNS = [6, 7, 8, 9];

export function AssetProtection({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const h = state.household;
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const setH = (p: Partial<typeof h>) => patch({ household: { ...h, ...p } });

  const monthlyCost = careCostAtAge(h, h.lymanAge, h.assumedClaimAge);

  // Premium difference between the current plan and the next-cheapest alternative
  const others = state.policies.filter((p) => p.id !== policy?.id);
  const cheapestAlt = others.sort((a, b) => combinedPremium(a) - combinedPremium(b))[0];
  const savingsMonthly = cheapestAlt && policy
    ? Math.max(0, combinedPremium(cheapestAlt) - combinedPremium(policy))
    : 0;

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Inputs</CardTitle></CardHeader>
        <CardContent className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <Field label="Retirement balance"><NumField value={h.retirementBalance} onChange={(n) => setH({ retirementBalance: n })} /></Field>
          <Field label="Expected return %"><NumField value={h.expectedReturnPct} onChange={(n) => setH({ expectedReturnPct: n })} step="0.1" /></Field>
          <Field label="Claim age"><NumField value={h.assumedClaimAge} onChange={(n) => setH({ assumedClaimAge: n })} /></Field>
          <Field label="Care years"><NumField value={h.assumedCareYears} onChange={(n) => setH({ assumedCareYears: n })} /></Field>
          <Field label="Care cost growth %"><NumField value={h.careCostGrowthPct} onChange={(n) => setH({ careCostGrowthPct: n })} step="0.1" /></Field>
          <Field label="Household income /mo"><NumField value={h.monthlyHouseholdIncome} onChange={(n) => setH({ monthlyHouseholdIncome: n })} /></Field>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-prism-lime" /> With and without LTC insurance
          </CardTitle>
          <Note>
            Care beginning at age {h.assumedClaimAge} at {money(monthlyCost)}/month in {h.city}.
            {policy ? ` Modeled against ${policy.carrier} — ${policy.product}.` : ''}
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Care length</th>
                <th className="py-2">Total care cost</th>
                <th className="py-2">Withdrawals without insurance</th>
                <th className="py-2">Insurance benefits received</th>
                <th className="py-2">Remaining out of pocket</th>
                <th className="py-2">Withdrawals avoided</th>
                <th className="py-2">Portfolio preserved</th>
                <th className="py-2">Preserved value at 90</th>
              </tr>
            </thead>
            <tbody>
              {DURATIONS.map((yrs) => {
                const withIns = simulateCareEvent(state, policy || null, h.assumedClaimAge, yrs);
                const without = simulateCareEvent(state, null, h.assumedClaimAge, yrs);
                return (
                  <tr key={yrs} className="border-b border-border/30">
                    <td className="py-2">{yrs} year{yrs > 1 ? 's' : ''}</td>
                    <td className="py-2 tabular-nums">{money(withIns.totalCareCost)}</td>
                    <td className="py-2 tabular-nums text-destructive">{money(without.outOfPocket)}</td>
                    <td className="py-2 tabular-nums font-semibold text-prism-lime">{money(withIns.insurancePaid)}</td>
                    <td className="py-2 tabular-nums">{money(withIns.outOfPocket)}</td>
                    <td className="py-2 tabular-nums">{money(withIns.insurancePaid)}</td>
                    <td className="py-2 tabular-nums">{money(withIns.retirementRemaining)}</td>
                    <td className="py-2 tabular-nums">{money(withIns.legacyValue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Note>
            Premiums paid to the claim age are subtracted from the insured column, so "portfolio preserved" is a net figure.
          </Note>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-prism-amber" /> Premium savings, invested instead
          </CardTitle>
          <Note>
            {cheapestAlt && policy
              ? `Choosing ${policy.carrier} ${policy.product} over ${cheapestAlt.carrier} ${cheapestAlt.product} saves ${money2(savingsMonthly)} per month (${money2(savingsMonthly * 12)} per year).`
              : 'Add a second quote to compare premium differences.'}
          </Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Return</th><th className="py-2">10 years</th><th className="py-2">20 years</th><th className="py-2">25 years</th>
              </tr>
            </thead>
            <tbody>
              {RETURNS.map((r) => (
                <tr key={r} className="border-b border-border/30">
                  <td className="py-2">{r}%</td>
                  <td className="py-2 tabular-nums">{money(fvMonthly(savingsMonthly, r, 10))}</td>
                  <td className="py-2 tabular-nums">{money(fvMonthly(savingsMonthly, r, 20))}</td>
                  <td className="py-2 tabular-nums font-semibold">{money(fvMonthly(savingsMonthly, r, 25))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
