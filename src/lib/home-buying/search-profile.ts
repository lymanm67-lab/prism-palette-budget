// Home Search Profile — single source of truth for the user's rules.
// Persisted in localStorage (no DB churn). Enforced everywhere.

export type HomeCondition = 'move_in' | 'cosmetic_ok' | 'any';
export type MetroMode = 'akron' | 'generic';

export interface HomeSearchProfile {
  metroMode: MetroMode;
  genericMetro: string;         // used when metroMode === 'generic'
  purchaseTimeline: string;     // e.g. 'July 2027' — freeform
  maxPrice: number;
  maxMonthlyPayment: number;
  preferredStyles: string[];
  minBeds: number;
  minBaths: number;
  minSqft: number;
  garage: 'required' | 'preferred' | 'none';
  minLotAcres: number;
  yearBuiltMin: number;
  yearBuiltMax: number;
  condition: HomeCondition;
  maxHoa: number;
  maxCommuteMin: number;
  excludeFloodRisk: boolean;
  excludeHighCrime: boolean;
  excludeMajorRepairs: boolean;
  // Financing assumptions used for the Monthly Payment Analyzer
  downPct: number;
  ratePct: number;
  termYears: number;
}

export const DEFAULT_PROFILE: HomeSearchProfile = {
  metroMode: 'akron',
  genericMetro: '',
  purchaseTimeline: 'July 2027',
  maxPrice: 185000,
  maxMonthlyPayment: 1350,
  preferredStyles: ['Split-Level', 'Bi-Level', 'Raised Ranch'],
  minBeds: 3,
  minBaths: 2,
  minSqft: 1400,
  garage: 'preferred',
  minLotAcres: 0.2,
  yearBuiltMin: 1960,
  yearBuiltMax: 1995,
  condition: 'cosmetic_ok',
  maxHoa: 50,
  maxCommuteMin: 30,
  excludeFloodRisk: true,
  excludeHighCrime: true,
  excludeMajorRepairs: true,
  downPct: 10,
  ratePct: 6.75,
  termYears: 30,
};

const KEY = 'prism.home-search-profile.v1';

export function loadProfile(): HomeSearchProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: HomeSearchProfile) {
  try { localStorage.setItem(KEY, JSON.stringify(profile)); } catch { /* ignore quota */ }
}

export const STYLE_OPTIONS = [
  'Ranch', 'Split-Level', 'Bi-Level', 'Raised Ranch', 'Colonial',
  'Cape Cod', 'Craftsman', 'Contemporary', 'Tudor', 'Victorian',
  'Townhouse', 'Condo',
];
