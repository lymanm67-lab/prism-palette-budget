// SwingEdge — Conditional trade staging.
//
// Two questions, two screens:
//
//   Stock Analyzer  — should I prepare this trade?
//   Trade Planner   — how exactly will I stage and execute it?
//
// Thinkorswim is where the order actually lives. Nothing in here talks to a
// broker, so every state below describes the SwingEdge plan only.

import type { AnalysisSnapshot } from './analysisSnapshot';

export type StagingStatus = 'GO' | 'WAIT' | 'REVIEW' | 'STOP';

export const STAGING_STATUS_LABEL: Record<StagingStatus, string> = {
  GO: 'GO',
  WAIT: 'WAITING FOR CONFIRMATION',
  REVIEW: 'REVIEW',
  STOP: 'STOP',
};

export type ExecutionMode = 'EXECUTE_NOW' | 'SET_ALERT' | 'ARM_FOR_LATER';

export const EXECUTION_MODE_LABEL: Record<ExecutionMode, string> = {
  EXECUTE_NOW: 'Execute now',
  SET_ALERT: 'Set alert',
  ARM_FOR_LATER: 'Arm for later',
};

export const EXECUTION_MODE_NOTE: Record<ExecutionMode, string> = {
  EXECUTE_NOW: 'Everything passes right now, so the order can be typed in Thinkorswim today.',
  SET_ALERT:
    'Wait for the condition, then read the trade again before you type anything. This keeps the final judgement with you.',
  ARM_FOR_LATER:
    'The plan is valid but entry has not confirmed. Thinkorswim holds the order until your conditions are true.',
};

export const PLAN_STATES = [
  'DRAFT',
  'PLAN_COMPLETE',
  'READY_TO_EXECUTE',
  'READY_TO_ARM',
  'WAITING_FOR_CONDITION',
  'CONDITION_MET',
  'REVALIDATION_REQUIRED',
  'EXPIRED',
  'CANCELED',
  'FILLED',
  'OCO_ACTIVE',
] as const;

export type PlanState = (typeof PLAN_STATES)[number];

export const PLAN_STATE_LABEL: Record<PlanState, string> = {
  DRAFT: 'Draft',
  PLAN_COMPLETE: 'Plan complete',
  READY_TO_EXECUTE: 'Ready to execute',
  READY_TO_ARM: 'Ready to arm',
  WAITING_FOR_CONDITION: 'Waiting for condition',
  CONDITION_MET: 'Condition met',
  REVALIDATION_REQUIRED: 'Revalidation required',
  EXPIRED: 'Expired',
  CANCELED: 'Canceled',
  FILLED: 'Filled',
  OCO_ACTIVE: 'OCO active',
};

export const BROKER_TRUTH_NOTE =
  'These states describe your SwingEdge plan. SwingEdge cannot see whether you changed or canceled an order inside Thinkorswim, so Thinkorswim stays the real record of what your broker has working.';

/* ------------------------------------------------------- entry readiness */

export interface EntryReadinessInput {
  symbol: string;
  setup: string | null;
  /** GO / WAIT / REVIEW / STOP from the hybrid signal, when available. */
  signal: string | null;
  readinessScore: number | null;
  readinessBand: string | null;
  hardGates: string[];
  dailyState: string | null;
  h4State: string | null;
  h1State: string | null;
  entryTrigger: number | null;
  currentPrice: number | null;
  stop: number | null;
  target: number | null;
  targetPath: string | null;
  targetPathReason: string | null;
  eventBand: string | null;
  /** Null until the Heikin Ashi module exists. Never guessed. */
  haConfirmation: string | null;
  priceExtended: boolean;
  entryZone: { low: number; high: number } | null;
}

export interface ReadinessRow {
  label: string;
  value: string;
}

export interface EntryReadinessResult {
  status: StagingStatus;
  statusLabel: string;
  headline: string;
  rows: ReadinessRow[];
  waitingFor: string[];
  defaultMode: ExecutionMode;
}

