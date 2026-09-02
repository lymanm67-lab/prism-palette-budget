# Prism Five Investment Roles

An original Prism investment architecture built on one rule: **every investment must have a job.** Five roles — CORE, MOMENTUM, GUARDRAIL, CONVICTION, CATALYST — wired into the existing retirement, debt, emergency fund, tax, and legacy systems.

## What gets built

### 1. Role assignment layer
Your holdings are tagged with a role, an account, and (for CONVICTION/CATALYST) a written thesis:

- CORE — SPMO — "carries the long-term weight of the portfolio"
- MOMENTUM — DRAM — "additional growth, subordinate to the foundation"
- GUARDRAIL — ISU — "judged partly by how well it protects the strategy"
- CONVICTION — QTUM, LYTE — thesis, entry, review date, what would prove it wrong
- CATALYST — ITA — catalyst, why it matters, risk level, exit criteria

Security type is never assumed. Each ticker is validated (ETF / stock / mutual fund / other) and shown as validated or **"Instrument requires verification."**

### 2. Strategy Control Center (`/investing`)
Top band shows the five roles side by side with current vs target weight. Below: total portfolio value, gain/loss, dividend income, volatility, estimated max drawdown, allocation drift, concentration risk, overlap score, rebalancing status, Next Dollar recommendation, plus live status of your Emergency Fund, high-interest debt, Monte Carlo success and legacy probability.

### 3. Editable allocation targets
Five target percentages you set yourself (no hard-coded numbers), required to total 100%. Shows dollar and percentage-point gaps with Underweight / On Target / Overweight, and a five-role allocation chart.

### 4. Capital Priority Rule + Next Dollar
Before Prism suggests investing, it checks in order: emergency cash floor, required debt payments current, high-interest debt on plan, near-term sinking funds, core retirement contributions, monthly liquidity. If a higher priority is unmet the answer is "Do not invest this dollar yet," with the reason. Only then does it route the dollar to the most underfunded role. Never executes trades; every action needs your approval.

### 5. Discipline tools
- **Buy discipline** checklist (underweight? diversification? overlap? cash? emergency fund intact? horizon? Monte Carlo effect?) — never "it went up recently."
- **Sell discipline** — thesis intact / weakened / broken, catalyst active / completed, overweight, tax cost, statuses: Hold, Add, Pause Purchases, Reduce, Exit, Review Required.
- **Concentration limits** — per security, company, sector, industry, and role, with an editable warning when CONVICTION + CATALYST exceed 20%. Warning, not a block.
- **Position size guardrails** by role so a tactical position can never quietly dominate.
- **Rebalancing** with 3 / 5 / 10 / custom drift bands (default 5pp), contributions-first before taxable sales.

### 6. Analysis
- **ETF & security overlap** — duplicate underlying holdings, company/sector/industry/geographic/thematic concentration, Portfolio Overlap Score, Largest Shared Holdings.
- **Performance attribution by role** — which role added the most return, the most risk, the most protection.
- **Benchmark per role** — each role judged against its own benchmark, not one index.
- **Portfolio stress test** — 10/20/30/40% declines, per-role decline and recovery requirement.
- **Risk budget** — Foundation / Growth / Defensive / Opportunistic / Strategic.
- **Tax awareness** — cost basis, unrealized/realized, holding period, short vs long-term, estimated taxable gain, informational tax-loss harvesting. Sale previews never treat proceeds as gain.

### 7. Planning integration
- **Monte Carlo impact** — the existing stress test gains per-role return and volatility assumptions instead of one blended rate, and a hypothetical-allocation mode that tests mixes without touching real holdings.
- **Pre-purchase preview** — new allocation, concentration, overlap, volatility, Monte Carlo and legacy change, cash remaining, then approve to save.
- **Legacy impact** — projected portfolio vs your editable age-85 legacy target, with probability and the amount potentially available for legacy.
- **Prism Financial Hierarchy** — PROTECT / STABILIZE / BUILD / GROW / LEGACY, pulling your real emergency fund, buffer, debt, sinking funds, payroll and HSA contributions so investing is never shown in isolation.
- **Strategy Fit Score** 0-100 (explicitly not a buy or sell score).

