// Weight Loss Roadmap + Maintenance Mode + Plateau Protocol.
// Philosophy: track trends, never single weigh-ins. Slower progress is not failure.
import { addDays, daysBetween, todayISO, type DailyLog, type HealthProfile } from './healthEngine';

export const GOAL_WEIGHT = 175;

/** Maintenance zones (lbs). */
export const ZONES = { greenLow: 173, greenHigh: 180, yellowHigh: 184, action: 185 };

export const ROADMAP_STEPS = [220, 210, 200, 190, 180, 175];

export const MILESTONE_MESSAGES: Record<number, string> = {
  220: 'Starting line. The plan begins with one logged day.',
  210: 'First 10 down. Your joints already carry less load every step you take.',
  200: 'Welcome to the 100s. Blood pressure, sleep and stamina all move with you.',
  190: 'Ten more gone. This is the range where walking starts to feel easy.',
  180: 'You are inside the maintenance window. Now the work is keeping it.',
  175: 'Goal weight. 175 is a milestone — healthspan is the mission.',
};

export type MonthlyTarget = { key: string; label: string; low: number; high: number };

/** Working plan: April 2027 for ~175 lbs, with Feb–May 2027 as the healthy landing window. */
export const MONTHLY_TARGETS: MonthlyTarget[] = [
  { key: '2026-08', label: 'August 2026', low: 214, high: 220 },
  { key: '2026-09', label: 'September 2026', low: 208, high: 210 },
  { key: '2026-10', label: 'October 2026', low: 202, high: 204 },
  { key: '2026-11', label: 'November 2026', low: 197, high: 199 },
  { key: '2026-12', label: 'December 2026', low: 192, high: 195 },
  { key: '2027-01', label: 'January 2027', low: 187, high: 190 },
  { key: '2027-02', label: 'February 2027', low: 183, high: 186 },
  { key: '2027-03', label: 'March 2027', low: 178, high: 181 },
  { key: '2027-04', label: 'April 2027', low: 175, high: 178 },
];

export const PLATEAU_CHECKLIST = [
  'Are meals being logged accurately?',
  'Have portion sizes increased?',
  'Have restaurant meals increased?',
  'Have beverages added calories?',
  'Have walking miles decreased?',
  'Has strength training decreased?',
  'Has sleep declined?',
  'Has stress increased?',
  'Has weekend eating changed?',
  'Has sodium intake increased?',
  'Could temporary water retention explain the scale?',
];

export const CORRECTION_ACTIONS = [
  'Review portions at dinner first',
  'Increase walking consistency to 6 days',
  'Reduce unnecessary snacks',
  'Increase vegetables and lean protein',
  'Return to daily meal tracking',
];

export type WeighIn = { date: string; weight: number };

