# Money Blueprint Enhancements (§28–31)

Four additions to the Budget page's 50/10/20/20 Money Blueprint suite.

## 1. Blueprint History Chart (Actual vs Target)

- New hook computes monthly purpose totals across a selectable 3/6/12-month window using the existing money-purpose rollup + payroll elections (effective-dated).
- Line/area chart: actual LIVE / ENJOY / BUILD WEALTH / DEBT % of net pay vs the 50/10/20/20 target lines, with phase markers for target transitions (50/10/20/20 → 50/10/30/10 → 50/10/40/0).
- Freedom indicators strip under the chart (months at/below LIVE target, debt-free projection date).

## 2. One-Click Export (PNG + one-page PDF)

- Export button on the Money Blueprint panel.
- Reuses the existing infographic engine (`infographic.ts`) to render a shareable PNG of the dashboard cards + segmented bar + freedom indicators.
- One-page PDF (letter, print-friendly) with a footnotes block listing assumptions: net pay $4,250.02, payroll wealth $451.67 already funded pre-net, employer boost $516.56 excluded from cash flow, ENJOY is a ceiling, PSLF $0 → $390 Jan 2027, settlement step-down schedule.

## 3. Reconciliation Drilldown (Every-Dollar Audit)

- Expandable drilldown panel: GROSS PAY → taxes/benefits → payroll investments → NET PAY → LIVE / ENJOY / WEALTH / DEBT buckets → leftover.
- Each line item shows its source (paystub actual, payroll election, transaction rule, manual override) with a link to the underlying record.
- Audit check: sum of all buckets must equal gross exactly once; any dollar counted in two buckets is flagged red with the offending transaction IDs. No-double-count rule: payroll wealth counted toward BUILD WEALTH target but never subtracted from net pay again.

## 4. Drift Alerts + Next-Action Suggestions

- New `blueprint_alert_settings` (or local state if simpler) — configurable drift threshold in % (default 5 pts) per bucket.
- When LIVE exceeds target, ENJOY exceeds its ceiling, or BUILD WEALTH/DEBT fall below target beyond the threshold, show an inline alert card with the delta and the best next action: "Apply to Debt" (while consumer debt remains), "Invest It" (post-debt-free), or "Save It" (sinking funds/reserve).
- Actions deep-link to the existing unused-Enjoy redirect flow.

## Technical Details

- New files: `src/hooks/use-blueprint-history.ts`, `src/components/blueprint/BlueprintHistoryChart.tsx`, `src/components/blueprint/BlueprintExportButton.tsx`, `src/components/blueprint/ReconciliationDrilldown.tsx`, `src/components/blueprint/BlueprintDriftAlerts.tsx`, `src/lib/blueprint/reconciliation.ts`.
- Edit: `src/pages/Budgets.tsx` (wire panels into the blueprint section); possibly `src/lib/blueprint/model.ts` for thresholds.
- No schema changes unless alert thresholds are persisted (one small table or JSON column on blueprint assumptions record — preferred, avoids a new table).
- Reuses existing hooks: `use-money-purpose`, `use-blueprint-assumptions`, payroll elections from Phase 4, `settlementStepDown.ts` for debt timing.
- Export uses the existing `infographic.ts` engine and `export-utils.ts` PDF path.
