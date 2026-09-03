import { supabase } from '@/integrations/supabase/client';
import { clusterDuplicates, type DupeTxn } from '@/lib/duplicate-detector';

/**
 * Merchants that legitimately post multiple identical same-day charges
 * (Lovable AI credit top-ups), so they must never be flagged as duplicates.
 */
const DUPE_GUARD_EXEMPT = [/lovable/i, /movable\s+feast/i];

export function isDupeGuardExempt(merchant?: string | null): boolean {
  const m = String(merchant || '');
  return DUPE_GUARD_EXEMPT.some((p) => p.test(m));
}

/**
 * After a bank/brokerage refresh, scan recently synced transactions for
 * same-date + same-amount duplicates and flag the extra copies for review
 * (never deletes anything). Lovable charges are exempt.
 */
export async function flagRefreshDuplicates(householdId: string, days = 60): Promise<number> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, amount, merchant, provider_transaction_id, created_at, account_id, needs_review')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .gte('date', since);
  if (error || !data) return 0;

  const rows = (data as any[]).filter((t) => !isDupeGuardExempt(t.merchant));

  // Cluster per account + merchant so unrelated same-amount charges don't collide.
  const buckets = new Map<string, DupeTxn[]>();
  for (const t of rows) {
    const key = `${t.account_id || ''}|${String(t.merchant || '').toLowerCase().trim()}`;
    buckets.set(key, [...(buckets.get(key) || []), t as DupeTxn]);
  }

  const toFlag: string[] = [];
  for (const list of buckets.values()) {
    for (const cluster of clusterDuplicates(list)) {
      // Keep the earliest row, flag the extra copies.
      toFlag.push(...cluster.txns.slice(1).map((t) => t.id));
    }
  }

  const already = new Set(rows.filter((t) => t.needs_review).map((t) => t.id));
  const ids = toFlag.filter((id) => !already.has(id));
  if (!ids.length) return 0;

  const { error: upErr } = await supabase
    .from('transactions')
    .update({ needs_review: true })
    .in('id', ids);
  if (upErr) return 0;
  return ids.length;
}
