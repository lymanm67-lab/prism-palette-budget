// SwingEdge — Signal Revalidation Engine.
//
// A stale GO must never be executed. Expiry triggers (signal age, price drift
// beyond 1 ATR) are only part of it: revalidation is MANDATORY when any of the
// listed conditions change, and always immediately before a paper trade.
//
// Execution order enforced here:
//   GO > REVALIDATE > PRICE > ENTRY ZONE > STOP > RISK > PORTFOLIO HEAT >
//   CORRELATION > FINAL SIGNAL > PAPER TRADE

import type { EntryZone } from './signalLifecycle';

export type RevalidationTrigger =
  | 'NEW_DAILY_CANDLE'
  | 'PRICE_LEFT_ENTRY_ZONE'
  | 'MARKET_REGIME_CHANGED'
  | 'SECTOR_TREND_CHANGED'
  | 'CANDLE_CONFIRMATION_FAILED'
  | 'STOP_VALIDITY_CHANGED'
  | 'REWARD_RISK_CHANGED'
  | 'EARNINGS_RISK_CHANGED'
  | 'QUALITY_DATA_CHANGED'
  | 'CONFIDENCE_FELL'
  | 'SIGNAL_AGED_OUT'
  | 'PRICE_DRIFT_BEYOND_ATR'
  | 'BEFORE_PAPER_TRADE';

export const TRIGGER_TEXT: Record<RevalidationTrigger, string> = {
  NEW_DAILY_CANDLE: 'A new daily candle has completed since this reading.',
  PRICE_LEFT_ENTRY_ZONE: 'Price is no longer inside the approved entry zone.',
  MARKET_REGIME_CHANGED: 'The market regime has changed.',
  SECTOR_TREND_CHANGED: 'The sector trend has changed.',
  CANDLE_CONFIRMATION_FAILED: 'The candlestick confirmation failed.',
  STOP_VALIDITY_CHANGED: 'The stop is no longer justified the way it was.',
  REWARD_RISK_CHANGED: 'Reward against risk has moved materially.',
  EARNINGS_RISK_CHANGED: 'Earnings risk has changed.',
  QUALITY_DATA_CHANGED: 'The company or fund figures have changed materially.',
  CONFIDENCE_FELL: 'Data confidence has fallen.',
  SIGNAL_AGED_OUT: 'The signal is older than your age limit.',
  PRICE_DRIFT_BEYOND_ATR: 'Price has drifted more than one daily range from the entry.',
  BEFORE_PAPER_TRADE: 'Mandatory check immediately before a paper trade.',
};

export type SignalFreshness = 'CURRENT' | 'NEEDS_REVIEW' | 'EXPIRED';

export interface StoredSignalState {
  symbol: string;
  signal: string;
  entryZone: EntryZone;
  entry: number;
  atrValue: number | null;
  capturedAt: string;
  marketRegime?: string | null;
  sectorTrend?: string | null;
  rewardRisk?: number | null;
  stopQuality?: string | null;
  confidence?: string | null;
  earningsDate?: string | null;
  qualityScore?: number | null;
  lastCompletedCandle?: string | null;
  candleConfirmed?: boolean | null;
}

export interface CurrentSignalState {
  price: number;
  marketRegime?: string | null;
  sectorTrend?: string | null;
  rewardRisk?: number | null;
  stopQuality?: string | null;
  confidence?: string | null;
  earningsDate?: string | null;
  qualityScore?: number | null;
  lastCompletedCandle?: string | null;
  candleConfirmed?: boolean | null;
}

export interface RevalidationOptions {
  /** Trading days a signal may stand before it expires. Default 3. */
  maxAgeDays: number;
  /** Reward-to-risk move that counts as material. Default 0.3. */
  rewardRiskTolerance: number;
  /** Quality-score move that counts as material. Default 10 points. */
  qualityTolerance: number;
  /** True when the caller is about to write a paper trade. */
  beforePaperTrade?: boolean;
}

export const DEFAULT_REVALIDATION_OPTIONS: RevalidationOptions = {
  maxAgeDays: 3,
  rewardRiskTolerance: 0.3,
  qualityTolerance: 10,
};

const CONFIDENCE_ORDER = ['INSUFFICIENT', 'LOW', 'MODERATE', 'HIGH'];

export interface RevalidationVerdict {
  freshness: SignalFreshness;
  /** True when the stored signal may still be acted on as-is. */
  usable: boolean;
  /** Signal after revalidation. A stale GO is downgraded, never passed through. */
  effectiveSignal: string;
  triggers: RevalidationTrigger[];
  reasons: string[];
  /** True when price sits beyond the entry zone. */
  priceExtended: boolean;
  ageDays: number;
  headline: string;
  checkedAt: string;
}

const dayMs = 24 * 60 * 60 * 1000;

