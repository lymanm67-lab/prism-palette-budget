import { useCurrency } from '@/hooks/use-currency';
import { useQuery } from '@tanstack/react-query';
import { addMonths, format, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { excludesTakeHomeAllocation } from '@/lib/budgeting/takeHomeAllocation';
import { Badge } from '@/components/ui/badge';

const MONTHS = 6;
const HIGHLIGHT = /sister|speaking|vacation loan|five-bucket/i;

interface Row { month: string; planned_amount: number; categories: { name: string; money_purpose: string | null; category_groups: { expense_type: string | null; budget_type: string | null } | null } | null }

export function MonthsAhead({ householdId }: { householdId: string }) {
  const { formatCurrency } = useCurrency();
  const start = startOfMonth(new Date());
  const months = Array.from({ length: MONTHS }, (_, i) => format(addMonths(start, i), 'yyyy-MM-01'));
  const { data = [], isLoading } = useQuery({
    queryKey: ['months-ahead', householdId, months[0]],
    queryFn: async () => {
      const { data, error } = await supabase.from('budgets')
        .select('month, planned_amount, categories(name, money_purpose, category_groups(expense_type, budget_type))')
        .eq('household_id', householdId).gte('month', months[0]).lte('month', months[MONTHS - 1]).limit(1000);
      if (error) throw error;
      return (data || []) as unknown as Row[];
    },
  });

  const cols = months.map(m => {
    const rows = data.filter(r => r.month.slice(0, 10) === m && (r.categories?.category_groups?.budget_type || 'personal') === 'personal');
    let income = 0, expenses = 0, debt = 0, savings = 0;
    const notes: { name: string; amount: number }[] = [];
    for (const r of rows) {
      const name = r.categories?.name || '';
      const type = r.categories?.category_groups?.expense_type;
      const amt = Number(r.planned_amount || 0);
      if (!amt || type === 'payroll_deduction') continue;
      if (type === 'income') { income += amt; if (/speaking/i.test(name)) notes.push({ name, amount: amt }); continue; }
      if (excludesTakeHomeAllocation(name, false)) continue;
      if (name.startsWith('Five-Bucket · ')) savings += amt;
      else if (r.categories?.money_purpose === 'eliminate_debt' || /loan|debt|betrlink/i.test(name)) debt += amt;
      else expenses += amt;
      if (HIGHLIGHT.test(name)) notes.push({ name, amount: amt });
    }
    return { m, income, expenses, debt, savings, left: income - expenses - debt - savings, notes };
  });

  return (
    <section className="space-y-3 border-b py-4" aria-label="Months ahead">
      <div>
        <h2 className="text-lg font-semibold">Months ahead</h2>
        <p className="text-sm text-muted-foreground">Your saved personal budgets for the next {MONTHS} months, with one-time items like the sister loan, speaking fee and loan payoffs called out.</p>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cols.map(c => (
            <div key={c.m} className="rounded-lg border bg-card/60 p-3 text-sm backdrop-blur">
              <p className="mb-2 font-semibold">{format(new Date(c.m + 'T00:00:00'), 'MMMM yyyy')}</p>
              <dl className="space-y-1 tabular-nums">
                <div className="flex justify-between"><dt>Income</dt><dd>{formatCurrency(c.income)}</dd></div>
                <div className="flex justify-between"><dt>Expenses</dt><dd>{formatCurrency(c.expenses)}</dd></div>
                <div className="flex justify-between"><dt>Debt payments</dt><dd>{formatCurrency(c.debt)}</dd></div>
                <div className="flex justify-between"><dt>Five-Bucket savings</dt><dd>{formatCurrency(c.savings)}</dd></div>
                <div className={`flex justify-between border-t pt-1 font-semibold ${c.left < 0 ? 'text-destructive' : 'text-primary'}`}><dt>Left over</dt><dd>{formatCurrency(c.left)}</dd></div>
              </dl>
              {c.notes.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.notes.map(n => <Badge key={n.name} variant="secondary" className="text-xs">{n.name}: {formatCurrency(n.amount)}</Badge>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
