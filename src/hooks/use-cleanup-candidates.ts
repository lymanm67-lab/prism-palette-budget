import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  MERCHANT_ALIASES,
  TRANSFER_PATTERNS,
  SYSTEM_FEE_PATTERN,
  normalizeCategoryName,
} from '@/lib/cleanup-rules';

export interface TransferCandidate {
  id: string;
  date: string;
  merchant: string | null;
  amount: number;
  account_id: string;
  pairId?: string | null;
}

export interface NeedsReviewItem {
  id: string;
  date: string;
  merchant: string | null;
  amount: number;
  bucket: 'refund_pair' | 'system_fee' | 'other';
  pairWith?: string; // other tx id for refund pairs
}

export interface DuplicateBudgetGroup {
  normalizedName: string;
  groupId: string;
  categories: {
    id: string;
    name: string;
    txnCount: number;
    budgets: { id: string; month: string; planned_amount: number }[];
    totalPlanned: number;
  }[];
}

export interface MiscategorizedGroup {
  canonical: string;            // e.g. "Lovable"
  targetCategoryId: string;
  targetCategoryName: string;
  transactions: {
    id: string;
    date: string;
    merchant: string | null;
    amount: number;
    currentCategoryName: string | null;
    hasSplit: boolean;
  }[];
}

export interface CleanupCandidates {
  transfers: TransferCandidate[];
  needsReview: NeedsReviewItem[];
  duplicateBudgets: DuplicateBudgetGroup[];
  miscategorized: MiscategorizedGroup[];
  counts: { transfers: number; needsReview: number; duplicateBudgets: number; miscategorized: number };
}

const EMPTY: CleanupCandidates = {
  transfers: [],
  needsReview: [],
  duplicateBudgets: [],
  miscategorized: [],
  counts: { transfers: 0, needsReview: 0, duplicateBudgets: 0, miscategorized: 0 },
};

