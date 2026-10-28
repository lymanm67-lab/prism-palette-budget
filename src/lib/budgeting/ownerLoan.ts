/** Owner loan: months where business costs exceed business income are funded by
 * the owner as a loan; months with a business surplus (consulting fees) repay it. */
export interface OwnerLoanMonth { month: string; businessIncome: number; businessExpense: number }
export interface OwnerLoanRow extends OwnerLoanMonth { lent: number; repaid: number; balance: number }

const c = (n: number) => Math.round(n * 100) / 100;

export function ownerLoanLedger(months: OwnerLoanMonth[]): OwnerLoanRow[] {
  let balance = 0;
  return [...months].sort((a, b) => a.month.localeCompare(b.month)).map(m => {
    const gap = c(m.businessExpense - m.businessIncome);
    const lent = gap > 0 ? gap : 0;
    const repaid = gap < 0 ? Math.min(balance, -gap) : 0;
    balance = c(balance + lent - repaid);
    return { ...m, lent, repaid: c(repaid), balance };
  });
}
