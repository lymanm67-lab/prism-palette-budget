import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { logCategorizationAudit } from '@/lib/categorization-audit';
import {
  buildRulePlan,
  type CategoryRule,
  type NormalizationRule,
  type ProposedChange,
  type TxnLite,
} from '@/lib/rules-engine';

export interface CategoryLite {
  id: string;
  name: string;
}

export interface RulesBundle {
  normalizations: NormalizationRule[];
  categoryRules: CategoryRule[];
  categories: CategoryLite[];
}

/** All normalization + category rules that apply to this household. */
export function useRules() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['rules-manager', household?.id],
    enabled: !!household,
    queryFn: async (): Promise<RulesBundle> => {
      if (!household) return { normalizations: [], categoryRules: [], categories: [] };
      const [norms, cats, catRules] = await Promise.all([
        supabase
          .from('merchant_normalizations')
          .select('id, raw_pattern, normalized_name, is_global, household_id')
          .or(`household_id.eq.${household.id},is_global.eq.true`)
          .order('raw_pattern'),
        supabase
          .from('categories')
          .select('id, name')
          .eq('household_id', household.id)
          .order('name'),
        supabase
          .from('categorization_rules')
          .select('id, merchant_pattern, category_id, is_ai_generated, match_count')
          .eq('household_id', household.id)
          .order('merchant_pattern'),
      ]);
      if (norms.error) throw norms.error;
      if (cats.error) throw cats.error;
      if (catRules.error) throw catRules.error;
      return {
        normalizations: (norms.data || []) as NormalizationRule[],
        categoryRules: (catRules.data || []) as CategoryRule[],
        categories: (cats.data || []) as CategoryLite[],
      };
    },
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  ['rules-manager', 'rule-plan', 'transactions', 'cleanup-candidates', 'categorization-audit', 'budgets', 'reports', 'finance-data'].forEach(
    (k) => qc.invalidateQueries({ queryKey: [k] })
  );
}

export function useSaveNormalization() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; raw_pattern: string; normalized_name: string }) => {
      if (!household) throw new Error('No household');
      if (input.id) {
        const { error } = await supabase
          .from('merchant_normalizations')
          .update({ raw_pattern: input.raw_pattern, normalized_name: input.normalized_name })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('merchant_normalizations').insert({
          household_id: household.id,
          raw_pattern: input.raw_pattern,
          normalized_name: input.normalized_name,
          is_global: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useSaveCategoryRule() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id?: string; merchant_pattern: string; category_id: string }) => {
      if (!household) throw new Error('No household');
      if (input.id) {
        const { error } = await supabase
          .from('categorization_rules')
          .update({ merchant_pattern: input.merchant_pattern, category_id: input.category_id })
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('categorization_rules').insert({
          household_id: household.id,
          merchant_pattern: input.merchant_pattern,
          category_id: input.category_id,
          is_ai_generated: false,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { table: 'merchant_normalizations' | 'categorization_rules'; id: string }) => {
      const { error } = await supabase.from(input.table).delete().eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(qc),
  });
}

/** Dry-run: what would re-running every rule change? */
export function useRulePlan(rangeDays = 365) {
  const { household } = useHousehold();
  const { data: rules } = useRules();
  return useQuery({
    queryKey: ['rule-plan', household?.id, rangeDays, rules?.normalizations.length, rules?.categoryRules.length],
    enabled: !!household && !!rules,
    queryFn: async (): Promise<{ plan: ProposedChange[]; scanned: number }> => {
      if (!household || !rules) return { plan: [], scanned: 0 };
      const since = new Date();
      since.setDate(since.getDate() - rangeDays);

      const txns: TxnLite[] = [];
      let from = 0;
      const PAGE = 1000;
      while (true) {
        const { data, error } = await supabase
          .from('transactions')
          .select('id, merchant, normalized_merchant, category_id, date, amount')
          .eq('household_id', household.id)
          .is('deleted_at', null)
          .gte('date', since.toISOString().slice(0, 10))
          .order('date', { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (!data?.length) break;
        txns.push(...(data as TxnLite[]));
        if (data.length < PAGE) break;
        from += PAGE;
      }

      const nameOf = (id: string | null) => rules.categories.find((c) => c.id === id)?.name || 'Uncategorized';
      return { plan: buildRulePlan(txns, rules.normalizations, rules.categoryRules, nameOf), scanned: txns.length };
    },
  });
}

/** Applies a set of proposed changes and records them in the audit trail. */
export function useApplyChanges() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const { data: rules } = useRules();
  return useMutation({
    mutationFn: async (changes: ProposedChange[]) => {
      if (!household) throw new Error('No household');
      const nameOf = (id: string | null) => rules?.categories.find((c) => c.id === id)?.name || 'Uncategorized';

      for (const c of changes) {
        const patch: Record<string, unknown> = {};
        if (c.afterMerchant && c.afterMerchant !== c.beforeMerchant) {
          patch.merchant = c.afterMerchant;
          patch.normalized_merchant = c.afterMerchant.toLowerCase();
        }
        if (c.afterCategoryId && c.afterCategoryId !== c.beforeCategoryId) {
          patch.category_id = c.afterCategoryId;
        }
        if (!Object.keys(patch).length) continue;
        const { error } = await supabase.from('transactions').update(patch).eq('id', c.txnId);
        if (error) throw error;
      }

      await logCategorizationAudit(
        changes.map((c) => ({
          householdId: household.id,
          transactionId: c.txnId,
          source: c.source,
          ruleKey: c.ruleKey,
          ruleName: c.ruleName,
          beforeMerchant: c.beforeMerchant,
          afterMerchant: c.afterMerchant ?? c.beforeMerchant,
          beforeCategoryId: c.beforeCategoryId,
          beforeCategoryName: nameOf(c.beforeCategoryId),
          afterCategoryId: c.afterCategoryId,
          afterCategoryName: nameOf(c.afterCategoryId),
          txnDate: c.date,
          amount: c.amount,
        }))
      );
      return changes.length;
    },
    onSuccess: () => invalidate(qc),
  });
}
