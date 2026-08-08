// Consistency scoring: turns the health logs you already keep into a points,
// level and streak system. Pure functions — no data fetching here.
import { addDays, todayISO, type DailyLog, type HealthProfile } from '@/lib/health/healthEngine';

export const CALORIE_GOAL = 1700;

export type HabitKey = 'meals' | 'calories' | 'movement' | 'water' | 'kickstart';

export const HABITS: { key: HabitKey; label: string; short: string }[] = [
  { key: 'meals', label: 'Meals logged', short: 'Meals' },
  { key: 'calories', label: 'Calories at or under goal', short: 'Calories' },
  { key: 'movement', label: 'Movement (walk or workout)', short: 'Move' },
  { key: 'water', label: 'Water at goal', short: 'Water' },
  { key: 'kickstart', label: 'Morning Kickstart done', short: 'Kickstart' },
];

export const POINTS_PER_HABIT = 20;
export const PERFECT_DAY_BONUS = 25;

export type DayScore = {
  date: string;
  hits: Record<HabitKey, boolean>;
  hitCount: number;
  points: number;
  perfect: boolean;
  logged: boolean;
};

export type LevelInfo = {
  name: string;
  index: number;
  floor: number;
  next: number | null;
  pointsToNext: number | null;
  progressPct: number;
};

const LEVELS: { name: string; floor: number }[] = [
  { name: 'Bronze', floor: 0 },
  { name: 'Silver', floor: 750 },
  { name: 'Gold', floor: 2000 },
  { name: 'Platinum', floor: 5000 },
  { name: 'Diamond', floor: 10000 },
];

export function levelFor(points: number): LevelInfo {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i += 1) if (points >= LEVELS[i].floor) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] ?? null;
  const span = next ? next.floor - cur.floor : 1;
  return {
    name: cur.name,
    index: idx,
    floor: cur.floor,
    next: next?.floor ?? null,
    pointsToNext: next ? Math.max(0, next.floor - points) : null,
    progressPct: next ? Math.min(100, ((points - cur.floor) / span) * 100) : 100,
  };
}

export type MealRow = { meal_date?: string | null; calories?: number | null; meal_type?: string | null };

export type ConsistencySummary = {
  days: DayScore[]; // oldest → newest, window length
  pct7: number;
  pct30: number;
  streak: number;
  bestStreak: number;
  totalPoints: number;
  weekPoints: number;
  prevWeekPoints: number;
  level: LevelInfo;
  weekHitRate: Record<HabitKey, number>; // 0..1 over last 7 days
  weakest: { key: HabitKey; label: string; hits: number } | null;
  badges: { key: string; label: string; earned: boolean }[];
  motivation: string;
  hasData: boolean;
};

function scoreDay(
  date: string,
  log: DailyLog | undefined,
  mealsCalories: number,
  mealCount: number,
  waterGoal: number,
  stepsGoal: number,
): DayScore {
  const any = (log ?? {}) as any;
  const kickstartSteps = any.kickstart_steps ?? {};
  const kickstartDone =
    typeof kickstartSteps === 'object' && kickstartSteps
      ? Object.values(kickstartSteps).filter(Boolean).length >= 4
      : false;

  const movement =
    Number(any.miles ?? 0) > 0 ||
    Number(any.minutes_walked ?? 0) >= 15 ||
    Number(any.exercise_calories ?? 0) > 0 ||
    Number(any.steps ?? 0) >= stepsGoal;

  const hits: Record<HabitKey, boolean> = {
    meals: mealCount > 0,
    calories: mealsCalories > 0 && mealsCalories <= CALORIE_GOAL,
    movement,
    water: Number(any.water_oz ?? 0) >= waterGoal * 0.9,
    kickstart: kickstartDone,
  };

  const hitCount = Object.values(hits).filter(Boolean).length;
  const perfect = hitCount === HABITS.length;
  return {
    date,
    hits,
    hitCount,
    points: hitCount * POINTS_PER_HABIT + (perfect ? PERFECT_DAY_BONUS : 0),
    perfect,
    logged: !!log || mealCount > 0,
  };
}

