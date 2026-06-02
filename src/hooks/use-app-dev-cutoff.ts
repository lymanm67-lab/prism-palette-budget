import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTransactions, useCategories } from '@/hooks/use-finance-data';

export type CutoffStatus = 'ok' | 'warn' | 'over';

export interface AppDevLimits {
  id: string;
  household_id: string;
  monthly_spend_limit: number;
  monthly_credit_limit: number;
  tracked_category_id: string | null;
  period_start: string;
  is_enabled: boolean;
  updated_at: string;
}

export interface AppDevOverride {
  id: string;
  household_id: string;
  requested_by: string;
  approved_by: string | null;
  reason: string;
  status: 'pending' | 'approved' | 'denied';
  expires_at: string;
  created_at: string;
}

export interface CreditLogEntry {
  id: string;
  household_id: string;
  date: string;
  credits_used: number;
  note: string | null;
  created_at: string;
}

const DEFAULT_LIMITS = { monthly_spend_limit: 100, monthly_credit_limit: 400 };

export function useAppDevLimits() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['app-dev-limits', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_dev_limits' as any)
        .select('*')
        .eq('household_id', household!.id)
        .maybeSingle();
      if (error) throw error;
      return data as any as AppDevLimits | null;
    },
  });
}

export function useUpsertAppDevLimits() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: Partial<Omit<AppDevLimits, 'id' | 'household_id' | 'updated_at'>>) => {
      const { data: existing } = await supabase
        .from('app_dev_limits' as any)
        .select('id')
        .eq('household_id', household!.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('app_dev_limits' as any)
          .update(settings)
          .eq('id', (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from('app_dev_limits' as any)
        .insert({ household_id: household!.id, ...DEFAULT_LIMITS, ...settings })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-dev-limits'] }),
  });
}

export function useResetAppDevPeriod() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const periodStart = new Date();
      periodStart.setDate(1);
      const dateStr = periodStart.toISOString().split('T')[0];
      const { error } = await supabase
        .from('app_dev_limits' as any)
        .update({ period_start: dateStr })
        .eq('household_id', household!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-dev-limits'] }),
  });
}

export function useCreditLog(periodStart?: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['app-dev-credit-log', household?.id, periodStart],
    enabled: !!household && !!periodStart,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_dev_credit_log' as any)
        .select('*')
        .eq('household_id', household!.id)
        .is('deleted_at', null)
        .gte('date', periodStart!)
        .order('date', { ascending: false });
      if (error) throw error;
      return (data || []) as any as CreditLogEntry[];
    },
  });
}

export function useLogCredits() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entry: { credits_used: number; note?: string; date?: string }) => {
      const { error } = await supabase.from('app_dev_credit_log' as any).insert({
        household_id: household!.id,
        created_by: user!.id,
        credits_used: entry.credits_used,
        note: entry.note ?? null,
        date: entry.date ?? new Date().toISOString().split('T')[0],
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-dev-credit-log'] }),
  });
}

export function useDeleteCreditEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('app_dev_credit_log' as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-dev-credit-log'] }),
  });
}

export function useAppDevOverrides() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['app-dev-overrides', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_dev_overrides' as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as any as AppDevOverride[];
    },
  });
}

export function useRequestOverride() {
  const { household } = useHousehold();
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (reason: string) => {
      const { error } = await supabase.from('app_dev_overrides' as any).insert({
        household_id: household!.id,
        requested_by: user!.id,
        reason,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-dev-overrides'] }),
  });
}

export function useDecideOverride() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'denied' }) => {
      const { error } = await supabase
        .from('app_dev_overrides' as any)
        .update({ status, approved_by: user!.id })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['app-dev-overrides'] }),
  });
}

export interface AppDevCutoffSummary {
  limits: AppDevLimits | null;
  spendUsed: number;
  spendLimit: number;
  creditsUsed: number;
  creditLimit: number;
  spendPct: number;
  creditPct: number;
  worstPct: number;
  status: CutoffStatus;
  overrideActive: boolean;
  daysLeftInMonth: number;
  message: string;
  isEnabled: boolean;
  periodStart: string;
}

