# SwingEdge Final Enhancement — Heat, Revalidation, Execution Realism, Training Mode

Verified current state (this builds on what exists, nothing is rebuilt):
- `risk.ts` already has `portfolioRisk()` (max portfolio risk vs open risk) — heat extends it.
- `TradePlanner.tsx` already runs stop qualification and hybrid gates; heat, sector heat, correlation, tradability and revalidation become additional gates there.
- `performance.ts` already derives win rate, expectancy and rule-following — signal quality and execution quality extend it.
- `score.ts` holds the Technical Score; market regime and relative strength feed into it, not into a new Hybrid category.
- `PaperTrading.tsx`, `TradeJournal.tsx`, `Backtester.tsx`, `SwingEdgeDashboard.tsx`, Academy and all providers stay as they are.

Everything is additive. A strong signal never overrides a hard risk gate.

## Decision flow the finished system follows
```text
QUALITY > MARKET REGIME > SECTOR > RELATIVE STRENGTH > TREND > SETUP >
CANDLE CONFIRMATION > TRADABILITY > ENTRY > INVALIDATION > STOP >
POSITION SIZE > ACCOUNT RISK > PORTFOLIO HEAT > SECTOR HEAT > CORRELATION >
REWARD TO RISK > HYBRID SIGNAL > REVALIDATION > PAPER EXECUTION >
TRADE MANAGEMENT > JOURNAL > SIGNAL QUALITY > EXECUTION QUALITY >
PERFORMANCE REVIEW > LEARNING
```

## Defaults (all configurable in Trading Settings; none presented as universally correct)
- Maximum portfolio heat: 5% of trading capital, measured as risk, not capital invested
- Maximum single-position risk: 1% (existing)
- Maximum sector capital exposure and maximum sector heat: tracked as two separate settings; sector heat starts at 2.5%
- Correlation lookback: 60 trading days; bands LOW < 0.40, MODERATE 0.40–0.60, HIGH 0.60–0.80, VERY HIGH > 0.80
- Commission: $0
- Signal expiry triggers: older than 3 trading days, or price more than 1 ATR from the entry zone

## Stage 1 — Portfolio heat, sector exposure vs sector heat, correlation
New pure module `portfolioHeat.ts`:
- Open risk per long position = `shares × max(0, current price − current stop)`, floored at 0, so a stop moved into profit never produces negative heat
- Each position keeps three separate values: original risk, current risk, locked profit
- Portfolio heat % of trading capital with room remaining; example: $5,000 account at 5% = $250 combined open risk ceiling, and a trade that would exceed it is STOP
- Sector capital exposure (% of capital invested per sector) and sector heat (% of capital at risk per sector) reported and gated independently

New `correlation.ts`, layered:
- Level 1: sector and industry overlap
- Level 2: ETF holdings overlap where quality data exists
- Level 3: rolling price-return correlation from daily candles over the configurable lookback
- Highest available level wins; classification LOW / MODERATE / HIGH / VERY HIGH, with the level and sample size shown so NVDA + AMD + SMH + QQQ registers as genuinely correlated

Gates in the planner: `WITHIN_LIMITS`, `HEAT_LIMIT_REACHED`, `SECTOR_EXPOSURE_LIMIT_REACHED`, `SECTOR_HEAT_LIMIT_REACHED`, `CORRELATION_LIMIT_REACHED`. Dashboard card: heat gauge, sector exposure and sector heat bars, correlation clusters, risk available for the next trade.

## Stage 2 — Market regime, relative strength, tradability, revalidation
New `marketRegime.ts`: STRONG BULL, BULL, NEUTRAL, CAUTIOUS, BEAR, HIGH VOLATILITY, TRANSITION from transparent technical inputs (index trend vs moving averages, breadth proxy, volatility expansion), each input shown.

New `relativeStrength.ts`: stocks scored on stock vs sector, stock vs SPY, sector vs SPY; ETFs on ETF vs benchmark. Classifications LEADING, OUTPERFORMING, NEUTRAL, UNDERPERFORMING, LAGGING. Both engines feed the existing Technical Score — no new Hybrid weight.

New `tradability.ts`: average daily volume, average daily dollar volume, price, volatility, data quality, plus actual spread when bid/ask exists or a clearly labelled SPREAD PROXY when it does not — never shown as a real quote. Verdicts TRADABLE / THIN / AVOID; AVOID is a hard gate.

New `revalidation.ts`. Mandatory revalidation when a new daily candle completes, price leaves the approved entry zone, market regime or sector trend materially changes, candle confirmation fails, stop validity changes, reward-to-risk changes materially, earnings risk changes, quality data materially changes, data confidence falls — and always immediately before a paper trade:
```text
GO > REVALIDATE > PRICE CHECK > ENTRY ZONE CHECK > STOP CHECK > RISK CHECK >
PORTFOLIO HEAT CHECK > CORRELATION CHECK > FINAL SIGNAL > PAPER TRADE
```
A stale GO can never be executed. Price beyond the zone yields PRICE EXTENDED — WAIT with a recalculate prompt.

