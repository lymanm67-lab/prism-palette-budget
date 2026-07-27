// The Montgomery Money Blueprint™ — conscious spending plan math.
// Section names are ours; the formulas mirror the classic worksheet:
//   Buffer = 15% of the Foundation rows above it
//   Freedom Spending = net income − Foundation − Wealth Engine − Future Fund

export type BucketKey = 'foundation' | 'wealthEngine' | 'futureFund' | 'freedom';

export interface BlueprintRow {
  key: string;
  label: string;
  amount: number;
  custom?: boolean;
}

export interface BalanceSheet {
  assets: number;
  investments: number;
  savings: number;
  debt: number;
}

export interface IncomeBlock {
  grossMonthly: number;
  netMonthly: number;
}

export interface BlueprintBuckets {
  foundation: BlueprintRow[];
  wealthEngine: BlueprintRow[];
  futureFund: BlueprintRow[];
}

export interface BlueprintState {
  name: string;
  balanceSheet: BalanceSheet;
  income: IncomeBlock;
  buckets: BlueprintBuckets;
}

export const BUFFER_KEY = 'buffer';
export const BUFFER_RATE = 0.15;

export const BUCKET_META: Record<BucketKey, { label: string; blurb: string; min: number; max: number }> = {
  foundation: {
    label: 'Foundation Costs',
    blurb: 'Roof, wheels, food, minimums — the non-negotiables.',
    min: 50,
    max: 60,
  },
  wealthEngine: {
    label: 'Wealth Engine',
    blurb: 'Post-tax investing that compounds while you sleep.',
    min: 10,
    max: 100,
  },
  futureFund: {
    label: 'Future Fund',
    blurb: 'Named savings goals and the long-term emergency reserve.',
    min: 5,
    max: 10,
  },
  freedom: {
    label: 'Freedom Spending',
    blurb: 'Dining out, travel days, anything you want — guilt free.',
    min: 20,
    max: 35,
  },
};

export const DEFAULT_FOUNDATION: BlueprintRow[] = [
  { key: 'rent', label: 'Rent / Mortgage', amount: 0 },
  { key: 'utilities', label: 'Utilities (gas, water, electric, internet)', amount: 0 },
  { key: 'insurance', label: 'Insurance (medical, auto, home / renters)', amount: 0 },
  { key: 'transportation', label: 'Car Payment / Transportation', amount: 0 },
  { key: 'debt', label: 'Debt Payments', amount: 0 },
  { key: 'groceries', label: 'Groceries', amount: 0 },
  { key: 'clothes', label: 'Clothes', amount: 0 },
  { key: 'phone', label: 'Phone', amount: 0 },
  { key: 'subscriptions', label: 'Subscriptions (streaming, gym, Amazon)', amount: 0 },
];

export const DEFAULT_WEALTH_ENGINE: BlueprintRow[] = [
  { key: 'postTaxRetirement', label: 'Post-Tax Retirement Savings', amount: 0 },
  { key: 'stocks', label: 'Stocks / Brokerage', amount: 0 },
];

export const DEFAULT_FUTURE_FUND: BlueprintRow[] = [
  { key: 'vacations', label: 'Vacations', amount: 0 },
  { key: 'gifts', label: 'Gifts', amount: 0 },
  { key: 'emergency', label: 'Long-Term Emergency Fund', amount: 0 },
];

export function emptyBlueprint(): BlueprintState {
  return {
    name: 'The Montgomery Money Blueprint',
    balanceSheet: { assets: 0, investments: 0, savings: 0, debt: 0 },
    income: { grossMonthly: 0, netMonthly: 0 },
    buckets: {
      foundation: DEFAULT_FOUNDATION.map((r) => ({ ...r })),
      wealthEngine: DEFAULT_WEALTH_ENGINE.map((r) => ({ ...r })),
      futureFund: DEFAULT_FUTURE_FUND.map((r) => ({ ...r })),
    },
  };
}

const sum = (rows: BlueprintRow[]) => rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

export interface BucketResult {
  key: BucketKey;
  label: string;
  total: number;
  pct: number;
  status: 'in' | 'over' | 'under';
  min: number;
  max: number;
}

export interface BlueprintResult {
  netWorth: number;
  bufferAmount: number;
  foundationTotal: number;
  wealthEngineTotal: number;
  futureFundTotal: number;
  freedomTotal: number;
  allocated: number;
  buckets: BucketResult[];
  savingsRatePct: number;
}

function score(pct: number, min: number, max: number): 'in' | 'over' | 'under' {
  if (pct > max) return 'over';
  if (pct < min) return 'under';
  return 'in';
}

export function computeBlueprint(state: BlueprintState): BlueprintResult {
  const bs = state.balanceSheet;
  const netWorth =
    (Number(bs.assets) || 0) + (Number(bs.investments) || 0) + (Number(bs.savings) || 0) - (Number(bs.debt) || 0);

  const net = Number(state.income.netMonthly) || 0;

  const foundationRows = sum(state.buckets.foundation);
  const bufferAmount = Math.round(foundationRows * BUFFER_RATE * 100) / 100;
  const foundationTotal = foundationRows + bufferAmount;
  const wealthEngineTotal = sum(state.buckets.wealthEngine);
  const futureFundTotal = sum(state.buckets.futureFund);
  const freedomTotal = net - foundationTotal - wealthEngineTotal - futureFundTotal;

  const pct = (n: number) => (net > 0 ? Math.round((n / net) * 1000) / 10 : 0);

  const buckets: BucketResult[] = (
    [
      ['foundation', foundationTotal],
      ['wealthEngine', wealthEngineTotal],
      ['futureFund', futureFundTotal],
      ['freedom', freedomTotal],
    ] as [BucketKey, number][]
  ).map(([key, total]) => {
    const meta = BUCKET_META[key];
    const p = pct(total);
    return { key, label: meta.label, total, pct: p, status: score(p, meta.min, meta.max), min: meta.min, max: meta.max };
  });

  return {
    netWorth,
    bufferAmount,
    foundationTotal,
    wealthEngineTotal,
    futureFundTotal,
    freedomTotal,
    allocated: foundationTotal + wealthEngineTotal + futureFundTotal + Math.max(freedomTotal, 0),
    buckets,
    savingsRatePct: pct(wealthEngineTotal + futureFundTotal),
  };
}
