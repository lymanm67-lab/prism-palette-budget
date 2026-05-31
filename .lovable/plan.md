
# Investment Planning Snapshot Revision — Montgomery Plan

Adds a First Million dashboard, updated age 85/88 projection table, $1M–$6M milestone table, contribution timeline, allocation pie, Montgomery Family Legacy Trust card, and a diagnostic checklist. Adds ~14 session-only "what-if" toggles. No DB migration.

## Approach (locked from prior Q&A)

1. **Toggles = session-only React state.** Persist only target age (85↔88) and default return scenario to the existing `investment_plans` row. Everything else is exploration UI.
2. **All numbers computed live** by the projection engine. Each card shows a small "Expected reference" value (your spec) next to the computed value so you can visually QA drift.
3. **Legacy Protection = static computed card.** No new asset-tagging UI. Pulls primary plan projection + a configurable $500K life insurance constant + SS-invested flag. Spouse/OPERS explicitly excluded with a visible exclusion list.

## Files

### New
- `src/components/investment/FirstMillionCard.tsx` — Goal $1M by Jun 2036, scenario bars (6/7/8/9/10%), interpretation text, expected-reference column.
- `src/components/investment/MillionMilestonesTable.tsx` — $1M–$6M rows × 5 scenarios, computed dates with expected-reference column, "Not by 88" treatment.
- `src/components/investment/ContributionTimelineChart.tsx` — Cumulative monthly step-ups (Jul 2026 $100 → Jan 2030 $2,621) as a stepped Recharts area.
- `src/components/investment/AllocationPieChart.tsx` — Default new-dollar allocation (HSA / Roth 457(b) / Roth TDA / Taxable brokerage), 5% pie threshold rule applied.
- `src/components/investment/LegacyTrustProtectionCard.tsx` — Montgomery Family Legacy Trust card: $500K life insurance + projected retirement assets by scenario at age 85, included/excluded lists, $0 warning, trust alignment checklist.
- `src/components/investment/ProjectionDiagnosticChecklist.tsx` — All 18 checklist items, each green/grey based on whether the corresponding toggle/input is active.
- `src/components/investment/PlanSnapshotToggles.tsx` — Grouped switches panel (Accelerators, Income strategy, Inflation view, Target age, Return scenario).
- `src/hooks/use-plan-snapshot-toggles.ts` — Local state container with sensible defaults matching the Montgomery plan.

### Edited
- `src/lib/investment/projection.ts` — Add optional inputs for: `firstMillionAccelerator` ($208/mo from Jan 2027), `annualLumpSum` ($3,000 starting 2028), explicit dated step-ups list, and per-scenario sweep helper `runScenarioSweep({rates:[6,7,8,9,10], plan, toggles})` returning `{ rate, projAt85, projAt88, firstMillionDate, milestones: Record<1..6, Date|null> }`. Employer contribution recalc already grows with salary — verify and patch if needed.
- `src/lib/investment/montgomery-sample.ts` — Update sample plan to encode new dated step-ups ($225 Jan 2027, $500 Jun 2028, second $500 Jan 2030, $208 accelerator, $3K annual lump) via `investment_money_rules` rows. Trust name → "Montgomery Family Legacy Trust".
- `src/components/investment/SnapshotDashboard.tsx` — Mount the new cards in order: FirstMillion → Updated age 85/88 table (replacing/augmenting existing snapshot cards) → MillionMilestonesTable → ContributionTimelineChart → AllocationPieChart → LegacyTrustProtectionCard → ProjectionDiagnosticChecklist. Top of dashboard renders `PlanSnapshotToggles`. Status logic: <$4M = "Needs additional accelerator or age 88 backup", $4M–$4.999M = "On track", ≥$5M = "Strongly on track".
- `src/pages/InvestmentPlanning.tsx` — No structural change; SnapshotDashboard already mounted on the Snapshot tab. Pass-through of toggle state via context-free prop drilling kept inside SnapshotDashboard.

### Not touched
- No DB migration. No `supabase/types.ts` change. No edge functions. No changes to Milestones tab work (Stress Test, Wealth Milestones Chart) from prior turns.

## Toggle inventory (session-only unless noted)

Accelerators: First Million Accelerator, $208/mo, $3K annual lump, annual raise redirect, employer contribution growth, debt redirect, Social Security investing.
HSA: medical reserve, legacy asset.
Legacy: include life insurance.
Display: future dollars / today's-dollar purchasing power, inflation rate (number input, default 2.5%).
**Persisted to `investment_plans`:** target age (85 ↔ 88), default return scenario.

## Status & legacy logic

- Status pill computed off the **selected scenario's age-85 projection** against $4M.
- Legacy Protection total = (primary plan projected balance at selected target age, selected scenario) + ($500K life insurance if toggle on) + (SS-invested accumulated value if toggle on). Spouse OPERS pension, OPERS account value, spouse deferred comp, household checking, short-term savings always excluded and listed.
- Warning banner renders when computed Legacy Protection = $0.

## Verification

After build, on `/planning/investments` Snapshot tab:
1. First Million card 7% bar reads ≈ $1.054M (±2%).
2. Age 85 / 7% reads ≈ $4.635M.
3. Milestone $4M / 7% reads ≈ Feb 2051.
4. Toggling off "First Million Accelerator" drops Age 85 / 7% by ≈ $150–200K.
5. Legacy Protection > $0 with default toggles; warning shows when life insurance toggle off AND projection toggles all off.

If any computed number is >2% off the reference, I'll patch the engine (likely the dated step-up timing) — not the display.

## Out of scope (separate requests if you want them)
- Real asset-tagging UI for legacy funding.
- Persisting all 14 toggles to DB.
- PDF export updates for the new cards.
- Spouse-side dashboard parity.
