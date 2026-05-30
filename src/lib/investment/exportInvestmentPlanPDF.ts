import jsPDF from 'jspdf';
import { InvestmentPlan } from '@/hooks/use-investment-plan';
import { runProjection, formatCurrencyFull } from './projection';

export function exportInvestmentPlanPDF(plan: InvestmentPlan) {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  let y = 18;

  const h1 = (t: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text(t, 14, y);
    y += 8;
  };
  const h2 = (t: string) => {
    if (y > 270) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(t, 14, y);
    y += 6;
  };
  const p = (t: string) => {
    if (y > 280) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(t, pageW - 28);
    doc.text(lines, 14, y);
    y += lines.length * 5 + 1;
  };

  const projection = plan.current_age && plan.retirement_age
    ? runProjection({
        currentAge: plan.current_age,
        retirementAge: plan.retirement_age,
        currentBalance: plan.current_balance,
        targetAmount: plan.target_amount,
        monthlyEmployeeContribution: plan.monthly_employee_contribution,
        monthlyEmployerContribution: plan.monthly_employer_contribution,
        expectedReturnPct: plan.expected_return_pct,
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
        hsaBalance: plan.hsa_balance,
        hsaMonthlyContribution: plan.hsa_monthly_contribution,
        hsaEmployerContribution: plan.hsa_employer_contribution,
        hsaInvested: plan.hsa_invested,
        hsaReturnPct: plan.hsa_return_pct,
        useFutureDollars: plan.use_future_dollars,
        inflationPct: plan.inflation_pct,
      })
    : null;

  h1('Prism Money Investment Plan');
  p(`Generated ${new Date().toLocaleDateString()}`);
  y += 2;

  h2('Investment Snapshot');
  p(`Current age: ${plan.current_age ?? '—'}    Target retirement age: ${plan.retirement_age ?? '—'}`);
  p(`Current balance: ${formatCurrencyFull(plan.current_balance)}`);
  p(`Target amount: ${formatCurrencyFull(plan.target_amount)}`);
  if (projection) {
    p(`Projected at retirement: ${formatCurrencyFull(projection.projectedBalance)}`);
    p(`Surplus / gap: ${formatCurrencyFull(projection.surplus)}`);
    p(`Status: ${projection.status}`);
    p(`Confidence: ${projection.confidenceScore}%`);
  }

  h2('Retirement Projection');
  p(`Monthly employee contribution: ${formatCurrencyFull(plan.monthly_employee_contribution)}`);
  p(`Monthly employer contribution: ${formatCurrencyFull(plan.monthly_employer_contribution)}`);
  p(`Expected return: ${plan.expected_return_pct}%`);
  p(`Expected annual raise: ${plan.annual_raise_pct}% (${plan.raise_redirect_pct}% redirected)`);

  h2('Social Security Strategy');
  p(`Estimated monthly benefit: ${formatCurrencyFull(plan.ss_monthly_estimate || 0)}`);
  p(`Claiming age: ${plan.ss_claiming_age ?? '—'}`);
  p(`Invest while working: ${plan.ss_invest_while_working ? `Yes (${plan.ss_invest_pct}%)` : 'No'}`);

  h2('Debt → Wealth Strategy');
  p(`Debt payment to redirect: ${formatCurrencyFull(plan.debt_payment_amount || 0)}`);
  p(`Debt payoff date: ${plan.debt_payoff_date ?? '—'}`);
  p(`Additional contribution: ${formatCurrencyFull(plan.additional_monthly_amount || 0)} starting ${plan.additional_start_date ?? '—'}`);

  h2('HSA Medical Reserve');
  p(`HSA balance: ${formatCurrencyFull(plan.hsa_balance)}`);
  p(`HSA monthly contribution: ${formatCurrencyFull(plan.hsa_monthly_contribution)}`);
  p(`HSA invested: ${plan.hsa_invested ? 'Yes' : 'No'}`);
  if (projection) p(`Projected HSA at retirement: ${formatCurrencyFull(projection.projectedHsaBalance)}`);

  h2('Scenario Comparison');
  if (plan.current_age && plan.retirement_age) {
    [5, 7, 9].forEach((rate) => {
      const r = runProjection({
        currentAge: plan.current_age!,
        retirementAge: plan.retirement_age!,
        currentBalance: plan.current_balance,
        targetAmount: plan.target_amount,
        monthlyEmployeeContribution: plan.monthly_employee_contribution,
        monthlyEmployerContribution: plan.monthly_employer_contribution,
        expectedReturnPct: rate,
        annualRaisePct: plan.annual_raise_pct,
        raiseRedirectPct: plan.raise_redirect_pct,
      });
      p(`${rate}% return → ${formatCurrencyFull(r.projectedBalance)} (gap ${formatCurrencyFull(r.surplus)})`);
    });
  }

  h2('Disclaimers');
  p('Prism Money provides educational projections and planning tools only. It does not provide financial, tax, legal, investment, Social Security, pension, or estate-planning advice. Consult a qualified professional before making financial decisions.');
  p('All projections are estimates based on user-entered assumptions. Actual results may vary due to market performance, taxes, inflation, fees, contribution limits, plan rules, Social Security law changes, pension rules, healthcare costs, and personal circumstances.');

  doc.save(`prism-investment-plan-${new Date().toISOString().slice(0, 10)}.pdf`);
}
