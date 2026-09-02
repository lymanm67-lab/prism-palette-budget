/**
 * Monte Carlo Retirement Stress Test engine.
 *
 * Models year-by-year random returns (never a fixed annual return), separate
 * inflation tracks, an HSA sleeve, guaranteed income kept apart from portfolio
 * withdrawals, and optional shocks (market declines, LTC events, crises).
 *
 * All outputs are estimates. Nothing here is a prediction or guarantee.
 */

/* ---------------------------------- RNG ---------------------------------- */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function normal(rand: () => number, mean: number, sd: number): number {
  const u1 = Math.max(rand(), 1e-9);
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sd;
}

/* ------------------------------- Types ----------------------------------- */

export type LtcSetting = 'none' | 'home' | 'assisted' | 'nursing';

export interface StressAssumptions {
  // Ages
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;

  // Invested assets (emergency cash excluded on purpose)
  portfolioBalance: number;
  hsaBalance: number;

  // Contributions (annual dollars)
  employeeContribution: number;
  employerContribution: number;
  hsaContribution: number;
  hsaEmployerContribution: number;
  contributionGrowthPct: number; // pay-raise driven contribution growth
  currentEarnedIncomeAnnual: number; // today's gross earned income (grows with pay raises)

  // Household (spouse) — invested assets and guaranteed income kept identifiable
  includeSpouse: boolean;
  spouseCurrentAge: number;
  spouseRetirementAge: number;
  spouseBalance: number;
  spouseContribution: number; // annual employee + employer
  spouseSocialSecurityAnnual: number;
  spouseSocialSecurityStartAge: number;

  // Accelerators (money redirected into investing rather than new take-home)
  debtRedirectAnnual: number; // freed-up debt payments redirected to investing
  debtRedirectStartAge: number | null;
  taxRefundRedirectAnnual: number; // annual refund / bonus redirected
  postRetirementIncomeAnnual: number; // continued work or consulting income
  postRetirementIncomeEndAge: number | null;
  withdrawalStartAge: number | null; // no portfolio withdrawals before this age


  // Markets & inflation
  expectedReturnPct: number;
  volatilityPct: number;
  inflationPct: number;
  housingInflationPct: number;
  healthcareInflationPct: number;
  ltcInflationPct: number;
  travelInflationPct: number;

  // Retirement spending (today's dollars, annual)
  essentialSpend: number;
  discretionarySpend: number;
  healthcareSpend: number;
  travelSpend: number;
  withdrawalGrowthPct: number;

  // Guaranteed income (annual, today's dollars)
  socialSecurityAnnual: number;
  socialSecurityStartAge: number;
  socialSecurityColaPct: number;
  pensionAnnual: number;
  pensionStartAge: number;
  pensionColaPct: number;
  otherGuaranteedAnnual: number;

  // Tax
  effectiveTaxRatePct: number;

  // Shocks
  marketShockPct: number; // e.g. 30 = a 30% decline
  marketShockAge: number | null; // age the decline hits
  ltcSetting: LtcSetting;
  ltcStartAge: number;
  ltcYears: number;
  ltcAnnualCost: number;
  ltcInsuranceBenefit: number;
  ltcHsaOffset: number;
  extraOneTimeExpense: number;
  extraOneTimeExpenseAge: number | null;
  returnHaircutPct: number; // subtract from expected return (crisis modelling)

  // ---- Sequence-of-returns controls (explicit toggles) ----
  /** Force the worst returns into the first years of retirement. */
  badFirstDecadeEnabled: boolean;
  badFirstDecadeYears: number; // how many early-retirement years are stressed
  badFirstDecadeHaircutPct: number; // points subtracted from returns in those years
  /** Cash/short-bond bridge carved out at retirement, spent instead of selling in down years. */
  cashBridgeYears: number; // years of essentials + healthcare held in the bridge
  cashBridgeYieldPct: number; // yield on the bridge sleeve
  /** Dynamic guardrail spending rules (Guyton-Klinger style bands). */
  guardrailRulesEnabled: boolean;
  guardrailBandPct: number; // deviation from the plan path that triggers a change
  guardrailCutPct: number; // discretionary + travel cut when below the lower band
  guardrailRaisePct: number; // discretionary + travel raise when above the upper band

}

export interface StressGoals {
  neverDeplete: boolean;
  minimumFloor: number | null;
  legacyTarget: number | null;
  legacyTargetAge: number;
  minimumAnnualIncome: number | null;
  preservePrincipal: boolean;
  fundLtc: boolean;
}

