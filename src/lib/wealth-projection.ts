/**
 * Pure projection math for the Wealth Redirector.
 * Given a recurring monthly amount and a destination, returns the 3-year impact.
 */
export type RedirectDestination = 'debt' | 'ef' | 'hsa' | 'roth' | 'brokerage' | 'savings';

export interface RedirectProjection {
  destination: RedirectDestination;
  label: string;
  monthly: number;
  oneYear: number;
  threeYear: number;
  rationale: string;
  apr: number;
}

const DESTINATIONS: Record<RedirectDestination, { label: string; defaultApr: number; describe: (m: number) => string }> = {
  debt: {
    label: 'High-interest debt payoff',
    defaultApr: 0.22,
    describe: (m) => `$${m.toFixed(0)}/mo extra principal could erase several hundred in compounding interest each year.`,
  },
  ef: {
    label: 'Emergency Fund (HYSA)',
    defaultApr: 0.045,
    describe: (m) => `$${m.toFixed(0)}/mo builds a real safety net — your buffer for the next surprise.`,
  },
  hsa: {
    label: 'HSA (triple-tax-advantaged)',
    defaultApr: 0.07,
    describe: (m) => `$${m.toFixed(0)}/mo grows tax-free for medical expenses now or retirement later.`,
  },
  roth: {
    label: 'Roth IRA',
    defaultApr: 0.08,
    describe: (m) => `$${m.toFixed(0)}/mo invested tax-free — small redirects compound for decades.`,
  },
  brokerage: {
    label: 'Taxable brokerage',
    defaultApr: 0.07,
    describe: (m) => `$${m.toFixed(0)}/mo flexible investing — accessible if needed before retirement.`,
  },
  savings: {
    label: 'Goal savings',
    defaultApr: 0.04,
    describe: (m) => `$${m.toFixed(0)}/mo funds the next sinking-fund goal on schedule.`,
  },
};

function futureValueOfAnnuity(monthly: number, monthlyRate: number, months: number) {
  if (monthlyRate === 0) return monthly * months;
  return monthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate);
}

export function projectRedirect(
  monthlyAmount: number,
  destination: RedirectDestination,
  aprOverride?: number,
): RedirectProjection {
  const meta = DESTINATIONS[destination];
  const apr = aprOverride ?? meta.defaultApr;
  const r = apr / 12;
  const oneYear = futureValueOfAnnuity(monthlyAmount, r, 12);
  const threeYear = futureValueOfAnnuity(monthlyAmount, r, 36);
  return {
    destination,
    label: meta.label,
    monthly: monthlyAmount,
    oneYear: Math.round(oneYear),
    threeYear: Math.round(threeYear),
    rationale: meta.describe(monthlyAmount),
    apr,
  };
}

export function projectAllRedirects(monthlyAmount: number): RedirectProjection[] {
  return (Object.keys(DESTINATIONS) as RedirectDestination[]).map(d => projectRedirect(monthlyAmount, d));
}
