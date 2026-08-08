// Longevity Dividend™ engine
// Turns daily health behaviour into (a) a health-adjusted planning horizon that
// retirement projections can consume, and (b) the dollar value of that health.
// Educational estimates only — not medical or investment advice.

import {
  ageFrom,
  bmi,
  type DailyLog,
  type HealthProfile,
  type ScoreBreakdown,
  type WeightStatus,
} from './healthEngine';
import type { ConsistencySummary } from './consistency';

// ---------------------------------------------------------------- horizon link

export type HorizonDriver = {
  label: string;
  years: number; // signed contribution to the planning age
  note: string;
};

export type HealthHorizon = {
  age: number;
  /** Family-history / actuarial starting point before behaviour adjustments. */
  baselineAge: number;
  /** Health-adjusted age retirement plans should fund to. */
  planningAge: number;
  /** planningAge - baselineAge (can be negative). */
  extraYears: number;
  /** Age through which independent, healthy living is projected. */
  healthspanAge: number;
  /** Projected years of high-support / frail living at the end of life. */
  frailYears: number;
  /** 0..1 composite of weight progress + habit consistency + movement. */
  healthFactor: number;
  confidence: 'low' | 'medium' | 'high';
  drivers: HorizonDriver[];
  loggedDays: number;
  hasData: boolean;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const round1 = (n: number) => Math.round(n * 10) / 10;

export type HorizonOptions = {
  /** Family-history horizon floor. Montgomery household default is 100. */
  baselineAge?: number;
};

/**
 * Health-adjusted planning horizon.
 *
 * baseline (family history) + weight normalisation + habit consistency
 * + movement volume - elevated-BMI drag, clamped to a defensible 85-110 band.
 */
export function healthAdjustedHorizon(
  profile: HealthProfile | null,
  status: WeightStatus | null,
  score: ScoreBreakdown,
  consistency: ConsistencySummary | null,
  logs: DailyLog[] = [],
  opts: HorizonOptions = {},
): HealthHorizon {
  const baselineAge = opts.baselineAge ?? 100;
  const age = ageFrom(profile?.birth_date) ?? 59;

  const excess = status ? Math.max(0, status.current - status.goal) : 0;
  const removed = status ? status.lost : 0;
  const totalToRemove = Math.max(1, removed + excess);
  const weightFactor = clamp(removed / totalToRemove, 0, 1);

  const habitFactor = consistency && consistency.hasData
    ? clamp(consistency.pct30 / 100, 0, 1)
    : clamp(score.total / 100, 0, 1);

  const movementFactor = consistency && consistency.hasData
    ? clamp(consistency.weekHitRate.movement ?? 0, 0, 1)
    : clamp(score.walking / 30, 0, 1);

  const bmiNow = status?.bmi ?? (profile ? bmi(profile.current_weight, profile.height_inches) : null);
  // Each BMI point above 27 shaves roughly a third of a year off the horizon.
  const bmiDrag = bmiNow != null ? clamp((bmiNow - 27) * 0.35, 0, 4) : 0;

  const drivers: HorizonDriver[] = [
    {
      label: 'Family-history baseline',
      years: baselineAge,
      note: 'Starting horizon before behaviour adjustments.',
    },
    {
      label: 'Weight normalisation',
      years: round1(weightFactor * 4),
      note: `${Math.round(weightFactor * 100)}% of the way to goal weight.`,
    },
    {
      label: 'Habit consistency',
      years: round1(habitFactor * 3),
      note: `${Math.round(habitFactor * 100)}% habit completion (30-day).`,
    },
    {
      label: 'Movement volume',
      years: round1(movementFactor * 2),
      note: `${Math.round(movementFactor * 100)}% of days with logged movement.`,
    },
    {
      label: 'Elevated BMI drag',
      years: -round1(bmiDrag),
      note: bmiNow != null ? `Current BMI ${bmiNow.toFixed(1)}.` : 'No BMI on file.',
    },
  ];

  const planningAge = clamp(
    baselineAge + weightFactor * 4 + habitFactor * 3 + movementFactor * 2 - bmiDrag,
    85,
    110,
  );

  // Compressed morbidity: better habits shorten the frail tail (6 yrs → 3 yrs).
  const frailYears = round1(6 - 3 * ((habitFactor + weightFactor) / 2));
  const healthspanAge = round1(planningAge - frailYears);

  const loggedDays = logs.length;
  const confidence: HealthHorizon['confidence'] =
    loggedDays >= 60 ? 'high' : loggedDays >= 21 ? 'medium' : 'low';

  return {
    age,
    baselineAge,
    planningAge: round1(planningAge),
    extraYears: round1(planningAge - baselineAge),
    healthspanAge,
    frailYears,
    healthFactor: clamp((weightFactor + habitFactor + movementFactor) / 3, 0, 1),
    confidence,
    drivers,
    loggedDays,
    hasData: !!profile && loggedDays > 0,
  };
}

// -------------------------------------------------------------- the dividend

export type LongevityDividendInputs = {
  horizon: HealthHorizon;
  netWorth: number;
  investableAssets: number;
  annualContribution: number;
  annualRetirementSpend: number;
  retirementAge?: number;
  returnRate?: number;
  guaranteedIncomeAnnual?: number;
};

export type DecadeRow = {
  label: string;
  age: number;
  healthcareBaseline: number;
  healthcareAdjusted: number;
  portfolio: number;
};

export type LongevityDividend = {
  // healthcare
  healthcareBaselineAnnual: number;
  healthcareAdjustedAnnual: number;
  healthcareAnnualSaved: number;
  healthcareLifetimeSaved: number;
  // long-term care
  ltcRiskBaselinePct: number;
  ltcRiskAdjustedPct: number;
  ltcExpectedBaseline: number;
  ltcExpectedAdjusted: number;
  ltcSaved: number;
  // earning capacity
  extraWorkingYears: number;
  extraWorkingValue: number;
  // portfolio / legacy
  portfolioAtRetirement: number;
  legacyAtBaselineHorizon: number;
  legacyAtHealthHorizon: number;
  legacyDelta: number;
  fundedThroughAge: number | null;
  moneyOutlivesYou: boolean;
  // headline
  totalDividend: number;
  decades: DecadeRow[];
  headline: string;
};

/** National averages used as the educational baseline. */
const HEALTHCARE_BASELINE_ANNUAL = 7_000; // retiree out-of-pocket + premiums
const HEALTHCARE_INFLATION = 0.045;
const LTC_BASELINE_RISK = 0.70; // lifetime chance of needing significant LTC after 65
const LTC_ANNUAL_COST = 108_000; // semi-private nursing facility
const LTC_BASELINE_DURATION = 2.2; // years

export function longevityDividend(i: LongevityDividendInputs): LongevityDividend {
  const h = i.horizon;
  const retirementAge = i.retirementAge ?? 75;
  const r = i.returnRate ?? 0.08;
  const hf = h.healthFactor;

  // ---- healthcare cost curve
  const healthcareBaselineAnnual = HEALTHCARE_BASELINE_ANNUAL;
  const healthcareAdjustedAnnual = HEALTHCARE_BASELINE_ANNUAL * (1 - 0.28 * hf);
  const healthcareAnnualSaved = healthcareBaselineAnnual - healthcareAdjustedAnnual;

  const yearsFrom65 = Math.max(0, h.planningAge - Math.max(65, h.age));
  let healthcareLifetimeSaved = 0;
  for (let y = 0; y < Math.round(yearsFrom65); y += 1) {
    healthcareLifetimeSaved += healthcareAnnualSaved * (1 + HEALTHCARE_INFLATION) ** y;
  }

  // ---- long-term care risk
  const ltcRiskBaselinePct = LTC_BASELINE_RISK * 100;
  const ltcRiskAdjustedPct = Math.max(35, LTC_BASELINE_RISK * 100 - 20 * hf);
  const adjustedDuration = Math.max(1, LTC_BASELINE_DURATION * (h.frailYears / 6));
  const ltcExpectedBaseline = LTC_BASELINE_RISK * LTC_BASELINE_DURATION * LTC_ANNUAL_COST;
  const ltcExpectedAdjusted = (ltcRiskAdjustedPct / 100) * adjustedDuration * LTC_ANNUAL_COST;
  const ltcSaved = Math.max(0, ltcExpectedBaseline - ltcExpectedAdjusted);

  // ---- earning / contribution capacity (healthy people can work longer)
  const extraWorkingYears = round1(hf * 3);
  let extraWorkingValue = 0;
  for (let y = 0; y < Math.round(extraWorkingYears); y += 1) {
    const yearsToGrow = Math.max(0, h.planningAge - retirementAge - y);
    extraWorkingValue += i.annualContribution * (1 + r) ** yearsToGrow;
  }

  // ---- portfolio path to each horizon
  const guaranteed = i.guaranteedIncomeAnnual ?? 0;
  const decades: DecadeRow[] = [];
  let balance = Math.max(0, i.investableAssets);
  let fundedThroughAge: number | null = null;
  let legacyAtBaselineHorizon = 0;
  let legacyAtHealthHorizon = 0;
  const endAge = Math.max(h.baselineAge, h.planningAge);

  for (let a = Math.round(h.age); a <= Math.round(endAge); a += 1) {
    const working = a < retirementAge;
    const spend = working
      ? 0
      : Math.max(0, i.annualRetirementSpend - guaranteed) +
        (a >= 65 ? healthcareAdjustedAnnual : 0);
    balance = balance * (1 + r) + (working ? i.annualContribution : 0) - spend;
    if (balance <= 0) {
      balance = 0;
      if (fundedThroughAge === null) fundedThroughAge = a - 1;
    }
    if (a === Math.round(h.baselineAge)) legacyAtBaselineHorizon = balance;
    if (a === Math.round(h.planningAge)) legacyAtHealthHorizon = balance;
    if (a % 10 === 0 || a === Math.round(h.age)) {
      const yrs = Math.max(0, a - Math.max(65, h.age));
      decades.push({
        label: `Age ${a}`,
        age: a,
        healthcareBaseline:
          a >= 65 ? healthcareBaselineAnnual * (1 + HEALTHCARE_INFLATION) ** yrs : 0,
        healthcareAdjusted:
          a >= 65 ? healthcareAdjustedAnnual * (1 + HEALTHCARE_INFLATION) ** yrs : 0,
        portfolio: balance,
      });
    }
  }
  if (!legacyAtHealthHorizon && h.planningAge <= h.age) legacyAtHealthHorizon = balance;

  const totalDividend = healthcareLifetimeSaved + ltcSaved + extraWorkingValue;
  const moneyOutlivesYou = fundedThroughAge === null;

  const headline = moneyOutlivesYou
    ? `Your habits are worth about $${Math.round(totalDividend).toLocaleString('en-US')} and your plan already funds age ${Math.round(h.planningAge)}.`
    : `Your habits are worth about $${Math.round(totalDividend).toLocaleString('en-US')}, but the portfolio runs dry at age ${fundedThroughAge} — ${Math.max(0, Math.round(h.planningAge - (fundedThroughAge ?? 0)))} years short of your health-adjusted horizon.`;

  return {
    healthcareBaselineAnnual,
    healthcareAdjustedAnnual,
    healthcareAnnualSaved,
    healthcareLifetimeSaved,
    ltcRiskBaselinePct,
    ltcRiskAdjustedPct,
    ltcExpectedBaseline,
    ltcExpectedAdjusted,
    ltcSaved,
    extraWorkingYears,
    extraWorkingValue,
    portfolioAtRetirement: decades.find((d) => d.age >= retirementAge)?.portfolio ?? balance,
    legacyAtBaselineHorizon,
    legacyAtHealthHorizon,
    legacyDelta: legacyAtHealthHorizon - legacyAtBaselineHorizon,
    fundedThroughAge,
    moneyOutlivesYou,
    totalDividend,
    decades,
    headline,
  };
}
