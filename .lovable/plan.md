# Zero-Based Financial OS — gap build on top of what already exists

Approach: build only what is genuinely missing. Confirmed already in the app and reused, not rebuilt: the Money Blueprint engine and panel, reconciliation drilldown and audit, drift alerts, payroll elections (employee vs employer, wealth credit rules), the settlement step-down / fee-reserve engine, the Annual Travel Fund, the PSLF card, the debt payoff page, the shared infographic export engine, and blueprint PNG/PDF export.

## Session 1 — Framework switch and true zero-based engine

1. **45/10/25/20 replaces 50/10/20/20 everywhere.** Phase 1 targets become LIVE 45, ENJOY 10, BUILD WEALTH 25, ELIMINATE DEBT 20. Phase 2 and 3 rebalance off the same 45/10 living base. Every label, tooltip, export header and doc comment that says "50/10/20/20" is updated.
2. **Unassigned Cash becomes first-class.** Today the engine computes a leftover called "unallocated" from four buckets only. It gets extended to the full zero-based equation: take-home − LIVE − ENJOY − Build Wealth from take-home − Eliminate Debt − Business − sinking funds − Buffer assignment = **UNASSIGNED CASH**, with a prominent banner, an "assign this money" action offering Build Wealth / debt snowball / Vacation Fund / HSA / Buffer, and an over-allocated state that names which buckets caused it.
3. **Two-layer view.** Layer A total cash flow (includes business, sinking funds, Buffer) and Layer B the personal 45/10/25/20 scorecard, as two tabs on the budget dashboard so business money still never enters personal ratios.
4. **Data-quality rules.** Any category subtotal that exceeds the sum of its known line items renders "Unidentified Category Amount: $X" instead of being padded. Unknown values render "Amount Needed". No invented line items.

## Session 2 — Buffer and business expense ledger

- **Buffer panel**: starting → additions → withdrawals → one-time expenses → ending, with only the ending balance counted in the month's allocation, plus editable Healthy / Caution / Tight thresholds. The three Betrlink settlement fees ($371.48, $555.15, $355.28) draw from Buffer as one-time expenses, shown separately from monthly debt payments.
- **Business expense ledger**: a distinct category with vendor, brand, purpose, tax class, renewal date, payment method and entity. Seeded with Resend $20 (business expense) and ChatGPT $20 (mapped to AI Services). The $720.68 Business Advance is recorded as **owner investment**, not a business operating expense, so it does not distort the business expense subtotal.

## Session 3 — Itemized recurring expenses

Every LIVE and ENJOY item becomes an individual dated line: rent $1,100, electric $51, gas $112, water $95, Verizon $70, GEICO $159, term life $249.96, renters $22, fuel $35, and Allstate Roadside $10.92 starting October 2026. ENJOY stays itemized at its real level — if it lands at 2.1%, it reports 2.1%, and the unused portion of the 10% shows up as redirectable cash rather than being spent.

## Session 4 — Individual debts, snowball and PSLF

- Replace the generic "Debt Payoff Allocation" with one card per debt, each with balance, APR, due date, minimum, extra payment and a dynamically calculated payoff date (no hard-coded dates), plus original vs current payoff, months accelerated and interest avoided.
- Betrlink schedule honoured exactly: $49 separate payment ends after Sep 2026, $583 continues unreduced Oct 2026 → Feb 2027.
- Vacation snowball: Loan 2306 at $155.43 + $298 extra = $453.43, rolling into Loan 3004 at $228.47 + $453.43 = $681.90, with the funding source of every extra dollar shown on the card.
- Per your answer, balances and PSLF are reset to the figures in your prompt: Loan 2306 $1,453.75, Loan 3004 $3,363.40, student loan ~$105,000, PSLF 55 of 120 payments complete, 65 remaining, ~2032 forgiveness, labelled "PSLF Strategy: Pay Required Amount, Preserve Forgiveness" with no extra-principal suggestions.

## Session 5 — Redirect engine and vacation fund handoff

- A **Money Redirects** page: when an obligation ends, the freed cash is shown as a flow, never as new spending money (e.g. $49 freed → $20 Resend → $10.92 Allstate → $18.08 remaining). Redirects are schedulable and fully editable, including the $888 pool split across the $390 PSLF payment, $298 vacation snowball and $200 Build Wealth.
- Two automatic triggers: vacation debt hits $0 → offer to redirect that payment into the existing Travel Fund at $500/month; the July 2027 $100 raise → default into HSA rather than lifestyle.
- Build Wealth take-home allocation tracks $277/month now and $485/month from January 2027 ($277 + $208 First Million Accelerator), while the $451.67 employee payroll wealth, $516 employer retirement and $500 January + $500 July employer HSA stay informational and are never deducted from the $4,250.02 take-home a second time.

## Session 6 — Forecast, scenarios, infographics, dashboard

- Month-by-month forecast from September 2026 across 12 / 24 / 60 months with every bucket, unassigned cash, the 45/10/25/20 comparison, and change flags for each month (payment ended, subscription added, employer HSA received, raise redirected, fee paid, loan cleared, Vacation Fund activated).
- "What If?" simulator recalculating Buffer, percentages, payoff dates, Vacation Fund timeline and wealth totals live.
- Infographic report types added to the existing export engine: monthly snapshot, debt payoff roadmap, wealth building, 45/10/25/20 scorecard, vacation fund and year-end, in PNG / PDF / print with landscape, portrait, letter, social and presentation formats, using your existing dark-navy palette.
- Dashboard "YOUR UPDATED PLAN — SMART CHANGES. STRONGER FUTURE." with six cards (Live, Enjoy, Build Wealth, Eliminate Debt, Business, Buffer), top indicators, and language that frames intentional debt overage as strategy rather than failure.

## Technical notes

New tables: `buffer_ledger`, `business_expenses`, `money_redirects`, `sinking_funds` (household-scoped RLS + grants, soft delete). `recurring_expenses` line items reuse the existing categories/budgets structure with start/end dates rather than a parallel table. Engine changes land in `moneyPurpose.ts`, `blueprint5010.ts`, `phaseProjection.ts` and `settlementStepDown.ts`; payoff math gets a shared amortisation helper so no payoff date is stored as a constant. Debt/PSLF value corrections run as data updates against `debt_items`.

Session 1 is the one that changes numbers across the whole app, so it ships and gets verified on its own before the rest.