export function buildConsistency(
  logs: DailyLog[],
  meals: MealRow[],
  profile: HealthProfile | null,
  windowDays = 30,
): ConsistencySummary {
  const waterGoal = profile?.water_goal_oz ?? 100;
  const stepsGoal = 7000;
  const today = todayISO();

  const logByDate = new Map<string, DailyLog>();
  for (const l of logs) logByDate.set(l.log_date, l);

  const mealAgg = new Map<string, { cal: number; count: number }>();
  for (const m of meals) {
    if (!m.meal_date) continue;
    if (m.meal_type === 'drink') continue;
    const cur = mealAgg.get(m.meal_date) ?? { cal: 0, count: 0 };
    cur.cal += Number(m.calories) || 0;
    cur.count += 1;
    mealAgg.set(m.meal_date, cur);
  }

  // Full history for lifetime points and best streak.
  const allDates = new Set<string>([...logByDate.keys(), ...mealAgg.keys()]);
  const sortedAll = [...allDates].sort();
  const allScores = sortedAll.map((d) => {
    const agg = mealAgg.get(d) ?? { cal: 0, count: 0 };
    return scoreDay(d, logByDate.get(d), agg.cal, agg.count, waterGoal, stepsGoal);
  });
  const totalPoints = allScores.reduce((s, d) => s + d.points, 0);

  // Rolling window ending today.
  const days: DayScore[] = [];
  for (let i = windowDays - 1; i >= 0; i -= 1) {
    const d = addDays(today, -i);
    const agg = mealAgg.get(d) ?? { cal: 0, count: 0 };
    days.push(scoreDay(d, logByDate.get(d), agg.cal, agg.count, waterGoal, stepsGoal));
  }

  const pctOf = (n: number) => {
    const slice = days.slice(-n);
    const possible = slice.length * HABITS.length;
    const got = slice.reduce((s, d) => s + d.hitCount, 0);
    return possible ? Math.round((got / possible) * 100) : 0;
  };

  // Streaks: a day counts when 2+ habits hit.
  const isOn = (d: DayScore) => d.hitCount >= 2;
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    if (isOn(days[i])) streak += 1;
    else if (i === days.length - 1) continue; // today not done yet doesn't break it
    else break;
  }
  let bestStreak = 0;
  let run = 0;
  let prevDate: string | null = null;
  for (const d of allScores) {
    const contiguous = prevDate ? addDays(prevDate, 1) === d.date : true;
    run = isOn(d) ? (contiguous ? run + 1 : 1) : 0;
    bestStreak = Math.max(bestStreak, run);
    prevDate = d.date;
  }
  bestStreak = Math.max(bestStreak, streak);

  const weekPoints = days.slice(-7).reduce((s, d) => s + d.points, 0);
  const prevWeekPoints = days.slice(-14, -7).reduce((s, d) => s + d.points, 0);

  const week = days.slice(-7);
  const weekHitRate = HABITS.reduce((acc, h) => {
    acc[h.key] = week.length ? week.filter((d) => d.hits[h.key]).length / week.length : 0;
    return acc;
  }, {} as Record<HabitKey, number>);

  const weakestHabit = [...HABITS].sort((a, b) => weekHitRate[a.key] - weekHitRate[b.key])[0];
  const weakest = weakestHabit
    ? {
        key: weakestHabit.key,
        label: weakestHabit.label,
        hits: week.filter((d) => d.hits[weakestHabit.key]).length,
      }
    : null;

  const badges = [
    { key: 'streak_7', label: '7-day streak', earned: bestStreak >= 7 },
    { key: 'streak_30', label: '30-day streak', earned: bestStreak >= 30 },
    { key: 'streak_100', label: '100-day streak', earned: bestStreak >= 100 },
    { key: 'points_1k', label: '1,000 points', earned: totalPoints >= 1000 },
    { key: 'points_5k', label: '5,000 points', earned: totalPoints >= 5000 },
    { key: 'points_10k', label: '10,000 points', earned: totalPoints >= 10000 },
    { key: 'perfect_day', label: 'Perfect day', earned: allScores.some((d) => d.perfect) },
    {
      key: 'perfect_week',
      label: 'Perfect week',
      earned: week.length === 7 && week.every((d) => d.perfect),
    },
  ];

  const hasData = allScores.some((d) => d.hitCount > 0);
  let motivation: string;
  if (!hasData) motivation = 'Log today to start your first streak — one day is all it takes to begin.';
  else if (streak >= 7) motivation = `${streak} days in a row. This is what compounding looks like.`;
  else if (weakest && weakest.hits <= 3)
    motivation = `${weakest.label} is your weak link — ${weakest.hits} of the last 7 days.`;
  else if (weekPoints > prevWeekPoints)
    motivation = `Up ${weekPoints - prevWeekPoints} points on last week. Keep the pace.`;
  else motivation = 'One clean day resets everything. Pick the next habit and hit it.';

  return {
    days,
    pct7: pctOf(7),
    pct30: pctOf(30),
    streak,
    bestStreak,
    totalPoints,
    weekPoints,
    prevWeekPoints,
    level: levelFor(totalPoints),
    weekHitRate,
    weakest,
    badges,
    motivation,
    hasData,
  };
}
