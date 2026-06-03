import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount } from '@/hooks/use-finance-data';
import { useSyncSnapTrade, useSnapTradeConnections, useRevokeSnapTrade, useReconnectSnapTrade, usePlaidConnections, useRevokePlaid } from '@/hooks/use-investment-data';
import { formatDate } from '@/lib/seed-data';
import { useCurrency } from '@/hooks/use-currency';
import { Plus, Landmark, CreditCard, TrendingUp, PiggyBank, Car, Loader2, Trash2, Upload, Pencil, Check, X, MoreHorizontal, BookOpen, Link2, RefreshCw, AlertTriangle, Clock, Unlink, RotateCcw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import PlaidLinkButton, { type PlaidLinkButtonHandle } from '@/components/PlaidLinkButton';
import MxConnectButton from '@/components/MxConnectButton';
import SnapTradeConnectButton, { type SnapTradeConnectHandle } from '@/components/SnapTradeConnectButton';
import PageOverview from '@/components/PageOverview';
import CsvImportDialog from '@/components/CsvImportDialog';
import BankExportGuide from '@/components/BankExportGuide';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
import ConnectionTrustBadges from '@/components/ConnectionTrustBadges';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQueryClient } from '@tanstack/react-query';
type AccountType = Database['public']['Enums']['account_type'];

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  checking: Landmark, savings: PiggyBank, credit: CreditCard, investment: TrendingUp, loan: Car, other: Landmark,
};

const GRADIENT_MAP: Record<string, string> = {
  checking: 'from-prism-violet to-prism-indigo',
  savings: 'from-prism-teal to-prism-lime',
  credit: 'from-prism-rose to-prism-orange',
  investment: 'from-prism-sky to-prism-teal',
  loan: 'from-prism-amber to-prism-orange',
  other: 'from-muted-foreground to-muted-foreground',
};

