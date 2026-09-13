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

Output card: UP / SIDEWAYS / DOWN percentages, sample size, lookback, forward period, market regime, trend, conditions matched, median and average return, average favourable and adverse excursion, best and worst outcome, plus the three event-risk lines. Confidence reads HIGH / MODERATE / LOW / INSUFFICIENT DATA. Two plain-language panels: "Why this bias" and "What would change this bias".

Four credibility safeguards, all from the addendum:
- **Match de-clustering.** Ten consecutive days that all satisfy the same pullback condition are one historical episode, not ten independent ones. Both counts are stored and shown — Raw Matches and Independent Match Episodes — and confidence is always calculated from the independent count.
- **Bias outcome tracking.** Every bias snapshot is scored automatically at 5, 10 and 20 trading days, storing the original up/sideways/down split, confidence, independent sample size, forward price and ATR change, actual classification, maximum favourable and adverse excursion, and the methodology version — so the engine itself can be audited later.
- **Calibration.** Snapshots are grouped into probability bands (50-59, 60-69, 70-79, 80+) and each band shows predicted vs actual up frequency, sample size and the difference. A large gap surfaces a plain calibration warning rather than a confident-looking number.
- **Walk-forward validation.** Thresholds are built on an earlier training period and tested on a later unseen period; in-sample and out-of-sample results are reported side by side, and a collapse outside the sample displays POSSIBLE OVERFITTING.

Historical matching, charts, bias and backtests all read split- and dividend-adjusted price history, with ticker changes, mergers, spin-offs and delistings handled so a split never reads as a crash, breakout or ATR spike. When adjusted history is unavailable the limitation is stated on screen instead of being silently used.

### Event Risk Engine
Never predicts an outcome — only when an event is expected, what it touches, how close it is to your holding window, how material it could be, and whether the trade should stay GO, move to WAIT, or need REVIEW.

Three sources, as you chose:
- **Earnings** — automatic from Alpha Vantage, storing date, CONFIRMED or ESTIMATED, and timing: before market open, after market close, or time unknown. "October 28, CONFIRMED, after market close" is treated as materially different from a report due before the next session. Never invented; unknown earnings blocks a multi-day stock trade in Beginner Mode until you verify it manually.
- **Macro** — a provider abstraction rather than a hand-maintained list: verified calendar source first, then cached schedule, then your manual override, then an explicit unavailable state. Stores release date, time, time zone, event, importance, and previous/expected/actual values only when legitimately available.
- **Global and sector events** — a news scan proposes candidates on a schedule. Each candidate stores source, source type, publication time, event time, region, affected sectors, number of independent sources when available, last verified, and source confidence (HIGH / MODERATE / LOW / UNVERIFIED). A rumour and established reporting are never weighted the same.

**Three event states, not two.** PENDING VERIFICATION, VERIFIED, DISMISSED. A pending event never changes trade direction on its own — but a pending event with potentially HIGH or SEVERE impact displays UNVERIFIED EVENT RISK and forces REVIEW until you verify or dismiss it. A potentially severe unreviewed event can never sit inert behind a GO.

**Events expire.** Each event carries detected-at, event start, event end when known, review-by, resolved-at and a status of UPCOMING / ACTIVE / RESOLVED / CANCELLED / STALE. Resolution recalculates Event Risk, so a sector never stays HIGH because an old event was never cleared, and an unresolved event past its freshness window goes STALE and requests revalidation.

**Session context.** Every event records whether it lands before the open, during market hours, after the close, or overnight, with time zones normalised — and the Trade Planner says so in words, e.g. "this event occurs after the regular trading session and may create overnight gap risk".

Also included: earnings calendar card with days-until and holding-window crossing, configurable pre-earnings windows (0-2 very high, 3-5 high, 6-10 moderate, 10+ lower), Beginner Mode earnings rule with an explicit "allow earnings trades" opt-in and gap acknowledgement, post-earnings stabilisation flag that forces revalidation of trend/levels/entry/stop/target/bias, gap warning wherever a trade is approved, a sector event calendar for the nine sectors, Global Sector Risk (LOW / MODERATE / HIGH / SEVERE), an Event Risk Score 0-100 with configurable bands, and an event timeline strip (today, entry, events, holding-window end). Every signal change is logged with previous signal, new signal, event, severity, sector, reason and timestamp.

**Event risk is portfolio-wide, not per ticker.** Event exposure feeds correlation, sector heat and portfolio heat, so NVDA, AMD, SMH and QQQ open together against one semiconductor shock displays EVENT-CONCENTRATED EXPOSURE.

Hard gates in Beginner Mode: SEVERE prevents GO, HIGH normally produces REVIEW, MODERATE can qualify. Advanced overrides are allowed and always logged.

