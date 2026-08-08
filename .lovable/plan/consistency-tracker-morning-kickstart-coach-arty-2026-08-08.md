# Consistency Tracker + Morning Kickstart + Coach Arty

Three additions that reinforce each other: a guided morning ritual (with prayer/meditation built in, not a separate tab), a voice-coached workout timer, and a points/streak consistency score fed by both.

## 1. Morning Kickstart module (right rail on Health page)

A single card with an ordered daily ritual. Each step checks off, writes to the real health tables, and advances a progress ring. Resets daily.

Default sequence:
1. **Wake + Prayer / Meditation** — pick Prayer, Meditation, Scripture, Gratitude, or Breathwork; choose minutes (3 / 5 / 10 / custom); optional one-line intention. Built-in countdown timer with a calm ring.
2. **Hydrate** — 16 oz on waking, logged into the existing hydration total.
3. **Healthy breakfast** — one tap logs a saved breakfast or opens the meal logger.
4. **Total Gym session** — launches the Coach Arty guided timer below.
5. **Walk** — logs distance/minutes into cardio and energy balance.
6. **Supplements** — the Veyttisy 50+ check-off.

Behavior: steps are sequential but skippable; header shows "Kickstart 4/6" with a progress ring; completing all steps awards bonus points. Sticky right column on desktop, compact card above tab content on mobile. A condensed "days started with prayer" streak strip also appears on the Family Legacy page.

Prayer/meditation minutes and the day's intention are stored on the daily log, with a 7-day reflection list in the card.

## 2. Coach Arty — guided exercise timer with voice narration

A workout player that runs any exercise from the Total Gym library or a cardio session, keeping you on pace and talking you through it.

- **Set / rep / rest engine**: pick exercise, sets, target reps, work seconds (or rep-paced), and rest seconds. Big countdown ring, current set indicator ("Set 2 of 3 — 12 reps"), auto-advance from work to rest to next set, plus pause / skip / restart.
- **Coach Arty voice**: spoken cues at each transition — "Set two, twelve reps, go", a mid-set rep count, "Ten seconds left", "Rest — take a breath", "Grab water", and a closing summary with calories burned. Personality is encouraging and steady, with rotating motivational lines so it doesn't sound canned.
- **Hydration prompts**: a water reminder every N minutes during the session; tapping it logs 8 oz straight into your hydration total.
- **Rest-period guidance**: breathing cue and next-exercise preview during rest.
- **Circuit mode**: queue several exercises into one session and Arty walks the whole circuit.
- **Finish**: logs sets, reps, duration, and calories into the exercise/daily log so the Energy Report and Consistency Tracker pick it up automatically, then Arty gives a spoken wrap-up.
- Mute toggle, voice volume, and a "cues only / full coaching" verbosity setting; all timers keep running with the screen awake where supported.

## 3. Consistency Tracker (dashboard + health)

Scores the last 30 days on habits you already log: meals logged, calories at or under 1,700, movement (steps goal or a logged session), water at goal, and Kickstart completed.

Outputs consistency % (7 and 30 day), current and best streak, total points, level (Bronze → Diamond), points to next level, and the weakest habit of the week. Card shows a consistency ring, level badge, streak flame, habit chips, a 30-day dot heat strip, progress to next level, earned badges (7/30/100-day streaks, 1k/5k/10k points), and one data-driven motivation line. Mounted on the main dashboard and atop the Health dashboard.

## Health + wealth legacy positioning (my read)

The ritual, the coach, and the score are the daily hook. These would make the health-and-legacy half genuinely stand out — not built in this pass unless you say so:

1. **Longevity Dividend** — translate added healthy years into dollars: extra earning years, delayed drawdown, lower projected healthcare cost.
2. **Combined Legacy Score** — one 0–100 index blending Legacy Worth, foundation readiness, and health consistency, with a printable one-pager.
3. **Habit-to-dollars loop** — "consistency saved $X this month" from cook-at-home streaks, routed to the debt/investing plan.
4. **Cross-domain streaks** — one streak system spanning health logging, budget check-ins, and debt payments.
5. **Faith and legacy layer** — prayer streaks, intentions, and health milestones recorded into the family legacy timeline beside the financial ones.

## Technical notes

- Schema: one migration adding ritual/workout fields to `health_daily_logs` (`mindfulness_minutes`, `mindfulness_type`, `intention_note`, `kickstart_steps` jsonb, `workout_sessions` jsonb). No new tables.
- New `src/lib/health/kickstart.ts` (step definitions, completion, points), `src/lib/health/consistency.ts` (pure scoring), and `src/lib/health/coachArty.ts` (timer state machine + cue script generation).
- New components: `MorningKickstartCard.tsx`, `CoachArtyTimer.tsx` (dialog player launched from the Total Gym and cardio cards), `ConsistencyTrackerCard.tsx`.
- Voice: a `coach-voice` edge function calling Lovable AI text-to-speech (streamed, short cached phrases for repeated cues like "Rest" and "Grab water" so it doesn't regenerate every set), with browser speech synthesis as the offline fallback. Mute stops all requests.
- Layout change in `src/pages/health/HealthDashboard.tsx` to a content + sticky right-rail grid; compact variants in `src/pages/Dashboard.tsx` and `src/pages/FamilyLegacy.tsx`.
- Reuses existing hooks (`useHealthLogs`, `useSaveDailyLog`, `useHealthMeals`, `useHealthProfile`) and existing drinks/cardio/Total Gym log paths. Semantic tokens only, skeletons while loading.
