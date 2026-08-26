import { supabase } from '@/integrations/supabase/client';

export type AuditSource = 'merchant_alias' | 'manual' | 'auto_categorize' | 'normalize_merchant' | 'transfer_rule';

export interface AuditEntryInput {
  householdId: string;
  transactionId: string;
  source: AuditSource;
  ruleKey: string;
  ruleName: string;
  beforeMerchant?: string | null;
  afterMerchant?: string | null;
  beforeCategoryId?: string | null;
  beforeCategoryName?: string | null;
  afterCategoryId?: string | null;
  afterCategoryName?: string | null;
  txnDate?: string | null;
  amount?: number | null;
}

/**
 * Records rule-driven changes to transactions so the Categorization Audit screen
 * can show which rule touched which transaction, with before/after values.
 * Never throws — logging must not break the underlying fix.
 */
export async function logCategorizationAudit(entries: AuditEntryInput[]): Promise<void> {
  if (!entries.length) return;
  try {
    const { data: auth } = await supabase.auth.getUser();
    const rows = entries.map((e) => ({
      household_id: e.householdId,
      transaction_id: e.transactionId,
      source: e.source,
      rule_key: e.ruleKey,
      rule_name: e.ruleName,
      before_merchant: e.beforeMerchant ?? null,
      after_merchant: e.afterMerchant ?? null,
      before_category_id: e.beforeCategoryId ?? null,
      before_category_name: e.beforeCategoryName ?? null,
      after_category_id: e.afterCategoryId ?? null,
      after_category_name: e.afterCategoryName ?? null,
      txn_date: e.txnDate ?? null,
      amount: e.amount ?? null,
      applied_by: auth?.user?.id ?? null,
    }));
    await supabase.from('categorization_audit').insert(rows);
  } catch (err) {
    console.warn('categorization audit log failed', err);
  }
}
