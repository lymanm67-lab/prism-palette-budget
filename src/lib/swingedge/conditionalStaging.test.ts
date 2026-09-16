import { describe, expect, it } from 'vitest';
import {
  armedNeedsReview,
  buildEntryReadiness,
  conditionsFromReadiness,
  executionModeFor,
  nextPlanState,
  stagingStatus,
  type EntryReadinessInput,
} from './conditionalStaging';
import { buildAnalysisSnapshot } from './analysisSnapshot';
import { conditionalOrderPreview } from './conditionalOrder';
import type { GuideTrade } from './thinkorswimGuide';

const base: EntryReadinessInput = {
  symbol: 'QQQ',
  setup: 'PULLBACK',
  signal: 'WAIT',
  readinessScore: 78,
  readinessBand: 'WAIT',
  hardGates: [],
  dailyState: 'VALID_SETUP',
  h4State: 'CONFIRMS',
  h1State: 'WAITING',
  entryTrigger: 704.54,
  currentPrice: 698.1,
  stop: 658.89,
  target: 795.84,
  targetPath: 'CLEAR',
  targetPathReason: '',
  eventBand: 'LOW',
  haConfirmation: null,
  priceExtended: false,
  entryZone: { low: 700, high: 709 },
};

describe('staging status', () => {
  it('waits when the 1-hour chart has not confirmed', () => {
    expect(stagingStatus(base)).toBe('WAIT');
  });

  it('goes only when the signal, readiness and 1-hour entry all agree', () => {
    expect(
      stagingStatus({ ...base, signal: 'GO', readinessBand: 'READY', h1State: 'ENTRY_CONFIRMED' }),
    ).toBe('GO');
  });

  it('stops on a hard gate whatever the score says', () => {
    expect(
      stagingStatus({
        ...base,
        signal: 'GO',
        readinessBand: 'READY',
        h1State: 'ENTRY_CONFIRMED',
        readinessScore: 94,
        hardGates: ['A severe verified event affects this trade.'],
      }),
    ).toBe('STOP');
  });

  it('stops when the daily setup is invalidated', () => {
    expect(stagingStatus({ ...base, dailyState: 'INVALIDATED', signal: 'GO' })).toBe('STOP');
  });

  it('reviews a blocked target path', () => {
    expect(stagingStatus({ ...base, targetPath: 'BLOCKED' })).toBe('REVIEW');
  });
});

describe('what are we waiting for', () => {
  it('names the price cross and the 1-hour confirmation instead of a bare wait', () => {
    const r = buildEntryReadiness(base);
    expect(r.waitingFor.some((w) => w.includes('$704.54'))).toBe(true);
    expect(r.waitingFor.some((w) => w.includes('1-hour'))).toBe(true);
    expect(r.waitingFor.length).toBeGreaterThan(2);
  });

  it('shows Heikin Ashi as not available rather than guessing', () => {
    const row = buildEntryReadiness(base).rows.find((x) => x.label.startsWith('Heikin'));
    expect(row?.value).toBe('not available yet');
  });

  it('has nothing to wait for once it is a GO', () => {
    const r = buildEntryReadiness({ ...base, signal: 'GO', readinessBand: 'READY', h1State: 'ENTRY_CONFIRMED' });
    expect(r.status).toBe('GO');
    expect(r.waitingFor).toEqual([]);
  });
});

describe('execution mode', () => {
  it('defaults a waiting setup to an alert in Beginner Mode', () => {
    expect(executionModeFor('WAIT', true)).toBe('SET_ALERT');
  });

  it('lets advanced mode arm a waiting setup', () => {
    expect(executionModeFor('WAIT', false)).toBe('ARM_FOR_LATER');
  });

  it('only offers execute now on a GO', () => {
    expect(executionModeFor('GO', true)).toBe('EXECUTE_NOW');
    expect(executionModeFor('REVIEW', false)).toBe('SET_ALERT');
  });
});

describe('plan state', () => {
  it('is a draft until the plan is complete', () => {
    expect(
      nextPlanState({ mode: null, status: 'WAIT', planComplete: false, conditionsDefined: false }),
    ).toBe('DRAFT');
  });

  it('waits for the condition once an armed plan is saved', () => {
    expect(
      nextPlanState({
        mode: 'ARM_FOR_LATER',
        status: 'WAIT',
        planComplete: true,
        conditionsDefined: true,
        saved: true,
      }),
    ).toBe('WAITING_FOR_CONDITION');
  });

  it('requires revalidation when execute now no longer has a GO', () => {
    expect(
      nextPlanState({ mode: 'EXECUTE_NOW', status: 'WAIT', planComplete: true, conditionsDefined: false }),
    ).toBe('REVALIDATION_REQUIRED');
  });
});

describe('armed trade review', () => {
  const armed = buildAnalysisSnapshot({
    symbol: 'QQQ',
    currentPrice: 698,
    setup: 'PULLBACK',
    entryTrigger: 704.54,
    support: 690,
    resistance: 780,
    stopSuggestion: 658.89,
    mathematicalTarget: 795.84,
    technicalTarget: null,
    targetPath: 'CLEAR',
    targetPathReason: '',
    dailyTrend: 'VALID_SETUP',
    h4Trend: 'CONFIRMS',
    h1Trend: 'WAITING',
    weeklyContext: 'BULLISH',
    haConfirmation: null,
    directionalBias: 'UP',
    eventRisk: 'LOW',
    signalStatus: 'WAIT',
    readinessScore: 78,
    readinessBand: 'WAIT',
  });

  it('stays quiet when nothing material changed', () => {
    expect(armedNeedsReview(armed, { signalStatus: 'WAIT', eventRisk: 'LOW', targetPath: 'CLEAR' }).needsReview).toBe(
      false,
    );
  });

  it('flags a blocked target path and rising event risk', () => {
    const r = armedNeedsReview(armed, { targetPath: 'BLOCKED', eventRisk: 'HIGH' });
    expect(r.needsReview).toBe(true);
    expect(r.reasons.length).toBe(2);
  });
});

describe('conditional order preview', () => {
  const trade: GuideTrade = {
    symbol: 'QQQ',
    shares: 1,
    entryPrice: 704.54,
    entryOrderType: 'Limit',
    stopPrice: 658.89,
    targetPrice: 795.84,
    timeInForce: 'GTC',
    riskPerShare: 45.65,
    totalRisk: 45.65,
    rewardToRisk: 2,
    filled: false,
    setup: 'PULLBACK',
  };

  it('mirrors the worked example', () => {
    const p = conditionalOrderPreview(trade, conditionsFromReadiness(704.54));
    expect(p.parent.text).toBe('BUY +1 QQQ @ $704.54 LIMIT');
    expect(p.submitWhen[0]).toContain('crosses above $704.54');
    expect(p.then).toBe('1ST TRIGGERS OCO');
    expect(p.oco[0].text).toBe('SELL -1 QQQ @ $795.84 LMT GTC');
    expect(p.oco[2].text).toBe('SELL -1 QQQ @ $658.89 STP GTC');
  });

  it('says so plainly when no conditions are defined', () => {
    const p = conditionalOrderPreview(trade, []);
    expect(p.submitWhen).toEqual(['No conditions defined yet.']);
  });
});
