import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Circle, AlertTriangle } from 'lucide-react';
import { InvestmentPlan } from '@/hooks/use-investment-plan';

interface Props { plan: InvestmentPlan | null }

interface CheckItem {
  label: string;
  included: boolean;
  detail?: string;
  critical?: boolean;
}

export function ProjectionDiagnostic({ plan }: Props) {
  if (!plan) return null;

  const checks: CheckItem[] = [
    {
      label: 'Current retirement balance included',
      included: (plan.current_balance ?? 0) > 0,
      detail: plan.current_balance ? `$${plan.current_balance.toLocaleString()}` : 'No starting balance set',
      critical: true,
    },
    {
      label: 'Current employee contributions',
      included: (plan.monthly_employee_contribution ?? 0) > 0,
      detail: `$${(plan.monthly_employee_contribution ?? 0).toLocaleString()}/mo`,
      critical: true,
    },
    {
      label: 'Current employer contribution',
      included: (plan.monthly_employer_contribution ?? 0) > 0,
      detail: `$${(plan.monthly_employer_contribution ?? 0).toLocaleString()}/mo`,
    },
    {
      label: 'Employer contribution grows with salary',
      included: (plan.employer_match_pct ?? 0) > 0 && (plan.current_monthly_income ?? 0) > 0,
      detail: plan.employer_match_pct
        ? `${plan.employer_match_pct}% of salary`
        : 'Set employer match % and current salary',
    },
    {
      label: 'Annual salary growth',
      included: (plan.annual_raise_pct ?? 0) > 0,
      detail: `${plan.annual_raise_pct ?? 0}% per year`,
    },
    {
      label: 'Raises redirected to retirement',
      included: (plan.raise_redirect_pct ?? 0) > 0,
      detail: `${plan.raise_redirect_pct ?? 0}% of each raise invested`,
    },
    {
      label: 'Debt payment redirect',
      included: !!plan.debt_payoff_date && (plan.debt_payment_amount ?? 0) > 0,
      detail: plan.debt_payoff_date
        ? `$${(plan.debt_payment_amount ?? 0).toLocaleString()}/mo from ${plan.debt_payoff_date}`
        : 'No debt redirect scheduled',
    },
    {
      label: 'Additional scheduled contribution',
      included: !!plan.additional_start_date && (plan.additional_monthly_amount ?? 0) > 0,
      detail: plan.additional_start_date
        ? `$${(plan.additional_monthly_amount ?? 0).toLocaleString()}/mo from ${plan.additional_start_date}`
        : 'No additional contribution scheduled',
    },
    {
      label: 'Social Security invested while working',
      included: !!plan.ss_invest_while_working && (plan.ss_monthly_estimate ?? 0) > 0,
      detail: plan.ss_invest_while_working
        ? `$${(plan.ss_monthly_estimate ?? 0).toLocaleString()}/mo from age ${plan.ss_claiming_age}`
        : 'Disabled',
    },
    {
      label: 'HSA invested for long-term medical',
      included: !!plan.hsa_invested,
      detail: plan.hsa_invested ? `$${(plan.hsa_balance ?? 0).toLocaleString()} balance` : 'Not invested',
    },
    {
      label: 'Projection dollar mode selected',
      included: typeof plan.use_future_dollars === 'boolean',
      detail: plan.use_future_dollars ? 'Future dollars (nominal)' : "Today's dollars (inflation-adjusted)",
      critical: true,
    },
    {
      label: 'Inflation rate configured',
      included: (plan.inflation_pct ?? 0) > 0,
      detail: `${plan.inflation_pct ?? 0}% per year`,
    },
    {
      label: 'Future-dollar goal shown separately',
      included: true,
      detail: `Goal $${(plan.target_amount ?? 0).toLocaleString()} treated as ${plan.use_future_dollars ? 'future' : "today's"} dollars`,
    },
    {
      label: 'Today\'s-dollar purchasing power shown separately',
      included: true,
      detail: 'See "Future Dollars vs Today\'s Dollars" card',
    },
    {
      label: 'App not mixing future-dollar balances with today\'s-dollar goals',
      included: true,
      detail: 'Projection and goal use the same dollar mode',
      critical: true,
    },
    {
      label: '$4M goal treated as future dollars (Montgomery default)',
      included: plan.use_future_dollars === true,
      detail: plan.use_future_dollars ? 'Goal compared against nominal projection' : "Currently set to today's dollars",
    },

  const includedCount = checks.filter((c) => c.included).length;
  const missingCritical = checks.filter((c) => c.critical && !c.included);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          Projection Diagnostic
          <span className="text-xs font-normal text-muted-foreground">
            {includedCount} of {checks.length} assumptions included
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {missingCritical.length > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500">Projection may be incomplete</p>
              <p className="text-muted-foreground mt-1">
                Confirm raise redirection, employer match growth, debt redirect, additional contributions, and Social Security
                investing are configured in Setup.
              </p>
            </div>
          </div>
        )}
        <ul className="space-y-1.5">
          {checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2 text-sm">
              {c.included ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className={c.included ? '' : 'text-muted-foreground'}>{c.label}</p>
                {c.detail && <p className="text-xs text-muted-foreground">{c.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
