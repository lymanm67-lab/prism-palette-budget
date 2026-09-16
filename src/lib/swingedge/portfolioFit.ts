// SwingEdge — Portfolio Fit.
//
// A good trade can still be a bad portfolio addition. Trade quality answers
// "is this a good setup?". Portfolio fit answers "is this a good trade to add to
// THIS portfolio right now?". The two readings are reported separately and never
// blended into one number.
//
// No double counting: sector/family heat, correlation and event concentration
// each describe a different dimension. The grade is the WORST single dimension,
// not the sum of three penalties for one energy position.

import type { CorrelationBand } from './correlation';
import {
  familyFor,
  familyLabel,
  driverLabel,
  groupByFamily,
  relatedFamilyRisk,
  type ExposureFamily,
  type FamilyGroup,
  type FamilyMember,
} from './exposureFamily';

const round2 = (n: number) => Math.round(n * 100) / 100;

export type PortfolioFitState =
  | 'STRONG_FIT'
  | 'ACCEPTABLE'
  | 'CAUTION'
  | 'POOR_FIT'
  | 'BLOCKED'
  | 'INSUFFICIENT_DATA';

export const PORTFOLIO_FIT_LABEL: Record<PortfolioFitState, string> = {
  STRONG_FIT: 'Strong fit',
  ACCEPTABLE: 'Acceptable',
  CAUTION: 'Caution',
  POOR_FIT: 'Poor fit',
  BLOCKED: 'Blocked',
  INSUFFICIENT_DATA: 'Insufficient data',
};

const FIT_ORDER: PortfolioFitState[] = ['STRONG_FIT', 'ACCEPTABLE', 'CAUTION', 'POOR_FIT', 'BLOCKED'];
const worseOf = (a: PortfolioFitState, b: PortfolioFitState): PortfolioFitState =>
  FIT_ORDER.indexOf(b) > FIT_ORDER.indexOf(a) ? b : a;

export type FitDimension = 'PORTFOLIO_HEAT' | 'FAMILY_HEAT' | 'CORRELATION' | 'EVENT_CONCENTRATION';

export interface FitFinding {
  dimension: FitDimension;
  state: PortfolioFitState;
  detail: string;
}

export interface FitLimits {
  tradingCapital: number;
  /** Percent of capital allowed as combined open risk. Default 5. */
  maxPortfolioHeatPct: number;
  /** Percent of capital allowed at risk in one exposure family. Default 2.5. */
  maxFamilyHeatPct: number;
}

export interface OpenExposure {
  symbol: string;
  sector?: string | null;
  /** Current open risk in dollars for this position. */
  risk: number;
}

export interface PortfolioFitInput {
  candidate: {
    symbol: string;
    sector?: string | null;
    /** Dollar risk this trade would add. */
    risk: number | null;
  };
  /** Current open positions with their live risk. */
  openPositions: OpenExposure[];
  limits: FitLimits;
  /** Strongest correlation band against open positions, or null when unknown. */
  correlationBand?: CorrelationBand | null;
  /** How many open positions correlate at HIGH or above. */
  correlatedPositionCount?: number;
  correlationBasis?: string | null;
  /** True only when verified events affect several open positions at once. */
  eventConcentrated?: boolean;
  eventDetail?: string | null;
  /** Beginner mode forbids overriding a poor or blocked fit. */
  beginner: boolean;
}

export interface HeatReading {
  before: number;
  after: number;
  beforePct: number;
  afterPct: number;
  limitPct: number;
  limitDollars: number;
  exceeded: boolean;
}

export interface PortfolioFitResult {
  state: PortfolioFitState;
  stateLabel: string;
  family: ExposureFamily | null;
  familyLabel: string;
  commonDriver: string;
  portfolio: HeatReading;
  /** Null when the candidate has no known exposure family. */
  familyHeat: HeatReading | null;
  correlationBand: CorrelationBand | null;
  similarSymbols: string[];
  familyGroups: FamilyGroup[];
  findings: FitFinding[];
  reasons: string[];
  /** True when the fit prevents a final GO. */
  blocksGo: boolean;
  /** True when Advanced Mode may record an override. Never true in Beginner. */
  overrideAllowed: boolean;
  headline: string;
}

