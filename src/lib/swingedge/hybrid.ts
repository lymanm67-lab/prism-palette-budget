// SwingEdge Hybrid Signal Engine — the decision layer.
// Quality (fundamental or ETF) + technical setup + risk quality are combined into
// one signal with four states. Hard gates always beat the score: a good-looking
// number never overrides a broken stop, a missing minimum or stale data.
//
// No output here is a probability of profit and nothing here says buy or sell.

import { CONFIDENCE_RANK, meetsConfidence, type DataConfidence } from './confidence';
import { worstSeverity, type SignalConflict } from './conflicts';

export const HYBRID_METHODOLOGY_VERSION = 'hybrid-1.0.0';

export type HybridSignal = 'GO' | 'WAIT' | 'REVIEW' | 'STOP';
export type OpenTradeSignal = 'HOLD_PLAN' | 'REVIEW_TRADE' | 'STOP_TRIGGERED' | 'TARGET_REACHED';
export type HybridBand = 'STRONG' | 'QUALIFIED' | 'WATCH' | 'WEAK' | 'POOR';

export interface HybridWeights {
  quality: number;
  technical: number;
  risk: number;
}

export const DEFAULT_HYBRID_WEIGHTS: HybridWeights = { quality: 0.4, technical: 0.4, risk: 0.2 };

export interface HybridThresholds {
  quality: number;
  technical: number;
  risk: number;
  hybrid: number;
  minimumConfidence: DataConfidence;
}

export const DEFAULT_HYBRID_THRESHOLDS: HybridThresholds = {
  quality: 65,
  technical: 75,
  risk: 75,
  hybrid: 75,
  minimumConfidence: 'MODERATE',
};

export interface HybridInputs {
  symbol: string;
  assetType: 'STOCK' | 'ETF';
  /** Company Fundamental Score for stocks, ETF Quality Score for funds. */
  qualityScore: number | null;
  technicalScore: number;
  riskScore: number;
  confidence: DataConfidence;
  /** Coverage of the quality data, 0-1, shown alongside the score. */
  qualityCoverage?: number;
  weights?: Partial<HybridWeights>;
  thresholds?: Partial<HybridThresholds>;
  /** Failures that no score can outvote. */
  hardGateFailures?: string[];
  conflicts?: SignalConflict[];
  /** A defined breakout or pullback exists on completed candles. */
  setupReady: boolean;
  /** Price has run beyond the planned entry zone. */
  priceOutsideEntryZone?: boolean;
  /** The stored signal has passed its valid-until time. */
  expired?: boolean;
  criticalRedFlag?: boolean;
  advancedProduct?: boolean;
  beginnerMode?: boolean;
  /** True when the newest candle is still forming, so the read is a preview. */
  developing?: boolean;
}

export interface ThresholdCheck {
  key: string;
  label: string;
  required: string;
  actual: string;
  passed: boolean;
}

export interface HybridResult {
  symbol: string;
  hybridScore: number | null;
  band: HybridBand | null;
  signal: HybridSignal;
  weights: HybridWeights;
  thresholds: HybridThresholds;
  checks: ThresholdCheck[];
  blocking: string[];
  reasons: string[];
  whatWouldChangeIt: string[];
  conflicts: SignalConflict[];
  confidence: DataConfidence;
  developing: boolean;
  methodologyVersion: string;
}

const pct = (n: number | null) => (n === null ? 'no data' : `${Math.round(n)}`);

export function hybridBand(score: number | null): HybridBand | null {
  if (score === null) return null;
  if (score >= 85) return 'STRONG';
  if (score >= 75) return 'QUALIFIED';
  if (score >= 65) return 'WATCH';
  if (score >= 50) return 'WEAK';
  return 'POOR';
}

/**
 * Weighted blend. When quality data is unusable the weight is redistributed
 * across the layers that do have data, and confidence carries the shortfall
 * rather than the score being padded with zeros.
 */
export function blendScores(
  input: { qualityScore: number | null; technicalScore: number; riskScore: number },
  weights: HybridWeights,
): number {
  const parts: { value: number; weight: number }[] = [
    { value: input.technicalScore, weight: weights.technical },
    { value: input.riskScore, weight: weights.risk },
  ];
  if (input.qualityScore !== null) parts.unshift({ value: input.qualityScore, weight: weights.quality });
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  if (totalWeight <= 0) return 0;
  const blended = parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight;
  return Math.round(blended * 10) / 10;
}

