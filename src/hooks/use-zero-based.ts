import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

const sb = supabase as any;

/** Generic household-scoped CRUD hook used by the zero-based ledgers. */
function useLedger<T extends Record<string, any>>(table: string, order: { column: string; asc?: boolean }) {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const key = [table, household?.id];

  const query = useQuery({
    queryKey: key,
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from(table)
        .select('*')
        .eq('household_id', household!.id)
        .order(order.column, { ascending: order.asc ?? true });
      if (error) throw error;
      return (data || []) as T[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: [table] });

  const create = useMutation({
    mutationFn: async (row: Partial<T>) => {
      const { data, error } = await sb
        .from(table)
        .insert({ ...row, household_id: household!.id })
        .select()
        .single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: invalidate,
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<T>) => {
      const { data, error } = await sb.from(table).update(patch).eq('id', id).select().single();
      if (error) throw error;
      return data as T;
    },
    onSuccess: invalidate,
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
      return id;
    },
    onSuccess: invalidate,
  });

  return { rows: query.data || [], isLoading: query.isLoading, create, update, remove };
}

export interface BufferMonthRow {
  id: string;
  month: string;
  starting_balance: number;
  additions: number;
  withdrawals: number;
  notes: string | null;
}

export interface BufferOneTimeRow {
  id: string;
  due_date: string;
  label: string;
  amount: number;
  source: string;
  is_paid: boolean;
  notes: string | null;
}

export interface BusinessExpenseRow {
  id: string;
  vendor: string;
  brand: string | null;
  purpose: string | null;
  tax_class: string;
  renewal_date: string | null;
  payment_method: string | null;
  entity: string | null;
  amount: number;
  frequency: string;
  is_owner_investment: boolean;
  is_active: boolean;
  notes: string | null;
}

export interface RecurringPurposeLineRow {
  id: string;
  label: string;
  purpose: string;
  amount: number;
  start_month: string;
  end_month: string | null;
  sort_order: number;
  notes: string | null;
}

export interface MoneyRedirectRow {
  id: string;
  source_label: string;
  source_amount: number;
  target_label: string;
  target_amount: number;
  target_purpose: string | null;
  start_month: string;
  end_month: string | null;
  status: string;
  trigger_type: string;
  group_key: string | null;
  sort_order: number;
  notes: string | null;
}

export const useBufferMonths = () => useLedger<BufferMonthRow>('buffer_ledger', { column: 'month' });
export const useBufferOneTime = () =>
  useLedger<BufferOneTimeRow>('buffer_one_time_expenses', { column: 'due_date' });
export const useBusinessExpenses = () =>
  useLedger<BusinessExpenseRow>('business_expenses', { column: 'vendor' });
export const useRecurringPurposeLines = () =>
  useLedger<RecurringPurposeLineRow>('recurring_purpose_lines', { column: 'sort_order' });
export const useMoneyRedirects = () =>
  useLedger<MoneyRedirectRow>('money_redirects', { column: 'sort_order' });

export interface BufferSettings {
  healthy_min: number;
  caution_min: number;
  tight_min: number;
}

export const DEFAULT_BUFFER_SETTINGS: BufferSettings = {
  healthy_min: 1000,
  caution_min: 500,
  tight_min: 200,
};

export function useBufferSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['buffer_settings', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('buffer_settings')
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<BufferSettings>) => {
      const { data, error } = await sb
        .from('buffer_settings')
        .upsert({ household_id: household!.id, ...patch }, { onConflict: 'household_id' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['buffer_settings'] }),
  });

  const settings: BufferSettings = query.data
    ? {
        healthy_min: Number(query.data.healthy_min),
        caution_min: Number(query.data.caution_min),
        tight_min: Number(query.data.tight_min),
      }
    : DEFAULT_BUFFER_SETTINGS;

  return { settings, isLoading: query.isLoading, save };
}
