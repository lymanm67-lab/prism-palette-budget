# Project Architecture Rules
- Estimated fixed-term debt repayment schedules use the shared debt amortization engine with planned prior payments and monthly interest; budgets store the resulting payments, never mark estimated repayments as actual payments.
- Confirmed future debt overrides live in the tested futureDebtPayments module; use them for the affected months without changing current balances or marking planned payments actual.
- Five-Bucket budget funding is saved as prefixed personal wealth budget rows using one bulk upsert; linked projections replace surplus with those saved totals and disable extra payroll reductions/consulting, so allocations are not counted twice.
- Monthly bucket balancing uses monthlyBalance's cents-based expense-first waterfall and a household/month-guarded replacement upsert; confirmed carryover is a distinct budget income row, never a bank transaction.
- Budget bucket growth uses the pure cents-based growth module, saved monthly funding and explicit repeated-month assumptions; unknown opening balances show added funding rather than invented account balances.

- Net-pay allocation excludes withheld payroll, internal transfer categories, reimbursed groceries and HSA-covered medical costs before purpose overrides, preventing false cash-shortfall warnings.
- Business investment transfers stay in allocated wealth totals but are separated from operating funding labels; matching Owner Draw rows move business surplus into Personal without creating combined income.

- Monthly Budget vs Actual classification lives in `src/lib/budgeting/budgetActual.ts`; reuse it across reports so the seven paycheck-tree areas remain consistent.
- Name-encoded expense shares use namedBudgetActualShares on both budget pages before refund netting; report inclusion uses monthly planned category IDs, including zero-dollar plans, to prevent grouping from admitting unplanned spending.
- Budget expense warning badges and the glance list share the combined expense-only selector in budgetActual; bucket funding is separate spending-independent allocation, so counts cannot drift.
- Akron application fields use one PDF-point coordinate registry for browser entry and pdf-lib exports over the original template, preventing layout drift.
- Akron application answers and signatures stay in component memory; only explicit device-file draft downloads/imports may save and restore them. Never store them in browser storage or transmit them online, because they include SSNs and financial declarations.- Retirement What-If Lab uses the pure engine in src/lib/retirement/whatIf.ts and stateTax.ts with in-memory inputs only, so experiments never change saved plans.
