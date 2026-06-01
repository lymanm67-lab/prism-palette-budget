import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useRecurringTransactions, useCreateRecurring, useUpdateRecurring, useDeleteRecurring } from '@/hooks/use-recurring';
import { useAccounts, useCategories } from '@/hooks/use-finance-data';
import CategoryCombobox from '@/components/CategoryCombobox';
import { useCurrency } from '@/hooks/use-currency';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths } from 'date-fns';
import { Loader2, Plus, Trash2, Pencil, CalendarIcon, List, ChevronLeft, ChevronRight, RepeatIcon, ArrowDownLeft, ArrowUpRight, Receipt, Zap, Bell, User, Building2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import BillPayPanel from '@/components/BillPayPanel';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import PageOverview from '@/components/PageOverview';

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

const Recurring = () => {
  const { data: recurringAll, isLoading } = useRecurringTransactions();
  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { formatCurrency: formatAmount } = useCurrency();

  const [view, setView] = useState<'list' | 'calendar' | 'billpay'>('list');
  const [viewMode, setViewMode] = useState<'personal' | 'business'>('personal');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ merchant: '', amount: '', frequency: 'monthly', account_id: '', category_id: '', next_due_date: '', type: 'expense' as 'income' | 'expense', autopay_enabled: false, reminder_days: 3, biller_url: '', business_split_pct: 0, business_category_id: '' });

  const isBusiness = (r: any) => {
    const group = r.categories?.category_groups;
    return group?.budget_type === 'business' || !!group?.business_profile_id;
  };
  const isSplit = (r: any) => {
    const pct = Number(r.business_split_pct || 0);
    return pct > 0 && pct < 100;
  };
  const recurring = useMemo(
    () => (recurringAll || []).filter(r => {
      if (isSplit(r)) return true; // splits show in both views
      return viewMode === 'business' ? isBusiness(r) : !isBusiness(r);
    }),
    [recurringAll, viewMode]
  );

  const [form, setForm] = useState({
    merchant: '',
    amount: '',
    frequency: 'monthly',
    account_id: '',
    category_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    next_due_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense' as 'income' | 'expense',
    autopay_enabled: false,
    reminder_days: 3,
    biller_url: '',
    business_split_pct: 0,
    business_category_id: '',
  });

  const totalIncome = useMemo(() => {
    if (!recurring) return 0;
    return recurring.filter(r => Number(r.amount) > 0).reduce((s, r) => s + Number(r.amount), 0);
  }, [recurring]);

  const totalExpenses = useMemo(() => {
    if (!recurring) return 0;
    return recurring.filter(r => Number(r.amount) < 0).reduce((s, r) => s + Math.abs(Number(r.amount)), 0);
  }, [recurring]);

  const handleCreate = () => {
    if (!form.merchant.trim() || !form.amount || !form.account_id) {
      toast.error('Fill in merchant, amount, and account');
      return;
    }
    const amt = Math.abs(parseFloat(form.amount));
    createRecurring.mutate({
      merchant: form.merchant,
      amount: form.type === 'expense' ? -amt : amt,
      frequency: form.frequency,
      account_id: form.account_id,
      category_id: form.category_id || null,
      start_date: form.start_date,
      next_due_date: form.next_due_date,
      autopay_enabled: form.autopay_enabled,
      reminder_days: form.reminder_days,
      biller_url: form.biller_url || null,
      business_split_pct: form.business_split_pct,
      business_category_id: form.business_category_id || null,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ merchant: '', amount: '', frequency: 'monthly', account_id: '', category_id: '', start_date: format(new Date(), 'yyyy-MM-dd'), next_due_date: format(new Date(), 'yyyy-MM-dd'), type: 'expense', autopay_enabled: false, reminder_days: 3, biller_url: '', business_split_pct: 0, business_category_id: '' });
      }
    });
  };

  const openEdit = (r: any) => {
    setEditTarget(r);
    setEditForm({
      merchant: r.merchant || '',
      amount: String(Math.abs(Number(r.amount))),
      frequency: r.frequency || 'monthly',
      account_id: r.account_id || '',
      category_id: r.category_id || '',
      next_due_date: r.next_due_date || '',
      type: Number(r.amount) >= 0 ? 'income' : 'expense',
      autopay_enabled: !!r.autopay_enabled,
      reminder_days: r.reminder_days ?? 3,
      biller_url: r.biller_url || '',
      business_split_pct: Number(r.business_split_pct || 0),
      business_category_id: r.business_category_id || '',
    });
  };

  const handleEdit = () => {
    if (!editTarget) return;
    const amt = Math.abs(parseFloat(editForm.amount));
    updateRecurring.mutate({
      id: editTarget.id,
      merchant: editForm.merchant,
      amount: editForm.type === 'expense' ? -amt : amt,
      frequency: editForm.frequency,
      account_id: editForm.account_id,
      category_id: editForm.category_id || null,
      next_due_date: editForm.next_due_date,
      autopay_enabled: editForm.autopay_enabled,
      reminder_days: editForm.reminder_days,
      biller_url: editForm.biller_url || null,
      business_split_pct: editForm.business_split_pct,
      business_category_id: editForm.business_category_id || null,
    }, {
      onSuccess: () => { setEditTarget(null); toast.success('Updated!'); },
    });
  };

  const toggleAutopay = (r: any) => {
    updateRecurring.mutate({ id: r.id, autopay_enabled: !r.autopay_enabled }, {
      onSuccess: () => toast.success(r.autopay_enabled ? 'Autopay off' : 'Autopay on'),
    });
  };

  // Calendar logic
  const calStart = startOfMonth(calendarMonth);
  const calEnd = endOfMonth(calendarMonth);
  const calDays = eachDayOfInterval({ start: calStart, end: calEnd });
  const startDow = calStart.getDay();

  const recurringByDay = useMemo(() => {
    const map: Record<string, typeof recurring> = {};
    if (!recurring) return map;
    recurring.forEach(r => {
      if (r.next_due_date) {
        const d = parseISO(r.next_due_date);
        if (isSameMonth(d, calendarMonth)) {
          const key = format(d, 'yyyy-MM-dd');
          if (!map[key]) map[key] = [];
          map[key]!.push(r);
        }
      }
    });
    return map;
  }, [recurring, calendarMonth]);

  if (isLoading) {
    return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold truncate">Recurring</h1>
          <p className="text-sm text-muted-foreground truncate">Manage recurring expenses and income.</p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setViewMode('personal')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all',
                viewMode === 'personal' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <User className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Personal</span>
            </button>
            <button
              onClick={() => setViewMode('business')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-all',
                viewMode === 'business' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Building2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Business</span>
            </button>
          </div>
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setView('list')} className={cn('px-2.5 py-1.5 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <List className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">List</span>
            </button>
            <button onClick={() => setView('calendar')} className={cn('px-2.5 py-1.5 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-colors', view === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <CalendarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Calendar</span>
            </button>
            <button onClick={() => setView('billpay')} className={cn('px-2.5 py-1.5 text-xs sm:text-sm flex items-center gap-1 sm:gap-1.5 transition-colors', view === 'billpay' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <Receipt className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> <span className="hidden sm:inline">Bill Pay</span>
            </button>
          </div>
          <Button onClick={() => setDialogOpen(true)} size="sm" className="gap-1.5 h-8">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Recurring</span>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Recurring Income</p>
              <p className="text-base sm:text-lg font-bold truncate">{formatAmount(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
              <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Recurring Expenses</p>
              <p className="text-base sm:text-lg font-bold truncate">{formatAmount(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <RepeatIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] sm:text-xs text-muted-foreground">Total Recurring</p>
              <p className="text-base sm:text-lg font-bold">{recurring?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill Pay View */}
      {view === 'billpay' && <BillPayPanel />}

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="font-display text-base sm:text-lg">Upcoming Expenses</CardTitle></CardHeader>
          <CardContent>
            {!recurring || recurring.length === 0 ? (
              <p className="text-center text-muted-foreground py-10 text-sm">No recurring transactions yet.</p>
            ) : (
              <div className="divide-y">
                {recurring.map(r => (
                  <div key={r.id} className="flex items-center gap-2 sm:gap-3 py-2.5 sm:py-3 group">
                    <div className={cn('h-9 w-9 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center shrink-0', Number(r.amount) > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
                      {Number(r.amount) > 0 ? <ArrowDownLeft className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500" /> : <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-rose-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{r.merchant || 'Unnamed'}</p>
                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground flex-wrap">
                        <span>{FREQUENCIES.find(f => f.value === r.frequency)?.label || r.frequency}</span>
                        {r.categories && <Badge variant="secondary" className="text-[10px] px-1 py-0">{(r.categories as any).name}</Badge>}
                        {Number(r.amount) < 0 && r.autopay_enabled && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5 border-prism-teal/30 text-prism-teal">
                            <Zap className="h-2.5 w-2.5" /> Autopay
                          </Badge>
                        )}
                        {Number(r.amount) < 0 && !r.autopay_enabled && r.reminder_days != null && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
                            <Bell className="h-2.5 w-2.5" /> {r.reminder_days}d
                          </Badge>
                        {isSplit(r) && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5 border-prism-violet/30 text-prism-violet">
                            <Building2 className="h-2.5 w-2.5" /> Split {Math.round(Number(r.business_split_pct))}% biz
                          </Badge>
                        )}
                        <span className="hidden sm:inline">{r.accounts && (r.accounts as any).name}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={cn('font-semibold text-sm tabular-nums', Number(r.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {formatAmount(Math.abs(Number(r.amount)))}
                      </p>
                      {(() => {
                        if (!r.next_due_date) return <p className="text-[11px] sm:text-xs text-muted-foreground">—</p>;
                        const due = parseISO(r.next_due_date);
                        const days = Math.round((due.getTime() - Date.now()) / 86400000);
                        const remind = r.reminder_days ?? 3;
                        const tone = days < 0
                          ? 'text-rose-600 dark:text-rose-400 font-medium'
                          : (!r.autopay_enabled && days <= remind)
                            ? 'text-amber-600 dark:text-amber-400 font-medium'
                            : 'text-muted-foreground';
                        return <p className={cn('text-[11px] sm:text-xs', tone)}>{format(due, 'MMM d')}{days < 0 ? ` · ${Math.abs(days)}d late` : days === 0 ? ' · today' : ` · in ${days}d`}</p>;
                      })()}
                    </div>
                    <div className="flex gap-0.5 shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      {Number(r.amount) < 0 && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleAutopay(r)} title={r.autopay_enabled ? 'Turn autopay off' : 'Turn autopay on'}>
                          <Zap className={cn('h-3.5 w-3.5', r.autopay_enabled ? 'text-prism-teal' : 'text-muted-foreground')} />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(r.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-base sm:text-lg">{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-0.5 sm:gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setCalendarMonth(new Date())}>Today</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCalendarMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-2 sm:px-6">
            <div className="grid grid-cols-7 gap-px">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <div key={i} className="text-center text-[10px] sm:text-xs font-medium text-muted-foreground py-1 sm:py-2">{d}</div>
              ))}
              {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
              {calDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const items = recurringByDay[key] || [];
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={key} className={cn('min-h-[60px] sm:min-h-[80px] border rounded-lg p-1 sm:p-1.5 transition-colors', isToday && 'border-primary bg-primary/5')}>
                    <span className={cn('text-xs font-medium', isToday ? 'text-primary' : 'text-muted-foreground')}>{format(day, 'd')}</span>
                    <div className="mt-1 space-y-0.5">
                      {items.slice(0, 3).map((r: any) => (
                        <div key={r.id} className={cn('text-[10px] px-1 py-0.5 rounded truncate', Number(r.amount) > 0 ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-700 dark:text-rose-400')}>
                          {r.merchant || 'Unnamed'}
                        </div>
                      ))}
                      {items.length > 3 && <span className="text-[10px] text-muted-foreground">+{items.length - 3} more</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Add Recurring Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex border rounded-lg overflow-hidden">
                <button type="button" onClick={() => setForm(f => ({ ...f, type: 'expense' }))} className={cn('flex-1 px-3 py-2 text-sm font-medium transition-colors', form.type === 'expense' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted')}>Expense</button>
                <button type="button" onClick={() => setForm(f => ({ ...f, type: 'income' }))} className={cn('flex-1 px-3 py-2 text-sm font-medium transition-colors', form.type === 'income' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>Income</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Merchant / Name *</Label>
              <Input value={form.merchant} onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))} placeholder="Netflix, Rent, etc." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="15.99" />
                
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={form.frequency} onValueChange={v => setForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account *</Label>
                <Select value={form.account_id} onValueChange={v => setForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <CategoryCombobox
                  value={form.category_id}
                  onValueChange={v => setForm(f => ({ ...f, category_id: v }))}
                  placeholder="Search categories..."
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value, next_due_date: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Next Due Date</Label>
                <Input type="date" value={form.next_due_date} onChange={e => setForm(f => ({ ...f, next_due_date: e.target.value }))} />
              </div>
            </div>
            {form.type === 'expense' && (
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-prism-teal" /> Autopay enabled</Label>
                    <p className="text-[11px] text-muted-foreground">Bill is paid automatically — skip the reminder.</p>
                  </div>
                  <Switch checked={form.autopay_enabled} onCheckedChange={v => setForm(f => ({ ...f, autopay_enabled: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Bell className="h-3 w-3" /> Remind days before</Label>
                    <Input type="number" min={0} max={14} value={form.reminder_days} disabled={form.autopay_enabled} onChange={e => setForm(f => ({ ...f, reminder_days: Math.max(0, Math.min(14, parseInt(e.target.value) || 0)) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Biller URL (optional)</Label>
                    <Input type="url" value={form.biller_url} onChange={e => setForm(f => ({ ...f, biller_url: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleCreate} disabled={createRecurring.isPending} className="w-full gap-2">
              {createRecurring.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add Recurring
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete recurring transaction?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deleteTarget && deleteRecurring.mutate(deleteTarget); setDeleteTarget(null); }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTarget} onOpenChange={o => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">Edit Recurring Transaction</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <div className="flex border rounded-lg overflow-hidden">
                <button type="button" onClick={() => setEditForm(f => ({ ...f, type: 'expense' }))} className={cn('flex-1 px-3 py-2 text-sm font-medium transition-colors', editForm.type === 'expense' ? 'bg-destructive text-destructive-foreground' : 'hover:bg-muted')}>Expense</button>
                <button type="button" onClick={() => setEditForm(f => ({ ...f, type: 'income' }))} className={cn('flex-1 px-3 py-2 text-sm font-medium transition-colors', editForm.type === 'income' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>Income</button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Merchant / Name</Label>
              <Input value={editForm.merchant} onChange={e => setEditForm(f => ({ ...f, merchant: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" min="0" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select value={editForm.frequency} onValueChange={v => setEditForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{FREQUENCIES.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={editForm.account_id} onValueChange={v => setEditForm(f => ({ ...f, account_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <CategoryCombobox
                  value={editForm.category_id}
                  onValueChange={v => setEditForm(f => ({ ...f, category_id: v }))}
                  placeholder="Search categories..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Next Due Date</Label>
              <Input type="date" value={editForm.next_due_date} onChange={e => setEditForm(f => ({ ...f, next_due_date: e.target.value }))} />
            </div>
            {editForm.type === 'expense' && (
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/20 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-prism-teal" /> Autopay enabled</Label>
                    <p className="text-[11px] text-muted-foreground">Bill is paid automatically — skip the reminder.</p>
                  </div>
                  <Switch checked={editForm.autopay_enabled} onCheckedChange={v => setEditForm(f => ({ ...f, autopay_enabled: v }))} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1"><Bell className="h-3 w-3" /> Remind days before</Label>
                    <Input type="number" min={0} max={14} value={editForm.reminder_days} disabled={editForm.autopay_enabled} onChange={e => setEditForm(f => ({ ...f, reminder_days: Math.max(0, Math.min(14, parseInt(e.target.value) || 0)) }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Biller URL (optional)</Label>
                    <Input type="url" value={editForm.biller_url} onChange={e => setEditForm(f => ({ ...f, biller_url: e.target.value }))} placeholder="https://..." />
                  </div>
                </div>
              </div>
            )}
            <Button onClick={handleEdit} disabled={updateRecurring.isPending} className="w-full gap-2">
              {updateRecurring.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Recurring;
