import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Landmark, Link2, RefreshCw, CreditCard, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';

type PlaidItem = { id: string; institution_name: string | null };
type MethodAccount = { id: string; method_account_id: string; mask: string | null; type: string; status: string };
type MethodLiability = {
  id: string;
  merchant_name: string;
  mask: string | null;
  balance: number | null;
  next_payment_minimum_amount: number | null;
  next_payment_due_date: string | null;
  status: string;
};

export default function MethodLinkPanel() {
  const { household } = useHousehold();
  const [entityReady, setEntityReady] = useState(false);
  const [sources, setSources] = useState<MethodAccount[]>([]);
  const [liabilities, setLiabilities] = useState<MethodLiability[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const load = async () => {
    if (!household?.id) return;
    setLoading(true);
    const [entRes, itemsRes, srcsRes, liabsRes] = await Promise.all([
      supabase.from('method_entities').select('id').eq('household_id', household.id).maybeSingle(),
      supabase.rpc('get_plaid_items_safe'),
      supabase.from('method_accounts').select('id, method_account_id, mask, type, status').eq('household_id', household.id),
      supabase
        .from('method_liabilities')
        .select('id, merchant_name, mask, balance, next_payment_minimum_amount, next_payment_due_date, status')
        .eq('household_id', household.id),
    ]);
    if (itemsRes.error) {
      console.error('[MethodLinkPanel] plaid_items error:', itemsRes.error);
      toast.error(`Plaid items load failed: ${itemsRes.error.message}`);
    }
    const items = (itemsRes.data ?? []).filter((it: any) => it.household_id === household.id);
    console.log('[MethodLinkPanel] loaded', { household: household.id, items: items.length, raw: itemsRes.data?.length });
    setEntityReady(!!entRes.data);
    setSources(srcsRes.data ?? []);
    setLiabilities(liabsRes.data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const onFocus = () => load();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household?.id]);

  const openConnect = async () => {
    if (!household?.id) return;
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke('method-connect-token', {
      body: { household_id: household.id },
    });
    setConnecting(false);
    if (error || data?.error || !data?.element_token) {
      toast.error(data?.error ?? error?.message ?? 'Failed to start Connect');
      return;
    }
    // Method Connect Element — open in popup. After user finishes, they manually click Sync.
    const url = `https://elements.methodfi.com/?token=${encodeURIComponent(data.element_token)}`;
    const w = window.open(url, 'method-connect', 'width=480,height=720');
    if (!w) toast.error('Popup blocked — please allow popups and retry');
    else toast.info('Complete the Connect flow, then click "Sync Bills" below.');
  };

  const syncLiabilities = async () => {
    if (!household?.id) return;
    setSyncing(true);
    const { data, error } = await supabase.functions.invoke('method-sync-liabilities', {
      body: { household_id: household.id },
    });
    setSyncing(false);
    if (error || data?.error) {
      toast.error(data?.error ?? error?.message ?? 'Sync failed');
      return;
    }
    toast.success(`Synced ${data?.synced ?? 0} bill${data?.synced === 1 ? '' : 's'}`);
    load();
  };

  if (!entityReady) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Link2 className="h-4 w-4" /> Method Funding & Bills
          </span>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading} className="h-7 px-2">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Funding sources */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Funding Sources
            </h4>
            <Badge variant="secondary">{sources.length}</Badge>
          </div>
          {sources.length === 0 ? (
            <Alert>
              <AlertDescription>
                Method funding requires a verified ACH source and cannot be created from a Plaid bank selection.
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-1 text-sm">
              {sources.map((s) => (
                <li key={s.id} className="flex justify-between rounded border p-2">
                  <span>•••• {s.mask ?? '????'} <span className="text-muted-foreground">({s.type})</span></span>
                  <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                </li>
              ))}
            </ul>
          )}
          <div className="flex items-center justify-between gap-2 rounded border border-dashed p-3">
            <p className="text-xs text-muted-foreground">
              To link real bills, use Method Connect below. Bank account funding setup is not available through Plaid.
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/accounts">
                <Plus className="h-3 w-3 mr-1" /> Manage Banks
              </Link>
            </Button>
          </div>
        </section>

        {/* Liabilities / bills */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Connected Bills
            </h4>
            <Badge variant="secondary">{liabilities.length}</Badge>
          </div>
          {liabilities.length === 0 ? (
            <Alert>
              <AlertDescription>
                No bills connected. Use Connect to authenticate with your billers (credit cards, loans, etc.).
              </AlertDescription>
            </Alert>
          ) : (
            <ul className="space-y-1 text-sm">
              {liabilities.map((l) => (
                <li key={l.id} className="rounded border p-2">
                  <div className="flex justify-between">
                    <span className="font-medium">{l.merchant_name}</span>
                    {l.balance != null && <span>${Number(l.balance).toFixed(2)}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground flex justify-between">
                    <span>•••• {l.mask ?? '????'}</span>
                    {l.next_payment_due_date && (
                      <span>
                        Due {l.next_payment_due_date}
                        {l.next_payment_minimum_amount ? ` — min $${Number(l.next_payment_minimum_amount).toFixed(2)}` : ''}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={openConnect} disabled={connecting}>
              {connecting && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              Connect Bills
            </Button>
            <Button size="sm" variant="outline" onClick={syncLiabilities} disabled={syncing}>
              {syncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1" />}
              Sync Bills
            </Button>
          </div>
        </section>

        {loading && <p className="text-xs text-muted-foreground">Loading…</p>}
      </CardContent>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Pick a depository account</DialogTitle>
          </DialogHeader>
          {pickerLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading accounts…
            </div>
          ) : pickerAccounts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No depository accounts found in this Plaid item.</p>
          ) : (
            <ul className="space-y-2">
              {pickerAccounts.map((a) => (
                <li key={a.account_id} className="flex justify-between items-center rounded border p-2">
                  <div className="text-sm">
                    <div className="font-medium">{a.name}</div>
                    <div className="text-xs text-muted-foreground">•••• {a.mask ?? '????'} · {a.subtype}</div>
                  </div>
                  <Button size="sm" onClick={() => linkSource(a)} disabled={linking === a.account_id}>
                    {linking === a.account_id && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                    Use
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
