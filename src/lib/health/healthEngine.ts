// PRISM Health, Wellness & Longevity OS — calculation engine.
// Treats health like a portfolio: daily deposits compound into weight, energy,
// productivity and lower lifetime healthcare cost.

export type HealthProfile = {
  id: string;
  household_id: string;
  person_name: string | null;
  birth_date: string | null;
  height_inches: number | null;
  start_weight: number;
  current_weight: number;
  goal_weight: number;
  start_date: string;
  target_date: string | null;
  waist_inches: number | null;
  body_fat_pct: number | null;
  sex: string | null;
  daily_miles_goal: number;
  walk_days_per_week: number;
  protein_goal_g: number;
  water_goal_oz: number;
  veg_goal_servings: number;
  fruit_goal_servings: number;
  notes: string | null;
};

export type DailyLog = {
  id: string;
  log_date: string;
  miles: number;
  steps: number | null;
  active_minutes: number | null;
  minutes_walked: number | null;
  protein_g: number;
  water_oz: number;
  veg_servings: number;
  fruit_servings: number;
  avoided_processed_carbs: boolean;
  avoided_sugary_drinks: boolean;
  weight: number | null;
  sleep_hours: number | null;
  energy_rating: number | null;
  focus_rating: number | null;
  stress_rating: number | null;
  mood_rating: number | null;
  revenue_amount: number | null;
  notes: string | null;
};

// ---------------------------------------------------------------- date helpers

