import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export function useSubscriptionAlerts() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['subscription-alerts', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('financial_insights')
        .select('*')
        .eq('household_id', household!.id)
        .eq('insight_type', 'subscription_still_charged')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });
}

export function useDismissAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('financial_insights')
        .update({ is_read: true })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscription-alerts'] }),
  });
}

export function useCheckCanceledCharges() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-canceled-charges', {
        body: { household_id: household!.id },
      });
      if (error) throw error;
      return data as { checked: number; alerts: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['subscription-alerts'] });
      qc.invalidateQueries({ queryKey: ['subscriptions'] });
    },
  });
}
