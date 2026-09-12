// SwingEdge Hybrid Signal Engine — data confidence.
// Confidence is about the data behind a score, never about the odds of a trade
// working. An 82 built on 60% of the required figures is not the same as an 82
// built on all of them, and the screens must say so.

export type DataConfidence = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';

export const CONFIDENCE_RANK: Record<DataConfidence, number> = {
  INSUFFICIENT: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
};

export function meetsConfidence(actual: DataConfidence, minimum: DataConfidence): boolean {
  return CONFIDENCE_RANK[actual] >= CONFIDENCE_RANK[minimum];
}

export type ProviderQuality = 'PROVIDER' | 'MANUAL' | 'MIXED' | 'NONE';

export interface ConfidenceInputs {
  /** Share of the required scoring inputs that were actually available, 0-1. */
  coverage: number;
  /** Age of the newest figure in days. Null when nothing is dated. */
  freshnessDays: number | null;
  provider: ProviderQuality;
  /** How many reporting periods were available for trend work. */
  periodsAvailable: number;
  /** Metrics where two sources materially disagree. */
  conflictingMetrics?: string[];
  /** Stale or superseded manual values still in use. */
  staleManualMetrics?: string[];
}

export interface ConfidenceResult {
  level: DataConfidence;
  coveragePct: number;
  reasons: string[];
}

/**
 * Coverage leads, then freshness, source and disagreement pull it down.
 * Nothing here ever converts to a probability.
 */
export function assessConfidence(input: ConfidenceInputs): ConfidenceResult {
  const reasons: string[] = [];
  const coverage = Math.max(0, Math.min(1, input.coverage));
  const coveragePct = Math.round(coverage * 100);

  if (input.provider === 'NONE' || coverage <= 0) {
    return {
      level: 'INSUFFICIENT',
      coveragePct,
      reasons: ['No usable data for this part of the score.'],
    };
  }

  let rank = coverage >= 0.9 ? 3 : coverage >= 0.75 ? 2 : coverage >= 0.5 ? 1 : 0;
  if (coverage < 0.9) reasons.push(`Score is based on ${coveragePct}% of the required figures.`);

  if (input.freshnessDays === null) {
    rank -= 1;
    reasons.push('Some figures carry no reporting date, so freshness cannot be verified.');
  } else if (input.freshnessDays > 400) {
    rank -= 2;
    reasons.push('Newest figures are more than a year old.');
  } else if (input.freshnessDays > 200) {
    rank -= 1;
    reasons.push('Newest figures are more than two quarters old.');
  }

  if (input.periodsAvailable < 2) {
    rank -= 1;
    reasons.push('Only one reporting period is available, so trend cannot be judged.');
  }

  if (input.provider === 'MANUAL') reasons.push('Figures were entered by hand rather than supplied by the data provider.');
  if (input.provider === 'MIXED') reasons.push('Figures come from a mix of provider data and hand-entered values.');

  const conflicts = input.conflictingMetrics ?? [];
  if (conflicts.length) {
    rank -= 1;
    reasons.push(`Sources disagree on ${conflicts.join(', ')}. Nothing was replaced automatically.`);
  }

  const stale = input.staleManualMetrics ?? [];
  if (stale.length) {
    rank -= 1;
    reasons.push(`Hand-entered values need re-checking: ${stale.join(', ')}.`);
  }

  const clamped = Math.max(0, Math.min(3, rank));
  const level = (['INSUFFICIENT', 'LOW', 'MODERATE', 'HIGH'] as DataConfidence[])[clamped];
  if (!reasons.length) reasons.push('All required figures are present, dated and from one source.');
  return { level, coveragePct, reasons };
}

/** Combines the confidence of separate datasets into one overall level. */
export function combineConfidence(levels: DataConfidence[]): DataConfidence {
  if (!levels.length) return 'INSUFFICIENT';
  const worst = levels.reduce((low, l) => (CONFIDENCE_RANK[l] < CONFIDENCE_RANK[low] ? l : low), 'HIGH' as DataConfidence);
  return worst;
}

export const CONFIDENCE_DISCLAIMER =
  'Data confidence describes the completeness and freshness of the information behind a score. It is not a probability of profit.';
