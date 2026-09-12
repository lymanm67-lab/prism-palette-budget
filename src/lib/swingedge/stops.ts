// SwingEdge Analyzer — Stop-Loss Strategy Engine.
// Pure functions only. Nothing here calls a provider or touches the database.
//
// Core principle enforced throughout this file:
//   The stop determines the position size.
//   The position size must never determine where the stop is placed.

import type { SetupState } from './indicators';
import type { Verdict } from './types';

const round2 = (n: number) => Math.round(n * 100) / 100;
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/* ------------------------------------------------------------------ methods */

export type StopMethod = 'STRUCTURE' | 'ATR' | 'PERCENT' | 'TRAILING' | 'HYBRID';

export const STOP_METHODS: { value: StopMethod; label: string; blurb: string }[] = [
  {
    value: 'STRUCTURE',
    label: 'Structure stop',
    blurb: 'Preferred for swing trading because it places the stop where the trade thesis becomes invalid.',
  },
  {
    value: 'ATR',
    label: 'ATR stop',
    blurb: 'Uses normal daily range to give the trade room. Best used to check a structure stop, not replace it.',
  },
  {
    value: 'PERCENT',
    label: 'Percentage stop',
    blurb: 'Percentage stops do not account for technical structure or stock volatility.',
  },
  {
    value: 'HYBRID',
    label: 'Hybrid stop',
    blurb: 'Compares structure and volatility, then suggests the stop that protects the thesis without being needlessly tight.',
  },
  {
    value: 'TRAILING',
    label: 'Trailing stop',
    blurb: 'Only available after entry. It never replaces the original invalidation stop during planning.',
  },
];

export const ATR_MULTIPLES = [1, 1.25, 1.5, 2] as const;
export const PERCENT_STOPS = [2, 3, 4, 5] as const;
export const BUFFER_CHOICES = [0, 0.25, 0.5, 1] as const;
export const RISK_PCT_CHOICES = [0.25, 0.5, 0.75, 1] as const;

export const GAP_RISK_TEXT =
  'A stop order does not guarantee execution at the exact stop price. If a stock gaps below the stop, the actual exit may occur at a worse price.';

export const EARNINGS_GAP_TEXT =
  'Stocks can move sharply after earnings announcements, and a stop may execute below its planned price.';

export const EARNINGS_UNKNOWN_TEXT =
  'Earnings date unavailable. Verify before holding through an earnings event.';

export const STOP_RULE_TEXT =
  'Your stop is not the amount you want to lose. Your stop is the price level where your trade idea is no longer valid.';

export const STOP_RULE_FOLLOW_UP =
  'Once that level is identified, position sizing determines how many shares you can trade while keeping the total loss within your risk rule.';

/* --------------------------------------------------------- structure stops */

export interface StructureInputs {
  entry: number;
  swingLow?: number | null;
  support?: number | null;
  pullbackLow?: number | null;
  movingAverage?: number | null;
  breakoutLevel?: number | null;
  retestLow?: number | null;
  setup: SetupState;
  /** Optional buffer below structure, as a percent of entry. */
  bufferPct?: number;
}

export interface StructureStopResult {
  /** The structural level the thesis depends on. */
  invalidationLevel: number | null;
  /** Suggested stop, structure level minus the chosen buffer. */
  stop: number | null;
  /** Zone between the tightest and widest sensible structural stop. */
  zone: { low: number; high: number } | null;
  distanceFromEntry: number | null;
  riskPerShare: number | null;
  buffer: number;
  candidates: { label: string; level: number }[];
  explanation: string;
}

/** Buffer in dollars for a level, from a percent-of-entry setting. */
export function bufferDollars(entry: number, bufferPct = 0): number {
  if (!(entry > 0) || !(bufferPct > 0)) return 0;
  return round2((entry * bufferPct) / 100);
}

/**
 * Structure stop. Candidate levels come from price structure only; the stop is
 * the lowest meaningful level minus an optional small buffer, because a stop
 * placed exactly at obvious support is vulnerable to normal market movement.
 */
