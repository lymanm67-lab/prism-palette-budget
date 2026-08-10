/**
 * Montgomery Annual Travel Fund engine.
 *
 * Core cycle: take the trip in January → reset in February → save $500/month
 * February through the following January → $6,000 available for the next trip.
 * Unused funds roll forward. Travel money is never retirement money.
 */

export const TRAVEL_TIERS = {
  essential: 5000,
  target: 6000,
  enhanced: 7000,
} as const;

export const DEFAULT_MONTHLY_TARGET = 500;
export const TRAVEL_RESERVE_TARGET = 7000;

export const TRIP_BUDGET_CATEGORIES = [
  'Airfare',
  'Cruise',
  'Hotel',
  'Excursions',
  'Ground Transportation',
  'Rental Car',
  'Meals',
  'Travel Insurance',
  'Tips',
  'Baggage',
  'Parking',
  'Entertainment',
  'Shopping',
  'Emergency Travel Cash',
  'Other',
] as const;

export const FUNDING_CHECKLIST_ITEMS = [
  { key: 'airfare', label: 'Airfare funded' },
  { key: 'cruise', label: 'Cruise funded' },
  { key: 'hotel', label: 'Hotel funded' },
  { key: 'excursions', label: 'Excursions funded' },
  { key: 'transportation', label: 'Transportation funded' },
  { key: 'cash', label: 'Travel cash funded' },
  { key: 'insurance', label: 'Travel insurance reviewed' },
] as const;

export const BOOKING_CHECKLIST_ITEMS = [
  { key: 'airfare_booked', label: 'Airfare booked' },
  { key: 'cruise_booked', label: 'Cruise booked' },
  { key: 'hotel_booked', label: 'Hotel booked' },
  { key: 'excursions_booked', label: 'Excursions booked' },
  { key: 'transportation_booked', label: 'Transportation booked' },
  { key: 'insurance_purchased', label: 'Travel insurance purchased' },
  { key: 'passports_verified', label: 'Passports verified' },
  { key: 'documents_stored', label: 'Documents stored' },
] as const;

export const TRAVEL_FUND_RULES = [
  'Routine annual travel is not funded from retirement accounts.',
  'Routine annual travel does not create revolving credit-card debt.',
  'Travel is fully funded before departure.',
  'Unused travel funds roll forward to the next cycle.',
  'Travel funds stay separate from the emergency fund.',
  'Travel funds stay separate from retirement contributions.',
  'Travel savings are not counted as available discretionary cash.',
  'Business and personal travel expenses are never double counted.',
] as const;

export type FundingStatus =
  | 'NOT STARTED'
  | 'BUILDING'
  | '50% FUNDED'
  | '75% FUNDED'
  | 'FULLY FUNDED'
  | 'TRIP COMPLETED';

export interface TravelTrip {
  id: string;
  destination: string;
  travel_month: number;
  travel_year: number;
  depart_date: string | null;
  trip_type: 'personal' | 'business' | 'mixed' | string;
  status: string;
  budget_target: number;
  saved_amount: number;
  rollover_amount: number;
  monthly_contribution: number;
  savings_start_date: string | null;
  is_prepaid: boolean;
  actual_cost: number | null;
  completed_at: string | null;
  funding_checklist: Record<string, boolean>;
  booking: Record<string, any>;
  final_payment_due: string | null;
  notes: string | null;
}

export interface TravelSettings {
  monthly_target: number;
  essential_budget: number;
  target_budget: number;
  enhanced_budget: number;
  reserve_target: number;
  cycle_start_month: number;
  trip_month: number;
  inflation_pct: number;
  cost_history: { year: number; amount: number | null; label?: string }[];
}

export const DEFAULT_SETTINGS: TravelSettings = {
  monthly_target: DEFAULT_MONTHLY_TARGET,
  essential_budget: TRAVEL_TIERS.essential,
  target_budget: TRAVEL_TIERS.target,
  enhanced_budget: TRAVEL_TIERS.enhanced,
  reserve_target: TRAVEL_RESERVE_TARGET,
  cycle_start_month: 2,
  trip_month: 1,
  inflation_pct: 4,
  cost_history: [
    { year: 2023, amount: null },
    { year: 2024, amount: null },
    { year: 2025, amount: null },
    { year: 2026, amount: null },
    { year: 2027, amount: null, label: 'Hawaii — paid' },
  ],
};

export const money = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const money2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const monthName = (m: number) => MONTH_NAMES[Math.max(0, Math.min(11, m - 1))];

