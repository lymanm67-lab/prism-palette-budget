// Walking program: 6 days a week, 1–3 miles a day, 12–16 miles a week.
// Progressive targets — build the habit before chasing maximum mileage.
import {
  addDays,
  formatPace,
  monthKey,
  paceMinPerMile,
  todayISO,
  weekStart,
  type DailyLog,
  type HealthProfile,
} from './healthEngine';

export const WEEKLY_MILE_TARGET = { min: 12, max: 16 };
export const WALK_DAYS_GOAL = 6;

export type ScheduleDay = {
  dow: number; // 1 = Monday
  day: string;
  miles: number;
  strength: boolean;
  note: string;
  rest: boolean;
};

export const WEEK_SCHEDULE: ScheduleDay[] = [
  { dow: 1, day: 'Monday', miles: 2, strength: true, note: '2 miles + Total Gym', rest: false },
  { dow: 2, day: 'Tuesday', miles: 3, strength: false, note: '3 miles', rest: false },
  { dow: 3, day: 'Wednesday', miles: 1.5, strength: true, note: '1–2 miles + Total Gym', rest: false },
  { dow: 4, day: 'Thursday', miles: 3, strength: false, note: '3 miles', rest: false },
  { dow: 5, day: 'Friday', miles: 2, strength: true, note: '2 miles + Total Gym', rest: false },
  { dow: 6, day: 'Saturday', miles: 3, strength: false, note: '3 miles', rest: false },
  { dow: 0, day: 'Sunday', miles: 0, strength: false, note: 'Rest, recovery, stretching or light recreation', rest: true },
];

const dowOf = (iso: string) => new Date(`${iso}T00:00:00`).getDay();

const sessionsOf = (log: Record<string, unknown> | undefined) =>
  Array.isArray(log?.workout_sessions) ? (log!.workout_sessions as Record<string, unknown>[]) : [];

export type WalkingProgram = {
  todayMiles: number;
  weekMiles: number;
  monthMiles: number;
  weekDaysWalked: number;
  monthDaysWalked: number;
  avgDaily: number | null;
  avgPace: number | null;
  avgPaceLabel: string;
  streak: number;
  longestStreak: number;
  weeklyTarget: number;
  weekProgressPct: number;
  daysGoalPct: number;
  week: {
    date: string;
    day: string;
    planned: number;
    note: string;
    rest: boolean;
    strengthPlanned: boolean;
    actualMiles: number;
    strengthDone: boolean;
    isToday: boolean;
    isFuture: boolean;
  }[];
  fourWeekAvg: number | null;
  nextTargetNote: string;
};