export interface StressResult {
  runs: number;
  ages: number[];
  successProbability: number;
  depletionProbability: number;
  legacyProbability: number;
  incomeFloorProbability: number;
  spendingCutProbability: number;
  preservePrincipalProbability: number;
  ltcFundedProbability: number;
  medianEnding: number;
  p10Ending: number;
  p25Ending: number;
  p75Ending: number;
  p90Ending: number;
  percentilePaths: { age: number; p10: number; p25: number; median: number; p75: number; p90: number }[];
  medianDepletionAge: number | null;
  medianLowestBalance: number;
  guaranteedIncomeAtRetirement: number;
  essentialExpensesAtRetirement: number;
  guaranteedCoverageRatio: number;
}

export interface SensitivityPoint {
  label: string;
  successProbability: number;
  medianEnding: number;
  p10Ending: number;
  legacyProbability: number;
  depletionAge: number | null;
}

/* ---------------------------- Default assumptions ------------------------ */

export const DEFAULT_GOALS: StressGoals = {
  neverDeplete: true,
  minimumFloor: null,
  legacyTarget: 4_000_000,
  legacyTargetAge: 85,
  minimumAnnualIncome: null,
  preservePrincipal: false,
  fundLtc: false,
};

export const LTC_COST_PRESETS: Record<LtcSetting, number> = {
  none: 0,
  home: 68_000,
  assisted: 64_200,
  nursing: 116_800,
};

/* --------------------------------- Engine -------------------------------- */

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * p)));
  return sorted[idx];
}

