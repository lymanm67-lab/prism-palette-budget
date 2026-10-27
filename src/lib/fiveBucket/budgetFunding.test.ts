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
  it('replaces surplus without subtracting $49 again or adding quarterly consulting twice', () => {
    const inputs = withBudgetFunding({ ...BASELINE, consultingEnabled: true }, 1307.43, '2026-09-01');
    expect(surplusCents(inputs)).toBe(130743);
    expect(project(inputs, 1)[0].available).toBe(130743);
    expect(project(inputs, 1)[0].consulting).toBe(0);
  });
});