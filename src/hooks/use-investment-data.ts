import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from 'sonner';

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
          }
        } catch (e) {
          console.error('SnapTrade sync error for connection:', conn.id, e);
        }
      }

      return { accounts_synced: totalAccounts, holdings_synced: totalHoldings };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
      qc.invalidateQueries({ queryKey: ['snaptrade_connections'] });
      if (data.accounts_synced > 0) {
        toast.success(`Investment sync: ${data.accounts_synced} accounts, ${data.holdings_synced} holdings updated`);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to sync investment accounts');
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
