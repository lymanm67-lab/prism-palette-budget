/**
 * Money Coach opportunity-cost & emotional-spend engine.
 * Reframes every discretionary transaction in Financial Freedom terms.
 */

export interface OpportunityCostInputs {
  amount: number; // absolute value of the outflow
  dailyFreedomProgress: number; // $/day toward FI
  planningReturnRate: number; // e.g. 0.07
  yearsHorizon: number; // e.g. 30
  legacyWorthPerDollar: number; // roughly amount / target * factor weight — ~0.0005 default
  merchantCategory?: string;
  timeOfDay?: number; // 0..23
  velocityLast7Days?: number; // count of similar purchases in last 7 days
}

export interface OpportunityCostResult {
  daysDelayedFreedom: number;
  futureValueAtHorizon: number;
  legacyWorthDelta: number;
  emotionalScore: number; // 0..1
  emotionalReasons: string[];
  headline: string;
  detail: string;
}

const EMOTIONAL_CATEGORIES = new Set([
  'dining', 'restaurants', 'fast_food', 'coffee_shops',
  'entertainment', 'games', 'apps', 'gambling',
  'shopping', 'clothing', 'department_stores', 'electronics',
  'alcohol', 'tobacco', 'bars',
]);

export function computeOpportunityCost(i: OpportunityCostInputs): OpportunityCostResult {
  const amt = Math.abs(i.amount);
  const daysDelayedFreedom = i.dailyFreedomProgress > 0
    ? Math.round(amt / i.dailyFreedomProgress)
    : 0;

  const futureValueAtHorizon = amt * Math.pow(1 + i.planningReturnRate, i.yearsHorizon);
  const legacyWorthDelta = -Math.abs(amt * i.legacyWorthPerDollar);

  // Emotional heuristic
  const reasons: string[] = [];
  let emotional = 0;
  const cat = (i.merchantCategory || '').toLowerCase();
  if (EMOTIONAL_CATEGORIES.has(cat)) { emotional += 0.35; reasons.push('discretionary category'); }
  if (typeof i.timeOfDay === 'number' && (i.timeOfDay >= 22 || i.timeOfDay < 6)) {
    emotional += 0.25; reasons.push('late-night purchase');
  }
  if ((i.velocityLast7Days ?? 0) >= 3) { emotional += 0.3; reasons.push(`${i.velocityLast7Days} similar purchases this week`); }
  if (amt > 100 && EMOTIONAL_CATEGORIES.has(cat)) { emotional += 0.15; reasons.push('impulse threshold exceeded'); }
  emotional = Math.min(1, emotional);

  const headline = daysDelayedFreedom > 0
    ? `This delays Financial Freedom by ~${daysDelayedFreedom} day${daysDelayedFreedom === 1 ? '' : 's'}.`
    : `Every $1 you keep now compounds forward.`;

  const detail = `If invested at ${(i.planningReturnRate * 100).toFixed(0)}% for ${i.yearsHorizon} years, this $${amt.toFixed(0)} could grow to ~$${Math.round(futureValueAtHorizon).toLocaleString()}.`;

  return {
    daysDelayedFreedom,
    futureValueAtHorizon,
    legacyWorthDelta,
    emotionalScore: emotional,
    emotionalReasons: reasons,
    headline,
    detail,
  };
}
