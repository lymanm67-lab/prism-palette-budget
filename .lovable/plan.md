## Scope

Large build (new page + engine + ~10 components + 1 KPI card + route/sidebar). One new route, no schema changes.

## What gets built

**New route `/legacy/crossover` — "The Compounding Crossover™"**, styled in the existing WealthOS family-office palette (Navy `#0B2341`, Gold `#C9A227`, Emerald `#1F7A5A`), boardroom/print-friendly. Reachable from the Wealth OS binder and the sidebar under the Legacy/Wealth group.

### Sections on the page

1. **Investment Assumptions Dashboard** — three KPI cards side-by-side: Conservative 6% (blue), Expected 8% (emerald, badged "Official Planning Assumption"), Historical Equity 10% (gold, with the educational disclaimer). Each shows the estimated annual growth on the current balance. Advisor note under the 8% card.

2. **Live Compounding Dashboard** — editable inputs (current balance, annual contributions, scenario selector 6/8/10%) driving: annual investment growth, crossover portfolio, distance to crossover, years until crossover, projected crossover date, and a "Progress Toward Compounding Crossover™" progress bar with the six-state status indicator (Building Foundation → Financial Flywheel).

3. **Five Compounding Phases** — Foundation ($175,346), Momentum ($250k–$300k), The Compounding Crossover™, Acceleration ($500k), Financial Flywheel ($1M). Each phase shows the 6/8/10% annual-growth comparison table. Crossover phase gets the two-crossing-arrows infographic plus the crossover table:

```text
Scenario            Return   Crossover Portfolio
Conservative          6%     $450,000 – $500,000
Expected (Official)   8%     $340,000 – $375,000
Historical Equity    10%     $270,000 – $300,000
```

Acceleration gets a speedometer gauge ("Compounding Momentum"); Flywheel gets an animated flywheel whose speed scales with portfolio size.

4. **Retirement Growth Comparison** — one Recharts chart overlaying the 6/8/10% curves, with reference markers at Current, Crossover, $500k, $1M, $2M, plus a wealth-gap table showing dollar and % differences at retirement.

5. **Why Compounding Eventually Wins** — three-stage progression infographic (You build the portfolio → You and your investments work together → The portfolio builds itself) with a stacked bar showing contributions vs. growth share flipping over time.

6. **Compounding Milestones timeline** — horizontal timeline: Current $175,346 → $250k → $350k–$400k crossover → $500k → $1M, with the current position marked live.

7. **Family Office Advisor's Note** — premium callout with the supplied copy.

### Mission Control KPI card
A `CompoundingStatusCard` added to the Wealth OS / Mission Control view: current portfolio, annual contributions, annual investment growth, estimated crossover portfolio, years until crossover, and the status badge — reading the same engine so it stays in sync.

## Technical notes

- New pure engine `src/lib/investment/crossoverEngine.ts`: `crossoverPortfolio = annualContributions / returnRate`, growing-contribution solver (contributions rise with raises + debt redirects, so the crossover target moves too), years/date-to-crossover, phase classification, and multi-scenario projection series. Unit-testable, no React.
- Reuses the existing 8%/raise/debt-redirect assumptions already wired into `RetirementProjection.tsx` so numbers reconcile with Page 05 of the binder; scenario switch (6/8/10%) recalculates everything, with 8% as the default everywhere.
- Inputs persist in localStorage (versioned key) like the other WealthOS modules; no DB migration.
- The existing `/crossover-tracker` calculator stays untouched; the new page links to it for deeper what-if modeling.

## Not included
Changing the global planning return used by other dashboards (8% is already the standard) and any database/schema work.
