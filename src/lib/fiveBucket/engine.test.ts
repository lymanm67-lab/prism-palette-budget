import { describe, it, expect } from 'vitest';
import { BASELINE, surplusCents, exampleSplit, targets, project, vacationSlice, milestoneDates } from './engine';

describe('five-bucket engine acceptance', () => {
  const ex = exampleSplit(BASELINE);
  it('surplus = $1,773', () => expect(surplusCents(BASELINE)).toBe(177300));
  it('investing $886.50', () => expect(ex.retire).toBe(88650));
  it('housing $177.30', () => expect(ex.housing).toBe(17730));
  it('guilt free $88.65', () => expect(ex.guilt).toBe(8865));
  it('vacation ~$416.67', () => expect(ex.vacation).toBe(41667));
  it('emergency $203.88', () => expect(ex.emergency).toBe(20388));
  it('total $1,773', () =>
    expect(ex.retire + ex.housing + ex.guilt + ex.vacation + ex.emergency).toBe(177300));
  it('targets', () => {
    const t = targets(BASELINE);
    expect(t.three).toBe(762456);
    expect(t.six).toBe(1524912);
  });
  it('starter counted once: before 3mo all surplus goes to emergency', () => {
    const r = project(BASELINE, 1)[0];
    expect(r.alloc.emergency).toBe(177300);
    expect(r.closing.emergency).toBe(90000 + 177300);
  });
  it('vacation year sums to exactly $5,000', () => {
    let s = 0;
    for (let k = 0; k < 12; k++) s += vacationSlice(500000, k);
    expect(s).toBe(500000);
  });
  it('planned spending reduces cash', () => {
    const a = project({ ...BASELINE, vacationTripAmount: 0 }, 24);
    const b = project({ ...BASELINE, vacationTripAmount: 3000 }, 24);
    expect(b[23].closing.vacation).toBeLessThan(a[23].closing.vacation);
  });
  it('milestones move with expenses', () => {
    const a = milestoneDates(BASELINE, project(BASELINE));
    const hi = { ...BASELINE, expenses: 3000 };
    const b = milestoneDates(hi, project(hi));
    expect(a.three).not.toBe(b.three);
  });
  it('allocations never exceed available', () => {
    for (const r of project(BASELINE)) {
      const s = r.alloc.retire + r.alloc.emergency + r.alloc.vacation + r.alloc.housing + r.alloc.guilt;
      expect(s).toBe(r.available);
    }
  });
});
