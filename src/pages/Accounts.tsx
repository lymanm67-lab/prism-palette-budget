import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAccounts, useCreateAccount } from '@/hooks/use-finance-data';
import { formatCurrency, formatDate } from '@/lib/seed-data';
import { Plus, RefreshCw, Landmark, CreditCard, TrendingUp, PiggyBank, Car, Loader2 } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

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
  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
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

  if (isLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Accounts</h1>
          <p className="text-muted-foreground">All your connected financial accounts.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Add Account</Button>
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
              <Button onClick={handleCreate} disabled={!form.name || createAccount.isPending} className="w-full">
                {createAccount.isPending ? 'Creating...' : 'Add Account'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {Object.keys(grouped).length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No accounts yet. Add your first account to get started.</CardContent></Card>
      )}

      {Object.entries(grouped).map(([institution, accts]) => (
        <Card key={institution}>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="font-display text-lg">{institution}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {accts!.map((acc) => {
              const Icon = ACCOUNT_ICONS[acc.account_type] || Landmark;
              return (
                <div key={acc.id} className="flex items-center gap-4 rounded-lg border border-border/50 p-4 transition-colors hover:bg-muted/30">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${TYPE_COLORS[acc.account_type]}`}>
                    <Icon className="h-5 w-5" />
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
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </motion.div>
  );
};

export default Accounts;
