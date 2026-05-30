// V11 — College / 529 funding planner

export function collegeProjection(opts: {
  childCurrentAge: number;
  collegeStartAge?: number;
  annualCostToday: number;
  costInflationPct?: number;
  yearsInCollege?: number;
  currentSavings: number;
  monthlyContribution: number;
  expectedReturnPct?: number;
}) {
  const startAge = opts.collegeStartAge ?? 18;
  const yearsUntil = Math.max(0, startAge - opts.childCurrentAge);
  const yearsIn = opts.yearsInCollege ?? 4;
  const infl = (opts.costInflationPct ?? 5) / 100;
  const r = (opts.expectedReturnPct ?? 6) / 100;

  // Future cost
  let totalCost = 0;
  for (let y = 0; y < yearsIn; y++) {
    totalCost += opts.annualCostToday * Math.pow(1 + infl, yearsUntil + y);
  }

  // Future value of savings + contributions
  const months = yearsUntil * 12;
  const mr = r / 12;
  const fvSavings = opts.currentSavings * Math.pow(1 + r, yearsUntil);
  const fvContribs = mr > 0
    ? opts.monthlyContribution * ((Math.pow(1 + mr, months) - 1) / mr)
    : opts.monthlyContribution * months;
  const projected = fvSavings + fvContribs;

  const shortfall = Math.max(0, totalCost - projected);
  // Monthly needed to fully fund
  const monthlyNeeded = mr > 0
    ? (totalCost - fvSavings) / ((Math.pow(1 + mr, months) - 1) / mr)
    : (totalCost - fvSavings) / months;

  return {
    yearsUntil,
    totalCost,
    projected,
    shortfall,
    coveragePct: totalCost > 0 ? Math.min(100, (projected / totalCost) * 100) : 100,
    monthlyNeeded: Math.max(0, monthlyNeeded),
  };
}

// Retirement vs college trade-off
export function tradeoffSlider(opts: {
  totalMonthlyAvailable: number;
  collegeAllocPct: number; // 0-100
}) {
  const collegeMonthly = opts.totalMonthlyAvailable * (opts.collegeAllocPct / 100);
  const retirementMonthly = opts.totalMonthlyAvailable - collegeMonthly;
  return { collegeMonthly, retirementMonthly };
}