export function buildWalkingProgram(
  logs: DailyLog[],
  profile: HealthProfile | null,
): WalkingProgram {
  const today = todayISO();
  const ws = weekStart(today);
  const mk = monthKey(today);
  const byDate = new Map<string, DailyLog>();
  for (const l of logs ?? []) byDate.set(String(l.log_date), l);

  const milesOn = (d: string) => Number(byDate.get(d)?.miles) || 0;

  let weekMiles = 0;
  let weekDaysWalked = 0;
  const week = WEEK_SCHEDULE.slice()
    .sort((a, b) => ((a.dow || 7) - (b.dow || 7)))
    .map((s) => {
      const offset = (s.dow === 0 ? 7 : s.dow) - 1;
      const date = addDays(ws, offset);
      const actualMiles = milesOn(date);
      const strengthDone = sessionsOf(byDate.get(date) as never).some(
        (x) => String(x.kind ?? 'strength') === 'strength',
      );
      if (date <= today) {
        weekMiles += actualMiles;
        if (actualMiles > 0) weekDaysWalked += 1;
      }
      return {
        date,
        day: s.day,
        planned: s.miles,
        note: s.note,
        rest: s.rest,
        strengthPlanned: s.strength,
        actualMiles,
        strengthDone,
        isToday: date === today,
        isFuture: date > today,
      };
    });

  let monthMiles = 0;
  let monthDaysWalked = 0;
  for (const l of logs ?? []) {
    const m = Number(l.miles) || 0;
    if (monthKey(String(l.log_date)) === mk) {
      monthMiles += m;
      if (m > 0) monthDaysWalked += 1;
    }
  }

  // Trailing 28-day averages and pace.
  const cutoff = addDays(today, -27);
  const recent = (logs ?? []).filter((l) => String(l.log_date) >= cutoff && String(l.log_date) <= today);
  const recentMiles = recent.reduce((s, l) => s + (Number(l.miles) || 0), 0);
  const walkedDays = recent.filter((l) => (Number(l.miles) || 0) > 0).length;
  const avgDaily = walkedDays ? recentMiles / walkedDays : null;
  const timedMiles = recent
    .filter((l) => (Number(l.miles) || 0) > 0 && Number(l.minutes_walked) > 0)
    .reduce((s, l) => s + (Number(l.miles) || 0), 0);
  const timedMinutes = recent
    .filter((l) => (Number(l.miles) || 0) > 0 && Number(l.minutes_walked) > 0)
    .reduce((s, l) => s + (Number(l.minutes_walked) || 0), 0);
  const avgPace = timedMiles > 0 ? paceMinPerMile(timedMiles, timedMinutes) : null;
  const fourWeekAvg = recentMiles > 0 ? recentMiles / 4 : null;

  // Streaks on any-mileage days (walking 6 days/week allows one rest day).
  const walkDates = new Set(
    (logs ?? []).filter((l) => (Number(l.miles) || 0) > 0).map((l) => String(l.log_date)),
  );
  const sorted = [...walkDates].sort();
  let longestStreak = sorted.length ? 1 : 0;
  let run = sorted.length ? 1 : 0;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = Math.round(
      (new Date(`${sorted[i]}T00:00:00`).getTime() - new Date(`${sorted[i - 1]}T00:00:00`).getTime()) /
        86_400_000,
    );
    run = gap === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }
  let cursor = walkDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (walkDates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  // Progressive weekly target: build on the last four weeks, capped at 16.
  const base = fourWeekAvg ?? 0;
  const weeklyTarget = Math.min(
    WEEKLY_MILE_TARGET.max,
    Math.max(6, Math.round((base > 0 ? base + 1 : 8) * 2) / 2),
  );
  const nextTargetNote =
    weeklyTarget >= WEEKLY_MILE_TARGET.min
      ? `You are at the long-term target band of ${WEEKLY_MILE_TARGET.min}–${WEEKLY_MILE_TARGET.max} miles a week.`
      : `Build to ${weeklyTarget} miles this week, then step up about a mile a week toward ${WEEKLY_MILE_TARGET.min}–${WEEKLY_MILE_TARGET.max}.`;

  void profile;
  void dowOf;

  return {
    todayMiles: milesOn(today),
    weekMiles,
    monthMiles,
    weekDaysWalked,
    monthDaysWalked,
    avgDaily,
    avgPace,
    avgPaceLabel: avgPace ? formatPace(avgPace) : '—',
    streak,
    longestStreak,
    weeklyTarget,
    weekProgressPct: weeklyTarget > 0 ? Math.min(100, (weekMiles / weeklyTarget) * 100) : 0,
    daysGoalPct: Math.min(100, (weekDaysWalked / WALK_DAYS_GOAL) * 100),
    week,
    fourWeekAvg,
    nextTargetNote,
  };
}

// ------------------------------------------------- functional longevity checks

export const FUNCTIONAL_CHECKS = [
  { key: 'floor', label: 'Get up from the floor unassisted' },
  { key: 'chair', label: 'Rise from a chair without using hands' },
  { key: 'grip', label: 'Grip strength (carry or hold test)' },
  { key: 'balance', label: 'Single-leg balance, 20+ seconds each side' },
  { key: 'core', label: 'Core stability (plank or dead-bug hold)' },
  { key: 'endurance', label: 'Walking endurance — 30+ minutes continuous' },
  { key: 'stairs', label: 'Climb two flights without stopping' },
  { key: 'groceries', label: 'Carry groceries in from the car in one trip' },
  { key: 'independence', label: 'Full daily movement independence' },
];