### 8. Records
- **Watchlist** — research only, role candidates, thesis, desired entry, catalyst, review date, decision status. Never counted in allocation.
- **Decision Journal** — every buy/add/reduce/sell/rebalance/target change records reason, expected outcome, risk considered, review date, then later compares expected vs actual.
- **Monthly strategy review** — the five role questions plus drift, concentration, overlap, rebalancing and Next Dollar.
- **Annual investment review** — beginning/ending value, contributions, employer contributions, dividends, realized/unrealized, allocation shift, rebalancing activity, best/worst/riskiest/most protective role, benchmarks, and "did each role do its job?"

### 9. Funding sources and account location
Every contribution is tagged with its source (payroll, employer, cash flow, debt payoff redirect, tax refund, raise, bonus, consulting, business, buffer excess, stock-sale proceeds, SoFi transfer, other) and its account (TDA, 457(b), Roth TDA, Roth 457(b), HSA, taxable, SoFi Investments, other). Transfers are never double-counted, employer contributions are never double-counted, and tax treatment is kept separate per account.

### 10. SoFi separation
SoFi Emergency Cash and SoFi Investments stay separately accounted with separate goals. Investment value never counts toward the emergency fund target; a combined "total SoFi relationship" figure is display only.

### 11. Navigation
New sidebar section **Investment Strategy**: Strategy Control Center, Five Investment Roles, Portfolio Allocation, Next Dollar, Rebalancing, Risk & Concentration, ETF Overlap, Performance Attribution, Watchlist, Decision Journal, Scenario Testing, Monte Carlo Impact, Tax Awareness, Legacy Impact. Also surfaced from the Investment Holdings and Retirement Hub pages.

## Market data

You chose a live market-data API. The plan uses **Financial Modeling Prep** because it is the one affordable provider that serves both quotes and ETF underlying holdings (needed for real overlap analysis). Implementation: one edge function proxies quote, profile, and ETF-holdings requests server-side so the key is never exposed, with cached responses and a manual-entry fallback whenever a lookup fails or a ticker cannot be confidently validated. I will request the API key when we reach that step. If you would rather use a different provider you already pay for, say which and I will swap the adapter.

## Technical details

New household-scoped tables with RLS and GRANTs, all soft-deleted:
`inv_role_targets`, `inv_role_positions` (role, account type, shares, basis, entry, thesis, catalyst, status, review date), `inv_contributions` (amount, source, account, date), `inv_securities` (validated metadata cache), `inv_security_holdings` (fund underlying holdings for overlap), `inv_concentration_limits`, `inv_decisions` (journal), `inv_reviews` (monthly/annual), `inv_watchlist_items` (role candidate, thesis, entry target), `inv_scenarios` (hypothetical allocations).

Existing `investment_positions` / `investment_holdings` / `retirement_accounts` stay the source of truth for balances; the role layer references them rather than duplicating values, so SnapTrade sync keeps working. Emergency-fund reads come from `reserve_funds`, debt from `debt_items`, cash flow from the Zero-Based/Layer A data.

New calculation modules under `src/lib/investing/`: allocation and drift, overlap scoring, attribution, risk budget, strategy fit, capital-priority sequencing, tax lot math. `src/lib/retirement/stressTest.ts` gains per-role return/volatility inputs and a hypothetical-allocation entry point; the existing Monte Carlo worker is reused.

Edge function `market-data` (FMP proxy, cached in `inv_securities`). No automatic trading anywhere. Confirmation dialogs gate target changes, recorded trades, role reclassification, and any emergency-cash-to-investment move. All projections labeled estimates, not guarantees.

## Note on your percentages

The five target percentages ship unset and editable. Use Scenario Testing and Monte Carlo Impact to compare mixes before locking them in.
