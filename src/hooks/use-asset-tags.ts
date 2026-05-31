import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export type AssetTag =
  | 'household_income'
  | 'retirement_asset'
  | 'legacy_funding_asset'
  | 'medical_reserve'
  | 'excluded_from_legacy'
  | 'spouse_asset'
  | 'pension_income_only'
  | 'trust_funding_asset';

export type AssetKey =
  | 'primary_balance'
  | 'employee_contrib'
  | 'employer_contrib'
  | 'raise_redirect'
  | 'debt_redirect'
  | 'additional_contrib'
  | 'invested_ss'
  | 'hsa'
  | 'spouse_pension'
  | 'spouse_opers_value'
  | 'spouse_deferred_comp';

export interface AssetTagRow {
  id: string;
  household_id: string;
  plan_id: string;
  asset_key: AssetKey;
  tag: AssetTag;
  include_in_legacy: boolean;
  custom_label: string | null;
  amount_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const ASSET_KEY_LABELS: Record<AssetKey, string> = {
  primary_balance: 'Primary retirement balance',
  employee_contrib: 'Employee contributions',
  employer_contrib: 'Employer contributions',
  raise_redirect: 'Future raise contributions',
  debt_redirect: 'Debt payment redirect',
  additional_contrib: 'Step-up / additional contributions',
  invested_ss: 'Invested Social Security',
  hsa: 'HSA',
  spouse_pension: 'Spouse OPERS pension',
  spouse_opers_value: 'Spouse OPERS account value',
  spouse_deferred_comp: 'Spouse deferred compensation',
};

export const TAG_LABELS: Record<AssetTag, string> = {
  household_income: 'Household income',
  retirement_asset: 'Retirement asset',
  legacy_funding_asset: 'Legacy funding asset',
  medical_reserve: 'Medical reserve',
  excluded_from_legacy: 'Excluded from legacy',
  spouse_asset: 'Spouse asset',
  pension_income_only: 'Pension income only',
  trust_funding_asset: 'Trust funding asset',
};

export const MONTGOMERY_DEFAULTS: Array<{
  asset_key: AssetKey;
  tag: AssetTag;
  include_in_legacy: boolean;
}> = [
  { asset_key: 'primary_balance', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'employee_contrib', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'employer_contrib', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'raise_redirect', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'debt_redirect', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'additional_contrib', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'invested_ss', tag: 'legacy_funding_asset', include_in_legacy: true },
  { asset_key: 'hsa', tag: 'medical_reserve', include_in_legacy: false },
  { asset_key: 'spouse_pension', tag: 'household_income', include_in_legacy: false },
  { asset_key: 'spouse_opers_value', tag: 'excluded_from_legacy', include_in_legacy: false },
  { asset_key: 'spouse_deferred_comp', tag: 'spouse_asset', include_in_legacy: false },
];

export function useAssetTags(planId: string | null | undefined) {
  return useQuery({
    queryKey: ['investment_asset_tags', planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('investment_asset_tags' as any)
        .select('*')
        .eq('plan_id', planId!);
      if (error) throw error;
      return (data ?? []) as unknown as AssetTagRow[];
    },
  });
}

export function useUpsertAssetTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<AssetTagRow> & { plan_id: string; household_id: string; asset_key: AssetKey }) => {
      const { error } = await supabase
        .from('investment_asset_tags' as any)
        .upsert(row as any, { onConflict: 'plan_id,asset_key' });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['investment_asset_tags', vars.plan_id] }),
  });
}

/** Seed Montgomery defaults if no tags exist for this plan. */
export function useSeedAssetTagsIfEmpty(planId: string | null | undefined, householdId: string | null | undefined) {
  const qc = useQueryClient();
  const { data: tags, isLoading } = useAssetTags(planId);
  useEffect(() => {
    if (!planId || !householdId || isLoading) return;
    if (tags && tags.length > 0) return;
    const rows = MONTGOMERY_DEFAULTS.map((d) => ({
      plan_id: planId,
      household_id: householdId,
      ...d,
    }));
    supabase.from('investment_asset_tags' as any).insert(rows as any).then(({ error }) => {
      if (!error) qc.invalidateQueries({ queryKey: ['investment_asset_tags', planId] });
    });
  }, [planId, householdId, tags, isLoading, qc]);
}
