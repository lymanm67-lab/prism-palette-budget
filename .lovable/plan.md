# SwingEdge Analyzer — inside PrismBudget

A new "Trading" section added to your existing app, at `/swingedge/*`. Your money, budget, and legacy pages are untouched. Same login, same database.

Tagline: "Find the Setup. Define the Risk. Trade the Plan."

Version 1 covers US stocks and ETFs, long swing trades only, paper trading only. No options, no short selling, no live orders, no margin.

The point of the product is the loop: Find > Understand > Plan > Risk > Trade > Review > Improve.

## Guiding rules baked into every screen

- No opportunity is ever shown without its risk shown next to it.
- Every setup answers two questions: "Why does this qualify?" and "What would prove this wrong?"
- Estimates are never dressed up as decisions. The scanner shows Estimated Entry, Estimated Stop, Estimated Target, and Projected R:R. Only a saved Trade Plan shows Planned Entry, Planned Stop, Planned Target, Position Size, and Dollar Risk.
- Four verdict statuses, not two: QUALIFIES, WATCH, NOT READY, DOES NOT QUALIFY. So a strong setup that simply has not reached its entry reads as WATCH, not as a failure.
- No guaranteed-profit language, no flashing buy signals, no casino styling.
- Original scoring methodology. Nothing copied from any commercial product.

## Trading capital firewall

SwingEdge keeps its own Trading Capital figure. It never pulls from retirement, emergency fund, HSA, or long-term investment balances in PrismBudget. PrismBudget answers "can I afford to allocate money to trading?"; SwingEdge answers "given what is already allocated, how much may I risk?"

Settings shows: Trading Account, Risk Per Trade percent, Maximum Risk Per Trade, Maximum Portfolio Risk percent, Current Open Risk, and Risk Remaining.

## What gets built, in four phases

Build in order. Each phase must pass its acceptance gate before the next begins.

### Phase 1 — Foundation and Demo Mode

- New "Trading" group in the sidebar with the eleven pages, each reachable.
- Settings > Market Data: provider, connection status, last successful connection, credits used today, data mode (Demo / Live / Cached), Test / Refresh / Use Demo Mode buttons. Key shown only as `************`.
- Your Twelve Data key stored as a backend secret, never in the browser. All calls go through a secure server function.
- Credit budget kept as editable settings, not fixed code: 8 per minute, 800 per day.
- Candle cache with Fresh / Aging / Stale / Unavailable status and a visible "Last market data update" stamp.
- Rate-limit protection: queue, batching, backoff, duplicate suppression, short lockout after repeated quota errors. When the limit is hit the app keeps working on cached data and says so.
- Demo Mode with clearly labeled sample data so every page below is fully testable before the key is entered.
- Dashboard: greeting, market overview cards for SPY / QQQ / DIA / IWM (price, change, percent, 20 EMA, 50 SMA, trend, volume condition, last updated), plus an overall Market Condition of Bullish / Neutral / Cautious with a "Why?" explanation of the exact rules behind it.

Phase 1 gate: SPY loads in Demo Mode; the connection test works; an invalid key gives a useful message; hitting the rate limit does not crash anything; cached data loads when the API is unavailable.

### Phase 2 — Analyzer, Scanner, Watchlists

- Analyzer: candlestick chart (zoom, pan, candle inspection, indicator toggles) on 1 day, 4 hour, 1 hour, 1 week. Indicators calculated locally from one cached price history: EMA, SMA, RSI, MACD, ATR, Stochastic, relative volume, trend, support, resistance, breakout and pullback state.
- SwingEdge Score: original and transparent, out of 100 available points, with a component breakdown that adds up exactly and states what is missing. Verdict is one of the four statuses.
- Market Scanner, explicitly quota-aware. It never attempts a full-market scan. It runs against one of: Curated Universe (ships with roughly 25 highly liquid stocks and ETFs, expandable once real credit consumption is known), My Watchlist, or a Saved Universe. Cached candles are reused wherever fresh enough; anything needing new data goes through the request queue. Results are ranked, and each row shows its estimated risk next to its setup.
- Watchlists: create lists, add symbols, review scores and levels in one table.

Phase 2 gate: 250 daily candles in, and 20 EMA, 50 SMA, RSI, MACD, ATR, Stochastic all calculated; a candidate receives a score; "Why this score?" sums correctly against the 100 available points; pullback and breakout states reproduce from known test data.

