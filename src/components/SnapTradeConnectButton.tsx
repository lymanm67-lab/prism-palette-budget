import { useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useHousehold } from '@/contexts/HouseholdContext';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { TrendingUp, Loader2, Shield } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface SnapTradeConnectButtonProps {
  broker?: string;
  label?: string;
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export interface SnapTradeConnectHandle {
  connect: () => void;
}

const SnapTradeConnectButton = forwardRef<SnapTradeConnectHandle, SnapTradeConnectButtonProps>(({
  broker,
  label = 'Connect Investment Account',
  variant = 'default',
  className = '',
}, ref) => {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const { toast } = useToast();
  const { household } = useHousehold();
  const qc = useQueryClient();

  const handleConnect = useCallback(async () => {
    if (!household) {
      toast({ title: 'Error', description: 'No household found', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      // Step 1: Check for existing SnapTrade connection or register user
      const { data: existingConnections } = await supabase
        .from('snaptrade_connections' as any)
        .select('*')
        .eq('household_id', household.id)
        .eq('status', 'active')
        .limit(1);

      let snaptradeUserId: string;
      let snaptradeUserSecret: string;

      if (existingConnections && existingConnections.length > 0) {
        snaptradeUserId = (existingConnections[0] as any).snaptrade_user_id;
        snaptradeUserSecret = ''; // Secret is now only accessed server-side
      } else {
        // Register new SnapTrade user
        const registerRes = await fetch(
          `${supabaseUrl}/functions/v1/snaptrade/register-user`,
          { method: 'POST', headers }
        );
        const registerData = await registerRes.json();
        if (!registerRes.ok) throw new Error(registerData.error || 'Failed to register');

        snaptradeUserId = registerData.snaptrade_user_id;
        snaptradeUserSecret = registerData.snaptrade_user_secret;

        // Save connection record
        await supabase.from('snaptrade_connections' as any).insert({
          household_id: household.id,
          snaptrade_user_id: snaptradeUserId,
          snaptrade_user_secret: snaptradeUserSecret,
          status: 'pending',
        });
      }

      // Step 2: Create redirect URL
      const redirectRes = await fetch(
        `${supabaseUrl}/functions/v1/snaptrade/create-redirect`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            snaptrade_user_id: snaptradeUserId,
            snaptrade_user_secret: snaptradeUserSecret,
            broker: broker || undefined,
          }),
        }
      );
      const redirectData = await redirectRes.json();
      if (!redirectRes.ok) throw new Error(redirectData.error || 'Failed to create link');

      // Step 3: Open SnapTrade authorization in new window
      const popup = window.open(redirectData.redirect_url, 'snaptrade-connect', 'width=600,height=700');

      // Poll for popup close, then sync
      const pollInterval = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(pollInterval);
          setSyncing(true);
          setLoading(false);

          try {
            // Get or create the connection record
            const { data: connections } = await (supabase
              .from('snaptrade_connections' as any)
              .select('id')
              .eq('household_id', household.id)
              .eq('snaptrade_user_id', snaptradeUserId)
              .limit(1) as any);

            const connectionId = (connections as any[])?.[0]?.id;

            const syncRes = await fetch(
              `${supabaseUrl}/functions/v1/snaptrade/sync-accounts`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  household_id: household.id,
                  snaptrade_user_id: snaptradeUserId,
                  snaptrade_user_secret: snaptradeUserSecret,
                  connection_id: connectionId,
                }),
              }
            );
            const syncData = await syncRes.json();
            if (!syncRes.ok) throw new Error(syncData.error || 'Failed to sync');

            toast({
              title: 'Investment accounts connected!',
              description: `Synced ${syncData.accounts_synced} accounts and ${syncData.holdings_synced} holdings.`,
            });

            qc.invalidateQueries({ queryKey: ['accounts'] });
            qc.invalidateQueries({ queryKey: ['investment_holdings'] });
          } catch (err: any) {
            toast({ title: 'Sync error', description: err.message, variant: 'destructive' });
          }
          setSyncing(false);
        }
      }, 1000);
    } catch (err: any) {
      toast({ title: 'Connection error', description: err.message, variant: 'destructive' });
      setLoading(false);
    }
  }, [household, broker, toast, qc]);

  useImperativeHandle(ref, () => ({ connect: handleConnect }), [handleConnect]);

  if (syncing) {
    return (
      <Button disabled className="gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Syncing investment accounts...
      </Button>
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={handleConnect}
          disabled={loading}
          variant={variant}
          className={`gap-2 ${className}`}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
          {label}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          onClick={() => setShowInfo(true)}
        >
          <Shield className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={showInfo} onOpenChange={setShowInfo}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Investment Connection Security
            </DialogTitle>
            <DialogDescription>
              How your investment data is protected
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <p>Your brokerage credentials are <strong>never stored</strong> in this app. Authentication happens directly with your brokerage.</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <p>Investment connections are <strong>read-only</strong>. We cannot place trades or move money.</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <p>Bank accounts connect through <strong>Plaid</strong>. Investment accounts connect through <strong>SnapTrade</strong>.</p>
            </div>
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
              <p>You can <strong>revoke access</strong> at any time from the Accounts page.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

SnapTradeConnectButton.displayName = 'SnapTradeConnectButton';

export default SnapTradeConnectButton;
