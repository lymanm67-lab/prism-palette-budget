import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import type { FilingStatus } from '@/lib/tax/brackets';

export interface TaxSettings {
  id?: string;
  household_id?: string;
  filing_status: FilingStatus;
  state: string;
  birth_year: number;
  spouse_birth_year: number | null;
  rmd_start_age: number;
  planning_end_age: number;
  assumed_return: number;
  inflation: number;
  target_bracket: number;
  irmaa_guard: boolean;
  qcd_annual_target: number;
  foundation_annual_target: number;
  notes: string | null;
}

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  filing_status: 'married_joint',
  state: 'OH',
  birth_year: 1966,
  spouse_birth_year: null,
  rmd_start_age: 75,
  planning_end_age: 100,
  assumed_return: 8,
  inflation: 2.5,
  target_bracket: 22,
  irmaa_guard: true,
  qcd_annual_target: 0,
  foundation_annual_target: 0,
  notes: null,
};

export interface BusinessLoss {
  id: string;
  entity_name: string;
  tax_year: number;
  loss_amount: number;
  used_amount: number;
  loss_type: string;
  is_carryforward: boolean;
  notes: string | null;
}

export interface RothConversion {
  id: string;
  tax_year: number;
  source_account_id: string | null;
  amount: number;
  status: string;
  estimated_tax: number;
  marginal_rate: number | null;
  offset_by_losses: number;
  notes: string | null;
}

export interface CharitablePlan {
  id: string;
  tax_year: number;
  vehicle: string;
  amount: number;
  source_account_id: string | null;
  recipient: string | null;
  counts_toward_rmd: boolean;
  status: string;
  notes: string | null;
}

export interface TaxAccount {
  id: string;
  name: string;
  custodian: string | null;
  institution: string | null;
  current_balance: number;
  tax_bucket: string;
  owner: string | null;
  rmd_applicable: boolean;
  is_inherited: boolean;
  portfolio_class: string;
}

export function useRetirementTax() {
  const { household } = useHousehold();
  const householdId = household?.id;
  const qc = useQueryClient();

  const settingsQ = useQuery({
    queryKey: ['tax-settings', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_settings')
        .select('*')
        .eq('household_id', householdId!)
        .maybeSingle();
      if (error) throw error;
      return (data as TaxSettings | null) ?? null;
    },
  });

  const accountsQ = useQuery({
    queryKey: ['tax-accounts', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('retirement_accounts')
        .select('id,name,custodian,institution,current_balance,tax_bucket,owner,rmd_applicable,is_inherited,portfolio_class')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('sort_order');
      if (error) throw error;
      return (data ?? []) as TaxAccount[];
    },
  });

  const lossesQ = useQuery({
    queryKey: ['tax-losses', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_business_losses')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('tax_year');
      if (error) throw error;
      return (data ?? []) as BusinessLoss[];
    },
  });

  const conversionsQ = useQuery({
    queryKey: ['tax-conversions', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_roth_conversions')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('tax_year');
      if (error) throw error;
      return (data ?? []) as RothConversion[];
    },
  });

  const charitableQ = useQuery({
    queryKey: ['tax-charitable', householdId],
    enabled: !!householdId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tax_charitable_plans')
        .select('*')
        .eq('household_id', householdId!)
        .is('deleted_at', null)
        .order('tax_year');
      if (error) throw error;
      return (data ?? []) as CharitablePlan[];
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (patch: Partial<TaxSettings>) => {
      const existing = settingsQ.data;
      if (existing?.id) {
        const { error } = await supabase.from('tax_settings').update(patch).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('tax_settings')
          .insert({ ...DEFAULT_TAX_SETTINGS, ...patch, household_id: householdId! });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-settings', householdId] }),
  });

  const saveAccountTax = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<TaxAccount>) => {
      const { error } = await supabase.from('retirement_accounts').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-accounts', householdId] }),
  });

  const addLoss = useMutation({
    mutationFn: async (row: Omit<BusinessLoss, 'id'>) => {
      const { error } = await supabase.from('tax_business_losses').insert({ ...row, household_id: householdId! });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-losses', householdId] }),
  });

  const removeLoss = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_business_losses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-losses', householdId] }),
  });

  const saveConversion = useMutation({
    mutationFn: async (row: Omit<RothConversion, 'id'>) => {
      const { error } = await supabase.from('tax_roth_conversions').insert({ ...row, household_id: householdId! });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-conversions', householdId] }),
  });

  const removeConversion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_roth_conversions')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-conversions', householdId] }),
  });

  const saveCharitable = useMutation({
    mutationFn: async (row: Omit<CharitablePlan, 'id'>) => {
      const { error } = await supabase.from('tax_charitable_plans').insert({ ...row, household_id: householdId! });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-charitable', householdId] }),
  });

  const removeCharitable = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tax_charitable_plans')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tax-charitable', householdId] }),
  });

  const settings: TaxSettings = useMemo(
    () => ({ ...DEFAULT_TAX_SETTINGS, ...(settingsQ.data ?? {}) }),
    [settingsQ.data],
  );

  const accounts = accountsQ.data ?? [];

  const buckets = useMemo(() => {
    const sum = (pred: (a: TaxAccount) => boolean) =>
      accounts.filter(pred).reduce((s, a) => s + Number(a.current_balance || 0), 0);
    return {
      pretax: sum((a) => a.tax_bucket === 'pretax'),
      roth: sum((a) => a.tax_bucket === 'roth'),
      taxable: sum((a) => a.tax_bucket === 'taxable'),
      hsa: sum((a) => a.tax_bucket === 'hsa'),
      total: sum(() => true),
    };
  }, [accounts]);

  const availableLossesByYear = useMemo(() => {
    const map: Record<number, number> = {};
    for (const l of lossesQ.data ?? []) {
      const avail = Math.max(0, Number(l.loss_amount || 0) - Number(l.used_amount || 0));
      map[l.tax_year] = (map[l.tax_year] ?? 0) + avail;
    }
    return map;
  }, [lossesQ.data]);

  return {
    householdId,
    settings,
    hasSettingsRow: !!settingsQ.data?.id,
    accounts,
    buckets,
    losses: lossesQ.data ?? [],
    availableLossesByYear,
    conversions: conversionsQ.data ?? [],
    charitable: charitableQ.data ?? [],
    isLoading:
      settingsQ.isLoading || accountsQ.isLoading || lossesQ.isLoading || conversionsQ.isLoading || charitableQ.isLoading,
    saveSettings,
    saveAccountTax,
    addLoss,
    removeLoss,
    saveConversion,
    removeConversion,
    saveCharitable,
    removeCharitable,
  };
}
