# Consistency Tracker + Gamification

Add a Consistency Tracker card to the main dashboard that scores how consistently you hit nutrition, movement, and hydration targets, turns it into points and levels, and links back into the Health OS.

## What gets built

**1. Consistency engine (new, frontend logic)**
Scores each of the last 30 days on up to 4 habits, using data already logged:
- Meals logged (from health meals for that date)
- Calories at or under the 1,700 goal
- Movement (steps goal met, or any cardio / Total Gym session logged)
- Water at or above the daily oz goal

Per day: each habit hit = 25 points, plus a bonus for a perfect day. Outputs:
- Consistency % (last 7 and 30 days)
- Current streak and best streak (a day counts as "on" when 2+ habits hit)
- Total points, level (Bronze / Silver / Gold / Platinum / Diamond thresholds), points to next level
- Weekly points vs previous week, and the weakest habit of the week

**2. Dashboard card (`ConsistencyTrackerCard`)**
Placed on the main dashboard near the health/goal widgets:
- Big consistency ring (7-day %) with level badge and point total
- Streak flame with current / best streak
- 4 habit chips showing this week's hit rate per habit
- 30-day dot grid heat strip (perfect / partial / missed days)
- Progress bar to next level, plus one rotating motivation line driven by the data ("Water is your weak link this week — 3 of 7 days")
- Badge row for milestones (7-day, 30-day, 100-day streaks; 1k / 5k / 10k points)
- Tap-through to the Health dashboard; hidden gracefully with a "start logging" prompt when there is no health data yet

**3. Mirror inside Health OS**
The same card at the top of the Health Dashboard tab so the score is visible where you log, no duplicate logic.

## Health + wealth legacy positioning (my read)

The card is small; the differentiator is tying the two halves together. Recommended follow-on work, in priority order (not built in this pass unless you say so):

1. **Longevity Dividend** — one number that says what added healthy years are worth: extra earning years, delayed drawdown, lower projected healthcare cost. This is the single most marketable idea in the app because no competitor connects health streaks to net-worth projections.
2. **Combined Legacy Score** — one 0–100 index blending the financial Legacy Worth engine, foundation readiness, and health consistency, with a shareable/printable one-pager.
3. **Habit-to-dollars loop** — cooking-at-home streaks already reduce grocery/dining spend; surface "consistency saved $X this month" and route it to the debt/investing plan.
4. **Cross-domain streaks** — one streak system covering health logging, budget check-ins, and debt payments, with shared points and levels.
5. **Family/legacy layer** — health and wealth milestones recorded into the family legacy timeline so heirs see both.

## Technical notes

- New `src/lib/health/consistency.ts` — pure scoring functions with unit-testable inputs (daily logs, meals, profile goals).
- New `src/components/health/ConsistencyTrackerCard.tsx` — uses `useHealthLogs`, `useHealthMeals`, `useHealthProfile`; semantic tokens only, skeleton while loading.
- Mount in `src/pages/Dashboard.tsx` and `src/components/health/HealthDashboardTab.tsx`.
- No schema changes: points, levels, and streaks are derived from existing `health_daily_logs` and `health_meals` rows. Badges are computed, not stored, so nothing needs backfilling.
