// SwingEdge — Mentor Top 5.
//
// Picks up to five diversified candidates from a finished scan. A name only
// makes the list when it passes the trader's own selection criteria, and no
// two picks may share an exposure family — so the list cannot quietly become
// five versions of the same bet.
//
// Nothing here invents data: a candidate with missing geometry or event
// information is simply not eligible, and an empty result is a valid answer.

import { familyFor, familiesRelated, type ExposureFamily } from './exposureFamily';
import type { Verdict } from './types';

export interface MentorCandidate {
  symbol: string;
  verdict: Verdict;
  /** Readiness score 0–100. */
  score: number;
  setup: string | null;
  /** Reward-to-risk from the trade geometry, or null when unknown. */
  rewardRisk: number | null;
  /** Event risk band, or null when the calendar could not be read. */
  eventBand: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE' | null;
  /** Liquidity grade, or null when history was too short. */
  liquidityGrade: 'HIGH' | 'ADEQUATE' | 'THIN' | 'UNKNOWN' | null;
  /** Buyer/seller pressure state, or null when unread. */
  pressureState: string | null;
  /** Directional bias direction, or null. */
  biasDirection: 'UP' | 'DOWN' | 'SIDEWAYS' | null;
  /** Sector hint used only when the symbol is not in the family map. */
  sector?: string | null;
}

export interface MentorPick {
  symbol: string;
  score: number;
  verdict: Verdict;
  rewardRisk: number | null;
  family: ExposureFamily | null;
  familyLabel: string | null;
  /** One plain sentence on why this name made the list. */
  why: string;
}

export interface MentorTop5Result {
  picks: MentorPick[];
  /** Symbols that passed the quality bar but were skipped for diversification. */
  skippedForDiversity: { symbol: string; familyLabel: string }[];
  /** True when fewer than five names qualified — shown honestly, not padded. */
  short: boolean;
}

const MIN_RR = 2;
const MAX_PER_FAMILY = 1;
const PICK_COUNT = 5;

/** The quality bar every pick must clear, whatever the portfolio holds. */
function eligible(c: MentorCandidate): boolean {
  if (c.verdict !== 'QUALIFIES' && c.verdict !== 'WATCH') return false;
  if (!c.setup || c.setup === 'NONE') return false;
  if (c.rewardRisk === null || c.rewardRisk < MIN_RR) return false;
  if (c.eventBand === 'HIGH' || c.eventBand === 'SEVERE') return false;
  if (c.liquidityGrade === 'THIN') return false;
  if (c.pressureState === 'SELLERS_IN_CONTROL') return false;
  if (c.biasDirection === 'DOWN') return false;
  return true;
}

/**
 * Picks up to five candidates. QUALIFIES rows are preferred; WATCH rows only
 * fill remaining slots. Each pick is the best-scoring name in its family, and
 * families already held in open trades are excluded so a new pick never adds
 * to an existing concentration.
 */
export function pickMentorTop5(
  candidates: MentorCandidate[],
  openSymbols: string[],
): MentorTop5Result {
  const heldFamilies = new Set<ExposureFamily>();
  for (const sym of openSymbols) {
    const f = familyFor(sym);
    if (f) heldFamilies.add(f);
  }

  const eligibleRows = candidates
    .filter(eligible)
    .map((c) => ({ c, family: familyFor(c.symbol, c.sector) }))
    .sort(
      (a, b) =>
        (a.c.verdict === 'QUALIFIES' ? 0 : 1) - (b.c.verdict === 'QUALIFIES' ? 0 : 1) ||
        b.c.score - a.c.score ||
        (b.c.rewardRisk ?? 0) - (a.c.rewardRisk ?? 0),
    );

  const picks: MentorPick[] = [];
  const skippedForDiversity: { symbol: string; familyLabel: string }[] = [];
  const usedFamilies = new Map<ExposureFamily, number>();

  for (const { c, family } of eligibleRows) {
    if (picks.length >= PICK_COUNT) break;
    if (family) {
      if (heldFamilies.has(family)) {
        skippedForDiversity.push({ symbol: c.symbol, familyLabel: family });
        continue;
      }
      const used = usedFamilies.get(family) ?? 0;
      if (used >= MAX_PER_FAMILY) {
        skippedForDiversity.push({ symbol: c.symbol, familyLabel: family });
        continue;
      }
    }
    if (family) usedFamilies.set(family, (usedFamilies.get(family) ?? 0) + 1);
    picks.push({
      symbol: c.symbol,
      score: c.score,
      verdict: c.verdict,
      rewardRisk: c.rewardRisk,
      family,
      familyLabel: family,
      why: whyLine(c),
    });
  }

  return { picks, skippedForDiversity, short: picks.length < PICK_COUNT };
}

function whyLine(c: MentorCandidate): string {
  const parts: string[] = [];
  parts.push(c.verdict === 'QUALIFIES' ? 'Qualifies now' : 'Setup forming');
  if (c.rewardRisk !== null) parts.push(`${c.rewardRisk.toFixed(1)} : 1 reward to risk`);
  if (c.eventBand === 'LOW') parts.push('clear calendar');
  if (c.pressureState === 'BUYERS_IN_CONTROL' || c.pressureState === 'BUYERS_LEANING') {
    parts.push('buyers in control');
  }
  return parts.join(' · ');
}
