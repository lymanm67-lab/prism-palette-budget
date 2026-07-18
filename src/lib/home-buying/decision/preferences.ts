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
  // Home Style
  ...['Bi-level','Split-level','Ranch','Cape Cod','Colonial','Two-story','Single-story living','Minimal stairs','First-floor bedroom']
    .map(n => ({ name:n, category:'Home Style', tier:'like' as Tier })),
  // Beds/Baths
  ...['Minimum 3 bedrooms','Primary bathroom','Two full bathrooms','First-floor bathroom','First-floor laundry']
    .map(n => ({ name:n, category:'Bedrooms & Bathrooms', tier:'must' as Tier })),
  ...['Minimum 2 bedrooms','Half bathroom','Walk-in closet']
    .map(n => ({ name:n, category:'Bedrooms & Bathrooms', tier:'like' as Tier })),
  // Parking
  ...['Two-car garage','Driveway','No shared driveway']
    .map(n => ({ name:n, category:'Parking & Access', tier:'must' as Tier })),
  ...['One-car garage','Three-car garage','Attached garage','Detached garage','Additional parking','Accessible entrance']
    .map(n => ({ name:n, category:'Parking & Access', tier:'like' as Tier })),
  // Interior
  ...['Central air','Updated electrical panel']
    .map(n => ({ name:n, category:'Interior', tier:'must' as Tier })),
  ...['Finished basement','Unfinished basement','Fireplace','Updated kitchen','Updated bathrooms','Home office','Large living room','Dining room','Hardwood floors','Adequate storage','Energy-efficient windows']
    .map(n => ({ name:n, category:'Interior', tier:'like' as Tier })),
  // Exterior
  ...['Deck','Patio','Front porch','Fenced yard','Large backyard','Storage shed','Low-maintenance exterior','Corner lot']
    .map(n => ({ name:n, category:'Exterior', tier:'like' as Tier })),
  ...['Hot tub','Pool']
    .map(n => ({ name:n, category:'Exterior', tier:'wish' as Tier })),
  // Condition
  ...['No major foundation issues','No active roof leaks','No major water damage','No visible mold concerns','No major sewer issues']
    .map(n => ({ name:n, category:'Property Condition', tier:'must' as Tier })),
  ...['Move-in ready','Newer roof','Newer furnace','Newer central-air system','Updated plumbing']
    .map(n => ({ name:n, category:'Property Condition', tier:'like' as Tier })),
  // Location
  ...['Preferred school district','Reliable internet access']
    .map(n => ({ name:n, category:'Location', tier:'must' as Tier })),
  ...['Ellet','Goodyear Heights','Firestone Park','Springfield Township','Quiet street','Low traffic','Near shopping','Near healthcare','Near parks','Short commute','Good street lighting']
    .map(n => ({ name:n, category:'Location', tier:'like' as Tier })),
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
