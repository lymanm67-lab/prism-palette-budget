// Managed-Portfolio Recommendation Layer (educational, non-discretionary)
// Classifies real holdings into asset classes, compares to model portfolios,
// and quantifies drift + fee drag. No trades, no advice.

export type AssetClass =
  | 'us_equity'
  | 'intl_equity'
  | 'bonds'
  | 'real_estate'
  | 'cash'
  | 'other';

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  us_equity: 'US Equity',
  intl_equity: 'International Equity',
  bonds: 'Bonds / Fixed Income',
  real_estate: 'Real Estate',
  cash: 'Cash / Stable Value',
  other: 'Other / Unclassified',
};

export const ASSET_CLASS_ORDER: AssetClass[] = [
  'us_equity',
  'intl_equity',
  'bonds',
  'real_estate',
  'cash',
  'other',
];

// ---------------------------------------------------------------- classification

const RULES: { cls: AssetClass; re: RegExp }[] = [
  { cls: 'cash', re: /\b(money market|stable value|cash|treasury bill|t-?bill|sweep|savings|cd\b|vmfxx|spaxx|swvxx)\b/i },
  { cls: 'bonds', re: /\b(bond|fixed income|aggregate|tips|treasury|credit|core plus|bnd|agg|bndx|vbtlx|fxnax|pttrx|schz|govt)\b/i },
  { cls: 'real_estate', re: /\b(reit|real estate|property|vnq|vgslx|schh|usrt)\b/i },
  { cls: 'intl_equity', re: /\b(international|global ex|foreign|emerging|developed markets|world ex|vxus|vtiax|veu|iefa|iemg|vwo|ftse all-world)\b/i },
  { cls: 'us_equity', re: /\b(s&p 500|total stock|large cap|mid cap|small cap|growth|value|equity index|russell|nasdaq|vti|voo|vtsax|fxaix|spy|qqq|iwm|vug|vtv)\b/i },
];

/** Best-effort asset-class classification from symbol, name, and holding_type. */
export function classifyHolding(h: {
  symbol?: string | null;
  name?: string | null;
  holding_type?: string | null;
}): AssetClass {
  const text = `${h.symbol ?? ''} ${h.name ?? ''}`.trim();
  for (const r of RULES) if (r.re.test(text)) return r.cls;

  const t = (h.holding_type ?? '').toLowerCase();
  if (t.includes('cash')) return 'cash';
  if (t.includes('bond') || t.includes('fixed')) return 'bonds';
  if (t === 'equity' || t === 'stock') return 'us_equity';
  if (t === 'etf' || t === 'mutual_fund' || t === 'fund') return 'us_equity';
  return 'other';
}

/** Rough expense-ratio estimate (decimal, e.g. 0.0003 = 0.03%). */
export function estimateExpenseRatio(h: {
  symbol?: string | null;
  name?: string | null;
  holding_type?: string | null;
}): number {
  const sym = (h.symbol ?? '').toUpperCase();
  const CHEAP: Record<string, number> = {
    VTI: 0.0003, VOO: 0.0003, VTSAX: 0.0004, FXAIX: 0.00015, SPY: 0.00095,
    VXUS: 0.0007, VTIAX: 0.0011, IEFA: 0.0007, VWO: 0.0008,
    BND: 0.0003, BNDX: 0.0007, VBTLX: 0.0005, FXNAX: 0.00025,
    VNQ: 0.0013, SCHH: 0.0007, QQQ: 0.002,
  };
  if (CHEAP[sym] !== undefined) return CHEAP[sym];

  const name = (h.name ?? '').toLowerCase();
  if (/index|idx/.test(name)) return 0.0015;
  if (/target ?date|lifecycle|retirement 20\d\d/.test(name)) return 0.005;
  if (/money market|stable value/.test(name)) return 0.002;
  if (/annuity|variable/.test(name)) return 0.011;
  if ((h.holding_type ?? '').toLowerCase() === 'mutual_fund') return 0.006;
  return 0.0045; // conservative default for unclassified funds
}

// ---------------------------------------------------------------- risk profiler

export interface ProfilerAnswers {
  horizonYears: number;      // years until money is needed
  lossTolerance: number;     // 1 (sell) .. 5 (buy more)
  incomeStability: number;   // 1 (volatile) .. 5 (very stable)
  experience: number;        // 1 (none) .. 5 (extensive)
  cashCushionMonths: number; // emergency fund months
}

export const DEFAULT_ANSWERS: ProfilerAnswers = {
  horizonYears: 16,
  lossTolerance: 3,
  incomeStability: 4,
  experience: 3,
  cashCushionMonths: 3,
};

