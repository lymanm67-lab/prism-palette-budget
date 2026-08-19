import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import {
  benefitAtAge, combinedPremium, annualPremium, lifetimePremiums, scorePolicies,
  simulateCareEvent, type LtcPolicy, type LtcState,
} from '@/lib/ltc/model';
import { money, money2, Note } from './shared';

type SortKey = 'premium' | 'starting' | 'future' | 'inflation' | 'value' | 'fit';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'fit', label: 'Best retirement strategy fit' },
  { key: 'premium', label: 'Lowest premium' },
  { key: 'starting', label: 'Highest initial benefit' },
  { key: 'future', label: 'Highest future benefit' },
  { key: 'inflation', label: 'Best inflation protection' },
  { key: 'value', label: 'Best value' },
];

export function PolicyComparison({ state, patch }: { state: LtcState; patch: (p: Partial<LtcState>) => void }) {
  const [sort, setSort] = useState<SortKey>('fit');
  const h = state.household;
  const scores = useMemo(() => scorePolicies(state), [state]);
  const scoreOf = (id: string) => scores.find((s) => s.policyId === id);

  const rows = useMemo(() => {
    const list = state.policies.map((p) => {
      const s = scoreOf(p.id)!;
      const at80 = benefitAtAge(p, h.lymanAge, 80);
      const sim = simulateCareEvent(state, p, h.assumedClaimAge, h.assumedCareYears);
      return {
        p, s, at80,
        lifetime: lifetimePremiums(p, h.lymanAge, h.assumedClaimAge),
        preserved: sim.insurancePaid,
      };
    });
    const cmp: Record<SortKey, (a: typeof list[0], b: typeof list[0]) => number> = {
      premium: (a, b) => combinedPremium(a.p) - combinedPremium(b.p),
      starting: (a, b) => b.p.startingMonthlyBenefit - a.p.startingMonthlyBenefit,
      future: (a, b) => b.at80.monthlyBenefit - a.at80.monthlyBenefit,
      inflation: (a, b) => b.s.inflation - a.s.inflation,
      value: (a, b) => b.s.value - a.s.value,
      fit: (a, b) => b.s.weighted - a.s.weighted,
    };
    return list.sort(cmp[sort]);
  }, [state, sort, scores]);

  const addPolicy = () => {
    const id = `custom-${Date.now()}`;
    const blank: LtcPolicy = {
      id, carrier: 'New carrier', product: 'Custom quote',
      startingMonthlyBenefit: 2500, benefitPeriodMonths: 36, poolEach: 90000,
      inflationPct: 3, inflationCompound: true, inflationLifetime: true,
      homeCarePct: 100, assistedLivingPct: 100, nursingPct: 100, cashBenefitPct: 0,
      eliminationDays: 90, partnershipQualified: false, sharedCare: false,
      premiumWaiver: false, jointApplicantDiscount: false, combinedMonthlyPremium: 250,
    };
    patch({ policies: [...state.policies, blank] });
  };

  const removePolicy = (id: string) =>
    patch({
      policies: state.policies.filter((p) => p.id !== id),
      currentPolicyId: state.currentPolicyId === id ? (state.policies.find((p) => p.id !== id)?.id || '') : state.currentPolicyId,
    });

  const head = [
    'Company', 'Product', 'Start benefit', 'Benefit period', 'Initial pool', 'Inflation', 'Type', 'Lifetime',
    'Home care', 'Assisted living', 'Nursing', 'Cash benefit', 'Elimination', 'Partnership', 'Shared care',
    'Spouse waiver', 'Combined /mo', 'Combined /yr', 'Age-80 benefit', 'Lifetime premiums', 'Assets preserved',
    'Value', 'Protection', 'Afford.', 'Flex.', 'Overall', '',
  ];

  return (
    <Card className="glass-card">
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="text-base">Policy Comparison</CardTitle>
          <Note>Ranked against this household's weights, not by headline benefit. {state.policies.length} plans on file.</Note>
        </div>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {SORTS.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={addPolicy}><Plus className="h-3.5 w-3.5 mr-1" /> Add quote</Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/60 text-left">
                {head.map((hd, i) => (
                  <th key={i} className="px-2 py-2 whitespace-nowrap text-[10px] uppercase tracking-wide text-muted-foreground">{hd}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, s, at80, lifetime, preserved }) => (
                <tr key={p.id} className={`border-b border-border/30 ${p.id === state.currentPolicyId ? 'bg-prism-lime/5' : ''}`}>
                  <td className="px-2 py-2 whitespace-nowrap font-medium">{p.carrier}</td>
                  <td className="px-2 py-2 whitespace-nowrap">
                    {p.product}
                    {p.id === state.currentPolicyId && <Badge variant="outline" className="ml-2 text-[9px] border-prism-lime/40 text-prism-lime">Current</Badge>}
                  </td>
                  <td className="px-2 py-2 tabular-nums">{money(p.startingMonthlyBenefit)}</td>
                  <td className="px-2 py-2 whitespace-nowrap">{p.benefitPeriodMonths} mo</td>
                  <td className="px-2 py-2 tabular-nums">{money(p.poolEach)}</td>
                  <td className="px-2 py-2">{p.inflationPct}%</td>
                  <td className="px-2 py-2">{p.inflationCompound ? 'Compound' : 'Simple'}</td>
                  <td className="px-2 py-2">{p.inflationLifetime ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">{p.homeCarePct}%</td>
                  <td className="px-2 py-2">{p.assistedLivingPct}%</td>
                  <td className="px-2 py-2">{p.nursingPct}%</td>
                  <td className="px-2 py-2">{p.cashBenefitPct ? `${p.cashBenefitPct}%` : 'No'}</td>
                  <td className="px-2 py-2">{p.eliminationDays}d</td>
                  <td className="px-2 py-2">{p.partnershipQualified ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">{p.sharedCare ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2">{p.premiumWaiver ? 'Yes' : 'No'}</td>
                  <td className="px-2 py-2 tabular-nums font-semibold">{money2(combinedPremium(p))}</td>
                  <td className="px-2 py-2 tabular-nums">{money(annualPremium(p))}</td>
                  <td className="px-2 py-2 tabular-nums">{money(at80.monthlyBenefit)}</td>
                  <td className="px-2 py-2 tabular-nums">{money(lifetime)}</td>
                  <td className="px-2 py-2 tabular-nums">{money(preserved)}</td>
                  <td className="px-2 py-2 tabular-nums">{s.value}</td>
                  <td className="px-2 py-2 tabular-nums">{s.protection}</td>
                  <td className="px-2 py-2 tabular-nums">{s.affordability}</td>
                  <td className="px-2 py-2 tabular-nums">{s.flexibility}</td>
                  <td className="px-2 py-2 tabular-nums font-bold text-prism-amber">{s.weighted}</td>
                  <td className="px-2 py-2">
                    {!p.seeded && (
                      <Button size="icon" variant="ghost" onClick={() => removePolicy(p.id)} aria-label="Remove quote">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Note>
          Assets preserved = insurance dollars paid during a {h.assumedCareYears}-year care event beginning at age {h.assumedClaimAge},
          i.e. retirement withdrawals avoided. Lifetime premiums run from today to that claim age at level premiums.
        </Note>
      </CardContent>
    </Card>
  );
}
