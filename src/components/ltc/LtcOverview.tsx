import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Info, Clock, Handshake, Banknote, Hourglass } from 'lucide-react';
import {
  benefitAtAge, combinedPremium, annualPremium, cashBenefitMonthly, type LtcState,
} from '@/lib/ltc/model';
import {
  PLAN_MAX_MONTHLY, PLAN_INFLATION_PCT, PLAN_HOUR_TIERS, PLAN_AGES,
  carePlanAt, carePlanTiers, carePlanEvent, maxTierWithinPlan, planMaxAtAge,
  policyMeetsPlanMax, targetAgencyRate, cashBenefitAt, SUPPORT_COST_PCT, eliminationBridge,
} from '@/lib/ltc/careplan';
import { money, money2, StatCard, Note, CoverageBadge } from './shared';

export function LtcOverview({ state, onGoTo }: { state: LtcState; onGoTo: (tab: string) => void }) {
  const h = state.household;
  const [hours, setHours] = useState<number>(20);
  const policy = state.policies.find((p) => p.id === state.currentPolicyId) || state.policies[0];
  if (!policy) return <Note>No policy on file yet.</Note>;

  const claimAge = h.assumedClaimAge;
  const plan = carePlanAt(h, claimAge, hours);
  const today = carePlanAt(h, h.lymanAge, hours);
  const bestFit = maxTierWithinPlan(h, claimAge);
  const event = carePlanEvent(h, claimAge, h.assumedCareYears, hours);
  const negotiateRate = targetAgencyRate(hours, plan.planMax);
  const meetsPlan = policyMeetsPlanMax(policy);
  const cash = cashBenefitAt(plan, policy.cashBenefitPct || SUPPORT_COST_PCT);
  const [cashDayOne, setCashDayOne] = useState(true);
  const bridge = eliminationBridge(plan, policy.eliminationDays, policy.cashBenefitPct || SUPPORT_COST_PCT, { cashPaysFromDayOne: cashDayOne });

  const planRows: [string, string][] = [
    ['Monthly plan maximum (today)', `${money(PLAN_MAX_MONTHLY)}/mo`],
    ['Benefit inflation', `${PLAN_INFLATION_PCT}% compound, annually`],
    [`Plan maximum at age ${claimAge}`, `${money(plan.planMax)}/mo`],
    ['Care model', 'In-home care, 10 / 20 / 30 / 40 hrs per week'],
    ['Care rate inflation', `${h.careCostGrowthPct}% annually`],
    ['Monthly household premium', money2(combinedPremium(policy))],
    ['Annual household premium', money2(annualPremium(policy))],
    ['Cash benefit', policy.cashBenefitPct ? `${policy.cashBenefitPct}% (${money(cashBenefitMonthly(policy))}/mo)` : 'None'],
    ['Elimination period', `${policy.eliminationDays} calendar days`],
    ['Benefit period', `${policy.benefitPeriodMonths} months`],
    ['Ohio Partnership qualified', policy.partnershipQualified ? 'Yes' : 'No'],
    ['Carrier quote on file', `${policy.carrier} — ${money(policy.startingMonthlyBenefit)}/mo, ${policy.inflationPct}% ${policy.inflationCompound ? 'compound' : 'simple'}`],
  ];

  return (
    <div className="space-y-4">
      {/* Plan of record ---------------------------------------------------- */}
      <Card className="glass-card border-primary/30">
        <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-prism-amber" /> Plan of Record — {money(PLAN_MAX_MONTHLY)}/month maximum
            </CardTitle>
            <Note>
              Coverage is intentionally capped at {money(PLAN_MAX_MONTHLY)} per month today, growing {PLAN_INFLATION_PCT}%
              compound each year, and is designed around 10–40 hours per week of in-home care in {h.city} — not full-time
              or facility care.
            </Note>
          </div>
          <Badge variant={meetsPlan ? 'default' : 'outline'}>
            {meetsPlan ? 'Carrier quote meets the plan maximum' : 'Carrier quote does not match the plan maximum'}
          </Badge>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-1.5">
            {planRows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-3 border-b border-border/30 py-1">
                <span className="text-xs text-muted-foreground">{k}</span>
                <span className="text-sm font-semibold tabular-nums">{v}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hours selector ---------------------------------------------------- */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" /> Planned weekly care hours
          </CardTitle>
          <Note>Pick the level of real need. Everything below re-prices against the {money(PLAN_MAX_MONTHLY)}/mo maximum.</Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {PLAN_HOUR_TIERS.map((hrs) => (
              <Button key={hrs} size="sm" variant={hours === hrs ? 'default' : 'outline'} onClick={() => setHours(hrs)}>
                {hrs} hrs/week
              </Button>
            ))}
            <CoverageBadge band={plan.band} />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={`Cost at ${hours} hrs/week today`} value={`${money(today.monthlyCost)}/mo`} sub={`${money2(today.hourlyRate)}/hr in ${h.city}`} tone="info" />
            <StatCard label={`Cost at age ${claimAge}`} value={`${money(plan.monthlyCost)}/mo`} sub={`${money2(plan.hourlyRate)}/hr at ${h.careCostGrowthPct}% growth`} tone="warn" />
            <StatCard label="Plan pays" value={`${money(plan.planPays)}/mo`} sub={`Maximum ${money(plan.planMax)}/mo at age ${claimAge}`} tone="good" />
            <StatCard
              label="Your monthly share"
              value={`${money(plan.monthlyShare)}/mo`}
              sub={plan.monthlyShare > 0 ? `${money(plan.annualShare)} per year` : 'Fully inside the plan maximum'}
              tone={plan.monthlyShare > 0 ? 'warn' : 'good'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            The plan maximum fully buys about <span className="font-semibold text-foreground">{plan.hoursCovered.toFixed(1)} hrs/week</span> at
            age {claimAge}. Largest tier that fits entirely inside the maximum: <span className="font-semibold text-foreground">{bestFit.weeklyHours} hrs/week</span>.
            Over a {h.assumedCareYears}-year care event at {hours} hrs/week the plan pays {money(event.planPaid)} and your
            share is {money(event.yourShare)}.
          </p>
        </CardContent>
      </Card>

      {/* 25% cash benefit / support costs ---------------------------------- */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Banknote className="h-4 w-4 text-prism-amber" /> {cash.pct}% cash benefit &amp; support costs
          </CardTitle>
          <Note>
            Support costs — supplies, transportation, respite, and informal or family caregivers — run about
            {' '}{SUPPORT_COST_PCT}% on top of agency hours. The contract's {cash.pct}% cash benefit is the piece designed to
            pay them, with no receipts required.
          </Note>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label={`Cash benefit at age ${claimAge}`} value={`${money(cash.cashMonthly)}/mo`} sub={`${cash.pct}% of the ${money(plan.planMax)}/mo maximum`} tone="info" />
            <StatCard label={`Support costs at ${hours} hrs/week`} value={`${money(cash.supportCost)}/mo`} sub={`${SUPPORT_COST_PCT}% of ${money(plan.monthlyCost)}/mo of care`} tone="warn" />
            <StatCard
              label="Cash left over"
              value={`${money(cash.cashSurplus)}/mo`}
              sub={cash.supportCovered ? 'Cash covers support costs' : 'Support costs exceed the cash benefit'}
              tone={cash.supportCovered ? 'good' : 'warn'}
            />
            <StatCard
              label="All-in monthly share"
              value={`${money(cash.gapAfterCash)}/mo`}
              sub="Care gap plus support costs, income-funded"
              tone={cash.gapAfterCash > 0 ? 'warn' : 'good'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Cash is modeled as an <span className="font-semibold text-foreground">election, not a bonus</span>: on most
            contracts a month paid in cash pays {money(cash.cashMonthly)} instead of reimbursing up to{' '}
            {money(plan.planPays)} — a {money(cash.cashInsteadOfPlanShortfall)}/mo trade. Use cash in months when family
            provides the care, and reimbursement in months when the agency does. Confirm with the carrier whether both
            can be paid in the same month before assuming they stack.
          </p>
        </CardContent>
      </Card>

      {/* Elimination period bridge ----------------------------------------- */}
      <Card className="glass-card">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-prism-sky" /> {bridge.days}-day elimination period — can the cash benefit bridge it?
          </CardTitle>
          <Note>
            Reimbursement does not start until the {bridge.days}-day ({bridge.months.toFixed(1)}-month) wait is satisfied.
            Indemnity-style cash benefits are commonly payable from day one, which is exactly what makes them useful here —
            confirm your contract's wording.
          </Note>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={cashDayOne ? 'default' : 'outline'} onClick={() => setCashDayOne(true)}>
              Cash pays from day one
            </Button>
            <Button size="sm" variant={!cashDayOne ? 'default' : 'outline'} onClick={() => setCashDayOne(false)}>
              Cash also waits out the period
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard label="Care during the wait" value={money(bridge.careOutOfPocket)} sub={`${hours} hrs/week at ${money(plan.monthlyCost)}/mo`} tone="warn" />
            <StatCard label="Support costs during the wait" value={money(bridge.supportOutOfPocket)} sub={`${SUPPORT_COST_PCT}% of care cost`} tone="warn" />
            <StatCard
              label="Cash benefit paid during the wait"
              value={money(bridge.cashDuringWait)}
              sub={cashDayOne ? `${cash.pct}% × ${money(plan.planMax)}/mo, no wait` : 'Nothing paid until the wait ends'}
              tone={bridge.cashDuringWait > 0 ? 'good' : 'warn'}
            />
            <StatCard
              label="Net out of pocket"
              value={money(bridge.netOutOfPocket)}
              sub={`${bridge.coveragePct.toFixed(0)}% of the wait bridged by cash`}
              tone={bridge.fullyBridged ? 'good' : 'warn'}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Keep {money(bridge.netOutOfPocket)} liquid as the elimination-period reserve for a claim at age {claimAge} at{' '}
            {hours} hrs/week. After the wait clears, the same {cash.pct}% cash benefit switches roles: it stops bridging the
            wait and starts covering the {money(cash.supportCost)}/mo of support costs, leaving{' '}
            {money(cash.gapAfterCash)}/mo of all-in gap funded from income.
            {' '}Ohio note: days of care usually count toward the elimination period only when services are actually
            received, so lighter hour tiers can stretch a 90-day wait into more calendar months.
          </p>
        </CardContent>
      </Card>

      {/* Agency shopping target -------------------------------------------- */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Handshake className="h-4 w-4 text-prism-sky" /> Agency shopping target
          </CardTitle>
          <Note>Shop agencies willing to work within the monthly maximum instead of billing open-ended hours.</Note>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard label={`Rate needed at ${hours} hrs/week`} value={`${money2(negotiateRate)}/hr`} sub={`So ${money(plan.planMax)}/mo covers the full need at age ${claimAge}`} tone="info" />
          <StatCard label="Market rate projection" value={`${money2(plan.hourlyRate)}/hr`} sub={`${h.city}, ${h.careCostGrowthPct}% annual growth`} />
          <StatCard
            label="Negotiation gap"
            value={`${money2(Math.max(0, plan.hourlyRate - negotiateRate))}/hr`}
            sub={plan.hourlyRate <= negotiateRate ? 'Market already fits the maximum' : 'Discount to negotiate or hours to trim'}
            tone={plan.hourlyRate <= negotiateRate ? 'good' : 'warn'}
          />
        </CardContent>
      </Card>

      {/* Age ladder -------------------------------------------------------- */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Plan maximum vs. care cost by age</CardTitle>
          <Note>Plan maximum grows {PLAN_INFLATION_PCT}% compound; care rates grow {h.careCostGrowthPct}% compound.</Note>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60 text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="py-2">Age</th>
                <th className="py-2">Plan maximum</th>
                <th className="py-2">Rate</th>
                {PLAN_HOUR_TIERS.map((hrs) => <th key={hrs} className="py-2">{hrs} hrs/wk share</th>)}
                <th className="py-2">Hours fully covered</th>
              </tr>
            </thead>
            <tbody>
              {PLAN_AGES.map((age) => {
                const tiers = carePlanTiers(h, age);
                const first = tiers[0];
                return (
                  <tr key={age} className="border-b border-border/30">
                    <td className="py-2 font-semibold">{age}</td>
                    <td className="py-2 tabular-nums">{money(planMaxAtAge(h.lymanAge, age))}</td>
                    <td className="py-2 tabular-nums">{money2(first.hourlyRate)}/hr</td>
                    {tiers.map((t) => (
                      <td key={t.weeklyHours} className={`py-2 tabular-nums ${t.withinPlanMax ? 'text-prism-positive' : ''}`}>
                        {t.monthlyShare > 0 ? `${money(t.monthlyShare)}` : 'Covered'}
                      </td>
                    ))}
                    <td className="py-2 tabular-nums">{first.hoursCovered.toFixed(1)} hrs/wk</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardContent className="pt-5 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-prism-sky mt-0.5 shrink-0" />
            <p className="text-sm">
              This plan deliberately buys a defined block of in-home hours instead of chasing full replacement of care
              cost. The {money(PLAN_MAX_MONTHLY)}/mo maximum keeps the premium affordable while transferring the risk that
              would otherwise drain retirement assets. Carrier benefit on file grows to{' '}
              {money(benefitAtAge(policy, h.lymanAge, claimAge).monthlyBenefit)}/mo at age {claimAge}; only{' '}
              {money(plan.planMax)}/mo of it is counted in the plan of record.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <button className="underline hover:text-foreground" onClick={() => onGoTo('gap')}>See cost by hours and age</button>
            <span>·</span>
            <button className="underline hover:text-foreground" onClick={() => onGoTo('agencies')}>Compare agencies</button>
            <span>·</span>
            <button className="underline hover:text-foreground" onClick={() => onGoTo('value')}>See the recommendation</button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
