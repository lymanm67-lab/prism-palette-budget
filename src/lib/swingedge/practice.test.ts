import { describe, expect, it } from 'vitest';
import {
  auditStopChange,
  checkShareCount,
  classifyResult,
  earlyExitFlag,
  executionVariance,
  scoreExecution,
  sizePosition,
  tradeResult,
  trainingAccount,
} from './practice';

describe('practice — acceptance test A (sizing is capped by the training account)', () => {
  it('approves 25 shares on a $5,000 account risking 1% with a $2 stop distance', () => {
    const s = sizePosition({ capital: 5000, riskPct: 1, entry: 44.5, stop: 42.5 });
    expect(s.riskPerShare).toBe(2);
    expect(s.maxDollarRisk).toBe(50);
    expect(s.maxShares).toBe(25);
  });

  it('does not care how much buying power paperMoney shows', () => {
    // Buying power is not an input anywhere in sizing.
    const s = sizePosition({ capital: 5000, riskPct: 1, entry: 44.5, stop: 42.5 });
    expect(s.maxShares).toBe(25);
    expect(checkShareCount(400, s.maxShares).label).toBe('RISK LIMIT EXCEEDED');
  });

  it('exposes one unit of risk as $50', () => {
    expect(trainingAccount(5000, 1).oneR).toBe(50);
  });
});

describe('practice — acceptance test B (a worse fill is recorded, not smoothed over)', () => {
  it('recalculates risk, reward-to-risk and variance from the actual fill', () => {
    const v = executionVariance({
      plannedEntry: 50,
      actualEntry: 50.18,
      plannedStop: 48,
      actualStop: 48,
      plannedShares: 25,
      actualShares: 25,
      plannedTarget: 54,
      actualTarget: 54,
    });
    expect(v.slippagePerShare).toBe(0.18);
    expect(v.plannedRewardRisk).toBe(2);
    expect(v.actualRewardRisk).toBeLessThan(2);
    expect(v.band).toBe('LOW');
  });
});

describe('practice — acceptance test C (oversize in paperMoney)', () => {
  it('flags the size, drops the score and classifies on rules, not profit', () => {
    expect(checkShareCount(60, 25)).toEqual({ ok: false, label: 'RISK LIMIT EXCEEDED', excess: 35 });
    const v = executionVariance({
      plannedEntry: 50,
      actualEntry: 50,
      plannedStop: 48,
      actualStop: 48,
      plannedShares: 25,
      actualShares: 60,
      plannedTarget: 54,
      actualTarget: 54,
    });
    expect(v.band).toBe('HIGH');
    const scored = scoreExecution({
      entry: 'PASS',
      size: 'FAIL',
      stop: 'PASS',
      target: 'PASS',
      chasing: 'PASS',
      heat: 'FAIL',
      journal: 'PASS',
    });
    expect(scored.score).toBe(70);
    expect(classifyResult(180, ['Position size violation']).result).toBe('BAD WIN');
    expect(classifyResult(-180, ['Position size violation']).result).toBe('BAD LOSS');
  });
});

describe('practice — acceptance test D (a disciplined 1R loss)', () => {
  it('is a good loss with a full execution score', () => {
    const r = tradeResult({
      entry: 50,
      exit: 48,
      shares: 25,
      originalRisk: 50,
      entryDate: '2026-09-01',
      exitDate: '2026-09-08',
    });
    expect(r.dollarPl).toBe(-50);
    expect(r.rMultiple).toBe(-1);
    expect(r.holdingDays).toBe(7);

    const c = classifyResult(r.dollarPl, []);
    expect(c.result).toBe('GOOD LOSS');
    const scored = scoreExecution({
      entry: 'PASS',
      size: 'PASS',
      stop: 'PASS',
      target: 'PASS',
      chasing: 'PASS',
      heat: 'PASS',
      journal: 'PASS',
    });
    expect(scored.score).toBe(100);
  });
});

describe('practice — acceptance test E (chasing that happens to pay)', () => {
  it('is a bad win', () => {
    const c = classifyResult(100, ['Entered above the approved entry zone']);
    expect(c.result).toBe('BAD WIN');
    expect(c.explanation).toContain('Profit does not erase');
  });
});

describe('practice — acceptance test F (lower-timeframe interference)', () => {
  it('flags an early exit taken off the 15-minute chart', () => {
    const flag = earlyExitFlag({
      dailyThesisValid: true,
      structuralInvalidation: false,
      promptedBy: 'M15',
      exitReason: 'Manual exit',
    });
    expect(flag?.label).toBe('EARLY EXIT / LOWER-TIMEFRAME INTERFERENCE');
  });

  it('does not flag an exit after a real structural break', () => {
    expect(
      earlyExitFlag({
        dailyThesisValid: false,
        structuralInvalidation: true,
        promptedBy: 'DAILY',
        exitReason: 'Trade invalidated',
      }),
    ).toBeNull();
  });
});

describe('practice — supporting behaviour', () => {
  it('never guesses at things that were not recorded', () => {
    const s = sizePosition({ capital: 5000, riskPct: 1, entry: null, stop: null });
    expect(s.maxShares).toBeNull();
    const v = executionVariance({
      plannedEntry: 50,
      actualEntry: null,
      plannedStop: 48,
      actualStop: null,
      plannedShares: 25,
      actualShares: null,
      plannedTarget: 54,
      actualTarget: null,
    });
    expect(v.band).toBeNull();
    const scored = scoreExecution({ entry: 'PASS' });
    expect(scored.score).toBe(100);
    expect(scored.scored).toBe(20);
    expect(scored.notRecorded.length).toBe(6);
  });

  it('calls a widened stop a discipline violation when nothing structural changed', () => {
    const a = auditStopChange({
      originalStop: 48,
      newStop: 47,
      entry: 50,
      shares: 25,
      structuralReason: false,
    });
    expect(a.riskIncreased).toBe(true);
    expect(a.violation?.label).toBe('STOP DISCIPLINE VIOLATION');

    const tightened = auditStopChange({
      originalStop: 48,
      newStop: 49,
      entry: 50,
      shares: 25,
      structuralReason: false,
    });
    expect(tightened.riskIncreased).toBe(false);
    expect(tightened.violation).toBeNull();
  });
});
