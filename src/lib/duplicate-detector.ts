import { supabase } from '@/integrations/supabase/client';

export interface DupeTxn {
  id: string;
  date: string;
  amount: number;
  merchant?: string | null;
  provider_transaction_id?: string | null;
  created_at?: string;
  account_id?: string;
  category_id?: string | null;
}

export interface DupeCluster {
  key: string;
  date: string;
  amount: number;
  txns: DupeTxn[];
  confirmed: boolean; // shared provider_transaction_id = true double-import
  score: number; // 0-100 confidence
  scoreLabel: 'Confirmed' | 'High' | 'Review';
}

/**
 * Confidence score for a same-date/same-amount cluster:
 *  - identical amount: +30 (guaranteed by grouping)
 *  - same-day timing: +20 (guaranteed by grouping)
 *  - shared provider identifiers across rows: +50 (bank-level proof of double import)
 */
export function scoreCluster(txns: DupeTxn[]): { score: number; confirmed: boolean; scoreLabel: DupeCluster['scoreLabel'] } {
  let score = 50; // identical amount (30) + same-day (20)
  const byProvider = new Map<string, number>();
  for (const t of txns) {
    if (!t.provider_transaction_id) continue;
    byProvider.set(t.provider_transaction_id, (byProvider.get(t.provider_transaction_id) || 0) + 1);
  }
  const confirmed = Array.from(byProvider.values()).some((n) => n > 1);
  if (confirmed) score += 50;
  const scoreLabel: DupeCluster['scoreLabel'] = confirmed ? 'Confirmed' : score >= 50 ? 'Review' : 'High';
  return { score, confirmed, scoreLabel };
}

export interface ScoreSignal {
  label: string;
  points: number;
  hit: boolean;
  detail: string;
}

/** Per-signal breakdown of a cluster's 0–100 confidence score. */
export function scoreBreakdown(cluster: Pick<DupeCluster, 'confirmed'>): ScoreSignal[] {
  return [
    { label: 'Identical amount', points: 30, hit: true, detail: 'Every charge in the cluster is for the exact same amount.' },
    { label: 'Same-day timing', points: 20, hit: true, detail: 'All charges posted on the same calendar day.' },
    {
      label: 'Shared bank provider ID',
      points: 50,
      hit: cluster.confirmed,
      detail: cluster.confirmed
        ? 'The same bank transaction ID appears more than once — proof of a double import.'
        : 'No shared bank IDs found — these are likely separate real purchases.',
    },
  ];
}

/** Group transactions into same-date, same-absolute-amount clusters (size > 1). */
export function clusterDuplicates(txns: DupeTxn[]): DupeCluster[] {
  const groups = new Map<string, DupeTxn[]>();
  for (const t of txns) {
    const key = `${t.date}|${Math.abs(t.amount).toFixed(2)}`;
    groups.set(key, [...(groups.get(key) || []), t]);
  }
  return Array.from(groups.entries())
    .filter(([, g]) => g.length > 1)
    .map(([key, g]) => {
      const sorted = [...g].sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
      const { score, confirmed, scoreLabel } = scoreCluster(sorted);
      const [date, amount] = key.split('|');
      return { key, date, amount: parseFloat(amount), txns: sorted, confirmed, score, scoreLabel };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** Rows to soft-delete inside a confirmed cluster: keep earliest per provider ID. */
export function confirmedDuplicateIds(cluster: DupeCluster): string[] {
  const byProvider = new Map<string, DupeTxn[]>();
  for (const t of cluster.txns) {
    if (!t.provider_transaction_id) continue;
    byProvider.set(t.provider_transaction_id, [...(byProvider.get(t.provider_transaction_id) || []), t]);
  }
  const out: string[] = [];
  for (const p of byProvider.values()) {
    if (p.length > 1) out.push(...p.slice(1).map((t) => t.id));
  }
  return out;
}

/** Soft-delete duplicate transactions and log each removal to the categorization audit. */
export async function softDeleteDuplicates(opts: {
  householdId: string;
  txns: DupeTxn[];
  ruleKey: string;
  ruleName: string;
  source?: string;
}): Promise<{ deleted: number; error?: string }> {
  const { householdId, txns, ruleKey, ruleName, source = 'duplicate-detector' } = opts;
  if (!txns.length) return { deleted: 0 };
  const ids = txns.map((t) => t.id);
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', ids);
  if (error) return { deleted: 0, error: error.message };
  const auditRows = txns.map((t) => ({
    household_id: householdId,
    transaction_id: t.id,
    rule_key: ruleKey,
    rule_name: ruleName,
    source,
    before_merchant: t.merchant ?? null,
    amount: t.amount,
    txn_date: t.date,
    applied_by: 'manual',
  }));
  await supabase.from('categorization_audit').insert(auditRows as never[]);
  return { deleted: ids.length };
}

/**
 * Given a flat set of transactions, return only the EXTRA copies that should be
 * soft-deleted: within each same-date/same-amount cluster the earliest row is always
 * kept. Confirmed clusters (shared provider ID) keep the earliest row per provider ID.
 * Never returns every member of a cluster, so a real charge can't disappear entirely.
 */
export function extraCopyIds(txns: DupeTxn[]): string[] {
  const out: string[] = [];
  for (const cluster of clusterDuplicates(txns)) {
    if (cluster.confirmed) {
      out.push(...confirmedDuplicateIds(cluster));
    } else {
      out.push(...cluster.txns.slice(1).map((t) => t.id));
    }
  }
  return out;
}
