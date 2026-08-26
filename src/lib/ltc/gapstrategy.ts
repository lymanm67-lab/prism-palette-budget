// LTC Gap Coverage Strategy engine.
//
// Philosophy: insurance covers the base risk, the cash benefit adds
// flexibility, the HSA funds qualified gaps tax efficiently, retirement income
// handles manageable costs, and the investment portfolio is the LAST funding
// source — never the first.

import { inflationFactor, type LtcHousehold, type LtcPolicy } from './model';
import { carePlanAt, PLAN_MAX_MONTHLY, PLAN_INFLATION_PCT, SUPPORT_COST_PCT } from './careplan';
import { HOUR_TIERS, monthlyCostFromHours } from './location';

export const usd = (n: number, dp = 0) =>
  `$${(Number.isFinite(n) ? n : 0).toLocaleString(undefined, { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;

/* ----------------------------------------------------------------------- */
/* State                                                                    */
/* ----------------------------------------------------------------------- */

/** Does the contract allow the cash benefit to be paid ON TOP of reimbursement? */
export type StackMode = 'yes' | 'no' | 'unknown';

export const STACK_LABEL: Record<StackMode, string> = {
  yes: 'Confirmed Yes',
  no: 'Confirmed No',
  unknown: 'Unknown',
};

export type HsaStrategy = 'spendToday' | 'partial' | 'reserve';

export const HSA_STRATEGY_LABEL: Record<HsaStrategy, string> = {
  spendToday: 'Strategy A — Spend HSA Today',
  partial: 'Strategy B — Partial Preservation',
  reserve: 'Strategy C — LTC Reserve Strategy',
};

export const HSA_STRATEGY_NOTE: Record<HsaStrategy, string> = {
  spendToday: 'Current medical costs are paid from the HSA as they happen.',
  partial: 'About half of current medical costs are paid from cash, the rest from the HSA.',
  reserve: 'Invest the HSA and preserve it primarily for retirement healthcare and LTC.',
};

/** Share of current medical withdrawals actually taken from the HSA. */
export const HSA_STRATEGY_DRAW: Record<HsaStrategy, number> = {
  spendToday: 1, partial: 0.5, reserve: 0,
};

export interface HsaInputs {
  balance: number;
  monthlyContribution: number;
  /** Age 55+ catch-up, entered annually. */
  annualCatchUp: number;
  employerAnnual: number;
  returnPct: number;
  /** Qualified medical spend per year today. */
  annualMedical: number;
  strategy: HsaStrategy;
}

export interface PersonPlan {
  name: string;
  age: number;
  hsaBalance: number;
  careStartAge: number;
  careYears: number;
  weeklyHours: number;
  monthlyBenefit: number;
}

export interface GapStrategyState {
  stackCash: StackMode;
  cashPaysDuringElimination: boolean;
  weeklyHours: number;
  careMonths: number;
  retirementIncomeForLtc: number;
  hsa: HsaInputs;
  hsaTarget: number;
  taxableReserve: { balance: number; monthlyContribution: number; returnPct: number };
  partnership: { assetsExposed: number; enabled: boolean };
  opportunity: { premiumDelta: number; returnPct: number };
  people: PersonPlan[];
  stress: { careInflationPct: number; claimAge: number; careYears: number };
  progression: 'moderate' | 'higher';
}

export function defaultGapStrategy(h?: LtcHousehold): GapStrategyState {
  const lymanAge = h?.lymanAge ?? 59;
  const kateriAge = h?.kateriAge ?? 55;
  return {
    stackCash: 'unknown',
    cashPaysDuringElimination: true,
    weeklyHours: 20,
    careMonths: 36,
    retirementIncomeForLtc: 1000,
    hsa: {
      balance: 0, monthlyContribution: 0, annualCatchUp: 1000, employerAnnual: 0,
      returnPct: 7, annualMedical: 0, strategy: 'reserve',
    },
    hsaTarget: 100000,
    taxableReserve: { balance: 0, monthlyContribution: 0, returnPct: 7 },
    partnership: { assetsExposed: 0, enabled: true },
    opportunity: { premiumDelta: 50, returnPct: 7 },
    people: [
      { name: 'Lyman', age: lymanAge, hsaBalance: 0, careStartAge: 80, careYears: 3, weeklyHours: 20, monthlyBenefit: PLAN_MAX_MONTHLY },
      { name: 'Kateri', age: kateriAge, hsaBalance: 0, careStartAge: 82, careYears: 3, weeklyHours: 20, monthlyBenefit: PLAN_MAX_MONTHLY },
    ],
    stress: { careInflationPct: 4, claimAge: 80, careYears: 3 },
    progression: 'moderate',
  };
}

export function ensureGapStrategy(s?: Partial<GapStrategyState> | null, h?: LtcHousehold): GapStrategyState {
  const d = defaultGapStrategy(h);
  if (!s) return d;
  return {
    ...d, ...s,
    hsa: { ...d.hsa, ...(s.hsa || {}) },
    taxableReserve: { ...d.taxableReserve, ...(s.taxableReserve || {}) },
    partnership: { ...d.partnership, ...(s.partnership || {}) },
    opportunity: { ...d.opportunity, ...(s.opportunity || {}) },
    stress: { ...d.stress, ...(s.stress || {}) },
    people: s.people?.length ? s.people : d.people,
  };
}

/* ----------------------------------------------------------------------- */
/* HSA projection                                                           */
/* ----------------------------------------------------------------------- */

export const HSA_AGES = [65, 70, 75, 80, 85] as const;
export const HSA_RETURN_OPTIONS = [4, 5, 6, 7, 8] as const;
export const CARE_MONTH_OPTIONS = [12, 24, 36, 48, 60] as const;
export const HSA_TARGET_OPTIONS = [50000, 75000, 100000, 125000, 150000] as const;

/** Project an HSA balance from `fromAge` to `toAge` under a strategy. */
export function projectHsa(
  hsa: HsaInputs,
  fromAge: number,
  toAge: number,
  opts?: { returnPct?: number; strategy?: HsaStrategy },
) {
  const r = (opts?.returnPct ?? hsa.returnPct) / 100 / 12;
  const draw = HSA_STRATEGY_DRAW[opts?.strategy ?? hsa.strategy];
  const monthlyIn = hsa.monthlyContribution + hsa.annualCatchUp / 12 + hsa.employerAnnual / 12;
  const monthlyOut = (hsa.annualMedical / 12) * draw;
  let bal = hsa.balance;
  const months = Math.max(0, Math.round((toAge - fromAge) * 12));
  for (let m = 0; m < months; m++) {
    bal = bal * (1 + r) + monthlyIn - monthlyOut;
    if (bal < 0) bal = 0;
  }
  return bal;
}

export function hsaSeries(hsa: HsaInputs, fromAge: number, toAge: number, opts?: { returnPct?: number; strategy?: HsaStrategy }) {
  const rows: { age: number; balance: number }[] = [];
  for (let a = Math.floor(fromAge); a <= Math.ceil(toAge); a++) {
    rows.push({ age: a, balance: Math.round(projectHsa(hsa, fromAge, a, opts)) });
  }
  return rows;
}

/** Monthly HSA support capacity: balance spread over an expected care period. */
export function hsaMonthlyCapacity(balance: number, careMonths: number) {
  return careMonths > 0 ? balance / careMonths : 0;
}

/** How many months an HSA balance can carry a monthly gap. */
export function hsaCoverageDuration(balance: number, monthlyGap: number) {
  if (monthlyGap <= 0) return { months: Infinity, years: Infinity, unlimited: true };
  const months = balance / monthlyGap;
  return { months, years: months / 12, unlimited: false };
}

/** Level monthly savings required to reach an HSA target by a given age. */
export function hsaTargetContribution(hsa: HsaInputs, fromAge: number, byAge: number, target: number, returnPct?: number) {
  const r = (returnPct ?? hsa.returnPct) / 100 / 12;
  const n = Math.max(1, Math.round((byAge - fromAge) * 12));
  const grown = hsa.balance * Math.pow(1 + r, n);
  const need = Math.max(0, target - grown);
  const factor = r === 0 ? n : (Math.pow(1 + r, n) - 1) / r;
  return need / factor;
}

/* ----------------------------------------------------------------------- */
/* Funding waterfall                                                        */
/* ----------------------------------------------------------------------- */

export interface WaterfallLayer {
  key: 'cost' | 'reimbursement' | 'cash' | 'hsa' | 'income' | 'portfolio' | 'partnership';
  label: string;
  amount: number;
  /** Amount still unfunded after this layer. */
  remaining: number;
  note?: string;
}

export interface WaterfallResult {
  age: number;
  weeklyHours: number;
  hourlyRate: number;
  monthlyCost: number;
  planMax: number;
  reimbursement: number;
  cashBenefit: number;
  cashApplied: number;
  hsaBalance: number;
  hsaSupport: number;
  incomeSupport: number;
  portfolioGap: number;
  layers: WaterfallLayer[];
  /** Share of cost transferred to insurance. */
  insurancePct: number;
  hsaPct: number;
  householdPct: number;
  portfolioPct: number;
}

export interface WaterfallOpts {
  careInflationPct?: number;
  planInflationPct?: number;
  cashBenefitPct?: number;
  /** Force cash-benefit stacking regardless of state (used for both gap views). */
  includeCash?: boolean;
  hsaBalanceOverride?: number;
  careMonthsOverride?: number;
  /** Force the starting plan maximum (0 models "no LTC insurance"). */
  planMaxToday?: number;
  /** Price the care at a specific agency hourly rate instead of the projected blended rate. */
  hourlyRateOverride?: number;
}

export function waterfallAt(
  h: LtcHousehold,
  g: GapStrategyState,
  age: number,
  weeklyHours: number,
  policy?: LtcPolicy,
  opts?: WaterfallOpts,
): WaterfallResult {
  const point = carePlanAt(h, age, weeklyHours, {
    careInflationPct: opts?.careInflationPct,
    planInflationPct: opts?.planInflationPct ?? policy?.inflationPct ?? PLAN_INFLATION_PCT,
    planMaxToday: opts?.planMaxToday ?? policy?.startingMonthlyBenefit ?? PLAN_MAX_MONTHLY,
  });
  const cashPct = opts?.cashBenefitPct ?? policy?.cashBenefitPct ?? SUPPORT_COST_PCT;
  const cashBenefit = point.planMax * (cashPct / 100);
  const stack = opts?.includeCash ?? g.stackCash === 'yes';

  const careMonths = opts?.careMonthsOverride ?? g.careMonths;
  const hsaBalance = opts?.hsaBalanceOverride ?? projectHsa(g.hsa, h.lymanAge, age);
  const hsaCapacity = hsaMonthlyCapacity(hsaBalance, careMonths);

  const hourlyRate = opts?.hourlyRateOverride ?? point.hourlyRate;
  const cost = opts?.hourlyRateOverride
    ? monthlyCostFromHours(weeklyHours, opts.hourlyRateOverride)
    : point.monthlyCost;
  const reimbursement = Math.min(point.planMax, cost);
  let remaining = Math.max(0, cost - reimbursement);

  const cashApplied = stack ? Math.min(cashBenefit, remaining) : 0;
  remaining -= cashApplied;

  const hsaSupport = Math.min(hsaCapacity, remaining);
  remaining -= hsaSupport;

  const incomeSupport = Math.min(g.retirementIncomeForLtc, remaining);
  remaining -= incomeSupport;

  const portfolioGap = Math.max(0, remaining);

  const pct = (n: number) => (cost > 0 ? (n / cost) * 100 : 0);

  return {
    age, weeklyHours, hourlyRate, monthlyCost: cost, planMax: point.planMax,
    reimbursement, cashBenefit, cashApplied, hsaBalance, hsaSupport, incomeSupport, portfolioGap,
    insurancePct: pct(reimbursement + cashApplied),
    hsaPct: pct(hsaSupport),
    householdPct: pct(incomeSupport + portfolioGap),
    portfolioPct: pct(portfolioGap),
    layers: [
      { key: 'cost', label: 'Projected care cost', amount: cost, remaining: cost, note: `${weeklyHours} hrs/wk @ $${hourlyRate.toFixed(2)}/hr` },
      { key: 'reimbursement', label: 'LTC reimbursement', amount: reimbursement, remaining: Math.max(0, cost - reimbursement), note: `Plan maximum $${Math.round(point.planMax).toLocaleString()}/mo` },
      { key: 'cash', label: '25% cash benefit', amount: cashApplied, remaining: Math.max(0, cost - reimbursement - cashApplied), note: stack ? 'Confirmed additive' : `Not applied — stacking ${STACK_LABEL[g.stackCash].toLowerCase()}` },
      { key: 'hsa', label: 'HSA withdrawal', amount: hsaSupport, remaining: Math.max(0, cost - reimbursement - cashApplied - hsaSupport), note: `${careMonths}-month draw from $${Math.round(hsaBalance).toLocaleString()}` },
      { key: 'income', label: 'Retirement income allocated', amount: incomeSupport, remaining: portfolioGap, note: 'Income earmarked for LTC only' },
      { key: 'portfolio', label: 'True portfolio gap', amount: portfolioGap, remaining: portfolioGap, note: 'Last funding source' },
    ],
  };
}

/** Conservative (no cash stacking) and optimistic (cash stacks) views. */
export function dualGap(
  h: LtcHousehold, g: GapStrategyState, age: number, weeklyHours: number,
  policy?: LtcPolicy, opts?: WaterfallOpts,
) {
  const conservative = waterfallAt(h, g, age, weeklyHours, policy, { ...opts, includeCash: false });
  const optimistic = waterfallAt(h, g, age, weeklyHours, policy, { ...opts, includeCash: true });
  return { conservative, optimistic, showBoth: g.stackCash === 'unknown' };
}

export function hourTierWaterfalls(
  h: LtcHousehold, g: GapStrategyState, age: number, policy?: LtcPolicy, opts?: WaterfallOpts,
) {
  return HOUR_TIERS.map((hrs) => waterfallAt(h, g, age, hrs, policy, opts));
}

/* ----------------------------------------------------------------------- */
/* Elimination period                                                       */
/* ----------------------------------------------------------------------- */

export interface EliminationPlan {
  days: number;
  months: number;
  careCost: number;
  supportCost: number;
  total: number;
  cashAvailable: number;
  incomeAvailable: number;
  hsaNeeded: number;
  hsaAvailable: number;
  covered: boolean;
}

export function eliminationPlan(
  h: LtcHousehold, g: GapStrategyState, age: number, weeklyHours: number, policy?: LtcPolicy,
): EliminationPlan {
  const w = waterfallAt(h, g, age, weeklyHours, policy, { includeCash: false });
  const days = policy?.eliminationDays ?? 90;
  const months = days / 30;
  const careCost = w.monthlyCost * months;
  const supportCost = w.monthlyCost * (SUPPORT_COST_PCT / 100) * months;
  const total = careCost + supportCost;
  const cashAvailable = g.cashPaysDuringElimination ? w.cashBenefit * months : 0;
  const incomeAvailable = g.retirementIncomeForLtc * months;
  const hsaNeeded = Math.max(0, total - cashAvailable - incomeAvailable);
  return {
    days, months, careCost, supportCost, total, cashAvailable, incomeAvailable,
    hsaNeeded, hsaAvailable: w.hsaBalance, covered: w.hsaBalance >= hsaNeeded,
  };
}

/* ----------------------------------------------------------------------- */
/* Care progression                                                         */
/* ----------------------------------------------------------------------- */

export const PROGRESSION_SCENARIOS: Record<'moderate' | 'higher', number[]> = {
  moderate: [10, 20, 30],
  higher: [20, 30, 40],
};

export interface ProgressionRow {
  year: number;
  age: number;
  weeklyHours: number;
  careCost: number;
  reimbursement: number;
  cashBenefit: number;
  hsaUsed: number;
  hsaRemaining: number;
  incomeUsed: number;
  portfolioWithdrawal: number;
}

export function simulateGapProgression(
  h: LtcHousehold, g: GapStrategyState, startAge: number, hours: number[],
  policy?: LtcPolicy, opts?: WaterfallOpts,
): ProgressionRow[] {
  let hsa = opts?.hsaBalanceOverride ?? projectHsa(g.hsa, h.lymanAge, startAge);
  return hours.map((hrs, i) => {
    const age = startAge + i;
    const w = waterfallAt(h, g, age, hrs, policy, { ...opts, hsaBalanceOverride: hsa });
    const hsaUsed = Math.min(hsa, w.hsaSupport * 12);
    hsa = Math.max(0, hsa - hsaUsed);
    return {
      year: i + 1, age, weeklyHours: hrs,
      careCost: w.monthlyCost * 12,
      reimbursement: w.reimbursement * 12,
      cashBenefit: w.cashBenefit * 12,
      hsaUsed, hsaRemaining: hsa,
      incomeUsed: w.incomeSupport * 12,
      portfolioWithdrawal: w.portfolioGap * 12,
    };
  });
}

/* ----------------------------------------------------------------------- */
/* Stress test                                                              */
/* ----------------------------------------------------------------------- */

export interface StressRow {
  label: string;
  careInflationPct: number;
  claimAge: number;
  careYears: number;
  totalCost: number;
  insurancePaid: number;
  hsaPaid: number;
  incomePaid: number;
  portfolioPaid: number;
  sufficient: boolean;
}

export function stressTest(
  h: LtcHousehold, g: GapStrategyState, weeklyHours: number, policy?: LtcPolicy,
): StressRow[] {
  const combos: { label: string; inf: number; age: number; years: number }[] = [];
  for (const inf of [3, 4, 5]) {
    for (const age of [75, 80, 85]) {
      for (const years of [3, 5]) {
        combos.push({ label: `${inf}% inflation · care at ${age} · ${years}-year event`, inf, age, years });
      }
    }
  }
  return combos.map((c) => {
    let hsa = projectHsa(g.hsa, h.lymanAge, c.age);
    let cost = 0, ins = 0, hsaPaid = 0, income = 0, portfolio = 0;
    for (let y = 0; y < c.years; y++) {
      const w = waterfallAt(h, g, c.age + y, weeklyHours, policy, {
        careInflationPct: c.inf, hsaBalanceOverride: hsa, careMonthsOverride: c.years * 12,
      });
      cost += w.monthlyCost * 12;
      ins += (w.reimbursement + w.cashApplied) * 12;
      const used = Math.min(hsa, w.hsaSupport * 12);
      hsaPaid += used; hsa = Math.max(0, hsa - used);
      income += w.incomeSupport * 12;
      portfolio += w.portfolioGap * 12;
    }
    return {
      label: c.label, careInflationPct: c.inf, claimAge: c.age, careYears: c.years,
      totalCost: cost, insurancePaid: ins, hsaPaid, incomePaid: income, portfolioPaid: portfolio,
      sufficient: portfolio <= cost * 0.1,
    };
  });
}

/* ----------------------------------------------------------------------- */
/* Opportunity cost                                                         */
/* ----------------------------------------------------------------------- */

export const OPPORTUNITY_YEARS = [10, 15, 20, 25] as const;
export const OPPORTUNITY_RETURNS = [6, 7, 8, 9] as const;

/** Future value of investing the premium difference instead of buying more coverage. */
export function premiumOpportunity(monthly: number, years: number, returnPct: number) {
  const r = returnPct / 100 / 12;
  const n = years * 12;
  const fv = r === 0 ? monthly * n : monthly * ((Math.pow(1 + r, n) - 1) / r);
  return { contributed: monthly * n, value: fv, growth: fv - monthly * n };
}

/* ----------------------------------------------------------------------- */
/* Partnership backstop                                                     */
/* ----------------------------------------------------------------------- */

export function partnershipProtection(policy: LtcPolicy | undefined, h: LtcHousehold, claimAge: number, careYears: number) {
  if (!policy?.partnershipQualified) {
    return { qualified: false, benefitsPaid: 0, assetDisregard: 0, assetsProtected: 0 };
  }
  const years = Math.max(0, claimAge - h.lymanAge);
  const monthly = policy.startingMonthlyBenefit * inflationFactor(policy.inflationPct, years, policy.inflationCompound);
  const benefitsPaid = Math.min(policy.benefitPeriodMonths, careYears * 12) * monthly;
  return {
    qualified: true,
    benefitsPaid,
    // Ohio Partnership: dollar-for-dollar asset disregard on benefits paid.
    assetDisregard: benefitsPaid,
    assetsProtected: benefitsPaid,
  };
}

/* ----------------------------------------------------------------------- */
/* Recommendation                                                           */
/* ----------------------------------------------------------------------- */

export type ProtectionBand =
  | 'fullyFunded' | 'stronglyProtected' | 'balanced' | 'elevated' | 'significant';

export const PROTECTION_LABEL: Record<ProtectionBand, string> = {
  fullyFunded: 'Fully Funded',
  stronglyProtected: 'Strongly Protected',
  balanced: 'Balanced Strategy',
  elevated: 'Elevated Portfolio Exposure',
  significant: 'Significant LTC Risk',
};

export const PROTECTION_NOTE: Record<ProtectionBand, string> = {
  fullyFunded: 'No meaningful portfolio exposure.',
  stronglyProtected: 'Most care expense is funded from insurance and the HSA.',
  balanced: 'Insurance + HSA + income cover a meaningful portion; portfolio exposure is manageable.',
  elevated: 'Additional savings or coverage should be considered.',
  significant: 'Projected costs could materially impair retirement assets.',
};

export function protectionBand(w: WaterfallResult): ProtectionBand {
  const p = w.portfolioPct;
  if (p <= 1) return 'fullyFunded';
  if (p <= 10) return 'stronglyProtected';
  if (p <= 25) return 'balanced';
  if (p <= 45) return 'elevated';
  return 'significant';
}

export interface Verdict {
  band: ProtectionBand;
  moreInsuranceNeeded: boolean;
  reasons: string[];
  hsaMonths: number;
}

export function strategyVerdict(
  h: LtcHousehold, g: GapStrategyState, age: number, weeklyHours: number, policy?: LtcPolicy,
): Verdict {
  const w = waterfallAt(h, g, age, weeklyHours, policy, { includeCash: g.stackCash === 'yes' });
  const band = protectionBand(w);
  const dur = hsaCoverageDuration(w.hsaBalance, w.portfolioGap);
  const opp = premiumOpportunity(g.opportunity.premiumDelta, Math.max(1, age - h.lymanAge), g.opportunity.returnPct);
  const reasons: string[] = [];

  reasons.push(`Insurance transfers ${w.insurancePct.toFixed(0)}% of the projected ${weeklyHours} hrs/wk cost at age ${age}.`);
  reasons.push(`The HSA funds ${w.hsaPct.toFixed(0)}% and can carry the residual gap for ${dur.unlimited ? 'the full care event' : `${Math.round(dur.months)} months`}.`);
  reasons.push(`Retirement income covers $${Math.round(w.incomeSupport).toLocaleString()}/mo, leaving $${Math.round(w.portfolioGap).toLocaleString()}/mo for the portfolio.`);
  reasons.push(`Investing the $${g.opportunity.premiumDelta}/mo premium difference instead would be worth $${Math.round(opp.value).toLocaleString()} by age ${age}.`);
  if (policy?.partnershipQualified) reasons.push('Ohio Partnership status adds a catastrophic asset-protection backstop.');
  if (g.stackCash === 'unknown') reasons.push('Cash-benefit stacking is unconfirmed — the conservative gap excludes it.');

  const moreInsuranceNeeded =
    (band === 'elevated' || band === 'significant') &&
    opp.value < w.portfolioGap * 12 * Math.max(1, g.careMonths / 12);

  return { band, moreInsuranceNeeded, reasons, hsaMonths: dur.unlimited ? Infinity : dur.months };
}

/* ----------------------------------------------------------------------- */
/* Combined care protection                                                 */
/* ----------------------------------------------------------------------- */

export function combinedProtection(policy: LtcPolicy | undefined, h: LtcHousehold, g: GapStrategyState, age: number) {
  const years = Math.max(0, age - h.lymanAge);
  const pool = policy
    ? policy.poolEach * inflationFactor(policy.inflationPct, years, policy.inflationCompound)
    : PLAN_MAX_MONTHLY * 36 * inflationFactor(PLAN_INFLATION_PCT, years, true);
  const hsa = projectHsa(g.hsa, h.lymanAge, age);
  const total = pool + hsa;
  return {
    insurancePool: pool,
    hsaBalance: hsa,
    total,
    insurancePct: total > 0 ? (pool / total) * 100 : 0,
    hsaPct: total > 0 ? (hsa / total) * 100 : 0,
  };
}

/** LTC + HSA vs LTC only vs no LTC over a care event. */
export function portfolioComparison(
  h: LtcHousehold, g: GapStrategyState, claimAge: number, careYears: number, weeklyHours: number, policy?: LtcPolicy,
) {
  const run = (useIns: boolean, useHsa: boolean) => {
    let hsa = useHsa ? projectHsa(g.hsa, h.lymanAge, claimAge) : 0;
    let cost = 0, ins = 0, hsaPaid = 0, income = 0, portfolio = 0;
    for (let y = 0; y < careYears; y++) {
      const w = waterfallAt(h, g, claimAge + y, weeklyHours, useIns ? policy : undefined, {
        hsaBalanceOverride: hsa,
        careMonthsOverride: careYears * 12,
        planMaxToday: useIns ? undefined : 0,
      });
      const insPaid = useIns ? (w.reimbursement + w.cashApplied) * 12 : 0;
      cost += w.monthlyCost * 12;
      ins += insPaid;
      const gapAnnual = w.monthlyCost * 12 - insPaid;
      const hsaUse = useHsa ? Math.min(hsa, Math.min(gapAnnual, w.hsaSupport * 12)) : 0;
      hsa = Math.max(0, hsa - hsaUse);
      hsaPaid += hsaUse;
      const incomeUse = Math.min(g.retirementIncomeForLtc * 12, Math.max(0, gapAnnual - hsaUse));
      income += incomeUse;
      portfolio += Math.max(0, gapAnnual - hsaUse - incomeUse);
    }
    return {
      totalCost: cost, insurancePaid: ins, hsaPaid, incomePaid: income, portfolioPaid: portfolio,
      preserved: Math.max(0, h.retirementBalance - portfolio),
      transferredPct: cost > 0 ? (ins / cost) * 100 : 0,
      selfFundedPct: cost > 0 ? ((hsaPaid + income + portfolio) / cost) * 100 : 0,
    };
  };
  return {
    ltcAndHsa: run(true, true),
    ltcOnly: run(true, false),
    noLtc: run(false, false),
  };
}

/* ----------------------------------------------------------------------- */
/* Planned care hours (real hours, not fixed tiers)                          */
/* ----------------------------------------------------------------------- */

/** Comparison tiers built AROUND the real planned hours instead of 10/20/30/40. */
export function plannedHourTiers(planned: number, step = 5, spread = 2): number[] {
  const p = Math.max(1, Math.round(planned));
  const set = new Set<number>([p]);
  for (let i = 1; i <= spread; i++) {
    if (p - i * step >= 1) set.add(p - i * step);
    set.add(p + i * step);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/* ----------------------------------------------------------------------- */
/* Cash benefit — end to end                                                */
/* ----------------------------------------------------------------------- */

export interface CashJourneyRow {
  key: string;
  label: string;
  months: number;
  age: number;
  careCost: number;
  supportCosts: number;
  cashPaid: number;
  cashToSupport: number;
  cashToGap: number;
  cashUnused: number;
  gapWithoutCash: number;
  gapWithCash: number;
}

export interface CashJourney {
  cashPct: number;
  monthlyCash: number;
  rows: CashJourneyRow[];
  totals: {
    cashPaid: number;
    cashToSupport: number;
    cashToGap: number;
    cashUnused: number;
    gapWithoutCash: number;
    gapWithCash: number;
    portfolioSaved: number;
  };
  /** Portfolio dollars preserved, grown at the opportunity return over the horizon. */
  savedWithGrowth: number;
  /** True when the cash benefit is confirmed payable alongside reimbursement. */
  stacks: boolean;
  eliminationCovered: boolean;
}

/**
 * Walks the cash benefit from the first day of the elimination period through the
 * end of the care event: what is paid, what it actually funds, and what it saves.
 */
export function cashBenefitJourney(
  h: LtcHousehold, g: GapStrategyState, claimAge: number, weeklyHours: number, policy?: LtcPolicy,
): CashJourney {
  const cashPct = policy?.cashBenefitPct ?? SUPPORT_COST_PCT;
  const years = Math.max(1, Math.round(g.stress.careYears || 3));
  const rows: CashJourneyRow[] = [];
  const stacks = g.stackCash === 'yes';
  let hsa = projectHsa(g.hsa, h.lymanAge, claimAge);

  const elimMonths = (policy?.eliminationDays ?? 90) / 30;
  const w0 = waterfallAt(h, g, claimAge, weeklyHours, policy, { includeCash: false, hsaBalanceOverride: hsa });
  const elimCost = w0.monthlyCost * elimMonths;
  const elimSupport = w0.monthlyCost * (SUPPORT_COST_PCT / 100) * elimMonths;
  const elimCash = g.cashPaysDuringElimination ? w0.cashBenefit * elimMonths : 0;
  // During the wait there is no reimbursement, so the full cost is the gap.
  const elimGapNo = elimCost + elimSupport;
  const elimToSupport = Math.min(elimCash, elimSupport);
  const elimToGap = Math.min(elimCash - elimToSupport, elimCost);
  rows.push({
    key: 'elimination',
    label: `Elimination period — first ${policy?.eliminationDays ?? 90} days`,
    months: elimMonths, age: claimAge,
    careCost: elimCost, supportCosts: elimSupport,
    cashPaid: elimCash, cashToSupport: elimToSupport, cashToGap: elimToGap,
    cashUnused: Math.max(0, elimCash - elimToSupport - elimToGap),
    gapWithoutCash: elimGapNo,
    gapWithCash: Math.max(0, elimGapNo - elimToSupport - elimToGap),
  });

  for (let y = 0; y < years; y++) {
    const age = claimAge + y;
    const wNo = waterfallAt(h, g, age, weeklyHours, policy, { includeCash: false, hsaBalanceOverride: hsa });
    const careCost = wNo.monthlyCost * 12;
    const support = wNo.monthlyCost * (SUPPORT_COST_PCT / 100) * 12;
    // Once reimbursement starts, the cash benefit only helps if the contract lets it stack.
    const cashPaid = stacks ? wNo.cashBenefit * 12 : 0;
    // Insurance reimburses first; the household still owes the gap plus support costs.
    const gapNo = Math.max(0, careCost - wNo.reimbursement * 12) + support;
    const toSupport = Math.min(cashPaid, support);
    const toGap = Math.min(cashPaid - toSupport, Math.max(0, careCost - wNo.reimbursement * 12));
    rows.push({
      key: `y${y}`,
      label: `Claim year ${y + 1} — age ${age}`,
      months: 12, age,
      careCost, supportCosts: support,
      cashPaid, cashToSupport: toSupport, cashToGap: toGap,
      cashUnused: Math.max(0, cashPaid - toSupport - toGap),
      gapWithoutCash: gapNo,
      gapWithCash: Math.max(0, gapNo - toSupport - toGap),
    });
    const hsaUse = Math.min(hsa, wNo.hsaSupport * 12);
    hsa = Math.max(0, hsa - hsaUse);
  }

  const sum = (k: keyof CashJourneyRow) => rows.reduce((a, r) => a + (r[k] as number), 0);
  const cashToSupport = sum('cashToSupport');
  const cashToGap = sum('cashToGap');
  const gapWithoutCash = sum('gapWithoutCash');
  const gapWithCash = sum('gapWithCash');
  const portfolioSaved = Math.max(0, gapWithoutCash - gapWithCash);
  const r = (g.opportunity.returnPct || 0) / 100;
  const horizon = elimMonths / 12 + years;
  return {
    cashPct,
    monthlyCash: w0.cashBenefit,
    rows,
    totals: {
      cashPaid: sum('cashPaid'), cashToSupport, cashToGap, cashUnused: sum('cashUnused'),
      gapWithoutCash, gapWithCash, portfolioSaved,
    },
    savedWithGrowth: portfolioSaved * Math.pow(1 + r, Math.max(0, horizon)),
    eliminationCovered: rows[0].gapWithCash <= (g.retirementIncomeForLtc * elimMonths + hsa),
  };
}
