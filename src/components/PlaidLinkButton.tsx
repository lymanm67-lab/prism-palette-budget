import { useState, useCallback } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Landmark, Loader2, Lock } from 'lucide-react';

const PlaidLinkButton = () => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { household } = useHousehold();
  const { subscribed, subscriptionTier } = useAuth();
  const qc = useQueryClient();

  const createLinkToken = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/plaid/create-link-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create link token');
      setLinkToken(data.link_token);
    } catch (err: any) {
      toast({ title: 'Connection error', description: err.message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  const onSuccess = useCallback(async (publicToken: string, metadata: any) => {
    setSyncing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !household) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/plaid/exchange-token`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_token: publicToken,
            institution: metadata.institution,
            household_id: household.id,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to sync accounts');

      toast({
        title: 'Accounts connected!',
        description: `Synced ${data.accounts_synced} accounts and ${data.transactions_synced} transactions.`,
      });
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    } catch (err: any) {
      toast({ title: 'Sync error', description: err.message, variant: 'destructive' });
    }
    setSyncing(false);
    setLinkToken(null);
  }, [household, toast, qc]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: () => setLinkToken(null),
  });

  // Auto-open Plaid Link when token is ready
  if (linkToken && ready) {
    open();
  }

  if (syncing) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Syncing accounts...
      </Button>
    );
  }

  const hasPlaidAccess = subscribed && (subscriptionTier === 'premium' || subscriptionTier === 'business');

  if (!hasPlaidAccess) {
    return (
      <Button disabled className="gap-2 opacity-70" title="Requires Premium or Business Pro subscription">
        <Lock className="h-4 w-4" /> Connect Bank Account
      </Button>
    );
  }

  return (
    <Button onClick={createLinkToken} disabled={loading} className="gap-2" data-plaid-trigger>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Landmark className="h-4 w-4" />}
      Connect Bank Account
    </Button>
  );
};

export default PlaidLinkButton;
