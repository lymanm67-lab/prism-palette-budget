import { describe, expect, it } from 'vitest';
import { BASELINE, surplusCents, project } from './engine';
import { budgetFunding, withBudgetFunding } from './budgetFunding';

describe('budget funding', () => {
  it('sends $1,307.43 to emergency first when starting savings are $900', () => {
    const result = budgetFunding(BASELINE, 1307.43, '2026-10-01');
    expect(result.allocation.emergency).toBe(130743);
    expect(result.total).toBe(130743);
    expect(result.allocation.retire).toBe(0);
  });
  it('keeps existing 50/10/5 splits and $416.67 vacation after the three-month milestone', () => {
    const result = budgetFunding({ ...BASELINE, startEmergency: 7624.56 }, 1773, '2026-10-01');
    expect(result.allocation.retire).toBe(88650);
    expect(result.allocation.housing).toBe(17730);
    expect(result.allocation.guilt).toBe(8865);
    expect(result.allocation.vacation).toBe(41667);
    expect(result.total).toBe(177300);
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