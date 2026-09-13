# SwingEdge Master Enhancement

Additive upgrade to the existing SwingEdge Analyzer. Nothing existing is rebuilt or removed — every current engine, screen, watchlist, course week and PrismBudget feature stays as it is. Five new answers get added:

1. What direction does this setup historically favor?
2. How did similar past setups behave?
3. What events are coming that could hit this trade?
4. Is the whole system statistically survivable?
5. Does this specific trade have enough evidence to be ready?

The tone stays the same: probability not certainty, risk before reward, a GO means the trade meets your rules — not that it will make money.

Delivered in two pushes, as you chose.

---

## Push 1 — Indicators, Directional Bias, Event Risk

### Core indicator framework
Three primary tools, each answering one question: 20 EMA + 50 SMA (trend), RSI 14 (momentum), ATR 14 (volatility and risk). MACD stays as secondary confirmation, never mandatory and never able to override price structure. Stochastics becomes optional and Advanced-only, offered as a replacement for RSI rather than an addition, so momentum is never double-counted. Beginner Mode defaults to RSI.

New readouts on the Analyzer:
- Trend Alignment: STRONG / ALIGNED / MIXED / AGAINST (price vs 20 EMA, 20 EMA vs 50 SMA, both slopes, higher highs/lows, pullback depth).
- RSI Momentum State: STRENGTHENING / STABLE / WEAKENING / EXTENDED, read inside trend context — no automatic "70 = sell, 30 = buy".
- ATR block: ATR, ATR as % of price, today's range vs ATR, entry distance in ATR, stop distance in ATR.

### Directional Bias Engine
Historical-tendency engine, not a forecast. For the current conditions it finds similar past bars in the symbol's own history and reports what happened next over 5, 10 and 20 trading days (Advanced Mode can add periods).

Classification defaults to ATR-normalised (up = more than +1 ATR, down = less than -1 ATR, otherwise sideways), with a percentage method (+/-2%) as an alternative. Setup conditions are read only from bars at or before the match date, so no future information leaks in.

Output card: UP / SIDEWAYS / DOWN percentages, sample size, lookback, forward period, market regime, trend, conditions matched, median and average return, average favourable and adverse excursion, best and worst outcome, plus the three event-risk lines. Confidence reads HIGH / MODERATE / LOW / INSUFFICIENT DATA based on sample size, similarity quality, data completeness, regime consistency and signal conflicts. Two plain-language panels: "Why this bias" and "What would change this bias".

### Event Risk Engine
Never predicts an outcome — only when an event is expected, what it touches, how close it is to your holding window, how material it could be, and whether the trade should stay GO, move to WAIT, or need REVIEW.

Three sources, as you chose:
- Earnings: automatic from Alpha Vantage, always labelled CONFIRMED / ESTIMATED / UNKNOWN. Never invented. Unknown earnings blocks a multi-day stock trade in Beginner Mode until you verify manually.
- Macro: a stored FOMC / CPI / PPI / jobs / GDP / retail sales / confidence schedule, editable.
- Global and sector events: a news scan proposes candidates on a schedule; each one is inert until you approve it, and only approved events affect a signal. Every event stores source, region, affected sectors and last-updated time.

Also included: earnings calendar card with days-until and holding-window crossing, configurable pre-earnings windows (0-2 very high, 3-5 high, 6-10 moderate, 10+ lower), Beginner Mode earnings rule with an explicit "allow earnings trades" opt-in and gap acknowledgement, post-earnings stabilisation flag that forces revalidation of trend/levels/entry/stop/target/bias, gap warning wherever a trade is approved, a sector event calendar for the nine sectors, Global Sector Risk (LOW / MODERATE / HIGH / SEVERE), an Event Risk Score 0-100 with configurable bands, an event timeline strip (today, entry, events, holding-window end), and unscheduled-event handling that marks EVENT REVALIDATION REQUIRED and recalculates rather than preserving a stale GO. Every signal change is logged with previous signal, new signal, event, severity, sector, reason and timestamp.

Hard gates in Beginner Mode: SEVERE prevents GO, HIGH normally produces REVIEW, MODERATE can qualify. Advanced overrides are allowed and always logged.

---

## Push 2 — Readiness, Monte Carlo, Expectancy, and the surrounding screens