function reading(
  before: number,
  add: number,
  capital: number,
  limitPct: number,
): HeatReading {
  const after = round2(before + add);
  const limitDollars = round2((capital * limitPct) / 100);
  return {
    before: round2(before),
    after,
    beforePct: capital > 0 ? round2((before / capital) * 100) : 0,
    afterPct: capital > 0 ? round2((after / capital) * 100) : 0,
    limitPct,
    limitDollars,
    exceeded: after > limitDollars,
  };
}

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Grades how well a candidate fits the existing book. Missing inputs produce
 * INSUFFICIENT DATA — never a flattering pass.
 */
export function assessPortfolioFit(input: PortfolioFitInput): PortfolioFitResult {
  const capital = Math.max(0, input.limits.tradingCapital);
  const risk = input.candidate.risk;
  const family = familyFor(input.candidate.symbol, input.candidate.sector);
  const members: FamilyMember[] = input.openPositions.map((p) => ({
    symbol: p.symbol,
    family: familyFor(p.symbol, p.sector),
    risk: Math.max(0, Number(p.risk) || 0),
  }));
  const familyGroups = groupByFamily(members);
  const related = relatedFamilyRisk(members, family);

  const openRisk = round2(members.reduce((s, m) => s + m.risk, 0));

  if (capital <= 0 || risk === null || !Number.isFinite(risk) || risk <= 0) {
    return {
      state: 'INSUFFICIENT_DATA',
      stateLabel: PORTFOLIO_FIT_LABEL.INSUFFICIENT_DATA,
      family,
      familyLabel: familyLabel(family),
      commonDriver: driverLabel(family),
      portfolio: reading(openRisk, 0, capital, input.limits.maxPortfolioHeatPct),
      familyHeat: family ? reading(related.risk, 0, capital, input.limits.maxFamilyHeatPct) : null,
      correlationBand: input.correlationBand ?? null,
      similarSymbols: related.symbols,
      familyGroups,
      findings: [],
      reasons: [
        capital <= 0
          ? 'Trading capital is not set, so portfolio fit cannot be judged.'
          : 'The dollar risk for this trade is not known yet, so portfolio fit cannot be judged.',
      ],
      blocksGo: false,
      overrideAllowed: false,
      headline: 'Portfolio fit cannot be judged yet — a required number is missing.',
    };
  }

  const portfolio = reading(openRisk, risk, capital, input.limits.maxPortfolioHeatPct);
  const familyHeat = family
    ? reading(related.risk, risk, capital, input.limits.maxFamilyHeatPct)
    : null;

  const findings: FitFinding[] = [];

  // Dimension 1 — total portfolio heat. A hard ceiling, never relaxed by sector maths.
  if (portfolio.exceeded) {
    findings.push({
      dimension: 'PORTFOLIO_HEAT',
      state: 'BLOCKED',
      detail: `Adding this trade takes total open risk to ${money(portfolio.after)} (${portfolio.afterPct.toFixed(2)}%), above your ${portfolio.limitPct}% ceiling of ${money(portfolio.limitDollars)}.`,
    });
  } else if (portfolio.afterPct >= portfolio.limitPct * 0.9) {
    findings.push({
      dimension: 'PORTFOLIO_HEAT',
      state: 'CAUTION',
      detail: `Total open risk would reach ${money(portfolio.after)} (${portfolio.afterPct.toFixed(2)}%), close to your ${portfolio.limitPct}% ceiling.`,
    });
  }

  // Dimension 2 — exposure family heat.
  if (familyHeat) {
    if (familyHeat.exceeded) {
      const overshoot = familyHeat.afterPct / Math.max(0.01, familyHeat.limitPct);
      findings.push({
        dimension: 'FAMILY_HEAT',
        state: overshoot >= 1.5 ? 'BLOCKED' : 'POOR_FIT',
        detail: `${familyLabel(family)} risk would reach ${money(familyHeat.after)} (${familyHeat.afterPct.toFixed(2)}%), above your ${familyHeat.limitPct}% limit of ${money(familyHeat.limitDollars)}.`,
      });
    } else if (familyHeat.afterPct >= familyHeat.limitPct * 0.9) {
      findings.push({
        dimension: 'FAMILY_HEAT',
        state: 'CAUTION',
        detail: `${familyLabel(family)} risk would reach ${money(familyHeat.after)} (${familyHeat.afterPct.toFixed(2)}%), close to your ${familyHeat.limitPct}% limit.`,
      });
    }
  }

  // Dimension 3 — correlation. Counted once, not repeated as a family penalty.
  const band = input.correlationBand ?? null;
  const correlatedCount = input.correlatedPositionCount ?? 0;
  if (band === 'VERY_HIGH') {
    findings.push({
      dimension: 'CORRELATION',
      state: correlatedCount >= 2 ? 'POOR_FIT' : 'CAUTION',
      detail:
        correlatedCount >= 2
          ? `Very high correlation with ${correlatedCount} positions you already hold. ${input.correlationBasis ?? ''}`.trim()
          : `Very high correlation with a position you already hold. ${input.correlationBasis ?? ''}`.trim(),
    });
  } else if (band === 'HIGH' && correlatedCount >= 1) {
    findings.push({
      dimension: 'CORRELATION',
      state: 'CAUTION',
      detail: `High correlation with ${correlatedCount} open position${correlatedCount === 1 ? '' : 's'}. ${input.correlationBasis ?? ''}`.trim(),
    });
  }

  // Dimension 4 — event concentration, from verified events only.
  if (input.eventConcentrated) {
    findings.push({
      dimension: 'EVENT_CONCENTRATION',
      state: 'CAUTION',
      detail:
        input.eventDetail ??
        'Several open positions are exposed to the same upcoming event, so they could move together.',
    });
  }

  let state: PortfolioFitState = findings.reduce<PortfolioFitState>(
    (acc, f) => worseOf(acc, f.state),
    'ACCEPTABLE',
  );

  if (findings.length === 0) {
    const roomy =
      !familyHeat || familyHeat.afterPct <= familyHeat.limitPct * 0.5;
    const quiet = portfolio.afterPct <= portfolio.limitPct * 0.6;
    state = roomy && quiet && related.symbols.length === 0 ? 'STRONG_FIT' : 'ACCEPTABLE';
  }

  const blocksGo = state === 'BLOCKED' || state === 'POOR_FIT';
  const overrideAllowed = !input.beginner && state !== 'BLOCKED';

  const reasons = findings.length
    ? findings.map((f) => f.detail)
    : [
        related.symbols.length
          ? `Room remains in both your total risk and your ${familyLabel(family)} exposure.`
          : 'This adds a fresh exposure with room left in your total risk.',
      ];

  const headline =
    state === 'BLOCKED'
      ? 'Blocked as a portfolio addition — a hard limit would be breached.'
      : state === 'POOR_FIT'
        ? 'Poor portfolio fit. The setup may be fine; the concentration is not.'
        : state === 'CAUTION'
          ? 'Acceptable with a warning. Read the concentration note before adding it.'
          : state === 'STRONG_FIT'
            ? 'Strong portfolio fit. This spreads your risk rather than stacking it.'
            : 'Acceptable portfolio fit.';

  return {
    state,
    stateLabel: PORTFOLIO_FIT_LABEL[state],
    family,
    familyLabel: familyLabel(family),
    commonDriver: driverLabel(family),
    portfolio,
    familyHeat,
    correlationBand: band,
    similarSymbols: related.symbols,
    familyGroups,
    findings,
    reasons,
    blocksGo,
    overrideAllowed,
    headline,
  };
}