export function structureStop(input: StructureInputs): StructureStopResult {
  const { entry, setup, bufferPct = 0 } = input;
  const candidates: { label: string; level: number }[] = [];
  const push = (label: string, level: number | null | undefined) => {
    if (isNum(level) && level > 0 && level < entry) candidates.push({ label, level: round2(level) });
  };

  if (setup === 'BREAKOUT') {
    push('Breakout level', input.breakoutLevel);
    push('Retest low', input.retestLow);
    push('Consolidation low', input.swingLow);
    push('Structural support', input.support);
  } else {
    push('Recent swing low', input.swingLow);
    push('Pullback low', input.pullbackLow);
    push('Support area', input.support);
    push('Moving average support', input.movingAverage);
    push('Prior breakout level', input.breakoutLevel);
  }

  if (!candidates.length || !(entry > 0)) {
    return {
      invalidationLevel: null,
      stop: null,
      zone: null,
      distanceFromEntry: null,
      riskPerShare: null,
      buffer: 0,
      candidates: [],
      explanation:
        'No structural level below the entry could be identified from the available price history. Mark the invalidation level yourself before planning this trade.',
    };
  }

  const levels = candidates.map((c) => c.level);
  const low = Math.min(...levels);
  const high = Math.max(...levels);
  const invalidationLevel = low;
  const buffer = bufferDollars(entry, bufferPct);
  const stop = round2(invalidationLevel - buffer);
  const distance = round2(entry - stop);

  const explanation =
    setup === 'BREAKOUT'
      ? `If price breaks back below the breakout zone near $${high.toFixed(2)} and cannot reclaim it, the breakout thesis is weakened or invalidated. The suggested stop sits at $${stop.toFixed(2)}, below ${candidates[candidates.length - 1].label.toLowerCase()}.`
      : `The pullback thesis is invalidated if price decisively breaks below $${invalidationLevel.toFixed(2)} — the ${candidates.find((c) => c.level === low)?.label.toLowerCase() ?? 'structural low'} and support area. The suggested stop sits at $${stop.toFixed(2)}.`;

  return {
    invalidationLevel,
    stop,
    zone: { low: round2(low - buffer), high: round2(high) },
    distanceFromEntry: distance,
    riskPerShare: distance > 0 ? distance : null,
    buffer,
    candidates,
    explanation,
  };
}

/** ATR stop for a long trade: entry minus ATR times the multiple. */
export function atrStop(entry: number, atrValue: number | null, multiple = 1.5): number | null {
  if (!(entry > 0) || !isNum(atrValue) || !(atrValue > 0) || !(multiple > 0)) return null;
  return round2(entry - atrValue * multiple);
}

/** Percentage stop. Education and customisation only — never the default. */
export function percentStop(entry: number, pct: number): number | null {
  if (!(entry > 0) || !(pct > 0)) return null;
  return round2(entry * (1 - pct / 100));
}

export interface HybridInputs {
  entry: number;
  structureLevel: number | null;
  atrValue: number | null;
  multiple?: number;
  bufferPct?: number;
}

export interface HybridResult {
  stop: number | null;
  structureStop: number | null;
  atrStop: number | null;
  difference: number | null;
  chosen: 'STRUCTURE' | 'ATR' | 'NONE';
  reason: string;
}

/**
 * Hybrid stop. Chooses the level that sits below both structure and normal
 * volatility, so the trade is not stopped out by ordinary noise while the thesis
 * is still intact.
 */
export function hybridStop(input: HybridInputs): HybridResult {
  const { entry, structureLevel, atrValue, multiple = 1.5, bufferPct = 0.25 } = input;
  const buffer = bufferDollars(entry, bufferPct);
  const sStop = isNum(structureLevel) && structureLevel < entry ? round2(structureLevel - buffer) : null;
  const aStop = atrStop(entry, atrValue, multiple);

  if (sStop === null && aStop === null) {
    return {
      stop: null,
      structureStop: null,
      atrStop: null,
      difference: null,
      chosen: 'NONE',
      reason: 'Neither a structural level nor an ATR reading is available, so no stop can be suggested yet.',
    };
  }
  if (sStop === null) {
    return {
      stop: aStop,
      structureStop: null,
      atrStop: aStop,
      difference: null,
      chosen: 'ATR',
      reason: `No structural level was identified, so the ${multiple} ATR stop at $${aStop!.toFixed(2)} is used as a volatility-based placeholder. Confirm it against the chart yourself.`,
    };
  }
  if (aStop === null) {
    return {
      stop: sStop,
      structureStop: sStop,
      atrStop: null,
      difference: null,
      chosen: 'STRUCTURE',
      reason: `Volatility data is unavailable, so the structure stop at $${sStop.toFixed(2)} is used. It sits just below the level that defines the setup.`,
    };
  }

  const stop = round2(Math.min(sStop, aStop));
  const chosen = stop === sStop ? 'STRUCTURE' : 'ATR';
  return {
    stop,
    structureStop: sStop,
    atrStop: aStop,
    difference: round2(Math.abs(sStop - aStop)),
    chosen,
    reason: `Technical support is located at $${(structureLevel as number).toFixed(2)}. A ${multiple} ATR stop suggests $${aStop.toFixed(2)}. SwingEdge recommends $${stop.toFixed(2)} because this places the stop below both support and normal volatility.`,
  };
}

/** Plain-language comparison of a structure stop against an ATR stop. */
export function compareStops(structure: number | null, atrBased: number | null): string | null {
  if (!isNum(structure) || !isNum(atrBased)) return null;
  if (atrBased < structure) return 'The ATR stop allows slightly more room for normal price movement.';
  if (atrBased > structure) return 'The ATR stop falls above important support and may be too tight.';
  return 'The ATR stop and the structure stop land on the same level.';
}

/* --------------------------------------------------------------- risk math */

export interface RiskSequenceInputs {
  tradingCapital: number;
  riskPerTradePct: number;
  entry: number;
  stop: number;
  target: number;
  /** Optional manual share count the user typed. */
  plannedShares?: number | null;
  minRewardRisk?: number;
}

