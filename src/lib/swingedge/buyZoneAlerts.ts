// SwingEdge — Buy Zone watching.
// Pure detection of "price has walked into the estimated entry zone" for
// watchlist rows. No side effects and no invented data: a row without a price
// or estimated levels simply produces no hit.

import { entryZone } from './signalLifecycle';
import type { Verdict, TrendState } from './types';

export interface BuyZoneRow {
  symbol: string;
  price: number | null;
  atr: number | null;
  verdict: Verdict;
  trend: TrendState;
  levels: { estimatedEntry: number; estimatedStop: number; estimatedTarget: number } | null;
  insufficientData?: boolean;
}

export interface BuyZoneHit {
  symbol: string;
  price: number;
  low: number;
  high: number;
  verdict: Verdict;
  trend: TrendState;
  /** Plain sentence for the alert feed. */
  message: string;
}

/** Only names worth a nudge; a symbol that does not qualify is not an alert. */
const ALERT_VERDICTS: Verdict[] = ['QUALIFIES', 'WATCH'];

export function buyZoneHits(rows: BuyZoneRow[]): BuyZoneHit[] {
  const hits: BuyZoneHit[] = [];
  for (const row of rows) {
    if (row.insufficientData) continue;
    if (!row.levels || !(row.price && row.price > 0)) continue;
    if (!ALERT_VERDICTS.includes(row.verdict)) continue;
    const zone = entryZone(row.levels.estimatedEntry, row.atr);
    if (row.price < zone.low || row.price > zone.high) continue;
    hits.push({
      symbol: row.symbol,
      price: row.price,
      low: zone.low,
      high: zone.high,
      verdict: row.verdict,
      trend: row.trend,
      message: `${row.symbol} is inside its estimated buy zone (${zone.low}–${zone.high}), trading at ${row.price}. Check the setup before planning a trade.`,
    });
  }
  return hits.sort((a, b) => a.symbol.localeCompare(b.symbol));
}

/** One alert per symbol per day, so a refresh does not spam the feed. */
export function alertKey(symbol: string, day: string): string {
  return `${symbol.toUpperCase()}:${day}`;
}

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}