/**
 * Compare what was stored against what is true now.
 *
 * Any mandatory trigger downgrades a GO. Price outside the entry zone yields
 * PRICE EXTENDED and WAIT — recalculate rather than chase.
 */
export function revalidateSignal(
  stored: StoredSignalState,
  current: CurrentSignalState,
  options: Partial<RevalidationOptions> = {},
  now = new Date(),
): RevalidationVerdict {
  const opts = { ...DEFAULT_REVALIDATION_OPTIONS, ...options };
  const triggers: RevalidationTrigger[] = [];
  const reasons: string[] = [];

  const add = (t: RevalidationTrigger, detail?: string) => {
    if (!triggers.includes(t)) triggers.push(t);
    reasons.push(detail ? `${TRIGGER_TEXT[t]} ${detail}` : TRIGGER_TEXT[t]);
  };

  if (opts.beforePaperTrade) add('BEFORE_PAPER_TRADE');

  const ageMs = Math.max(0, now.getTime() - new Date(stored.capturedAt).getTime());
  const ageDays = Math.round((ageMs / dayMs) * 10) / 10;
  if (ageDays > opts.maxAgeDays) {
    add('SIGNAL_AGED_OUT', `Read ${ageDays} days ago, limit is ${opts.maxAgeDays}.`);
  }

  if (
    stored.lastCompletedCandle &&
    current.lastCompletedCandle &&
    current.lastCompletedCandle !== stored.lastCompletedCandle
  ) {
    add('NEW_DAILY_CANDLE', `Latest completed candle is now ${current.lastCompletedCandle.slice(0, 10)}.`);
  }

  const priceExtended =
    current.price > 0 &&
    (current.price < stored.entryZone.low || current.price > stored.entryZone.high);
  if (priceExtended) {
    add(
      'PRICE_LEFT_ENTRY_ZONE',
      `Price ${current.price} against the zone ${stored.entryZone.low}–${stored.entryZone.high}.`,
    );
  }

  if (stored.atrValue && stored.atrValue > 0 && current.price > 0) {
    const drift = Math.abs(current.price - stored.entry);
    if (drift > stored.atrValue) {
      add(
        'PRICE_DRIFT_BEYOND_ATR',
        `Moved ${Math.round(drift * 100) / 100} against a daily range of ${stored.atrValue}.`,
      );
    }
  }

  if (
    stored.marketRegime &&
    current.marketRegime &&
    stored.marketRegime !== current.marketRegime
  ) {
    add('MARKET_REGIME_CHANGED', `${stored.marketRegime} became ${current.marketRegime}.`);
  }

  if (stored.sectorTrend && current.sectorTrend && stored.sectorTrend !== current.sectorTrend) {
    add('SECTOR_TREND_CHANGED', `${stored.sectorTrend} became ${current.sectorTrend}.`);
  }

  if (stored.candleConfirmed && current.candleConfirmed === false) {
    add('CANDLE_CONFIRMATION_FAILED');
  }

  if (stored.stopQuality && current.stopQuality && stored.stopQuality !== current.stopQuality) {
    add('STOP_VALIDITY_CHANGED', `${stored.stopQuality} became ${current.stopQuality}.`);
  }

  if (
    stored.rewardRisk !== null &&
    stored.rewardRisk !== undefined &&
    current.rewardRisk !== null &&
    current.rewardRisk !== undefined &&
    Math.abs(stored.rewardRisk - current.rewardRisk) > opts.rewardRiskTolerance
  ) {
    add('REWARD_RISK_CHANGED', `${stored.rewardRisk} became ${current.rewardRisk}.`);
  }

  if ((stored.earningsDate ?? null) !== (current.earningsDate ?? null)) {
    if (stored.earningsDate || current.earningsDate) {
      add('EARNINGS_RISK_CHANGED', `Now ${current.earningsDate ?? 'unknown'}.`);
    }
  }

  if (
    stored.qualityScore !== null &&
    stored.qualityScore !== undefined &&
    current.qualityScore !== null &&
    current.qualityScore !== undefined &&
    Math.abs(stored.qualityScore - current.qualityScore) > opts.qualityTolerance
  ) {
    add('QUALITY_DATA_CHANGED', `${stored.qualityScore} became ${current.qualityScore}.`);
  }

  if (stored.confidence && current.confidence) {
    const before = CONFIDENCE_ORDER.indexOf(stored.confidence);
    const after = CONFIDENCE_ORDER.indexOf(current.confidence);
    if (before >= 0 && after >= 0 && after < before) {
      add('CONFIDENCE_FELL', `${stored.confidence} became ${current.confidence}.`);
    }
  }

  // Freshness. Anything beyond a plain "about to trade" check needs review.
  const materialTriggers = triggers.filter((t) => t !== 'BEFORE_PAPER_TRADE');
  const expired =
    triggers.includes('SIGNAL_AGED_OUT') || triggers.includes('PRICE_DRIFT_BEYOND_ATR');

  const freshness: SignalFreshness = expired
    ? 'EXPIRED'
    : materialTriggers.length
      ? 'NEEDS_REVIEW'
      : 'CURRENT';

  let effectiveSignal = stored.signal;
  if (freshness === 'EXPIRED') {
    effectiveSignal = 'REVIEW';
  } else if (priceExtended) {
    effectiveSignal = 'WAIT';
  } else if (freshness === 'NEEDS_REVIEW' && stored.signal === 'GO') {
    effectiveSignal = 'REVIEW';
  }

  const headline = priceExtended
    ? 'PRICE EXTENDED — confirmation happened, but price has moved beyond the planned entry zone. Recalculate rather than chase.'
    : freshness === 'CURRENT'
      ? 'Still current. Nothing material has changed since this reading.'
      : freshness === 'NEEDS_REVIEW'
        ? 'Needs review before you act. Something material changed since this reading.'
        : 'Out of date. Run the analysis again before you do anything with it.';

  if (!reasons.length) reasons.push('Nothing material changed since the reading was taken.');

  return {
    freshness,
    usable: freshness === 'CURRENT' && !priceExtended,
    effectiveSignal,
    triggers,
    reasons,
    priceExtended,
    ageDays,
    headline,
    checkedAt: now.toISOString(),
  };
}