export type RewardRiskStatus = 'STRONG' | 'ACCEPTABLE' | 'BELOW_RULE';

export interface RiskSequenceResult {
  invalidStop: boolean;
  riskPerShare: number | null;
  maxDollarRisk: number;
  suggestedShares: number;
  shares: number;
  positionValue: number;
  plannedLoss: number;
  percentOfAccount: number;
  rewardPerShare: number | null;
  rewardRisk: number | null;
  rewardRiskStatus: RewardRiskStatus | null;
  riskLimitExceeded: boolean;
  maxAllowedShares: number;
  problems: string[];
}

/** Maximum dollars the account rule allows on one trade. */
export function maxDollarRisk(capital: number, riskPct: number): number {
  if (!(capital > 0) || !(riskPct > 0)) return 0;
  return round2((capital * riskPct) / 100);
}

/** Risk per share for a long trade. Null means the stop is invalid. */
export function riskPerShare(entry: number, stop: number): number | null {
  if (!(entry > 0) || !(stop > 0) || stop >= entry) return null;
  return round2(entry - stop);
}

/** Shares are always rounded down so the planned loss can never exceed the rule. */
export function positionSize(maxRisk: number, perShare: number): number {
  if (!(maxRisk > 0) || !(perShare > 0)) return 0;
  return Math.floor(maxRisk / perShare);
}

export function rewardRiskRatio(entry: number, stop: number, target: number): number | null {
  const r = riskPerShare(entry, stop);
  if (r === null || !(target > entry)) return null;
  return round2((target - entry) / r);
}

export function classifyRewardRisk(ratio: number | null, minimum = 2): RewardRiskStatus | null {
  if (!isNum(ratio)) return null;
  if (ratio >= minimum + 1) return 'STRONG';
  if (ratio >= minimum) return 'ACCEPTABLE';
  return 'BELOW_RULE';
}

/**
 * Runs the whole sequence in the required order: invalidation, stop, risk per
 * share, account risk limit, position size, target, reward-to-risk.
 */
export function runRiskSequence(input: RiskSequenceInputs): RiskSequenceResult {
  const { tradingCapital, riskPerTradePct, entry, stop, target, minRewardRisk = 2 } = input;
  const problems: string[] = [];
  const maxRisk = maxDollarRisk(tradingCapital, riskPerTradePct);
  const perShare = riskPerShare(entry, stop);

  if (perShare === null) {
    if (entry > 0 && stop >= entry) problems.push('INVALID STOP — the stop must sit below the entry for a long trade.');
    return {
      invalidStop: true,
      riskPerShare: null,
      maxDollarRisk: maxRisk,
      suggestedShares: 0,
      shares: 0,
      positionValue: 0,
      plannedLoss: 0,
      percentOfAccount: 0,
      rewardPerShare: null,
      rewardRisk: null,
      rewardRiskStatus: null,
      riskLimitExceeded: false,
      maxAllowedShares: 0,
      problems,
    };
  }

  const suggestedShares = positionSize(maxRisk, perShare);
  const shares = isNum(input.plannedShares) && input.plannedShares! > 0 ? Math.floor(input.plannedShares!) : suggestedShares;
  const plannedLoss = round2(shares * perShare);
  const riskLimitExceeded = plannedLoss > maxRisk;
  const rewardPerShare = target > entry ? round2(target - entry) : null;
  const ratio = rewardRiskRatio(entry, stop, target);
  const status = classifyRewardRisk(ratio, minRewardRisk);

  if (suggestedShares < 1) problems.push('The risk rule is too small for even one share at this stop distance.');
  if (riskLimitExceeded)
    problems.push(
      `RISK LIMIT EXCEEDED — you planned to risk $${plannedLoss.toFixed(2)}, but your current rule allows $${maxRisk.toFixed(2)}.`,
    );
  if (status === 'BELOW_RULE')
    problems.push(`Reward-to-risk of ${ratio}:1 is below your minimum rule of ${minRewardRisk}:1.`);

  return {
    invalidStop: false,
    riskPerShare: perShare,
    maxDollarRisk: maxRisk,
    suggestedShares,
    shares,
    positionValue: round2(shares * entry),
    plannedLoss,
    percentOfAccount: tradingCapital > 0 ? round2((plannedLoss / tradingCapital) * 100) : 0,
    rewardPerShare,
    rewardRisk: ratio,
    rewardRiskStatus: status,
    riskLimitExceeded,
    maxAllowedShares: suggestedShares,
    problems,
  };
}

/* ------------------------------------------------------------ stop quality */

export type StopQuality = 'STRONG' | 'ACCEPTABLE' | 'QUESTIONABLE' | 'INVALID';

export interface StopQualityInputs {
  entry: number;
  stop: number;
  atrValue: number | null;
  structureLevel: number | null;
  rewardRisk: number | null;
  setup: SetupState;
}

export interface StopQualityResult {
  quality: StopQuality;
  atrDistance: number | null;
  reasons: string[];
  warnings: string[];
  tooTight: boolean;
  tooWide: boolean;
  /** True when the stop reads as a defensible technical invalidation level. */
  justified: boolean;
  /** Why the stop failed validation — shown before any override is offered. */
  failureReasons: string[];
}