const money = (n: number | null) => (typeof n === 'number' && Number.isFinite(n) ? `$${n.toFixed(2)}` : 'not available');
const plain = (v: string | null) => (v && v.length ? v.replace(/_/g, ' ') : 'not available');

/**
 * The status the Analyzer shows. A hard gate is always a STOP, whatever the
 * score says, and a broken daily setup can never be rescued lower down.
 */
export function stagingStatus(input: EntryReadinessInput): StagingStatus {
  if (input.hardGates.length > 0) return 'STOP';
  if (input.signal === 'STOP' || input.readinessBand === 'NOT_READY') return 'STOP';
  if (input.dailyState === 'INVALIDATED') return 'STOP';
  if (input.signal === 'REVIEW' || input.readinessBand === 'REVIEW') return 'REVIEW';
  if (input.h4State === 'CONTRADICTS') return 'REVIEW';
  if (input.targetPath === 'BLOCKED') return 'REVIEW';
  if (input.eventBand === 'HIGH') return 'REVIEW';
  const readinessOk = input.readinessBand === 'READY' || input.readinessBand === 'QUALIFIED';
  if (input.signal === 'GO' && readinessOk && input.h1State === 'ENTRY_CONFIRMED' && !input.priceExtended) return 'GO';
  return 'WAIT';
}

/**
 * Why the trade is not a GO, in conditions the user can actually watch. Only
 * measurable conditions are listed — a generic "wait" is never good enough.
 */
export function waitingReasons(input: EntryReadinessInput): string[] {
  const out: string[] = [];

  if (input.dailyState === 'INVALIDATED') {
    out.push('The daily setup has failed. Nothing shorter can bring it back.');
  } else if (input.dailyState && input.dailyState !== 'VALID_SETUP') {
    out.push(`The daily chart must produce a valid setup — it currently reads ${plain(input.dailyState)}.`);
  }

  if (input.h4State === 'CONTRADICTS' || input.h4State === 'WEAKENING') {
    out.push(`The 4-hour chart must stop working against the setup — it reads ${plain(input.h4State)}.`);
  }

  if (input.h1State && input.h1State !== 'ENTRY_CONFIRMED') {
    out.push('The 1-hour chart must confirm the entry: a higher low and a move through short-term resistance.');
    out.push('The 1-hour 20 EMA must stay above the 50 SMA.');
    out.push('The 1-hour momentum reading (RSI 14) must stay above 50.');
  }

  if (typeof input.entryTrigger === 'number' && typeof input.currentPrice === 'number') {
    if (input.currentPrice < input.entryTrigger) {
      out.push(`Price must cross above ${money(input.entryTrigger)}.`);
    }
  }

  if (input.priceExtended) {
    out.push('Price has run past the entry zone. Wait for it to come back rather than chasing it.');
  } else if (input.entryZone) {
    out.push(
      `Price must stay inside the entry zone ${money(input.entryZone.low)} to ${money(input.entryZone.high)}.`,
    );
  }

  if (input.targetPath === 'BLOCKED' || input.targetPath === 'PARTIALLY_BLOCKED') {
    out.push(
      input.targetPathReason && input.targetPathReason.length
        ? `The path to the target must clear: ${input.targetPathReason}`
        : 'The path to the target must clear before this is worth taking.',
    );
  }

  if (input.eventBand === 'HIGH' || input.eventBand === 'SEVERE') {
    out.push(`Event risk must come back to acceptable — it currently reads ${plain(input.eventBand)}.`);
  } else {
    out.push('Event risk must stay acceptable between now and entry.');
  }

  if (input.stop === null || input.stop <= 0) {
    out.push('A stop level must be identified from daily structure before this can be planned.');
  }

  return out;
}

/**
 * Beginner Mode always defaults a waiting setup to an alert, so revalidation
 * stays a deliberate act rather than something the software does for you.
 */
