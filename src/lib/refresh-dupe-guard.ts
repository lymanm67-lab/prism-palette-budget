import { supabase } from '@/integrations/supabase/client';

/**
 * Merchants that legitimately post multiple identical same-day charges
 * (Lovable AI credit top-ups), so they must never be flagged as duplicates.
 */
const DUPE_GUARD_EXEMPT = [/lovabl/i, /vabl/i, /movabl/i];
export const NOT_DUPLICATE_TAG = 'not_duplicate';

export function isDupeGuardExempt(merchant?: string | null): boolean {
  const m = String(merchant || '');
  return DUPE_GUARD_EXEMPT.some((p) => p.test(m));
}

export interface RefreshDupeTxn {
  id: string;
  date: string;
  amount: number;
  merchant: string | null;
  provider_transaction_id: string | null;
  created_at: string;
  account_id: string | null;
  needs_review: boolean;
  tags: string[] | null;
}

export interface RefreshDupeGroup {
  key: string;
  date: string;
  amount: number;
  account_id: string | null;
  txns: RefreshDupeTxn[]; // sorted oldest first; [0] is the kept original
}

const DAY = 86400000;

/**
 * Group same-account, same-amount charges within 3 days of each other.
 * Merchant text and bank IDs are ignored on purpose: pending→posted changes
 * rewrite both. Rows tagged not_duplicate and Lovable charges are skipped.
 */
export function groupRefreshDuplicates(rows: RefreshDupeTxn[]): RefreshDupeGroup[] {
  const eligible = rows.filter(
    (t) => !isDupeGuardExempt(t.merchant) && !(t.tags || []).includes(NOT_DUPLICATE_TAG),
  );
  const buckets = new Map<string, RefreshDupeTxn[]>();
  for (const t of eligible) {
    const k = `${t.account_id || ''}|${Math.abs(Number(t.amount)).toFixed(2)}`;
    buckets.set(k, [...(buckets.get(k) || []), t]);
  }
  const groups: RefreshDupeGroup[] = [];
  for (const [k, list] of buckets) {
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date) || a.created_at.localeCompare(b.created_at));
    let cur: RefreshDupeTxn[] = [];
    const flush = () => {
      if (cur.length > 1) {
        const sortedCur = [...cur].sort((a, b) => a.created_at.localeCompare(b.created_at));
        groups.push({ key: `${k}|${cur[0].date}`, date: cur[0].date, amount: Number(cur[0].amount), account_id: cur[0].account_id, txns: sortedCur });
      }
    };
    for (const t of sorted) {
      if (cur.length && Date.parse(t.date) - Date.parse(cur[0].date) > 3 * DAY) {
        flush();
        cur = [];
      }
      cur.push(t);
    }
    flush();
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

export async function fetchRefreshDuplicateGroups(householdId: string, days = 60): Promise<RefreshDupeGroup[]> {
  const since = new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('transactions')
    .select('id, date, amount, merchant, provider_transaction_id, created_at, account_id, needs_review, tags')
    .eq('household_id', householdId)
    .is('deleted_at', null)
    .eq('is_transfer', false)
    .gte('date', since)
    .limit(5000);
  if (error || !data) return [];
  return groupRefreshDuplicates(data as RefreshDupeTxn[]);
}

/** Flags the extra copies for review (never deletes). Returns number newly flagged. */
export async function flagRefreshDuplicates(householdId: string, days = 60): Promise<number> {
  const groups = await fetchRefreshDuplicateGroups(householdId, days);
  const ids = groups.flatMap((g) => g.txns.slice(1).filter((t) => !t.needs_review).map((t) => t.id));
  if (!ids.length) return 0;
  const { error } = await supabase.from('transactions').update({ needs_review: true }).in('id', ids);
  return error ? 0 : ids.length;
}

/** "Extra payment — keep both": tag every row so it's never flagged again. */
export async function markGroupNotDuplicate(group: RefreshDupeGroup): Promise<void> {
  for (const t of group.txns) {
    const tags = Array.from(new Set([...(t.tags || []), NOT_DUPLICATE_TAG]));
    const { error } = await supabase.from('transactions').update({ tags, needs_review: false }).eq('id', t.id);
    if (error) throw error;
  }
}
