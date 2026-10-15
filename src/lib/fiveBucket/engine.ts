/**
 * Montgomery Five-Bucket Wealth Plan engine.
 * All money is integer cents internally. Pure functions only.
 * Deposit convention: interest accrues on the OPENING balance each month;
 * contributions and spending post at month end.
 */

export type BucketKey = 'retire' | 'emergency' | 'vacation' | 'housing' | 'guilt';

export const BUCKETS: { key: BucketKey; label: string; color: string; cash: boolean }[] = [
  { key: 'retire', label: 'Retirement & HSA', color: 'hsl(var(--prism-teal))', cash: false },
  { key: 'emergency', label: 'Deductibles & Emergency Fund', color: 'hsl(var(--prism-navy-light))', cash: true },
  { key: 'vacation', label: 'Vacation Fund', color: 'hsl(var(--prism-amber))', cash: true },
  { key: 'housing', label: 'Housing Fund', color: 'hsl(var(--prism-orange))', cash: true },
  { key: 'guilt', label: 'Guilt Free Fund', color: 'hsl(var(--prism-rose))', cash: true },
];

export interface PlanInputs {
  takeHome: number; // dollars, before the contribution increase
  takeHomeReduction: number; // actual take-home drop from the $49 increase
  baseRetirement: number; // informational, already in take-home
  newRetirement: number; // informational
  expenses: number;
  investPct: number; // % of surplus after 3-month milestone
  housingPct: number;
  guiltPct: number;
  vacationAnnual: number;
  starterTarget: number;
  startEmergency: number;
  startVacation: number;
  startHousing: number;
  startGuilt: number;
  cashApyPct: number;
  investReturnPct: number;
  guiltSpendPct: number; // % of each month's guilt-free funding spent
  vacationTripMonth: number; // 1-12 calendar month of planned trip
  vacationTripAmount: number;
  consultingEnabled: boolean;
  consultingGross: number;
  consultingTaxPct: number;
  rothLimit: number | null; // user entered, never invented
  hsaLimit: number | null;
  startYear: number;
  startMonth: number; // 1-12
}

export const BASELINE: PlanInputs = {
  takeHome: 4363.52,
  takeHomeReduction: 49,
  baseRetirement: 451,
  newRetirement: 500,
  expenses: 2541.52,
  investPct: 50,
  housingPct: 10,
  guiltPct: 5,
  vacationAnnual: 5000,
  starterTarget: 2000,
  startEmergency: 900,
  startVacation: 0,
  startHousing: 0,
  startGuilt: 0,
  cashApyPct: 0,
  investReturnPct: 0,
  guiltSpendPct: 100,
  vacationTripMonth: 12,
  vacationTripAmount: 0,
  consultingEnabled: false,
  consultingGross: 1925,
  consultingTaxPct: 30,
  rothLimit: null,
  hsaLimit: null,
  startYear: 2026,
  startMonth: 11,
};

export const CONSULTING_MONTHS = [3, 6, 9, 12];

export const toCents = (d: number) => Math.round((Number(d) || 0) * 100);
export const fromCents = (c: number) => c / 100;

export function surplusCents(i: PlanInputs) {
  return toCents(i.takeHome) - toCents(i.takeHomeReduction) - toCents(i.expenses);
}

export function targets(i: PlanInputs) {
  const exp = toCents(i.expenses);
  return { starter: toCents(i.starterTarget), three: exp * 3, six: exp * 6 };
}

/** Vacation contribution for the n-th month (0-based) of a 12-month cycle so the year sums exactly. */
export function vacationSlice(annualCents: number, monthIndexInYear: number) {
  const base = Math.round(annualCents / 12);
  return monthIndexInYear === 11 ? annualCents - base * 11 : base;
}

export type Stage = 1 | 2 | 3 | 4 | 5;
export const STAGE_LABEL: Record<Stage, string> = {
  1: 'Stage 1 - Starter reserve',
  2: 'Stage 2 - Three months',
  3: 'Stage 3 - Split and invest',
  4: 'Stage 4 - Six months',
  5: 'Stage 5 - Roth & HSA focus',
};