async function fetchAll(householdId: string): Promise<CleanupCandidates> {
  // Pull recent-ish transactions in 1k chunks (project convention)
  const all: any[] = [];
  let from = 0;
  const PAGE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('transactions')
      .select('id, date, merchant, amount, account_id, category_id, is_transfer, needs_review, deleted_at')
      .eq('household_id', householdId)
      .is('deleted_at', null)
      .order('date', { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data?.length) break;
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const { data: cats } = await supabase
    .from('categories')
    .select('id, name, group_id')
    .eq('household_id', householdId);

  const { data: budgets } = await supabase
    .from('budgets')
    .select('id, category_id, month, planned_amount')
    .eq('household_id', householdId);

  const { data: splits } = await supabase
    .from('transaction_splits')
    .select('transaction_id');

  const splitIds = new Set((splits || []).map((s: any) => s.transaction_id));
  const catById = new Map((cats || []).map((c: any) => [c.id, c]));

  // ----- Flow 1: transfers
  const transferCandidates: TransferCandidate[] = [];
  const nonTransferUncat = all.filter(
    (t) => !t.is_transfer && !t.category_id &&
      t.merchant && TRANSFER_PATTERNS.some((p) => p.test(t.merchant))
  );
  // Pair detection: same |amount|, same date, opposite signs
  const byKey = new Map<string, any[]>();
  for (const t of all.filter((t) => !t.is_transfer)) {
    const key = `${t.date}|${Math.abs(Number(t.amount)).toFixed(2)}`;
    const arr = byKey.get(key) || [];
    arr.push(t);
    byKey.set(key, arr);
  }
  const pairedIds = new Map<string, string>();
  for (const arr of byKey.values()) {
    if (arr.length === 2) {
      const [a, b] = arr;
      if (Math.sign(a.amount) !== Math.sign(b.amount)) {
        // both look like transfers if either matches pattern OR both uncategorized
        const aMatch = a.merchant && TRANSFER_PATTERNS.some((p) => p.test(a.merchant));
        const bMatch = b.merchant && TRANSFER_PATTERNS.some((p) => p.test(b.merchant));
        if (aMatch || bMatch) {
          pairedIds.set(a.id, b.id);
          pairedIds.set(b.id, a.id);
        }
      }
    }
  }
  const seen = new Set<string>();
  for (const t of nonTransferUncat) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    transferCandidates.push({
      id: t.id, date: t.date, merchant: t.merchant, amount: Number(t.amount),
      account_id: t.account_id, pairId: pairedIds.get(t.id) || null,
    });
  }
  // Add the paired counterparts even if they were categorized
  for (const [id, otherId] of pairedIds.entries()) {
    if (!seen.has(id)) {
      const t = all.find((x) => x.id === id);
      if (t && !t.is_transfer) {
        seen.add(id);
        transferCandidates.push({
          id: t.id, date: t.date, merchant: t.merchant, amount: Number(t.amount),
          account_id: t.account_id, pairId: otherId,
        });
      }
    }
  }

  // ----- Flow 2: needs review
  const needsReview: NeedsReviewItem[] = [];
  const flagged = all.filter((t) => t.needs_review);
  const flagKey = new Map<string, any[]>();
  for (const t of flagged) {
    const k = `${(t.merchant || '').toLowerCase()}|${t.date}|${Math.abs(Number(t.amount)).toFixed(2)}`;
    const arr = flagKey.get(k) || [];
    arr.push(t);
    flagKey.set(k, arr);
  }
  const handled = new Set<string>();
  for (const arr of flagKey.values()) {
    if (arr.length === 2 && Math.sign(arr[0].amount) !== Math.sign(arr[1].amount)) {
      for (const t of arr) {
        handled.add(t.id);
        needsReview.push({
          id: t.id, date: t.date, merchant: t.merchant, amount: Number(t.amount),
          bucket: 'refund_pair', pairWith: arr.find((x) => x.id !== t.id)!.id,
        });
      }
    }
  }
  for (const t of flagged) {
    if (handled.has(t.id)) continue;
    const isFee = t.merchant && SYSTEM_FEE_PATTERN.test(t.merchant);
    needsReview.push({
      id: t.id, date: t.date, merchant: t.merchant, amount: Number(t.amount),
      bucket: isFee ? 'system_fee' : 'other',
    });
  }

  // ----- Flow 3: duplicate budgets
  const byGroup = new Map<string, Map<string, any[]>>();
  for (const c of cats || []) {
    const normName = normalizeCategoryName(c.name);
    if (!byGroup.has(c.group_id)) byGroup.set(c.group_id, new Map());
    const m = byGroup.get(c.group_id)!;
    const arr = m.get(normName) || [];
    arr.push(c);
    m.set(normName, arr);
  }
  const txnCountByCat = new Map<string, number>();
  for (const t of all) {
    if (t.category_id) txnCountByCat.set(t.category_id, (txnCountByCat.get(t.category_id) || 0) + 1);
  }
  const budgetsByCat = new Map<string, any[]>();
  for (const b of budgets || []) {
    const arr = budgetsByCat.get(b.category_id) || [];
    arr.push(b);
    budgetsByCat.set(b.category_id, arr);
  }
  const duplicateBudgets: DuplicateBudgetGroup[] = [];
  for (const [groupId, m] of byGroup.entries()) {
    for (const [normName, arr] of m.entries()) {
      if (arr.length < 2) continue;
      duplicateBudgets.push({
        normalizedName: normName,
        groupId,
        categories: arr.map((c) => {
          const cBudgets = (budgetsByCat.get(c.id) || []).map((b) => ({
            id: b.id, month: b.month, planned_amount: Number(b.planned_amount || 0),
          }));
          return {
            id: c.id,
            name: c.name,
            txnCount: txnCountByCat.get(c.id) || 0,
            budgets: cBudgets,
            totalPlanned: cBudgets.reduce((s, b) => s + b.planned_amount, 0),
          };
        }),
      });
    }
  }

  // ----- Flow 4: miscategorized via alias map
  const miscategorized: MiscategorizedGroup[] = [];
  for (const alias of MERCHANT_ALIASES) {
    const target = (cats || []).find(
      (c: any) => c.name.toLowerCase() === alias.categoryName.toLowerCase()
    );
    if (!target) continue;
    const matches = all.filter(
      (t) => t.merchant && alias.pattern.test(t.merchant) && t.category_id !== target.id
    );
    if (!matches.length) continue;
    // De-dup so an alias isn't listed twice if multiple patterns share canonical
    const existing = miscategorized.find((g) => g.canonical === alias.canonical);
    const rows = matches.map((t) => {
      const cc = t.category_id ? catById.get(t.category_id) : null;
      return {
        id: t.id, date: t.date, merchant: t.merchant, amount: Number(t.amount),
        currentCategoryName: cc?.name ?? null,
        hasSplit: splitIds.has(t.id),
      };
    });
    if (existing) {
      const seenIds = new Set(existing.transactions.map((r) => r.id));
      for (const r of rows) if (!seenIds.has(r.id)) existing.transactions.push(r);
    } else {
      miscategorized.push({
        canonical: alias.canonical,
        targetCategoryId: target.id,
        targetCategoryName: target.name,
        transactions: rows,
      });
    }
  }

  return {
    transfers: transferCandidates,
    needsReview,
    duplicateBudgets,
    miscategorized,
    counts: {
      transfers: transferCandidates.length,
      needsReview: needsReview.length,
      duplicateBudgets: duplicateBudgets.length,
      miscategorized: miscategorized.reduce((s, g) => s + g.transactions.length, 0),
    },
  };
}

export function useCleanupCandidates() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['cleanup-candidates', household?.id],
    queryFn: () => (household ? fetchAll(household.id) : Promise.resolve(EMPTY)),
    enabled: !!household,
  });
}
