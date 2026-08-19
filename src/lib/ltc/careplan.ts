// Hours-based LTC care plan engine.
//
// Plan of record: a MAXIMUM of $2,100 per month of insurance benefit, inflated
// 3% compound annually, purchasing 10 / 20 / 30 / 40 hours per week of in-home
// care. Agencies are shopped to work within that monthly maximum. Nothing here
// assumes 24/7 or full-time facility care.

import { inflationFactor, type LtcHousehold, type LtcPolicy } from './model';
import {
  HOUR_TIERS, WEEKS_PER_MONTH, coverageBand, monthlyCostFromHours, weeklyHoursCovered,
  type CoverageBand,
} from './location';

/** Monthly plan maximum today (per person). */
export const PLAN_MAX_MONTHLY = 2100;
/** Benefit inflation applied to the plan maximum. */
export const PLAN_INFLATION_PCT = 3;
/** Care-rate inflation used for the plan of record. */
export const CARE_INFLATION_PCT = 3;

export const PLAN_HOUR_TIERS = HOUR_TIERS;
export const PLAN_AGES = [65, 70, 75, 80, 85] as const;

/** Plan maximum grown from today to a target age at 3% compound. */
export function planMaxAtAge(currentAge: number, targetAge: number, inflationPct = PLAN_INFLATION_PCT) {
  const years = Math.max(0, targetAge - currentAge);
  return PLAN_MAX_MONTHLY * inflationFactor(inflationPct, years, true);
}

/** Today's blended in-home hourly rate from the household daily planning range. */
export function planHourlyRate(h: LtcHousehold) {
  const daily = ((h.dailyLow || 0) + (h.dailyHigh || 0)) / 2;
  return daily > 0 ? daily / 4.5 : 30;
}

export function hourlyRateAtAge(h: LtcHousehold, targetAge: number, careInflationPct?: number) {
  const years = Math.max(0, targetAge - h.lymanAge);
  const pct = careInflationPct ?? h.careCostGrowthPct ?? CARE_INFLATION_PCT;
  return planHourlyRate(h) * inflationFactor(pct, years, true);
}

export interface CarePlanPoint {
  age: number;
  years: number;
  weeklyHours: number;
  hourlyRate: number;
  monthlyCost: number;
  /** Inflated plan maximum available at that age. */
  planMax: number;
  /** What the plan actually pays (lesser of cost and plan maximum). */
  planPays: number;
  monthlyShare: number;
  annualShare: number;
  coveragePct: number;
  band: CoverageBand;
  /** Hours per week the plan maximum fully buys at that rate. */
  hoursCovered: number;
  /** True when the plan maximum absorbs the whole need at these hours. */
  withinPlanMax: boolean;
}

export function carePlanAt(
  h: LtcHousehold,
  age: number,
  weeklyHours: number,
  opts?: { careInflationPct?: number; planInflationPct?: number; planMaxToday?: number },
): CarePlanPoint {
  const years = Math.max(0, age - h.lymanAge);
  const hourlyRate = hourlyRateAtAge(h, age, opts?.careInflationPct);
  const planMax = (opts?.planMaxToday ?? PLAN_MAX_MONTHLY)
    * inflationFactor(opts?.planInflationPct ?? PLAN_INFLATION_PCT, years, true);
  const monthlyCost = monthlyCostFromHours(weeklyHours, hourlyRate);
  const planPays = Math.min(planMax, monthlyCost);
  const monthlyShare = Math.max(0, monthlyCost - planPays);
  const coveragePct = monthlyCost > 0 ? (planPays / monthlyCost) * 100 : 100;
  return {
    age, years, weeklyHours, hourlyRate, monthlyCost, planMax, planPays,
    monthlyShare, annualShare: monthlyShare * 12,
    coveragePct, band: coverageBand(coveragePct),
    hoursCovered: weeklyHoursCovered(planMax, hourlyRate),
    withinPlanMax: monthlyCost <= planMax + 0.01,
  };
}

/** All four hour tiers at one age. */
export function carePlanTiers(h: LtcHousehold, age: number, opts?: Parameters<typeof carePlanAt>[3]) {
  return PLAN_HOUR_TIERS.map((hrs) => carePlanAt(h, age, hrs, opts));
}

