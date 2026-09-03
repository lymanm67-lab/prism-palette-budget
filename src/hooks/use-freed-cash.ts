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
  { value: 'historical', label: 'Historical (already cancelled)' },
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
    if (s.status === 'historical') continue; // historical items are lifetime-only
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

/** Sources whose savings could reverse: renewal due soon, temporary pause resuming, or high risk. */
export function upcomingRenewalRisks(sources: FreedCashSource[], withinDays = 60) {
  const now = new Date();
  const limit = new Date(now.getTime() + withinDays * 86400000);
  return sources
    .map((s) => {
      const dates: { label: string; date: string }[] = [];
      if (s.next_renewal_date) dates.push({ label: 'Renewal', date: s.next_renewal_date });
      if (s.is_temporary && s.resume_date) dates.push({ label: 'Pause ends', date: s.resume_date });
      const next = dates
        .filter((d) => new Date(d.date) <= limit)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      return next ? { source: s, label: next.label, date: next.date } : null;
    })
    .filter((x): x is { source: FreedCashSource; label: string; date: string } => !!x)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function useGateRequests() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['freed-cash-gate', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freed_cash_gate_requests')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as GateRequest[];
    },
  });
}

export function useSaveGateRequest() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<GateRequest> & { id?: string }) => {
      if (!household?.id) throw new Error('No household');
      const payload = { ...input, household_id: household.id };
      if (input.id) {
        const { error } = await supabase
          .from('freed_cash_gate_requests')
          .update(payload as never)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('freed_cash_gate_requests').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-gate'] });
      toast.success('Subscription Gate request saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteGateRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('freed_cash_gate_requests')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-gate'] });
      toast.success('Removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ---------------------------------------------------------------- Phase 3
 * Redirect ledger, sweep waterfall, monthly review.
 * ------------------------------------------------------------------------ */

export const REDIRECT_DESTINATIONS = [
  { value: 'emergency_fund', label: 'Emergency fund (SoFi)' },
  { value: 'debt_payoff', label: 'Debt payoff (snowball)' },
  { value: 'investing', label: 'Investing / Build Wealth' },
  { value: 'buffer', label: 'Buffer' },
  { value: 'travel', label: 'Travel fund' },
  { value: 'business_reserve', label: 'Business capital reserve' },
  { value: 'goal', label: 'Specific goal' },
] as const;

export const REDIRECT_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
] as const;

export interface FreedCashRedirect {
  id: string;
  household_id: string;
  source_id: string | null;
  destination_type: string;
  destination_label: string | null;
  monthly_amount: number;
  start_date: string;
  status: string;
  confirmed_moved: boolean;
  last_confirmed_on: string | null;
  notes: string | null;
}

export interface FreedCashSettings {
  id?: string;
  household_id?: string;
  emergency_floor: number;
  waterfall: string[];
  sweep_mode: string;
}

export interface FreedCashReview {
  id: string;
  household_id: string;
  review_month: string;
  verified_monthly: number;
  redirected_monthly: number;
  unassigned_monthly: number;
  capture_rate: number;
  wins: string | null;
  leaks_found: string | null;
  next_actions: string | null;
}

export function destinationLabel(value: string) {
  return REDIRECT_DESTINATIONS.find((d) => d.value === value)?.label ?? value;
}

export function useFreedCashRedirects() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['freed-cash-redirects', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freed_cash_redirects')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('start_date', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FreedCashRedirect[];
    },
  });
}

export function useSaveRedirect() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FreedCashRedirect> & { id?: string }) => {
      if (!household?.id) throw new Error('No household');
      const payload = { ...input, household_id: household.id };
      if (input.id) {
        const { error } = await supabase
          .from('freed_cash_redirects')
          .update(payload as never)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('freed_cash_redirects').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-redirects'] });
      toast.success('Redirect saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRedirect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('freed_cash_redirects')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-redirects'] });
      toast.success('Removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

const DEFAULT_SETTINGS: FreedCashSettings = {
  emergency_floor: 2000,
  waterfall: ['emergency_fund', 'debt_payoff', 'investing', 'buffer', 'goal'],
  sweep_mode: 'manual',
};

export function useFreedCashSettings() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['freed-cash-settings', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freed_cash_settings')
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return DEFAULT_SETTINGS;
      const row = data as unknown as FreedCashSettings & { waterfall: unknown };
      return {
        ...row,
        waterfall: Array.isArray(row.waterfall) ? (row.waterfall as string[]) : DEFAULT_SETTINGS.waterfall,
        emergency_floor: Number(row.emergency_floor),
      } as FreedCashSettings;
    },
  });
}