export const todayISO = () => new Date().toISOString().slice(0, 10);

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string) {
  const ms = new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday-start week key, e.g. 2026-08-03 */
export function weekStart(iso: string) {
  const d = new Date(`${iso}T00:00:00`);
  const dow = (d.getDay() + 6) % 7; // Mon = 0
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

export const monthKey = (iso: string) => iso.slice(0, 7);
export const yearKey = (iso: string) => iso.slice(0, 4);

export function formatDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ------------------------------------------------------------- body composition

export function bmi(weightLb: number, heightIn: number | null | undefined) {
  if (!heightIn || heightIn <= 0) return null;
  return (703 * weightLb) / (heightIn * heightIn);
}

export function bmiBand(value: number | null) {
  if (value == null) return { label: 'Unknown', tone: 'muted' as const };
  if (value < 18.5) return { label: 'Underweight', tone: 'warn' as const };
  if (value < 25) return { label: 'Healthy', tone: 'good' as const };
  if (value < 30) return { label: 'Overweight', tone: 'warn' as const };
  return { label: 'Obese range', tone: 'bad' as const };
}

/** Deurenberg estimate — educational only. */
export function estimateBodyFat(
  weightLb: number,
  heightIn: number | null | undefined,
  age: number | null,
  sex: string | null | undefined,
) {
  const b = bmi(weightLb, heightIn);
  if (b == null || age == null) return null;
  const male = (sex ?? 'male').toLowerCase().startsWith('m') ? 1 : 0;
  return 1.2 * b + 0.23 * age - 10.8 * male - 5.4;
}

export function ageFrom(birthDate: string | null | undefined) {
  if (!birthDate) return null;
  const b = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a -= 1;
  return a;
}

// ------------------------------------------------------------------- walking

/** Rough net burn: ~0.53 kcal per lb per mile. */
export function caloriesFromMiles(miles: number, weightLb: number) {
  return miles * weightLb * 0.53;
}

/** 3,500 kcal ≈ 1 lb of fat. */
export const fatPoundsFromCalories = (kcal: number) => kcal / 3500;

export function paceMinPerMile(minutes: number | null | undefined, miles: number) {
  if (!minutes || miles <= 0) return null;
  return minutes / miles;
}

export function formatPace(minPerMile: number | null) {
  if (minPerMile == null || !Number.isFinite(minPerMile)) return '—';
  const m = Math.floor(minPerMile);
  const s = Math.round((minPerMile - m) * 60);
  return `${m}:${String(s).padStart(2, '0')} /mi`;
}

// --------------------------------------------------------------- aggregations

export type WalkTotals = {
  today: number;
  week: number;
  month: number;
  year: number;
  lifetime: number;
  weekDaysHit: number;
  streak: number;
  longestStreak: number;
  avgPace: number | null;
  calories: number;
  minutes: number;
  fatPounds: number;
  activeMinutes: number;
  steps: number;
};

export function walkTotals(logs: DailyLog[], profile: HealthProfile | null): WalkTotals {
  const today = todayISO();
  const ws = weekStart(today);
  const mk = monthKey(today);
  const yk = yearKey(today);
  const weight = profile?.current_weight ?? 200;
  const goal = profile?.daily_miles_goal ?? 3.5;

  let t = 0, w = 0, m = 0, y = 0, life = 0, weekDaysHit = 0;
  let minutes = 0, milesWithTime = 0, calories = 0, activeMinutes = 0, steps = 0;

  for (const l of logs) {
    const miles = Number(l.miles) || 0;
    life += miles;
    calories += caloriesFromMiles(miles, weight);
    activeMinutes += Number(l.active_minutes) || 0;
    steps += Number(l.steps) || 0;
    if (l.minutes_walked && miles > 0) {
      minutes += Number(l.minutes_walked);
      milesWithTime += miles;
    }
    if (l.log_date === today) t += miles;
    if (l.log_date >= ws && l.log_date <= today) {
      w += miles;
      if (miles >= goal) weekDaysHit += 1;
    }
    if (monthKey(l.log_date) === mk) m += miles;
    if (yearKey(l.log_date) === yk) y += miles;
  }

  const { current, longest } = walkStreaks(logs, goal);

  return {
    today: t,
    week: w,
    month: m,
    year: y,
    lifetime: life,
    weekDaysHit,
    streak: current,
    longestStreak: longest,
    avgPace: milesWithTime > 0 ? minutes / milesWithTime : null,
    calories,
    minutes,
    fatPounds: fatPoundsFromCalories(calories),
    activeMinutes,
    steps,
  };
}

export function walkStreaks(logs: DailyLog[], goal: number) {
  const hit = new Set(logs.filter((l) => (Number(l.miles) || 0) >= goal).map((l) => l.log_date));
  if (hit.size === 0) return { current: 0, longest: 0 };

  const sorted = [...hit].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i += 1) {
    if (daysBetween(sorted[i - 1], sorted[i]) === 1) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
  }

  // Current streak walks backwards from today (or yesterday if today isn't logged).
  let cursor = todayISO();
  if (!hit.has(cursor)) cursor = addDays(cursor, -1);
  let current = 0;
  while (hit.has(cursor)) {
    current += 1;
    cursor = addDays(cursor, -1);
  }
  return { current, longest };
}

// --------------------------------------------------------------- weight & goal

export type WeightStatus = {
  current: number;
  start: number;
  goal: number;
  lost: number;
  remaining: number;
  progressPct: number;
  lbsPerWeek: number | null;
  projectedGoalDate: string | null;
  bmi: number | null;
  bodyFat: number | null;
  waist: number | null;
};

export function weightStatus(profile: HealthProfile | null, logs: DailyLog[]): WeightStatus | null {
  if (!profile) return null;
  const weighIns = logs
    .filter((l) => l.weight != null)
    .sort((a, b) => (a.log_date < b.log_date ? -1 : 1));
  const latest = weighIns.length ? Number(weighIns[weighIns.length - 1].weight) : profile.current_weight;
  const start = Number(profile.start_weight);
  const goal = Number(profile.goal_weight);
  const lost = Math.max(0, start - latest);
  const remaining = Math.max(0, latest - goal);
  const total = Math.max(1, start - goal);

  // Trailing rate over the last 28 days of weigh-ins.
  let lbsPerWeek: number | null = null;
  const cutoff = addDays(todayISO(), -28);
  const recent = weighIns.filter((l) => l.log_date >= cutoff);
  if (recent.length >= 2) {
    const first = recent[0];
    const last = recent[recent.length - 1];
    const days = Math.max(1, daysBetween(first.log_date, last.log_date));
    lbsPerWeek = ((Number(first.weight) - Number(last.weight)) / days) * 7;
  } else if (weighIns.length >= 2) {
    const first = weighIns[0];
    const last = weighIns[weighIns.length - 1];
    const days = Math.max(1, daysBetween(first.log_date, last.log_date));
    lbsPerWeek = ((Number(first.weight) - Number(last.weight)) / days) * 7;
  }

  let projectedGoalDate: string | null = null;
  if (lbsPerWeek && lbsPerWeek > 0.05 && remaining > 0) {
    projectedGoalDate = addDays(todayISO(), Math.round((remaining / lbsPerWeek) * 7));
  }

  const age = ageFrom(profile.birth_date);
  return {
    current: latest,
    start,
    goal,
    lost,
    remaining,
    progressPct: Math.min(1, lost / total),
    lbsPerWeek,
    projectedGoalDate,
    bmi: bmi(latest, profile.height_inches),
    bodyFat: profile.body_fat_pct ?? estimateBodyFat(latest, profile.height_inches, age, profile.sex),
    waist: profile.waist_inches,
  };
}

// -------------------------------------------------------------- health score

export type ScoreBreakdown = {
  total: number;
  walking: number;
  nutrition: number;
  protein: number;
  water: number;
  tracking: number;
  band: 'green' | 'yellow' | 'red';
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Weekly Health Score: walking 30, nutrition 30, protein 20, water 10, tracking 10. */
export function weeklyHealthScore(logs: DailyLog[], profile: HealthProfile | null): ScoreBreakdown {
  const ws = weekStart(todayISO());
  const week = logs.filter((l) => l.log_date >= ws && l.log_date <= todayISO());
  const p = profile;
  const milesGoal = p?.daily_miles_goal ?? 3.5;
  const walkDays = p?.walk_days_per_week ?? 6;
  const proteinGoal = p?.protein_goal_g ?? 140;
  const waterGoal = p?.water_goal_oz ?? 100;
  const vegGoal = p?.veg_goal_servings ?? 5;

  const daysSoFar = Math.max(1, Math.min(7, daysBetween(ws, todayISO()) + 1));
  const expectedWalks = Math.max(1, Math.round((walkDays / 7) * daysSoFar));

  const walksHit = week.filter((l) => (Number(l.miles) || 0) >= milesGoal).length;
  const walking = clamp01(walksHit / expectedWalks) * 30;

  const nutritionDays = week.filter(
    (l) =>
      Number(l.veg_servings) >= vegGoal &&
      l.avoided_sugary_drinks &&
      l.avoided_processed_carbs,
  ).length;
  const nutrition = clamp01(nutritionDays / daysSoFar) * 30;

  const proteinDays = week.filter((l) => Number(l.protein_g) >= proteinGoal * 0.9).length;
  const protein = clamp01(proteinDays / daysSoFar) * 20;

  const waterDays = week.filter((l) => Number(l.water_oz) >= waterGoal * 0.8).length;
  const water = clamp01(waterDays / daysSoFar) * 10;

  const weighDays = week.filter((l) => l.weight != null).length;
  const tracking = clamp01(weighDays / Math.min(daysSoFar, 5)) * 10;

  const total = Math.round(walking + nutrition + protein + water + tracking);
  const band: ScoreBreakdown['band'] = total >= 85 ? 'green' : total >= 65 ? 'yellow' : 'red';

  return {
    total,
    walking: Math.round(walking),
    nutrition: Math.round(nutrition),
    protein: Math.round(protein),
    water: Math.round(water),
    tracking: Math.round(tracking),
    band,
  };
}

// -------------------------------------------------------------- nutrition data

export type NutritionFacts = { calories: number; protein: number; carbs: number; fiber: number; fat: number };

const zero: NutritionFacts = { calories: 0, protein: 0, carbs: 0, fiber: 0, fat: 0 };

export const addFacts = (a: NutritionFacts, b: NutritionFacts): NutritionFacts => ({
  calories: a.calories + b.calories,
  protein: a.protein + b.protein,
  carbs: a.carbs + b.carbs,
  fiber: a.fiber + b.fiber,
  fat: a.fat + b.fat,
});

export type FoodOption = { key: string; label: string; serving: string; facts: NutritionFacts };

/** 6 oz cooked portions. */
export const BOWL_PROTEINS: FoodOption[] = [
  { key: 'chicken', label: 'Grilled chicken breast', serving: '6 oz', facts: { calories: 280, protein: 52, carbs: 0, fiber: 0, fat: 6 } },
  { key: 'shrimp', label: 'Shrimp', serving: '6 oz', facts: { calories: 170, protein: 36, carbs: 1, fiber: 0, fat: 2 } },
  { key: 'turkey', label: 'Ground turkey (93%)', serving: '6 oz', facts: { calories: 300, protein: 46, carbs: 0, fiber: 0, fat: 12 } },
  { key: 'sausage_shrimp', label: 'Andouille sausage + shrimp (Cajun)', serving: '3 oz + 3 oz', facts: { calories: 305, protein: 30, carbs: 2, fiber: 0, fat: 19 } },
  { key: 'shrimp_chicken', label: 'Shrimp + grilled chopped chicken', serving: '3 oz + 3 oz', facts: { calories: 225, protein: 44, carbs: 1, fiber: 0, fat: 4 } },
];


export const BOWL_VEGETABLES: FoodOption[] = [
  { key: 'onions', label: 'Grilled onions', serving: '1/2 cup', facts: { calories: 35, protein: 1, carbs: 8, fiber: 1.5, fat: 0 } },
  { key: 'peppers', label: 'Bell peppers', serving: '1/2 cup', facts: { calories: 20, protein: 1, carbs: 5, fiber: 1.5, fat: 0 } },
  { key: 'mushrooms', label: 'Mushrooms', serving: '1/2 cup', facts: { calories: 15, protein: 2, carbs: 2, fiber: 1, fat: 0 } },
  { key: 'cauliflower', label: 'Cauliflower', serving: '1/2 cup', facts: { calories: 15, protein: 1, carbs: 3, fiber: 1.5, fat: 0 } },
  { key: 'broccoli', label: 'Broccoli', serving: '1/2 cup', facts: { calories: 25, protein: 2, carbs: 5, fiber: 2.5, fat: 0 } },
  { key: 'spinach', label: 'Spinach', serving: '1 cup', facts: { calories: 10, protein: 1, carbs: 1, fiber: 1, fat: 0 } },
];

export const BOWL_CARBS: FoodOption[] = [
  { key: 'rice', label: 'Half cup rice', serving: '1/2 cup cooked', facts: { calories: 105, protein: 2, carbs: 22, fiber: 0.5, fat: 0 } },
  { key: 'half_half', label: 'Half rice / half cauliflower rice', serving: '1/2 + 1/2 cup', facts: { calories: 65, protein: 2, carbs: 13, fiber: 1.5, fat: 0 } },
  { key: 'cauli', label: 'Cauliflower rice only', serving: '1 cup', facts: { calories: 25, protein: 2, carbs: 5, fiber: 2, fat: 0 } },
  { key: 'cajun_rice', label: 'Cajun rice (peppers, onions, Cajun spice)', serving: '1/2 cup cooked', facts: { calories: 130, protein: 3, carbs: 25, fiber: 1.5, fat: 2 } },
];


export const SEASONINGS = ['Cajun', 'Garlic Herb', 'Lemon Pepper', 'Southwest', 'Mediterranean', 'Light Teriyaki', 'Salt and Pepper', 'Hot Sauce'];

/** A tablespoon of olive oil for the grill/skillet. */
export const COOKING_FAT: NutritionFacts = { calories: 120, protein: 0, carbs: 0, fiber: 0, fat: 14 };

export function bowlNutrition(opts: {
  proteinKey: string;
  vegKeys: string[];
  carbKey: string;
  includeOil: boolean;
  proteinServings?: number;
}): NutritionFacts {
  const p = BOWL_PROTEINS.find((x) => x.key === opts.proteinKey);
  const c = BOWL_CARBS.find((x) => x.key === opts.carbKey);
  const servings = opts.proteinServings ?? 1;
  let out = zero;
  if (p) {
    out = addFacts(out, {
      calories: p.facts.calories * servings,
      protein: p.facts.protein * servings,
      carbs: p.facts.carbs * servings,
      fiber: p.facts.fiber * servings,
      fat: p.facts.fat * servings,
    });
  }
  for (const key of opts.vegKeys) {
    const v = BOWL_VEGETABLES.find((x) => x.key === key);
    if (v) out = addFacts(out, v.facts);
  }
  if (c) out = addFacts(out, c.facts);
  if (opts.includeOil) out = addFacts(out, COOKING_FAT);
  return out;
}

export const BOWL_PROTEIN_TARGET = { min: 35, max: 45 };

export type BreakfastOption = {
  key: string;
  label: string;
  items: string[];
  facts: NutritionFacts;
};

export const BREAKFAST_OPTIONS: BreakfastOption[] = [
  {
    key: 'eggs_sausage_fruit',
    label: 'Two eggs, turkey sausage, fresh fruit with peanut butter',
    items: ['2 whole eggs', '3 turkey sausage links', '1 cup fresh fruit (apple, orange, pineapple)', '1 tbsp peanut butter'],
    facts: { calories: 495, protein: 35, carbs: 27, fiber: 4, fat: 30 },
  },
  {
    key: 'shake_eggs_fruit',
    label: 'Protein shake, two boiled eggs, fruit',
    items: ['1 scoop protein shake', '2 boiled eggs', '1 cup mixed fruit'],
    facts: { calories: 420, protein: 42, carbs: 26, fiber: 3, fat: 15 },
  },
  {
    key: 'omelette_toast',
    label: 'Onion & pepper omelette with L\'oven Fresh wheat toast',
    items: [
      '2 whole eggs (onion + bell pepper omelette)',
      '2 slices L\'oven Fresh 45-calorie whole wheat toast (13g net carbs, 4g fiber)',
      'Sautéed onions and peppers',
    ],
    facts: { calories: 325, protein: 20, carbs: 31, fiber: 7, fat: 16 },
  },
  {
    key: 'oatmeal_eggs_toast',
    label: 'Oatmeal with almond milk, Stevia, and cinnamon + eggs + toast',
    items: [
      '🥣 Oatmeal with almond milk, Stevia, and cinnamon',
      '🍳 2 eggs',
      '🍞 1 slice L\'Oven Fresh 45 Calorie 100% Whole Wheat Bread',
    ],
    facts: { calories: 365, protein: 21, carbs: 36, fiber: 6, fat: 17 },
  },
];

// ----------------------------------------------------------- meal prep planner

export const PREP_COOK_ITEMS = [
  'Cook chicken breast (grill or skillet)',
  'Cook shrimp',
  'Cook ground turkey',
  'Cook rice',
  'Cook cauliflower rice',
  'Grill onions',
  'Grill bell peppers',
  'Sauté mushrooms',
  'Steam broccoli',
  'Wash and bag spinach',
  'Portion meals into containers',
  'Label containers with day + protein',
];

export const PREP_SHOPPING_LIST = [
  'Chicken breast (4 lb)',
  'Shrimp (2 lb)',
  'Ground turkey 93% (2 lb)',
  'Onions (3)',
  'Bell peppers (6)',
  'Mushrooms (16 oz)',
  'Cauliflower / cauliflower rice',
  'Broccoli (2 crowns)',
  'Spinach (1 lb)',
  'Rice (long grain)',
  'Eggs (2 dozen)',
  'Turkey sausage',
  'Fresh fruit',
  'Protein powder',
  'Olive oil, Cajun, garlic herb, lemon pepper seasonings',
];

export function prepStatus(prep: { containers_packed: number; meals_consumed: number } | null) {
  const packed = prep?.containers_packed ?? 0;
  const eaten = prep?.meals_consumed ?? 0;
  const remaining = Math.max(0, packed - eaten);
  return {
    packed,
    eaten,
    remaining,
    daysRemaining: Math.floor(remaining / 2), // lunch + dinner per day
    completionPct: packed > 0 ? Math.min(1, eaten / packed) : 0,
  };
}

// ------------------------------------------------------------------ milestones

export const MILESTONE_REWARDS: Record<number, string> = {
  210: 'Momentum check-in — plan the next 10 lbs',
  200: 'New walking shoes',
  190: 'New workout clothing',
  180: 'New wardrobe',
  170: 'Fitness tracker upgrade',
  160: 'Professional photo session, executive health assessment, weekend celebration with spouse',
};

export const MILESTONE_WEIGHTS = [220, 210, 200, 190, 180, 170, 160];

export function projectMilestoneDate(
  target: number,
  status: WeightStatus | null,
): string | null {
  if (!status) return null;
  if (status.current <= target) return null;
  const rate = status.lbsPerWeek && status.lbsPerWeek > 0.05 ? status.lbsPerWeek : 1.5;
  const weeks = (status.current - target) / rate;
  return addDays(todayISO(), Math.round(weeks * 7));
}

// ----------------------------------------------------------------- achievements

export type BadgeDef = { key: string; label: string; group: 'miles' | 'weight' | 'consistency' };

export const BADGES: BadgeDef[] = [
  { key: 'first_walk', label: 'First Walk', group: 'miles' },
  { key: 'miles_25', label: '25 Miles', group: 'miles' },
  { key: 'miles_100', label: '100 Miles', group: 'miles' },
  { key: 'miles_250', label: '250 Miles', group: 'miles' },
  { key: 'miles_500', label: '500 Miles', group: 'miles' },
  { key: 'miles_1000', label: '1,000 Miles', group: 'miles' },
  { key: 'first_month', label: 'First Month Completed', group: 'consistency' },
  { key: 'lost_10', label: '10 Pounds Lost', group: 'weight' },
  { key: 'lost_20', label: '20 Pounds Lost', group: 'weight' },
  { key: 'lost_30', label: '30 Pounds Lost', group: 'weight' },
  { key: 'lost_40', label: '40 Pounds Lost', group: 'weight' },
  { key: 'lost_50', label: '50 Pounds Lost', group: 'weight' },
  { key: 'goal_weight', label: 'Goal Weight Achieved', group: 'weight' },
  { key: 'maintained_90', label: 'Maintained Goal 90 Days', group: 'consistency' },
  { key: 'maintained_365', label: 'Maintained Goal One Year', group: 'consistency' },
  { key: 'healthy_year', label: 'Healthy Year Award', group: 'consistency' },
];

/** Which badges the data says are earned right now. */
export function earnedBadgeKeys(
  logs: DailyLog[],
  totals: WalkTotals,
  status: WeightStatus | null,
  profile: HealthProfile | null,
): string[] {
  const out: string[] = [];
  if (totals.lifetime > 0) out.push('first_walk');
  if (totals.lifetime >= 25) out.push('miles_25');
  if (totals.lifetime >= 100) out.push('miles_100');
  if (totals.lifetime >= 250) out.push('miles_250');
  if (totals.lifetime >= 500) out.push('miles_500');
  if (totals.lifetime >= 1000) out.push('miles_1000');

  if (profile && daysBetween(profile.start_date, todayISO()) >= 30 && logs.length >= 20) {
    out.push('first_month');
  }
  if (status) {
    if (status.lost >= 10) out.push('lost_10');
    if (status.lost >= 20) out.push('lost_20');
    if (status.lost >= 30) out.push('lost_30');
    if (status.lost >= 40) out.push('lost_40');
    if (status.lost >= 50) out.push('lost_50');
    if (status.current <= status.goal) out.push('goal_weight');

    const atGoal = logs
      .filter((l) => l.weight != null && Number(l.weight) <= status.goal + 2)
      .map((l) => l.log_date)
      .sort();
    if (atGoal.length >= 2) {
      const span = daysBetween(atGoal[0], atGoal[atGoal.length - 1]);
      if (span >= 90) out.push('maintained_90');
      if (span >= 365) {
        out.push('maintained_365');
        out.push('healthy_year');
      }
    }
  }
  return out;
}

// -------------------------------------------------------------- trend rollups

export type TrendPoint = {
  key: string;
  label: string;
  miles: number;
  protein: number | null;
  water: number | null;
  weight: number | null;
  days: number;
  walksHit: number;
  energy: number | null;
  focus: number | null;
  revenue: number;
};

function bucket(logs: DailyLog[], keyOf: (iso: string) => string, milesGoal: number): TrendPoint[] {
  const map = new Map<string, DailyLog[]>();
  for (const l of logs) {
    const k = keyOf(l.log_date);
    const arr = map.get(k);
    if (arr) arr.push(l);
    else map.set(k, [l]);
  }
  const avg = (arr: (number | null)[]) => {
    const nums = arr.filter((n): n is number => n != null && Number.isFinite(n));
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, arr]) => ({
      key,
      label: key,
      miles: arr.reduce((s, l) => s + (Number(l.miles) || 0), 0),
      protein: avg(arr.map((l) => Number(l.protein_g))),
      water: avg(arr.map((l) => Number(l.water_oz))),
      weight: avg(arr.map((l) => (l.weight == null ? null : Number(l.weight)))),
      days: arr.length,
      walksHit: arr.filter((l) => (Number(l.miles) || 0) >= milesGoal).length,
      energy: avg(arr.map((l) => (l.energy_rating == null ? null : Number(l.energy_rating)))),
      focus: avg(arr.map((l) => (l.focus_rating == null ? null : Number(l.focus_rating)))),
      revenue: arr.reduce((s, l) => s + (Number(l.revenue_amount) || 0), 0),
    }));
}

