// SwingEdge Analyzer — transparent market condition rules.
// Describes what conditions ARE, never what the market WILL do.

import { ema, last, relativeVolume, sma, trendState, volumeCondition } from './indicators';
import type { Candle, MarketCondition, TrendState } from './types';

export const INDEX_SYMBOLS = ['SPY', 'QQQ', 'DIA', 'IWM'] as const;

export interface IndexReading {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  ema20: number | null;
  sma50: number | null;
  trend: TrendState;
  volume: string;
  aboveEma20: boolean;
  aboveSma50: boolean;
  emaAboveSma: boolean;
  asOf: string;
}

export function readIndex(symbol: string, candles: Candle[], asOf: string): IndexReading | null {
  if (candles.length < 51) return null;
  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const prev = closes[closes.length - 2];
  const e20 = last(ema(closes, 20));
  const s50 = last(sma(closes, 50));
  const change = Math.round((price - prev) * 100) / 100;
  return {
    symbol: symbol.toUpperCase(),
    price,
    change,
    changePercent: Math.round((change / prev) * 10000) / 100,
    ema20: e20 === null ? null : Math.round(e20 * 100) / 100,
    sma50: s50 === null ? null : Math.round(s50 * 100) / 100,
    trend: trendState(candles),
    volume: volumeCondition(relativeVolume(candles)),
    aboveEma20: e20 !== null && price > e20,
    aboveSma50: s50 !== null && price > s50,
    emaAboveSma: e20 !== null && s50 !== null && e20 > s50,
    asOf,
  };
}

export interface MarketConditionResult {
  condition: MarketCondition;
  score: number; // 0-100 share of bullish checks passed
  checks: { label: string; passed: boolean; detail: string }[];
  summary: string;
}

/**
 * Three checks per index: price above 20 EMA, price above 50 SMA, 20 EMA above
 * 50 SMA. Two thirds or more passing is bullish; under one third is cautious.
 */
export function classifyMarket(readings: IndexReading[]): MarketConditionResult {
  const checks: MarketConditionResult['checks'] = [];
  readings.forEach((r) => {
    checks.push({
      label: `${r.symbol} above its 20 EMA`,
      passed: r.aboveEma20,
      detail: r.ema20 === null ? 'Not enough history' : `Price ${r.price} vs 20 EMA ${r.ema20}`,
    });
    checks.push({
      label: `${r.symbol} above its 50 SMA`,
      passed: r.aboveSma50,
      detail: r.sma50 === null ? 'Not enough history' : `Price ${r.price} vs 50 SMA ${r.sma50}`,
    });
    checks.push({
      label: `${r.symbol} 20 EMA above 50 SMA`,
      passed: r.emaAboveSma,
      detail:
        r.ema20 === null || r.sma50 === null
          ? 'Not enough history'
          : `20 EMA ${r.ema20} vs 50 SMA ${r.sma50}`,
    });
  });

  if (!checks.length) {
    return {
      condition: 'NEUTRAL',
      score: 0,
      checks,
      summary: 'No index data available, so no condition can be described.',
    };
  }

  const passed = checks.filter((c) => c.passed).length;
  const score = Math.round((passed / checks.length) * 100);
  const condition: MarketCondition = score >= 67 ? 'BULLISH' : score <= 33 ? 'CAUTIOUS' : 'NEUTRAL';

  const summary =
    condition === 'BULLISH'
      ? `Current technical conditions are bullish: ${passed} of ${checks.length} trend checks pass across the four major indexes.`
      : condition === 'CAUTIOUS'
        ? `Current technical conditions are cautious: only ${passed} of ${checks.length} trend checks pass across the four major indexes.`
        : `Current technical conditions are mixed: ${passed} of ${checks.length} trend checks pass across the four major indexes.`;

  return { condition, score, checks, summary };
}