export function executionModeFor(status: StagingStatus, beginner: boolean): ExecutionMode {
  if (status === 'GO') return 'EXECUTE_NOW';
  if (status === 'WAIT') return beginner ? 'SET_ALERT' : 'ARM_FOR_LATER';
  return 'SET_ALERT';
}

export function buildEntryReadiness(input: EntryReadinessInput, beginner = true): EntryReadinessResult {
  const status = stagingStatus(input);
  const rows: ReadinessRow[] = [
    { label: 'Setup', value: plain(input.setup) },
    { label: 'Daily', value: plain(input.dailyState) },
    { label: '4 hour', value: plain(input.h4State) },
    { label: '1 hour', value: plain(input.h1State) },
    { label: 'Entry trigger', value: money(input.entryTrigger) },
    { label: 'Current price', value: money(input.currentPrice) },
    { label: 'Stop', value: money(input.stop) },
    { label: 'Target', value: money(input.target) },
    { label: 'Target path', value: plain(input.targetPath) },
    { label: 'Heikin Ashi confirmation', value: input.haConfirmation ? plain(input.haConfirmation) : 'not available yet' },
    { label: 'Event risk', value: plain(input.eventBand) },
    {
      label: 'Trade readiness',
      value: input.readinessScore === null ? 'not available' : `${input.readinessScore} / 100`,
    },
  ];

  const headline =
    status === 'GO'
      ? `${input.symbol} clears every check right now. The next step is planning it, not buying it.`
      : status === 'STOP'
        ? input.hardGates[0] ??
          `${input.symbol} breaks one of your rules today. A clear no is a finished job.`
        : status === 'REVIEW'
          ? `${input.symbol} has a real conflict to settle before it can be staged.`
          : `${input.symbol} is not a trade yet. Here is exactly what has to happen first.`;

  return {
    status,
    statusLabel: STAGING_STATUS_LABEL[status],
    headline,
    rows,
    waitingFor: status === 'GO' ? [] : waitingReasons(input),
    defaultMode: executionModeFor(status, beginner),
  };
}

/* ------------------------------------------------------- entry conditions */

export type ConditionKind = 'PRICE' | 'TREND' | 'MOMENTUM' | 'STUDY' | 'TIME';

export const CONDITION_KIND_LABEL: Record<ConditionKind, string> = {
  PRICE: 'Price',
  TREND: 'Trend',
  MOMENTUM: 'Momentum',
  STUDY: 'Study',
  TIME: 'Time',
};

export interface EntryCondition {
  id: string;
  kind: ConditionKind;
  /** Aggregation period the condition is read on. */
  timeframe: string;
  text: string;
  enabled: boolean;
}

export type ConditionMode = 'SIMPLE' | 'ADVANCED';

export const CONDITION_LOGIC_TEXT = 'All conditions required.';

/**
 * The three plain conditions a beginner staging needs. Built from the entry
 * trigger the Analyzer measured — never from an invented price.
 */
export function conditionsFromReadiness(entryTrigger: number | null, timeframe = '1 hour'): EntryCondition[] {
  return [
    {
      id: 'price',
      kind: 'PRICE',
      timeframe,
      text:
        typeof entryTrigger === 'number' && entryTrigger > 0
          ? `Price crosses above $${entryTrigger.toFixed(2)}`
          : 'Price crosses above the entry trigger (set the entry first)',
      enabled: true,
    },
    { id: 'trend', kind: 'TREND', timeframe, text: 'EMA 20 is above SMA 50', enabled: true },
    { id: 'momentum', kind: 'MOMENTUM', timeframe, text: 'RSI 14 is above 50', enabled: true },
  ];
}

export function conditionSentences(conditions: EntryCondition[]): string[] {
  return conditions.filter((c) => c.enabled).map((c) => `${c.timeframe}: ${c.text}`);
}

/* ------------------------------------------------------------ plan state */

export interface PlanStateInput {
  mode: ExecutionMode | null;
  status: StagingStatus;
  planComplete: boolean;
  conditionsDefined: boolean;
  conditionsMet?: boolean;
  saved?: boolean;
  expired?: boolean;
  canceled?: boolean;
  filled?: boolean;
  ocoActive?: boolean;
  revalidationRequired?: boolean;
}

