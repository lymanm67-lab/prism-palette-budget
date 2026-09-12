# SwingEdge Analyzer — inside PrismBudget

A new "Trading" section added to your existing app, at `/swingedge/*`. Your money, budget, and legacy pages are untouched. Same login, same database.

Tagline: "Find the Setup. Define the Risk. Trade the Plan."

Version 1 covers US stocks and ETFs, long swing trades only, paper trading only. No options, no short selling, no live orders, no margin.

## Guiding rules baked into every screen

- No opportunity is ever shown without its risk shown next to it.
- Every setup answers two questions: "Why does this qualify?" and "What would prove this wrong?"
- No guaranteed-profit language, no flashing buy signals, no casino styling.
- Original scoring methodology. Nothing copied from any commercial product.

## What gets built, in four phases

I recommend approving all four and building them in order. Each phase leaves the app working and testable.

### Phase 1 — Foundation and Demo Mode

- New "Trading" group in the sidebar with the eleven pages, each reachable.
- Settings > Market Data: provider (Twelve Data), connection status, last successful connection, credits used today, data mode (Demo / Live / Cached), and Test / Refresh / Use Demo Mode buttons. Key shown only as `************`.
- Your Twelve Data key stored as a backend secret, never in the browser. All calls go through a secure server function.
- Credit budget kept as editable settings, not fixed code: 8 per minute, 800 per day.
- Candle cache with Fresh / Aging / Stale / Unavailable status and a visible "Last market data update" stamp.
- Rate-limit protection: queue, batching, backoff, duplicate suppression, short lockout after repeated quota errors. When the limit is hit the app keeps working on cached data and says so.
- Demo Mode with clearly labeled sample data so every page below is fully testable before the key is entered.
- Dashboard: greeting, market overview cards for SPY / QQQ / DIA / IWM (price, change, percent, 20 EMA, 50 SMA, trend, volume condition, last updated), plus an overall Market Condition of Bullish / Neutral / Cautious with a "Why?" explanation of the exact rules that produced it.

### Phase 2 — Analyzer, Scanner, Watchlists

- Analyzer: candlestick chart (zoom, pan, candle inspection, indicator toggles) on 1 day, 4 hour, 1 hour, 1 week. Indicators calculated locally from one cached price history: EMA, SMA, RSI, MACD, ATR, Stochastic, relative volume, trend, support, resistance, breakout and pullback state.
- SwingEdge Score: original, transparent, component-by-component breakdown showing what each part contributed and what is missing. Plus a plain-language qualify / does-not-qualify verdict.
- Market Scanner: filter a symbol list by trend, momentum, volume, and score, with results ranked and each row showing its risk alongside its setup.
- Watchlists: create lists, add symbols, review scores and levels in one table.

### Phase 3 — Trade Planner, Sizing, Paper Trading

- Trade Planner: entry, stop, target, risk per share, reward-to-risk, invalidation note ("what would prove this wrong"), and the qualifying reasons.
- Position sizing from account size and risk-per-trade percentage, with a hard warning when a plan exceeds the risk rule.
- Paper Trades: open, manage, and close simulated long positions; track open risk, unrealized result, and realized result. No real orders are ever placed.

### Phase 4 — Backtester, Journal, Performance, Academy

- Backtester: run the SwingEdge rules over stored history and report win rate, average win and loss, expectancy, and largest drawdown.
- Trading Journal: one entry per trade with the plan, the outcome, screenshots of levels, mistakes, and lessons.
- Performance: results by setup type, by month, and by rule-following versus rule-breaking.
- Trading Academy: original lessons on trend, setups, stops, sizing, risk, and review discipline.

## Technical notes

- Routes lazy-loaded under `/swingedge/*` in `App.tsx`, new sidebar group in `AppSidebar.tsx`. No existing route or page changes behaviour.
- Provider abstraction `MarketDataProvider` with a `TwelveDataProvider` implementation exposing `getQuote`, `getTimeSeries`, `getBatchQuotes`, `getSymbolSearch`, `getMarketStatus`, `getEarnings`. A second provider can be added later without touching SwingEdge logic.
- Data path: Twelve Data > provider > normalization > SwingEdge engine > scanner / analyzer / planner / paper trades / journal / performance. The calculation engine has no Twelve Data dependency.
- A new edge function `twelve-data` is the only caller of `TWELVE_DATA_API_KEY`. The existing `market-data` function (Alpha Vantage, used by your investing pages) stays as it is and is not disturbed.
- Primary endpoint `/time_series` with `symbol`, `interval`, `outputsize`; key appended server-side only.
- Indicators computed locally in pure TypeScript modules under `src/lib/swingedge/` with unit tests, so no credits are spent on indicator endpoints.
- New tables, all row-level secured to the signed-in household: market data cache (symbol, interval, datetime, open, high, low, close, volume, provider, fetched_at, numeric columns), API usage log, settings, watchlists and members, trade plans, paper trades, journal entries, backtest runs, and academy progress. Completed historical candles treated as immutable; today's candle refreshed subject to quota; weekly candles cached longest.
- API Usage Monitor (requests and estimated credits this minute and today, cache hits and misses, failures, rate-limit events, last successful call) visible in developer settings or when advanced mode is on.
- Charting via a lightweight candlestick library added as a dependency.
- Styling uses your existing dark theme tokens, with SwingEdge's navy / royal blue / gold accents plus green, red, amber, gray for bullish, risk, caution, and neutral. No hardcoded colors.

## Not in Version 1

Options, short selling, live order execution, margin, leverage, intraday sub-hour timeframes, and any automated trading.

## What I need from you

Your Twelve Data API key. I will request it through the secure secret form once Phase 1 reaches that step — everything before it runs in Demo Mode.
