import { getPlanLimits } from './planLimits';

export type Bucket =
  | 'hsa'
  | 'roth_457b'
  | 'roth_tda'
  | 'pretax_457b'
  | 'pretax_tda'
  | 'taxable';

export const BUCKET_LABELS: Record<Bucket, string> = {
  hsa: 'HSA',
  roth_457b: 'Roth 457(b)',
  roth_tda: 'Roth TDA',
  pretax_457b: 'Pre-tax 457(b)',
  pretax_tda: 'Pre-tax TDA',
  taxable: 'Taxable Brokerage',
};

export type Allocation = Partial<Record<Bucket, number>>;

export type AllocationEventType =
  | 'step_up'
  | 'raise_redirect'
  | 'debt_redirect'
  | 'ss_invest';

export interface AllocationEvent {
  id: string;
  event_date: string; // ISO
  event_label: string;
  event_type: AllocationEventType;
  monthly_amount: number | null;
  default_allocation: Allocation;
  user_allocation: Allocation | null;
  is_active: boolean;
  notes?: string | null;
}

export interface AllocationSettings {
  hsa_eligible: boolean;
  hsa_coverage: 'self' | 'family';
  hsa_max_target: number;
  roth_pct_default: number; // 0-100
  employer_contribution_rate: number; // percent of salary
  annual_raise_pct: number;
  inflation_mode: 'today' | 'future';
  current_monthly_salary: number;
  current_ee_contribution: number;
  current_er_contribution: number;
  ss_age70_estimate: number;
}

export interface ComputedEventRow {
  event: AllocationEvent;
  effectiveMonthly: number; // resolved (e.g., raise % of salary at that year)
  destinations: Allocation; // chosen allocation after defaults/overrides + HSA spill
  countsTowardLimits: boolean;
  includedInProjection: boolean;
  warnings: string[];
}

export interface EngineOutput {
  rows: ComputedEventRow[];
  yearlyTotals: Record<number, Record<Bucket, number>>;
  warnings: string[];
}

function yearOf(iso: string): number {
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).getUTCFullYear();
}

function sumAlloc(a: Allocation): number {
  return Object.values(a).reduce((s, v) => s + (v || 0), 0);
}

function hsaAnnualLimit(s: AllocationSettings, year: number): number {
  if (!s.hsa_eligible) return 0;
  const limits = getPlanLimits(year);
  const cap = s.hsa_coverage === 'family' ? limits.hsa_family : limits.hsa_self;
  return Math.min(cap, s.hsa_max_target);
}

/**
 * Compute the salary at a given year using annual raise %, compounded from today.
 */
function salaryAtYear(s: AllocationSettings, year: number): number {
  const today = new Date().getUTCFullYear();
  const n = Math.max(0, year - today);
  return s.current_monthly_salary * Math.pow(1 + s.annual_raise_pct / 100, n);
}

/**
 * Default-allocation generator per rules 1–9. Returns an allocation summing to `monthly`.
 * Uses HSA headroom (this-year cumulative HSA so far) to decide HSA-first vs Roth split.
 */
function defaultAllocationFor(
  evt: AllocationEvent,
  s: AllocationSettings,
  hsaYearUsedSoFar: number,
): Allocation {
  const monthly = evt.monthly_amount ?? 0;
  if (monthly <= 0) return {};

  const year = yearOf(evt.event_date);
  const hsaAnnualCap = hsaAnnualLimit(s, year);
  const hsaHeadroomAnnual = Math.max(0, hsaAnnualCap - hsaYearUsedSoFar);
  // monthsRemaining: number of months in `year` from event_date inclusive
  const evtDate = new Date(evt.event_date + 'T00:00:00');
  const monthsRemaining = 12 - evtDate.getUTCMonth();
  const hsaHeadroomMonthly = monthsRemaining > 0 ? hsaHeadroomAnnual / monthsRemaining : 0;
  const hsaOnPace = !s.hsa_eligible || hsaHeadroomMonthly <= 0.01;

  const rothPct = s.roth_pct_default / 100;
  const rothTdaPct = 1 - rothPct;

  // Rule 9: Social Security investing
  if (evt.event_type === 'ss_invest') {
    return { taxable: monthly };
  }

  // Specific-event defaults
  const label = evt.event_label.toLowerCase();

  // Rule 3: July 2026 +$100 -> Roth 457(b)
  if (label.includes('july 2026')) {
    return { roth_457b: monthly };
  }

  // Rule 4: Jan 2027 +$225 -> HSA until maxed (spill to Roth split)
  if (label.includes('january 2027') || label.includes('jan 2027')) {
    if (s.hsa_eligible && hsaHeadroomMonthly > 0) {
      const toHsa = Math.min(monthly, hsaHeadroomMonthly);
      const spill = monthly - toHsa;
      return {
        hsa: toHsa,
        ...(spill > 0 ? { roth_457b: spill * rothPct, roth_tda: spill * rothTdaPct } : {}),
      };
    }
    return { roth_457b: monthly * rothPct, roth_tda: monthly * rothTdaPct };
  }

  // Rule 5: Sep 2027 $888 debt redirect -> $500 Roth 457(b) / $388 Roth TDA unless HSA off pace
  if (evt.event_type === 'debt_redirect' && Math.abs(monthly - 888) < 1) {
    if (!hsaOnPace && hsaHeadroomMonthly > 0) {
      const toHsa = Math.min(monthly, hsaHeadroomMonthly);
      const remaining = monthly - toHsa;
      return {
        hsa: toHsa,
        roth_457b: Math.min(500, remaining),
        roth_tda: Math.max(0, remaining - Math.min(500, remaining)),
      };
    }
    return { roth_457b: 500, roth_tda: 388 };
  }

  // Rule 6: June 2028 $500 -> 300/200
  if (label.includes('june 2028') || label.includes('jun 2028')) {
    return { roth_457b: 300, roth_tda: 200 };
  }
  // Rule 7: Jan 2029 $200 -> 100/100
  if (label.includes('january 2029') || label.includes('jan 2029')) {
    return { roth_457b: 100, roth_tda: 100 };
  }
  // Rule 8: Jan 2030 $500 -> 250/250
  if (label.includes('january 2030') || label.includes('jan 2030')) {
    return { roth_457b: 250, roth_tda: 250 };
  }

  // Rule 1 & 2: HSA first, then 60/40 Roth split (raises and any other step-ups)
  if (s.hsa_eligible && hsaHeadroomMonthly > 0) {
    const toHsa = Math.min(monthly, hsaHeadroomMonthly);
    const spill = monthly - toHsa;
    return {
      hsa: toHsa,
      ...(spill > 0 ? { roth_457b: spill * rothPct, roth_tda: spill * rothTdaPct } : {}),
    };
  }
  return { roth_457b: monthly * rothPct, roth_tda: monthly * rothTdaPct };
}

