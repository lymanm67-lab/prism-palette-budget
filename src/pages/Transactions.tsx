import React, { useState, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useTransactions, useDeletedTransactions, useCreateTransaction, useUpdateTransaction, useAccounts, useCategories } from '@/hooks/use-finance-data';
import { useGoals } from '@/hooks/use-goals';
import { useCurrency } from '@/hooks/use-currency';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Search, Plus, Loader2, Upload, Receipt, Trash2, Tags,
  ArrowRightLeft, SlidersHorizontal, CalendarIcon, ChevronRight,
  ArrowUpDown, X, Pencil, Sparkles, Landmark, Check, Camera, ImageIcon,
  Copy, AlertTriangle, Undo2, RotateCcw,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import CsvImportDialog from '@/components/CsvImportDialog';
import CategoryCombobox from '@/components/CategoryCombobox';
import PageOverview from '@/components/PageOverview';
import { useDuplicateDetection } from '@/hooks/use-duplicate-detection';

import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';

// Receipt preview component with signed URL
const ReceiptPreview = ({ path, getSignedUrl }: { path: string; getSignedUrl: (p: string) => Promise<string | null> }) => {
  const [url, setUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  React.useEffect(() => {
    getSignedUrl(path).then(u => { setUrl(u); setLoading(false); });
  }, [path, getSignedUrl]);
  if (loading) return <div className="flex items-center justify-center h-32 rounded-lg bg-muted"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!url) return <p className="text-sm text-muted-foreground">Could not load receipt.</p>;
  return <img src={url} alt="Receipt" className="w-full max-h-48 object-contain rounded-lg border border-border" />;
};

type SortKey = 'date' | 'amount' | 'merchant';
type SortDir = 'asc' | 'desc';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
  accountId: string;
  categoryId: string;
}

const EMPTY_FILTERS: FilterState = { dateFrom: '', dateTo: '', amountMin: '', amountMax: '', accountId: '', categoryId: '' };

type TxnViewFilter = 'all' | 'income' | 'expenses' | 'transfers' | 'duplicates' | 'trash';

