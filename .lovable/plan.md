
# Phase 1 — Financial Operating System

Full-depth build of the 4 selected systems, extending existing Prism infrastructure (Coach, Investment Planning v1–v12, Purchase Guard, Paycheck Deployment, Financial Health Score, `financial_goals`, `investment_legacy_goals`, `debt_items`, `subscriptions`, `credit_accounts`). No parallel modules — everything hooks into what's already shipped.

---

## 1. Legacy Worth™ Score + Legacy Mode Dashboard

**New route:** `/legacy` (replaces "Retirement" tab in nav; old route redirects)

**Score engine** — `src/lib/legacy/legacyWorthEngine.ts`
14 weighted factors, each 0–100, weighted-summed to a 0–1000 Legacy Worth score:

| Factor | Weight | Source |
|---|---|---|
| Net Worth (age-adjusted vs Kitces benchmark) | 12% | accounts + debt_items |
| Retirement Readiness (crossover %) | 10% | investment_plans |
| Passive Income Coverage | 10% | investment_holdings dividends + rental |
| Emergency Fund (months of expenses) | 8% | accounts.type='savings' |
| Insurance Protection | 7% | new `insurance_coverage` table |
| Debt-to-Income & high-interest debt | 8% | debt_items |
| Estate Planning completeness | 7% | investment_legacy_goals booleans |
| Trust Readiness | 7% | new checklist |
| Tax Efficiency (Roth %, HSA use, asset location) | 7% | investment_plans + accounts |
| Investment Diversification (HHI on holdings) | 6% | investment_holdings |
| Giving (% income) | 4% | transactions category=charity |
| Financial Literacy (belt earned) | 5% | new `user_progression` table |
| Family Governance (constitution + summit) | 4% | new tables |
| Real Estate + Business Ownership | 5% | accounts.type |

**Dashboard** — `src/pages/LegacyMode.tsx` with:
- Hero: **Legacy Worth™** big number + trend sparkline, life-stage badge (Builder/Protector/Multiplier/Financial Freedom/Legacy Builder/Family Endowment) auto-computed from score bands
- 4 KPI tiles: Net Worth · Financial Freedom % · Days Until Freedom · Projected Estate at 85
- Factor radar chart (14 axes) — click factor → drilldown with "next best action to lift this by 10 pts"
- Passive Income Coverage bar (dividends + rental ÷ monthly expenses)
- Generational Wealth Projection chart (25/50/75/100 yr) — links to simulator

**Financial Freedom Engine** — replaces retirement countdown widget across app; exposes `useFinancialFreedom()` hook returning `{ daysUntilFreedom, fiPercentage, passiveIncomeCoverage, portfolioSustainability }`.

---

## 2. KUNG FOO™ Financial Order of Operations

**New engine** — `src/lib/kungfoo/orderOfOperations.ts`
Reorders 10-step waterfall dynamically per user context (age, bracket, match %, cash, debt APR, timeline, family size, legacy goals). Rule-based with AI-generated rationale per step.

Default order (reordered per user):
Emergency → Employer Match → HSA → High-Interest Debt → Roth → Tax-Deferred → Taxable → Real Estate → Montgomery Legacy Trust → Charitable

**Integration:**
- Extends `paycheck_deployment_rules` — adds `kungfoo_step`, `dynamic_priority`, `ai_rationale` cols
- `src/components/kungfoo/OrderOfOperationsCard.tsx` — draggable stepper on `/coach` and `/paycheck-deployment` showing the 10 steps with $ this paycheck, why this order, "unlock next step when…"
- Edge fn `kungfoo-recompute` — called nightly + on major life events, writes ordered plan back to `paycheck_deployment_rules`
- Paycheck Deployment auto-consumes new order

**New table** `kungfoo_plans` — snapshot of ordered plan per household (audit trail).

---

## 3. Money Coach AI Upgrade + Purchase Guard v2

**Opportunity-cost engine** — `src/lib/coach/opportunityCost.ts`
Every transaction/purchase gets:
- `daysDelayedFreedom` = amount ÷ daily FI progress rate
- `futureValueAt30yr` at user's planning return
- `legacyWorthDelta` = amount × factor weight impact
- `emotionalScore` (0–1) from category + time-of-day + velocity heuristics

**Coach chat prompt update** — `supabase/functions/coach-chat/index.ts` gets new system prompt emphasizing: explain why, cost, what next, long-term impact. Never shame. Always show trade-offs + 4 scenarios (Conservative/Average/Growth/Aggressive).

**Transaction reframes** — extend `TransactionCard` to show "This delays Freedom by ~X days · −$Y Legacy Worth" for discretionary spends >$25.

**Purchase Guard v2** — extends existing `purchase_guard_checks`:
- New questions before override: Need or Want? · Will Future You thank you? · Increases Legacy Worth? · Can it wait 24h?
- Emotional-spend detector (time, category velocity, recent similar purchases) → auto-triggers 24h hold on emotional flag
- Override tracking with pattern coaching: after 3 overrides in same category, Coach opens conversation
- New cols: `is_emotional`, `needwant`, `future_you_answer`, `legacy_impact_ack`, `override_pattern_flag`

---

## 4. Montgomery Family Legacy Module + 100-Year Simulator

**New route:** `/legacy/family` with 5 tabs.

