// SwingEdge — Portfolio risk snapshot.
//
// Core idea: a filled position and a resting conditional order are NOT the same
// risk. Every reading here therefore reports three separate numbers:
//
//   Active risk  | Pending risk | Maximum risk if everything triggers
//
// Nothing is invented. A row with no stop, no shares or no ATR reference simply
// reports the checks it can make and says the rest was not checked.

import {
  familyFor,
  type ExposureFamily,
} from './exposureFamily';

/* ------------------------------------------------------------------ themes */

export type RiskTheme =
  | 'TECHNOLOGY_GROWTH'
  | 'ENERGY'
  | 'HEALTHCARE'
  | 'FINANCIALS'
  | 'INDUSTRIALS'
  | 'CONSUMER_STAPLES'
  | 'PRECIOUS_METALS'
  | 'BROAD_MARKET'
  | 'RATES_AND_BONDS'
  | 'REAL_ESTATE'
  | 'SMALL_CAP'
  | 'UNCLASSIFIED';

export const RISK_THEME_LABEL: Record<RiskTheme, string> = {
  TECHNOLOGY_GROWTH: 'Technology / growth',
  ENERGY: 'Energy',
  HEALTHCARE: 'Healthcare',
  FINANCIALS: 'Financials',
  INDUSTRIALS: 'Industrials',
  CONSUMER_STAPLES: 'Consumer staples',
  PRECIOUS_METALS: 'Precious metals',
  BROAD_MARKET: 'Broad market',
  RATES_AND_BONDS: 'Rates and bonds',
  REAL_ESTATE: 'Real estate',
  SMALL_CAP: 'Small cap',
  UNCLASSIFIED: 'Not classified',
};

/** The order themes are always presented in, so the panel never reshuffles. */
export const THEME_ORDER: RiskTheme[] = [
  'TECHNOLOGY_GROWTH',
  'ENERGY',
  'HEALTHCARE',
  'FINANCIALS',
  'INDUSTRIALS',
  'CONSUMER_STAPLES',
  'PRECIOUS_METALS',
  'BROAD_MARKET',
  'RATES_AND_BONDS',
  'REAL_ESTATE',
  'SMALL_CAP',
  'UNCLASSIFIED',
];

/**
 * Exposure families collapse into the theme buckets used for risk. Semiconductors
 * and technology share one bucket on purpose: they answer to the same drivers.
 */
const FAMILY_THEME: Record<ExposureFamily, RiskTheme> = {
  ENERGY: 'ENERGY',
  OIL_COMMODITY: 'ENERGY',
  SEMICONDUCTORS: 'TECHNOLOGY_GROWTH',
  TECHNOLOGY: 'TECHNOLOGY_GROWTH',
  FINANCIALS: 'FINANCIALS',
  SMALL_CAP: 'SMALL_CAP',
  TREASURIES: 'RATES_AND_BONDS',
  GOLD: 'PRECIOUS_METALS',
  BROAD_MARKET: 'BROAD_MARKET',
  HEALTHCARE: 'HEALTHCARE',
  UTILITIES: 'INDUSTRIALS',
  REAL_ESTATE: 'REAL_ESTATE',
  CONSUMER: 'CONSUMER_STAPLES',
  INDUSTRIALS: 'INDUSTRIALS',
};

export function themeFor(symbol: string, sector?: string | null): RiskTheme {
  const fam = familyFor(symbol, sector);
  return fam ? FAMILY_THEME[fam] : 'UNCLASSIFIED';
}

/* ------------------------------------------------------------------ inputs */

/** Thinkorswim order states, kept distinct because they carry different risk. */
export type OrderStatus = 'WAIT_COND' | 'WAIT_TRG' | 'WORKING' | 'FILLED' | 'CLOSED';

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  WAIT_COND: 'Wait cond — entry has not triggered',
  WAIT_TRG: 'Wait trg — exit waiting on its parent order',
  WORKING: 'Working — order live at the broker',
  FILLED: 'Filled — position is open',
  CLOSED: 'Closed',
};

export const ORDER_STATUS_SHORT: Record<OrderStatus, string> = {
  WAIT_COND: 'WAIT COND',
  WAIT_TRG: 'WAIT TRG',
  WORKING: 'WORKING',
  FILLED: 'FILLED',
  CLOSED: 'CLOSED',
};

export interface RiskTradeInput {
  id: string;
  symbol: string;
  sector?: string | null;
  status: OrderStatus;
  entry: number | null;
  stop: number | null;
  target: number | null;
  shares: number | null;
  /** ATR(14) on the working timeframe, when it is known. Never guessed. */
  atr?: number | null;
  /** Nearest recent support below entry, when it is known. */
  support?: number | null;
}

