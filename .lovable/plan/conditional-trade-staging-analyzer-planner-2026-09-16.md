# Conditional Trade Staging — Analyzer + Planner

One workflow, two jobs. The Analyzer answers "should I prepare this trade?" The Trade Planner answers "how exactly will I stage and execute it?" Nothing is duplicated between them.

## What you will see

### On the Stock Analyzer

A compact **Entry readiness** card near the top of the reading:

- Status: Go / Waiting for confirmation / Review / Stop
- Setup (pullback or breakout), plus Daily / 4H / 1H status pulled from the timeframe work already on the page
- Entry trigger, current price, stop, 2R target, target path (clear / partly blocked / blocked)
- Event risk and trade readiness score
- Heikin Ashi confirmation reads "not available yet" until the queued Heikin Ashi work is built — it will never show a guessed value

**What are we waiting for?** Whenever the status is not Go, the card lists the actual conditions in plain words instead of a bare "wait" — for example "price must close above $59.10", "the 1-hour 20 average must stay above the 50", "the 1-hour momentum reading must stay above 50", "price must not run away from the entry zone", "event risk must stay acceptable". Only conditions the page can actually measure are listed.

Buttons change with the status:
- Go: Plan trade
- Wait: Set alert · Prepare conditional trade · Add to watchlist
- Review: Review conflicts
- Stop: Skip trade

**Prepare conditional trade** opens the Trade Planner already filled in — symbol, setup, entry trigger, suggested stop, resistance, suggested target, target path, the three timeframe statuses, event risk, bias and readiness. Nothing gets retyped.

Once a trade is armed, the Analyzer shows a small **Armed trade** strip for that symbol: the entry condition, status, when it was last rechecked, and a link to the trade plan. If conditions materially worsen while it is armed (signal deteriorates, target path becomes blocked, event risk rises, regime or sector turns, price becomes extended, stop structure breaks, bias deteriorates) the strip reads **Armed trade needs review**. The Analyzer never creates a second conditional order.

### On the Trade Planner

Prefilled values arrive from the Analyzer with a short "from your analysis, taken at [time]" line, and the saved snapshot preserves what SwingEdge knew at that moment.

A new final stage, **Execution plan**, with three choices:

- **Execute now** — only emphasised when everything passes: status Go, entry confirmed, stop and target valid, reward-to-risk passes, target path acceptable, account risk and portfolio heat pass, event risk acceptable, signal still fresh.
- **Set alert** — the default for a waiting setup, and the recommended beginner path. Shows exactly what it is waiting for and a "Create Thinkorswim alert guide" button.
- **Arm for later** — plan is valid but entry has not confirmed. Marked **Armed — not yet active**; you must choose this deliberately.

Choosing Set alert or Arm for later opens the **conditional entry builder** (Planner only):

- Simple: price confirmation, trend confirmation, momentum confirmation
- Advanced: extra study conditions, custom timeframe, time-based activation, expiration, cancellation conditions, custom logic
- Condition logic line: all conditions required (advanced may relax)

Then a **Thinkorswim order preview** in plain order language: the parent buy, the submit-when conditions, then 1st Triggers OCO with the target limit and protective stop, all using your own numbers. Plus **Show me how to enter this in Thinkorswim**, which opens the existing execution-guide sheet extended with a conditional-order walkthrough: parent buy, order rules gear, submit conditions, aggregation period, study conditions, 1st Triggers OCO, target, stop, confirm and send — an educational SwingEdge representation, not a copy of their screens.

Plan states shown on the plan: Draft, Plan complete, Ready to execute, Ready to arm, Waiting for condition, Condition met, Revalidation required, Expired, Canceled, Filled, OCO active.

A plain note stays with any armed plan: these statuses describe your SwingEdge plan. Thinkorswim remains the real record of what your broker actually has working.

## Technical outline

**Database (additive migration on `se_trade_plans`)** — new nullable columns: `execution_mode` (`EXECUTE_NOW|SET_ALERT|ARM_FOR_LATER`), `plan_state`, `condition_mode` (`SIMPLE|ADVANCED`), `entry_conditions` jsonb, `cancel_conditions` jsonb, `analysis_snapshot` jsonb, `armed_at`, `last_revalidated_at`, `expires_at`. Existing rows and existing save paths keep working unchanged; no constraint changes, no RLS or grant changes needed (household RLS already applies).

**New engine files (pure, unit-tested, no invented data)**
- `src/lib/swingedge/conditionalStaging.ts` — `EntryReadiness` build from existing inputs (mtf, geometry, event risk, readiness, bias, signal); `waitingReasons()` returning only measurable conditions; `executionModeFor(status, beginner)`; `PLAN_STATES` + `nextPlanState()`; `armedNeedsReview()` comparing a stored snapshot against a fresh read; `EntryCondition` model (`PRICE|TREND|MOMENTUM|STUDY|TIME`) and `conditionsFromReadiness()` defaults.
- `src/lib/swingedge/analysisSnapshot.ts` — `SNAPSHOT_VERSION`, `buildAnalysisSnapshot()`, `snapshotToPlannerParams()` / `plannerParamsFromSnapshot()`; unavailable fields serialise as `null` and render as "not available".
- `src/lib/swingedge/conditionalOrder.ts` — `conditionalOrderPreview(trade, conditions)` returning parent / submit-when / OCO lines, reusing `orderStructureLines` shapes from `thinkorswimGuide.ts`.
- Tests: `conditionalStaging.test.ts`, `conditionalOrder.test.ts` covering the QQQ example in the spec (entry 704.54, stop 658.89, risk 45.65, 2R 795.84, 1 share) and the beginner default-to-alert rule.

**Components**
- `EntryReadinessCard.tsx` (Analyzer) — compact grid + "What are we waiting for" list + status-driven buttons.
- `ArmedTradeStrip.tsx` (Analyzer) — armed plan for the current symbol, review flag, link to plan.
- `ConditionalEntryBuilder.tsx` (Planner) — simple/advanced conditions.
- `ConditionalOrderPreview.tsx` (Planner) — order preview block.
- `ExecutionPlanStage.tsx` (Planner) — stage 6 wrapping mode choice, builder, preview, mirror-guide button.

**Wiring**
- `StockAnalyzer.tsx`: build readiness from existing memos, render the card, "Prepare conditional trade" navigates to `/swingedge/planner?prep=<id>` after stashing the snapshot (sessionStorage key plus the values in the query string so a refresh still works).
- `TradePlanner.tsx`: read the prep payload on mount and prefill stage 1–4 state; add stage 5.5/6 "Execution plan"; save execution fields with the plan through `useTradePlans`.
- `use-swingedge-stops.ts`: extend the plan row mapper and save payload with the new columns; add `useArmedPlans(symbol)` for the Analyzer strip.
- `ExecutionGuideSheet` / `thinkorswimGuide.ts`: add a `CONDITIONAL_ENTRY` guide kind with the nine-step conditional workflow; existing guide kinds untouched.

**Honest limits**
- No brokerage integration, so armed/filled/OCO states are SwingEdge's record of your plan only; the app never claims to know your live order status.
- Heikin Ashi confirmation is displayed as "not available yet" until that queued module is built.
- Revalidation runs when the Analyzer page loads or refreshes for that symbol; there is no background job watching armed trades.
