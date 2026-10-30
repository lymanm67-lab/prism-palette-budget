/** Confirmed January–April 2027 budget payments; estimates are not actual repayments.
 *  Loan 3004: regular $228.47 + $878.77 extra monthly from Jan 30 (Feb extra $750), est. payoff March. */
const LOAN_3004: Record<string, number> = {
  '2027-01-01': 1107.24,
  '2027-02-01': 978.47,
  '2027-03-01': 551.73,
  '2027-04-01': 0,
};

export function futureDebtPayments(month: string) {
  if (month < '2027-01-01' || month > '2027-04-01') return null;
  return {
    vacation2306: 0,
    sister: 0,
    student: 390,
    betrLinkPersonal: 367.29,
    betrLinkBusiness: 215.71,
    vacation3004: LOAN_3004[month] ?? 0,
  };
}

/** Payoff month implied by the confirmed extra-payment schedule (see budget rows). */
export function scheduledPayoffLabel(name: string): string | null {
  if (/2306/.test(name)) return 'Dec 2026';
  if (/3004/.test(name)) return 'Mar 2027';
  return null;
}

/** Estimated interest saved by the confirmed extra-payment schedule vs regular payments only (35.99% APR). */
export function scheduledInterestSaved(name: string): number | null {
  if (/2306/.test(name)) return 53.3;
  if (/3004/.test(name)) return 442.08;
  return null;
}
