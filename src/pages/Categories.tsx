import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useCategoryGroups, useCategories,
  useCreateCategoryGroup, useUpdateCategoryGroup, useDeleteCategoryGroup,
  useCreateCategory, useUpdateCategory, useDeleteCategory,
  useSubcategories, useCreateSubcategory, useUpdateSubcategory, useDeleteSubcategory,
} from '@/hooks/use-finance-data';
import { useBusinessProfiles } from '@/hooks/use-business-data';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, GripVertical, ChevronDown, ChevronRight, FolderOpen, Building2, AlertTriangle, Merge, Layers, BookOpen, Info } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import PageOverview from '@/components/PageOverview';

const PRESET_COLORS = [
  '#7c3aed', '#2563eb', '#0891b2', '#059669', '#65a30d',
  '#ca8a04', '#ea580c', '#dc2626', '#db2777', '#7c5cf5',
  '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#6366f1',
];

const ColorPicker = ({ value, onChange }: { value: string; onChange: (c: string) => void }) => (
  <div className="flex flex-wrap gap-2">
    {PRESET_COLORS.map(c => (
      <button
        key={c}
        type="button"
        onClick={() => onChange(c)}
        className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${value === c ? 'border-foreground scale-110' : 'border-transparent'}`}
        style={{ backgroundColor: c }}
      />
    ))}
    <div className="relative">
      <input
        type="color"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="absolute inset-0 h-7 w-7 cursor-pointer opacity-0"
      />
      <div className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground text-xs text-muted-foreground">
        +
      </div>
    </div>
  </div>
);

const Categories = () => {
  const { data: groups, isLoading: groupsLoading } = useCategoryGroups();
  const { data: categories, isLoading: catsLoading } = useCategories();
  const { data: subcategories, isLoading: subsLoading } = useSubcategories();
  const { data: businessProfiles } = useBusinessProfiles();

  const createGroup = useCreateCategoryGroup();
  const updateGroup = useUpdateCategoryGroup();
  const deleteGroup = useDeleteCategoryGroup();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const createSubcategory = useCreateSubcategory();
  const updateSubcategory = useUpdateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();

  const [activeTab, setActiveTab] = useState<string>('personal');

  // Dialog state
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [subDialogOpen, setSubDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<{ id: string; name: string; color: string; budget_type?: string; business_profile_id?: string | null; expense_type?: string } | null>(null);
  const [editingCat, setEditingCat] = useState<{ id: string; name: string; color: string; group_id: string } | null>(null);
  const [editingSub, setEditingSub] = useState<{ id: string; name: string; color: string; category_id: string } | null>(null);
  const [groupForm, setGroupForm] = useState({ name: '', color: '#7c3aed', budget_type: 'personal', business_profile_id: '' as string, expense_type: 'flexible' });
  const [catForm, setCatForm] = useState({ name: '', color: '#7c5cf5', group_id: '' });
  const [subForm, setSubForm] = useState({ name: '', color: '#7c5cf5', category_id: '' });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'group' | 'category' | 'subcategory'; id: string; name: string } | null>(null);

  const qc = useQueryClient();
  const [mergingDupes, setMergingDupes] = useState(false);

  // Detect duplicate categories
  const duplicateGroups = useMemo(() => {
    if (!categories) return [];
    const map = new Map<string, typeof categories>();
    for (const c of categories) {
      const key = c.name.toLowerCase().trim();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return Array.from(map.values()).filter(group => group.length > 1);
  }, [categories]);

  const mergeAllDuplicates = async () => {
    if (duplicateGroups.length === 0) return;
    setMergingDupes(true);
    try {
      let mergedCount = 0;
      for (const dupeGroup of duplicateGroups) {
        const [keep, ...remove] = dupeGroup;
        for (const dup of remove) {
          await supabase.from('transactions').update({ category_id: keep.id }).eq('category_id', dup.id);
          await supabase.from('budgets').update({ category_id: keep.id }).eq('category_id', dup.id);
          await supabase.from('categorization_rules').update({ category_id: keep.id }).eq('category_id', dup.id);
          await supabase.from('categories').delete().eq('id', dup.id);
          mergedCount++;
        }
      }
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['budgets'] });
      toast.success(`Merged ${mergedCount} duplicate categories`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to merge duplicates');
    } finally {
      setMergingDupes(false);
    }
  };

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  const toggleCollapse = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCatExpand = (id: string) => {
    setExpandedCats(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filter groups by tab
  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    return groups.filter(g => (g as any).budget_type === activeTab || (!((g as any).budget_type) && activeTab === 'personal'));
  }, [groups, activeTab]);

  // Group dialog
  const openCreateGroup = () => {
    setEditingGroup(null);
    setGroupForm({ name: '', color: '#7c3aed', budget_type: activeTab, business_profile_id: '', expense_type: 'flexible' });
    setGroupDialogOpen(true);
  };
  const openEditGroup = (g: { id: string; name: string; color: string; budget_type?: string; business_profile_id?: string | null; expense_type?: string }) => {
    setEditingGroup(g);
    setGroupForm({ name: g.name, color: g.color, budget_type: g.budget_type || 'personal', business_profile_id: g.business_profile_id || '', expense_type: g.expense_type || 'flexible' });
    setGroupDialogOpen(true);
  };
  const handleSaveGroup = async () => {
    if (!groupForm.name.trim()) return;
    const bpId = groupForm.budget_type === 'business' && groupForm.business_profile_id ? groupForm.business_profile_id : null;
    if (editingGroup) {
      await updateGroup.mutateAsync({ id: editingGroup.id, name: groupForm.name.trim(), color: groupForm.color, budget_type: groupForm.budget_type, business_profile_id: bpId, expense_type: groupForm.expense_type });
    } else {
      await createGroup.mutateAsync({ name: groupForm.name.trim(), color: groupForm.color, sort_order: (groups?.length || 0), budget_type: groupForm.budget_type, business_profile_id: bpId, expense_type: groupForm.expense_type });
    }
    setGroupDialogOpen(false);
  };

  // Category dialog
  const openCreateCat = (groupId: string) => {
    setEditingCat(null);
    setCatForm({ name: '', color: '#7c5cf5', group_id: groupId });
    setCatDialogOpen(true);
  };
  const openEditCat = (c: { id: string; name: string; color: string; group_id: string }) => {
    setEditingCat(c);
    setCatForm({ name: c.name, color: c.color, group_id: c.group_id });
    setCatDialogOpen(true);
  };
  const handleSaveCat = async () => {
    if (!catForm.name.trim() || !catForm.group_id) return;
    if (editingCat) {
      await updateCategory.mutateAsync({ id: editingCat.id, name: catForm.name.trim(), color: catForm.color, group_id: catForm.group_id });
    } else {
      const groupCats = (categories || []).filter(c => c.group_id === catForm.group_id);
      await createCategory.mutateAsync({ name: catForm.name.trim(), color: catForm.color, group_id: catForm.group_id, sort_order: groupCats.length });
    }
    setCatDialogOpen(false);
  };

  // Subcategory dialog
  const openCreateSub = (categoryId: string) => {
    setEditingSub(null);
    setSubForm({ name: '', color: '#7c5cf5', category_id: categoryId });
    setSubDialogOpen(true);
  };
  const openEditSub = (s: { id: string; name: string; color: string; category_id: string }) => {
    setEditingSub(s);
    setSubForm({ name: s.name, color: s.color, category_id: s.category_id });
    setSubDialogOpen(true);
  };
  const handleSaveSub = async () => {
    if (!subForm.name.trim() || !subForm.category_id) return;
    if (editingSub) {
      await updateSubcategory.mutateAsync({ id: editingSub.id, name: subForm.name.trim(), color: subForm.color, category_id: subForm.category_id });
    } else {
      const catSubs = (subcategories || []).filter(s => s.category_id === subForm.category_id);
      await createSubcategory.mutateAsync({ name: subForm.name.trim(), color: subForm.color, category_id: subForm.category_id, sort_order: catSubs.length });
    }
    setSubDialogOpen(false);
  };

  // Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'group') {
      await deleteGroup.mutateAsync(deleteTarget.id);
    } else if (deleteTarget.type === 'category') {
      await deleteCategory.mutateAsync(deleteTarget.id);
    } else {
      await deleteSubcategory.mutateAsync(deleteTarget.id);
    }
    setDeleteTarget(null);
  };

  // Move group up/down
  const moveGroup = async (idx: number, dir: -1 | 1) => {
    if (!filteredGroups) return;
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= filteredGroups.length) return;
    await Promise.all([
      updateGroup.mutateAsync({ id: filteredGroups[idx].id, sort_order: swapIdx }),
      updateGroup.mutateAsync({ id: filteredGroups[swapIdx].id, sort_order: idx }),
    ]);
  };

  // Move category up/down within group
  const moveCat = async (groupCats: any[], idx: number, dir: -1 | 1) => {
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= groupCats.length) return;
    await Promise.all([
      updateCategory.mutateAsync({ id: groupCats[idx].id, sort_order: swapIdx }),
      updateCategory.mutateAsync({ id: groupCats[swapIdx].id, sort_order: idx }),
    ]);
  };

  if (groupsLoading || catsLoading || subsLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const personalCount = (groups || []).filter(g => (g as any).budget_type === 'personal' || !(g as any).budget_type).length;
  const businessCount = (groups || []).filter(g => (g as any).budget_type === 'business').length;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold prism-gradient-text">Categories</h1>
          <p className="text-muted-foreground">Organize your transactions with groups, categories & subcategories.</p>
        </div>
        <PageOverview
          title="Categories Overview"
          description="Create category groups and categories to classify spending and income. Assign colors and expense types for budgeting."
          icon={FolderOpen}
          iconColor="text-prism-lime"
          ttsScript="The Categories page lets you organize all your transactions. Categories are arranged in groups like Housing, Food, Transportation, and Income. Each group contains individual categories and subcategories."
          features={[
            'Organize categories into groups',
            'Add subcategories for granular tracking',
            'Color-code for visual identification',
            'Set expense types (fixed, flexible, discretionary)',
            'Link groups to business profiles',
            'Separate Personal and Business views',
          ]}
          demoData={[
            { label: 'Housing', value: '3 categories', badge: 'Fixed', color: '#3b82f6' },
            { label: 'Food & Dining', value: '4 categories', badge: 'Flexible', color: '#22c55e' },
            { label: 'Transportation', value: '2 categories', badge: 'Flexible', color: '#f59e0b' },
            { label: 'Income', value: '3 categories', badge: 'Income', color: '#8b5cf6' },
          ]}
        />
        <Button className="gap-2 prism-gradient text-primary-foreground hover:opacity-90" onClick={openCreateGroup}>
          <Plus className="h-4 w-4" /> Add Group
        </Button>
      </div>

      {/* Duplicate categories banner */}
      {duplicateGroups.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/20 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {duplicateGroups.length} duplicate category name{duplicateGroups.length > 1 ? 's' : ''} found
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {duplicateGroups.map(g => `"${g[0].name}" (${g.length}×)`).join(', ')}. Merging will reassign all transactions to one and delete extras.
            </p>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5 shrink-0 border-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/30" disabled={mergingDupes}>
                {mergingDupes ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Merge className="h-3.5 w-3.5" />}
                Merge all duplicates
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Merge {duplicateGroups.reduce((s, g) => s + g.length - 1, 0)} duplicate categories?</AlertDialogTitle>
                <AlertDialogDescription>
                  For each duplicate name, the oldest category will be kept and all transactions, budgets, and rules will be reassigned to it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={mergeAllDuplicates}>Merge duplicates</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </motion.div>
      )}

      {/* Chart of Accounts Guide */}
      <Collapsible>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors rounded-xl">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-prism-navy to-prism-teal flex items-center justify-center shrink-0">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-sm">📘 Chart of Accounts Guide</h3>
                <p className="text-xs text-muted-foreground">Learn how to set up the 5 major account categories for each business entity</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform [[data-state=open]_&]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0 pb-5 space-y-6">
              {/* Section 1: Five Major Categories */}
              <div>
                <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">1</span>
                  The Five Major Account Categories
                </h4>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/50">
                        <th className="p-2.5 text-left font-semibold">Category</th>
                        <th className="p-2.5 text-left font-semibold">Description</th>
                        <th className="p-2.5 text-left font-semibold">Examples</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      <tr><td className="p-2.5 font-medium">Assets</td><td className="p-2.5 text-muted-foreground">What the business owns</td><td className="p-2.5 text-muted-foreground">Bank accounts, accounts receivable, equipment, inventory</td></tr>
                      <tr><td className="p-2.5 font-medium">Liabilities</td><td className="p-2.5 text-muted-foreground">What the business owes</td><td className="p-2.5 text-muted-foreground">Business credit cards, loans, sales tax owed</td></tr>
                      <tr><td className="p-2.5 font-medium">Equity</td><td className="p-2.5 text-muted-foreground">Net value (Assets − Liabilities)</td><td className="p-2.5 text-muted-foreground">Owner's Contributions, Owner's Draws, Retained Earnings</td></tr>
                      <tr><td className="p-2.5 font-medium">Income/Revenue</td><td className="p-2.5 text-muted-foreground">Money earned from sales</td><td className="p-2.5 text-muted-foreground">Service fees, product sales, interest earned</td></tr>
                      <tr><td className="p-2.5 font-medium">Expenses</td><td className="p-2.5 text-muted-foreground">Costs to run the business</td><td className="p-2.5 text-muted-foreground">Rent, marketing, travel, meals, software</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Section 2: Multi-Business Allocation */}
              <div>
                <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">2</span>
                  Multi-Business Allocation
                </h4>
                <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
                  <p>If you run multiple businesses, <strong className="text-foreground">do not mix them</strong> in one Chart of Accounts. Keep a separate set of books for each entity to avoid "commingling" and simplify tax filing (Schedule C or Form 1120-S).</p>
                  <div className="rounded-lg bg-muted/40 p-3 border border-border/30">
                    <p className="font-semibold text-foreground mb-1">💰 How to handle "Salary Injections":</p>
                    <ul className="space-y-1 ml-4 list-disc">
                      <li><strong className="text-foreground">Asset Account:</strong> Business Checking (goes up)</li>
                      <li><strong className="text-foreground">Equity Account:</strong> "Owner Contribution" (goes up)</li>
                    </ul>
                  </div>
                  <div className="rounded-lg bg-accent/10 p-3 border border-accent/20">
                    <p className="font-semibold text-accent mb-1">💡 Pro Tip:</p>
                    <p>Don't use just one "Equity" account. Create sub-accounts: <strong className="text-foreground">Owner Contribution</strong> (money in) and <strong className="text-foreground">Owner Draw</strong> (money out for personal use).</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Shared Expenses */}
              <div>
                <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">3</span>
                  Shared Expense Accounts
                </h4>
                <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                  <p>If you have expenses that serve both businesses (e.g., a laptop used for both), don't guess:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div className="rounded-lg bg-muted/40 p-3 border border-border/30">
                      <p className="font-semibold text-foreground mb-1">Option A: Primary User</p>
                      <p>Pay from the business that uses it most.</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 border border-border/30">
                      <p className="font-semibold text-foreground mb-1">Option B: Intercompany</p>
                      <p>Business A buys it; Business B reimburses 50%. Shows as "Reduction of Expense" in A's books.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 4: Essential Expense Sub-Categories */}
              <div>
                <h4 className="font-display font-bold text-sm mb-2 flex items-center gap-2">
                  <span className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">4</span>
                  Essential Expense Sub-Categories (Tax Deductions)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { name: 'Professional Services', desc: 'Legal, CPA, or bookkeeping fees' },
                    { name: 'Dues & Subscriptions', desc: 'Software like Zoom, Canva, industry journals' },
                    { name: 'Travel', desc: 'Airfare, hotels, 100% of business transport' },
                    { name: 'Meals', desc: 'Business meetings (usually 50% deductible)' },
                    { name: 'Home Office', desc: 'Dedicated space utilities & insurance' },
                  ].map(item => (
                    <div key={item.name} className="flex items-start gap-2 rounded-lg bg-muted/30 p-2.5 border border-border/20">
                      <FolderOpen className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-foreground">{item.name}</p>
                        <p className="text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary Checklist */}
              <div className="rounded-xl bg-gradient-to-br from-prism-navy/10 to-prism-teal/10 p-4 border border-primary/20">
                <h4 className="font-display font-bold text-sm mb-2">✅ Setup Checklist</h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Separate Bank Accounts:</strong> One for Personal, Business A, and Business B</li>
                  <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Equity Accounts:</strong> Create "Owner Contribution" in each business ledger</li>
                  <li className="flex items-start gap-2"><span className="text-accent">•</span> <strong className="text-foreground">Expense Categories:</strong> Align labels with IRS Schedule C categories for seamless tax filing</li>
                </ul>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Personal / Business Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="personal" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Personal ({personalCount})
          </TabsTrigger>
          <TabsTrigger value="business" className="gap-2">
            <Building2 className="h-4 w-4" />
            Business ({businessCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredGroups.length === 0 && (
            <Card><CardContent className="p-10 text-center text-muted-foreground">
              No {activeTab} category groups yet. Create a group to start organizing.
            </CardContent></Card>
          )}

          <div className="space-y-4">
            {filteredGroups.map((group, gIdx) => {
              const groupCats = (categories || []).filter(c => c.group_id === group.id).sort((a, b) => a.sort_order - b.sort_order);
              const isCollapsed = collapsed.has(group.id);

              return (
                <motion.div key={group.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="prism-card-shine hover-border-glow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-center justify-between">
                        <button onClick={() => toggleCollapse(group.id)} className="flex items-center gap-2 text-left flex-wrap">
                          {isCollapsed ? <ChevronRight className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                          <span className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: group.color }} />
                          <CardTitle className="font-display text-base">{group.name}</CardTitle>
                          <span className="text-xs text-muted-foreground">({groupCats.length})</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">{((group as any).expense_type || 'flexible').replace('_', '-')}</Badge>
                          {(group as any).business_profile_id && businessProfiles && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                              <Building2 className="h-2.5 w-2.5" />
                              {businessProfiles.find(bp => bp.id === (group as any).business_profile_id)?.business_name || 'Linked'}
                            </Badge>
                          )}
                        </button>
                        <div className="flex items-center gap-1">
                          {gIdx > 0 && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveGroup(gIdx, -1)}>
                              <GripVertical className="h-3.5 w-3.5 rotate-90" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditGroup(group)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'group', id: group.id, name: group.name })}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <CardContent className="p-4 pt-0">
                            <div className="space-y-1">
                              {groupCats.map((cat, cIdx) => {
                                const catSubs = (subcategories || []).filter(s => s.category_id === cat.id).sort((a, b) => a.sort_order - b.sort_order);
                                const isExpanded = expandedCats.has(cat.id);

                                return (
                                  <div key={cat.id}>
                                    <div className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-muted/50 group">
                                      <div className="flex items-center gap-3">
                                        {catSubs.length > 0 ? (
                                          <button onClick={() => toggleCatExpand(cat.id)} className="flex items-center">
                                            {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                                          </button>
                                        ) : (
                                          <span className="w-3" />
                                        )}
                                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                                        <span className="text-sm font-medium">{cat.name}</span>
                                        {catSubs.length > 0 && (
                                          <Badge variant="outline" className="text-[10px] px-1 py-0">
                                            <Layers className="h-2.5 w-2.5 mr-0.5" />
                                            {catSubs.length}
                                          </Badge>
                                        )}
                                      </div>
                                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {cIdx > 0 && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCat(groupCats, cIdx, -1)}>
                                            <span className="text-xs">↑</span>
                                          </Button>
                                        )}
                                        {cIdx < groupCats.length - 1 && (
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveCat(groupCats, cIdx, 1)}>
                                            <span className="text-xs">↓</span>
                                          </Button>
                                        )}
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openCreateSub(cat.id)} title="Add subcategory">
                                          <Layers className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditCat({ id: cat.id, name: cat.name, color: cat.color, group_id: cat.group_id })}>
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'category', id: cat.id, name: cat.name })}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>

                                    {/* Subcategories */}
                                    <AnimatePresence>
                                      {isExpanded && catSubs.length > 0 && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                          <div className="ml-9 border-l-2 border-muted pl-3 space-y-0.5">
                                            {catSubs.map(sub => (
                                              <div key={sub.id} className="flex items-center justify-between rounded-md px-2 py-1.5 transition-colors hover:bg-muted/30 group/sub">
                                                <div className="flex items-center gap-2">
                                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: sub.color }} />
                                                  <span className="text-xs font-medium text-muted-foreground">{sub.name}</span>
                                                </div>
                                                <div className="flex items-center gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => openEditSub({ id: sub.id, name: sub.name, color: sub.color, category_id: sub.category_id })}>
                                                    <Pencil className="h-2.5 w-2.5" />
                                                  </Button>
                                                  <Button variant="ghost" size="icon" className="h-5 w-5 text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ type: 'subcategory', id: sub.id, name: sub.name })}>
                                                    <Trash2 className="h-2.5 w-2.5" />
                                                  </Button>
                                                </div>
                                              </div>
                                            ))}
                                            <Button variant="ghost" size="sm" className="h-6 gap-1 text-[11px] text-muted-foreground ml-1" onClick={() => openCreateSub(cat.id)}>
                                              <Plus className="h-2.5 w-2.5" /> Add Subcategory
                                            </Button>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                            <Button variant="ghost" size="sm" className="mt-2 gap-1.5 text-muted-foreground" onClick={() => openCreateCat(group.id)}>
                              <Plus className="h-3.5 w-3.5" /> Add Category
                            </Button>
                          </CardContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Group Dialog */}
      <Dialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingGroup ? 'Edit Group' : 'Create Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input value={groupForm.name} onChange={e => setGroupForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Housing, Food & Dining" />
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={groupForm.color} onChange={c => setGroupForm(f => ({ ...f, color: c }))} />
            </div>
            <div className="space-y-2">
              <Label>Budget Type</Label>
              <Select value={groupForm.budget_type} onValueChange={v => setGroupForm(f => ({ ...f, budget_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Select value={groupForm.expense_type} onValueChange={v => setGroupForm(f => ({ ...f, expense_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="fixed">Fixed</SelectItem>
                  <SelectItem value="flexible">Flexible</SelectItem>
                  <SelectItem value="non_monthly">Non-Monthly</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Controls how this group appears on the Budgets page.</p>
            </div>
            {groupForm.budget_type === 'business' && businessProfiles && businessProfiles.length > 0 && (
              <div className="space-y-2">
                <Label>Linked Business Profile</Label>
                <Select value={groupForm.business_profile_id} onValueChange={v => setGroupForm(f => ({ ...f, business_profile_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select a business profile" /></SelectTrigger>
                  <SelectContent>
                    {businessProfiles.map(bp => (
                      <SelectItem key={bp.id} value={bp.id}>
                        <span className="flex items-center gap-2">
                          <Building2 className="h-3.5 w-3.5" />
                          {bp.business_name}
                          <span className="text-xs text-muted-foreground capitalize">({bp.entity_type})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Link this group to a business for filtering in reports.</p>
              </div>
            )}
            <Button onClick={handleSaveGroup} disabled={!groupForm.name.trim() || createGroup.isPending || updateGroup.isPending} className="w-full">
              {(createGroup.isPending || updateGroup.isPending) ? 'Saving...' : editingGroup ? 'Update Group' : 'Create Group'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catDialogOpen} onOpenChange={setCatDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingCat ? 'Edit Category' : 'Add Category'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Rent, Groceries" />
            </div>
            <div className="space-y-2">
              <Label>Group</Label>
              <Select value={catForm.group_id} onValueChange={v => setCatForm(f => ({ ...f, group_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select group" /></SelectTrigger>
                <SelectContent>
                  {(groups || []).map(g => (
                    <SelectItem key={g.id} value={g.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: g.color }} />
                        {g.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={catForm.color} onChange={c => setCatForm(f => ({ ...f, color: c }))} />
            </div>
            <Button onClick={handleSaveCat} disabled={!catForm.name.trim() || !catForm.group_id || createCategory.isPending || updateCategory.isPending} className="w-full">
              {(createCategory.isPending || updateCategory.isPending) ? 'Saving...' : editingCat ? 'Update Category' : 'Create Category'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Subcategory Dialog */}
      <Dialog open={subDialogOpen} onOpenChange={setSubDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">{editingSub ? 'Edit Subcategory' : 'Add Subcategory'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subcategory Name</Label>
              <Input value={subForm.name} onChange={e => setSubForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Fast Food, Work Supplies" />
            </div>
            <div className="space-y-2">
              <Label>Parent Category</Label>
              <Select value={subForm.category_id} onValueChange={v => setSubForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {(categories || []).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                        {c.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <ColorPicker value={subForm.color} onChange={c => setSubForm(f => ({ ...f, color: c }))} />
            </div>
            <Button onClick={handleSaveSub} disabled={!subForm.name.trim() || !subForm.category_id || createSubcategory.isPending || updateSubcategory.isPending} className="w-full">
              {(createSubcategory.isPending || updateSubcategory.isPending) ? 'Saving...' : editingSub ? 'Update Subcategory' : 'Create Subcategory'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.type}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.name}"?
              {deleteTarget?.type === 'group' && ' This will also delete all categories and subcategories in this group.'}
              {deleteTarget?.type === 'category' && ' This will also delete all subcategories in this category.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default Categories;
