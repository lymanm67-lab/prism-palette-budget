
# Mortgage Freedom Intelligence Center — Build Plan

Full spec (all 14 sections) added to `src/components/calculators/HelocVsMortgageCalculator.tsx` as a new top-level tab **"Freedom Center"** alongside the existing HELOC/Mortgage/Payoff Accelerator content. Data sourced from `useFinancialProfile` + page-local mortgage inputs already on the calculator. Delivered in 3 phases so we can ship value early and stop if scope drifts.

## Architecture

- **New folder:** `src/components/calculators/mortgage-freedom/`
- **Shared math lib:** `src/lib/mortgage-freedom/` — strategy simulators, freedom-score engine, stress-test engine, rules-based recommender.
- **AI:** reuse existing `calculator-insights` edge function pattern; add a new `mortgage-freedom-coach` edge function that streams Gemini for the AI Coach narrative and score-improvement suggestions. Auto rules-based verdict renders instantly (free); AI narrative requires button click.
- **State:** scenarios saved to `localStorage` under `prism.mortgage-freedom.scenarios.v1` (unlimited, no DB — keeps scope tight; can promote to Supabase later).
- **Charts:** Recharts (already in use).

## Phase 1 — Foundation & core intelligence (ship first)

Sections 1, 2, 3, 5, 12, 14 (partial).

1. **Overview Dashboard** — Balance, value, equity, LTV, rate, term, monthly pmt, payoff date, remaining interest, **Freedom Score gauge**.
2. **Strategy Comparison** — 4 cards side-by-side (Traditional / Extra Principal / HELOC Acceleration / 1st-Lien HELOC Purchase) with inline editable inputs on B, and expandable detail on each.
3. **Freedom Simulator** — Sliders for all 17 inputs in spec; charts + strategy cards recompute live.
4. **AI Recommendation Engine** — Rules-based winner + confidence auto-shown; "Explain in detail" button streams AI narrative.
5. **Freedom Score (§12)** — 10-factor weighted score 0–100 with transparent breakdown drawer; "Improve my score" button → AI suggestions.
6. **Core visualizations** — Balance-over-time, Equity growth, Interest vs Principal, Payoff timeline race chart.

## Phase 2 — Decision tools

Sections 4, 6, 13.

7. **Home Affordability Planner** — user-defined comfort payment (not lender max) → max/recommended/stretch purchase price + cushion analysis.
8. **HELOC Stress Testing** — rate shocks (+1/2/3%), income drop, repair, medical, job loss, business decline. Verdict + risk level + adjustments per shock.
9. **Scenario Comparison Lab** — save/load/name unlimited scenarios; comparison grid across payment, interest, payoff, 10-yr net worth, cash flow, retirement impact, risk, wealth score.

## Phase 3 — Coaching, integration, notifications

Sections 7, 8, 9, 10, 11, 14 (remaining viz).

10. **Freedom Dashboard gauges** — 8 gauges (equity, progress, interest saved, years eliminated, net worth, freedom score, cash-flow health, DTI).
11. **First-Time Homebuyer Assistance** — pulls from existing `src/lib/home-buying/state-dpa-programs.ts`; adds federal (FHA, VA, USDA, MCC) + placeholders for county/employer with "check with your HR / county" callouts. No new dataset scraping in Phase 3.
12. **Wealth Integration panel** — "How this decision affects" cards linking Money Coach, Retirement Planner, Investment Dashboard, Emergency Fund, Tax Planner via existing routes. Read-only impact math; no new writes.
13. **Smart Notifications** — derived from current inputs (rules engine); rendered inline as dismissible cards. No push/email in this phase.
14. **AI Mortgage Coach chat surface** — single-shot Q&A input using the same edge function; not a full threaded chatbot.
15. **Advanced viz completion** — HELOC balance curve, cash flow chart, wealth projection chart.

## Files (approximate)

**New**
- `src/lib/mortgage-freedom/simulators.ts` — 4 strategy simulators (traditional, extra-principal, HELOC accel, 1st-lien purchase).
- `src/lib/mortgage-freedom/freedom-score.ts` — 10-factor score + breakdown.
- `src/lib/mortgage-freedom/stress-test.ts` — shock scenarios.
- `src/lib/mortgage-freedom/recommender.ts` — rules-based winner + confidence.
- `src/lib/mortgage-freedom/scenarios.ts` — localStorage CRUD.
- `src/lib/mortgage-freedom/homebuyer-programs.ts` — federal + wraps existing DPA.
- `src/components/calculators/mortgage-freedom/FreedomCenter.tsx` — tab shell.
- `src/components/calculators/mortgage-freedom/OverviewDashboard.tsx`
- `src/components/calculators/mortgage-freedom/StrategyComparison.tsx`
- `src/components/calculators/mortgage-freedom/FreedomSimulator.tsx`
- `src/components/calculators/mortgage-freedom/AffordabilityPlanner.tsx`
- `src/components/calculators/mortgage-freedom/StressTest.tsx`
- `src/components/calculators/mortgage-freedom/ScenarioLab.tsx`
- `src/components/calculators/mortgage-freedom/FreedomScoreCard.tsx`
- `src/components/calculators/mortgage-freedom/FreedomGauges.tsx`
- `src/components/calculators/mortgage-freedom/HomebuyerAssistance.tsx`
- `src/components/calculators/mortgage-freedom/WealthIntegration.tsx`
- `src/components/calculators/mortgage-freedom/SmartNotifications.tsx`
- `src/components/calculators/mortgage-freedom/AiCoach.tsx`
- `src/components/calculators/mortgage-freedom/AdvancedCharts.tsx`
- `supabase/functions/mortgage-freedom-coach/index.ts` — streams Gemini via Lovable AI Gateway.

**Edited**
- `src/components/calculators/HelocVsMortgageCalculator.tsx` — add "Freedom Center" tab that renders `<FreedomCenter />`.

## Technical notes (safe to skim if non-technical)

- All money math is deterministic and unit-testable (pure functions in `src/lib/mortgage-freedom/`).
- AI is opt-in (button) except for the rules-based winner verdict — keeps credit burn predictable.
- Freedom Score factors: Housing affordability (DTI), LTV, credit tier, emergency-fund proxy (cash-flow surplus × months), retirement contribution rate (from profile if present, else neutral), monthly surplus %, mortgage-acceleration potential (surplus ÷ balance), interest-savings opportunity (rate delta vs market), overall stability composite, cash-flow health.
- Stress test = re-run the recommended strategy simulator with perturbed inputs; classify PASS / MARGINAL / FAIL by whether payoff date drifts >12 months or cash flow goes negative >3 months.
- Scenarios use a stable `id` + `name` + full input snapshot; comparison grid diffs snapshots.
- No schema changes. No new secrets. `LOVABLE_API_KEY` already provisioned.

## Out of scope for this build

- Real-time market rate feeds (uses user-entered rates).
- Live homebuyer program eligibility API integrations (uses static + placeholder guidance).
- Push/email notifications delivery (in-app cards only).
- Threaded AI chat history (single-shot Q&A only).
- Promoting scenarios to Supabase (localStorage only).

## What you'll approve

Approving this plan starts **Phase 1** only. I'll pause after Phase 1 for review before starting Phase 2, and again before Phase 3. That gives you natural credit-checkpoint gates matching your discipline rules.
