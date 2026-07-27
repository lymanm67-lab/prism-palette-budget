import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import {
  type BlueprintState,
  emptyBlueprint,
  DEFAULT_FOUNDATION,
  DEFAULT_WEALTH_ENGINE,
  DEFAULT_FUTURE_FUND,
} from '@/lib/budgeting/moneyBlueprint';

const sb = supabase as any;

// Household salary figures already established elsewhere in the app.
export const HOUSEHOLD_GROSS_ANNUAL = 208_940;
const NET_RATIO = 0.76; // take-home estimate after taxes + pre-tax deferrals

export function useMoneyBlueprint() {
  const { household } = useHousehold();
  return useQuery<{ id: string | null; state: BlueprintState }>({
    queryKey: ['spending_plan', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('spending_plans')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      if (!row) return { id: null, state: emptyBlueprint() };
      const base = emptyBlueprint();
      return {
        id: row.id,
        state: {
          name: row.name || base.name,
          balanceSheet: { ...base.balanceSheet, ...(row.balance_sheet || {}) },
          income: { ...base.income, ...(row.income || {}) },
          buckets: {
            foundation: row.buckets?.foundation?.length ? row.buckets.foundation : base.buckets.foundation,
            wealthEngine: row.buckets?.wealthEngine?.length ? row.buckets.wealthEngine : base.buckets.wealthEngine,
            futureFund: row.buckets?.futureFund?.length ? row.buckets.futureFund : base.buckets.futureFund,
          },
        },
      };
    },
  });
}

export function useSaveMoneyBlueprint() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state }: { id: string | null; state: BlueprintState }) => {
      const payload = {
        household_id: household!.id,
        name: state.name,
        balance_sheet: state.balanceSheet,
        income: state.income,
        buckets: state.buckets,
      };
      if (id) {
        const { error } = await sb.from('spending_plans').update(payload).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await sb.from('spending_plans').insert(payload).select('id').single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['spending_plan'] }),
  });
}

const GROUP_MAP: { key: string; test: RegExp }[] = [
  { key: 'rent', test: /rent|mortgage|housing/i },
  { key: 'utilities', test: /utilit|electric|water|internet|cable/i },
  { key: 'insurance', test: /insur/i },
  { key: 'transportation', test: /transport|auto|car|gas|fuel/i },
  { key: 'debt', test: /debt|loan|credit card/i },
  { key: 'groceries', test: /grocer|food/i },
  { key: 'clothes', test: /cloth|apparel/i },
  { key: 'phone', test: /phone|mobile|cell/i },
  { key: 'subscriptions', test: /subscri|streaming/i },
];

/** Live figures used to seed / re-sync the blueprint. */
export function useBlueprintPrefill() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['blueprint_prefill', household?.id],
    enabled: !!household,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const { data: txns } = await sb
        .from('transactions')
        .select('amount, categories(name, category_groups(name))')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .gte('date', since.toISOString().slice(0, 10))
        .lt('amount', 0)
        .limit(1000);

      const byKey = new Map<string, number>();
      for (const t of txns || []) {
        const label = `${(t as any).categories?.category_groups?.name || ''} ${(t as any).categories?.name || ''}`;
        const hit = GROUP_MAP.find((g) => g.test.test(label));
        if (!hit) continue;
        byKey.set(hit.key, (byKey.get(hit.key) || 0) + Math.abs(Number(t.amount) || 0));
      }

      const foundation = DEFAULT_FOUNDATION.map((r) => ({
        ...r,
        amount: Math.round(((byKey.get(r.key) || 0) / 3) * 100) / 100,
      }));

      return {
        foundation,
        wealthEngine: DEFAULT_WEALTH_ENGINE.map((r) => ({ ...r })),
        futureFund: DEFAULT_FUTURE_FUND.map((r) => ({ ...r })),
        income: {
          grossMonthly: Math.round((HOUSEHOLD_GROSS_ANNUAL / 12) * 100) / 100,
          netMonthly: Math.round(((HOUSEHOLD_GROSS_ANNUAL / 12) * NET_RATIO) * 100) / 100,
        },
      };
    },
  });
}
