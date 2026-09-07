import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { Loader2 } from 'lucide-react';
import InlineEditCell from '@/components/InlineEditCell';
import { toast } from '@/hooks/use-toast';
import { money } from '@/components/blueprint/shared';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const isExcludedGroup = (groupName?: string | null) =>
  /payroll|pre[\s-]?tax|deduction|income/.test((groupName || '').toLowerCase());

/** Editable planned amounts for every month of one year, one row per category. */
export default function BudgetYearGrid({ year }: { year: number }) {
  const { household } = useHousehold();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['budget-year-grid', household?.id, year],
    enabled: !!household,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budgets')
        .select('id, month, category_id, planned_amount, categories(name, category_groups(name))')
        .eq('household_id', household!.id)
        .gte('month', `${year}-01-01`)
        .lte('month', `${year}-12-01`)
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const rows = useMemo(() => {
    const map = new Map<string, { categoryId: string; name: string; groupName: string; cells: (any | null)[] }>();
    for (const b of data ?? []) {
      const groupName = b.categories?.category_groups?.name || 'Other';
      if (isExcludedGroup(groupName)) continue;
      const idx = Number(String(b.month).slice(5, 7)) - 1;
      const row = map.get(b.category_id) ?? {
        categoryId: b.category_id,
        name: b.categories?.name ?? 'Category',
        groupName,
        cells: Array.from({ length: 12 }, () => null),
      };
      row.cells[idx] = b;
      map.set(b.category_id, row);
    }
    return Array.from(map.values()).sort(
      (a, b) => a.groupName.localeCompare(b.groupName) || a.name.localeCompare(b.name),
    );
  }, [data]);

  const monthTotals = useMemo(
    () => Array.from({ length: 12 }, (_, i) =>
      rows.reduce((s, r) => s + (Number(r.cells[i]?.planned_amount) || 0), 0)),
    [rows],
  );

  const save = async (row: (typeof rows)[number], monthIdx: number, raw: string) => {
    const amount = Number(String(raw).replace(/[^0-9.]/g, ''));
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      throw new Error('invalid');
    }
    const cell = row.cells[monthIdx];
    const { error } = cell
      ? await supabase.from('budgets').update({ planned_amount: amount }).eq('id', cell.id)
      : await supabase.from('budgets').insert({
        household_id: household!.id,
        category_id: row.categoryId,
        month: `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`,
        planned_amount: amount,
      });
    if (error) {
      toast({ title: 'Could not save', description: error.message, variant: 'destructive' });
      throw error;
    }
    await qc.invalidateQueries({ queryKey: ['budget-year-grid'] });
    await qc.invalidateQueries({ queryKey: ['budget-planner'] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the year…
      </div>
    );
  }

  if (!rows.length) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No budget lines in {year} yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="sticky left-0 bg-card p-2 text-left">Category</th>
            {MONTHS.map((m) => <th key={m} className="p-2 text-right">{m}</th>)}
            <th className="p-2 text-right">Year</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.categoryId} className="border-t border-border/50">
              <td className="sticky left-0 bg-card p-2 whitespace-nowrap">
                {r.name}
                <span className="ml-1 text-[10px] text-muted-foreground">{r.groupName}</span>
              </td>
              {MONTHS.map((m, i) => (
                <td key={m} className="p-1 text-right">
                  <InlineEditCell
                    value={String(Number(r.cells[i]?.planned_amount) || 0)}
                    type="number"
                    className="text-right"
                    formatter={(v) => (Number(v) ? money(Number(v)) : '—')}
                    onSave={(v) => save(r, i, v)}
                  />
                </td>
              ))}
              <td className="p-2 text-right tabular-nums font-medium">
                {money(r.cells.reduce((s, c) => s + (Number(c?.planned_amount) || 0), 0))}
              </td>
            </tr>
          ))}
          <tr className="border-t-2 border-border font-semibold">
            <td className="sticky left-0 bg-card p-2">Total</td>
            {monthTotals.map((t, i) => (
              <td key={i} className="p-2 text-right tabular-nums">{money(t)}</td>
            ))}
            <td className="p-2 text-right tabular-nums">
              {money(monthTotals.reduce((s, t) => s + t, 0))}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