/** Whole months between now and the trip's travel month/year (never negative). */
export function monthsUntil(travelYear: number, travelMonth: number, from = new Date()): number {
  const diff = (travelYear - from.getFullYear()) * 12 + (travelMonth - (from.getMonth() + 1));
  return Math.max(0, diff);
}

export interface TripFunding {
  target: number;
  saved: number;
  remaining: number;
  pct: number;
  monthsRemaining: number;
  requiredMonthly: number;
  currentMonthly: number;
  onPace: boolean;
  status: FundingStatus;
  tiers: { label: string; amount: number; reached: boolean; pct: number }[];
}

export function tripFunding(trip: TravelTrip, settings: TravelSettings, now = new Date()): TripFunding {
  const target = trip.budget_target || settings.target_budget;
  const saved = trip.is_prepaid ? target : trip.saved_amount + trip.rollover_amount;
  const remaining = Math.max(0, target - saved);
  const pct = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const monthsRemaining = monthsUntil(trip.travel_year, trip.travel_month, now);
  const requiredMonthly = remaining === 0 ? 0 : monthsRemaining > 0 ? remaining / monthsRemaining : remaining;
  const currentMonthly = trip.monthly_contribution || settings.monthly_target;

  let status: FundingStatus;
  if (trip.status === 'completed') status = 'TRIP COMPLETED';
  else if (remaining <= 0) status = 'FULLY FUNDED';
  else if (pct >= 75) status = '75% FUNDED';
  else if (pct >= 50) status = '50% FUNDED';
  else if (saved > 0) status = 'BUILDING';
  else status = 'NOT STARTED';

  const tiers = [
    { label: 'Minimum Target Reached', amount: settings.essential_budget },
    { label: 'Annual Target Reached', amount: settings.target_budget },
    { label: 'Enhanced Travel Reserve Reached', amount: settings.enhanced_budget },
  ].map((t) => ({
    ...t,
    reached: saved >= t.amount,
    pct: t.amount > 0 ? Math.min(100, (saved / t.amount) * 100) : 0,
  }));

  return {
    target,
    saved,
    remaining,
    pct,
    monthsRemaining,
    requiredMonthly,
    currentMonthly,
    onPace: currentMonthly + 0.01 >= requiredMonthly,
    status,
  tiers,
  };
}

export interface ScheduleRow {
  month: number;
  year: number;
  label: string;
  contribution: number;
  cumulative: number;
  pctOfTarget: number;
}

/**
 * Builds the Feb→Jan savings ladder. Starts from `startMonth`/`startYear`,
 * seeded with any rollover balance.
 */
export function savingsSchedule(
  startMonth: number,
  startYear: number,
  monthly: number,
  target: number,
  rollover = 0,
  months = 12,
): ScheduleRow[] {
  const rows: ScheduleRow[] = [];
  let cumulative = rollover;
  let m = startMonth;
  let y = startYear;
  for (let i = 0; i < months; i++) {
    cumulative += monthly;
    rows.push({
      month: m,
      year: y,
      label: `${monthName(m)} ${y}`,
      contribution: monthly,
      cumulative,
      pctOfTarget: target > 0 ? Math.min(100, (cumulative / target) * 100) : 0,
    });
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return rows;
}

/** Rollover math after a completed trip. */
export function rolloverPlan(fundBalance: number, actualCost: number, nextTarget: number, months = 12) {
  const remaining = Math.max(0, fundBalance - actualCost);
  const stillNeeded = Math.max(0, nextTarget - remaining);
  return {
    rollover: remaining,
    additionalNeeded: stillNeeded,
    reducedMonthly: months > 0 ? stillNeeded / months : stillNeeded,
    keepFullMonthly: DEFAULT_MONTHLY_TARGET,
    reserveIfUnchanged: remaining + DEFAULT_MONTHLY_TARGET * months,
  };
}

/** Scenario comparison: required monthly savings for a set of trip budgets. */
export const SCENARIO_BUDGETS = [5000, 6000, 7000, 8000, 10000];

export function scenarioTable(months: number, saved = 0, budgets = SCENARIO_BUDGETS) {
  return budgets.map((b) => {
    const remaining = Math.max(0, b - saved);
    return {
      budget: b,
      remaining,
      months,
      requiredMonthly: months > 0 ? remaining / months : remaining,
    };
  });
}

/** Cost trend statistics from entered annual actuals. */
export function costTrend(history: { year: number; amount: number | null }[]) {
  const actuals = history.filter((h) => h.amount != null && h.amount > 0) as { year: number; amount: number }[];
  const sorted = [...actuals].sort((a, b) => a.year - b.year);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((s, n) => s + n, 0) / arr.length : 0);
  const last = (n: number) => sorted.slice(-n).map((h) => h.amount);
  const yoy =
    sorted.length >= 2
      ? ((sorted[sorted.length - 1].amount - sorted[sorted.length - 2].amount) /
          sorted[sorted.length - 2].amount) *
        100
      : null;
  return {
    count: sorted.length,
    average: avg(sorted.map((h) => h.amount)),
    threeYear: avg(last(3)),
    fiveYear: avg(last(5)),
    yoyPct: yoy,
    latest: sorted.length ? sorted[sorted.length - 1] : null,
  };
}

