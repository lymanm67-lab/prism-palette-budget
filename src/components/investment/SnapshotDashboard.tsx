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

interface Props { plan: InvestmentPlan | null }

const SCENARIOS = [
  { rate: 6, label: 'Conservative', ref85: 3_966_037, ref88: 4_895_240 },
  { rate: 7, label: 'Average', ref85: 4_635_316, ref88: 5_849_013 },
  { rate: 8, label: 'Growth', ref85: 5_418_844, ref88: 6_994_897 },
  { rate: 9, label: 'Aggressive', ref85: 6_336_201, ref88: 8_371_721 },
  { rate: 10, label: 'Aggressive+', ref85: 7_410_324, ref88: 10_026_064 },
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
      at85: projectAt(plan, s.rate, 85).projectedBalance,
      at88: projectAt(plan, s.rate, 88).projectedBalance,
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
  const at85 = selectedScenario?.at85 ?? baseProj.projectedBalance;

  // New Montgomery status thresholds
  const statusLabel =
    at85 >= 5_000_000 ? 'Strongly on track' :
    at85 >= 4_000_000 ? 'On track' :
    'Needs additional accelerator or age 88 backup';
  const statusColor =
    at85 >= 5_000_000 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
    at85 >= 4_000_000 ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
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
                Age 85 projection ({plan.expected_return_pct}% case): <strong className="text-foreground">{formatCurrencyFull(at85)}</strong>
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
      <FirstMillionCard plan={plan} />

      {/* Age 85 / 88 scenario table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Age 85 & Age 88 Projection by Scenario
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Computed with all step-ups, $208 accelerator, and $3K annual lump sum. "Ref" = Montgomery target.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="text-left py-2 font-medium">Scenario</th>
                  <th className="text-right py-2 font-medium">Age 85</th>
                  <th className="text-right py-2 font-medium text-muted-foreground/70">ref 85</th>
                  <th className="text-right py-2 font-medium">Age 88</th>
                  <th className="text-right py-2 font-medium text-muted-foreground/70">ref 88</th>
                </tr>
              </thead>
              <tbody>
                {(sweep ?? []).map((s) => {
                  const hit85 = s.at85 >= 4_000_000;
                  return (
                    <tr key={s.rate} className="border-b border-border/30">
                      <td className="py-2">
                        <span className="font-medium">{s.rate}%</span>{' '}
                        <span className="text-muted-foreground">{s.label}</span>
                      </td>
                      <td className={`text-right py-2 tabular-nums font-medium ${hit85 ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {formatCurrencyFull(s.at85)}
                      </td>
                      <td className="text-right py-2 tabular-nums text-muted-foreground/70">
                        {formatCurrencyFull(s.ref85)}
                      </td>
                      <td className="text-right py-2 tabular-nums font-medium">
                        {formatCurrencyFull(s.at88)}
                      </td>
                      <td className="text-right py-2 tabular-nums text-muted-foreground/70">
                        {formatCurrencyFull(s.ref88)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            <strong className="text-foreground">Interpretation:</strong> 6% Conservative is near goal at age 85
            and clears by age 88. 7% Average clears the $4M goal at age 85. 8% Growth strongly clears it.
            9% and 10% are upside scenarios — not lifestyle-spending assumptions.
          </p>
        </CardContent>
      </Card>

      <MillionMilestonesTable plan={plan} />
      <ContributionTimelineChart />
      <AllocationPieChart />

      <DisclaimerBlock variant="short" />
    </div>
  );
}
