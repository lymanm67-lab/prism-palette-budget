import { describe, expect, it } from 'vitest';
import { BASELINE, surplusCents, project } from './engine';
import { budgetFunding, withBudgetFunding } from './budgetFunding';

describe('budget funding', () => {
  it('fills $346.31 / $196.04 / $307.17 / $383.76 and gives the rest of $1,620.11 to guilt-free', () => {
    const r = budgetFunding(BASELINE, 1620.11, '2026-10-01').allocation;
    expect([r.emergency, r.retire, r.vacation, r.housing, r.guilt]).toEqual([34631, 19604, 30717, 38376, 38683]);
  });
  it('fills buckets in order when money is short', () => {
    const r = budgetFunding(BASELINE, 500, '2026-10-01').allocation;
    expect([r.emergency, r.retire, r.vacation, r.guilt]).toEqual([34631, 15369, 0, 0]);
  });
  it('does not allocate a negative balance', () => {
    expect(budgetFunding(BASELINE, -50, '2026-10-01').total).toBe(0);
  });
  it.each([
    ['2026-11-01', 2946.47, [34631, 19604, 30717, 38376, 171319]],
    ['2026-12-01', 600.11, [34631, 19604, 5776, 0, 0]],
    ['2027-03-01', 993.05, [39722, 19861, 14896, 14896, 9930]],
    ['2027-01-01', 390.58, [15623, 7811, 5859, 5859, 3906]],
    ['2027-01-01', 2315.87, [92635, 46317, 34738, 34738, 23159]],
    ['2027-02-01', 390.58, [15623, 7811, 5859, 5859, 3906]],
    ['2027-03-01', 1417.93, [56717, 28359, 21269, 21269, 14179]],
    ['2027-04-01', 390.59, [15623, 7812, 5859, 5859, 3906]],
  ])('assigns all leftover for %s so the budget is zero', (month, leftover, expected) => {
    const { allocation } = budgetFunding(BASELINE, Number(leftover), String(month));
    const amounts = [allocation.emergency, allocation.retire, allocation.vacation, allocation.housing, allocation.guilt];
    expect(amounts).toEqual(expected);
    expect(Math.round(Number(leftover) * 100) - amounts.reduce((sum, value) => sum + value, 0)).toBe(0);
  });
  it('replaces surplus without subtracting $49 again or adding quarterly consulting twice', () => {
    const inputs = withBudgetFunding({ ...BASELINE, consultingEnabled: true }, 1307.43, '2026-09-01');
    expect(surplusCents(inputs)).toBe(130743);
    expect(project(inputs, 1)[0].available).toBe(130743);
    expect(project(inputs, 1)[0].consulting).toBe(0);
  });
  it('funds all five future buckets at 40/20/15/15/10 percent', () => {
    const a = budgetFunding(BASELINE, 100, '2027-05-01').allocation;
    expect([a.emergency, a.retire, a.vacation, a.housing, a.guilt]).toEqual([4000, 2000, 1500, 1500, 1000]);
  });
});