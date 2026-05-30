// V5 — Healthcare & longevity calculators (simplified estimates)

export function acaBridgeCost(opts: {
  retireAge: number; // < 65
  monthlyPremium: number; // estimated marketplace premium
  oopMax: number; // annual out-of-pocket max
  yearsUntilMedicare?: number; // override
  inflationPct?: number;
}) {
  const years = Math.max(0, opts.yearsUntilMedicare ?? (65 - opts.retireAge));
  const infl = (opts.inflationPct ?? 5) / 100;
  let total = 0;
  const breakdown: { year: number; premium: number; oop: number }[] = [];
  for (let y = 0; y < years; y++) {
    const premium = opts.monthlyPremium * 12 * Math.pow(1 + infl, y);
    const oop = opts.oopMax * Math.pow(1 + infl, y);
    total += premium + oop;
    breakdown.push({ year: y + 1, premium, oop });
  }
  return { years, totalCost: total, breakdown };
}

// 2025 Medicare Part B base + simplified IRMAA brackets (single)
const PART_B_BASE = 185;
const IRMAA_BRACKETS_SINGLE: { limit: number; addB: number; addD: number }[] = [
  { limit: 106_000, addB: 0, addD: 0 },
  { limit: 133_000, addB: 74, addD: 13.7 },
  { limit: 167_000, addB: 185, addD: 35.3 },
  { limit: 200_000, addB: 296, addD: 57 },
  { limit: 500_000, addB: 407, addD: 78.6 },
  { limit: Infinity, addB: 443.9, addD: 85.8 },
];

export function medicareCost(magi: number, partDBase = 35) {
  const b = IRMAA_BRACKETS_SINGLE.find((x) => magi < x.limit)!;
  const partB = PART_B_BASE + b.addB;
  const partD = partDBase + b.addD;
  return { partB, partD, monthlyTotal: partB + partD, annualTotal: (partB + partD) * 12, irmaa: b.addB > 0 };
}

export function ltcFunding(opts: {
  currentAge: number;
  expectedCareAge: number; // e.g. 80
  monthlyCost: number; // today's dollars
  careYears: number;
  inflationPct?: number;
  preReturnPct?: number;
}) {
  const infl = (opts.inflationPct ?? 5) / 100;
  const yearsAway = Math.max(0, opts.expectedCareAge - opts.currentAge);
  const futureMonthly = opts.monthlyCost * Math.pow(1 + infl, yearsAway);
  const annual = futureMonthly * 12;
  const totalFuture = annual * opts.careYears;
  // Lump sum needed today at preReturnPct
  const r = (opts.preReturnPct ?? 6) / 100;
  const pvNeeded = totalFuture / Math.pow(1 + r, yearsAway);
  return { yearsAway, futureMonthly, annual, totalFuture, pvNeeded };
}

export function longevitySensitivity(opts: {
  retireAge: number;
  startBalance: number;
  annualSpend: number;
  returnPct: number;
}) {
  const ages = [85, 90, 95, 100];
  return ages.map((endAge) => {
    let bal = opts.startBalance;
    const r = opts.returnPct / 100;
    for (let a = opts.retireAge; a < endAge; a++) {
      bal = bal * (1 + r) - opts.annualSpend;
      if (bal <= 0) return { endAge, depleted: true, ageDepleted: a + 1, finalBalance: 0 };
    }
    return { endAge, depleted: false, finalBalance: bal };
  });
}
