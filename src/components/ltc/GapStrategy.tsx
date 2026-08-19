import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PLAN_HOUR_TIERS } from '@/lib/ltc/careplan';
import type { LtcState } from '@/lib/ltc/model';
import { ensureGapStrategy, type GapStrategyState } from '@/lib/ltc/gapstrategy';
import type { LtcLocationState } from '@/lib/ltc/location';
import { FundingWaterfall } from './gap/FundingWaterfall';
import { HsaGapReserve } from './gap/HsaGapReserve';
import { CashBenefitStrategy } from './gap/CashBenefitStrategy';
import { CareScenarios } from './gap/CareScenarios';
import { AgeGapAnalysis } from './gap/AgeGapAnalysis';
import { PortfolioProtectionPanel } from './gap/PortfolioProtectionPanel';
import { CombinedProtection } from './gap/CombinedProtection';
import { GapStressTest } from './gap/GapStressTest';
import { GapRecommendation } from './gap/GapRecommendation';

const SUB_TABS = [
  { key: 'waterfall', label: 'Funding Waterfall' },
  { key: 'hsa', label: 'HSA Reserve' },
  { key: 'cash', label: 'Cash Benefit & Elimination' },
  { key: 'scenarios', label: 'Care Scenarios' },
  { key: 'ages', label: 'Timing & Household' },
  { key: 'combined', label: 'Combined Protection' },
  { key: 'portfolio', label: 'Portfolio & Partnership' },
  { key: 'stress', label: 'Stress Test' },
  { key: 'verdict', label: 'Are We Protected?' },
];

export function GapStrategy({ state, patch, loc }: {
  state: LtcState;
  patch: (p: Partial<LtcState>) => void;
  loc?: LtcLocationState;
}) {
  const g = ensureGapStrategy(state.gapStrategy, state.household);
  const patchG = (p: Partial<GapStrategyState>) => patch({ gapStrategy: { ...g, ...p } });
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  const h = state.household;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
          <div>
            <Label className="text-xs">Care begins at age</Label>
            <Input type="number" value={g.stress.claimAge}
              onChange={(e) => patchG({ stress: { ...g.stress, claimAge: Number(e.target.value) } })} />
          </div>
          <div>
            <Label className="text-xs">Care event length (years)</Label>
            <Input type="number" value={g.stress.careYears}
              onChange={(e) => patchG({ stress: { ...g.stress, careYears: Number(e.target.value) }, careMonths: Number(e.target.value) * 12 })} />
          </div>
          <div>
            <Label className="text-xs">Weekly care hours</Label>
            <div className="flex gap-1 mt-1">
              {PLAN_HOUR_TIERS.map((hrs) => (
                <Button key={hrs} size="sm" variant={g.weeklyHours === hrs ? 'default' : 'outline'} onClick={() => patchG({ weeklyHours: hrs })}>{hrs}</Button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Monthly income allocated to LTC</Label>
            <Input type="number" value={g.retirementIncomeForLtc}
              onChange={(e) => patchG({ retirementIncomeForLtc: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="waterfall">
        <TabsList className="flex w-full flex-wrap h-auto justify-start print:hidden">
          {SUB_TABS.map((t) => <TabsTrigger key={t.key} value={t.key} className="text-xs">{t.label}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="waterfall" className="mt-4"><FundingWaterfall h={h} g={g} policy={policy} /></TabsContent>
        <TabsContent value="hsa" className="mt-4"><HsaGapReserve h={h} g={g} patchG={patchG} /></TabsContent>
        <TabsContent value="cash" className="mt-4"><CashBenefitStrategy h={h} g={g} patchG={patchG} policy={policy} /></TabsContent>
        <TabsContent value="scenarios" className="mt-4"><CareScenarios h={h} g={g} patchG={patchG} policy={policy} loc={loc} /></TabsContent>
        <TabsContent value="ages" className="mt-4"><AgeGapAnalysis h={h} g={g} policy={policy} /></TabsContent>
        <TabsContent value="combined" className="mt-4"><CombinedProtection h={h} g={g} policy={policy} /></TabsContent>
        <TabsContent value="portfolio" className="mt-4"><PortfolioProtectionPanel h={h} g={g} patchG={patchG} policy={policy} /></TabsContent>
        <TabsContent value="stress" className="mt-4"><GapStressTest h={h} g={g} patchG={patchG} policy={policy} /></TabsContent>
        <TabsContent value="verdict" className="mt-4"><GapRecommendation h={h} g={g} policy={policy} /></TabsContent>
      </Tabs>
    </div>
  );
}
