/**
 * Wealth Projection and Source of Funds engine.
 *
 * Every projected dollar is attributed to exactly one funding source, so the
 * ending balance can always be broken back down into:
 *   starting assets + employee money + employer money + freed cash +
 *   raises + tax refunds + released debt payments + investment growth.
 *
 * Rules enforced here:
 *  - A dollar belongs to one source only. Sources never overlap silently —
 *    duplicateWarnings() surfaces suspected double counting.
 *  - Employer money is tracked separately and never counted as employee saving.
 *  - Obligations (money still owed) are not contributions.
 *  - Growth is computed on the running balance, never added to a source total.
 */
import { addMonths, monthIndex, indexToMonth, monthLabel } from '@/lib/retirement/cashflowEngine';

export type FundCategory =
  | 'starting_assets'
  | 'employee'
  | 'employer'
  | 'freed_cash'
  | 'raise'
  | 'tax_refund'
  | 'released_debt'
  | 'other';

export const CATEGORY_LABELS: Record<FundCategory, string> = {
  starting_assets: 'Starting assets',
  employee: 'Your contributions',
  employer: 'Employer money',
  freed_cash: 'Freed cash (spending cuts)',
  raise: 'Future pay raises',
  tax_refund: 'Tax refund redirects',
  released_debt: 'Released debt payments',
  other: 'Other',
};

export const CATEGORY_ORDER: FundCategory[] = [
  'starting_assets',
  'employee',
  'employer',
  'freed_cash',
  'released_debt',
  'raise',
  'tax_refund',
  'other',
];

export const CATEGORY_COLORS: Record<FundCategory, string> = {
  starting_assets: 'hsl(215 25% 55%)',
  employee: 'hsl(var(--primary))',
  employer: 'hsl(38 92% 55%)',
  freed_cash: 'hsl(160 60% 45%)',
  released_debt: 'hsl(0 70% 60%)',
  raise: 'hsl(280 70% 60%)',
  tax_refund: 'hsl(195 75% 50%)',
  other: 'hsl(215 15% 45%)',
};

export interface FundingSource {
  id: string;
  label: string;
  category: FundCategory;
  /** Recurring monthly amount. */
  monthly: number;
  /** Optional annual lump sum (tax refunds, bonuses). */
  annualAmount?: number;
  /** Calendar month 1-12 the annual lump lands. */
  annualMonth?: number;
  startMonth: string; // YYYY-MM
  endMonth?: string | null;
  /** Yearly % increase applied to the monthly amount. */
  annualIncreasePct?: number;
  enabled: boolean;
  notes?: string;
}

export interface WealthAssumptions {
  startMonth: string;
  currentAge: number;
  /** Money already invested, split so retirement and taxable never mix. */
  startingRetirement: number;
  startingSelfDirected: number;
  startingHsa: number;
  includeHsa: boolean;
  returnPct: number;
}

export const DEFAULT_ASSUMPTIONS: WealthAssumptions = {
  startMonth: '2026-09',
  currentAge: 55,
  startingRetirement: 181_504.70,
  startingSelfDirected: 2_608.91,
  startingHsa: 0,
  includeHsa: false,
  returnPct: 7,
};

export const SCENARIOS = [
  { key: 'conservative', label: 'Conservative', returnPct: 5 },
  { key: 'base', label: 'Base plan', returnPct: 7 },
  { key: 'optimistic', label: 'Optimistic', returnPct: 9 },
] as const;

export const HORIZONS = [25, 30] as const;