/**
 * Educational assessment of stop placement. This is not a probability of
 * success — it only judges the stop against structure and volatility.
 *
 * The stop does NOT have to match the suggested price. It has to represent a
 * reasonable invalidation level for the setup: below or close under the
 * structural level, and far enough from entry to survive normal movement.
 */
export function assessStop(input: StopQualityInputs): StopQualityResult {
  const { entry, stop, atrValue, structureLevel, rewardRisk, setup } = input;
  const reasons: string[] = [];
  const warnings: string[] = [];
  const failureReasons: string[] = [];
  const perShare = riskPerShare(entry, stop);
  const levelName = setup === 'BREAKOUT' ? 'breakout level' : 'recent swing low';

  if (perShare === null) {
    return {
      quality: 'INVALID',
      atrDistance: null,
      reasons: [],
      warnings: ['INVALID STOP — a long trade needs its stop below the entry.'],
      tooTight: false,
      tooWide: false,
      justified: false,
      failureReasons: ['The stop sits at or above the entry, so it cannot protect a long trade.'],
    };
  }

  const atrDistance = isNum(atrValue) && atrValue > 0 ? round2(perShare / atrValue) : null;
  const belowStructure = isNum(structureLevel) ? stop < structureLevel : null;
  // Tolerance: a stop just above the level is still defensible if it is within a
  // quarter of an ATR (or 0.5% of price when ATR is unavailable) of that level.
  const tolerance =
    isNum(atrValue) && atrValue > 0 ? round2(atrValue * 0.25) : round2(entry * 0.005);
  const aboveStructureBy =
    isNum(structureLevel) && stop >= structureLevel ? round2(stop - structureLevel) : 0;
  const nearStructure = belowStructure === false && aboveStructureBy <= tolerance;

  if (belowStructure === true) reasons.push('The stop sits below the structural level that defines the setup.');
  if (nearStructure)
    reasons.push(
      `The stop sits within $${tolerance.toFixed(2)} of the ${levelName}, close enough to read as the same invalidation level.`,
    );
  if (belowStructure === false && !nearStructure) {
    warnings.push(
      `Current stop sits $${aboveStructureBy.toFixed(2)} above the ${levelName}, so the thesis could still be intact when you are stopped out.`,
    );
    failureReasons.push(
      `The stop is not tied to a technical level — it sits above the ${levelName} that defines this setup.`,
    );
  }
  if (belowStructure === null)
    warnings.push(
      'No structural level was loaded for this symbol, so the stop is judged on volatility alone.',
    );
  if (atrDistance !== null && atrDistance >= 1)
    reasons.push(`The stop is ${atrDistance} ATR from the entry, outside normal daily movement.`);

  let tooTight = false;
  if (atrDistance !== null && atrDistance < 0.75) {
    tooTight = true;
    warnings.push(
      `STOP MAY BE TOO TIGHT — the stop is only ${atrDistance} ATR below entry${belowStructure === false ? ` and sits above the ${levelName}` : ''}.`,
    );
    failureReasons.push(
      `At ${atrDistance} ATR from entry, ordinary daily movement is likely to hit this stop before the idea fails.`,
    );
  }

  let tooWide = false;
  if (isNum(rewardRisk) && rewardRisk < 1.5) {
    tooWide = true;
    warnings.push(`STOP MAY BE TOO WIDE — the selected stop lowers the trade's reward-to-risk to ${rewardRisk}:1.`);
    failureReasons.push(`The stop distance leaves reward-to-risk at only ${rewardRisk}:1.`);
  }
  if (atrDistance !== null && atrDistance > 3) {
    tooWide = true;
    warnings.push(`The stop is ${atrDistance} ATR away, which is a wide risk for a swing trade.`);
    failureReasons.push(`At ${atrDistance} ATR the stop is far wider than this stock's normal movement requires.`);
  }

  const respectsStructure = belowStructure === true || nearStructure;
  const noTechnicalBasis =
    tooTight && belowStructure === false && !nearStructure && atrDistance !== null && atrDistance < 0.5;

  let quality: StopQuality;
  if (noTechnicalBasis) quality = 'INVALID';
  else if (belowStructure === true && !tooTight && !tooWide) quality = 'STRONG';
  else if (belowStructure === null && !tooTight && !tooWide) quality = 'ACCEPTABLE';
  else if (respectsStructure && !tooTight && !tooWide) quality = 'ACCEPTABLE';
  else quality = 'QUESTIONABLE';

  if (quality === 'ACCEPTABLE' && !failureReasons.length)
    reasons.push('The stop is a workable invalidation level, though not the cleanest available.');

  return {
    quality,
    atrDistance,
    reasons,
    warnings,
    tooTight,
    tooWide,
    justified: quality === 'STRONG' || quality === 'ACCEPTABLE',
    failureReasons,
  };
}

