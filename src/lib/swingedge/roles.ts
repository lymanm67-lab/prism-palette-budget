// SwingEdge — Dual Watchlist System.
// Two independent dimensions per symbol:
//   PORTFOLIO ROLE  — "what job does this ETF play?" (stable)
//   TRADING STATUS  — "where is this in the swing-trading process?" (changes)

import type { Verdict } from './types';

export type PortfolioRole =
  | 'CORE'
  | 'MOMENTUM'
  | 'GUARDRAIL'
  | 'CONVICTION'
  | 'CATALYST'
  | 'UNASSIGNED';

export type TradingStatus =
  | 'SCAN_UNIVERSE'
  | 'SETUP_FORMING'
  | 'PULLBACK_WATCH'
  | 'BREAKOUT_WATCH'
  | 'QUALIFIED_TRADE'
  | 'PLANNED'
  | 'IN_TRADE'
  | 'MANAGING'
  | 'CLOSED'
  | 'REJECTED';

export const PORTFOLIO_ROLES: {
  value: PortfolioRole;
  label: string;
  job: string;
  tone: string;
}[] = [
  {
    value: 'CORE',
    label: 'Core',
    job: 'Broad, long-term holding you would keep through most conditions.',
    tone: 'text-prism-sky border-prism-sky/40',
  },
  {
    value: 'MOMENTUM',
    label: 'Momentum',
    job: 'Leads when the market is strong. Where most swing setups come from.',
    tone: 'text-prism-lime border-prism-lime/40',
  },
  {
    value: 'GUARDRAIL',
    label: 'Guardrail',
    job: 'Steady, lower-risk holding that protects the account when the market weakens.',
    tone: 'text-muted-foreground border-border',
  },
  {
    value: 'CONVICTION',
    label: 'Conviction',
    job: 'A high-confidence idea you are willing to size up and hold through noise.',
    tone: 'text-prism-amber border-prism-amber/40',
  },
  {
    value: 'CATALYST',
    label: 'Catalyst',
    job: 'A trade driven by a specific upcoming event. Smaller size, defined timeline.',
    tone: 'text-prism-rose border-prism-rose/40',
  },
  {
    value: 'UNASSIGNED',
    label: 'Unassigned',
    job: 'No job decided yet. Give it one before you trade it.',
    tone: 'text-muted-foreground border-dashed border-border',
  },
];

export const TRADING_STATUSES: {
  value: TradingStatus;
  label: string;
  meaning: string;
  stage: 'Watching' | 'Ready' | 'Live' | 'Done';
  tone: string;
}[] = [
  {
    value: 'SCAN_UNIVERSE',
    label: 'Scan universe',
    meaning: 'On your radar, nothing developing yet.',
    stage: 'Watching',
    tone: 'text-muted-foreground border-border',
  },
  {
    value: 'SETUP_FORMING',
    label: 'Setup forming',
    meaning: 'Structure is starting to look tradeable.',
    stage: 'Watching',
    tone: 'text-prism-sky border-prism-sky/40',
  },
  {
    value: 'PULLBACK_WATCH',
    label: 'Pullback watch',
    meaning: 'Uptrend pulling back toward support you would buy.',
    stage: 'Watching',
    tone: 'text-prism-sky border-prism-sky/40',
  },
  {
    value: 'BREAKOUT_WATCH',
    label: 'Breakout watch',
    meaning: 'Coiling under resistance you would buy a break of.',
    stage: 'Watching',
    tone: 'text-prism-amber border-prism-amber/40',
  },
  {
    value: 'QUALIFIED_TRADE',
    label: 'Qualified trade',
    meaning: 'Passed the checklist. Worth planning properly.',
    stage: 'Ready',
    tone: 'text-prism-lime border-prism-lime/40',
  },
  {
    value: 'PLANNED',
    label: 'Planned',
    meaning: 'Entry, stop, target and size written down.',
    stage: 'Ready',
    tone: 'text-prism-lime border-prism-lime/40',
  },
  {
    value: 'IN_TRADE',
    label: 'In trade',
    meaning: 'Position is open.',
    stage: 'Live',
    tone: 'text-prism-lime border-prism-lime/60',
  },
  {
    value: 'MANAGING',
    label: 'Managing',
    meaning: 'Open and being managed — stop moved or partial taken.',
    stage: 'Live',
    tone: 'text-prism-amber border-prism-amber/40',
  },
  {
    value: 'CLOSED',
    label: 'Closed',
    meaning: 'Trade finished and reviewed.',
    stage: 'Done',
    tone: 'text-muted-foreground border-border',
  },
  {
    value: 'REJECTED',
    label: 'Rejected',
    meaning: 'Looked at and passed on. Keeps you honest.',
    stage: 'Done',
    tone: 'text-prism-rose border-prism-rose/40',
  },
];

