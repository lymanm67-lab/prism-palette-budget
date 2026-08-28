// Directional tri-bureau score modeling engine.
//
// IMPORTANT: These are heuristic, rules-based estimates — NOT FICO or VantageScore
// output. Only FICO/VantageScore licensees (myFICO, bureaus) can produce real model
// scores. This engine models *direction and rough magnitude* per bureau, using the
// tradeline data actually reported to that bureau.

import { qualifyingFico, BUREAU_MODEL, loadMortgageFico, type MortgageFico } from '@/lib/home-buying/mortgage-fico';

export type Bureau = 'Equifax' | 'Experian' | 'TransUnion';
export const BUREAUS: Bureau[] = ['Equifax', 'Experian', 'TransUnion'];

/** Which models each bureau's file gets scored under, and how sensitive each is. */
export const BUREAU_PROFILE: Record<Bureau, {
  mortgageModel: string;
  consumerModel: string;
  /** Multiplier on utilization sensitivity — mortgage-era models punish util harder. */
  utilWeight: number;
  /** Multiplier on derogatory sensitivity. */
  derogWeight: number;
  /** Points per hard inquiry in the last 12 months. */
  inquiryPts: number;
  color: string;
}> = {
  Equifax: {
    mortgageModel: 'FICO 5 (Beacon 5.0)',
    consumerModel: 'FICO 8 / VantageScore 3.0',
    utilWeight: 1.0,
    derogWeight: 1.0,
    inquiryPts: 4,
    color: 'text-prism-teal',
  },
  Experian: {
    mortgageModel: 'FICO 2 (Score 2/v2)',
    consumerModel: 'FICO 8 / VantageScore 3.0',
    utilWeight: 1.1,
    derogWeight: 0.95,
    inquiryPts: 5,
    color: 'text-prism-amber',
  },
  TransUnion: {
    mortgageModel: 'FICO 4 (Classic 04)',
    consumerModel: 'FICO 8 / VantageScore 3.0',
    utilWeight: 0.95,
    derogWeight: 1.1,
    inquiryPts: 3,
    color: 'text-prism-sky',
  },
};

export const DEROGATORY_STATUSES = ['Collection', 'Charge-Off', 'Foreclosure', 'Repossession'];

export interface Tradeline {
  id: string;
  bureau: string;
  account_name: string;
  account_type: string;
  account_status: string;
  balance: number;
  credit_limit: number | null;
  date_opened: string | null;
}

/** A single stackable action the user can layer into a scenario. */
export type ScenarioAction =
  | { kind: 'paydown'; id: string; accountId: string; amount: number }
  | { kind: 'dispute'; id: string; accountId: string }
  | { kind: 'limitIncrease'; id: string; accountId: string; amount: number }
  | { kind: 'ageInquiries'; id: string; months: number }
  | { kind: 'newInquiry'; id: string; count: number }
  | { kind: 'newCard'; id: string; limit: number };

export interface CardUtilization {
  id: string;
  name: string;
  bureau: string;
  balance: number;
  simBalance: number;
  limit: number;
  simLimit: number;
  util: number;
  simUtil: number;
  /** Directional score effect of this single card's utilization, in points. */
  effect: number;
  simEffect: number;
  band: 'ideal' | 'good' | 'watch' | 'high' | 'maxed';
}

export interface BureauEstimate {
  bureau: Bureau;
  /** null when this bureau has no tradelines on file. */
  base: number | null;
  projected: number | null;
  delta: number;
  /** +/- uncertainty band, widens with thinner data. */
  margin: number;
  aggregateUtil: number;
  simAggregateUtil: number;
  tradelineCount: number;
  derogCount: number;
  simDerogCount: number;
  inquiries12mo: number;
  simInquiries12mo: number;
  avgAgeMonths: number;
  /** Which inputs were actually present for this bureau. */
  dataInputs: { label: string; present: boolean }[];
  factors: { label: string; weight: number; score: number }[];
}

// ─── Per-card utilization model ───

