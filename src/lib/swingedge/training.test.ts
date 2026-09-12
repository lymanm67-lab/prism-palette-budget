// Stage 4 & 5 acceptance tests — circuit breakers and the training programme.

import { describe, expect, it } from 'vitest';
import { assessBreaker, tallyFromTrades, weekStartOf } from './circuitBreaker';
import {
  CHECKLIST_ITEMS,
  TRAINING_WEEKS,
  assessGraduation,
  checklistComplete,
  checklistProgress,
  toCsv,
  weekCompletion,
} from './training';

const LIMITS = { consecutiveLosses: 3, dailyLossLimit: 300, weeklyLossLimit: 600 };

const graduationBase = {
  closedPaperTrades: 20,
  rulesFollowedPct: 95,
  journaledPct: 100,
  avgExecutionScore: 92,
  stopsWidened: 0,
  chasedEntries: 0,
  weeklyReviews: 6,
  expectancy: 0.35,
  minPaperTrades: 20,
};

describe('Stage 4 — circuit breakers', () => {
  it('A: a clean tally leaves trading open and reports the room left', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 1, dailyLoss: 100, weeklyLoss: 250 },
      limits: LIMITS,
    });
    expect(r.state).toBe('ACTIVE');
    expect(r.canOpenNewTrade).toBe(true);
    expect(r.room).toEqual({ losses: 2, daily: 200, weekly: 350 });
  });

  it('B: a losing streak at the limit pauses new trades', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 3, dailyLoss: 0, weeklyLoss: 0 },
      limits: LIMITS,
    });
    expect(r.state).toBe('PAUSED_CONSECUTIVE_LOSSES');
    expect(r.canOpenNewTrade).toBe(false);
    expect(r.reviewSteps.length).toBeGreaterThan(3);
  });

  it('C: the weekly limit outranks the daily one', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 5, dailyLoss: 400, weeklyLoss: 700 },
      limits: LIMITS,
    });
    expect(r.state).toBe('PAUSED_WEEKLY_LOSS');
  });

  it('D: the daily limit trips before a streak is reached', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 1, dailyLoss: 320, weeklyLoss: 320 },
      limits: LIMITS,
    });
    expect(r.state).toBe('PAUSED_DAILY_LOSS');
    expect(r.reason).toContain('Today');
  });

  it('E: the pause exists for the review, so completing it clears the block', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 4, dailyLoss: 0, weeklyLoss: 0 },
      limits: LIMITS,
      reviewCompleted: true,
    });
    expect(r.canOpenNewTrade).toBe(true);
    expect(r.tripped).toBe(false);
    expect(r.reason).toContain('losing trades in a row');
  });

  it('F: breaker wording is instructional, never a verdict on the trader', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 3, dailyLoss: 0, weeklyLoss: 0 },
      limits: LIMITS,
    });
    const text = [r.headline, r.reason, ...r.reviewSteps].join(' ').toLowerCase();
    for (const banned of ['bad trader', 'you failed', 'stupid', 'undisciplined trader']) {
      expect(text).not.toContain(banned);
    }
  });

  it('G: zeroed limits mean the breaker is off rather than always tripped', () => {
    const r = assessBreaker({
      tally: { consecutiveLosses: 9, dailyLoss: 9000, weeklyLoss: 9000 },
      limits: { consecutiveLosses: 0, dailyLossLimit: 0, weeklyLossLimit: 0 },
    });
    expect(r.state).toBe('ACTIVE');
  });

  it('H: the streak counts back from the newest trade and resets on a win', () => {
    const tally = tallyFromTrades(
      [
        { status: 'CLOSED', exit_date: '2026-09-10', realized_pl: -100 },
        { status: 'CLOSED', exit_date: '2026-09-09', realized_pl: -150 },
        { status: 'CLOSED', exit_date: '2026-09-08', realized_pl: 200 },
        { status: 'CLOSED', exit_date: '2026-09-07', realized_pl: -400 },
        { status: 'OPEN', exit_date: null, realized_pl: null },
      ],
      '2026-09-10',
      '2026-09-07',
    );
    expect(tally.consecutiveLosses).toBe(2);
    expect(tally.dailyLoss).toBe(100);
    expect(tally.weeklyLoss).toBe(650);
  });

  it('I: week start is the Monday of that week', () => {
    expect(weekStartOf('2026-09-12')).toBe('2026-09-07'); // Saturday -> Monday
    expect(weekStartOf('2026-09-07')).toBe('2026-09-07'); // Monday stays
    expect(weekStartOf('2026-09-13')).toBe('2026-09-07'); // Sunday -> same week
  });
});

