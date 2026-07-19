// Per-property store: walkthrough results, repair estimates, neighborhood, decision.
import type { ItemStatus, RiskLevel } from './walkthrough-defs';

export interface WalkItemState {
  status?: ItemStatus;
  note?: string;
  photo?: string;           // base64 dataURL (small preview)
  question?: string;
  followUp?: boolean;
  needsPro?: boolean;
  sellerResponse?: string;
  verification?: string;
  reviewedAt?: string;
  repairLow?: number;
  repairExpected?: number;
  repairHigh?: number;
  sellerCredit?: number;
  sellerRepairRequested?: boolean;
  buyerAsIs?: boolean;
  specialistQuoteRequired?: boolean;
  fhaRequired?: boolean;
  deadline?: string;
  negotiationNote?: string;
  riskOverride?: RiskLevel;
}

export interface PropertyProfile {
  id: string;
  address: string;
  price: number;
  taxPct?: number;
  insurancePct?: number;
  hoaMonthly?: number;
  floodMonthly?: number;
  bedrooms?: number;
  bathrooms?: number;
  garage?: string;
  neighborhood?: string;
}

const KEYS = {
  walk: (id: string) => `propertyWalkthrough_${id}`,
  repair: (id: string) => `propertyRepairEstimate_${id}`,
  nbhd: (id: string) => `propertyNeighborhoodReview_${id}`,
  decision: (id: string) => `propertyDecision_${id}`,
  score: (id: string) => `propertyPreferenceScore_${id}`,
  props: 'homeBuyingProperties',
  prefsByProp: (id: string) => `propertyPreferenceChecks_${id}`,
  uploads: (id: string) => `propertyUploads_${id}`,
};

export interface PropertyPhoto {
  id: string;
  dataUrl: string;      // resized preview
  caption?: string;
  room?: string;
  addedAt: string;
}
export interface PropertyDoc {
  id: string;
  name: string;
  size: number;
  mime: string;
  dataUrl: string;      // base64 for small files, else undefined
  kind?: 'listing' | 'disclosure' | 'inspection' | 'title' | 'other';
  notes?: string;
  addedAt: string;
}
export interface PropertyUploads {
  photos: PropertyPhoto[];
  docs: PropertyDoc[];
  listingUrl?: string;
  mlsNumber?: string;
  listingNotes?: string;
}

// generic JSON LS
function ls<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function save<T>(key: string, val: T) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* quota */ }
}

// Properties list
export function loadProperties(): PropertyProfile[] {
  return ls<PropertyProfile[]>(KEYS.props, []);
}
export function saveProperties(list: PropertyProfile[]) {
  save(KEYS.props, list);
}
export function upsertProperty(p: PropertyProfile) {
  const all = loadProperties();
  const i = all.findIndex(x => x.id === p.id);
  if (i >= 0) all[i] = p; else all.push(p);
  saveProperties(all);
  return all;
}
export function removeProperty(id: string) {
  const all = loadProperties().filter(p => p.id !== id);
  saveProperties(all);
  ['walk','repair','nbhd','decision','score','prefsByProp'].forEach(k => {
    try { localStorage.removeItem((KEYS as any)[k](id)); } catch {}
  });
  return all;
}

// Walkthrough per-item state map keyed by item id
export type WalkMap = Record<string, WalkItemState>;
export function loadWalk(id: string): WalkMap { return ls<WalkMap>(KEYS.walk(id), {}); }
export function saveWalk(id: string, m: WalkMap) { save(KEYS.walk(id), m); }

// Neighborhood
export function loadNbhd(id: string): WalkMap { return ls<WalkMap>(KEYS.nbhd(id), {}); }
export function saveNbhd(id: string, m: WalkMap) { save(KEYS.nbhd(id), m); }

// Decision
export interface DecisionRecord {
  status?: string;
  note?: string;
  savedAt?: string;
}
export function loadDecision(id: string): DecisionRecord { return ls<DecisionRecord>(KEYS.decision(id), {}); }
export function saveDecision(id: string, d: DecisionRecord) { save(KEYS.decision(id), { ...d, savedAt: new Date().toISOString() }); }

// Per-property preference checks: recordId -> checked boolean
export function loadPrefChecks(id: string): Record<string, boolean> { return ls(KEYS.prefsByProp(id), {}); }
export function savePrefChecks(id: string, m: Record<string, boolean>) { save(KEYS.prefsByProp(id), m); }
