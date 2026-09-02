# Roadmap — Zero-Based Financial OS

## Session 1 — Framework + zero-based engine (done)
- [x] 45/10/25/20 targets and phase ladder (45/10/35/10 → 45/10/45/0)
- [x] Layer A zero-based math (business outflow, sinking funds, buffer, one-time), unassigned = 0 target
- [x] Total Cash Flow tab + 45/10/25/20 Scorecard tab, unassigned banner, unidentified-amount checker
- [x] Real vs planned line on every card; Build Wealth split employee vs employer
- [x] Payroll elections card embedded in the monthly report (single source of truth)

## Statement imports (done 2026-09-01)
- [x] Aug 2026 statements imported with count-based dedupe: MyUSA MAIN SHARE, SoFi Checking, EverBank Checking, IU CU BUSINESSFREE

## Session 2 — Buffer + business expense ledger (DONE)
- [ ] Buffer panel: starting → additions → withdrawals → one-time expenses → ending; only ending balance counts in the month's allocation
- [ ] Editable Healthy / Caution / Tight thresholds
- [ ] BetrLink settlement fees $371.48 / $555.15 / $355.28 draw from Buffer as one-time expenses, shown apart from monthly debt payments
- [ ] Business expense ledger: vendor, brand, purpose, tax class, renewal date, payment method, entity
- [ ] Seed Resend $20 (business expense) + ChatGPT $20 (AI Services); $720.68 Business Advance = owner investment, excluded from business expense subtotal

## Session 3 — Itemized recurring LIVE / ENJOY (DONE — Zero-Based Plan → Live & Enjoy Lines)
- [ ] Individual dated lines: rent 1,100 · electric 51 · gas 112 · water 95 · Verizon 70 · GEICO 159 · term life 249.96 · renters 22 · fuel 35 · Allstate Roadside 10.92 (from Oct 2026)
- [ ] ENJOY reports its real level (e.g. 2.1%); unused portion of the 10% surfaces as redirectable cash, not spending

## Session 4 — Individual debts, snowball, PSLF
- [ ] One card per debt: balance, APR, due date, minimum, extra payment, dynamically computed payoff date
- [ ] Original vs current payoff, months accelerated, interest avoided
- [ ] BetrLink: $49 ends after Sep 2026; $583 unreduced Oct 2026 → Feb 2027
- [ ] Vacation snowball: 2306 $155.43 + $298 = $453.43 → rolls into 3004 $228.47 + $453.43 = $681.90, with funding source per card
- [ ] Reset balances: 2306 $1,453.75, 3004 $3,363.40, student loans ~$105,000
- [ ] PSLF: 55/120 complete, 65 remaining, ~2032 forgiveness, "PSLF Strategy: Pay Required Amount, Preserve Forgiveness", no extra-principal suggestions

## Session 5 — Money Redirects engine (DONE)
- [ ] Money Redirects page: freed cash shown as a flow, never as new spending ($49 → Resend $20 → Allstate $10.92 → $18.08 remaining)
- [ ] Schedulable + editable redirects, including the $888 pool split ($390 PSLF, $298 vacation snowball, $200 Build Wealth)
- [ ] Trigger: vacation debt hits $0 → offer redirect into Travel Fund at $500/month
- [ ] Trigger: July 2027 $100 raise → default into HSA
- [ ] Build Wealth take-home: $277/mo now, $485/mo from Jan 2027 ($277 + $208 First Million Accelerator); $451.67 employee payroll, $516 employer retirement, $500 Jan + $500 Jul employer HSA stay informational (never double-deducted from $4,250.02)

## Session 6 — Forecast, scenarios, infographics, dashboard (DONE)
- [ ] Month-by-month forecast from Sep 2026 over 12 / 24 / 60 months: every bucket, unassigned cash, 45/10/25/20 comparison
- [ ] Change flags per month (payment ended, subscription added, employer HSA, raise redirected, fee paid, loan cleared, Vacation Fund activated)
- [ ] "What If?" simulator recalculating Buffer, percentages, payoff dates, Vacation Fund timeline, wealth totals live
- [ ] Infographic report types in the existing export engine: monthly snapshot, debt payoff roadmap, wealth building, 45/10/25/20 scorecard, vacation fund, year-end — PNG / PDF / print, landscape / portrait / letter / social / presentation, dark-navy palette
- [ ] Dashboard "YOUR UPDATED PLAN — SMART CHANGES. STRONGER FUTURE." with six cards (Live, Enjoy, Build Wealth, Eliminate Debt, Business, Buffer) + top indicators, framing intentional debt overage as strategy

## Session 7 — Real monthly debt payments (DONE — Zero-Based Plan → Debt Actuals)

## Budget page flow (DONE)
- [x] Single 5-step tab order on /budgets: Income → Assign → Budget → Forecast → Plan, scope moved to a Showing selector, step guidance with Back/Next

## Open items from earlier
- [ ] Enter September 2026 actual spending, review LIVE / ENJOY / DEBT impact, adjust plan
- [ ] Categorize newly imported transactions (currently flagged needs_review) so the budget balances

## New (requested 2026-09-01)
- [ ] Real consulting payment schedule: quarterly $1,925.29 lands Oct 2026, Jan/Apr/Jul/Oct 2027, Jan 2028 (not just an October budget row) + cash flow forecast picks up the schedule
- [x] Debt payoff tracker on /budgets: per-payment balance reduction for each vacation loan (2306, 3004) and BetrLink, with payoff dates and progress bars