export function runStressTest(
  a: StressAssumptions,
  goals: StressGoals,
  runs = 10_000,
  seed = 20260902,
): StressResult {
  const years = Math.max(1, Math.round(a.lifeExpectancy - a.currentAge));
  const ages: number[] = [];
  for (let y = 0; y <= years; y++) ages.push(a.currentAge + y);

  const mean = (a.expectedReturnPct - a.returnHaircutPct) / 100;
  const sd = Math.max(0.0001, a.volatilityPct / 100);
  const infl = a.inflationPct / 100;
  const hcInfl = a.healthcareInflationPct / 100;
  const ltcInfl = a.ltcInflationPct / 100;
  const travelInfl = a.travelInflationPct / 100;
  const houseInfl = a.housingInflationPct / 100;
  const wGrowth = a.withdrawalGrowthPct / 100;
  const cGrowth = a.contributionGrowthPct / 100;
  const tax = Math.max(0, a.effectiveTaxRatePct / 100);

  const balancesByYear: number[][] = Array.from({ length: years + 1 }, () => []);
  const endings: number[] = [];
  const lowests: number[] = [];
  const depletionAges: number[] = [];

  let successes = 0;
  let depleted = 0;
  let legacyHits = 0;
  let incomeFloorHits = 0;
  let spendingCuts = 0;
  let principalPreserved = 0;
  let ltcFunded = 0;

  let guaranteedAtRet = 0;
  let essentialAtRet = 0;

  const ltcCost = a.ltcSetting === 'none' ? 0 : a.ltcAnnualCost || LTC_COST_PRESETS[a.ltcSetting];

  // Sequence-of-returns controls
  const bridgeYears = Math.max(0, a.cashBridgeYears ?? 0);
  const bridgeYield = (a.cashBridgeYieldPct ?? 0) / 100;
  const badDecade = !!a.badFirstDecadeEnabled;
  const badYears = Math.max(0, a.badFirstDecadeYears ?? 10);
  const badHaircut = (a.badFirstDecadeHaircutPct ?? 0) / 100;
  const useGuardrails = !!a.guardrailRulesEnabled;
  const grBand = Math.max(1, a.guardrailBandPct ?? 15) / 100;
  const grCut = Math.max(0, a.guardrailCutPct ?? 10) / 100;
  const grRaise = Math.max(0, a.guardrailRaisePct ?? 5) / 100;

  for (let r = 0; r < runs; r++) {
    const rand = mulberry32(seed + r * 7919);
    let bal = a.portfolioBalance + (a.includeSpouse ? a.spouseBalance : 0);
    let hsa = a.hsaBalance;
    let cash = 0; // cash bridge sleeve (carved out of the portfolio at retirement)
    let bridgeFunded = false;
    let refBal = 0; // plan reference balance at retirement, for guardrail bands
    let refAge = 0;
    let spendFactor = 1; // guardrail-adjusted discretionary/travel multiplier
    let lowest = bal + hsa;
    let depletionAge: number | null = null;
    let legacyMet = false;
    let incomeMet = true;
    let cutNeeded = false;
    let ltcCovered = true;

    balancesByYear[0].push(bal + hsa);


    for (let y = 1; y <= years; y++) {
      const age = a.currentAge + y;
      const spouseAge = age + (a.spouseCurrentAge - a.currentAge);
      const t = y; // years from today, for inflating flows
      let ret = normal(rand, mean, sd);
      if (a.marketShockAge != null && age === a.marketShockAge) {
        ret = -Math.abs(a.marketShockPct) / 100;
      }
      // Bad-first-decade ordering: force the weak returns into the early
      // retirement years, where withdrawals do the most damage.
      if (badDecade && age > a.retirementAge && age <= a.retirementAge + badYears) {
        ret -= badHaircut;
      }

      const working = age <= a.retirementAge;
      const growth = Math.pow(1 + cGrowth, t - 1);


      // ---- Contributions (keep growing while either spouse still works) ----
      let contributions = 0;
      if (working) {
        contributions += (a.employeeContribution + a.employerContribution) * growth;
        if (a.debtRedirectAnnual > 0 && (a.debtRedirectStartAge == null || age >= a.debtRedirectStartAge)) {
          contributions += a.debtRedirectAnnual * growth;
        }
        contributions += a.taxRefundRedirectAnnual * Math.pow(1 + infl, t - 1);
        hsa = hsa * (1 + ret) + (a.hsaContribution + a.hsaEmployerContribution) * growth;
      } else {
        hsa = hsa * (1 + ret);
      }
      if (a.includeSpouse && spouseAge <= a.spouseRetirementAge) {
        contributions += a.spouseContribution * growth;
      }

      bal = bal * (1 + ret) + contributions;
      cash = cash * (1 + bridgeYield);


      if (!working) {
        // Guaranteed income (kept separate from portfolio withdrawals)
        const ss =
          age >= a.socialSecurityStartAge
            ? a.socialSecurityAnnual * Math.pow(1 + a.socialSecurityColaPct / 100, t)
            : 0;
        const spouseSs =
          a.includeSpouse && spouseAge >= a.spouseSocialSecurityStartAge
            ? a.spouseSocialSecurityAnnual * Math.pow(1 + a.socialSecurityColaPct / 100, t)
            : 0;
        const pension =
          age >= a.pensionStartAge
            ? a.pensionAnnual * Math.pow(1 + a.pensionColaPct / 100, t)
            : 0;
        const other = a.otherGuaranteedAnnual * Math.pow(1 + infl, t);
        const work =
          a.postRetirementIncomeAnnual > 0 &&
          (a.postRetirementIncomeEndAge == null || age <= a.postRetirementIncomeEndAge)
            ? a.postRetirementIncomeAnnual * Math.pow(1 + infl, t)
            : 0;
        const guaranteed = ss + spouseSs + pension + other + work;

        // Spending needs, each on its own inflation track
        const essential =
          a.essentialSpend * Math.pow(1 + Math.max(infl, houseInfl * 0.5 + infl * 0.5), t);
        const healthcare = a.healthcareSpend * Math.pow(1 + hcInfl, t);

        // ---- Cash bridge: carve a sleeve out of the portfolio at retirement ----
        if (bridgeYears > 0 && !bridgeFunded) {
          const targetBridge = bridgeYears * (essential + healthcare);
          cash = Math.min(bal, targetBridge);
          bal -= cash;
          bridgeFunded = true;
        }

        // ---- Dynamic guardrails: adjust flexible spending inside bands ----
        if (refBal === 0) {
          refBal = bal + hsa + cash;
          refAge = age;
        }
        if (useGuardrails && refBal > 0) {
          const planPath = refBal * Math.pow(1 + infl, age - refAge);
          const actual = bal + hsa + cash;
          if (actual < planPath * (1 - grBand)) {
            spendFactor = Math.max(0.6, spendFactor * (1 - grCut));
          } else if (actual > planPath * (1 + grBand)) {
            spendFactor = Math.min(1.25, spendFactor * (1 + grRaise));
          }
        }

        const discretionary = a.discretionarySpend * Math.pow(1 + infl + wGrowth, t) * spendFactor;
        const travel = a.travelSpend * Math.pow(1 + travelInfl, t) * spendFactor;


        let ltcNeed = 0;
        if (
          ltcCost > 0 &&
          age >= a.ltcStartAge &&
          age < a.ltcStartAge + Math.max(0, a.ltcYears)
        ) {
          const inflated = ltcCost * Math.pow(1 + ltcInfl, t);
          ltcNeed = Math.max(0, inflated - a.ltcInsuranceBenefit);
          const fromHsa = Math.min(hsa, Math.min(a.ltcHsaOffset, ltcNeed));
          hsa -= fromHsa;
          ltcNeed -= fromHsa;
        }

        const need = essential + discretionary + healthcare + travel + ltcNeed;
        let fromPortfolio = Math.max(0, need - guaranteed);
        // Gross up for taxes on portfolio withdrawals only
        fromPortfolio = fromPortfolio * (1 + tax);
        // Deferred withdrawals: no portfolio draws before the chosen age
        const deferring = a.withdrawalStartAge != null && age < a.withdrawalStartAge;
        if (deferring) fromPortfolio = 0;

        if (age === a.retirementAge + 1 && r === 0) {
          guaranteedAtRet = guaranteed;
          essentialAtRet = essential + healthcare;
        }

        const available = bal + hsa + cash;
        if (fromPortfolio > available) {
          cutNeeded = true;
          if (ltcNeed > 0) ltcCovered = false;
          fromPortfolio = available;
        }
        // In a down year, spend the cash bridge first so shares are not sold low
        let remaining = fromPortfolio;
        if (cash > 0 && ret < 0) {
          const fromCash = Math.min(cash, remaining);
          cash -= fromCash;
          remaining -= fromCash;
        }
        // Draw taxable/retirement next, HSA last, then any remaining bridge cash
        const fromBal = Math.min(bal, remaining);
        bal -= fromBal;
        remaining -= fromBal;
        const fromHsaDraw = Math.min(hsa, remaining);
        hsa -= fromHsaDraw;
        remaining -= fromHsaDraw;
        if (remaining > 0 && cash > 0) {
          const extra = Math.min(cash, remaining);
          cash -= extra;
          remaining -= extra;
        }


        if (!deferring && guaranteed + (available - fromPortfolio > 0 ? need - guaranteed : 0) < (goals.minimumAnnualIncome ?? 0)) {
          incomeMet = false;
        }
        if (!deferring && goals.minimumAnnualIncome != null && available <= 0 && guaranteed < goals.minimumAnnualIncome) {
          incomeMet = false;
        }
      }


      if (a.extraOneTimeExpenseAge != null && age === a.extraOneTimeExpenseAge) {
        bal -= a.extraOneTimeExpense;
      }

      if (bal < 0) bal = 0;
      if (hsa < 0) hsa = 0;
      if (cash < 0) cash = 0;

      const total = bal + hsa + cash;
      if (total < lowest) lowest = total;
      if (total <= 0 && depletionAge == null) depletionAge = age;
      if (goals.legacyTarget != null && age === goals.legacyTargetAge && total >= goals.legacyTarget) {
        legacyMet = true;
      }
      balancesByYear[y].push(total);
    }

    const ending = bal + hsa + cash;

    endings.push(ending);
    lowests.push(lowest);
    if (depletionAge != null) {
      depleted++;
      depletionAges.push(depletionAge);
    }
    if (legacyMet) legacyHits++;
    if (incomeMet) incomeFloorHits++;
    if (cutNeeded) spendingCuts++;
    const startingPrincipal =
      a.portfolioBalance + a.hsaBalance + (a.includeSpouse ? a.spouseBalance : 0);
    if (ending >= startingPrincipal) principalPreserved++;
    if (ltcCovered) ltcFunded++;

    // Success = every selected goal met
    let ok = true;
    if (goals.neverDeplete && depletionAge != null) ok = false;
    if (goals.minimumFloor != null && lowest < goals.minimumFloor) ok = false;
    if (goals.legacyTarget != null && !legacyMet) ok = false;
    if (goals.minimumAnnualIncome != null && !incomeMet) ok = false;
    if (goals.preservePrincipal && ending < startingPrincipal) ok = false;
    if (goals.fundLtc && !ltcCovered) ok = false;
    if (ok) successes++;
  }

  const sortedEndings = [...endings].sort((x, y) => x - y);
  const sortedLowest = [...lowests].sort((x, y) => x - y);
  const sortedDepletion = [...depletionAges].sort((x, y) => x - y);

  const percentilePaths = balancesByYear.map((vals, y) => {
    const s = [...vals].sort((x, z) => x - z);
    return {
      age: a.currentAge + y,
      p10: percentile(s, 0.1),
      p25: percentile(s, 0.25),
      median: percentile(s, 0.5),
      p75: percentile(s, 0.75),
      p90: percentile(s, 0.9),
    };
  });

  const essentials = essentialAtRet || a.essentialSpend + a.healthcareSpend;
  const guaranteed =
    guaranteedAtRet ||
    a.socialSecurityAnnual +
      (a.includeSpouse ? a.spouseSocialSecurityAnnual : 0) +
      a.pensionAnnual +
      a.otherGuaranteedAnnual;

  return {
    runs,
    ages,
    successProbability: (successes / runs) * 100,
    depletionProbability: (depleted / runs) * 100,
    legacyProbability: goals.legacyTarget != null ? (legacyHits / runs) * 100 : 0,
    incomeFloorProbability: (incomeFloorHits / runs) * 100,
    spendingCutProbability: (spendingCuts / runs) * 100,
    preservePrincipalProbability: (principalPreserved / runs) * 100,
    ltcFundedProbability: (ltcFunded / runs) * 100,
    medianEnding: percentile(sortedEndings, 0.5),
    p10Ending: percentile(sortedEndings, 0.1),
    p25Ending: percentile(sortedEndings, 0.25),
    p75Ending: percentile(sortedEndings, 0.75),
    p90Ending: percentile(sortedEndings, 0.9),
    percentilePaths,
    medianDepletionAge: sortedDepletion.length ? percentile(sortedDepletion, 0.5) : null,
    medianLowestBalance: percentile(sortedLowest, 0.5),
    guaranteedIncomeAtRetirement: guaranteed,
    essentialExpensesAtRetirement: essentials,
    guaranteedCoverageRatio: essentials > 0 ? (guaranteed / essentials) * 100 : 0,
  };
}

