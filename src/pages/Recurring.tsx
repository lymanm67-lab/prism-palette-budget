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
import { Loader2, Plus, Trash2, Pencil, CalendarIcon, List, ChevronLeft, ChevronRight, RepeatIcon, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
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
  const { data: recurring, isLoading } = useRecurringTransactions();
  const createRecurring = useCreateRecurring();
  const updateRecurring = useUpdateRecurring();
  const deleteRecurring = useDeleteRecurring();
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { formatCurrency: formatAmount } = useCurrency();

  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ merchant: '', amount: '', frequency: 'monthly', account_id: '', category_id: '', next_due_date: '', type: 'expense' as 'income' | 'expense' });

  const [form, setForm] = useState({
    merchant: '',
    amount: '',
    frequency: 'monthly',
    account_id: '',
    category_id: '',
    start_date: format(new Date(), 'yyyy-MM-dd'),
    next_due_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense' as 'income' | 'expense',
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
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setForm({ merchant: '', amount: '', frequency: 'monthly', account_id: '', category_id: '', start_date: format(new Date(), 'yyyy-MM-dd'), next_due_date: format(new Date(), 'yyyy-MM-dd'), type: 'expense' });
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
    }, {
      onSuccess: () => { setEditTarget(null); toast.success('Updated!'); },
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Recurring</h1>
          <p className="text-muted-foreground">Manage recurring expenses and income.</p>
          <PageOverview
            title="Recurring Transactions"
            description="Track bills, subscriptions, and regular income. View in list or calendar format to plan cash flow."
            icon={RepeatIcon}
            iconColor="text-prism-sky"
            ttsScript="The Recurring page helps you stay on top of regular bills and income. Add your recurring transactions like rent, subscriptions, insurance, and paychecks. Set the frequency to weekly, biweekly, monthly, quarterly, or yearly. The list view shows all recurring items with their next due dates and amounts. Switch to the calendar view to visualize payment clusters throughout the month. This helps you plan cash flow and avoid surprises."
            features={[
              'Track bills, subscriptions, and regular income',
              'Weekly, biweekly, monthly, quarterly, yearly frequencies',
              'List and Calendar views',
              'Next due date tracking',
              'Assign accounts and categories',
            ]}
            demoData={[
              { label: 'Rent', value: '-$1,800/mo', badge: 'Monthly', color: '#3b82f6' },
              { label: 'Netflix', value: '-$15.99/mo', badge: 'Monthly', color: '#ef4444' },
              { label: 'Car Insurance', value: '-$140/mo', badge: 'Monthly', color: '#f59e0b' },
              { label: 'Salary', value: '+$3,250/bi-wk', badge: 'Biweekly', color: '#22c55e' },
            ]}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex border rounded-lg overflow-hidden">
            <button onClick={() => setView('list')} className={cn('px-3 py-2 text-sm flex items-center gap-1.5 transition-colors', view === 'list' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <List className="h-4 w-4" /> List
            </button>
            <button onClick={() => setView('calendar')} className={cn('px-3 py-2 text-sm flex items-center gap-1.5 transition-colors', view === 'calendar' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
              <CalendarIcon className="h-4 w-4" /> Calendar
            </button>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Recurring
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownLeft className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recurring Income</p>
              <p className="text-lg font-bold">{formatAmount(totalIncome)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <ArrowUpRight className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Recurring Expenses</p>
              <p className="text-lg font-bold">{formatAmount(totalExpenses)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <RepeatIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Recurring</p>
              <p className="text-lg font-bold">{recurring?.length || 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List View */}
      {view === 'list' && (
        <Card>
          <CardHeader><CardTitle className="font-display">Upcoming Expenses</CardTitle></CardHeader>
          <CardContent>
            {!recurring || recurring.length === 0 ? (
              <p className="text-center text-muted-foreground py-10">No recurring transactions yet.</p>
            ) : (
              <div className="divide-y">
                {recurring.map(r => (
                  <div key={r.id} className="flex items-center justify-between py-3 group">
                    <div className="flex items-center gap-3">
                      <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', Number(r.amount) > 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10')}>
                        {Number(r.amount) > 0 ? <ArrowDownLeft className="h-5 w-5 text-emerald-500" /> : <ArrowUpRight className="h-5 w-5 text-rose-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{r.merchant || 'Unnamed'}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{FREQUENCIES.find(f => f.value === r.frequency)?.label || r.frequency}</span>
                          {r.categories && <Badge variant="secondary" className="text-[10px]">{(r.categories as any).name}</Badge>}
                          {r.accounts && <span>{(r.accounts as any).name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className={cn('font-semibold', Number(r.amount) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                          {formatAmount(Math.abs(Number(r.amount)))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.next_due_date ? format(parseISO(r.next_due_date), 'MMM d, yyyy') : '—'}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100" onClick={() => openEdit(r)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => setDeleteTarget(r.id)}>
                        <Trash2 className="h-4 w-4" />
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
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display">{format(calendarMonth, 'MMMM yyyy')}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(m => subMonths(m, 1))}><ChevronLeft className="h-4 w-4" /></Button>
                <Button variant="ghost" size="sm" onClick={() => setCalendarMonth(new Date())}>Today</Button>
                <Button variant="ghost" size="icon" onClick={() => setCalendarMonth(m => addMonths(m, 1))}><ChevronRight className="h-4 w-4" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-px">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {Array.from({ length: startDow }).map((_, i) => <div key={`e-${i}`} />)}
              {calDays.map(day => {
                const key = format(day, 'yyyy-MM-dd');
                const items = recurringByDay[key] || [];
                const isToday = isSameDay(day, new Date());
                return (
                  <div key={key} className={cn('min-h-[80px] border rounded-lg p-1.5 transition-colors', isToday && 'border-primary bg-primary/5')}>
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
              <Label>Merchant / Name</Label>
              <Input value={editForm.merchant} onChange={e => setEditForm(f => ({ ...f, merchant: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} />
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