/** The sentence behind the "Why is the stop here?" button. */
export function whyStopHere(input: {
  stop: number;
  structureLevel: number | null;
  setup: SetupState;
  method: StopMethod;
  atrDistance: number | null;
}): string {
  const { stop, structureLevel, setup, method, atrDistance } = input;
  const structure = isNum(structureLevel)
    ? setup === 'BREAKOUT'
      ? `below the breakout level at $${structureLevel.toFixed(2)}`
      : `below the recent swing low and support area at $${structureLevel.toFixed(2)}`
    : 'at the level you marked as invalidation';
  const volatility = atrDistance !== null ? ` That is ${atrDistance} ATR from the entry.` : '';
  const thesis =
    setup === 'BREAKOUT'
      ? 'A sustained move back below this level would signal breakout failure.'
      : 'A sustained move below this level would invalidate the current pullback structure.';
  return `The stop is positioned $${stop.toFixed(2)} — ${structure} — using the ${method.toLowerCase()} method. ${thesis}${volatility}`;
}

/* ------------------------------------------------------- target suggestions */

export type TargetMethod = 'PRIOR_HIGH' | 'RESISTANCE' | 'MEASURED_MOVE' | 'REWARD_RISK' | 'ATR' | 'MANUAL';

export interface TargetOption {
  method: TargetMethod;
  label: string;
  price: number;
  rewardRisk: number | null;
}

export function targetOptions(input: {
  entry: number;
  stop: number;
  priorHigh?: number | null;
  resistance?: number | null;
  atrValue?: number | null;
  rangeHeight?: number | null;
}): TargetOption[] {
  const { entry, stop } = input;
  const perShare = riskPerShare(entry, stop);
  if (perShare === null) return [];
  const out: TargetOption[] = [];
  const add = (method: TargetMethod, label: string, price: number | null | undefined) => {
    if (!isNum(price) || price <= entry) return;
    out.push({ method, label, price: round2(price), rewardRisk: round2((price - entry) / perShare) });
  };
  add('PRIOR_HIGH', 'Previous high', input.priorHigh);
  add('RESISTANCE', 'Resistance zone', input.resistance);
  add('MEASURED_MOVE', 'Measured move', isNum(input.rangeHeight) ? entry + input.rangeHeight : null);
  add('REWARD_RISK', '2R target', entry + perShare * 2);
  add('ATR', '3 ATR extension', isNum(input.atrValue) ? entry + input.atrValue * 3 : null);
  return out.sort((a, b) => a.price - b.price);
}

/* ---------------------------------------------------- stop management rules */

export const STOP_MOVE_REASONS = [
  'Technical structure changed',
  'Corporate event',
  'Data correction',
  'Other',
] as const;

export const BREAKEVEN_TRIGGERS = [
  'Trade reached +1R',
  'Trade reached +1.5R',
  'Price broke resistance',
  'New higher low formed',
  'Manual decision',
] as const;

export type TrailingMethod = 'SWING_LOW' | 'EMA20' | 'ATR' | 'PERCENT' | 'MANUAL';

export interface TrailingSuggestion {
  method: TrailingMethod;
  label: string;
  stop: number;
  explanation: string;
}

/**
 * Trailing suggestions are only meaningful after entry, and a suggestion is
 * dropped when it would move the stop down.
 */
export function trailingSuggestions(input: {
  currentPrice: number;
  currentStop: number;
  swingLow?: number | null;
  ema20?: number | null;
  atrValue?: number | null;
  atrMultiple?: number;
  percent?: number;
  bufferPct?: number;
}): TrailingSuggestion[] {
  const { currentPrice, currentStop } = input;
  if (!(currentPrice > 0)) return [];
  const buffer = bufferDollars(currentPrice, input.bufferPct ?? 0.5);
  const out: TrailingSuggestion[] = [];
  const add = (method: TrailingMethod, label: string, stop: number | null, explanation: string) => {
    if (!isNum(stop) || stop <= currentStop || stop >= currentPrice) return;
    out.push({ method, label, stop: round2(stop), explanation });
  };
  add(
    'SWING_LOW',
    'Below the newest swing low',
    isNum(input.swingLow) ? input.swingLow - buffer : null,
    'The trade has made a higher low, so the stop can move up beneath it. It never moves back down.',
  );
  add(
    'EMA20',
    '20 EMA trail',
    isNum(input.ema20) ? input.ema20 - buffer : null,
    'The stop follows the rising 20 EMA while the trend remains intact. This does not suit every setup.',
  );
  add(
    'ATR',
    `${input.atrMultiple ?? 1.5} ATR trail`,
    isNum(input.atrValue) ? currentPrice - input.atrValue * (input.atrMultiple ?? 1.5) : null,
    'The stop sits a fixed amount of normal daily range below the current price.',
  );
  add(
    'PERCENT',
    `${input.percent ?? 5}% trail`,
    currentPrice * (1 - (input.percent ?? 5) / 100),
    'A fixed percentage below the current price. Simple, but blind to structure.',
  );
  return out.sort((a, b) => b.stop - a.stop);
}

export interface StopChangeAssessment {
  direction: 'TIGHTEN' | 'WIDEN' | 'NONE';
  widened: boolean;
  riskBefore: number;
  riskAfter: number;
  riskChange: number;
  riskChangePct: number;
  rImpact: number | null;
  warning: string | null;
  requiresReason: boolean;
}

