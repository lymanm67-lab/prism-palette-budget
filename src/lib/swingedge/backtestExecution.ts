// SwingEdge Hybrid Signal Engine — honest historical execution.
// A backtest that fills at perfect prices teaches the wrong lesson. Gaps fill at
// the open, costs come off every trade, and a candle that touches both stop and
// target is counted as the loss.

import type { Candle } from './types';

export interface ExecutionAssumptions {
  /** Slippage as a percent of price, applied against you on entry and exit. */
  slippagePct: number;
  commissionPerTrade: number;
  /** When a candle touches both levels, assume the stop hit first. */
  stopWinsAmbiguousCandle: boolean;
  /** Fill gaps at the open rather than at the level. */
  fillGapsAtOpen: boolean;
}

export const DEFAULT_EXECUTION: ExecutionAssumptions = {
  slippagePct: 0.05,
  commissionPerTrade: 0,
  stopWinsAmbiguousCandle: true,
  fillGapsAtOpen: true,
};

export type ExitKind = 'STOP' | 'TARGET' | 'OPEN';

export interface ExitFill {
  kind: ExitKind;
  price: number;
  gapped: boolean;
  note: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function entryFill(candle: Candle, plannedEntry: number, a: ExecutionAssumptions = DEFAULT_EXECUTION): number {
  const gapped = a.fillGapsAtOpen && candle.open > plannedEntry;
  const base = gapped ? candle.open : plannedEntry;
  return round2(base * (1 + a.slippagePct / 100));
}

/** Exit for one candle in a long trade. Null means the trade is still open. */
export function exitFill(
  candle: Candle,
  stop: number,
  target: number,
  a: ExecutionAssumptions = DEFAULT_EXECUTION,
): ExitFill | null {
  const gapDownThroughStop = a.fillGapsAtOpen && candle.open <= stop;
  const gapUpThroughTarget = a.fillGapsAtOpen && candle.open >= target;
  const hitStop = candle.low <= stop;
  const hitTarget = candle.high >= target;

  if (gapDownThroughStop) {
    return {
      kind: 'STOP',
      price: round2(candle.open * (1 - a.slippagePct / 100)),
      gapped: true,
      note: 'Price gapped below the stop, so the fill is at the open — worse than the stop level.',
    };
  }
  if (gapUpThroughTarget) {
    return { kind: 'TARGET', price: round2(candle.open), gapped: true, note: 'Price gapped above the target and filled at the open.' };
  }
  if (hitStop && hitTarget) {
    if (a.stopWinsAmbiguousCandle) {
      return {
        kind: 'STOP',
        price: round2(stop * (1 - a.slippagePct / 100)),
        gapped: false,
        note: 'This candle touched both the stop and the target. Without intraday data the loss is assumed.',
      };
    }
    return { kind: 'TARGET', price: round2(target), gapped: false, note: 'Both levels were touched in one candle.' };
  }
  if (hitStop) {
    return { kind: 'STOP', price: round2(stop * (1 - a.slippagePct / 100)), gapped: false, note: 'Stop was reached.' };
  }
  if (hitTarget) {
    return { kind: 'TARGET', price: round2(target), gapped: false, note: 'Target was reached.' };
  }
  return null;
}

export interface SimulatedTrade {
  entryDate: string;
  exitDate: string | null;
  entryPrice: number;
  exitPrice: number | null;
  shares: number;
  kind: ExitKind | null;
  netPl: number | null;
  rMultiple: number | null;
  notes: string[];
}

/** Walks candles forward from an entry and returns the completed trade. */
export function simulateTrade(
  candles: Candle[],
  plan: { entry: number; stop: number; target: number; shares: number },
  a: ExecutionAssumptions = DEFAULT_EXECUTION,
): SimulatedTrade | null {
  if (!candles.length || plan.shares < 1) return null;
  const first = candles[0];
  const filled = entryFill(first, plan.entry, a);
  const riskPerShare = filled - plan.stop;
  const notes: string[] = [];
  if (a.fillGapsAtOpen && first.open > plan.entry) notes.push('Entry gapped up, so the fill was worse than planned.');

  for (let i = 1; i < candles.length; i += 1) {
    const exit = exitFill(candles[i], plan.stop, plan.target, a);
    if (!exit) continue;
    const gross = (exit.price - filled) * plan.shares;
    const netPl = round2(gross - a.commissionPerTrade * 2);
    return {
      entryDate: first.datetime,
      exitDate: candles[i].datetime,
      entryPrice: filled,
      exitPrice: exit.price,
      shares: plan.shares,
      kind: exit.kind,
      netPl,
      rMultiple: riskPerShare > 0 ? Math.round((netPl / (riskPerShare * plan.shares)) * 100) / 100 : null,
      notes: [...notes, exit.note],
    };
  }

  const lastClose = candles[candles.length - 1].close;
  const gross = (lastClose - filled) * plan.shares;
  return {
    entryDate: first.datetime,
    exitDate: null,
    entryPrice: filled,
    exitPrice: round2(lastClose),
    shares: plan.shares,
    kind: 'OPEN',
    netPl: round2(gross - a.commissionPerTrade),
    rMultiple: riskPerShare > 0 ? Math.round((gross / (riskPerShare * plan.shares)) * 100) / 100 : null,
    notes: [...notes, 'The trade was still open at the end of the tested period.'],
  };
}

export const SURVIVORSHIP_WARNING =
  'Historical tests only include symbols that still exist and only the figures known today. Companies that failed are missing, and reported numbers are as they stand now rather than as they were at the time. Treat every result as an illustration of your rules, not a forecast.';

export const POINT_IN_TIME_WARNING =
  'Fundamental figures are only used in a historical test when the reporting date is on or before the tested day. Where no dated figure exists, the fundamental layer is skipped and the test says so.';

/** Guard for point-in-time fundamentals in a historical test. */
export function fundamentalsUsableAt(reportDate: string | null, testDate: string): boolean {
  if (!reportDate) return false;
  return new Date(reportDate).getTime() <= new Date(testDate).getTime();
}
