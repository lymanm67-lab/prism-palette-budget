import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

// ==================== PLAID CONNECTIONS ====================
export function usePlaidConnections() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['plaid_connections', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_plaid_items_safe');
      if (error) throw error;
      return (data || []).filter((item: any) => item.household_id === household!.id && item.status !== 'revoked');
    },
  });
}

export function useRevokePlaid() {
  const qc = useQueryClient();
  const { household } = useHousehold();

  return useMutation({
    mutationFn: async ({ plaidItemId }: { plaidItemId: string }) => {
      if (!household) throw new Error('No household');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/plaid/remove-item`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          household_id: household.id,
          plaid_item_id: plaidItemId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['plaid_connections'] });
      toast.success('Bank connection revoked');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to revoke bank connection');
    },
  });
}

// ==================== INVESTMENT HOLDINGS ====================
export function useInvestmentHoldings(accountId?: string) {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['investment_holdings', household?.id, accountId],
    enabled: !!household,
    queryFn: async () => {
      let query = supabase
        .from('investment_holdings')
        .select('*, accounts(name, institution, balance, last_synced_at)')
        .eq('household_id', household!.id)
        .order('market_value', { ascending: false });

      if (accountId) {
        query = query.eq('account_id', accountId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

// ==================== SNAPTRADE CONNECTIONS ====================
export function useSnapTradeConnections() {
  const { household } = useHousehold();
  return useQuery({
    queryKey: ['snaptrade_connections', household?.id],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('snaptrade_connections' as any)
        .select('*')
        .eq('household_id', household!.id)
        .order('created_at', { ascending: false }) as any);
      if (error) throw error;
      return data as {
        id: string;
        household_id: string;
        snaptrade_user_id: string;
        snaptrade_user_secret: string;
        brokerage_authorization_id: string | null;
        institution_name: string | null;
        status: string;
        created_at: string;
        updated_at: string;
      }[];
    },
  });
}

// ==================== SYNC SNAPTRADE ====================
export function useSyncSnapTrade() {
  const qc = useQueryClient();
  const { household } = useHousehold();

  return useMutation({
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),
    mutationFn: async () => {
      if (!household) throw new Error('No household');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Get active connections
      const { data: connections } = await (supabase
        .from('snaptrade_connections' as any)
        .select('*')
        .eq('household_id', household.id)
        .eq('status', 'active') as any);

      if (!connections?.length) {
        return { accounts_synced: 0, holdings_synced: 0, message: 'No active investment connections' };
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      let totalAccounts = 0;
      let totalHoldings = 0;
      const errors: string[] = [];

      for (const conn of connections) {
        try {
          const res = await fetch(
            `${supabaseUrl}/functions/v1/snaptrade/sync-accounts`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                household_id: household.id,
                snaptrade_user_id: conn.snaptrade_user_id,
                snaptrade_user_secret: conn.snaptrade_user_secret,
                connection_id: conn.id,
              }),
            }
          );
          const data = await res.json();
          if (res.ok) {
            totalAccounts += data.accounts_synced || 0;
            totalHoldings += data.holdings_synced || 0;
          } else {
            errors.push(data.error || `Connection ${conn.institution_name || conn.id} failed`);
          }
        } catch (e) {
          errors.push(`${conn.institution_name || conn.id}: ${e instanceof Error ? e.message : 'Network error'}`);
        }
      }

      if (errors.length > 0 && totalAccounts === 0) {
        throw new Error(errors.join('; '));
      }

      return { accounts_synced: totalAccounts, holdings_synced: totalHoldings, errors };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['snaptrade_connections'] });
      if (data.accounts_synced > 0) {
        toast.success(`Investment sync: ${data.accounts_synced} accounts, ${data.holdings_synced} holdings updated`);
      }
      if (data.errors?.length > 0) {
        toast.warning(`Some connections had issues: ${data.errors.join('; ')}`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to sync investment accounts. Will retry automatically.');
    },
  });
}

// ==================== REVOKE SNAPTRADE ====================
export function useRevokeSnapTrade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      snaptradeUserId,
      snaptradeUserSecret,
      authorizationId,
    }: {
      connectionId: string;
      snaptradeUserId: string;
      snaptradeUserSecret: string;
      authorizationId?: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(
        `${supabaseUrl}/functions/v1/snaptrade/revoke`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snaptrade_user_id: snaptradeUserId,
            snaptrade_user_secret: snaptradeUserSecret,
            authorization_id: authorizationId,
            connection_id: connectionId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to revoke');
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['snaptrade_connections'] });
      toast.success('Investment connection revoked');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to revoke connection');
    },
  });
}

// ==================== RECONNECT SNAPTRADE ====================
export function useReconnectSnapTrade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      connectionId,
      snaptradeUserId,
      snaptradeUserSecret,
    }: {
      connectionId: string;
      snaptradeUserId: string;
      snaptradeUserSecret: string;
    }) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Create a new redirect URL for re-authorization
      const res = await fetch(
        `${supabaseUrl}/functions/v1/snaptrade/create-redirect`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            snaptrade_user_id: snaptradeUserId,
            snaptrade_user_secret: snaptradeUserSecret,
            reconnect: true,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create reconnect link');

      // Open in popup
      const popup = window.open(data.redirect_url, 'snaptrade-reconnect', 'width=600,height=700');

      // Return a promise that resolves when popup closes
      return new Promise<{ connectionId: string }>((resolve, reject) => {
        const pollInterval = setInterval(async () => {
          if (popup?.closed) {
            clearInterval(pollInterval);

            // Mark connection active again
            await (supabase
              .from('snaptrade_connections' as any)
              .update({ status: 'active', updated_at: new Date().toISOString() })
              .eq('id', connectionId) as any);

            // Trigger a sync
            try {
              await fetch(
                `${supabaseUrl}/functions/v1/snaptrade/sync-accounts`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    snaptrade_user_id: snaptradeUserId,
                    snaptrade_user_secret: snaptradeUserSecret,
                    connection_id: connectionId,
                  }),
                }
              );
            } catch (e) {
              console.error('Post-reconnect sync failed:', e);
            }

            resolve({ connectionId });
          }
        }, 1000);

        // Timeout after 5 minutes
        setTimeout(() => {
          clearInterval(pollInterval);
          reject(new Error('Reconnect timed out'));
        }, 5 * 60 * 1000);
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['snaptrade_connections'] });
      toast.success('Connection re-authorized and synced!');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to reconnect');
    },
  });
}

// ==================== REFRESH PRICES (Yahoo Finance) ====================
export function useRefreshPrices() {
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
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      if (data.updated > 0) {
        toast.success(`Updated prices for ${data.updated} holding${data.updated > 1 ? 's' : ''} (${data.symbols_found}/${data.symbols_total} symbols found)`);
      } else {
        toast.info(data.message || 'No holdings to update. Add ticker symbols to your manual holdings.');
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to refresh prices');
    },
  });
}

// ==================== DELETE HOLDING ====================
export function useDeleteHolding() {
  const qc = useQueryClient();
  const { household } = useHousehold();

  return useMutation({
    mutationFn: async (holdingId: string) => {
      if (!household) throw new Error('No household');

      // Fetch holding data before deletion for potential restore
      const { data: holdingData, error: fetchError } = await supabase
        .from('investment_holdings')
        .select('*')
        .eq('id', holdingId)
        .eq('household_id', household.id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('investment_holdings')
        .delete()
        .eq('id', holdingId)
        .eq('household_id', household.id);

      if (error) throw error;
      return { success: true, holdingData };
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      
      const holdingName = data.holdingData?.name || data.holdingData?.symbol || 'Holding';
      
      toast.success(`${holdingName} deleted`, {
        action: {
          label: 'Undo',
          onClick: async () => {
            if (!data.holdingData) return;
            
            // Restore the holding
            const { error } = await supabase
              .from('investment_holdings')
              .insert({
                account_id: data.holdingData.account_id,
                household_id: data.holdingData.household_id,
                symbol: data.holdingData.symbol,
                name: data.holdingData.name,
                quantity: data.holdingData.quantity,
                price: data.holdingData.price,
                market_value: data.holdingData.market_value,
                cost_basis: data.holdingData.cost_basis,
                holding_type: data.holdingData.holding_type,
                currency: data.holdingData.currency,
              });
            
            if (error) {
              toast.error('Failed to restore holding');
              return;
            }
            
            qc.invalidateQueries({ queryKey: ['investment_holdings'] });
            qc.invalidateQueries({ queryKey: ['accounts'] });
            toast.success(`${holdingName} restored`);
          },
        },
      });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to delete holding');
    },
  });
}
