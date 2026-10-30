/** These items do not consume deposited net pay, regardless of purpose overrides. */
export function excludesTakeHomeAllocation(name: string, payroll: boolean, transfer = false): boolean {
  return payroll || transfer || /^(internal\s+)?transfers?$/i.test(name.trim()) ||
    /grocer|medical|pharmacy|prescription|doctor/i.test(name);
}

/** Investment transfers remain allocated wealth, but are not business operating costs. */
export function excludesBusinessOperatingFunding(name: string): boolean {
  return excludesTakeHomeAllocation(name, false) ||
    /^Investment Transfer\s*[—–-]\s*Business Checking$/i.test(name.trim());
}

export function isFiveBucketFunding(name: string): boolean {
  return name.trim().startsWith('Five-Bucket · ');
}

/** Savings still need funding, but never constitute expense overspending. */
export function budgetFundingBreakdown(income: number, expenses: number, bucketFunding: number) {
  const cents = (n: number) => Math.round(n * 100) / 100;
  const beforeBuckets = cents(income - expenses);
  return {
    beforeBuckets,
    unallocated: cents(beforeBuckets - bucketFunding),
    expenseShortfall: cents(Math.max(0, -beforeBuckets)),
    unfundedBuckets: cents(Math.max(0, bucketFunding - Math.max(0, beforeBuckets))),
  };
}