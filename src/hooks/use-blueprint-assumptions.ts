import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { defaultAssumptions, type AssumptionState } from '@/lib/blueprint/model';
import { useHouseholdProfile, ageFromDob } from '@/hooks/use-household-profile';

const sb = supabase as any;

export interface AssumptionRecord {
  id: string | null;
  state: AssumptionState;
}

export function useBlueprintAssumptions() {
  const { household } = useHousehold();
  const { data: profile } = useHouseholdProfile();
  return useQuery<AssumptionRecord>({
    queryKey: ['blueprint_assumptions', household?.id, profile?.updated_at],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await sb
        .from('blueprint_assumptions')
        .select('id, state')
        .eq('household_id', household!.id)
        .limit(1);
      if (error) throw error;
      const row = data?.[0];
      // Household profile is the master record for ages and salary.
      const fromProfile: Partial<AssumptionState> = {};
      const la = ageFromDob(profile?.lyman_dob ?? null);
      const ka = ageFromDob(profile?.kateri_dob ?? null);
      if (la != null) fromProfile.currentAge = la;
      if (ka != null) fromProfile.spouseCurrentAge = ka;
      if (profile?.lyman_gross_monthly) fromProfile.salaryAnnual = Math.round(profile.lyman_gross_monthly * 12);
      return { id: row?.id ?? null, state: defaultAssumptions({ ...(row?.state || {}), ...fromProfile }) };
    },
  });
}

export function useSaveBlueprintAssumptions() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, state }: { id: string | null; state: AssumptionState }) => {
      const payload = { household_id: household!.id, state };
      if (id) {
        const { error } = await sb.from('blueprint_assumptions').update(payload).eq('id', id);
        if (error) throw error;
        return id;
      }
      const { data, error } = await sb
        .from('blueprint_assumptions')
        .upsert(payload, { onConflict: 'household_id' })
        .select('id')
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blueprint_assumptions'] }),
  });
}