export const weeklyTrend = (logs: DailyLog[], milesGoal = 3.5) => bucket(logs, weekStart, milesGoal);
export const monthlyTrend = (logs: DailyLog[], milesGoal = 3.5) => bucket(logs, monthKey, milesGoal);
export const annualTrend = (logs: DailyLog[], milesGoal = 3.5) => bucket(logs, yearKey, milesGoal);

// ----------------------------------------------------- productivity connection

export type ProductivityInsight = {
  consistentWeeks: number;
  inconsistentWeeks: number;
  energyLift: number | null;
  focusLift: number | null;
  revenueLift: number | null;
  headline: string;
};

/** Compares weeks that hit the walk target against weeks that didn't. */
export function productivityInsight(
  logs: DailyLog[],
  profile: HealthProfile | null,
): ProductivityInsight {
  const milesGoal = profile?.daily_miles_goal ?? 3.5;
  const walkDays = profile?.walk_days_per_week ?? 6;
  const weeks = weeklyTrend(logs, milesGoal).filter((w) => w.days >= 4);
  const good = weeks.filter((w) => w.walksHit >= walkDays);
  const bad = weeks.filter((w) => w.walksHit < walkDays);

  const mean = (arr: (number | null)[]) => {
    const nums = arr.filter((n): n is number => n != null);
    return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null;
  };
  const lift = (a: number | null, b: number | null) =>
    a != null && b != null && b > 0 ? ((a - b) / b) * 100 : null;

  const energyLift = lift(mean(good.map((w) => w.energy)), mean(bad.map((w) => w.energy)));
  const focusLift = lift(mean(good.map((w) => w.focus)), mean(bad.map((w) => w.focus)));
  const revenueLift = lift(
    mean(good.map((w) => (w.revenue > 0 ? w.revenue : null))),
    mean(bad.map((w) => (w.revenue > 0 ? w.revenue : null))),
  );

  let headline = 'Log a few more weeks of walks and focus ratings to unlock correlations.';
  if (good.length >= 2 && bad.length >= 1) {
    const best = [
      { name: 'focus', v: focusLift },
      { name: 'energy', v: energyLift },
      { name: 'revenue', v: revenueLift },
    ]
      .filter((x) => x.v != null)
      .sort((a, b) => (b.v as number) - (a.v as number))[0];
    if (best && (best.v as number) > 0) {
      headline = `During weeks with ${walkDays} completed walks, ${best.name} increased ${Math.round(best.v as number)}%.`;
    } else {
      headline = `No measurable lift yet — keep logging ${walkDays} walks per week and rate energy and focus daily.`;
    }
  }

  return {
    consistentWeeks: good.length,
    inconsistentWeeks: bad.length,
    energyLift,
    focusLift,
    revenueLift,
    headline,
  };
}

