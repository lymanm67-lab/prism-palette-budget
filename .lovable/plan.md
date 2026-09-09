# Wealth Projection rebuild, then reconcile the rest of the app

Two stages. First replace the Wealth Projection engine so it walks month by month from January 1, 2027 and can explain every dollar. Then reconcile the other pages that use the same numbers so nothing conflicts.

## Every dollar has one job

```text
Earn -> Free -> Protect -> Pay -> Redirect -> Invest -> Compound
```

Core retirement and HSA contributions continue while the Buffer is being built. Only flexible cash follows the waterfall.
The goal is not to maximise the projected number. It is to model your actual strategy accurately, transparently, and without double counting.

A dollar has one source and one destination at a time — never funding the Buffer, a debt, savings and investing at once.

## Stage 1 — the projection engine

**Start and starting balance.** January 1, 2027, using the app's current invested balance (about $184,114) shown with its source, last-updated date, confidence status and a manual override. Changing it recalculates every chart, milestone and total. Nothing changes it silently.

**Flow A — Core Wealth Engine, never blocked by the Buffer**
Employee retirement $340/mo, employer retirement $532.05/mo, employee HSA $366.67/mo, employer HSA $1,000 in January and $1,000 in June as two real deposits ($166.67/mo shown for summary display only). Display equivalent $1,405.39/mo.

**Flow B — flexible cash follows the waterfall**
Freed cash -> Buffer -> debt assignments -> savings assignments -> investing. Net Investable Freed Cash = freed cash available less Buffer, debt, savings and other non-investment uses. Only that reaches invested accounts.

**"Earn" means assigned money only** — payroll deferrals, employer money, HSA, approved raise, consulting, business and refund redirects. Never whole paychecks or business revenue.

**Dated events, fired automatically**
- Freed cash today $1,832.05/mo; Jan 2027 $2,551.19/mo; May 2027 onward $2,601.19/mo ($31,214.28/yr)
- BetrLink final payment Dec 10, 2026 -> +$583/mo from January 2027; True Accord Dec 30, 2026 -> +$136.14/mo from January 2027
- Capital One has an explicit effective date of May 1, 2027 -> its $50/mo starts that month, with no extra month added
- Two timing rules, never mixed: an explicit effective date is used as-is; a debt known only by its final payment releases the month after
- First Million Accelerator +$208/mo from January 2027, as its own source
- Scheduled increases +$500 June 2028, +$200 January 2029, +$500 January 2030, permanent after their date
- Raises: 3% each July on $5,911.67/mo gross, only the incremental difference redirected (about +$177.35/mo July 2027), compounding from the new salary, added once per year
- Freed-cash sources carry effective, end, reversal and reactivation dates plus permanent/temporary and verified/pending/estimated, so nothing temporary or reversed runs for 25 years

**Buffer.** $7,000 target ($2,000 savings + $5,000 vault). Funded by $1,000 Oct 2026 consulting, $2,000 Dec 2026 speaking, $300/mo from January 2027, and $2,000 of the 2027 refund. At target the $300/mo stops and moves to the next priority. A final overshoot contributes only the amount needed and releases the remainder the same month.

**Tax Refund Pool per year.** Actual refund less Buffer, investing, debt, savings and other assignments equals unassigned. Assignments cannot exceed the refund, and the $2,000 Buffer allocation cannot also fund the investing redirect ($83.33/mo 2027, $166.76/mo 2028, $300/mo 2029+). A conflict panel shows refund amount, total assigned, over-allocation and the conflicting destinations.

**Student loan / PSLF.** $108,000, $390/mo from January 2027, 55 of 120 payments made. Payments are never investing, no aggressive prepayment. At forgiveness (estimated and conditional) the liability and payment disappear; no forgiven principal becomes assets, income or growth. The released payment splits $219/mo to SBA and $171/mo to the next priority.

**SBA.** $48,000 at 3%, $148/mo, +$100/mo from June 2027, +$219/mo after forgiveness. At payoff the release equals the actual payment active that month — never hard-coded. Principal reduction is not investing.

**Buckets.** Retirement, HSA and taxable stay separate and are reported separately plus combined, so HSA contributions are only counted when the HSA balance is in the total.

**Scenarios and returns are separate selectors.** Strategies: Confirmed Core, Planned Strategy (default and most realistic), Maximum Redirect Capacity (upper capacity, using +$2,551.19/mo Jan–Apr 2027 and +$2,601.19/mo from May 2027 — clearly not expected). Returns 5–10%, default comparison 7/8/9/10%, no return labelled as a plan, with the note that return assumptions are illustrative and not guaranteed. Today's active level is renamed "Today's Active Contributions" and used only as a diagnostic against Planned Strategy. Every source carries Confirmed, Planned, Estimated or Illustrative, and scenario inclusion respects it.