export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export function scoreRisk(a: ProfilerAnswers): { score: number; level: RiskLevel } {
  const horizonPts =
    a.horizonYears >= 20 ? 5 : a.horizonYears >= 15 ? 4 : a.horizonYears >= 10 ? 3 : a.horizonYears >= 5 ? 2 : 1;
  const cushionPts =
    a.cashCushionMonths >= 6 ? 5 : a.cashCushionMonths >= 4 ? 4 : a.cashCushionMonths >= 3 ? 3 : a.cashCushionMonths >= 1 ? 2 : 1;

  // Horizon and loss tolerance dominate.
  const score =
    horizonPts * 0.32 +
    a.lossTolerance * 0.28 +
    a.incomeStability * 0.16 +
    cushionPts * 0.14 +
    a.experience * 0.1;

  const level: RiskLevel =
    score >= 4.4 ? 5 : score >= 3.6 ? 4 : score >= 2.8 ? 3 : score >= 2.0 ? 2 : 1;
  return { score: Math.round(score * 100) / 100, level };
}

// ---------------------------------------------------------------- model portfolios

export interface ModelPortfolio {
  level: RiskLevel;
  name: string;
  description: string;
  targets: Record<Exclude<AssetClass, 'other'>, number>; // percentages, sum 100
  sleeves: { symbol: string; name: string; cls: AssetClass; weight: number; er: number }[];
  blendedEr: number; // decimal
}

function blended(sleeves: ModelPortfolio['sleeves']): number {
  return sleeves.reduce((s, x) => s + (x.weight / 100) * x.er, 0);
}

function build(
  level: RiskLevel,
  name: string,
  description: string,
  w: { us: number; intl: number; bonds: number; re: number; cash: number },
): ModelPortfolio {
  const sleeves = [
    { symbol: 'VTI', name: 'Total US Stock Market', cls: 'us_equity' as AssetClass, weight: w.us, er: 0.0003 },
    { symbol: 'VXUS', name: 'Total International Stock', cls: 'intl_equity' as AssetClass, weight: w.intl, er: 0.0007 },
    { symbol: 'BND', name: 'Total US Bond Market', cls: 'bonds' as AssetClass, weight: w.bonds, er: 0.0003 },
    { symbol: 'VNQ', name: 'US Real Estate (REIT)', cls: 'real_estate' as AssetClass, weight: w.re, er: 0.0013 },
    { symbol: 'VMFXX', name: 'Money Market / Cash', cls: 'cash' as AssetClass, weight: w.cash, er: 0.0011 },
  ].filter((s) => s.weight > 0);

  return {
    level,
    name,
    description,
    targets: { us_equity: w.us, intl_equity: w.intl, bonds: w.bonds, real_estate: w.re, cash: w.cash },
    sleeves,
    blendedEr: blended(sleeves),
  };
}

export const MODEL_PORTFOLIOS: Record<RiskLevel, ModelPortfolio> = {
  1: build(1, 'Conservative', 'Capital preservation. Short horizon or low tolerance for drawdowns.', { us: 20, intl: 8, bonds: 57, re: 0, cash: 15 }),
  2: build(2, 'Moderately Conservative', 'Income-tilted with a modest growth sleeve.', { us: 32, intl: 13, bonds: 45, re: 3, cash: 7 }),
  3: build(3, 'Balanced', 'Classic 60/40 with a small real-asset sleeve.', { us: 42, intl: 18, bonds: 32, re: 5, cash: 3 }),
  4: build(4, 'Growth', 'Long horizon, tolerates meaningful volatility.', { us: 54, intl: 23, bonds: 16, re: 5, cash: 2 }),
  5: build(5, 'Aggressive Growth', 'Maximum long-run growth. Expect deep drawdowns.', { us: 62, intl: 28, bonds: 4, re: 5, cash: 1 }),
};

// ---------------------------------------------------------------- drift analysis

export interface HoldingLike {
  id?: string;
  symbol?: string | null;
  name?: string | null;
  holding_type?: string | null;
  market_value?: number | null;
  accounts?: { name?: string | null } | null;
}

export interface DriftRow {
  cls: AssetClass;
  label: string;
  actualValue: number;
  actualPct: number;
  targetPct: number;
  driftPct: number;       // actual - target
  dollarDelta: number;    // + = overweight, - = underweight
  status: 'on_target' | 'over' | 'under';
}

export interface PortfolioAnalysis {
  total: number;
  rows: DriftRow[];
  currentEr: number;      // decimal
  modelEr: number;        // decimal
  maxAbsDrift: number;
  needsRebalance: boolean;
}

const TOLERANCE = 5; // percentage points

