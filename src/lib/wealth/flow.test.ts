import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ASSUMPTIONS,
  applyStrategy,
  monthlyRateFrom,
  releaseMonthAfterFinalPayment,
  releaseMonthFromEffectiveDate,
  runFlow,
} from './sourceOfFunds';
import { MONTGOMERY_TIMELINE, buildEventTimeline } from './eventTimeline';
import { defaultRefundYears, evaluateRefundPool, evaluateRefundYear } from './taxRefundPool';

const refunds = evaluateRefundPool(defaultRefundYears());
const timeline = { ...MONTGOMERY_TIMELINE, refunds };
const input = buildEventTimeline(timeline);
const a = { ...DEFAULT_ASSUMPTIONS, includeHsa: true };
const run = (months: number) => runFlow(input, a, 8, months);

const at = (months: number, month: string) => run(months).months.find((m) => m.month === month)!;

describe('release timing', () => {
  it('releases a debt payment the month after its final payment', () => {
    expect(releaseMonthAfterFinalPayment('2026-12-10')).toBe('2027-01');
    expect(releaseMonthAfterFinalPayment('2026-12-30')).toBe('2027-01');
  });

  it('uses an explicit effective date as-is', () => {
    expect(releaseMonthFromEffectiveDate('2027-05-01')).toBe('2027-05');
  });

  it('has BetrLink and True Accord freed cash live in January 2027', () => {
    const jan = at(12, '2027-01');
    // 1832.05 baseline + 583 + 136.14
    expect(jan.flexibleAvailable).toBeCloseTo(2551.19, 2);
  });

  it('adds Capital One $50 from May 2027 only', () => {
    const res = run(12);
    const apr = res.months.find((m) => m.month === '2027-04')!;
    const may = res.months.find((m) => m.month === '2027-05')!;
    expect(may.flexibleAvailable - apr.flexibleAvailable).toBeCloseTo(50, 2);
    expect(may.flexibleAvailable).toBeCloseTo(2601.19, 2);
  });
});

describe('core contributions', () => {
  it('keeps retirement and HSA running while the buffer is below target', () => {
    const res = run(6);
    const below = res.months.filter((m) => m.bufferBalance < a.bufferTarget);
    expect(below.length).toBeGreaterThan(0);
    for (const m of below) expect(m.coreTotal).toBeGreaterThan(0);
  });

  it('posts employer HSA only in January and June', () => {
    const res = run(24);
    const withEr = res.months.filter((m) => (m.core.employer_hsa || 0) > 0);
    const months = new Set(withEr.map((m) => Number(m.month.split('-')[1])));
    expect([...months].sort()).toEqual([1, 6]);
    expect(withEr.every((m) => m.core.employer_hsa === 1000)).toBe(true);
  });

  it('adds each 3% raise once, compounding from the new salary', () => {
    const res = run(36);
    const jul27 = res.months.find((m) => m.month === '2027-07')!;
    const jun27 = res.months.find((m) => m.month === '2027-06')!;
    expect((jul27.core.raise || 0) - (jun27.core.raise || 0)).toBeCloseTo(177.35, 1);
    const jul28 = res.months.find((m) => m.month === '2028-07')!;
    // second raise increment is 3% of the raised salary
    expect((jul28.core.raise || 0) - (jul27.core.raise || 0)).toBeCloseTo(182.67, 1);
  });
});

describe('buffer', () => {
  it('never funds past the target and releases the excess the same month', () => {
    const res = run(60);
    for (const m of res.months) expect(m.bufferBalance).toBeLessThanOrEqual(a.bufferTarget + 0.01);
    const capped = res.months.find((m) => m.releases.some((r) => /Buffer reached/.test(r.label)));
    expect(capped).toBeTruthy();
  });

  it('stops the monthly buffer contribution once the target is reached', () => {
    const res = run(60);
    const full = res.months.findIndex((m) => m.bufferBalance >= a.bufferTarget - 0.01);
    expect(full).toBeGreaterThanOrEqual(0);
    for (const m of res.months.slice(full + 1)) expect(m.bufferAllocation).toBe(0);
  });
});

describe('debts', () => {
  it('never counts loan payments as investing', () => {
    const jan = at(12, '2027-01');
    expect(jan.debtAllocation).toBeGreaterThan(0);
    expect(jan.investedTotal).toBeCloseTo(jan.coreTotal + jan.netInvestableFreedCash, 2);
  });

  it('applies the SBA acceleration from June 2027', () => {
    const res = run(12);
    const may = res.months.find((m) => m.month === '2027-05')!;
    const jun = res.months.find((m) => m.month === '2027-06')!;
    expect((jun.debtByLoan.sba || 0) - (may.debtByLoan.sba || 0)).toBeCloseTo(100, 0);
  });

  it('removes the liability at PSLF forgiveness without adding assets', () => {
    const res = run(84);
    const forgiven = res.months.find((m) => m.month === '2032-06')!;
    const prev = res.months.find((m) => m.month === '2032-05')!;
    // the student loan payment stops
    expect(forgiven.debtByLoan['student-loan'] ?? 0).toBe(0);
    expect(prev.debtByLoan['student-loan']).toBeGreaterThan(0);
    // no jump in balance beyond the normal contribution and growth
    expect(forgiven.ending - prev.ending).toBeLessThan(prev.investedTotal + prev.growth + 2000);
  });

  it('splits the released PSLF payment: $219 to SBA, $171 to the next priority', () => {
    const res = run(84);
    const jul32 = res.months.find((m) => m.month === '2032-07');
    if (jul32) {
      // SBA payment rose by 219 unless the SBA was already paid off
      const sbaPaidOff = res.months
        .slice(0, res.months.indexOf(jul32))
        .some((m) => m.releases.some((r) => /SBA/.test(r.label)));
      if (!sbaPaidOff) expect(jul32.debtByLoan.sba || 0).toBeGreaterThan(240);
      expect(jul32.flexibleByCategory.released_debt || 0).toBeGreaterThanOrEqual(171 - 0.01);
    }
  });

  it('releases the SBA payment that was actually active at payoff', () => {
    const res = run(180);
    const idx = res.months.findIndex((m) => m.releases.some((r) => /SBA loan ended/.test(r.label)));
    expect(idx).toBeGreaterThan(0);
    const payoff = res.months[idx];
    const amount = payoff.releases.find((r) => /SBA loan ended/.test(r.label))!.amount;
    // the release equals the payment the month before payoff, whatever accelerations applied
    expect(amount).toBeCloseTo(res.months[idx - 1].debtByLoan.sba || 0, 0);
    expect(amount).toBeGreaterThan(148);
  });
});

