import { useMemo } from 'react';
import { useAccounts, useBudgets } from '@/hooks/use-finance-data';
import { useHouseholdDebts } from '@/hooks/use-household-debts';
import { useHouseholdProfile } from '@/hooks/use-household-profile';

const RETIREMENT_RX = /(401|403|457|tda|ira|roth|tiaa|retire|pension|hsa)/i;

/** Live numbers pulled from accounts, debts and this month's budget — never typed twice. */
export function useProfileLiveNumbers() {
  const { data: accounts } = useAccounts();
  const { data: debts } = useHouseholdDebts();
  const d = new Date();
  const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  const { data: budgets } = useBudgets(monthKey);
  const { data: profile } = useHouseholdProfile();

  return useMemo(() => {
    const inv = (accounts || []).filter((a: any) =>
      !a.deleted_at && (a.type === 'investment' || /\bhsa\b/i.test(`${(a as any).name} ${(a as any).institution}`)),
    );
    let retirement = 0, selfDirected = 0;
    for (const a of inv) {
      const bal = Number((a as any).balance || 0);
      if (RETIREMENT_RX.test(`${(a as any).name} ${(a as any).institution}`)) retirement += bal;
      else selfDirected += bal;
    }
    const activeDebts = (debts || []).filter((x: any) => !x.deleted_at && Number(x.balance || 0) > 0);
    const debtBalance = activeDebts.reduce((s: number, x: any) => s + Number(x.balance || 0), 0);
    const debtMinimums = activeDebts.reduce((s: number, x: any) => s + Number(x.minimum_payment || 0), 0);
    const budgetExpenses = (budgets || []).reduce((s: number, b: any) => s + Math.abs(Number(b.amount || 0)), 0);
    const p: any = profile || {};
    const grossMonthly = (Number(p.lyman_gross_monthly) || 0) + (Number(p.kateri_gross_monthly) || 0);
    const ov = (v: any): number | null => (v === null || v === undefined || v === '' ? null : Number(v));
    const invOverride = ov(p.investments_total_override);
    const debtBalOverride = ov(p.debt_balance_override);
    const debtMinOverride = ov(p.debt_minimums_override);
    const budgetOverride = ov(p.budget_expenses_override);
    return {
      hasInvestments: inv.length > 0 || invOverride != null,
      investmentsTotal: invOverride ?? retirement + selfDirected,
      investmentsLive: inv.length > 0 ? retirement + selfDirected : null,
      investmentsOverridden: invOverride != null,
      retirement,
      selfDirected,
      hasDebts: !!debts || debtBalOverride != null,
      debtBalance: debtBalOverride ?? debtBalance,
      debtBalanceOverridden: debtBalOverride != null,
      debtMinimums: debtMinOverride ?? debtMinimums,
      debtMinimumsOverridden: debtMinOverride != null,
      hasBudget: (budgets || []).length > 0 || budgetOverride != null,
      budgetExpenses: budgetOverride ?? budgetExpenses,
      budgetExpensesOverridden: budgetOverride != null,
      monthKey,
      lymanGross: Number(p.lyman_gross_monthly) || null,
      kateriGross: Number(p.kateri_gross_monthly) || null,
      grossMonthly: grossMonthly || null,
      householdNet: Number(p.household_net_monthly) || null,
    };
  }, [accounts, debts, budgets, profile, monthKey]);
}
