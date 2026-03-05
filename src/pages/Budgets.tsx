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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useBudgets, useCategories, useCategoryGroups, useTransactions, useUpsertBudget, useDeleteBudget } from '@/hooks/use-finance-data';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const getMonth = (offset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonth = (monthStr: string) => {
  const [y, m] = monthStr.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

type ExpenseType = 'income' | 'fixed' | 'flexible' | 'non_monthly';

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  income: 'Income',
  fixed: 'Fixed',
  flexible: 'Flexible',
  non_monthly: 'Non-Monthly',
};

const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  income: 'text-emerald-600 dark:text-emerald-400',
  fixed: 'text-primary',
  flexible: 'text-amber-600 dark:text-amber-400',
  non_monthly: 'text-rose-600 dark:text-rose-400',
};

const BAR_COLORS: Record<ExpenseType, string> = {
  income: 'bg-emerald-500',
  fixed: 'bg-primary',
  flexible: 'bg-amber-500',
  non_monthly: 'bg-rose-500',
};

interface BudgetRow {
  id: string;
  category_id: string;
  planned_amount: number;
  spent: number;
  received: number;
  categories: { name: string; color: string } | null;
}

const Budgets = () => {
  const { formatCurrency } = useCurrency();
  const [monthOffset, setMonthOffset] = useState(0);
  const [budgetType, setBudgetType] = useState<'personal' | 'business'>('personal');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
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
  const [showUnbudgeted, setShowUnbudgeted] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ income: true, fixed: true, flexible: true, non_monthly: true });

  const toggleSection = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  // Business names from category groups
  const businessNames = useMemo(() => {
    if (!categoryGroups) return [];
    const names = new Set<string>();
    for (const g of (categoryGroups as any[])) {
      if ((g.budget_type || 'personal') === 'business') {
        const match = g.name.match(/^(.+?)\s*-\s*/);
        if (match) names.add(match[1].trim());
      }
    }
    return Array.from(names);
  }, [categoryGroups]);

  // Map category -> expense_type via its group
  const categoryExpenseType = useMemo(() => {
    if (!categories || !categoryGroups) return new Map<string, ExpenseType>();
    const groupMap = new Map<string, ExpenseType>();
    for (const g of (categoryGroups as any[])) {
      groupMap.set(g.id, (g.expense_type || 'flexible') as ExpenseType);
    }
    const catMap = new Map<string, ExpenseType>();
    for (const c of categories) {
      catMap.set(c.id, groupMap.get(c.group_id) || 'flexible');
    }
    return catMap;
  }, [categories, categoryGroups]);

  // Spending & income by category for the month
  const { spentByCategory, receivedByCategory } = useMemo(() => {
    if (!transactions) return { spentByCategory: {} as Record<string, number>, receivedByCategory: {} as Record<string, number> };
    const monthPrefix = month.substring(0, 7);
    const spent: Record<string, number> = {};
    const received: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date.startsWith(monthPrefix) && t.category_id) {
        if (t.amount < 0) {
          spent[t.category_id] = (spent[t.category_id] || 0) + Math.abs(t.amount);
        } else {
          received[t.category_id] = (received[t.category_id] || 0) + t.amount;
        }
      }
    }
    return { spentByCategory: spent, receivedByCategory: received };
  }, [transactions, month]);

  // Filter categories by budget type AND selected business
  const filteredCategoryIds = useMemo(() => {
    if (!categories || !categoryGroups) return new Set<string>();
    const groupIds = new Set(
      (categoryGroups as any[])
        .filter((g: any) => {
          if ((g.budget_type || 'personal') !== budgetType) return false;
          if (budgetType === 'business' && selectedBusiness !== 'all') {
            return g.name.startsWith(selectedBusiness + ' -') || g.name.startsWith(selectedBusiness + ' –');
          }
          return true;
        })
        .map((g: any) => g.id)
    );
    return new Set(categories.filter(c => groupIds.has(c.group_id)).map(c => c.id));
  }, [categories, categoryGroups, budgetType, selectedBusiness]);

  const budgetItems: BudgetRow[] = (budgets || []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] || 0,
    received: receivedByCategory[b.category_id] || 0,
  })).filter(b => filteredCategoryIds.has(b.category_id));

  // Group budgets by expense type
  const groupedBudgets = useMemo(() => {
    const groups: Record<ExpenseType, BudgetRow[]> = { income: [], fixed: [], flexible: [], non_monthly: [] };
    for (const b of budgetItems) {
      const type = categoryExpenseType.get(b.category_id) || 'flexible';
      groups[type].push(b);
    }
    return groups;
  }, [budgetItems, categoryExpenseType]);

  // Section totals
  const sectionTotals = useMemo(() => {
    const totals: Record<ExpenseType, { budget: number; actual: number; remaining: number }> = {
      income: { budget: 0, actual: 0, remaining: 0 },
      fixed: { budget: 0, actual: 0, remaining: 0 },
      flexible: { budget: 0, actual: 0, remaining: 0 },
      non_monthly: { budget: 0, actual: 0, remaining: 0 },
    };
    for (const [type, items] of Object.entries(groupedBudgets)) {
      const t = type as ExpenseType;
      for (const b of items) {
        totals[t].budget += b.planned_amount;
        totals[t].actual += t === 'income' ? b.received : b.spent;
        totals[t].remaining += b.planned_amount - (t === 'income' ? b.received : b.spent);
      }
    }
    return totals;
  }, [groupedBudgets]);

  // Total income & expenses
  const totalIncomeBudget = sectionTotals.income.budget;
  const totalIncomeActual = sectionTotals.income.actual;
  const totalIncomeRemaining = sectionTotals.income.remaining;

  const totalExpenseBudget = sectionTotals.fixed.budget + sectionTotals.flexible.budget + sectionTotals.non_monthly.budget;
  const totalExpenseActual = sectionTotals.fixed.actual + sectionTotals.flexible.actual + sectionTotals.non_monthly.actual;
  const totalExpenseRemaining = totalExpenseBudget - totalExpenseActual;

  const leftToBudget = totalIncomeActual - totalExpenseBudget;

  // Unbudgeted categories
  const budgetedCategoryIds = new Set(budgetItems.map(b => b.category_id));
  const unbudgetedCategories = (categories || []).filter(c => filteredCategoryIds.has(c.id) && !budgetedCategoryIds.has(c.id));

  // Unbudgeted that have spending
  const unbudgetedWithSpending = unbudgetedCategories.filter(c => (spentByCategory[c.id] || 0) > 0 || (receivedByCategory[c.id] || 0) > 0);

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
    await upsertBudget.mutateAsync({ category_id: form.category_id, month, planned_amount: amount });
    setDialogOpen(false);
  };

  // Render a budget row
  const renderBudgetRow = (b: BudgetRow, type: ExpenseType) => {
    const isIncome = type === 'income';
    const actual = isIncome ? b.received : b.spent;
    const remaining = b.planned_amount - actual;
    const pct = b.planned_amount > 0 ? Math.min((actual / b.planned_amount) * 100, 100) : 0;
    const overBudget = remaining < 0;

    return (
      <div key={b.id} className="group flex items-center gap-3 py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors">
        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: b.categories?.color || 'hsl(var(--primary))' }} />
        <span className="flex-1 text-sm font-medium truncate">{b.categories?.name || 'Unknown'}</span>
        <div className="hidden sm:block w-[200px]">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-500', overBudget ? 'bg-rose-500' : BAR_COLORS[type])}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <span className="w-[90px] text-right text-sm tabular-nums">{formatCurrency(b.planned_amount)}</span>
        <span className="w-[90px] text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(actual)}</span>
        <span className={cn('w-[90px] text-right text-sm font-medium tabular-nums', overBudget ? 'text-rose-600 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
          {formatCurrency(Math.abs(remaining))}
          {overBudget && <span className="text-[10px] ml-0.5">over</span>}
        </span>
        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b.category_id, b.planned_amount)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: b.id, name: b.categories?.name || 'Budget' })}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  };

  // Render a section (accordion)
  const renderSection = (type: ExpenseType, items: BudgetRow[]) => {
    const totals = sectionTotals[type];
    const isOpen = openSections[type] ?? true;
    const isIncome = type === 'income';
    const pct = totals.budget > 0 ? Math.min((totals.actual / totals.budget) * 100, 100) : 0;

    return (
      <Collapsible key={type} open={isOpen} onOpenChange={() => toggleSection(type)}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-3 py-3 px-3 hover:bg-muted/30 rounded-lg transition-colors text-left">
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />}
            <span className={cn('flex-1 font-display font-semibold', EXPENSE_TYPE_COLORS[type])}>
              {EXPENSE_TYPE_LABELS[type]}
            </span>
            <span className="w-[90px] text-right text-sm font-semibold tabular-nums">{formatCurrency(totals.budget)}</span>
            <span className="w-[90px] text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(totals.actual)}</span>
            <span className={cn('w-[90px] text-right text-sm font-semibold tabular-nums', totals.remaining < 0 ? 'text-rose-600 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
              {formatCurrency(Math.abs(totals.remaining))}
            </span>
            <div className="w-[62px]" /> {/* spacer for action buttons */}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 border-l-2 border-muted pl-2">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground py-3 px-3">No budgets in this category.</p>
            ) : (
              items.map(b => renderBudgetRow(b, type))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  if (budgetsLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{formatMonth(month)}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Tabs value={budgetType} onValueChange={(v) => setBudgetType(v as 'personal' | 'business')}>
              <TabsList>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
              </TabsList>
            </Tabs>
            {budgetType === 'business' && businessNames.length > 0 && (
              <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
                <SelectTrigger className="w-[180px] h-8 text-sm"><SelectValue placeholder="All Businesses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Businesses</SelectItem>
                  {businessNames.map(name => <SelectItem key={name} value={name}>{name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button className="gap-2" onClick={openCreate} disabled={unbudgetedCategories.length === 0}>
            <Plus className="h-4 w-4" /> Add Budget
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main budget table */}
        <div className="space-y-2">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="flex-1" />
            <span className="hidden sm:block w-[200px]" />
            <span className="w-[90px] text-right">Budget</span>
            <span className="w-[90px] text-right">Actual</span>
            <span className="w-[90px] text-right">Remaining</span>
            <div className="w-[62px]" />
          </div>

          {/* Income Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-2">
              {renderSection('income', groupedBudgets.income)}
            </CardContent>
          </Card>

          {/* Total Income Row */}
          <div className="flex items-center gap-3 px-6 py-3 bg-muted/30 rounded-lg font-semibold">
            <span className="flex-1 font-display">Total Income</span>
            <span className="hidden sm:block w-[200px]" />
            <span className="w-[90px] text-right tabular-nums">{formatCurrency(totalIncomeBudget)}</span>
            <span className="w-[90px] text-right tabular-nums text-muted-foreground">{formatCurrency(totalIncomeActual)}</span>
            <span className={cn('w-[90px] text-right tabular-nums', totalIncomeRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {formatCurrency(Math.abs(totalIncomeRemaining))}
            </span>
            <div className="w-[62px]" />
          </div>

          {/* Expenses Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-2 space-y-1">
              {/* Column headers for expenses */}
              <div className="flex items-center gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                <ChevronDown className="h-4 w-4 invisible" />
                <span className="flex-1">Expenses</span>
                <span className="hidden sm:block w-[200px]" />
                <span className="w-[90px] text-right">Budget</span>
                <span className="w-[90px] text-right">Actual</span>
                <span className="w-[90px] text-right">Remaining</span>
                <div className="w-[62px]" />
              </div>
              {renderSection('fixed', groupedBudgets.fixed)}
              {renderSection('flexible', groupedBudgets.flexible)}
              {renderSection('non_monthly', groupedBudgets.non_monthly)}
            </CardContent>
          </Card>

          {/* Total Expenses Row */}
          <div className="flex items-center gap-3 px-6 py-3 bg-muted/30 rounded-lg font-semibold">
            <span className="flex-1 font-display">Total Expenses</span>
            <span className="hidden sm:block w-[200px]" />
            <span className="w-[90px] text-right tabular-nums">{formatCurrency(totalExpenseBudget)}</span>
            <span className="w-[90px] text-right tabular-nums text-muted-foreground">{formatCurrency(totalExpenseActual)}</span>
            <span className={cn('w-[90px] text-right tabular-nums', totalExpenseRemaining >= 0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400')}>
              {formatCurrency(Math.abs(totalExpenseRemaining))}
            </span>
            <div className="w-[62px]" />
          </div>

          {/* Unbudgeted categories (collapsed accordion) */}
          {unbudgetedCategories.length > 0 && (
            <Collapsible open={showUnbudgeted} onOpenChange={setShowUnbudgeted}>
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  <Eye className="h-4 w-4" />
                  <span>
                    {showUnbudgeted ? 'Hide' : 'Show'} {unbudgetedCategories.length} unbudgeted categor{unbudgetedCategories.length === 1 ? 'y' : 'ies'}
                  </span>
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="mt-2">
                  <CardContent className="p-2">
                    {unbudgetedCategories.map(c => {
                      const spent = spentByCategory[c.id] || 0;
                      const received = receivedByCategory[c.id] || 0;
                      return (
                        <div key={c.id} className="flex items-center gap-3 py-2 px-3 hover:bg-muted/30 rounded-lg transition-colors group">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="flex-1 text-sm text-muted-foreground">{c.name}</span>
                          <span className="hidden sm:block w-[200px]" />
                          <span className="w-[90px] text-right text-sm text-muted-foreground">—</span>
                          <span className="w-[90px] text-right text-sm tabular-nums text-muted-foreground">{spent > 0 ? formatCurrency(spent) : received > 0 ? formatCurrency(received) : '—'}</span>
                          <span className="w-[90px]" />
                          <div className="w-[62px] flex justify-end">
                            <Button variant="ghost" size="sm" className="h-7 text-xs opacity-0 group-hover:opacity-100" onClick={() => { setForm({ category_id: c.id, planned_amount: '' }); setEditingBudget(null); setDialogOpen(true); }}>
                              <Plus className="h-3 w-3 mr-1" /> Budget
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>

        {/* Right sidebar - Budget Summary */}
        <div className="space-y-4">
          {/* Left to budget card */}
          <Card className={cn('border-2', leftToBudget < 0 ? 'border-rose-500/30 bg-rose-500/5' : leftToBudget === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-primary/20')}>
            <CardContent className="p-5 text-center">
              <p className={cn('text-3xl font-bold font-display', leftToBudget < 0 ? 'text-rose-600 dark:text-rose-400' : leftToBudget === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary')}>
                {leftToBudget < 0 ? '-' : ''}{formatCurrency(Math.abs(leftToBudget))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {leftToBudget === 0 ? '✅ Every dollar assigned' : leftToBudget > 0 ? 'Left to budget' : 'Over-budgeted'}
              </p>
            </CardContent>
          </Card>

          {/* Summary breakdown tabs */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>

              {/* Income summary */}
              <div>
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Income</span>
                  <span className="font-semibold">{formatCurrency(totalIncomeBudget)} budget</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalIncomeBudget > 0 ? Math.min((totalIncomeActual / totalIncomeBudget) * 100, 100) : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{formatCurrency(totalIncomeActual)} received</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(Math.abs(totalIncomeRemaining))} remaining</span>
                </div>
              </div>

              {/* Expense sections */}
              {(['fixed', 'flexible', 'non_monthly'] as ExpenseType[]).map(type => {
                const t = sectionTotals[type];
                const pct = t.budget > 0 ? Math.min((t.actual / t.budget) * 100, 100) : 0;
                const over = t.remaining < 0;
                return (
                  <div key={type}>
                    <div className="flex justify-between text-sm">
                      <span className="font-medium">{EXPENSE_TYPE_LABELS[type]}</span>
                      <span className="font-semibold">{formatCurrency(t.budget)} budget</span>
                    </div>
                    <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', over ? 'bg-rose-500' : BAR_COLORS[type])} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>{formatCurrency(t.actual)} spent</span>
                      <span className={over ? 'text-rose-600 dark:text-rose-400' : ''}>
                        {over ? `↻ -${formatCurrency(Math.abs(t.remaining))} remaining` : `${formatCurrency(t.remaining)} remaining`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create / Edit Budget Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category</Label>
              {editingBudget ? (
                <div className="flex items-center gap-2 rounded-md border border-input bg-muted/50 px-3 py-2 text-sm">
                  {(() => {
                    const cat = (categories || []).find(c => c.id === form.category_id);
                    return cat ? (<><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />{cat.name}</>) : 'Category';
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
              <Input type="number" step="0.01" min="0" placeholder="500.00" value={form.planned_amount} onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))} />
            </div>
            <div className="text-xs text-muted-foreground">Month: {formatMonth(month)}</div>
            <Button onClick={handleSave} disabled={!form.category_id || !form.planned_amount || upsertBudget.isPending} className="w-full">
              {upsertBudget.isPending ? 'Saving...' : editingBudget ? 'Update Budget' : 'Create Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete budget?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete the budget for "{deleteTarget?.name}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { if (deleteTarget) { await deleteBudget.mutateAsync(deleteTarget.id); setDeleteTarget(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Budgets;