/**
 * Directional points penalty attributable to a single card's utilization.
 * FICO looks at both aggregate AND per-card ("highest utilization") utilization,
 * which is why one maxed card hurts even when the aggregate looks fine.
 */
export function cardUtilEffect(util: number, share: number): number {
  let penalty: number;
  if (util <= 0) penalty = 0;
  else if (util <= 9) penalty = 2;
  else if (util <= 29) penalty = 10;
  else if (util <= 49) penalty = 22;
  else if (util <= 74) penalty = 34;
  else if (util <= 89) penalty = 45;
  else penalty = 58;
  // Weight by this card's share of total revolving limit, but never fully discount
  // a maxed small card — per-card maxing is its own negative factor.
  const weighted = penalty * (0.45 + 0.55 * share);
  return -Math.round(weighted);
}

export function utilBand(util: number): CardUtilization['band'] {
  if (util <= 9) return 'ideal';
  if (util <= 29) return 'good';
  if (util <= 49) return 'watch';
  if (util <= 89) return 'high';
  return 'maxed';
}

// ─── Scenario application ───

interface AppliedState {
  lines: (Tradeline & { simBalance: number; simLimit: number; disputed: boolean })[];
  inquiryAgeShiftMonths: number;
  extraInquiries: number;
  syntheticLimit: number;
}

function applyActions(lines: Tradeline[], actions: ScenarioAction[]): AppliedState {
  const state: AppliedState = {
    lines: lines.map(l => ({
      ...l,
      simBalance: Number(l.balance) || 0,
      simLimit: Number(l.credit_limit) || 0,
      disputed: false,
    })),
    inquiryAgeShiftMonths: 0,
    extraInquiries: 0,
    syntheticLimit: 0,
  };

  for (const a of actions) {
    switch (a.kind) {
      case 'paydown': {
        const l = state.lines.find(x => x.id === a.accountId);
        if (l) l.simBalance = Math.max(0, l.simBalance - a.amount);
        break;
      }
      case 'dispute': {
        const l = state.lines.find(x => x.id === a.accountId);
        if (l) l.disputed = true;
        break;
      }
      case 'limitIncrease': {
        const l = state.lines.find(x => x.id === a.accountId);
        if (l) l.simLimit += a.amount;
        break;
      }
      case 'ageInquiries':
        state.inquiryAgeShiftMonths += a.months;
        break;
      case 'newInquiry':
        state.extraInquiries += a.count;
        break;
      case 'newCard':
        state.syntheticLimit += a.limit;
        break;
    }
  }
  return state;
}

// ─── Core scoring ───

interface ScoreParts {
  score: number;
  aggregateUtil: number;
  derogCount: number;
  inquiries12mo: number;
  avgAgeMonths: number;
  factors: { label: string; weight: number; score: number }[];
}

