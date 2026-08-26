import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export interface AuditRow {
  id: string;
  transaction_id: string | null;
  source: string;
  rule_key: string | null;
  rule_name: string;
  before_merchant: string | null;
  after_merchant: string | null;
  before_category_id: string | null;
  before_category_name: string | null;
  after_category_id: string | null;
  after_category_name: string | null;
  txn_date: string | null;
  amount: number | null;
  reverted_at: string | null;
  created_at: string;
}

export interface AuditRuleGroup {
  ruleKey: string;
  ruleName: string;
  source: string;
  lastRunAt: string;
  changed: number;
  reverted: number;
  totalAmount: number;
  rows: AuditRow[];
}

export function useCategorizationAudit(rangeDays = 180) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['categorization-audit', household?.id, rangeDays],
    enabled: !!household,
    queryFn: async (): Promise<AuditRuleGroup[]> => {
      if (!household) return [];
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);

      const rows: AuditRow[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('categorization_audit')
          .select(
            'id, transaction_id, source, rule_key, rule_name, before_merchant, after_merchant, before_category_id, before_category_name, after_category_id, after_category_name, txn_date, amount, reverted_at, created_at'
          )
          .eq('household_id', household.id)
          .gte('created_at', since.toISOString())
          .order('created_at', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        rows.push(...(data as AuditRow[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const groups = new Map<string, AuditRuleGroup>();
      for (const r of rows) {
        const key = `${r.source}::${r.rule_key || r.rule_name}`;
        let g = groups.get(key);
        if (!g) {
          g = {
            ruleKey: key,
            ruleName: r.rule_name,
            source: r.source,
            lastRunAt: r.created_at,
            changed: 0,
            reverted: 0,
            totalAmount: 0,
            rows: [],
          };
          groups.set(key, g);
        }
        g.rows.push(r);
        if (r.reverted_at) g.reverted += 1;
        else g.changed += 1;
        g.totalAmount += Math.abs(Number(r.amount || 0));
        if (r.created_at > g.lastRunAt) g.lastRunAt = r.created_at;
      }
      return [...groups.values()].sort((a, b) => (a.lastRunAt < b.lastRunAt ? 1 : -1));
    },
  });
}

/** Restores the "before" merchant + category on the transactions of an audit batch. */
export function useRevertAuditRows() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AuditRow[]) => {
      const targets = rows.filter((r) => !r.reverted_at && r.transaction_id);
      for (const r of targets) {
        const update: Record<string, unknown> = {};
        if (r.before_merchant !== r.after_merchant) {
          update.merchant = r.before_merchant;
          update.normalized_merchant = r.before_merchant ? r.before_merchant.toLowerCase() : null;
        }
        if (r.before_category_id !== r.after_category_id) {
          update.category_id = r.before_category_id;
        }
        if (Object.keys(update).length) {
          const { error } = await supabase.from('transactions').update(update).eq('id', r.transaction_id!);
          if (error) throw error;
        }
        const { error: auditError } = await supabase
          .from('categorization_audit')
          .update({ reverted_at: new Date().toISOString() })
          .eq('id', r.id);
        if (auditError) throw auditError;
      }
      return targets.length;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categorization-audit'] });
      qc.invalidateQueries({ queryKey: ['cleanup-candidates'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
}