/**
 * Apply HSA spillover and plan-limit checks. Returns warnings.
 */
function enforceCaps(
  alloc: Allocation,
  s: AllocationSettings,
  year: number,
  used: { hsa: number; tda: number; sec457: number },
): { alloc: Allocation; warnings: string[] } {
  const out: Allocation = { ...alloc };
  const warnings: string[] = [];

  // HSA cap
  const hsaCap = hsaAnnualLimit(s, year);
  if ((out.hsa ?? 0) * 12 + used.hsa > hsaCap) {
    const allowedMonthly = Math.max(0, (hsaCap - used.hsa) / 12);
    const overflow = (out.hsa ?? 0) - allowedMonthly;
    out.hsa = allowedMonthly;
    out.roth_457b = (out.roth_457b ?? 0) + overflow;
    warnings.push(`HSA cap reached for ${year}; $${overflow.toFixed(0)}/mo spilled to Roth 457(b).`);
  }

  const limits = getPlanLimits(year);
  // 403(b)/TDA 402(g): roth_tda + pretax_tda
  const tdaMonthly = (out.roth_tda ?? 0) + (out.pretax_tda ?? 0);
  if (tdaMonthly * 12 + used.tda > limits.tda_402g) {
    warnings.push(`TDA contributions exceed 402(g) limit (~$${limits.tda_402g.toLocaleString()}) for ${year}.`);
  }
  // 457(b)
  const s457Monthly = (out.roth_457b ?? 0) + (out.pretax_457b ?? 0);
  if (s457Monthly * 12 + used.sec457 > limits.govt_457b) {
    warnings.push(`457(b) contributions exceed limit (~$${limits.govt_457b.toLocaleString()}) for ${year}.`);
  }

  return { alloc: out, warnings };
}