function scoreFile(
  bureau: Bureau,
  st: AppliedState,
  inquiryDatesMonthsAgo: number[],
  anchor: number | null,
): ScoreParts {
  const p = BUREAU_PROFILE[bureau];
  const live = st.lines.filter(l => !l.disputed);

  const revolving = live.filter(l => l.simLimit > 0);
  const totalBal = revolving.reduce((s, l) => s + l.simBalance, 0);
  const totalLimit = revolving.reduce((s, l) => s + l.simLimit, 0) + st.syntheticLimit;
  const aggregateUtil = totalLimit > 0 ? (totalBal / totalLimit) * 100 : 0;

  const derogCount = live.filter(l => DEROGATORY_STATUSES.includes(l.account_status)).length;

  const inquiries12mo =
    inquiryDatesMonthsAgo.filter(m => m + st.inquiryAgeShiftMonths < 12).length + st.extraInquiries;

  const now = Date.now();
  const dated = live.filter(l => l.date_opened);
  const avgAgeMonths = dated.length
    ? dated.reduce((s, l) => s + (now - new Date(l.date_opened!).getTime()) / (1000 * 60 * 60 * 24 * 30.44), 0) / dated.length
    : 0;

  // Sub-scores 0-100
  const utilRaw = aggregateUtil <= 9 ? 100 : aggregateUtil <= 29 ? 82 : aggregateUtil <= 49 ? 58 : aggregateUtil <= 74 ? 34 : aggregateUtil <= 89 ? 18 : 8;
  const utilScore = Math.max(0, 100 - (100 - utilRaw) * p.utilWeight);

  // Per-card penalty folded in: worst-card drag
  const worstCardUtil = revolving.length
    ? Math.max(...revolving.map(l => (l.simLimit > 0 ? (l.simBalance / l.simLimit) * 100 : 0)))
    : 0;
  const worstCardDrag = worstCardUtil >= 90 ? 12 : worstCardUtil >= 75 ? 8 : worstCardUtil >= 50 ? 4 : 0;

  const derogRaw = derogCount === 0 ? 100 : derogCount === 1 ? 52 : derogCount <= 3 ? 30 : 12;
  const derogScore = Math.max(0, 100 - (100 - derogRaw) * p.derogWeight);

  const ageScore = avgAgeMonths >= 96 ? 100 : avgAgeMonths >= 60 ? 82 : avgAgeMonths >= 36 ? 62 : avgAgeMonths >= 18 ? 42 : 24;

  const types = new Set(live.map(l => l.account_type));
  const mixScore = types.size >= 4 ? 100 : types.size >= 3 ? 78 : types.size >= 2 ? 55 : 32;

  const open = live.filter(l => l.account_status.toLowerCase() === 'open').length + (st.syntheticLimit > 0 ? 1 : 0);
  const depthScore = open >= 8 ? 100 : open >= 5 ? 78 : open >= 3 ? 55 : 32;

  const raw =
    300 +
    550 *
      ((derogScore * 0.35 + utilScore * 0.30 + ageScore * 0.15 + mixScore * 0.10 + depthScore * 0.10) / 100);

  let score = raw - worstCardDrag - inquiries12mo * p.inquiryPts;

  // If we have a real reported score for this bureau, anchor the model to it so the
  // *delta* is what matters, not our absolute level.
  if (anchor != null) {
    score = anchor + (score - raw) + (raw - raw); // baseline shift applied by caller
  }

  return {
    score: Math.max(300, Math.min(850, Math.round(score))),
    aggregateUtil,
    derogCount,
    inquiries12mo,
    avgAgeMonths,
    factors: [
      { label: 'Derogatory marks', weight: 35, score: Math.round(derogScore) },
      { label: 'Utilization', weight: 30, score: Math.round(utilScore) },
      { label: 'Credit age', weight: 15, score: Math.round(ageScore) },
      { label: 'Account mix', weight: 10, score: Math.round(mixScore) },
      { label: 'File depth', weight: 10, score: Math.round(depthScore) },
    ],
  };
}

export interface SimulateInput {
  tradelines: Tradeline[];
  /** months-ago of each hard inquiry, keyed by bureau */
  inquiriesByBureau: Record<string, number[]>;
  actions: ScenarioAction[];
  /** Reported per-bureau scores (from myFICO / report import) used as anchors. */
  reportedScores?: MortgageFico;
}