describe('Stage 5 — training programme', () => {
  it('J: the programme is six weeks and the first has no trading in it', () => {
    expect(TRAINING_WEEKS).toHaveLength(6);
    expect(TRAINING_WEEKS[0].targets.paperTrades).toBeUndefined();
    expect(TRAINING_WEEKS[0].activities.join(' ')).toContain('Do not plan a single trade');
  });

  it('K: graduation needs every behavioural check, not a profit figure', () => {
    const r = assessGraduation(graduationBase);
    expect(r.status).toBe('READY_FOR_SMALL_LIVE');
    const labels = r.checks.map((c) => c.label.toLowerCase()).join(' ');
    expect(labels).not.toContain('profit');
    expect(labels).not.toContain('win rate');
  });

  it('L: one widened stop blocks graduation however good the numbers are', () => {
    const r = assessGraduation({ ...graduationBase, stopsWidened: 1, expectancy: 2.5 });
    expect(r.status).not.toBe('READY_FOR_SMALL_LIVE');
    expect(r.checks.find((c) => c.label.includes('widened'))?.passed).toBe(false);
  });

  it('M: a profitable but undisciplined record is not ready', () => {
    const r = assessGraduation({
      ...graduationBase,
      rulesFollowedPct: 40,
      avgExecutionScore: 45,
      chasedEntries: 6,
      journaledPct: 30,
      weeklyReviews: 0,
      expectancy: 1.8,
    });
    expect(r.status).toBe('NOT_READY');
  });

  it('N: readiness is never phrased as a promise', () => {
    const r = assessGraduation(graduationBase);
    expect(r.caveat).toContain('not your future results');
    expect(r.headline).toContain('consider');
  });

  it('O: too small a sample cannot graduate', () => {
    const r = assessGraduation({ ...graduationBase, closedPaperTrades: 4, expectancy: null });
    expect(r.status).not.toBe('READY_FOR_SMALL_LIVE');
  });

  it('P: the daily checklist only completes when every item is ticked', () => {
    const empty = {
      market_condition_checked: false,
      earnings_checked: false,
      heat_room_checked: false,
      stop_defined: false,
      size_calculated: false,
    };
    expect(checklistComplete(empty)).toBe(false);
    expect(checklistProgress(empty)).toBe(0);

    const partial = { ...empty, stop_defined: true, size_calculated: true };
    expect(checklistProgress(partial)).toBe(40);

    const full = CHECKLIST_ITEMS.reduce((acc, i) => ({ ...acc, [i.key]: true }), empty);
    expect(checklistComplete(full)).toBe(true);
    expect(checklistProgress(full)).toBe(100);
  });

  it('Q: week completion measures only the targets that week sets', () => {
    const progress = {
      lessons_completed: 2,
      charts_analyzed: 10,
      setups_analyzed: 0,
      candidates_built: 0,
      paper_trades_taken: 0,
    };
    expect(weekCompletion(TRAINING_WEEKS[0], progress)).toBe(50);
    expect(weekCompletion(TRAINING_WEEKS[3], progress)).toBe(0);
  });

  it('R: CSV export escapes commas and quotes', () => {
    const csv = toCsv(['symbol', 'note'], [{ symbol: 'AAPL', note: 'gapped, badly "again"' }]);
    expect(csv.split('\n')[0]).toBe('symbol,note');
    expect(csv).toContain('"gapped, badly ""again"""');
  });
});
