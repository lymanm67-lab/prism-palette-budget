// SwingEdge trade geometry — entry, stop, risk, target, and whether price has a
// technically reasonable path to that target.
//
// Pure functions only. Nothing here invents data: when a level is missing the
// result says so (INSUFFICIENT_DATA) instead of guessing.

import type { StopQuality } from './stops';

export const REWARD_MULTIPLES = [1.5, 2, 2.5, 3] as const;
export type RewardMultiple = number;

/** Beginner mode is fixed at 2R; advanced mode may change it. */
export const DEFAULT_REWARD_MULTIPLE = 2;

export type TargetMethodLabel =
  | '2R MATHEMATICAL'
  | 'RESISTANCE'
  | 'MEASURED MOVE'
  | 'CHANNEL'
  | 'ATR'
  | 'MANUAL'
  | 'HYBRID';

export type TargetPath = 'CLEAR' | 'PARTIALLY_BLOCKED' | 'BLOCKED' | 'INSUFFICIENT_DATA';

export type TargetQuality = 'STRONG' | 'ACCEPTABLE' | 'QUESTIONABLE' | 'POOR' | 'INSUFFICIENT_DATA';

export type TargetConfidence = 'NORMAL' | 'LOW';

/** Why a target should not be treated as actionable right now. */
export type TargetState = 'ACTIONABLE' | 'INVALID_STOP' | 'STALE' | 'RECALCULATING';

export type EntryQuality = 'STRONG' | 'ACCEPTABLE' | 'EARLY' | 'EXTENDED' | 'INVALID' | 'EXPIRED';

export const TARGET_PATH_LABEL: Record<TargetPath, string> = {
  CLEAR: 'Clear',
  PARTIALLY_BLOCKED: 'Partly blocked',
  BLOCKED: 'Blocked',
  INSUFFICIENT_DATA: 'Not enough data',
};

export const TARGET_QUALITY_LABEL: Record<TargetQuality, string> = {
  STRONG: 'Strong',
  ACCEPTABLE: 'Acceptable',
  QUESTIONABLE: 'Questionable',
  POOR: 'Poor',
  INSUFFICIENT_DATA: 'Not enough data',
};

export interface GeometryInputs {
  entry: number | null;
  stop: number | null;
  /** Nearest overhead level: resistance, prior swing high, channel top. */
  resistance?: number | null;
  rewardMultiple?: RewardMultiple;
  /** Optional judgement from assessStop — gates whether a target is actionable. */
  stopQuality?: StopQuality | null;
  /** Optional judgement of the entry — an extended entry makes a target stale. */
  entryQuality?: EntryQuality | null;
  /** Risk ceiling in dollars, used for the approved share count. */
  maxDollarRisk?: number | null;
  /** Shares the user actually plans to take, for planned risk. */
  plannedShares?: number | null;
  /** Whole shares unless fractional trading is explicitly enabled. */
  allowFractionalShares?: boolean;
  /** Optional technical target the user chose instead of the maths. */
  manualTarget?: number | null;
  manualTargetMethod?: TargetMethodLabel;
}