export function useSaveFreedCashSettings() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FreedCashSettings>) => {
      if (!household?.id) throw new Error('No household');
      const { error } = await supabase
        .from('freed_cash_settings')
        .upsert({ ...input, household_id: household.id } as never, { onConflict: 'household_id' });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-settings'] });
      toast.success('Sweep settings saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useFreedCashReviews() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['freed-cash-reviews', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freed_cash_reviews')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('review_month', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as FreedCashReview[];
    },
  });
}

export function useSaveFreedCashReview() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<FreedCashReview> & { id?: string }) => {
      if (!household?.id) throw new Error('No household');
      const payload = { ...input, household_id: household.id };
      if (input.id) {
        const { error } = await supabase
          .from('freed_cash_reviews')
          .update(payload as never)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('freed_cash_reviews').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-reviews'] });
      toast.success('Monthly review saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export interface RedirectCapacity {
  verifiedMonthly: number;
  assignedMonthly: number;
  unassignedMonthly: number;
  confirmedMonthly: number;
  assignedByDestination: { destination: string; monthly: number }[];
}

/** Only verified savings can be redirected; paused/completed redirects free capacity back up. */
export function redirectCapacity(
  sources: FreedCashSource[],
  redirects: FreedCashRedirect[],
): RedirectCapacity {
  const verifiedMonthly = sources
    .filter((s) => s.status === 'verified')
    .reduce((sum, s) => sum + monthlySavings(s), 0);

  const live = redirects.filter((r) => r.status === 'planned' || r.status === 'active');
  const assignedMonthly = live.reduce((sum, r) => sum + Number(r.monthly_amount), 0);
  const confirmedMonthly = live
    .filter((r) => r.confirmed_moved)
    .reduce((sum, r) => sum + Number(r.monthly_amount), 0);

  const byDest = new Map<string, number>();
  for (const r of live) {
    byDest.set(r.destination_type, (byDest.get(r.destination_type) ?? 0) + Number(r.monthly_amount));
  }

  return {
    verifiedMonthly,
    assignedMonthly,
    unassignedMonthly: Math.max(0, verifiedMonthly - assignedMonthly),
    confirmedMonthly,
    assignedByDestination: [...byDest.entries()].map(([destination, monthly]) => ({ destination, monthly })),
  };
}

export interface WaterfallStep {
  destination: string;
  label: string;
  amount: number;
  reason: string;
}

/**
 * Sweep the unassigned verified savings through the priority waterfall.
 * The emergency fund is filled to its floor first; whatever remains flows to the next jobs.
 */
export function buildWaterfall(
  unassigned: number,
  settings: FreedCashSettings,
  emergencyBalance: number,
): WaterfallStep[] {
  let remaining = Math.max(0, unassigned);
  const steps: WaterfallStep[] = [];
  const order = settings.waterfall?.length ? settings.waterfall : DEFAULT_SETTINGS.waterfall;

  for (const destination of order) {
    if (remaining <= 0.01) break;
    let amount = remaining;
    let reason = 'Receives the remaining freed cash';

    if (destination === 'emergency_fund') {
      const gap = Math.max(0, settings.emergency_floor - emergencyBalance);
      amount = Math.min(remaining, gap);
      reason =
        gap > 0
          ? `Fill to the $${settings.emergency_floor.toLocaleString()} floor (gap $${gap.toFixed(2)})`
          : 'Floor already protected — skipped';
    }

    if (amount > 0.01) {
      steps.push({ destination, label: destinationLabel(destination), amount, reason });
      remaining -= amount;
    } else {
      steps.push({ destination, label: destinationLabel(destination), amount: 0, reason });
    }
  }

  return steps;
}

/* ------------------------------------------------------- Utility bill tracking
 * Clearview Energy cancellation: realized (not assumed) electricity savings.
 * ---------------------------------------------------------------------------- */

export function useUtilityBills() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['freed-cash-utility-bills', household?.id],
    enabled: !!household?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('freed_cash_utility_bills')
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .order('billing_month', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as import('@/lib/freed-cash/utility').UtilityBill[];
    },
  });
}

