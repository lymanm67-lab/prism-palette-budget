// Rolls logged meals/drinks into the daily-log shape so the Command Center
// reflects everything logged in Nutrition (protein, calories, water) even when
// the daily log fields were never typed in manually.

type AnyRow = Record<string, any>;

const easternDate = (value?: string | null) =>
  value
    ? new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date(value))
    : null;

/** Correct legacy rows saved with the UTC date during the prior evening in Eastern time. */
const effectiveDate = (row: AnyRow, field: 'meal_date' | 'log_date') => {
  const entered = row?.[field];
  const savedEastern = easternDate(row?.created_at ?? row?.updated_at);
  return entered && savedEastern && entered > savedEastern ? savedEastern : entered;
};

export type MealDayTotals = {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  water_oz: number;
  mealCount: number;
};

/** Aggregate meals by date. Drinks contribute water ounces, not meal counts. */
export function mealTotalsByDate(meals: AnyRow[]): Map<string, MealDayTotals> {
  const map = new Map<string, MealDayTotals>();
  for (const m of meals ?? []) {
    const date = effectiveDate(m, 'meal_date');
    if (!date) continue;
    const cur =
      map.get(date) ??
      ({
        calories: 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        fiber_g: 0,
        water_oz: 0,
        mealCount: 0,
      } as MealDayTotals);

    cur.calories += Number(m.calories) || 0;
    cur.protein_g += Number(m.protein_g) || 0;
    cur.carbs_g += Number(m.carbs_g) || 0;
    cur.fat_g += Number(m.fat_g) || 0;
    cur.fiber_g += Number(m.fiber_g) || 0;

    if (m.meal_type === 'drink') {
      const c = m.components ?? {};
      const oz = Number(c.ounces ?? c.oz ?? 0) || 0;
      const isWater = String(c.drink ?? '').toLowerCase().includes('water');
      if (oz > 0 && (isWater || c.hydrating === true)) cur.water_oz += oz;
    } else {
      cur.mealCount += 1;
    }

    map.set(date, cur);
  }
  return map;
}

/**
 * Merge meal-derived nutrition into daily logs. Manual entries win when they are
 * larger, so nothing the user typed is ever reduced. Dates that only have meals
 * (no daily log row) get a synthetic log so weekly scoring sees them.
 */
export function mergeMealsIntoLogs<T extends AnyRow>(logs: T[], meals: AnyRow[]): T[] {
  const totals = mealTotalsByDate(meals);
  const normalizedLogs = (logs ?? []).map((l) => ({
    ...l,
    log_date: effectiveDate(l, 'log_date'),
  })) as T[];
  if (!totals.size) return normalizedLogs;

  const byDate = new Map<string, T>();
  for (const l of normalizedLogs) byDate.set(l.log_date, l);

  const merged: T[] = normalizedLogs.map((l) => {
    const t = totals.get(l.log_date);
    if (!t) return l;
    return {
      ...l,
      protein_g: Math.max(Number(l.protein_g) || 0, Math.round(t.protein_g)),
      water_oz: Math.max(Number(l.water_oz) || 0, Math.round(t.water_oz)),
      meal_calories: Math.round(t.calories),
      meal_count: t.mealCount,
    } as T;
  });

  for (const [date, t] of totals) {
    if (byDate.has(date)) continue;
    merged.push({
      log_date: date,
      miles: 0,
      protein_g: Math.round(t.protein_g),
      water_oz: Math.round(t.water_oz),
      veg_servings: 0,
      fruit_servings: 0,
      meal_calories: Math.round(t.calories),
      meal_count: t.mealCount,
    } as unknown as T);
  }

  merged.sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
  return merged;
}
