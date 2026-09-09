# Wealth Projection: correct the flow logic and projection engine

Keep the existing page. Replace the projection math so it walks month by month from January 1, 2027, fires future events on their own dates, and keeps core retirement and HSA money separate from flexible freed cash.

## Every dollar has one job

```text
Earn -> Free -> Protect -> Pay -> Redirect -> Invest -> Compound
```

Core retirement and HSA contributions continue while the Buffer is being built. Only flexible cash follows the waterfall.
The goal is not to maximise the projected number. It is to model your actual strategy accurately, transparently, and without double counting.

## Two parallel flows

**Core Wealth Engine — never blocked by the Buffer**
- Employee retirement $340/mo
- Employer retirement $532.05/mo
- Employee HSA $366.67/mo
- Employer HSA $1,000 in January and $1,000 in June (two real deposits; $166.67/mo shown for display only)
- Display equivalent: $1,405.39/mo

**Flexible / Freed Cash Engine — follows the waterfall**
Freed cash -> Buffer -> debt assignments -> savings assignments -> investing. Only what is left after those becomes Net Investable Freed Cash.

"Earn" counts only income explicitly assigned to the plan (payroll deferrals, employer money, HSA, approved raise/consulting/refund redirects) — never whole paychecks or business revenue.

## Start and starting balance

Projection start January 1, 2027. Starting invested balance from the app's current figure (about $184,114), shown with its data source, last updated date, and a manual override. Changing it recalculates everything. Nothing changes it silently.

## Dated events that fire automatically

- Freed cash run rate today $1,832.05/mo
- BetrLink final payment Dec 10, 2026 -> +$583/mo from January 2027
- True Accord final payment Dec 30, 2026 -> +$136.14/mo from January 2027 (Jan 2027 run rate $2,551.19/mo)
- Capital One ends May 1, 2027 -> +$50/mo (run rate $2,601.19/mo)
- First Million Accelerator +$208/mo from January 2027
- Scheduled increases: +$500/mo June 2028, +$200/mo January 2029, +$500/mo January 2030
- Raises: 3% each July on $5,911.67/mo gross, only the incremental difference redirected (about +$177.35/mo July 2027), compounding from the new salary
- Refund investing redirect: $83.33/mo 2027, $166.76/mo 2028, $300/mo 2029 onward
- Buffer: $7,000 target ($2,000 savings + $5,000 vault), funded by $1,000 Oct 2026 consulting, $2,000 Dec 2026 speaking, $300/mo from January 2027, $2,000 of the 2027 refund. At $7,000 the $300/mo stops and moves to the next priority the same month; a final overshoot contributes only what is needed and releases the rest immediately.
- Student loan: $108,000, $390/mo from January 2027, 55 of 120 payments made, 65 remaining. Payments are never investing. At forgiveness (estimated and conditional) the balance and payment disappear, no principal is added to the portfolio or counted as income; $219/mo goes to SBA, $171/mo to the next priority.
- SBA: $48,000 at 3%, $148/mo, +$100/mo from June 2027 ($248), +$219/mo after forgiveness ($467). At payoff the release equals the actual payment active that month — never hard-coded. Principal reduction is not investing.
- Temporary and reversed freed cash: effective, end, reversal and reactivation dates all respected, so nothing temporary runs for 25 years.

## Scenarios, returns, and confidence

Contribution strategy and return are separate selectors.
- Strategies: Confirmed Core, Planned Strategy (default), Maximum Redirect Capacity
- Returns: 5, 6, 7, 8, 9, 10 percent — presets 7% conservative, 8% base plan, 10% optimistic; no return label implies a contribution level
- "Today's Active Contributions" replaces "base plan" and is a diagnostic comparison only

Every source carries a status: Confirmed, Planned, Estimated, or Illustrative (returns). Scenario inclusion follows those statuses.

## What the page shows

- "Going In This Month" (renamed) plus a future contribution timeline: Jan 2027, May 2027, Jul 2027, Jun 2028, Jan 2029, Jan 2030 and later milestones, with the monthly investing amount after each event, under a "Future contribution events included" note
- Source-of-funds cards for starting assets, employee and employer retirement, employee and employer HSA, accelerator, refund redirects, raise redirects, scheduled increases, freed cash redirects, released debt payments, and growth — each with amount, effective date, status, cumulative total, and share of contributions
- Funding ledger: yearly table (employee, employer, HSA, accelerator, refunds, raises, scheduled increases, freed cash, debt releases, total invested) expandable to monthly rows showing beginning balance, sources, Buffer/debt/savings allocations, net invested, growth, ending balance
- Contribution vs growth breakdown at 10, 15, 20, 25 and 30 years; growth is never attributed to a source
- Flow reconciliation and double-counting panels showing the exact dollar difference and the specific rule broken
- A validation note flagging missing future funding sources if Maximum Redirect Capacity at 25 years looks too low, or a likely duplicate if it looks too high

Title stays "Wealth Projection and Source of Funds" with the subtitle: see where every invested dollar comes from, where flexible cash goes first, and how the plan may compound over time.

## Technical notes

- Rewrite `src/lib/wealth/sourceOfFunds.ts` as an event-driven engine: `WealthEvent` (dated, typed, signed, status, source-attributed), `CoreFlow` vs `FlexibleFlow`, `runFlow(events, assumptions, returnPct, months)` returning per-month rows (beginning balance, per-source amounts, buffer/debt/savings allocations, net invested, growth, ending balance) plus source/category rollups from the same pass. Keep `projectWealth`/`runScenarios`/`money` exported as wrappers so the page and `FundingLedger.tsx` keep compiling.
- Monthly rate `(1 + annualReturn)^(1/12) - 1`; exactly 300 months for 25 years, 360 for 30.
- New `src/lib/wealth/eventTimeline.ts` seeds events from the spec figures and, where available, live data: `use-freed-cash` and `src/lib/freed-cash/reality.ts` (effective/end/reversal dates, verified vs pipeline), `use-household-debts` + `use-debt-plans` (balances, payments, extras), `use-reserves` (buffer target and balance), payroll and HSA figures.
- New `src/lib/wealth/taxRefundPool.ts`: per-year refund pool with assignments to buffer, investing, savings, debt, other; assignments cannot exceed the pool and refund dollars cannot fund the buffer and investing twice.
- New `src/lib/wealth/checks.ts`: reconciliation (sources equal destinations each month) and the full double-counting rule list, each returning the offending month and dollar delta.
- New components under `src/components/wealth/`: `FlowStrip.tsx`, `ContributionTimeline.tsx`, `SourceOfFundsCards.tsx`, `YearlyFundingLedger.tsx` (expandable monthly rows), `FlowChecksPanel.tsx`, `ScenarioControls.tsx` (strategy and return as separate selectors). `WealthProjection.tsx` is restructured around them, not rebuilt.
- Retirement, HSA, and taxable balances stay in separate buckets so no tax or limit math mixes them.
- No schema, RLS, or migration changes. Overrides persist in the existing localStorage keys with a version bump.
- Vitest coverage for every case in the spec's test list: the three freed-cash releases and their dates, core contributions continuing below buffer target, buffer stopping exactly at $7,000 with excess released, employer HSA only in January and June, compounding raises added once, refund dollars not double counted, temporary and reversed savings ending, PSLF removing liability without adding assets, the $390 split $219/$171, SBA release using the active payment, monthly source/destination equality, and the 300/360 month counts.