export function useSaveUtilityBill() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Partial<import('@/lib/freed-cash/utility').UtilityBillInput> & { id?: string },
    ) => {
      if (!household?.id) throw new Error('No household');
      const payload = { ...input, household_id: household.id };
      if (input.id) {
        const { error } = await supabase
          .from('freed_cash_utility_bills')
          .update(payload as never)
          .eq('id', input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('freed_cash_utility_bills').insert(payload as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-utility-bills'] });
      toast.success('Electric bill saved');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteUtilityBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('freed_cash_utility_bills')
        .update({ deleted_at: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freed-cash-utility-bills'] });
      toast.success('Bill removed');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ---------------------------------------------------------------------------
// Lifetime (historical) savings: accrued avoided spend from cancel date → today
// ---------------------------------------------------------------------------

export function monthsSince(dateStr: string, now = new Date()): number {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return 0;
  const months =
    (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth()) +
    (now.getDate() >= d.getDate() ? 0 : -1);
  return Math.max(0, months);
}

/** Accrued avoided spend for one source: monthly savings x months since effective date. */
export function accruedSavings(s: FreedCashSource, now = new Date()): number {
  return monthlySavings(s) * monthsSince(s.effective_date, now);
}

export interface LifetimeSavings {
  total: number;
  historicalTotal: number;
  activeTotal: number;
  byYear: { year: string; amount: number; count: number }[];
  byVendor: { vendor: string; amount: number; monthly: number; count: number }[];
  rows: { source: FreedCashSource; months: number; monthly: number; accrued: number }[];
}

/**
 * Lifetime savings across every non-reversed source, historical included.
 * Historical rows only ever contribute here — never to the active monthly figure.
 */
export function summarizeLifetime(sources: FreedCashSource[], now = new Date()): LifetimeSavings {
  const rows = sources
    .filter((s) => s.status !== 'reversed')
    .map((s) => ({
      source: s,
      months: monthsSince(s.effective_date, now),
      monthly: monthlySavings(s),
      accrued: accruedSavings(s, now),
    }))
    .sort((a, b) => b.accrued - a.accrued);

  const yearMap = new Map<string, { amount: number; count: number }>();
  const vendorMap = new Map<string, { amount: number; monthly: number; count: number }>();
  let historicalTotal = 0;
  let activeTotal = 0;

  for (const r of rows) {
    if (r.source.status === 'historical') historicalTotal += r.accrued;
    else activeTotal += r.accrued;

    const year = (r.source.effective_date ?? '').slice(0, 4) || 'Undated';
    const y = yearMap.get(year) ?? { amount: 0, count: 0 };
    yearMap.set(year, { amount: y.amount + r.accrued, count: y.count + 1 });

    const vendor = r.source.vendor?.trim() || r.source.name;
    const v = vendorMap.get(vendor) ?? { amount: 0, monthly: 0, count: 0 };
    vendorMap.set(vendor, {
      amount: v.amount + r.accrued,
      monthly: v.monthly + r.monthly,
      count: v.count + 1,
    });
  }

  return {
    total: historicalTotal + activeTotal,
    historicalTotal,
    activeTotal,
    byYear: [...yearMap.entries()]
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => b.year.localeCompare(a.year)),
    byVendor: [...vendorMap.entries()]
      .map(([vendor, v]) => ({ vendor, ...v }))
      .sort((a, b) => b.amount - a.amount),
    rows,
  };
}
