// Prism Five Investment Roles — every investment must have a job.
// Original Prism architecture. All outputs are estimates, not guarantees.

export type InvestmentRole = 'CORE' | 'MOMENTUM' | 'GUARDRAIL' | 'CONVICTION' | 'CATALYST';

export const ROLES: InvestmentRole[] = ['CORE', 'MOMENTUM', 'GUARDRAIL', 'CONVICTION', 'CATALYST'];

/** Suggested per-position cap (% of portfolio) by role — a starting point, always editable. */
export const DEFAULT_ROLE_POSITION_CAP: Record<InvestmentRole, number> = {
  CORE: 40,
  MOMENTUM: 20,
  GUARDRAIL: 20,
  CONVICTION: 10,
  CATALYST: 10,
};

export interface RoleMeta {
  role: InvestmentRole;
  purpose: string;
  job: string;
  riskBucket: 'foundation' | 'growth' | 'defensive' | 'opportunistic' | 'strategic';
  riskBucketLabel: string;
  defaultBenchmark: string;
  defaultBenchmarkLabel: string;
  defaultReturn: number;
  defaultVolatility: number;
  accent: string;
}

export const ROLE_META: Record<InvestmentRole, RoleMeta> = {
  CORE: {
    role: 'CORE',
    purpose: 'Long-term foundation',
    job: 'Carries the long-term weight of the portfolio. Judged on steady compounding, not excitement.',
    riskBucket: 'foundation',
    riskBucketLabel: 'Foundation',
    defaultBenchmark: 'SPY',
    defaultBenchmarkLabel: 'US large-cap total market',
    defaultReturn: 8,
    defaultVolatility: 15,
    accent: 'bg-primary/15 text-primary border-primary/30',
  },
  MOMENTUM: {
    role: 'MOMENTUM',
    purpose: 'Additional growth',
    job: 'Adds growth on top of the foundation. Subordinate to CORE — it never becomes the plan.',
    riskBucket: 'growth',
    riskBucketLabel: 'Growth',
    defaultBenchmark: 'MTUM',
    defaultBenchmarkLabel: 'US momentum factor',
    defaultReturn: 9.5,
    defaultVolatility: 19,
    accent: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  GUARDRAIL: {
    role: 'GUARDRAIL',
    purpose: 'Diversification, risk management, resilience',
    job: 'Judged partly by how well it protects the strategy in bad markets, not by return alone.',
    riskBucket: 'defensive',
    riskBucketLabel: 'Defensive',
    defaultBenchmark: 'AOM',
    defaultBenchmarkLabel: 'Diversified moderate allocation',
    defaultReturn: 5.5,
    defaultVolatility: 9,
    accent: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  },
  CONVICTION: {
    role: 'CONVICTION',
    purpose: 'Personally researched opportunities',
    job: 'Held because of a written thesis. When the thesis breaks, the position is reviewed — not defended.',
    riskBucket: 'opportunistic',
    riskBucketLabel: 'Opportunistic',
    defaultBenchmark: 'QQQ',
    defaultBenchmarkLabel: 'Growth / innovation proxy',
    defaultReturn: 11,
    defaultVolatility: 28,
    accent: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  },
  CATALYST: {
    role: 'CATALYST',
    purpose: 'Strategic opportunity driven by an identifiable development',
    job: 'Held because of a named catalyst — industry, policy, technology, demographic, infrastructure or geopolitical. When the catalyst completes, the position is re-decided.',
    riskBucket: 'strategic',
    riskBucketLabel: 'Strategic',
    defaultBenchmark: 'ITA',
    defaultBenchmarkLabel: 'Thematic / sector proxy',
    defaultReturn: 10,
    defaultVolatility: 24,
    accent: 'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  },
};

export const CATALYST_CATEGORIES = [
  'Industry development',
  'Leadership change',
  'Policy or regulation',
  'Technology shift',
  'Economic cycle',
  'Demographic trend',
  'Infrastructure spending',
  'Geopolitical development',
] as const;

export const ACCOUNT_TYPES = [
  { value: 'tda_403b', label: '403(b) / TDA (pre-tax)', tax: 'Tax-deferred — taxed as income on withdrawal' },
  { value: 'roth_tda', label: 'Roth TDA', tax: 'Tax-free growth and qualified withdrawals' },
  { value: 'plan_457b', label: '457(b) (pre-tax)', tax: 'Tax-deferred — taxed as income on withdrawal' },
  { value: 'roth_457b', label: 'Roth 457(b)', tax: 'Tax-free growth and qualified withdrawals' },
  { value: 'traditional_ira', label: 'Traditional IRA', tax: 'Tax-deferred — taxed as income on withdrawal' },
  { value: 'roth_ira', label: 'Roth IRA', tax: 'Tax-free growth and qualified withdrawals' },
  { value: 'hsa', label: 'HSA', tax: 'Triple tax advantaged for qualified medical costs' },
  { value: 'taxable', label: 'Taxable brokerage', tax: 'Capital gains and dividends are taxable' },
  { value: 'sofi_investments', label: 'SoFi Investments (taxable)', tax: 'Capital gains and dividends are taxable' },
  { value: 'other', label: 'Other', tax: 'Confirm tax treatment' },
] as const;

export const FUNDING_SOURCES = [
  { value: 'payroll', label: 'Payroll deferral' },
  { value: 'employer', label: 'Employer contribution' },
  { value: 'monthly_cash_flow', label: 'Monthly cash flow' },
  { value: 'debt_payoff_redirect', label: 'Debt payoff redirect' },
  { value: 'tax_refund', label: 'Tax refund' },
  { value: 'raise', label: 'Raise' },
  { value: 'bonus', label: 'Bonus' },
  { value: 'consulting', label: 'Consulting income' },
  { value: 'business', label: 'Business distribution' },
  { value: 'buffer_excess', label: 'Buffer excess' },
  { value: 'stock_sale', label: 'Stock sale proceeds' },
  { value: 'sofi_transfer', label: 'SoFi transfer' },
  { value: 'other', label: 'Other' },
] as const;

export const POSITION_STATUSES = [
  { value: 'hold', label: 'Hold' },
  { value: 'add', label: 'Add' },
  { value: 'pause', label: 'Pause purchases' },
  { value: 'reduce', label: 'Reduce' },
  { value: 'exit', label: 'Exit' },
  { value: 'review', label: 'Review required' },
] as const;

export const SECURITY_TYPES = [
  { value: 'etf', label: 'ETF' },
  { value: 'stock', label: 'Individual stock' },
  { value: 'mutual_fund', label: 'Mutual fund' },
  { value: 'closed_end_fund', label: 'Closed-end fund' },
  { value: 'etn', label: 'ETN' },
  { value: 'other', label: 'Other' },
  { value: 'unverified', label: 'Instrument requires verification' },
] as const;

export function securityTypeLabel(type?: string | null): string {
  if (!type) return 'Instrument requires verification';
  return SECURITY_TYPES.find((t) => t.value === type)?.label ?? 'Instrument requires verification';
}

// ---------- allocation ----------

export interface PositionLike {
  id: string;
  role: string;
  ticker: string;
  name?: string | null;
  security_type?: string | null;
  verified?: boolean | null;
  account_type: string;
  shares: number;
  current_price?: number | null;
  cost_basis: number;
  entry_date?: string | null;
  dividend_income_ytd?: number | null;
  status?: string | null;
  thesis_state?: string | null;
  catalyst_state?: string | null;
}

export function positionValue(p: PositionLike): number {
  const price = Number(p.current_price ?? 0);
  const shares = Number(p.shares ?? 0);
  const value = price * shares;
  // Fall back to cost basis when no price is available, so allocation is never silently 0.
  return value > 0 ? value : Number(p.cost_basis ?? 0);
}

export function positionGain(p: PositionLike): number {
  return positionValue(p) - Number(p.cost_basis ?? 0);
}

export interface RoleAllocation {
  role: InvestmentRole;
  value: number;
  currentPct: number;
  targetPct: number;
  driftPp: number;
  dollarGap: number;
  state: 'underweight' | 'on_target' | 'overweight';
  positions: PositionLike[];
}

export function computeAllocation(
  positions: PositionLike[],
  targets: Partial<Record<InvestmentRole, number>>,
  driftBandPp = 5,
): { total: number; rows: RoleAllocation[]; maxDriftPp: number; targetsTotal: number } {
  const total = positions.reduce((s, p) => s + positionValue(p), 0);
  const targetsTotal = ROLES.reduce((s, r) => s + Number(targets[r] ?? 0), 0);

  const rows = ROLES.map<RoleAllocation>((role) => {
    const rolePositions = positions.filter((p) => p.role === role);
    const value = rolePositions.reduce((s, p) => s + positionValue(p), 0);
    const currentPct = total > 0 ? (value / total) * 100 : 0;
    const targetPct = Number(targets[role] ?? 0);
    const driftPp = currentPct - targetPct;
    const targetDollars = total * (targetPct / 100);
    const state: RoleAllocation['state'] =
      Math.abs(driftPp) <= driftBandPp ? 'on_target' : driftPp < 0 ? 'underweight' : 'overweight';
    return {
      role,
      value,
      currentPct,
      targetPct,
      driftPp,
      dollarGap: targetDollars - value,
      state,
      positions: rolePositions,
    };
  });

  const maxDriftPp = rows.reduce((m, r) => Math.max(m, Math.abs(r.driftPp)), 0);
  return { total, rows, maxDriftPp, targetsTotal };
}

// ---------- concentration ----------

export interface ConcentrationRow {
  scope: 'security' | 'role' | 'account' | 'tactical';
  label: string;
  value: number;
  pct: number;
  limitPct: number;
  breached: boolean;
}

export function computeConcentration(
  positions: PositionLike[],
  opts: { securityLimitPct?: number; tacticalWarnPct?: number; roleLimits?: Partial<Record<InvestmentRole, number>> } = {},
): ConcentrationRow[] {
  const total = positions.reduce((s, p) => s + positionValue(p), 0);
  if (total <= 0) return [];
  const securityLimit = opts.securityLimitPct ?? 25;
  const tacticalWarn = opts.tacticalWarnPct ?? 20;
  const rows: ConcentrationRow[] = [];

  const bySecurity = new Map<string, number>();
  positions.forEach((p) => {
    bySecurity.set(p.ticker, (bySecurity.get(p.ticker) ?? 0) + positionValue(p));
  });
  [...bySecurity.entries()]
    .sort((a, b) => b[1] - a[1])
    .forEach(([ticker, value]) => {
      const pct = (value / total) * 100;
      rows.push({ scope: 'security', label: ticker, value, pct, limitPct: securityLimit, breached: pct > securityLimit });
    });

  ROLES.forEach((role) => {
    const value = positions.filter((p) => p.role === role).reduce((s, p) => s + positionValue(p), 0);
    const limit = opts.roleLimits?.[role];
    if (!limit) return;
    const pct = (value / total) * 100;
    rows.push({ scope: 'role', label: `${role} role cap`, value, pct, limitPct: limit, breached: pct > limit });
  });

  const tacticalValue = positions
    .filter((p) => p.role === 'CONVICTION' || p.role === 'CATALYST')
    .reduce((s, p) => s + positionValue(p), 0);
  const tacticalPct = (tacticalValue / total) * 100;
  rows.push({
    scope: 'tactical',
    label: 'CONVICTION + CATALYST combined',
    value: tacticalValue,
    pct: tacticalPct,
    limitPct: tacticalWarn,
    breached: tacticalPct > tacticalWarn,
  });

  return rows;
}

// ---------- overlap ----------

export interface FundHolding {
  ticker: string;          // the fund
  holding_symbol?: string | null;
  holding_name: string;
  weight_pct: number;
  sector?: string | null;
}

export interface OverlapRow {
  name: string;
  symbol: string | null;
  effectivePct: number;    // % of total portfolio
  funds: { ticker: string; weightPct: number }[];
}

export function computeOverlap(
  positions: PositionLike[],
  fundHoldings: FundHolding[],
): { score: number; rows: OverlapRow[]; sectors: { sector: string; pct: number }[] } {
  const total = positions.reduce((s, p) => s + positionValue(p), 0);
  if (total <= 0) return { score: 0, rows: [], sectors: [] };

  const byName = new Map<string, OverlapRow>();
  const bySector = new Map<string, number>();

  positions.forEach((p) => {
    const weightOfPortfolio = positionValue(p) / total;
    const holdings = fundHoldings.filter((h) => h.ticker.toUpperCase() === p.ticker.toUpperCase());
    if (holdings.length === 0) {
      // Direct security: it is 100% itself.
      const key = (p.name || p.ticker).toUpperCase();
      const row = byName.get(key) ?? { name: p.name || p.ticker, symbol: p.ticker, effectivePct: 0, funds: [] };
      row.effectivePct += weightOfPortfolio * 100;
      row.funds.push({ ticker: p.ticker, weightPct: 100 });
      byName.set(key, row);
      return;
    }
    holdings.forEach((h) => {
      const key = (h.holding_symbol || h.holding_name).toUpperCase();
      const row = byName.get(key) ?? {
        name: h.holding_name,
        symbol: h.holding_symbol ?? null,
        effectivePct: 0,
        funds: [],
      };
      row.effectivePct += weightOfPortfolio * Number(h.weight_pct ?? 0);
      row.funds.push({ ticker: p.ticker, weightPct: Number(h.weight_pct ?? 0) });
      byName.set(key, row);
      if (h.sector) {
        bySector.set(h.sector, (bySector.get(h.sector) ?? 0) + weightOfPortfolio * Number(h.weight_pct ?? 0));
      }
    });
  });

  const rows = [...byName.values()].sort((a, b) => b.effectivePct - a.effectivePct);
  // Overlap score: share of the portfolio sitting in names held through 2+ sleeves.
  const shared = rows.filter((r) => new Set(r.funds.map((f) => f.ticker)).size > 1);
  const score = Math.min(100, shared.reduce((s, r) => s + r.effectivePct, 0));
  const sectors = [...bySector.entries()]
    .map(([sector, pct]) => ({ sector, pct }))
    .sort((a, b) => b.pct - a.pct);

  return { score, rows, sectors };
}

// ---------- capital priority ----------

export interface CapitalPriorityInput {
  emergencyCash: number;
  emergencyFloor: number;
  requiredDebtPaymentsCurrent: boolean;
  highInterestDebtBalance: number;
  highInterestOnPlan: boolean;
  sinkingFundShortfall: number;
  coreRetirementOnTrack: boolean;
  monthlyLiquidityAvailable: number;
}

export interface CapitalPriorityStep {
  order: number;
  label: string;
  met: boolean;
  detail: string;
}

export function evaluateCapitalPriority(input: CapitalPriorityInput): {
  steps: CapitalPriorityStep[];
  clearedToInvest: boolean;
  blockingReason: string | null;
} {
  const steps: CapitalPriorityStep[] = [
    {
      order: 1,
      label: 'Emergency cash floor protected',
      met: input.emergencyCash >= input.emergencyFloor,
      detail: `${fmt(input.emergencyCash)} of ${fmt(input.emergencyFloor)} floor`,
    },
    {
      order: 2,
      label: 'Required debt payments current',
      met: input.requiredDebtPaymentsCurrent,
      detail: input.requiredDebtPaymentsCurrent ? 'All minimums current' : 'A required payment is behind',
    },
    {
      order: 3,
      label: 'High-interest debt on plan',
      met: input.highInterestDebtBalance <= 0 || input.highInterestOnPlan,
      detail:
        input.highInterestDebtBalance <= 0
          ? 'No high-interest balances'
          : `${fmt(input.highInterestDebtBalance)} outstanding — payoff plan ${input.highInterestOnPlan ? 'active' : 'not active'}`,
    },
    {
      order: 4,
      label: 'Near-term sinking funds funded',
      met: input.sinkingFundShortfall <= 0,
      detail: input.sinkingFundShortfall <= 0 ? 'Funded' : `${fmt(input.sinkingFundShortfall)} short`,
    },
    {
      order: 5,
      label: 'Core retirement contributions on track',
      met: input.coreRetirementOnTrack,
      detail: input.coreRetirementOnTrack ? 'Payroll contributions active' : 'Core contributions below plan',
    },
    {
      order: 6,
      label: 'Monthly liquidity available',
      met: input.monthlyLiquidityAvailable > 0,
      detail: `${fmt(input.monthlyLiquidityAvailable)} unassigned this month`,
    },
  ];

  const blocking = steps.find((s) => !s.met);
  return {
    steps,
    clearedToInvest: !blocking,
    blockingReason: blocking ? `Do not invest this dollar yet — ${blocking.label.toLowerCase()} is unmet (${blocking.detail}).` : null,
  };
}

// ---------- next dollar ----------

export function nextDollarTarget(rows: RoleAllocation[]): { role: InvestmentRole; reason: string } | null {
  const candidates = rows.filter((r) => r.targetPct > 0 && r.dollarGap > 0).sort((a, b) => b.dollarGap - a.dollarGap);
  if (candidates.length === 0) return null;
  const top = candidates[0];
  return {
    role: top.role,
    reason: `${top.role} is ${Math.abs(top.driftPp).toFixed(1)} points under its ${top.targetPct.toFixed(0)}% target — ${fmt(top.dollarGap)} would bring it back to plan.`,
  };
}

// ---------- risk budget ----------

export function riskBudget(rows: RoleAllocation[]): { bucket: string; pct: number; role: InvestmentRole }[] {
  return rows.map((r) => ({
    bucket: ROLE_META[r.role].riskBucketLabel,
    pct: r.currentPct,
    role: r.role,
  }));
}

// ---------- portfolio decline stress ----------

export function declineStress(total: number, rows: RoleAllocation[]) {
  return [10, 20, 30, 40].map((pct) => {
    const loss = total * (pct / 100);
    const after = total - loss;
    return {
      declinePct: pct,
      loss,
      after,
      recoveryNeededPct: after > 0 ? (total / after - 1) * 100 : 0,
      byRole: rows.map((r) => ({ role: r.role, loss: r.value * (pct / 100) })),
    };
  });
}

// ---------- strategy fit ----------

export function strategyFitScore(args: {
  targetsTotal: number;
  maxDriftPp: number;
  driftBandPp: number;
  overlapScore: number;
  concentrationBreaches: number;
  tacticalPct: number;
  tacticalWarnPct: number;
  emergencyFundIntact: boolean;
  thesesDocumented: number;
  tacticalPositions: number;
}): { score: number; notes: string[] } {
  const notes: string[] = [];
  let score = 100;

  if (Math.abs(args.targetsTotal - 100) > 0.01) {
    score -= 15;
    notes.push(`Role targets total ${args.targetsTotal.toFixed(1)}% — they must total 100%.`);
  }
  const driftOver = Math.max(0, args.maxDriftPp - args.driftBandPp);
  if (driftOver > 0) {
    score -= Math.min(20, driftOver * 2);
    notes.push(`Largest role drift is ${args.maxDriftPp.toFixed(1)} points, past your ${args.driftBandPp}-point band.`);
  }
  if (args.overlapScore > 25) {
    score -= Math.min(15, (args.overlapScore - 25) / 2);
    notes.push(`Overlap score ${args.overlapScore.toFixed(0)} — several sleeves hold the same underlying names.`);
  }
  if (args.concentrationBreaches > 0) {
    score -= Math.min(20, args.concentrationBreaches * 7);
    notes.push(`${args.concentrationBreaches} concentration limit(s) exceeded.`);
  }
  if (args.tacticalPct > args.tacticalWarnPct) {
    score -= Math.min(15, args.tacticalPct - args.tacticalWarnPct);
    notes.push(`CONVICTION + CATALYST is ${args.tacticalPct.toFixed(1)}% versus your ${args.tacticalWarnPct}% warning line.`);
  }
  if (!args.emergencyFundIntact) {
    score -= 15;
    notes.push('Emergency cash is below its floor — protection comes before growth.');
  }
  if (args.tacticalPositions > 0 && args.thesesDocumented < args.tacticalPositions) {
    score -= Math.min(10, (args.tacticalPositions - args.thesesDocumented) * 5);
    notes.push('Some CONVICTION/CATALYST positions have no written thesis or catalyst.');
  }

  return { score: Math.max(0, Math.round(score)), notes };
}

// ---------- tax ----------

export function holdingPeriod(entryDate?: string | null): { days: number; longTerm: boolean } | null {
  if (!entryDate) return null;
  const start = new Date(entryDate).getTime();
  if (Number.isNaN(start)) return null;
  const days = Math.floor((Date.now() - start) / 86_400_000);
  return { days, longTerm: days > 365 };
}

export function saleEstimate(p: PositionLike, sharesSold: number, taxRatePct = 15) {
  const shares = Number(p.shares ?? 0);
  const fraction = shares > 0 ? Math.min(1, sharesSold / shares) : 0;
  const proceeds = positionValue(p) * fraction;
  const basis = Number(p.cost_basis ?? 0) * fraction;
  const gain = proceeds - basis;           // Proceeds are never treated as gain.
  const taxable = Math.max(0, gain);
  return {
    proceeds,
    basis,
    gain,
    estimatedTax: taxable * (taxRatePct / 100),
    netProceeds: proceeds - taxable * (taxRatePct / 100),
    longTerm: holdingPeriod(p.entry_date)?.longTerm ?? false,
  };
}

export function stressLevels(total: number) {
  return [10, 20, 30].map((declinePct) => ({
    declinePct,
    label: `-${declinePct}%`,
    loss: total * (declinePct / 100),
    value: total * (1 - declinePct / 100),
  }));
}

export function holdingPeriodStatus(entryDate?: string | null): { days: number; longTerm: boolean; label: string } {
  const hp = holdingPeriod(entryDate);
  if (!hp) return { days: 0, longTerm: false, label: 'Entry date not set' };
  return { ...hp, label: hp.longTerm ? `Long-term (${hp.days} days held)` : `Short-term (${hp.days} days held)` };
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

export const money = (n: number, digits = 0) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: digits }).format(n || 0);

export const pct = (n: number, digits = 1) => `${(n || 0).toFixed(digits)}%`;