// ------------------------------------------------------ longevity & healthcare

export type LongevityEstimate = {
  bmiNow: number | null;
  bmiAtGoal: number | null;
  healthyLifeExpectancy: number;
  yearsIndependentLiving: number;
  healthyAgingScore: number;
  annualMedicalSavings: number;
  lifetimeMedicalSavings: number;
  premiumSavings: number;
};

/**
 * Educational estimate. Obesity-attributable medical spend runs roughly
 * $1,900-$2,500 per person per year (Ward et al., 2021 methodology), scaled by
 * how much excess weight is removed.
 */
export function longevityEstimate(
  profile: HealthProfile | null,
  status: WeightStatus | null,
  score: ScoreBreakdown,
  targetAge = 100,
): LongevityEstimate {
  const age = ageFrom(profile?.birth_date) ?? 59;
  const bmiNow = status?.bmi ?? null;
  const bmiAtGoal = profile ? bmi(profile.goal_weight, profile.height_inches) : null;

  const excess = status ? Math.max(0, status.current - status.goal) : 0;
  const removed = status ? status.lost : 0;
  const totalToRemove = Math.max(1, removed + excess);

  const fullSavings = 2200; // per year at goal weight
  const annualMedicalSavings = fullSavings * (removed / totalToRemove);
  const yearsAhead = Math.max(1, targetAge - age);
  const lifetimeMedicalSavings = annualMedicalSavings * yearsAhead;
  const premiumSavings = 480 * (removed / totalToRemove);

  // Family-history horizon is the floor (default 100+), extended further by
  // weight normalisation and weekly habit consistency.
  const weightFactor = removed / totalToRemove; // 0 -> 1
  const habitFactor = score.total / 100;
  const healthyLifeExpectancy = targetAge + weightFactor * 4 + habitFactor * 4;
  const yearsIndependentLiving = Math.max(0, healthyLifeExpectancy - age);
  const healthyAgingScore = Math.round(
    Math.min(100, 40 + weightFactor * 35 + habitFactor * 25),
  );

  return {
    bmiNow,
    bmiAtGoal,
    healthyLifeExpectancy,
    yearsIndependentLiving,
    healthyAgingScore,
    annualMedicalSavings,
    lifetimeMedicalSavings,
    premiumSavings,
  };
}

// ------------------------------------------------------------ motivation center

export const MOTIVATION = [
  'Health compounds exactly like investments.',
  'Every walk is a deposit into your future.',
  'Your body is the engine behind your purpose.',
  'Discipline today creates freedom tomorrow.',
  'Small daily habits become extraordinary long-term results.',
  'Energy creates productivity. Productivity creates income. Income builds legacy.',
  'You do not need a perfect week. You need the next walk.',
];

export function motivationForToday(offset = 0) {
  const dayIndex = Math.floor(Date.now() / 86_400_000) + offset;
  return MOTIVATION[dayIndex % MOTIVATION.length];
}

// --------------------------------------------------------------- misc helpers

export const fmtMiles = (n: number) => `${n.toFixed(n >= 100 ? 0 : 1)} mi`;
export const fmtLbs = (n: number) => `${n.toFixed(1)} lb`;
export const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
