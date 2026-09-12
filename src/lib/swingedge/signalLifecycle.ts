// SwingEdge Hybrid Signal Engine — signal freshness and revalidation.
// A signal is a photograph of one moment. It expires with the next completed
// candle, it dies when price leaves the entry zone, and it must be recalculated
// immediately before a trade is recorded.

import type { Candle } from './types';

export interface EntryZone {
  low: number;
  high: number;
}

/** Entry zone from a planned entry: a small band, not a single price. */
export function entryZone(entry: number, atrValue: number | null): EntryZone {
  const pad = atrValue && atrValue > 0 ? atrValue * 0.25 : entry * 0.005;
  return { low: Math.round((entry - pad) * 100) / 100, high: Math.round((entry + pad) * 100) / 100 };
}

export function priceOutsideZone(price: number, zone: EntryZone): boolean {
  return price < zone.low || price > zone.high;
}

/**
 * Valid until the next daily close after the last completed candle. Intraday
 * intervals expire much sooner because the picture changes within the session.
 */
export function validUntil(lastCompletedCandle: string | null, interval: string, now = new Date()): string {
  const base = lastCompletedCandle ? new Date(lastCompletedCandle) : now;
  const hours = interval === '1day' ? 24 : interval === '4h' ? 4 : 1;
  const candidate = new Date(base.getTime() + hours * 60 * 60 * 1000);
  // Never report a valid-until that is already behind us.
  return (candidate.getTime() > now.getTime() ? candidate : new Date(now.getTime() + 60 * 60 * 1000)).toISOString();
}

export function isExpired(validUntilIso: string | null, now = new Date()): boolean {
  if (!validUntilIso) return true;
  return new Date(validUntilIso).getTime() <= now.getTime();
}

export interface CandleBasis {
  /** Candles with the still-forming one removed. */
  completed: Candle[];
  /** True when the newest candle belongs to the session in progress. */
  developing: boolean;
  lastCompletedAt: string | null;
  developingCandle: Candle | null;
}

/**
 * Splits confirmed history from the candle still being written. Confirmed reads
 * drive signals; the forming candle is only ever an intraday preview.
 */
export function candleBasis(candles: Candle[], interval: string, now = new Date()): CandleBasis {
  if (!candles.length) return { completed: [], developing: false, lastCompletedAt: null, developingCandle: null };
  const newest = candles[candles.length - 1];
  const newestTime = new Date(newest.datetime).getTime();
  const windowMs = interval === '1day' ? 24 * 60 * 60 * 1000 : interval === '4h' ? 4 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const developing = now.getTime() - newestTime < windowMs;
  const completed = developing ? candles.slice(0, -1) : candles;
  return {
    completed,
    developing,
    lastCompletedAt: completed.length ? completed[completed.length - 1].datetime : null,
    developingCandle: developing ? newest : null,
  };
}

export interface RevalidationInput {
  price: number;
  entry: number;
  stop: number;
  target: number;
  zone: EntryZone;
  shares: number;
  rewardRisk: number | null;
  minimumRewardRisk: number;
  accountRiskPct: number | null;
  maxAccountRiskPct: number;
  portfolioRiskPctAfter: number | null;
  maxPortfolioRiskPct: number;
  signal: string;
  validUntil: string | null;
}

export interface RevalidationResult {
  ok: boolean;
  failures: string[];
  checkedAt: string;
}

/**
 * Mandatory check immediately before a paper trade is written. Nothing is
 * accepted from a stale screen.
 */
export function revalidateBeforeEntry(input: RevalidationInput, now = new Date()): RevalidationResult {
  const failures: string[] = [];
  if (isExpired(input.validUntil, now)) failures.push('The signal is out of date. Recalculate it before entering.');
  if (priceOutsideZone(input.price, input.zone)) {
    failures.push(`Price ${input.price} is outside the entry zone ${input.zone.low}–${input.zone.high}.`);
  }
  if (!(input.stop < input.entry)) failures.push('The stop must sit below the entry for a long trade.');
  if (!(input.target > input.entry)) failures.push('The target must sit above the entry for a long trade.');
  if (input.shares < 1) failures.push('Position size works out below one share.');
  if (input.rewardRisk === null || input.rewardRisk < input.minimumRewardRisk) {
    failures.push(`Reward to risk is below the ${input.minimumRewardRisk} minimum.`);
  }
  if (input.accountRiskPct === null || input.accountRiskPct > input.maxAccountRiskPct) {
    failures.push(`Account risk is above the ${input.maxAccountRiskPct}% limit.`);
  }
  if (input.portfolioRiskPctAfter !== null && input.portfolioRiskPctAfter > input.maxPortfolioRiskPct) {
    failures.push(`Total open risk would exceed the ${input.maxPortfolioRiskPct}% ceiling.`);
  }
  if (input.signal === 'STOP') failures.push('The current signal is STOP.');
  return { ok: failures.length === 0, failures, checkedAt: now.toISOString() };
}

export const DEVELOPING_LABEL = 'DEVELOPING — INTRADAY PREVIEW';
export const DEVELOPING_TEXT =
  "Today's candle is still being written. Confirmed signals only use completed candles, so this reading can change by the close.";