/* ------------------------------------------------------------ final status */

export type FinalTradeStatus = 'GO' | 'WAIT' | 'REVIEW' | 'STOP';

export interface FinalStatusResult {
  status: FinalTradeStatus;
  /** True when portfolio fit, not the setup, changed the answer. */
  changedByPortfolio: boolean;
  note: string;
}

/**
 * Combines individual trade quality with portfolio fit. A poor fit downgrades a
 * GO to REVIEW; a blocked fit downgrades it to STOP. Fit never upgrades a trade.
 */
export function finalStatusWithFit(
  individual: FinalTradeStatus,
  fit: PortfolioFitResult,
  opts: { overrideRecorded?: boolean } = {},
): FinalStatusResult {
  if (fit.state === 'INSUFFICIENT_DATA') {
    return {
      status: individual,
      changedByPortfolio: false,
      note: 'Portfolio fit is unknown, so it has not changed this status.',
    };
  }

  if (fit.state === 'BLOCKED') {
    return {
      status: 'STOP',
      changedByPortfolio: individual !== 'STOP',
      note: 'A hard portfolio limit would be breached, so this cannot be a GO regardless of the setup.',
    };
  }

  if (fit.state === 'POOR_FIT') {
    if (opts.overrideRecorded && fit.overrideAllowed) {
      return {
        status: individual,
        changedByPortfolio: false,
        note: 'You recorded an override for the concentration warning. The warning stays on screen.',
      };
    }
    return {
      status: individual === 'STOP' ? 'STOP' : 'REVIEW',
      changedByPortfolio: individual === 'GO' || individual === 'WAIT',
      note: 'This trade qualifies individually, but adding it would push your correlated exposure past your training threshold.',
    };
  }

  return {
    status: individual,
    changedByPortfolio: false,
    note:
      fit.state === 'CAUTION'
        ? 'Portfolio fit allows this trade with a concentration warning.'
        : 'Portfolio fit does not stand in the way of this trade.',
  };
}

