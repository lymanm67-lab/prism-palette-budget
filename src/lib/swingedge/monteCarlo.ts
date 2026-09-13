// SwingEdge — Monte Carlo Risk Lab.
//
// Everything here is modelled in R multiples taken from your own results. It is
// a study of how a process with these statistics behaves over many sequences —
// never a forecast of an account balance.
//
// Two things are non-negotiable:
//   1. A result is never shown without its sample-quality label.
//   2. Risk of ruin is never shown without stating what "ruin" means.

import type { RTrade } from './expectancy';

export type SampleQuality = 'INSUFFICIENT_DATA' | 'EARLY_ESTIMATE' | 'MODERATE_SAMPLE' | 'STRONGER_SAMPLE';

export const SAMPLE_QUALITY_LABEL: Record<SampleQuality, string> = {
  INSUFFICIENT_DATA: 'INSUFFICIENT DATA',
  EARLY_ESTIMATE: 'EARLY ESTIMATE',
  MODERATE_SAMPLE: 'MODERATE SAMPLE',
  STRONGER_SAMPLE: 'STRONGER SAMPLE',
};

export const SAMPLE_QUALITY_TEXT: Record<SampleQuality, string> = {
  INSUFFICIENT_DATA:
    'Fewer than 30 completed trades. These numbers describe the handful of trades you have, not how the system behaves.',
  EARLY_ESTIMATE: '30 to 49 completed trades. An early estimate only.',
  MODERATE_SAMPLE: '50 to 99 completed trades. A moderate sample.',
  STRONGER_SAMPLE: '100 or more completed trades. A stronger sample — still evidence quality, not a guarantee of accuracy.',
};

/** Sample-quality bands describe evidence quality only. They promise nothing. */
export function sampleQuality(completedTrades: number): SampleQuality {
  if (completedTrades < 30) return 'INSUFFICIENT_DATA';
  if (completedTrades < 50) return 'EARLY_ESTIMATE';
  if (completedTrades < 100) return 'MODERATE_SAMPLE';
  return 'STRONGER_SAMPLE';
}

export type ResampleMode = 'SIMPLE' | 'BLOCK_BOOTSTRAP' | 'REGIME_AWARE';

export const RESAMPLE_LABEL: Record<ResampleMode, string> = {
  SIMPLE: 'SIMPLE RESAMPLING',
  BLOCK_BOOTSTRAP: 'REGIME-AWARE MODEL (block bootstrap)',
  REGIME_AWARE: 'REGIME-AWARE MODEL',
};

export type RuinBasis = 'DECLINE_20' | 'DECLINE_30' | 'DECLINE_50' | 'MINIMUM_BALANCE';

export interface RuinDefinition {
  basis: RuinBasis;
  /** Decline as a fraction of starting capital, e.g. 0.3 for 30%. */
  declineFraction?: number;
  /** Absolute floor when basis is MINIMUM_BALANCE. */
  minimumBalance?: number;
  label: string;
}

export function ruinDefinition(basis: RuinBasis, minimumBalance?: number): RuinDefinition {
  switch (basis) {
    case 'DECLINE_20':
      return { basis, declineFraction: 0.2, label: '20% account loss' };
    case 'DECLINE_30':
      return { basis, declineFraction: 0.3, label: '30% account loss' };
    case 'DECLINE_50':
      return { basis, declineFraction: 0.5, label: '50% account loss' };
    default:
      return { basis, minimumBalance: minimumBalance ?? 0, label: `balance below ${minimumBalance ?? 0}` };
  }
}

export interface MonteCarloInput {
  /** Completed results in R multiples. */
  rMultiples: number[];
  startingCapital: number;
  riskPerTradePct: number;
  tradesPerRun: number;
  runs?: number;
  mode?: ResampleMode;
  /** Average block length for the block bootstrap, in trades. */
  blockLength?: number;
  ruin?: RuinDefinition;
  /** Fixed seed keeps a displayed result reproducible. */
  seed?: number;
}