/* ----------------------------- Interpretation ---------------------------- */

export function successBand(pct: number): { label: string; tone: 'strong' | 'good' | 'watch' | 'risk'; note: string } {
  if (pct >= 95)
    return {
      label: 'Very Strong',
      tone: 'strong',
      note: 'A very high score can also signal underspending or overly conservative assumptions — consider whether you could safely enjoy more.',
    };
  if (pct >= 85)
    return { label: 'Strong', tone: 'good', note: 'The plan holds up across most modelled scenarios.' };
  if (pct >= 75)
    return { label: 'Moderate / Monitor', tone: 'watch', note: 'Workable, but worth reviewing yearly and watching early-retirement returns.' };
  return {
    label: 'Adjustment Recommended',
    tone: 'risk',
    note: 'Consider higher contributions, a later retirement date, or lower planned spending.',
  };
}

/* ------------------------------ Scenario sets ---------------------------- */

export const CRISIS_SCENARIOS: { key: string; label: string; description: string; patch: Partial<StressAssumptions> }[] = [
  {
    key: 'depression',
    label: 'Depression-style decline',
    description: 'Severe multi-year decline with deflationary pressure.',
    patch: { marketShockPct: 45, returnHaircutPct: 2.5, inflationPct: 1 },
  },
  {
    key: 'inflation70s',
    label: '1970s inflation shock',
    description: 'High inflation with weak real returns.',
    patch: { inflationPct: 7, healthcareInflationPct: 9, returnHaircutPct: 2 },
  },
  {
    key: 'dotcom',
    label: 'Dot-com crash',
    description: 'Sharp equity drawdown with slow recovery.',
    patch: { marketShockPct: 35, returnHaircutPct: 1 },
  },
  {
    key: 'gfc2008',
    label: '2008 financial crisis',
    description: 'Deep single-year decline plus elevated volatility.',
    patch: { marketShockPct: 37, volatilityPct: 20 },
  },
  {
    key: 'covid',
    label: '2020 pandemic shock',
    description: 'Fast decline with a rapid rebound.',
    patch: { marketShockPct: 20, volatilityPct: 22 },
  },
  {
    key: 'stagflation',
    label: 'High inflation + weak returns',
    description: 'Persistent inflation with sub-par portfolio returns.',
    patch: { inflationPct: 5, healthcareInflationPct: 8, returnHaircutPct: 3 },
  },
];

