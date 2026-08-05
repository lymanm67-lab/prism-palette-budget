# Montgomery Longevity OS

Upgrade the existing Health, Wellness & Longevity module into a 13-pillar longevity operating system, branded Montgomery Longevity OS, with a Montgomery Longevity Score, Total Gym strength training, expanded nutrition libraries, habit tracking, and a Sunday CEO Health Report.

## What already exists (verified)

- `/health` with 13 tabs: Command Center, Nutrition, Meal Prep, Grocery Budget, Sleep & Recovery, Preventive Care, Milestones, Trends, Performance, Longevity, AI Coach, Apple Health Import, Profile.
- Tables: `health_profile`, `health_daily_logs`, `health_vitals`, `health_milestones`, `health_achievements`, `health_meals`, `health_meal_prep`, `health_coach_reports`, `health_preventive_care`, `health_medical_documents`.
- `health_profile` goals today: protein 140g, water 100oz, 3.5 mi/day, 6 walk days, veg/fruit servings. **No calorie, fiber, sodium, or added-sugar goals.**
- `health_daily_logs` covers walking, protein, water, veg/fruit, weight, sleep, energy/focus/stress/mood. **No strength training, mobility, stretching, brain, relationship, purpose, or gratitude fields.**
- Weekly Health Score exists but only scores 5 inputs (walking 30, nutrition 30, protein 20, water 10, tracking 10). No 13-pillar score, no trend over months.
- No strength-training table or Total Gym tracking anywhere.
- AI coach edge function `health-coach` supports daily/weekly/monthly briefs. No Sunday automation, no CEO report shape.

## Build phases

Because this spans schema, engine, UI, and AI, it ships in four phases. Each phase is usable on its own.

### Phase 1 — Foundation, Targets & Pillar Scoring

**Database**
- Extend `health_profile`: `calorie_goal`, `fiber_goal_g`, `added_sugar_limit_g`, `sodium_limit_mg`, `sleep_goal_hours`, `strength_days_per_week`, `stretch_minutes_goal`, `mobility_minutes_goal`, `longevity_target_age`. Seed to the stated targets (1,700 cal / 130–150g protein / 35–40g fiber / 90–100oz water / <25g sugar / <2,300mg sodium / 7.5–8h sleep / 3 strength days / 10 min stretch / 10 min mobility / age 100).
- Extend `health_daily_logs` with pillar inputs: `fiber_g`, `added_sugar_g`, `sodium_mg`, `calories`, `stretch_minutes`, `mobility_minutes`, `standing_minutes`, `strength_completed`, `reading_minutes`, `learning_minutes`, `prayer_meditation_minutes`, `gratitude_logged`, `family_time_minutes`, `service_or_mentoring`, `purpose_work_minutes`, `outdoors_minutes`, `balance_practice`.
- New `health_longevity_scores` table: one row per day with the total score plus each pillar sub-score, so trends over months and years can be charted.

**Engine (`src/lib/health/longevityScore.ts`)**
- Montgomery Longevity Score 0–100 across the 13 pillars, each pillar normalized 0–1 then weighted. Weighting favors the pillars with the strongest healthspan evidence: body composition, strength, cardio, nutrition, sleep, preventive care carry the most; brain, relationships, purpose, stress, movement, growth, financial carry the rest.
- Pillar 13 (Financial Wellness) reads existing app data — net worth, emergency fund, debt, retirement progress — rather than asking for re-entry.
- Consistency multiplier rewards streaks over single perfect days.

**UI**
- Rebrand the `/health` header to Montgomery Longevity OS with the mission line "Live Beyond 100. Stay Strong. Stay Independent. Continue Serving. Build a Legacy."
- New "Longevity Score" hero card on the Command Center: score, band, 13-pillar radial/bar breakdown, and a month-over-month trend line.
- Extend Quick Log with the new daily inputs, grouped by pillar and collapsed so daily logging stays fast.
- Profile tab gains the new goal fields.

### Phase 2 — Nutrition & Meal System

- Expand libraries in `healthEngine.ts`: full breakfast (3 options as specified, including the occasional Polish sausage capped at once per two weeks), lunch (chicken/shrimp bowls, turkey wraps, salads, vegetable bowls, **plus the 1/2 Polish sausage with mustard and light mayo on 45-calorie whole wheat bread**), dinner (chicken/shrimp/salmon/turkey with brown rice, sweet potato, broccoli, cauliflower, green beans, asparagus), and snacks (apples, oranges, bananas, almonds, string cheese, hard-boiled eggs, celery with peanut butter).
- Foods-to-avoid watchlist that flags soft drinks, sugary drinks, processed snacks, desserts, and fried food when logged.
- Calorie, fiber, sodium, and added-sugar rings alongside the existing protein/water rings, tuned to the 1,700 cal / 35–40g fiber targets.
- Grocery planner upgrade: auto-generated weekly list from the chosen meal plan, cost estimate against the existing grocery budget integration, healthier substitutions, seasonal produce, and restaurant / healthy fast-food guidance.

### Phase 3 — Total Gym Strength & Movement

- New `health_strength_workouts` and `health_strength_sets` tables: exercise, resistance level, sets, reps, duration, muscle groups, calories, personal-record flag.
- Total Gym exercise library with progressive overload logic that raises resistance or reps as recent sets clear the target range.
- Weekly schedule board matching the stated split (Mon upper, Tue mobility, Wed lower, Thu stretching, Fri full body, Sat recovery, Sun prep + stretch), showing today's assignment and completion state.
- Strength dashboard: workout streaks, sessions per week vs 3-day goal, PR history, muscle-group balance, estimated strength trend.
- Stretching, mobility, balance, and standing time surfaced as a Daily Movement card.

### Phase 4 — AI Coaching, CEO Report & Milestones

- Rewrite the `health-coach` edge function context to include all 13 pillars, the longevity score history, strength data, and vitals, and add a `ceo_weekly` report shape covering every item in the spec: score, wins, weight and waist progress, nutrition and protein/fiber averages, walking miles, strength sessions, sleep average, recovery, medical reminders, suggested improvements, next-week priorities, estimated timeline to 160 lbs, and projected blood-pressure / blood-sugar / cardio improvements.
- Sunday 12:00 UTC scheduled job generates and stores the CEO report so it is waiting when the user opens the app.
- AI prediction panel: projected weight curve, projected body fat, expected health improvements, behavior-pattern read, and habit-driven risk flags — all grounded in logged data only.
- Habit tracker grid (walking, protein, water, sleep, stretching, reading, prayer, gratitude, meal prep, weight tracking, strength, recovery) with streaks.
- Milestone system extended: walk counts (100/250/500), 1,000 miles walked, 100 Total Gym workouts, one year healthy eating, and birthday milestones ages 60 through 100.

## Technical notes

- All new tables are household-scoped with RLS via `is_household_member`, soft deletes, `updated_at` triggers, and GRANTs, matching the existing health tables.
- Score math lives in a pure engine module so it can be unit tested and reused by the edge function.
- AI calls run server-side through the existing edge function pattern; every number in a report must come from the supplied data block, and every report keeps the "not medical advice, consult your physician" line.
- Styling stays on existing semantic prism tokens and glassmorphism — no new hardcoded colors.

## Scope note

The lunch option you added (1/2 Polish sausage with mustard and light mayo on 45-calorie whole wheat bread) lands in Phase 2. Say the word and I can drop it in immediately as a standalone one-line change instead of waiting.
