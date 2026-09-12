// SwingEdge Analyzer — performance statistics over closed paper trades.
// Pure functions. Discipline is reported separately from profit on purpose.

export interface ClosedTrade {
  symbol: string;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  shares: number;
  exitPrice: number;
  entryDate: string;
  exitDate: string;
  realizedPl: number;
  rulesFollowed: boolean | null;
  exitReason?: string | null;
}

export interface PerformanceStats {
  trades: number;
  wins: number;
  losses: number;
  breakEven: number;
  winRatePct: number;
  totalPl: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number | null;
  expectancy: number;
  averageR: number;
  bestTrade: number;
  worstTrade: number;
  maxDrawdown: number;
  averageHoldDays: number;
  disciplinePct: number | null;
  disciplineAnswered: number;
  equityCurve: { label: string; cumulative: number }[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const EMPTY_STATS: PerformanceStats = {
  trades: 0,
  wins: 0,
  losses: 0,
  breakEven: 0,
  winRatePct: 0,
  totalPl: 0,
  averageWin: 0,
  averageLoss: 0,
  profitFactor: null,
  expectancy: 0,
  averageR: 0,
  bestTrade: 0,
  worstTrade: 0,
  maxDrawdown: 0,
  averageHoldDays: 0,
  disciplinePct: null,
  disciplineAnswered: 0,
  equityCurve: [],
};

function holdDays(entry: string, exit: string): number {
  const a = new Date(entry).getTime();
  const b = new Date(exit).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/** R multiple: profit divided by the risk that was accepted at entry. */
export function rMultiple(t: ClosedTrade): number | null {
  const riskPerShare = t.entryPrice - t.stopPrice;
  if (!(riskPerShare > 0) || !(t.shares > 0)) return null;
  return round2(t.realizedPl / (riskPerShare * t.shares));
}

export function performanceStats(input: ClosedTrade[]): PerformanceStats {
  const trades = input
    .slice()
    .sort((a, b) => new Date(a.exitDate).getTime() - new Date(b.exitDate).getTime());
  if (!trades.length) return { ...EMPTY_STATS };

  const wins = trades.filter((t) => t.realizedPl > 0);
  const losses = trades.filter((t) => t.realizedPl < 0);
  const breakEven = trades.length - wins.length - losses.length;

  const grossWin = wins.reduce((s, t) => s + t.realizedPl, 0);
  const grossLoss = losses.reduce((s, t) => s + Math.abs(t.realizedPl), 0);
  const totalPl = round2(grossWin - grossLoss);

  const rValues = trades.map(rMultiple).filter((r): r is number => r !== null);
  const answered = trades.filter((t) => t.rulesFollowed !== null && t.rulesFollowed !== undefined);
  const followed = answered.filter((t) => t.rulesFollowed === true);

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  const equityCurve = trades.map((t, i) => {
    cumulative = round2(cumulative + t.realizedPl);
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.max(maxDrawdown, round2(peak - cumulative));
    return { label: `${i + 1}. ${t.symbol}`, cumulative };
  });

  return {
    trades: trades.length,
    wins: wins.length,
    losses: losses.length,
    breakEven,
    winRatePct: round2((wins.length / trades.length) * 100),
    totalPl,
    averageWin: wins.length ? round2(grossWin / wins.length) : 0,
    averageLoss: losses.length ? round2(grossLoss / losses.length) : 0,
    profitFactor: grossLoss > 0 ? round2(grossWin / grossLoss) : null,
    expectancy: round2(totalPl / trades.length),
    averageR: rValues.length ? round2(rValues.reduce((a, b) => a + b, 0) / rValues.length) : 0,
    bestTrade: round2(Math.max(...trades.map((t) => t.realizedPl))),
    worstTrade: round2(Math.min(...trades.map((t) => t.realizedPl))),
    maxDrawdown,
    averageHoldDays: round2(
      trades.reduce((s, t) => s + holdDays(t.entryDate, t.exitDate), 0) / trades.length,
    ),
    disciplinePct: answered.length ? round2((followed.length / answered.length) * 100) : null,
    disciplineAnswered: answered.length,
    equityCurve,
  };
}

/** Ranks the mistakes recorded in journal entries, most common first. */
export function rankMistakes(entries: { mistakes?: string | null }[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const e of entries) {
    if (!e.mistakes) continue;
    for (const raw of e.mistakes.split(',')) {
      const tag = raw.trim();
      if (!tag) continue;
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export const MISTAKE_TAGS = [
  'Moved my stop',
  'Entered before the setup was ready',
  'Position too large',
  'Chased an extended price',
  'Exited early out of fear',
  'Held past my invalidation',
  'Traded in a weak market',
  'Ignored my own checklist',
  'No plan written first',
  'Revenge trade',
] as const;
