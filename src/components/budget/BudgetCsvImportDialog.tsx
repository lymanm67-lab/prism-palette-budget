import { useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Upload, FileSpreadsheet, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { toast } from '@/hooks/use-toast';
import { parseBudgetCsv, normalizeName, type BudgetCsvRow } from '@/lib/budget/csv';
import { SectionNote, money } from '@/components/blueprint/shared';

interface CategoryOption {
  id: string;
  name: string;
  groupName: string;
}

type Matched = BudgetCsvRow & { month: string; categoryId: string | null; categoryLabel: string };

const TEMPLATE = 'Category,Amount,Month\nRent,1100,2026-09\nGroceries,650,2026-09\nUtilities,377,2026-09\n';

/**
 * Imports a monthly budget CSV straight into the `budgets` table (the same rows the
 * Budget Planner, Budgets & Bills Report and Blueprint read), then hands the new
 * monthly total back so the Assumption Center can be re-linked.
 */
export function BudgetCsvImportDialog({
  open, onOpenChange, defaultMonth, categories, onImported,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMonth: string;
  categories: CategoryOption[];
  onImported: (result: { month: string; total: number; categoryCount: number }) => void;
}) {
  const { household } = useHousehold();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<BudgetCsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const byName = useMemo(() => {
    const m = new Map<string, CategoryOption>();
    for (const c of categories) {
      const key = normalizeName(c.name);
      if (!m.has(key)) m.set(key, c);
      m.set(`${normalizeName(c.groupName)}|${key}`, c);
    }
    return m;
  }, [categories]);

  const matched: Matched[] = useMemo(
    () => rows.map((r) => {
      const groupKey = r.group ? `${normalizeName(r.group)}|${normalizeName(r.category)}` : '';
      const hit = (groupKey && byName.get(groupKey)) || byName.get(normalizeName(r.category)) || null;
      return {
        ...r,
        month: r.month || defaultMonth,
        categoryId: hit?.id ?? null,
        categoryLabel: hit ? `${hit.name}${/business/i.test(hit.groupName) ? ' (Business)' : ''}` : '—',
      };
    }),
    [rows, byName, defaultMonth],
  );

  const importable = matched.filter((r) => r.categoryId);
  const skipped = matched.filter((r) => !r.categoryId);
  const total = importable.filter((r) => r.month === defaultMonth).reduce((s, r) => s + r.amount, 0);

  const reset = () => { setRows([]); setErrors([]); setFileName(''); };

  const handleFile = async (file: File) => {
    const text = await file.text();
    const parsed = parseBudgetCsv(text);
    setFileName(file.name);
    setRows(parsed.rows);
    setErrors(parsed.errors);
  };

  const apply = async () => {
    if (!household || !importable.length) return;
    setSaving(true);
    try {
      // Existing rows for the touched months are replaced, so re-importing a
      // corrected file never doubles a category's budget.
      const months = Array.from(new Set(importable.map((r) => r.month)));
      const { data: existing, error: exErr } = await supabase
        .from('budgets')
        .select('id, category_id, month')
        .eq('household_id', household.id)
        .in('month', months);
      if (exErr) throw exErr;

      const key = (categoryId: string, month: string) => `${categoryId}|${month}`;
      const existingMap = new Map<string, string>();
      for (const b of existing ?? []) {
        if (b.category_id) existingMap.set(key(b.category_id, String(b.month).slice(0, 10)), b.id);
      }

      const updates: { id: string; planned_amount: number }[] = [];
      const inserts: any[] = [];
      for (const r of importable) {
        const id = existingMap.get(key(r.categoryId!, r.month));
        if (id) updates.push({ id, planned_amount: r.amount });
        else inserts.push({
          household_id: household.id,
          category_id: r.categoryId,
          month: r.month,
          planned_amount: r.amount,
        });
      }

      for (const u of updates) {
        const { error } = await supabase.from('budgets').update({ planned_amount: u.planned_amount }).eq('id', u.id);
        if (error) throw error;
      }
      if (inserts.length) {
        const { error } = await supabase.from('budgets').insert(inserts);
        if (error) throw error;
      }

      toast({
        title: `Imported ${importable.length} budget line${importable.length === 1 ? '' : 's'}`,
        description: skipped.length ? `${skipped.length} row(s) skipped — no matching category.` : undefined,
      });
      onImported({ month: defaultMonth, total, categoryCount: importable.filter((r) => r.month === defaultMonth).length });
      reset();
      onOpenChange(false);
    } catch (e: any) {
      toast({ title: 'Import failed', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = () => {
    const url = URL.createObjectURL(new Blob([TEMPLATE], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prism-budget-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-prism-teal" /> Import monthly budget CSV
          </DialogTitle>
          <DialogDescription>
            Columns: <span className="font-mono">Category, Amount</span> and optionally{' '}
            <span className="font-mono">Month</span> / <span className="font-mono">Group</span>. Rows without a month
            use {defaultMonth.slice(0, 7)}. Existing budgets for the same category and month are overwritten.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4 mr-1" /> Choose CSV
            </Button>
            <Button variant="ghost" size="sm" onClick={downloadTemplate}>Download template</Button>
            {fileName && <span className="text-xs text-muted-foreground">{fileName}</span>}
          </div>

          {errors.length > 0 && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 space-y-1">
              <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" /> {errors.length} issue(s)
              </p>
              {errors.slice(0, 6).map((e, i) => (
                <p key={i} className="text-xs text-muted-foreground">{e}</p>
              ))}
            </div>
          )}

          {matched.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-prism-teal/40 text-prism-teal">{importable.length} will import</Badge>
                {skipped.length > 0 && <Badge variant="outline" className="border-prism-amber/40 text-prism-amber">{skipped.length} unmatched</Badge>}
                <span className="text-muted-foreground">
                  {defaultMonth.slice(0, 7)} total {money(total)}
                </span>
              </div>
              <div className="rounded-lg border border-border/60 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="text-left p-2">CSV category</th>
                      <th className="text-left p-2">Matched to</th>
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matched.map((r) => (
                      <tr key={`${r.line}-${r.category}`} className="border-t border-border/50">
                        <td className="p-2">{r.category}</td>
                        <td className={`p-2 ${r.categoryId ? '' : 'text-prism-amber'}`}>
                          {r.categoryId ? r.categoryLabel : 'No matching category — skipped'}
                        </td>
                        <td className="p-2 tabular-nums">{r.month.slice(0, 7)}</td>
                        <td className="p-2 text-right tabular-nums">{money(r.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {skipped.length > 0 && (
                <SectionNote>
                  Unmatched rows need a category with that name first — create it under Categories, then re-import.
                </SectionNote>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={apply} disabled={!importable.length || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            Import {importable.length || ''} line{importable.length === 1 ? '' : 's'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default BudgetCsvImportDialog;
