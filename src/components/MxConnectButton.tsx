import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Loader2, Link2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const MX_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/mx`;

export default function MxConnectButton() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [widgetUrl, setWidgetUrl] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
      'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    };
  };

  const handleConnect = async () => {
    if (!household) return;
    setLoading(true);
    try {
      const headers = await getAuthHeaders();

      // Step 1: Create MX user
      const createRes = await fetch(`${MX_FUNCTION_URL}/create-user`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ household_id: household.id }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || 'Failed to create MX user');

      const mxUserGuid = createData.mx_user_guid;

      // Step 2: Get Connect Widget URL
      const widgetRes = await fetch(`${MX_FUNCTION_URL}/connect-widget`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ mx_user_guid: mxUserGuid }),
      });
      const widgetData = await widgetRes.json();
      if (!widgetRes.ok) throw new Error(widgetData.error || 'Failed to get widget URL');

      setWidgetUrl(widgetData.widget_url);
    } catch (e: any) {
      toast.error(e.message || 'Failed to connect to MX');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    if (!household) return;
    setSyncing(true);
    try {
      const headers = await getAuthHeaders();

      // Get MX user guid from our records
      const createRes = await fetch(`${MX_FUNCTION_URL}/create-user`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ household_id: household.id }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error);

      // Sync
      const syncRes = await fetch(`${MX_FUNCTION_URL}/sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          household_id: household.id,
          mx_user_guid: createData.mx_user_guid,
        }),
      });
      const syncData = await syncRes.json();
      if (!syncRes.ok) throw new Error(syncData.error);

      setSyncResult(syncData);
      toast.success(`Synced ${syncData.transactions_synced} transactions from ${syncData.accounts_synced + syncData.accounts_updated} accounts`);

      // Refresh queries
      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
    } catch (e: any) {
      toast.error(e.message || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleWidgetClose = () => {
    setWidgetUrl(null);
    // After widget closes, auto-sync
    handleSync();
  };

  return (
    <>
      <div className="flex gap-2">
        <Button onClick={handleConnect} disabled={loading} variant="outline">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
          Connect via MX
        </Button>
        <Button onClick={handleSync} disabled={syncing} variant="outline">
          {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
          Sync MX Data
        </Button>
      </div>

      {/* MX Connect Widget Dialog */}
      <Dialog open={!!widgetUrl} onOpenChange={(o) => !o && handleWidgetClose()}>
        <DialogContent className="max-w-2xl h-[80vh] p-0">
          <DialogHeader className="p-4 pb-0">
            <DialogTitle>Connect Your Bank</DialogTitle>
          </DialogHeader>
          {widgetUrl && (
            <iframe
              src={widgetUrl}
              className="w-full flex-1 border-0 rounded-b-lg"
              title="MX Connect Widget"
              allow="camera"
              style={{ minHeight: '500px' }}
              onLoad={() => {
                // Listen for MX widget postMessage events
                const handler = (e: MessageEvent) => {
                  if (e.data?.mx === true && e.data?.type === 'mx/connect/memberConnected') {
                    toast.success('Bank account connected successfully!');
                    handleWidgetClose();
                    window.removeEventListener('message', handler);
                  }
                };
                window.addEventListener('message', handler);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {syncResult && (
        <p className="text-xs text-muted-foreground mt-2">
          Last sync: {syncResult.accounts_synced} new accounts, {syncResult.transactions_synced} new transactions
        </p>
      )}
    </>
  );
}
