import { describe, it, expect } from 'vitest';
import { upgradeLoanFor } from './debtActuals';
const u = (amount: number, date = '2026-10-01', merchant = 'Upgrade') => upgradeLoanFor({ date, amount: -amount, merchant });
describe('upgrade', () => { it('assigns', () => {
  expect(u(155.43)).toBe('2306'); expect(u(228.47)).toBe('3004');
  expect(u(708.43,'2026-11-30')).toBe('2306'); expect(u(1107.24,'2027-01-30')).toBe('3004');
  // FlexPay counts the same as Upgrade (per Lyman, Oct 30 2026).
  expect(u(228.47, '2026-10-30', 'Upgrade-FlexPay')).toBe('3004');
  expect(u(174.76, '2026-10-30', 'Upgrade-FlexPay')).toBe('3004');
});});
