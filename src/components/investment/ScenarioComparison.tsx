import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { runProjection, formatCurrencyFull } from '@/lib/investment/projection';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { DisclaimerBlock } from './DisclaimerBlock';

interface Props { plan: InvestmentPlan | null }

type ReturnMode = 'nominal' | 'real';

const SCENARIO_SETS: Record<ReturnMode, { name: string; rate: number; color: string }[]> = {
  nominal: [
    { name: 'Conservative', rate: 5, color: 'bg-sky-500/10 border-sky-500/30' },
    { name: 'Moderate', rate: 8, color: 'bg-primary/10 border-primary/30' },
    { name: 'Growth', rate: 10, color: 'bg-emerald-500/10 border-emerald-500/30' },
  ],
  real: [
    { name: 'Conservative', rate: 3, color: 'bg-sky-500/10 border-sky-500/30' },
    { name: 'Moderate', rate: 5, color: 'bg-primary/10 border-primary/30' },
    { name: 'Growth', rate: 7, color: 'bg-emerald-500/10 border-emerald-500/30' },
  ],
};

export function ScenarioComparison({ plan }: Props) {
  const [mode, setMode] = useState<ReturnMode>('nominal');
  const scenarios = SCENARIO_SETS[mode];

  const rows = useMemo(() => {
    if (!plan || !plan.current_age || !plan.retirement_age) return [];
    return scenarios.map((s) => {
      const r = runProjection({
        currentAge: plan.current_age!,
        retirementAge: plan.retirement_age!,
        currentBalance: plan.current_balance,
        targetAmount: plan.target_amount,
        monthlyEmployeeContribution: plan.monthly_employee_contribution,
        monthlyEmployerContribution: plan.monthly_employer_contribution,
        expectedReturnPct: s.rate,
        employerMatchPct: plan.employer_match_pct ?? undefined,
        currentMonthlyIncome: plan.current_monthly_income ?? undefined,
        annualRaisePct: plan.annual_raise_pct,
        raiseRedirectPct: plan.raise_redirect_pct,
        debtPaymentAmount: plan.debt_payment_amount ?? undefined,
        debtPayoffDate: plan.debt_payoff_date,
        additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
        additionalStartDate: plan.additional_start_date,
        ssMonthlyEstimate: plan.ss_monthly_estimate ?? undefined,
        ssClaimingAge: plan.ss_claiming_age ?? undefined,
        ssInvestWhileWorking: plan.ss_invest_while_working,
        ssInvestPct: plan.ss_invest_pct,
        useFutureDollars: plan.use_future_dollars,
        inflationPct: plan.inflation_pct,
      });
      return { ...s, projection: r };
    });
  }, [plan, scenarios]);

  if (!plan || rows.length === 0) {
    return <Card><CardContent className="p-6 text-sm text-muted-foreground">Save your plan first to compare scenarios.</CardContent></Card>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {mode === 'nominal'
            ? 'Nominal returns — historical S&P 500 averages, pre-inflation.'
            : 'Real returns — inflation-adjusted (today\'s purchasing power).'}
        </p>
        <Tabs value={mode} onValueChange={(v) => setMode(v as ReturnMode)}>
          <TabsList className="h-8">
            <TabsTrigger value="nominal" className="text-xs">Nominal</TabsTrigger>
            <TabsTrigger value="real" className="text-xs">Real (inflation-adj.)</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {rows.map((r) => (
          <Card key={r.name} className={r.color}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                {r.name} <span className="text-xs font-mono text-muted-foreground">{r.rate}%</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Row label="Projected balance" value={formatCurrencyFull(r.projection.projectedBalance)} />
              <Row label="Monthly income" value={formatCurrencyFull(r.projection.estimatedMonthlyIncome)} />
              <Row label="Surplus / gap" value={formatCurrencyFull(r.projection.surplus)} />
              <Row label="Confidence" value={`${r.projection.confidenceScore}%`} />
            </CardContent>
          </Card>
        ))}
      </div>
      <DisclaimerBlock variant="short" />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </div>
  );
}
