// SwingEdge — Tradability screen.
//
// Liquidity and spread reality. An actual spread is used when real bid/ask data
// exists; otherwise a clearly labelled SPREAD PROXY is estimated from volatility
// and price. A proxy is NEVER presented as a real quote.

import { atr, last } from './indicators';
import type { Candle } from './types';

export type TradabilityVerdict = 'TRADABLE' | 'THIN' | 'AVOID';
export type SpreadSource = 'ACTUAL' | 'PROXY' | 'UNAVAILABLE';

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export interface TradabilityConfig {
  /** Below this average share volume a name is thin. */
  minAvgVolume: number;
  /** Below this average dollar volume a name is thin. */
  minAvgDollarVolume: number;
  /** Names cheaper than this are avoided. */
  minPrice: number;
  /** Spread wider than this share of price is a problem. */
  maxSpreadPct: number;
  /** Lookback used for the volume averages. */
  lookback: number;
}

export const DEFAULT_TRADABILITY_CONFIG: TradabilityConfig = {
  minAvgVolume: 500_000,
  minAvgDollarVolume: 10_000_000,
  minPrice: 5,
  maxSpreadPct: 0.5,
  lookback: 20,
};

export interface SpreadReading {
  source: SpreadSource;
  /** Absolute spread in dollars. */
  spread: number | null;
  /** Spread as a percent of price. */
  spreadPct: number | null;
  label: string;
  note: string;
}

/**
 * Real bid/ask when available, otherwise an explicit proxy from daily range.
 * The label always says which one you are looking at.
 */
export function readSpread(
  price: number,
  bid?: number | null,
  ask?: number | null,
  candles?: Candle[],
): SpreadReading {
  if (bid && ask && ask > bid && bid > 0) {
    const spread = round4(ask - bid);
    return {
      source: 'ACTUAL',
      spread,
      spreadPct: price > 0 ? round4((spread / price) * 100) : null,
      label: 'Actual spread',
      note: `Live bid ${bid} and ask ${ask}.`,
    };
  }
  if (candles && candles.length >= 15 && price > 0) {
    const a = last(atr(candles, 14));
    if (a !== null && a > 0) {
      // Proxy only. Roughly 2% of a day's typical range, floored at a cent.
      const proxy = Math.max(0.01, round4(a * 0.02));
      return {
        source: 'PROXY',
        spread: proxy,
        spreadPct: round4((proxy / price) * 100),
        label: 'Spread proxy',
        note: 'Estimated from the recent daily range because no live bid and ask is available. This is not a real quote.',
      };
    }
  }
  return {
    source: 'UNAVAILABLE',
    spread: null,
    spreadPct: null,
    label: 'Spread unknown',
    note: 'No bid and ask, and not enough range history to estimate one.',
  };
}

export interface TradabilityResult {
  verdict: TradabilityVerdict;
  /** True when AVOID — a hard gate on the trade. */
  hardGate: boolean;
  price: number;
  avgVolume: number | null;
  avgDollarVolume: number | null;
  atrPct: number | null;
  spread: SpreadReading;
  dataQuality: 'GOOD' | 'PARTIAL' | 'POOR';
  reasons: string[];
  summary: string;
}

export interface TradabilityInput {
  symbol: string;
  candles: Candle[];
  price?: number | null;
  bid?: number | null;
  ask?: number | null;
  config?: Partial<TradabilityConfig>;
}

export function assessTradability(input: TradabilityInput): TradabilityResult {
  const config = { ...DEFAULT_TRADABILITY_CONFIG, ...(input.config ?? {}) };
  const candles = input.candles ?? [];
  const price = round2(
    input.price && input.price > 0
      ? input.price
      : candles.length
        ? candles[candles.length - 1].close
        : 0,
  );

  const window = candles.slice(-config.lookback);
  const volumes = window.map((c) => c.volume).filter((v) => v > 0);
  const avgVolume = volumes.length
    ? Math.round(volumes.reduce((s, v) => s + v, 0) / volumes.length)
    : null;
  const avgDollarVolume =
    avgVolume !== null && price > 0 ? Math.round(avgVolume * price) : null;

  const a = candles.length >= 15 ? last(atr(candles, 14)) : null;
  const atrPct = a !== null && price > 0 ? round2((a / price) * 100) : null;

  const spread = readSpread(price, input.bid, input.ask, candles);

  const reasons: string[] = [];
  let verdict: TradabilityVerdict = 'TRADABLE';
  const drop = (v: TradabilityVerdict) => {
    if (v === 'AVOID') verdict = 'AVOID';
    else if (verdict === 'TRADABLE') verdict = 'THIN';
  };

  if (!(price > 0)) {
    verdict = 'AVOID';
    reasons.push('No usable price.');
  } else if (price < config.minPrice) {
    drop('AVOID');
    reasons.push(`Price ${price} is below the $${config.minPrice} floor, where spreads bite hardest.`);
  }

  if (avgVolume === null) {
    drop('THIN');
    reasons.push('No volume history to judge liquidity.');
  } else if (avgVolume < config.minAvgVolume * 0.2) {
    drop('AVOID');
    reasons.push(
      `Average volume of ${avgVolume.toLocaleString()} shares is far below the ${config.minAvgVolume.toLocaleString()} you asked for.`,
    );
  } else if (avgVolume < config.minAvgVolume) {
    drop('THIN');
    reasons.push(
      `Average volume of ${avgVolume.toLocaleString()} shares is under your ${config.minAvgVolume.toLocaleString()} preference.`,
    );
  }

  if (avgDollarVolume !== null && avgDollarVolume < config.minAvgDollarVolume) {
    drop(avgDollarVolume < config.minAvgDollarVolume * 0.2 ? 'AVOID' : 'THIN');
    reasons.push(
      `Around $${Math.round(avgDollarVolume / 1000).toLocaleString()}k trades daily, under your $${Math.round(config.minAvgDollarVolume / 1_000_000)}M preference.`,
    );
  }

  if (spread.spreadPct !== null && spread.spreadPct > config.maxSpreadPct) {
    drop('THIN');
    reasons.push(
      `${spread.label} of ${spread.spreadPct}% of price is wider than your ${config.maxSpreadPct}% limit.`,
    );
  }

  if (atrPct !== null && atrPct > 12) {
    drop('THIN');
    reasons.push(`Daily range averages ${atrPct}% of price, which makes stops expensive.`);
  }

  const missing = [avgVolume === null, atrPct === null, spread.source === 'UNAVAILABLE'].filter(
    Boolean,
  ).length;
  const dataQuality = missing === 0 ? 'GOOD' : missing === 1 ? 'PARTIAL' : 'POOR';
  if (dataQuality === 'POOR') {
    drop('THIN');
    reasons.push('Too little data to judge tradability properly.');
  }

  if (!reasons.length) reasons.push('Liquidity, price and spread all sit inside your preferences.');

  return {
    verdict,
    hardGate: verdict === 'AVOID',
    price,
    avgVolume,
    avgDollarVolume,
    atrPct,
    spread,
    dataQuality,
    reasons,
    summary: summaryFor(verdict),

  };
}
