// Risk & allocation — Monte Carlo, glide path, sequence-of-returns stress test.

// Simple seedable PRNG (mulberry32) for reproducible runs.
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller normal sample
function normal(rand: () => number, mean: number, stdDev: number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export type MonteCarloInput = {
  currentBalance: number;
  monthlyContribution: number;
  yearsToRetirement: number;
  yearsInRetirement: number;
  annualWithdrawal: number;       // year-1 retirement withdrawal in today $
  expectedReturnPct: number;      // e.g. 7
  volatilityPct: number;          // e.g. 15 (annual stdev of returns)
  inflationPct: number;           // e.g. 2.5
  runs?: number;
  seed?: number;
};

export type MonteCarloResult = {
  runs: number;
  successRate: number;            // % of runs that did not deplete
  median: number;
  p10: number;
  p90: number;
  worstYear: number;              // worst single-year return (%) observed across runs
  bestYear: number;
  finalBalances: number[];        // truncated sample for charts
};

export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const {
    currentBalance, monthlyContribution, yearsToRetirement, yearsInRetirement,
    annualWithdrawal, expectedReturnPct, volatilityPct, inflationPct,
    runs = 1000, seed = 42,
  } = input;

  const rand = mulberry32(seed);
  const meanA = expectedReturnPct / 100;
  const stdA = volatilityPct / 100;
  const inflA = inflationPct / 100;

  let successes = 0;
  let worstYear = Infinity;
  let bestYear = -Infinity;
  const finals: number[] = [];

  for (let r = 0; r < runs; r++) {
    let bal = currentBalance;
    // Accumulation
    for (let y = 0; y < yearsToRetirement; y++) {
      const ret = normal(rand, meanA, stdA);
      worstYear = Math.min(worstYear, ret);
      bestYear = Math.max(bestYear, ret);
      bal = bal * (1 + ret) + monthlyContribution * 12;
      if (bal < 0) bal = 0;
    }
    // Decumulation (withdrawals grow with inflation)
    let depleted = false;
    let withdraw = annualWithdrawal;
    for (let y = 0; y < yearsInRetirement; y++) {
      const ret = normal(rand, meanA, stdA);
      worstYear = Math.min(worstYear, ret);
      bestYear = Math.max(bestYear, ret);
      bal = (bal - withdraw) * (1 + ret);
      withdraw *= 1 + inflA;
      if (bal <= 0) { depleted = true; bal = 0; break; }
    }
    if (!depleted) successes++;
    finals.push(Math.max(0, bal));
  }

  finals.sort((a, b) => a - b);
  const pct = (p: number) => finals[Math.floor(p * finals.length)] ?? 0;

  return {
    runs,
    successRate: (successes / runs) * 100,
    median: Math.round(pct(0.5)),
    p10: Math.round(pct(0.1)),
    p90: Math.round(pct(0.9)),
    worstYear: Math.round(worstYear * 1000) / 10,
    bestYear: Math.round(bestYear * 1000) / 10,
    finalBalances: finals.filter((_, i) => i % Math.max(1, Math.floor(runs / 200)) === 0),
  };
}

// Target allocation glide path (rule-of-thumb: equity % ≈ 110 - age, capped)
export function targetAllocation(age: number) {
  const equity = Math.max(30, Math.min(95, 110 - age));
  const bonds = Math.max(0, 95 - equity);
  const cash = Math.max(0, 100 - equity - bonds);
  return { equity, bonds, cash };
}

// Compare actual vs target. Holdings is an array of { type: 'equity' | 'bond' | 'cash', value }.
export function allocationDrift(holdings: { type: 'equity' | 'bond' | 'cash'; value: number }[], age: number) {
  const total = holdings.reduce((s, h) => s + h.value, 0) || 1;
  const actual = {
    equity: (holdings.filter(h => h.type === 'equity').reduce((s, h) => s + h.value, 0) / total) * 100,
    bonds: (holdings.filter(h => h.type === 'bond').reduce((s, h) => s + h.value, 0) / total) * 100,
    cash: (holdings.filter(h => h.type === 'cash').reduce((s, h) => s + h.value, 0) / total) * 100,
  };
  const target = targetAllocation(age);
  return {
    actual,
    target,
    drift: {
      equity: Math.round((actual.equity - target.equity) * 10) / 10,
      bonds: Math.round((actual.bonds - target.bonds) * 10) / 10,
      cash: Math.round((actual.cash - target.cash) * 10) / 10,
    },
  };
}

// Sequence-of-returns stress test: bad N years up front, then normal.
export function sequenceOfReturnsStress(input: {
  currentBalance: number;
  monthlyContribution: number;
  yearsToRetirement: number;
  badYears: number;            // e.g. 5
  badYearReturnPct: number;    // e.g. -10
  normalReturnPct: number;     // e.g. 7
}) {
  const { currentBalance, monthlyContribution, yearsToRetirement, badYears, badYearReturnPct, normalReturnPct } = input;
  const yearly: { year: number; balance: number; scenario: 'bad' | 'normal' }[] = [];
  let bal = currentBalance;
  for (let y = 1; y <= yearsToRetirement; y++) {
    const isBad = y <= badYears;
    const ret = (isBad ? badYearReturnPct : normalReturnPct) / 100;
    bal = bal * (1 + ret) + monthlyContribution * 12;
    yearly.push({ year: y, balance: Math.round(bal), scenario: isBad ? 'bad' : 'normal' });
  }
  // Baseline: all normal years for comparison
  let baseline = currentBalance;
  const baselineSeries = [];
  for (let y = 1; y <= yearsToRetirement; y++) {
    baseline = baseline * (1 + normalReturnPct / 100) + monthlyContribution * 12;
    baselineSeries.push({ year: y, balance: Math.round(baseline) });
  }
  return {
    yearly,
    baseline: baselineSeries,
    finalStressed: Math.round(bal),
    finalBaseline: Math.round(baseline),
    gapPct: baseline > 0 ? Math.round(((baseline - bal) / baseline) * 1000) / 10 : 0,
  };
}
