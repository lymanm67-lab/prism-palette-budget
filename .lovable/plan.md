## 1. The Montgomery Money Blueprint™ (Conscious Spending Plan, renamed sections)

Same math and structure as the uploaded workbook, but with our own section names:

| Workbook | Our name |
|---|---|
| Fixed Costs (50–60%) | **Foundation Costs** (50–60% of take-home) |
| Investments (10%) | **Wealth Engine** (10%+) |
| Savings Goals (5–10%) | **Future Fund** (5–10%) |
| Guilt-Free Spending (20–35%) | **Freedom Spending** (20–35%) |
| Miscellaneous (auto 15%) | **Buffer (auto 15%)** |
| Net Worth block | **Household Balance Sheet** |

Formulas kept identical:
- Total Net Worth = Assets + Investments + Savings − Debt
- Buffer = 15% of the sum of the Foundation rows above it
- Foundation / Wealth Engine / Future Fund totals = sum of their rows
- **Freedom Spending = Net monthly income − Foundation − Wealth Engine − Future Fund** (residual)
- Every bucket % = bucket total ÷ net monthly income, scored against its target band

Row set (editable, add-your-own supported): Rent/Mortgage, Utilities, Insurance, Car/Transportation, Debt Payments, Groceries, Clothes, Phone, Subscriptions, Buffer → Wealth Engine: Post-Tax Retirement, Stocks → Future Fund: Vacations, Gifts, Long-Term Emergency Fund.

**Live prefill** from current Prism data (not the sample sheet): assets/investments/savings/debt from the existing net-worth + liability-dedupe logic (so the $107k student loan and $50k SBA aren't double counted), gross/net income from the household salary figures ($208,940/yr household), Foundation rows seeded from 3-month category-group averages. "Re-sync from live data" button, manual overrides always win.

**Where it appears**
1. New page `/legacy/money-blueprint` (sidebar: Legacy → Money Blueprint) — full interactive plan, Save, Reset, print-optimized report matching the Crossover report style.
2. Household Wealth (`/legacy/household`) — Blueprint summary card with the four bucket bars + Freedom Spending number and deep link.
3. Wealth OS binder — same summary component so binder and live plan reconcile.
4. Budgets page — a small banner link (no change to budget logic).

## 2. Fix "Joint Household — $0" on Household Wealth

Confirmed cause: ownership is inferred purely from text matching on each account's name/institution (`/kateri/` → Separate Property, `/joint/` → Joint Household, otherwise defaults to Lyman). Querying the live accounts shows **no account contains the word "joint"** — Kateri's three are labeled "Kateri Montgomery — Separate Property", everything else falls through to Lyman. So the $0 is real, not a display bug: nothing is tagged joint.

Fix:
- Add an explicit `owner_tag` column on accounts (`lyman` | `kateri` | `joint`, nullable) via migration; the text heuristic becomes the fallback when it's null.
- Add an inline owner selector on each row of the Household Wealth asset table (Individual / Separate Property / Joint Household) that persists the tag, so joint assets (e.g. shared real estate, joint cash) roll into the Joint column immediately.
- Show "Untagged — defaults to Lyman" count with a one-click "Review ownership" prompt so the Joint bucket can't silently sit at zero.

## 3. Make Household Wealth visual and interactive

Add color and charts using the existing Recharts setup and semantic tokens (no hardcoded colors, dark-mode safe):
- **Ownership donut** — Lyman / Kateri / Joint split of total assets, with the three stat tiles becoming clickable filters for the table below.
- **Stacked bar by bucket × owner** — retirement, real estate, business, IP, vehicles, personal property, cash/HSA.
- **Net worth trend area chart** from `legacy_worth_snapshots` (already queried) with assets vs. liabilities shading.
- **Liability breakdown horizontal bars** (student loans, SBA, personal loan) with a payoff-progress tint.
- **Blueprint bucket bars** from section 1, color-coded in-band / over / under.
- Animated count-up on the KPI tiles, hover tooltips at 0ms, gradient glass cards consistent with the rest of the app, and a responsive 1-column mobile stack.

## Technical notes

- Migration: `spending_plans` table (household-scoped, jsonb for balance sheet / income / buckets, soft delete) with GRANTs for `authenticated` + `service_role`, RLS enabled, household-membership policies; plus `accounts.owner_tag`.
- Pure calc module `src/lib/budgeting/moneyBlueprint.ts` (buffer 15%, totals, residual Freedom Spending, band scoring) — no UI, unit-testable.
- Hook `src/hooks/use-money-blueprint.ts` (fetch/upsert + `useRealtimeRefresh`).
- Components: `MoneyBlueprintPlan.tsx`, `BlueprintBucketBar.tsx`, `BlueprintSummaryCard.tsx` (reused on Household Wealth + Wealth OS), `BlueprintReport.tsx` (print), plus `HouseholdCharts.tsx` for section 3.
- `use-wealth-os.ts` `ownerFor()` updated to prefer `owner_tag`.
- Currency inputs reuse the comma/decimal `NumberInput` pattern from the Crossover page.

## Out of scope

No changes to budget/category business logic, transaction categorization, or AI calls.