export const roleMeta = (role: string) =>
  PORTFOLIO_ROLES.find((r) => r.value === role) ?? PORTFOLIO_ROLES[PORTFOLIO_ROLES.length - 1];

export const statusMeta = (status: string) =>
  TRADING_STATUSES.find((s) => s.value === status) ?? TRADING_STATUSES[0];

/** Statuses that mean the symbol is actively in the pipeline (not parked). */
export const PIPELINE_STATUSES: TradingStatus[] = [
  'SETUP_FORMING',
  'PULLBACK_WATCH',
  'BREAKOUT_WATCH',
  'QUALIFIED_TRADE',
  'PLANNED',
  'IN_TRADE',
  'MANAGING',
];

export interface StatusSuggestion {
  symbol: string;
  from: TradingStatus;
  to: TradingStatus;
  reason: string;
  direction: 'promote' | 'downgrade';
}

/**
 * Suggests a status move from today's score, never applying it automatically.
 * The trader stays in control; SwingEdge only points at the mismatch.
 */
export function suggestStatus(input: {
  symbol: string;
  current: TradingStatus;
  verdict: Verdict;
  setup: 'BREAKOUT' | 'PULLBACK' | 'NONE';
}): StatusSuggestion | null {
  const { symbol, current, verdict, setup } = input;

  // Live and finished trades are driven by the trade itself, not the scan.
  if (current === 'IN_TRADE' || current === 'MANAGING' || current === 'PLANNED') return null;

  if (verdict === 'QUALIFIES' && current !== 'QUALIFIED_TRADE') {
    return {
      symbol,
      from: current,
      to: 'QUALIFIED_TRADE',
      reason: 'Scores as QUALIFIES today — worth planning.',
      direction: 'promote',
    };
  }

  if (verdict === 'WATCH') {
    const target: TradingStatus =
      setup === 'BREAKOUT' ? 'BREAKOUT_WATCH' : setup === 'PULLBACK' ? 'PULLBACK_WATCH' : 'SETUP_FORMING';
    if (current !== target) {
      return {
        symbol,
        from: current,
        to: target,
        reason: `Setup is forming but not ready (${setup === 'NONE' ? 'no clear setup yet' : setup.toLowerCase()}).`,
        direction: current === 'QUALIFIED_TRADE' ? 'downgrade' : 'promote',
      };
    }
    return null;
  }

  if (
    (verdict === 'DOES_NOT_QUALIFY' || verdict === 'NOT_READY') &&
    PIPELINE_STATUSES.includes(current)
  ) {
    return {
      symbol,
      from: current,
      to: 'SCAN_UNIVERSE',
      reason:
        verdict === 'DOES_NOT_QUALIFY'
          ? 'No longer passes the checklist — park it back on the radar.'
          : 'Not ready today — nothing to act on.',
      direction: 'downgrade',
    };
  }

  return null;
}

/** Counts by role, used by the dashboard role widget. */
export function roleBreakdown(rows: { portfolio_role: string }[]) {
  return PORTFOLIO_ROLES.map((r) => ({
    ...r,
    count: rows.filter((x) => x.portfolio_role === r.value).length,
  })).filter((r) => r.count > 0);
}

/** Groups symbols by pipeline stage, used by the dashboard pipeline widget. */
export function pipelineBreakdown(rows: { symbol: string; trading_status: string }[]) {
  const stages: ('Watching' | 'Ready' | 'Live' | 'Done')[] = ['Watching', 'Ready', 'Live', 'Done'];
  return stages.map((stage) => ({
    stage,
    symbols: rows
      .filter((r) => statusMeta(r.trading_status).stage === stage)
      .map((r) => r.symbol)
      .sort(),
  }));
}