export interface MonteCarloResult {
  runs: number;
  tradesPerRun: number;
  mode: ResampleMode;
  modeLabel: string;
  sample: number;
  quality: SampleQuality;
  qualityLabel: string;
  qualityText: string;
  riskPerTradePct: number;
  startingCapital: number;
  medianEnding: number;
  p10Ending: number;
  p90Ending: number;
  probabilityOfProfitPct: number;
  medianMaxDrawdownPct: number;
  worst5PctDrawdownPct: number;
  probability10PctDrawdown: number;
  probability20PctDrawdown: number;
  probability30PctDrawdown: number;
  longestLosingStreak: number;
  medianLongestLosingStreak: number;
  riskOfRuinPct: number;
  ruinLabel: string;
  assumptions: string[];
}

// Deterministic generator so a displayed result can be reproduced exactly.
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const percentile = (sorted: number[], p: number) => {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.round((p / 100) * (sorted.length - 1))));
  return sorted[idx];
};

const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

/**
 * Runs the simulation. SIMPLE resamples individual results independently.
 * BLOCK_BOOTSTRAP draws short runs of consecutive results so real clusters of
 * wins and losses survive — which is what actually causes painful drawdowns.
 */
export function runMonteCarlo(input: MonteCarloInput): MonteCarloResult {
  const runs = input.runs ?? 10_000;
  const mode = input.mode ?? 'SIMPLE';
  const blockLength = Math.max(2, input.blockLength ?? 5);
  const ruin = input.ruin ?? ruinDefinition('DECLINE_30');
  const rand = mulberry32(input.seed ?? 20260913);
  const pool = input.rMultiples.filter((r) => Number.isFinite(r));
  const quality = sampleQuality(pool.length);

  const endings: number[] = [];
  const drawdowns: number[] = [];
  const streaks: number[] = [];
  let ruined = 0;
  let dd10 = 0;
  let dd20 = 0;
  let dd30 = 0;
  let profitable = 0;
  let worstStreakOverall = 0;

  if (!pool.length) {
    return {
      runs: 0,
      tradesPerRun: input.tradesPerRun,
      mode,
      modeLabel: RESAMPLE_LABEL[mode],
      sample: 0,
      quality: 'INSUFFICIENT_DATA',
      qualityLabel: SAMPLE_QUALITY_LABEL.INSUFFICIENT_DATA,
      qualityText: 'There are no completed trades to resample, so no simulation was run.',
      riskPerTradePct: input.riskPerTradePct,
      startingCapital: input.startingCapital,
      medianEnding: input.startingCapital,
      p10Ending: input.startingCapital,
      p90Ending: input.startingCapital,
      probabilityOfProfitPct: 0,
      medianMaxDrawdownPct: 0,
      worst5PctDrawdownPct: 0,
      probability10PctDrawdown: 0,
      probability20PctDrawdown: 0,
      probability30PctDrawdown: 0,
      longestLosingStreak: 0,
      medianLongestLosingStreak: 0,
      riskOfRuinPct: 0,
      ruinLabel: ruin.label,
      assumptions: ASSUMPTIONS(input, ruin, mode),
    };
  }

  const ruinFloor =
    ruin.basis === 'MINIMUM_BALANCE'
      ? (ruin.minimumBalance ?? 0)
      : input.startingCapital * (1 - (ruin.declineFraction ?? 0.3));

  for (let run = 0; run < runs; run++) {
    let balance = input.startingCapital;
    let peak = balance;
    let maxDd = 0;
    let streak = 0;
    let worstStreak = 0;
    let hitRuin = false;
    let i = 0;

    while (i < input.tradesPerRun) {
      // Draw either one result or a short block of consecutive results.
      const take = mode === 'SIMPLE' ? 1 : 1 + Math.floor(rand() * blockLength);
      const start = Math.floor(rand() * pool.length);
      for (let k = 0; k < take && i < input.tradesPerRun; k++, i++) {
        const r = pool[(start + k) % pool.length];
        // Risk is a percent of the CURRENT balance, so losses compound down.
        const risk = balance * (input.riskPerTradePct / 100);
        balance += risk * r;
        if (r < 0) {
          streak += 1;
          if (streak > worstStreak) worstStreak = streak;
        } else {
          streak = 0;
        }
        if (balance > peak) peak = balance;
        const dd = peak > 0 ? (peak - balance) / peak : 0;
        if (dd > maxDd) maxDd = dd;
        if (balance <= ruinFloor) hitRuin = true;
      }
    }

    endings.push(balance);
    drawdowns.push(maxDd * 100);
    streaks.push(worstStreak);
    if (worstStreak > worstStreakOverall) worstStreakOverall = worstStreak;
    if (balance > input.startingCapital) profitable += 1;
    if (maxDd >= 0.1) dd10 += 1;
    if (maxDd >= 0.2) dd20 += 1;
    if (maxDd >= 0.3) dd30 += 1;
    if (hitRuin) ruined += 1;
  }

  const sortedEnd = [...endings].sort((a, b) => a - b);
  const sortedDd = [...drawdowns].sort((a, b) => a - b);
  const sortedStreaks = [...streaks].sort((a, b) => a - b);

  return {
    runs,
    tradesPerRun: input.tradesPerRun,
    mode,
    modeLabel: RESAMPLE_LABEL[mode],
    sample: pool.length,
    quality,
    qualityLabel: SAMPLE_QUALITY_LABEL[quality],
    qualityText: SAMPLE_QUALITY_TEXT[quality],
    riskPerTradePct: input.riskPerTradePct,
    startingCapital: input.startingCapital,
    medianEnding: round2(percentile(sortedEnd, 50)),
    p10Ending: round2(percentile(sortedEnd, 10)),
    p90Ending: round2(percentile(sortedEnd, 90)),
    probabilityOfProfitPct: round1((profitable / runs) * 100),
    medianMaxDrawdownPct: round1(percentile(sortedDd, 50)),
    worst5PctDrawdownPct: round1(percentile(sortedDd, 95)),
    probability10PctDrawdown: round1((dd10 / runs) * 100),
    probability20PctDrawdown: round1((dd20 / runs) * 100),
    probability30PctDrawdown: round1((dd30 / runs) * 100),
    longestLosingStreak: worstStreakOverall,
    medianLongestLosingStreak: Math.round(percentile(sortedStreaks, 50)),
    riskOfRuinPct: round1((ruined / runs) * 100),
    ruinLabel: ruin.label,
    assumptions: ASSUMPTIONS(input, ruin, mode),
  };
}