export function stageFor(emergencyCents: number, t: ReturnType<typeof targets>): Stage {
  if (emergencyCents < t.starter) return 1;
  if (emergencyCents < t.three) return 2;
  if (emergencyCents < t.six) return 3; // stage 3/4 share rules; 4 = final stretch
  return 5;
}

export interface Allocation {
  retire: number;
  emergency: number;
  vacation: number;
  housing: number;
  guilt: number;
  shortfall: number; // cents the fixed buckets exceed available money
  available: number;
}

/**
 * Split `available` cents given the current emergency balance.
 * Before 3 months: everything to emergency, capped at the 3-month need;
 * anything past the cap falls through to split rules (no double counting).
 */
export function allocate(
  i: PlanInputs,
  available: number,
  emergencyBal: number,
  vacationRemaining: number,
  vacationMonthSlice: number,
): Allocation {
  const t = targets(i);
  const a: Allocation = { retire: 0, emergency: 0, vacation: 0, housing: 0, guilt: 0, shortfall: 0, available };
  if (available <= 0) {
    a.shortfall = available < 0 ? -available : 0;
    return a;
  }
  let left = available;
  let transition = false;
  if (emergencyBal < t.three) {
    transition = true;
    const need = t.three - emergencyBal;
    const e = Math.min(need, left);
    a.emergency += e;
    left -= e;
    if (left <= 0) return a;
  }
  const bal = emergencyBal + a.emergency;
  // Percentages apply to the money reaching split rules.
  const invest = Math.round((left * i.investPct) / 100);
  const housing = Math.round((left * i.housingPct) / 100);
  const guilt = Math.round((left * i.guiltPct) / 100);
  let vac = Math.max(0, Math.min(vacationMonthSlice, vacationRemaining));
  // Milestone month: only the leftover reaches split rules, so vacation takes what fits.
  if (transition) vac = Math.max(0, Math.min(vac, left - invest - housing - guilt));
  const fixed = invest + housing + guilt + vac;
  a.retire += invest;
  a.housing += housing;
  a.guilt += guilt;
  a.vacation += vac;
  if (fixed > left) {
    a.shortfall = fixed - left;
    return a;
  }
  let rest = left - fixed;
  if (bal < t.six) {
    const e = Math.min(rest, t.six - bal);
    a.emergency += e;
    rest -= e;
  }
  // Six months funded: leftover goes to Roth/HSA budget allocation.
  a.retire += rest;
  return a;
}

/** The default monthly example shown after the 3-month milestone. */
export function exampleSplit(i: PlanInputs) {
  const t = targets(i);
  return allocate(i, surplusCents(i), t.three, toCents(i.vacationAnnual), vacationSlice(toCents(i.vacationAnnual), 0));
}

