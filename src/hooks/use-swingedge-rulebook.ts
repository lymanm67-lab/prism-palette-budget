// SwingEdge — the owner's rulebook, saved to the backend.
//
// First read seeds the built-in rules so a new owner starts with a sensible set
// they can then edit, switch off, or add their own sentences to.

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { defaultRuleSeeds, type RuleRow } from '@/lib/swingedge/rulebook';

const TABLE = 'se_trading_rules';

export interface RulePatch {
  id: string;
  enabled?: boolean;
  threshold?: number | null;
  custom_text?: string | null;
  sort_order?: number;
}

export function useTradingRules() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['se-trading-rules', householdId],
    enabled: !!householdId,
    staleTime: 30_000,
    queryFn: async (): Promise<RuleRow[]> => {
      const { data, error } = await supabase
        .from(TABLE)
        .select('id, rule_key, enabled, threshold, custom_text, sort_order')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('sort_order', { ascending: true });
      if (error) throw error;

      let rows = data ?? [];
      if (rows.length === 0) {
        const seeds = defaultRuleSeeds().map((s) => ({ ...s, household_id: householdId! }));
        const inserted = await supabase
          .from(TABLE)
          .insert(seeds)
          .select('id, rule_key, enabled, threshold, custom_text, sort_order');
        if (inserted.error) throw inserted.error;
        rows = inserted.data ?? [];
      }

      return rows.map((r) => ({
        id: String(r.id),
        rule_key: String(r.rule_key),
        enabled: r.enabled !== false,
        threshold: r.threshold === null || r.threshold === undefined ? null : Number(r.threshold),
        custom_text: r.custom_text ?? null,
        sort_order: Number(r.sort_order ?? 0),
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['se-trading-rules', householdId] });

  const update = useMutation({
    mutationFn: async (patch: RulePatch) => {
      const { id, ...rest } = patch;
      const { error } = await supabase.from(TABLE).update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const addCustom = useMutation({
    mutationFn: async (text: string) => {
      const nextOrder = (query.data ?? []).reduce((m, r) => Math.max(m, r.sort_order), 0) + 1;
      const { error } = await supabase.from(TABLE).insert({
        household_id: householdId!,
        rule_key: 'CUSTOM',
        custom_text: text.trim(),
        sort_order: nextOrder,
      });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from(TABLE)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    rules: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    updateRule: update.mutateAsync,
    addCustomRule: addCustom.mutateAsync,
    removeRule: remove.mutateAsync,
    isSaving: update.isPending || addCustom.isPending || remove.isPending,
  };
}

/** How many paper trades were opened today — used by the trades-per-day rule. */
export function useEntriesToday() {
  const { household } = useHousehold();
  const householdId = household?.id ?? null;
  const today = new Date().toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: ['se-entries-today', householdId, today],
    enabled: !!householdId,
    staleTime: 60_000,
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from('se_paper_trades')
        .select('id, entry_date')
        .eq('household_id', householdId!)
        .gte('entry_date', `${today}T00:00:00.000Z`);
      if (error) throw error;
      return (data ?? []).length;
    },
  });

  return useMemo(
    () => ({ count: query.data ?? null, isLoading: query.isLoading }),
    [query.data, query.isLoading],
  );
}