export function sequenceRiskGrid(a: StressAssumptions, goals: StressGoals, runs: number): SensitivityPoint[] {
  const declines = [20, 30, 40];
  const offsets: { label: string; offset: number }[] = [
    { label: '5 yrs before retirement', offset: -5 },
    { label: 'At retirement', offset: 0 },
    { label: '3 yrs after retirement', offset: 3 },
    { label: '5 yrs after retirement', offset: 5 },
  ];
  const out: SensitivityPoint[] = [];
  for (const d of declines) {
    for (const o of offsets) {
      const age = a.retirementAge + o.offset;
      const res = runStressTest({ ...a, marketShockPct: d, marketShockAge: age }, goals, runs);
      out.push({
        label: `${d}% decline — ${o.label}`,
        successProbability: res.successProbability,
        medianEnding: res.medianEnding,
        p10Ending: res.p10Ending,
        legacyProbability: res.legacyProbability,
        depletionAge: res.medianDepletionAge,
      });
    }
  }
  return out;
}

export function contributionSensitivity(a: StressAssumptions, goals: StressGoals, runs: number, extras: number[]): SensitivityPoint[] {
  return extras.map((delta) => {
    const res = runStressTest({ ...a, employeeContribution: Math.max(0, a.employeeContribution + delta * 12) }, goals, runs);
    return {
      label: delta === 0 ? 'Baseline' : `${delta > 0 ? '+' : '−'}$${Math.abs(delta).toLocaleString()}/mo`,
      successProbability: res.successProbability,
      medianEnding: res.medianEnding,
      p10Ending: res.p10Ending,
      legacyProbability: res.legacyProbability,
      depletionAge: res.medianDepletionAge,
    };
  });
}