**New tables:**
- `family_legacy_trusts` — assets, funding target, insurance funding, projected value
- `family_constitutions` — jsonb sections (mission, values, faith, financial, investment, giving, business, education, marriage, decision rules, trustee expectations, summit agenda, legacy letter, ethical will)
- `family_beneficiaries` — name, relationship, allocation %, contingent, notes
- `estate_planning_checklist` — 22-item checklist (will, trust, POA, healthcare directive, beneficiary reviews on each account, digital asset inventory, letter of intent, etc.)
- `family_wealth_events` — timeline (births, marriages, business sales, inheritances, distributions)

**Tabs:**

1. **Trust Dashboard** — current assets, funding gap, life-insurance funding, Trust Readiness Score (0–100 from checklist completion), projected trust value at 25/50/100 yr
2. **Estate Checklist** — 22 items with document upload (reuses `credit_documents` bucket pattern → new `legacy_documents` bucket), beneficiary review per account (pulls from `accounts`, flags stale > 3 yr)
3. **Family Constitution Generator** — 14-section wizard with AI-assisted drafting per section (edge fn `family-constitution-draft`), PDF export
4. **Legacy Letter + Ethical Will** — rich-text editor with AI prompts ("What lessons do you want your grandchildren to know?"), PDF export
5. **100-Year Simulator** — `src/components/legacy/HundredYearSimulator.tsx`

**100-Year Simulator:**
- Time horizons: 25/50/75/100 yr
- Inputs: expected return, inflation, tax rate, annual distribution %, charitable %, additional contributions, business growth, life-insurance proceeds, generations count
- Monte Carlo (1000 runs) → probability of preserving principal
- Outputs: nominal FV, real (inflation-adjusted) FV, purchasing power today, trust sustainability %, probability principal preserved, generations supported, projected family impact ($)
- Recharts area chart with confidence bands + tornado chart of assumption sensitivity
- PDF export of scenario

**Family CFO Monthly Report** — edge fn `family-cfo-report` (cron 1st of month 07:00 UTC):
Household Net Worth · Cash Flow · Investment Growth · Debt Reduction · Legacy Worth Δ · Trust projection · Tax opportunities · Insurance review · Allocation · Risks · Next Best Move · One high-impact action. Emailed via Resend + stored in `agency_financial_snapshots`.

**Compliance banner on every Legacy screen:** "Educational planning only. Not legal, tax, or investment advice. Consult qualified professionals."

---

## Martial Arts Progression (gamification layer across all 4 systems)

**New table:** `user_progression` — belt, milestones_completed jsonb, current_rank, next_rank_requirements

10 belts (White → Grandmaster) with earn criteria mapped to real milestones:
- White: signed up
- Yellow: emergency fund started
- Orange: emergency fund = 3mo + all high-interest debt paid
- Green: employer match maxed + Roth contribution active
- Blue: net worth positive + Legacy Worth 400+
- Purple: FI% ≥ 25%
- Brown: FI% ≥ 50% + estate checklist 80% complete
- Black: FI% ≥ 100% (Freedom achieved)
- Master: Legacy Worth 800+ · Trust funded · Constitution complete
- Grandmaster: 3+ generations supported in 100-yr sim

Belt badge shown on `/legacy` and in sidebar profile. Belt-up moments trigger celebration modal + push notification.

---

## Technical section

**New tables (11):** `kungfoo_plans`, `insurance_coverage`, `user_progression`, `family_legacy_trusts`, `family_constitutions`, `family_beneficiaries`, `estate_planning_checklist`, `family_wealth_events`, `legacy_documents_meta` — all household-scoped, RLS + GRANTs, soft-delete.

**Column additions:**
- `paycheck_deployment_rules`: `kungfoo_step`, `dynamic_priority`, `ai_rationale`
- `purchase_guard_checks`: `is_emotional`, `needwant`, `future_you_answer`, `legacy_impact_ack`, `override_pattern_flag`

**New edge functions (5):**
- `legacy-worth-compute` — nightly recompute per household
- `kungfoo-recompute` — nightly + on-demand
- `family-constitution-draft` — AI drafting per section (Lovable AI, `google/gemini-3.5-flash`)
- `family-cfo-report` — monthly report + Resend email
- `hundred-year-simulate` — Monte Carlo (server-side for consistency)

**Coach chat prompt** — updated with FOS mission, opportunity-cost framing, 4-scenario rule, never-shame rule.

**Client libs:**
- `src/lib/legacy/legacyWorthEngine.ts` + factor calculators
- `src/lib/kungfoo/orderOfOperations.ts`
- `src/lib/coach/opportunityCost.ts`
- `src/lib/legacy/monteCarloSim.ts`
- `src/lib/progression/beltRules.ts`

**Hooks:** `useLegacyWorth`, `useFinancialFreedom`, `useKungFooPlan`, `useOpportunityCost`, `useUserProgression`, `useFamilyConstitution`, `useHundredYearSim`.

**Pages/components:** ~35 new files under `src/pages/legacy/`, `src/components/legacy/`, `src/components/kungfoo/`, `src/components/coach/purchase-guard-v2/`, `src/components/progression/`.

**Realtime:** subscribes Legacy Worth + belt table so celebrations fire on backend recompute.

**Nav:** Sidebar adds "Legacy" group with children: Legacy Mode · KUNG FOO Plan · Family Legacy · 100-Year Simulator · Estate Checklist · Belt Progress.

**PDF exports:** Legacy Worth report, Family Constitution, Legacy Letter, Ethical Will, 100-Year scenario, Monthly Family CFO report.

**Est. scope:** ~55 files created/modified, 1 large migration, 5 edge functions, 2 cron jobs. Build proceeds in this order: (1) migration + RLS + GRANTs, (2) engines (pure TS libs), (3) edge functions, (4) hooks, (5) UI pages, (6) nav + Coach prompt update, (7) verify.
