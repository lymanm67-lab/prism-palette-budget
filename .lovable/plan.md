## Two additions to Investment Planning

### 1. Stress Test button in MixedReturnsScenario

Add a "Run Stress Test" button to the existing MixedReturnsScenario card. When clicked, it shuffles the **currently selected preset's annual return sequence** ~500 times, runs `runProjection` on each shuffle for the active horizon (27 or 30 yr), collects the ending `projectedBalance`, and renders:

- **Three percentile pills:** P10 (unlucky), P50 (median), P90 (lucky) ending balances
- **A "% reaching goal" stat** — share of runs ending ≥ `target_amount`
- **A small distribution bar chart** (10 buckets) so the spread is visible

Result is purely client-side, no DB writes. Runs in a `useMemo` triggered by a `runId` state so user explicitly clicks to compute (avoids re-running 500 projections on every render). Adds a fresh shuffle each click.

**Educational framing:** Helper text — "Same returns, different order. Spread shows sequence-of-returns risk." Plus the standard not-financial-advice disclaimer (already in the card).

**File:** `src/components/investment/MixedReturnsScenario.tsx` only. No engine changes (`runProjection` already accepts `annualReturnsPct: number[]`).

---

### 2. Wealth Milestones chart ($1M–$6M crossing dates)

New component **`WealthMilestonesChart.tsx`** mounted on the Milestones tab next to `MilestoneTracker`.

Runs a single projection at the plan's `expected_return_pct` and walks the **monthly balance series** to find the first month the balance crosses each threshold: **$1M, $2M, $3M, $4M, $5M, $6M** (today's dollars by default, with a Future $ toggle).

Renders:
- **Horizontal bar/timeline** — one row per milestone, bar length = years from today to crossing date, label shows age + calendar year (e.g. "$3M → Age 54, Year 2042")
- Crossed-already milestones get a "Achieved" badge
- Milestones not reached by retirement age show "Not reached at current pace" in muted text
- Small `+/- return sensitivity` line: "At 6% you'd hit $1M at age X; at 10% age Y"

**Requires one engine tweak:** `runProjection` currently returns only end-state values. Need it to optionally return the monthly balance series so we can scan for threshold crossings. Add an opt-in `returnSeries?: boolean` input that, when true, includes `monthlySeries: { age, balance }[]` in the result. No behavior change when omitted. ~10 lines added to `projection.ts`.

**Files:**
- New: `src/components/investment/WealthMilestonesChart.tsx`
- Edit: `src/lib/investment/projection.ts` (add optional series output)
- Edit: `src/pages/InvestmentPlanning.tsx` (mount chart on Milestones tab)

---

### Out of scope
- No new DB tables, no Monte Carlo on real assets, no edits to other scenario components.
- Stress Test reuses the existing Mixed preset cycles — no new preset library.