export function runAllocationEngine(
  settings: AllocationSettings,
  events: AllocationEvent[],
): EngineOutput {
  const rows: ComputedEventRow[] = [];
  const globalWarnings: string[] = [];

  // sort by date ascending
  const sorted = [...events]
    .filter((e) => !!e.event_date)
    .sort((a, b) => a.event_date.localeCompare(b.event_date));

  // running per-year usage
  const yearUsage: Record<number, { hsa: number; tda: number; sec457: number; brokerage: number }> = {};
  const yearlyTotals: Record<number, Record<Bucket, number>> = {};

  // duplicate-debt-redirect detection
  const debtRedirectMonths = new Set<string>();

  for (const evt of sorted) {
    const year = yearOf(evt.event_date);
    if (!yearUsage[year]) yearUsage[year] = { hsa: 0, tda: 0, sec457: 0, brokerage: 0 };
    if (!yearlyTotals[year]) {
      yearlyTotals[year] = {
        hsa: 0, roth_457b: 0, roth_tda: 0, pretax_457b: 0, pretax_tda: 0, taxable: 0,
      };
    }
    const warnings: string[] = [];

    // Resolve effective monthly amount
    let effectiveMonthly = evt.monthly_amount ?? 0;
    if (evt.event_type === 'raise_redirect') {
      const sal = salaryAtYear(settings, year);
      effectiveMonthly = sal * (settings.annual_raise_pct / 100);
    }

    // Double-count debt redirect guard
    if (evt.event_type === 'debt_redirect') {
      const key = `${year}-${new Date(evt.event_date + 'T00:00:00').getUTCMonth()}`;
      if (debtRedirectMonths.has(key)) {
        warnings.push('Possible duplicate debt redirect this month — verify the $888 is not double-counted.');
      }
      debtRedirectMonths.add(key);
    }

    // Pick allocation
    const eventForDefaults: AllocationEvent = { ...evt, monthly_amount: effectiveMonthly };
    let alloc: Allocation = evt.user_allocation && sumAlloc(evt.user_allocation) > 0
      ? evt.user_allocation
      : defaultAllocationFor(eventForDefaults, settings, yearUsage[year].hsa);

    // SS warning
    if (evt.event_type === 'ss_invest') {
      warnings.push(
        'Social Security generally cannot be contributed to an employer retirement plan because it is not payroll compensation. Default routed to taxable brokerage unless a cash-flow replacement strategy is chosen.',
      );
    }

    // Active flag → not included in projection or running totals
    const isActive = evt.is_active;

    if (isActive) {
      const enforced = enforceCaps(alloc, settings, year, yearUsage[year]);
      alloc = enforced.alloc;
      warnings.push(...enforced.warnings);

      // update running usage (annualized contributions for the remainder of the year)
      const evtDate = new Date(evt.event_date + 'T00:00:00');
      const monthsThisYear = 12 - evtDate.getUTCMonth();
      yearUsage[year].hsa += (alloc.hsa ?? 0) * monthsThisYear;
      yearUsage[year].tda += ((alloc.roth_tda ?? 0) + (alloc.pretax_tda ?? 0)) * monthsThisYear;
      yearUsage[year].sec457 += ((alloc.roth_457b ?? 0) + (alloc.pretax_457b ?? 0)) * monthsThisYear;
      yearUsage[year].brokerage += (alloc.taxable ?? 0) * monthsThisYear;

      // yearly totals are annualized monthly (12 months for simplicity in the summary row)
      (Object.keys(alloc) as Bucket[]).forEach((b) => {
        yearlyTotals[year][b] += (alloc[b] ?? 0) * 12;
      });
    }

    rows.push({
      event: evt,
      effectiveMonthly,
      destinations: alloc,
      countsTowardLimits: evt.event_type !== 'ss_invest', // SS into taxable doesn't
      includedInProjection: isActive,
      warnings,
    });
  }

  return { rows, yearlyTotals, warnings: globalWarnings };
}

/** Seed the 8 Montgomery events. */
export function montgomerySeedEvents(): Omit<AllocationEvent, 'id'>[] {
  return [
    {
      event_date: '2026-07-01',
      event_label: 'July 2026 step-up',
      event_type: 'step_up',
      monthly_amount: 100,
      default_allocation: { roth_457b: 100 },
      user_allocation: null,
      is_active: true,
      notes: '+$100/mo — default Roth 457(b).',
    },
    {
      event_date: '2027-01-01',
      event_label: 'January 2027 step-up',
      event_type: 'step_up',
      monthly_amount: 225,
      default_allocation: { hsa: 225 },
      user_allocation: null,
      is_active: true,
      notes: '+$225/mo — default HSA until maxed, spill to Roth split.',
    },
    {
      event_date: '2027-09-01',
      event_label: 'September 2027 debt redirect',
      event_type: 'debt_redirect',
      monthly_amount: 888,
      default_allocation: { roth_457b: 500, roth_tda: 388 },
      user_allocation: null,
      is_active: true,
      notes: '$888/mo freed from debt — default $500 Roth 457(b) + $388 Roth TDA.',
    },
    {
      event_date: '2028-06-01',
      event_label: 'June 2028 step-up',
      event_type: 'step_up',
      monthly_amount: 500,
      default_allocation: { roth_457b: 300, roth_tda: 200 },
      user_allocation: null,
      is_active: true,
      notes: '+$500/mo — default 300/200.',
    },
    {
      event_date: '2029-01-01',
      event_label: 'January 2029 step-up',
      event_type: 'step_up',
      monthly_amount: 200,
      default_allocation: { roth_457b: 100, roth_tda: 100 },
      user_allocation: null,
      is_active: true,
      notes: '+$200/mo — default 100/100.',
    },
    {
      event_date: '2030-01-01',
      event_label: 'January 2030 step-up',
      event_type: 'step_up',
      monthly_amount: 500,
      default_allocation: { roth_457b: 250, roth_tda: 250 },
      user_allocation: null,
      is_active: true,
      notes: '+$500/mo — default 250/250.',
    },
    {
      event_date: '2037-06-01',
      event_label: 'June 2037 Social Security investing',
      event_type: 'ss_invest',
      monthly_amount: 3540,
      default_allocation: { taxable: 3540 },
      user_allocation: null,
      is_active: true,
      notes: 'SS at age 70 invested via taxable brokerage (not payroll compensation).',
    },
    {
      event_date: '2026-01-01',
      event_label: 'Annual 3% raise redirect (recurring)',
      event_type: 'raise_redirect',
      monthly_amount: null,
      default_allocation: {},
      user_allocation: null,
      is_active: true,
      notes: '100% of each annual 3% raise redirected to retirement (HSA-first, then 60/40 Roth).',
    },
  ];
}