export interface GeometryResult {
  entry: number | null;
  stop: number | null;
  resistance: number | null;
  riskPerShare: number | null;
  rewardMultiple: RewardMultiple;
  /** Entry + (risk × multiple). Always shown for comparison. */
  mathematicalTarget: number | null;
  /** The target to act on — the manual/technical one when supplied. */
  target: number | null;
  targetMethod: TargetMethodLabel;
  rewardRisk: number | null;
  rewardToResistance: number | null;
  rToResistance: number | null;
  resistanceTooClose: boolean;
  targetPath: TargetPath;
  targetPathReason: string;
  targetQuality: TargetQuality;
  targetConfidence: TargetConfidence;
  targetState: TargetState;
  /** Plain-language note when the target must not be traded as-is. */
  targetStateNote: string | null;
  maxShares: number | null;
  plannedRisk: number | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * Long-trade geometry.
 *
 * Reference: entry 34.34, stop 32.51 -> risk 1.83, 2R target 38.00.
 * With resistance 35.31 the path is BLOCKED because overhead supply arrives
 * before the first 1R of reward.
 */
export function computeGeometry(input: GeometryInputs): GeometryResult {
  const rewardMultiple = input.rewardMultiple && input.rewardMultiple > 0
    ? input.rewardMultiple
    : DEFAULT_REWARD_MULTIPLE;
  const entry = isNum(input.entry) && input.entry > 0 ? round2(input.entry) : null;
  const stop = isNum(input.stop) && input.stop > 0 ? round2(input.stop) : null;
  const resistance = isNum(input.resistance) && input.resistance > 0 ? round2(input.resistance) : null;

  const riskPerShare = entry !== null && stop !== null && entry > stop ? round2(entry - stop) : null;

  const mathematicalTarget =
    entry !== null && riskPerShare !== null ? round2(entry + riskPerShare * rewardMultiple) : null;

  const manual = isNum(input.manualTarget) && input.manualTarget > 0 ? round2(input.manualTarget) : null;
  const target = manual ?? mathematicalTarget;
  const targetMethod: TargetMethodLabel = manual
    ? (input.manualTargetMethod ?? 'MANUAL')
    : rewardMultiple === 2
      ? '2R MATHEMATICAL'
      : 'HYBRID';

  const rewardRisk =
    target !== null && entry !== null && riskPerShare !== null && riskPerShare > 0
      ? round2((target - entry) / riskPerShare)
      : null;

  const rewardToResistance =
    resistance !== null && entry !== null && resistance > entry ? round2(resistance - entry) : null;
  const rToResistance =
    rewardToResistance !== null && riskPerShare !== null && riskPerShare > 0
      ? Math.round((rewardToResistance / riskPerShare) * 100) / 100
      : null;
  const resistanceTooClose = rToResistance !== null && rToResistance < 1;

  let targetPath: TargetPath = 'INSUFFICIENT_DATA';
  let targetPathReason = 'No overhead level is recorded, so the path to the target is not checked.';
  let targetQuality: TargetQuality = 'INSUFFICIENT_DATA';

  if (riskPerShare === null) {
    targetPathReason = 'Entry and stop are needed before the path can be checked.';
  } else if (rToResistance === null) {
    if (resistance !== null && entry !== null && resistance <= entry) {
      targetPath = 'CLEAR';
      targetPathReason = 'The nearest recorded level sits below the entry, so nothing blocks the way up.';
      targetQuality = 'STRONG';
    }
  } else if (rToResistance >= rewardMultiple) {
    targetPath = 'CLEAR';
    targetPathReason = `Resistance sits beyond the ${rewardMultiple}R target (${rToResistance.toFixed(2)}R away).`;
    targetQuality = 'STRONG';
  } else if (rToResistance >= 1.5) {
    targetPath = 'PARTIALLY_BLOCKED';
    targetPathReason = `Resistance arrives at ${rToResistance.toFixed(2)}R, before the ${rewardMultiple}R target.`;
    targetQuality = 'ACCEPTABLE';
  } else if (rToResistance >= 1) {
    targetPath = 'PARTIALLY_BLOCKED';
    targetPathReason = `Resistance arrives at ${rToResistance.toFixed(2)}R, so most of the reward is above supply.`;
    targetQuality = 'QUESTIONABLE';
  } else {
    targetPath = 'BLOCKED';
    targetPathReason = `Resistance arrives at ${rToResistance.toFixed(2)}R — before the first 1R of reward.`;
    targetQuality = 'POOR';
  }

  let targetState: TargetState = 'ACTIONABLE';
  let targetStateNote: string | null = null;
  let targetConfidence: TargetConfidence = 'NORMAL';

  if (input.stopQuality === 'INVALID' || riskPerShare === null) {
    targetState = 'INVALID_STOP';
    targetStateNote = 'Invalid stop — no qualified target until the stop is a real invalidation level.';
  } else if (input.stopQuality === 'QUESTIONABLE') {
    targetConfidence = 'LOW';
  }

  if (
    targetState === 'ACTIONABLE' &&
    (input.entryQuality === 'EXTENDED' ||
      input.entryQuality === 'INVALID' ||
      input.entryQuality === 'EXPIRED')
  ) {
    targetState = 'STALE';
    targetStateNote =
      input.entryQuality === 'EXTENDED'
        ? 'Price is extended past the entry — recalculate before using this target.'
        : 'The entry is no longer valid, so this target needs recalculating.';
  }

  const maxShares =
    isNum(input.maxDollarRisk) && input.maxDollarRisk > 0 && riskPerShare !== null && riskPerShare > 0
      ? input.allowFractionalShares
        ? Math.round((input.maxDollarRisk / riskPerShare) * 100) / 100
        : Math.floor(input.maxDollarRisk / riskPerShare)
      : null;

  const shares = isNum(input.plannedShares) && input.plannedShares > 0 ? input.plannedShares : null;
  const plannedRisk = shares !== null && riskPerShare !== null ? round2(shares * riskPerShare) : null;

  return {
    entry,
    stop,
    resistance,
    riskPerShare,
    rewardMultiple,
    mathematicalTarget,
    target: targetState === 'INVALID_STOP' ? null : target,
    targetMethod,
    rewardRisk,
    rewardToResistance,
    rToResistance,
    resistanceTooClose,
    targetPath,
    targetPathReason,
    targetQuality,
    targetConfidence,
    targetState,
    targetStateNote,
    maxShares,
    plannedRisk,
  };
}

/** Text shown for the target cell, so a caller never has to build it twice. */
export function targetCellText(g: GeometryResult): string {
  if (g.targetState === 'INVALID_STOP') return 'N/A';
  if (g.targetState === 'STALE') return 'Recalculate';
  if (g.targetState === 'RECALCULATING') return 'Recalculating';
  return g.target === null
    ? '—'
    : g.target.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

/** Ranking so a filter can ask for "at least acceptable". */
export const TARGET_QUALITY_RANK: Record<TargetQuality, number> = {
  STRONG: 4,
  ACCEPTABLE: 3,
  QUESTIONABLE: 2,
  POOR: 1,
  INSUFFICIENT_DATA: 0,
};
