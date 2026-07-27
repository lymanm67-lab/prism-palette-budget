import { runProjection } from '@/lib/investment/projection';
import type { InvestmentPlan } from '@/hooks/use-investment-plan';

export const MONTGOMERY_STEP_UPS = [
  { amount: 100, startDate: '2026-07-01' },
  { amount: 225, startDate: '2027-01-01' },
  { amount: 208, startDate: '2027-01-01' },
  { amount: 500, startDate: '2028-06-01' },
  { amount: 200, startDate: '2029-01-01' },
  { amount: 500, startDate: '2030-01-01' },
];

/**
 * Shared snapshot projection used by the Snapshot dashboard, scenario sweep
 * table and household roll-up so every surface stays in sync.
 */
export function projectSnapshot(
  plan: InvestmentPlan,
  rate: number,
  retirementAge: number,
  useFutureDollars = true,
) {
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
    useFutureDollars,
    inflationPct: plan.inflation_pct,
    datedStepUps: MONTGOMERY_STEP_UPS,
    annualLumpSum: { amount: 3000, startYear: 2028 },
  });
}
