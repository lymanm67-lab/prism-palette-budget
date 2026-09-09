# Wealth Projection: correct the money-flow logic

Today the projection only counts sources that are switched on and active right now. Future money — freed cash that starts later, pay raises, tax refunds, and debt payments that end — is either missing or has to be turned on by hand, so the 25- and 30-year numbers understate the plan. This rebuild makes the projection follow money month by month, in the order it actually moves.

## The order money moves

```text
Earn -> Free -> Protect -> Pay -> Redirect -> Invest -> Compound
```

Under the numbers the page will say: the goal is not to maximise the projection, it is to model the actual flow accurately.

Each month the engine will, in this order:
1. Earn — take income for that month (paycheck, business income, employer money, raises once effective).
2. Free — add freed cash that has become effective by that month, at its verified run rate.
3. Protect — top the buffer and emergency floor up to their target first; nothing invests before that.
4. Pay — pay obligations still owed that month (debts, loans).
5. Redirect — when a payment ends, its dollars become available the month after the final payment, and flow to the next destination in the waterfall.
6. Invest — whatever is left flows into retirement, HSA, or taxable, each kept separate.
7. Compound — growth applied to the running balance only, never credited to a source.

## What changes

**Event timeline instead of on/off switches.** Every future change becomes a dated event: a freed-cash saving effective in March, BetrLink's final payment in January 2027, vacation loans ending, student-loan forgiveness, an SBA payoff, a raise in July, a refund in April. Events fire on their own date — no manual toggling needed for the projection to include them.

**Releases are automatic and correctly timed.** A released debt payment starts the month after the last payment, not before, and gets attributed to the debt it came from. This removes the current "turn on once the payment truly stops" guesswork.

**Freed cash is pulled from the Freed Cash Engine.** The projection uses verified, effective-dated savings and confirmed pipeline savings, at their own dates. Unverified savings show as an optional upside layer, not in the base plan.

**Nothing is counted twice.** Each dollar carries one source. Freed cash already redirected to a debt is not also invested. Employer money stays separate from your own saving. Money still owed is never a contribution. A checks panel lists any conflict it finds.

**Scenarios.** Conservative / Base / Optimistic returns over 25 and 30 years, plus a "base plan only" view (today's active money) so you can see how much of the projection depends on future events.

## What you will see on the page

- Ending balance at 25 and 30 years, with the split between money you put in and growth.
- A source-of-funds breakdown: paycheck, employer, spending cut, released debt payments, raises, refunds.
- A month-by-month flow timeline listing each event, the date, the amount freed, and the new monthly investing rate after it.
- A "with future events" versus "today only" comparison.
- The funding ledger stays editable for anything the app cannot infer.
- A checks panel for double counting, money invested before the buffer is funded, and releases dated too early.

## Technical notes

- Rewrite `src/lib/wealth/sourceOfFunds.ts` into an event-driven monthly engine: `WealthEvent` (dated, typed, signed, source-attributed), `runFlow(events, assumptions, returnPct, years)` returning per-month rows with buffer, obligations, redirects, invested-by-bucket and balance, plus per-source and per-category totals derived from the same pass.
- Keep `projectWealth`/`runScenarios` names as thin wrappers so `WealthProjection.tsx` and `FundingLedger.tsx` keep compiling; extend rather than replace their return shapes.
- New `src/lib/wealth/eventTimeline.ts` builds events from existing data: Freed Cash sources/redirects (`use-freed-cash`, `src/lib/freed-cash/reality.ts` effective dates and pipeline), debt items and plan extras (`use-household-debts`, `use-debt-plans`), payroll and employer figures, HSA, and the reserves buffer (`use-reserves`).
- New components: `FlowWaterfallStrip.tsx` (the seven stages), `EventTimelineTable.tsx`, `FlowChecksPanel.tsx`. `WealthProjection.tsx` is restructured, not rebuilt from scratch.
- No schema, RLS, or migration changes. Editable overrides continue to persist in the existing localStorage keys, with a version bump for the new event shape.
- Retirement, HSA, and taxable balances stay in separate buckets throughout so no contribution-limit or tax math mixes them.
- Vitest cases for: release timing (month after final payment), no-double-count of redirected freed cash, buffer funded before investing, and forgiveness removing both balance and payment.