export function spendingSensitivity(a: StressAssumptions, goals: StressGoals, runs: number, pcts: number[]): SensitivityPoint[] {
  return pcts.map((pct) => {
    const f = 1 + pct / 100;
    const res = runStressTest(
      {
        ...a,
        essentialSpend: a.essentialSpend * f,
        discretionarySpend: a.discretionarySpend * f,
        healthcareSpend: a.healthcareSpend * f,
        travelSpend: a.travelSpend * f,
      },
      goals,
      runs,
    );
    return {
      label: pct === 0 ? 'Baseline' : `${pct > 0 ? '+' : '−'}${Math.abs(pct)}% spending`,
      successProbability: res.successProbability,
      medianEnding: res.medianEnding,
      p10Ending: res.p10Ending,
      legacyProbability: res.legacyProbability,
      depletionAge: res.medianDepletionAge,
    };
  });
}

export function retirementAgeGrid(a: StressAssumptions, goals: StressGoals, runs: number, agesToTest: number[]): SensitivityPoint[] {
  return agesToTest.map((age) => {
    const res = runStressTest({ ...a, retirementAge: age }, goals, runs);
    return {
      label: `Retire at ${age}`,
      successProbability: res.successProbability,
      medianEnding: res.medianEnding,
      p10Ending: res.p10Ending,
      legacyProbability: res.legacyProbability,
      depletionAge: res.medianDepletionAge,
    };
  });
}

export function inflationGrid(a: StressAssumptions, goals: StressGoals, runs: number): SensitivityPoint[] {
  return [2, 3, 4, 5].map((pct) => {
    const res = runStressTest(
      { ...a, inflationPct: pct, healthcareInflationPct: Math.max(a.healthcareInflationPct, pct + 2) },
      goals,
      runs,
    );
    return {
      label: `${pct}% inflation`,
      successProbability: res.successProbability,
      medianEnding: res.medianEnding,
      p10Ending: res.p10Ending,
      legacyProbability: res.legacyProbability,
      depletionAge: res.medianDepletionAge,
    };
  });
}

export function ltcGrid(a: StressAssumptions, goals: StressGoals, runs: number): SensitivityPoint[] {
  const settings: LtcSetting[] = ['none', 'home', 'assisted', 'nursing'];
  const labels: Record<LtcSetting, string> = {
    none: 'No LTC event',
    home: 'Home care',
    assisted: 'Assisted living',
    nursing: 'Nursing facility',
  };
  return settings.map((s) => {
    const res = runStressTest({ ...a, ltcSetting: s, ltcAnnualCost: s === 'none' ? 0 : LTC_COST_PRESETS[s] }, goals, runs);
    return {
      label: labels[s],
      successProbability: res.successProbability,
      medianEnding: res.medianEnding,
      p10Ending: res.p10Ending,
      legacyProbability: res.legacyProbability,
      depletionAge: res.medianDepletionAge,
    };
  });
}

