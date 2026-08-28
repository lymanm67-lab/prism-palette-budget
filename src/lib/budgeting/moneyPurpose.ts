// Money Purpose™ — the 50/10/20/20 classification layer.
//
// This is INDEPENDENT of the existing Fixed / Flexible / Non-Monthly
// "expense type" attribute. Expense Type answers "what kind of expense is
// this?"; Money Purpose answers "what job is this dollar doing?".
//
// Never mix the two in a single percentage.

export type MoneyPurpose =
  | 'live'
  | 'enjoy'
  | 'build_wealth'
  | 'eliminate_debt'
  | 'business'
  | 'payroll_deduction'
  | 'employer_contribution';

/** The four purposes that make up the personal 50/10/20/20 blueprint. */
export const PERSONAL_PURPOSES: MoneyPurpose[] = ['live', 'enjoy', 'build_wealth', 'eliminate_debt'];

/** Purposes that must NEVER be counted inside personal ratios. */
export const NON_PERSONAL_PURPOSES: MoneyPurpose[] = ['business', 'employer_contribution'];

export const PURPOSE_META: Record<
  MoneyPurpose,
  { label: string; short: string; tooltip: string; color: string; token: string }
> = {
  live: {
    label: 'Live',
    short: 'LIVE',
    tooltip: 'Necessities — housing, utilities, insurance, groceries, fuel, essential care.',
    color: '#1e3a8a', // navy
    token: 'text-blue-700 dark:text-blue-300',
  },
  enjoy: {
    label: 'Enjoy',
    short: 'ENJOY',
    tooltip: 'Discretionary lifestyle — restaurants, entertainment, travel, guilt-free spending.',
    color: '#a855f7', // purple
    token: 'text-purple-700 dark:text-purple-300',
  },
  build_wealth: {
    label: 'Build Wealth',
    short: 'BUILD WEALTH',
    tooltip: 'Money retained or invested for the future — retirement, HSA, brokerage, savings.',
    color: '#059669', // emerald
    token: 'text-emerald-700 dark:text-emerald-300',
  },
  eliminate_debt: {
    label: 'Eliminate Debt',
    short: 'ELIMINATE DEBT',
    tooltip: 'Required and extra payments that permanently reduce debt principal.',
    color: '#d4a017', // gold
    token: 'text-amber-700 dark:text-amber-300',
  },
  business: {
    label: 'Business',
    short: 'BUSINESS',
    tooltip: 'Business income and expenses. Excluded from personal 50/10/20/20 ratios.',
    color: '#64748b',
    token: 'text-slate-600 dark:text-slate-300',
  },
  payroll_deduction: {
    label: 'Payroll Deduction',
    short: 'PAYROLL',
    tooltip: 'Taxes and benefits withheld before net pay. Already reflected in take-home pay.',
    color: '#0ea5e9',
    token: 'text-sky-700 dark:text-sky-300',
  },
  employer_contribution: {
    label: 'Employer Contribution',
    short: 'EMPLOYER',
    tooltip: 'Employer-paid benefit. An economic gain, never spendable income or a personal expense.',
    color: '#14b8a6',
    token: 'text-teal-700 dark:text-teal-300',
  },
};

/** Target bands per phase of the Financial Freedom progression. */
export type FreedomPhase = 1 | 2 | 3;

export const PHASE_TARGETS: Record<FreedomPhase, Record<'live' | 'enjoy' | 'build_wealth' | 'eliminate_debt', number>> = {
  1: { live: 50, enjoy: 10, build_wealth: 20, eliminate_debt: 20 },
  2: { live: 50, enjoy: 10, build_wealth: 30, eliminate_debt: 10 },
  3: { live: 50, enjoy: 10, build_wealth: 40, eliminate_debt: 0 },
};

export const PHASE_LABEL: Record<FreedomPhase, string> = {
  1: 'Phase 1 — Debt Elimination',
  2: 'Phase 2 — Transition',
  3: 'Phase 3 — Wealth Acceleration',
};

// ---------------------------------------------------------------------------
// Smart mapping
// ---------------------------------------------------------------------------

type Rule = { re: RegExp; purpose: MoneyPurpose };

/** Employer-paid lines — matched before anything else. */
const EMPLOYER_RULES: Rule[] = [
  { re: /employer|non[- ]?elective|9%\s*match/i, purpose: 'employer_contribution' },
];

/** Wealth-building lines (payroll or from take-home). */
const WEALTH_RULES: Rule[] = [
  { re: /\b(tda|457|403\s?\(?b\)?|401\s?\(?k\)?)\b/i, purpose: 'build_wealth' },
  { re: /roth/i, purpose: 'build_wealth' },
  { re: /tax deferred|deferred (comp|account)/i, purpose: 'build_wealth' },
  { re: /\bhsa\b|health savings/i, purpose: 'build_wealth' },
  { re: /retirement contribution|investment contribution|brokerage|stocks|\betfs?\b/i, purpose: 'build_wealth' },
  { re: /emergency fund|savings plan|credit builder/i, purpose: 'build_wealth' },
];

