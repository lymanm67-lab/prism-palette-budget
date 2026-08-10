// Longevity: Healthspan First. Daily scorecard, habits score, decade goals.
// Measures behaviours that support healthy aging — never predicts life expectancy.
import { addDays, todayISO, type DailyLog, type HealthProfile } from './healthEngine';
import { CALORIE_GOAL } from './consistency';

export type ScorecardKey =
  | 'calories'
  | 'protein'
  | 'vegetables'
  | 'water'
  | 'movement'
  | 'strength'
  | 'sleep'
  | 'stress'
  | 'social'
  | 'faith';

export const SCORECARD_ITEMS: { key: ScorecardKey; label: string; manual: boolean }[] = [
  { key: 'calories', label: 'Stayed near the calorie target', manual: false },
  { key: 'protein', label: 'Ate protein-focused meals', manual: false },
  { key: 'vegetables', label: 'Ate vegetables', manual: false },
  { key: 'water', label: 'Drank sufficient water', manual: false },
  { key: 'movement', label: 'Walked or exercised', manual: false },
  { key: 'strength', label: 'Strength training if scheduled', manual: false },
  { key: 'sleep', label: 'Slept adequately', manual: false },
  { key: 'stress', label: 'Managed stress', manual: false },
  { key: 'social', label: 'Meaningful social connection', manual: true },
  { key: 'faith', label: 'Faith or reflection activity', manual: false },
];

type AnyLog = DailyLog & {
  meal_calories?: number | null;
  meal_count?: number | null;
  mindfulness_minutes?: number | null;
  mindfulness_type?: string | null;
  intention_note?: string | null;
  scorecard?: Record<string, boolean> | null;
};

const sessions = (log?: AnyLog | null) =>
  Array.isArray(log?.workout_sessions) ? (log!.workout_sessions as Record<string, unknown>[]) : [];

/** Auto-detected result for one day; manual items fall back to the saved scorecard. */
export function scorecardFor(log: AnyLog | null | undefined, profile: HealthProfile | null) {
  const manual = (log?.scorecard ?? {}) as Record<string, boolean>;
  const cals = Number(log?.meal_calories) || 0;
  const proteinGoal = Number(profile?.protein_goal_g ?? 140);
  const waterGoal = Number(profile?.water_goal_oz ?? 100);
  const kinds = sessions(log).map((s) => String(s.kind ?? 'strength'));

  const auto: Record<ScorecardKey, boolean> = {
    calories: cals > 0 && cals <= CALORIE_GOAL + 75,
    protein: (Number(log?.protein_g) || 0) >= proteinGoal * 0.8,
    vegetables: (Number(log?.veg_servings) || 0) >= 2,
    water: (Number(log?.water_oz) || 0) >= waterGoal * 0.8,
    movement: (Number(log?.miles) || 0) > 0 || kinds.length > 0,
    strength: kinds.includes('strength'),
    sleep: (Number(log?.sleep_hours) || 0) >= 7,
    stress: (Number(log?.stress_rating) || 99) <= 5 || (Number(log?.mindfulness_minutes) || 0) > 0,
    social: false,
    faith:
      (Number(log?.mindfulness_minutes) || 0) > 0 ||
      Boolean(log?.intention_note) ||
      /pray|faith|scripture|devotion/i.test(String(log?.mindfulness_type ?? '')),
  };

  const items = SCORECARD_ITEMS.map((item) => ({
    ...item,
    done: manual[item.key] === true || (manual[item.key] !== false && auto[item.key]),
    auto: auto[item.key],
  }));

  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, pct: (done / items.length) * 100 };
}

export function scorecardHistory(logs: AnyLog[], profile: HealthProfile | null, days: number) {
  const start = addDays(todayISO(), -(days - 1));
  const byDate = new Map(logs.map((l) => [String(l.log_date), l]));
  const out: { date: string; done: number; pct: number }[] = [];
  for (let d = 0; d < days; d += 1) {
    const date = addDays(start, d);
    const s = scorecardFor(byDate.get(date), profile);
    out.push({ date, done: s.done, pct: s.pct });
  }
  return out;
}

// ------------------------------------------------------ longevity habits score

export type LongevityCategory = {
  key: string;
  label: string;
  detail: string;
};