/**
 * Judges a stop modification. Widening a stop after entry always raises a
 * high-priority warning and always demands a strategy reason.
 */
export function assessStopChange(input: {
  entry: number;
  oldStop: number;
  newStop: number;
  shares: number;
  originalRisk?: number | null;
}): StopChangeAssessment {
  const { entry, oldStop, newStop, shares } = input;
  const riskBefore = round2(Math.max(0, entry - oldStop) * shares);
  const riskAfter = round2(Math.max(0, entry - newStop) * shares);
  const riskChange = round2(riskAfter - riskBefore);
  const riskChangePct = riskBefore > 0 ? round2((riskChange / riskBefore) * 100) : 0;
  const base = isNum(input.originalRisk) && input.originalRisk! > 0 ? input.originalRisk! : riskBefore;
  const rImpact = base > 0 ? round2(riskChange / base) : null;

  if (newStop === oldStop)
    return {
      direction: 'NONE',
      widened: false,
      riskBefore,
      riskAfter,
      riskChange: 0,
      riskChangePct: 0,
      rImpact: 0,
      warning: null,
      requiresReason: false,
    };

  if (newStop < oldStop) {
    return {
      direction: 'WIDEN',
      widened: true,
      riskBefore,
      riskAfter,
      riskChange,
      riskChangePct,
      rImpact,
      warning:
        'STOP-WIDENING WARNING — moving this stop increases your planned loss and your downside risk. Never widen a stop to avoid taking a loss.',
      requiresReason: true,
    };
  }

  return {
    direction: 'TIGHTEN',
    widened: false,
    riskBefore,
    riskAfter,
    riskChange,
    riskChangePct,
    rImpact,
    warning: null,
    requiresReason: false,
  };
}

/** Warning shown when the stop is tightened during planning. */
export const TIGHTENING_CONFIRM_TEXT =
  'You are moving the stop closer to the entry. Confirm that the new stop still represents a valid technical invalidation level.';

export const TIGHTENING_CONFIRM_LABEL = 'YES, STOP IS STILL TECHNICALLY VALID';

/** R multiple from an original dollar risk and a profit or loss. */
export function rFromRisk(originalRisk: number | null, pl: number): number | null {
  if (!isNum(originalRisk) || !(originalRisk > 0)) return null;
  return round2(pl / originalRisk);
}

/* ------------------------------------------------------------- portfolio */

export interface PortfolioCheck {
  maxTotalOpenRisk: number;
  openRisk: number;
  newTradeRisk: number;
  projectedTotal: number;
  exceeded: boolean;
  message: string | null;
}

export function checkPortfolioRisk(input: {
  tradingCapital: number;
  maxPortfolioRiskPct: number;
  openRisk: number;
  newTradeRisk: number;
}): PortfolioCheck {
  const maxTotal = round2((input.tradingCapital * input.maxPortfolioRiskPct) / 100);
  const projected = round2(input.openRisk + input.newTradeRisk);
  const exceeded = projected > maxTotal;
  return {
    maxTotalOpenRisk: maxTotal,
    openRisk: round2(input.openRisk),
    newTradeRisk: round2(input.newTradeRisk),
    projectedTotal: projected,
    exceeded,
    message: exceeded
      ? `PORTFOLIO RISK LIMIT EXCEEDED — new total $${projected.toFixed(2)}, maximum $${maxTotal.toFixed(2)}.`
      : null,
  };
}

/* ---------------------------------------------------------- qualification */

export interface QualificationInputs {
  setup: SetupState;
  entryDefined: boolean;
  invalidation: string;
  stopDefined: boolean;
  stopQuality: StopQuality;
  risk: RiskSequenceResult;
  portfolio: PortfolioCheck;
  targetDefined: boolean;
  minRewardRisk: number;
  earningsReviewed: boolean;
  earningsAvailable: boolean;
  entryConfirmed: boolean;
  overrideRewardRisk?: boolean;
  advancedMode?: boolean;
  /** Reasons the stop failed validation, from assessStop. */
  stopFailureReasons?: string[];
  /** Advanced Mode only: the user chose to override a failing stop. */
  overrideStopQuality?: boolean;
  /** Written justification required for a stop override. */
  stopOverrideJustification?: string;
}

export interface QualificationCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface QualificationResult {
  verdict: Verdict;
  headline: string;
  checks: QualificationCheck[];
  blocking: string[];
  skipTradeReason: string | null;
  /** True when a failing stop was overridden — logged with the plan and journal. */
  stopOverrideApplied: boolean;
  /** Set when an override was attempted but the requirements were not met. */
  stopOverrideRefusal: string | null;
}

/** The shortest justification accepted for a stop override. */
export const STOP_OVERRIDE_MIN_CHARS = 40;

export const STOP_OVERRIDE_BEGINNER_TEXT =
  'Overrides are not available in Beginner Mode. A questionable or invalid stop has to be revised, not argued with.';

