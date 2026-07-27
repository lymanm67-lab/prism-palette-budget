## Goal

Make the Investment Planning page read as one logical journey and behave like a live model, instead of a long stack of static report cards.

## What's there now (verified)

- `src/pages/InvestmentPlanning.tsx` — 4 visible tabs (Setup · Snapshot · Scenarios · Milestones) plus a "More tools" dropdown hiding 20 sub-tools grouped into 6 categories. Because 20 of 24 destinations are buried in a `Select`, most of the page is effectively invisible.
- `src/components/investment/SnapshotDashboard.tsx` — inside Snapshot, sections currently run: KPI cards → Household roll-up → First Million → Age 75/78 scenario table → Million-Dollar Milestones → Contribution Timeline → Allocation Pie. Then the page appends Projection charts → Contribution sources → Today's vs future dollars → Allocation rules → Diagnostic. So charts appear *after* milestones, and allocation content shows up twice in different places.
- Return rate, horizon age, and dollar mode are all edit-then-save fields in the wizard / DollarModeCard — there is no live control that re-runs the projection in place.

## New order (the narrative)

**1. Where you stand** → **2. What it grows to** → **3. What changes it** → **4. Milestones** → **5. Deep tools**

Tab bar becomes 5 primary tabs, no hidden dropdown as the main path:

| Tab | Contents |
|---|---|
| Setup | Wizard (unchanged) |
| Snapshot | Live control bar · KPI cards (75/80/85) · Projection chart · Household roll-up · Contribution sources · Diagnostic |
| Scenarios | Return sweep table · Mixed returns · Scenario comparison · Raises · Debt→Wealth |
| Milestones | First Million · Million-Dollar Milestones · Wealth Milestones chart · Retirement Milestones · Contribution timeline |
| Planning Tools | The 20 sub-tools shown as a **card grid** grouped by the existing 6 categories, instead of a dropdown |

Inside Snapshot the section order changes so the chart sits immediately under the KPIs (see the numbers, then see the curve), the household roll-up follows, and allocation/dollar-mode/diagnostic move to the bottom as "adjustments" rather than headline content.

## Interactivity added

1. **Sticky control bar** at the top of Snapshot: expected-return slider (5–10%), horizon-age slider (65–90), and a Today's / Future dollars toggle. Every KPI, chart, roll-up and table below re-computes instantly from these local values — no save required. A "Save as plan defaults" button persists them to `investment_plans` when the user wants to keep them.
2. **KPI cards become clickable** — clicking "Projected @ age 80" sets the horizon slider to 80 so the chart and roll-up follow.
3. **Chart crosshair** — hovering the projection chart shows balance / age / contributions-to-date at that year.
4. **Goal progress ring** replacing the flat progress bar, with the surplus/gap animating as sliders move.
5. **Planning Tools grid** — each of the 20 tools becomes a card with its group label and a one-line description, so the depth of the page is discoverable.
6. **Sections remember open/closed state** per user via localStorage, so the page doesn't reset every visit.

## Not changing

- All projection math (`src/lib/investment/projection.ts`, `deferredWithdrawal.ts`) stays as-is — this is presentation and ordering only.
- No schema changes. The only write is the optional "Save as plan defaults" which updates existing `investment_plans` columns (`expected_return_pct`, `retirement_age`, `use_future_dollars`).
- Each sub-tool component's internals stay untouched; only how they're reached changes.

## Technical notes

- New `src/components/investment/SnapshotControlBar.tsx` holds the slider state; `SnapshotDashboard` accepts optional `returnPct` / `horizonAge` / `futureDollars` overrides and falls back to plan values, so nothing breaks if the bar isn't rendered.
- `projectAt()` in `SnapshotDashboard` is already parameterized by rate and age, so live recompute is a memo over the slider values rather than new math.
- New `src/components/investment/PlanningToolsGrid.tsx` renders `TAB_GROUPS` (already defined in the page) as cards and calls the same `setActiveTab`.
- Files touched: `InvestmentPlanning.tsx`, `SnapshotDashboard.tsx`, `HouseholdRollupLine.tsx` (accept horizon prop), `CollapsibleSection.tsx` (persist state), plus 3 new components. Styling uses existing semantic tokens — no new colors.
