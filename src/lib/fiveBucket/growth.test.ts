import { describe, it, expect } from 'vitest';
import { bucketGrowth } from './growth';

describe('bucket growth', () => {
  it('starts at actual $1,200 and excludes the unconfirmed October $1,071.45', () => {
    const rows = bucketGrowth([{ month: '2026-10-01', amounts: { emergency: 1071.45 } }, { month: '2026-11-01', amounts: { emergency: 1178.59, guilt: 294.65 } }], { emergency: 1200 }, '2026-11-01', 1, false);
    expect(rows[0].balances.emergency).toBe(237859);
    expect(rows[0].cumulative.guilt).toBe(29465);
  });
  it('does not invent contributions in gaps; repeats only beyond saved history when requested', () => {
    const saved = [{ month: '2026-11-01', amounts: { emergency: 100 } }, { month: '2027-01-01', amounts: { emergency: 200 } }];
    const rows = bucketGrowth(saved, {}, '2026-11-01', 4, true);
    expect(rows.map(r => r.deposits.emergency)).toEqual([10000, 0, 20000, 20000]);
    expect(rows[3].assumed).toBe(true);
    expect(bucketGrowth(saved, {}, '2026-11-01', 4, false)[3].deposits.emergency).toBe(0);
  });
});