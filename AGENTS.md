# Project Architecture Rules

- Monthly Budget vs Actual classification lives in `src/lib/budgeting/budgetActual.ts`; reuse it across reports so the six paycheck-tree areas remain consistent.
- Akron application fields use one PDF-point coordinate registry for browser entry and pdf-lib exports over the original template, preventing layout drift.
- Akron application answers and signatures stay in component memory only; never persist or transmit them, because they include SSNs and financial declarations.