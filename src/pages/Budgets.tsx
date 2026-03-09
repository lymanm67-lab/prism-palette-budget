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
import { useBudgets, useCategories, useCategoryGroups, useTransactions, useUpsertBudget, useDeleteBudget, useCreateCategory } from '@/hooks/use-finance-data';
import { useSmartBudget } from '@/hooks/use-financial-intelligence';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff, Settings2, TrendingUp, AlertTriangle, CheckCircle2, PiggyBank, Sparkles, Copy } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { getDaysInMonth } from 'date-fns';
import PageOverview from '@/components/PageOverview';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EmptyState } from '@/components/EmptyState';

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
  rollover: boolean;
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
  const createCategory = useCreateCategory();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ category_id: string; planned_amount: string; rollover: boolean } | null>(null);
  const [form, setForm] = useState({ category_id: '', planned_amount: '', rollover: false, budgetKind: 'expense' as 'income' | 'expense', group_id: '' });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showUnbudgeted, setShowUnbudgeted] = useState(false);
  const [hideZeroAmounts, setHideZeroAmounts] = useState(false);
  const [copyingForward, setCopyingForward] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ income: true, fixed: true, flexible: true, non_monthly: true });
  const [viewTab, setViewTab] = useState<'budget' | 'forecast'>('budget');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', group_id: '', color: '#7c5cf5' });
  const [smartBudgetOpen, setSmartBudgetOpen] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<{ category_id: string; category_name: string; monthly_average: number; suggested_budget: number; selected: boolean }[]>([]);
  const smartBudget = useSmartBudget();

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
      if (hideZeroAmounts && b.planned_amount === 0) continue;
      const type = categoryExpenseType.get(b.category_id) || 'flexible';
      groups[type].push(b);
    }
    return groups;
  }, [budgetItems, categoryExpenseType, hideZeroAmounts]);

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

  // Forecast data
  const forecast = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const totalDays = getDaysInMonth(new Date(y, m - 1));
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === y && today.getMonth() + 1 === m;
    const daysPassed = isCurrentMonth ? today.getDate() : totalDays;
    const daysRemaining = totalDays - daysPassed;

    const items: { category_id: string; name: string; color: string; budget: number; spent: number; projected: number; type: ExpenseType }[] = [];

    for (const b of budgetItems) {
      const type = categoryExpenseType.get(b.category_id) || 'flexible';
      const isIncome = type === 'income';
      const actual = isIncome ? b.received : b.spent;
      const dailyRate = daysPassed > 0 ? actual / daysPassed : 0;
      const projected = actual + dailyRate * daysRemaining;

      items.push({
        category_id: b.category_id,
        name: b.categories?.name || 'Unknown',
        color: b.categories?.color || 'hsl(var(--primary))',
        budget: b.planned_amount,
        spent: actual,
        projected,
        type,
      });
    }

    const totals = {
      income: { budget: 0, actual: 0, projected: 0 },
      expenses: { budget: 0, actual: 0, projected: 0 },
    };
    for (const item of items) {
      if (item.type === 'income') {
        totals.income.budget += item.budget;
        totals.income.actual += item.spent;
        totals.income.projected += item.projected;
      } else {
        totals.expenses.budget += item.budget;
        totals.expenses.actual += item.spent;
        totals.expenses.projected += item.projected;
      }
    }

    return { items, totals, daysPassed, daysRemaining, totalDays, isCurrentMonth };
  }, [budgetItems, categoryExpenseType, month]);

  // Compute rollover amounts from previous month
  const rolloverAmounts = useMemo(() => {
    // We need previous month's budgets and spending to calculate rollover
    const prevMonth = getMonth(monthOffset - 1);
    const prevMonthPrefix = prevMonth.substring(0, 7);
    const rolloverMap = new Map<string, number>();
    
    if (!budgets || !transactions) return rolloverMap;
    
    // For each budget with rollover enabled, check previous month
    for (const b of (budgets as any[])) {
      if (!b.rollover) continue;
      const type = categoryExpenseType.get(b.category_id) || 'flexible';
      const isIncome = type === 'income';
      
      // Calculate previous month spending for this category
      let prevSpent = 0;
      for (const t of transactions) {
        if (t.date.startsWith(prevMonthPrefix) && t.category_id === b.category_id) {
          if (isIncome) {
            if (t.amount > 0) prevSpent += t.amount;
          } else {
            if (t.amount < 0) prevSpent += Math.abs(t.amount);
          }
        }
      }
      
      const remaining = b.planned_amount - prevSpent;
      if (remaining > 0) {
        rolloverMap.set(b.category_id, remaining);
      }
    }
    return rolloverMap;
  }, [budgets, transactions, monthOffset, categoryExpenseType]);

  const openCreate = () => {
    setEditingBudget(null);
    setForm({ category_id: '', planned_amount: '', rollover: false, budgetKind: 'expense', group_id: '' });
    setDialogOpen(true);
  };

  const openEdit = (categoryId: string, currentAmount: number) => {
    const budget = budgetItems.find(b => b.category_id === categoryId);
    const rollover = (budget as any)?.rollover ?? false;
    const cat = (categories || []).find(c => c.id === categoryId);
    const group = cat ? (categoryGroups as any[])?.find((g: any) => g.id === cat.group_id) : null;
    const expType = group?.expense_type || 'flexible';
    setEditingBudget({ category_id: categoryId, planned_amount: String(currentAmount), rollover });
    setForm({ category_id: categoryId, planned_amount: String(currentAmount), rollover, budgetKind: expType === 'income' ? 'income' : 'expense', group_id: cat?.group_id || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(form.planned_amount);
    if (!form.category_id || isNaN(amount) || amount < 0) return;
    await upsertBudget.mutateAsync({ category_id: form.category_id, month, planned_amount: amount, rollover: form.rollover });
    setDialogOpen(false);
  };

  const handleCopyForward = async () => {
    if (!budgetItems.length) return;
    setCopyingForward(true);
    const nextMonth = getMonth(monthOffset + 1);
    try {
      for (const b of budgetItems) {
        await upsertBudget.mutateAsync({
          category_id: b.category_id,
          month: nextMonth,
          planned_amount: b.planned_amount,
          rollover: b.rollover,
        });
      }
    } finally {
      setCopyingForward(false);
    }
  };

  // Render a budget row
  const renderBudgetRow = (b: BudgetRow, type: ExpenseType) => {
    const isIncome = type === 'income';
    const actual = isIncome ? b.received : b.spent;
    const rolloverAmt = rolloverAmounts.get(b.category_id) || 0;
    const effectiveBudget = b.planned_amount + rolloverAmt;
    const remaining = effectiveBudget - actual;
    const pct = effectiveBudget > 0 ? Math.min((actual / effectiveBudget) * 100, 100) : 0;
    const overBudget = remaining < 0;

    return (
      <div key={b.id} className="group py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors">
        {/* Mobile: stacked layout */}
        <div className="flex items-center gap-2 sm:hidden">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: b.categories?.color || 'hsl(var(--primary))' }} />
          <span className="flex-1 text-sm font-medium truncate">{b.categories?.name || 'Unknown'}</span>
          {b.rollover && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">↻</span>}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b.category_id, b.planned_amount)}>
            <Pencil className="h-3 w-3" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: b.id, name: b.categories?.name || 'Budget' })}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
        <div className="sm:hidden mt-1.5 ml-5">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden mb-1.5">
            <div className={cn('h-full rounded-full transition-all duration-500', overBudget ? 'bg-rose-500' : BAR_COLORS[type])} style={{ width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(effectiveBudget)} budget</span>
            <span>{formatCurrency(actual)} actual</span>
            <span className={cn('font-medium', overBudget ? 'text-rose-600 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
              {formatCurrency(Math.abs(remaining))}{overBudget ? ' over' : ' left'}
            </span>
          </div>
        </div>

        {/* Desktop: table row layout */}
        <div className="hidden sm:flex items-center gap-3">
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: b.categories?.color || 'hsl(var(--primary))' }} />
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <span className="text-sm font-medium truncate">{b.categories?.name || 'Unknown'}</span>
            {b.rollover && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">↻</span>}
            {rolloverAmt > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400 shrink-0">+{formatCurrency(rolloverAmt)}</span>}
          </div>
          <div className="w-[200px]">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div className={cn('h-full rounded-full transition-all duration-500', overBudget ? 'bg-rose-500' : BAR_COLORS[type])} style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="w-[90px] text-right text-sm tabular-nums">{formatCurrency(effectiveBudget)}</span>
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
          <button className="w-full flex items-center gap-2 sm:gap-3 py-3 px-3 hover:bg-muted/30 rounded-lg transition-colors text-left">
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />}
            <span className={cn('flex-1 font-display font-semibold text-sm sm:text-base', EXPENSE_TYPE_COLORS[type])}>
              {EXPENSE_TYPE_LABELS[type]}
            </span>
            <span className="text-right text-xs sm:text-sm font-semibold tabular-nums sm:w-[90px]">{formatCurrency(totals.budget)}</span>
            <span className="hidden sm:inline-block w-[90px] text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(totals.actual)}</span>
            <span className={cn('text-right text-xs sm:text-sm font-semibold tabular-nums sm:w-[90px]', totals.remaining < 0 ? 'text-rose-600 dark:text-rose-400' : isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground')}>
              {formatCurrency(Math.abs(totals.remaining))}
            </span>
            <div className="hidden sm:block w-[62px]" />
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

  if (budgetsLoading) return (
    <div className="p-8 space-y-6">
      <div className="mb-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-lg mb-2" />
        <div className="h-4 w-96 bg-muted/60 animate-pulse rounded" />
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );

  if (!budgetItems.length && !unbudgetedCategories.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            <span className="prism-gradient-text">Budgets</span>
          </h1>
        </div>
        <EmptyState
          icon={PiggyBank}
          title="No budgets set yet"
          description="Create your first budget to start tracking spending and reaching your financial goals. Use the Smart Budget feature for AI-powered suggestions based on your spending history."
          actionLabel="Create Budget"
          onAction={() => setDialogOpen(true)}
        />
      </div>
    );
  }

  if (budgetsLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">{formatMonth(month)}</h1>
          <PageOverview
            title="Budgets Overview"
            description="Set monthly spending limits per category and track actual spending vs planned amounts in real time."
            icon={PiggyBank}
            iconColor="text-prism-amber"
            ttsScript="Welcome to Budgets. Here you can create monthly spending plans for each category. Set planned amounts for your income, fixed expenses like rent and utilities, flexible expenses like groceries and dining, and non-monthly expenses. The progress bars show how much you have spent versus your budget in real time. Toggle between Personal and Business budgets. Use the Forecast tab to see spending projections. Navigate months with the arrow buttons to plan ahead or review past months."
            features={[
              'Set planned amounts for each category',
              'Real-time spending vs budget tracking',
              'Personal and Business budget views',
              'Spending forecast projections',
              'Income, fixed, flexible, and non-monthly grouping',
              'Rollover unused budgets to next month',
            ]}
            demoData={[
              { label: 'Groceries', value: '$420/$600', badge: '70%', color: '#22c55e' },
              { label: 'Dining Out', value: '$180/$200', badge: '90%', color: '#f59e0b' },
              { label: 'Rent/Mortgage', value: '$1,800/$1,800', badge: '100%', color: '#3b82f6' },
              { label: 'Subscriptions', value: '$45/$75', badge: '60%', color: '#8b5cf6' },
            ]}
          />
        <div className="flex items-center gap-3 mt-2">
            <Tabs value={budgetType} onValueChange={(v) => setBudgetType(v as 'personal' | 'business')}>
              <TabsList>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="business">Business</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'budget' | 'forecast')}>
              <TabsList>
                <TabsTrigger value="budget">Budget</TabsTrigger>
                <TabsTrigger value="forecast" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Forecast</TabsTrigger>
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
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o - 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setMonthOffset(0)}>Today</Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={unbudgetedCategories.length === 0 ? 0 : undefined}>
                <Button className="gap-2" size="sm" onClick={openCreate} disabled={unbudgetedCategories.length === 0}>
                  <Plus className="h-4 w-4" /> Add Budget
                </Button>
              </span>
            </TooltipTrigger>
            {unbudgetedCategories.length === 0 && (
              <TooltipContent side="bottom" className="max-w-[220px] text-center">
                All categories already have budgets this month. Create a new category first.
              </TooltipContent>
            )}
          </Tooltip>
          <Button variant="outline" size="sm" className="gap-2" onClick={() => { setQuickAddForm({ name: '', group_id: '', color: '#7c5cf5' }); setQuickAddOpen(true); }}>
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New Category</span><span className="sm:hidden">Category</span>
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            disabled={smartBudget.isPending}
            onClick={async () => {
              try {
                const result = await smartBudget.mutateAsync();
                if (result.suggestions?.length) {
                  setSmartSuggestions(result.suggestions.map((s: any) => ({ ...s, selected: true })));
                  setSmartBudgetOpen(true);
                } else {
                  // No suggestions
                  setSmartSuggestions([]);
                  setSmartBudgetOpen(true);
                }
              } catch (e) {
                console.error('Smart budget error:', e);
              }
            }}
          >
            {smartBudget.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Smart Budget
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={copyingForward || !budgetItems.length}
            onClick={handleCopyForward}
          >
            {copyingForward ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            <span className="hidden sm:inline">Copy to Next Month</span><span className="sm:hidden">Copy</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => setHideZeroAmounts(h => !h)}
          >
            {hideZeroAmounts ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            <span className="hidden sm:inline">{hideZeroAmounts ? 'Show $0' : 'Hide $0'}</span>
          </Button>
        </div>
      </div>

      {viewTab === 'budget' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main budget table */}
        <div className="space-y-2">
          {/* Column headers */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="flex-1" />
            <span className="w-[200px]" />
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
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-muted/30 rounded-lg font-semibold text-sm sm:text-base">
            <span className="flex-1 font-display">Total Income</span>
            <span className="text-right tabular-nums sm:w-[90px]">{formatCurrency(totalIncomeBudget)}</span>
            <span className="hidden sm:inline-block w-[90px] text-right tabular-nums text-muted-foreground">{formatCurrency(totalIncomeActual)}</span>
            <span className={cn('text-right tabular-nums sm:w-[90px]', totalIncomeRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {formatCurrency(Math.abs(totalIncomeRemaining))}
            </span>
            <div className="hidden sm:block w-[62px]" />
          </div>

          {/* Expenses Section */}
          <Card className="overflow-hidden">
            <CardContent className="p-2 space-y-1">
              <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
                <ChevronDown className="h-4 w-4 invisible" />
                <span className="flex-1">Expenses</span>
                <span className="w-[200px]" />
                <span className="w-[90px] text-right">Budget</span>
                <span className="w-[90px] text-right">Actual</span>
                <span className="w-[90px] text-right">Remaining</span>
                <div className="w-[62px]" />
              </div>
              <div className="sm:hidden px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">Expenses</div>
              {renderSection('fixed', groupedBudgets.fixed)}
              {renderSection('flexible', groupedBudgets.flexible)}
              {renderSection('non_monthly', groupedBudgets.non_monthly)}
            </CardContent>
          </Card>

          {/* Total Expenses Row */}
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-muted/30 rounded-lg font-semibold text-sm sm:text-base">
            <span className="flex-1 font-display">Total Expenses</span>
            <span className="text-right tabular-nums sm:w-[90px]">{formatCurrency(totalExpenseBudget)}</span>
            <span className="hidden sm:inline-block w-[90px] text-right tabular-nums text-muted-foreground">{formatCurrency(totalExpenseActual)}</span>
            <span className={cn('text-right tabular-nums sm:w-[90px]', totalExpenseRemaining >= 0 ? 'text-foreground' : 'text-rose-600 dark:text-rose-400')}>
              {formatCurrency(Math.abs(totalExpenseRemaining))}
            </span>
            <div className="hidden sm:block w-[62px]" />
          </div>

          {/* Unbudgeted categories */}
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
                        <div key={c.id} className="flex items-center gap-2 sm:gap-3 py-2 px-3 hover:bg-muted/30 rounded-lg transition-colors group">
                          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="flex-1 text-sm text-muted-foreground truncate">{c.name}</span>
                          <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
                            {spent > 0 ? formatCurrency(spent) : received > 0 ? formatCurrency(received) : '—'}
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs sm:opacity-0 sm:group-hover:opacity-100" onClick={() => { setForm({ category_id: c.id, planned_amount: '', rollover: false, budgetKind: 'expense', group_id: c.group_id }); setEditingBudget(null); setDialogOpen(true); }}>
                            <Plus className="h-3 w-3 mr-1" /> Budget
                          </Button>
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

          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Summary</p>
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
      ) : (
      /* ============ FORECAST TAB ============ */
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          {/* Progress through month */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-display font-semibold">Month Progress</h3>
                <span className="text-sm text-muted-foreground">Day {forecast.daysPassed} of {forecast.totalDays}</span>
              </div>
              <Progress value={(forecast.daysPassed / forecast.totalDays) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {forecast.isCurrentMonth
                  ? `${forecast.daysRemaining} days remaining — projections based on daily spending rate`
                  : 'This is not the current month — showing full actuals'}
              </p>
            </CardContent>
          </Card>

          {/* Forecast table */}
          <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="flex-1">Category</span>
            <span className="w-[90px] text-right">Budget</span>
            <span className="w-[90px] text-right">Spent</span>
            <span className="w-[100px] text-right">Projected</span>
            <span className="w-[80px] text-right">Status</span>
          </div>

          {/* Expense forecast items */}
          <Card className="overflow-hidden">
            <CardContent className="p-0 divide-y">
              {forecast.items.filter(i => i.type !== 'income').sort((a, b) => (b.projected - b.budget) - (a.projected - a.budget)).map(item => {
                const overBudget = item.projected > item.budget && item.budget > 0;
                const pct = item.budget > 0 ? (item.projected / item.budget) * 100 : 0;
                return (
                  <div key={item.category_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                    <span className="w-[90px] text-right text-sm tabular-nums">{formatCurrency(item.budget)}</span>
                    <span className="w-[90px] text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(item.spent)}</span>
                    <span className={cn('w-[100px] text-right text-sm font-semibold tabular-nums', overBudget ? 'text-rose-600 dark:text-rose-400' : 'text-foreground')}>
                      {formatCurrency(item.projected)}
                    </span>
                    <div className="w-[80px] flex justify-end">
                      {item.budget === 0 ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : overBudget ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="h-3 w-3" /> {Math.round(pct)}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3" /> {Math.round(pct)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {forecast.items.filter(i => i.type !== 'income').length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">No budgeted expenses to forecast.</div>
              )}
            </CardContent>
          </Card>

          {/* Income forecast */}
          {forecast.items.filter(i => i.type === 'income').length > 0 && (
            <>
              <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider px-3 pt-2">Income Forecast</h3>
              <Card className="overflow-hidden">
                <CardContent className="p-0 divide-y">
                  {forecast.items.filter(i => i.type === 'income').map(item => {
                    const onTrack = item.projected >= item.budget;
                    const pct = item.budget > 0 ? (item.projected / item.budget) * 100 : 0;
                    return (
                      <div key={item.category_id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="flex-1 text-sm font-medium truncate">{item.name}</span>
                        <span className="w-[90px] text-right text-sm tabular-nums">{formatCurrency(item.budget)}</span>
                        <span className="w-[90px] text-right text-sm tabular-nums text-muted-foreground">{formatCurrency(item.spent)}</span>
                        <span className={cn('w-[100px] text-right text-sm font-semibold tabular-nums', onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                          {formatCurrency(item.projected)}
                        </span>
                        <div className="w-[80px] flex justify-end">
                          <span className={cn('text-xs font-medium', onTrack ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')}>
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Forecast sidebar */}
        <div className="space-y-4">
          {/* Projected savings */}
          {(() => {
            const projectedSavings = forecast.totals.income.projected - forecast.totals.expenses.projected;
            const isPositive = projectedSavings >= 0;
            return (
              <Card className={cn('border-2', isPositive ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-rose-500/30 bg-rose-500/5')}>
                <CardContent className="p-5 text-center">
                  <p className={cn('text-3xl font-bold font-display', isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {projectedSavings < 0 ? '-' : ''}{formatCurrency(Math.abs(projectedSavings))}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Projected Savings</p>
                </CardContent>
              </Card>
            );
          })()}

          <Card>
            <CardContent className="p-4 space-y-4">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Forecast Summary</p>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Projected Income</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(forecast.totals.income.projected)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Projected Expenses</span>
                  <span className="font-semibold">{formatCurrency(forecast.totals.expenses.projected)}</span>
                </div>
                <div className="border-t pt-3 flex justify-between text-sm">
                  <span>Budget (Expenses)</span>
                  <span className="font-semibold">{formatCurrency(forecast.totals.expenses.budget)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Variance</span>
                  {(() => {
                    const variance = forecast.totals.expenses.budget - forecast.totals.expenses.projected;
                    return (
                      <span className={cn('font-semibold', variance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {variance >= 0 ? '+' : '-'}{formatCurrency(Math.abs(variance))}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* At-risk categories */}
              {(() => {
                const atRisk = forecast.items.filter(i => i.type !== 'income' && i.budget > 0 && i.projected > i.budget);
                if (atRisk.length === 0) return (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">All categories on track!</span>
                  </div>
                );
                return (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> At Risk ({atRisk.length})
                    </p>
                    {atRisk.map(item => (
                      <div key={item.category_id} className="flex items-center gap-2 text-sm">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="flex-1 truncate">{item.name}</span>
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                          +{formatCurrency(item.projected - item.budget)}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Create / Edit Budget Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingBudget ? 'Edit Budget' : 'Add Budget'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Income / Expense Toggle */}
            {!editingBudget && (
              <div className="space-y-2">
                <Label>Type</Label>
                <Tabs value={form.budgetKind} onValueChange={(v) => setForm(f => ({ ...f, budgetKind: v as 'income' | 'expense', group_id: '', category_id: '' }))}>
                  <TabsList className="w-full">
                    <TabsTrigger value="income" className="flex-1 gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Income
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="flex-1 gap-1.5">
                      <PiggyBank className="h-3.5 w-3.5" /> Expense
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Group Dropdown */}
            {!editingBudget && (
              <div className="space-y-2">
                <Label>Group</Label>
                <Select value={form.group_id} onValueChange={v => setForm(f => ({ ...f, group_id: v, category_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                  <SelectContent>
                    {(categoryGroups as any[] || [])
                      .filter((g: any) => {
                        const isIncome = (g.expense_type || 'flexible') === 'income';
                        return form.budgetKind === 'income' ? isIncome : !isIncome;
                      })
                      .map((g: any) => (
                        <SelectItem key={g.id} value={g.id}>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                            {g.name}
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Dropdown (filtered by group) */}
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
                  <SelectTrigger><SelectValue placeholder={form.group_id ? "Select category" : "Select a group first"} /></SelectTrigger>
                  <SelectContent>
                    {unbudgetedCategories
                      .filter(c => !form.group_id || c.group_id === form.group_id)
                      .map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    {unbudgetedCategories.filter(c => !form.group_id || c.group_id === form.group_id).length === 0 && (
                      <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                        {form.group_id ? 'All categories in this group are budgeted' : 'Select a group first'}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label>Planned Amount</Label>
              <Input type="number" step="0.01" min="0" placeholder="500.00" value={form.planned_amount} onChange={e => setForm(f => ({ ...f, planned_amount: e.target.value }))} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Rollover</Label>
                <p className="text-xs text-muted-foreground">Carry unspent budget to next month</p>
              </div>
              <Switch checked={form.rollover} onCheckedChange={v => setForm(f => ({ ...f, rollover: v }))} />
            </div>
            {form.rollover && rolloverAmounts.has(form.category_id) && (
              <div className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-lg px-3 py-2">
                +{formatCurrency(rolloverAmounts.get(form.category_id)!)} rolling over from previous month
              </div>
            )}
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

      {/* Quick Add Category Dialog */}
      <Dialog open={quickAddOpen} onOpenChange={setQuickAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Quick Add Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input placeholder="e.g. Groceries" value={quickAddForm.name} onChange={e => setQuickAddForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Category Group</Label>
              <Select value={quickAddForm.group_id} onValueChange={v => setQuickAddForm(f => ({ ...f, group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {(categoryGroups || []).map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <Input type="color" value={quickAddForm.color} onChange={e => setQuickAddForm(f => ({ ...f, color: e.target.value }))} className="h-10 w-20 p-1" />
            </div>
            <Button
              onClick={async () => {
                if (!quickAddForm.name || !quickAddForm.group_id) return;
                const newCat = await createCategory.mutateAsync({ name: quickAddForm.name, group_id: quickAddForm.group_id, color: quickAddForm.color });
                setQuickAddOpen(false);
                setQuickAddForm({ name: '', group_id: '', color: '#7c5cf5' });
                // Open budget dialog with the new category pre-selected
                setEditingBudget(null);
                setForm({ category_id: newCat.id, planned_amount: '', rollover: false, budgetKind: 'expense', group_id: quickAddForm.group_id });
                setDialogOpen(true);
              }}
              disabled={!quickAddForm.name || !quickAddForm.group_id || createCategory.isPending}
              className="w-full"
            >
              {createCategory.isPending ? 'Creating...' : 'Create Category & Add Budget'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Smart Budget Suggestions Dialog */}
      <Dialog open={smartBudgetOpen} onOpenChange={setSmartBudgetOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Smart Budget Suggestions</DialogTitle>
          </DialogHeader>
          {smartSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">Not enough spending history to generate suggestions. Add more transactions first.</p>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Based on your last 90 days of spending. Select which categories to apply:</p>
              <div className="space-y-2">
                {smartSuggestions.map((s, i) => (
                  <div key={s.category_id} className="flex items-center gap-3 py-2 px-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                    <Checkbox
                      checked={s.selected}
                      onCheckedChange={(checked) => {
                        setSmartSuggestions(prev => prev.map((item, idx) => idx === i ? { ...item, selected: !!checked } : item));
                      }}
                    />
                    <span className="flex-1 text-sm font-medium">{s.category_name}</span>
                    <div className="text-right">
                      <div className="text-sm font-semibold tabular-nums">{formatCurrency(s.suggested_budget)}</div>
                      <div className="text-xs text-muted-foreground">avg {formatCurrency(s.monthly_average)}/mo</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  {smartSuggestions.filter(s => s.selected).length} of {smartSuggestions.length} selected
                </div>
                <Button
                  disabled={upsertBudget.isPending || smartSuggestions.filter(s => s.selected).length === 0}
                  onClick={async () => {
                    const selected = smartSuggestions.filter(s => s.selected);
                    for (const s of selected) {
                      await upsertBudget.mutateAsync({ category_id: s.category_id, month, planned_amount: s.suggested_budget });
                    }
                    setSmartBudgetOpen(false);
                  }}
                >
                  {upsertBudget.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Apply {smartSuggestions.filter(s => s.selected).length} Budgets
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};

export default Budgets;
