// SwingEdge — Relative Strength Engine.
//
// Stocks: symbol vs sector, symbol vs SPY, sector vs SPY.
// ETFs: fund vs its appropriate benchmark.
// Feeds the existing Technical Score. Not a new Hybrid category, and never a
// prediction — it only reports who has been stronger over the window.

import type { Candle } from './types';

export type RelativeStrengthClass =
  | 'LEADING'
  | 'OUTPERFORMING'
  | 'NEUTRAL'
  | 'UNDERPERFORMING'
  | 'LAGGING';

export const RS_LABEL: Record<RelativeStrengthClass, string> = {
  LEADING: 'Leading',
  OUTPERFORMING: 'Outperforming',
  NEUTRAL: 'In line',
  UNDERPERFORMING: 'Underperforming',
  LAGGING: 'Lagging',
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Percent change across the last n candles. */
export function periodReturnPct(candles: Candle[], lookback: number): number | null {
  if (candles.length < lookback + 1) return null;
  const closes = candles.map((c) => c.close);
  const start = closes[closes.length - 1 - lookback];
  const end = closes[closes.length - 1];
  if (!(start > 0)) return null;
  return round2((end / start - 1) * 100);
}

/** Difference in percent between the symbol and its comparison. */
export function classifyRelative(spreadPct: number): RelativeStrengthClass {
  if (spreadPct >= 5) return 'LEADING';
  if (spreadPct >= 1.5) return 'OUTPERFORMING';
  if (spreadPct > -1.5) return 'NEUTRAL';
  if (spreadPct > -5) return 'UNDERPERFORMING';
  return 'LAGGING';
}

export interface RsComparison {
  label: string;
  symbolReturnPct: number | null;
  benchmarkReturnPct: number | null;
  spreadPct: number | null;
  classification: RelativeStrengthClass | null;
  detail: string;
}

export interface RelativeStrengthResult {
  assetType: 'STOCK' | 'ETF';
  lookback: number;
  /** Overall reading, taken from symbol vs the broad market where available. */
  overall: RelativeStrengthClass | null;
  comparisons: RsComparison[];
  /** 0-1 bias used inside the Technical Score alignment component. */
  bias: number;
  summary: string;
  insufficientData: boolean;
}

function compare(
  label: string,
  symbolCandles: Candle[] | null | undefined,
  benchCandles: Candle[] | null | undefined,
  lookback: number,
  missingText: string,
): RsComparison {
  const a = symbolCandles ? periodReturnPct(symbolCandles, lookback) : null;
  const b = benchCandles ? periodReturnPct(benchCandles, lookback) : null;
  if (a === null || b === null) {
    return {
      label,
      symbolReturnPct: a,
      benchmarkReturnPct: b,
      spreadPct: null,
      classification: null,
      detail: missingText,
    };
  }
  const spread = round2(a - b);
  return {
    label,
    symbolReturnPct: a,
    benchmarkReturnPct: b,
    spreadPct: spread,
    classification: classifyRelative(spread),
    detail: `${a > 0 ? '+' : ''}${a}% against ${b > 0 ? '+' : ''}${b}% over ${lookback} days.`,
  };
}

export const RS_BIAS: Record<RelativeStrengthClass, number> = {
  LEADING: 1,
  OUTPERFORMING: 0.75,
  NEUTRAL: 0.5,
  UNDERPERFORMING: 0.25,
  LAGGING: 0,
};

export interface RelativeStrengthInput {
  symbol: string;
  assetType: 'STOCK' | 'ETF';
  candles: Candle[];
  /** Sector benchmark candles, for a stock. */
  sectorCandles?: Candle[] | null;
  sectorSymbol?: string | null;
  /** Broad market candles, normally SPY. For an ETF this is its benchmark. */
  benchmarkCandles?: Candle[] | null;
  benchmarkSymbol?: string | null;
  /** Trading days compared. Default 60. */
  lookback?: number;
}

export function assessRelativeStrength(input: RelativeStrengthInput): RelativeStrengthResult {
  const lookback = input.lookback ?? 60;
  const benchName = input.benchmarkSymbol ?? 'SPY';
  const comparisons: RsComparison[] = [];

  if (input.assetType === 'ETF') {
    comparisons.push(
      compare(
        `${input.symbol.toUpperCase()} against ${benchName}`,
        input.candles,
        input.benchmarkCandles,
        lookback,
        `No ${benchName} history available to compare against.`,
      ),
    );
  } else {
    const sectorName = input.sectorSymbol ?? 'its sector';
    comparisons.push(
      compare(
        `${input.symbol.toUpperCase()} against ${sectorName}`,
        input.candles,
        input.sectorCandles,
        lookback,
        'No sector benchmark history available.',
      ),
      compare(
        `${input.symbol.toUpperCase()} against ${benchName}`,
        input.candles,
        input.benchmarkCandles,
        lookback,
        `No ${benchName} history available to compare against.`,
      ),
      compare(
        `${sectorName} against ${benchName}`,
        input.sectorCandles,
        input.benchmarkCandles,
        lookback,
        'Sector or market history missing.',
      ),
    );
  }

  // Overall reading: prefer symbol vs the broad market.
  const vsMarket = comparisons.find((c) => c.label.includes(`against ${benchName}`) && c.classification);
  const usable = comparisons.filter((c) => c.classification);
  const overall = vsMarket?.classification ?? usable[0]?.classification ?? null;
  const bias = overall ? RS_BIAS[overall] : 0.5;

  const summary = overall
    ? `${RS_LABEL[overall]} over the last ${lookback} trading days. ${usable.map((c) => `${c.label}: ${c.spreadPct! > 0 ? '+' : ''}${c.spreadPct}%`).join('. ')}.`
    : 'Not enough history to compare this name against a benchmark yet.';

  return {
    assetType: input.assetType,
    lookback,
    overall,
    comparisons,
    bias,
    summary,
    insufficientData: usable.length === 0,
  };
}
