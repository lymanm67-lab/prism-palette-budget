## Goal
Replace the "How to use this page" banner with a **Guided Coach Plan** wizard. The user answers questions tied to each of the 12 Money Coach cards. At the end they get a personalized, AI-generated written plan they can save, view inline, and download as PDF. Progress is saved to Supabase so they can resume anytime.

## User flow
1. On `/coach` they see a single banner: **"Build your Money Coach Plan — 12 steps, ~6 minutes"** with Start / Resume buttons and a progress ring.
2. Clicking Start opens a full-screen wizard (`<CoachPlanWizard>` dialog).
3. Each step is tied to one card (1–12), shows the card's title + a 1-line "why this matters", then 2–4 questions.
4. Branching: skip irrelevant steps based on prior answers (e.g. no debts → skip Wealth Redirector debt question; no business → skip multi-entity Q).
5. Progress saved on every Next click. User can close and resume from the same step.
6. Final step calls a Lovable AI edge function that returns a structured personalized plan: priorities, 30/60/90 day actions, per-card recommendations.
7. Plan rendered inline as a `<CoachPlanResult>` page at `/coach/plan` with Download PDF + Restart buttons.

## Database (1 migration)
New table `coach_plans` (household-scoped, RLS):
- `id uuid pk`, `household_id uuid`, `user_id uuid`
- `status text` ('in_progress' | 'completed')
- `current_step int` default 1
- `answers jsonb` — `{ "1": {...}, "2": {...}, ... }` keyed by card number
- `generated_plan jsonb` — AI output (priorities, timeline, per-card actions)
- `generated_at timestamptz`, `created_at`, `updated_at`
- Standard RLS via `is_household_member()`, GRANTs to authenticated + service_role.
- Trigger `update_updated_at_column`.

## Edge function
`supabase/functions/generate-coach-plan/index.ts`
- Auth via JWT, loads household context + the saved `answers`.
- Calls Lovable AI (`google/gemini-3-flash-preview`) with tool calling to return a structured JSON plan: `{ summary, top_priorities[], thirty_day[], sixty_day[], ninety_day[], per_card: { "1": {...} } }`.
- Saves to `coach_plans.generated_plan`, sets `status='completed'`.
- Returns the JSON.

## Frontend (new files)
- `src/hooks/use-coach-plan.ts` — query + mutations (start, saveAnswers, complete, fetchLatest).
- `src/components/coach/CoachPlanBanner.tsx` — replaces `CoachHowToUse`. Shows progress ring, Start/Resume/View Plan CTA based on status.
- `src/components/coach/CoachPlanWizard.tsx` — dialog with step header, progress bar, Back/Next/Skip. Renders the per-card step component.
- `src/components/coach/wizard-steps/` — one file per card (1–12). Each exports a small form (RadioGroup / Slider / Input / Textarea) for that card's questions. Branching rules live here (a step can `return null` to auto-skip).
- `src/pages/CoachPlan.tsx` — renders `generated_plan` with sections + Download PDF (uses existing pdf skill / `jspdf` already in project, or `react-pdf`).
- Route `/coach/plan` added to App router.

## Question design (1 per card shown; 2–4 each)
Examples (concise — full bank lives in `wizard-steps/`):
1. **What happened** — "How did last month's spending feel?" (on-track / a-little-off / way-off)
2. **Why** — "Most likely cause?" (one-time / lifestyle creep / income timing / budget unrealistic)
3. **Recovery** — "Preferred recovery style?" (fast / balanced / system / wealth)
4. **Prevention** — "Set guard rules for which categories?" (multi-select from their categories)
5. **Purchase Guard** — "Threshold for cooling-off?" (slider $25–$500)
6. **Money Leaks** — "Auto-cancel detected leaks?" (yes / review-each)
7. **Safe-to-Spend** — "Comfort buffer %?" (slider 5–35)
8. **Adaptive Buffer** — "Allow Coach to auto-adjust buffer?" (yes / no)
9. **Paycheck Deployment** — "Pay frequency + next paycheck date"
10. **Bill Timing** — "Biggest bill stress week of month?"
11. **Wealth Redirector** — "When surplus appears, send to?" (debt / emergency / invest / split)
12. **Mode** — "Pick your operating mode" (Guardrail / Balanced / Green Light)

## Replace
- Remove `<CoachHowToUse />` import + render in `src/pages/MoneyCoach.tsx`; render `<CoachPlanBanner />` in its place. Keep `CoachHowToUse.tsx` file deleted (one-line cleanup).

## Files
**Created:**
- `supabase/migrations/<ts>_coach_plans.sql`
- `supabase/functions/generate-coach-plan/index.ts`
- `src/hooks/use-coach-plan.ts`
- `src/components/coach/CoachPlanBanner.tsx`
- `src/components/coach/CoachPlanWizard.tsx`
- `src/components/coach/wizard-steps/Step01..Step12.tsx` (12 small files)
- `src/components/coach/wizard-steps/index.ts` (registry + branching map)
- `src/pages/CoachPlan.tsx`

**Edited:**
- `src/pages/MoneyCoach.tsx` (swap banner)
- `src/App.tsx` (add `/coach/plan` route)

**Deleted:**
- `src/components/coach/CoachHowToUse.tsx`

## Out of scope (won't do unless asked)
- Auto-applying answers to actual budgets/guard rules/mode settings (questionnaire only writes the plan; user still acts on it from the cards).
- Editing individual answers after completion (only Restart for now).
- Sharing/email of the plan.

Heads up: this is a Large scope build (15+ new files, schema + edge function + AI). Expect meaningful credit usage.
