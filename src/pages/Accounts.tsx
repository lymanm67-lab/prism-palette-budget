import { useState } from 'react';
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
import { useSyncSnapTrade, useSnapTradeConnections, useRevokeSnapTrade, useReconnectSnapTrade } from '@/hooks/use-investment-data';
import { formatDate } from '@/lib/seed-data';
import { useCurrency } from '@/hooks/use-currency';
import { Plus, Landmark, CreditCard, TrendingUp, PiggyBank, Car, Loader2, Trash2, Upload, Pencil, Check, X, MoreHorizontal, BookOpen, Link2, RefreshCw, AlertTriangle, Clock, Unlink, RotateCcw } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import MxConnectButton from '@/components/MxConnectButton';
import SnapTradeConnectButton from '@/components/SnapTradeConnectButton';
import PageOverview from '@/components/PageOverview';
import CsvImportDialog from '@/components/CsvImportDialog';
import BankExportGuide from '@/components/BankExportGuide';
import { toast } from 'sonner';
import { EmptyState } from '@/components/EmptyState';
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
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [form, setForm] = useState({ name: '', institution: '', account_type: 'checking' as AccountType, balance: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [pageGuideOpen, setPageGuideOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

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
                    <Button size="sm" className="gap-1.5 h-8 prism-gradient text-white border-0 hover:opacity-90">
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
                  <Button onClick={handleCreate} disabled={!form.name || createAccount.isPending} className="w-full prism-gradient text-white border-0 hover:opacity-90">
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
                  const plaidBtn = document.querySelector('[data-plaid-trigger]') as HTMLButtonElement;
                  plaidBtn?.click();
                }}>
                  <Landmark className="h-4 w-4" /> Connect Bank (Plaid)
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => {
                  const snapBtn = document.querySelector('[data-snaptrade-trigger]') as HTMLButtonElement;
                  snapBtn?.click();
                }}>
                  <TrendingUp className="h-4 w-4" /> Connect Investment Account
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => {
                  const fidelityBtn = document.querySelector('[data-snaptrade-fidelity]') as HTMLButtonElement;
                  fidelityBtn?.click();
                }}>
                  <TrendingUp className="h-4 w-4" /> Connect Fidelity
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
          <PlaidLinkButton />
          <MxConnectButton />
          <SnapTradeConnectButton />
          <SnapTradeConnectButton broker="FIDELITY" label="Connect Fidelity" className="[&]:hidden" />
        </div>

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

        {sortedGroups.length === 0 && (
          <Card className="prism-card-shine border-border/50">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="h-16 w-16 rounded-2xl prism-gradient prism-glow flex items-center justify-center mb-4">
                <Landmark className="h-8 w-8 text-white" />
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
                      <GroupIcon className="h-3.5 w-3.5 text-white" />
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
                    return (
                      <div key={acc.id} className="flex items-center gap-2 sm:gap-4 rounded-xl border border-border/30 p-3 sm:p-4 interactive-row hover-border-glow group cursor-default">
                        <div className={`flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br ${GRADIENT_MAP[acc.account_type]} transition-transform duration-300 group-hover:scale-110 shrink-0`}>
                          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
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
                              <p className="font-medium text-sm truncate">{acc.name}</p>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="secondary" className="text-[10px] capitalize">{acc.account_type}</Badge>
                                {acc.institution && (
                                  <span className="text-[10px] text-muted-foreground truncate">{acc.institution}</span>
                                )}
                                {acc.provider_type && acc.provider_type !== 'manual' && (
                                  <Badge variant="outline" className="text-[9px] capitalize">{acc.provider_type}</Badge>
                                )}
                                {acc.last_synced_at ? (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className={`text-[11px] flex items-center gap-0.5 ${stale ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                        {stale ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                        {formatDate(acc.last_synced_at)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      {stale ? 'Data may be stale — try refreshing' : `Last synced ${formatDate(acc.last_synced_at)}`}
                                    </TooltipContent>
                                  </Tooltip>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground">Manual</span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        <span className={`font-display text-sm sm:text-lg font-semibold tabular-nums shrink-0 ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                          {formatCurrency(acc.balance)}
                        </span>
                        <div className="flex items-center gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-prism-sky"
                                onClick={() => startEditing(acc.id, acc.name)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Rename</TooltipContent>
                          </Tooltip>
                          <AlertDialog>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
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
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}

        {/* Connected Services — SnapTrade */}
        {snapConnections && snapConnections.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-sky to-prism-teal flex items-center justify-center">
                  <Link2 className="h-3.5 w-3.5 text-white" />
                </div>
                Connected Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {snapConnections.map((conn: any) => (
                <div key={conn.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border/30 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <TrendingUp className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{conn.institution_name || 'Investment Connection'}</p>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={conn.status === 'active' ? 'secondary' : 'destructive'} className="text-[10px] capitalize">
                          {conn.status}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">SnapTrade</span>
                        <span className="text-[10px] text-muted-foreground">
                          Connected {new Date(conn.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
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
              ))}
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
