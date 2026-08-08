# Consistency Tracker + Morning Kickstart Ritual

Two additions that reinforce each other: a points/streak consistency score, and a guided morning sequence that produces the very logs that score feeds on. The Kickstart lives as a right-rail module on the Health, Wellness & Longevity page — not a separate tab — so it appears alongside whatever tab you are on.

## 1. Morning Kickstart module (right rail)

A single card with an ordered daily ritual. Each step checks off, writes to the real health tables, and advances a progress ring. Resets daily.

Default sequence:
1. **Wake + Prayer / Meditation** — pick Prayer, Meditation, Scripture, Gratitude, or Breathwork; choose minutes (3 / 5 / 10 / custom); optional one-line intention or gratitude note. Includes a built-in countdown timer with a calm ring so you can actually sit with it in-app.
2. **Hydrate** — 16 oz on waking, logged straight into the existing hydration/drinks total.
3. **Healthy breakfast** — one tap logs a saved breakfast (eggs + wheat toast omelette, oatmeal with almond milk, etc.) or opens the meal logger.
4. **Total Gym session** — one tap opens the Total Gym flow, or logs today's suggested routine.
5. **Walk** — logs a walk with distance/minutes into cardio and the energy balance.
6. **Supplements** — the Veyttisy 50+ gummies check-off.

Card behavior:
- Steps are sequential but skippable; a skipped step is marked, not blocked.
- Header shows "Kickstart 4/6" with a progress ring and time of completion.
- Finishing all steps awards bonus points and a short affirming line.
- On the desktop layout it sits in a sticky right column next to the tab content; on mobile it collapses to a compact card pinned above the tab content.
- A condensed "Kickstart" summary strip also appears on the Family Legacy page (spiritual/legacy framing: streak of days started with prayer), since that page already carries the legacy narrative.

Spiritual logging: prayer/meditation minutes and the day's intention are stored on the daily log so streaks and reflections accumulate over time, with a short 7-day reflection list inside the card.

## 2. Consistency Tracker (dashboard + health)

Scores the last 30 days on the habits you already log:
- Meals logged, calories at or under the 1,700 goal
- Movement (steps goal met, or a cardio / Total Gym session)
- Water at or above the daily oz goal
- Kickstart completed (prayer/meditation done)

Outputs consistency % (7 and 30 day), current and best streak, total points, level (Bronze → Diamond), points to next level, and the weakest habit of the week.

Card shows: consistency ring, level badge, streak flame, habit chips with this-week hit rate, a 30-day dot heat strip, a progress bar to the next level, earned badges (7/30/100-day streaks, 1k/5k/10k points), and one data-driven motivation line. It appears on the main dashboard and at the top of the Health dashboard.

## Health + wealth legacy positioning (my read)

The ritual and score are the daily hook; these are what would make the health-and-legacy half genuinely stand out. Not built in this pass unless you say so:

1. **Longevity Dividend** — translate added healthy years into dollars: extra earning years, delayed drawdown, lower projected healthcare cost. No competitor connects health streaks to net-worth projections.
2. **Combined Legacy Score** — one 0–100 index blending Legacy Worth, foundation readiness, and health consistency, with a printable one-pager.
3. **Habit-to-dollars loop** — surface "consistency saved $X this month" from cook-at-home streaks and route it to the debt/investing plan.
4. **Cross-domain streaks** — one streak system spanning health logging, budget check-ins, and debt payments.
5. **Faith and legacy layer** — prayer streaks, intentions, and health milestones recorded into the family legacy timeline beside the financial ones.

## Technical notes

- Schema: add spiritual/ritual fields to `health_daily_logs` (`mindfulness_minutes`, `mindfulness_type`, `intention_note`, `kickstart_steps` jsonb) via one migration. No new table needed.
- New `src/lib/health/kickstart.ts` (step definitions, completion state, points) and `src/lib/health/consistency.ts` (pure scoring from daily logs + meals + profile goals).
- New components: `MorningKickstartCard.tsx` (with in-card meditation timer), `ConsistencyTrackerCard.tsx`.
- Layout change in `src/pages/health/HealthDashboard.tsx` to a content + sticky right-rail grid; compact variants mounted in `src/pages/Dashboard.tsx` and `src/pages/FamilyLegacy.tsx`.
- Reuses existing hooks (`useHealthLogs`, `useSaveDailyLog`, `useHealthMeals`, `useHealthProfile`) and existing drinks/cardio/Total Gym log paths — no duplicate logging logic. Semantic tokens only, skeletons while loading.
