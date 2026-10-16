# Side Menu Consolidation

Goal: cut the side menu from about 75 links to about 40. No page is deleted and every old link keeps working.

## Phase 1: Regroup the menu (one file, low risk)
The changes below affect the side menu only. Every page stays where it is.

**Save & Optimize (11 to 6)**
- Savings Plans group: Live on 50%, Five-Bucket, Zero-Based (nested under one collapsible entry)
- Emergency Fund & Reserves group: Emergency Fund & Liquidity, Annual Travel Fund
- Bills & Subscriptions group: Subscriptions & Recurring, Bill Negotiation
- Debt Payoff
- Freed Cash Engine
- Month-End Close moves to Plan & Budget; Wealth Projection moves to Grow Wealth

**Plan & Budget**
- Budgets group: Budgets, Budget vs Actual, Budget Planner, Month-End Close
- Cash Flow & Forecast group: Cash Flow, Forecast
- Money Blueprint stays
- Calculators moves to the Tools drawer

**Track Money**
- Data Health group: Reconciliation, Data Cleanup

**Grow Wealth**
- Investments group: Holdings, Strategy (5 Roles), Investment Planning
- Retirement group: Retirement Tax Center, Stress Test, Wealth Projection
- Long-Term Care moves to Legacy

**Trading (SwingEdge): 20 links in 5 groups**
- Dashboard, Risk Lab and Settings stay at the top level
- Learn: Academy, Six-Week Training, Execution Guides
- Research: Scanner, Analyzer, Company & Fund Figures, Watchlists, Live Data
- Plan & Rules: Trade Planner, Rulebook, Recommendations
- Practice: Practice Lab, Paper Trading, Thinkorswim Orders
- Review: Journal, Performance, Historical Testing

**Health**
- A single Health Dashboard link replaces the five tab links. The tabs remain on the page itself.

**Legacy**
- 8a and 8b are nested under Real Estate & Community Impact
- Belt Progress is nested under KUNG FOO Plan
- Wealth OS Binder is nested under Legacy Mode

**Insights**
- Reports group: Reports, Monthly Spending, Budgets & Bills, Capital Events

## Behavior
- A group opens automatically when you are on one of its pages
- The collapsed icon-only sidebar shows the group's icon, and clicking it opens the first page in that group
- The Cmd+K search still lists every page by name, so nothing becomes harder to find

## Phase 2 (optional, later, separate approval)
This phase would turn the groups into single pages with tabs, starting with Savings Plans, Cash Flow & Forecast and Reports. It touches many files, so it waits until Phase 1 has been used for a while.

## Technical details
- Edit only `src/components/layout/AppSidebar.tsx`. Use the existing nested `children` pattern that Capital already uses, and move entries between sections.
- Add Calculators to `TOOLS` in `ToolsDrawer.tsx`.
- No route, page or data changes, and essential-mode flags are kept.
