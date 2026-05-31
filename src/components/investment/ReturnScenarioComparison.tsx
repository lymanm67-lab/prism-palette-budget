import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Target, TrendingUp, Sparkles } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, ReferenceLine } from 'recharts';

interface Props {
  plan: InvestmentPlan | null;
  onCreateRules?: () => void;
  onReviewLegacy?: () => void;
}

function buildInputs(plan: InvestmentPlan, returnPct: number) {
  return {
    currentAge: plan.current_age,
    retirementAge: plan.retirement_age,
    currentBalance: plan.current_balance,
    targetAmount: plan.target_amount,
    monthlyEmployeeContribution: plan.monthly_employee_contribution,
    monthlyEmployerContribution: plan.monthly_employer_contribution,
    expectedReturnPct: returnPct,
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
  };
}

export function ReturnScenarioComparison({ plan, onCreateRules, onReviewLegacy }: Props) {
  if (!plan || !plan.current_age || !plan.retirement_age) return null;

  const goal = plan.target_amount || 4_000_000;
  const p7 = runProjection(buildInputs(plan, 7)).projectedBalance;
  const p8 = runProjection(buildInputs(plan, 8)).projectedBalance;

  const surplus7 = p7 - goal;
  const surplus8 = p8 - goal;
  const status = (s: number) => s >= goal * 0.5 ? 'Strongly on track' : s >= 0 ? 'On track' : 'Below goal';
  const badge = (s: number) =>
    s >= 0
      ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30'
      : 'bg-rose-500/15 text-rose-500 border-rose-500/30';

  const data = [
    { name: 'Goal', value: goal, fill: 'hsl(var(--muted-foreground))' },
    { name: '7% ROI', value: p7, fill: 'hsl(var(--primary))' },
    { name: '8% ROI', value: p8, fill: 'hsl(var(--prism-amber, var(--primary)))' },
  ];

  const headline =
    surplus7 >= 0 && surplus8 >= 0
      ? `Your plan is projected to clear the ${formatCurrencyFull(goal)} goal by age ${plan.retirement_age} at both 7% and 8% ROI.`
      : `At 7% ROI you are ${surplus7 >= 0 ? 'on track' : 'short of'} your ${formatCurrencyFull(goal)} goal.`;

  return (
    <Card className="bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Projected Retirement & Legacy Assets at Age {plan.retirement_age}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{headline}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="h-56 w-full">
          <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => `$${(v / 1_000_000).toFixed(1)}M`}
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                contentStyle={{
                  background: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: 8,
                  fontSize: 12,
                }}
                formatter={(v: number) => formatCurrencyFull(v)}
              />
              <ReferenceLine y={goal} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4 text-primary" /> 7% Return Scenario
              </div>
              <Badge variant="outline" className={badge(surplus7)}>{status(surplus7)}</Badge>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatCurrencyFull(p7)}</p>
            <p className="text-xs text-muted-foreground">
              {surplus7 >= 0 ? 'Surplus' : 'Gap'} of {formatCurrencyFull(Math.abs(surplus7))} vs {formatCurrencyFull(goal)} goal.
            </p>
          </div>
          <div className="rounded-lg border bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" /> 8% Return Scenario
              </div>
              <Badge variant="outline" className={badge(surplus8)}>{status(surplus8)}</Badge>
            </div>
            <p className="text-2xl font-semibold tabular-nums">{formatCurrencyFull(p8)}</p>
            <p className="text-xs text-muted-foreground">
              {surplus8 >= 0 ? 'Surplus' : 'Gap'} of {formatCurrencyFull(Math.abs(surplus8))} vs {formatCurrencyFull(goal)} goal.
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-muted/40 p-4 text-sm space-y-2">
          <p>
            Your strongest wealth-building moves are investing every future raise, redirecting the debt payment when paid off,
            adding scheduled monthly boosts, and investing your Social Security benefit while still working.
          </p>
          <p className="text-xs text-muted-foreground">
            Spouse pension income is treated as household income protection, not a liquid investment asset. The goal is reached
            through the primary user's retirement assets and Social Security investing strategy.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {onCreateRules && (
            <Button size="sm" variant="outline" onClick={onCreateRules}>Create My Money Rules</Button>
          )}
          {onReviewLegacy && (
            <Button size="sm" variant="outline" onClick={onReviewLegacy}>Review Legacy Trust Funding Plan</Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