export interface RiskLimits {
  /** Normal planned dollar risk per trade. */
  normalTradeRisk: number;
  /** Higher-conviction ceiling; above this a trade is flagged. */
  convictionTradeRisk: number;
  /** Combined planned risk inside one correlated theme. */
  themeRisk: number;
  /** Total open + triggerable risk that gets a flag. */
  portfolioFlag: number;
  /** Total risk treated as a high-risk warning while learning. */
  portfolioHighRisk: number;
  /** Preferred minimum reward-to-risk structure. */
  minRewardRisk: number;
  /** More resting conditional orders than this is itself a risk. */
  maxConditionalOrders: number;
}

export const DEFAULT_RISK_LIMITS: RiskLimits = {
  normalTradeRisk: 100,
  convictionTradeRisk: 250,
  themeRisk: 250,
  portfolioFlag: 500,
  portfolioHighRisk: 750,
  minRewardRisk: 2,
  maxConditionalOrders: 6,
};

/** The 1-hour conditional-entry template used unless the trader overrides it. */
export const CONDITIONAL_ENTRY_TEMPLATE = {
  timeframe: '1 hour',
  conditions: ['SMA 20 > SMA 50', 'RSI(14) > 50'],
  logic: 'ALL conditions must be true',
  triggerIf: 'True',
  offset: 0,
  displace: 0,
} as const;

/* ----------------------------------------------------------------- results */

export type RiskFlag =
  | 'RISK_ABOVE_NORMAL'
  | 'RISK_ABOVE_CONVICTION'
  | 'REVERSED_LEVELS'
  | 'REWARD_RISK_BELOW_TARGET'
  | 'STOP_TOO_TIGHT'
  | 'STOP_UNUSUALLY_WIDE'
  | 'STOP_BELOW_SUPPORT_UNCHECKED'
  | 'INCOMPLETE_PLAN';

export const RISK_FLAG_LABEL: Record<RiskFlag, string> = {
  RISK_ABOVE_NORMAL: 'Risk above the normal per-trade size',
  RISK_ABOVE_CONVICTION: 'Risk above the higher-conviction ceiling',
  REVERSED_LEVELS: 'Stop and target are on the wrong side of entry',
  REWARD_RISK_BELOW_TARGET: 'Reward-to-risk below the preferred structure',
  STOP_TOO_TIGHT: 'Stop looks unusually tight for normal movement',
  STOP_UNUSUALLY_WIDE: 'Stop looks unusually wide for normal movement',
  STOP_BELOW_SUPPORT_UNCHECKED: 'Stop distance not checked — no ATR reference yet',
  INCOMPLETE_PLAN: 'Entry, stop, target or shares missing',
};

export interface RiskTradeRow {
  id: string;
  symbol: string;
  theme: RiskTheme;
  themeLabel: string;
  status: OrderStatus;
  statusLabel: string;
  entry: number | null;
  stop: number | null;
  target: number | null;
  shares: number | null;
  riskPerShare: number | null;
  riskDollars: number | null;
  rewardDollars: number | null;
  rewardRisk: number | null;
  /** True when the risk is already live in the market. */
  isActive: boolean;
  /** True when the risk only appears if the order triggers. */
  isPending: boolean;
  /** Stop distance measured in ATR, when ATR is known. */
  stopAtrMultiple: number | null;
  flags: RiskFlag[];
}

export interface ThemeRiskRow {
  theme: RiskTheme;
  label: string;
  active: number;
  pending: number;
  max: number;
  /** Share of maximum portfolio risk, 0 when there is no risk at all. */
  pctOfMax: number;
  overLimit: boolean;
  symbols: string[];
}

export type WarningSeverity = 'INFO' | 'CAUTION' | 'CRITICAL';

export interface RiskWarning {
  severity: WarningSeverity;
  title: string;
  detail: string;
}