export function analyzePortfolio(
  holdings: HoldingLike[],
  model: ModelPortfolio,
): PortfolioAnalysis {
  const buckets: Record<AssetClass, number> = {
    us_equity: 0, intl_equity: 0, bonds: 0, real_estate: 0, cash: 0, other: 0,
  };
  let total = 0;
  let erWeighted = 0;

  for (const h of holdings) {
    const mv = Number(h.market_value ?? 0);
    if (!mv || mv <= 0) continue;
    buckets[classifyHolding(h)] += mv;
    erWeighted += mv * estimateExpenseRatio(h);
    total += mv;
  }

  const rows: DriftRow[] = ASSET_CLASS_ORDER.map((cls) => {
    const actualValue = buckets[cls];
    const actualPct = total > 0 ? (actualValue / total) * 100 : 0;
    const targetPct = cls === 'other' ? 0 : model.targets[cls];
    const driftPct = actualPct - targetPct;
    return {
      cls,
      label: ASSET_CLASS_LABELS[cls],
      actualValue,
      actualPct,
      targetPct,
      driftPct,
      dollarDelta: (driftPct / 100) * total,
      status: Math.abs(driftPct) <= TOLERANCE ? 'on_target' : driftPct > 0 ? 'over' : 'under',
    };
  }).filter((r) => r.actualValue > 0 || r.targetPct > 0);

  const maxAbsDrift = rows.reduce((m, r) => Math.max(m, Math.abs(r.driftPct)), 0);

  return {
    total,
    rows,
    currentEr: total > 0 ? erWeighted / total : 0,
    modelEr: model.blendedEr,
    maxAbsDrift,
    needsRebalance: maxAbsDrift > TOLERANCE,
  };
}

// ---------------------------------------------------------------- rebalance suggestions

const TAX_DEFERRED_RE = /\b(401|403|457|ira|tda|tsa|opers|deferred|pension|hsa)\b/i;

export type AccountBias = 'tax_deferred' | 'taxable' | 'either';

export const TAX_LOCATION_PREF: Record<AssetClass, AccountBias> = {
  bonds: 'tax_deferred',
  real_estate: 'tax_deferred',
  us_equity: 'taxable',
  intl_equity: 'taxable',
  cash: 'either',
  other: 'either',
};

export interface RebalanceStep {
  action: 'trim' | 'add';
  cls: AssetClass;
  label: string;
  amount: number;
  note: string;
}

export function buildRebalanceSteps(
  analysis: PortfolioAnalysis,
  holdings: HoldingLike[],
): RebalanceStep[] {
  const hasTaxDeferred = holdings.some((h) => TAX_DEFERRED_RE.test(h.accounts?.name ?? ''));
  const steps: RebalanceStep[] = [];

  for (const r of analysis.rows) {
    if (r.status === 'on_target') continue;
    const pref = TAX_LOCATION_PREF[r.cls];
    const loc =
      pref === 'tax_deferred'
        ? hasTaxDeferred
          ? 'Do this inside a tax-deferred account (457/TDA/IRA) first — interest and REIT income are taxed as ordinary income.'
          : 'Prefer a tax-deferred account when one is available.'
        : pref === 'taxable'
          ? 'Broad stock index funds are tax-efficient, so this sleeve is fine in a taxable brokerage.'
          : 'Location is not tax-sensitive for this sleeve.';

    if (r.cls === 'other') {
      steps.push({
        action: 'trim',
        cls: r.cls,
        label: r.label,
        amount: Math.abs(r.dollarDelta),
        note: 'Unclassified holdings — add a ticker symbol so they can be mapped to an asset class.',
      });
      continue;
    }

    steps.push({
      action: r.status === 'over' ? 'trim' : 'add',
      cls: r.cls,
      label: r.label,
      amount: Math.abs(r.dollarDelta),
      note: loc,
    });
  }

  return steps.sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------- fee drag

export interface FeeDragResult {
  years: number;
  currentEr: number;
  modelEr: number;
  erSavings: number;
  currentFinal: number;
  modelFinal: number;
  lifetimeSavings: number;
  annualFeesToday: number;
  annualFeesModel: number;
}

export function computeFeeDrag(
  balance: number,
  annualContribution: number,
  grossReturn: number, // decimal, e.g. 0.08
  years: number,
  currentEr: number,
  modelEr: number,
): FeeDragResult {
  const grow = (er: number) => {
    const r = grossReturn - er;
    let v = balance;
    for (let i = 0; i < years; i++) v = v * (1 + r) + annualContribution;
    return v;
  };
  const currentFinal = grow(currentEr);
  const modelFinal = grow(modelEr);
  return {
    years,
    currentEr,
    modelEr,
    erSavings: currentEr - modelEr,
    currentFinal,
    modelFinal,
    lifetimeSavings: modelFinal - currentFinal,
    annualFeesToday: balance * currentEr,
    annualFeesModel: balance * modelEr,
  };
}