/** Run the model for all three bureaus. */
export function simulateTriBureau(input: SimulateInput): BureauEstimate[] {
  const { tradelines, inquiriesByBureau, actions, reportedScores } = input;

  return BUREAUS.map<BureauEstimate>(bureau => {
    const lines = tradelines.filter(t => t.bureau === bureau);
    const inq = inquiriesByBureau[bureau] || [];
    const anchor = reportedScores?.[bureau] ?? null;

    if (lines.length === 0) {
      return {
        bureau,
        base: anchor ?? null,
        projected: anchor ?? null,
        delta: 0,
        margin: 40,
        aggregateUtil: 0,
        simAggregateUtil: 0,
        tradelineCount: 0,
        derogCount: 0,
        simDerogCount: 0,
        inquiries12mo: inq.filter(m => m < 12).length,
        simInquiries12mo: inq.filter(m => m < 12).length,
        avgAgeMonths: 0,
        dataInputs: [
          { label: 'Tradelines on file', present: false },
          { label: 'Revolving limits', present: false },
          { label: 'Hard inquiries', present: inq.length > 0 },
          { label: 'Reported score anchor', present: anchor != null },
        ],
        factors: [],
      };
    }

    const baseState = applyActions(lines, []);
    const simState = applyActions(lines, actions);

    const baseParts = scoreFile(bureau, baseState, inq, null);
    const simParts = scoreFile(bureau, simState, inq, null);
    const modelDelta = simParts.score - baseParts.score;

    // Anchor to the reported score when we have one, so the user sees their real
    // starting number with our modeled delta applied.
    const base = anchor ?? baseParts.score;
    const projected = Math.max(300, Math.min(850, base + modelDelta));

    // Confidence: wider band with thin files, no limits, or no anchor.
    const hasLimits = lines.some(l => Number(l.credit_limit) > 0);
    const hasDates = lines.some(l => l.date_opened);
    let margin = 12;
    if (anchor == null) margin += 18;
    if (!hasLimits) margin += 10;
    if (!hasDates) margin += 6;
    if (lines.length < 5) margin += 8;
    margin += Math.min(14, Math.round(Math.abs(modelDelta) * 0.18));

    return {
      bureau,
      base,
      projected,
      delta: modelDelta,
      margin,
      aggregateUtil: baseParts.aggregateUtil,
      simAggregateUtil: simParts.aggregateUtil,
      tradelineCount: lines.length,
      derogCount: baseParts.derogCount,
      simDerogCount: simParts.derogCount,
      inquiries12mo: baseParts.inquiries12mo,
      simInquiries12mo: simParts.inquiries12mo,
      avgAgeMonths: baseParts.avgAgeMonths,
      dataInputs: [
        { label: 'Tradelines on file', present: true },
        { label: 'Revolving limits', present: hasLimits },
        { label: 'Account open dates', present: hasDates },
        { label: 'Hard inquiries', present: inq.length > 0 },
        { label: 'Reported score anchor', present: anchor != null },
      ],
      factors: simParts.factors,
    };
  });
}

/** Per-card utilization table across all bureaus (deduped by name+bureau). */
export function buildCardTable(tradelines: Tradeline[], actions: ScenarioAction[]): CardUtilization[] {
  const revolving = tradelines.filter(t => Number(t.credit_limit) > 0);
  const st = applyActions(revolving, actions);
  const totalLimit = st.lines.reduce((s, l) => s + l.simLimit, 0);
  const baseTotalLimit = revolving.reduce((s, l) => s + (Number(l.credit_limit) || 0), 0);

  return st.lines
    .map<CardUtilization>(l => {
      const limit = Number(l.credit_limit) || 0;
      const balance = Number(l.balance) || 0;
      const util = limit > 0 ? (balance / limit) * 100 : 0;
      const simUtil = l.simLimit > 0 ? (l.simBalance / l.simLimit) * 100 : 0;
      return {
        id: l.id,
        name: l.account_name,
        bureau: l.bureau,
        balance,
        simBalance: l.simBalance,
        limit,
        simLimit: l.simLimit,
        util,
        simUtil,
        effect: cardUtilEffect(util, baseTotalLimit > 0 ? limit / baseTotalLimit : 0),
        simEffect: cardUtilEffect(simUtil, totalLimit > 0 ? l.simLimit / totalLimit : 0),
        band: utilBand(simUtil),
      };
    })
    .sort((a, b) => b.simUtil - a.simUtil);
}

/** Middle-score readout for mortgage underwriting from the projected estimates. */
export function projectedMiddleScore(estimates: BureauEstimate[]): number | null {
  const f: MortgageFico = {};
  for (const e of estimates) if (e.projected != null) f[e.bureau] = e.projected;
  return qualifyingFico(f);
}

export { BUREAU_MODEL, loadMortgageFico };
