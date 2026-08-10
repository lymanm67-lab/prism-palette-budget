// Weekly and monthly health reviews generated from the logs you already keep.
import {
  addDays,
  formatDate,
  todayISO,
  weekStart,
  type DailyLog,
  type HealthProfile,
} from './healthEngine';
import { avgWindow, weighIns, ZONES } from './weightProgram';

type AnyLog = DailyLog & {
  meal_calories?: number | null;
  meal_count?: number | null;
  mindfulness_minutes?: number | null;
  scorecard?: Record<string, boolean> | null;
};

const sessions = (l: AnyLog) =>
  Array.isArray(l.workout_sessions) ? (l.workout_sessions as Record<string, unknown>[]) : [];

const avg = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : null);

export type PeriodReview = {
  label: string;
  start: string;
  end: string;
  startWeight: number | null;
  endWeight: number | null;
  avgWeight: number | null;
  weightChange: number | null;
  miles: number;
  walkDays: number;
  strengthSessions: number;
  stretchSessions: number;
  avgCalories: number | null;
  avgProtein: number | null;
  avgSleep: number | null;
  avgWater: number | null;
  moodTrend: number | null;
  energyTrend: number | null;
  stressTrend: number | null;
  daysLogged: number;
  wins: string[];
  challenges: string[];
  priority: string;
  continueHabit: string;
  improveHabit: string;
};

function summarize(
  label: string,
  start: string,
  end: string,
  logs: AnyLog[],
  profile: HealthProfile | null,
): PeriodReview {
  const window = logs.filter((l) => String(l.log_date) >= start && String(l.log_date) <= end);
  const weights = weighIns(window as DailyLog[]);
  const miles = window.reduce((s, l) => s + (Number(l.miles) || 0), 0);
  const walkDays = window.filter((l) => (Number(l.miles) || 0) > 0).length;
  const strengthSessions = window.reduce(
    (s, l) => s + sessions(l).filter((x) => String(x.kind ?? 'strength') === 'strength').length,
    0,
  );
  const stretchSessions = window.reduce(
    (s, l) => s + sessions(l).filter((x) => String(x.kind) === 'stretch').length,
    0,
  );

  const nums = (fn: (l: AnyLog) => number | null | undefined) =>
    window.map(fn).filter((v): v is number => typeof v === 'number' && v > 0);

  const avgCalories = avg(nums((l) => Number(l.meal_calories)));
  const avgProtein = avg(nums((l) => Number(l.protein_g)));
  const avgSleep = avg(nums((l) => Number(l.sleep_hours)));
  const avgWater = avg(nums((l) => Number(l.water_oz)));
  const moodTrend = avg(nums((l) => Number(l.mood_rating)));
  const energyTrend = avg(nums((l) => Number(l.energy_rating)));
  const stressTrend = avg(nums((l) => Number(l.stress_rating)));

  const startWeight = weights.length ? weights[0].weight : null;
  const endWeight = weights.length ? weights[weights.length - 1].weight : null;
  const avgWeight = avg(weights.map((w) => w.weight));
  const weightChange = startWeight != null && endWeight != null ? endWeight - startWeight : null;

  const proteinGoal = Number(profile?.protein_goal_g ?? 140);
  const waterGoal = Number(profile?.water_goal_oz ?? 100);

  const wins: string[] = [];
  const challenges: string[] = [];
  if (walkDays >= 5) wins.push(`${walkDays} walking days — the habit is holding`);
  else challenges.push(`Only ${walkDays} walking days; the target is 6`);
  if (strengthSessions >= 2) wins.push(`${strengthSessions} strength sessions protected your muscle`);
  else challenges.push(`${strengthSessions} strength sessions; aim for 2–3`);
  if (avgProtein != null && avgProtein >= proteinGoal * 0.85) wins.push(`Protein averaged ${Math.round(avgProtein)}g`);
  else challenges.push('Protein averaged below target — build each meal around the protein');
  if (avgWater != null && avgWater >= waterGoal * 0.8) wins.push(`Hydration averaged ${Math.round(avgWater)} oz`);
  else challenges.push('Water intake ran light');
  if (avgSleep != null && avgSleep >= 7) wins.push(`Sleep averaged ${avgSleep.toFixed(1)} hours`);
  else if (avgSleep != null) challenges.push(`Sleep averaged ${avgSleep.toFixed(1)} hours — aim for 7–9`);
  if (weightChange != null && weightChange < -0.5) wins.push(`Weight trend down ${Math.abs(weightChange).toFixed(1)} lbs`);

  const priority =
    walkDays < 5
      ? 'Walk six days, even if some are only one mile'
      : strengthSessions < 2
        ? 'Get two Total Gym sessions on the calendar first'
        : avgProtein != null && avgProtein < proteinGoal * 0.85
          ? 'Hit protein at breakfast — that is where it slips'
          : 'Keep the routine identical. Consistency beats perfection.';

  return {
    label,
    start,
    end,
    startWeight,
    endWeight,
    avgWeight,
    weightChange,
    miles,
    walkDays,
    strengthSessions,
    stretchSessions,
    avgCalories,
    avgProtein,
    avgSleep,
    avgWater,
    moodTrend,
    energyTrend,
    stressTrend,
    daysLogged: window.length,
    wins,
    challenges,
    priority,
    continueHabit: wins[0] ? wins[0].replace(/ —.*/, '') : 'Logging every day',
    improveHabit: challenges[0] ?? 'Nothing major — protect what is working',
  };
}

export function weeklyReview(logs: AnyLog[], profile: HealthProfile | null, weekOffset = 0): PeriodReview {
  const ws = addDays(weekStart(todayISO()), weekOffset * 7);
  const we = addDays(ws, 6);
  return summarize(`Week of ${formatDate(ws)}`, ws, we, logs, profile);
}

export function monthlyReview(logs: AnyLog[], profile: HealthProfile | null, monthKeyStr?: string): PeriodReview {
  const key = monthKeyStr ?? todayISO().slice(0, 7);
  const start = `${key}-01`;
  const d = new Date(`${start}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  const end = d.toISOString().slice(0, 10);
  const label = new Date(`${start}T00:00:00`).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  return summarize(label, start, end, logs, profile);
}

/** Maintenance readiness: is the 7-day average inside the green zone? */
export function maintenanceReadiness(logs: AnyLog[]) {
  const rows = weighIns(logs as DailyLog[]);
  const a7 = avgWindow(rows, 7);
  if (a7 == null) return { ready: false, note: 'Log weigh-ins to assess maintenance readiness.' };
  if (a7 <= ZONES.greenHigh)
    return { ready: true, note: `7-day average of ${a7.toFixed(1)} lbs is inside the 173–180 lb window.` };
  return {
    ready: false,
    note: `7-day average of ${a7.toFixed(1)} lbs — ${(a7 - ZONES.greenHigh).toFixed(1)} lbs above the maintenance window.`,
  };
}

export const MONTHLY_REVIEW_QUESTION =
  'Are the habits I practiced this month habits I could realistically continue for the next 10 years?';