export interface MonthRow {
  index: number;
  label: string;
  year: number;
  month: number;
  stage: Stage;
  available: number;
  consulting: number;
  alloc: Allocation;
  opening: Record<BucketKey, number>;
  earnings: Record<BucketKey, number>;
  withdrawals: Record<BucketKey, number>;
  closing: Record<BucketKey, number>;
  retireContribCum: number;
  retireEarnCum: number;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function monthlyRate(apyPct: number) {
  return Math.pow(1 + (apyPct || 0) / 100, 1 / 12) - 1;
}

export function project(i: PlanInputs, months = 36): MonthRow[] {
  const rows: MonthRow[] = [];
  const cashR = monthlyRate(i.cashApyPct);
  const invR = monthlyRate(i.investReturnPct);
  const annualVac = toCents(i.vacationAnnual);
  let bal: Record<BucketKey, number> = {
    retire: 0,
    emergency: toCents(i.startEmergency),
    vacation: toCents(i.startVacation),
    housing: toCents(i.startHousing),
    guilt: toCents(i.startGuilt),
  };
  let contribCum = 0;
  let earnCum = 0;
  let vacFundedThisCycle = 0;
  const t = targets(i);
  for (let n = 0; n < months; n++) {
    const m0 = i.startMonth - 1 + n;
    const year = i.startYear + Math.floor(m0 / 12);
    const month = (m0 % 12) + 1;
    const cycleIdx = n % 12;
    if (cycleIdx === 0) vacFundedThisCycle = 0;
    const opening = { ...bal };
    const earnings: Record<BucketKey, number> = {
      retire: Math.round(bal.retire * invR),
      emergency: Math.round(bal.emergency * cashR),
      vacation: Math.round(bal.vacation * cashR),
      housing: Math.round(bal.housing * cashR),
      guilt: Math.round(bal.guilt * cashR),
    };
    const consulting =
      i.consultingEnabled && CONSULTING_MONTHS.includes(month)
        ? Math.round(toCents(i.consultingGross) * (1 - i.consultingTaxPct / 100))
        : 0;
    const available = surplusCents(i) + consulting;
    const stage = stageFor(bal.emergency, t);
    const alloc = allocate(i, available, bal.emergency, annualVac - vacFundedThisCycle, vacationSlice(annualVac, cycleIdx));
    vacFundedThisCycle += alloc.vacation;
    const next: Record<BucketKey, number> = {
      retire: bal.retire + earnings.retire + alloc.retire,
      emergency: bal.emergency + earnings.emergency + alloc.emergency,
      vacation: bal.vacation + earnings.vacation + alloc.vacation,
      housing: bal.housing + earnings.housing + alloc.housing,
      guilt: bal.guilt + earnings.guilt + alloc.guilt,
    };
    const withdrawals: Record<BucketKey, number> = { retire: 0, emergency: 0, vacation: 0, housing: 0, guilt: 0 };
    if (month === i.vacationTripMonth && i.vacationTripAmount > 0) {
      withdrawals.vacation = Math.min(next.vacation, toCents(i.vacationTripAmount));
    }
    withdrawals.guilt = Math.min(next.guilt, Math.round((alloc.guilt * i.guiltSpendPct) / 100));
    next.vacation -= withdrawals.vacation;
    next.guilt -= withdrawals.guilt;
    contribCum += alloc.retire;
    earnCum += earnings.retire;
    bal = next;
    rows.push({
      index: n,
      label: `${MONTHS[month - 1]} ${year}`,
      year,
      month,
      stage: stage === 3 && bal.emergency >= t.three && opening.emergency >= (t.three + t.six) / 2 ? 4 : stage,
      available,
      consulting,
      alloc,
      opening,
      earnings,
      withdrawals,
      closing: { ...bal },
      retireContribCum: contribCum,
      retireEarnCum: earnCum,
    });
  }
  return rows;
}

export function milestoneDates(i: PlanInputs, rows: MonthRow[]) {
  const t = targets(i);
  const find = (target: number) => {
    if (toCents(i.startEmergency) >= target) return 'Reached';
    const r = rows.find((x) => x.closing.emergency >= target);
    return r ? r.label : 'Beyond 36 months';
  };
  return { starter: find(t.starter), three: find(t.three), six: find(t.six) };
}

export function toCsv(rows: MonthRow[]) {
  const head = ['Month', 'Stage', 'Available', 'Consulting', ...BUCKETS.flatMap((b) => [
    `${b.label} opening`, `${b.label} contribution`, `${b.label} withdrawal`, `${b.label} earnings`, `${b.label} closing`,
  ]), 'Shortfall'];
  const f = (c: number) => (c / 100).toFixed(2);
  const lines = rows.map((r) => [
    r.label, STAGE_LABEL[r.stage], f(r.available), f(r.consulting),
    ...BUCKETS.flatMap((b) => [f(r.opening[b.key]), f(r.alloc[b.key]), f(r.withdrawals[b.key]), f(r.earnings[b.key]), f(r.closing[b.key])]),
    f(r.alloc.shortfall),
  ].map((v) => `"${v}"`).join(','));
  return [head.map((h) => `"${h}"`).join(','), ...lines].join('\n');
}
