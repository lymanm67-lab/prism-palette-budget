import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, PiggyBank, Wallet, Heart, Sparkles } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';
import { DisclaimerBlock } from './DisclaimerBlock';
import { FirstMillionCard } from './FirstMillionCard';
import { MillionMilestonesTable } from './MillionMilestonesTable';
import { ContributionTimelineChart } from './ContributionTimelineChart';
import { AllocationPieChart } from './AllocationPieChart';
import { CollapsibleSection } from './CollapsibleSection';

interface Props { plan: InvestmentPlan | null }

const SCENARIOS = [
  { rate: 6, label: 'Conservative' },
  { rate: 7, label: 'Average' },
  { rate: 8, label: 'Growth' },
  { rate: 9, label: 'Aggressive' },
  { rate: 10, label: 'Aggressive+' },
];

const MONTGOMERY_STEP_UPS = [
  { amount: 100, startDate: '2026-07-01' },
  { amount: 225, startDate: '2027-01-01' },
  { amount: 208, startDate: '2027-01-01' },
  { amount: 500, startDate: '2028-06-01' },
  { amount: 200, startDate: '2029-01-01' },
  { amount: 500, startDate: '2030-01-01' },
];

function projectAt(plan: InvestmentPlan, rate: number, retirementAge: number) {
  return runProjection({
    currentAge: plan.current_age!,
    retirementAge,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    employerMatchPct: plan.employer_match_pct ?? undefined,
    expectedReturnPct: rate,
    annualRaisePct: plan.annual_raise_pct,
    raiseRedirectPct: plan.raise_redirect_pct,
    currentMonthlyIncome: plan.current_monthly_income ?? undefined,
    debtPaymentAmount: plan.debt_payment_amount ?? undefined,
    debtPayoffDate: plan.debt_payoff_date,
    ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
    incomeFromSsPensionOnly: plan.income_strategy === 'ss_pension_only',
    spousePensionMonthly: plan.spouse_pension_monthly ?? 0,
    ssClaimingAge: plan.ss_claiming_age ?? undefined,
    ssInvestWhileWorking: plan.ss_invest_while_working,
    ssInvestPct: plan.ss_invest_pct,
    hsaBalance: plan.hsa_balance,
    hsaMonthlyContribution: plan.hsa_monthly_contribution,
    hsaEmployerContribution: plan.hsa_employer_contribution,
    hsaInvested: plan.hsa_invested,
    hsaReturnPct: plan.hsa_return_pct,
    useFutureDollars: true,
    inflationPct: plan.inflation_pct,
    datedStepUps: MONTGOMERY_STEP_UPS,
    annualLumpSum: { amount: 3000, startYear: 2028 },
  });
}

