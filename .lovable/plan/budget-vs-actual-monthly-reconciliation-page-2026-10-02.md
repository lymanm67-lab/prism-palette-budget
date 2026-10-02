# Budget vs Actual — Monthly Reconciliation Page

## Goal
Create a dedicated **Budget vs Actual** page that compares the selected month’s plan with cleared spending and explains where the month stands. Its six totals will use the same definitions as the Paycheck Deployment tree, so Bills, Debt, Savings, Wealth, Business, and Guilt-Free amounts do not contradict each other.

## What will be built

1. **One shared monthly calculation**
   - Extract the paycheck tree’s pillar rules into a reusable monthly calculation used by both views.
   - Preserve the current rules for cancelled bills, transfers, soft-deleted transactions, personal/business splits, debt classification, payroll wealth, and deferred debts.
   - Keep payroll deductions visible under Wealth but separate pre-tax/employer amounts from take-home spending, preventing them from inflating monthly expenses.
   - Use cleared, non-transfer transactions as Actual; keep uncategorized spending visible instead of guessing its pillar.

2. **New Budget vs Actual page**
   - Add a protected page at `/budgets/actual` with month navigation and Personal / Business / Combined controls.
   - Show top totals for Budgeted, Actual, Remaining/Over, income received, and percentage used.
   - Show a reconciliation note stating whether the six pillar totals match the Paycheck Deployment tree for that month; if no deployment exists, clearly label the comparison as budget-only.

3. **Charts that tell the monthly story**
   - Grouped color bars comparing Budget vs Actual across all six paycheck-tree pillars.
   - Donut chart showing the actual spending mix, with readable dark-mode labels and tooltips.
   - Month-progress indicator that compares spending pace with calendar pace.
   - Plain-language summary highlighting the largest overage, largest remaining amount, and Personal vs Business split without inventing missing data.

4. **Detailed audit table**
   - Expandable pillar rows with category-level Budget, Actual, Variance, and Percent Used.
   - Status labels for On Track, Watch, Over Budget, No Budget, and No Activity.
   - Include uncategorized transactions in a visible review row and link users to Transactions for correction.

5. **Navigation and reuse**
   - Add **Budget vs Actual** under Plan & Budget and a link from the existing Budgets page.
   - Keep the current Budgets & Bills report available; reuse its established monthly/year selectors and transaction pagination patterns rather than duplicating its reporting logic.

## Accuracy rules

- Household-scoped data only.
- Actual spending excludes transfers and soft-deleted transactions.
- Transaction splits take precedence over an unsplit parent transaction.
- Debt and business expenses are never counted again under Bills.
- Employer contributions are informational and never counted as household outflow.
- Missing categories or deployment data remain explicit; no values or events are inferred.
- The page will reconcile to the paycheck tree’s displayed pillar definitions, while showing any excluded income, payroll, or uncategorized amounts in a transparent reconciliation section.

## Technical scope

- Frontend only; no database schema change is expected.
- Add a reusable monthly budget-vs-actual hook/calculation module, the new page, chart/table components, route, and navigation entry.
- Refactor the paycheck tree to consume the shared classification rules where needed, without changing its approved visual behavior.
- Add focused calculation tests covering transfer exclusion, transaction splits, personal/business allocation, debt deduplication, payroll wealth, and total reconciliation.
- Verify the signed-in flow on desktop and mobile, including month changes, filters, chart tooltips, table expansion, dark mode, and exact total reconciliation.