export const LONGEVITY_CATEGORIES: LongevityCategory[] = [
  { key: 'weight', label: 'Healthy body weight', detail: 'Trending toward or holding the maintenance range' },
  { key: 'strength', label: 'Strength', detail: '2–3 resistance sessions a week' },
  { key: 'cardio', label: 'Cardiovascular activity', detail: 'Walking 6 days a week' },
  { key: 'mobility', label: 'Mobility', detail: 'Stretching and range-of-motion work' },
  { key: 'balance', label: 'Balance', detail: 'Single-leg and stability practice' },
  { key: 'sleep', label: 'Sleep', detail: '7–9 hours when possible' },
  { key: 'stress', label: 'Stress management', detail: 'Low stress days or mindfulness logged' },
  { key: 'nutrition', label: 'Nutrition quality', detail: 'Protein and vegetables at most meals' },
  { key: 'hydration', label: 'Hydration', detail: 'Daily fluid goal met' },
  { key: 'social', label: 'Social connection', detail: 'Meaningful contact with people you love' },
  { key: 'purpose', label: 'Purpose and meaningful work', detail: 'A daily intention or contribution' },
  { key: 'faith', label: 'Faith and spiritual wellbeing', detail: 'Prayer, reflection or worship' },
  { key: 'preventive', label: 'Preventive healthcare', detail: 'Screenings current and appointments kept' },
  { key: 'cognitive', label: 'Cognitive activity', detail: 'Reading, writing, learning, problem solving' },
];

export type HabitScore = {
  score: number;
  band: 'green' | 'yellow' | 'red';
  categories: { key: string; label: string; detail: string; pct: number; note: string }[];
  strongest: string | null;
  weakest: string | null;
  hasData: boolean;
};

/**
 * Consistency over the last 30 days across the 14 longevity categories.
 * `preventivePct` and `weightPct` come from other modules and are passed in.
 */
export function longevityHabitsScore(
  logs: AnyLog[],
  profile: HealthProfile | null,
  extras: { preventivePct?: number; weightPct?: number } = {},
): HabitScore {
  const start = addDays(todayISO(), -29);
  const window = logs.filter((l) => String(l.log_date) >= start && String(l.log_date) <= todayISO());
  const days = 30;
  const weeks = days / 7;
  const waterGoal = Number(profile?.water_goal_oz ?? 100);

  const count = (fn: (l: AnyLog) => boolean) => window.filter(fn).length;
  const kindCount = (kind: string) =>
    window.reduce((s, l) => s + sessions(l).filter((x) => String(x.kind ?? 'strength') === kind).length, 0);

  const manualHits = (key: string) =>
    window.filter((l) => (l.scorecard ?? {})[key] === true).length;

  const pctOf = (hits: number, target: number) => Math.max(0, Math.min(100, (hits / target) * 100));

  const strengthSessions = kindCount('strength');
  const stretchSessions = kindCount('stretch');
  const walkDays = count((l) => (Number(l.miles) || 0) > 0);
  const sleepDays = count((l) => (Number(l.sleep_hours) || 0) >= 7);
  const stressDays = count(
    (l) => (Number(l.stress_rating) || 99) <= 5 || (Number(l.mindfulness_minutes) || 0) > 0,
  );
  const nutritionDays = count(
    (l) => (Number(l.veg_servings) || 0) >= 2 || (Number(l.protein_g) || 0) >= Number(profile?.protein_goal_g ?? 140) * 0.8,
  );
  const waterDays = count((l) => (Number(l.water_oz) || 0) >= waterGoal * 0.8);
  const purposeDays = count((l) => Boolean(l.intention_note));
  const faithDays = count((l) => (Number(l.mindfulness_minutes) || 0) > 0 || Boolean(l.intention_note));
  const cognitiveDays = count((l) => (Number(l.focus_rating) || 0) >= 6) + manualHits('cognitive');
  const socialDays = manualHits('social');
  const balanceHits = manualHits('balance') + Math.round(stretchSessions / 2);

  const raw: Record<string, { pct: number; note: string }> = {
    weight: {
      pct: extras.weightPct ?? 0,
      note: 'Progress toward the 175 lb goal and maintenance range',
    },
    strength: { pct: pctOf(strengthSessions, weeks * 2.5), note: `${strengthSessions} sessions in 30 days` },
    cardio: { pct: pctOf(walkDays, weeks * 6), note: `${walkDays} walking days in 30 days` },
    mobility: { pct: pctOf(stretchSessions, weeks * 2), note: `${stretchSessions} stretch sessions` },
    balance: { pct: pctOf(balanceHits, weeks * 2), note: `${balanceHits} balance/stability entries` },
    sleep: { pct: pctOf(sleepDays, days * 0.8), note: `${sleepDays} nights at 7+ hours` },
    stress: { pct: pctOf(stressDays, days * 0.7), note: `${stressDays} low-stress or mindful days` },
    nutrition: { pct: pctOf(nutritionDays, days * 0.8), note: `${nutritionDays} protein/vegetable days` },
    hydration: { pct: pctOf(waterDays, days * 0.8), note: `${waterDays} days at the fluid goal` },
    social: { pct: pctOf(socialDays, days * 0.5), note: `${socialDays} days with logged connection` },
    purpose: { pct: pctOf(purposeDays, days * 0.6), note: `${purposeDays} days with a set intention` },
    faith: { pct: pctOf(faithDays, days * 0.6), note: `${faithDays} days of prayer or reflection` },
    preventive: { pct: extras.preventivePct ?? 0, note: 'Screenings and appointments up to date' },
    cognitive: { pct: pctOf(cognitiveDays, days * 0.6), note: `${cognitiveDays} days of focused mental work` },
  };

  const categories = LONGEVITY_CATEGORIES.map((c) => ({
    ...c,
    pct: Math.round(raw[c.key]?.pct ?? 0),
    note: raw[c.key]?.note ?? '',
  }));

  const score = Math.round(categories.reduce((s, c) => s + c.pct, 0) / categories.length);
  const sorted = [...categories].sort((a, b) => b.pct - a.pct);

  return {
    score,
    band: score >= 70 ? 'green' : score >= 45 ? 'yellow' : 'red',
    categories,
    strongest: sorted[0]?.label ?? null,
    weakest: sorted[sorted.length - 1]?.label ?? null,
    hasData: window.length > 0,
  };
}

