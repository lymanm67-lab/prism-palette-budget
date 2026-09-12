// SwingEdge Analyzer — shared types.
// The calculation engine depends on these normalized shapes only, never on a
// specific market data provider.

export type SwingInterval = '1day' | '4h' | '1h' | '1week';

export const SWING_INTERVALS: { value: SwingInterval; label: string; role: string }[] = [
  { value: '1day', label: 'Daily', role: 'Primary swing timeframe' },
  { value: '4h', label: '4 hour', role: 'Confirmation timeframe' },
  { value: '1h', label: '1 hour', role: 'Fine timing' },
  { value: '1week', label: 'Weekly', role: 'Long-term context' },
];

export interface Candle {
  datetime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  volume: number;
  asOf: string;
}

export interface SymbolMatch {
  symbol: string;
  name: string;
  assetType: string;
  exchange?: string;
}

export interface MarketStatus {
  isOpen: boolean;
  exchange: string;
  asOf: string;
}

export interface EarningsInfo {
  available: boolean;
  reason?: string;
  nextDate?: string | null;
}

/**
 * Provider abstraction. A second provider can be added later by implementing
 * this interface — SwingEdge never calls a vendor API directly.
 */
export interface MarketDataProvider {
  readonly id: string;
  getQuote(symbol: string): Promise<Quote>;
  getTimeSeries(symbol: string, interval: SwingInterval, outputsize?: number): Promise<Candle[]>;
  getBatchQuotes(symbols: string[]): Promise<Quote[]>;
  getSymbolSearch(query: string): Promise<SymbolMatch[]>;
  getMarketStatus(): Promise<MarketStatus>;
  /**
   * Optional and capability-aware. Earnings endpoints are plan-gated and
   * expensive, so an unavailable result is a normal outcome — never an error
   * that marks the connection unhealthy.
   */
  getEarnings?(symbol: string): Promise<EarningsInfo>;
}

export type DataMode = 'DEMO' | 'LIVE' | 'CACHED';

export type ConnectionStatus =
  | 'CONNECTED'
  | 'NOT_CONNECTED'
  | 'RATE_LIMITED'
  | 'ERROR'
  | 'DEMO_MODE';

export type CacheStatus = 'Fresh' | 'Aging' | 'Stale' | 'Unavailable';

/** Trade verdicts. Four statuses, so a good setup that has not reached its
 * entry reads as WATCH rather than a failure. */
export type Verdict = 'QUALIFIES' | 'WATCH' | 'NOT_READY' | 'DOES_NOT_QUALIFY';

export const VERDICT_LABEL: Record<Verdict, string> = {
  QUALIFIES: 'QUALIFIES',
  WATCH: 'WATCH',
  NOT_READY: 'NOT READY',
  DOES_NOT_QUALIFY: 'DOES NOT QUALIFY',
};

export type TrendState = 'UP' | 'DOWN' | 'SIDEWAYS';
export type MarketCondition = 'BULLISH' | 'NEUTRAL' | 'CAUTIOUS';
