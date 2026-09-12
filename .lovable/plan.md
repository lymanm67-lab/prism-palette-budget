# SwingEdge Hybrid Signal Engine

A new decision layer on top of what already exists. Nothing currently working gets rebuilt: the market data connection, the technical scoring, the stop-loss engine, the scanner, analyzer, watchlists, planner, paper trades, journal, performance and academy all stay as they are.

The new layer answers three separate questions and then combines them:

- Quality: is this company or fund worth considering at all?
- Timing: is the chart favourable right now?
- Risk: can this trade be taken inside my own rules?

Result is one of four signals: **GO**, **WAIT**, **REVIEW**, **STOP**. For trades already open, a separate set: **HOLD PLAN**, **REVIEW TRADE**, **STOP TRIGGERED**, **TARGET REACHED**.

GO never means "price will rise". It means "this setup currently satisfies my rules". Every screen carries that wording.

## Non-negotiable rules baked in

- A high score never overrides a failed hard rule. Hard rules: invalid stop, no defined invalidation, account risk exceeded, portfolio risk exceeded, reward-to-risk below minimum, incomplete setup, insufficient or failed data. A 92 with an invalid stop is STOP.
- Fundamentals never move a stop price. Stops stay tied to structure, volatility and setup logic. Deteriorating fundamentals can trigger REVIEW, never a different chart stop.
- Missing data is never scored as zero. It reducoverage and lowers confidence, and the screen says how much data the score is based on.
- Funds are never scored as if they were companies. Separate quality model.
- No score is ever presented as a probability of profit. No "buy"/"sell" language anywhere.

## Build in four stages, each with its own acceptance tests

### Stage 1 — Scoring engines and data plumbing

- Company Fundamental Score out of 100: revenue growth 15, earnings growth 20, profitability 15, cash flow 15, balance sheet 15, valuation 20. Sector-aware thresholds (banks, insurance, REITs, utilities, technology, consumer, industrials, healthcare, energy) with a clearly labelled generic model and lower confidence when sector data is thin.
- Fund Quality Score out of 100: liquidity 20, tradability 15, size 10, expense ratio 10, diversification 10, concentration 10, volatility 10, structure 10, stability 5. Automatic detection and flagging of leveraged, inverse, single-stock and highly concentrated funds as ADVANCED PRODUCT.
- Risk Score out of 100: stop quality 25, reward-to-risk 20, position size 15, account risk 15, portfolio risk 10, volatility context 10, event risk 5. Feeds off the existing stop engine — no duplicate risk maths.
- Hybrid Score = fundamental/fund quality x 0.40 + technical x 0.40 + risk x 0.20. Bands: 85+ STRONG, 75-84 QUALIFIED, 65-74 WATCH, 50-64 WEAK, under 50 POOR.
- Data confidence (HIGH / MODERATE / LOW / INSUFFICIENT) from completeness, freshness, provider quality, reporting period and conflicting values. Partial scores normalise proportionally and always display coverage percent.
- Fundamental trend (IMPROVING / STABLE / DETERIORATING / INSUFFICIENT) and graded red flags (LOW / MODERATE / HIGH / CRITICAL). A single red flag does not stop a trade; a critical one can force REVIEW or STOP.
- Fundamental data provider abstraction supporting the current data vendor, manual entry, and a future vendor. Capability-aware: if an endpoint is not on the plan, the screen says FUNDAMENTAL DATA UNAVAILABLE or PARTIAL, it does not retry in a loop, and it never invents numbers.
- Slow-moving fundamental cache with source-update metadata, so fundamentals refresh on reported updates rather than on every scan. Price data keeps its existing refresh rules.
- Manual data mode: enter a metric with source name, source date and metric date. Manual values are always labelled and never blended invisibly with vendor data.

Stage 1 gate: the four worked examples from the brief reproduce exactly — 82/88/90 gives 86.0 and GO; 90/60/85 with extended price gives WAIT; 48/91/88 gives REVIEW; 90/92/95 with an invalid stop gives STOP; 55% fundamental coverage never produces a full-confidence GO.

### Stage 2 — Signal engine, conflicts and explanations

