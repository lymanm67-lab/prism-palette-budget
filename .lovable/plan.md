## Goal

Add a realistic "mixed market returns" scenario to the Investment Planning page that cycles annual returns through 6%, 7%, 8%, 9%, and 10% over **27** and **30** year horizons, instead of assuming one flat rate forever.

## Where it lands

New section on the **Snapshot tab** of `/planning/investments`, mounted right under the existing `ReturnScenarioComparison` ("Am I On Track…") card. Same visual language: gradient card, badge status, two horizon toggles, Today's $ / Nominal $ toggle.

## What the user sees

A card titled **"Mixed Market Returns Scenario"** with:

1. **Horizon tabs**: `27 years` | `30 years` (drives projection length from current age).
2. **Dollar mode tabs**: `Today's $` | `Nominal $` (matches the existing card's pattern).
3. **A bar chart** comparing 4 outcomes at the chosen horizon:
   - Goal line (target_amount, default $4M)
   - Flat 7% baseline
   - Flat 8% baseline
   - **Mixed Returns** projection (the new one)
4. **A small "Sequence" strip** showing the rotating annual returns for the chosen horizon, e.g. `6% · 7% · 8% · 9% · 10% · 6% · 7% …` so the user understands what "mixed" means.
5. **Two outcome tiles** for the Mixed scenario:
   - Mixed Returns (27 or 30 yr): projected balance + Surplus/Gap vs goal.
   - **Geometric average return** of the sequence (so they see it lands near ~7.97% CAGR for 6–10% rotating, which is the honest "realistic" headline number).
6. Explanatory copy:
   > Real markets don't return a flat rate. This scenario rotates annual returns through 6%, 7%, 8%, 9%, and 10% to show how sequence-of-returns risk smooths out (or doesn't) over long horizons. Educational only — not a forecast.
7. Reuses the existing disclaimer style already present on the page.

## Sequence definition

Deterministic 5-year cycle: **6, 7, 8, 9, 10** repeating. Year 1 of the projection = 6%, year 2 = 7%, … year 6 = 6%, etc.

- Over 27 years → ends mid-cycle at year-27 = 10%.
- Over 30 years → ends on year-30 = 10%.
- Geometric mean of one full 5-year cycle: ≈ **7.985%** CAGR — a credible "realistic" baseline that's a hair under the flat 8% benchmark but above the flat 7% benchmark.

No randomization. Deterministic = reproducible = no "why did the number change?" support tickets.

## Technical changes (small, surgical)

1. **`src/lib/investment/projection.ts`** — extend `ProjectionInputs` with an optional field:
   ```ts
   annualReturnsPct?: number[]; // overrides expectedReturnPct year-by-year
   ```
   In the monthly loop, when `annualReturnsPct` is provided, compute `monthlyRate` from `annualReturnsPct[yearIndex % annualReturnsPct.length] / 100 / 12` instead of the single rate. HSA rate continues to use `hsaReturnPct` (unchanged). No other behavior changes.

2. **New component `src/components/investment/MixedReturnsScenario.tsx`** — mirrors `ReturnScenarioComparison`'s structure. Uses `runProjection` three times per horizon (7% flat, 8% flat, mixed sequence) and renders the bar chart + tiles + sequence strip.

3. **`src/pages/InvestmentPlanning.tsx`** — import and mount `<MixedReturnsScenario plan={plan ?? null} />` immediately after `<ReturnScenarioComparison ... />` on the Snapshot tab. One added line + import.

## Out of scope (intentionally)

- No Monte Carlo, no random sequence-of-returns simulator (that's a separate feature already noted as v4 in memory).
- No DB schema changes — the cycle is hardcoded constants, not user-configurable.
- No edits to `ScenarioComparison`, allocation engine, or any other planning component.
- No changes to PDF export or coach mode.

## Files touched

- Edit: `src/lib/investment/projection.ts` (~5 lines)
- Create: `src/components/investment/MixedReturnsScenario.tsx`
- Edit: `src/pages/InvestmentPlanning.tsx` (2 lines: import + render)

Scope: **Medium** (3 files, no logic risk beyond the projection extension, no schema).