/** One state, resolved in the order that keeps the user safest. */
export function nextPlanState(input: PlanStateInput): PlanState {
  if (input.canceled) return 'CANCELED';
  if (input.filled) return input.ocoActive ? 'OCO_ACTIVE' : 'FILLED';
  if (input.expired) return 'EXPIRED';
  if (input.revalidationRequired) return 'REVALIDATION_REQUIRED';
  if (!input.planComplete) return 'DRAFT';
  if (input.mode === 'EXECUTE_NOW') return input.status === 'GO' ? 'READY_TO_EXECUTE' : 'REVALIDATION_REQUIRED';
  if (input.mode === 'ARM_FOR_LATER' || input.mode === 'SET_ALERT') {
    if (!input.conditionsDefined) return 'READY_TO_ARM';
    if (input.conditionsMet) return 'CONDITION_MET';
    return input.saved ? 'WAITING_FOR_CONDITION' : 'READY_TO_ARM';
  }
  return 'PLAN_COMPLETE';
}

/* ------------------------------------------------- armed trade monitoring */

export interface ArmedReviewResult {
  needsReview: boolean;
  reasons: string[];
  checkedAt: string;
}

/**
 * Compares the conditions stored when the trade was armed against a fresh read.
 * Only differences that were measurable in both reads are reported.
 */
export function armedNeedsReview(
  armed: AnalysisSnapshot,
  fresh: Partial<AnalysisSnapshot> & { priceExtended?: boolean },
  now = new Date(),
): ArmedReviewResult {
  const reasons: string[] = [];
  const both = <T>(a: T | null | undefined, b: T | null | undefined) =>
    a !== null && a !== undefined && b !== null && b !== undefined;

  if (both(armed.signalStatus, fresh.signalStatus) && armed.signalStatus !== fresh.signalStatus) {
    if (fresh.signalStatus === 'STOP' || fresh.signalStatus === 'REVIEW') {
      reasons.push(`The signal has moved from ${armed.signalStatus} to ${fresh.signalStatus}.`);
    }
  }
  if (fresh.targetPath === 'BLOCKED' && armed.targetPath !== 'BLOCKED') {
    reasons.push('The path to the target is now blocked by overhead resistance.');
  }
  if (both(armed.eventRisk, fresh.eventRisk) && armed.eventRisk !== fresh.eventRisk) {
    const worse = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'];
    if (worse.indexOf(String(fresh.eventRisk)) > worse.indexOf(String(armed.eventRisk))) {
      reasons.push(`Event risk has risen from ${armed.eventRisk} to ${fresh.eventRisk}.`);
    }
  }
  if (fresh.dailyTrend === 'INVALIDATED' && armed.dailyTrend !== 'INVALIDATED') {
    reasons.push('The daily setup has been invalidated since the trade was armed.');
  }
  if (both(armed.directionalBias, fresh.directionalBias) && armed.directionalBias !== fresh.directionalBias) {
    reasons.push(`The directional bias has changed from ${armed.directionalBias} to ${fresh.directionalBias}.`);
  }
  if (fresh.priceExtended) {
    reasons.push('Price has moved beyond the planned entry zone.');
  }
  if (both(armed.stopSuggestion, fresh.stopSuggestion) && fresh.stopSuggestion !== armed.stopSuggestion) {
    reasons.push(
      `The structural stop has moved from $${Number(armed.stopSuggestion).toFixed(2)} to $${Number(
        fresh.stopSuggestion,
      ).toFixed(2)}.`,
    );
  }

  return { needsReview: reasons.length > 0, reasons, checkedAt: now.toISOString() };
}

export const ARMED_NEEDS_REVIEW_LABEL = 'ARMED TRADE NEEDS REVIEW';
export const ARMED_LABEL = 'ARMED TRADE — NOT YET ACTIVE';