**What the page shows**
- Title and subtitle kept; the flow strip and both notes displayed prominently
- "Going In This Month" (renamed) plus "Future Contribution Events Included"
- Projected Investable Contribution Rate audit: Jan 2027, May 2027, Jul 2027, Jun 2028, Jan 2029, Jan 2030, after PSLF, after SBA payoff — each expandable into its component sources
- Source-of-funds cards for all twelve sources with amount, effective date, status, cumulative total and share of contributions; growth never attributed to a source
- Yearly funding ledger expandable to monthly rows (beginning balance, each source, Buffer/debt/savings allocations, net freed cash invested, released debt invested, growth, ending balance)
- Contribution vs growth breakdown at 10, 15, 20, 25 and 30 years, reconciling starting assets + contributions + growth = ending combined invested assets
- Flow reconciliation and double-counting panels naming the month, expected and actual amounts, the difference and the offending source or destination
- Validation notes: "Missing Future Funding Sources" if Maximum Redirect Capacity at 25 years still lands around $2M–$3M, listing which events fired and which did not; "Possible Duplicate Funding Source" if it is implausibly high

## Stage 2 — app-wide financial consistency

Shared values move to one source of truth: invested starting balance, freed-cash run rate (Freed Cash Engine), employer retirement and HSA (payroll data), debt balances, payments and payoff dates (debt records), Buffer target (reserves), refund assignments (Tax Refund Pool), raise assumptions (a shared assumption object).

Audit and correct stale, conflicting, duplicated or differently-calculated numbers across Dashboard, Freed Cash Engine, Debt Payoff, Emergency Fund & Liquidity, Zero-Based Plan, Live on 50%, Annual Travel Fund, Retirement / Investment Plan, HSA and Health, Source of Funds, cash-flow summaries, charts and dashboard cards — including annualized savings, contribution rates, release dates and milestone dates. Dependent values recalculate when inputs change; no chart or card keeps an old number.

A consistency report lists data, calculation and date conflicts, double counting, stale values, missing sources and reconciliation errors, each with module, field, current value, expected value, source of truth, difference and recommended fix.

## Technical notes

- Rewrite `src/lib/wealth/sourceOfFunds.ts` as a pure event-driven engine: `WealthEvent` (date, type, amount, source, destination, status, recurring rule, end/reversal/reactivation dates, CoreFlow vs FlexibleFlow) and `runFlow(events, assumptions, returnPct, months)` returning monthly rows (beginning balance, source totals, Buffer/debt/savings allocations, invested-by-bucket, growth, ending balance) plus per-source and per-category totals, yearly rollups and scenario audit data. Keep `projectWealth`, `runScenarios` and `money` as thin wrappers so existing components compile.
- Monthly rate `(1 + annualReturn)^(1/12) - 1`; exactly 300 months for 25 years and 360 for 30.
- New `src/lib/wealth/eventTimeline.ts` (`buildEventTimeline(input)`), `src/lib/wealth/taxRefundPool.ts`, `src/lib/wealth/checks.ts` (double counting, reconciliation, event timing, stale values, source conflicts).
- Engine modules stay pure TypeScript with no hooks. An orchestration hook reads `use-freed-cash`, `use-household-debts`, `use-debt-plans`, `use-reserves` and payroll data, normalizes to plain objects, then calls `buildEventTimeline` and `runFlow`.
- Shared helpers so formulas exist once: monthly return conversion, annualized freed cash, debt release timing, Buffer completion, refund validation, raise calculation, contribution rate, bucket totals, reconciliation, combined invested assets, scenario generation. Components display values only.
- New components under `src/components/wealth/`: `FlowStrip.tsx`, `ContributionTimeline.tsx`, `SourceOfFundsCards.tsx`, `YearlyFundingLedger.tsx`, `FlowChecksPanel.tsx`, `ScenarioControls.tsx`. `WealthProjection.tsx` is restructured around them.
- No schema, RLS or migration changes. Overrides persist in the existing localStorage keys with a version bump.
- Vitest coverage for the full list: the three freed-cash releases and their dates, core retirement and HSA continuing below Buffer target, Buffer stopping exactly at $7,000 with excess released, employer HSA only in January and June, 3% raises compounding and added once, refund dollars not double counted, temporary and reversed freed cash stopping, PSLF removing liability without adding assets, the $390 split $219/$171, SBA release using the active payment, monthly source/destination equality, HSA balance included when its contributions count, and the 300/360 month counts.

Stage 2's cross-module fixes are large; I will report what changed page by page and flag anything that needs your confirmation rather than guessing a value.
