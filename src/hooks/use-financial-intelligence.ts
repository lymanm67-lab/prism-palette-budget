import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export function useSmartBudget() {
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('smart-budget', {
        body: { household_id: household!.id },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useCashFlowForecast() {
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async (params?: { forecast_days?: number; adjustments?: { spending_reduction_pct?: number; additional_savings?: number; cancel_subscriptions_amount?: number } }) => {
      const { data, error } = await supabase.functions.invoke('cash-flow-forecast', {
        body: { household_id: household!.id, ...params },
      });
      if (error) throw error;
      return data;
    },
  });
}

export function useNormalizeMerchants() {
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('normalize-merchants', {
        body: { household_id: household!.id },
      });
      if (error) throw error;
      return data;
    },
  });
}
