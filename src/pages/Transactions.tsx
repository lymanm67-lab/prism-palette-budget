import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useTransactions, useCreateTransaction, useAccounts, useCategories } from '@/hooks/use-finance-data';
import { formatDate } from '@/lib/seed-data';
import { useCurrency } from '@/hooks/use-currency';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Search, ArrowUpRight, ArrowDownRight, Plus, Loader2, Upload, Receipt, Trash2, Tags, ArrowRightLeft } from 'lucide-react';
import CsvImportDialog from '@/components/CsvImportDialog';
import TransactionFilters, { emptyFilters, type TransactionFiltersState } from '@/components/TransactionFilters';

const Transactions = () => {
  const { formatCurrency } = useCurrency();
  const { data: transactions, isLoading } = useTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();
  const { household } = useHousehold();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [filters, setFilters] = useState<TransactionFiltersState>(emptyFilters);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState('');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', account_id: '', category_id: '', notes: '' });
  const [transferForm, setTransferForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', from_account: '', to_account: '', notes: '' });

  const filtered = useMemo(() => {
    if (!transactions) return [];
    const q = search.toLowerCase();
    return transactions.filter(t => {
      if (q && !(t.merchant?.toLowerCase().includes(q)) && !((t as any).categories?.name?.toLowerCase().includes(q))) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      if (filters.amountMin && Math.abs(t.amount) < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && Math.abs(t.amount) > parseFloat(filters.amountMax)) return false;
      if (filters.accountId && t.account_id !== filters.accountId) return false;
      if (filters.categoryId && t.category_id !== filters.categoryId) return false;
      return true;
    });
  }, [search, transactions, filters]);

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

  const handleTransfer = async () => {
    if (!household) return;
    const amt = parseFloat(transferForm.amount);
    const { data: outTxn, error: e1 } = await supabase.from('transactions').insert({
      household_id: household.id, account_id: transferForm.from_account, amount: -amt,
      date: transferForm.date, merchant: 'Transfer Out', is_transfer: true, notes: transferForm.notes || null,
    } as any).select().single();
    if (e1) { toast.error(e1.message); return; }
    await supabase.from('transactions').insert({
      household_id: household.id, account_id: transferForm.to_account, amount: amt,
      date: transferForm.date, merchant: 'Transfer In', is_transfer: true,
      transfer_pair_id: outTxn.id, notes: transferForm.notes || null,
    } as any);
    // Link pair
    await supabase.from('transactions').update({ transfer_pair_id: outTxn.id } as any).eq('id', outTxn.id);
    qc.invalidateQueries({ queryKey: ['transactions'] });
    toast.success('Transfer recorded');
    setTransferForm({ date: new Date().toISOString().split('T')[0], amount: '', from_account: '', to_account: '', notes: '' });
    setTransferOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(t => t.id)));
  };

  const bulkDelete = async () => {
    for (const id of selected) {
      await supabase.from('transactions').delete().eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    setSelected(new Set());
    toast.success(`Deleted ${selected.size} transactions`);
  };

  const bulkCategorize = async () => {
    if (!bulkCategory) return;
    for (const id of selected) {
      await supabase.from('transactions').update({ category_id: bulkCategory }).eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    setSelected(new Set());
    setBulkCategory('');
    toast.success(`Categorized ${selected.size} transactions`);
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Transactions</span>
          </h1>
          <p className="text-muted-foreground mt-1">All your recent transactions in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2 hover-border-glow" onClick={() => setCsvOpen(true)} aria-label="Import CSV">
            <Upload className="h-4 w-4" /> <span className="hidden sm:inline">Import CSV</span>
          </Button>
          <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2 hover-border-glow" aria-label="Record transfer">
                <ArrowRightLeft className="h-4 w-4" /> <span className="hidden sm:inline">Transfer</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Record Transfer</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={transferForm.date} onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} placeholder="100.00" />
                </div>
                <div className="space-y-2">
                  <Label>From Account</Label>
                  <Select value={transferForm.from_account} onValueChange={v => setTransferForm(f => ({ ...f, from_account: v }))}>
                    <SelectTrigger><SelectValue placeholder="Source" /></SelectTrigger>
                    <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>To Account</Label>
                  <Select value={transferForm.to_account} onValueChange={v => setTransferForm(f => ({ ...f, to_account: v }))}>
                    <SelectTrigger><SelectValue placeholder="Destination" /></SelectTrigger>
                    <SelectContent>{(accounts || []).filter(a => a.id !== transferForm.from_account).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
                </div>
                <Button onClick={handleTransfer} disabled={!transferForm.amount || !transferForm.from_account || !transferForm.to_account} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                  Record Transfer
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 prism-gradient text-white border-0 hover:opacity-90" aria-label="Add transaction"><Plus className="h-4 w-4" /> Add</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">Add Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Date</Label><Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
                  <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="-50.00" /></div>
                </div>
                <div className="space-y-2"><Label>Merchant</Label><Input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} placeholder="e.g. Whole Foods" /></div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                    <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>{(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Notes</Label><Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
                <Button onClick={handleCreate} disabled={!form.amount || !form.account_id || createTransaction.isPending} className="w-full prism-gradient text-white border-0 hover:opacity-90">
                  {createTransaction.isPending ? 'Adding...' : 'Add Transaction'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search + Filters row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search transactions..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 hover-border-glow" aria-label="Search transactions" />
        </div>
        <TransactionFilters
          filters={filters}
          onChange={setFilters}
          accounts={(accounts || []).map(a => ({ id: a.id, name: a.name }))}
          categories={(categories || []).map(c => ({ id: c.id, name: c.name }))}
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <Select value={bulkCategory} onValueChange={setBulkCategory}>
              <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Categorize as…" /></SelectTrigger>
              <SelectContent>{(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={bulkCategorize} disabled={!bulkCategory} className="gap-1 h-8" aria-label="Apply category">
              <Tags className="h-3.5 w-3.5" /> Apply
            </Button>
          </div>
          <Button size="sm" variant="destructive" onClick={bulkDelete} className="gap-1 h-8" aria-label="Delete selected">
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-8 text-xs">Cancel</Button>
        </motion.div>
      )}

      <Card className="prism-card-shine border-border/50">
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {/* Select all header */}
            {filtered.length > 0 && (
              <div className="flex items-center gap-3 px-5 py-2.5 bg-muted/30">
                <Checkbox checked={selected.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} aria-label="Select all transactions" />
                <span className="text-xs text-muted-foreground">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''}</span>
              </div>
            )}
            {filtered.map((txn) => {
              const isIncome = txn.amount > 0;
              const isTransfer = (txn as any).is_transfer;
              return (
                <div key={txn.id} className="flex items-center gap-3 px-5 py-3.5 interactive-row group" role="row">
                  <Checkbox checked={selected.has(txn.id)} onCheckedChange={() => toggleSelect(txn.id)} aria-label={`Select ${txn.merchant || 'transaction'}`} />
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br shrink-0 transition-transform duration-300 group-hover:scale-110 ${
                    isTransfer ? 'from-prism-indigo to-prism-violet' : isIncome ? 'from-prism-teal to-prism-lime' : 'from-prism-rose to-prism-orange'
                  }`}>
                    {isTransfer ? <ArrowRightLeft className="h-4 w-4 text-white" /> : isIncome ? <ArrowUpRight className="h-4 w-4 text-white" /> : <ArrowDownRight className="h-4 w-4 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{txn.merchant || 'No merchant'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(txn.date)} · {(txn as any).accounts?.name}</p>
                  </div>
                  {(txn as any).categories && (
                    <Badge variant="outline" className="text-xs hidden sm:inline-flex" style={{ borderColor: (txn as any).categories.color, color: (txn as any).categories.color }}>
                      {(txn as any).categories.name}
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
                <h3 className="font-display text-lg font-bold mb-1">No transactions found</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Add your first transaction or adjust your filters.</p>
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
