# Sessions 2–6 — Zero-Based OS build plan

Five build sessions, each shippable on its own. Later sessions read the data the earlier ones create, so the order matters.

## What I confirmed first

- `debt_items` currently holds: Nelnet student loan $107,000 (min $390, forgiveness 2033-07-01), SBA $48,000 (100% business), Vacation Loan 1 $3,488.03 (min $228.47, 35.99%), Vacation Loan 2 $1,561.27 (min $155.43, 35.99%), Consumer Debt $2,606.04 (min $888).
- The table has no `extra_payment`, no payoff-projection fields, and no PSLF payment counters, so per-debt extra payments and dynamic payoff dates need new columns.
- The settlement engine already encodes the $888 baseline, the Sep/Oct/Jan step-downs, the three BetrLink fees ($371.48 / $555.15 / $355.28) and the $390 Jan-2027 obligation.
- The infographic engine already exists as a spec-driven print renderer; Session 6 adds report types to it rather than rebuilding it.
- No Buffer ledger, business expense ledger, redirect engine, or forecast table exists yet.

Numbers to reset per your prompt: Loan 2306 → $1,453.75, Loan 3004 → $3,363.40, student loan → $105,000, PSLF 55 of 120 complete (65 remaining, ~2032 forgiveness).

## Session 2 — Buffer + business expense ledger

- Buffer panel showing starting → additions → withdrawals → one-time expenses → ending, with only the ending balance counted in the month's allocation.
- Editable Healthy / Caution / Tight thresholds.
- The three BetrLink settlement fees post as one-time Buffer withdrawals, listed separately from monthly debt payments.
- Business expense ledger: vendor, brand, purpose, tax class, renewal date, payment method, entity. Seeded with Resend $20 and ChatGPT $20. The $720.68 Business Advance is recorded as owner investment and excluded from the business expense subtotal.

## Session 3 — Itemized recurring LIVE / ENJOY

- Individual dated lines instead of a lump LIVE figure: rent 1,100 · electric 51 · gas 112 · water 95 · Verizon 70 · GEICO 159 · term life 249.96 · renters 22 · fuel 35, plus Allstate Roadside 10.92 starting Oct 2026.
- ENJOY reports its real level (e.g. 2.1% against the 10% target) and the unused portion surfaces as redirectable cash rather than spending money.

## Session 4 — Individual debts, snowball, PSLF

- One card per debt replacing the generic Debt Payoff Allocation: balance, APR, due date, minimum, extra payment, and a payoff date computed from those inputs (nothing hard-coded).
- Each card also shows original vs current payoff, months accelerated, and interest avoided.
- BetrLink honoured exactly: the $49 separate payment ends after Sep 2026; the $583 continues unreduced Oct 2026 → Feb 2027.
- Vacation snowball: 2306 at $155.43 + $298 extra = $453.43, rolling into 3004 at $228.47 + $453.43 = $681.90, with the funding source of every extra dollar named on the card.
- Student loan card is labelled "PSLF Strategy: Pay Required Amount, Preserve Forgiveness" with 55/120 complete, 65 remaining, ~2032 forgiveness, and no extra-principal suggestions anywhere on it.

## Session 5 — Redirect engine and vacation handoff

- A Money Redirects page where a freed obligation is shown as a flow, never as new spending: $49 freed → $20 Resend → $10.92 Allstate → $18.08 remaining.
- Redirects are schedulable and editable, including the $888 pool split into $390 PSLF, $298 vacation snowball and $200 Build Wealth.
- Two automatic triggers: vacation debt reaching $0 offers to redirect that payment into the existing Travel Fund at $500/month; the July 2027 $100 raise defaults into HSA instead of lifestyle.
- Build Wealth take-home allocation tracks $277/month now and $485/month from Jan 2027 ($277 + $208 First Million Accelerator). The $451.67 employee payroll wealth, $516 employer retirement and $500 January + $500 July employer HSA stay informational and are never deducted from the $4,250.02 take-home a second time.

## Session 6 — Forecast, scenarios, infographics, dashboard

- Month-by-month forecast from Sep 2026 over 12 / 24 / 60 months with every bucket, unassigned cash, the 45/10/25/20 comparison, and change flags per month (payment ended, subscription added, employer HSA received, raise redirected, fee paid, loan cleared, Vacation Fund activated).
- "What If?" simulator recalculating Buffer, percentages, payoff dates, Vacation Fund timeline and wealth totals live.
- Six new infographic report types on the existing export engine — monthly snapshot, debt payoff roadmap, wealth building, 45/10/25/20 scorecard, vacation fund, year-end — in PNG / PDF / print with landscape, portrait, letter, social and presentation formats, in the current dark-navy palette.
- Dashboard header "YOUR UPDATED PLAN — SMART CHANGES. STRONGER FUTURE." with six cards (Live, Enjoy, Build Wealth, Eliminate Debt, Business, Buffer), top indicators, and copy that frames intentional debt overage as strategy rather than failure.

## Technical notes

- New tables: `buffer_ledger` (monthly starting/additions/withdrawals/one-time/ending + thresholds), `business_expenses` (vendor, brand, purpose, tax class, renewal, payment method, entity, is_owner_investment), `recurring_purpose_lines` (LIVE/ENJOY items with start/end months), `money_redirects` (source obligation, target, amount, start month, status, trigger type). Each gets household-scoped RLS plus GRANTs in the same migration.
- New `debt_items` columns: `extra_payment`, `apr_source`, `pslf_payments_made`, `pslf_payments_required`, `original_payoff_date`, `settlement_separate_payment`.
- New engines: `src/lib/budgeting/debtAmortization.ts` (payoff date, months accelerated, interest avoided, snowball rollover), `src/lib/budgeting/redirectEngine.ts`, `src/lib/budgeting/forecastEngine.ts` — all pure functions so the What-If simulator reuses them.
- `blueprint5010.ts` gains Buffer-ending and itemized-line inputs; `settlementStepDown.ts` is corrected so $583 runs through Feb 2027 and the $49 ends after Sep 2026.
- Balance/PSLF resets applied as a data update, not hard-coded in the UI.
- Infographic report types are new `InfographicSpec` builders under `src/lib/reports/`, with format presets added to the existing renderer.