describe('reconciliation and counts', () => {
  it('balances sources and destinations every month', () => {
    const res = run(300);
    expect(res.reconciliationErrors).toHaveLength(0);
  });

  it('runs exactly 300 months for 25 years and 360 for 30', () => {
    expect(run(25 * 12).monthCount).toBe(300);
    expect(run(30 * 12).monthCount).toBe(360);
  });

  it('reconciles starting assets + contributions + growth to the ending balance', () => {
    const res = run(300);
    expect(res.startingAssets + res.contributions + res.growth).toBeCloseTo(res.ending, 0);
  });

  it('includes the HSA balance whenever HSA contributions are counted', () => {
    const res = run(24);
    const hsaIn = (res.byCategory.employee_hsa || 0) + (res.byCategory.employer_hsa || 0);
    expect(hsaIn).toBeGreaterThan(0);
    expect(res.endingByBucket.hsa).toBeGreaterThan(0);
  });

  it('leaves HSA money out entirely when the HSA is excluded', () => {
    const res = runFlow(input, { ...a, includeHsa: false }, 8, 24);
    expect(res.byCategory.employee_hsa).toBe(0);
    expect(res.endingByBucket.hsa).toBe(0);
  });

  it('uses monthly compounding from the annual return', () => {
    expect(monthlyRateFrom(8)).toBeCloseTo(Math.pow(1.08, 1 / 12) - 1, 12);
  });
});

describe('temporary and reversed freed cash', () => {
  it('stops a temporary saving at its end date', () => {
    const t = {
      ...timeline,
      freedCashEvents: [
        {
          id: 'fc-temp',
          label: 'Paused gym',
          monthly: 100,
          effectiveDate: '2027-01-01',
          endDate: '2027-06-30',
          status: 'confirmed' as const,
        },
      ],
    };
    const res = runFlow(buildEventTimeline(t), a, 8, 12);
    const jun = res.months.find((m) => m.month === '2027-06')!;
    const jul = res.months.find((m) => m.month === '2027-07')!;
    expect(jun.flexibleAvailable - jul.flexibleAvailable).toBeCloseTo(100, 2);
  });

  it('stops savings when a cancelled service is reactivated', () => {
    const t = {
      ...timeline,
      freedCashEvents: [
        {
          id: 'fc-rev',
          label: 'Cancelled streaming',
          monthly: 60,
          effectiveDate: '2027-01-01',
          reactivationDate: '2027-04-01',
          status: 'confirmed' as const,
        },
      ],
    };
    const res = runFlow(buildEventTimeline(t), a, 8, 12);
    const mar = res.months.find((m) => m.month === '2027-03')!;
    const apr = res.months.find((m) => m.month === '2027-04')!;
    expect(mar.flexibleAvailable - apr.flexibleAvailable).toBeCloseTo(60, 2);
  });
});

describe('tax refund pool', () => {
  it('never lets assignments exceed the refund', () => {
    const r = evaluateRefundYear({
      year: 2027,
      refundAmount: 2500,
      status: 'estimated',
      assignments: [
        { id: 'b', destination: 'buffer', amount: 2000 },
        { id: 'i', destination: 'investing', amount: 1000 },
      ],
    });
    expect(r.overAllocated).toBeCloseTo(500, 2);
    // investing may only use what the buffer left behind
    expect(r.investingMonthly).toBeCloseTo(500 / 12, 4);
  });

  it('spreads a valid investing redirect monthly', () => {
    const r = evaluateRefundYear({
      year: 2027,
      refundAmount: 3000,
      status: 'estimated',
      assignments: [
        { id: 'b', destination: 'buffer', amount: 2000 },
        { id: 'i', destination: 'investing', amount: 1000 },
      ],
    });
    expect(r.overAllocated).toBe(0);
    expect(r.investingMonthly).toBeCloseTo(83.33, 2);
  });
});

describe('strategies', () => {
  it('confirmed core excludes freed cash', () => {
    const core = applyStrategy(input, 'core', a.startMonth);
    expect(core.events.every((e) => e.flow === 'core')).toBe(true);
    const res = runFlow(core, a, 8, 12);
    expect(res.byCategory.freed_cash).toBe(0);
  });

  it('maximum redirect capacity invests more than the planned strategy', () => {
    const max = runFlow(applyStrategy(input, 'max', a.startMonth), a, 8, 300);
    const planned = runFlow(input, a, 8, 300);
    expect(max.ending).toBeGreaterThan(planned.ending);
  });

  it("today's active contributions excludes future events", () => {
    const today = applyStrategy(input, 'today', a.startMonth);
    expect(today.events.some((e) => e.id === 'sched-2028-06')).toBe(false);
  });
});
