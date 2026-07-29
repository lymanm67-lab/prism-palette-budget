// Sequence of Returns Risk Management System™
// Engine for SORR education, stress tests, withdrawal strategies, Monte Carlo and resilience scoring.

export type SorrInputs = {
  currentAge: number;
  retirementAge: number;          // 75
  endAge: number;                 // 95
  portfolio: number;              // household investable assets today
  annualContribution: number;     // while working
  expectedReturnPct: number;      // 6 / 8 / 10
  inflationPct: number;
  annualSpending: number;         // household lifestyle need in retirement (today $)
  socialSecurityAnnual: number;
  pensionAnnual: number;
  preservationYears: number;      // years after retirement with 0% portfolio withdrawal
  withdrawalRatePct: number;      // rate applied after preservation period
  cashReserveMonths: number;      // 12 / 24 / 36
  guardrailDropPct: number;       // e.g. 15
  guardrailSpendCutPct: number;   // e.g. 10
  guardrailsEnabled: boolean;
  volatilityPct: number;
};

export const DEFAULT_SORR: SorrInputs = {
  currentAge: 59,
  retirementAge: 75,
  endAge: 95,
  portfolio: 546_000,
  annualContribution: 46_000,
  expectedReturnPct: 8,
  inflationPct: 2.5,
  annualSpending: 84_000,
  socialSecurityAnnual: 42_000,
  pensionAnnual: 34_800,
  preservationYears: 10,
  withdrawalRatePct: 3,
  cashReserveMonths: 24,
  guardrailDropPct: 15,
  guardrailSpendCutPct: 10,
  guardrailsEnabled: true,
  volatilityPct: 15,
};

// ---------------------------------------------------------------- education
// Two investors, same average return, opposite order, with withdrawals.
export function sequenceIllustration(opts: {
  startBalance: number;
  annualWithdrawal: number;
  years?: number;
}) {
  const years = opts.years ?? 20;
  // Strong-early pattern averaging ~8%
  const strongEarly = [24, 18, 15, 12, 10, 9, 8, 8, 7, 6, 5, 4, 3, 2, 1, -5, -10, -15, -20, 8];
  const weakEarly = [...strongEarly].reverse();
  const pad = (arr: number[]) => Array.from({ length: years }, (_, i) => arr[i % arr.length]);

  const run = (returns: number[]) => {
    let bal = opts.startBalance;
    const path: { year: number; balance: number; ret: number }[] = [];
    returns.forEach((r, i) => {
      bal = (bal - opts.annualWithdrawal) * (1 + r / 100);
      if (bal < 0) bal = 0;
      path.push({ year: i + 1, balance: Math.round(bal), ret: r });
    });
    return path;
  };

  const a = run(pad(strongEarly));
  const b = run(pad(weakEarly));
  const avg = (arr: number[]) => arr.reduce((s, n) => s + n, 0) / arr.length;

  return {
    investorA: a,
    investorB: b,
    averageReturnA: Math.round(avg(pad(strongEarly)) * 10) / 10,
    averageReturnB: Math.round(avg(pad(weakEarly)) * 10) / 10,
    combined: a.map((row, i) => ({
      year: row.year,
      investorA: row.balance,
      investorB: b[i].balance,
    })),
    finalA: a[a.length - 1].balance,
    finalB: b[b.length - 1].balance,
  };
}

// ---------------------------------------------------------------- scenarios
export type ScenarioKey = 'average' | 'earlyBear' | 'lostDecade' | 'earlyBull';

export type ScenarioDef = {
  key: ScenarioKey;
  label: string;
  description: string;
  // returns applied starting at retirement; falls back to baseline after the array
  retirementReturns: number[];
};

