import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sliders, TrendingUp, TrendingDown } from 'lucide-react';
import { useUpsertInvestmentPlan, type InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrency } from '@/lib/investment/projection';
import { toast } from '@/hooks/use-toast';

interface Props {
  plan: InvestmentPlan | null;
}

// localStorage keeps last "on" value so toggling back on restores it
const memoKey = (planId: string, field: string) => `prism.rule.${planId}.${field}`;
const remember = (planId: string, field: string, value: number) => {
  if (value > 0) localStorage.setItem(memoKey(planId, field), String(value));
};
const recall = (planId: string, field: string, fallback: number): number => {
  const v = localStorage.getItem(memoKey(planId, field));
  if (v == null) return fallback;
  const n = Number(v);
  return isFinite(n) && n > 0 ? n : fallback;
};

export function MoneyRulesToggles({ plan }: Props) {
  const upsert = useUpsertInvestmentPlan();

  const baselineProjection = useMemo(() => {
    if (!plan || !plan.current_age || !plan.retirement_age) return null;
    return runProjection({
      currentAge: plan.current_age,
      retirementAge: plan.retirement_age,
      currentBalance: plan.current_balance,
      targetAmount: plan.target_amount,
      monthlyEmployeeContribution: plan.monthly_employee_contribution,
      monthlyEmployerContribution: plan.monthly_employer_contribution,
      employerMatchPct: plan.employer_match_pct ?? undefined,
      currentMonthlyIncome: plan.current_monthly_income ?? undefined,
      expectedReturnPct: plan.expected_return_pct,
      annualRaisePct: 0,
      raiseRedirectPct: 0,
      useFutureDollars: plan.use_future_dollars,
      inflationPct: plan.inflation_pct,
    });
  }, [plan]);

  if (!plan) return null;

  const update = async (patch: Partial<InvestmentPlan>) => {
    try {
      await upsert.mutateAsync({ id: plan.id, ...patch });
    } catch (e: any) {
      toast({ title: 'Update failed', description: e.message, variant: 'destructive' });
    }
  };

  const rules = [
    {
      key: 'raise',
      label: 'Redirect annual raises',
      description: 'When your salary grows, automatically funnel part of the raise into retirement instead of spending it.',
      on: (plan.annual_raise_pct ?? 0) > 0 && (plan.raise_redirect_pct ?? 0) > 0,
      detail: `${plan.annual_raise_pct ?? 0}% raise → invest ${plan.raise_redirect_pct ?? 0}%`,
      onToggle: (checked: boolean) => {
        if (checked) {
          update({
            annual_raise_pct: recall(plan.id, 'annual_raise_pct', 3),
            raise_redirect_pct: recall(plan.id, 'raise_redirect_pct', 75),
          });
        } else {
          remember(plan.id, 'annual_raise_pct', plan.annual_raise_pct ?? 0);
          remember(plan.id, 'raise_redirect_pct', plan.raise_redirect_pct ?? 0);
          update({ annual_raise_pct: 0, raise_redirect_pct: 0 });
        }
      },
    },
    {
      key: 'debt',
      label: 'Debt → Wealth redirect',
      description: 'After your debt is paid off, redirect the freed-up payment straight into investments.',
      on: (plan.debt_payment_amount ?? 0) > 0,
      detail: plan.debt_payment_amount
        ? `+${formatCurrency(plan.debt_payment_amount)}/mo from ${plan.debt_payoff_date ?? 'payoff date'}`
        : 'Not set',
      onToggle: (checked: boolean) => {
        if (checked) {
          update({ debt_payment_amount: recall(plan.id, 'debt_payment_amount', 500) });
        } else {
          remember(plan.id, 'debt_payment_amount', plan.debt_payment_amount ?? 0);
          update({ debt_payment_amount: 0 });
        }
      },
    },
    {
      key: 'additional',
      label: 'Additional planned contributions',
      description: 'Extra monthly amount you plan to add on top of payroll — bonuses, side income, windfalls.',
      on: (plan.additional_monthly_amount ?? 0) > 0,
      detail: plan.additional_monthly_amount
        ? `+${formatCurrency(plan.additional_monthly_amount)}/mo`
        : 'Not set',
      onToggle: (checked: boolean) => {
        if (checked) {
          update({ additional_monthly_amount: recall(plan.id, 'additional_monthly_amount', 250) });
        } else {
          remember(plan.id, 'additional_monthly_amount', plan.additional_monthly_amount ?? 0);
          update({ additional_monthly_amount: 0 });
        }
      },
    },
    {
      key: 'ss',
      label: 'Invest Social Security while working',
      description: 'If you claim Social Security but keep working, invest a portion of the benefit instead of spending it.',
      on: !!plan.ss_invest_while_working,
      detail: plan.ss_monthly_estimate
        ? `${plan.ss_invest_pct ?? 0}% of ${formatCurrency(plan.ss_monthly_estimate)}/mo starting age ${plan.ss_claiming_age ?? 67}`
        : 'No SS estimate yet',
      onToggle: (checked: boolean) => update({ ss_invest_while_working: checked }),
    },
    {
      key: 'hsa',
      label: 'Treat HSA as an investment account',
      description: 'Invest your HSA balance instead of leaving it as cash — major long-term retirement boost.',
      on: !!plan.hsa_invested,
      detail: plan.hsa_balance || plan.hsa_monthly_contribution
        ? `Balance ${formatCurrency(plan.hsa_balance || 0)}, ${formatCurrency((plan.hsa_monthly_contribution || 0) + (plan.hsa_employer_contribution || 0))}/mo`
        : 'No HSA set up',
      onToggle: (checked: boolean) => update({ hsa_invested: checked }),
    },
  ];

  // Live projection with current settings
  const live = useMemo(() => {
    if (!plan.current_age || !plan.retirement_age) return null;
    return runProjection({
      currentAge: plan.current_age,
      retirementAge: plan.retirement_age,
      currentBalance: plan.current_balance,
      targetAmount: plan.target_amount,
      monthlyEmployeeContribution: plan.monthly_employee_contribution,
      monthlyEmployerContribution: plan.monthly_employer_contribution,
      employerMatchPct: plan.employer_match_pct ?? undefined,
      currentMonthlyIncome: plan.current_monthly_income ?? undefined,
      expectedReturnPct: plan.expected_return_pct,
      annualRaisePct: plan.annual_raise_pct,
      raiseRedirectPct: plan.raise_redirect_pct,
      debtPaymentAmount: plan.debt_payment_amount ?? undefined,
      debtPayoffDate: plan.debt_payoff_date,
      additionalMonthlyAmount: plan.additional_monthly_amount ?? undefined,
      additionalStartDate: plan.additional_start_date,
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
      useFutureDollars: plan.use_future_dollars,
      inflationPct: plan.inflation_pct,
    });
  }, [plan]);

  const delta = live && baselineProjection ? live.projectedBalance - baselineProjection.projectedBalance : 0;
  const positive = delta >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sliders className="h-4 w-4 text-primary" /> Money rule impact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Toggle each rule to see how much it changes your projection. Changes save automatically and update every chart.
        </p>

        <div className="rounded-lg border bg-muted/30 p-3 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-xs text-muted-foreground">Lift from active rules vs. base contributions only</div>
            <div className={`text-xl font-bold flex items-center gap-1 ${positive ? 'text-emerald-600' : 'text-destructive'}`}>
              {positive ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
              {positive ? '+' : ''}{formatCurrency(delta)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Projected at retirement</div>
            <div className="text-lg font-semibold">{live ? formatCurrency(live.projectedBalance) : '—'}</div>
          </div>
        </div>

        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.key} className="flex items-start justify-between gap-4 border rounded-md p-3">
              <div className="flex-1 min-w-0">
                <Label htmlFor={`rule-${r.key}`} className="text-sm font-medium cursor-pointer">
                  {r.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                <p className="text-xs text-primary mt-1">{r.detail}</p>
              </div>
              <Switch
                id={`rule-${r.key}`}
                checked={r.on}
                onCheckedChange={r.onToggle}
                disabled={upsert.isPending}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
