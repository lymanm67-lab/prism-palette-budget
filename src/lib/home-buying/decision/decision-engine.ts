// Scoring & recommendation engine.
import { calcMortgage } from '../mortgage-math';
import { WALK_SECTIONS, NEIGHBORHOOD_ITEMS, type RiskLevel } from './walkthrough-defs';
import type { Preference } from './preferences';
import type { WalkMap, PropertyProfile } from './walkthrough-store';

export interface DecisionInputs {
  property: PropertyProfile;
  preferences: Preference[];
  prefChecks: Record<string, boolean>;     // per-property must/like/wish confirmed
  walk: WalkMap;
  nbhd: WalkMap;
  maxMonthlyPayment: number;
  minReserveAfterClose: number;
  currentSavings: number;
  cashToClose: number;
  downPct: number;
  ratePct: number;
  termYears: number;
  pmiPct?: number;
}

export interface DecisionResult {
  score: number;
  status: RecommendationStatus;
  mustMet: number;
  mustMissing: number;
  mustUnknown: number;
  likeMet: number;
  wishMet: number;
  criticalRisks: string[];
  highRisks: string[];
  moderateRisks: string[];
  unknownItems: string[];
  followUps: string[];
  immediateRepair: number;
  threeYearRepair: number;
  effectivePrice: number;
  allInMonthly: number;
  overBudget: boolean;
  reserveAfterClose: number;
  reserveBreach: boolean;
  hasFloodConcern: boolean;
  hasFoundationConcern: boolean;
  hasInsuranceConcern: boolean;
  hasFhaConcern: boolean;
  dealBreaker: boolean;
  reasons: string[];
}

export type RecommendationStatus =
  | 'strong_match' | 'match_minor' | 'proceed_negotiate'
  | 'requires_specialist' | 'does_not_meet' | 'high_financial_risk' | 'do_not_proceed'
  | 'insufficient_info';