## New (requested 2026-09-02)
- [x] Capital Events report page (/reports/capital-events): per-event funding source, cost basis, gain, reserve cash flow graph
- [x] Collapsible sections with chevron arrows: Business Capital Reserve, Reserve Ledger, Capital Events History

## Session 5 — Budget hygiene + Assign step automation (2026-09-02)
- [x] Mount Auto-Assign card on the /budgets Assign step (runs Layer A balancing, keeps Buffer balanced)
- [x] Payoff timeline visible on the Assign step
- [x] Backfill all missing budget lines Jan 2026 → Sep 2026 from real activity
- [x] Earnin advances/repayments moved out of Other Income to "Earnin Cash Advance" (eliminate_debt)
- [x] Shared lines labelled with personal/business split %: Auto Insurance 53/47, Utilities 69/31, BetrLink Debt 63/37, Restaurants 50/50

## Session 6 — Emergency Fund & Liquidity Management (2026-09-02)
- [x] `reserve_funds` + `reserve_transactions` tables (household RLS), separate from buffer_ledger
- [x] Tiered Emergency Fund: Stage 1 $2,000 / Primary $5,000 (default goal) / Ceiling $7,000
- [x] SoFi Bank as dedicated Emergency Fund institution; emergency cash never mixed with Buffer, Vacation, HSA, Retirement, Brokerage or Business Capital Reserve
- [x] Emergency Fund card: balances, remaining to Stage 1 / Primary, % funded, monthly transfer, YTD contributions & withdrawals, estimated completion, months of essentials covered, progress bar
- [x] Liquidity classification per reserve: emergency_cash / short_term_savings / investment / retirement / other — only emergency_cash counts toward the $5,000 target
- [x] SoFi Investments tracked separately (balance, contributions, withdrawals, gain/loss, market value, account type, goal) and excluded from the Emergency Fund balance
- [x] Priority ladder 1–5 (Stage 1 floor → minimums + core retirement → vacation debt → freed cash to $5,000 → stop and redirect surplus)
- [x] "Buffer Sweep to SoFi Emergency Fund" transaction type, single-counted
- [x] Emergency withdrawal capture (date, amount, reason, category, notes) + automatic Replenishment Needed status
- [x] Vehicle Maintenance sinking fund (tires, brakes, batteries, repairs, routine service) for three paid-off vehicles
- [x] Financial Resilience dashboard: liquid reserves vs investments visually separated
- [x] Guardrails: below $2,000 floor, vacation/discretionary misuse, investments counted as emergency cash, buffer double-count, same balance classified as both cash and investment
- [x] Optional "Redirect Excess Cash to Investments" rule with editable split (default 60% SoFi Investments / 40% other goals), manual approval required

## Session 7 — Live SoFi balances + redirect (2026-09-02)
- [x] Emergency Cash card follows a linked SoFi bank account balance (stale-feed fallback, manual override)
- [x] SoFi Investments card totals real SoFi investment accounts with editable balances
- [x] Redirect Excess Cash panel: floor-first waterfall + "Mark transferred" writing reserve transactions
 - [x] Budgets business view: show each category's percentage of the business budget
 - [x] Business-side budget rows show the percentage charged to business (e.g. Rent 14%) alongside share of the business budget
 - [x] Personal-side budget rows show the percentage staying on personal (e.g. Rent 86%) alongside share of the personal budget

## Monte Carlo Retirement Stress Test module — DONE 2026-09-02 (/planning/stress-test)
- [x] Sidebar navigation tab for Retirement Stress Test, easy to find
- [x] Monte Carlo engine: 1k / 5k / 10k simulations with variable returns, inflation, healthcare, longevity
- [x] Pull existing Prism plan data (balances, contributions, HSA, SS, pension, debt, emergency fund, etc.) with manual overrides
- [x] Success definitions: portfolio survival, floor, legacy, income, principal, LTC, multi-goal
- [x] Large probability card with interpretation bands
- [x] Outcome distribution (10/25/50/75/90 percentiles) at key ages
- [x] Sequence-of-returns risk section
- [x] Historical crisis stress tests
- [x] Inflation / LTC / income floor / retirement age / contribution / spending sensitivity
- [x] Dynamic spending guardrails + worst-case mode
- [x] Risk ranking + scenario comparison + recommended actions
- [x] Annual Monte Carlo Review save + historical chart
- [x] Disclaimer

## New (requested 2026-09-02) — Non-monthly / irregular expense planning
- [ ] Add sinking-fund style non-monthly expenses for personal AND business (oil changes, car registration, LLC registered-agent annual fee, domain/website renewals, etc.) so annual costs are budgeted monthly instead of missing from the plan
- [x] Fix double-subtraction of payroll deductions in personal unallocated calc (src/pages/Budgets.tsx) — should show $665.77 left to assign

## New (requested 2026-09-02) — Five Investment Roles + extras
- [ ] Prism Five Investment Roles module (CORE / MOMENTUM / GUARDRAIL / CONVICTION / CATALYST)
- [ ] Market data via Alpha Vantage (user has API key) instead of FMP
- [ ] Text-to-speech narration for "How to use this stress test"
