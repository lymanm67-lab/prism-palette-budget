// SwingEdge — Walk-forward validation for historical bias rules.
//
// Building thresholds on a stretch of history and then testing them on the same
// stretch proves nothing. This splits history into a training period and a later
// unseen validation period, reports both, and says POSSIBLE OVERFITTING when the
// out-of-sample result collapses.

import { findHistoricalMatches, type MatchConditions, type MatchResult } from './historicalMatch';
import type { Candle } from './types';

export interface WalkForwardWindow {
  label: string;
  fromDate: string | null;
  toDate: string | null;
  rawMatches: number;
  independentEpisodes: number;
  upPct: number | null;
  medianReturnPct: number | null;
}

export type WalkForwardVerdict = 'INSUFFICIENT_DATA' | 'HELD_UP' | 'WEAKER_OUT_OF_SAMPLE' | 'POSSIBLE_OVERFITTING';

export interface WalkForwardResult {
  inSample: WalkForwardWindow;
  outOfSample: WalkForwardWindow;
  verdict: WalkForwardVerdict;
  message: string;
  /** Out-of-sample up% minus in-sample up%, in percentage points. */
  differencePct: number | null;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function summarise(candles: Candle[], result: MatchResult, period: number, label: string, from: number, to: number): WalkForwardWindow {
  const rows = result.independent.map((m) => m.outcomes[period]).filter(Boolean);
  const ups = rows.filter((r) => r.classification === 'UP').length;
  const changes = rows.map((r) => r.forwardChangePct).sort((a, b) => a - b);
  const mid = Math.floor(changes.length / 2);
  return {
    label,
    fromDate: candles[from]?.datetime ?? null,
    toDate: candles[Math.max(from, to - 1)]?.datetime ?? null,
    rawMatches: result.rawMatches,
    independentEpisodes: result.independentEpisodes,
    upPct: rows.length ? round1((ups / rows.length) * 100) : null,
    medianReturnPct: changes.length ? round1(changes.length % 2 ? changes[mid] : (changes[mid - 1] + changes[mid]) / 2) : null,
  };
}

export function walkForward(
  candles: Candle[],
  opts: { conditions: MatchConditions; period?: number; trainFraction?: number; minEpisodesPerWindow?: number },
): WalkForwardResult {
  const period = opts.period ?? 10;
  const trainFraction = opts.trainFraction ?? 0.6;
  const minEpisodes = opts.minEpisodesPerWindow ?? 5;
  const split = Math.floor(candles.length * trainFraction);

  const trainRes = findHistoricalMatches(candles, { conditions: opts.conditions, periods: [period], toIndex: split });
  const testRes = findHistoricalMatches(candles, { conditions: opts.conditions, periods: [period], fromIndex: split });

  const inSample = summarise(candles, trainRes, period, 'Training period', 0, split);
  const outOfSample = summarise(candles, testRes, period, 'Validation period', split, candles.length);

  const differencePct =
    inSample.upPct !== null && outOfSample.upPct !== null ? round1(outOfSample.upPct - inSample.upPct) : null;

  let verdict: WalkForwardVerdict;
  if (
    inSample.independentEpisodes < minEpisodes ||
    outOfSample.independentEpisodes < minEpisodes ||
    differencePct === null
  ) {
    verdict = 'INSUFFICIENT_DATA';
  } else if (differencePct >= -7) verdict = 'HELD_UP';
  else if (differencePct >= -20) verdict = 'WEAKER_OUT_OF_SAMPLE';
  else verdict = 'POSSIBLE_OVERFITTING';

  const message =
    verdict === 'INSUFFICIENT_DATA'
      ? 'There is not enough history on both sides of the split to test this properly, so treat the historical percentages as untested.'
      : verdict === 'HELD_UP'
        ? 'The tendency behaved about the same on later data it was not built from.'
        : verdict === 'WEAKER_OUT_OF_SAMPLE'
          ? `The tendency was ${Math.abs(differencePct as number)} points weaker on later unseen data. Discount the headline number accordingly.`
          : `POSSIBLE OVERFITTING: the tendency was ${Math.abs(differencePct as number)} points weaker on later unseen data, so the historical percentage is not trustworthy on its own.`;

  return { inSample, outOfSample, verdict, message, differencePct };
}
