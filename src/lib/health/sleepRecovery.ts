// Sleep & Recovery analytics + preventive-care scheduling helpers.
import { addDays, daysBetween, todayISO, type DailyLog } from './healthEngine';

const num = (v: unknown) => (v == null ? null : Number(v));
const mean = (xs: (number | null)[]) => {
  const v = xs.filter((x): x is number => x != null && !Number.isNaN(x));
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
};

export type SleepSummary = {
  target: number;
  nights: number;
  avgSleep: number | null;
  avgSleep7: number | null;
  avgSleep30: number | null;
  sleepDebt: number;
  onTargetNights: number;
  shortNights: number;
  consistencyPct: number | null;
  recoveryScore: number;
  recoveryLabel: string;
  avgEnergy: number | null;
  avgStress: number | null;
  avgMood: number | null;
  restDayRecommended: boolean;
  restDayReason: string;
  series: { date: string; sleep: number | null; energy: number | null; stress: number | null }[];
};

/** Recent-first logs assumed. Window is in days, counted back from today. */
export function sleepSummary(
  logs: DailyLog[],
  target = 7.5,
  windowDays = 30,
): SleepSummary {
  const today = todayISO();
  const start = addDays(today, -(windowDays - 1));
  const inWindow = logs.filter((l) => l.log_date >= start && l.log_date <= today);
  const withSleep = inWindow.filter((l) => num(l.sleep_hours) != null);

  const last = (days: number) => {
    const s = addDays(today, -(days - 1));
    return logs.filter((l) => l.log_date >= s && l.log_date <= today);
  };

  const avgSleep = mean(withSleep.map((l) => num(l.sleep_hours)));
  const avgSleep7 = mean(last(7).map((l) => num(l.sleep_hours)));
  const avgSleep30 = mean(last(30).map((l) => num(l.sleep_hours)));

  const sleepDebt = last(7).reduce((acc, l) => {
    const h = num(l.sleep_hours);
    if (h == null) return acc;
    return acc + Math.max(0, target - h);
  }, 0);

  const onTargetNights = withSleep.filter((l) => Number(l.sleep_hours) >= target).length;
  const shortNights = withSleep.filter((l) => Number(l.sleep_hours) < target - 1).length;
  const consistencyPct = withSleep.length
    ? Math.round((onTargetNights / withSleep.length) * 100)
    : null;

  const avgEnergy = mean(inWindow.map((l) => num(l.energy_rating)));
  const avgStress = mean(inWindow.map((l) => num(l.stress_rating)));
  const avgMood = mean(inWindow.map((l) => num(l.mood_rating)));

  // Recovery score: sleep quantity 45, consistency 25, energy 15, low stress 15.
  const sleepPart = avgSleep7 == null ? 0 : Math.min(1, avgSleep7 / target) * 45;
  const consistPart = consistencyPct == null ? 0 : (consistencyPct / 100) * 25;
  const energyPart = avgEnergy == null ? 0 : (Math.min(10, avgEnergy) / 10) * 15;
  const stressPart = avgStress == null ? 0 : ((10 - Math.min(10, avgStress)) / 10) * 15;
  const recoveryScore = Math.round(sleepPart + consistPart + energyPart + stressPart);

  const recoveryLabel =
    withSleep.length === 0
      ? 'Log sleep to score recovery'
      : recoveryScore >= 80
        ? 'Well recovered'
        : recoveryScore >= 60
          ? 'Adequate recovery'
          : recoveryScore >= 40
            ? 'Under-recovered'
            : 'Depleted';

  const last3 = last(3);
  const shortStreak = last3.filter((l) => {
    const h = num(l.sleep_hours);
    return h != null && h < target - 1;
  }).length;
  const highStress = (mean(last3.map((l) => num(l.stress_rating))) ?? 0) >= 7;
  const restDayRecommended = shortStreak >= 2 || highStress || recoveryScore < 40;
  const restDayReason = restDayRecommended
    ? shortStreak >= 2
      ? `${shortStreak} of the last 3 nights were more than an hour under target — keep today light.`
      : highStress
        ? 'Stress has averaged 7+ over the last three days — swap intensity for a walk.'
        : 'Recovery score is low — prioritise sleep and an easy day.'
    : 'Recovery looks good — you can train as planned.';

  const series = [...inWindow]
    .sort((a, b) => a.log_date.localeCompare(b.log_date))
    .map((l) => ({
      date: l.log_date,
      sleep: num(l.sleep_hours),
      energy: num(l.energy_rating),
      stress: num(l.stress_rating),
    }));

  return {
    target,
    nights: withSleep.length,
    avgSleep,
    avgSleep7,
    avgSleep30,
    sleepDebt: Math.round(sleepDebt * 10) / 10,
    onTargetNights,
    shortNights,
    consistencyPct,
    recoveryScore,
    recoveryLabel,
    avgEnergy,
    avgStress,
    avgMood,
    restDayRecommended,
    restDayReason,
    series,
  };
}

// ------------------------------------------------------------ preventive care