export const STATUS_META: Record<RecommendationStatus, { label: string; tone: string }> = {
  strong_match:        { label: 'Strong Match',                       tone: 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' },
  match_minor:         { label: 'Match With Minor Concerns',          tone: 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5' },
  proceed_negotiate:   { label: 'Proceed Only With Negotiated Repairs', tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  requires_specialist: { label: 'Requires Specialist Review',         tone: 'text-amber-300 border-amber-500/40 bg-amber-500/10' },
  does_not_meet:       { label: 'Does Not Meet Must-Haves',           tone: 'text-red-300 border-red-500/40 bg-red-500/10' },
  high_financial_risk: { label: 'High Financial Risk',                tone: 'text-red-300 border-red-500/40 bg-red-500/10' },
  do_not_proceed:      { label: 'Do Not Proceed',                     tone: 'text-red-400 border-red-500/50 bg-red-500/15' },
  insufficient_info:   { label: 'Verification Needed Before Decision',tone: 'text-muted-foreground border-border/60 bg-muted/20' },
};

function riskWeight(r: RiskLevel) {
  return r === 'critical' ? -40 : r === 'high' ? -20 : r === 'moderate' ? -5 : 0;
}

const ITEM_LOOKUP = (() => {
  const m: Record<string, { name: string; risk: RiskLevel; section: string }> = {};
  WALK_SECTIONS.forEach(s => s.items.forEach(it => { m[it.id] = { name: it.name, risk: it.risk, section: s.title }; }));
  NEIGHBORHOOD_ITEMS.forEach(it => { m[it.id] = { name: it.name, risk: it.risk, section: 'Neighborhood' }; });
  return m;
})();

const FOUNDATION_KEYS = ['horizontal_foundation_cracks','bowing_walls','stair_step_brick_cracks','temporary_support_posts','sagging_floor_joists'];
const FLOOD_KEYS = ['evidence_of_sewer_backup','basement_drain_backups','flood_zone_status','flood_prone_streets','standing_water_outside_near_foundation'];
const INSURANCE_KEYS = ['prior_insurance_claims','roof_insurability_concerns','electrical_system_insurability','underground_oil_tank'];
const FHA_KEYS = ['fha_repair_concerns','peeling_exterior_paint','missing_handrails','broken_windows','trip_hazards'];

export function computeDecision(inp: DecisionInputs): DecisionResult {
  const { property, preferences, prefChecks, walk, nbhd } = inp;
  const combined: WalkMap = { ...walk, ...nbhd };

  // Preferences
  let mustMet = 0, mustMissing = 0, mustUnknown = 0, likeMet = 0, wishMet = 0;
  let score = 0;
  preferences.forEach(p => {
    if (!p.checked) return; // only score selected preferences
    const state = prefChecks[p.id];
    if (state === true) {
      if (p.tier === 'must') { mustMet++; score += 10; }
      else if (p.tier === 'like') { likeMet++; score += 5; }
      else { wishMet++; score += 2; }
    } else if (state === false) {
      if (p.tier === 'must') { mustMissing++; score -= 25; }
    } else {
      if (p.tier === 'must') mustUnknown++;
    }
  });

  // Risks
  const critical: string[] = [], high: string[] = [], mod: string[] = [];
  const unknown: string[] = [], followUps: string[] = [];
  let immediateRepair = 0, threeYearRepair = 0;
  let proBonus = 0, sellerRepairBonus = 0;

  Object.entries(combined).forEach(([itemId, st]) => {
    const meta = ITEM_LOOKUP[itemId];
    const name = meta?.name || itemId;
    const risk = st.riskOverride || meta?.risk || 'moderate';

    if (st.status === 'major' || st.status === 'needs_pro') {
      if (risk === 'critical') { critical.push(name); score += riskWeight('critical'); }
      else if (risk === 'high') { high.push(name); score += riskWeight('high'); }
      else if (risk === 'moderate') { mod.push(name); score += riskWeight('moderate'); }
    } else if (st.status === 'minor') {
      mod.push(name); score += riskWeight('moderate') / 2;
    } else if (st.status === 'unknown') {
      unknown.push(name);
    }
    if (st.followUp) followUps.push(name);
    if (st.needsPro && st.status !== 'good') proBonus += 5;
    if (st.sellerRepairRequested && (st.sellerCredit || 0) > 0) sellerRepairBonus += 5;

    const exp = st.repairExpected || 0;
    if (exp > 0) {
      immediateRepair += exp;
      threeYearRepair += exp;
    }
  });
  proBonus = Math.min(proBonus, 15);
  sellerRepairBonus = Math.min(sellerRepairBonus, 15);
  score += proBonus + sellerRepairBonus;

  // Financials
  const m = calcMortgage({
    price: property.price,
    downPct: inp.downPct,
    ratePct: inp.ratePct,
    termYears: inp.termYears,
    propertyTaxPct: property.taxPct ?? 1.85,
    insurancePct: property.insurancePct ?? 0.55,
    hoaMonthly: property.hoaMonthly ?? 0,
    pmiPct: inp.pmiPct ?? 0.85,
  });
  const allInMonthly = m.monthlyPITI + (property.floodMonthly || 0);
  const overBudget = allInMonthly > inp.maxMonthlyPayment;
  score += overBudget ? -20 : 10;

  const effectivePrice = property.price + immediateRepair;
  const reserveAfterClose = inp.currentSavings - inp.cashToClose - immediateRepair;
  const reserveBreach = reserveAfterClose < inp.minReserveAfterClose;
  if (reserveBreach) score -= 25;

  const anyFlagged = (keys: string[]) => keys.some(k => {
    const st = combined[k];
    return st && (st.status === 'major' || st.status === 'needs_pro' || st.status === 'unknown');
  });
  const hasFloodConcern = anyFlagged(FLOOD_KEYS);
  const hasFoundationConcern = anyFlagged(FOUNDATION_KEYS);
  const hasInsuranceConcern = anyFlagged(INSURANCE_KEYS);
  const hasFhaConcern = anyFlagged(FHA_KEYS);

  const dealBreaker = mustMissing >= 1;
  const reasons: string[] = [];
  if (mustMissing) reasons.push(`${mustMissing} deal-breaker Must-Have(s) missing`);
  if (critical.length) reasons.push(`${critical.length} unresolved critical risk(s)`);
  if (high.length) reasons.push(`${high.length} high-risk issue(s)`);
  if (overBudget) reasons.push(`Payment ${Math.round(allInMonthly - inp.maxMonthlyPayment)} over max`);
  if (reserveBreach) reasons.push(`Emergency reserve breach after close`);
  if (hasFoundationConcern) reasons.push('Foundation concern unresolved');
  if (hasFloodConcern) reasons.push('Flooding/water history unverified');
  if (hasInsuranceConcern) reasons.push('Insurance concern unresolved');
  if (hasFhaConcern) reasons.push('FHA eligibility concern');
  if (mustUnknown) reasons.push(`${mustUnknown} Must-Have(s) unverified`);

  // Status
  let status: RecommendationStatus;
  if (mustMissing >= 2 || critical.length >= 2) status = 'do_not_proceed';
  else if (mustMissing >= 1) status = 'does_not_meet';
  else if (reserveBreach || overBudget) status = 'high_financial_risk';
  else if (critical.length >= 1) status = 'do_not_proceed';
  else if (followUps.filter(_ => true).length > 0 && (high.length >= 3)) status = 'requires_specialist';
  else if (high.length >= 1 || mod.length >= 3) status = 'proceed_negotiate';
  else if (unknown.length >= 3 || mustUnknown >= 1) status = 'insufficient_info';
  else if (mod.length >= 1) status = 'match_minor';
  else status = 'strong_match';

  // Enforce Strong Match blockers
  const strongBlocked = critical.length > 0 || mustMissing > 0 || hasFloodConcern || hasFoundationConcern
    || hasInsuranceConcern || hasFhaConcern || reserveBreach || overBudget;
  if (status === 'strong_match' && strongBlocked) status = 'proceed_negotiate';

  return {
    score: Math.round(score),
    status,
    mustMet, mustMissing, mustUnknown, likeMet, wishMet,
    criticalRisks: critical, highRisks: high, moderateRisks: mod,
    unknownItems: unknown, followUps,
    immediateRepair, threeYearRepair,
    effectivePrice, allInMonthly, overBudget,
    reserveAfterClose, reserveBreach,
    hasFloodConcern, hasFoundationConcern, hasInsuranceConcern, hasFhaConcern,
    dealBreaker, reasons,
  };
}