### Phase 3 — Trade Planner, Sizing, Paper Trading

- Trade Planner: entry, stop, target, risk per share, reward-to-risk, invalidation note, and the qualifying reasons.
- Position sizing from Trading Capital and risk-per-trade percent, with a hard warning when a plan breaks the risk rule or the portfolio risk ceiling.
- Paper Trades: open, manage, and close simulated long positions; track open risk, unrealized result, realized result. No real orders, ever.

Phase 3 gate, exact numbers: account $5,000, risk 1%, entry $44.50, stop $42.50, target $48.50 must produce risk dollars $50, risk per share $2, shares 25, position value $1,112.50, maximum planned loss $50, potential gain $100, reward to risk 2:1. Any deviation fails the phase. Then one trade must flow end to end: Trade Plan > Open Paper Trade > Close Trade > Journal > Performance.

### Phase 4 — Backtester, Journal, Performance, Academy

- Backtester: run the SwingEdge rules over stored history and report win rate, average win and loss, expectancy, largest drawdown.
- Trading Journal: one entry per trade with the plan, outcome, levels, mistakes, lessons.
- Performance: results by setup type, by month, and by rule-following versus rule-breaking.
- Trading Academy: original lessons on trend, setups, stops, sizing, risk, and review discipline.

Phase 4 gate: a backtest over stored candles returns the full metric set; a closed paper trade appears in both Journal and Performance; Academy progress persists across reload.

## Technical notes

- Routes lazy-loaded under `/swingedge/*` in `App.tsx`, new sidebar group in `AppSidebar.tsx`. No existing route or page changes behaviour.
- Provider abstraction `MarketDataProvider` with a `TwelveDataProvider`: `getQuote`, `getTimeSeries`, `getBatchQuotes`, `getSymbolSearch`, `getMarketStatus`, and `getEarnings` as an optional, capability-aware method. Earnings endpoints are expensive and plan-gated, so when the plan does not support them or credits are short the UI shows "Earnings data unavailable" and the connection is still considered healthy.
- Data path: Twelve Data > provider > normalization > SwingEdge engine > scanner / analyzer / planner / paper trades / journal / performance. The calculation engine has no Twelve Data dependency.
- A new edge function `twelve-data` is the only caller of `TWELVE_DATA_API_KEY`. The existing `market-data` function (Alpha Vantage, used by the investing pages) is left completely alone.
- Primary endpoint `/time_series` with `symbol`, `interval`, `outputsize`; key appended server-side only.
- Quota tracking reads `api-credits-used` and `api-credits-left` from Twelve Data response headers after every call and stores them as the primary source of truth. `/api_usage` is used only for occasional reconciliation or diagnostics, never routine polling, since it costs a credit itself.
- Indicators computed locally in pure TypeScript under `src/lib/swingedge/` with unit tests, so no credits go to indicator endpoints.
- Database split by ownership. Shared, service-written only, readable by signed-in users, never writable from the browser: `market_data_cache` (symbol, interval, datetime, open, high, low, close, volume, provider, fetched_at, numeric columns), `market_symbols`, `api_provider_status`. Household-scoped with row-level security: `watchlists`, `watchlist_items`, `trade_plans`, `paper_trades`, `journal_entries`, `backtests`, `academy_progress`, `trading_settings`.
- Cache rules: completed historical candles immutable, today's candle refreshed subject to quota, weekly candles cached longest.
- API Usage Monitor (credits this minute and today from response headers, cache hits and misses, failures, rate-limit events, last successful call) visible in developer settings or when advanced mode is on.
- Charting via a lightweight candlestick library added as a dependency.
- Styling uses your existing dark theme tokens with SwingEdge's navy / royal blue / gold accents plus green, red, amber, gray for bullish, risk, caution, neutral. No hardcoded colors.
- Every phase gets automated acceptance tests for its gate, not just unit tests. A phase is not reported complete until its gate tests pass.

## Not in Version 1

Options, short selling, live order execution, margin, leverage, intraday sub-hour timeframes, and any automated trading.

## What I need from you

Your Twelve Data API key. I will request it through the secure secret form when Phase 1 reaches that step — everything before it runs in Demo Mode.