/** The full decision. Gates run first, then conflicts, then the thresholds. */
export function computeHybridSignal(input: HybridInputs): HybridResult {
  const weights: HybridWeights = { ...DEFAULT_HYBRID_WEIGHTS, ...input.weights };
  const thresholds: HybridThresholds = { ...DEFAULT_HYBRID_THRESHOLDS, ...input.thresholds };
  const conflicts = input.conflicts ?? [];
  const gates = [...(input.hardGateFailures ?? [])];

  const hybridScore = blendScores(input, weights);
  const band = hybridBand(hybridScore);

  const checks: ThresholdCheck[] = [
    {
      key: 'quality',
      label: input.assetType === 'ETF' ? 'Fund quality' : 'Company quality',
      required: `at least ${thresholds.quality}`,
      actual: pct(input.qualityScore),
      passed: input.qualityScore !== null && input.qualityScore >= thresholds.quality,
    },
    {
      key: 'technical',
      label: 'Chart setup',
      required: `at least ${thresholds.technical}`,
      actual: pct(input.technicalScore),
      passed: input.technicalScore >= thresholds.technical,
    },
    {
      key: 'risk',
      label: 'Risk quality',
      required: `at least ${thresholds.risk}`,
      actual: pct(input.riskScore),
      passed: input.riskScore >= thresholds.risk,
    },
    {
      key: 'hybrid',
      label: 'Combined score',
      required: `at least ${thresholds.hybrid}`,
      actual: pct(hybridScore),
      passed: hybridScore >= thresholds.hybrid,
    },
    {
      key: 'confidence',
      label: 'Data confidence',
      required: `${thresholds.minimumConfidence} or better`,
      actual: input.confidence,
      passed: meetsConfidence(input.confidence, thresholds.minimumConfidence),
    },
    {
      key: 'setup',
      label: 'Defined setup on completed candles',
      required: 'a breakout or pullback',
      actual: input.setupReady ? 'present' : 'none',
      passed: input.setupReady,
    },
    {
      key: 'entryZone',
      label: 'Price inside the entry zone',
      required: 'inside',
      actual: input.priceOutsideEntryZone ? 'price has run away' : 'inside',
      passed: !input.priceOutsideEntryZone,
    },
    {
      key: 'freshness',
      label: 'Signal still current',
      required: 'not expired',
      actual: input.expired ? 'expired' : 'current',
      passed: !input.expired,
    },
  ];

  const reasons: string[] = [];
  const whatWouldChangeIt: string[] = [];

  if (input.advancedProduct && input.beginnerMode) {
    gates.push('This is a geared, inverse or single-stock product, which beginner mode keeps out of GO signals.');
  }

  let signal: HybridSignal;

  if (gates.length) {
    signal = 'STOP';
    reasons.push('A rule was broken outright, so no score can promote this to a GO.');
  } else if (worstSeverity(conflicts) === 'BLOCK') {
    signal = 'STOP';
    reasons.push('The risk side of this trade fails your own rules.');
  } else if (!meetsConfidence(input.confidence, thresholds.minimumConfidence)) {
    signal = 'REVIEW';
    reasons.push(
      `Data confidence is ${input.confidence}. The score can be read, but it is not complete enough to act on without checking the figures yourself.`,
    );
    whatWouldChangeIt.push('More complete or fresher data, or hand-entered figures for the missing items.');
  } else if (input.qualityScore !== null && input.qualityScore < thresholds.quality) {
    signal = 'REVIEW';
    reasons.push(
      `${input.assetType === 'ETF' ? 'Fund' : 'Company'} quality is ${Math.round(input.qualityScore)}, below the ${thresholds.quality} minimum, even though the chart or risk side may look fine.`,
    );
    whatWouldChangeIt.push('Improvement in the reported figures, or choosing a higher-quality name with the same setup.');
  } else if (input.criticalRedFlag) {
    signal = 'REVIEW';
    reasons.push('A critical warning sign in the figures needs a decision from you before this trade is taken.');
  } else if (input.technicalScore < thresholds.technical) {
    // A sound business whose chart is simply not ready is a WAIT. A chart that is
    // materially weak, not merely unready, deserves a proper review.
    signal = input.technicalScore >= 60 ? 'WAIT' : 'REVIEW';
    reasons.push(
      `The chart scores ${Math.round(input.technicalScore)} against a ${thresholds.technical} minimum, so the setup is not ready yet.`,
    );
    whatWouldChangeIt.push('A defined breakout or pullback with volume behind it, on completed candles.');
  } else if (!input.setupReady) {
    signal = 'WAIT';
    reasons.push('There is no defined setup on completed candles, so any entry price would be arbitrary.');
    whatWouldChangeIt.push('A breakout above the recent range, or a pullback into the 20-day average.');
  } else if (input.expired || input.priceOutsideEntryZone) {
    signal = 'WAIT';
    reasons.push(
      input.expired
        ? 'This signal is out of date and has to be recalculated on the latest completed candle.'
        : 'Price has run beyond the entry zone, so the original risk no longer applies.',
    );
    whatWouldChangeIt.push('A fresh calculation, or price easing back into the planned entry zone.');
  } else if (hybridScore < thresholds.hybrid) {
    signal = 'WAIT';
    reasons.push(`The combined score is ${hybridScore}, below the ${thresholds.hybrid} needed for a GO.`);
    whatWouldChangeIt.push('A stronger reading in whichever layer is holding the total down.');
  } else if (worstSeverity(conflicts) === 'HOLD') {
    signal = 'WAIT';
    reasons.push('The three layers disagree, and the disagreement is worth waiting out.');
    conflicts.filter((c) => c.severity === 'HOLD').forEach((c) => reasons.push(c.explanation));
  } else {
    signal = 'GO';
    reasons.push('Quality, chart and risk all clear their minimums on completed candles, with no rule broken.');
    whatWouldChangeIt.push('A close below the stop level, a lost setup, or a change in the reported figures.');
  }

  if (input.developing) {
    whatWouldChangeIt.push("Today's candle is still forming, so this read can change by the close.");
  }
  conflicts.filter((c) => c.severity === 'NOTE').forEach((c) => reasons.push(c.explanation));

  return {
    symbol: input.symbol.toUpperCase(),
    hybridScore,
    band,
    signal,
    weights,
    thresholds,
    checks,
    blocking: gates,
    reasons,
    whatWouldChangeIt,
    conflicts,
    confidence: input.confidence,
    developing: !!input.developing,
    methodologyVersion: HYBRID_METHODOLOGY_VERSION,
  };
}