New table `se_signal_revalidations` records every meaningful change: ticker, previous and new signal, previous and new entry zone, current price, technical / risk / hybrid scores, market regime, relative strength, portfolio heat, correlation risk, reason and timestamp.

## Stage 3 — Execution realism and corporate actions
New `execution.ts`:
- Slippage by liquidity tier; fills use the next available simulated execution price, and for daily-bar backtests a gap through the stop uses the next session open rather than pretending the stop filled exactly
- Every simulated exit records planned stop, simulated fill, slippage, gap difference, planned loss and actual simulated loss
- Execution quality score (0–100) from entry discipline, stop adherence and exit discipline
- Signal quality is kept separate: was the setup identification sound, independent of the money outcome
- Three separate readings — signal quality, execution quality, trade result — combine into GOOD WIN / GOOD LOSS / BAD WIN / BAD LOSS. P/L alone never decides whether the decision was good

New `corporateActions.ts`: splits, reverse splits, dividends where relevant, ticker changes, mergers, spin-offs and delistings handled through adjusted historical prices where data permits, so a split can never look like a price collapse. When adjusted data is unavailable the limitation is disclosed on the chart and in backtest results. The backtester uses the same slippage and gap model as paper trading.

## Stage 4 — Circuit breakers and immutable snapshots
- Configurable breakers: consecutive losses (default 3), daily loss limit, weekly loss limit. State is TRADING PAUSE / REVIEW REQUIRED, worded instructionally: "Daily loss limit reached. New paper trades paused. Review today's trades before the next eligible session."
- `se_trade_snapshots`: at entry, store the full evidence — signal state, hybrid and component scores, stop justification, candle context, market regime, relative strength, heat and correlation readings, rationale — immutable, so review compares against what was known then, not hindsight.

## Stage 5 — Training Mode, weekly review, exports
Six-week curriculum as previously approved:
1. Chart basics — candlesticks, trend, support, resistance, volume, 20 EMA, 50 SMA. Analyze 10 charts.
2. Find strong candidates — scanner, watchlists, market regime, sector alignment, relative strength. Build 5–10 candidates.
3. Pullback setup — trend, pullback, support, 20 EMA, candle confirmation, entry, invalidation, stop, target. Analyze 10 pullbacks; paper trade up to 5 qualified setups.
4. Breakout setup — consolidation, resistance, breakout, volume, retest, false breakout, candle confirmation. Analyze 10 breakouts; paper trade up to 5 qualified setups.
5. Risk and trade management — stop placement, sizing, R multiples, portfolio heat, sector heat, correlation, trailing stops, breakeven rules, gap risk, slippage.
6. Trade the system — market, scan, analyze, wait, qualify, revalidate, size, paper trade, manage, exit, journal, review. No new strategies.

Graduation is behavioural, never elapsed time and never profitability: rule following ≥ 90%, stops defined before entry 100%, position size calculated before entry 100%, account risk compliance 100%, portfolio heat compliance 100%, zero stop-widening violations, journal completion 100%, execution score ≥ 85%, plus a configurable minimum number of completed paper trades.

Also: daily pre-trade checklist stored per day; weekly review page with trades taken, rule following, execution quality, best skip (the strong setup correctly passed on) and one lesson to revisit.

CSV export covers trade plans, paper trades, journal, trade snapshots, signal history, revalidation history, hybrid scores, execution scores, portfolio heat history, training progress, watchlists and weekly reviews.

## Data
New household-scoped RLS tables with GRANTs: `se_signal_revalidations`, `se_trade_snapshots`, `se_heat_history`, `se_daily_checklists`, `se_training_progress`, `se_circuit_breaker_state`, `se_weekly_reviews`. Heat, sector, correlation, commission and breaker settings go on the existing trading settings row.

## Tests
Vitest acceptance tests per stage, run before advancing: heat caps block at $250 on a $5,000 account, moved stops reduce heat and never make it negative, original vs current risk vs locked profit kept separate, sector exposure and sector heat gate independently, correlation escalates to price-return level, stale GO cannot execute, revalidation history records reason, gap-through-stop uses next session open with slippage recorded, split-adjusted history produces no false signal, good loss and bad win classify correctly, breaker pauses and resets, graduation blocked when behaviour rules unmet. Full suite plus typecheck at the end of each stage.

## Order
Stage 1 > 2 > 3 > 4 > 5, acceptance tests after each stage before advancing.
