# Project Architecture Rules
- Estimated fixed-term debt repayment schedules use the shared debt amortization engine with planned prior payments and monthly interest; budgets store the resulting payments, never mark estimated repayments as actual payments.
- Confirmed future debt overrides live in the tested futureDebtPayments module; use them for the affected months without changing current balances or marking planned payments actual.
- Five-Bucket budget funding is saved as prefixed personal wealth budget rows using one bulk upsert; linked projections replace surplus with those saved totals and disable extra payroll reductions/consulting, so allocations are not counted twice.

- Net-pay allocation excludes withheld payroll, internal transfer categories, reimbursed groceries and HSA-covered medical costs before purpose overrides, preventing false cash-shortfall warnings.
- Business investment transfers stay in allocated wealth totals but are separated from operating funding labels; matching Owner Draw rows move business surplus into Personal without creating combined income.

- Monthly Budget vs Actual classification lives in `src/lib/budgeting/budgetActual.ts`; reuse it across reports so the six paycheck-tree areas remain consistent.
- Akron application fields use one PDF-point coordinate registry for browser entry and pdf-lib exports over the original template, preventing layout drift.
- Akron application answers and signatures stay in component memory; only explicit device-file draft downloads/imports may save and restore them. Never store them in browser storage or transmit them online, because they include SSNs and financial declarations.