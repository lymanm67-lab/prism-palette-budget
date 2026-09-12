# SwingEdge Hybrid Signal Engine

A new decision layer on top of what already exists. Nothing currently working gets rebuilt: the market data connection, the stop-loss engine, the scanner, analyzer, watchlists, planner, paper trades, journal, performance and academy all stay in place. The one existing piece that does change is the technical score, and only to remove risk from it.

The new layer answers three separate questions and then combines them:

- Quality: is this company or ETF worth considering at all?
- Timing: is the chart favourable right now?
- Risk: can this trade be taken inside my own rules?

Result is one of four signals: **GO**, **WAIT**, **REVIEW**, **STOP**. Trades already open use a separate set: **HOLD PLAN**, **REVIEW TRADE**, **STOP TRIGGERED**, **TARGET REACHED**.

GO never means "price will rise". It means "this setup currently satisfies my rules". Every screen carries that wording.

## Non-negotiable rules baked in

- **Risk is scored once.** Reward-to-risk comes out of the technical score entirely and lives only in the risk score. Technical measures the chart and nothing else. Stop quality, reward-to-risk, volatility, account risk and portfolio risk sit exclusively in risk.
- A high score never overrides a failed hard rule. Hard rules: invalid stop, no defined invalidation, account risk exceeded, portfolio risk exceeded, reward-to-risk below minimum, incomplete setup, insufficient or failed data. A 92 with an invalid stop is STOP.
- Fundamentals never move a stop price. Stops stay tied to structure, volatility and setup logic. Deteriorating fundamentals trigger REVIEW, never a different chart stop and never a forced exit on their own.
- Missing data is never scored as zero. It reduces coverage and lowers confidence, and the screen says how much data the score is based on.
- ETFs are never scored as if they were companies. Two explicit models: **Company Fundamental Score** for stocks, **ETF Quality Score** for ETFs.
- Confirmed signals come from completed candles. Today's unfinished candle is labelled DEVELOPING or INTRADAY PREVIEW and never silently replaces the confirmed daily read.
- No score is ever presented as a probability of profit. No buy/sell language anywhere.

## Scores

**Technical Score, 100 points (revised):** trend 25, momentum 20, setup quality 25, volume 15, market and sector alignment 15. Reward-to-risk removed. Sector alignment is explicit: for stocks, stock versus sector and sector versus market; for ETFs, the ETF versus its relevant benchmark. A strong stock in a weak sector inside a strong market is visible rather than buried.

**Company Fundamental Score, 100 points:** revenue growth 15, earnings growth 20, profitability 15, cash flow 15, balance sheet 15, valuation 20. Sector-aware thresholds (banks, insurance, REITs, utilities, technology, consumer, industrials, healthcare, energy), with a clearly labelled generic model and reduced confidence when sector data is thin.

**ETF Quality Score, 100 points:** liquidity 20, tradability 15, size 10, expense ratio 10, diversification 10, concentration 10, volatility 10, structure 10, stability 5. Leveraged, inverse, single-stock and highly concentrated products flagged ADVANCED PRODUCT and excluded from GO in beginner mode.

**Risk Score, 100 points:** stop quality 25, reward-to-risk 20, position size compliance 15, account risk 15, portfolio risk 10, volatility context 10, event risk 5. Built on the existing stop engine, no duplicated maths.

**Hybrid Score** = quality x 0.40 + technical x 0.40 + risk x 0.20. Bands: 85+ STRONG, 75-84 QUALIFIED, 65-74 WATCH, 50-64 WEAK, under 50 POOR. Weights configurable in advanced mode but never able to bypass a hard gate.

## GO thresholds — explicit

GO requires all of these at once:

- Quality score (company or ETF) at least 65
- Technical score at least 75
- Risk score at least 75
- Hybrid score at least 75
- Data confidence at least MODERATE
- Zero hard-gate failures
- Price inside the planned entry zone
- Signal not expired

Any single miss drops the signal to WAIT, REVIEW or STOP depending on which condition failed. A brilliant fundamental score cannot mathematically carry a mediocre setup over the line.

## Signal expiry, revalidation and the price-moved-away rule

- Every signal carries **Signal valid until**. A GO expires when a new daily candle completes, and is invalidated earlier by price leaving the entry zone, a changed stop or target, changed earnings risk, or material new fundamental data.
- **Price moved away:** if price is now beyond the planned entry zone, the signal becomes WAIT or REVIEW with "Price has moved beyond the planned entry zone. Recalculate the trade rather than chase the original signal." It never keeps reading GO because yesterday's setup was valid.
- **Mandatory revalidation before execution:** immediately before a paper trade is created, entry, stop, target, reward-to-risk, position size, account risk and hybrid signal are all recalculated from current data. A stale GO cannot be traded.

