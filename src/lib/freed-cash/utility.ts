/**
 * Clearview Energy utility-savings math.
 *
 * Electricity cost varies with usage and supply rates, so the $95.41/month figure is an
 * ESTIMATE. As real bills are entered we compute realized savings and, once enough history
 * exists, replace the estimate with a verified rolling average for budgeting.
 */

export const CLEARVIEW = {
  vendorMatch: 'clearview',
  formerSupplier: 'Clearview Energy',
  currentSupplier: 'First Energy',
  gasSupplier: 'Enbridge',
  cancellationFee: 0,
  avgKwh: 586,
  formerMonthlyCost: 159.4,
  newMonthlyCost: 63.99,
  estimatedMonthlySavings: 95.41,
  estimatedAnnualSavings: 1144.92,
  /** Benchmark rate used to restate a Clearview bill for any usage level. */
  clearviewRatePerKwh: 159.4 / 586,
  currentRatePerKwh: 63.99 / 586,
  recentBill: {
    kwh: 614,
    clearviewCharge: 166.06,
    currentSupplierEstimate: 67.05,
    savings: 99.01,
  },
} as const;

export interface UtilityBill {
  id: string;
  household_id: string;
  source_id: string | null;
  utility_type: string;
  billing_month: string;
  kwh_used: number;
  supplier: string | null;
  rate_per_kwh: number | null;
  actual_cost: number;
  benchmark_cost: number;
  notes: string | null;
}

export type UtilityBillInput = Omit<UtilityBill, 'id' | 'household_id'>;

/** Estimated Clearview cost for a given usage, using the benchmark rate. */
export function clearviewBenchmark(kwh: number): number {
  return kwh * CLEARVIEW.clearviewRatePerKwh;
}

/** Actual monthly savings = Clearview benchmark cost − actual current supplier cost. */
export function billSavings(bill: Pick<UtilityBill, 'benchmark_cost' | 'actual_cost'>): number {
  return Number(bill.benchmark_cost) - Number(bill.actual_cost);
}

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export interface UtilitySavingsRollup {
  bills: UtilityBill[];
  currentMonthSavings: number | null;
  avg3: number | null;
  avg6: number | null;
  avg12: number | null;
  ytdSavings: number;
  lifetimeSavings: number;
  monthsTracked: number;
  /** 3+ months of bills → verified average monthly savings. */
  verifiedMonthlyAverage: number | null;
  /** 12+ months of bills → verified annual savings. */
  verifiedAnnualSavings: number | null;
  /** Amount to use in budgeting / freed cash: verified average once available, else the estimate. */
  planningMonthlySavings: number;
  planningBasis: 'estimate' | 'verified';
  variance: number | null;
  verdict: 'above' | 'near' | 'below' | 'unknown';
}

/** Newest-first list of bills → rolling savings picture. */
export function rollupUtilitySavings(billsIn: UtilityBill[]): UtilitySavingsRollup {
  const bills = [...billsIn].sort((a, b) => b.billing_month.localeCompare(a.billing_month));
  const savings = bills.map(billSavings);
  const thisYear = new Date().getFullYear();

  const ytdSavings = bills.reduce(
    (sum, b, i) => (new Date(b.billing_month).getFullYear() === thisYear ? sum + savings[i] : sum),
    0,
  );
  const lifetimeSavings = savings.reduce((a, b) => a + b, 0);

  const avg3 = bills.length >= 3 ? avg(savings.slice(0, 3)) : null;
  const avg6 = bills.length >= 6 ? avg(savings.slice(0, 6)) : null;
  const avg12 = bills.length >= 12 ? avg(savings.slice(0, 12)) : null;

  const verifiedMonthlyAverage = avg12 ?? avg6 ?? avg3;
  const verifiedAnnualSavings = avg12 !== null ? avg12 * 12 : null;

  const planningMonthlySavings = verifiedMonthlyAverage ?? CLEARVIEW.estimatedMonthlySavings;
  const variance = verifiedMonthlyAverage === null
    ? null
    : verifiedMonthlyAverage - CLEARVIEW.estimatedMonthlySavings;

  let verdict: UtilitySavingsRollup['verdict'] = 'unknown';
  if (variance !== null) {
    if (variance > 5) verdict = 'above';
    else if (variance < -5) verdict = 'below';
    else verdict = 'near';
  }

  return {
    bills,
    currentMonthSavings: savings[0] ?? null,
    avg3,
    avg6,
    avg12,
    ytdSavings,
    lifetimeSavings,
    monthsTracked: bills.length,
    verifiedMonthlyAverage,
    verifiedAnnualSavings,
    planningMonthlySavings,
    planningBasis: verifiedMonthlyAverage === null ? 'estimate' : 'verified',
    variance,
    verdict,
  };
}

/** Months saved on a goal by adding `monthly` extra dollars toward `target`. */
export function monthsEarlier(target: number, current: number, baseMonthly: number, extraMonthly: number): number | null {
  const remaining = Math.max(target - current, 0);
  if (remaining === 0) return 0;
  if (baseMonthly <= 0 && extraMonthly <= 0) return null;
  const withoutMonths = baseMonthly > 0 ? remaining / baseMonthly : Infinity;
  const withMonths = remaining / (baseMonthly + extraMonthly);
  if (!Number.isFinite(withoutMonths)) return null;
  return Math.max(withoutMonths - withMonths, 0);
}

/** Destinations the Clearview savings may be redirected to (requires approval to change). */
export const UTILITY_REDIRECT_DESTINATIONS = [
  { value: 'emergency_fund', label: 'SoFi Emergency Fund (primary goal)' },
  { value: 'debt_payoff', label: 'Vacation debt payoff' },
  { value: 'travel', label: 'Vacation fund' },
  { value: 'goal:vehicle', label: 'Vehicle maintenance fund' },
  { value: 'goal:hsa', label: 'HSA' },
  { value: 'goal:retirement', label: 'Retirement' },
  { value: 'goal:core', label: 'CORE investment' },
  { value: 'goal:momentum', label: 'MOMENTUM investment' },
  { value: 'goal:guardrail', label: 'GUARDRAIL investment' },
  { value: 'goal:conviction', label: 'CONVICTION investment' },
  { value: 'goal:catalyst', label: 'CATALYST investment' },
  { value: 'goal:student_loan', label: 'Student loan payment' },
  { value: 'business_reserve', label: 'Business capital' },
  { value: 'goal:other', label: 'Other goal' },
] as const;

export function utilityDestinationLabel(destinationType: string, destinationLabel: string | null): string {
  if (destinationLabel) return destinationLabel;
  return UTILITY_REDIRECT_DESTINATIONS.find((d) => d.value === destinationType)?.label ?? destinationType;
}
