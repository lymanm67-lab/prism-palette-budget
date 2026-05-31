
# Retirement Allocation Rules — Investment Planning Snapshot

Scope: **Large**. New DB table + 1 new section on `/planning/investments` (Snapshot tab) with ~6 sub-components, plus a projection engine. Recommend keeping it on the Snapshot tab inside a `CollapsibleSection` so it doesn't bloat the page.

## What the user gets

A new "Retirement Allocation Rules" card on Snapshot that:
1. Shows Montgomery's seeded baseline (salary, current EE/ER contributions, raise rule, SS estimate).
2. Lists every future contribution event as an editable row.
3. Routes each event to buckets (HSA / Roth 457(b) / Roth TDA / Pre-tax 457(b) / Pre-tax TDA / Taxable Brokerage) using the allocation logic below.
4. Renders a projection table (monthly, annual, plan-limit flag, included-in-projection flag).
5. Warns on HSA cap, 402(g)/415 plan limits, double-counting, and the Social Security → workplace-plan rule.

## Data model (1 new table + 1 settings row)

**`retirement_allocation_events`** (per household)
- `id`, `household_id`, `user_id`
- `event_date` (date) · `event_label` (text) · `event_type` enum: `step_up | raise_redirect | debt_redirect | ss_invest`
- `monthly_amount` (numeric) — null for `raise_redirect` (computed from salary × raise %)
- `default_allocation` (jsonb) — `{ hsa, roth_457b, roth_tda, pretax_457b, pretax_tda, taxable }` summing to monthly_amount
- `user_allocation` (jsonb, nullable) — overrides
- `is_active` (bool, default true)
- `notes` (text)
- soft-delete (`deleted_at`), timestamps

**`retirement_allocation_settings`** (1 row per household, upsert)
- `hsa_eligible` (bool) · `hsa_coverage` enum `self | family` · `hsa_max_target` (numeric)
- `roth_pct_default` (numeric 0–100) · `employer_contribution_rate` (numeric, default 9)
- `annual_raise_pct` (numeric, default 3) · `inflation_mode` enum `today | future`
- `current_monthly_salary`, `current_ee_contribution`, `current_er_contribution`, `ss_age70_estimate`
- timestamps

RLS by household via `is_household_member`; GRANTs to `authenticated` + `service_role`. Seed Montgomery's 8 events on first load if table empty for the household.

## Allocation engine (pure TS, no backend)

`src/lib/retirement/allocationEngine.ts`
- Input: settings + ordered events + plan-year limits table (2026–2037 projected, with COLA at inflation_mode).
- For each event in date order, compute the default allocation per rules 1–9. Spillover order when HSA caps: → Roth 457(b) → Roth TDA → pre-tax mirrors → taxable.
- Output per event: `{ destinations[], countsTowardLimits, includedInProjection, warnings[] }`.
- Aggregate per year: total to each bucket, plan-limit usage %, HSA usage %.

Plan limits source: hardcoded constants file (2025 actuals, +2% COLA forward) — flagged "estimates" in UI.

## UI surface

`src/components/investment/AllocationRulesSection.tsx` (new, mounted inside Snapshot tab via existing `CollapsibleSection`)

Sub-components:
- `AllocationSettingsPanel.tsx` — controls (HSA eligibility/coverage/target, Roth %, employer rate, raise %, inflation mode toggle)
- `AllocationEventsList.tsx` — editable rows; toggle `is_active`, edit amount, override bucket split via sliders/inputs
- `AllocationProjectionTable.tsx` — columns: Date · Event · Monthly · Annual · Destination(s) · Counts to plan limits? · Included in projection?
- `AllocationWarningsBanner.tsx` — Social Security warning, HSA/plan-limit overage callouts
- `AllocationDisclaimer.tsx` — educational-only disclaimer

Hook: `src/hooks/useRetirementAllocation.ts` — fetches settings + events, runs engine, exposes mutate handlers and realtime refresh.

## Guardrails encoded as engine checks

- HSA: cumulative HSA destinations per plan-year ≤ `hsa_limit[coverage]`; excess auto-spills.
- Plan limits: sum of `roth_457b + pretax_457b` ≤ 457(b) annual limit; same for TDA (403(b) 402(g)).
- Employer contribution: stored separately; never added to employee event totals — surfaced as a read-only line "Employer adds ~$X/mo (not editable here)".
- $888 debt redirect: tagged `debt_redirect`; engine asserts it's not also added as a `step_up` for the same month.
- Spouse OPERS: excluded from allocation engine entirely; rendered as info-only chip "Household income protection — not a liquid asset".
- Social Security event: forced to `taxable` by default; warning banner shown; optional "cash-flow replacement" toggle that re-routes to Roth 457(b) up to remaining 402(g) headroom.

## Projection integration

- `includedInProjection` toggle per event writes into `user_allocation.included` flag.
- Existing `ProjectionCharts` reads a new selector `useActiveAllocationContributions()` that adds the active events to the monthly contribution stream — future-dollar by default, today's-dollar when `inflation_mode = today` (discounts by raise_pct).
- No change to current Snapshot projection math when zero events are active — purely additive.

## Out of scope (call out, don't build)

- Editing the seeded Montgomery baseline numbers (those come from existing Snapshot inputs).
- Backdoor Roth, Mega Backdoor, after-tax 401(a), QCDs — not in spec.
- Spouse pension modeling beyond exclusion.

## File summary

New (8):
- `supabase/migrations/<ts>_retirement_allocation.sql`
- `src/lib/retirement/allocationEngine.ts`
- `src/lib/retirement/planLimits.ts`
- `src/hooks/useRetirementAllocation.ts`
- `src/components/investment/AllocationRulesSection.tsx`
- `src/components/investment/allocation/AllocationSettingsPanel.tsx`
- `src/components/investment/allocation/AllocationEventsList.tsx`
- `src/components/investment/allocation/AllocationProjectionTable.tsx`

Edited (2):
- `src/pages/InvestmentPlanning.tsx` — mount `AllocationRulesSection` in Snapshot tab
- `src/components/investment/ProjectionCharts.tsx` — read allocation contributions into projection stream

## Confirmations before I build

1. Mount on **Snapshot tab** (collapsed by default) — OK, or do you want it as its own tab?
2. **Seed Montgomery's 8 events** on first load for any household with no events — OK, or only for your account?
3. Plan-limit constants: I'll hardcode 2025 IRS values + 2% COLA forward. OK?

Reply "go" (with answers to the 3 above if non-default) and I'll switch to build mode.
