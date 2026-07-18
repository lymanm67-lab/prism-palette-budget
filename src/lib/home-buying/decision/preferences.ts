// Home Buying Preferences — Must-Haves / Like-to-Have / Wish List
export type Tier = 'must' | 'like' | 'wish';
export const TIER_LABEL: Record<Tier, string> = {
  must: 'Deal-Breakers',
  like: 'Preferred Features',
  wish: 'Dream Features',
};
export const TIER_COLOR: Record<Tier, string> = {
  must: 'border-red-500/40 bg-red-500/5 text-red-300',
  like: 'border-amber-500/40 bg-amber-500/5 text-amber-300',
  wish: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-300',
};
export const TIER_DOT: Record<Tier, string> = {
  must: 'bg-red-500',
  like: 'bg-amber-500',
  wish: 'bg-emerald-500',
};

export interface Preference {
  id: string;
  name: string;
  category: string;
  tier: Tier;
  note?: string;
  checked?: boolean;
  custom?: boolean;
}

const LS_KEY = 'homeBuyingPreferences';

const DEFAULT_SEEDS: Array<Omit<Preference, 'id'>> = [
  // MUST-HAVES — simple, concrete deal-breakers
  { name: '3 bedrooms', category: 'Bedrooms', tier: 'must' },
  { name: '2 bathrooms', category: 'Bathrooms', tier: 'must' },
  { name: 'Central air', category: 'Systems', tier: 'must' },
  { name: '2-car garage', category: 'Parking', tier: 'must' },
  { name: 'Driveway', category: 'Parking', tier: 'must' },

  // LIKE-TO-HAVE — nice upgrades
  { name: '4 bedrooms', category: 'Bedrooms', tier: 'like' },
  { name: 'Primary bathroom', category: 'Bathrooms', tier: 'like' },
  { name: 'Half bathroom', category: 'Bathrooms', tier: 'like' },
  { name: 'First-floor bedroom', category: 'Layout', tier: 'like' },
  { name: 'First-floor laundry', category: 'Layout', tier: 'like' },
  { name: 'Porch', category: 'Outdoor', tier: 'like' },
  { name: 'Patio', category: 'Outdoor', tier: 'like' },
  { name: 'Deck', category: 'Outdoor', tier: 'like' },
  { name: 'Fenced yard', category: 'Outdoor', tier: 'like' },
  { name: 'Finished basement', category: 'Interior', tier: 'like' },
  { name: 'Updated kitchen', category: 'Interior', tier: 'like' },
  { name: 'Fireplace', category: 'Interior', tier: 'like' },
  { name: '3-car garage', category: 'Parking', tier: 'like' },

  // WISH LIST — dream extras
  { name: 'Hot tub', category: 'Outdoor', tier: 'wish' },
  { name: 'Pool', category: 'Outdoor', tier: 'wish' },
  { name: 'Home office', category: 'Interior', tier: 'wish' },
  { name: 'Large backyard', category: 'Outdoor', tier: 'wish' },
];

export function defaultPreferences(): Preference[] {
  return DEFAULT_SEEDS.map((p, i) => ({ ...p, id: `seed-${i}`, checked: p.tier === 'must' }));
}

export function loadPreferences(): Preference[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultPreferences();
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return defaultPreferences();
  } catch { return defaultPreferences(); }
}

export function savePreferences(prefs: Preference[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prefs)); } catch { /* quota */ }
}

export function resetPreferences() {
  const p = defaultPreferences();
  savePreferences(p);
  return p;
}

export function clearPreferences() {
  savePreferences([]);
  return [];
}

export function isDuplicate(prefs: Preference[], name: string, excludeId?: string) {
  const n = name.trim().toLowerCase();
  return prefs.some(p => p.id !== excludeId && p.name.trim().toLowerCase() === n);
}
