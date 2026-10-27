# Project Architecture Rules

- Net-pay allocation excludes withheld payroll, internal transfer categories, reimbursed groceries and HSA-covered medical costs before purpose overrides, preventing false cash-shortfall warnings.

- Monthly Budget vs Actual classification lives in `src/lib/budgeting/budgetActual.ts`; reuse it across reports so the six paycheck-tree areas remain consistent.
- Akron application fields use one PDF-point coordinate registry for browser entry and pdf-lib exports over the original template, preventing layout drift.
- Akron application answers and signatures stay in component memory; only explicit device-file draft downloads/imports may save and restore them. Never store them in browser storage or transmit them online, because they include SSNs and financial declarations.