const Transactions = () => {
  const { formatCurrency } = useCurrency();
  const { data: transactions, isLoading } = useTransactions();
  const { data: deletedTransactions } = useDeletedTransactions();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { data: goals } = useGoals();
  const { household } = useHousehold();
  const qc = useQueryClient();
  const { isDuplicate } = useDuplicateDetection();

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editMultiple, setEditMultiple] = useState(false);
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkAccount, setBulkAccount] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [autoCatLoading, setAutoCatLoading] = useState(false);
  const [editTxn, setEditTxn] = useState<any>(null);
  const [editForm, setEditForm] = useState({ merchant: '', amount: '', date: '', account_id: '', category_id: '', notes: '', tags: '', goal_id: '' });
  const [editType, setEditType] = useState<'debit' | 'credit'>('debit');
  const [editReceiptUrl, setEditReceiptUrl] = useState<string | null>(null);
  const [pendingReceiptFile, setPendingReceiptFile] = useState<File | null>(null);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const editReceiptInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', account_id: '', category_id: '', notes: '', tags: '', goal_id: '' });
  const [formType, setFormType] = useState<'debit' | 'credit'>('debit');
  const [transferForm, setTransferForm] = useState({ date: new Date().toISOString().split('T')[0], amount: '', from_account: '', to_account: '', notes: '' });
  const [merchantOpen, setMerchantOpen] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const receiptInputRef = useRef<HTMLInputElement>(null);
  const [viewFilter, setViewFilter] = useState<TxnViewFilter>('all');
  const handleScanReceipt = useCallback(async (file: File) => {
    setScanLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('scan-receipt', {
        body: {
          image: base64,
          categories: (categories || []).map(c => ({ name: c.name, id: c.id })),
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Pre-fill the form
      const matchedCat = (categories || []).find(
        c => c.name.toLowerCase() === (data.category || '').toLowerCase()
      );
      setForm(f => ({
        ...f,
        merchant: data.merchant || f.merchant,
        amount: data.amount ? String(data.amount) : f.amount,
        date: data.date || f.date,
        category_id: matchedCat?.id || f.category_id,
      }));
      if (data.amount && data.amount > 0) setFormType('debit');

      // Store file for upload after transaction creation
      setPendingReceiptFile(file);

      toast.success('Receipt scanned! Review the pre-filled details.', { duration: 4000 });
    } catch (e: any) {
      console.error('Receipt scan error:', e);
      toast.error(e.message || 'Failed to scan receipt');
    } finally {
      setScanLoading(false);
      if (receiptInputRef.current) receiptInputRef.current.value = '';
    }
  }, [categories, supabase]);

  // Unique merchants from existing transactions for autocomplete
  const uniqueMerchants = useMemo(() => {
    if (!transactions) return [];
    const counts = new Map<string, number>();
    for (const t of transactions) {
      if (t.merchant) {
        const m = t.merchant.trim();
        if (m) counts.set(m, (counts.get(m) || 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [transactions]);

  // Map merchant -> most recently used category_id for auto-fill
  const merchantCategoryMap = useMemo(() => {
    if (!transactions) return new Map<string, string>();
    const map = new Map<string, string>();
    // transactions are ordered by date desc, so first match = most recent
    for (const t of transactions) {
      if (t.merchant && t.category_id) {
        const m = t.merchant.trim();
        if (m && !map.has(m)) map.set(m, t.category_id);
      }
    }
    return map;
  }, [transactions]);
  const [tagOpen, setTagOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState('');

  // Unique tags from existing transactions for autocomplete
  const uniqueTags = useMemo(() => {
    if (!transactions) return [];
    const counts = new Map<string, number>();
    for (const t of transactions) {
      if (t.tags && Array.isArray(t.tags)) {
        for (const tag of t.tags) {
          const trimmed = (tag as string).trim();
          if (trimmed) counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
        }
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);
  }, [transactions]);

  // Parse form.tags into array for multi-select
  const selectedTags = useMemo(() => 
    form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    [form.tags]
  );

  const toggleTag = (tag: string) => {
    const current = selectedTags;
    const next = current.includes(tag)
      ? current.filter(t => t !== tag)
      : [...current, tag];
    setForm(f => ({ ...f, tags: next.join(', ') }));
  };

  const addCustomTag = (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || selectedTags.includes(trimmed)) return;
    setForm(f => ({ ...f, tags: [...selectedTags, trimmed].join(', ') }));
    setTagSearch('');
  };

  // Compute duplicate transaction IDs (same date+amount+normalized merchant, more than 1 match)
  const duplicateIds = useMemo(() => {
    if (!transactions) return new Set<string>();
    const groups = new Map<string, string[]>();
    for (const t of transactions) {
      const merchant = (t.merchant || '').toLowerCase().trim().replace(/\s+/g, ' ');
      const key = `${t.date}|${Math.round(t.amount * 100)}|${merchant}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(t.id);
    }
    const dupeSet = new Set<string>();
    for (const ids of groups.values()) {
      if (ids.length > 1) ids.forEach(id => dupeSet.add(id));
    }
    return dupeSet;
  }, [transactions]);

  const duplicateCount = duplicateIds.size;

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  // Filter + sort
  const filtered = useMemo(() => {
    // Trash view uses deletedTransactions
    if (viewFilter === 'trash') {
      if (!deletedTransactions) return [];
      const q = search.toLowerCase();
      return deletedTransactions.filter(t => {
        if (q && !(t.merchant?.toLowerCase().includes(q))) return false;
        return true;
      });
    }
    if (!transactions) return [];
    const q = search.toLowerCase();
    let result = transactions.filter(t => {
      if (q && !(t.merchant?.toLowerCase().includes(q)) && !((t as any).categories?.name?.toLowerCase().includes(q))) return false;
      if (filters.dateFrom && t.date < filters.dateFrom) return false;
      if (filters.dateTo && t.date > filters.dateTo) return false;
      if (filters.amountMin && Math.abs(t.amount) < parseFloat(filters.amountMin)) return false;
      if (filters.amountMax && Math.abs(t.amount) > parseFloat(filters.amountMax)) return false;
      if (filters.accountId && t.account_id !== filters.accountId) return false;
      if (filters.categoryId && t.category_id !== filters.categoryId) return false;
      // View filter
      if (viewFilter === 'income' && t.amount <= 0) return false;
      if (viewFilter === 'expenses' && t.amount >= 0) return false;
      if (viewFilter === 'transfers' && !(t as any).is_transfer) return false;
      if (viewFilter === 'duplicates' && !duplicateIds.has(t.id)) return false;
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
      else if (sortKey === 'amount') cmp = Math.abs(a.amount) - Math.abs(b.amount);
      else if (sortKey === 'merchant') cmp = (a.merchant || '').localeCompare(b.merchant || '');
      return sortDir === 'desc' ? -cmp : cmp;
    });

    return result;
  }, [search, transactions, deletedTransactions, filters, sortKey, sortDir, viewFilter, duplicateIds]);

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: string; label: string; transactions: typeof filtered; total: number }[] = [];
    const map = new Map<string, typeof filtered>();
    for (const t of filtered) {
      if (!map.has(t.date)) map.set(t.date, []);
      map.get(t.date)!.push(t);
    }
    for (const [date, txns] of map) {
      const total = txns.reduce((s, t) => s + Number(t.amount), 0);
      groups.push({
        date,
        label: format(parseISO(date), 'MMMM d, yyyy'),
        transactions: txns,
        total,
      });
    }
    return groups;
  }, [filtered]);

  const [dupeWarningShown, setDupeWarningShown] = useState(false);

  const handleCreate = async () => {
    const rawAmount = parseFloat(form.amount);
    const finalAmount = formType === 'debit' ? -Math.abs(rawAmount) : Math.abs(rawAmount);

    // Check for duplicates (warn once, allow override)
    if (!dupeWarningShown && isDuplicate(form.date, finalAmount, form.merchant)) {
      toast.warning('This looks like a duplicate transaction. Click "Add" again to confirm.', { duration: 4000 });
      setDupeWarningShown(true);
      return;
    }

    const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : null;
    const result = await createTransaction.mutateAsync({
      date: form.date, merchant: form.merchant || null, amount: finalAmount,
      account_id: form.account_id, category_id: form.category_id || null, notes: form.notes || null,
      tags,
    });

    // Upload receipt if scanned
    if (pendingReceiptFile && household && result?.id) {
      try {
        const ext = pendingReceiptFile.name.split('.').pop() || 'jpg';
        const path = `${household.id}/${result.id}.${ext}`;
        const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, pendingReceiptFile, { upsert: true });
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(path);
          // Since bucket is private, store the path for signed URL generation
          await updateTransaction.mutateAsync({ id: result.id, receipt_url: path } as any);
        }
      } catch (e) {
        console.error('Receipt upload error:', e);
      }
    }

    setPendingReceiptFile(null);
    setForm({ date: new Date().toISOString().split('T')[0], merchant: '', amount: '', account_id: '', category_id: '', notes: '', tags: '', goal_id: '' });
    setFormType('debit');
    setDupeWarningShown(false);
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
    await supabase.from('transactions').update({ transfer_pair_id: outTxn.id } as any).eq('id', outTxn.id);
    qc.invalidateQueries({ queryKey: ['transactions'] });
    toast.success('Transfer recorded');
    setTransferForm({ date: new Date().toISOString().split('T')[0], amount: '', from_account: '', to_account: '', notes: '' });
    setTransferOpen(false);
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const softDelete = async (ids: string[]) => {
    const now = new Date().toISOString();
    for (const id of ids) {
      await supabase.from('transactions').update({ deleted_at: now } as any).eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['transactions_deleted'] });
    return ids;
  };

  const restoreTransactions = async (ids: string[]) => {
    for (const id of ids) {
      await supabase.from('transactions').update({ deleted_at: null } as any).eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['transactions_deleted'] });
  };

  const permanentDelete = async (ids: string[]) => {
    for (const id of ids) {
      await supabase.from('transactions').delete().eq('id', id);
    }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['transactions_deleted'] });
  };

  const bulkDelete = async () => {
    const ids = Array.from(selected);
    await softDelete(ids);
    setSelected(new Set());
    toast.success(`Moved ${ids.length} transactions to trash`, {
      action: {
        label: 'Undo',
        onClick: async () => {
          await restoreTransactions(ids);
          toast.success(`Restored ${ids.length} transactions`);
        },
      },
      duration: 10000,
    });
  };

  const bulkCategorize = async () => {
    if (!bulkCategory) return;
    for (const id of selected) { await supabase.from('transactions').update({ category_id: bulkCategory }).eq('id', id); }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    setSelected(new Set());
    setBulkCategory('');
    toast.success(`Categorized ${selected.size} transactions`);
  };

  const bulkChangeAccount = async () => {
    if (!bulkAccount) return;
    for (const id of selected) { await supabase.from('transactions').update({ account_id: bulkAccount }).eq('id', id); }
    qc.invalidateQueries({ queryKey: ['transactions'] });
    setSelected(new Set());
    setBulkAccount('');
    toast.success(`Moved ${selected.size} transactions to new account`);
  };

  const handleAutoCategorize = async () => {
    if (!household) return;
    const targetIds = selected.size > 0
      ? Array.from(selected)
      : (transactions || []).filter(t => !t.category_id).map(t => t.id);

    if (targetIds.length === 0) {
      toast.info('No uncategorized transactions to process');
      return;
    }

    setAutoCatLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-categorize', {
        body: { transaction_ids: targetIds, household_id: household.id },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      qc.invalidateQueries({ queryKey: ['transactions'] });
      setSelected(new Set());
      const msg = [];
      if (data.rule_matched > 0) msg.push(`${data.rule_matched} by rules`);
      if (data.ai_categorized > 0) msg.push(`${data.ai_categorized} by AI`);
      toast.success(`Auto-categorized ${data.categorized} transactions${msg.length ? ` (${msg.join(', ')})` : ''}`);
    } catch (e: any) {
      toast.error(e.message || 'Auto-categorize failed');
    } finally {
      setAutoCatLoading(false);
    }
  };

  const openEditTxn = (txn: any) => {
    setEditTxn(txn);
    const isCredit = txn.amount > 0;
    setEditType(isCredit ? 'credit' : 'debit');
    setEditReceiptUrl(txn.receipt_url || null);
    setEditForm({
      merchant: txn.merchant || '',
      amount: String(Math.abs(txn.amount)),
      date: txn.date,
      account_id: txn.account_id,
      category_id: txn.category_id || '',
      notes: txn.notes || '',
      tags: (txn.tags || []).join(', '),
      goal_id: '',
    });
  };

  const handleUploadEditReceipt = async (file: File) => {
    if (!editTxn || !household) return;
    setReceiptUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${household.id}/${editTxn.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage.from('receipts').upload(path, file, { upsert: true });
      if (uploadErr) throw uploadErr;
      await updateTransaction.mutateAsync({ id: editTxn.id, receipt_url: path } as any);
      setEditReceiptUrl(path);
      toast.success('Receipt uploaded');
    } catch (e: any) {
      toast.error(e.message || 'Failed to upload receipt');
    } finally {
      setReceiptUploading(false);
    }
  };

  const getReceiptSignedUrl = async (path: string): Promise<string | null> => {
    const { data } = await supabase.storage.from('receipts').createSignedUrl(path, 3600);
    return data?.signedUrl || null;
  };

  const handleSaveEdit = async () => {
    if (!editTxn) return;
    const amt = parseFloat(editForm.amount);
    if (isNaN(amt)) return;
    const finalAmount = editType === 'debit' ? -Math.abs(amt) : Math.abs(amt);
    const tags = editForm.tags ? editForm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    try {
      await updateTransaction.mutateAsync({
        id: editTxn.id,
        merchant: editForm.merchant || null,
        amount: finalAmount,
        date: editForm.date,
        account_id: editForm.account_id,
        category_id: editForm.category_id || null,
        notes: editForm.notes || null,
        tags,
      });
      toast.success('Transaction updated');
      setEditTxn(null);
    } catch (e: any) {
      toast.error(e.message || 'Failed to update');
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Transactions</h1>
        <PageOverview
          title="Transactions Overview"
          description="Track all your financial transactions. Add manually, import CSV, or auto-sync via Plaid. Auto-categorize with AI."
          icon={Receipt}
          iconColor="text-prism-orange"
          ttsScript="This is the Transactions page where all your financial activity lives. You can add transactions manually by clicking Add Transaction, import in bulk from CSV files supporting Mint and Monarch formats, or auto-sync from your bank via Plaid. Use Auto-categorize to apply AI-powered merchant matching rules. Edit Multiple mode lets you batch-change categories or move transactions between accounts. Use the search, date filters, and sorting to find specific transactions."
          features={[
            'Manual entry, CSV import, and Plaid auto-sync',
            'AI-powered auto-categorization with merchant rules',
            'Batch edit categories and accounts',
            'Search, filter by date, and sort transactions',
            'Split transactions across multiple categories',
            'Track transfers between accounts',
          ]}
          demoTableHeaders={['Date', 'Merchant', 'Category', 'Amount']}
          demoTableRows={[
            ['Mar 5', 'Whole Foods Market', 'Groceries', '-$82.34'],
            ['Mar 4', 'Netflix', 'Subscriptions', '-$15.99'],
            ['Mar 3', 'Employer Direct Deposit', 'Salary', '+$3,250.00'],
            ['Mar 2', 'Target', 'Clothing', '-$67.89'],
            ['Mar 1', 'Rent Payment', 'Rent/Mortgage', '-$1,800.00'],
          ]}
        />
        <div className="flex items-center gap-2">
          {/* Search button */}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-4 w-4" /> Search
          </Button>

          {/* Date filter button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" /> Date
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 space-y-3" align="end">
              <h4 className="font-semibold text-sm">Date Range</h4>
              <div className="space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs">From</Label>
                  <Input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">To</Label>
                  <Input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} className="h-8 text-xs" />
                </div>
              </div>
              {(filters.dateFrom || filters.dateTo) && (
                <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' }))}>
                  Clear dates
                </Button>
              )}
            </PopoverContent>
          </Popover>

          {/* Filters button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 relative">
                <SlidersHorizontal className="h-4 w-4" /> Filters
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 space-y-3" align="end">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Filters</h4>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)} className="h-7 text-xs gap-1"><X className="h-3 w-3" /> Clear</Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Min Amount</Label>
                  <Input type="number" step="0.01" value={filters.amountMin} onChange={e => setFilters(f => ({ ...f, amountMin: e.target.value }))} placeholder="0" className="h-8 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Max Amount</Label>
                  <Input type="number" step="0.01" value={filters.amountMax} onChange={e => setFilters(f => ({ ...f, amountMax: e.target.value }))} placeholder="∞" className="h-8 text-xs" />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Account</Label>
                <Select value={filters.accountId} onValueChange={v => setFilters(f => ({ ...f, accountId: v === '_all' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All accounts" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All accounts</SelectItem>
                    {(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <Select value={filters.categoryId} onValueChange={v => setFilters(f => ({ ...f, categoryId: v === '_all' ? '' : v }))}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All categories" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All categories</SelectItem>
                    {(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>

          {/* Import CSV button */}
          <Button variant="outline" size="sm" className="gap-2" onClick={() => setCsvOpen(true)}>
            <Upload className="h-4 w-4" /> Import Transactions
          </Button>

          {/* Add transaction button */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add transaction</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display">Add Transaction</DialogTitle></DialogHeader>
              <div className="space-y-4">
                {/* Scan Receipt */}
                <div className="flex items-center gap-2">
                  <input
                    ref={receiptInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleScanReceipt(file);
                    }}
                  />
                  <input
                    id="receipt-camera-input"
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleScanReceipt(file);
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1"
                    disabled={scanLoading}
                    onClick={() => receiptInputRef.current?.click()}
                  >
                    {scanLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {scanLoading ? 'Scanning...' : 'Upload Receipt'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2 flex-1"
                    disabled={scanLoading}
                    onClick={() => document.getElementById('receipt-camera-input')?.click()}
                  >
                    <Camera className="h-4 w-4" />
                    Camera
                  </Button>
                </div>

                {/* Debit / Credit Toggle */}
                <div className="flex rounded-lg border overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setFormType('debit')}
                    className={cn(
                      'flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                      formType === 'debit' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-60" /> DEBIT
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('credit')}
                    className={cn(
                      'flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                      formType === 'credit' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <span className="h-2 w-2 rounded-full bg-current opacity-60" /> CREDIT
                  </button>
                </div>

                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="$0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Merchant</Label>
                  <Popover open={merchantOpen} onOpenChange={setMerchantOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={merchantOpen}
                        className="w-full justify-between font-normal"
                      >
                        {form.merchant || <span className="text-muted-foreground">Search merchants...</span>}
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Type a merchant..."
                          value={form.merchant}
                          onValueChange={v => setForm(f => ({ ...f, merchant: v }))}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {form.merchant ? (
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
                                onClick={() => setMerchantOpen(false)}
                              >
                                Use "{form.merchant}"
                              </button>
                            ) : (
                              'Type to search or add new'
                            )}
                          </CommandEmpty>
                          <CommandGroup heading="Recent merchants">
                            {uniqueMerchants
                              .filter(m => !form.merchant || m.toLowerCase().includes(form.merchant.toLowerCase()))
                              .slice(0, 10)
                              .map(m => (
                                <CommandItem
                                  key={m}
                                  value={m}
                                  onSelect={() => {
                                    const catId = merchantCategoryMap.get(m);
                                    const shouldAutoFill = catId && !form.category_id;
                                    setForm(f => ({ ...f, merchant: m, ...(shouldAutoFill ? { category_id: catId } : {}) }));
                                    setMerchantOpen(false);
                                    if (shouldAutoFill) {
                                      const catName = categories?.find(c => c.id === catId)?.name;
                                      toast.info(`Category auto-filled: ${catName || 'Unknown'}`, { duration: 3000 });
                                    }
                                  }}
                                >
                                  <Check className={cn('mr-2 h-4 w-4', form.merchant === m ? 'opacity-100' : 'opacity-0')} />
                                  {m}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Account</Label>
                  <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                    <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <CategoryCombobox value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))} />
                </div>
                <div className="space-y-2">
                  <Label>Goal</Label>
                  <Select value={form.goal_id} onValueChange={v => setForm(f => ({ ...f, goal_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select goal..." /></SelectTrigger>
                    <SelectContent>{(goals || []).map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add a note..." />
                </div>
                <div className="space-y-2">
                  <Label>Tags</Label>
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1">
                      {selectedTags.map(tag => (
                        <Badge key={tag} variant="secondary" className="gap-1 text-xs">
                          {tag}
                          <button onClick={() => toggleTag(tag)} className="ml-0.5 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <Popover open={tagOpen} onOpenChange={setTagOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                        <span className="text-muted-foreground">Search tags...</span>
                        <Tags className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command>
                        <CommandInput
                          placeholder="Type a tag..."
                          value={tagSearch}
                          onValueChange={setTagSearch}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && tagSearch.trim()) {
                              e.preventDefault();
                              addCustomTag(tagSearch);
                            }
                          }}
                        />
                        <CommandList>
                          <CommandEmpty>
                            {tagSearch.trim() ? (
                              <button
                                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
                                onClick={() => { addCustomTag(tagSearch); setTagOpen(false); }}
                              >
                                Add "{tagSearch.trim()}"
                              </button>
                            ) : (
                              'Type to search or add new'
                            )}
                          </CommandEmpty>
                          <CommandGroup heading="Existing tags">
                            {uniqueTags
                              .filter(t => !tagSearch || t.toLowerCase().includes(tagSearch.toLowerCase()))
                              .slice(0, 15)
                              .map(t => (
                                <CommandItem key={t} value={t} onSelect={() => toggleTag(t)}>
                                  <Check className={cn('mr-2 h-4 w-4', selectedTags.includes(t) ? 'opacity-100' : 'opacity-0')} />
                                  {t}
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreate} disabled={!form.amount || !form.account_id || createTransaction.isPending}>
                    {createTransaction.isPending ? 'Adding...' : 'Add transaction'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search bar (expandable) */}
      {searchOpen && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by merchant or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              autoFocus
            />
            {search && (
              <Button variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7" onClick={() => { setSearch(''); setSearchOpen(false); }}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </motion.div>
      )}

      {/* Secondary toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Select value={viewFilter} onValueChange={(v: TxnViewFilter) => setViewFilter(v)}>
            <SelectTrigger className="w-[170px] h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All transactions</SelectItem>
              <SelectItem value="income">Income only</SelectItem>
              <SelectItem value="expenses">Expenses only</SelectItem>
              <SelectItem value="transfers">Transfers only</SelectItem>
              <SelectItem value="duplicates">
                <span className="flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5 text-amber-500" /> Duplicates {duplicateCount > 0 && `(${duplicateCount})`}
                </span>
              </SelectItem>
              <SelectItem value="trash">
                <span className="flex items-center gap-1.5">
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" /> Trash {(deletedTransactions?.length || 0) > 0 && `(${deletedTransactions?.length})`}
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
          {viewFilter === 'duplicates' && duplicateCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs"
              onClick={() => {
                setSelected(new Set(filtered.map(t => t.id)));
              }}
            >
              <Check className="h-3 w-3" /> Select all duplicates
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-categorize button */}
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAutoCategorize}
            disabled={autoCatLoading}
          >
            {autoCatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {autoCatLoading ? 'Categorizing…' : 'Auto-categorize'}
          </Button>



          {/* Sort dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                Sort <ArrowUpDown className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2" align="end">
              {(['date', 'amount', 'merchant'] as SortKey[]).map(key => (
                <button
                  key={key}
                  onClick={() => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('desc'); } }}
                  className={cn('w-full flex items-center justify-between rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors capitalize', sortKey === key && 'bg-muted font-medium')}
                >
                  {key}
                  {sortKey === key && <span className="text-xs text-muted-foreground">{sortDir === 'desc' ? '↓' : '↑'}</span>}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => { const allIds = new Set(filtered.map(t => t.id)); setSelected(allIds); }} className="gap-1 h-8 text-xs">
            <Check className="h-3 w-3" /> Select all ({filtered.length})
          </Button>
          {viewFilter === 'trash' ? (
            <>
              <Button size="sm" variant="outline" className="gap-1 h-8" onClick={async () => {
                const ids = Array.from(selected);
                await restoreTransactions(ids);
                setSelected(new Set());
                toast.success(`Restored ${ids.length} transactions`);
              }}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore selected
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1 h-8">
                    <Trash2 className="h-3.5 w-3.5" /> Delete permanently ({selected.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete {selected.size} transaction{selected.size > 1 ? 's' : ''}?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                      const ids = Array.from(selected);
                      await permanentDelete(ids);
                      setSelected(new Set());
                      toast.success(`Permanently deleted ${ids.length} transactions`);
                    }}>
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <Select value={bulkCategory} onValueChange={setBulkCategory}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Categorize as…" /></SelectTrigger>
                  <SelectContent>{(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={bulkCategorize} disabled={!bulkCategory} className="gap-1 h-8">
                  <Tags className="h-3.5 w-3.5" /> Apply
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Select value={bulkAccount} onValueChange={setBulkAccount}>
                  <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue placeholder="Move to account…" /></SelectTrigger>
                  <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={bulkChangeAccount} disabled={!bulkAccount} className="gap-1 h-8">
                  <Landmark className="h-3.5 w-3.5" /> Move
                </Button>
              </div>
              <Button size="sm" variant="outline" onClick={handleAutoCategorize} disabled={autoCatLoading} className="gap-1 h-8">
                {autoCatLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                AI Categorize
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1 h-8">
                    <Trash2 className="h-3.5 w-3.5" /> Delete ({selected.size})
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selected.size} transaction{selected.size > 1 ? 's' : ''}?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Transactions will be moved to trash. You can restore them later.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={bulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Move to trash
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())} className="h-8 text-xs">Clear selection</Button>
        </motion.div>
      )}

      {/* Duplicates banner */}
      {viewFilter === 'duplicates' && duplicateCount > 0 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {duplicateCount} potential duplicate transactions found
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Transactions with the same date, amount, and merchant are flagged. Review and delete all at once.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive" className="gap-1.5 shrink-0">
                <Trash2 className="h-3.5 w-3.5" /> Delete all duplicates
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all {duplicateCount} duplicate transactions?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all {duplicateCount} flagged duplicate transactions. This action cannot be undone. Make sure you've reviewed them first.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    const ids = Array.from(duplicateIds);
                    await softDelete(ids);
                    setSelected(new Set());
                    toast.success(`Moved ${ids.length} duplicates to trash`, {
                      action: { label: 'Undo', onClick: async () => { await restoreTransactions(ids); toast.success(`Restored ${ids.length} transactions`); } },
                      duration: 10000,
                    });
                  }}
                >
                  Delete {duplicateCount} duplicates
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}

      {/* Trash banner */}
      {viewFilter === 'trash' && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3">
          <Trash2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{filtered.length} transaction{filtered.length !== 1 ? 's' : ''} in trash</p>
            <p className="text-xs text-muted-foreground">Select items to restore or permanently delete them.</p>
          </div>
          {filtered.length > 0 && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1.5 h-8" onClick={async () => {
                const ids = filtered.map(t => t.id);
                await restoreTransactions(ids);
                toast.success(`Restored ${ids.length} transactions`);
              }}>
                <RotateCcw className="h-3.5 w-3.5" /> Restore all
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="sm" variant="destructive" className="gap-1.5 h-8">
                    <Trash2 className="h-3.5 w-3.5" /> Empty trash
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Permanently delete all {filtered.length} trashed transactions?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone. All transactions in trash will be permanently removed.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async () => {
                      await permanentDelete(filtered.map(t => t.id));
                      toast.success('Trash emptied');
                    }}>
                      Delete permanently
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </motion.div>
      )}

      {grouped.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Receipt className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <h3 className="font-display text-lg font-bold mb-1">No transactions found</h3>
            <p className="text-muted-foreground text-sm">Add your first transaction or adjust your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {/* Master select-all */}
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Checkbox
              checked={filtered.length > 0 && filtered.every(t => selected.has(t.id))}
              onCheckedChange={(checked) => {
                setSelected(checked ? new Set(filtered.map(t => t.id)) : new Set());
              }}
              className="shrink-0"
            />
            <span className="text-xs font-medium text-muted-foreground">
              {selected.size === filtered.length && filtered.length > 0 ? `All ${filtered.length} selected` : `Select all (${filtered.length})`}
            </span>
          </div>
          {grouped.map(group => (
            <div key={group.date}>
              {/* Date header */}
              <div className="flex items-center gap-2 px-3 py-2">
                <Checkbox
                  checked={group.transactions.every(t => selected.has(t.id))}
                  onCheckedChange={(checked) => {
                    setSelected(prev => {
                      const next = new Set(prev);
                      group.transactions.forEach(t => checked ? next.add(t.id) : next.delete(t.id));
                      return next;
                    });
                  }}
                  className="shrink-0"
                />
                <span className="text-sm font-semibold text-muted-foreground flex-1">{group.label}</span>
                <span className={cn('text-sm font-semibold tabular-nums', group.total < 0 ? 'text-foreground' : 'text-emerald-600 dark:text-emerald-400')}>
                  {group.total >= 0 ? '+' : ''}{formatCurrency(group.total)}
                </span>
              </div>

              {/* Transactions */}
              <Card className="overflow-hidden">
                <CardContent className="p-0 divide-y">
                  {group.transactions.map(txn => {
                    const isIncome = txn.amount > 0;
                    const isTransfer = (txn as any).is_transfer;
                    const cat = (txn as any).categories;
                    const acct = (txn as any).accounts;
                    const isDupe = duplicateIds.has(txn.id);

                    return (
                      <div
                        key={txn.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group cursor-pointer",
                          isDupe && "bg-amber-50/50 dark:bg-amber-950/10",
                          !isDupe && isIncome && "bg-emerald-50/40 dark:bg-emerald-950/10",
                          !isDupe && !isIncome && !isTransfer && "bg-background"
                        )}
                        onClick={() => selected.size === 0 && openEditTxn(txn)}
                      >
                        {/* Checkbox for multi-select */}
                        <Checkbox
                          checked={selected.has(txn.id)}
                          onCheckedChange={() => toggleSelect(txn.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="shrink-0"
                        />

                        {/* Merchant icon placeholder */}
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          isDupe ? "bg-amber-100 dark:bg-amber-900/30" :
                          isIncome ? "bg-emerald-100 dark:bg-emerald-900/30" :
                          "bg-muted"
                        )}>
                          <span className={cn(
                            "text-xs font-bold",
                            isDupe ? "text-amber-600 dark:text-amber-400" :
                            isIncome ? "text-emerald-600 dark:text-emerald-400" :
                            "text-muted-foreground"
                          )}>
                            {(txn.merchant || '?')[0].toUpperCase()}
                          </span>
                        </div>

                        {/* Merchant name + duplicate badge */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{txn.merchant || 'No merchant'}</p>
                            {(txn as any).receipt_url && <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />}
                            {isDupe && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-amber-300 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 shrink-0">
                                <Copy className="h-2.5 w-2.5 mr-0.5" /> Duplicate
                              </Badge>
                            )}
                          </div>
                          {isTransfer && <p className="text-[10px] text-muted-foreground">Transfer</p>}
                        </div>

                        {/* Account */}
                        <div className="hidden sm:flex items-center gap-1.5 w-[140px] shrink-0">
                          {acct && (
                            <span className="text-sm text-muted-foreground truncate">{acct.name}</span>
                          )}
                        </div>

                        {/* Account Balance */}
                        <div className="hidden md:flex items-center w-[120px] shrink-0 justify-end">
                          {acct && (
                            <span className="text-xs tabular-nums text-muted-foreground">
                              bal {formatCurrency(acct.balance)}
                            </span>
                          )}
                        </div>

                        {/* Amount */}
                        <span className={cn(
                          'text-sm font-semibold tabular-nums whitespace-nowrap',
                          isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
                        )}>
                          {isIncome ? '+' : ''}{formatCurrency(txn.amount)}
                        </span>

                        {/* Inline action icons */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  onClick={(e) => { e.stopPropagation(); openEditTxn(txn); }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top"><p>Edit</p></TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent side="top"><p>Delete</p></TooltipContent>
                              </Tooltip>
                              <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete the {txn.merchant || 'transaction'} entry for {formatCurrency(txn.amount)} on {txn.date}. This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    onClick={async () => {
                                      const txnId = txn.id;
                                      await softDelete([txnId]);
                                      toast.success('Moved to trash', {
                                        action: { label: 'Undo', onClick: async () => { await restoreTransactions([txnId]); toast.success('Transaction restored'); } },
                                        duration: 10000,
                                      });
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TooltipProvider>
                        </div>

                        {/* Chevron */}
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}

      {/* Transfer Dialog */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Record Transfer</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Date</Label><Input type="date" value={transferForm.date} onChange={e => setTransferForm(f => ({ ...f, date: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" step="0.01" value={transferForm.amount} onChange={e => setTransferForm(f => ({ ...f, amount: e.target.value }))} placeholder="100.00" /></div>
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
            <div className="space-y-2"><Label>Notes</Label><Input value={transferForm.notes} onChange={e => setTransferForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional" /></div>
            <Button onClick={handleTransfer} disabled={!transferForm.amount || !transferForm.from_account || !transferForm.to_account} className="w-full">Record Transfer</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Transaction Dialog */}
      <Dialog open={!!editTxn} onOpenChange={v => !v && setEditTxn(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">Edit Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Debit / Credit Toggle */}
            <div className="flex rounded-lg border overflow-hidden">
              <button type="button" onClick={() => setEditType('debit')} className={cn('flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors', editType === 'debit' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
                <span className="h-2 w-2 rounded-full bg-current opacity-60" /> DEBIT
              </button>
              <button type="button" onClick={() => setEditType('credit')} className={cn('flex-1 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors', editType === 'credit' ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted')}>
                <span className="h-2 w-2 rounded-full bg-current opacity-60" /> CREDIT
              </button>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" min="0" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} placeholder="$0.00" />
            </div>
            <div className="space-y-2">
              <Label>Merchant</Label>
              <Input value={editForm.merchant} onChange={e => setEditForm(f => ({ ...f, merchant: e.target.value }))} placeholder="Merchant name" />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Account</Label>
              <Select value={editForm.account_id} onValueChange={v => setEditForm(f => ({ ...f, account_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select account..." /></SelectTrigger>
                <SelectContent>{(accounts || []).map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={editForm.category_id} onValueChange={v => setEditForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>{(categories || []).map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Input value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="Add a note..." />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))} placeholder="tag1, tag2, ..." />
            </div>
            {/* Receipt */}
            <div className="space-y-2">
              <Label>Receipt</Label>
              <input
                ref={editReceiptInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadEditReceipt(file);
                  if (editReceiptInputRef.current) editReceiptInputRef.current.value = '';
                }}
              />
              {editReceiptUrl ? (
                <ReceiptPreview path={editReceiptUrl} getSignedUrl={getReceiptSignedUrl} />
              ) : (
                <p className="text-sm text-muted-foreground">No receipt attached.</p>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 w-full"
                disabled={receiptUploading}
                onClick={() => editReceiptInputRef.current?.click()}
              >
                {receiptUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
                {receiptUploading ? 'Uploading...' : editReceiptUrl ? 'Replace Receipt' : 'Attach Receipt'}
              </Button>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditTxn(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit} disabled={!editForm.amount || !editForm.account_id || updateTransaction.isPending}>
                {updateTransaction.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <CsvImportDialog open={csvOpen} onOpenChange={setCsvOpen} />
    </motion.div>
  );
};

export default Transactions;