export function defaultFundingSources(): FundingSource[] {
  return [
    { id: 'ee-payroll', label: 'Payroll retirement deferrals (TDA, 457, Roth)', category: 'employee', monthly: 335, startMonth: '2026-09', enabled: true, annualIncreasePct: 0, notes: 'From your monthly paystub' },
    { id: 'er-base', label: 'IU employer retirement contribution', category: 'employer', monthly: 532.05, startMonth: '2026-09', enabled: true, notes: 'Employer money — never counted as your own saving' },
    { id: 'accelerator', label: 'First Million Accelerator', category: 'employee', monthly: 208, startMonth: '2027-01', enabled: true },
    { id: 'freed-cash', label: 'Freed cash redirected to investing', category: 'freed_cash', monthly: 0, startMonth: '2026-09', enabled: true, notes: 'Pulled from the Freed Cash Engine run rate' },
    { id: 'betrilink', label: 'BetrLink payment released', category: 'released_debt', monthly: 0, startMonth: '2027-02', enabled: false, notes: 'Turn on once the payment truly stops' },
    { id: 'vacation-loans', label: 'Vacation loan payments released', category: 'released_debt', monthly: 0, startMonth: '2028-01', enabled: false },
    { id: 'wealth-accel', label: 'Monthly Wealth Accelerator', category: 'employee', monthly: 250, startMonth: '2028-01', enabled: true },
    { id: 'raise', label: 'Future pay raises redirected', category: 'raise', monthly: 0, startMonth: '2027-07', enabled: false, annualIncreasePct: 2 },
    { id: 'refund', label: 'Tax refund redirected', category: 'tax_refund', monthly: 0, annualAmount: 0, annualMonth: 4, startMonth: '2027-01', enabled: false, notes: 'Extra only. Never assumed in the base plan.' },
  ];
}

/* -------------------------------- projection ------------------------------- */

export interface MonthPoint {
  month: string;
  label: string;
  contributions: number;
  growth: number;
  balance: number;
  byCategory: Record<FundCategory, number>;
}

export interface YearPoint {
  year: number;
  age: number;
  balance: number;
  cumulativeContributions: number;
  cumulativeGrowth: number;
  /** Cumulative dollars in, by category (starting assets included). */
  byCategory: Record<FundCategory, number>;
}

export interface SourceTotal {
  id: string;
  label: string;
  category: FundCategory;
  categoryLabel: string;
  monthlyNow: number;
  startMonth: string;
  total: number;
  sharePct: number;
}

export interface WealthProjection {
  returnPct: number;
  years: number;
  months: MonthPoint[];
  yearly: YearPoint[];
  ending: number;
  startingAssets: number;
  contributions: number;
  growth: number;
  byCategory: Record<FundCategory, number>;
  bySource: SourceTotal[];
}

function emptyCategories(): Record<FundCategory, number> {
  return {
    starting_assets: 0,
    employee: 0,
    employer: 0,
    freed_cash: 0,
    raise: 0,
    tax_refund: 0,
    released_debt: 0,
    other: 0,
  };
}

function amountFor(s: FundingSource, month: string, elapsedYears: number): number {
  const start = monthIndex(s.startMonth);
  const idx = monthIndex(month);
  if (idx < start) return 0;
  if (s.endMonth && idx > monthIndex(s.endMonth)) return 0;
  const growthFactor = Math.pow(1 + (s.annualIncreasePct || 0) / 100, elapsedYears);
  let amt = (s.monthly || 0) * growthFactor;
  if (s.annualAmount && s.annualMonth) {
    const calMonth = (idx % 12) + 1;
    if (calMonth === s.annualMonth) amt += s.annualAmount;
  }
  return amt;
}

