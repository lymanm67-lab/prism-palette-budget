/** Owner loan: the owner funds business costs by transfer (a loan, not spending);
 * each quarterly consulting-fee payment is transferred back to repay it. */
export interface OwnerLoanMonth { month: string; businessIncome: number; businessExpense: number }
export interface OwnerLoanRow extends OwnerLoanMonth { lent: number; repaid: number; balance: number }

const c = (n: number) => Math.round(n * 100) / 100;

export function ownerLoanLedger(months: OwnerLoanMonth[]): OwnerLoanRow[] {
  let balance = 0;
  return [...months].sort((a, b) => a.month.localeCompare(b.month)).map(m => {
    const lent = c(Math.max(0, m.businessExpense));
    const available = balance + lent;
    const repaid = c(Math.min(available, Math.max(0, m.businessIncome)));
    balance = c(available - repaid);
    return { ...m, lent, repaid, balance };
  });
}
