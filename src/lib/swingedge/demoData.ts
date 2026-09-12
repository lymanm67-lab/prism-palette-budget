// SwingEdge Analyzer — DEMO MODE data.
// Deterministic, clearly fictional candles so every screen is testable before a
// live market data key is connected. Never presented as real market data.

import type { Candle, Quote, SwingInterval } from './types';

const SEED_PRICES: Record<string, number> = {
  SPY: 548, QQQ: 468, DIA: 402, IWM: 214,
  XLF: 42, XLE: 88, XLK: 218, XLV: 148,
  AAPL: 224, MSFT: 418, AMZN: 182, GOOGL: 168, META: 512,
  NVDA: 118, AMD: 148, TSLA: 232, JPM: 212, BAC: 40,
  V: 272, UNH: 582, JNJ: 158, PG: 172, HD: 368, COST: 872, WMT: 76, DIS: 92,
};

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic pseudo-random generator so demo charts never change shape. */
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const MS: Record<SwingInterval, number> = {
  '1h': 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
};

export const DEMO_AS_OF = '2026-09-11T20:00:00.000Z';

/**
 * Builds a fictional but technically coherent series: a gentle uptrend with
 * pullbacks, so trend, momentum, breakout and pullback logic all exercise.
 */
export function demoCandles(symbol: string, interval: SwingInterval = '1day', count = 260): Candle[] {
  const base = SEED_PRICES[symbol.toUpperCase()] ?? 40 + (hash(symbol) % 260);
  const rand = rng(hash(`${symbol}|${interval}`));
  const step = MS[interval];
  const end = new Date(DEMO_AS_OF).getTime();

  // Walk backwards in price from a start point, then emit forward.
  let price = base * 0.72;
  const drift = Math.pow(base / price, 1 / count) - 1;
  const candles: Candle[] = [];

  for (let i = 0; i < count; i++) {
    const cycle = Math.sin((i / count) * Math.PI * 5) * 0.012;
    const noise = (rand() - 0.5) * 0.018;
    const change = drift + cycle * 0.6 + noise;
    const open = price;
    const close = Math.max(1, open * (1 + change));
    const wick = Math.abs(close - open) + open * (0.004 + rand() * 0.008);
    const high = Math.max(open, close) + wick * rand();
    const low = Math.min(open, close) - wick * rand();
    const volBase = 900_000 + (hash(symbol) % 40) * 120_000;
    const volume = Math.round(volBase * (0.7 + rand() * 0.9) * (1 + Math.abs(change) * 12));
    candles.push({
      datetime: new Date(end - (count - 1 - i) * step).toISOString(),
      open: round(open),
      high: round(high),
      low: round(low),
      close: round(close),
      volume,
    });
    price = close;
  }
  return candles;
}

const round = (n: number) => Math.round(n * 100) / 100;

export function demoQuote(symbol: string): Quote {
  const candles = demoCandles(symbol, '1day', 60);
  const latest = candles[candles.length - 1];
  const prev = candles[candles.length - 2] ?? latest;
  const change = round(latest.close - prev.close);
  return {
    symbol: symbol.toUpperCase(),
    price: latest.close,
    previousClose: prev.close,
    change,
    changePercent: round((change / prev.close) * 100),
    volume: latest.volume,
    asOf: DEMO_AS_OF,
  };
}

export const DEMO_UNIVERSE = Object.keys(SEED_PRICES);
