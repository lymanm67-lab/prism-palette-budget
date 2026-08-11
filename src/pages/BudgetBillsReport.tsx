import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from '@/contexts/HouseholdContext';
import { useCurrency } from '@/hooks/use-currency';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Printer, Receipt, Wallet, CalendarClock, Zap, Pencil, Check } from 'lucide-react';
import InlineEditCell from '@/components/InlineEditCell';
import { toast } from '@/hooks/use-toast';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const monthlyEquivalent = (amount: number, frequency: string) => {
  const a = Math.abs(Number(amount) || 0);
  switch (frequency) {
    case 'weekly': return (a * 52) / 12;
    case 'biweekly': return (a * 26) / 12;
    case 'quarterly': return a / 3;
    case 'yearly': return a / 12;
    default: return a;
  }
};


/**
 * Payroll withholdings, pre-tax deductions and income groups are not spending —
 * they must never appear in the Budgeted vs. Actual table or the year rollup.
 */
const isExcludedGroup = (groupName?: string | null) => {
  const n = (groupName || '').toLowerCase();
  return /payroll|pre[\s-]?tax|deduction|income/.test(n);
};

export default function BudgetBillsReport() {
  const { household } = useHousehold();
  const { formatCurrency } = useCurrency();
  const qc = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth()));
  const [editMode, setEditMode] = useState(false);

  const yearNum = Number(year);
  const monthNum = Number(month);

  const { data, isLoading } = useQuery({
    queryKey: ['budget-bills-report', household?.id, yearNum],
    enabled: !!household,
    queryFn: async () => {
      const start = `${yearNum}-01-01`;
      const end = `${yearNum}-12-31`;

      const [budgetsRes, txRes, billsRes] = await Promise.all([
        supabase
          .from('budgets')
          .select('id, category_id, month, planned_amount, categories(name, color, category_groups(name, budget_type))')
          .eq('household_id', household!.id)
          .gte('month', start)
          .lte('month', end),
        supabase
          .from('transactions')
          .select('amount, date, category_id, categories(name, color, category_groups(name, budget_type))')
          .eq('household_id', household!.id)
          .eq('is_transfer', false)
          .is('deleted_at', null)
          .gte('date', start)
          .lte('date', end)
          .limit(10000),
        supabase
          .from('recurring_transactions')
          .select('id, merchant, amount, frequency, next_due_date, autopay_enabled, is_active, categories!recurring_transactions_category_id_fkey(name, color), accounts(name)')
          .eq('household_id', household!.id)
          .eq('is_active', true)
          .order('next_due_date'),
      ]);

      if (budgetsRes.error) throw budgetsRes.error;
      if (txRes.error) throw txRes.error;
      if (billsRes.error) throw billsRes.error;

      return {
        budgets: (budgetsRes.data ?? []) as any[],
        transactions: (txRes.data ?? []) as any[],
        // Bills = money going out only. Positive recurring rows are income
        // (salary, client retainers) and must not inflate the bill totals.
        bills: ((billsRes.data ?? []) as any[]).filter((b) => (Number(b.amount) || 0) < 0),
      };
    },
  });

  const billsMonthlyTotal = useMemo(
    () => (data?.bills ?? []).reduce((s, b) => s + monthlyEquivalent(b.amount, b.frequency), 0),
    [data],
  );

  // Budgeted vs actual by category for the selected month.
  // Payroll deductions and income groups are excluded (they aren't discretionary
  // spending), and identically-named categories are merged so the table shows
  // one line per real category instead of personal/business duplicates.
  const categoryRows = useMemo(() => {
    if (!data) return [] as any[];
    type Row = { key: string; categoryId: string | null; budgetId: string | null; name: string; color?: string; budgeted: number; actual: number };
    const map = new Map<string, Row>();
    const excluded = (cat: any) => isExcludedGroup(cat?.category_groups?.name);
    const keyFor = (cat: any, categoryId: string | null) =>
      (cat?.name ? String(cat.name).trim().toLowerCase() : categoryId ?? 'uncategorized');
    const make = (key: string, categoryId: string | null, name: string, color?: string): Row =>
      ({ key, categoryId, budgetId: null, name, color, budgeted: 0, actual: 0 });

    for (const b of data.budgets) {
      const d = new Date(b.month);
      if (d.getUTCFullYear() !== yearNum || d.getUTCMonth() !== monthNum) continue;
      if (excluded(b.categories)) continue;
      const key = keyFor(b.categories, b.category_id ?? null);
      const row = map.get(key) ?? make(key, b.category_id ?? null, b.categories?.name ?? 'Uncategorized', b.categories?.color);
      row.budgeted += Number(b.planned_amount) || 0;
      row.budgetId = row.budgetId ?? b.id;
      row.categoryId = row.categoryId ?? b.category_id ?? null;
      map.set(key, row);
    }

    for (const t of data.transactions) {
      const amt = Number(t.amount) || 0;
      if (amt >= 0) continue; // expenses only
      if (excluded(t.categories)) continue;
      const d = new Date(`${t.date}T00:00:00`);
      if (d.getFullYear() !== yearNum || d.getMonth() !== monthNum) continue;
      const key = keyFor(t.categories, t.category_id ?? null);
      const row = map.get(key) ?? make(key, t.category_id ?? null, t.categories?.name ?? 'Uncategorized', t.categories?.color);
      row.actual += Math.abs(amt);
      map.set(key, row);
    }

    return Array.from(map.values()).sort((a, b) => b.actual - a.actual);
  }, [data, yearNum, monthNum]);

  const refresh = () => qc.invalidateQueries({ queryKey: ['budget-bills-report'] });

  const saveBudget = async (row: any, raw: string) => {
    const amount = Number(raw);
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      throw new Error('invalid');
    }
    const monthStr = `${yearNum}-${String(monthNum + 1).padStart(2, '0')}-01`;
    let error;
    if (row.budgetId) {
      ({ error } = await supabase.from('budgets').update({ planned_amount: amount }).eq('id', row.budgetId));
    } else if (row.categoryId) {
      ({ error } = await supabase.from('budgets').insert({
        household_id: household!.id,
        category_id: row.categoryId,
        month: monthStr,
        planned_amount: amount,
      }));
    } else {
      toast({ title: 'Cannot budget uncategorized spending', variant: 'destructive' });
      throw new Error('no category');
    }
    if (error) {
      toast({ title: 'Could not save budget', description: error.message, variant: 'destructive' });
      throw error;
    }
    await refresh();
  };

  const saveBill = async (id: string, updates: Record<string, any>) => {
    const { error } = await supabase.from('recurring_transactions').update(updates).eq('id', id);
    if (error) {
      toast({ title: 'Could not save bill', description: error.message, variant: 'destructive' });
      throw error;
    }
    await refresh();
  };


  const totals = useMemo(() => {
    const budgeted = categoryRows.reduce((s, r) => s + r.budgeted, 0);
    const actual = categoryRows.reduce((s, r) => s + r.actual, 0);
    return { budgeted, actual, variance: budgeted - actual };
  }, [categoryRows]);

  // Month-by-month: budget total vs actual spend vs bills total
  const monthlyRows = useMemo(() => {
    const rows = MONTHS.map((m, i) => ({ label: m, index: i, budgeted: 0, actual: 0, bills: billsMonthlyTotal }));
    if (!data) return rows;
    const skip = (cat: any) => isExcludedGroup(cat?.category_groups?.name);
    for (const b of data.budgets) {
      const d = new Date(b.month);
      if (d.getUTCFullYear() !== yearNum) continue;
      if (skip(b.categories)) continue;
      rows[d.getUTCMonth()].budgeted += Number(b.planned_amount) || 0;
    }
    for (const t of data.transactions) {
      const amt = Number(t.amount) || 0;
      if (amt >= 0) continue;
      if (skip(t.categories)) continue;
      const d = new Date(`${t.date}T00:00:00`);
      if (d.getFullYear() !== yearNum) continue;
      rows[d.getMonth()].actual += Math.abs(amt);
    }
    return rows;
  }, [data, yearNum, billsMonthlyTotal]);

  const years = useMemo(() => {
    const y = now.getFullYear();
    return [y + 1, y, y - 1, y - 2].map(String);
  }, [now]);

  const autopayCount = (data?.bills ?? []).filter((b) => b.autopay_enabled).length;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Budgets &amp; Bills Report</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Budgeted vs. actual by category, your bill schedule, and a month-by-month rollup.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m, i) => <SelectItem key={m} value={String(i)}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant={editMode ? 'default' : 'outline'} onClick={() => setEditMode((v) => !v)}>
            {editMode ? <><Check className="h-4 w-4 mr-2" /> Done editing</> : <><Pencil className="h-4 w-4 mr-2" /> Edit</>}
          </Button>
          <Button variant="secondary" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" /> Print
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading report…
        </div>
      ) : (
        <div id="budget-bills-print" className="space-y-6">
          <div className="hidden print:block">
            <h1 className="text-2xl font-bold">Budgets &amp; Bills Report</h1>
            <p className="text-sm">{MONTHS[monthNum]} {yearNum}</p>
          </div>

          {/* Summary */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Budgeted', value: totals.budgeted, icon: Wallet },
              { label: 'Actual spend', value: totals.actual, icon: Receipt },
              { label: 'Variance', value: totals.variance, icon: Zap },
              { label: 'Monthly bills', value: billsMonthlyTotal, icon: CalendarClock },
            ].map((s) => (
              <Card key={s.label} className="print:shadow-none print:border-black">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
                    <s.icon className="h-3.5 w-3.5" /> {s.label}
                  </div>
                  <div className={`text-2xl font-bold mt-2 ${s.label === 'Variance' ? (s.value >= 0 ? 'text-emerald-500' : 'text-destructive') : ''}`}>
                    {formatCurrency(s.value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Budgeted vs actual by category */}
          <Card className="print:shadow-none print:border-black">
            <CardHeader>
              <CardTitle>Budgeted vs. Actual — {MONTHS[monthNum]} {yearNum}</CardTitle>
            </CardHeader>
            <CardContent>
              {categoryRows.length === 0 ? (
                <p className="text-sm text-muted-foreground">No budgets or spending recorded for this month.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-3">Category</th>
                        <th className="py-2 px-3 text-right">Budgeted</th>
                        <th className="py-2 px-3 text-right">Actual</th>
                        <th className="py-2 px-3 text-right">Variance</th>
                        <th className="py-2 pl-3 w-[140px] print:hidden">Used</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryRows.map((r) => {
                        const variance = r.budgeted - r.actual;
                        const pct = r.budgeted > 0 ? Math.min(150, (r.actual / r.budgeted) * 100) : 0;
                        return (
                          <tr key={r.key} className="border-b last:border-0">
                            <td className="py-2 pr-3 font-medium">{r.name}</td>
                            <td className="py-2 px-3 text-right">
                              {editMode && r.categoryId ? (
                                <div className="flex justify-end">
                                  <InlineEditCell
                                    type="number"
                                    value={r.budgeted ? String(r.budgeted) : ''}
                                    placeholder="Set budget"
                                    onSave={(v) => saveBudget(r, v)}
                                    formatter={(v) => (v ? formatCurrency(Number(v)) : '')}
                                  />
                                </div>
                              ) : (
                                r.budgeted > 0 ? formatCurrency(r.budgeted) : '—'
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">{formatCurrency(r.actual)}</td>
                            <td className={`py-2 px-3 text-right ${r.budgeted === 0 ? 'text-muted-foreground' : variance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                              {r.budgeted === 0 ? 'Unbudgeted' : formatCurrency(variance)}
                            </td>
                            <td className="py-2 pl-3 print:hidden">
                              {r.budgeted > 0 ? <Progress value={pct} className="h-2" /> : <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                      <tr className="font-semibold">
                        <td className="py-2 pr-3">Total</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(totals.budgeted)}</td>
                        <td className="py-2 px-3 text-right">{formatCurrency(totals.actual)}</td>
                        <td className={`py-2 px-3 text-right ${totals.variance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                          {formatCurrency(totals.variance)}
                        </td>
                        <td className="print:hidden" />
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bills */}
          <Card className="print:shadow-none print:border-black">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 flex-wrap">
                <span>Bills — due dates &amp; autopay</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {(data?.bills ?? []).length} active · {autopayCount} on autopay · {formatCurrency(billsMonthlyTotal)}/mo
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(data?.bills ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No active recurring bills.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-muted-foreground border-b">
                        <th className="py-2 pr-3">Bill</th>
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3">Account</th>
                        <th className="py-2 px-3">Frequency</th>
                        <th className="py-2 px-3">Next due</th>
                        <th className="py-2 px-3">Autopay</th>
                        <th className="py-2 pl-3 text-right">Amount</th>
                        <th className="py-2 pl-3 text-right">Per month</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.bills ?? []).map((b) => (
                        <tr key={b.id} className="border-b last:border-0">
                          <td className="py-2 pr-3 font-medium">
                            {editMode ? (
                              <InlineEditCell
                                value={b.merchant ?? ''}
                                placeholder="Bill name"
                                onSave={(v) => saveBill(b.id, { merchant: v })}
                              />
                            ) : (
                              b.merchant ?? 'Bill'
                            )}
                          </td>
                          <td className="py-2 px-3">{b.categories?.name ?? '—'}</td>
                          <td className="py-2 px-3">{b.accounts?.name ?? '—'}</td>
                          <td className="py-2 px-3 capitalize">
                            {editMode ? (
                              <Select value={b.frequency} onValueChange={(v) => saveBill(b.id, { frequency: v })}>
                                <SelectTrigger className="h-7 w-[120px]"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {['weekly', 'biweekly', 'monthly', 'quarterly', 'yearly'].map((f) => (
                                    <SelectItem key={f} value={f} className="capitalize">{f}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              b.frequency
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {editMode ? (
                              <InlineEditCell
                                type="date"
                                value={b.next_due_date ?? ''}
                                placeholder="Set date"
                                onSave={(v) => saveBill(b.id, { next_due_date: v || null })}
                              />
                            ) : (
                              b.next_due_date
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {editMode ? (
                              <Switch
                                checked={!!b.autopay_enabled}
                                onCheckedChange={(v) => saveBill(b.id, { autopay_enabled: v })}
                              />
                            ) : (
                              <Badge variant={b.autopay_enabled ? 'default' : 'outline'}>
                                {b.autopay_enabled ? 'Autopay' : 'Manual'}
                              </Badge>
                            )}
                          </td>
                          <td className="py-2 pl-3 text-right">
                            {editMode ? (
                              <div className="flex justify-end">
                                <InlineEditCell
                                  type="number"
                                  value={String(Math.abs(Number(b.amount) || 0))}
                                  formatter={(v) => (v ? formatCurrency(Number(v)) : '')}
                                  onSave={(v) => {
                                    const n = Math.abs(Number(v));
                                    if (!Number.isFinite(n)) {
                                      toast({ title: 'Enter a valid amount', variant: 'destructive' });
                                      return Promise.reject(new Error('invalid'));
                                    }
                                    return saveBill(b.id, { amount: Number(b.amount) < 0 ? -n : n });
                                  }}
                                />
                              </div>
                            ) : (
                              formatCurrency(Math.abs(Number(b.amount) || 0))
                            )}
                          </td>
                          <td className="py-2 pl-3 text-right">{formatCurrency(monthlyEquivalent(b.amount, b.frequency))}</td>
                        </tr>
                      ))}
                      <tr className="font-semibold">
                        <td className="py-2 pr-3" colSpan={7}>Total per month</td>
                        <td className="py-2 pl-3 text-right">{formatCurrency(billsMonthlyTotal)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Month by month */}
          <Card className="print:shadow-none print:border-black">
            <CardHeader>
              <CardTitle>Month-by-month — budgets vs. bills vs. actual ({yearNum})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-2 pr-3">Month</th>
                      <th className="py-2 px-3 text-right">Budgeted</th>
                      <th className="py-2 px-3 text-right">Bills</th>
                      <th className="py-2 px-3 text-right">Actual spend</th>
                      <th className="py-2 pl-3 text-right">Budget variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((r) => {
                      const variance = r.budgeted - r.actual;
                      return (
                        <tr key={r.label} className={`border-b last:border-0 ${r.index === monthNum ? 'bg-muted/40' : ''}`}>
                          <td className="py-2 pr-3 font-medium">{r.label}</td>
                          <td className="py-2 px-3 text-right">{r.budgeted > 0 ? formatCurrency(r.budgeted) : '—'}</td>
                          <td className="py-2 px-3 text-right">{formatCurrency(r.bills)}</td>
                          <td className="py-2 px-3 text-right">{r.actual > 0 ? formatCurrency(r.actual) : '—'}</td>
                          <td className={`py-2 pl-3 text-right ${r.budgeted === 0 ? 'text-muted-foreground' : variance >= 0 ? 'text-emerald-500' : 'text-destructive'}`}>
                            {r.budgeted === 0 ? '—' : formatCurrency(variance)}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="font-semibold">
                      <td className="py-2 pr-3">Year total</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(monthlyRows.reduce((s, r) => s + r.budgeted, 0))}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(billsMonthlyTotal * 12)}</td>
                      <td className="py-2 px-3 text-right">{formatCurrency(monthlyRows.reduce((s, r) => s + r.actual, 0))}</td>
                      <td className="py-2 pl-3 text-right">
                        {formatCurrency(monthlyRows.reduce((s, r) => s + (r.budgeted - r.actual), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Bills are shown as a monthly equivalent from your active recurring schedule. Transfers and deleted transactions are excluded from actual spend.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <style>{`
        @media print {
          @page { margin: 0.5in; }
          .print\\:hidden { display: none !important; }
          #budget-bills-print { max-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