export function scenarioDefs(baselinePct: number): ScenarioDef[] {
  return [
    {
      key: 'average',
      label: 'Average markets',
      description: `Steady ${baselinePct}% long-term return every year.`,
      retirementReturns: [],
    },
    {
      key: 'earlyBear',
      label: 'Early bear market',
      description: 'A sharp two-year drawdown right at retirement, then recovery.',
      retirementReturns: [-25, -15, 12, 18, 10],
    },
    {
      key: 'lostDecade',
      label: 'Lost decade',
      description: 'Ten years of near-flat returns, then a strong recovery decade.',
      retirementReturns: [2, -8, 4, -3, 1, 5, -6, 3, 2, 4, 14, 13, 12, 11, 10],
    },
    {
      key: 'earlyBull',
      label: 'Strong early bull',
      description: 'A powerful first decade, then average returns.',
      retirementReturns: [22, 18, 16, 14, 12, 15, 11, 13, 9, 12],
    },
  ];
}

export type YearPoint = {
  age: number;
  balance: number;
  growth: number;
  withdrawal: number;
  guaranteed: number;
  gap: number;
  returnPct: number;
  guardrailActive: boolean;
};

export function projectScenario(i: SorrInputs, scenario: ScenarioDef): {
  path: YearPoint[];
  finalBalance: number;
  depletedAge: number | null;
  yearsUntilRecovery: number | null;
  legacyValue: number;
  worstBalance: number;
  totalWithdrawn: number;
  sustainable: boolean;
} {
  const base = i.expectedReturnPct;
  let bal = i.portfolio;
  const path: YearPoint[] = [];
  let depletedAge: number | null = null;
  let peakAtRetirement = 0;
  let recoveryAge: number | null = null;
  let worst = Infinity;
  let totalWithdrawn = 0;
  let spending = i.annualSpending;
  let guaranteed = i.socialSecurityAnnual + i.pensionAnnual;
  let prevBalance = i.portfolio;

  for (let age = i.currentAge; age <= i.endAge; age++) {
    const retired = age >= i.retirementAge;
    const yearsRetired = age - i.retirementAge;
    const inPreservation = retired && yearsRetired < i.preservationYears;
    const ret = retired && scenario.retirementReturns.length > yearsRetired
      ? scenario.retirementReturns[yearsRetired]
      : base;

    // guardrail: after a decline greater than threshold, trim discretionary spending
    const drop = prevBalance > 0 ? ((prevBalance - bal) / prevBalance) * 100 : 0;
    const guardrailActive = i.guardrailsEnabled && retired && drop >= i.guardrailDropPct;
    const effectiveSpend = guardrailActive ? spending * (1 - i.guardrailSpendCutPct / 100) : spending;

    let withdrawal = 0;
    if (retired && !inPreservation) {
      const gap = Math.max(0, effectiveSpend - guaranteed);
      const ruleBased = bal * (i.withdrawalRatePct / 100);
      withdrawal = Math.min(bal, Math.max(gap, ruleBased > 0 ? Math.min(ruleBased, Math.max(gap, ruleBased)) : gap));
    }

    prevBalance = bal;
    const contribution = retired ? 0 : i.annualContribution;
    const growth = (bal - withdrawal + contribution / 2) * (ret / 100);
    bal = bal - withdrawal + contribution + growth;
    if (bal <= 0) {
      bal = 0;
      if (depletedAge === null) depletedAge = age;
    }
    totalWithdrawn += withdrawal;
    if (retired) {
      if (age === i.retirementAge) peakAtRetirement = bal;
      if (recoveryAge === null && peakAtRetirement > 0 && bal >= peakAtRetirement && age > i.retirementAge) {
        recoveryAge = age;
      }
      worst = Math.min(worst, bal);
    }

    path.push({
      age,
      balance: Math.round(bal),
      growth: Math.round(growth),
      withdrawal: Math.round(withdrawal),
      guaranteed: Math.round(retired ? guaranteed : 0),
      gap: Math.round(retired ? Math.max(0, effectiveSpend - guaranteed) : 0),
      returnPct: ret,
      guardrailActive,
    });

    spending *= 1 + i.inflationPct / 100;
    guaranteed *= 1 + i.inflationPct / 100 * 0.8; // COLA slightly under inflation
  }

  return {
    path,
    finalBalance: Math.round(bal),
    depletedAge,
    yearsUntilRecovery: recoveryAge ? recoveryAge - i.retirementAge : null,
    legacyValue: Math.round(bal),
    worstBalance: Math.round(worst === Infinity ? bal : worst),
    totalWithdrawn: Math.round(totalWithdrawn),
    sustainable: depletedAge === null,
  };
}

