// V10 — Charitable giving calculators

export function dafContribution(opts: {
  contributionAmount: number;
  marginalTaxRatePct: number;
  appreciatedStockGainPct?: number; // % of contribution that is unrealized gain
  capitalGainsRatePct?: number;
}) {
  const incomeTaxSaved = opts.contributionAmount * (opts.marginalTaxRatePct / 100);
  const gainsPortion = opts.contributionAmount * ((opts.appreciatedStockGainPct ?? 0) / 100);
  const capGainsAvoided = gainsPortion * ((opts.capitalGainsRatePct ?? 20) / 100);
  return {
    incomeTaxSaved,
    capGainsAvoided,
    totalTaxBenefit: incomeTaxSaved + capGainsAvoided,
    netCost: opts.contributionAmount - incomeTaxSaved - capGainsAvoided,
  };
}

export function qcdAnalysis(opts: {
  rmdAmount: number;
  qcdAmount: number;
  marginalTaxRatePct: number;
}) {
  const effectiveQcd = Math.min(opts.qcdAmount, opts.rmdAmount, 105_000); // 2025 QCD limit
  const taxSaved = effectiveQcd * (opts.marginalTaxRatePct / 100);
  const remainingTaxableRmd = opts.rmdAmount - effectiveQcd;
  return {
    qcdApplied: effectiveQcd,
    taxSaved,
    remainingTaxableRmd,
    note: opts.qcdAmount > 105_000 ? 'QCD limit is $105,000/yr (2025)' : null,
  };
}

export function appreciatedStockDonation(opts: {
  fmv: number;
  costBasis: number;
  marginalTaxRatePct: number;
  capitalGainsRatePct?: number;
}) {
  const gain = opts.fmv - opts.costBasis;
  const cgRate = (opts.capitalGainsRatePct ?? 20) / 100;
  const sellAndDonate = {
    taxOwed: gain * cgRate,
    netDonation: opts.fmv - gain * cgRate,
    deduction: (opts.fmv - gain * cgRate) * (opts.marginalTaxRatePct / 100),
  };
  const donateStock = {
    taxOwed: 0,
    netDonation: opts.fmv,
    deduction: opts.fmv * (opts.marginalTaxRatePct / 100),
  };
  return {
    sellAndDonate,
    donateStock,
    advantage: donateStock.netDonation - sellAndDonate.netDonation + (donateStock.deduction - sellAndDonate.deduction),
  };
}
