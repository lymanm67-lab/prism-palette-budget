// V7 — Real assets & business event modeling

export function realEstateProjection(opts: {
  currentValue: number;
  annualAppreciationPct?: number;
  monthlyNetIncome?: number; // rental income net of expenses
  years: number;
}) {
  const appr = (opts.annualAppreciationPct ?? 3) / 100;
  const rows: { year: number; value: number; cumulativeIncome: number }[] = [];
  let cumIncome = 0;
  for (let y = 1; y <= opts.years; y++) {
    const value = opts.currentValue * Math.pow(1 + appr, y);
    cumIncome += (opts.monthlyNetIncome ?? 0) * 12;
    rows.push({ year: y, value, cumulativeIncome: cumIncome });
  }
  return rows;
}

export function businessSaleEvent(opts: {
  saleAmount: number;
  saleYearsAway: number;
  capitalGainsPct?: number; // simplified flat rate
  reinvestReturnPct?: number;
  yearsAfterSale: number;
}) {
  const tax = (opts.capitalGainsPct ?? 20) / 100;
  const netProceeds = opts.saleAmount * (1 - tax);
  const r = (opts.reinvestReturnPct ?? 8) / 100;
  const futureValue = netProceeds * Math.pow(1 + r, opts.yearsAfterSale);
  return { netProceeds, taxPaid: opts.saleAmount * tax, futureValue };
}

export function stockCompVesting(opts: {
  unvestedShares: number;
  pricePerShare: number;
  vestYears: number;
  redirectToInvestPct?: number; // what % of net comp to invest
  taxRatePct?: number;
}) {
  const tax = (opts.taxRatePct ?? 32) / 100;
  const redirect = (opts.redirectToInvestPct ?? 50) / 100;
  const grossPerYear = (opts.unvestedShares * opts.pricePerShare) / opts.vestYears;
  const netPerYear = grossPerYear * (1 - tax);
  const investPerYear = netPerYear * redirect;
  return {
    grossPerYear,
    netPerYear,
    investPerYear,
    investPerMonth: investPerYear / 12,
    totalInvestOverVest: investPerYear * opts.vestYears,
  };
}