// -------------------------------------------------- withdrawal strategies
export function strategyComparison(i: SorrInputs, scenario: ScenarioDef) {
  const immediate = projectScenario({ ...i, preservationYears: 0 }, scenario);
  const montgomery = projectScenario(i, scenario);
  const uplift = immediate.finalBalance > 0
    ? Math.round(((montgomery.finalBalance - immediate.finalBalance) / immediate.finalBalance) * 1000) / 10
    : 100;
  return {
    immediate,
    montgomery,
    additionalGrowthYears: i.preservationYears,
    legacyUpliftPct: uplift,
    preferred: montgomery.finalBalance >= immediate.finalBalance ? 'montgomery' : 'immediate',
  };
}

// -------------------------------------------------- safe withdrawal analysis
export function safeWithdrawalAnalysis(i: SorrInputs, rates = [2, 3, 4, 5]) {
  return rates.map((rate) => {
    const scenarios = scenarioDefs(i.expectedReturnPct).map((s) =>
      projectScenario({ ...i, withdrawalRatePct: rate }, s),
    );
    const survived = scenarios.filter((s) => s.sustainable).length;
    const mc = monteCarlo({ ...i, withdrawalRatePct: rate }, 1000, 7 + rate);
    const median = scenarios[0];
    return {
      rate,
      successProbability: mc.successRate,
      scenariosSurvived: `${survived}/${scenarios.length}`,
      longevity: median.depletedAge ? `to age ${median.depletedAge}` : `beyond age ${i.endAge}`,
      legacyProjection: median.finalBalance,
      remainingAt95: median.path.find((p) => p.age === 95)?.balance ?? median.finalBalance,
    };
  });
}