const Accounts = () => {
  const { formatCurrency } = useCurrency();
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const syncSnapTrade = useSyncSnapTrade();
  const { data: snapConnections } = useSnapTradeConnections();
  const revokeSnapTrade = useRevokeSnapTrade();
  const reconnectSnapTrade = useReconnectSnapTrade();
  const { data: plaidConnections } = usePlaidConnections();
  const revokePlaid = useRevokePlaid();
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: '', institution: '', account_type: 'checking' as AccountType, balance: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editingBalanceId, setEditingBalanceId] = useState<string | null>(null);
  const [editBalance, setEditBalance] = useState('');
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingAccountId, setRefreshingAccountId] = useState<string | null>(null);
  const snapTradeRef = useRef<SnapTradeConnectHandle>(null);
  const plaidLinkRef = useRef<PlaidLinkButtonHandle>(null);

  const [updateLinkToken, setUpdateLinkToken] = useState<string | null>(null);
  const [relinkingInstitution, setRelinkingInstitution] = useState<string | null>(null);
  const [relinkingPlaidItemId, setRelinkingPlaidItemId] = useState<string | null>(null);
  const plaidLinkOpenedRef = useRef(false);

  // Tick every 30s so "X minutes ago" labels update live
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const normalizeInstitution = useCallback((value: string | null | undefined) => (value || '').trim().toLowerCase(), []);

  const isSameInstitution = useCallback((accountInstitution: string | null | undefined, plaidInstitution: string | null | undefined) => {
    const left = normalizeInstitution(accountInstitution);
    const right = normalizeInstitution(plaidInstitution);
    if (!left || !right) return false;
    return left === right || left.includes(right) || right.includes(left);
  }, [normalizeInstitution]);

  // Detect stale Plaid connections for the banner
  const stalePlaidItems = useMemo(() => {
    if (!plaidConnections) return [];
    return plaidConnections.filter((item: any) => {
      if (item.plaid_item_id?.startsWith('USR-')) return false;
      const isStaleItem = item.updated_at && (Date.now() - new Date(item.updated_at).getTime() > 48 * 60 * 60 * 1000);
      return item.status === 'error' || isStaleItem;
    });
  }, [plaidConnections]);

  const requestPlaidRelink = useCallback(async (
    plaidItemId: string,
    institutionName: string | null | undefined,
    silentExpectedErrors = false
  ) => {
    if (!household) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      setRelinkingInstitution(institutionName || 'Bank');
      setRelinkingPlaidItemId(plaidItemId);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const res = await fetch(`${supabaseUrl}/functions/v1/plaid/create-update-link-token`, {
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
      if (res.ok && data.link_token) {
        setUpdateLinkToken(data.link_token);
        return;
      }

      toast.error(`Could not re-link ${institutionName || 'bank'}: ${data.error || 'Unknown error'}`);
    } catch (err) {
      console.error('Re-link request error:', err);
      toast.error(`Could not re-link ${institutionName || 'bank'}`);
    }
  }, [household]);

  // Plaid Link in update mode
  const onUpdateSuccess = useCallback(async () => {
    plaidLinkOpenedRef.current = false;
    toast.success(`${relinkingInstitution || 'Bank'} re-linked! Syncing fresh transactions…`);
    setUpdateLinkToken(null);
    setRelinkingInstitution(null);
    setRelinkingPlaidItemId(null);
    handleRefreshAccounts();
  }, [relinkingInstitution, relinkingPlaidItemId]);

  const { open: openUpdateLink, ready: updateLinkReady } = usePlaidLink({
    token: updateLinkToken,
    onSuccess: onUpdateSuccess,
    onExit: () => {
      plaidLinkOpenedRef.current = false;
      setUpdateLinkToken(null);
      setRelinkingInstitution(null);
      setRelinkingPlaidItemId(null);
    },
  });

  // Auto-open the update Plaid Link when token is ready — only once per token
  useEffect(() => {
    if (updateLinkToken && updateLinkReady && !plaidLinkOpenedRef.current) {
      plaidLinkOpenedRef.current = true;
      toast.info(`Re-linking ${relinkingInstitution || 'bank connection'}…`, { duration: 3000 });
      openUpdateLink();
    }
  }, [updateLinkToken, updateLinkReady, openUpdateLink, relinkingInstitution]);

  const timeAgo = useCallback((dateStr: string | null) => {
    if (!dateStr) return null;
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }, []);

  const handleRefreshSingleAccount = async (accountId: string, providerType: string | null, institution: string | null) => {
    if (!household) return;
    setRefreshingAccountId(accountId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      if (providerType === 'snaptrade') {
        await syncSnapTrade.mutateAsync();
      } else if (!providerType || providerType === 'manual') {
        // Manual accounts have no provider to sync — nothing to pull.
        toast.info('This is a manual account — add transactions manually or connect it to a bank to enable auto-sync.');
        setRefreshingAccountId(null);
        return;
      } else {
        // For Plaid (and similar) connected accounts, trigger Plaid sync
        const res = await fetch(`${supabaseUrl}/functions/v1/plaid/sync-transactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ household_id: household.id }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Sync failed');

        if (data.new_transactions > 0 && data.new_transaction_ids?.length) {
          toast.success(`${data.new_transactions} new transactions synced`);
          try {
            await supabase.functions.invoke('auto-categorize', {
              body: { transaction_ids: data.new_transaction_ids, household_id: household.id },
            });
          } catch { /* ignore */ }
        } else {
          toast.success('Account refreshed — no new transactions');
        }
      }


      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh account');
    }
    setRefreshingAccountId(null);
  };
  const handleRefreshAccounts = async () => {
    if (!household) return;
    setRefreshing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      // Sync Plaid + SnapTrade in parallel
      const [plaidRes] = await Promise.allSettled([
        fetch(`${supabaseUrl}/functions/v1/plaid/sync-transactions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ household_id: household.id }),
        }).then(async r => {
          const d = await r.json();
          if (!r.ok) throw new Error(d.error || 'Plaid sync failed');
          return d;
        }),
        syncSnapTrade.mutateAsync(),
      ]);

      qc.invalidateQueries({ queryKey: ['accounts'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['investment_holdings'] });

      if (plaidRes.status === 'fulfilled') {
        const data = plaidRes.value;
        if (data.new_transactions > 0 && data.new_transaction_ids?.length) {
          toast.success(`Synced ${data.accounts_updated} accounts, ${data.new_transactions} new transactions. Running auto-categorize…`);
          try {
            const { data: catData, error: catError } = await supabase.functions.invoke('auto-categorize', {
              body: { transaction_ids: data.new_transaction_ids, household_id: household.id },
            });
            if (!catError && catData?.categorized > 0) {
              const parts = [];
              if (catData.rule_matched > 0) parts.push(`${catData.rule_matched} by rules`);
              if (catData.ai_categorized > 0) parts.push(`${catData.ai_categorized} by AI`);
              toast.success(`Auto-categorized ${catData.categorized} transactions${parts.length ? ` (${parts.join(', ')})` : ''}`);
              qc.invalidateQueries({ queryKey: ['transactions'] });
            }
          } catch {
            toast.warning('Sync complete but auto-categorize failed');
          }
        } else {
          toast.success(`Refreshed: ${data.accounts_updated} accounts updated, ${data.new_transactions} new transactions`);
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh accounts');
    }
    setRefreshing(false);
  };

  // Group accounts by type category
  const accountGroups = (accounts || []).reduce((acc, acct) => {
    let group: string;
    if (acct.account_type === 'investment') group = 'Investments';
    else if (acct.account_type === 'credit') group = 'Credit Cards';
    else if (acct.account_type === 'loan') group = 'Loans';
    else group = 'Banking';
    (acc[group] = acc[group] || []).push(acct);
    return acc;
  }, {} as Record<string, typeof accounts>);

  const GROUP_ORDER = ['Banking', 'Credit Cards', 'Investments', 'Loans'];
  const sortedGroups = GROUP_ORDER.filter(g => accountGroups[g]?.length);

  const isStale = (lastSyncedAt: string | null) => {
    if (!lastSyncedAt) return false;
    const diff = Date.now() - new Date(lastSyncedAt).getTime();
    return diff > 48 * 60 * 60 * 1000; // 48 hours
  };

  const handleCreate = async () => {
    await createAccount.mutateAsync({
      name: form.name,
      institution: form.institution || null,
      account_type: form.account_type,
      balance: parseFloat(form.balance) || 0,
    });
    setForm({ name: '', institution: '', account_type: 'checking', balance: '' });
    setOpen(false);
  };

  const startEditing = (id: string, currentName: string) => {
    setEditingId(id);
    setEditName(currentName);
  };

  const saveEdit = async (id: string) => {
    if (!editName.trim()) return;
    try {
      await updateAccount.mutateAsync({ id, name: editName.trim() });
      toast.success('Account renamed');
    } catch {
      toast.error('Failed to rename account');
    }
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const startEditingBalance = (id: string, currentBalance: number) => {
    setEditingBalanceId(id);
    setEditBalance(String(currentBalance));
  };

  const saveBalanceEdit = async (id: string) => {
    const parsed = parseFloat(editBalance);
    if (isNaN(parsed)) return;
    try {
      await updateAccount.mutateAsync({ id, balance: parsed });
      toast.success('Balance updated');
    } catch {
      toast.error('Failed to update balance');
    }
    setEditingBalanceId(null);
    setEditBalance('');
  };

  const cancelBalanceEdit = () => {
    setEditingBalanceId(null);
    setEditBalance('');
  };

  if (isLoading) return (
    <div className="p-8">
      <div className="mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-2" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );

  if (!accounts?.length) {
    return (
      <TooltipProvider>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              <span className="prism-gradient-text">Accounts</span>
            </h1>
          </div>
          <EmptyState
            icon={Landmark}
            title="No accounts yet"
            description="Start by adding your first account or connect your bank with Plaid for automatic transaction syncing."
            actionLabel="Add Account"
            onAction={() => setOpen(true)}
          />
        </div>
      </TooltipProvider>
    );
  }


  return (
    <TooltipProvider delayDuration={300}>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold truncate">Accounts</h1>
            <p className="text-sm text-muted-foreground truncate">All your connected financial accounts.</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Add Account — primary action */}
            <Dialog open={open} onOpenChange={setOpen}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5 h-8 prism-gradient text-primary-foreground border-0 hover:opacity-90">
                      <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Account</span>
                    </Button>
                  </DialogTrigger>
                </TooltipTrigger>
                <TooltipContent className="sm:hidden"><p>Add Account</p></TooltipContent>
              </Tooltip>
              <DialogContent>
                <DialogHeader><DialogTitle className="font-display">Add Account</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Chase Checking" />
                  </div>
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Input value={form.institution} onChange={e => setForm(f => ({ ...f, institution: e.target.value }))} placeholder="e.g. Chase" />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.account_type} onValueChange={(v: AccountType) => setForm(f => ({ ...f, account_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['checking', 'savings', 'credit', 'investment', 'loan', 'other'].map(t => (
                          <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Starting Balance</Label>
                    <Input type="number" step="0.01" value={form.balance} onChange={e => setForm(f => ({ ...f, balance: e.target.value }))} placeholder="0.00" />
                  </div>
                  <Button onClick={handleCreate} disabled={!form.name || createAccount.isPending} className="w-full prism-gradient text-primary-foreground border-0 hover:opacity-90">
                    {createAccount.isPending ? 'Creating...' : 'Add Account'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Refresh — sync connected accounts */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={handleRefreshAccounts} disabled={refreshing}>
                  <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} /> <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Refresh'}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Sync bank connections</p></TooltipContent>
            </Tooltip>

            {/* Import — icon on mobile, text on desktop */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setImportOpen(true)}>
                  <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Import</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent className="sm:hidden"><p>Import Transactions</p></TooltipContent>
            </Tooltip>

            {/* More menu — contains Plaid, MX, Page Guide */}
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent><p>More options</p></TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => {
                  plaidLinkRef.current?.connect();
                }}>
                  <Landmark className="h-4 w-4" /> Connect Bank (Plaid)
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => {
                  snapTradeRef.current?.connect();
                }}>
                  <TrendingUp className="h-4 w-4" /> Connect Investment (SnapTrade)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onSelect={() => {
                  const mxBtn = document.querySelector('[data-mx-trigger]') as HTMLButtonElement;
                  mxBtn?.click();
                }}>
                  <Link2 className="h-4 w-4" /> Connect via MX
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="gap-2" onSelect={() => setPageGuideOpen(true)}>
                  <BookOpen className="h-4 w-4" /> Page Guide
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Hidden triggers for Plaid/MX/SnapTrade accessed via dropdown */}
        <div className="hidden">
          <PlaidLinkButton ref={plaidLinkRef} />
          <MxConnectButton />
          <SnapTradeConnectButton ref={snapTradeRef} />
        </div>

        {/* Trust badges for data connections */}
        <ConnectionTrustBadges />

        {pageGuideOpen && (
          <PageOverview
            title="Accounts Overview"
            description="Add and manage your bank accounts, credit cards, investment accounts, and loans. Connect via Plaid for auto-sync."
            icon={Landmark}
            iconColor="text-prism-sky"
            ttsScript="Welcome to the Accounts page. Here you can see all your financial accounts in one place. Click Add Account to manually add a checking, savings, credit card, investment, or loan account. You can also connect your bank automatically using Plaid for real-time transaction syncing. Each account shows its current balance, type, and institution. Accounts are grouped by institution for easy viewing. You can delete accounts you no longer need."
            features={[
              'Add checking, savings, credit, investment, and loan accounts',
              'Auto-sync with Plaid bank connection',
              'View balances grouped by institution',
              'Track account types with color-coded icons',
            ]}
            demoData={[
              { label: 'Chase Checking', value: '$4,250.00', badge: 'Checking', color: '#7c3aed' },
              { label: 'Amex Platinum', value: '-$1,234.56', badge: 'Credit', color: '#f43f5e' },
              { label: 'Vanguard 401k', value: '$45,000.00', badge: 'Investment', color: '#0ea5e9' },
              { label: 'Marcus Savings', value: '$12,500.00', badge: 'Savings', color: '#14b8a6' },
            ]}
          />
        )}

        {/* Stale connection banner */}
        {(() => {
          const staleAccounts = (accounts || []).filter(a => a.last_synced_at && isStale(a.last_synced_at) && a.provider_type && a.provider_type !== 'manual');
          if (!staleAccounts.length) return null;
          const staleNames = staleAccounts.map(a => a.institution || a.name);
          const uniqueInstitutions = [...new Set(staleNames)];
          return (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-prism-amber/40 bg-prism-amber/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-prism-amber/15 flex items-center justify-center shrink-0 mt-0.5">
                      <AlertTriangle className="h-5 w-5 text-prism-amber" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {staleAccounts.length === 1 ? '1 account needs attention' : `${staleAccounts.length} accounts need attention`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {uniqueInstitutions.join(', ')} {uniqueInstitutions.length === 1 ? 'hasn\'t' : 'haven\'t'} synced in over 48 hours. 
                        The connection may need to be re-linked.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 flex-1 sm:flex-none border-prism-amber/30 text-prism-amber hover:bg-prism-amber/10 hover:text-prism-amber"
                      onClick={handleRefreshAccounts}
                      disabled={refreshing}
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                      Try Refresh
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 gap-1.5 flex-1 sm:flex-none bg-prism-amber hover:bg-prism-amber/90 text-primary-foreground border-0"
                      disabled={!!updateLinkToken || stalePlaidItems.length === 0}
                      onClick={() => {
                        const firstStalePlaid = stalePlaidItems[0];
                        if (!firstStalePlaid) return;
                        requestPlaidRelink(firstStalePlaid.plaid_item_id, firstStalePlaid.institution_name, false);
                      }}
                    >
                      <RotateCcw className={`h-3.5 w-3.5 ${updateLinkToken ? 'animate-spin' : ''}`} />
                      {updateLinkToken ? 'Re-linking…' : 'Re-link'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })()}

        {sortedGroups.length === 0 && (
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-2xl prism-gradient prism-glow flex items-center justify-center mb-4">
                <Landmark className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="font-display text-lg font-bold mb-1">No accounts yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm">Add your first account to start tracking your finances.</p>
            </CardContent>
          </Card>
        )}

        {sortedGroups.map((groupName) => {
          const accts = accountGroups[groupName]!;
          const groupTotal = accts.reduce((sum, a) => sum + a.balance, 0);
          const GroupIcon = groupName === 'Investments' ? TrendingUp
            : groupName === 'Credit Cards' ? CreditCard
            : groupName === 'Loans' ? Car
            : Landmark;
          const groupGradient = groupName === 'Investments' ? 'from-prism-sky to-prism-teal'
            : groupName === 'Credit Cards' ? 'from-prism-rose to-prism-orange'
            : groupName === 'Loans' ? 'from-prism-amber to-prism-orange'
            : 'from-prism-violet to-prism-indigo';

          return (
            <motion.div key={groupName} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="prism-card-shine border-border/50 hover-border-glow">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2.5">
                    <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${groupGradient} flex items-center justify-center`}>
                      <GroupIcon className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                    {groupName}
                    <Badge variant="outline" className="text-[10px] ml-1">{accts.length}</Badge>
                  </CardTitle>
                  <span className={`font-display text-lg font-bold ${groupTotal >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                    {formatCurrency(groupTotal)}
                  </span>
                </CardHeader>
                <CardContent className="space-y-2">
                  {accts.map((acc) => {
                    const Icon = ACCOUNT_ICONS[acc.account_type] || Landmark;
                    const isEditing = editingId === acc.id;
                    const stale = isStale(acc.last_synced_at);
                    const stalePlaidItem = stale && acc.provider_type === 'plaid'
                      ? stalePlaidItems.find((item: any) => isSameInstitution(acc.institution, item.institution_name))
                      : null;
                    const canManualRelink = Boolean(stalePlaidItem) && !updateLinkToken;
                     return (
                      <div key={acc.id} className="rounded-xl border border-border/30 p-3 sm:p-4 interactive-row hover-border-glow group cursor-default space-y-2 sm:space-y-0">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${GRADIENT_MAP[acc.account_type]} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') saveEdit(acc.id);
                                    if (e.key === 'Escape') cancelEdit();
                                  }}
                                  className="h-8 text-sm"
                                  autoFocus
                                />
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-prism-teal hover:text-prism-teal" onClick={() => saveEdit(acc.id)}>
                                      <Check className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Save</TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={cancelEdit}>
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Cancel</TooltipContent>
                                </Tooltip>
                              </div>
                            ) : (
                              <>
                                <p className="font-medium text-sm leading-tight">{acc.name}</p>
                                {acc.institution && (
                                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{acc.institution}</p>
                                )}
                              </>
                            )}
                          </div>
                          {editingBalanceId === acc.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <Input
                                type="number"
                                step="0.01"
                                value={editBalance}
                                onChange={e => setEditBalance(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') saveBalanceEdit(acc.id);
                                  if (e.key === 'Escape') cancelBalanceEdit();
                                }}
                                className="h-8 w-28 text-sm text-right tabular-nums"
                                autoFocus
                              />
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-prism-teal hover:text-prism-teal" onClick={() => saveBalanceEdit(acc.id)}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={cancelBalanceEdit}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  className={`font-display text-sm sm:text-lg font-semibold tabular-nums shrink-0 hover:underline hover:decoration-dotted cursor-pointer bg-transparent border-0 p-0 ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}
                                  onClick={() => startEditingBalance(acc.id, acc.balance)}
                                >
                                  {formatCurrency(acc.balance)}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Click to edit balance</TooltipContent>
                            </Tooltip>
                          )}
                        </div>

                        {/* Meta row + actions */}
                        <div className="flex items-center justify-between pl-12 sm:pl-14">
                          <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                            <Badge variant="secondary" className="text-[10px] capitalize">{acc.account_type}</Badge>
                            {acc.provider_type && acc.provider_type !== 'manual' && (
                              <Badge variant="outline" className="text-[9px] capitalize">{acc.provider_type}</Badge>
                            )}
                            {acc.last_synced_at ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className={`text-[11px] flex items-center gap-0.5 ${stale ? 'text-prism-amber' : 'text-muted-foreground'}`}>
                                    {stale ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                    {timeAgo(acc.last_synced_at)}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {stale
                                    ? `Stale — last synced ${formatDate(acc.last_synced_at)}`
                                    : `Synced ${formatDate(acc.last_synced_at)}`}
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-[11px] text-muted-foreground">Manual</span>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-prism-teal"
                                  disabled={refreshingAccountId === acc.id}
                                  onClick={() => handleRefreshSingleAccount(acc.id, acc.provider_type, acc.institution)}
                                >
                                  <RefreshCw className={`h-3.5 w-3.5 ${refreshingAccountId === acc.id ? 'animate-spin' : ''}`} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Refresh account</TooltipContent>
                            </Tooltip>
                            {stale && acc.provider_type === 'plaid' && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    disabled={!canManualRelink}
                                    onClick={() => {
                                      if (!stalePlaidItem) return;
                                      requestPlaidRelink(stalePlaidItem.plaid_item_id, stalePlaidItem.institution_name, false);
                                    }}
                                  >
                                    <RotateCcw className={`h-3.5 w-3.5 ${relinkingPlaidItemId === stalePlaidItem?.plaid_item_id ? 'animate-spin' : ''}`} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>{canManualRelink ? 'Re-link stale Plaid connection' : 'Re-link unavailable'}</TooltipContent>
                              </Tooltip>
                            )}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="gap-2" onSelect={() => startEditing(acc.id, acc.name)}>
                                  <Pencil className="h-3.5 w-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem className="gap-2 text-destructive focus:text-destructive" onSelect={e => e.preventDefault()}>
                                      <Trash2 className="h-3.5 w-3.5" /> Delete
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete "{acc.name}"?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete this account and all its transactions. This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => {
                                          deleteAccount.mutate(acc.id, {
                                            onSuccess: () => toast.success(`"${acc.name}" deleted successfully`),
                                            onError: () => toast.error(`Failed to delete "${acc.name}"`),
                                          });
                                        }}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Connected Services — Plaid + SnapTrade */}
        {((snapConnections && snapConnections.length > 0) || (plaidConnections && plaidConnections.length > 0)) && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-sky to-prism-teal flex items-center justify-center">
                  <Link2 className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                Connected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {/* Plaid Connections */}
              {plaidConnections?.map((item: any) => {
                const isErrored = item.status === 'error';
                const isStaleItem = item.updated_at && (Date.now() - new Date(item.updated_at).getTime() > 48 * 60 * 60 * 1000);
                const needsAttention = isErrored || isStaleItem;
                const consentExpiring = item.consent_expiration && (new Date(item.consent_expiration).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000);

                return (
                  <div key={item.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border group ${needsAttention || consentExpiring ? 'border-prism-amber/40 bg-prism-amber/5' : 'border-border/30'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${needsAttention ? 'bg-prism-amber/10' : 'bg-primary/10'}`}>
                        {needsAttention ? <AlertTriangle className="h-4 w-4 text-prism-amber" /> : <Landmark className="h-4 w-4 text-primary" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{item.institution_name || 'Bank Connection'}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant={item.status === 'active' && !isStaleItem ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                            {isStaleItem && item.status === 'active' ? 'stale' : item.status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">Plaid</span>
                          {consentExpiring && (
                            <span className="text-[10px] text-prism-amber font-medium">Consent expiring soon</span>
                          )}
                          {!needsAttention && !consentExpiring && (
                            <span className="text-[10px] text-muted-foreground">
                              Connected {new Date(item.created_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <AlertDialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                <Unlink className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent>Revoke connection</TooltipContent>
                        </Tooltip>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke "{item.institution_name || 'Bank Connection'}"?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will disconnect the bank and stop syncing transactions. Your existing data will remain but won't be updated.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => revokePlaid.mutate({ plaidItemId: item.plaid_item_id })}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              {revokePlaid.isPending ? 'Revoking...' : 'Revoke Access'}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                );
              })}

              {/* SnapTrade Connections */}
              {snapConnections?.map((conn: any) => {
                const isErrored = conn.status === 'error' || conn.status === 'stale';
                const isStaleConn = conn.updated_at && (Date.now() - new Date(conn.updated_at).getTime() > 48 * 60 * 60 * 1000);
                const needsReconnect = isErrored || isStaleConn;

                return (
                <div key={conn.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border group ${needsReconnect ? 'border-prism-amber/40 bg-prism-amber/5' : 'border-border/30'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${needsReconnect ? 'bg-prism-amber/10' : 'bg-primary/10'}`}>
                      {needsReconnect ? <AlertTriangle className="h-4 w-4 text-prism-amber" /> : <TrendingUp className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{conn.institution_name || 'Investment Connection'}</p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant={conn.status === 'active' && !isStaleConn ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                          {isStaleConn && conn.status === 'active' ? 'stale' : conn.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">SnapTrade</span>
                        {needsReconnect && (
                          <span className="text-[10px] text-prism-amber font-medium">Needs re-authorization</span>
                        )}
                        {!needsReconnect && (
                          <span className="text-[10px] text-muted-foreground">
                            Connected {new Date(conn.created_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* Reconnect button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={needsReconnect ? 'default' : 'ghost'}
                          size={needsReconnect ? 'sm' : 'icon'}
                          className={needsReconnect
                            ? 'h-8 gap-1.5 text-xs bg-prism-amber hover:bg-prism-amber/90 text-primary-foreground'
                            : 'h-8 w-8 text-muted-foreground hover:text-primary sm:opacity-0 sm:group-hover:opacity-100 transition-opacity'
                          }
                          disabled={reconnectSnapTrade.isPending}
                          onClick={() => reconnectSnapTrade.mutate({
                            connectionId: conn.id,
                            snaptradeUserId: conn.snaptrade_user_id,
                            snaptradeUserSecret: conn.snaptrade_user_secret,
                          })}
                        >
                          {reconnectSnapTrade.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="h-4 w-4" />
                          )}
                          {needsReconnect && <span className="hidden sm:inline">Reconnect</span>}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>{needsReconnect ? 'Re-authorize this connection' : 'Reconnect'}</TooltipContent>
                    </Tooltip>

                    {/* Revoke button */}
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <Unlink className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Revoke connection</TooltipContent>
                      </Tooltip>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke "{conn.institution_name || 'Investment Connection'}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will disconnect the brokerage and stop syncing holdings. Your existing data will remain but won't be updated.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              revokeSnapTrade.mutate({
                                connectionId: conn.id,
                                snaptradeUserId: conn.snaptrade_user_id,
                                snaptradeUserSecret: conn.snaptrade_user_secret,
                                authorizationId: conn.brokerage_authorization_id || undefined,
                              });
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {revokeSnapTrade.isPending ? 'Revoking...' : 'Revoke Access'}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <BankExportGuide />
        <CsvImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </motion.div>
    </TooltipProvider>
  );
};

export default Accounts;