/**
 * A trade only reads QUALIFIES when every required element exists. Rejecting a
 * candidate is a valid outcome, so SKIP TRADE is a first-class result.
 *
 * Stop quality gates the verdict: QUESTIONABLE reads NOT READY, INVALID reads
 * DOES NOT QUALIFY. Advanced Mode can override either, but only with a written
 * justification, and the override is recorded.
 */
export function qualifyTrade(input: QualificationInputs): QualificationResult {
  const { risk, portfolio } = input;
  const stopJustified = input.stopQuality === 'STRONG' || input.stopQuality === 'ACCEPTABLE';
  const justification = (input.stopOverrideJustification ?? '').trim();
  const overrideRequested = !!input.overrideStopQuality && !stopJustified;
  const overrideAllowed = !!input.advancedMode;
  const stopOverrideAccepted =
    overrideRequested && overrideAllowed && justification.length >= STOP_OVERRIDE_MIN_CHARS;
  const stopOverrideRefusal = !overrideRequested
    ? null
    : !overrideAllowed
      ? STOP_OVERRIDE_BEGINNER_TEXT
      : justification.length < STOP_OVERRIDE_MIN_CHARS
        ? `Write at least ${STOP_OVERRIDE_MIN_CHARS} characters explaining why this stop is still a valid invalidation level.`
        : null;
  const checks: QualificationCheck[] = [
    {
      key: 'setup',
      label: 'Valid setup',
      ok: input.setup !== 'NONE',
      detail: input.setup === 'NONE' ? 'No pullback or breakout structure is present.' : `${input.setup} setup identified.`,
    },
    {
      key: 'entry',
      label: 'Entry defined',
      ok: input.entryDefined,
      detail: input.entryDefined ? 'Planned entry is set.' : 'Set the price you would actually buy at.',
    },
    {
      key: 'invalidation',
      label: 'Invalidation defined',
      ok: input.invalidation.trim().length >= 15,
      detail:
        input.invalidation.trim().length >= 15
          ? 'You have written what would prove this trade wrong.'
          : 'Write what would prove this trade wrong, in your own words.',
    },
    {
      key: 'stop',
      label: 'Stop defined',
      ok: input.stopDefined && !risk.invalidStop,
      detail: risk.invalidStop ? 'INVALID STOP — the stop must sit below the entry.' : 'Stop price is set.',
    },
    {
      key: 'stop-valid',
      label: 'Stop technically justified',
      ok: stopJustified || stopOverrideAccepted,
      detail: stopJustified
        ? `Stop quality reads ${input.stopQuality}.`
        : stopOverrideAccepted
          ? `Stop quality reads ${input.stopQuality} — overridden in Advanced Mode with a written justification.`
          : input.stopQuality === 'INVALID'
            ? 'The stop is not a usable invalidation level for this setup.'
            : 'Stop quality is questionable against structure or volatility. Review or revise the stop.',
    },
    {
      key: 'risk-per-share',
      label: 'Risk per share calculated',
      ok: risk.riskPerShare !== null,
      detail: risk.riskPerShare !== null ? `$${risk.riskPerShare.toFixed(2)} per share.` : 'Needs a valid stop first.',
    },
    {
      key: 'shares',
      label: 'Position size calculated',
      ok: risk.shares >= 1,
      detail: risk.shares >= 1 ? `${risk.shares} shares from your risk rule.` : 'The stop distance leaves room for no shares.',
    },
    {
      key: 'account-risk',
      label: 'Account risk within limit',
      ok: !risk.riskLimitExceeded,
      detail: risk.riskLimitExceeded
        ? `Planned loss $${risk.plannedLoss.toFixed(2)} exceeds the $${risk.maxDollarRisk.toFixed(2)} rule. Maximum allowed shares: ${risk.maxAllowedShares}.`
        : `Planned loss $${risk.plannedLoss.toFixed(2)} of an allowed $${risk.maxDollarRisk.toFixed(2)}.`,
    },
    {
      key: 'portfolio-risk',
      label: 'Portfolio risk within limit',
      ok: !portfolio.exceeded,
      detail:
        portfolio.message ??
        `Open risk would be $${portfolio.projectedTotal.toFixed(2)} of an allowed $${portfolio.maxTotalOpenRisk.toFixed(2)}.`,
    },
    {
      key: 'target',
      label: 'Target defined',
      ok: input.targetDefined,
      detail: input.targetDefined ? 'Planned target is set.' : 'Choose where you would take the profit.',
    },
    {
      key: 'reward-risk',
      label: 'Reward-to-risk meets rule',
      ok:
        risk.rewardRiskStatus === 'STRONG' ||
        risk.rewardRiskStatus === 'ACCEPTABLE' ||
        !!(input.overrideRewardRisk && input.advancedMode),
      detail:
        risk.rewardRisk === null
          ? 'Needs a valid entry, stop and target.'
          : `${risk.rewardRisk}:1 against your minimum of ${input.minRewardRisk}:1${input.overrideRewardRisk && input.advancedMode ? ' — overridden in Advanced Mode.' : '.'}`,
    },
    {
      key: 'earnings',
      label: 'Earnings risk reviewed',
      ok: !input.earningsAvailable || input.earningsReviewed,
      detail: input.earningsAvailable
        ? input.earningsReviewed
          ? 'You acknowledged the earnings gap risk.'
          : 'Acknowledge the earnings gap risk before this trade can qualify.'
        : EARNINGS_UNKNOWN_TEXT,
    },
  ];

  const failed = checks.filter((c) => !c.ok);
  const stopReasonText = (input.stopFailureReasons ?? []).join(' ');
  const blocking = failed.map((c) => c.detail);

  let verdict: Verdict;
  let headline: string;
  let skip: string | null = null;

  if (!failed.length) {
    verdict = input.entryConfirmed ? 'QUALIFIES' : 'WATCH';
    headline = input.entryConfirmed
      ? stopOverrideAccepted
        ? 'Every required element is in place, with the stop accepted under an Advanced Mode override.'
        : 'Every required element is in place.'
      : 'Setup is developing but entry confirmation has not occurred.';
  } else if (input.stopQuality === 'INVALID' && !stopOverrideAccepted) {
    verdict = 'DOES_NOT_QUALIFY';
    headline = 'The stop is not a technically justified invalidation level.';
    skip = `SKIP TRADE — ${stopReasonText || 'the stop has no technical basis for this setup.'}`;
  } else if (input.stopQuality === 'QUESTIONABLE' && !stopOverrideAccepted) {
    verdict = 'NOT_READY';
    headline = `Review the stop before this trade can qualify. ${stopReasonText}`.trim();
  } else if (risk.rewardRiskStatus === 'BELOW_RULE' && !(input.overrideRewardRisk && input.advancedMode)) {
    verdict = 'DOES_NOT_QUALIFY';
    headline = 'Reward-to-risk is below your minimum rule.';
    skip = `SKIP TRADE — the technical stop may be valid, but the resulting reward-to-risk is below your ${input.minRewardRisk}:1 rule.`;
  } else if (portfolio.exceeded || risk.riskLimitExceeded) {
    verdict = 'DOES_NOT_QUALIFY';
    headline = portfolio.exceeded ? 'This trade would break your portfolio risk limit.' : 'This trade would break your account risk rule.';
    skip = 'SKIP TRADE — the risk this trade requires is larger than your rules allow.';
  } else if (failed.every((c) => ['stop', 'stop-valid', 'risk-per-share', 'shares'].includes(c.key))) {
    verdict = 'NOT_READY';
    headline = 'Setup is valid but no technically justified stop has been defined.';
  } else {
    verdict = 'NOT_READY';
    headline = `${failed.length} required ${failed.length === 1 ? 'element is' : 'elements are'} still missing.`;
  }

  return {
    verdict,
    headline,
    checks,
    blocking,
    skipTradeReason: skip,
    stopOverrideApplied: stopOverrideAccepted,
    stopOverrideRefusal,
  };
}