## Open-trade state machine

- **HOLD PLAN** — the original setup and invalidation thesis are both intact and no predefined exit condition has occurred.
- **REVIEW TRADE** — something material changed (fundamentals deteriorated, earnings entered the window, sector turned, data confidence dropped) but no technical exit condition has occurred. A falling fundamental score lands here, never in a forced exit.
- **STOP TRIGGERED** — a predefined stop or written invalidation rule actually occurred.
- **TARGET REACHED** — the planned target was reached.

## Build in four stages, each with its own acceptance tests

### Stage 1 — Scoring engines, evidence storage and data plumbing

- The four scores above, as pure modules with unit tests. Technical score refactor removes reward-to-risk and adds sector alignment; existing callers updated.
- Data confidence (HIGH / MODERATE / LOW / INSUFFICIENT) from completeness, freshness, provider quality, reporting period and conflicting values. Partial scores normalise proportionally and always show coverage percent.
- Fundamental trend (IMPROVING / STABLE / DETERIORATING / INSUFFICIENT) and graded red flags (LOW / MODERATE / HIGH / CRITICAL). One flag does not stop a trade; a critical one can force REVIEW or STOP.
- **Raw evidence saved with every score:** revenue growth, EPS growth, margins, debt ratios, cash flow figures, 20 EMA, 50 SMA, RSI, MACD, ATR, relative volume, support and resistance, stop level, reward-to-risk, market and sector alignment, plus the candle timestamp used. Months later the exact reason for a GO can be reconstructed, not just the number.
- `FundamentalDataProvider` abstraction over the current vendor, manual entry and a future vendor. Capability-aware: an off-plan endpoint shows FUNDAMENTAL DATA UNAVAILABLE or PARTIAL, is not retried in a loop, and never produces invented numbers.
- Slow fundamental cache keyed on reporting period with source-update metadata, so fundamentals refresh on reported updates rather than on every scan.
- **Manual data rules:** every manual value carries source name, source date, metric date and a status of CURRENT, STALE or SUPERSEDED with a verification date. When vendor data later disagrees materially, nothing is silently replaced — both values are shown, confidence falls, and the analyzer says which sources conflict.
- Completed-versus-forming candle handling in the indicator layer, so confirmed and developing reads are separate values.

Stage 1 gate: 82/88/90 gives 86.0 and GO; 90/60/85 with extended price gives WAIT; 48/91/88 gives REVIEW; 90/92/95 with an invalid stop gives STOP; 55% fundamental coverage never produces a full-confidence GO; reward-to-risk appears in exactly one score; a GO recalculated after price leaves the entry zone is no longer GO.

### Stage 2 — Signal engine, conflicts and explanations

- Signal matrix combining quality, timing and risk, with hard gates evaluated first and the explicit GO thresholds applied.
- Conflict engine naming the exact disagreement: strong quality / weak chart, weak quality / strong chart, strong setup / weak risk, stock versus sector, sector versus market, ETF versus benchmark, high score / low confidence, sources disagree. A live conflict defaults to REVIEW or WAIT.
- Signal confidence separate from data confidence, never phrased as odds.
- Every signal carries "Why this signal?", "What could change this?" and its valid-until stamp.
- Data sources panel on the analyzer: price, fundamentals, ETF quality, earnings, technical and risk calculations, each with source, freshness and candle basis. Stale or missing is never shown as current.
- Earnings risk: days until earnings, expected holding period, earnings inside window (YES / NO / UNKNOWN). Beginner mode avoids new trades spanning earnings by default.
- Signal history on every change: all four scores, confidence, coverage, evidence snapshot and reason. Alerts for WAIT to GO, GO to REVIEW, GO to STOP, expiry, price moved away, deteriorating fundamentals, invalidated setup, dropped risk score or confidence, added earnings risk, changed stop quality. Alerts never place trades.
- Fundamental change detector showing what changed line by line before recalculating.

Stage 2 gate: each conflict type produces the documented signal with an explanation naming it; no signal renders without reasons, invalidation and valid-until.

### Stage 3 — Screens

