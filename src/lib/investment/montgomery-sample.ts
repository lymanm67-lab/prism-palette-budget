import { supabase } from '@/integrations/supabase/client';

const sb = supabase as any;

export async function loadMontgomerySample(householdId: string) {
  // 1. Upsert plan (deactivate any existing active plan first)
  await sb.from('investment_plans').update({ is_active: false }).eq('household_id', householdId).eq('is_active', true);

  const planPayload = {
    household_id: householdId,
    name: 'Montgomery Retirement and Legacy Plan',
    is_active: true,
    current_age: 58,
    retirement_age: 75,
    current_balance: 165000,
    target_amount: 4000000,
    monthly_employee_contribution: 451.66,
    monthly_employer_contribution: 516.56,
    employer_match_pct: 9,
    expected_return_pct: 8,
    annual_raise_pct: 3,
    raise_redirect_pct: 100,
    current_monthly_income: 5739.50,
    debt_payment_amount: 888,
    debt_payoff_date: '2027-09-01',
    additional_monthly_amount: 200,
    additional_start_date: '2029-01-01',
    ss_monthly_estimate: 3540,
    ss_claiming_age: 70,
    ss_invest_while_working: true,
    ss_invest_pct: 100,
    hsa_balance: 0,
    hsa_monthly_contribution: 116.66,
    hsa_employer_contribution: 83.33,
    hsa_invested: true,
    hsa_return_pct: 8,
    use_future_dollars: true,
    inflation_pct: 2.5,
    legacy_goal_name: 'Montgomery Family Legacy Trust',
    notes: 'Sample plan — employee contributions: Tax-Deferred $100, IU 457(b) $75, Roth TDA $85, Roth 457(b) $75, HSA $116.66. Default planning range 6–10%. First Million target $1M by Jun 2036. $500K life insurance names Montgomery Family Legacy Trust as beneficiary.',
  };

  const { data: planRow, error: planErr } = await sb
    .from('investment_plans').insert(planPayload).select().single();
  if (planErr) throw planErr;
  const planId = planRow.id;

  // 2. Spouse
  await sb.from('investment_plan_spouse').delete().eq('plan_id', planId);
  await sb.from('investment_plan_spouse').insert({
    plan_id: planId,
    household_id: householdId,
    name: 'Spouse',
    current_age: 56,
    retirement_age: 62,
    current_balance: 31170.96, // deferred comp only — OPERS excluded
    monthly_employee_contribution: 150,
    monthly_employer_contribution: 0,
    expected_return_pct: 6,
    ss_monthly_estimate: 0,
    ss_claiming_age: 67,
  });

  // 3. OPERS Pension
  await sb.from('investment_pensions').delete().eq('plan_id', planId);
  await sb.from('investment_pensions').insert({
    plan_id: planId,
    household_id: householdId,
    provider: 'Ohio Public Employees Retirement System (OPERS)',
    owner: 'spouse',
    monthly_amount: 6559,
    start_age: 62,
    cola_pct: 0,
    survivor_pct: 100,
    is_taxable: true,
    use_mode: 'income',
    lump_sum_amount: null,
    notes: 'Survivor benefit protects primary user. OPERS account value $328,948.74 (12/31/2025) excluded from liquid assets.',
  });

  // 4. Legacy goal
  await sb.from('investment_legacy_goals').delete().eq('plan_id', planId);
  await sb.from('investment_legacy_goals').insert({
    plan_id: planId,
    household_id: householdId,
    name: 'Montgomery Family Legacy Trust',
    target_amount: 1000000,
    target_year: new Date().getFullYear() + 30,
    notes: 'Funded from primary user retirement assets only. Excludes OPERS pension, OPERS account value, and spouse deferred compensation.',
  });

  // 5. Money rules
  await sb.from('investment_money_rules').delete().eq('household_id', householdId);
  const rules = [
    { name: 'Add $100/mo to retirement', trigger_type: 'date', start_date: '2026-07-01', amount: 100, destination: 'Retirement', frequency: 'monthly' },
    { name: 'Redirect 3% raise to retirement', trigger_type: 'raise', start_date: '2026-07-01', amount: 172.19, amount_pct: 100, destination: 'Retirement', frequency: 'monthly' },
    { name: 'Add $225/mo to retirement', trigger_type: 'date', start_date: '2027-01-01', amount: 225, destination: 'Retirement', frequency: 'monthly' },
    { name: 'First Million Accelerator ($208/mo)', trigger_type: 'date', start_date: '2027-01-01', amount: 208, destination: 'HSA/Roth', frequency: 'monthly' },
    { name: 'Redirect debt payment to retirement', trigger_type: 'date', start_date: '2027-09-01', amount: 888, destination: 'Retirement', frequency: 'monthly' },
    { name: 'Add $500/mo step-up', trigger_type: 'date', start_date: '2028-06-01', amount: 500, destination: 'Retirement', frequency: 'monthly' },
    { name: 'Annual $3,000 tax refund lump', trigger_type: 'date', start_date: '2028-01-01', amount: 3000, destination: 'Brokerage', frequency: 'yearly' },
    { name: 'Add $200/mo to retirement', trigger_type: 'date', start_date: '2029-01-01', amount: 200, destination: 'Retirement', frequency: 'monthly' },
    { name: 'Second $500/mo step-up', trigger_type: 'date', start_date: '2030-01-01', amount: 500, destination: 'Retirement', frequency: 'monthly' },
    { name: 'Invest Social Security while working', trigger_type: 'age', start_date: '2037-06-01', amount: 3540, amount_pct: 100, destination: 'Brokerage', frequency: 'monthly' },
    { name: 'Keep lifestyle flat after raises', trigger_type: 'recurring', start_date: null, amount: 0, destination: 'Retirement', frequency: 'monthly' },
  ];
  await sb.from('investment_money_rules').insert(
    rules.map(r => ({ ...r, household_id: householdId, plan_id: planId, is_active: true, status: 'scheduled', reminder: true }))
  );

  return planId;
}
