import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export const CAPITAL_EVENT_TYPES = [
  { value: 'stock_sale', label: 'Stock sale' },
  { value: 'owner_contribution', label: 'Owner contribution' },
  { value: 'business_loan', label: 'Business loan' },
  { value: 'tax_refund', label: 'Tax refund redirected to business' },
  { value: 'asset_sale', label: 'Asset sale' },
  { value: 'one_time_consulting', label: 'One-time consulting income' },
  { value: 'other', label: 'Other non-recurring funding' },
] as const;

export const FUNDING_SOURCES = [
  { value: 'monthly_take_home', label: 'Monthly take-home pay' },
  { value: 'business_capital_reserve', label: 'Business Capital Reserve' },
  { value: 'business_revenue', label: 'Business revenue' },
  { value: 'owner_contribution', label: 'Owner contribution' },
  { value: 'owner_loan', label: 'Owner loan' },
  { value: 'other', label: 'Other' },
] as const;

export const CAPITAL_DESTINATIONS = [
  { value: 'business_capital', label: 'Business Capital' },
  { value: 'personal_savings', label: 'Personal savings' },
  { value: 'debt_payoff', label: 'Debt payoff' },
  { value: 'wealth_building', label: 'Wealth-building assets' },
  { value: 'other', label: 'Other' },
] as const;

export interface CapitalEvent {
  id: string;
  household_id: string;
  event_date: string;
  event_type: string;
  source: string | null;
  description: string;
  gross_amount: number;
  cost_basis: number | null;
  estimated_gain_loss: number | null;
  destination: string;
  tax_notes: string | null;
  is_recurring: boolean;
  include_in_budget_pct: boolean;
  include_in_allocation_pct: boolean;
}

export interface ReserveEntry {
  id: string;
  household_id: string;
  capital_event_id: string | null;
  entry_date: string;
  direction: string;
  description: string;
  expense_category: string | null;
  amount: number;
  funding_source: string;
  notes: string | null;
}

export function useCapitalEvents() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['capital-events', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_events')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('event_date', { ascending: false });
      if (error) throw error;
      return (data || []) as CapitalEvent[];
    },
  });
}

export function useReserveLedger() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['capital-reserve-ledger', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('capital_reserve_ledger')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('entry_date', { ascending: true });
      if (error) throw error;
      return (data || []) as ReserveEntry[];
    },
  });
}

export function useCreateCapitalEvent() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<CapitalEvent>) => {
      const { error } = await supabase.from('capital_events').insert({
        ...payload,
        household_id: household!.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capital-events'] });
      toast.success('Capital event added');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSoftDeleteCapitalEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capital_events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capital-events'] });
      toast.success('Capital event removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateReserveEntry() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Partial<ReserveEntry>) => {
      const { error } = await supabase.from('capital_reserve_ledger').insert({
        ...payload,
        household_id: household!.id,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capital-reserve-ledger'] });
      toast.success('Reserve entry recorded');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useSoftDeleteReserveEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('capital_reserve_ledger')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['capital-reserve-ledger'] });
      toast.success('Entry removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Ending Reserve = Beginning Reserve + Capital Added - Business Expenses Paid From Reserve.
 * When `monthPrefix` (YYYY-MM) is passed, figures are scoped to that month with a carry-in
 * balance from all prior activity. */
export function summariseReserve(entries: ReserveEntry[] | undefined, monthPrefix?: string) {
  const rows = entries || [];
  const sum = (list: ReserveEntry[], dir: 'added' | 'spent') =>
    list.filter(r => r.direction === dir).reduce((s, r) => s + Number(r.amount), 0);

  if (!monthPrefix) {
    const added = sum(rows, 'added');
    const spent = sum(rows, 'spent');
    const ending = added - spent;
    return {
      carryIn: 0,
      added,
      spent,
      ending,
      pctRemaining: added > 0 ? Math.max(0, Math.min(100, (ending / added) * 100)) : 0,
    };
  }

  const key = monthPrefix.slice(0, 7);
  const prior = rows.filter(r => r.entry_date.slice(0, 7) < key);
  const inMonth = rows.filter(r => r.entry_date.slice(0, 7) === key);
  const carryIn = sum(prior, 'added') - sum(prior, 'spent');
  const added = sum(inMonth, 'added');
  const spent = sum(inMonth, 'spent');
  const ending = carryIn + added - spent;
  const available = carryIn + added;
  return {
    carryIn,
    added,
    spent,
    ending,
    pctRemaining: available > 0 ? Math.max(0, Math.min(100, (ending / available) * 100)) : 0,
  };
}
