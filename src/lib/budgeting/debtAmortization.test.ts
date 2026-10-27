import { describe, expect, it } from 'vitest';
import { remainingPayoffSchedule } from './debtAmortization';

describe('Loan 3004 December–April estimate', () => {
  it('spreads the remaining balance over all five months after the October and revised November payments', () => {
    const rows = remainingPayoffSchedule(3084, 35.99, [228.47, 1228.47], new Date(2026, 11, 1), 5);
    expect(rows.map(r => r.month)).toEqual(['2026-12', '2027-01', '2027-02', '2027-03', '2027-04']);
    expect(rows.map(r => r.payment)).toEqual([394.77, 394.77, 394.77, 394.77, 394.76]);
    expect(rows[4]?.endingBalance).toBe(0);
    expect(rows.reduce((sum, r) => sum + Math.round(r.interest * 100), 0)).toBe(16587);
  });
});