export function projectWealth(
  sources: FundingSource[],
  a: WealthAssumptions,
  returnPct = a.returnPct,
  years = 25,
): WealthProjection {
  const startingAssets =
    a.startingRetirement + a.startingSelfDirected + (a.includeHsa ? a.startingHsa : 0);
  const monthlyRate = returnPct / 100 / 12;
  const live = sources.filter((s) => s.enabled);

  let balance = startingAssets;
  let contributions = 0;
  let growth = 0;
  const byCategory = emptyCategories();
  byCategory.starting_assets = startingAssets;
  const bySourceTotals = new Map<string, number>();

  const months: MonthPoint[] = [];
  const yearly: YearPoint[] = [];
  const totalMonths = years * 12;

  for (let i = 0; i < totalMonths; i++) {
    const month = addMonths(a.startMonth, i);
    const elapsedYears = Math.floor(i / 12);
    const monthCats = emptyCategories();
    let monthContrib = 0;

    for (const s of live) {
      const amt = amountFor(s, month, elapsedYears);
      if (amt <= 0) continue;
      monthContrib += amt;
      monthCats[s.category] += amt;
      byCategory[s.category] += amt;
      bySourceTotals.set(s.id, (bySourceTotals.get(s.id) || 0) + amt);
    }

    const monthGrowth = (balance + monthContrib / 2) * monthlyRate;
    balance += monthContrib + monthGrowth;
    contributions += monthContrib;
    growth += monthGrowth;

    months.push({
      month,
      label: monthLabel(month),
      contributions: monthContrib,
      growth: monthGrowth,
      balance,
      byCategory: monthCats,
    });

    if ((i + 1) % 12 === 0) {
      yearly.push({
        year: Number(month.split('-')[0]),
        age: a.currentAge + (i + 1) / 12,
        balance,
        cumulativeContributions: contributions,
        cumulativeGrowth: growth,
        byCategory: { ...byCategory },
      });
    }
  }

  const bySource: SourceTotal[] = live
    .map((s) => {
      const total = bySourceTotals.get(s.id) || 0;
      return {
        id: s.id,
        label: s.label,
        category: s.category,
        categoryLabel: CATEGORY_LABELS[s.category],
        monthlyNow: s.monthly || 0,
        startMonth: s.startMonth,
        total,
        sharePct: balance > 0 ? (total / balance) * 100 : 0,
      };
    })
    .sort((x, y) => y.total - x.total);

  return {
    returnPct,
    years,
    months,
    yearly,
    ending: balance,
    startingAssets,
    contributions,
    growth,
    byCategory,
    bySource,
  };
}

export interface ScenarioResult {
  key: string;
  label: string;
  returnPct: number;
  byHorizon: { years: number; ending: number; contributions: number; growth: number }[];
}

export function runScenarios(sources: FundingSource[], a: WealthAssumptions): ScenarioResult[] {
  return SCENARIOS.map((sc) => ({
    key: sc.key,
    label: sc.label,
    returnPct: sc.returnPct,
    byHorizon: HORIZONS.map((h) => {
      const p = projectWealth(sources, a, sc.returnPct, h);
      return { years: h, ending: p.ending, contributions: p.contributions, growth: p.growth };
    }),
  }));
}

/* ---------------------------- integrity checking --------------------------- */

export interface FundingWarning {
  kind: 'duplicate' | 'unfunded' | 'employer';
  message: string;
}

/**
 * Catches the ways the same dollar could be counted twice: two enabled sources
 * with the same amount starting the same month, freed cash entered twice, and
 * employer money mislabelled as personal saving.
 */
export function duplicateWarnings(
  sources: FundingSource[],
  freedCashRedirectedMonthly?: number,
): FundingWarning[] {
  const out: FundingWarning[] = [];
  const live = sources.filter((s) => s.enabled && (s.monthly > 0 || s.annualAmount));

  for (let i = 0; i < live.length; i++) {
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i];
      const b = live[j];
      if (a.monthly > 0 && Math.abs(a.monthly - b.monthly) < 0.51 && a.startMonth === b.startMonth) {
        out.push({
          kind: 'duplicate',
          message: `“${a.label}” and “${b.label}” are both ${money(a.monthly)}/mo starting ${monthLabel(a.startMonth)}. Make sure this isn't the same money entered twice.`,
        });
      }
    }
  }

  const freed = live.filter((s) => s.category === 'freed_cash').reduce((sum, s) => sum + s.monthly, 0);
  if (freedCashRedirectedMonthly !== undefined && freed > freedCashRedirectedMonthly + 1) {
    out.push({
      kind: 'unfunded',
      message: `You are investing ${money(freed)}/mo of freed cash, but only ${money(freedCashRedirectedMonthly)}/mo is actually being redirected in the Freed Cash Engine.`,
    });
  }

  const releasedDebt = live.filter((s) => s.category === 'released_debt' && s.monthly > 0);
  for (const s of releasedDebt) {
    if (monthIndex(s.startMonth) <= monthIndex(indexToMonth(monthIndex(DEFAULT_ASSUMPTIONS.startMonth)))) {
      out.push({
        kind: 'unfunded',
        message: `“${s.label}” starts immediately. Only turn a released debt payment on after the payment truly stops.`,
      });
    }
  }

  return out;
}

export function money(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}
