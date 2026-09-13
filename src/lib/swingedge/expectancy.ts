// SwingEdge — System expectancy and outlier dependence.
//
// Expectancy = (win rate x average winning R) - (loss rate x average losing R).
// It is the number that matters, and it matters more than win rate alone: a 40%
// win rate with 2R winners beats a 70% win rate with 0.5R winners.

export interface RTrade {
  id?: string;
  symbol?: string;
  /** Result in R multiples. +2 means twice the planned risk was made. */
  r: number;
  setupType?: string | null;
  marketRegime?: string | null;
  biasDirection?: string | null;
  eventRiskBand?: string | null;
  nearEarnings?: boolean | null;
  closedAt?: string | null;
}

export interface ExpectancyResult {
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRatePct: number;
  averageWinR: number;
  averageLossR: number;
  /** Expectancy per trade in R. */
  expectancyR: number;
  totalR: number;
  profitFactor: number | null;
  largestWinR: number;
  largestLossR: number;
  detail: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

export const EMPTY_EXPECTANCY: ExpectancyResult = {
  trades: 0,
  wins: 0,
  losses: 0,
  breakEven: 0,
  winRatePct: 0,
  averageWinR: 0,
  averageLossR: 0,
  expectancyR: 0,
  totalR: 0,
  profitFactor: null,
  largestWinR: 0,
  largestLossR: 0,
  detail: 'No closed trades yet, so there is nothing to measure.',
};

export function expectancy(trades: RTrade[]): ExpectancyResult {
  const rows = trades.filter((t) => Number.isFinite(t.r));
  if (!rows.length) return EMPTY_EXPECTANCY;

  const wins = rows.filter((t) => t.r > 0);
  const losses = rows.filter((t) => t.r < 0);
  const breakEven = rows.length - wins.length - losses.length;
  const winRate = wins.length / rows.length;
  const lossRate = losses.length / rows.length;
  const avgWin = wins.length ? wins.reduce((s, t) => s + t.r, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.r, 0) / losses.length) : 0;
  const expectancyR = winRate * avgWin - lossRate * avgLoss;
  const grossWin = wins.reduce((s, t) => s + t.r, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.r, 0));

  return {
    trades: rows.length,
    wins: wins.length,
    losses: losses.length,
    breakEven,
    winRatePct: round1(winRate * 100),
    averageWinR: round2(avgWin),
    averageLossR: round2(avgLoss),
    expectancyR: round2(expectancyR),
    totalR: round2(rows.reduce((s, t) => s + t.r, 0)),
    profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : null,
    largestWinR: wins.length ? round2(Math.max(...wins.map((t) => t.r))) : 0,
    largestLossR: losses.length ? round2(Math.min(...losses.map((t) => t.r))) : 0,
    detail:
      expectancyR > 0
        ? `Over ${rows.length} trades this process made about ${round2(expectancyR)}R per trade. Losing trades are part of that number, not a failure of it.`
        : `Over ${rows.length} trades this process lost about ${round2(Math.abs(expectancyR))}R per trade. More testing, not more size.`,
  };
}

export interface ExpectancySplit {
  key: string;
  label: string;
  result: ExpectancyResult;
}

type SplitField = 'setupType' | 'marketRegime' | 'biasDirection' | 'eventRiskBand';

/** Expectancy broken out by setup, regime, bias or event-risk level. */
export function expectancyBy(trades: RTrade[], field: SplitField): ExpectancySplit[] {
  const groups = new Map<string, RTrade[]>();
  trades.forEach((t) => {
    const key = (t[field] as string | null | undefined) ?? 'Unclassified';
    const list = groups.get(key) ?? [];
    list.push(t);
    groups.set(key, list);
  });
  return [...groups.entries()]
    .map(([key, rows]) => ({ key, label: key, result: expectancy(rows) }))
    .sort((a, b) => b.result.trades - a.result.trades);
}

export function expectancyNearVsOutsideEarnings(trades: RTrade[]): { near: ExpectancyResult; outside: ExpectancyResult } {
  return {
    near: expectancy(trades.filter((t) => t.nearEarnings === true)),
    outside: expectancy(trades.filter((t) => t.nearEarnings !== true)),
  };
}