/* ------------------------------ Risk ranking ----------------------------- */

export interface RiskRow {
  key: string;
  label: string;
  impactDollars: number;
  impactProbability: number;
  explanation: string;
}

export function rankRisks(a: StressAssumptions, goals: StressGoals, runs: number): RiskRow[] {
  const base = runStressTest(a, goals, runs);
  const tests: { key: string; label: string; patch: Partial<StressAssumptions>; explanation: string }[] = [
    {
      key: 'sequence',
      label: 'Sequence-of-returns risk',
      patch: { marketShockPct: 30, marketShockAge: a.retirementAge },
      explanation: 'A 30% decline right at retirement.',
    },
    {
      key: 'healthcare',
      label: 'Healthcare inflation',
      patch: { healthcareInflationPct: a.healthcareInflationPct + 3 },
      explanation: 'Medical costs rising 3 points faster than planned.',
    },
    {
      key: 'ltc',
      label: 'Long-term care event',
      patch: { ltcSetting: 'nursing', ltcAnnualCost: LTC_COST_PRESETS.nursing },
      explanation: 'Three years of nursing-facility care.',
    },
    {
      key: 'overspend',
      label: 'Overspending',
      patch: { discretionarySpend: a.discretionarySpend * 1.25, travelSpend: a.travelSpend * 1.25 },
      explanation: 'Lifestyle spending 25% above plan.',
    },
    {
      key: 'early',
      label: 'Earlier retirement',
      patch: { retirementAge: Math.max(a.currentAge + 1, a.retirementAge - 3) },
      explanation: 'Retiring three years sooner than planned.',
    },
    {
      key: 'returns',
      label: 'Lower-than-expected returns',
      patch: { returnHaircutPct: a.returnHaircutPct + 2 },
      explanation: 'Long-run returns two points below assumption.',
    },
    {
      key: 'ss',
      label: 'Reduced Social Security',
      patch: { socialSecurityAnnual: a.socialSecurityAnnual * 0.77 },
      explanation: 'Benefits trimmed to 77% of scheduled.',
    },
  ];

  return tests
    .map((t) => {
      const res = runStressTest({ ...a, ...t.patch }, goals, runs);
      return {
        key: t.key,
        label: t.label,
        impactDollars: res.medianEnding - base.medianEnding,
        impactProbability: res.successProbability - base.successProbability,
        explanation: t.explanation,
      };
    })
    .sort((x, y) => x.impactDollars - y.impactDollars);
}

/* --------------------------- Recommended actions ------------------------- */

export interface ActionRow {
  label: string;
  detail: string;
  successGain: number;
  medianGain: number;
}

export function recommendedActions(a: StressAssumptions, goals: StressGoals, runs: number): { base: number; actions: ActionRow[]; alreadyStrong: boolean } {
  const base = runStressTest(a, goals, runs);
  const candidates: { label: string; detail: string; patch: Partial<StressAssumptions> }[] = [
    { label: 'Increase monthly retirement contributions', detail: '+$250/mo', patch: { employeeContribution: a.employeeContribution + 3000 } },
    { label: 'Delay retirement', detail: '+2 years of work', patch: { retirementAge: a.retirementAge + 2 } },
    { label: 'Delay Social Security', detail: 'Claim at 70', patch: { socialSecurityStartAge: 70, socialSecurityAnnual: a.socialSecurityAnnual * 1.24 } },
    { label: 'Reduce retirement spending', detail: '−5% lifestyle', patch: { discretionarySpend: a.discretionarySpend * 0.95, travelSpend: a.travelSpend * 0.95 } },
    { label: 'Increase HSA funding', detail: '+$200/mo to HSA', patch: { hsaContribution: a.hsaContribution + 2400 } },
    { label: 'Reduce investment risk near retirement', detail: 'Volatility −4 points', patch: { volatilityPct: Math.max(4, a.volatilityPct - 4) } },
    { label: 'Maintain LTC protection', detail: 'Insurance benefit +$50k/yr', patch: { ltcInsuranceBenefit: a.ltcInsuranceBenefit + 50_000 } },
    { label: 'Redirect freed-up debt payments', detail: '+$500/mo once debts clear', patch: { debtRedirectAnnual: a.debtRedirectAnnual + 6_000 } },
    { label: 'Redirect tax refunds & bonuses', detail: '+$3,000/yr invested', patch: { taxRefundRedirectAnnual: a.taxRefundRedirectAnnual + 3_000 } },
    { label: 'Keep some earned income in early retirement', detail: '$20k/yr for 5 years', patch: { postRetirementIncomeAnnual: a.postRetirementIncomeAnnual + 20_000, postRetirementIncomeEndAge: a.retirementAge + 5 } },
    { label: 'Delay portfolio withdrawals', detail: 'No draws until age 72', patch: { withdrawalStartAge: 72 } },

  ];

  const actions = candidates
    .map((c) => {
      const res = runStressTest({ ...a, ...c.patch }, goals, runs);
      return {
        label: c.label,
        detail: c.detail,
        successGain: res.successProbability - base.successProbability,
        medianGain: res.medianEnding - base.medianEnding,
      };
    })
    .filter((r) => r.successGain > 0.1 || r.medianGain > 0)
    .sort((x, y) => y.successGain - x.successGain || y.medianGain - x.medianGain);

  return { base: base.successProbability, actions, alreadyStrong: base.successProbability >= 95 };
}

