// SwingEdge — Corporate actions.
//
// A 4-for-1 split looks exactly like a 75% crash in raw price data. Left
// unhandled, it produces fake breakdowns, fake gaps and fake stop hits in both
// charts and backtests.
//
// Twelve Data returns split-adjusted history on the time series endpoint, so in
// normal use the history is already clean. This module exists for two jobs:
//   1. Detect price discontinuities that look like unadjusted corporate actions
//      so they can be disclosed rather than silently traded on.
//   2. Apply adjustments when a ratio is known.
//
// Where adjusted data is unavailable, the limitation is stated. Nothing is
// quietly patched over.

import type { Candle } from './types';

export type CorporateActionKind =
  | 'SPLIT'
  | 'REVERSE_SPLIT'
  | 'DIVIDEND'
  | 'TICKER_CHANGE'
  | 'MERGER'
  | 'SPIN_OFF'
  | 'DELISTING';

export const ACTION_LABEL: Record<CorporateActionKind, string> = {
  SPLIT: 'Stock split',
  REVERSE_SPLIT: 'Reverse split',
  DIVIDEND: 'Dividend',
  TICKER_CHANGE: 'Ticker change',
  MERGER: 'Merger',
  SPIN_OFF: 'Spin-off',
  DELISTING: 'Delisting',
};

export interface CorporateAction {
  kind: CorporateActionKind;
  date: string;
  /** For splits: shares after per share before. 4 means 4-for-1. */
  ratio?: number;
  amount?: number;
  note?: string;
}

export interface DiscontinuityFinding {
  date: string;
  previousClose: number;
  open: number;
  changePct: number;
  /** Nearest simple ratio, when the move looks like a split. */
  impliedRatio: number | null
  likely: CorporateActionKind | 'UNKNOWN';
  note: string;
}

export interface AdjustmentReport {
  candles: Candle[];
  adjusted: boolean;
  findings: DiscontinuityFinding[];
  /** Shown on charts and in backtest results when history may be unadjusted. */
  disclosure: string | null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Common split ratios, checked in both directions. */
const RATIOS = [2, 3, 4, 5, 6, 7, 8, 10, 20];

function nearestRatio(factor: number): number | null {
  for (const r of RATIOS) {
    if (Math.abs(factor - r) / r < 0.06) return r;
    if (Math.abs(factor - 1 / r) / (1 / r) < 0.06) return round2(1 / r);
  }
  return null;
}

/**
 * Looks for overnight price jumps too large to be ordinary trading. A 45%+ move
 * that lands near a clean split ratio is almost certainly an unadjusted
 * corporate action rather than a real collapse or spike.
 */
export function findDiscontinuities(candles: Candle[], thresholdPct = 35): DiscontinuityFinding[] {
  const out: DiscontinuityFinding[] = [];
  for (let i = 1; i < candles.length; i += 1) {
    const prev = candles[i - 1];
    const cur = candles[i];
    if (prev.close <= 0) continue;
    const changePct = ((cur.open - prev.close) / prev.close) * 100;
    if (Math.abs(changePct) < thresholdPct) continue;

    const factor = prev.close / cur.open;
    const ratio = nearestRatio(factor);
    const likely: DiscontinuityFinding['likely'] =
      ratio === null ? 'UNKNOWN' : ratio > 1 ? 'SPLIT' : 'REVERSE_SPLIT';

    out.push({
      date: cur.datetime,
      previousClose: round2(prev.close),
      open: round2(cur.open),
      changePct: round2(changePct),
      impliedRatio: ratio,
      likely,
      note:
        likely === 'SPLIT'
          ? `Price fell about ${Math.abs(round2(changePct))}% overnight, close to a ${ratio}-for-1 split. Treat this as a share count change, not a loss.`
          : likely === 'REVERSE_SPLIT'
            ? `Price rose sharply overnight, consistent with a reverse split. Treat this as a share count change, not a gain.`
            : `Price moved ${round2(changePct)}% overnight. Large enough to distort any signal that reads it as normal trading.`,
    });
  }
  return out;
}

/**
 * Applies a known split ratio to every candle before the effective date, so the
 * series is continuous. Volume moves the other way.
 */
export function applySplit(candles: Candle[], effectiveDate: string, ratio: number): Candle[] {
  if (!ratio || ratio <= 0 || ratio === 1) return candles;
  return candles.map((c) => {
    if (c.datetime >= effectiveDate) return c;
    return {
      ...c,
      open: round2(c.open / ratio),
      high: round2(c.high / ratio),
      low: round2(c.low / ratio),
      close: round2(c.close / ratio),
      volume: Math.round(c.volume * ratio),
    };
  });
}

/**
 * Prepares a series for analysis.
 *
 * When `providerAdjusted` is true (the normal case with Twelve Data time series)
 * the candles are returned untouched and any remaining discontinuity is reported
 * as information. When it is false, known actions are applied and anything still
 * unexplained produces a disclosure rather than a silent fix.
 */
export function prepareHistory(input: {
  candles: Candle[];
  providerAdjusted: boolean;
  knownActions?: CorporateAction[];
}): AdjustmentReport {
  let candles = input.candles;
  let adjusted = false;

  if (!input.providerAdjusted) {
    for (const action of input.knownActions ?? []) {
      if ((action.kind === 'SPLIT' || action.kind === 'REVERSE_SPLIT') && action.ratio) {
        candles = applySplit(candles, action.date, action.ratio);
        adjusted = true;
      }
    }
  }

  const findings = findDiscontinuities(candles);
  const unexplained = findings.filter((f) => f.likely !== 'UNKNOWN');

  let disclosure: string | null = null;
  if (!input.providerAdjusted && unexplained.length > 0) {
    disclosure =
      'This price history may not be adjusted for a split. Signals and backtest results across that date are unreliable.';
  } else if (unexplained.length > 0) {
    disclosure = `Price history contains ${unexplained.length} jump${unexplained.length === 1 ? '' : 's'} consistent with a corporate action. Readings that span those dates deserve a second look.`;
  }

  return { candles, adjusted, findings, disclosure };
}
