import { describe, it, expect } from 'vitest';
import { computeCategoryRollover, computeMonthRollover, nextMonthBeginningRollover } from './rollover';
import { runLeftoverWaterfall, buildMonthEndClose, computeLeftoverCash } from './leftover';
import { runRolloverChecks } from './rolloverChecks';

describe('category rollover rules', () => {
  const base = { categoryId: 'c1', planned: 200, actual: 150 };

  it('reset releases unused money to the leftover pool', () => {
    const r = computeCategoryRollover({ ...base, rule: 'reset' });
    expect(r.rolledForward).toBe(0);
    expect(r.releasedToLeftover).toBe(50);
  });

  it('full carries the whole balance forward', () => {
    const r = computeCategoryRollover({ ...base, rule: 'full' });
    expect(r.rolledForward).toBe(50);
    expect(r.releasedToLeftover).toBe(0);
  });

  it('full carries overspending forward as negative', () => {
    const r = computeCategoryRollover({ ...base, actual: 260, rule: 'full' });
    expect(r.rolledForward).toBe(-60);
    expect(r.overspent).toBe(60);
  });

  it('sweep moves the balance to a destination', () => {
    const r = computeCategoryRollover({ ...base, rule: 'sweep', sweepDestination: 'debt_payoff' });
    expect(r.sweptAmount).toBe(50);
    expect(r.sweepDestination).toBe('debt_payoff');
  });

  it('hybrid keeps part and sweeps the rest', () => {
    const r = computeCategoryRollover({ ...base, rule: 'hybrid', keepAmount: 20, sweepDestination: 'buffer' });
    expect(r.rolledForward).toBe(20);
    expect(r.sweptAmount).toBe(30);
  });

  it('adds prior rollover to available money', () => {
    const r = computeCategoryRollover({ ...base, beginningRollover: 25, rule: 'full' });
    expect(r.available).toBe(225);
    expect(r.rolledForward).toBe(75);
  });

  it('totals a month and produces next month opening balances', () => {
    const month = computeMonthRollover([
      { categoryId: 'a', planned: 100, actual: 60, rule: 'full' },
      { categoryId: 'b', planned: 100, actual: 40, rule: 'sweep', sweepDestination: 'buffer' },
      { categoryId: 'c', planned: 100, actual: 120, rule: 'reset' },
    ]);
    expect(month.totalRolledForward).toBe(40);
    expect(month.totalSwept).toBe(60);
    expect(month.totalOverspent).toBe(20);
    expect(nextMonthBeginningRollover(month)).toEqual({ a: 40 });
  });
});

describe('leftover cash and sweep waterfall', () => {
  it('computes leftover cash from income, spending and transfers', () => {
    expect(computeLeftoverCash({ incomeReceived: 4405.02, actualSpending: 3456.7, actualTransfers: 0 })).toBe(948.32);
  });

  it('caps the buffer at its remaining need and leaves the rest unassigned', () => {
    const res = runLeftoverWaterfall(
      { incomeReceived: 5000, actualSpending: 4000, bufferBalance: 6800, bufferTarget: 7000 },
      [{ priority: 1, destination: 'buffer', mode: 'percent', amount: 100 }],
    );
    expect(res.allocations[0].amount).toBe(200);
    expect(res.unassignedCash).toBe(800);
  });

  it('follows rule order with fixed, percent and remainder modes', () => {
    const res = runLeftoverWaterfall(
      { incomeReceived: 5000, actualSpending: 4000, bufferBalance: 7000, bufferTarget: 7000 },
      [
        { priority: 1, destination: 'buffer', mode: 'percent', amount: 100 },
        { priority: 2, destination: 'debt_payoff', mode: 'fixed', amount: 300 },
        { priority: 3, destination: 'investing', mode: 'percent', amount: 20 },
        { priority: 4, destination: 'rollover_reserve', mode: 'remainder', amount: 0 },
      ],
    );
    expect(res.allocations.map((a) => [a.destination, a.amount])).toEqual([
      ['debt_payoff', 300],
      ['investing', 200],
      ['rollover_reserve', 500],
    ]);
    expect(res.unassignedCash).toBe(0);
  });

  it('does not distribute money already reserved by category rules', () => {
    const res = runLeftoverWaterfall(
      { incomeReceived: 2000, actualSpending: 1000, rolledForward: 400, categorySwept: 100 },
      [{ priority: 1, destination: 'investing', mode: 'remainder', amount: 0 }],
    );
    expect(res.distributable).toBe(500);
    expect(res.allocations[0].amount).toBe(500);
  });

  it('never returns negative unassigned cash', () => {
    const res = runLeftoverWaterfall(
      { incomeReceived: 1000, actualSpending: 1500 },
      [{ priority: 1, destination: 'investing', mode: 'fixed', amount: 500 }],
    );
    expect(res.leftoverCash).toBe(-500);
    expect(res.unassignedCash).toBe(0);
  });
});

describe('month-end close and checks', () => {
  it('balances leftover cash against carried, swept and unassigned money', () => {
    const rollover = computeMonthRollover([
      { categoryId: 'a', planned: 300, actual: 250, rule: 'full' },
      { categoryId: 'b', planned: 200, actual: 150, rule: 'sweep', sweepDestination: 'buffer' },
    ]);
    const close = buildMonthEndClose(
      '2026-09-01',
      {
        incomeReceived: 4405.02,
        actualSpending: 3456.7,
        rolledForward: rollover.totalRolledForward,
        categorySwept: rollover.totalSwept,
        bufferBalance: 6000,
        bufferTarget: 7000,
      },
      [{ priority: 1, destination: 'buffer', mode: 'remainder', amount: 0 }],
    );
    expect(close.leftoverCash).toBe(948.32);
    expect(close.totalRolledForward).toBe(50);
    expect(close.unassignedCash).toBe(0);

    const checks = runRolloverChecks({
      rollover,
      close,
      bufferBalance: 6000,
      bufferTarget: 7000,
      freedCashCategoryIds: [],
    });
    expect(checks.every((c) => c.ok)).toBe(true);
  });

  it('flags a Freed Cash category that also sweeps money', () => {
    const rollover = computeMonthRollover([
      { categoryId: 'fc', planned: 100, actual: 0, rule: 'sweep', sweepDestination: 'buffer' },
    ]);
    const close = buildMonthEndClose('2026-09-01', { incomeReceived: 100, actualSpending: 0, categorySwept: 100 }, []);
    const checks = runRolloverChecks({ rollover, close, freedCashCategoryIds: ['fc'] });
    expect(checks.find((c) => c.id === 'freed_cash_no_double_count')?.ok).toBe(false);
  });
});
