/** Confirmed January–April 2027 budget payments; estimates are not actual repayments. */
export function futureDebtPayments(month: string) {
  if (month < '2027-01-01' || month > '2027-04-01') return null;
  return {
    vacation2306: 0,
    sister: 0,
    student: 390,
    betrLinkPersonal: 367.29,
    betrLinkBusiness: 215.71,
    vacation3004: month === '2027-04-01' ? 394.76 : 394.77,
  };
}