export function weighIns(logs: DailyLog[]): WeighIn[] {
  return (logs ?? [])
    .filter((l) => l.weight != null && Number(l.weight) > 0)
    .map((l) => ({ date: String(l.log_date), weight: Number(l.weight) }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

const mean = (values: number[]) =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;

/** Average of weigh-ins inside a trailing window ending on `end`. */
export function avgWindow(rows: WeighIn[], days: number, end = todayISO()): number | null {
  const start = addDays(end, -(days - 1));
  return mean(rows.filter((r) => r.date >= start && r.date <= end).map((r) => r.weight));
}

export type RoadmapStep = {
  weight: number;
  reached: boolean;
  reachedOn: string | null;
  projectedDate: string | null;
  message: string;
  isCurrentTarget: boolean;
};

export type WeightProgram = {
  hasData: boolean;
  latest: number;
  latestDate: string | null;
  start: number;
  goal: number;
  avg7: number | null;
  avg30: number | null;
  prevAvg7: number | null;
  weeklyChange: number | null;
  lost: number;
  pctOfStartLost: number;
  remaining: number;
  progressPct: number;
  lbsPerWeek: number | null;
  projectedGoalDate: string | null;
  mode: 'loss' | 'maintenance';
  zone: 'green' | 'yellow' | 'action' | null;
  zoneMessage: string | null;
  resetMode: boolean;
  steps: RoadmapStep[];
  monthly: (MonthlyTarget & {
    status: 'ahead' | 'on-track' | 'behind' | 'future';
    actual: number | null;
  })[];
  plateau: { active: boolean; days: number; change: number | null };
  celebrated: number[];
  hundredsClub: boolean;
};

export function buildWeightProgram(
  profile: HealthProfile | null,
  logs: DailyLog[],
): WeightProgram {
  const rows = weighIns(logs);
  const start = Number(profile?.start_weight ?? 220);
  const goal = Number(profile?.goal_weight ?? GOAL_WEIGHT);
  const latest = rows.length ? rows[rows.length - 1].weight : Number(profile?.current_weight ?? start);
  const latestDate = rows.length ? rows[rows.length - 1].date : null;

  const avg7 = avgWindow(rows, 7);
  const avg30 = avgWindow(rows, 30);
  const prevAvg7 = avgWindow(rows, 7, addDays(todayISO(), -7));
  const weeklyChange = avg7 != null && prevAvg7 != null ? avg7 - prevAvg7 : null;

  const lost = Math.max(0, start - latest);
  const remaining = Math.max(0, latest - goal);
  const total = Math.max(1, start - goal);

  // Trailing rate from the last 28 days of weigh-ins.
  let lbsPerWeek: number | null = null;
  const recent = rows.filter((r) => r.date >= addDays(todayISO(), -28));
  const basis = recent.length >= 2 ? recent : rows;
  if (basis.length >= 2) {
    const first = basis[0];
    const last = basis[basis.length - 1];
    const days = Math.max(1, daysBetween(first.date, last.date));
    lbsPerWeek = ((first.weight - last.weight) / days) * 7;
  }

  const PLANNED = 1.5;
  const rate = lbsPerWeek && lbsPerWeek > 0.05 ? lbsPerWeek : PLANNED;
  const projectedGoalDate = remaining > 0 ? addDays(todayISO(), Math.round((remaining / rate) * 7)) : null;

  const lowest = rows.length ? Math.min(...rows.map((r) => r.weight)) : latest;
  const mode: WeightProgram['mode'] = lowest <= goal + 0.5 ? 'maintenance' : 'loss';

  const reference = avg7 ?? latest;
  let zone: WeightProgram['zone'] = null;
  let zoneMessage: string | null = null;
  if (mode === 'maintenance') {
    if (reference >= ZONES.action) {
      zone = 'action';
      zoneMessage = 'Maintenance Reset recommended — restore structured tracking until you are back in range.';
    } else if (reference > ZONES.greenHigh) {
      zone = 'yellow';
      zoneMessage = 'Small correction recommended.';
    } else {
      zone = 'green';
      zoneMessage = 'You are in the green zone. Keep the habits that put you here.';
    }
  }

  const steps: RoadmapStep[] = ROADMAP_STEPS.map((w) => {
    const hit = rows.find((r) => r.weight <= w + 0.05);
    const reached = w >= start ? true : Boolean(hit);
    const projected =
      reached || latest <= w
        ? null
        : addDays(todayISO(), Math.round(((latest - w) / rate) * 7));
    return {
      weight: w,
      reached,
      reachedOn: w >= start ? (rows[0]?.date ?? profile?.start_date ?? null) : (hit?.date ?? null),
      projectedDate: projected,
      message: MILESTONE_MESSAGES[w] ?? '',
      isCurrentTarget: false,
    };
  });
  const nextIdx = steps.findIndex((s) => !s.reached);
  if (nextIdx >= 0) steps[nextIdx].isCurrentTarget = true;

  const monthly = MONTHLY_TARGETS.map((t) => {
    const monthRows = rows.filter((r) => r.date.slice(0, 7) === t.key);
    const actual = mean(monthRows.map((r) => r.weight));
    const nowKey = todayISO().slice(0, 7);
    if (t.key > nowKey || actual == null) {
      return { ...t, actual, status: 'future' as const };
    }
    if (actual <= t.low) return { ...t, actual, status: 'ahead' as const };
    if (actual <= t.high + 1.5) return { ...t, actual, status: 'on-track' as const };
    return { ...t, actual, status: 'behind' as const };
  });

  // Plateau: compare the current 7-day average to the average 14–21 days back.
  let plateau = { active: false, days: 0, change: null as number | null };
  const past = avgWindow(rows, 7, addDays(todayISO(), -14));
  if (mode === 'loss' && avg7 != null && past != null) {
    const change = past - avg7;
    const span = rows.length ? daysBetween(rows[0].date, todayISO()) : 0;
    plateau = { active: change < 0.5 && span >= 21, days: 21, change };
  }

  return {
    hasData: rows.length > 0,
    latest,
    latestDate,
    start,
    goal,
    avg7,
    avg30,
    prevAvg7,
    weeklyChange,
    lost,
    pctOfStartLost: start > 0 ? (lost / start) * 100 : 0,
    remaining,
    progressPct: Math.min(1, lost / total),
    lbsPerWeek,
    projectedGoalDate,
    mode,
    zone,
    zoneMessage,
    resetMode: mode === 'maintenance' && reference >= ZONES.action,
    steps,
    monthly,
    plateau,
    celebrated: steps.filter((s) => s.reached && s.weight < start).map((s) => s.weight),
    hundredsClub: lowest <= 199.9,
  };
}
