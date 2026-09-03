import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export const FREED_CASH_SOURCE_TYPES = [
  { value: 'cancellation', label: 'Cancellation' },
  { value: 'reduction', label: 'Reduction' },
  { value: 'negotiation', label: 'Negotiated bill' },
  { value: 'replacement', label: 'Replaced service' },
  { value: 'pause', label: 'Temporary pause' },
  { value: 'debt_ended', label: 'Debt payment ended' },
  { value: 'debt_reduced', label: 'Debt payment reduced' },
  { value: 'other', label: 'Other' },
] as const;

export const FREED_CASH_FREQUENCIES = [
  { value: 'weekly', label: 'Weekly', perMonth: 4.33 },
  { value: 'biweekly', label: 'Every 2 weeks', perMonth: 2.1667 },
  { value: 'monthly', label: 'Monthly', perMonth: 1 },
  { value: 'quarterly', label: 'Quarterly', perMonth: 1 / 3 },
  { value: 'semiannual', label: 'Every 6 months', perMonth: 1 / 6 },
  { value: 'annual', label: 'Annual', perMonth: 1 / 12 },
] as const;

export const FREED_CASH_STATUSES = [
  { value: 'pending', label: 'Pending' },
  { value: 'requested', label: 'Requested' },
  { value: 'confirmed', label: 'Confirmed by vendor' },
  { value: 'verified', label: 'Verified on statement' },
  { value: 'reversed', label: 'Reversed / reactivated' },
] as const;

export const VERIFICATION_METHODS = [
  { value: 'bank_statement', label: 'Bank / card statement' },
  { value: 'vendor_email', label: 'Vendor confirmation email' },
  { value: 'account_portal', label: 'Vendor account portal' },
  { value: 'transaction_absent', label: 'Charge no longer appears' },
  { value: 'other', label: 'Other' },
] as const;

export const REACTIVATION_RISKS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
] as const;

export const GATE_DECISIONS = [
  { value: 'pending', label: 'Pending review' },
  { value: 'approved', label: 'Approved' },
  { value: 'declined', label: 'Declined' },
  { value: 'deferred', label: 'Deferred' },
] as const;

export interface FreedCashSource {
  id: string;
  household_id: string;
  name: string;
  vendor: string | null;
  category: string | null;
  entity_scope: string;
  source_type: string;
  original_amount: number;
  new_amount: number;
  billing_frequency: string;
  added_fees: number;
  effective_date: string;
  status: string;
  verified_at: string | null;
  classification: string;
  is_temporary: boolean;
  resume_date: string | null;
  notes: string | null;
  verification_method: string | null;
  verification_evidence: string | null;
  statement_checked_date: string | null;
  next_renewal_date: string | null;
  renewal_amount: number | null;
  reactivation_risk: string;
}

export type FreedCashInput = Omit<FreedCashSource, 'id' | 'household_id' | 'verified_at'>;

export interface GateRequest {
  id: string;
  household_id: string;
  name: string;
  vendor: string | null;
  amount: number;
  billing_frequency: string;
  entity_scope: string;
  reason: string | null;
  expected_value: string | null;
  replaces_source_id: string | null;
  replaces_note: string | null;
  decision: string;
  decision_date: string | null;
  reviewer_notes: string | null;
}

/** Normalize any billing frequency to a monthly figure. */
export function toMonthly(amount: number, frequency: string): number {
  const f = FREED_CASH_FREQUENCIES.find((x) => x.value === frequency);
  return amount * (f?.perMonth ?? 1);
}

/** True monthly savings = (original - new - added fees), normalized to monthly. */
export function monthlySavings(s: Pick<FreedCashSource, 'original_amount' | 'new_amount' | 'added_fees' | 'billing_frequency'>): number {
  const gross = toMonthly(Number(s.original_amount) - Number(s.new_amount), s.billing_frequency);
  return gross - toMonthly(Number(s.added_fees), s.billing_frequency);
}

export function annualSavings(s: Parameters<typeof monthlySavings>[0]): number {
  return monthlySavings(s) * 12;
}

export interface FreedCashTotals {
  monthlyVerified: number;
  monthlyPipeline: number;
  monthlyReversed: number;
  annualVerified: number;
  captureRate: number;
  count: number;
  verifiedCount: number;
}

export function summarizeFreedCash(sources: FreedCashSource[]): FreedCashTotals {
  let monthlyVerified = 0;
  let monthlyPipeline = 0;
  let monthlyReversed = 0;
  let verifiedCount = 0;

  for (const s of sources) {
    const m = monthlySavings(s);
    if (s.status === 'verified') {
      monthlyVerified += m;
      verifiedCount += 1;
    } else if (s.status === 'reversed') {
      monthlyReversed += m;
    } else {
      monthlyPipeline += m;
    }
  }

  const claimed = monthlyVerified + monthlyPipeline;
  return {
    monthlyVerified,
    monthlyPipeline,
    monthlyReversed,
    annualVerified: monthlyVerified * 12,
    captureRate: claimed > 0 ? (monthlyVerified / claimed) * 100 : 0,
    count: sources.length,
    verifiedCount,
  };
}

export function useFreedCashSources() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['freed-cash-sources', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freed_cash_sources')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('effective_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FreedCashSource[];
    },
  });
}

export function useSaveFreedCashSource() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FreedCashInput> & { id?: string }) => {
      if (!household?.id) throw new Error('No household');
      const payload = {
        ...input,
        household_id: household.id,
        verified_at: input.status === 'verified' ? new Date().toISOString() : null,
      };
      if (input.id) {
        const { error } = await supabase
          .from('freed_cash_sources')
          .update(payload as never)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('freed_cash_sources').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-sources'] });
      toast.success('Freed cash source saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteFreedCashSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('freed_cash_sources')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-sources'] });
      toast.success('Removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
