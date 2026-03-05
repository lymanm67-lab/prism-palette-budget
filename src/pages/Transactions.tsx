import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTransactions, useCreateTransaction, useAccounts, useCategories } from '@/hooks/use-finance-data';
import { formatDate } from '@/lib/seed-data';
import { useCurrency } from '@/hooks/use-currency';
import { Search, ArrowUpRight, ArrowDownRight, Plus, Loader2, Upload, Receipt } from 'lucide-react';
import CsvImportDialog from '@/components/CsvImportDialog';

const Transactions = () => {
  const { formatCurrency } = useCurrency();
  const { data: transactions, isLoading } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', account_id: '', category_id: '', notes: '' });

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const q = search.toLowerCase();
    return transactions.filter(t =>
      (t.merchant?.toLowerCase().includes(q)) ||
      (t.categories?.name?.toLowerCase().includes(q))
    );
  }, [search, transactions]);

  const handleCreate = async () => {
    await createTransaction.mutateAsync({
      date: form.date,
      merchant: form.merchant || null,
      amount: parseFloat(form.amount),
      account_id: form.account_id,
      category_id: form.category_id || null,
      notes: form.notes || null,
    });
    setForm({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', account_id: '', category_id: '', notes: '' });
    setOpen(false);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center p-20">
      <div className="flex flex-col items-center gap-3">
        <div className="h-12 w-12 rounded-2xl prism-gradient prism-glow flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </div>
        <p className="text-sm text-muted-foreground">Loading transactions…</p>
      </div>
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Transactions</span>
          </h1>
          <p className="text-muted-foreground mt-1">All your recent transactions in one place.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 hover-border-glow" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4" /> Import CSV
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 prism-gradient text-white border-0 hover:opacity-90"><Plus className="h-4 w-4" /> Add Transaction</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Transaction</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="-50.00 or 1000.00" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Merchant</Label>
                <Input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} placeholder="e.g. Whole Foods" />
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
              </div>
              <Button onClick={handleCreate} disabled={!form.amount || !form.account_id || createTransaction.isPending} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                {createTransaction.isPending ? 'Adding...' : 'Add Transaction'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 hover-border-glow" />
      </div>

      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {filtered.map((txn) => {
              const isIncome = txn.amount > 0;
              return (
                <div key={txn.id} className="flex items-center gap-4 px-5 py-3.5 interactive-row group">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110 ${isIncome ? 'from-prism-teal to-prism-lime' : 'from-prism-rose to-prism-orange'}`}>
                    {isIncome ? <ArrowUpRight className="h-4 w-4 text-white" /> : <ArrowDownRight className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{txn.merchant || 'No merchant'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(txn.date)} · {txn.accounts?.name}</p>
                  </div>
                  {txn.categories && (
                    <Badge variant="outline" className="text-xs" style={{ borderColor: txn.categories.color, color: txn.categories.color }}>
                      {txn.categories.name}
                    </Badge>
                  )}
                  <span className={`font-display font-semibold whitespace-nowrap ${isIncome ? 'text-prism-teal' : 'text-foreground'}`}>
                    {isIncome ? '+' : ''}{formatCurrency(txn.amount)}
                  </span>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="h-14 w-14 rounded-2xl prism-gradient-warm prism-glow-warm flex items-center justify-center mb-4">
                  <Receipt className="h-7 w-7 text-white" />
                </div>
                <h3 className="font-display text-lg font-bold mb-1">No transactions yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Add your first transaction or connect an account to get started.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </motion.div>
  );
};

export default Transactions;
