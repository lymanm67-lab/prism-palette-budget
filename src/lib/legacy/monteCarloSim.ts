/**
 * 100-Year Legacy Monte Carlo simulator.
 * Client-friendly deterministic-seed variant used for previews;
 * server variant lives in supabase/functions/hundred-year-simulate.
 */

export interface SimInputs {
  startingPrincipal: number;
  horizonYears: number;
  expectedReturn: number; // e.g. 0.07
  returnStdDev: number; // e.g. 0.15
  inflation: number; // e.g. 0.03
  taxRate: number; // e.g. 0.15
  annualDistributionPct: number; // % of balance withdrawn each year
  charitablePct: number; // % of distribution given
  additionalContribution: number; // $ per year
  contributionGrowth: number; // e.g. 0.03
  businessGrowth: number; // additive lump every 10 yrs
  lifeInsuranceProceeds: number; // added year 25
  generations: number;
  runs?: number;
}

export interface SimResult {
  nominalFv: number;
  realFv: number;
  purchasingPowerToday: number;
  sustainabilityPct: number; // % of runs where principal preserved
  probabilityPreserved: number; // 0..1
  generationsSupported: number;
  familyImpact: number; // total charitable + distributions given
  meanPath: number[]; // yearly mean balance
  p10Path: number[];
  p90Path: number[];
  tornado: Array<{ input: string; impactLow: number; impactHigh: number }>;
}

// Simple deterministic PRNG (mulberry32)
function prng(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box–Muller
function gaussian(rand: () => number) {
  const u = Math.max(1e-9, rand());
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export function simulate(inputs: SimInputs): SimResult {
  const runs = inputs.runs ?? 500;
  const years = inputs.horizonYears;
  const paths: number[][] = [];
  let totalGiving = 0;
  let preserved = 0;

  for (let r = 0; r < runs; r++) {
    const rand = prng(r * 9301 + 49297);
    let bal = inputs.startingPrincipal;
    let contrib = inputs.additionalContribution;
    const path: number[] = [bal];

    for (let y = 1; y <= years; y++) {
      const z = gaussian(rand);
      const growth = inputs.expectedReturn + inputs.returnStdDev * z;
      bal *= 1 + growth;
      bal -= bal * inputs.taxRate * Math.max(0, growth) * 0.1; // rough drag
      bal += contrib;
      if (y % 10 === 0) bal += inputs.businessGrowth;
      if (y === 25) bal += inputs.lifeInsuranceProceeds;

      const dist = bal * inputs.annualDistributionPct;
      bal -= dist;
      totalGiving += dist * inputs.charitablePct;

      contrib *= 1 + inputs.contributionGrowth;
      bal = Math.max(0, bal);
      path.push(bal);
    }

    if (bal >= inputs.startingPrincipal) preserved++;
    paths.push(path);
  }

  // Percentiles per year
  const meanPath: number[] = new Array(years + 1).fill(0);
  const p10Path: number[] = [];
  const p90Path: number[] = [];
  for (let y = 0; y <= years; y++) {
    const yearVals = paths.map(p => p[y]).sort((a, b) => a - b);
    meanPath[y] = yearVals.reduce((s, v) => s + v, 0) / runs;
    p10Path.push(yearVals[Math.floor(runs * 0.1)]);
    p90Path.push(yearVals[Math.floor(runs * 0.9)]);
  }

  const nominalFv = meanPath[years];
  const realFactor = Math.pow(1 + inputs.inflation, years);
  const realFv = nominalFv / realFactor;
  const purchasingPowerToday = realFv;
  const probabilityPreserved = preserved / runs;
  const sustainabilityPct = probabilityPreserved * 100;

  // Very rough "generations supported": each generation ≈ 25 yrs, needs 25*expenses to live off distributions
  const generationsSupported = Math.min(
    inputs.generations,
    Math.max(1, Math.round((realFv / Math.max(inputs.startingPrincipal, 1)) * inputs.generations * 0.5))
  );

  // Tornado (one-at-a-time ±20%)
  const baselineFv = nominalFv;
  const tornado: SimResult['tornado'] = [];
  const oat = (key: keyof SimInputs, deltaLow: number, deltaHigh: number) => {
    const lo = simulateSingle({ ...inputs, [key]: (inputs[key] as number) * (1 + deltaLow), runs: 100 });
    const hi = simulateSingle({ ...inputs, [key]: (inputs[key] as number) * (1 + deltaHigh), runs: 100 });
    tornado.push({ input: String(key), impactLow: lo - baselineFv, impactHigh: hi - baselineFv });
  };
  oat('expectedReturn', -0.2, 0.2);
  oat('inflation', -0.2, 0.2);
  oat('annualDistributionPct', -0.5, 0.5);
  oat('additionalContribution', -0.5, 0.5);

  return {
    nominalFv, realFv, purchasingPowerToday,
    sustainabilityPct, probabilityPreserved, generationsSupported,
    familyImpact: totalGiving / runs,
    meanPath, p10Path, p90Path, tornado,
  };
}

function simulateSingle(inputs: SimInputs): number {
  const r = simulate({ ...inputs, runs: inputs.runs ?? 100 });
  return r.nominalFv;
}