/* ---------------------------- Dynamic guardrails ------------------------- */

export function guardrailAdvice(res: StressResult): { tone: 'cut' | 'hold' | 'raise'; headline: string; detail: string } {
  if (res.successProbability < 80) {
    return {
      tone: 'cut',
      headline: 'Consider a temporary discretionary reduction',
      detail:
        'Trimming travel and lifestyle spending by 5–10% in weak market years materially improves portfolio longevity. Nothing changes automatically — this is a suggestion for your review.',
    };
  }
  if (res.successProbability > 96) {
    return {
      tone: 'raise',
      headline: 'You likely have room to spend or give more',
      detail:
        'Outcomes are strong across nearly every modelled path. A modest, deliberate increase in travel, giving, or lifestyle spending is probably safe. Approve any change yourself before acting.',
    };
  }
  return {
    tone: 'hold',
    headline: 'Stay the course',
    detail: 'Spending is well matched to the plan. Re-check after major market moves or a change in income.',
  };
}

/* ------------------------------ Perspectives ----------------------------- */

export type StressPerspective = 'household' | 'self' | 'spouse';

export interface PerspectiveParts {
  selfPensionAnnual: number;
  spousePensionAnnual: number;
  spousePensionStartAge: number;
}

/**
 * Re-frames household assumptions for a single person. Shared retirement
 * spending is split 50/50 so an individual view is not asked to fund the
 * whole household on its own.
 */
export function applyPerspective(
  a: StressAssumptions,
  view: StressPerspective,
  parts: PerspectiveParts,
): StressAssumptions {
  if (view === 'household') return a;

  const half = (n: number) => n / 2;
  const shared = {
    essentialSpend: half(a.essentialSpend),
    discretionarySpend: half(a.discretionarySpend),
    healthcareSpend: half(a.healthcareSpend),
    travelSpend: half(a.travelSpend),
    includeSpouse: false,
    spouseBalance: 0,
    spouseContribution: 0,
    spouseSocialSecurityAnnual: 0,
  };

  if (view === 'self') {
    return {
      ...a,
      ...shared,
      pensionAnnual: parts.selfPensionAnnual,
    };
  }

  // Spouse-only view: swap in the spouse's own ages, assets and income.
  return {
    ...a,
    ...shared,
    currentAge: a.spouseCurrentAge,
    retirementAge: a.spouseRetirementAge,
    portfolioBalance: a.spouseBalance,
    hsaBalance: 0,
    employeeContribution: a.spouseContribution,
    employerContribution: 0,
    hsaContribution: 0,
    hsaEmployerContribution: 0,
    socialSecurityAnnual: a.spouseSocialSecurityAnnual,
    socialSecurityStartAge: a.spouseSocialSecurityStartAge,
    pensionAnnual: parts.spousePensionAnnual,
    pensionStartAge: parts.spousePensionStartAge,
    debtRedirectAnnual: 0,
    taxRefundRedirectAnnual: 0,
    postRetirementIncomeAnnual: 0,
  };
}