export const CONCENTRATION_WARNING_TITLE = 'Portfolio concentration warning';

export const EXISTING_POSITION_NOTE =
  'Concentration above current training limit — monitor and learn. Positions already open are not closed by this guardrail.';

/* ---------------------------------------------------- best of a correlated group */

export interface GroupCandidate {
  symbol: string;
  readiness: number | null;
  rewardToRisk: number | null;
  stopQuality: number | null;
  targetPathClear: boolean | null;
  liquidityScore: number | null;
  eventSevere: boolean | null;
  fit: PortfolioFitState;
}

export interface RankedCandidate extends GroupCandidate {
  rank: number;
  score: number;
  preferred: boolean;
  reason: string;
}

const FIT_POINTS: Record<PortfolioFitState, number> = {
  STRONG_FIT: 10,
  ACCEPTABLE: 8,
  CAUTION: 4,
  POOR_FIT: 0,
  BLOCKED: -10,
  INSUFFICIENT_DATA: 2,
};

/**
 * Ranks correlated candidates on trade-system numbers only, so one or two get a
 * closer look instead of all five being opened.
 */
export function rankCorrelatedCandidates(candidates: GroupCandidate[]): RankedCandidate[] {
  const scored = candidates.map((c) => {
    let score = 0;
    if (typeof c.readiness === 'number') score += c.readiness * 0.5;
    if (typeof c.rewardToRisk === 'number') score += Math.min(4, c.rewardToRisk) * 5;
    if (typeof c.stopQuality === 'number') score += c.stopQuality * 10;
    if (c.targetPathClear) score += 8;
    if (typeof c.liquidityScore === 'number') score += c.liquidityScore * 5;
    if (c.eventSevere) score -= 15;
    score += FIT_POINTS[c.fit];
    return { ...c, score: Math.round(score * 10) / 10 };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((c, i) => ({
    ...c,
    rank: i + 1,
    preferred: i === 0 && c.fit !== 'BLOCKED' && c.fit !== 'POOR_FIT',
    reason:
      i === 0
        ? 'Strongest combination of readiness, stop, reward-to-risk and portfolio fit in this group.'
        : `Ranked ${i + 1} of ${scored.length} in this group on the same measures.`,
  }));
}

export const CLUSTER_ADVICE = (count: number) =>
  `${count} related candidates share this driver. Select 1 or 2 at most — opening all of them is one bet, not several.`;