- Signal matrix combining quality, timing and risk, with hard gates evaluated first.
- Conflict engine naming the exact disagreement (strong quality / weak chart, weak quality / strong chart, strong setup / weak risk, market versus stock, high score / low confidence). A live conflict defaults to REVIEW or WAIT.
- Signal confidence separate from data confidence, never phrased as odds.
- Every signal carries "Why this signal?" and "What could change this?" written in plain sentences.
- Data sources panel on the analyzer: price, fundamentals, fund quality, earnings, technical and risk calculations, each with source and last-updated stamp. Stale or missing is never shown as current.
- Earnings risk: days until earnings, expected holding period, and whether earnings fall inside the window (YES / NO / UNKNOWN). Beginner mode avoids new trades spanning earnings by default.
- Signal history recorded on every change with all four scores, confidence and the reason. Alerts for WAIT to GO, GO to REVIEW, GO to STOP, deteriorating fundamentals, invalidated setup, dropped risk score or confidence, added earnings risk, changed stop quality. Alerts never place trades.
- Change detector: when new fundamentals arrive, show "What changed" line by line, recalculate, and never move the signal silently.

Stage 2 gate: each conflict type produces the documented signal and an explanation naming the conflict; no signal renders without both its reasons and its invalidation.

### Stage 3 — Screens

- Analyzer gains four cards — Fundamentals or Fund Quality, Technicals, Risk, Hybrid Signal — plus the expanded "Teach me why" covering all four plus what would change the signal.
- Watchlists gain columns: asset type, quality score, technical, risk, hybrid, signal, confidence, setup, entry, stop, target, reward-to-risk, last updated. Portfolio role and trading status stay exactly as they are; hybrid signal is an extra field, not a third classification.
- Scanner gains filters on every score, signal, confidence, trend, sector, industry, setup, role and status, plus four presets: Hybrid GO, Quality waiting for entry, Technical leader / fundamental review, Strong fundamentals / weak timing. Fundamentals are served from cache during scans so a scan never burns the data allowance.
- Trade Planner shows all four scores, signal, confidence, setup, invalidation, stop, position size, target, reward-to-risk and hard gate status before qualification, walking the ten-step qualification sequence.
- Paper trades use the open-trade status set.
- Beginner mode: fixed weights, no gate overrides, leveraged and inverse funds excluded from GO, GO requires at least moderate confidence, conflicts shown prominently. Advanced mode allows weight and threshold changes and logged overrides, with SYSTEM SIGNAL and USER OVERRIDE always shown side by side. Weight changes can never bypass a hard gate.

Stage 3 gate: a full walkthrough on one stock and one fund from scanner to planner keeps every number consistent across screens.

### Stage 4 — History testing, performance and a lesson

- Historical testing extended to GO, WAIT-that-became-GO, REVIEW and STOP, reporting win rate, average R, expectancy, largest drawdown, holding period and conversion rate by score band.
- Strict look-ahead protection: only information available at the time may be used. Where point-in-time fundamentals do not exist, the screen states POINT-IN-TIME FUNDAMENTALS UNAVAILABLE rather than claiming a valid result. Survivorship limitations stated where the data cannot account for delistings and ticker changes.
- Performance dashboard: GO trade count, win rate, average R, expectancy, WAIT-to-GO conversion, REVIEW outcomes, trades avoided by STOP, and results broken down by each score band, by confidence, and by conflict type.
- New academy lesson, Fundamentals versus Technicals, with four worked cases: good company / bad trade, weak company / strong chart, strong chart / poor risk, and full alignment.

Stage 4 gate: results are reproducible from the same inputs, and no historical result is presented as a forecast.

## Technical notes

- New pure modules under `src/lib/swingedge/`: `fundamentals.ts`, `etfQuality.ts`, `riskScore.ts`, `hybrid.ts`, `conflicts.ts`, `confidence.ts`, `sectors.ts`, each with unit tests. Existing `score.ts`, `stops.ts`, `risk.ts` and `indicators.ts` are consumed, not modified beyond additive exports.
- `FundamentalDataProvider` interface mirroring the existing market-data provider pattern in `provider.ts`, with `TwelveDataFundamentals`, `ManualFundamentals` and a capability map. All vendor calls continue to go through the existing server-side function so the key never reaches the browser; new fundamental actions are added to it, capability- and credit-checked before each call.
- New backend tables, household-scoped with row-level security and grants: `se_fundamental_cache`, `se_fundamental_scores`, `se_etf_quality_scores`, `se_hybrid_scores`, `se_hybrid_signal_history`, `se_signal_conflicts`, `se_fundamental_overrides`. Confidence, coverage, data sources and methodology version are columns on the score rows rather than separate tables. Every score row records `methodology_version` so changing weights later never rewrites past signals.
- Hybrid weights, minimum thresholds and mode (beginner/advanced) stored in the existing trading settings row.
- Styling reuses the existing dark theme tokens and the four-status badge patterns already in use.

## What I need from you

Nothing to start — the engines, manual entry and all four gates work without any new subscription. If your market data plan does not include company financials, the screens will say so plainly and you can either enter key figures by hand with their source and date, or trade funds where liquidity and structure data is enough.
