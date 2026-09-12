# SwingEdge Final Enhancement — Portfolio Heat, Revalidation, Execution Realism, Training Mode

Verified current state (so the plan builds on what exists, not replaces it):
- `risk.ts` already has `portfolioRisk()` (max portfolio risk vs open risk) — heat builds on this.
- `TradePlanner.tsx` (994 lines) already runs stop qualification + hybrid gates; heat/liquidity/revalidation become additional gates there.
- `performance.ts` already derives win rate, expectancy, rule-following — execution score and best-skip extend it.
- `PaperTrading.tsx`, `TradeJournal.tsx`, `Backtester.tsx`, `SwingEdgeDashboard.tsx` all exist and stay.

Everything below is additive. No existing provider, engine, or page is rebuilt. A strong signal still never overrides hard risk gates.

## Defaults (adjust in Trading Settings, Advanced Mode)
- Max portfolio heat: 6% of trading capital across all open trades
- Max single-position risk: 1% (existing)
- Max sector exposure: 25% of trading capital
- Max correlated exposure: 3% total risk within a correlation cluster
- Signal validity: revalidate if older than 3 trading days, or price moved > 1 ATR from entry zone

## Stage 1 — Portfolio heat, sector and correlation limits
New pure module `portfolioHeat.ts`:
- Open-risk aggregation per position (shares × distance to current stop, so a moved-up stop reduces heat)
- Portfolio heat % with room-remaining, sector exposure %, correlation clusters (same sector / same ETF family treated as correlated) with cluster-risk cap
- Verdicts: `WITHIN_LIMITS`, `HEAT_FULL`, `SECTOR_LIMIT_REACHED`, `CORRELATION_LIMIT_REACHED` — each a hard gate in the Trade Planner
- Dashboard card: heat gauge, per-sector bars, cluster warnings, "risk available for next trade"

## Stage 2 — Tradability, revalidation, anti-chasing
New module `tradability.ts` + `revalidation.ts`:
- Liquidity screen (avg volume, dollar volume, spread proxy) → `TRADABLE / THIN / AVOID`; THIN warns, AVOID hard-gates planner
- Signal revalidation: every stored GO carries entry zone, ATR and timestamp; on load we check price-vs-zone, signal age, and stop validity → `CURRENT`, `NEEDS_REVIEW`, `EXPIRED`. Expired signals show as expired, never silently as GO
- Anti-chasing: price beyond entry zone → `PRICE EXTENDED — WAIT` with recalc prompt (extends existing candle chasing protection to the whole signal)

## Stage 3 — Execution realism
New module `execution.ts`:
- Slippage model (fraction of ATR by liquidity tier), gap-through-stop fills at open price, commissions
- Execution variance: planned vs actual entry/stop/target captured on each paper trade
- Execution score per trade (0–100): entry slippage discipline, stop adherence, exit discipline
- Outcome classification: GOOD WIN / GOOD LOSS / BAD WIN / BAD LOSS — a losing trade that followed the plan counts as good execution; a winning trade that broke rules counts as bad
- Backtester uses the same slippage/gap model so historical results match live assumptions

## Stage 4 — Circuit breakers and immutable snapshots
- Circuit breakers (settings-configurable): consecutive-loss pause (default 3), daily loss limit, weekly loss limit → new trades blocked with "cooling-off" state, dashboard banner
- `se_trade_snapshots` table: at trade entry, store the full evidence — signal state, hybrid score, stop justification, candle context, heat, rationale — immutable, so journal and review compare against what was known at the time, not hindsight

## Stage 5 — Training Mode, weekly review, exports
- Six-week Training Mode curriculum (extends Academy): each week has a focus (entries, stops, sizing, management, review, consistency), required practice reps on paper trades, and a pass requirement before the readiness light upgrades
- Daily pre-trade checklist (market condition, heat room, earnings check, stop defined, size calculated) stored per day; planner can't be marked "ready" without it in Beginner Mode
- Weekly review page: trades taken, rule-following %, execution score, best skip (highest-quality setup you correctly passed on), one lesson to revisit
- CSV export: trades, journal, snapshots

## Data
New household-scoped RLS tables (with GRANTs): `se_trade_snapshots`, `se_daily_checklists`, `se_training_progress`, `se_circuit_breaker_state`. Settings columns for heat/sector/correlation/breaker limits go on the existing trading settings row.

## Tests
Vitest acceptance tests per stage: heat caps block correctly, moved stops reduce heat, expired signals never show as GO, gap-through-stop fills at open, bad win / good loss classification, circuit breaker triggers and resets, snapshot immutability at write time. Run full suite + typecheck at the end.

## Order of work
Stage 1 → 2 → 3 → 4 → 5, one at a time, verified as each lands.
