import { BUCKETS, toCents, type BucketKey } from './engine';

export interface FundingMonth { month: string; amounts: Partial<Record<BucketKey, number>> }
export function bucketGrowth(saved: FundingMonth[], opening: Partial<Record<BucketKey, number>>, start: string, count: number, repeat: boolean) {
  const balances = Object.fromEntries(BUCKETS.map(b => [b.key, toCents(opening[b.key] || 0)])) as Record<BucketKey, number>;
  const cumulative = Object.fromEntries(BUCKETS.map(b => [b.key, 0])) as Record<BucketKey, number>;
  const ordered = [...saved].filter(r => r.month >= start).sort((a, b) => a.month.localeCompare(b.month));
  const last = ordered.at(-1);
  const date = new Date(start + 'T00:00:00Z');
  return Array.from({ length: count }, (_, i) => {
    const month = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + i, 1)).toISOString().slice(0, 10);
    const row = ordered.find(r => r.month === month);
    const assumed = !row && repeat && Boolean(last && month > last.month);
    const amounts = row?.amounts || (assumed ? last?.amounts : {}) || {};
    const deposits = {} as Record<BucketKey, number>;
    for (const b of BUCKETS) {
      deposits[b.key] = Math.max(0, toCents(amounts[b.key] || 0));
      balances[b.key] += deposits[b.key]; cumulative[b.key] += deposits[b.key];
    }
    return { month, assumed, saved: Boolean(row), deposits, balances: { ...balances }, cumulative: { ...cumulative } };
  });
}