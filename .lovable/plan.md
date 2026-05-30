# Investment Planning Module

**Scope: Large.** New top-level feature with ~12 sub-tools, 1 new DB table group, projection engine, PDF export. Estimating 15–20 new files. I'll keep it tightly scoped to this spec — no drive-by polish elsewhere.

## Route & Navigation
- New route: `/planning/investments` (parent `/planning` shell if not present)
- Add nav entry under **Planning** group in sidebar + Command Palette (G+I)
- Page guard: requires active household (uses existing `HouseholdContext`)

## Database (1 migration)
New tables, all household-scoped with standard RLS (`is_household_member`) + GRANTs to `authenticated` + `service_role`:

1. `investment_plans` — one active plan per household; stores all snapshot inputs (ages, balances, contributions, raise %, debt redirect, SS, HSA, return assumptions, today-vs-future-dollars flag)
2. `investment_plan_spouse` — optional 1:1 spouse block
3. `investment_pensions` — N pensions per plan (provider, monthly, COLA, survivor, taxable, use=income|invest|lump)
4. `investment_legacy_goals` — legacy goal + included/excluded asset tags + beneficiary/advisor contacts
5. `investment_money_rules` — automation rules (name, trigger, start_date, amount/pct, destination, frequency, reminder, status)
6. `investment_milestones` — age-based review checklist items (seeded defaults, user-editable)
7. `investment_scenarios` — saved scenario runs (conservative/moderate/growth/custom + computed snapshot JSON)

No edits to existing finance tables. Legacy "asset included/excluded" is stored as account-id tags inside `investment_legacy_goals.included_account_ids[]` — no schema change to `accounts`.

## Projection Engine (pure TS, unit-testable)
`src/lib/investment/projection.ts`:
- Monthly compounding loop from current age → target age
- Inputs: balances, employee + employer contributions, raise schedule, debt-redirect event, additional-contribution event, SS invest stream, HSA stream, spouse stream, return rate
- Outputs: yearly balance series, totals (employee, employer, growth), projected balance, surplus/shortfall, required monthly contribution (binary search), estimated monthly retirement income (4% rule + pension + SS), legacy projection, confidence score (deterministic from gap %)
- Today-vs-future-dollars toggle applies 2.5% inflation discount

## UI Structure
`src/pages/InvestmentPlanning.tsx` — tabbed shell:

1. **Snapshot** — dashboard cards (current balance, projected balance, gap, monthly income, legacy, confidence) + status pill (green/yellow/red) + plain-language summary
2. **Setup Wizard** — 9-step guided flow (`InvestmentWizard.tsx`) saving to `investment_plans`
3. **Raise Redirect Planner** — form + result card + 100/75/50/custom toggles
4. **Debt → Wealth** — pulls user's `debt_plans` payoff date as default
5. **Social Security Strategy** — invest-while-working calc
6. **Pension Income** — list + add/edit; warning about non-liquid pension balances
7. **Spouse / Household** — collapsible; mirrors core inputs
8. **HSA Long-Term** — projection with optional medical drawdown
9. **Legacy Planning** — goal + asset include/exclude picker (lists existing accounts) + beneficiary/advisor contacts + checklist
10. **Scenarios** — 3 preset cards (5/7/9%) + custom; side-by-side comparison table
11. **Money Rules** — CRUD list; statuses scheduled/active/paused
12. **Milestones** — age cards 60/62/65/67/70/75/80/85, checkable, editable

## Charts (Recharts, existing dep)
Reusable `ProjectionChart`, `ContribVsGrowthChart`, `CurrentVsOptimizedChart`, `IncomeSourcesChart`, `LegacyFundingChart` — all responsive, semantic tokens only.

## PDF Export
`exportInvestmentPlanPDF.ts` using existing jsPDF pattern (follow `WeeklyRecap` export if present, otherwise add jsPDF). 12 sections per spec + disclaimers.

## Components (~ file list)
```
src/pages/InvestmentPlanning.tsx
src/components/investment/SnapshotDashboard.tsx
src/components/investment/InvestmentWizard.tsx
src/components/investment/RaiseRedirectPlanner.tsx
src/components/investment/DebtToWealthTool.tsx
src/components/investment/SocialSecurityPlanner.tsx
src/components/investment/PensionPlanner.tsx
src/components/investment/SpouseHouseholdPanel.tsx
src/components/investment/HSAPlanner.tsx
src/components/investment/LegacyPlanner.tsx
src/components/investment/ScenarioComparison.tsx
src/components/investment/MoneyRulesManager.tsx
src/components/investment/MilestoneTracker.tsx
src/components/investment/ProjectionCharts.tsx
src/components/investment/DisclaimerBlock.tsx
src/hooks/useInvestmentPlan.ts
src/lib/investment/projection.ts
src/lib/investment/exportInvestmentPlanPDF.ts
```

## Compliance
Persistent disclaimer footer on the page + inline disclaimer near every projection number, copy verbatim from spec sections 15.

## Demo / Test
Seed button (founder-only) to load the section-17 sample case into the active household for verification — output expected $3.5M–$4M @ 85.

## What I will NOT touch
- Existing budgets, transactions, accounts, debt plans (read-only references only)
- HouseholdContext, auth, RLS helpers
- Any unrelated pages or styling

## Open question (one)
Do you want **spouse + pension + legacy + money-rules** all in v1, or should I ship **v1 = Snapshot + Wizard + Retirement Goal + Raise Redirect + Debt→Wealth + Scenarios + Milestones + PDF**, then a v2 PR for Spouse/Pension/HSA/Legacy/Money Rules? V2 split would roughly halve credits for v1 and let you validate the projection engine before layering household complexity.

Reply "all v1" or "split v1/v2" (or give your own split) and I'll implement.