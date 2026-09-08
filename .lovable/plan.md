# Dashboard Reorganization: Key Indicators + Grouped Sections

Goal: make the dashboard answer "how am I doing?" in the first screen, then tuck the deeper cards into collapsible groups so the page stops being one long scroll.

## 1. New "Key Indicators" strip (top of page, under the Safe-to-Spend hero)

A compact 8-tile grid of clickable indicators. Each tile shows a label, the number, a short status line, and navigates to its page.

- Budget: planned surplus for the month + how many categories are over budget -> /budgets
- Spent vs budget: percent of the month's budget used, with a small progress bar -> /budgets
- Debt: total household debt balance + change this month -> /debt
- Debt payoff: months to debt-free / next payoff date from the active plan -> /debt
- Freed cash: monthly freed-up cash captured and where it is redirected -> /freed-cash
- Goals: number of goals on track vs total, plus overall funded percent -> /goals
- Net worth: current net worth with month-over-month direction -> /reports
- Credit: latest score with direction (or "add a report" prompt if none) -> /credit

The strip respects the existing Combined / Personal / Business toggle where the underlying number is entity-aware (budget, spending, freed cash).

## 2. Grouped, collapsible sections

Reorder the existing cards into four groups. First group open by default, the rest remembered per user in local storage.

- Money Now (open): Safe-to-Spend hero, Key Indicators strip, Cash Left Over, Smart Allocation, Safe-to-Spend equation breakdown, spending anomaly alert, pending cooling-off purchases
- Plan & Budget: 90-day progress tracker, savings impact, 30-day cash forecast, cash flow + spending charts, recent transactions
- Debt & Credit: new debt payoff summary card (top 3 debts with progress bars), credit snapshot, freed cash summary
- Wealth & Legacy: financial health score, combined legacy score, goals widget, AI insights, accounts list, travel fund, consistency + morning cards, app-dev cutoff/pool

Getting Started widget and the empty-state checklist stay above everything when relevant.

## 3. Consistency rules kept

- Safe to Spend remains the only "spending money" number; every other tile is labeled as a plan target, balance, or progress figure.
- No new numbers are invented: every tile reads from the same hooks the destination page uses, so the dashboard and the page always agree.

## Technical notes

- New component `src/components/dashboard/KeyIndicatorsStrip.tsx` reading `useSafeToSpend`, budget totals (same source as `/budgets`), `useHouseholdDebts`, `useDebtPlans`, `useGoals`, freed-cash monthly totals, `useCreditAccounts`, and account balances for net worth.
- New component `src/components/dashboard/DebtPayoffSummaryCard.tsx` (top debts, payoff order, months remaining) and `src/components/dashboard/DashboardSection.tsx` (collapsible group wrapper, persists open state under a `prism_dash_sections` key).
- `src/pages/Dashboard.tsx` is restructured to render the four sections; existing card components are moved, not rewritten. No changes to calculation hooks, schema, or RLS.
- Skeleton placeholders for each tile while its query loads; mobile falls back to a 2-column grid.