### Signal revalidation triggers (expanded)
Mandatory revalidation now also fires on: a new earnings date, earnings confirmation, an earnings timing change, a new macro event, a new verified global event, a severity upgrade, an event resolution, a market regime change, a sector risk change, a material directional-bias change, ATR expansion, an entry-zone violation and a stop change. Event Risk is re-run immediately before every paper execution — a GO produced before new information existed can never survive unrevalidated.

---

## Push 2 — Readiness, Monte Carlo, Expectancy, and the surrounding screens

- **Trade Readiness Score** — "does this trade meet my rules right now?" Out of 100 using your weights (setup 10, stop 10, trend 9, bias 9, reward-to-risk 9, quality 8, regime 7, sector 6, candles 5, volume 5, sizing 5, event 5, revalidation 5, heat 4, correlation 3). Bands: 90+ READY, 80-89 QUALIFIED, 70-79 WAIT, 60-69 REVIEW, under 60 NOT READY. Weights configurable in Advanced Mode. Event Risk is always shown separately, and no score can override a hard gate — invalid stop, undefined invalidation, risk or heat or correlation breach, reward-to-risk below minimum, poor tradability, expired signal, extended price, critical data failure, severe event risk in Beginner Mode, unknown earnings when verification is required.
- **System Readiness** — a separate question: "has my process shown a repeatable edge?" States: TRAINING, INSUFFICIENT DATA, EARLY EVIDENCE, DEVELOPING EDGE, VALIDATED FOR FURTHER TESTING. Reads completed paper trades, overall/pullback/breakout expectancy, average winner and loser in R, maximum drawdown, rule-following %, execution score, stop discipline %, portfolio-heat compliance %, results across market regimes and event-risk conditions, Monte Carlo drawdowns, risk of ruin and outlier dependence. It is an evidence summary, never investment advice, and it never authorises live trading.
- **Outlier dependence** — percent of total net profit from the largest 1, 3 and 5 trades (e.g. +20R total, +15R from the top three = 75% concentration), with RESULTS HIGHLY CONCENTRATED shown when appropriate and more testing required before the system is called durable.
- **Monte Carlo Risk Lab** — modelled in R multiples from your own paper-trade and backtest results, 10,000 runs by default, and never shown without its sample-quality label: under 30 trades INSUFFICIENT DATA, 30-49 EARLY ESTIMATE, 50-99 MODERATE SAMPLE, 100+ STRONGER SAMPLE (evidence quality, not a guarantee of accuracy). Reports median ending balance, 10th/90th percentiles, probability of profit, median and worst-5% drawdown, longest losing streak, odds of 10/20/30% drawdowns, odds of hitting a trading pause and risk of ruin.
- **Risk of ruin, defined on screen** — you pick the threshold (20%, 30% or 50% account decline, or a minimum balance) and the panel always shows "RUIN DEFINITION: 30% account loss / estimated probability X%" with its assumptions visible beside it.
- **Risk-sizing comparison** — 0.25%, 0.50%, 0.75%, 1.00%, 2.00% and a custom level side by side, each with median ending balance, median and worst-5% drawdown, probability of a 10% and 20% drawdown, longest expected losing streak and risk of ruin — so it visibly teaches that more risk raises upside and drawdown and ruin risk together.
- **Regime-aware Monte Carlo** — simple resampling of individual R outcomes first, then block bootstrap and regime-aware resampling once history supports it, preserving clusters of wins and losses. Separate runs for bull, neutral, cautious and high-volatility markets, and for low vs high event risk and near vs outside earnings. Every result is labelled SIMPLE RESAMPLING or REGIME-AWARE MODEL.
- **System Expectancy** — (win rate x average winning R) - (loss rate x average losing R), tracked overall and by setup type, regime, bias and event-risk level.
- **Scanner** — new columns for earnings date, days until, confirmed/estimated, event risk, global sector risk, bias with up/sideways/down and confidence, and readiness. New filters for excluding earnings within X days, maximum event risk, excluding severe global risk, minimum bias and minimum readiness, plus a "Low Event Risk Pullbacks" preset.
- **Analyzer and Trade Planner** — bias, event risk, earnings timeline, historical comparison with sample quality, readiness, why-this-bias and what-could-change sections; the planner's pre-qualify summary lists every check in order and requires a pre-trade event checklist before qualifying.
- **Journal and Performance** — store earnings date and days-until at entry, earnings timing and session, event risk, global risk, sector and macro events, whether an event occurred and affected price, gap size and event slippage. Dashboard reports near vs outside earnings, results by event-risk level, gap losses, bias performance and calibration, readiness performance, Monte Carlo summary, expectancy, outlier dependence and System Readiness — with a "not enough trades yet" state until the sample supports a conclusion.
- **Course and Academy** — event awareness folded into all six weeks (Week 1 charts don't exist in a vacuum, Week 2 event screening, Week 3 good pullback / bad timing, Week 4 event-driven vs confirmed breakouts, Week 5 gap risk, Week 6 the full routine), plus two new modules: "Event Risk for Swing Traders" (15 lessons) and "Probability and Trading Edge" (20 lessons from probability vs prediction through independent samples, calibration, excursions, expectancy, R multiples, Monte Carlo, drawdowns, losing streaks, risk of ruin, outlier dependence, why losing trades are normal and why expectancy beats win rate).
- **Practice requirements** — 10 directional-bias reviews, 5 historical pullback comparisons, 5 historical breakout comparisons, 3 Monte Carlo risk-sizing comparisons, 1 manual expectancy calculation, 1 event-risk review, 1 full trade-readiness review, and 1 system-readiness review once enough trades exist.
- **Acceptance tests A-O** wired as real tests: earnings inside the window, earnings tomorrow beating a 95 readiness, unknown earnings, an unexpected global event, FOMC inside the window, a 12% post-earnings gap invalidating stale levels, 9 matches giving insufficient confidence, 100 overlapping matches reported as raw vs independent, readiness 94 overridden by a severe verified sector event, a 22-trade Monte Carlo warning, 80% of profit from three trades, a HIGH event going stale, a pending severe event forcing REVIEW rather than silent GO or automatic STOP, a 70%-predicted bias delivering 52% flagged as poorly calibrated, and a post-split series producing no false crash, breakout, ATR spike or bias distortion.

---

## Technical notes

- New engine modules in `src/lib/swingedge/`: `directionalBias.ts`, `historicalMatch.ts` (with de-clustering and independent-episode counting), `biasCalibration.ts`, `walkForward.ts`, `eventRisk.ts`, `eventCalendar.ts` (macro provider abstraction + session/time-zone normalisation), `sectorEvents.ts`, `tradeReadiness.ts`, `systemReadiness.ts`, `monteCarlo.ts` (simple, block-bootstrap and regime-aware resampling, risk-of-ruin, risk-sizing grid), `outlierDependence.ts`, `expectancy.ts`. Existing `indicators.ts`, `candleEngine.ts`, `riskScore.ts`, `stops.ts`, `portfolioHeat.ts`, `correlation.ts`, `marketRegime.ts`, `relativeStrength.ts`, `tradability.ts`, `revalidation.ts`, `corporateActions.ts` are read and extended additively, not rewritten; `riskScore.ts` becomes one input into readiness rather than being replaced.
- Monte Carlo (10,000 paths, plus the six-level risk-sizing grid and regime splits) runs in a web worker, matching the existing `stressTest.worker.ts` pattern, so the UI never blocks.
- New tables (household-scoped RLS, GRANTs, soft delete): `se_event_calendar` (state, status, source quality, session, detected/start/end/review-by/resolved-at), `se_event_impacts`, `se_symbol_earnings` (date, confirmed/estimated, timing), `se_event_signal_changes`, `se_bias_snapshots`, `se_bias_outcomes` (5/10/20-day forward results, excursions, methodology version), `se_readiness_snapshots`, `se_system_readiness_snapshots`, `se_monte_carlo_runs`. Additive columns on `se_paper_trades`, `se_journal_entries` and `se_trading_settings` for event context, bias, readiness, ruin thresholds and configurable weights.
- Earnings fetch is added as a new `earnings` action on the existing `market-data` edge function (Alpha Vantage), cached, with unavailable treated as a normal outcome rather than a connection failure. The macro calendar follows the same provider pattern with cached and manual-override fallbacks.
- Two scheduled edge functions — the news scan and the bias-outcome scorer — each with a single-flight lease, a fixed per-run item cap, idempotent progress marking, and a circuit breaker that pauses on credit or policy errors. Scan output lands in the pending-verification queue; a stale-event sweep runs in the same job.
- Tests added alongside the existing `*.test.ts` files for bias classification, look-ahead safety, de-clustering, calibration, walk-forward, event gating and expiry, readiness hard gates, outlier dependence, Monte Carlo sample quality and expectancy maths.

---

## The three questions, and the order

The finished system answers three separate questions and never blurs them: **Trade Readiness** ("does this trade meet my rules right now?"), **System Readiness** ("has my process shown a repeatable edge?"), **Event Readiness** ("is anything known that could change this setup during my holding period?").

Final flow: quality → market regime → global events → sector events → earnings → relative strength → trend → setup → directional bias → historical sample quality → candle confirmation → volume → entry → invalidation → stop → ATR → position size → reward to risk → portfolio heat → event-concentrated exposure → correlation → trade readiness → revalidate → paper execution → manage → journal → expectancy → Monte Carlo → system readiness → review → improve.

Throughout, the system gets more sceptical as uncertainty rises — never more confident just because more indicators are available.
