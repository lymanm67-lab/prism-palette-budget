import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

export function useSubscriptions() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['subscriptions', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions' as any)
        .select('*, categories(name, color)')
        .eq('household_id', household!.id)
        .order('average_amount', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });
}

export function useUpdateSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase
        .from('subscriptions' as any)
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useDeleteSubscription() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('subscriptions' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useDetectSubscriptions() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detect-subscriptions', {
        body: { household_id: household!.id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  });
}

export function useSubscriptionInsights() {
  const { household } = useHousehold();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('subscription-insights', {
        body: { household_id: household!.id },
      });
      if (error) throw error;
      return data;
    },
  });
}
