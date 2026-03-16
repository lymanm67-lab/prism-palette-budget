import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

/**
 * Subscribes to Supabase Realtime changes on accounts & transactions tables
 * and auto-invalidates React Query caches so data refreshes automatically.
 */
export function useRealtimeRefresh() {
  const queryClient = useQueryClient();
  const { household } = useHousehold();

  useEffect(() => {
    if (!household?.id) return;

    const channel = supabase
      .channel(`realtime-${household.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accounts',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['accounts', household.id] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `household_id=eq.${household.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['transactions', household.id] });
          queryClient.invalidateQueries({ queryKey: ['transactions_infinite', household.id] });
          queryClient.invalidateQueries({ queryKey: ['transactions_all', household.id] });
          queryClient.invalidateQueries({ queryKey: ['transactions_deleted', household.id] });
          // Also refresh accounts since balances may change
          queryClient.invalidateQueries({ queryKey: ['accounts', household.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household?.id, queryClient]);
}