export function SnapshotDashboard({ plan }: Props) {
  const sweep = useMemo(() => {
    if (!plan || !plan.current_age || !plan.retirement_age) return null;
    return SCENARIOS.map((s) => ({
      ...s,
      at75: projectAt(plan, s.rate, 75).projectedBalance,
      at78: projectAt(plan, s.rate, 78).projectedBalance,
    }));
  }, [plan]);

  if (!plan || !plan.current_age || !plan.retirement_age) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Complete the setup wizard to see your investment snapshot.
        </CardContent>
      </Card>
    );
  }

  const baseProj = projectAt(plan, plan.expected_return_pct, plan.retirement_age);
  const selectedScenario = sweep?.find((s) => s.rate === plan.expected_return_pct) ?? sweep?.[1];
  const at75 = selectedScenario?.at75 ?? baseProj.projectedBalance;

  // New Montgomery status thresholds
  const statusLabel =
    at75 >= 5_000_000 ? 'Strongly on track' :
    at75 >= 4_000_000 ? 'On track' :
    'Needs additional accelerator or age 78 backup';
  const statusColor =
    at75 >= 5_000_000 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
    at75 >= 4_000_000 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
    'bg-amber-500/15 text-amber-500 border-amber-500/30';

  const cards = [
    { icon: Wallet, label: 'Current balance', value: formatCurrencyFull(plan.current_balance) },
    { icon: TrendingUp, label: `Projected @ age ${plan.retirement_age}`, value: formatCurrencyFull(baseProj.projectedBalance) },
    { icon: Target, label: 'Goal', value: formatCurrencyFull(plan.target_amount) },
    { icon: PiggyBank, label: baseProj.surplus >= 0 ? 'Surplus' : 'Gap', value: formatCurrencyFull(Math.abs(baseProj.surplus)) },
    { icon: Sparkles, label: 'Est. monthly income', value: formatCurrencyFull(baseProj.estimatedMonthlyIncome) },
    { icon: Heart, label: 'Legacy projection', value: formatCurrencyFull(baseProj.legacyProjection) },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Montgomery Retirement & Legacy Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Age 75 projection ({plan.expected_return_pct}% case): <strong className="text-foreground">{formatCurrencyFull(at75)}</strong>
              </p>
            </div>
            <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence score</span>
            <span className="font-mono font-semibold">{baseProj.confidenceScore}%</span>
          </div>
          <Progress value={Math.min(100, baseProj.confidenceScore)} />
          <p className="text-xs text-muted-foreground">
            Showing in {plan.use_future_dollars ? 'future dollars' : "today's dollars"}.
            $4M goal treated as future dollars by default; today's-dollar view available below.
          </p>
          {plan.income_strategy === 'ss_pension_only' && (
            <p className="text-xs text-muted-foreground border-t border-border/40 pt-2">
              <strong className="text-foreground">Income strategy:</strong> lifestyle is covered by Social Security
              {plan.spouse_pension_monthly > 0 ? ` (${formatCurrencyFull(plan.ss_monthly_estimate ?? 0)}/mo) plus spouse pension (${formatCurrencyFull(plan.spouse_pension_monthly)}/mo)` : ''} —
              no 4% withdrawal is taken, so the retirement portfolio stays invested as legacy capital.
            </p>
          )}
        </CardContent>
      </Card>


      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {cards.map(({ icon: Icon, label, value }) => (
          <Card key={label}>
            <CardContent className="p-4 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-xs">
                <Icon className="h-3.5 w-3.5" />
                {label}
              </div>
              <p className="text-lg font-semibold tabular-nums">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* First Million card */}
      <CollapsibleSection title="First Million by 10-Year Mark" defaultOpen>
        <FirstMillionCard plan={plan} />
      </CollapsibleSection>

      {/* Age 75 / 78 scenario table */}
      <CollapsibleSection title="Age 75 & Age 78 Projection by Scenario" defaultOpen>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Age 75 & Age 78 Projection by Scenario
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Computed with all step-ups, $208 accelerator, and $3K annual lump sum.
            </p>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="text-left py-2 font-medium">Scenario</th>
                    <th className="text-right py-2 font-medium">Age 75</th>
                    <th className="text-right py-2 font-medium">Age 78</th>
                  </tr>
                </thead>
                <tbody>
                  {(sweep ?? []).map((s) => {
                    const hit75 = s.at75 >= 4_000_000;
                    return (
                      <tr key={s.rate} className="border-b border-border/30">
                        <td className="py-2">
                          <span className="font-medium">{s.rate}%</span>{' '}
                          <span className="text-muted-foreground">{s.label}</span>
                        </td>
                        <td className={`text-right py-2 tabular-nums font-medium ${hit75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                          {formatCurrencyFull(s.at75)}
                        </td>
                        <td className="text-right py-2 tabular-nums font-medium">
                          {formatCurrencyFull(s.at78)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              <strong className="text-foreground">Interpretation:</strong> Working to age 75 is the plan horizon;
              age 78 is shown as a backup scenario.
              9% and 10% are upside scenarios — not lifestyle-spending assumptions.
            </p>
          </CardContent>
        </Card>
      </CollapsibleSection>

      <CollapsibleSection title="Million-Dollar Milestones" defaultOpen>
        <MillionMilestonesTable plan={plan} />
      </CollapsibleSection>
      <CollapsibleSection title="Contribution Timeline" defaultOpen>
        <ContributionTimelineChart />
      </CollapsibleSection>
      <CollapsibleSection title="Default New-Dollar Allocation" defaultOpen>
        <AllocationPieChart />
      </CollapsibleSection>

      <DisclaimerBlock variant="short" />
    </div>
  );
}
