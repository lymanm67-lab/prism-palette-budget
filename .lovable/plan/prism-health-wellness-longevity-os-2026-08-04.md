# PRISM Health, Wellness & Longevity OS

A new top-level module at `/health` that treats health like a portfolio: daily deposits (walks, protein, water), compounding milestones, and links into budget, retirement, and legacy.

**Scope: Large.** Built in 3 phases so each phase is usable on its own. Say "go" and I start with Phase 1; I'll continue into 2 and 3 unless you stop me.

## Phase 1 — Foundation & daily command center

- Database (household-scoped, RLS + soft-delete, same pattern as existing modules):
  - `health_profile` — start/current/goal weight (220 → 160), height, timeline target, waist, body fat, birthdate
  - `health_daily_logs` — one row per day: miles, steps, active minutes, pace, protein g, water oz, veg/fruit servings, limits/eliminations adherence, weight, sleep, energy, focus, stress, mood
  - `health_vitals` — BP, heart rate, glucose, A1C, cholesterol, waist, body fat (dated entries)
  - `health_milestones` — 220/210/200/190/180/170/160 with estimated date, actual date, days early/late, reward
  - `health_achievements` — earned badges
- Engine `src/lib/health/healthEngine.ts`: BMI, body-fat estimate, lbs lost/remaining, goal %, projected goal date from trailing loss rate, weekly Health Score (walking 30 / nutrition 30 / protein 20 / water 10 / weight tracking 10), streaks, calories & fat burned from miles + weight.
- `/health` dashboard: hero weight card, Health Score gauge, walking progress ring (3.5 mi × 6 days), protein/water rings, streak strip, motivation rotator.
- **Quick Log** panel — the daily entry surface (miles, protein, water, water +8oz taps, weight, mood/energy sliders).
- Sidebar: new "Health & Longevity" section with Dashboard + Log entries.

## Phase 2 — Nutrition, meals, groceries, milestones

- **Signature Power Bowl builder**: pick protein (chicken/shrimp/turkey), veg multi-select, carb base (½ c rice / half-and-half / cauliflower only), seasoning. Auto-computes calories, protein, carbs, fiber, fats and flags the 35–45 g protein target. Saves the bowl as a logged meal.
- **Breakfast builder** with your two options and protein totals.
- **Sunday meal prep planner**: generated cook/prep checklist, containers packed, meals remaining, days covered, food inventory, auto shopping list.
- **Grocery budget integration**: reads your existing grocery category budget + actual transactions to show monthly budget, spend, remaining, avg cost/meal, cost per gram of protein, and healthy-spend trend. Honors the existing grocery-reimbursement netting rule.
- **Milestones & rewards**: milestone table with estimated vs actual date, days early/late, reward (shoes → clothing → wardrobe → tracker → photo session/assessment/celebration), auto-marked when a logged weight crosses each line.
- **Achievement badges**: mileage (first/25/100/250/500/1000), weight-loss tiers, maintenance 90-day and 1-year awards.

## Phase 3 — Trends, productivity link, longevity, AI coach

- **Trends tab**: weekly / monthly / annual charts for weight, miles, protein, water, vitals; highlight improving vs declining metrics.
- **Productivity connection**: correlate walking-consistency weeks against energy, focus, and revenue logs; surface insights like "weeks with 6 walks → productivity +18%".
- **Longevity & retirement tab**: healthy life expectancy estimate, projected medical-cost savings at goal weight, healthcare spending trend, years of independent living, Healthy Aging Score — with the dollar savings fed into the existing retirement/legacy projections as a labeled assumption.
- **AI Health Coach** (edge function on Lovable AI, grounded strictly in your logged data): Daily Brief (today's walk goal, prep reminders, protein/water remaining, motivation), Weekly Review (wins, challenges, improvements), Monthly Executive Health Review (weight change, walking, nutrition compliance, protein avg, water, budget performance, score, improving/attention areas, next-month plan) with a printable report.

## Technical notes

- All tables `household_id`-scoped with GRANTs + RLS via `is_household_member`, `updated_at` triggers, `deleted_at` soft-delete — matching the medical-housing/THV modules.
- One `use-health.ts` hook orchestrates fetch/mutate with `useRealtimeRefresh`; 1k-row pagination for log history.
- Uses existing semantic tokens (`prism-teal`, `prism-lime`, `prism-amber`, `prism-navy`, `prism-on-dark`) — no hardcoded colors, dark-mode safe, mobile-first, lazy-loaded routes.
- Grocery figures derive from `transactions`/`budgets` (transfers and soft-deleted rows excluded); no duplicate spend data stored.
- Manual logging only — no wearable/device sync in these phases.

## Open items I'll assume unless you say otherwise

- Height for BMI and current waist/body-fat baseline: prompted in a one-time setup card on first visit.
- Revenue/productivity numbers come from your existing business data plus a simple daily focus/energy rating you log.
