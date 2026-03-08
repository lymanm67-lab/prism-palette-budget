import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/use-finance-data';
import { formatDate } from '@/lib/seed-data';
import { useCurrency } from '@/hooks/use-currency';
import { Plus, RefreshCw, Landmark, CreditCard, TrendingUp, PiggyBank, Car, Loader2, Trash2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';
import PlaidLinkButton from '@/components/PlaidLinkButton';
import MxConnectButton from '@/components/MxConnectButton';
import PageOverview from '@/components/PageOverview';

type AccountType = Database['public']['Enums']['account_type'];

const ACCOUNT_ICONS: Record<string, React.ElementType> = {
  checking: Landmark, savings: PiggyBank, credit: CreditCard, investment: TrendingUp, loan: Car, other: Landmark,
};
const TYPE_COLORS: Record<string, string> = {
  checking: 'bg-prism-violet/10 text-prism-violet', savings: 'bg-prism-teal/10 text-prism-teal',
  credit: 'bg-prism-rose/10 text-prism-rose', investment: 'bg-prism-sky/10 text-prism-sky',
  loan: 'bg-prism-amber/10 text-prism-amber', other: 'bg-muted text-muted-foreground',
};

const Accounts = () => {
  const { formatCurrency } = useCurrency();
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const deleteAccount = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', institution: '', account_type: 'checking' as AccountType, balance: '' });

  const grouped = (accounts || []).reduce((acc, acct) => {
    const inst = acct.institution || 'Manual';
    (acc[inst] = acc[inst] || []).push(acct);
    return acc;
  }, {} as Record<string, typeof accounts>);

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

  if (isLoading) return (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-2xl prism-gradient prism-glow flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Accounts</span>
          </h1>
          <p className="text-muted-foreground mt-1">All your connected financial accounts.</p>
        </div>
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
        <div className="flex flex-wrap gap-2">
          <PlaidLinkButton />
          <MxConnectButton />
          <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 prism-gradient text-white border-0 hover:opacity-90"><Plus className="h-4 w-4" /> Add Account</Button>
          </DialogTrigger>
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
        </div>
      </div>

      {Object.keys(grouped).length === 0 && (
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

      {Object.entries(grouped).map(([institution, accts]) => (
        <motion.div key={institution} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="prism-card-shine border-border/50 hover-border-glow">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-prism-sky to-prism-indigo flex items-center justify-center">
                  <Landmark className="h-3.5 w-3.5 text-white" />
                </div>
                {institution}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {accts!.map((acc) => {
                const Icon = ACCOUNT_ICONS[acc.account_type] || Landmark;
                const GRADIENT_MAP: Record<string, string> = {
                  checking: 'from-prism-violet to-prism-indigo',
                  savings: 'from-prism-teal to-prism-lime',
                  credit: 'from-prism-rose to-prism-orange',
                  investment: 'from-prism-sky to-prism-teal',
                  loan: 'from-prism-amber to-prism-orange',
                  other: 'from-muted-foreground to-muted-foreground',
                };
                return (
                  <div key={acc.id} className="flex items-center gap-4 rounded-xl border border-border/30 p-4 interactive-row hover-border-glow group cursor-default">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${GRADIENT_MAP[acc.account_type]} transition-transform duration-300 group-hover:scale-110`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {acc.last_synced_at ? `Last synced ${formatDate(acc.last_synced_at)}` : 'Manual account'}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{acc.account_type}</Badge>
                    <span className={`font-display text-lg font-semibold ${acc.balance >= 0 ? 'text-prism-teal' : 'text-prism-rose'}`}>
                      {formatCurrency(acc.balance)}
                    </span>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
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
                            onClick={() => deleteAccount.mutate(acc.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default Accounts;
