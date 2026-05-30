// V6 — Income engineering: Social Security, annuities, buckets, SWR

// Social Security claiming: simplified PIA-based reduction/credit
// FRA = 67. Early reduction ~6.67%/yr first 3 yrs, 5%/yr beyond. Delay credit 8%/yr to 70.
export function ssBenefitAtAge(piaAt67: number, claimAge: number) {
  if (claimAge >= 67) {
    const years = Math.min(70, claimAge) - 67;
    return piaAt67 * (1 + 0.08 * years);
  }
  const yearsEarly = 67 - claimAge;
  const first3 = Math.min(3, yearsEarly) * (5 / 9 / 100) * 12; // ~6.67%/yr
  const remaining = Math.max(0, yearsEarly - 3) * 0.05;
  return piaAt67 * (1 - first3 - remaining);
}

export function ssClaimingOptimizer(opts: {
  piaAt67: number;
  lifeExpectancy: number;
  discountRatePct?: number;
}) {
  const r = (opts.discountRatePct ?? 3) / 100;
  const ages = [62, 65, 67, 70];
  const results = ages.map((claimAge) => {
    const monthly = ssBenefitAtAge(opts.piaAt67, claimAge);
    const annual = monthly * 12;
    let pv = 0;
    for (let a = claimAge; a < opts.lifeExpectancy; a++) {
      pv += annual / Math.pow(1 + r, a - claimAge);
    }
    return { claimAge, monthly, annual, lifetimePV: pv };
  });
  const best = [...results].sort((a, b) => b.lifetimePV - a.lifetimePV)[0];
  return { results, recommended: best.claimAge };
}

// SPIA: simple payout estimate (immediate annuity)
export function spiaEstimate(opts: { premium: number; age: number; payoutRatePct?: number }) {
  // Rough payout rates by age (single life)
  const ratesByAge: Record<number, number> = { 60: 6.0, 65: 6.5, 70: 7.3, 75: 8.3, 80: 9.5 };
  const ages = Object.keys(ratesByAge).map(Number).sort((a, b) => a - b);
  const nearest = ages.reduce((p, c) => Math.abs(c - opts.age) < Math.abs(p - opts.age) ? c : p);
  const rate = opts.payoutRatePct ?? ratesByAge[nearest];
  const annual = opts.premium * (rate / 100);
  return { annual, monthly: annual / 12, rate };
}

// Bucket strategy: short/mid/long horizons
export function bucketStrategy(opts: { annualSpend: number; shortYears?: number; midYears?: number }) {
  const s = opts.shortYears ?? 2;
  const m = opts.midYears ?? 5;
  return {
    shortBucket: { years: s, amount: opts.annualSpend * s, allocation: 'Cash / short bonds' },
    midBucket: { years: m, amount: opts.annualSpend * m, allocation: 'Bonds / balanced funds' },
    longBucket: { allocation: 'Equities / growth', purpose: 'Replenish mid + outpace inflation' },
    totalLiquid: opts.annualSpend * (s + m),
  };
}

// Safe Withdrawal Rate: 4% + Guyton-Klinger guardrails preview
export function swrAnalysis(opts: { portfolio: number; withdrawalPct?: number }) {
  const base = opts.withdrawalPct ?? 4;
  const annual = opts.portfolio * (base / 100);
  // Guyton-Klinger: cut 10% if WR exceeds initial by 20%; raise 10% if drops 20% below
  const upperGuard = annual * 1.2;
  const lowerGuard = annual * 0.8;
  return {
    initialAnnual: annual,
    initialMonthly: annual / 12,
    cutTrigger: upperGuard,
    raiseTrigger: lowerGuard,
    rule: '4% rule (Bengen) + Guyton-Klinger guardrails',
  };
}