// ------------------------------------------------------ healthspan by decade

export type DecadeGoal = {
  age: number;
  weight: string;
  walking: string;
  strength: string;
  mobility: string;
  balance: string;
  cognitive: string;
  social: string;
  preventive: string;
  financial: string;
  purpose: string;
};

export const DECADE_GOALS: DecadeGoal[] = [
  {
    age: 60,
    weight: '175–185 lbs, trending into the maintenance range',
    walking: '12–16 miles a week, 6 days',
    strength: 'Total Gym 2–3x weekly',
    mobility: 'Daily stretching, full range of motion',
    balance: 'Single-leg balance 30 seconds each side',
    cognitive: 'Daily reading, writing and planning work',
    social: 'Weekly family and community contact',
    preventive: 'Annual physical, dental, vision, blood pressure, A1C',
    financial: 'HSA funded, healthcare emergency reserve started',
    purpose: 'Active work, teaching and building the family legacy',
  },
  {
    age: 65,
    weight: '173–180 lbs held steady',
    walking: '12–16 miles a week, plus hills',
    strength: 'Total Gym 3x weekly, focus on legs and grip',
    mobility: 'Floor-to-stand without assistance',
    balance: 'Confident stairs and uneven ground',
    cognitive: 'Continued learning, writing, mentoring',
    social: 'Regular grandchildren and church involvement',
    preventive: 'Medicare planning, colon and prostate screening current',
    financial: 'Medicare + supplement chosen, LTC plan reviewed',
    purpose: 'Foundation and family governance leadership',
  },
  {
    age: 70,
    weight: '173–180 lbs, muscle preserved',
    walking: '10–15 miles a week',
    strength: 'Resistance 2–3x weekly, no missed weeks',
    mobility: 'Reach overhead, tie shoes, kneel and rise easily',
    balance: 'No falls, stable in the dark',
    cognitive: 'Teaching, writing, financial oversight',
    social: 'Weekly meals with family, active friendships',
    preventive: 'Annual labs, hearing and vision, medication review',
    financial: 'Healthcare reserve fully funded',
    purpose: 'Mentoring the next generation',
  },
  {
    age: 75,
    weight: '173–182 lbs',
    walking: '10–12 miles a week',
    strength: 'Resistance 2x weekly minimum',
    mobility: 'Independent dressing, bathing, driving',
    balance: 'Balance training twice weekly',
    cognitive: 'Reading daily, managing own affairs',
    social: 'Family meetings, church, close friends',
    preventive: 'Bone health, skin checks, vaccinations current',
    financial: 'RMD and healthcare cost plan in place',
    purpose: 'Legacy letters and family history work',
  },
  {
    age: 80,
    weight: 'Stable weight, no unintentional loss',
    walking: '8–12 miles a week',
    strength: 'Resistance 2x weekly, grip and legs first',
    mobility: 'Stairs and household tasks unassisted',
    balance: 'Balance work most days',
    cognitive: 'Active mind: puzzles, writing, conversation',
    social: 'Daily contact with someone who loves you',
    preventive: 'Cognitive and hearing screening, fall-risk review',
    financial: 'Long-term care funding confirmed',
    purpose: 'Storytelling, faith leadership, grandparenting',
  },
  {
    age: 85,
    weight: 'Protect weight — muscle over the scale',
    walking: 'Daily walking, distance as tolerated',
    strength: 'Bands or Total Gym light resistance 2x weekly',
    mobility: 'Live independently at home',
    balance: 'Assistive devices only if needed',
    cognitive: 'Reading, memory work, decision-making intact',
    social: 'Weekly family gatherings',
    preventive: 'Care team coordinated, medications minimal',
    financial: 'Estate and care documents current',
    purpose: 'Elder voice of the family',
  },
  {
    age: 90,
    weight: 'No unintentional loss; protein at every meal',
    walking: 'Move every day, indoors counts',
    strength: 'Chair-based resistance work',
    mobility: 'Rise from a chair unassisted',
    balance: 'Fall prevention as top priority',
    cognitive: 'Conversation, scripture, memory sharing',
    social: 'Not a day alone',
    preventive: 'Comfort-focused, physician-guided care',
    financial: 'Care fully funded, no family burden',
    purpose: 'Blessing and guiding the family',
  },
  {
    age: 95,
    weight: 'Nutrition support, protein first',
    walking: 'Short daily walks with support if needed',
    strength: 'Gentle resistance, grip preserved',
    mobility: 'Dignity and independence in daily tasks',
    balance: 'Home adapted for safety',
    cognitive: 'Engaged, recognised, participating',
    social: 'Surrounded by family',
    preventive: 'Coordinated, gentle, physician-guided',
    financial: 'Legacy transfers complete',
    purpose: 'Living proof that healthspan was the mission',
  },
  {
    age: 100,
    weight: 'Well nourished and steady',
    walking: 'Still moving daily',
    strength: 'Still lifting something',
    mobility: 'Still rising from a chair on your own',
    balance: 'Still upright and steady',
    cognitive: 'Still clear, still teaching',
    social: 'Four generations at the table',
    preventive: 'Comfort, clarity and care',
    financial: 'Foundation funded and running',
    purpose: 'A century of faith, family and contribution',
  },
];

