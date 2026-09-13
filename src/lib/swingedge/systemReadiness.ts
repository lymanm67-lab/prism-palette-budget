// SwingEdge — System Readiness.
//
// Trade Readiness asks whether ONE trade meets the rules. System Readiness asks
// a completely different question: has this trading PROCESS produced enough
// evidence to justify more confidence?
//
// It is an evidence summary. It is not investment advice, and it never
// authorises live trading — no state here unlocks anything.

import type { ExpectancyResult } from './expectancy';
import type { OutlierDependenceResult } from './outlierDependence';
import { sampleQuality, type SampleQuality } from './monteCarlo';

export type SystemReadinessState =
  | 'TRAINING'
  | 'INSUFFICIENT_DATA'
  | 'EARLY_EVIDENCE'
  | 'DEVELOPING_EDGE'
  | 'VALIDATED_FOR_FURTHER_TESTING';

export const SYSTEM_STATE_LABEL: Record<SystemReadinessState, string> = {
  TRAINING: 'TRAINING',
  INSUFFICIENT_DATA: 'INSUFFICIENT DATA',
  EARLY_EVIDENCE: 'EARLY EVIDENCE',
  DEVELOPING_EDGE: 'DEVELOPING EDGE',
  VALIDATED_FOR_FURTHER_TESTING: 'VALIDATED FOR FURTHER TESTING',
};

export const SYSTEM_STATE_TEXT: Record<SystemReadinessState, string> = {
  TRAINING: 'You are still learning the process. Keep working through the course and logging practice trades.',
  INSUFFICIENT_DATA: 'There are not enough completed trades to say anything about the process yet.',
  EARLY_EVIDENCE: 'Early evidence only. The numbers exist but a stretch of bad luck would erase them.',
  DEVELOPING_EDGE: 'The process is showing a consistent pattern across a reasonable sample. Keep testing.',
  VALIDATED_FOR_FURTHER_TESTING:
    'The evidence supports continuing to test this process at the same size. This is not permission to trade real money.',
};

export interface SystemReadinessInput {
  completedTrades: number;
  overall: ExpectancyResult;
  pullback: ExpectancyResult;
  breakout: ExpectancyResult;
  maxDrawdownPct: number | null;
  ruleFollowingPct: number | null;
  averageExecutionScore: number | null;
  stopDisciplinePct: number | null;
  heatCompliancePct: number | null;
  /** Expectancy per market regime, keyed by regime name. */
  byRegime: { label: string; trades: number; expectancyR: number }[];
  /** Expectancy per event-risk condition. */
  byEventRisk: { label: string; trades: number; expectancyR: number }[];
  monteCarlo: { medianMaxDrawdownPct: number; worst5PctDrawdownPct: number; riskOfRuinPct: number; ruinLabel: string } | null;
  outliers: OutlierDependenceResult;
  /** Course progress, so a trained-but-untested user reads as TRAINING. */
  courseComplete?: boolean;
}

export interface SystemReadinessCheck {
  key: string;
  label: string;
  value: string;
  passed: boolean | null;
  detail: string;
}

export interface SystemReadinessResult {
  state: SystemReadinessState;
  stateLabel: string;
  stateText: string;
  sampleQuality: SampleQuality;
  checks: SystemReadinessCheck[];
  strengths: string[];
  concerns: string[];
  nextSteps: string[];
  disclaimer: string;
}

export const SYSTEM_READINESS_DISCLAIMER =
  'System Readiness is a summary of the evidence your own paper trading has produced. It is not investment advice, it does not predict future results, and it never authorises live trading.';

const pctText = (n: number | null) => (n === null ? 'not measured' : `${Math.round(n * 10) / 10}%`);