/** Largest hour tier that still fits inside the inflated plan maximum. */
export function maxTierWithinPlan(h: LtcHousehold, age: number, opts?: Parameters<typeof carePlanAt>[3]) {
  const tiers = carePlanTiers(h, age, opts);
  const fits = tiers.filter((t) => t.withinPlanMax);
  return fits.length ? fits[fits.length - 1] : tiers[0];
}

/**
 * Target hourly rate an agency must accept for the selected hours to be fully
 * paid by the plan maximum — the number to negotiate with.
 */
export function targetAgencyRate(weeklyHours: number, planMax: number) {
  const monthlyHours = Math.max(1, weeklyHours * WEEKS_PER_MONTH);
  return planMax / monthlyHours;
}

/** Multi-year total share for a care event of `careYears` at fixed hours. */
export function carePlanEvent(
  h: LtcHousehold,
  claimAge: number,
  careYears: number,
  weeklyHours: number,
  opts?: Parameters<typeof carePlanAt>[3],
) {
  let cost = 0, paid = 0, share = 0;
  for (let y = 0; y < Math.max(0, careYears); y++) {
    const p = carePlanAt(h, claimAge + y, weeklyHours, opts);
    cost += p.monthlyCost * 12;
    paid += p.planPays * 12;
    share += p.monthlyShare * 12;
  }
  return { totalCost: cost, planPaid: paid, yourShare: share };
}

/** Does the current carrier quote deliver at least the plan maximum? */
export function policyMeetsPlanMax(policy: LtcPolicy | undefined) {
  if (!policy) return false;
  return policy.startingMonthlyBenefit >= PLAN_MAX_MONTHLY
    && policy.inflationPct >= PLAN_INFLATION_PCT
    && policy.inflationCompound;
}

/* ------------------------------------------------------------------------- */
/* 25% cash benefit (support costs)                                          */
/* ------------------------------------------------------------------------- */

/** Support costs (supplies, transport, respite, informal caregivers) as a share of care cost. */
export const SUPPORT_COST_PCT = 25;

export interface CashBenefitPoint {
  /** Cash-benefit percentage from the contract (25% on the plan of record). */
  pct: number;
  /** Monthly cash benefit at that age, inflated with the plan maximum. */
  cashMonthly: number;
  /** Estimated support costs at that age (25% of the care cost). */
  supportCost: number;
  /** Cash left after support costs — can be applied to the residual gap. */
  cashSurplus: number;
  /** Residual gap after cash is applied to it. */
  gapAfterCash: number;
  /** True when the cash benefit alone absorbs the support costs. */
  supportCovered: boolean;
  /**
   * Cash is an ALTERNATIVE to reimbursement on most contracts. When elected,
   * the month's benefit is the cash amount only, not the full plan maximum.
   */
  cashInsteadOfPlanShortfall: number;
}

/**
 * Model the 25% cash benefit against support costs and the residual gap.
 * `additive` = the contract confirms cash can be paid on top of reimbursement
 * (rare). Default false: cash is treated as an election, not a bonus.
 */
export function cashBenefitAt(
  point: CarePlanPoint,
  cashBenefitPct = SUPPORT_COST_PCT,
  opts?: { additive?: boolean; supportCostPct?: number },
): CashBenefitPoint {
  const pct = Math.max(0, cashBenefitPct);
  const cashMonthly = point.planMax * (pct / 100);
  const supportCost = point.monthlyCost * ((opts?.supportCostPct ?? SUPPORT_COST_PCT) / 100);
  const cashSurplus = Math.max(0, cashMonthly - supportCost);
  const gapAfterCash = opts?.additive
    ? Math.max(0, point.monthlyShare + supportCost - cashMonthly)
    : Math.max(0, point.monthlyShare + supportCost);
  return {
    pct, cashMonthly, supportCost, cashSurplus, gapAfterCash,
    supportCovered: cashMonthly >= supportCost,
    cashInsteadOfPlanShortfall: Math.max(0, point.planPays - cashMonthly),
  };
}