// -------------------------------------------------- Monte Carlo
function mulberry32(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function normal(rand: () => number, mean: number, sd: number) {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  return mean + Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * sd;
}

export function monteCarlo(i: SorrInputs, runs = 2000, seed = 42) {
  const rand = mulberry32(seed);
  const mean = i.expectedReturnPct / 100;
  const sd = i.volatilityPct / 100;
  const finals: number[] = [];
  let successes = 0;
  let positiveAt95 = 0;

  for (let r = 0; r < runs; r++) {
    let bal = i.portfolio;
    let spending = i.annualSpending;
    let guaranteed = i.socialSecurityAnnual + i.pensionAnnual;
    let depleted = false;
    for (let age = i.currentAge; age <= i.endAge; age++) {
      const retired = age >= i.retirementAge;
      const inPreservation = retired && age - i.retirementAge < i.preservationYears;
      const ret = normal(rand, mean, sd);
      let withdrawal = 0;
      if (retired && !inPreservation) {
        withdrawal = Math.max(Math.max(0, spending - guaranteed), bal * (i.withdrawalRatePct / 100));
        withdrawal = Math.min(withdrawal, bal);
      }
      const contribution = retired ? 0 : i.annualContribution;
      bal = (bal - withdrawal + contribution) * (1 + ret);
      if (bal <= 0) { bal = 0; depleted = true; break; }
      spending *= 1 + i.inflationPct / 100;
      guaranteed *= 1 + (i.inflationPct / 100) * 0.8;
    }
    if (!depleted) { successes++; positiveAt95++; }
    finals.push(Math.max(0, bal));
  }

  finals.sort((a, b) => a - b);
  const pct = (p: number) => Math.round(finals[Math.floor(p * (finals.length - 1))] ?? 0);
  return {
    runs,
    successRate: Math.round((successes / runs) * 1000) / 10,
    positiveAt95Rate: Math.round((positiveAt95 / runs) * 1000) / 10,
    median: pct(0.5),
    p10: pct(0.1),
    p90: pct(0.9),
    distribution: finals.filter((_, idx) => idx % Math.max(1, Math.floor(runs / 60)) === 0)
      .map((v, idx) => ({ bucket: idx, value: Math.round(v) })),
  };
}

// -------------------------------------------------- preservation score
export type ScoreFactor = { label: string; points: number; max: number; note: string };

export function preservationScore(i: SorrInputs): {
  score: number;
  band: 'Excellent' | 'Very Good' | 'Good' | 'Needs Improvement';
  factors: ScoreFactor[];
} {
  const factors: ScoreFactor[] = [];

  // Withdrawal rate (20)
  const wr = i.withdrawalRatePct;
  const wrPts = wr <= 2 ? 20 : wr <= 3 ? 18 : wr <= 4 ? 13 : wr <= 5 ? 8 : 4;
  factors.push({ label: 'Withdrawal rate', points: wrPts, max: 20, note: `${wr}% planned rate after the preservation period.` });

  // Guaranteed income coverage (25)
  const coverage = i.annualSpending > 0
    ? (i.socialSecurityAnnual + i.pensionAnnual) / i.annualSpending : 0;
  const covPts = Math.round(Math.min(1, coverage) * 25);
  factors.push({ label: 'Guaranteed income coverage', points: covPts, max: 25, note: `${Math.round(coverage * 100)}% of spending covered by Social Security + pension.` });

  // Cash reserve (15)
  const resPts = i.cashReserveMonths >= 36 ? 15 : i.cashReserveMonths >= 24 ? 12 : i.cashReserveMonths >= 12 ? 8 : 3;
  factors.push({ label: 'Cash reserve', points: resPts, max: 15, note: `${i.cashReserveMonths} months of spending held in reserve.` });

  // Preservation period / delayed withdrawals (15)
  const presPts = i.preservationYears >= 10 ? 15 : i.preservationYears >= 5 ? 11 : i.preservationYears >= 1 ? 6 : 0;
  factors.push({ label: 'Initial preservation period', points: presPts, max: 15, note: `${i.preservationYears} years of 0% portfolio withdrawals at retirement.` });

  // Remaining working years (10)
  const wy = Math.max(0, i.retirementAge - i.currentAge);
  const wyPts = wy >= 10 ? 10 : wy >= 5 ? 7 : wy >= 1 ? 4 : 2;
  factors.push({ label: 'Remaining working years', points: wyPts, max: 10, note: `${wy} years of continued contributions and compounding.` });

  // Pension income (8)
  const penPts = i.pensionAnnual >= 30_000 ? 8 : i.pensionAnnual > 0 ? 5 : 0;
  factors.push({ label: 'Household pension income', points: penPts, max: 8, note: i.pensionAnnual > 0 ? 'OPERS pension provides a lifetime income floor.' : 'No pension income modeled.' });

  // Social Security timing (7)
  const ssPts = i.retirementAge >= 70 ? 7 : i.retirementAge >= 67 ? 5 : 3;
  factors.push({ label: 'Social Security timing', points: ssPts, max: 7, note: `Claiming aligned with retirement at ${i.retirementAge}.` });

  const score = factors.reduce((s, f) => s + f.points, 0);
  const band = score >= 85 ? 'Excellent' : score >= 72 ? 'Very Good' : score >= 58 ? 'Good' : 'Needs Improvement';
  return { score, band, factors };
}

export function cashReserveTarget(i: SorrInputs) {
  const monthlySpend = i.annualSpending / 12;
  const guaranteedMonthly = (i.socialSecurityAnnual + i.pensionAnnual) / 12;
  const gap = Math.max(0, monthlySpend - guaranteedMonthly);
  return {
    monthlySpend: Math.round(monthlySpend),
    guaranteedMonthly: Math.round(guaranteedMonthly),
    monthlyGap: Math.round(gap),
    fullSpendTarget: Math.round(monthlySpend * i.cashReserveMonths),
    gapOnlyTarget: Math.round(gap * i.cashReserveMonths),
  };
}
