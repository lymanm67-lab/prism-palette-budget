# Long-Term Care Decision Dashboard

A dedicated LTC module at `/ltc` for you and Kateri: compare carriers, project benefit growth against Akron care costs, and see how much retirement capital each premium actually protects. Framed as decision support, not a sales page.

## Scope classification

Large (new route, new table, ~12 new files). Existing LTC logic in the Money Blueprint (`LtcQuote`, `ltcBenefitAtAge`, `careCostAtAge`, `scoreLtcQuotes`) is reused and extended rather than rewritten, so the two stay consistent.

## Navigation

- New sidebar item "Long-Term Care" + mobile nav entry, route `/ltc`.
- Nine tabs: Overview, Current Plan, Policy Comparison, Inflation Projection, Care Cost Gap, Retirement Asset Protection, Scenario Simulator, Recommendation (incl. Sweet Spot), Documents & Quotes.
- Money Blueprint's existing LTC tab gets a "Open full LTC dashboard" link; it stays as the summary.

## What each tab does

**Overview** — Planning-target block (household monthly/annual premium, starting benefit per person, initial pool, 36-month benefit period, 90-day elimination, 3% compound, Partnership yes, cash 25%, home/AL/nursing 100%). Cards: current protection, projected benefit at 70/75/80/85, Akron cost estimate, monthly gap, retirement assets potentially protected, annual insurance cost. Protection-level badge: Underinsured / Basic / Balanced / Strong / Potentially Overinsured, derived from benefit-to-projected-cost ratio and premium as a share of income.

**Current Plan** — Mutual of Omaha MutualCare Secure Solution for both spouses at the exact figures given ($2,100 each, $75,600 pool, $525 cash benefit, Lyman $85.19, Kateri $128.21, combined $213.40 / $2,371.12). Explicit warning that the 25% cash benefit is not assumed additive to the reimbursement benefit and must be confirmed against the contract.

**Policy Comparison** — Sortable table seeded with the 7 named plans (MOO Secure Solution, Thrivent 3%, NGL HonestLTC 3%, Thrivent 2%, NGL 2%, MOO $3,000/2%, MOO $3,000/3%) and room to add more. All requested columns including age-80 benefit, lifetime premiums, retirement assets preserved, and value/protection/affordability/flexibility scores. Sorts: lowest premium, highest starting benefit, highest future benefit, best inflation protection, best value, best retirement-strategy fit.

**Inflation Projection** — Inputs for starting benefit, inflation %, compound/simple, current and target age. Benefit and pool tables at 65/70/75/80/85/90 matching your preloaded MOO figures ($2,364 yr 5 … $4,948 yr 30; pool $85,088 … $178,155). Line chart of projected benefit vs projected care cost.

**Care Cost Gap** — Akron default: in-home ~$4,195/month, $128–$140/day range, editable. Cost-growth toggles 2/3/4/5%. Projected cost and gap at 65/70/75/80/85, banded Fully Covered / Small / Moderate / Large — with the standing note that a gap is not a failure, it is retained risk funded by income and assets.

**Retirement Asset Protection** — Withdrawals needed for 1/2/3/5 years of care with and without insurance, out-of-pocket remainder, portfolio preserved, and compounded future value of what was preserved. Includes the premium-difference investor: $44.11/month ($529.32/yr) compounded at 6/7/8/9% over 10/20/25 years.

**Scenario Simulator** — Scenarios A–F (MOO $2,100 3%, Thrivent $3,000 3%, NGL $3,000 3%, no insurance, full self-fund, custom) with claim-age selector 65–85 and duration 1/2/3/5 years. Outputs premiums paid, benefit at claim, pool, care cost, insurance paid, out-of-pocket, retirement assets remaining, legacy value.

**Recommendation** — Adjustable weights (affordability 25, inflation 25, benefit 15, flexibility 10, partnership 10, home care 10, cash 5). Ranks with MOO Secure Solution as #1 under your weights, with the written rationale and the explicit trade-off note that Thrivent/NGL protect more from day one. Ends with the three decision questions (risk transferred / cost to transfer / worth the capital protected) and the "Protect the downside. Keep the upside invested. Preserve the legacy." strategy line. **Sweet Spot Calculator** lives here: benefit rungs $2,000 / $2,100 / $2,250 / $2,500 / $2,750 / $3,000 / custom with editable per-spouse premiums, $2,500 highlighted as the middle-ground target.

**Documents & Quotes** — Quote records (date, agent, carrier, product, premium, benefit, inflation, notes) plus file upload into the 9 categories. Last Reviewed / Next Annual LTC Review dates and the annual review checklist, with warnings when premium rises >15%, benefit covers <40% of projected local cost, Partnership status or inflation rider or benefit period changes, or lapse risk appears.

## Technical notes

- Migration: `ltc_plan` (one household-scoped row, JSONB state for assumptions, policies, scenarios, weights, review log) and `ltc_documents` (metadata rows). Both get GRANTs for `authenticated` + `service_role`, RLS enabled, household-scoped policies including delete. Files go to a new private `ltc-documents` bucket read via signed URLs.
- New `src/lib/ltc/` module: seeded carrier catalogue, projection helpers, gap banding, protection-level and weighted-recommendation scoring, sweet-spot table, review-warning rules. Reuses `ltcBenefitAtAge` / `careCostAtAge` from `src/lib/blueprint/model.ts`.
- Hook `use-ltc-plan.ts` (React Query, save/patch, realtime refresh) following the `use-blueprint-assumptions` pattern.
- Page `src/pages/LongTermCare.tsx` + one component per tab in `src/components/ltc/`, lazy-loaded route, Recharts for charts, existing dark-navy/gold/emerald tokens and glass cards — no hardcoded colors.
- All money and projections are estimates and labelled as such; no advice claims.
