// SwingEdge — Trade Readiness Score.
//
// Answers exactly one question: does THIS trade meet my rules right now?
//
// The score is a summary, never an authority. Any hard gate overrides it — a 94
// with a severe verified event affecting the sector is NOT READY, full stop.

export type ReadinessBand = 'READY' | 'QUALIFIED' | 'WAIT' | 'REVIEW' | 'NOT_READY';

export const READINESS_BAND_LABEL: Record<ReadinessBand, string> = {
  READY: 'READY',
  QUALIFIED: 'QUALIFIED',
  WAIT: 'WAIT',
  REVIEW: 'REVIEW',
  NOT_READY: 'NOT READY',
};

export type ReadinessItemKey =
  | 'setup'
  | 'stop'
  | 'trend'
  | 'bias'
  | 'rewardRisk'
  | 'quality'
  | 'regime'
  | 'sector'
  | 'candles'
  | 'volume'
  | 'sizing'
  | 'event'
  | 'revalidation'
  | 'heat'
  | 'correlation';

export type ReadinessWeights = Record<ReadinessItemKey, number>;

/** Default weights. Advanced Mode may change these; they always total 100. */
export const DEFAULT_READINESS_WEIGHTS: ReadinessWeights = {
  setup: 10,
  stop: 10,
  trend: 9,
  bias: 9,
  rewardRisk: 9,
  quality: 8,
  regime: 7,
  sector: 6,
  candles: 5,
  volume: 5,
  sizing: 5,
  event: 5,
  revalidation: 5,
  heat: 4,
  correlation: 3,
};

export const READINESS_LABELS: Record<ReadinessItemKey, string> = {
  setup: 'Setup quality',
  stop: 'Stop placement',
  trend: 'Trend alignment',
  bias: 'Directional bias',
  rewardRisk: 'Reward against risk',
  quality: 'Company or fund quality',
  regime: 'Market regime',
  sector: 'Sector strength',
  candles: 'Candle confirmation',
  volume: 'Volume',
  sizing: 'Position sizing',
  event: 'Event risk',
  revalidation: 'Signal freshness',
  heat: 'Portfolio heat',
  correlation: 'Correlation',
};

export interface ReadinessScores {
  /** Each item scored 0 to 1. Null means the input was unavailable. */
  [key: string]: number | null;
}

export interface ReadinessItem {
  key: ReadinessItemKey;
  label: string;
  weight: number;
  /** 0 to 1, or null when unavailable. */
  score: number | null;
  points: number;
  detail: string;
}

export interface TradeReadinessInput {
  scores: Partial<Record<ReadinessItemKey, number | null>>;
  details?: Partial<Record<ReadinessItemKey, string>>;
  weights?: Partial<ReadinessWeights>;
  /** Conditions that make the trade unqualifiable regardless of the score. */
  hardGates?: string[];
}

export interface TradeReadinessResult {
  score: number;
  band: ReadinessBand;
  bandLabel: string;
  items: ReadinessItem[];
  hardGates: string[];
  /** True only when nothing is gated and the score is at least QUALIFIED. */
  qualifies: boolean;
  headline: string;
  unavailable: ReadinessItemKey[];
}

export const HARD_GATE_TEXT = {
  INVALID_STOP: 'The stop is not a valid invalidation level.',
  NO_INVALIDATION: 'No invalidation level has been identified.',
  RISK_BREACH: 'Account risk exceeds your per-trade limit.',
  HEAT_BREACH: 'Portfolio or sector heat is over your limit.',
  CORRELATION_BREACH: 'Correlated exposure is over your limit.',
  REWARD_RISK_BELOW_MINIMUM: 'Reward to risk is below your minimum.',
  POOR_TRADABILITY: 'The symbol is not tradable enough for this plan.',
  SIGNAL_EXPIRED: 'The signal has expired and must be re-read.',
  PRICE_EXTENDED: 'Price has moved beyond the planned entry zone.',
  DATA_FAILURE: 'Critical data is missing, so this cannot be judged.',
  SEVERE_EVENT: 'A severe verified event affects this trade.',
  UNKNOWN_EARNINGS: 'The earnings date is unknown and verification is required.',
} as const;

function bandFor(score: number): ReadinessBand {
  if (score >= 90) return 'READY';
  if (score >= 80) return 'QUALIFIED';
  if (score >= 70) return 'WAIT';
  if (score >= 60) return 'REVIEW';
  return 'NOT_READY';
}

/**
 * Scores the trade out of 100. Unavailable inputs score zero and are listed, so
 * a missing input can never quietly flatter the total.
 */
export function scoreTradeReadiness(input: TradeReadinessInput): TradeReadinessResult {
  const weights = { ...DEFAULT_READINESS_WEIGHTS, ...(input.weights ?? {}) };
  const keys = Object.keys(DEFAULT_READINESS_WEIGHTS) as ReadinessItemKey[];
  const unavailable: ReadinessItemKey[] = [];

  const items: ReadinessItem[] = keys.map((key) => {
    const raw = input.scores[key];
    const score = typeof raw === 'number' ? Math.max(0, Math.min(1, raw)) : null;
    if (score === null) unavailable.push(key);
    return {
      key,
      label: READINESS_LABELS[key],
      weight: weights[key],
      score,
      points: score === null ? 0 : Math.round(score * weights[key] * 10) / 10,
      detail: input.details?.[key] ?? (score === null ? 'Not available yet.' : ''),
    };
  });

  const total = Math.round(items.reduce((s, i) => s + i.points, 0));
  const hardGates = input.hardGates ?? [];
  const band = hardGates.length ? 'NOT_READY' : bandFor(total);
  const qualifies = !hardGates.length && total >= 80;

  const headline = hardGates.length
    ? `NOT READY — the score is ${total}, but a hard rule is broken: ${hardGates[0]}`
    : band === 'READY'
      ? `READY at ${total}. Every check passed, which means the trade meets your rules — not that it will make money.`
      : band === 'QUALIFIED'
        ? `QUALIFIED at ${total}. The trade meets your rules with something worth noting.`
        : band === 'WAIT'
          ? `WAIT at ${total}. Not broken, but not ready. Waiting costs nothing here.`
          : band === 'REVIEW'
            ? `REVIEW at ${total}. Several checks are weak. Work out which one before risking money.`
            : `NOT READY at ${total}. This does not meet your rules.`;

  return { score: total, band, bandLabel: READINESS_BAND_LABEL[band], items, hardGates, qualifies, headline, unavailable };
}

/** Event risk is displayed separately from the score and can only ever gate it. */
export const EVENT_SEPARATION_TEXT =
  'Event risk is shown on its own and is never averaged into the readiness score. A high readiness score cannot outvote a severe event.';