function ASSUMPTIONS(input: MonteCarloInput, ruin: RuinDefinition, mode: ResampleMode): string[] {
  return [
    `Ruin definition: ${ruin.label}.`,
    `Risk per trade: ${input.riskPerTradePct}% of the balance at the time of the trade.`,
    `${input.tradesPerRun} trades per simulated sequence, ${(input.runs ?? 10_000).toLocaleString()} sequences.`,
    mode === 'SIMPLE'
      ? 'Simple resampling: each result is drawn independently, so real clusters of wins and losses are understated.'
      : 'Block resampling: short runs of consecutive results are drawn together, so streaks are preserved more realistically.',
    'Results are drawn from your own completed trades. If those trades are unrepresentative, so is this.',
    'This is a study of how a process with these statistics behaves. It is not a prediction of your account.',
  ];
}

export const RISK_SIZING_LEVELS = [0.25, 0.5, 0.75, 1, 2] as const;

export interface RiskSizingRow {
  riskPerTradePct: number;
  medianEnding: number;
  medianMaxDrawdownPct: number;
  worst5PctDrawdownPct: number;
  probability10PctDrawdown: number;
  probability20PctDrawdown: number;
  longestLosingStreak: number;
  riskOfRuinPct: number;
}

export interface RiskSizingComparison {
  rows: RiskSizingRow[];
  quality: SampleQuality;
  qualityLabel: string;
  ruinLabel: string;
  lesson: string;
}

