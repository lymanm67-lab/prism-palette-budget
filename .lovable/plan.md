# Portfolio Fit Guardrail — a good trade can still be a bad addition

Today SwingEdge judges a trade on its own chart: setup, stop, reward-to-risk, event risk. Heat and correlation maths already exist, but nothing turns them into a single verdict that can hold back a GO. This adds that verdict.

## What you will see

**One new answer, next to the old one.** Every trade now carries two readings that never blur together:

- Trade quality — unchanged, your existing readiness score and band.
- Portfolio fit — Strong fit, Acceptable, Caution, Poor fit, Blocked, or Insufficient data.

A strong trade with poor fit reads exactly that way: strong trade, wrong time to add it. No "bad trade" language for a concentration problem.

**Exposure families.** Related funds stop being treated as different bets. XLE, XOP, FENY, USO and OIH all read as Energy / oil exposure, so their combined risk is measured together — even though the tickers differ. Families cover energy, semiconductors, financials, small cap, treasuries, gold, technology, oil/commodity and broad market. A symbol with no known family says so instead of being guessed into one.

**Common driver.** Where several positions answer to the same force — crude oil, interest rates, semiconductors, gold, broad market beta — it is named once, plainly.

**Portfolio Impact section in Trade Planner.** Heat now, heat after this trade, sector/family heat now and after, the highest correlation with what you already hold, the common driver, the similar positions by ticker, and the fit verdict. Dollars and percent both shown.

**Portfolio Fit card on the Stock Analyzer**, compact: individual setup, portfolio fit, the reason in one sentence, and a button through to the full impact view.

**Scanner grouping and filter.** Correlated candidates group into a cluster ("5 related candidates — select 1 or 2 max"), optional columns show sector, family, fit, sector heat after trade and driver, a Portfolio Fit filter narrows the list, and a "Diversified setups" preset keeps only candidates that qualify individually and fit the portfolio. Within a cluster, the strongest fit is marked preferred, ranked purely on trade-system numbers.

**Beginner vs Advanced.** In Beginner mode, sector/family heat over 2.5%, portfolio heat over 5%, or very-high correlation against several holdings means the trade cannot be a GO — final status becomes Review or Stop, with no override. Advanced mode can raise the limits or override a warning, but the warning stays on screen and every override is recorded with the plan.

**Your open positions are left alone.** Existing paper trades that already exceed the new threshold are labelled "concentration above current training limit — monitor and learn", never force-closed. The guardrail applies to new candidates.

**Journal and reports.** Each entry saves sector heat before/after, portfolio heat before/after, correlation state, exposure family, common driver, fit and any override, so Performance can later split results by concentration, correlation level, heat band and family — average R, win rate, max drawdown, losing streak, expectancy — and say nothing about whether diversification helped until your own sample is large enough.

**No double counting.** Sector heat, correlation and common driver each describe a different dimension. The fit grade takes the single worst dimension plus severity, it does not stack three penalties for one Energy position.

## Technical outline

New, additive:

- `src/lib/swingedge/exposureFamily.ts` — `ExposureFamily` union, symbol/sector to family map, `familyFor(symbol, sector)` returning `null` when unknown, `COMMON_DRIVER` labels per family.
- `src/lib/swingedge/portfolioFit.ts` — `PortfolioFitState`, `assessPortfolioFit({ candidate, heatSummary, familyGroups, correlation, eventConcentration, limits, beginner })` returning grade, before/after dollars and percents for portfolio and family heat, worst correlation band, driver, similar symbols, reasons, `blocksGo`, and `INSUFFICIENT_DATA` when inputs are missing. Family heat computed from `positionRisk` current risk, reusing `summarizeHeat` output rather than recomputing.
- `src/lib/swingedge/portfolioFit.test.ts` — acceptance tests A ($110 + $25 energy on $5k → Poor, Review/Stop), B ($200 + $60 → Blocked), C (all clear → Acceptable/Strong), D (three energy ETFs → one cluster, high correlation, preferred candidate), plus the section 21 four-position energy case at 2.68%, and a no-double-count assertion.
- `src/hooks/use-swingedge-heat.ts` — extend the existing hook with `familyBreakdown` and `fitForTrade(proposed)`, wrapping `checkTradeAgainstHeat` and `checkCorrelation` already present. No behaviour change to `summarizeHeat`.
- Components: `PortfolioImpactPanel.tsx` (Planner), `PortfolioFitCard.tsx` (Analyzer), cluster row + fit columns/filter inside `MarketScanner.tsx`.
- `tradeReadiness.ts` gains no new weight; `heat` and `correlation` items keep their weights and portfolio fit acts as a separate gate feeding final status, so the score is not inflated.
- Migration: nullable columns on `se_paper_trades` for the journal fields (`sector_heat_before/after`, `portfolio_heat_before/after`, `correlation_state`, `exposure_family`, `common_driver`, `portfolio_fit`, `fit_override_reason`), plus nullable `se_trade_plans` fit snapshot. Existing rows unaffected; GRANTs match the current table pattern.
- Advanced-mode limits reuse existing `se_trading_settings` fields (`max_sector_heat_pct`, `max_portfolio_risk_pct`, `max_correlated_risk_pct`, `advanced_mode`); two new nullable settings columns for family-heat limit and override logging toggle.

Event concentration reuses `sectorEvents.ts` verified events only — no invented events, and unknown correlation reports Insufficient data rather than a number.

## Build order

1. Exposure families + portfolio fit engine + tests (including all four acceptance tests).
2. Migration for journal/plan/settings columns.
3. Trade Planner Portfolio Impact + final-status gating with Beginner no-override rule.
4. Stock Analyzer Portfolio Fit card.
5. Scanner clusters, columns, filter, Diversified setups preset, preferred candidate.
6. Journal write-through and Performance splits by concentration.

Steps 5 and 6 are the largest and can be a second pass if you want the guardrail live sooner.
