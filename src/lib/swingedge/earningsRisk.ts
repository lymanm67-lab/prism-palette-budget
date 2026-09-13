// SwingEdge — Earnings risk.
//
// An earnings date alone is not enough. "October 28, CONFIRMED, after market
// close" is materially different from a report due before the next open, and an
// UNKNOWN date is different again — it is a gap in the data, never a clear sky.

import { daysUntil, SESSION_EXPLANATION, SESSION_LABEL, type MarketSession } from './eventCalendar';

export type EarningsCertainty = 'CONFIRMED' | 'ESTIMATED' | 'UNKNOWN';

export type EarningsTiming = 'BEFORE_MARKET_OPEN' | 'AFTER_MARKET_CLOSE' | 'TIME_UNKNOWN';

export const TIMING_LABEL: Record<EarningsTiming, string> = {
  BEFORE_MARKET_OPEN: 'Before market open',
  AFTER_MARKET_CLOSE: 'After market close',
  TIME_UNKNOWN: 'Time unknown',
};

export const TIMING_SESSION: Record<EarningsTiming, MarketSession> = {
  BEFORE_MARKET_OPEN: 'BEFORE_OPEN',
  AFTER_MARKET_CLOSE: 'AFTER_CLOSE',
  TIME_UNKNOWN: 'UNKNOWN',
};

export interface EarningsRecord {
  symbol: string;
  date: string | null;
  certainty: EarningsCertainty;
  timing: EarningsTiming;
  source?: string | null;
  fetchedAt?: string | null;
}

export type EarningsWindow = 'VERY_HIGH' | 'HIGH' | 'MODERATE' | 'LOWER' | 'NONE' | 'UNKNOWN';

export const WINDOW_LABEL: Record<EarningsWindow, string> = {
  VERY_HIGH: 'VERY HIGH',
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOWER: 'LOWER',
  NONE: 'None in the holding window',
  UNKNOWN: 'UNKNOWN',
};

export interface EarningsWindowConfig {
  veryHighMaxDays: number;
  highMaxDays: number;
  moderateMaxDays: number;
}

export const DEFAULT_EARNINGS_WINDOWS: EarningsWindowConfig = {
  veryHighMaxDays: 2,
  highMaxDays: 5,
  moderateMaxDays: 10,
};

export interface EarningsAssessment {
  available: boolean;
  date: string | null;
  certainty: EarningsCertainty;
  timing: EarningsTiming;
  timingLabel: string;
  sessionNote: string;
  daysUntil: number | null;
  window: EarningsWindow;
  /** True when earnings fall inside the planned holding period. */
  insideHoldingWindow: boolean;
  /** Beginner Mode must not qualify this trade without an explicit opt-in. */
  blocksBeginnerGo: boolean;
  requiresManualVerification: boolean;
  /** Post-report stabilisation: levels taken before the report are stale. */
  postEarningsRevalidationRequired: boolean;
  lines: string[];
}

export function assessEarnings(input: {
  record: EarningsRecord | null;
  holdingDays: number;
  windows?: EarningsWindowConfig;
  now?: Date;
  /** Days after a report during which prior levels are treated as stale. */
  stabilisationDays?: number;
}): EarningsAssessment {
  const w = input.windows ?? DEFAULT_EARNINGS_WINDOWS;
  const stabilisation = input.stabilisationDays ?? 2;
  const rec = input.record;

  if (!rec || !rec.date || rec.certainty === 'UNKNOWN') {
    return {
      available: false,
      date: rec?.date ?? null,
      certainty: 'UNKNOWN',
      timing: 'TIME_UNKNOWN',
      timingLabel: TIMING_LABEL.TIME_UNKNOWN,
      sessionNote: SESSION_EXPLANATION.UNKNOWN,
      daysUntil: null,
      window: 'UNKNOWN',
      insideHoldingWindow: false,
      blocksBeginnerGo: true,
      requiresManualVerification: true,
      postEarningsRevalidationRequired: false,
      lines: [
        'The earnings date for this symbol is not known.',
        'An unknown earnings date is missing information, not good news. Verify it manually before holding this across several days.',
      ],
    };
  }

  const d = daysUntil(rec.date, input.now ?? new Date());
  const session = TIMING_SESSION[rec.timing];
  const insideHoldingWindow = d !== null && d >= 0 && d <= input.holdingDays;

  let window: EarningsWindow = 'NONE';
  if (d !== null && d >= 0) {
    if (d <= w.veryHighMaxDays) window = 'VERY_HIGH';
    else if (d <= w.highMaxDays) window = 'HIGH';
    else if (d <= w.moderateMaxDays) window = 'MODERATE';
    else window = 'LOWER';
  }

  const postEarningsRevalidationRequired = d !== null && d < 0 && d >= -stabilisation;

  const lines: string[] = [
    `Earnings: ${rec.date}`,
    `Status: ${rec.certainty}`,
    `Timing: ${TIMING_LABEL[rec.timing]}`,
    d === null ? 'Days until: unknown' : d >= 0 ? `Days until: ${d}` : `Reported ${Math.abs(d)} day(s) ago`,
    SESSION_EXPLANATION[session],
  ];
  if (insideHoldingWindow) {
    lines.push('This report lands inside your planned holding period, so a gap can jump straight past your stop.');
  }
  if (rec.certainty === 'ESTIMATED') {
    lines.push('This date is an estimate, so it can move. Confirm it before relying on the timing.');
  }
  if (postEarningsRevalidationRequired) {
    lines.push('This symbol has just reported. Trend, levels, entry, stop, target and bias all need revalidating.');
  }

  return {
    available: true,
    date: rec.date,
    certainty: rec.certainty,
    timing: rec.timing,
    timingLabel: TIMING_LABEL[rec.timing],
    sessionNote: SESSION_EXPLANATION[session],
    daysUntil: d,
    window,
    insideHoldingWindow,
    blocksBeginnerGo: insideHoldingWindow || window === 'VERY_HIGH' || window === 'HIGH',
    requiresManualVerification: false,
    postEarningsRevalidationRequired,
    lines,
  };
}

export const GAP_ACKNOWLEDGEMENT_TEXT =
  'I understand a gap through my stop is possible when a report lands inside my holding period, and that my real loss can be larger than my planned loss.';

export function sessionLabel(session: MarketSession): string {
  return SESSION_LABEL[session];
}