/** Inflation planner — recommend next year's target and monthly savings. */
export function inflationPlan(
  lastTripCost: number,
  currentFund: number,
  inflationPct: number,
  months = 12,
) {
  const estimatedNext = Math.round((lastTripCost * (1 + inflationPct / 100)) / 50) * 50;
  const needed = Math.max(0, estimatedNext - currentFund);
  return {
    estimatedNext,
    needed,
    recommendedMonthly: months > 0 ? Math.ceil(needed / months / 25) * 25 : needed,
  };
}

export interface GuardrailFlag {
  id: string;
  title: string;
  impact: string;
}

/** "REVIEW FUNDING PLAN" advisories — informational, never blocking. */
export function guardrailFlags(input: {
  reduceRetirement?: number;
  retirementWithdrawal?: number;
  emergencyFundUse?: number;
  creditCardUse?: number;
  yearsToRetirement?: number;
  returnPct?: number;
}): GuardrailFlag[] {
  const flags: GuardrailFlag[] = [];
  const years = input.yearsToRetirement ?? 17;
  const r = (input.returnPct ?? 8) / 100;
  const futureValueMonthly = (amt: number) => {
    const m = r / 12;
    const n = years * 12;
    return amt * ((Math.pow(1 + m, n) - 1) / m);
  };
  const futureValueLump = (amt: number) => amt * Math.pow(1 + r, years);

  if (input.reduceRetirement) {
    flags.push({
      id: 'reduce_retirement',
      title: 'Reducing retirement contributions to fund travel',
      impact: `Cutting ${money(input.reduceRetirement)}/mo costs about ${money(
        futureValueMonthly(input.reduceRetirement),
      )} of future retirement value over ${years} years.`,
    });
  }
  if (input.retirementWithdrawal) {
    flags.push({
      id: 'retirement_withdrawal',
      title: 'Withdrawing retirement money for routine travel',
      impact: `${money(input.retirementWithdrawal)} withdrawn is roughly ${money(
        futureValueLump(input.retirementWithdrawal),
      )} of forfeited growth, before taxes and penalties.`,
    });
  }
  if (input.emergencyFundUse) {
    flags.push({
      id: 'emergency_fund',
      title: 'Using emergency savings for planned travel',
      impact: `${money(input.emergencyFundUse)} of reserve capacity is redirected away from true emergencies.`,
    });
  }
  if (input.creditCardUse) {
    flags.push({
      id: 'credit_card',
      title: 'Carrying travel on revolving credit',
      impact: `At 24% APR, ${money(input.creditCardUse)} paid over 12 months costs about ${money(
        input.creditCardUse * 0.13,
      )} in interest.`,
    });
  }
  return flags;
}

/** Monthly goal dashboard categories (targets are planning values, not actuals). */
export const MONTHLY_GOAL_CATEGORIES = [
  'Retirement',
  'Travel',
  'Student Loan',
  'Debt',
  'Emergency Fund',
  'Household Expenses',
  'Other Savings',
] as const;

export const CASHFLOW_TIMELINE_2027 = [
  { when: 'January 2027', change: 'Student loan payment begins', amount: 390, bucket: 'Student Loan' },
  { when: 'January 2027', change: 'First Million retirement accelerator', amount: 208, bucket: 'Retirement' },
  { when: 'February 2027', change: 'Annual Travel Fund begins', amount: 500, bucket: 'Travel' },
  { when: 'September 2027', change: '$888 debt obligation ends — $390 stays on the student loan', amount: -888, bucket: 'Debt' },
  { when: 'September 2027', change: '$498 released cash redirected to retirement (never travel)', amount: 498, bucket: 'Retirement' },
];
