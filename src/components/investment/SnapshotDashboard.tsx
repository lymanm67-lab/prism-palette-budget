import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Target, PiggyBank, Wallet, Heart, Sparkles } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';
import { DisclaimerBlock } from './DisclaimerBlock';

interface Props { plan: InvestmentPlan | null }

export function SnapshotDashboard({ plan }: Props) {
  if (!plan || !plan.current_age || !plan.retirement_age) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Complete the setup wizard to see your investment snapshot.
        </CardContent>
      </Card>
    );
  }

  const projection = runProjection({
    currentAge: plan.current_age,
    retirementAge: plan.retirement_age,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    expectedReturnPct: plan.expected_return_pct,
    employerMatchPct: plan.employer_match_pct ?? undefined,
    annualRaisePct: plan.annual_raise_pct,
    raiseRedirectPct: plan.raise_redirect_pct,
    currentMonthlyIncome: plan.current_monthly_income ?? undefined,
    debtPaymentAmount: plan.debt_payment_amount ?? undefined,
    debtPayoffDate: plan.debt_payoff_date,
    additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
    additionalStartDate: plan.additional_start_date,
    ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
    ssClaimingAge: plan.ss_claiming_age ?? undefined,
    ssInvestWhileWorking: plan.ss_invest_while_working,
    ssInvestPct: plan.ss_invest_pct,
    hsaBalance: plan.hsa_balance,
    hsaMonthlyContribution: plan.hsa_monthly_contribution,
    hsaEmployerContribution: plan.hsa_employer_contribution,
    hsaInvested: plan.hsa_invested,
    hsaReturnPct: plan.hsa_return_pct,
    useFutureDollars: plan.use_future_dollars,
    inflationPct: plan.inflation_pct,
  });

  const statusColor =
    projection.onTrack === 'green' ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30' :
    projection.onTrack === 'yellow' ? 'bg-amber-500/15 text-amber-500 border-amber-500/30' :
    'bg-rose-500/15 text-rose-500 border-rose-500/30';

  const statusLabel = projection.onTrack === 'green' ? 'On Track' : projection.onTrack === 'yellow' ? 'Needs Adjustment' : 'Off Track';

  const cards = [
    { icon: Wallet, label: 'Current Balance', value: formatCurrencyFull(plan.current_balance) },
    { icon: TrendingUp, label: 'Projected at Retirement', value: formatCurrencyFull(projection.projectedBalance) },
    { icon: Target, label: 'Goal', value: formatCurrencyFull(plan.target_amount) },
    { icon: PiggyBank, label: projection.surplus >= 0 ? 'Surplus' : 'Gap', value: formatCurrencyFull(Math.abs(projection.surplus)) },
    { icon: Sparkles, label: 'Est. Monthly Income', value: formatCurrencyFull(projection.estimatedMonthlyIncome) },
    { icon: Heart, label: 'Legacy Projection', value: formatCurrencyFull(projection.legacyProjection) },
  ];

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-card to-muted/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="text-lg">Investment Snapshot</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{projection.status}</p>
            </div>
            <Badge variant="outline" className={statusColor}>{statusLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence score</span>
            <span className="font-mono font-semibold">{projection.confidenceScore}%</span>
          </div>
          <Progress value={Math.min(100, projection.confidenceScore)} />
          <p className="text-xs text-muted-foreground">
            Showing in {plan.use_future_dollars ? 'future dollars' : "today's dollars"}.
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

      <DisclaimerBlock variant="short" />
    </div>
  );
}