export const NON_SCALE_VICTORIES = [
  { key: 'waist', label: 'Smaller waist' },
  { key: 'clothes', label: 'Clothes fitting better' },
  { key: 'distance', label: 'Longer walking distance' },
  { key: 'pace', label: 'Faster walking pace' },
  { key: 'stamina', label: 'Improved stamina' },
  { key: 'strength', label: 'Improved strength' },
  { key: 'rhr', label: 'Lower resting heart rate' },
  { key: 'bp', label: 'Better blood pressure readings' },
  { key: 'sleep', label: 'Better sleep' },
  { key: 'energy', label: 'Improved energy' },
  { key: 'mood', label: 'Better mood' },
  { key: 'mobility', label: 'Improved mobility' },
  { key: 'balance', label: 'Improved balance' },
  { key: 'joints', label: 'Reduced joint discomfort' },
  { key: 'confidence', label: 'Increased confidence' },
];

export const JOURNAL_PROMPTS = [
  'What went well today?',
  'What challenged me today?',
  'What am I grateful for?',
  'What can I improve tomorrow?',
];

export const HEALTHSPAN_FINANCIAL = [
  { key: 'hsa', label: 'HSA balance', hint: 'Triple tax-advantaged healthcare fund' },
  { key: 'reserve', label: 'Healthcare emergency savings', hint: 'Cash set aside for deductibles and surprises' },
  { key: 'ltc', label: 'Long-term care planning', hint: 'Policy, hybrid or self-funded plan documented' },
  { key: 'insurance', label: 'Insurance coverage', hint: 'Health, dental, vision, disability, life' },
  { key: 'retirement', label: 'Retirement healthcare planning', hint: 'Medicare, IRMAA and bridge coverage' },
  { key: 'fitness', label: 'Fitness and wellness spending', hint: 'Equipment, gym, training, recovery' },
  { key: 'preventive', label: 'Preventive care spending', hint: 'Screenings, labs, dental, vision' },
];