export const CARE_TYPES = [
  { value: 'physical', label: 'Annual physical' },
  { value: 'dental', label: 'Dental' },
  { value: 'vision', label: 'Vision' },
  { value: 'screening', label: 'Screening' },
  { value: 'vaccination', label: 'Vaccination' },
  { value: 'lab', label: 'Lab work' },
  { value: 'specialist', label: 'Specialist' },
  { value: 'chiropractor', label: 'Chiropractor' },
] as const;

export const DOC_TYPES = [
  { value: 'lab_result', label: 'Lab result' },
  { value: 'visit_summary', label: 'Visit summary' },
  { value: 'imaging', label: 'Imaging report' },
  { value: 'eob', label: 'Explanation of benefits' },
  { value: 'bill', label: 'Medical bill' },
  { value: 'immunization', label: 'Immunization record' },
  { value: 'prescription', label: 'Prescription' },
  { value: 'other', label: 'Other' },
] as const;

export type PreventiveItem = {
  id: string;
  item_name: string;
  care_type: string;
  person: string | null;
  provider: string | null;
  frequency_months: number;
  last_completed_on: string | null;
  next_due_on: string | null;
  status: string;
  cost_estimate: number;
  out_of_pocket: number;
  covered_by_insurance: boolean;
  notes: string | null;
};

export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function dueStatus(item: PreventiveItem): {
  key: 'overdue' | 'due_soon' | 'scheduled' | 'up_to_date' | 'unknown';
  label: string;
  days: number | null;
} {
  const due =
    item.next_due_on ??
    (item.last_completed_on ? addMonths(item.last_completed_on, item.frequency_months) : null);
  if (!due) return { key: 'unknown', label: 'No date set', days: null };
  const days = daysBetween(todayISO(), due);
  if (days < 0) return { key: 'overdue', label: `Overdue ${Math.abs(days)}d`, days };
  if (days <= 60) return { key: 'due_soon', label: `Due in ${days}d`, days };
  return { key: 'up_to_date', label: `Due ${due}`, days };
}

export type CareCostSummary = {
  annualEstimate: number;
  annualOutOfPocket: number;
  overdue: number;
  dueSoon: number;
  upToDate: number;
  /** Value of avoiding one late-stage chronic event, illustrative only. */
  lifetimeSavings: number;
};

export function careCostSummary(items: PreventiveItem[], yearsToProject = 30): CareCostSummary {
  let annualEstimate = 0;
  let annualOutOfPocket = 0;
  let overdue = 0;
  let dueSoon = 0;
  let upToDate = 0;

  for (const it of items) {
    const perYear = it.frequency_months > 0 ? 12 / it.frequency_months : 1;
    annualEstimate += Number(it.cost_estimate ?? 0) * perYear;
    annualOutOfPocket += Number(it.out_of_pocket ?? 0) * perYear;
    const s = dueStatus(it);
    if (s.key === 'overdue') overdue += 1;
    else if (s.key === 'due_soon') dueSoon += 1;
    else upToDate += 1;
  }

  // Illustrative: staying current on preventive care avoids roughly $1,400/yr of
  // reactive care, compounded at 6% inside an HSA over the projection window.
  const avoided = 1400;
  const r = 0.06;
  const lifetimeSavings = avoided * ((Math.pow(1 + r, yearsToProject) - 1) / r);

  return {
    annualEstimate: Math.round(annualEstimate),
    annualOutOfPocket: Math.round(annualOutOfPocket),
    overdue,
    dueSoon,
    upToDate,
    lifetimeSavings: Math.round(lifetimeSavings),
  };
}

export const DEFAULT_PREVENTIVE_ITEMS = [
  { item_name: 'Annual physical + basic labs', care_type: 'physical', frequency_months: 12, cost_estimate: 250, out_of_pocket: 0 },
  { item_name: 'Dental cleaning', care_type: 'dental', frequency_months: 6, cost_estimate: 150, out_of_pocket: 25 },
  { item_name: 'Vision exam', care_type: 'vision', frequency_months: 12, cost_estimate: 120, out_of_pocket: 20 },
  { item_name: 'Blood pressure check', care_type: 'screening', frequency_months: 6, cost_estimate: 0, out_of_pocket: 0 },
  { item_name: 'A1C / metabolic panel', care_type: 'lab', frequency_months: 12, cost_estimate: 90, out_of_pocket: 0 },
  { item_name: 'Lipid panel (cholesterol)', care_type: 'lab', frequency_months: 12, cost_estimate: 80, out_of_pocket: 0 },
  { item_name: 'Colonoscopy screening', care_type: 'screening', frequency_months: 120, cost_estimate: 2200, out_of_pocket: 0 },
  { item_name: 'Skin cancer screening', care_type: 'screening', frequency_months: 12, cost_estimate: 175, out_of_pocket: 40 },
  { item_name: 'Flu shot', care_type: 'vaccination', frequency_months: 12, cost_estimate: 40, out_of_pocket: 0 },
  { item_name: 'Tdap booster', care_type: 'vaccination', frequency_months: 120, cost_estimate: 70, out_of_pocket: 0 },
];
