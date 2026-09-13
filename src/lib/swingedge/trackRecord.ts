// SwingEdge — "what happened the last times I traded this".
// Pure functions over recorded paper trades and journal entries. Nothing is
// estimated: a trade with no recorded risk gets no R, and a symbol with no
// history reports no history rather than a guess.

export interface TrackRecordTradeInput {
  id: string;
  symbol: string;
  setup_type: string | null;
  status: string;
  entry_date: string;
  exit_date: string | null;
  exit_price: number | null;
  exit_reason: string | null;
  realized_pl: number | null;
  initial_dollar_risk: number | null;
  rules_followed: boolean | null;
}

export interface TrackRecordJournalInput {
  paper_trade_id: string | null;
  symbol: string | null;
  lessons: string | null;
  mistakes: string | null;
  result_r: number | null;
}

export interface TrackRecordTrade {
  id: string;
  symbol: string;
  setup: string | null;
  entryDate: string;
  exitDate: string;
  realizedPl: number | null;
  /** Result in multiples of the risk taken. Null when risk was never recorded. */
  r: number | null;
  exitReason: string | null;
  rulesFollowed: boolean | null;
  lesson: string | null;
  mistake: string | null;
}

export interface TrackRecordSummary {
  trades: number;
  wins: number;
  losses: number;
  scratches: number;
  /** Null until at least one closed trade exists. */
  winRate: number | null;
  /** Average R across trades where risk was recorded. Null when none were. */
  avgR: number | null;
  rScored: number;
  totalPl: number;
  rulesBroken: number;
}

export interface TrackRecord {
  symbol: string | null;
  setup: string | null;
  /** Most recent first. */
  symbolTrades: TrackRecordTrade[];
  setupTrades: TrackRecordTrade[];
  symbolSummary: TrackRecordSummary;
  setupSummary: TrackRecordSummary;
  lessons: string[];
  mistakes: string[];
  hasHistory: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const EMPTY_SUMMARY: TrackRecordSummary = {
  trades: 0,
  wins: 0,
  losses: 0,
  scratches: 0,
  winRate: null,
  avgR: null,
  rScored: 0,
  totalPl: 0,
  rulesBroken: 0,
};

export function summariseTrackRecord(trades: TrackRecordTrade[]): TrackRecordSummary {
  if (trades.length === 0) return { ...EMPTY_SUMMARY };
  let wins = 0;
  let losses = 0;
  let scratches = 0;
  let totalPl = 0;
  let rSum = 0;
  let rScored = 0;
  let rulesBroken = 0;

  for (const t of trades) {
    const pl = t.realizedPl ?? 0;
    totalPl += pl;
    if (pl > 0) wins += 1;
    else if (pl < 0) losses += 1;
    else scratches += 1;
    if (t.r !== null) {
      rSum += t.r;
      rScored += 1;
    }
    if (t.rulesFollowed === false) rulesBroken += 1;
  }

  return {
    trades: trades.length,
    wins,
    losses,
    scratches,
    winRate: Math.round((wins / trades.length) * 100),
    avgR: rScored > 0 ? round2(rSum / rScored) : null,
    rScored,
    totalPl: round2(totalPl),
    rulesBroken,
  };
}

function toTrade(
  raw: TrackRecordTradeInput,
  notes: { lesson: string | null; mistake: string | null; resultR: number | null },
): TrackRecordTrade {
  const risk = raw.initial_dollar_risk;
  const pl = raw.realized_pl;
  const r =
    notes.resultR !== null
      ? round2(notes.resultR)
      : risk && risk > 0 && pl !== null
        ? round2(pl / risk)
        : null;
  return {
    id: raw.id,
    symbol: raw.symbol,
    setup: raw.setup_type,
    entryDate: raw.entry_date,
    exitDate: raw.exit_date as string,
    realizedPl: pl,
    r,
    exitReason: raw.exit_reason,
    rulesFollowed: raw.rules_followed,
    lesson: notes.lesson,
    mistake: notes.mistake,
  };
}

const clean = (s: string | null): string | null => {
  const t = (s ?? '').trim();
  return t.length > 0 ? t : null;
};

/**
 * Builds the recall view for one symbol and one setup. `limit` caps how many
 * recent trades are listed; the summaries count every closed trade found.
 */
export function buildTrackRecord(
  trades: TrackRecordTradeInput[],
  journal: TrackRecordJournalInput[],
  symbol: string | null,
  setup: string | null,
  limit = 3,
): TrackRecord {
  const byTradeId = new Map<string, TrackRecordJournalInput>();
  for (const j of journal) {
    if (j.paper_trade_id) byTradeId.set(j.paper_trade_id, j);
  }

  const closed = trades
    .filter((t) => t.status === 'CLOSED' && t.exit_date && t.exit_price !== null)
    .map((t) => {
      const j = byTradeId.get(t.id);
      return toTrade(t, {
        lesson: clean(j?.lessons ?? null),
        mistake: clean(j?.mistakes ?? null),
        resultR: j?.result_r ?? null,
      });
    })
    .sort((a, b) => (a.exitDate < b.exitDate ? 1 : a.exitDate > b.exitDate ? -1 : 0));

  const sym = symbol ? symbol.toUpperCase() : null;
  const symbolAll = sym ? closed.filter((t) => t.symbol.toUpperCase() === sym) : [];
  const setupAll = setup ? closed.filter((t) => t.setup === setup) : [];

  const lessons: string[] = [];
  const mistakes: string[] = [];
  for (const t of [...symbolAll, ...setupAll]) {
    if (t.lesson && !lessons.includes(t.lesson)) lessons.push(t.lesson);
    if (t.mistake && !mistakes.includes(t.mistake)) mistakes.push(t.mistake);
  }

  return {
    symbol: sym,
    setup,
    symbolTrades: symbolAll.slice(0, limit),
    setupTrades: setupAll.slice(0, limit),
    symbolSummary: summariseTrackRecord(symbolAll),
    setupSummary: summariseTrackRecord(setupAll),
    lessons: lessons.slice(0, 3),
    mistakes: mistakes.slice(0, 3),
    hasHistory: symbolAll.length > 0 || setupAll.length > 0,
  };
}
