import { useMemo, useState, useCallback } from 'react';
import { PaystubUploader } from '@/components/PaystubUploader';
import { BillScanner } from '@/components/BillScanner';
import { toast } from 'sonner';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend, Tooltip as RTooltip } from 'recharts';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useBusinessProfiles } from '@/hooks/use-business-data';
import { useSmartBudget } from '@/hooks/use-financial-intelligence';
import { useCurrency } from '@/hooks/use-currency';
import { Loader2, Plus, Pencil, Trash2, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Eye, EyeOff, Settings2, TrendingUp, AlertTriangle, CheckCircle2, PiggyBank, Sparkles, Copy, ClipboardCheck, MoreHorizontal, BookOpen, Printer, X, Scale, FileUp, Receipt } from 'lucide-react';
import { useHousehold } from '@/contexts/HouseholdContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { getDaysInMonth } from 'date-fns';
import PageOverview from '@/components/PageOverview';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/EmptyState';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const getMonth = (offset: number) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const formatMonth = (monthStr: string) => {
  const [y, m] = monthStr.split('-');
  return new Date(+y, +m - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

type ExpenseType = 'income' | 'fixed' | 'flexible' | 'non_monthly' | 'payroll_deduction';

const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  income: 'Income',
  payroll_deduction: 'Payroll & Pre-Tax Deductions',
  fixed: 'Fixed',
  flexible: 'Flexible',
  non_monthly: 'Non-Monthly',
};

const EXPENSE_TYPE_COLORS: Record<ExpenseType, string> = {
  income: 'text-emerald-600 dark:text-emerald-400',
  payroll_deduction: 'text-sky-600 dark:text-sky-400',
  fixed: 'text-primary',
  flexible: 'text-amber-600 dark:text-amber-400',
  non_monthly: 'text-purple-600 dark:text-purple-400',
};

const BAR_COLORS: Record<ExpenseType, string> = {
  income: 'bg-emerald-500',
  payroll_deduction: 'bg-sky-500',
  fixed: 'bg-primary',
  flexible: 'bg-amber-500',
  non_monthly: 'bg-purple-500',
};

