import { useState, useCallback, useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { usePlaidLink, type PlaidLinkOnSuccessMetadata } from 'react-plaid-link';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { Landmark, Loader2, Lock } from 'lucide-react';
import { canUsePlaid } from '@/lib/stripe-plans';

export type PlaidLinkButtonHandle = {
  connect: () => void;
};

const PlaidLinkButton = forwardRef<PlaidLinkButtonHandle>((_, ref) => {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();
  const { household } = useHousehold();
  const { subscriptionTier } = useAuth();
  const qc = useQueryClient();
  const hasPlaidAccess = canUsePlaid(subscriptionTier);

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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create link token';
      toast({ title: 'Connection error', description: message, variant: 'destructive' });
    }
    setLoading(false);
  }, [toast]);

  const onSuccess = useCallback(async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync accounts';
      toast({ title: 'Sync error', description: message, variant: 'destructive' });
    }
    setSyncing(false);
    setLinkToken(null);
  }, [household, toast, qc]);

  const openedTokenRef = useRef<string | null>(null);

  useImperativeHandle(ref, () => ({
    connect: () => {
      if (!hasPlaidAccess || loading || syncing) return;
      createLinkToken();
    },
  }), [createLinkToken, hasPlaidAccess, loading, syncing]);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (error) => {
      openedTokenRef.current = null;
      setLinkToken(null);
      if (error?.display_message || error?.error_message) {
        toast({
          title: 'Plaid closed',
          description: error.display_message || error.error_message,
          variant: 'destructive',
        });
      }
    },
  });

  // Auto-open Plaid Link once per token, only after it's ready
  useEffect(() => {
    if (linkToken && ready && openedTokenRef.current !== linkToken) {
      openedTokenRef.current = linkToken;
      open();
    }
  }, [linkToken, ready, open]);

  // Add a dim backdrop behind Plaid's iframe so the modal is clearly visible in
  // dark mode. Plaid Link inherits prefers-color-scheme and ships no scrim.
  useEffect(() => {
    if (!linkToken) return;

    const backdropId = 'prism-plaid-backdrop';
    const styleId = 'prism-plaid-color-scheme';

    const backdrop = document.createElement('div');
    backdrop.id = backdropId;
    Object.assign(backdrop.style, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(0, 0, 0, 0.65)',
      zIndex: '2147483646', // just below Plaid's iframe (2147483647)
      pointerEvents: 'none',
    } as CSSStyleDeclaration);
    document.body.appendChild(backdrop);

    // Force Plaid's iframe to render with a light color-scheme so the white
    // modal stays readable on top of the dark app.
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `iframe[id^="plaid-link-iframe"]{color-scheme: light;}`;
    document.head.appendChild(style);

    return () => {
      document.getElementById(backdropId)?.remove();
      document.getElementById(styleId)?.remove();
    };
  }, [linkToken]);

  if (syncing) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Syncing accounts...
      </Button>
    );
  }

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
});

PlaidLinkButton.displayName = 'PlaidLinkButton';

export default PlaidLinkButton;
