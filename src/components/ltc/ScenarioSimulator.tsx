import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { careCostAtAge, simulateCareEvent, type LtcPolicy, type LtcState } from '@/lib/ltc/model';
import { money, Note, Field, NumField } from './shared';

const CLAIM_AGES = [65, 70, 75, 80, 85];
const DURATIONS = [1, 2, 3, 5];

export function ScenarioSimulator({ state }: { state: LtcState }) {
  const h = state.household;
  const [claimAge, setClaimAge] = useState(h.assumedClaimAge);
  const [careYears, setCareYears] = useState(h.assumedCareYears);
  const [customBenefit, setCustomBenefit] = useState(2500);
  const [customPremium, setCustomPremium] = useState(254.05);

  const find = (id: string) => state.policies.find((p) => p.id === id) || null;

  const custom: LtcPolicy = useMemo(() => ({
    ...(find('moo-2100-3') || state.policies[0]),
    id: 'scenario-custom', carrier: 'Custom', product: 'Custom LTC policy',
    startingMonthlyBenefit: customBenefit, poolEach: customBenefit * 36,
    inflationPct: 3, inflationCompound: true, inflationLifetime: true,
    combinedMonthlyPremium: customPremium, premiumLyman: undefined, premiumKateri: undefined,
  }), [state.policies, customBenefit, customPremium]);

  const scenarios: { key: string; label: string; policy: LtcPolicy | null; selfFund?: boolean }[] = [
    { key: 'A', label: 'A — MOO $2,100, 3% compound', policy: find('moo-2100-3') },
    { key: 'B', label: 'B — Thrivent $3,000, 3% compound', policy: find('thrivent-3000-3') },
    { key: 'C', label: 'C — National Guardian $3,000, 3%', policy: find('ngl-3000-3') },
    { key: 'D', label: 'D — No LTC insurance', policy: null },
    { key: 'E', label: 'E — Self-fund LTC entirely', policy: null, selfFund: true },
    { key: 'F', label: 'F — Custom LTC policy', policy: custom },
  ];

  const monthlyCost = careCostAtAge(h, h.lymanAge, claimAge);

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Scenario Simulator</CardTitle>
          <Note>Care cost at age {claimAge}: {money(monthlyCost)} per month in {h.city}.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-4">
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1">Claim age</span>
              <div className="flex gap-1">
                {CLAIM_AGES.map((a) => (
                  <Button key={a} size="sm" variant={claimAge === a ? 'default' : 'outline'} onClick={() => setClaimAge(a)}>{a}</Button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1">Care duration</span>
              <div className="flex gap-1">
                {DURATIONS.map((d) => (
                  <Button key={d} size="sm" variant={careYears === d ? 'default' : 'outline'} onClick={() => setCareYears(d)}>{d} yr</Button>
                ))}
              </div>
            </div>
            <Field label="Custom benefit"><NumField className="w-32" value={customBenefit} onChange={setCustomBenefit} /></Field>
            <Field label="Custom combined premium"><NumField className="w-36" value={customPremium} onChange={setCustomPremium} /></Field>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2">Scenario</th>
                  <th className="py-2">Premiums paid</th>
                  <th className="py-2">Benefit at claim</th>
                  <th className="py-2">Policy pool</th>
                  <th className="py-2">Care cost</th>
                  <th className="py-2">Insurance paid</th>
                  <th className="py-2">Out of pocket</th>
                  <th className="py-2">Retirement remaining</th>
                  <th className="py-2">Legacy value</th>
                </tr>
              </thead>
              <tbody>
                {scenarios.map((s) => {
                  const sim = simulateCareEvent(state, s.policy, claimAge, careYears);
                  return (
                    <tr key={s.key} className="border-b border-border/30">
                      <td className="py-2 whitespace-nowrap font-medium">{s.label}</td>
                      <td className="py-2 tabular-nums">{money(sim.premiumsPaid)}</td>
                      <td className="py-2 tabular-nums">{sim.monthlyBenefit ? `${money(sim.monthlyBenefit)}/mo` : '—'}</td>
                      <td className="py-2 tabular-nums">{sim.poolAvailable ? money(sim.poolAvailable) : '—'}</td>
                      <td className="py-2 tabular-nums">{money(sim.totalCareCost)}</td>
                      <td className="py-2 tabular-nums text-prism-lime">{money(sim.insurancePaid)}</td>
                      <td className="py-2 tabular-nums text-destructive">{money(sim.outOfPocket)}</td>
                      <td className="py-2 tabular-nums font-semibold">{money(sim.retirementRemaining)}</td>
                      <td className="py-2 tabular-nums">{money(sim.legacyValue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Note>
            Scenario D assumes the care event is funded entirely from retirement withdrawals with no premiums paid.
            Scenario E is the same cash flow, deliberately chosen as a self-funding strategy — it is shown so the cost of
            keeping the risk is visible next to the cost of transferring it.
          </Note>
        </CardContent>
      </Card>
    </div>
  );
}