// Conscious Spending Plan benchmark percentages (of net income)
const BENCHMARK_RANGES: Partial<Record<ExpenseType, { min: number; max: number; label: string }>> = {
  fixed: { min: 50, max: 60, label: '50-60%' },
  flexible: { min: 20, max: 35, label: '20-35%' },
  non_monthly: { min: 5, max: 10, label: '5-10%' },
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
  const { household } = useHousehold();
  const [monthOffset, setMonthOffset] = useState(0);
  const [budgetType, setBudgetType] = useState<'personal' | 'business' | 'all'>('personal');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('all');
  const month = getMonth(monthOffset);
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(month);
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();
  const { data: categoryGroups } = useCategoryGroups();
  const upsertBudget = useUpsertBudget();
  const deleteBudget = useDeleteBudget();
  const createCategory = useCreateCategory();
  const { data: businessProfiles } = useBusinessProfiles();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ category_id: string; planned_amount: string; rollover: boolean } | null>(null);
  const [form, setForm] = useState({ category_id: '', planned_amount: '', rollover: false, budgetKind: 'expense' as 'income' | 'expense' | 'equity', group_id: '', expense_type: 'flexible' as 'fixed' | 'flexible' | 'non_monthly' | 'payroll_deduction' });
  const [auditOpen, setAuditOpen] = useState(false);
  const [auditResult, setAuditResult] = useState<string>('');
  const [auditLoading, setAuditLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [showUnbudgeted, setShowUnbudgeted] = useState(false);
  const [hideZeroAmounts, setHideZeroAmounts] = useState(false);
  const [hiddenBudgetIds, setHiddenBudgetIds] = useState<Set<string>>(new Set());
  const [selectedBudgetIds, setSelectedBudgetIds] = useState<Set<string>>(new Set());

  const toggleBudgetSelection = useCallback((id: string) => {
    setSelectedBudgetIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBatchHide = useCallback(() => {
    setHiddenBudgetIds(prev => {
      const next = new Set(prev);
      selectedBudgetIds.forEach(id => next.add(id));
      return next;
    });
    setSelectedBudgetIds(new Set());
  }, [selectedBudgetIds]);

  const handleBatchDelete = useCallback(() => {
    const ids = Array.from(selectedBudgetIds);
    ids.forEach(id => deleteBudget.mutate(id));
    setSelectedBudgetIds(new Set());
  }, [selectedBudgetIds, deleteBudget]);
  const [copyingForward, setCopyingForward] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ income: true, payroll_deduction: true, fixed: true, flexible: true, non_monthly: true });
  const [viewTab, setViewTab] = useState<'budget' | 'forecast'>('budget');
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({ name: '', group_id: '', color: '#7c5cf5' });
  const [smartBudgetOpen, setSmartBudgetOpen] = useState(false);
  const [smartSuggestions, setSmartSuggestions] = useState<{ category_id: string; category_name: string; monthly_average: number; suggested_budget: number; selected: boolean }[]>([]);
  const smartBudget = useSmartBudget();
  const [printPreview, setPrintPreview] = useState(false);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [paystubOpen, setPaystubOpen] = useState(false);
  const [billScanOpen, setBillScanOpen] = useState(false);
  const toggleSection = (key: string) => setOpenSections(s => ({ ...s, [key]: !s[key] }));

  

  // Business profiles list for per-business rendering
  const businessList = useMemo(() => {
    if (!businessProfiles) return [];
    return businessProfiles.map((bp: any) => ({ id: bp.id, name: bp.business_name }));
  }, [businessProfiles]);

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

  // Previous month spending for MoM comparison
  const prevMonthSpending = useMemo(() => {
    if (!transactions) return { totalExpenses: 0, totalIncome: 0, byCategory: {} as Record<string, number> };
    const [y, m] = month.split('-').map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const prevPrefix = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    let totalExpenses = 0;
    let totalIncome = 0;
    const byCategory: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date.startsWith(prevPrefix) && t.category_id) {
        if (t.amount < 0) {
          const abs = Math.abs(t.amount);
          totalExpenses += abs;
          byCategory[t.category_id] = (byCategory[t.category_id] || 0) + abs;
        } else {
          totalIncome += t.amount;
        }
      }
    }
    return { totalExpenses, totalIncome, byCategory };
  }, [transactions, month]);

  // MoM narrative helper
  const momNarrative = useMemo(() => {
    const prev = prevMonthSpending;
    const currExpenses = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
    const currIncome = Object.values(receivedByCategory).reduce((s, v) => s + v, 0);
    if (prev.totalExpenses === 0 && prev.totalIncome === 0) return null;

    const expChange = currExpenses - prev.totalExpenses;
    const expPct = prev.totalExpenses > 0 ? Math.round((expChange / prev.totalExpenses) * 100) : 0;
    const incChange = currIncome - prev.totalIncome;
    const incPct = prev.totalIncome > 0 ? Math.round((incChange / prev.totalIncome) * 100) : 0;

    // Find top category changes (biggest increases)
    const catChanges: { name: string; change: number; pct: number }[] = [];
    const allCatIds = new Set([...Object.keys(spentByCategory), ...Object.keys(prev.byCategory)]);
    for (const catId of allCatIds) {
      const curr = spentByCategory[catId] || 0;
      const prevAmt = prev.byCategory[catId] || 0;
      if (prevAmt === 0 && curr === 0) continue;
      const cat = (categories || []).find(c => c.id === catId);
      if (!cat) continue;
      const change = curr - prevAmt;
      const pct = prevAmt > 0 ? Math.round((change / prevAmt) * 100) : (curr > 0 ? 100 : 0);
      catChanges.push({ name: cat.name, change, pct });
    }
    catChanges.sort((a, b) => b.change - a.change);
    const topIncreases = catChanges.filter(c => c.change > 0).slice(0, 3);
    const topDecreases = catChanges.filter(c => c.change < 0).slice(0, 3);

    return { expChange, expPct, incChange, incPct, currExpenses, currIncome, topIncreases, topDecreases };
  }, [spentByCategory, receivedByCategory, prevMonthSpending, categories]);

  // Filter categories by budget type AND selected business
  const filteredCategoryIds = useMemo(() => {
    if (!categories || !categoryGroups) return new Set<string>();
    const groupIds = new Set(
      (categoryGroups as any[])
        .filter((g: any) => {
          if (budgetType === 'all') return true;
          if ((g.budget_type || 'personal') !== budgetType) return false;
          if (budgetType === 'business' && selectedBusiness !== 'all') {
            return g.business_profile_id === selectedBusiness;
          }
          return true;
        })
        .map((g: any) => g.id)
    );
    return new Set(categories.filter(c => groupIds.has(c.group_id)).map(c => c.id));
  }, [categories, categoryGroups, budgetType, selectedBusiness]);

  // For "all" mode, separate personal vs business category IDs
  const personalCategoryIds = useMemo(() => {
    if (!categories || !categoryGroups) return new Set<string>();
    const groupIds = new Set((categoryGroups as any[]).filter((g: any) => (g.budget_type || 'personal') === 'personal').map((g: any) => g.id));
    return new Set(categories.filter(c => groupIds.has(c.group_id)).map(c => c.id));
  }, [categories, categoryGroups]);

  const businessCategoryIds = useMemo(() => {
    if (!categories || !categoryGroups) return new Set<string>();
    const groupIds = new Set((categoryGroups as any[]).filter((g: any) => (g.budget_type || 'personal') === 'business').map((g: any) => g.id));
    return new Set(categories.filter(c => groupIds.has(c.group_id)).map(c => c.id));
  }, [categories, categoryGroups]);

  const budgetItems: BudgetRow[] = (budgets || []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] || 0,
    received: receivedByCategory[b.category_id] || 0,
  })).filter(b => filteredCategoryIds.has(b.category_id));

  // Group budgets by expense type
  const groupBudgetsByExpenseType = useCallback((items: BudgetRow[]) => {
    const groups: Record<ExpenseType, BudgetRow[]> = { income: [], payroll_deduction: [], fixed: [], flexible: [], non_monthly: [] };
    for (const b of items) {
      if (hideZeroAmounts && b.planned_amount === 0) continue;
      if (hiddenBudgetIds.has(b.id)) continue;
      const type = categoryExpenseType.get(b.category_id) || 'flexible';
      groups[type].push(b);
    }
    return groups;
  }, [categoryExpenseType, hideZeroAmounts, hiddenBudgetIds]);

  const groupedBudgets = useMemo(() => groupBudgetsByExpenseType(budgetItems), [groupBudgetsByExpenseType, budgetItems]);

  // For "all" mode: split budgets by entity
  const personalBudgetItems = useMemo(() => budgetItems.filter(b => personalCategoryIds.has(b.category_id)), [budgetItems, personalCategoryIds]);
  const businessBudgetItems = useMemo(() => budgetItems.filter(b => businessCategoryIds.has(b.category_id)), [budgetItems, businessCategoryIds]);
  const personalGroupedBudgets = useMemo(() => groupBudgetsByExpenseType(personalBudgetItems), [groupBudgetsByExpenseType, personalBudgetItems]);
  const businessGroupedBudgets = useMemo(() => groupBudgetsByExpenseType(businessBudgetItems), [groupBudgetsByExpenseType, businessBudgetItems]);


  // Section totals helper
  const calcSectionTotals = useCallback((grouped: Record<ExpenseType, BudgetRow[]>) => {
    const totals: Record<ExpenseType, { budget: number; actual: number; remaining: number }> = {
      income: { budget: 0, actual: 0, remaining: 0 },
      payroll_deduction: { budget: 0, actual: 0, remaining: 0 },
      fixed: { budget: 0, actual: 0, remaining: 0 },
      flexible: { budget: 0, actual: 0, remaining: 0 },
      non_monthly: { budget: 0, actual: 0, remaining: 0 },
    };
    for (const [type, items] of Object.entries(grouped)) {
      const t = type as ExpenseType;
      for (const b of items) {
        totals[t].budget += b.planned_amount;
        totals[t].actual += t === 'income' ? b.received : b.spent;
        totals[t].remaining += b.planned_amount - (t === 'income' ? b.received : b.spent);
      }
    }
    return totals;
  }, []);

  const sectionTotals = useMemo(() => calcSectionTotals(groupedBudgets), [calcSectionTotals, groupedBudgets]);
  const personalSectionTotals = useMemo(() => calcSectionTotals(personalGroupedBudgets), [calcSectionTotals, personalGroupedBudgets]);
  const businessSectionTotals = useMemo(() => calcSectionTotals(businessGroupedBudgets), [calcSectionTotals, businessGroupedBudgets]);

  // Per-business budget data for the business tab
  const perBusinessData = useMemo(() => {
    if (!categories || !categoryGroups || !businessList.length) return [];
    return businessList.map(biz => {
      const bizGroupIds = new Set(
        (categoryGroups as any[])
          .filter((g: any) => {
            if ((g.budget_type || 'personal') !== 'business') return false;
            return g.business_profile_id === biz.id;
          })
          .map((g: any) => g.id)
      );
      const bizCatIds = new Set(categories.filter(c => bizGroupIds.has(c.group_id)).map(c => c.id));
      const items = budgetItems.filter(b => bizCatIds.has(b.category_id));
      const grouped = groupBudgetsByExpenseType(items);
      const totals = calcSectionTotals(grouped);
      return { name: biz.name, id: biz.id, items, grouped, totals, catIds: bizCatIds };
    }).filter(b => b.items.length > 0);
  }, [categories, categoryGroups, businessList, budgetItems, groupBudgetsByExpenseType, calcSectionTotals]);

  // Compute all collapsible section keys for expand/collapse all
  const getAllSectionKeys = useCallback(() => {
    const keys = ['income', 'payroll_deduction', 'fixed', 'flexible', 'non_monthly'];
    if (budgetType === 'all') {
      for (const biz of (perBusinessData || [])) {
        const bizKey = biz.name.replace(/\s+/g, '_');
        keys.push(`all_${bizKey}_income`, `all_${bizKey}_fixed`, `all_${bizKey}_flexible`, `all_${bizKey}_non_monthly`);
      }
    } else if (budgetType === 'business') {
      for (const biz of (perBusinessData || [])) {
        const bizKey = biz.name.replace(/\s+/g, '_');
        keys.push(`${bizKey}_income`, `${bizKey}_fixed`, `${bizKey}_flexible`, `${bizKey}_non_monthly`);
      }
    }
    return keys;
  }, [budgetType, perBusinessData]);

  const totalIncomeBudget = sectionTotals.income.budget;
  const totalIncomeActual = sectionTotals.income.actual;
  const totalIncomeRemaining = sectionTotals.income.remaining;

  const totalExpenseBudget = sectionTotals.payroll_deduction.budget + sectionTotals.fixed.budget + sectionTotals.flexible.budget + sectionTotals.non_monthly.budget;
  const totalExpenseActual = sectionTotals.payroll_deduction.actual + sectionTotals.fixed.actual + sectionTotals.flexible.actual + sectionTotals.non_monthly.actual;
  const totalExpenseRemaining = totalExpenseBudget - totalExpenseActual;

  // Gross income = net income + payroll deductions
  const grossIncomeBudget = totalIncomeBudget + sectionTotals.payroll_deduction.budget;

  // Net expenses exclude payroll deductions for unallocated calc
  const netExpenseBudget = sectionTotals.fixed.budget + sectionTotals.flexible.budget + sectionTotals.non_monthly.budget;
  const unallocated = totalIncomeBudget - netExpenseBudget;

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
    setForm({ category_id: '', planned_amount: '', rollover: false, budgetKind: 'expense', group_id: '', expense_type: 'flexible' });
    setDialogOpen(true);
  };

  const openEdit = (categoryId: string, currentAmount: number) => {
    const budget = budgetItems.find(b => b.category_id === categoryId);
    const rollover = (budget as any)?.rollover ?? false;
    const cat = (categories || []).find(c => c.id === categoryId);
    const group = cat ? (categoryGroups as any[])?.find((g: any) => g.id === cat.group_id) : null;
    const expType = group?.expense_type || 'flexible';
    setEditingBudget({ category_id: categoryId, planned_amount: String(currentAmount), rollover });
    const budgetKind = expType === 'income' ? 'income' : expType === 'equity' ? 'equity' : 'expense';
    const formExpType = (expType === 'income' || expType === 'equity' ? 'flexible' : expType) as 'fixed' | 'flexible' | 'non_monthly';
    setForm({ category_id: categoryId, planned_amount: String(currentAmount), rollover, budgetKind, group_id: cat?.group_id || '', expense_type: formExpType });
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

  const handleAuditBudget = useCallback(async () => {
    if (!household?.id) return;
    setAuditLoading(true);
    setAuditResult('');
    setAuditOpen(true);

    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/budget-audit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ household_id: household.id, month }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
        setAuditResult(`**Error:** ${err.error || 'Failed to audit budget'}`);
        setAuditLoading(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setAuditLoading(false); return; }
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIdx: number;
        while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIdx);
          buffer = buffer.slice(newlineIdx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setAuditResult(fullText);
            }
          } catch { /* partial json, ignore */ }
        }
      }
    } catch (e) {
      setAuditResult('**Error:** Failed to connect to AI service.');
    } finally {
      setAuditLoading(false);
    }
  }, [household?.id, month]);


  const renderBudgetRow = (b: BudgetRow, type: ExpenseType) => {
    const isIncome = type === 'income';
    const actual = isIncome ? b.received : b.spent;
    const rolloverAmt = rolloverAmounts.get(b.category_id) || 0;
    const effectiveBudget = b.planned_amount + rolloverAmt;
    const remaining = effectiveBudget - actual;
    const pct = effectiveBudget > 0 ? Math.min((actual / effectiveBudget) * 100, 100) : 0;
    const overBudget = remaining < 0;

    return (
      <div key={b.id} className={cn("group py-2.5 px-3 hover:bg-muted/30 rounded-lg transition-colors", selectedBudgetIds.has(b.id) && "bg-primary/5")}>
        {/* Mobile: stacked layout */}
        <div className="flex items-center gap-2 sm:hidden">
          <Checkbox checked={selectedBudgetIds.has(b.id)} onCheckedChange={() => toggleBudgetSelection(b.id)} className="shrink-0" />
          <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: b.categories?.color || 'hsl(var(--primary))' }} />
          <span className="flex-1 text-sm font-medium truncate">{b.categories?.name || 'Unknown'}</span>
          {b.rollover && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium shrink-0">↻</span>}
          {b.planned_amount === 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-muted-foreground" onClick={() => setHiddenBudgetIds(prev => new Set(prev).add(b.id))}>
                  <EyeOff className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Hide from budget</p></TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b.category_id, b.planned_amount)}>
                <Pencil className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Edit budget</p></TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: b.id, name: b.categories?.name || 'Budget' })}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent><p>Delete budget</p></TooltipContent>
          </Tooltip>
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
          <Checkbox checked={selectedBudgetIds.has(b.id)} onCheckedChange={() => toggleBudgetSelection(b.id)} className="shrink-0" />
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
            {b.planned_amount === 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-muted-foreground" onClick={() => setHiddenBudgetIds(prev => new Set(prev).add(b.id))}>
                    <EyeOff className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Hide from budget</p></TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(b.category_id, b.planned_amount)}>
                  <Pencil className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Edit budget</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: b.id, name: b.categories?.name || 'Budget' })}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Delete budget</p></TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    );
  };

  // Render a section (accordion) — optionally pass custom totals for per-business rendering
  const renderSection = (type: ExpenseType, items: BudgetRow[], customTotals?: { budget: number; actual: number; remaining: number }, sectionKey?: string) => {
    const totals = customTotals || sectionTotals[type];
    const key = sectionKey || type;
    const isOpen = openSections[key] ?? true;
    const isIncome = type === 'income';
    const isPayroll = type === 'payroll_deduction';
    const pct = totals.budget > 0 ? Math.min((totals.actual / totals.budget) * 100, 100) : 0;

    // Compute percentage of net income for benchmark badge
    const netIncome = totalIncomeBudget;
    const pctOfNet = netIncome > 0 ? Math.round((totals.budget / netIncome) * 100) : 0;
    const benchmark = BENCHMARK_RANGES[type];
    const benchmarkStatus = benchmark
      ? pctOfNet <= benchmark.max && pctOfNet >= benchmark.min
        ? 'good'
        : pctOfNet < benchmark.min
        ? 'low'
        : 'high'
      : null;

    return (
      <Collapsible key={key} open={isOpen} onOpenChange={() => toggleSection(key)}>
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center gap-2 sm:gap-3 py-3 px-3 hover:bg-muted/30 rounded-lg transition-colors text-left">
            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 rotate-180" />}
            <span className={cn('flex-1 font-display font-semibold text-sm sm:text-base flex items-center gap-2', EXPENSE_TYPE_COLORS[type])}>
              {EXPENSE_TYPE_LABELS[type]}
              {/* Percentage of net income badge */}
              {!isIncome && netIncome > 0 && totals.budget > 0 && (
                <span className={cn(
                  'hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium',
                  benchmarkStatus === 'good' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                  benchmarkStatus === 'high' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                  benchmarkStatus === 'low' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                  'bg-muted text-muted-foreground'
                )}>
                  {pctOfNet}% of net{benchmark ? ` (target: ${benchmark.label})` : ''}
                </span>
              )}
              {isPayroll && grossIncomeBudget > 0 && totals.budget > 0 && (
                <span className="hidden sm:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-sky-500/10 text-sky-600 dark:text-sky-400">
                  {Math.round((totals.budget / grossIncomeBudget) * 100)}% of gross
                </span>
              )}
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

  // ============ PRINT PREVIEW MODE ============
  if (printPreview) {
    const printBudgetRows = (type: ExpenseType, items: BudgetRow[]) => {
      const totals = sectionTotals[type];
      return (
        <>
          <tr key={type + '-header'} className="bg-muted/40 font-semibold text-sm border-b">
            <td className={cn('py-1.5 px-2', EXPENSE_TYPE_COLORS[type])}>{EXPENSE_TYPE_LABELS[type]}</td>
            <td className="py-1.5 px-2 text-right tabular-nums">{formatCurrency(totals.budget)}</td>
            <td className="py-1.5 px-2 text-right tabular-nums text-muted-foreground">{formatCurrency(totals.actual)}</td>
            <td className={cn('py-1.5 px-2 text-right tabular-nums', totals.remaining < 0 ? 'text-rose-600' : '')}>{formatCurrency(Math.abs(totals.remaining))}</td>
          </tr>
          {items.map(b => {
            const isIncome = type === 'income';
            const actual = isIncome ? b.received : b.spent;
            const remaining = isIncome ? b.planned_amount - b.received : b.planned_amount - b.spent;
            return (
              <tr key={b.id} className="text-sm border-b border-muted/30">
                <td className="py-1 px-2">
                  <span className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0 inline-block" style={{ backgroundColor: b.categories?.color }} />
                    <span className="truncate">{b.categories?.name}</span>
                  </span>
                </td>
                <td className="py-1 px-2 text-right tabular-nums">{formatCurrency(b.planned_amount)}</td>
                <td className="py-1 px-2 text-right tabular-nums text-muted-foreground">{formatCurrency(actual)}</td>
                <td className={cn('py-1 px-2 text-right tabular-nums', remaining < 0 ? 'text-rose-600' : '')}>{formatCurrency(Math.abs(remaining))}</td>
              </tr>
            );
          })}
        </>
      );
    };

    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Dynamic print orientation */}
        <style>{`@page { size: ${printOrientation}; }`}</style>

        {/* Print Preview Toolbar */}
        <div className="flex items-center justify-between bg-card border rounded-xl px-4 py-3 sticky top-0 z-30 shadow-sm no-print">
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-primary" />
            <span className="font-display font-semibold">Print Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex border rounded-lg overflow-hidden">
              <Button
                variant={printOrientation === 'portrait' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setPrintOrientation('portrait')}
              >
                Portrait
              </Button>
              <Button
                variant={printOrientation === 'landscape' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none"
                onClick={() => setPrintOrientation('landscape')}
              >
                Landscape
              </Button>
            </div>
            <Button onClick={() => window.print()} className="gap-2">
              <Printer className="h-4 w-4" /> Print
            </Button>
            <Button variant="outline" onClick={() => setPrintPreview(false)} className="gap-2">
              <X className="h-4 w-4" /> Close
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="border-b pb-3">
          <h1 className="font-display text-2xl font-bold">{formatMonth(month)} — Budget Report</h1>
          <p className="text-sm text-muted-foreground mt-1">Generated {new Date().toLocaleDateString()}</p>
        </div>

        {/* Summary Cards Row */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="border-l-4 border-l-emerald-500">
            <CardContent className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">Income</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(totalIncomeBudget)}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(totalIncomeActual)} received</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-primary">
            <CardContent className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">Expenses</p>
              <p className="text-lg font-bold tabular-nums">{formatCurrency(totalExpenseBudget)}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(totalExpenseActual)} spent</p>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4", unallocated >= 0 ? "border-l-emerald-500" : "border-l-amber-500")}>
            <CardContent className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">Unallocated</p>
              <p className={cn("text-lg font-bold tabular-nums", unallocated < 0 ? "text-amber-600" : unallocated === 0 ? "text-emerald-600" : "")}>{formatCurrency(Math.abs(unallocated))}</p>
              <p className="text-xs text-muted-foreground">{unallocated < 0 ? 'over-allocated' : unallocated === 0 ? 'fully allocated ✓' : 'to assign'}</p>
            </CardContent>
          </Card>
          <Card className={cn("border-l-4", totalExpenseRemaining >= 0 ? "border-l-emerald-500" : "border-l-rose-500")}>
            <CardContent className="p-3">
              <p className="text-[10px] font-medium text-muted-foreground uppercase">Under / Over</p>
              <p className={cn("text-lg font-bold tabular-nums", totalExpenseRemaining < 0 ? "text-rose-600" : "")}>{formatCurrency(Math.abs(totalExpenseRemaining))}</p>
              <p className="text-xs text-muted-foreground">{totalExpenseRemaining < 0 ? 'over budget' : 'under budget'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-center">Expense Allocation</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Fixed', value: sectionTotals.fixed.budget, color: '#3b82f6' },
                      { name: 'Flexible', value: sectionTotals.flexible.budget, color: '#f59e0b' },
                      { name: 'Non-Monthly', value: sectionTotals.non_monthly.budget, color: '#a855f7' },
                    ].filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {[
                      { color: '#3b82f6' },
                      { color: '#f59e0b' },
                      { color: '#a855f7' },
                    ].filter((_, i) => [sectionTotals.fixed.budget, sectionTotals.flexible.budget, sectionTotals.non_monthly.budget][i] > 0)
                     .map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3 text-center">Budget vs Actual</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: 'Income', budget: totalIncomeBudget, actual: totalIncomeActual },
                  { name: 'Fixed', budget: sectionTotals.fixed.budget, actual: sectionTotals.fixed.actual },
                  { name: 'Flexible', budget: sectionTotals.flexible.budget, actual: sectionTotals.flexible.actual },
                  { name: 'Non-Monthly', budget: sectionTotals.non_monthly.budget, actual: sectionTotals.non_monthly.actual },
                ]} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                  <Bar dataKey="budget" fill="#3b82f6" name="Budget" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[3, 3, 0, 0]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Full Budget Table */}
        <Card>
          <CardContent className="p-4">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-xs font-medium text-muted-foreground uppercase tracking-wider border-b">
                  <th className="py-2 px-2 text-left">Category</th>
                  <th className="py-2 px-2 text-right w-[90px]">Budget</th>
                  <th className="py-2 px-2 text-right w-[90px]">Actual</th>
                  <th className="py-2 px-2 text-right w-[90px]">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {printBudgetRows('income', groupedBudgets.income)}
                {printBudgetRows('fixed', groupedBudgets.fixed)}
                {printBudgetRows('flexible', groupedBudgets.flexible)}
                {printBudgetRows('non_monthly', groupedBudgets.non_monthly)}
              </tbody>
              <tfoot>
                <tr className="font-semibold text-sm border-t-2 bg-muted/30">
                  <td className="py-2 px-2 font-display">Net (Income − Expenses)</td>
                  <td className="py-2 px-2 text-right tabular-nums">{formatCurrency(totalIncomeBudget - totalExpenseBudget)}</td>
                  <td className="py-2 px-2 text-right tabular-nums text-muted-foreground">{formatCurrency(totalIncomeActual - totalExpenseActual)}</td>
                  <td className={cn('py-2 px-2 text-right tabular-nums', totalIncomeRemaining - totalExpenseRemaining < 0 ? 'text-rose-600' : 'text-emerald-600')}>
                    {formatCurrency(Math.abs((totalIncomeBudget - totalExpenseBudget) - (totalIncomeActual - totalExpenseActual)))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </CardContent>
        </Card>

        {/* Narrative */}
        <Card style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <CardContent className="p-4 space-y-2 text-sm leading-relaxed">
            <h3 className="font-display font-semibold text-base">Budget Narrative</h3>
            <p>
              For <strong>{formatMonth(month)}</strong>, total budgeted income is <strong>{formatCurrency(totalIncomeBudget)}</strong> with{' '}
              <strong>{formatCurrency(totalIncomeActual)}</strong> received so far ({totalIncomeBudget > 0 ? Math.round((totalIncomeActual / totalIncomeBudget) * 100) : 0}%).
            </p>
            <p>
              Total expense budget is <strong>{formatCurrency(totalExpenseBudget)}</strong>, of which <strong>{formatCurrency(totalExpenseActual)}</strong> has been spent.
              {totalExpenseRemaining >= 0
                ? ` You are ${formatCurrency(totalExpenseRemaining)} under budget.`
                : ` You are ${formatCurrency(Math.abs(totalExpenseRemaining))} over budget.`}
            </p>
            <p>
              <strong>Fixed expenses:</strong> {formatCurrency(sectionTotals.fixed.actual)} of {formatCurrency(sectionTotals.fixed.budget)} budgeted
              ({sectionTotals.fixed.remaining < 0 ? `${formatCurrency(Math.abs(sectionTotals.fixed.remaining))} over` : `${formatCurrency(sectionTotals.fixed.remaining)} remaining`}).{' '}
              <strong>Flexible:</strong> {formatCurrency(sectionTotals.flexible.actual)} of {formatCurrency(sectionTotals.flexible.budget)}
              ({sectionTotals.flexible.remaining < 0 ? `${formatCurrency(Math.abs(sectionTotals.flexible.remaining))} over` : `${formatCurrency(sectionTotals.flexible.remaining)} remaining`}).{' '}
              <strong>Non-Monthly:</strong> {formatCurrency(sectionTotals.non_monthly.actual)} of {formatCurrency(sectionTotals.non_monthly.budget)}
              ({sectionTotals.non_monthly.remaining < 0 ? `${formatCurrency(Math.abs(sectionTotals.non_monthly.remaining))} over` : `${formatCurrency(sectionTotals.non_monthly.remaining)} remaining`}).
            </p>

            {/* Overspent line items */}
            {(() => {
              const allExpenseItems = [...groupedBudgets.fixed, ...groupedBudgets.flexible, ...groupedBudgets.non_monthly];
              const overspent = allExpenseItems
                .filter(b => b.spent > b.planned_amount && b.planned_amount > 0)
                .sort((a, b) => (b.spent - b.planned_amount) - (a.spent - a.planned_amount));
              if (overspent.length === 0) return null;
              return (
                <>
                  <p><strong>⚠️ Overspent categories:</strong></p>
                  <ul className="list-disc pl-5 space-y-1">
                    {overspent.map(b => {
                      const overBy = b.spent - b.planned_amount;
                      const pct = Math.round((overBy / b.planned_amount) * 100);
                      const expType = categoryExpenseType.get(b.category_id) || 'flexible';
                      return (
                        <li key={b.id}>
                          <strong>{b.categories?.name}</strong>: spent {formatCurrency(b.spent)} of {formatCurrency(b.planned_amount)} ({formatCurrency(overBy)} over, +{pct}%).
                          {expType === 'fixed'
                            ? ' Consider negotiating a lower rate, switching providers, or adjusting the budget to reflect actual costs.'
                            : expType === 'flexible'
                            ? ' Try setting a weekly spending limit, using cash envelopes, or finding lower-cost alternatives.'
                            : ' Review if this expense can be deferred or spread across multiple months.'}
                        </li>
                      );
                    })}
                  </ul>
                </>
              );
            })()}

            {/* Over-allocated budget advice */}
            {unallocated !== 0 && (
              <p>
                {unallocated > 0
                  ? `There is ${formatCurrency(unallocated)} of income not yet allocated to expense categories. Consider directing this toward savings goals, debt payoff, or building an emergency fund.`
                  : `Expenses exceed income by ${formatCurrency(Math.abs(unallocated))} — the budget is over-allocated. Review flexible spending categories for items to cut or reduce, or look for ways to increase income.`}
              </p>
            )}
            {unallocated === 0 && <p>✅ Every dollar of income is assigned to a budget category.</p>}

            {/* Month-over-month comparison */}
            {momNarrative && (
              <>
                <p>
                  <strong>📊 Month-over-Month Trends:</strong> Total spending is{' '}
                  <strong className={momNarrative.expChange > 0 ? 'text-rose-600' : 'text-emerald-600'}>
                    {momNarrative.expChange > 0 ? 'up' : 'down'} {Math.abs(momNarrative.expPct)}%
                  </strong>{' '}
                  ({formatCurrency(Math.abs(momNarrative.expChange))} {momNarrative.expChange > 0 ? 'more' : 'less'}) compared to last month.
                  {momNarrative.incPct !== 0 && (
                    <> Income is <strong className={momNarrative.incChange > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                      {momNarrative.incChange > 0 ? 'up' : 'down'} {Math.abs(momNarrative.incPct)}%
                    </strong>.</>
                  )}
                </p>
                {momNarrative.topIncreases.length > 0 && (
                  <p>
                    <strong>Biggest spending increases:</strong>{' '}
                    {momNarrative.topIncreases.map((c, i) => (
                      <span key={c.name}>{i > 0 ? ', ' : ''}<strong>{c.name}</strong> (+{formatCurrency(c.change)}, {c.pct > 0 ? `+${c.pct}%` : 'new'})</span>
                    ))}.
                    {momNarrative.expChange > 0 && ' Consider reviewing these categories for savings opportunities.'}
                  </p>
                )}
                {momNarrative.topDecreases.length > 0 && (
                  <p>
                    <strong>✅ Improved categories:</strong>{' '}
                    {momNarrative.topDecreases.map((c, i) => (
                      <span key={c.name}>{i > 0 ? ', ' : ''}<strong>{c.name}</strong> ({formatCurrency(c.change)}, {c.pct}%)</span>
                    ))}.
                    {' '}Keep up the momentum in these areas.
                  </p>
                )}
              </>
            )}

            {/* Overall improvement tip */}
            {totalExpenseRemaining < 0 && (
              <p>
                <strong>💡 Tip:</strong> You've overspent by {formatCurrency(Math.abs(totalExpenseRemaining))} overall. Focus on the largest overspent categories first — small reductions in your top 2–3 problem areas can bring you back on track quickly.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
    <TooltipProvider delayDuration={300}>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Print-only repeating header — position:fixed repeats on every printed page in Chrome */}
      <div className="hidden print:block fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-300 px-4 py-2">
        <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
          <span className="font-display text-sm">{formatMonth(month)} — Budget</span>
          <div className="flex gap-6">
            <span className="w-[80px] text-right">Budget</span>
            <span className="w-[80px] text-right">Actual</span>
            <span className="w-[80px] text-right">Remaining</span>
          </div>
        </div>
      </div>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 -mt-6 pt-6 pb-4 space-y-4">
        {/* Row 1: Title + Month Nav + Actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold shrink-0">{formatMonth(month)}</h1>
            <div className="flex items-center gap-0.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o - 1)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Previous month</p></TooltipContent>
              </Tooltip>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setMonthOffset(0)}>Today</Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setMonthOffset(o => o + 1)}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Next month</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Add Budget */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" className="gap-1.5 h-8" onClick={openCreate}>
                  <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Add Budget</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Add a new budget</p></TooltipContent>
            </Tooltip>

            {/* Smart Budget */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 h-8"
                  disabled={smartBudget.isPending}
                  onClick={async () => {
                    try {
                      const result = await smartBudget.mutateAsync();
                      if (result.suggestions?.length) {
                        setSmartSuggestions(result.suggestions.map((s: any) => ({ ...s, selected: true })));
                        setSmartBudgetOpen(true);
                      } else {
                        setSmartSuggestions([]);
                        setSmartBudgetOpen(true);
                      }
                    } catch (e) {
                      console.error('Smart budget error:', e);
                    }
                  }}
                >
                  {smartBudget.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  <span className="hidden sm:inline">Smart Budget</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>AI-powered budget suggestions based on spending</p></TooltipContent>
            </Tooltip>

            {/* Upload Paystub */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setPaystubOpen(true)}>
                  <FileUp className="h-4 w-4" />
                  <span className="hidden sm:inline">Paystub</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Upload paycheck stub to auto-fill deductions</p></TooltipContent>
            </Tooltip>

            {/* Scan Bill */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => setBillScanOpen(true)}>
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Scan Bill</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent><p>Scan a bill or statement with camera or file</p></TooltipContent>
            </Tooltip>

            {/* More menu */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                {hiddenBudgetIds.size > 0 && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
                        <Eye className="h-3.5 w-3.5" />
                        {hiddenBudgetIds.size} hidden
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="end">
                      <div className="flex items-center justify-between px-2 py-1 mb-1">
                        <span className="text-xs font-semibold text-muted-foreground">Hidden Budgets</span>
                        <Button variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={() => setHiddenBudgetIds(new Set())}>
                          Unhide All
                        </Button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-0.5">
                        {Array.from(hiddenBudgetIds).map(hid => {
                          const item = budgetItems.find(b => b.id === hid);
                          if (!item) return null;
                          return (
                            <div key={hid} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-muted/50 group">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.categories?.color || 'hsl(var(--primary))' }} />
                                <span className="text-sm truncate">{item.categories?.name || 'Unknown'}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => setHiddenBudgetIds(prev => { const next = new Set(prev); next.delete(hid); return next; })}
                              >
                                <Eye className="h-3 w-3" />
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => { setQuickAddForm({ name: '', group_id: '', color: '#7c5cf5' }); setQuickAddOpen(true); }} className="gap-2">
                      <Plus className="h-4 w-4" /> New Category
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleCopyForward}
                      disabled={copyingForward || !budgetItems.length}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" /> Copy to Next Month
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleAuditBudget}
                      disabled={auditLoading}
                      className="gap-2"
                    >
                      <ClipboardCheck className="h-4 w-4" /> AI Audit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">View</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setHideZeroAmounts(h => !h)} className="gap-2">
                      {hideZeroAmounts ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                      {hideZeroAmounts ? 'Show $0 budgets' : 'Hide $0 budgets'}
                    </DropdownMenuItem>
                    {hiddenBudgetIds.size > 0 && (
                      <DropdownMenuItem onClick={() => setHiddenBudgetIds(new Set())} className="gap-2">
                        <Eye className="h-4 w-4" />
                        Show {hiddenBudgetIds.size} hidden item{hiddenBudgetIds.size !== 1 ? 's' : ''}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => setPrintPreview(true)} className="gap-2">
                      <Printer className="h-4 w-4" /> Print View
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Help</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => {}} className="gap-2">
                      <BookOpen className="h-4 w-4" /> Page Guide
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </span>
              </TooltipTrigger>
              <TooltipContent><p>More options</p></TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Row 2: Tabs */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Tabs value={budgetType} onValueChange={(v) => setBudgetType(v as 'personal' | 'business' | 'all')}>
            <TabsList>
              <TabsTrigger value="personal">Personal</TabsTrigger>
              <TabsTrigger value="business">Business</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as 'budget' | 'forecast')}>
            <TabsList>
              <TabsTrigger value="budget">Budget</TabsTrigger>
              <TabsTrigger value="forecast" className="gap-1.5"><TrendingUp className="h-3.5 w-3.5" /> Forecast</TabsTrigger>
            </TabsList>
          </Tabs>
          {budgetType === 'business' && businessList.length > 0 && (
            <Select value={selectedBusiness} onValueChange={setSelectedBusiness}>
              <SelectTrigger className="w-[220px] h-8 text-sm"><SelectValue placeholder="All Businesses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Businesses</SelectItem>
                {businessList.map(biz => <SelectItem key={biz.id} value={biz.id}>{biz.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Income</p>
            <p className="text-lg sm:text-xl font-bold font-display tabular-nums mt-1">{formatCurrency(totalIncomeBudget)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalIncomeActual)} received</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Expenses</p>
            <p className="text-lg sm:text-xl font-bold font-display tabular-nums mt-1">{formatCurrency(totalExpenseBudget)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatCurrency(totalExpenseActual)} spent</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4", unallocated >= 0 ? "border-l-emerald-500" : "border-l-amber-500")}>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Unallocated</p>
            <p className={cn("text-lg sm:text-xl font-bold font-display tabular-nums mt-1", unallocated < 0 ? "text-amber-600 dark:text-amber-400" : unallocated === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}>{formatCurrency(Math.abs(unallocated))}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{unallocated < 0 ? 'over-allocated' : unallocated === 0 ? 'fully allocated ✓' : 'to assign'}</p>
          </CardContent>
        </Card>
        <Card className={cn("border-l-4", totalExpenseRemaining >= 0 ? "border-l-emerald-500" : "border-l-rose-500")}>
          <CardContent className="p-3 sm:p-4">
            <p className="text-[11px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Under / Over</p>
            <p className={cn("text-lg sm:text-xl font-bold font-display tabular-nums mt-1", totalExpenseRemaining < 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground")}>{formatCurrency(Math.abs(totalExpenseRemaining))}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{totalExpenseRemaining < 0 ? 'over budget' : 'under budget'}</p>
          </CardContent>
        </Card>
      </div>

      {viewTab === 'budget' ? (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* Main budget table */}
        <div className="space-y-2">
          {/* Column headers + Expand/Collapse All */}
          <div className="hidden sm:flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => {
                      const allKeys = getAllSectionKeys();
                      const allOpen = allKeys.every(k => openSections[k] !== false);
                      const newState: Record<string, boolean> = {};
                      allKeys.forEach(k => { newState[k] = !allOpen; });
                      setOpenSections(prev => ({ ...prev, ...newState }));
                    }}
                  >
                    {(() => {
                      const allKeys = getAllSectionKeys();
                      const allOpen = allKeys.every(k => openSections[k] !== false);
                      return allOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
                    })()}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{(() => {
                    const allKeys = getAllSectionKeys();
                    return allKeys.every(k => openSections[k] !== false) ? 'Collapse all groups' : 'Expand all groups';
                  })()}</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="flex-1" />
            <span className="w-[200px]" />
            <span className="w-[90px] text-right">Budget</span>
            <span className="w-[90px] text-right">Actual</span>
            <span className="w-[90px] text-right">Remaining</span>
            <div className="w-[62px]" />
          </div>

          {budgetType === 'all' ? (
            <>
              {/* PERSONAL SECTION */}
              {personalBudgetItems.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-3 pt-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Personal</span>
                    <div className="flex-1 h-px bg-emerald-500/20" />
                  </div>
                  <Card className="overflow-hidden">
                    <CardContent className="p-2">
                      {renderSection('income', personalGroupedBudgets.income)}
                    </CardContent>
                  </Card>
                  {personalGroupedBudgets.payroll_deduction.length > 0 && (
                    <Card className="overflow-hidden">
                      <CardContent className="p-2">
                        {renderSection('payroll_deduction', personalGroupedBudgets.payroll_deduction)}
                      </CardContent>
                    </Card>
                  )}
                  <Card className="overflow-hidden">
                    <CardContent className="p-2 space-y-1">
                      <div className="sm:hidden px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">Expenses</div>
                      {renderSection('fixed', personalGroupedBudgets.fixed)}
                      {renderSection('flexible', personalGroupedBudgets.flexible)}
                      {renderSection('non_monthly', personalGroupedBudgets.non_monthly)}
                    </CardContent>
                  </Card>
                  {/* Personal subtotals */}
                  <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-emerald-500/5 rounded-lg text-sm">
                    <span className="flex-1 font-medium text-emerald-600 dark:text-emerald-400">Personal Subtotal</span>
                    <span className="text-right tabular-nums sm:w-[90px] font-medium">
                      {formatCurrency(personalSectionTotals.income.budget - (personalSectionTotals.fixed.budget + personalSectionTotals.flexible.budget + personalSectionTotals.non_monthly.budget))}
                    </span>
                  </div>
                </>
              )}

              {/* BUSINESS SECTIONS — one per entity */}
              {perBusinessData.length > 0 && perBusinessData.map((biz, idx) => {
                const bizIncomeBudget = biz.totals.income.budget;
                const bizExpenseBudget = biz.totals.fixed.budget + biz.totals.flexible.budget + biz.totals.non_monthly.budget;
                const bizNet = bizIncomeBudget - bizExpenseBudget;
                const bizKey = biz.name.replace(/\s+/g, '_');

                return (
                  <div key={biz.id} className={cn(idx === 0 && 'pt-4')}>
                    <div className="flex items-center gap-2 px-3 pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">{biz.name}</span>
                      <div className="flex-1 h-px bg-primary/20" />
                      <span className={cn('text-xs font-semibold tabular-nums', bizNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        Net: {formatCurrency(Math.abs(bizNet))} {bizNet < 0 ? 'loss' : 'profit'}
                      </span>
                    </div>
                    <Card className="overflow-hidden">
                      <CardContent className="p-2">
                        {renderSection('income', biz.grouped.income, biz.totals.income, `all_${bizKey}_income`)}
                      </CardContent>
                    </Card>
                    <Card className="overflow-hidden mt-2">
                      <CardContent className="p-2 space-y-1">
                        <div className="sm:hidden px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">Expenses</div>
                        {renderSection('fixed', biz.grouped.fixed, biz.totals.fixed, `all_${bizKey}_fixed`)}
                        {renderSection('flexible', biz.grouped.flexible, biz.totals.flexible, `all_${bizKey}_flexible`)}
                        {renderSection('non_monthly', biz.grouped.non_monthly, biz.totals.non_monthly, `all_${bizKey}_non_monthly`)}
                      </CardContent>
                    </Card>
                    <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-primary/5 rounded-lg text-sm mt-2 mb-4">
                      <span className="flex-1 font-medium text-primary">{biz.name} Subtotal</span>
                      <span className="text-right tabular-nums sm:w-[90px] font-medium">
                        {formatCurrency(bizNet)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Combined Totals */}
              <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-muted/30 rounded-lg font-semibold text-sm sm:text-base border-t-2 border-muted mt-2">
                <span className="flex-1 font-display">Combined Total</span>
                <span className="text-right tabular-nums sm:w-[90px]">{formatCurrency(totalIncomeBudget)}</span>
                <span className="hidden sm:inline-block w-[90px] text-right tabular-nums text-muted-foreground">{formatCurrency(totalIncomeActual)}</span>
                <span className={cn('text-right tabular-nums sm:w-[90px]', totalIncomeRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                  {formatCurrency(Math.abs(totalIncomeRemaining))}
                </span>
                <div className="hidden sm:block w-[62px]" />
              </div>
            </>
          ) : budgetType === 'business' && perBusinessData.length > 0 ? (
            <>
              {(selectedBusiness === 'all' ? perBusinessData : perBusinessData.filter(b => b.id === selectedBusiness)).map((biz, idx) => {
                const bizIncomeBudget = biz.totals.income.budget;
                const bizIncomeActual = biz.totals.income.actual;
                const bizExpenseBudget = biz.totals.fixed.budget + biz.totals.flexible.budget + biz.totals.non_monthly.budget;
                const bizExpenseActual = biz.totals.fixed.actual + biz.totals.flexible.actual + biz.totals.non_monthly.actual;
                const bizNet = bizIncomeBudget - bizExpenseBudget;
                const bizKey = biz.name.replace(/\s+/g, '_');

                return (
                  <div key={biz.name} className={cn(idx > 0 && 'mt-6')}>
                    {/* Business Header */}
                    <div className="flex items-center gap-2 px-3 pb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-primary">{biz.name}</span>
                      <div className="flex-1 h-px bg-primary/20" />
                      <span className={cn('text-xs font-semibold tabular-nums', bizNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        Net: {formatCurrency(Math.abs(bizNet))} {bizNet < 0 ? 'loss' : 'profit'}
                      </span>
                    </div>

                    {/* Income */}
                    <Card className="overflow-hidden">
                      <CardContent className="p-2">
                        {renderSection('income', biz.grouped.income, biz.totals.income, `${bizKey}_income`)}
                      </CardContent>
                    </Card>

                    {/* Expenses */}
                    <Card className="overflow-hidden mt-2">
                      <CardContent className="p-2 space-y-1">
                        <div className="sm:hidden px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">Expenses</div>
                        {renderSection('fixed', biz.grouped.fixed, biz.totals.fixed, `${bizKey}_fixed`)}
                        {renderSection('flexible', biz.grouped.flexible, biz.totals.flexible, `${bizKey}_flexible`)}
                        {renderSection('non_monthly', biz.grouped.non_monthly, biz.totals.non_monthly, `${bizKey}_non_monthly`)}
                      </CardContent>
                    </Card>

                    {/* Business Subtotal */}
                    <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-primary/5 rounded-lg text-sm mt-2">
                      <span className="flex-1 font-medium text-primary">{biz.name} Subtotal</span>
                      <span className="text-right tabular-nums sm:w-[90px] font-semibold">
                        {formatCurrency(bizIncomeBudget)} income
                      </span>
                      <span className="text-right tabular-nums sm:w-[90px] text-muted-foreground">
                        {formatCurrency(bizExpenseBudget)} expense
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Combined Business Totals */}
              {perBusinessData.length > 1 && (
                <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-3 bg-muted/30 rounded-lg font-semibold text-sm sm:text-base border-t-2 border-muted mt-4">
                  <span className="flex-1 font-display">All Businesses Total</span>
                  <span className="text-right tabular-nums sm:w-[90px]">{formatCurrency(totalIncomeBudget)}</span>
                  <span className="hidden sm:inline-block w-[90px] text-right tabular-nums text-muted-foreground">{formatCurrency(totalIncomeActual)}</span>
                  <span className={cn('text-right tabular-nums sm:w-[90px]', totalIncomeRemaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                    {formatCurrency(Math.abs(totalIncomeRemaining))}
                  </span>
                  <div className="hidden sm:block w-[62px]" />
                </div>
              )}
            </>
          ) : (
            <>
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

              {/* Payroll & Pre-Tax Deductions Section */}
              {groupedBudgets.payroll_deduction.length > 0 && (
                <>
                  <Card className="overflow-hidden">
                    <CardContent className="p-2">
                      {renderSection('payroll_deduction', groupedBudgets.payroll_deduction)}
                    </CardContent>
                  </Card>
                  {/* Gross → Net breakdown */}
                  <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 bg-sky-500/5 rounded-lg text-xs sm:text-sm">
                    <span className="flex-1 font-medium text-sky-600 dark:text-sky-400">Gross → Net Income</span>
                    <span className="tabular-nums text-muted-foreground">{formatCurrency(grossIncomeBudget)} gross</span>
                    <span className="tabular-nums text-muted-foreground">− {formatCurrency(sectionTotals.payroll_deduction.budget)} deductions</span>
                    <span className="tabular-nums font-semibold">= {formatCurrency(totalIncomeBudget)} net</span>
                  </div>
                </>
              )}

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
            </>
          )}

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
                          <Button variant="ghost" size="sm" className="h-7 text-xs sm:opacity-0 sm:group-hover:opacity-100" onClick={() => { const grp = (categoryGroups as any[])?.find((g: any) => g.id === c.group_id); const et = (grp?.expense_type || 'flexible') as 'fixed' | 'flexible' | 'non_monthly'; setForm({ category_id: c.id, planned_amount: '', rollover: false, budgetKind: 'expense', group_id: c.group_id, expense_type: et }); setEditingBudget(null); setDialogOpen(true); }}>
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
          <Card className={cn('border-2', unallocated < 0 ? 'border-rose-500/30 bg-rose-500/5' : unallocated === 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-primary/20')}>
            <CardContent className="p-5 text-center">
              <p className={cn('text-3xl font-bold font-display', unallocated < 0 ? 'text-rose-600 dark:text-rose-400' : unallocated === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-primary')}>
                {unallocated < 0 ? '-' : ''}{formatCurrency(Math.abs(unallocated))}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {unallocated === 0 ? '✅ Every dollar assigned' : unallocated > 0 ? 'Left to assign' : 'Over-allocated'}
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
              {/* Payroll deductions in summary */}
              {sectionTotals.payroll_deduction.budget > 0 && (
                <div>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Pre-Tax Deductions</span>
                    <span className="font-semibold">{formatCurrency(sectionTotals.payroll_deduction.budget)} budget</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${sectionTotals.payroll_deduction.budget > 0 ? Math.min((sectionTotals.payroll_deduction.actual / sectionTotals.payroll_deduction.budget) * 100, 100) : 0}%` }} />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>{formatCurrency(sectionTotals.payroll_deduction.actual)} deducted</span>
                    <span>{formatCurrency(sectionTotals.payroll_deduction.remaining)} remaining</span>
                  </div>
                  <div className="text-[10px] text-sky-600 dark:text-sky-400 mt-1">
                    {grossIncomeBudget > 0 ? `${Math.round((sectionTotals.payroll_deduction.budget / grossIncomeBudget) * 100)}% of gross income` : ''}
                  </div>
                </div>
              )}
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

      {/* ============ PRINT-ONLY: Charts & Narrative ============ */}
      <div className="hidden print:block print-budget-charts break-before-page">
        <h2 className="font-display text-lg font-bold mb-4 border-b pb-2">Budget Overview — {formatMonth(month)}</h2>

        {/* Two charts side by side */}
        <div className="print-chart-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
          {/* Pie Chart — Expense Allocation */}
          <div style={{ flex: 1 }}>
            <h3 className="text-sm font-semibold mb-2 text-center">Expense Allocation</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Fixed', value: sectionTotals.fixed.budget, color: '#3b82f6' },
                    { name: 'Flexible', value: sectionTotals.flexible.budget, color: '#f59e0b' },
                    { name: 'Non-Monthly', value: sectionTotals.non_monthly.budget, color: '#a855f7' },
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {[
                    { color: '#3b82f6' },
                    { color: '#f59e0b' },
                    { color: '#a855f7' },
                  ].filter((_, i) => [sectionTotals.fixed.budget, sectionTotals.flexible.budget, sectionTotals.non_monthly.budget][i] > 0)
                   .map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Bar Chart — Budget vs Actual */}
          <div style={{ flex: 1 }}>
            <h3 className="text-sm font-semibold mb-2 text-center">Budget vs Actual</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={[
                { name: 'Income', budget: totalIncomeBudget, actual: totalIncomeActual },
                { name: 'Fixed', budget: sectionTotals.fixed.budget, actual: sectionTotals.fixed.actual },
                { name: 'Flexible', budget: sectionTotals.flexible.budget, actual: sectionTotals.flexible.actual },
                { name: 'Non-Monthly', budget: sectionTotals.non_monthly.budget, actual: sectionTotals.non_monthly.actual },
              ]} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                <Bar dataKey="budget" fill="#3b82f6" name="Budget" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" fill="#10b981" name="Actual" radius={[3, 3, 0, 0]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Narrative Summary */}
        <div className="border rounded-lg p-4 bg-white" style={{ fontSize: '11px', lineHeight: '1.6' }}>
          <h3 className="text-sm font-semibold mb-2">Budget Narrative</h3>
          <p>
            For <strong>{formatMonth(month)}</strong>, total budgeted income is <strong>{formatCurrency(totalIncomeBudget)}</strong> with{' '}
            <strong>{formatCurrency(totalIncomeActual)}</strong> received so far ({totalIncomeBudget > 0 ? Math.round((totalIncomeActual / totalIncomeBudget) * 100) : 0}%).
          </p>
          <p className="mt-1">
            Total expense budget is <strong>{formatCurrency(totalExpenseBudget)}</strong>, of which <strong>{formatCurrency(totalExpenseActual)}</strong> has been spent.
            {totalExpenseRemaining >= 0
              ? ` You are ${formatCurrency(totalExpenseRemaining)} under budget.`
              : ` You are ${formatCurrency(Math.abs(totalExpenseRemaining))} over budget.`}
          </p>
          <p className="mt-1">
            <strong>Fixed expenses:</strong> {formatCurrency(sectionTotals.fixed.actual)} of {formatCurrency(sectionTotals.fixed.budget)} budgeted
            ({sectionTotals.fixed.remaining < 0 ? `${formatCurrency(Math.abs(sectionTotals.fixed.remaining))} over` : `${formatCurrency(sectionTotals.fixed.remaining)} remaining`}).{' '}
            <strong>Flexible:</strong> {formatCurrency(sectionTotals.flexible.actual)} of {formatCurrency(sectionTotals.flexible.budget)}
            ({sectionTotals.flexible.remaining < 0 ? `${formatCurrency(Math.abs(sectionTotals.flexible.remaining))} over` : `${formatCurrency(sectionTotals.flexible.remaining)} remaining`}).{' '}
            <strong>Non-Monthly:</strong> {formatCurrency(sectionTotals.non_monthly.actual)} of {formatCurrency(sectionTotals.non_monthly.budget)}
            ({sectionTotals.non_monthly.remaining < 0 ? `${formatCurrency(Math.abs(sectionTotals.non_monthly.remaining))} over` : `${formatCurrency(sectionTotals.non_monthly.remaining)} remaining`}).
          </p>
          {unallocated !== 0 && (
            <p className="mt-1">
              {unallocated > 0
                ? `There is ${formatCurrency(unallocated)} of income not yet allocated to expense categories.`
                : `Expenses exceed income by ${formatCurrency(Math.abs(unallocated))} — the budget is over-allocated.`}
            </p>
          )}
          {unallocated === 0 && <p className="mt-1">✅ Every dollar of income is assigned to a budget category.</p>}
          {momNarrative && (
            <>
              <p className="mt-1">
                <strong>📊 Month-over-Month:</strong> Spending is{' '}
                <strong style={{ color: momNarrative.expChange > 0 ? '#dc2626' : '#059669' }}>
                  {momNarrative.expChange > 0 ? 'up' : 'down'} {Math.abs(momNarrative.expPct)}%
                </strong>{' '}
                ({formatCurrency(Math.abs(momNarrative.expChange))} {momNarrative.expChange > 0 ? 'more' : 'less'}) vs last month.
                {momNarrative.incPct !== 0 && (
                  <> Income is <strong style={{ color: momNarrative.incChange > 0 ? '#059669' : '#dc2626' }}>
                    {momNarrative.incChange > 0 ? 'up' : 'down'} {Math.abs(momNarrative.incPct)}%
                  </strong>.</>
                )}
              </p>
              {momNarrative.topIncreases.length > 0 && (
                <p className="mt-1">
                  <strong>Biggest increases:</strong>{' '}
                  {momNarrative.topIncreases.map((c, i) => (
                    <span key={c.name}>{i > 0 ? ', ' : ''}<strong>{c.name}</strong> (+{formatCurrency(c.change)})</span>
                  ))}.
                </p>
              )}
              {momNarrative.topDecreases.length > 0 && (
                <p className="mt-1">
                  <strong>Improved:</strong>{' '}
                  {momNarrative.topDecreases.map((c, i) => (
                    <span key={c.name}>{i > 0 ? ', ' : ''}<strong>{c.name}</strong> ({formatCurrency(c.change)})</span>
                  ))}.
                </p>
              )}
            </>
          )}
        </div>
      </div>

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
                <Tabs value={form.budgetKind} onValueChange={(v) => setForm(f => ({ ...f, budgetKind: v as 'income' | 'expense' | 'equity', group_id: '', category_id: '' }))}>
                  <TabsList className="w-full">
                    <TabsTrigger value="income" className="flex-1 gap-1.5">
                      <TrendingUp className="h-3.5 w-3.5" /> Income
                    </TabsTrigger>
                    <TabsTrigger value="expense" className="flex-1 gap-1.5">
                      <PiggyBank className="h-3.5 w-3.5" /> Expense
                    </TabsTrigger>
                    <TabsTrigger value="equity" className="flex-1 gap-1.5">
                      <Scale className="h-3.5 w-3.5" /> Equity
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            )}

            {/* Expense Type Dropdown (Fixed / Flexible / Non-Monthly) */}
            {!editingBudget && form.budgetKind === 'expense' && (
              <div className="space-y-2">
                <Label>Expense Type</Label>
                <Select value={form.expense_type} onValueChange={v => setForm(f => ({ ...f, expense_type: v as 'fixed' | 'flexible' | 'non_monthly' | 'payroll_deduction', group_id: '', category_id: '' }))}>
                  <SelectTrigger><SelectValue placeholder="Select expense type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payroll_deduction">Payroll & Pre-Tax Deductions</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="flexible">Flexible</SelectItem>
                    <SelectItem value="non_monthly">Non-Monthly</SelectItem>
                  </SelectContent>
                </Select>
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
                        const gExpType = g.expense_type || 'flexible';
                        if (form.budgetKind === 'income') {
                          if (gExpType !== 'income') return false;
                        } else if (form.budgetKind === 'equity') {
                          if (gExpType !== 'equity') return false;
                        } else {
                          if (gExpType !== form.expense_type) return false;
                        }
                        // Filter by current budget type tab (personal/business/all)
                        if (budgetType !== 'all') {
                          const gBudgetType = g.budget_type || 'personal';
                          if (gBudgetType !== budgetType) return false;
                        }
                        // Filter by selected business when on business tab
                        if (budgetType === 'business' && selectedBusiness !== 'all') {
                          if (g.business_profile_id !== selectedBusiness) return false;
                        }
                        return true;
                      })
                      .map((g: any) => {
                        const bizName = g.business_profile_id
                          ? businessList.find((b: any) => b.id === g.business_profile_id)?.name
                          : null;
                        return (
                          <SelectItem key={g.id} value={g.id}>
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: g.color }} />
                              {g.name}
                              {bizName && budgetType === 'all' && (
                                <span className="text-xs text-muted-foreground">({bizName})</span>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
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
                    {(() => {
                      const budgetedIds = new Set(budgetItems.map(b => b.category_id));
                      const available = (categories || []).filter(c => {
                        if (budgetedIds.has(c.id)) return false;
                        if (form.group_id && c.group_id !== form.group_id) return false;
                        return true;
                      });
                      return available.length > 0 ? available.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      )) : (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                          {form.group_id ? 'All categories in this group are budgeted' : 'Select a group first'}
                        </div>
                      );
                    })()}
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
                setForm({ category_id: newCat.id, planned_amount: '', rollover: false, budgetKind: 'expense', group_id: quickAddForm.group_id, expense_type: 'flexible' });
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

      {/* AI Budget Audit Dialog */}
      <Dialog open={auditOpen} onOpenChange={setAuditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ClipboardCheck className="h-5 w-5 text-primary" /> AI Budget Audit
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {auditLoading && !auditResult && (
                <div className="flex items-center gap-3 py-8 justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Analyzing your budget...</span>
                </div>
              )}
              {auditResult && <ReactMarkdown>{auditResult}</ReactMarkdown>}
              {auditLoading && auditResult && (
                <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      {/* Batch Actions Floating Bar */}
      <AnimatePresence>
        {selectedBudgetIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="flex items-center gap-2 rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl px-4 py-3">
              <span className="text-sm font-semibold tabular-nums">{selectedBudgetIds.size} selected</span>
              <div className="h-6 w-px bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleBatchHide}>
                    <EyeOff className="h-4 w-4" />
                    <span className="hidden sm:inline">Hide</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Hide selected budgets</p></TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleBatchDelete}>
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Delete selected budgets</p></TooltipContent>
              </Tooltip>
              <div className="h-6 w-px bg-border mx-1" />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedBudgetIds(new Set())}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
    </TooltipProvider>

    <PaystubUploader open={paystubOpen} onOpenChange={setPaystubOpen} />
    <BillScanner
      open={billScanOpen}
      onOpenChange={setBillScanOpen}
      categories={(categories || []).map(c => ({ id: c.id, name: c.name }))}
      onResult={(bill) => {
        const matchedCat = (categories || []).find(c => c.name.toLowerCase() === bill.category.toLowerCase());
        if (matchedCat) {
          setForm({ category_id: matchedCat.id, planned_amount: String(bill.amount), rollover: false, budgetKind: 'expense', group_id: matchedCat.group_id, expense_type: 'fixed' });
          setEditingBudget(null);
          setDialogOpen(true);
        } else {
          toast.info(`Scanned: ${bill.merchant} — ${bill.amount}. Create a matching category first.`);
        }
      }}
    />
    </>
  );
};

export default Budgets;
