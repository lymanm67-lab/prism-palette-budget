// SwingEdge — Market Regime Engine.
//
// Describes what the market IS doing, using transparent technical inputs only.
// It never predicts. Every input is reported so the reader can disagree.
// The regime feeds the existing Technical Score; it is not a new Hybrid category.

import { atr, ema, last, sma } from './indicators';
import type { Candle } from './types';

export type MarketRegime =
  | 'STRONG_BULL'
  | 'BULL'
  | 'NEUTRAL'
  | 'CAUTIOUS'
  | 'BEAR'
  | 'HIGH_VOLATILITY'
  | 'TRANSITION';

export const REGIME_LABEL: Record<MarketRegime, string> = {
  STRONG_BULL: 'Strong bull',
  BULL: 'Bull',
  NEUTRAL: 'Neutral',
  CAUTIOUS: 'Cautious',
  BEAR: 'Bear',
  HIGH_VOLATILITY: 'High volatility',
  TRANSITION: 'Transition',
};

export const REGIME_MEANING: Record<MarketRegime, string> = {
  STRONG_BULL: 'Broad indexes are above their moving averages and those averages are rising.',
  BULL: 'Most of the market is holding above its moving averages.',
  NEUTRAL: 'Mixed readings. No clear direction either way.',
  CAUTIOUS: 'More indexes are below their averages than above. Trend trades face a headwind.',
  BEAR: 'Broad indexes are below their averages and those averages are falling.',
  HIGH_VOLATILITY: 'Daily ranges have expanded well beyond normal, so stops get hit more easily.',
  TRANSITION: 'Readings disagree with each other — the market is changing character.',
};

export interface RegimeInputRow {
  label: string;
  passed: boolean;
  detail: string;
}

export interface RegimeIndex {
  symbol: string;
  candles: Candle[];
}

export interface MarketRegimeResult {
  regime: MarketRegime;
  /** Share of bullish checks passed, 0-100. */
  score: number;
  /** Average current range divided by average range over the longer window. */
  volatilityExpansion: number | null;
  /** Share of indexes above their 50 SMA, 0-100. Breadth proxy. */
  breadthPct: number | null;
  inputs: RegimeInputRow[];
  summary: string;
  /** True when there was not enough history for a confident reading. */
  insufficientData: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Recent average true range against the longer-run average, as a ratio. */
export function volatilityExpansion(candles: Candle[], shortN = 10, longN = 50): number | null {
  const shortAtr = last(atr(candles, shortN));
  const longAtr = last(atr(candles, longN));
  if (shortAtr === null || longAtr === null || longAtr <= 0) return null;
  return round2(shortAtr / longAtr);
}

/**
 * Regime from index candles. Checks per index: price above 20 EMA, price above
 * 50 SMA, 20 EMA above 50 SMA, and 50 SMA rising.
 */
export function classifyRegime(indexes: RegimeIndex[]): MarketRegimeResult {
  const inputs: RegimeInputRow[] = [];
  let passed = 0;
  let total = 0;
  let aboveSma50 = 0;
  let counted = 0;
  const expansions: number[] = [];

  for (const idx of indexes) {
    const closes = idx.candles.map((c) => c.close);
    if (closes.length < 51) {
      inputs.push({
        label: `${idx.symbol} readings`,
        passed: false,
        detail: 'Not enough history for this index yet.',
      });
      continue;
    }
    const price = closes[closes.length - 1];
    const e20 = last(ema(closes, 20));
    const s50series = sma(closes, 50);
    const s50 = last(s50series);
    const s50Prev = s50series.length > 5 ? s50series[s50series.length - 6] : null;

    const checks: RegimeInputRow[] = [
      {
        label: `${idx.symbol} above its 20 EMA`,
        passed: e20 !== null && price > e20,
        detail: e20 === null ? 'No 20 EMA yet' : `${round2(price)} vs ${round2(e20)}`,
      },
      {
        label: `${idx.symbol} above its 50 SMA`,
        passed: s50 !== null && price > s50,
        detail: s50 === null ? 'No 50 SMA yet' : `${round2(price)} vs ${round2(s50)}`,
      },
      {
        label: `${idx.symbol} 20 EMA above 50 SMA`,
        passed: e20 !== null && s50 !== null && e20 > s50,
        detail:
          e20 === null || s50 === null
            ? 'Not enough history'
            : `${round2(e20)} vs ${round2(s50)}`,
      },
      {
        label: `${idx.symbol} 50 SMA rising`,
        passed: s50 !== null && s50Prev !== null && s50 > s50Prev,
        detail:
          s50 === null || s50Prev === null
            ? 'Not enough history'
            : `${round2(s50)} now vs ${round2(s50Prev)} a week ago`,
      },
    ];
    inputs.push(...checks);
    passed += checks.filter((c) => c.passed).length;
    total += checks.length;
    counted += 1;
    if (s50 !== null && price > s50) aboveSma50 += 1;

    const exp = volatilityExpansion(idx.candles);
    if (exp !== null) expansions.push(exp);
  }

  if (total === 0) {
    return {
      regime: 'NEUTRAL',
      score: 0,
      volatilityExpansion: null,
      breadthPct: null,
      inputs,
      summary: 'Not enough index history to describe the market yet.',
      insufficientData: true,
    };
  }

  const score = Math.round((passed / total) * 100);
  const expansion = expansions.length
    ? round2(expansions.reduce((s, v) => s + v, 0) / expansions.length)
    : null;
  const breadthPct = counted ? Math.round((aboveSma50 / counted) * 100) : null;

  // Disagreement across indexes points to a change of character.
  const bullishIndexes = breadthPct ?? 0;
  const mixed = bullishIndexes > 25 && bullishIndexes < 75 && score >= 35 && score <= 65;

  let regime: MarketRegime;
  if (expansion !== null && expansion >= 1.5) {
    regime = 'HIGH_VOLATILITY';
  } else if (mixed) {
    regime = 'TRANSITION';
  } else if (score >= 85) {
    regime = 'STRONG_BULL';
  } else if (score >= 65) {
    regime = 'BULL';
  } else if (score >= 45) {
    regime = 'NEUTRAL';
  } else if (score >= 25) {
    regime = 'CAUTIOUS';
  } else {
    regime = 'BEAR';
  }

  const summary =
    `${REGIME_LABEL[regime]} — ${passed} of ${total} bullish checks passed` +
    (breadthPct === null ? '' : `, ${breadthPct}% of indexes above their 50 SMA`) +
    (expansion === null ? '' : `, ranges at ${expansion}x their normal size`) +
    '.';

  return {
    regime,
    score,
    volatilityExpansion: expansion,
    breadthPct,
    inputs,
    summary,
    insufficientData: false,
  };
}

/** Points contributed to the market/sector alignment part of the Technical Score. */
export function regimeAlignmentBias(regime: MarketRegime): number {
  switch (regime) {
    case 'STRONG_BULL':
      return 1;
    case 'BULL':
      return 0.75;
    case 'NEUTRAL':
    case 'TRANSITION':
      return 0.5;
    case 'HIGH_VOLATILITY':
    case 'CAUTIOUS':
      return 0.25;
    case 'BEAR':
      return 0;
  }
}
