import { Fragment, useEffect, useMemo, useState } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wallet, Copy, FileSpreadsheet, Trash2, Plus } from 'lucide-react';
import InlineEditCell from '@/components/InlineEditCell';
import { toast } from '@/hooks/use-toast';
import { useBlueprintAssumptions, useSaveBlueprintAssumptions } from '@/hooks/use-blueprint-assumptions';
import { defaultAssumptions, type AssumptionState } from '@/lib/blueprint/model';
import { money, SectionNote } from '@/components/blueprint/shared';
import BlueprintImpactPanel from '@/components/budget/BlueprintImpactPanel';
import BudgetCsvImportDialog from '@/components/budget/BudgetCsvImportDialog';
import BaselineLockManager from '@/components/budget/BaselineLockManager';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Payroll withholdings and income groups are not household spending. */
const isExcludedGroup = (groupName?: string | null) =>
  /payroll|pre[\s-]?tax|deduction|income/.test((groupName || '').toLowerCase());

const monthKey = (year: number, monthIdx: number) =>
  `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;

export default function BudgetPlanner() {
  const { household } = useHousehold();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [monthIdx, setMonthIdx] = useState(now.getMonth());
  const [importOpen, setImportOpen] = useState(false);
  const [addCategoryId, setAddCategoryId] = useState('');

  const month = monthKey(year, monthIdx);
  const prevMonth = monthIdx === 0 ? monthKey(year - 1, 11) : monthKey(year, monthIdx - 1);

  const assumptionsQ = useBlueprintAssumptions();
  const saveAssumptions = useSaveBlueprintAssumptions();
  const [state, setState] = useState<AssumptionState>(defaultAssumptions());

  useEffect(() => {
    if (assumptionsQ.data?.state) setState(assumptionsQ.data.state);
  }, [assumptionsQ.data]);

  const persist = (next: AssumptionState) => {
    setState(next);
    saveAssumptions.mutate({ id: assumptionsQ.data?.id ?? null, state: next });
  };
  const patch = (p: Partial<AssumptionState>) => persist({ ...state, ...p });

  const { data, isLoading } = useQuery({
    queryKey: ['budget-planner', household?.id, month, prevMonth],
    enabled: !!household,
    queryFn: async () => {
      const monthStart = month;
      const monthEnd = new Date(Date.UTC(year, monthIdx + 1, 0)).toISOString().slice(0, 10);

      const [cats, budgets, prevBudgets, tx] = await Promise.all([
        supabase
          .from('categories')
          .select('id, name, color, category_groups(name)')
          .eq('household_id', household!.id)
          .order('name'),
        supabase
          .from('budgets')
          .select('id, category_id, planned_amount, categories(name, color, category_groups(name))')
          .eq('household_id', household!.id)
          .eq('month', monthStart),
        supabase
          .from('budgets')
          .select('category_id, planned_amount')
          .eq('household_id', household!.id)
          .eq('month', prevMonth),
        supabase
          .from('transactions')
          .select('amount, category_id')
          .eq('household_id', household!.id)
          .eq('is_transfer', false)
          .is('deleted_at', null)
          .gte('date', monthStart)
          .lte('date', monthEnd)
          .limit(1000),
      ]);
      if (cats.error) throw cats.error;
      if (budgets.error) throw budgets.error;

      return {
        categories: (cats.data ?? []) as any[],
        budgets: (budgets.data ?? []) as any[],
        prevBudgets: (prevBudgets.data ?? []) as any[],
        transactions: (tx.data ?? []) as any[],
      };
    },
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['budget-planner'] });

  const categoryOptions = useMemo(
    () => (data?.categories ?? [])
      .filter((c) => !isExcludedGroup(c.category_groups?.name))
      .map((c) => ({ id: c.id, name: c.name, groupName: c.category_groups?.name || 'Other' })),
    [data],
  );

  /** One row per budgeted or spent category for the selected month. */
  const rows = useMemo(() => {
    if (!data) return [] as any[];
    type Row = {
      categoryId: string; budgetId: string | null; name: string; groupName: string;
      planned: number; actual: number;
    };
    const map = new Map<string, Row>();
    const catById = new Map<string, any>(data.categories.map((c: any) => [c.id, c]));
    const make = (categoryId: string): Row | null => {
      const cat = catById.get(categoryId);
      const groupName = cat?.category_groups?.name || 'Other';
      if (isExcludedGroup(groupName)) return null;
      return {
        categoryId,
        budgetId: null,
        name: /business/i.test(groupName) ? `${cat?.name ?? 'Category'} (Business)` : (cat?.name ?? 'Category'),
        groupName,
        planned: 0,
        actual: 0,
      };
    };

    for (const b of data.budgets) {
      if (!b.category_id) continue;
      const row = map.get(b.category_id) ?? make(b.category_id);
      if (!row) continue;
      row.planned += Number(b.planned_amount) || 0;
      row.budgetId = row.budgetId ?? b.id;
      map.set(b.category_id, row);
    }
    for (const t of data.transactions) {
      const amt = Number(t.amount) || 0;
      if (amt >= 0 || !t.category_id) continue;
      const row = map.get(t.category_id) ?? make(t.category_id);
      if (!row) continue;
      row.actual += Math.abs(amt);
      map.set(t.category_id, row);
    }
    return Array.from(map.values()).sort(
      (a, b) => a.groupName.localeCompare(b.groupName) || b.planned - a.planned,
    );
  }, [data]);

  const totals = useMemo(() => ({
    planned: rows.reduce((s, r) => s + r.planned, 0),
    actual: rows.reduce((s, r) => s + r.actual, 0),
  }), [rows]);

  const savePlanned = async (row: any, raw: string) => {
    const amount = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      throw new Error('invalid');
    }
    const { error } = row.budgetId
      ? await supabase.from('budgets').update({ planned_amount: amount }).eq('id', row.budgetId)
      : await supabase.from('budgets').insert({
        household_id: household!.id,
        category_id: row.categoryId,
        month,
        planned_amount: amount,
      });
    if (error) {
      toast({ title: 'Could not save budget', description: error.message, variant: 'destructive' });
      throw error;
    }
    await refresh();
  };

  const removeBudget = async (row: any) => {
    if (!row.budgetId) return;
    const { error } = await supabase.from('budgets').delete().eq('id', row.budgetId);
    if (error) return toast({ title: 'Could not remove', description: error.message, variant: 'destructive' });
    await refresh();
  };

  const addCategory = async () => {
    if (!addCategoryId) return;
    const { error } = await supabase.from('budgets').insert({
      household_id: household!.id,
      category_id: addCategoryId,
      month,
      planned_amount: 0,
    });
    if (error) return toast({ title: 'Could not add category', description: error.message, variant: 'destructive' });
    setAddCategoryId('');
    await refresh();
  };

  const copyPrevious = async () => {
    if (!data?.prevBudgets.length) return toast({ title: `No budgets in ${prevMonth.slice(0, 7)}` });
    const existing = new Set(data.budgets.map((b: any) => b.category_id));
    const inserts = data.prevBudgets
      .filter((b: any) => b.category_id && !existing.has(b.category_id))
      .map((b: any) => ({
        household_id: household!.id,
        category_id: b.category_id,
        month,
        planned_amount: Number(b.planned_amount) || 0,
      }));
    if (!inserts.length) return toast({ title: 'Nothing new to copy' });
    const { error } = await supabase.from('budgets').insert(inserts);
    if (error) return toast({ title: 'Copy failed', description: error.message, variant: 'destructive' });
    toast({ title: `Copied ${inserts.length} line(s) from ${prevMonth.slice(0, 7)}` });
    await refresh();
  };

  const linkToBlueprint = (plannedSpend = totals.planned, source: 'planner' | 'csv' = 'planner', categoryCount = rows.length) => {
    persist({
      ...state,
      budget: {
        ...state.budget,
        sourceMonth: month,
        plannedSpendMonthly: Math.round(plannedSpend * 100) / 100,
        source,
        importedAt: new Date().toISOString(),
        categoryCount,
      },
    });
    toast({ title: 'Blueprint updated', description: `Projections now use ${month.slice(0, 7)} at ${money(plannedSpend)}/mo.` });
  };

  const years = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 2 + i);
  const grouped = useMemo(() => {
    const g = new Map<string, any[]>();
    for (const r of rows) g.set(r.groupName, [...(g.get(r.groupName) ?? []), r]);
    return Array.from(g.entries());
  }, [rows]);

  useEffect(() => {
    document.title = 'Budget Planner — Edit Monthly Budgets | PrismMoney™';
  }, []);

  return (
    <div className="container mx-auto p-4 space-y-4 max-w-6xl">

      <header className="space-y-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="h-6 w-6 text-prism-teal" /> Budget Planner
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Edit any month's budget here. These are the same budget rows the Budgets &amp; Bills Report and the
          Money Blueprint read — one source of truth, no parallel copy.
        </p>
      </header>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2 justify-between">
            <CardTitle className="text-base">
              {MONTHS[monthIdx]} {year} budget
              <Badge variant="outline" className="ml-2 text-[10px]">{rows.length} categories</Badge>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={String(monthIdx)} onValueChange={(v) => setMonthIdx(Number(v))}>
                <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={copyPrevious}>
                <Copy className="h-4 w-4 mr-1" /> Copy {prevMonth.slice(0, 7)}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                <FileSpreadsheet className="h-4 w-4 mr-1" /> Import CSV
              </Button>
            </div>
          </div>
          <SectionNote>
            Planned {money(totals.planned)} · actual so far {money(totals.actual)} ·{' '}
            {totals.planned - totals.actual >= 0
              ? `${money(totals.planned - totals.actual)} left in plan`
              : `${money(totals.actual - totals.planned)} over plan`}
          </SectionNote>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading budgets…
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nothing budgeted for {MONTHS[monthIdx]} {year} yet — copy the previous month or import a CSV.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left p-2">Category</th>
                    <th className="text-right p-2 w-32">Planned</th>
                    <th className="text-right p-2 w-28">Actual</th>
                    <th className="text-right p-2 w-28">Remaining</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {grouped.map(([group, groupRows]) => (
                    <Fragment key={group}>
                      <tr className="bg-muted/30">
                        <td colSpan={5} className="p-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {group}
                        </td>
                      </tr>
                      {groupRows.map((r) => {
                        const remaining = r.planned - r.actual;
                        return (
                          <tr key={r.categoryId} className="border-t border-border/50">
                            <td className="p-2">{r.name}</td>
                            <td className="p-2 text-right">
                              <InlineEditCell
                                value={String(r.planned)}
                                type="number"
                                className="text-right"
                                formatter={(v) => money(Number(v))}
                                onSave={(v) => savePlanned(r, v)}
                              />
                            </td>
                            <td className="p-2 text-right tabular-nums text-muted-foreground">{money(r.actual)}</td>
                            <td className={`p-2 text-right tabular-nums ${remaining < 0 ? 'text-destructive' : ''}`}>
                              {money(remaining)}
                            </td>
                            <td className="p-2 text-right">
                              {r.budgetId && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeBudget(r)}>
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                  <tr className="border-t-2 border-border font-semibold">
                    <td className="p-2">Total</td>
                    <td className="p-2 text-right tabular-nums">{money(totals.planned)}</td>
                    <td className="p-2 text-right tabular-nums">{money(totals.actual)}</td>
                    <td className="p-2 text-right tabular-nums">{money(totals.planned - totals.actual)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Select value={addCategoryId} onValueChange={setAddCategoryId}>
              <SelectTrigger className="w-64 h-9"><SelectValue placeholder="Add a category to this month" /></SelectTrigger>
              <SelectContent>
                {categoryOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name} — {c.groupName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button size="sm" variant="outline" onClick={addCategory} disabled={!addCategoryId}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <BlueprintImpactPanel
        state={state}
        patch={patch}
        plannedSpend={totals.planned}
        month={month}
        saving={saveAssumptions.isPending}
        onLink={() => linkToBlueprint()}
      />

      <BudgetCsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        defaultMonth={month}
        categories={categoryOptions}
        onImported={({ total, categoryCount }) => {
          refresh();
          linkToBlueprint(total, 'csv', categoryCount);
        }}
      />
    </div>
  );
}