- Analyzer gains four cards — Company Fundamentals or ETF Quality, Technicals, Risk, Hybrid Signal — plus expanded "Teach me why" covering all four, the sector picture, and what would change the signal.
- Watchlists gain columns: asset type, quality score, technical, risk, hybrid, signal, confidence, setup, entry, stop, target, reward-to-risk, valid until, last updated. Portfolio role and trading status stay exactly as they are; hybrid signal is an extra field, not a third classification.
- Scanner gains filters on every score, signal, confidence, fundamental trend, technical trend, sector, industry, setup, role and status, plus four presets: Hybrid GO, Quality waiting for entry, Technical leader / fundamental review, Strong fundamentals / weak timing. Fundamentals are served from cache during scans so a scan never burns the data allowance.
- Trade Planner shows all four scores, signal, confidence, setup, invalidation, stop, position size, target, reward-to-risk and hard-gate status, walking the ten-step qualification sequence, and runs the mandatory revalidation before a paper trade is created.
- Paper trades use the open-trade state machine, re-evaluated on each completed daily candle.
- Beginner mode: fixed weights, no gate overrides, leveraged and inverse ETFs excluded from GO, confirmed candles only, at least moderate confidence for GO, conflicts prominent. Advanced mode allows weight and threshold changes and logged overrides, always showing SYSTEM SIGNAL and USER OVERRIDE separately.

Stage 3 gate: one stock and one ETF walk from scanner to paper trade with identical numbers on every screen, and a stale GO is caught at the revalidation step.

### Stage 4 — History testing, performance and a lesson

- Historical testing over GO, WAIT-that-became-GO, REVIEW and STOP, reporting win rate, average R, expectancy, largest drawdown, holding period and conversion rate by score band.
- **Execution realism, configurable:** slippage, commissions, gap-through-stop behaviour, next-available-price stop fills, split-adjusted prices, dividend and corporate-action handling, and a block on impossible same-candle assumptions. No test assumes every stop fills exactly at the stop price.
- Strict look-ahead protection: only information available at the time is used. Where point-in-time fundamentals do not exist, the screen states POINT-IN-TIME FUNDAMENTALS UNAVAILABLE instead of claiming a valid result. Survivorship limitations stated where the data cannot account for delistings, mergers and ticker changes.
- **Signal effectiveness tracked separately from execution:** setup quality, signal outcome, execution quality, rule following and trade result are five distinct measures, so it is clear whether a loss came from the rules or from how the trade was handled.
- Performance dashboard: GO count, GO win rate, average R, expectancy, WAIT-to-GO conversion, REVIEW outcomes, trades avoided by STOP, and breakdowns by each score band, by confidence and by conflict type.
- New academy lesson, Fundamentals versus Technicals, with four worked cases: good company / bad trade, weak company / strong chart, strong chart / poor risk, full alignment.

Stage 4 gate: identical inputs reproduce identical trades; a gap below the stop fills at the next available price, not at the stop; no historical result is presented as a forecast.

## Technical notes

- New pure modules under `src/lib/swingedge/`: `fundamentals.ts`, `etfQuality.ts`, `riskScore.ts`, `hybrid.ts`, `conflicts.ts`, `confidence.ts`, `sectors.ts`, `signalLifecycle.ts`, `backtestExecution.ts`, each with unit tests. `score.ts` is edited to drop reward-to-risk and add sector alignment; `stops.ts`, `risk.ts` and `indicators.ts` are consumed with additive exports only (`indicators.ts` gains completed-versus-forming candle handling).
- `FundamentalDataProvider` mirrors the existing market-data provider pattern in `provider.ts`, with `TwelveDataFundamentals`, `ManualFundamentals` and a capability map. Vendor calls keep going through the existing server-side function so the key never reaches the browser; new fundamental actions are capability- and credit-checked before each call.
- New backend tables, household-scoped with row-level security and grants: `se_fundamental_cache`, `se_fundamental_scores`, `se_etf_quality_scores`, `se_hybrid_scores`, `se_hybrid_signal_history`, `se_signal_conflicts`, `se_fundamental_overrides`. Score rows carry confidence, coverage, data sources, valid-until, candle basis, a JSON evidence snapshot and `methodology_version`, so changing weights later never rewrites past signals.
- Hybrid weights, minimum thresholds, execution assumptions and mode (beginner/advanced) stored in the existing trading settings row.
- Styling reuses the existing dark theme tokens and the four-status badge patterns already in use.

## What I need from you

Nothing to start — the engines, manual entry and all four gates work without any new subscription. If your market data plan does not include company financials, the screens will say so plainly and you can either enter key figures by hand with their source and date, or trade ETFs where liquidity and structure data is enough.