export interface OpenTradeInputs {
  price: number;
  currentStop: number;
  target: number;
  /** Latest hybrid read for the same symbol, recalculated on completed candles. */
  hybrid: HybridResult | null;
  qualityDeteriorated?: boolean;
  earningsInsideHold?: boolean;
}

export interface OpenTradeResult {
  signal: OpenTradeSignal;
  reasons: string[];
  /** Fundamentals never move a stop price. */
  stopUnchangedNote: string;
}

/** State of a trade already on: plan, review, stopped, or target reached. */
export function assessOpenTrade(input: OpenTradeInputs): OpenTradeResult {
  const reasons: string[] = [];
  const stopUnchangedNote =
    'A change in the reported figures never moves your stop. The stop is a technical level; weakening figures are a reason to review the trade, not to abandon the plan mid-flight.';

  if (input.price <= input.currentStop) {
    return {
      signal: 'STOP_TRIGGERED',
      reasons: ['Price has reached or passed the stop level, so the plan says the idea is wrong.'],
      stopUnchangedNote,
    };
  }
  if (input.price >= input.target) {
    return {
      signal: 'TARGET_REACHED',
      reasons: ['Price has reached the planned target.'],
      stopUnchangedNote,
    };
  }
  if (input.qualityDeteriorated) reasons.push('The reported figures behind this holding have weakened since the trade was opened.');
  if (input.earningsInsideHold) reasons.push('Earnings are due before the target is likely to be reached.');
  if (input.hybrid && (input.hybrid.signal === 'STOP' || input.hybrid.signal === 'REVIEW')) {
    reasons.push(`The latest read on this symbol is ${input.hybrid.signal}.`);
  }
  if (reasons.length) return { signal: 'REVIEW_TRADE', reasons, stopUnchangedNote };
  return {
    signal: 'HOLD_PLAN',
    reasons: ['Nothing has changed that affects the plan. Let the stop and target do their job.'],
    stopUnchangedNote,
  };
}

export const SIGNAL_MEANING: Record<HybridSignal, string> = {
  GO: 'Every layer clears your minimums and no rule is broken. It is still your decision to place a trade.',
  WAIT: 'Nothing is wrong, but something is not ready yet. Watch for the missing piece.',
  REVIEW: 'Something needs a judgement call from you before this could be acted on.',
  STOP: 'A rule is broken. This does not qualify as it stands.',
};

export const SIGNAL_TONE: Record<HybridSignal, string> = {
  GO: 'border-prism-lime/50 bg-prism-lime/10 text-prism-lime',
  WAIT: 'border-prism-sky/50 bg-prism-sky/10 text-prism-sky',
  REVIEW: 'border-prism-amber/50 bg-prism-amber/10 text-prism-amber',
  STOP: 'border-prism-rose/50 bg-prism-rose/10 text-prism-rose',
};

export const OPEN_SIGNAL_MEANING: Record<OpenTradeSignal, string> = {
  HOLD_PLAN: 'The trade is doing what it was meant to do. Stick to the written plan.',
  REVIEW_TRADE: 'Something has changed since you opened this. Read it, then decide deliberately.',
  STOP_TRIGGERED: 'Price hit your stop. The idea was wrong and the loss was the one you planned for.',
  TARGET_REACHED: 'Price reached your target.',
};

export const NOT_A_PROBABILITY =
  'Scores and signals are a tally of rules you set. They are never a probability of profit and never advice to buy or sell.';

export function confidenceGap(actual: DataConfidence, minimum: DataConfidence): number {
  return CONFIDENCE_RANK[minimum] - CONFIDENCE_RANK[actual];
}