export function useAppDevCutoff(): AppDevCutoffSummary {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const { data: limits } = useAppDevLimits();
  const { data: categories } = useCategories();
  const { data: transactions } = useTransactions();

  const periodStart = limits?.period_start
    ?? `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-01`;

  const { data: creditLog } = useCreditLog(periodStart);
  const { data: overrides } = useAppDevOverrides();

  useEffect(() => {
    if (!household?.id) return;
    const ch = supabase
      .channel(`app-dev-${household.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_dev_limits', filter: `household_id=eq.${household.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['app-dev-limits'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_dev_credit_log', filter: `household_id=eq.${household.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['app-dev-credit-log'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'app_dev_overrides', filter: `household_id=eq.${household.id}` }, () => {
        qc.invalidateQueries({ queryKey: ['app-dev-overrides'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [household?.id, qc]);

  return useMemo(() => {
    const spendLimit = limits?.monthly_spend_limit ?? DEFAULT_LIMITS.monthly_spend_limit;
    const creditLimit = limits?.monthly_credit_limit ?? DEFAULT_LIMITS.monthly_credit_limit;
    const isEnabled = limits?.is_enabled ?? true;

    let trackedId = limits?.tracked_category_id ?? null;
    if (!trackedId && categories) {
      const match = (categories as any[]).find((c) => /lovable|app[\s_-]*dev/i.test(c.name || ''));
      if (match) trackedId = match.id;
    }

    let spendUsed = 0;
    if (trackedId && transactions) {
      spendUsed = (transactions as any[])
        .filter((t) =>
          t.category_id === trackedId &&
          t.amount < 0 &&
          !t.is_transfer &&
          (t.deleted_at == null) &&
          t.date >= periodStart
        )
        .reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    }

    const manualCredits = (creditLog || []).reduce((s, e) => s + (e.credits_used || 0), 0);
    // Auto-derive credits from tracked spend at the spend→credit ratio when no manual entries exist.
    const derivedCredits = manualCredits === 0 && spendLimit > 0
      ? Math.round((spendUsed / spendLimit) * creditLimit)
      : 0;
    const creditsUsed = manualCredits + derivedCredits;

    const spendPct = spendLimit > 0 ? (spendUsed / spendLimit) * 100 : 0;
    const creditPct = creditLimit > 0 ? (creditsUsed / creditLimit) * 100 : 0;
    const worstPct = Math.max(spendPct, creditPct);

    const status: CutoffStatus = worstPct >= 100 ? 'over' : worstPct >= 70 ? 'warn' : 'ok';

    const now = new Date();
    const eom = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysLeftInMonth = Math.max(0, Math.ceil((eom.getTime() - now.getTime()) / 86400000));

    const overrideActive = !!(overrides || []).find(
      (o) => o.status === 'approved' && new Date(o.expires_at) > now
    );

    let message = '';
    if (!isEnabled) {
      message = 'App-dev cutoff is disabled.';
    } else if (status === 'over' && !overrideActive) {
      message = "You've reached your monthly limit. New build requests are locked until next month — unless an admin approves an override.";
    } else if (status === 'over' && overrideActive) {
      message = 'Over limit — emergency override is active. Spend with intention.';
    } else if (status === 'warn') {
      message = "You're close to your monthly limit. Finish planning before purchasing more credits.";
    } else {
      message = `On track. ${daysLeftInMonth} days left this period.`;
    }

    return {
      limits: limits ?? null,
      spendUsed,
      spendLimit,
      creditsUsed,
      creditLimit,
      spendPct,
      creditPct,
      worstPct,
      status,
      overrideActive,
      daysLeftInMonth,
      message,
      isEnabled,
      periodStart,
    };
  }, [limits, categories, transactions, creditLog, overrides, periodStart]);
}
