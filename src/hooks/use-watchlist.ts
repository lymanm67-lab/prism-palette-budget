import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

export interface WatchlistItem {
  id: string;
  household_id: string;
  symbol: string;
  name: string | null;
  notes: string | null;
  target_price: number | null;
  current_price: number | null;
  price_updated_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useWatchlist() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['investment_watchlist', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('investment_watchlist' as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as WatchlistItem[];
    },
  });
}

export function useAddWatchlistItem() {
  const qc = useQueryClient();
  const { household } = useHousehold();

  return useMutation({
    mutationFn: async (item: { symbol: string; name?: string; notes?: string; target_price?: number }) => {
      if (!household) throw new Error('No household');
      const { data, error } = await (supabase
        .from('investment_watchlist' as any)
        .insert({
          household_id: household.id,
          symbol: item.symbol.toUpperCase(),
          name: item.name || null,
          notes: item.notes || null,
          target_price: item.target_price || null,
        })
        .select()
        .single() as any);
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investment_watchlist'] });
      toast.success('Added to watchlist');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to add'),
  });
}

export function useUpdateWatchlistItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; symbol?: string; name?: string; notes?: string; target_price?: number | null }) => {
      const payload: any = { ...updates, updated_at: new Date().toISOString() };
      if (payload.symbol) payload.symbol = payload.symbol.toUpperCase();
      const { error } = await (supabase
        .from('investment_watchlist' as any)
        .update(payload)
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investment_watchlist'] });
      toast.success('Watchlist item updated');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to update'),
  });
}

export function useDeleteWatchlistItem() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase
        .from('investment_watchlist' as any)
        .delete()
        .eq('id', id) as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['investment_watchlist'] });
      toast.success('Removed from watchlist');
    },
    onError: (err: any) => toast.error(err.message || 'Failed to delete'),
  });
}

export function useRefreshWatchlistPrices() {
  const qc = useQueryClient();
  const { household } = useHousehold();

  return useMutation({
    mutationFn: async () => {
      if (!household) throw new Error('No household');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/refresh-prices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ household_id: household.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to refresh prices');
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['investment_watchlist'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['financial_insights'] });
      const parts: string[] = [];
      if (data.updated > 0) parts.push(`${data.updated} holdings`);
      if (data.watchlist_updated > 0) parts.push(`${data.watchlist_updated} watchlist`);
      if (parts.length) {
        toast.success(`Prices updated: ${parts.join(', ')}`);
      } else {
        toast.info('No symbols to update. Add ticker symbols first.');
      }
      if (data.alerts_triggered > 0) {
        toast.info(`🎯 ${data.alerts_triggered} watchlist item${data.alerts_triggered > 1 ? 's' : ''} hit target price! Check notifications.`);
      }
    },
    onError: (err: any) => toast.error(err.message || 'Failed to refresh prices'),
  });
}