/* --------------------------------------------------- rule-following score */

export interface RuleFollowingInput {
  validSetup: boolean;
  correctPositionSize: boolean;
  stopBeforeEntry: boolean;
  stopNotWidened: boolean;
  targetDefined: boolean;
  rewardRiskRuleFollowed: boolean;
  portfolioRuleFollowed: boolean;
  journalCompleted: boolean;
  /** False when a questionable or invalid stop was overridden. */
  stopQualityRuleFollowed?: boolean;
}

export interface RuleFollowingResult {
  passed: number;
  total: number;
  percent: number;
  items: { label: string; ok: boolean }[];
}

export function ruleFollowingScore(input: RuleFollowingInput): RuleFollowingResult {
  const items = [
    { label: 'Valid setup', ok: input.validSetup },
    { label: 'Correct position size', ok: input.correctPositionSize },
    { label: 'Stop defined before entry', ok: input.stopBeforeEntry },
    { label: 'Stop technically justified, not overridden', ok: input.stopQualityRuleFollowed !== false },
    { label: 'Stop not widened', ok: input.stopNotWidened },
    { label: 'Target defined', ok: input.targetDefined },
    { label: 'Reward-to-risk rule followed', ok: input.rewardRiskRuleFollowed },
    { label: 'Portfolio risk rule followed', ok: input.portfolioRuleFollowed },
    { label: 'Trade journal completed', ok: input.journalCompleted },
  ];
  const passed = items.filter((i) => i.ok).length;
  return { passed, total: items.length, percent: round2((passed / items.length) * 100), items };
}

/** The worked example taught in the Academy and the planner help panel. */
export const CORE_EXAMPLE = {
  account: 5000,
  riskRulePct: 1,
  maxLoss: 50,
  entry: 44.5,
  invalidation: 42.5,
  riskPerShare: 2,
  shares: 25,
  target: 48.5,
  rewardPerShare: 4,
  rewardRisk: 2,
  explanation: [
    'The trader did not place the stop at $42.50 because they wanted to trade 25 shares.',
    'The technical setup determined that $42.50 was the invalidation level.',
    'Then the $50 risk rule determined that the trader could trade a maximum of 25 shares.',
  ],
} as const;