export type ExecutionCheckName =
  | 'REVALIDATE'
  | 'CURRENT_PRICE'
  | 'ENTRY_ZONE'
  | 'STOP'
  | 'RISK'
  | 'PORTFOLIO_HEAT'
  | 'CORRELATION';

export interface ExecutionCheck {
  name: ExecutionCheckName;
  label: string;
  passed: boolean;
  detail: string;
}

export interface ExecutionSequenceInput {
  storedSignal: string;
  revalidation: RevalidationVerdict;
  price: number;
  zone: EntryZone;
  entry: number;
  stop: number;
  shares: number;
  accountRiskPct: number | null;
  maxAccountRiskPct: number;
  heatAllowed: boolean;
  heatReason: string;
  correlationOverLimit: boolean;
  correlationReason: string;
}

export interface ExecutionSequenceResult {
  checks: ExecutionCheck[];
  /** Signal after every gate. Only GO may be executed. */
  finalSignal: string;
  /** True when a paper trade may be written. */
  mayExecute: boolean;
  blockers: string[];
}

/** The full pre-execution sequence. A stale GO can never slip through. */
export function runExecutionSequence(input: ExecutionSequenceInput): ExecutionSequenceResult {
  const checks: ExecutionCheck[] = [
    {
      name: 'REVALIDATE',
      label: 'Signal revalidated',
      passed: input.revalidation.usable,
      detail: input.revalidation.headline,
    },
    {
      name: 'CURRENT_PRICE',
      label: 'Current price available',
      passed: input.price > 0,
      detail: input.price > 0 ? `Using ${input.price}.` : 'No usable current price.',
    },
    {
      name: 'ENTRY_ZONE',
      label: 'Price inside the entry zone',
      passed: input.price >= input.zone.low && input.price <= input.zone.high,
      detail: `Zone ${input.zone.low}–${input.zone.high}, price ${input.price}.`,
    },
    {
      name: 'STOP',
      label: 'Stop below entry',
      passed: input.stop > 0 && input.stop < input.entry,
      detail: `Stop ${input.stop} against entry ${input.entry}.`,
    },
    {
      name: 'RISK',
      label: 'Account risk inside your rule',
      passed:
        input.shares >= 1 &&
        input.accountRiskPct !== null &&
        input.accountRiskPct <= input.maxAccountRiskPct,
      detail:
        input.accountRiskPct === null
          ? 'Risk could not be calculated.'
          : `${input.accountRiskPct}% of the account against a ${input.maxAccountRiskPct}% limit on ${input.shares} shares.`,
    },
    {
      name: 'PORTFOLIO_HEAT',
      label: 'Portfolio and sector heat',
      passed: input.heatAllowed,
      detail: input.heatReason,
    },
    {
      name: 'CORRELATION',
      label: 'Correlated exposure',
      passed: !input.correlationOverLimit,
      detail: input.correlationReason,
    },
  ];

  const blockers = checks.filter((c) => !c.passed).map((c) => `${c.label}: ${c.detail}`);
  const finalSignal =
    blockers.length === 0 && input.revalidation.effectiveSignal === 'GO'
      ? 'GO'
      : input.revalidation.priceExtended
        ? 'WAIT'
        : blockers.length
          ? 'REVIEW'
          : input.revalidation.effectiveSignal;

  return {
    checks,
    finalSignal,
    mayExecute: finalSignal === 'GO',
    blockers,
  };
}
