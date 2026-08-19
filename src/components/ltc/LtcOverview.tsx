import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Info } from 'lucide-react';
import {
  benefitAtAge, careCostAtAge, combinedPremium, annualPremium, cashBenefitMonthly,
  gapBand, fundedGap, protectionLevel, simulateCareEvent, type LtcState,
} from '@/lib/ltc/model';
import { money, money2, StatCard, ProtectionBadge, GapBadge, Note } from './shared';

export function LtcOverview({ state, onGoTo }: { state: LtcState; onGoTo: (tab: string) => void }) {
  const h = state.household;
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  if (!policy) return <Note>No policy on file yet.</Note>;

  const { level, coverageRatio, premiumShare } = protectionLevel(state, policy);
  const claimCost = careCostAtAge(h, h.lymanAge, h.assumedClaimAge);
  const claimBenefit = benefitAtAge(policy, h.lymanAge, h.assumedClaimAge).monthlyBenefit;
  const gap = Math.max(0, claimCost - claimBenefit);
  const funded = fundedGap(claimBenefit, claimCost, h.monthlyHouseholdIncome);
  const sim = simulateCareEvent(state, policy, h.assumedClaimAge, h.assumedCareYears);

  const ages = [70, 75, 80, 85];

  const targetRows: [string, string][] = [
    ['Monthly household premium', money2(combinedPremium(policy))],
    ['Annual household premium', money2(annualPremium(policy))],
    ['Starting monthly benefit (each)', money(policy.startingMonthlyBenefit)],
    ['Initial benefit pool (each)', money(policy.poolEach)],
    ['Benefit period', `${policy.benefitPeriodMonths} months`],
    ['Elimination period', `${policy.eliminationDays} calendar days`],
    ['Inflation protection', `${policy.inflationPct}% ${policy.inflationCompound ? 'compound' : 'simple'}${policy.inflationLifetime ? ', lifetime' : ''}`],
    ['Ohio Partnership qualified', policy.partnershipQualified ? 'Yes' : 'No'],
    ['Cash benefit', policy.cashBenefitPct ? `${policy.cashBenefitPct}% (${money(cashBenefitMonthly(policy))}/mo)` : 'None'],
    ['Home health care', `${policy.homeCarePct}%`],
    ['Assisted living', `${policy.assistedLivingPct}%`],
    ['Nursing facility', `${policy.nursingPct}%`],
  ];

  return (
    <div className="space-y-4">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-prism-amber" /> Protection Level
            </CardTitle>
            <Note>
              Coverage ratio {(coverageRatio * 100).toFixed(0)}% of projected {h.city} care cost at age {h.assumedClaimAge};
              premium is {(premiumShare * 100).toFixed(1)}% of household income.
            </Note>
          </div>
          <ProtectionBadge level={level} />
        </CardHeader>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Current Planning Target</CardTitle></CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
            {targetRows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1">
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="text-sm font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            {policy.carrier} — {policy.product}. Lyman age {h.lymanAge}, Kateri age {h.kateriAge}, {h.city}.
          </p>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <StatCard label="Current LTC protection" value={`${money(policy.startingMonthlyBenefit)}/mo each`} sub={`${money(policy.poolEach)} pool each`} tone="info" />
        {ages.map((a) => (
          <StatCard
            key={a}
            label={`Projected benefit at age ${a}`}
            value={`${money(benefitAtAge(policy, h.lymanAge, a).monthlyBenefit)}/mo`}
            sub={`Pool ${money(benefitAtAge(policy, h.lymanAge, a).pool)}`}
          />
        ))}
        <StatCard label={`Estimated ${h.city} LTC cost`} value={`${money(claimCost)}/mo`} sub={`At age ${h.assumedClaimAge}, ${h.careCostGrowthPct}% growth`} tone="warn" />
        <StatCard label="Estimated monthly coverage gap" value={`${money(gap)}/mo`} sub="Retained risk funded by income and assets" tone={gap > 0 ? 'warn' : 'good'} />
        <StatCard label="Retirement assets potentially protected" value={money(sim.insurancePaid)} sub={`${h.assumedCareYears}-year care event at ${h.assumedClaimAge}`} tone="good" />
        <StatCard label="Annual insurance cost" value={money2(annualPremium(policy))} sub={`${money2(combinedPremium(policy))} per month combined`} />
      </div>

      <Card className="glass-card">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-prism-sky mt-0.5 shrink-0" />
            <p className="text-sm">
              LTC insurance is not designed to replace every dollar of future care expense. Its purpose is to transfer a
              major financial risk so retirement assets, income and legacy wealth are not unnecessarily depleted.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Gap posture: <GapBadge band={funded.band} />
            <span className="text-[11px]">
              insurance covers {(funded.insuranceRatio * 100).toFixed(0)}%; with a{' '}
              {money(funded.incomeOffset)}/mo income contribution {(funded.fundedRatio * 100).toFixed(0)}% is funded
              (residual {money(funded.residualGap)}/mo)
            </span>
            <button className="underline hover:text-foreground" onClick={() => onGoTo('gap')}>See the care cost gap</button>
            <span>·</span>
            <button className="underline hover:text-foreground" onClick={() => onGoTo('protection')}>See assets protected</button>
            <span>·</span>
            <button className="underline hover:text-foreground" onClick={() => onGoTo('recommendation')}>See the recommendation</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