export function assessSystemReadiness(input: SystemReadinessInput): SystemReadinessResult {
  const quality = sampleQuality(input.completedTrades);
  const checks: SystemReadinessCheck[] = [];
  const strengths: string[] = [];
  const concerns: string[] = [];

  const add = (key: string, label: string, value: string, passed: boolean | null, detail: string) => {
    checks.push({ key, label, value, passed, detail });
    if (passed === true) strengths.push(`${label}: ${value}`);
    if (passed === false) concerns.push(`${label}: ${value} — ${detail}`);
  };

  add(
    'trades',
    'Completed paper trades',
    `${input.completedTrades}`,
    input.completedTrades >= 30 ? true : input.completedTrades >= 10 ? null : false,
    'Below 30 trades, results are mostly noise.',
  );
  add(
    'expectancy',
    'Overall expectancy',
    `${input.overall.expectancyR}R per trade`,
    input.overall.trades ? input.overall.expectancyR > 0 : null,
    'A negative expectancy means the process loses money over time regardless of any single win.',
  );
  add(
    'pullbackExpectancy',
    'Pullback expectancy',
    input.pullback.trades ? `${input.pullback.expectancyR}R over ${input.pullback.trades} trades` : 'no trades yet',
    input.pullback.trades ? input.pullback.expectancyR > 0 : null,
    'Pullback entries are the core setup, so this one matters most.',
  );
  add(
    'breakoutExpectancy',
    'Breakout expectancy',
    input.breakout.trades ? `${input.breakout.expectancyR}R over ${input.breakout.trades} trades` : 'no trades yet',
    input.breakout.trades ? input.breakout.expectancyR > 0 : null,
    'Breakouts fail more often, so a negative number here is common and worth knowing.',
  );
  add(
    'averages',
    'Average winner and loser',
    `+${input.overall.averageWinR}R against -${input.overall.averageLossR}R`,
    input.overall.averageLossR > 0 ? input.overall.averageWinR >= input.overall.averageLossR : null,
    'Losers larger than winners means the win rate has to be very high to survive.',
  );
  add(
    'drawdown',
    'Maximum drawdown',
    pctText(input.maxDrawdownPct),
    input.maxDrawdownPct === null ? null : input.maxDrawdownPct <= 15,
    'A deep drawdown is the pain you actually have to sit through.',
  );
  add(
    'rules',
    'Rule following',
    pctText(input.ruleFollowingPct),
    input.ruleFollowingPct === null ? null : input.ruleFollowingPct >= 90,
    'Results only mean something when the rules were actually followed.',
  );
  add(
    'execution',
    'Execution score',
    input.averageExecutionScore === null ? 'not measured' : `${Math.round(input.averageExecutionScore)} / 100`,
    input.averageExecutionScore === null ? null : input.averageExecutionScore >= 80,
    'Poor execution makes even a good process unrepeatable.',
  );
  add(
    'stops',
    'Stop discipline',
    pctText(input.stopDisciplinePct),
    input.stopDisciplinePct === null ? null : input.stopDisciplinePct >= 95,
    'A moved stop invalidates the planned loss that every other number is built on.',
  );
  add(
    'heat',
    'Portfolio heat compliance',
    pctText(input.heatCompliancePct),
    input.heatCompliancePct === null ? null : input.heatCompliancePct >= 95,
    'Breaching heat limits is how a normal losing streak turns into a serious loss.',
  );

  const regimesWithData = input.byRegime.filter((r) => r.trades >= 10);
  add(
    'regimes',
    'Results across market regimes',
    regimesWithData.length ? regimesWithData.map((r) => `${r.label} ${r.expectancyR}R`).join(', ') : 'not enough data',
    regimesWithData.length >= 2 ? regimesWithData.every((r) => r.expectancyR > 0) : null,
    'A process that only works in one regime is not yet a process.',
  );
  const eventsWithData = input.byEventRisk.filter((r) => r.trades >= 10);
  add(
    'eventConditions',
    'Results across event-risk conditions',
    eventsWithData.length ? eventsWithData.map((r) => `${r.label} ${r.expectancyR}R`).join(', ') : 'not enough data',
    eventsWithData.length >= 2 ? eventsWithData.every((r) => r.expectancyR > -0.1) : null,
    'Losses concentrated around events point at timing rather than setup quality.',
  );

  if (input.monteCarlo) {
    add(
      'monteCarloDrawdown',
      'Simulated drawdowns',
      `median ${input.monteCarlo.medianMaxDrawdownPct}%, worst 5% ${input.monteCarlo.worst5PctDrawdownPct}%`,
      input.monteCarlo.worst5PctDrawdownPct <= 30,
      'The worst 5% of sequences is the case you have to be able to survive.',
    );
    add(
      'ruin',
      'Risk of ruin',
      `${input.monteCarlo.riskOfRuinPct}% against ${input.monteCarlo.ruinLabel}`,
      input.monteCarlo.riskOfRuinPct <= 5,
      'Ruin risk above a few percent means the position size is too large for this process.',
    );
  } else {
    add('monteCarloDrawdown', 'Simulated drawdowns', 'not run yet', null, 'Run the Risk Lab once you have completed trades.');
  }

  add(
    'outliers',
    'Dependence on outlier winners',
    input.outliers.top3Pct === null ? 'not measurable yet' : `${input.outliers.top3Pct}% of profit from three trades`,
    input.outliers.verdict === 'INSUFFICIENT_DATA' ? null : input.outliers.verdict !== 'HIGHLY_CONCENTRATED',
    'Profit concentrated in a few trades usually means luck has not been separated from edge yet.',
  );

  const failed = checks.filter((c) => c.passed === false).length;
  const passed = checks.filter((c) => c.passed === true).length;

  let state: SystemReadinessState;
  if (input.completedTrades < 10) state = input.courseComplete === false ? 'TRAINING' : 'INSUFFICIENT_DATA';
  else if (input.completedTrades < 30) state = 'EARLY_EVIDENCE';
  else if (
    input.overall.expectancyR > 0 &&
    failed === 0 &&
    passed >= 10 &&
    input.completedTrades >= 100 &&
    input.outliers.verdict !== 'HIGHLY_CONCENTRATED'
  ) {
    state = 'VALIDATED_FOR_FURTHER_TESTING';
  } else if (input.overall.expectancyR > 0 && failed <= 2) state = 'DEVELOPING_EDGE';
  else state = 'EARLY_EVIDENCE';

  const nextSteps: string[] = [];
  if (input.completedTrades < 30) nextSteps.push(`Log ${30 - input.completedTrades} more completed paper trades.`);
  if (input.outliers.verdict === 'HIGHLY_CONCENTRATED') {
    nextSteps.push('Keep testing until profit is spread across many trades rather than a handful.');
  }
  if (input.ruleFollowingPct !== null && input.ruleFollowingPct < 90) {
    nextSteps.push('Fix rule-following before drawing any conclusion from the results.');
  }
  if (input.monteCarlo && input.monteCarlo.riskOfRuinPct > 5) {
    nextSteps.push('Compare smaller risk-per-trade levels in the Risk Lab.');
  }
  if (!nextSteps.length) nextSteps.push('Keep the process identical and keep gathering trades.');

  return {
    state,
    stateLabel: SYSTEM_STATE_LABEL[state],
    stateText: SYSTEM_STATE_TEXT[state],
    sampleQuality: quality,
    checks,
    strengths,
    concerns,
    nextSteps,
    disclaimer: SYSTEM_READINESS_DISCLAIMER,
  };
}