/** Side-by-side risk levels, so the trade-off is visible rather than argued. */
export function riskSizingComparison(
  base: Omit<MonteCarloInput, 'riskPerTradePct'>,
  levels: number[] = [...RISK_SIZING_LEVELS],
): RiskSizingComparison {
  const rows = levels.map((riskPerTradePct) => {
    const res = runMonteCarlo({ ...base, riskPerTradePct });
    return {
      riskPerTradePct,
      medianEnding: res.medianEnding,
      medianMaxDrawdownPct: res.medianMaxDrawdownPct,
      worst5PctDrawdownPct: res.worst5PctDrawdownPct,
      probability10PctDrawdown: res.probability10PctDrawdown,
      probability20PctDrawdown: res.probability20PctDrawdown,
      longestLosingStreak: res.medianLongestLosingStreak,
      riskOfRuinPct: res.riskOfRuinPct,
    };
  });
  const quality = sampleQuality(base.rMultiples.filter((r) => Number.isFinite(r)).length);
  const ruin = base.ruin ?? ruinDefinition('DECLINE_30');

  return {
    rows,
    quality,
    qualityLabel: SAMPLE_QUALITY_LABEL[quality],
    ruinLabel: ruin.label,
    lesson:
      'Read the drawdown and ruin columns before the balance column. More risk can raise the upside, and it raises the depth of the hole and the chance of ruin at the same time.',
  };
}

export type RegimeSplitKey =
  | 'BULL'
  | 'NEUTRAL'
  | 'CAUTIOUS'
  | 'HIGH_VOLATILITY'
  | 'LOW_EVENT_RISK'
  | 'HIGH_EVENT_RISK'
  | 'NEAR_EARNINGS'
  | 'OUTSIDE_EARNINGS';

export interface RegimeSplitResult {
  key: RegimeSplitKey;
  label: string;
  sample: number;
  quality: SampleQuality;
  result: MonteCarloResult | null;
  note: string | null;
}

const SPLIT_LABEL: Record<RegimeSplitKey, string> = {
  BULL: 'Bull markets',
  NEUTRAL: 'Neutral markets',
  CAUTIOUS: 'Cautious markets',
  HIGH_VOLATILITY: 'High-volatility markets',
  LOW_EVENT_RISK: 'Low event risk',
  HIGH_EVENT_RISK: 'High event risk',
  NEAR_EARNINGS: 'Near earnings',
  OUTSIDE_EARNINGS: 'Outside earnings',
};

function filterFor(key: RegimeSplitKey, trades: RTrade[]): RTrade[] {
  switch (key) {
    case 'BULL':
      return trades.filter((t) => t.marketRegime === 'BULLISH');
    case 'NEUTRAL':
      return trades.filter((t) => t.marketRegime === 'NEUTRAL');
    case 'CAUTIOUS':
      return trades.filter((t) => t.marketRegime === 'CAUTIOUS');
    case 'HIGH_VOLATILITY':
      return trades.filter((t) => t.marketRegime === 'HIGH_VOLATILITY');
    case 'LOW_EVENT_RISK':
      return trades.filter((t) => t.eventRiskBand === 'LOW' || t.eventRiskBand === 'MODERATE');
    case 'HIGH_EVENT_RISK':
      return trades.filter((t) => t.eventRiskBand === 'HIGH' || t.eventRiskBand === 'SEVERE');
    case 'NEAR_EARNINGS':
      return trades.filter((t) => t.nearEarnings === true);
    default:
      return trades.filter((t) => t.nearEarnings !== true);
  }
}

/**
 * Regime and event splits. A split with too few trades returns no result at all
 * rather than a confident-looking number built on five trades.
 */
export function regimeAwareRuns(
  trades: RTrade[],
  base: Omit<MonteCarloInput, 'rMultiples'>,
  keys: RegimeSplitKey[] = ['BULL', 'NEUTRAL', 'CAUTIOUS', 'HIGH_VOLATILITY', 'LOW_EVENT_RISK', 'HIGH_EVENT_RISK', 'NEAR_EARNINGS', 'OUTSIDE_EARNINGS'],
  minSample = 30,
): RegimeSplitResult[] {
  return keys.map((key) => {
    const rows = filterFor(key, trades);
    const rMultiples = rows.map((t) => t.r);
    const quality = sampleQuality(rMultiples.length);
    if (rMultiples.length < minSample) {
      return {
        key,
        label: SPLIT_LABEL[key],
        sample: rMultiples.length,
        quality,
        result: null,
        note: `Only ${rMultiples.length} trades in this condition, below the ${minSample} needed before a separate simulation says anything.`,
      };
    }
    return {
      key,
      label: SPLIT_LABEL[key],
      sample: rMultiples.length,
      quality,
      result: runMonteCarlo({ ...base, rMultiples, mode: base.mode ?? 'BLOCK_BOOTSTRAP' }),
      note: null,
    };
  });
}