/** Debt-elimination lines. */
const DEBT_RULES: Rule[] = [
  { re: /student loan|nelnet|mohela|sallie|fedloan/i, purpose: 'eliminate_debt' },
  { re: /debt (payoff|settlement|repayment)/i, purpose: 'eliminate_debt' },
  { re: /loan (payment|repayment)|auto loan|personal loan|vacation loan/i, purpose: 'eliminate_debt' },
  { re: /credit cards?$/i, purpose: 'eliminate_debt' },
];

/** Necessity lines. */
const LIVE_RULES: Rule[] = [
  { re: /rent|mortgage|clarke realt/i, purpose: 'live' },
  { re: /firstenergy|first energy|enbridge|dominion|utilit|electric|\bgas company\b|water|sewer|trash/i, purpose: 'live' },
  { re: /internet|spectrum|wifi|broadband/i, purpose: 'live' },
  { re: /mobile phone|cell phone|verizon|at&t|t-?mobile/i, purpose: 'live' },
  { re: /geico|auto insurance|renters? insurance|home insurance|term life|life insurance|medical plan|dental|vision|disability|critical illness|accident ins/i, purpose: 'live' },
  { re: /groceries|grocery/i, purpose: 'live' },
  { re: /\bfuel\b|\bgas\b|maintenance|tires|registration|tolls|parking|public transit/i, purpose: 'live' },
  { re: /doctor|pharmacy|medical|prescription/i, purpose: 'live' },
  { re: /cleaning supplies|household goods|home maintenance/i, purpose: 'live' },
];

/** Discretionary lines. */
const ENJOY_RULES: Rule[] = [
  { re: /restaurant|dining|coffee|starbucks|doordash|uber eats/i, purpose: 'enjoy' },
  { re: /guilt.?free|entertainment|movies?|games?|concerts?|date night|starz|siriusxm|audible|youtube|memberships/i, purpose: 'enjoy' },
  { re: /clothing|electronics|shopping/i, purpose: 'enjoy' },
  { re: /flights?|hotels?|travel|vacation(?! loan)/i, purpose: 'enjoy' },
  { re: /gifts?|birthday|christmas|anniversar|graduation|valentine/i, purpose: 'enjoy' },
];

const TAX_BENEFIT_RULES: Rule[] = [
  { re: /withholding|oasdi|fed med|medicare|fica|\btax\b/i, purpose: 'payroll_deduction' },
];

export interface ClassifyInput {
  categoryName?: string | null;
  groupName?: string | null;
  /** fixed | flexible | non_monthly | payroll_deduction | income */
  expenseType?: string | null;
  /** personal | business */
  budgetType?: string | null;
}

/**
 * Derive a Money Purpose. Returns `null` for income rows (income has no purpose —
 * it is the denominator, not an allocation).
 */
export function classifyMoneyPurpose(input: ClassifyInput): MoneyPurpose | null {
  const name = `${input.categoryName || ''}`.trim();
  const group = `${input.groupName || ''}`.trim();
  const hay = `${name} ${group}`;
  const expenseType = (input.expenseType || 'flexible').toLowerCase();
  const budgetType = (input.budgetType || 'personal').toLowerCase();

  if (expenseType === 'income') return null;

  // Employer money is never personal, whatever the group says.
  for (const r of EMPLOYER_RULES) if (r.re.test(hay)) return 'employer_contribution';

  // Business stays out of personal ratios entirely.
  if (budgetType === 'business') return 'business';

  const ordered: Rule[][] = [WEALTH_RULES, DEBT_RULES, LIVE_RULES, ENJOY_RULES, TAX_BENEFIT_RULES];
  for (const set of ordered) {
    for (const r of set) if (r.re.test(name) || r.re.test(group)) return r.purpose;
  }

  // Payroll rows that are neither wealth nor an obvious tax are still deductions.
  if (expenseType === 'payroll_deduction') return 'payroll_deduction';

  // Sensible defaults by expense behaviour.
  return expenseType === 'fixed' ? 'live' : 'enjoy';
}

/** Convenience: purposes that consume take-home cash. */
export function consumesTakeHome(p: MoneyPurpose | null | undefined): boolean {
  return p === 'live' || p === 'enjoy' || p === 'build_wealth' || p === 'eliminate_debt';
}

export function isPersonalPurpose(p: MoneyPurpose | null | undefined): boolean {
  return !!p && (PERSONAL_PURPOSES as (MoneyPurpose | null)[]).includes(p);
}

export function statusFor(
  purpose: 'live' | 'enjoy' | 'build_wealth' | 'eliminate_debt',
  actualPct: number,
  target: number,
): 'on' | 'watch' | 'off' {
  // Build Wealth is a floor; the others are ceilings.
  const diff = purpose === 'build_wealth' ? actualPct - target : target - actualPct;
  if (diff >= 0) return 'on';
  if (diff >= -5) return 'watch';
  return 'off';
}