export interface PortfolioRiskSnapshot {
  activeRisk: number;
  pendingRisk: number;
  maxRisk: number;
  limits: RiskLimits;
  rows: RiskTradeRow[];
  themes: ThemeRiskRow[];
  conditionalOrderCount: number;
  largestTradeRisk: { symbol: string; risk: number } | null;
  largestThemeRisk: { theme: RiskTheme; label: string; risk: number } | null;
  warnings: RiskWarning[];
  nextActions: string[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => `$${n.toFixed(2)}`;

/** Live risk vs risk that only exists if an order triggers. */
function classifyStatus(status: OrderStatus): { isActive: boolean; isPending: boolean } {
  if (status === 'FILLED') return { isActive: true, isPending: false };
  if (status === 'WAIT_COND' || status === 'WORKING') return { isActive: false, isPending: true };
  // WAIT TRG is an exit attached to a parent order, and CLOSED is history.
  return { isActive: false, isPending: false };
}

/** One row's arithmetic and its own flags — no portfolio context needed. */
export function reviewTrade(input: RiskTradeInput, limits: RiskLimits): RiskTradeRow {
  const theme = themeFor(input.symbol, input.sector);
  const { isActive, isPending } = classifyStatus(input.status);
  const flags: RiskFlag[] = [];

  const entry = input.entry ?? null;
  const stop = input.stop ?? null;
  const target = input.target ?? null;
  const shares = input.shares && input.shares > 0 ? input.shares : null;

  let riskPerShare: number | null = null;
  let riskDollars: number | null = null;
  let rewardDollars: number | null = null;
  let rewardRisk: number | null = null;
  let stopAtrMultiple: number | null = null;

  const reversed =
    entry !== null &&
    ((stop !== null && stop >= entry) || (target !== null && target <= entry));
  if (reversed) flags.push('REVERSED_LEVELS');

  if (entry !== null && stop !== null && !reversed) {
    riskPerShare = r2(entry - stop);
    if (shares) riskDollars = r2(riskPerShare * shares);
    if (target !== null) {
      rewardRisk = riskPerShare > 0 ? r2((target - entry) / riskPerShare) : null;
      if (shares) rewardDollars = r2((target - entry) * shares);
    }

    if (input.atr && input.atr > 0) {
      stopAtrMultiple = r2(riskPerShare / input.atr);
      if (stopAtrMultiple < 0.75) flags.push('STOP_TOO_TIGHT');
      if (stopAtrMultiple > 3) flags.push('STOP_UNUSUALLY_WIDE');
    } else {
      flags.push('STOP_BELOW_SUPPORT_UNCHECKED');
    }
  }

  if (entry === null || stop === null || target === null || !shares) {
    flags.push('INCOMPLETE_PLAN');
  }

  if (riskDollars !== null) {
    if (riskDollars > limits.convictionTradeRisk) flags.push('RISK_ABOVE_CONVICTION');
    else if (riskDollars > limits.normalTradeRisk) flags.push('RISK_ABOVE_NORMAL');
  }

  if (rewardRisk !== null && rewardRisk < limits.minRewardRisk) {
    flags.push('REWARD_RISK_BELOW_TARGET');
  }

  return {
    id: input.id,
    symbol: input.symbol.toUpperCase(),
    theme,
    themeLabel: RISK_THEME_LABEL[theme],
    status: input.status,
    statusLabel: ORDER_STATUS_SHORT[input.status],
    entry,
    stop,
    target,
    shares,
    riskPerShare,
    riskDollars,
    rewardDollars,
    rewardRisk,
    isActive,
    isPending,
    stopAtrMultiple,
    flags,
  };
}

/**
 * Builds the whole snapshot: three risk numbers, theme buckets, per-trade review,
 * warnings and the short list of actions to review before adding another trade.
 */
export function buildRiskSnapshot(
  trades: RiskTradeInput[],
  limits: RiskLimits = DEFAULT_RISK_LIMITS,
): PortfolioRiskSnapshot {
  const rows = trades
    .filter((t) => t.status !== 'CLOSED')
    .map((t) => reviewTrade(t, limits));

  let activeRisk = 0;
  let pendingRisk = 0;
  const byTheme = new Map<RiskTheme, ThemeRiskRow>();

  for (const row of rows) {
    const risk = row.riskDollars ?? 0;
    if (row.isActive) activeRisk += risk;
    if (row.isPending) pendingRisk += risk;

    const bucket =
      byTheme.get(row.theme) ??
      ({
        theme: row.theme,
        label: row.themeLabel,
        active: 0,
        pending: 0,
        max: 0,
        pctOfMax: 0,
        overLimit: false,
        symbols: [],
      } satisfies ThemeRiskRow);
    if (row.isActive) bucket.active = r2(bucket.active + risk);
    if (row.isPending) bucket.pending = r2(bucket.pending + risk);
    bucket.max = r2(bucket.active + bucket.pending);
    if (!bucket.symbols.includes(row.symbol)) bucket.symbols.push(row.symbol);
    byTheme.set(row.theme, bucket);
  }

  activeRisk = r2(activeRisk);
  pendingRisk = r2(pendingRisk);
  const maxRisk = r2(activeRisk + pendingRisk);

  const themes = THEME_ORDER.map((t) => byTheme.get(t))
    .filter((b): b is ThemeRiskRow => !!b)
    .map((b) => ({
      ...b,
      pctOfMax: maxRisk > 0 ? r2((b.max / maxRisk) * 100) : 0,
      overLimit: b.max > limits.themeRisk,
    }));

  const conditionalOrderCount = rows.filter((r) => r.status === 'WAIT_COND').length;

  const riskRows = rows.filter((r) => (r.riskDollars ?? 0) > 0);
  const largestTradeRisk = riskRows.length
    ? riskRows.reduce((best, r) =>
        (r.riskDollars ?? 0) > (best.riskDollars ?? 0) ? r : best,
      )
    : null;
  const largestThemeRow = themes.length
    ? themes.reduce((best, t) => (t.max > best.max ? t : best))
    : null;

  /* ------------------------------------------------------------- warnings */

  const warnings: RiskWarning[] = [];

  if (maxRisk > limits.portfolioHighRisk) {
    warnings.push({
      severity: 'CRITICAL',
      title: 'Total risk is at the high-risk level',
      detail: `If every resting order triggers, ${money(maxRisk)} is at risk, above the ${money(
        limits.portfolioHighRisk,
      )} learning limit.`,
    });
  } else if (maxRisk > limits.portfolioFlag) {
    warnings.push({
      severity: 'CAUTION',
      title: 'Total risk above the review level',
      detail: `Maximum risk if everything triggers is ${money(maxRisk)}, above ${money(
        limits.portfolioFlag,
      )}.`,
    });
  }

  for (const t of themes.filter((x) => x.overLimit)) {
    warnings.push({
      severity: 'CAUTION',
      title: `${t.label} risk above the theme limit`,
      detail: `${t.symbols.join(', ')} together carry ${money(t.max)} against a ${money(
        limits.themeRisk,
      )} theme limit. These move on the same drivers, so they read as one bet.`,
    });
  }

  for (const t of themes.filter((x) => x.symbols.length >= 3 && !x.overLimit)) {
    warnings.push({
      severity: 'INFO',
      title: `${t.symbols.length} overlapping positions in ${t.label.toLowerCase()}`,
      detail: `${t.symbols.join(', ')} hold similar companies or react to the same drivers — holding several is not diversification.`,
    });
  }

  for (const row of rows) {
    if (row.flags.includes('REVERSED_LEVELS')) {
      warnings.push({
        severity: 'CRITICAL',
        title: `${row.symbol}: stop and target are reversed`,
        detail: 'For a long trade the stop must sit below entry and the target above it.',
      });
    }
    if (row.flags.includes('RISK_ABOVE_CONVICTION')) {
      warnings.push({
        severity: 'CAUTION',
        title: `${row.symbol}: risk above the conviction ceiling`,
        detail: `${money(row.riskDollars ?? 0)} planned risk against a ${money(
          limits.convictionTradeRisk,
        )} ceiling.`,
      });
    } else if (row.flags.includes('RISK_ABOVE_NORMAL')) {
      warnings.push({
        severity: 'INFO',
        title: `${row.symbol}: risk above normal size`,
        detail: `${money(row.riskDollars ?? 0)} planned risk against a ${money(
          limits.normalTradeRisk,
        )} normal size.`,
      });
    }
    if (row.flags.includes('REWARD_RISK_BELOW_TARGET')) {
      warnings.push({
        severity: 'CAUTION',
        title: `${row.symbol}: reward-to-risk is ${row.rewardRisk?.toFixed(2)}`,
        detail: `Below the preferred ${limits.minRewardRisk}:1 structure. Widening the target only to reach the ratio is not a fix.`,
      });
    }
    if (row.flags.includes('STOP_TOO_TIGHT')) {
      warnings.push({
        severity: 'CAUTION',
        title: `${row.symbol}: stop looks unusually tight`,
        detail: `The stop sits ${row.stopAtrMultiple?.toFixed(2)}× average range from entry, inside normal noise.`,
      });
    }
    if (row.flags.includes('STOP_UNUSUALLY_WIDE')) {
      warnings.push({
        severity: 'CAUTION',
        title: `${row.symbol}: stop looks unusually wide`,
        detail: `The stop sits ${row.stopAtrMultiple?.toFixed(2)}× average range from entry, so each share risks more than usual.`,
      });
    }
  }

  if (conditionalOrderCount > limits.maxConditionalOrders) {
    warnings.push({
      severity: 'CAUTION',
      title: `${conditionalOrderCount} conditional orders are waiting`,
      detail: `More than ${limits.maxConditionalOrders} at once can all trigger on the same market move.`,
    });
  }

  /* ---------------------------------------------------------- next actions */

  const nextActions: string[] = [];
  const overThemes = themes.filter((t) => t.overLimit);
  if (overThemes.length) {
    nextActions.push(
      `Reduce ${overThemes[0].label.toLowerCase()} exposure to ${money(limits.themeRisk)} or less by cancelling or resizing one order in ${overThemes[0].symbols.join(', ')}.`,
    );
  }
  if (maxRisk > limits.portfolioFlag) {
    nextActions.push(
      `Bring maximum risk from ${money(maxRisk)} back under ${money(limits.portfolioFlag)} before adding another trade.`,
    );
  }
  const reversedRow = rows.find((r) => r.flags.includes('REVERSED_LEVELS'));
  if (reversedRow) {
    nextActions.push(`Fix the reversed stop and target on ${reversedRow.symbol} before it can trigger.`);
  }
  const poorRR = rows.find((r) => r.flags.includes('REWARD_RISK_BELOW_TARGET'));
  if (poorRR && nextActions.length < 3) {
    nextActions.push(
      `Review ${poorRR.symbol}: the structure pays ${poorRR.rewardRisk?.toFixed(2)}:1, below your ${limits.minRewardRisk}:1 preference.`,
    );
  }
  if (conditionalOrderCount > limits.maxConditionalOrders && nextActions.length < 3) {
    nextActions.push(
      `Trim the ${conditionalOrderCount} resting conditional orders down to the strongest few.`,
    );
  }
  if (!nextActions.length) {
    nextActions.push(
      rows.length
        ? 'Risk is inside every limit. Keep new trades in themes that are not already represented.'
        : 'No open positions or resting orders recorded yet, so there is no portfolio risk to manage.',
    );
  }

  return {
    activeRisk,
    pendingRisk,
    maxRisk,
    limits,
    rows,
    themes,
    conditionalOrderCount,
    largestTradeRisk: largestTradeRisk
      ? { symbol: largestTradeRisk.symbol, risk: largestTradeRisk.riskDollars ?? 0 }
      : null,
    largestThemeRisk: largestThemeRow
      ? { theme: largestThemeRow.theme, label: largestThemeRow.label, risk: largestThemeRow.max }
      : null,
    warnings,
    nextActions: nextActions.slice(0, 3),
  };
}

/**
 * Answers the question asked before any new trade: does this add something, or
 * does it pile onto a theme already represented?
 */
export interface DiversificationRead {
  theme: RiskTheme;
  label: string;
  adds: boolean;
  existingSymbols: string[];
  existingRisk: number;
  combinedRisk: number | null;
  overThemeLimit: boolean;
  verdict: string;
}

export function diversificationRead(
  candidate: { symbol: string; sector?: string | null; risk: number | null },
  snapshot: PortfolioRiskSnapshot,
): DiversificationRead {
  const theme = themeFor(candidate.symbol, candidate.sector);
  const bucket = snapshot.themes.find((t) => t.theme === theme);
  const existingSymbols = (bucket?.symbols ?? []).filter(
    (s) => s !== candidate.symbol.toUpperCase(),
  );
  const existingRisk = bucket?.max ?? 0;
  const combinedRisk = candidate.risk === null ? null : r2(existingRisk + candidate.risk);
  const adds = existingSymbols.length === 0;
  const overThemeLimit = combinedRisk !== null && combinedRisk > snapshot.limits.themeRisk;

  const label = RISK_THEME_LABEL[theme];
  const verdict = adds
    ? theme === 'UNCLASSIFIED'
      ? 'This symbol has no known theme yet, so its diversification effect cannot be judged.'
      : `${label} is not represented yet, so this would add a genuinely different bet.`
    : combinedRisk === null
      ? `${label} is already represented by ${existingSymbols.join(', ')}. Enter shares and a stop to see the combined risk.`
      : `${label} is already represented by ${existingSymbols.join(', ')}. Combined ${label.toLowerCase()} risk would be ${money(
          combinedRisk,
        )} against a ${money(snapshot.limits.themeRisk)} theme limit.`;

  return {
    theme,
    label,
    adds,
    existingSymbols,
    existingRisk,
    combinedRisk,
    overThemeLimit,
    verdict,
  };
}
