import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useBudgets, useCategories, useCategoryGroups, useTransactions, useUpsertBudget, useDeleteBudget } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

const getMonth = (offset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonth = (monthStr: string) => {
  const [y, m] = monthStr.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const Budgets = () => {
  const { formatCurrency } = useCurrency();
  const [monthOffset, setMonthOffset] = useState(0);
  const [budgetType, setBudgetType] = useState<'personal' | 'business'>('personal');
  const month = getMonth(monthOffset);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(month);
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const { data: categoryGroups } = useCategoryGroups();
  const upsertBudget = useUpsertBudget();
  const deleteBudget = useDeleteBudget();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ category_id: string; planned_amount: string } | null>(null);
  const [form, setForm] = useState({ category_id: '', planned_amount: '' });
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const spentByCategory = useMemo(() => {
    if (!transactions) return {};
    const monthPrefix = month.substring(0, 7);
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date.startsWith(monthPrefix) && t.amount < 0 && t.category_id) {
        map[t.category_id] = (map[t.category_id] || 0) + Math.abs(t.amount);
      }
    }
    return map;
  }, [transactions, month]);

  // Filter categories by budget type
  const filteredCategoryIds = useMemo(() => {
    if (!categories || !categoryGroups) return new Set<string>();
    const groupIds = new Set(
      (categoryGroups as any[]).filter((g: any) => (g.budget_type || 'personal') === budgetType).map((g: any) => g.id)
    );
    return new Set(categories.filter(c => groupIds.has(c.group_id)).map(c => c.id));
  }, [categories, categoryGroups, budgetType]);

  const budgetItems = (budgets || []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] || 0,
  })).filter(b => filteredCategoryIds.has(b.category_id));

  const totalPlanned = budgetItems.reduce((s, b) => s + b.planned_amount, 0);
  const totalSpent = budgetItems.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  // Categories not yet budgeted this month (filtered by budget type)
  const budgetedCategoryIds = new Set(budgetItems.map(b => b.category_id));
  const unbudgetedCategories = (categories || []).filter(c => filteredCategoryIds.has(c.id) && !budgetedCategoryIds.has(c.id));

  const openCreate = () => {
    setEditingBudget(null);
    setForm({ category_id: unbudgetedCategories[0]?.id || '', planned_amount: '' });
    setDialogOpen(true);
  };

  const openEdit = (categoryId: string, currentAmount: number) => {
    setEditingBudget({ category_id: categoryId, planned_amount: String(currentAmount) });
    setForm({ category_id: categoryId, planned_amount: String(currentAmount) });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.planned_amount);
    if (!form.category_id || isNaN(amount) || amount < 0) return;
    await upsertBudget.mutateAsync({
      category_id: form.category_id,
      month,
      planned_amount: amount,
    });
    setDialogOpen(false);
  };

  if (budgetsLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Budgets</h1>
          <div className="flex items-center gap-4 mt-2">
            <Tabs value={budgetType} onValueChange={(v) => setBudgetType(v as 'personal' | 'business')}>
              <TabsList>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonthOffset(o => o - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-muted-foreground font-medium min-w-[160px] text-center">{formatMonth(month)}</span>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMonthOffset(o => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <Button className="gap-2" onClick={openCreate} disabled={unbudgetedCategories.length === 0}>
          <Plus className="h-4 w-4" /> Add Budget
        </Button>
      </div>

      {budgetItems.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-6 p-5">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="font-display text-2xl font-bold">
                {formatCurrency(totalSpent)} <span className="text-base font-normal text-muted-foreground">/ {formatCurrency(totalPlanned)}</span>
              </p>
            </div>
            <div className="w-40">
              <Progress value={Math.min(totalPct, 100)} className="h-3" />
              <p className="mt-1 text-right text-xs text-muted-foreground">{totalPct}% used</p>
            </div>
          </CardContent>
        </Card>
      )}

      {budgetItems.length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No budgets set for {formatMonth(month)}. Click "Add Budget" to get started.
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {budgetItems.map((budget) => {
          const cat = budget.categories;
          const pct = budget.planned_amount > 0 ? Math.round((budget.spent / budget.planned_amount) * 100) : 0;
          const remaining = budget.planned_amount - budget.spent;
          const overBudget = remaining < 0;
          return (
            <motion.div key={budget.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="transition-shadow hover:shadow-md group">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: cat?.color }} />
                      <span className="font-medium">{cat?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${overBudget ? 'text-prism-rose' : 'text-muted-foreground'}`}>
                        {overBudget ? 'Over by ' + formatCurrency(Math.abs(remaining)) : formatCurrency(remaining) + ' left'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => openEdit(budget.category_id, budget.planned_amount)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        onClick={() => setDeleteTarget({ id: budget.id, name: cat?.name || 'Budget' })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>{formatCurrency(budget.spent)}</span>
                      <span>{formatCurrency(budget.planned_amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: overBudget ? 'hsl(var(--prism-negative))' : (cat?.color || 'hsl(var(--primary))'),
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Create / Edit Budget Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingBudget ? 'Edit Budget' : 'Add Budget'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              {editingBudget ? (
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                  {(() => {
                    const cat = (categories || []).find(c => c.id === form.category_id);
                    return cat ? (
                      <>
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                        {cat.name}
                      </>
                    ) : 'Category';
                  })()}
                </div>
              ) : (
                <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {unbudgetedCategories.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                          {c.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Planned Amount</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="500.00"
                value={form.planned_amount}
                onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Month: {formatMonth(month)}
            </div>
            <Button
              onClick={handleSave}
              disabled={!form.category_id || !form.planned_amount || upsertBudget.isPending}
              className="w-full"
            >
              {upsertBudget.isPending ? 'Saving...' : editingBudget ? 'Update Budget' : 'Create Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the budget for "{deleteTarget?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (deleteTarget) { await deleteBudget.mutateAsync(deleteTarget.id); setDeleteTarget(null); } }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Budgets;
