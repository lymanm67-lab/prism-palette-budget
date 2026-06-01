
# Prism Money Coach — Phased Build Plan

## Recommended entry point

New top-level route **`/coach`** with a sidebar entry "Money Coach" (prism-amber icon, between Dashboard and Budgets). The existing Dashboard stays as the data overview; Coach is the **action layer** — it answers "what happened, why, what now, how to prevent it." Coach also gets a persistent floating CTA on Dashboard ("Open Coach") and a Cmd+K shortcut (`G C`).

Why not replace Dashboard or add a tab: Dashboard is already split Personal/Business/Combined and is data-dense. Coach is narrative and decision-driven — different mental model, deserves its own surface. A separate route also lets us deep-link from notifications, anomaly alerts, and Purchase Guard flows.

---

## Phase map (one phase per message)

Each phase ends in a working, shippable state. You approve each before we start the next.

### Phase 1 — Coach shell + dashboard wiring (LOW credits)
Build `/coach` page with the 7 cards, all wired to **existing data only**. No new DB, no new edge functions.
- Card 1 What Happened — uses `useSpendingAnomalies` + over-budget categories from `budgets`
- Card 2 Why It Happened — uses existing `spending-insights` edge function (already realtime)
- Card 3 Recovery Plan — placeholder ("Coming next phase")
- Card 4 Prevention Rule — placeholder
- Card 5 Purchase Guard — links to existing Smart Spend Guardrails page
- Card 6 Money Leak Stopper — pulls from `useSubscriptions` (Zombie Charges) + Bill Negotiation savings
- Card 7 Safe-to-Spend Shield — reuses `useSafeToSpend` + `StsEquationView`, adds the Smart Buffer breakdown card
- Add coaching tone wrapper component (`<CoachCard>`) with confidence-score badge (High/Medium/Low)

### Phase 2 — Recovery Plan Builder (MEDIUM)
New engine that runs when any category is over budget.
- New table `recovery_plans` (household_id, category_id, month, plan_type, target_amount, status, created_at)
- New hook `useRecoveryPlans` + edge function `recovery-plan-builder` (Gemini Flash, returns Fast/Balanced/System/Wealth options)
- Trend vs Outlier logic in TS (1 in 6mo = outlier, 2 in 3mo = developing, 3 in 6mo = repeated pattern)
- Card 3 lights up with 4 recovery options + "Apply Plan" button
- Card 4 lights up with system prevention rules

### Phase 3 — Purchase Guard expansion (MEDIUM)
**Extends** Smart Spend Guardrails (keeps current $50/48h logic intact). Additions:
- New table `purchase_guard_checks` (purpose, classification need/want/strategic, fit_score, decision, fomo_detected, override_reason, planned_purchase_target_date, post_review_completed_at, post_review_worth_it)
- Purchase Fit Score (0–100) computed client-side from existing Safe-to-Spend, buffer, goal, debt, recurring-cost data
- FOMO keyword detector (regex over purpose text: "limited time", "sale ends", "I deserve it", etc.)
- 24-hour wait UI with countdown
- Override pattern detection (2 overrides in 6mo → suggest system rule)
- Strategic Investment proof questionnaire
- One-in-one-out picker (lists active subscriptions to swap)
- Planned Purchase Mode (creates sinking fund row in existing `goals` table)
- 7-day + 30-day post-purchase review prompt (notification)

### Phase 4 — Money Leak Stopper engine (MEDIUM)
Promote leaks from "subscriptions only" to a full engine.
- New edge function `money-leak-scan` (runs nightly + on-demand) detecting: subscription creep, duplicates, fee increases, overdrafts, late fees, ATM fees, interest charges, payday spending spikes, bill collisions, lifestyle creep, forgotten trials
- New table `money_leaks` (type, monthly_cost, annual_cost, three_year_cost, risk_level, recommended_fix, suggested_redirect, status, dismissed_at)
- Card 6 becomes interactive: dismiss, fix, redirect to debt/HSA/Roth/savings

### Phase 5 — Smart Buffer adaptive engine (LOW-MEDIUM)
Replace fixed `buffer_percent` with adaptive logic.
- New columns on `mode_settings`: `buffer_mode` ('manual'|'adaptive'), `buffer_triggers` (jsonb log)
- Adaptive calculator scores: overdraft history, late fees, pending count, income variance, unconfirmed bills, subscription density, large upcoming bill, days-to-payday, recent spike
- Tier output: 10–15 / 15–20 / 20–25 / 25–30 with explanation
- Show "Why this buffer?" tooltip on Card 7

### Phase 6 — Paycheck Deployment Plan (MEDIUM)
- New edge function `paycheck-deploy` consuming latest paystub (`paystubs` table already exists) + bill calendar + goals
- Returns: bills to reserve, min debt, extra debt attack, savings, investment, Smart Buffer, True Safe-to-Spend
- New `/coach/paycheck` sub-route with timeline UI showing each paycheck's "job"
- Card on main Coach with "Next paycheck (Fri Dec 5): see the plan"

### Phase 7 — Bill Timing Optimizer + Wealth Redirector (MEDIUM)
- Bill collision detector reusing existing recurring/cash-flow data → suggests due-date changes
- Wealth Redirector: one component that takes any recovered $ (leak fix, canceled sub, refund) and projects 3-yr impact across debt/EF/HSA/Roth/brokerage destinations
- Integrates with existing `goals` and `debt_plans`

### Phase 8 — Polish + onboarding + disclaimers (LOW)
- Coach onboarding tour (3 steps)
- Educational disclaimer footer on every Coach surface
- Confidence-score legend
- TTS walkthrough hook into existing `useTTS`
- Update memory files for new architecture
- Add to changelog + landing page feature mention

---

## Technical notes (for reference)

**Reuse, don't rebuild:**
- Safe-to-Spend math stays in `useSafeToSpend` — Coach just renders + explains
- Spending anomalies stay in `useSpendingAnomalies` — Coach categorizes as trend/outlier
- Existing `spending-insights` edge function powers "Why" narratives
- Purchase Guard extends `useSpendGuardrails` rather than replacing

**New tables (across phases):** `recovery_plans`, `purchase_guard_checks`, `money_leaks`, `paycheck_deployments`. All household-scoped with RLS + GRANTs.

**New edge functions:** `recovery-plan-builder`, `money-leak-scan` (+ nightly cron), `paycheck-deploy`. All use Lovable AI Gateway (Gemini Flash) — no new secrets.

**Coaching tone enforcement:** Central `coachTone.ts` util that wraps all AI prompts with the supportive language rules (no "you failed", use "trending above plan", etc.).

**Confidence scoring:** Shared `getConfidence()` util — High/Medium/Low based on data completeness (paystub present, bills confirmed, Plaid fresh < 7d, etc.).

---

## What you approve now

Just **Phase 1** (Coach shell + dashboard wiring). After that ships and looks right, send "Phase 2" and we build Recovery Plans. Each phase is its own message so you control credit spend and can stop or reorder anytime.