- **Trade Readiness Score** out of 100 using your weights (setup 10, stop 10, trend 9, bias 9, reward-to-risk 9, quality 8, regime 7, sector 6, candles 5, volume 5, sizing 5, event 5, revalidation 5, heat 4, correlation 3). Bands: 90+ READY, 80-89 QUALIFIED, 70-79 WAIT, 60-69 REVIEW, under 60 NOT READY. Weights configurable in Advanced Mode. Event Risk is always shown separately, and no score can override a hard gate — invalid stop, undefined invalidation, risk or heat or correlation breach, reward-to-risk below minimum, poor tradability, expired signal, extended price, critical data failure, severe event risk in Beginner Mode, unknown earnings when verification is required.
- **Monte Carlo Risk Lab** modelled in R multiples from your own paper-trade and backtest results, 10,000 runs by default: median ending balance, 10th/90th percentiles, probability of profit, median and worst-5% drawdown, longest losing streak, odds of 10/20/30% drawdowns, odds of hitting a trading pause, risk of ruin. Event-aware comparisons (near vs outside earnings, by event-risk level) appear only once the sample is large enough.
- **System Expectancy**: (win rate x average winning R) - (loss rate x average losing R), tracked overall and by setup type, regime, bias and event-risk level.
- **Scanner**: new columns for earnings date, days until, confirmed/estimated, event risk, global sector risk, bias with up/sideways/down and confidence, and readiness. New filters for excluding earnings within X days, maximum event risk, excluding severe global risk, minimum bias and minimum readiness, plus a "Low Event Risk Pullbacks" preset.
- **Analyzer and Trade Planner**: bias, event risk, earnings timeline, historical comparison, readiness, why-this-bias and what-could-change sections; the planner's pre-qualify summary lists every check in order and requires a pre-trade event checklist before qualifying.
- **Journal and Performance**: store earnings date and days-until at entry, event risk, global risk, sector and macro events, whether an event occurred and affected price, gap size and event slippage. Dashboard reports near vs outside earnings, results by event-risk level, gap losses, bias performance, readiness performance, Monte Carlo summary and expectancy — with a "not enough trades yet" state until the sample supports a conclusion.
- **Course and Academy**: event awareness folded into all six weeks (Week 1 charts don't exist in a vacuum, Week 2 event screening, Week 3 good pullback / bad timing, Week 4 event-driven vs confirmed breakouts, Week 5 gap risk, Week 6 the full routine), plus a new "Event Risk for Swing Traders" module with the 15 lessons listed.
- **Acceptance tests A-F** wired as real tests: earnings inside the window, earnings tomorrow beating a 95 readiness, unknown earnings, an unexpected global event, FOMC inside the window, and a 12% post-earnings gap invalidating stale levels.

---

## Technical notes

- New engine modules in `src/lib/swingedge/`: `directionalBias.ts`, `historicalMatch.ts`, `eventRisk.ts`, `eventCalendar.ts`, `sectorEvents.ts`, `tradeReadiness.ts`, `monteCarlo.ts`, `expectancy.ts`. Existing `indicators.ts`, `candleEngine.ts`, `riskScore.ts`, `stops.ts`, `portfolioHeat.ts`, `correlation.ts`, `marketRegime.ts`, `relativeStrength.ts`, `tradability.ts`, `revalidation.ts` are read, not rewritten; `riskScore.ts` becomes one input into readiness rather than being replaced.
- Monte Carlo (10,000 paths) runs in a web worker, matching the existing `stressTest.worker.ts` pattern, so the UI never blocks.
- New tables (household-scoped RLS, GRANTs, soft delete): `se_event_calendar`, `se_event_impacts`, `se_symbol_earnings`, `se_event_signal_changes`, `se_bias_snapshots`, `se_readiness_snapshots`, `se_monte_carlo_runs`. Additive columns on `se_paper_trades`, `se_journal_entries` and `se_trading_settings` for event context, bias, readiness and configurable thresholds.
- Earnings fetch is added as a new `earnings` action on the existing `market-data` edge function (Alpha Vantage), cached, with unavailable treated as a normal outcome rather than a connection failure.
- The news scan is a new edge function on a low-frequency schedule with a single-flight lease, a fixed per-run item cap, idempotent progress marking, and a circuit breaker that pauses on credit or policy errors. Everything it produces lands in a pending-approval queue.
- Tests added alongside the existing `*.test.ts` files for bias classification, look-ahead safety, event gating, readiness hard gates and expectancy maths.
