import { useState } from 'react';
import { useCurrency } from '@/hooks/use-currency';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown } from 'lucide-react';
import { addMonths, format, startOfMonth } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { excludesTakeHomeAllocation, excludesBusinessOperatingFunding } from '@/lib/budgeting/takeHomeAllocation';
import { budgetFunding } from '@/lib/fiveBucket/budgetFunding';
import { BASELINE, BUCKETS } from '@/lib/fiveBucket/engine';
import { Badge } from '@/components/ui/badge';
import { futureDebtPayments } from '@/lib/budgeting/futureDebtPayments';

const MONTHS = 7;
const HIGHLIGHT = /sister|speaking|vacation loan|five-bucket/i;
const januaryPayments = futureDebtPayments('2027-01-01');

interface Row { month: string; planned_amount: number; categories: { name: string; money_purpose: string | null; category_groups: { expense_type: string | null; budget_type: string | null } | null } | null }

export function MonthsAhead({ householdId, budgetType = 'personal' }: { householdId: string; budgetType?: 'personal' | 'business' | 'all' }) {
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
    const revisedDebtMonth = futureDebtPayments(m) !== null;
    const rows = data.filter(r => r.month.slice(0, 10) === m && (budgetType === 'all' || (r.categories?.category_groups?.budget_type || 'personal') === budgetType));
    const businessRows = data.filter(r => r.month.slice(0, 10) === m && r.categories?.category_groups?.budget_type === 'business');
    const businessBalance = businessRows.reduce((sum, r) => {
      const category = r.categories;
      const type = category?.category_groups?.expense_type;
      if (type === 'payroll_deduction') return sum;
      if (type === 'income') return sum + Number(r.planned_amount || 0);
      if (excludesTakeHomeAllocation(category?.name || '', false)) return sum;
      return sum - Number(r.planned_amount || 0);
    }, 0);
    const ownerContribution = Math.max(0, -businessBalance);
    const investmentAllocation = businessRows.reduce((sum, r) => {
      const name = r.categories?.name || '';
      return excludesBusinessOperatingFunding(name) && !excludesTakeHomeAllocation(name, false)
        ? sum + Number(r.planned_amount || 0) : sum;
    }, 0);
    const operatingContribution = Math.max(0, ownerContribution - investmentAllocation);
    let income = 0, expenses = 0, debt = 0, savings = 0;
    const notes: { name: string; amount: number }[] = [];
    const debtLines: { name: string; amount: number }[] = [];
    for (const r of rows) {
      const name = r.categories?.name || '';
      const type = r.categories?.category_groups?.expense_type;
      const amt = Number(r.planned_amount || 0);
      if (!amt || type === 'payroll_deduction') continue;
      if (revisedDebtMonth && r.categories?.money_purpose === 'business' && r.categories.category_groups?.budget_type === 'personal') continue;
      if (type === 'income') { income += amt; if (/speaking/i.test(name)) notes.push({ name, amount: amt }); continue; }
      if (excludesTakeHomeAllocation(name, false)) continue;
      if (name.startsWith('Five-Bucket · ')) savings += amt;
      else if (r.categories?.money_purpose === 'eliminate_debt' || /loan|debt|betrlink/i.test(name)) { debt += amt; debtLines.push({ name, amount: amt }); }
      else expenses += amt;
      if (HIGHLIGHT.test(name)) notes.push({ name, amount: amt });
    }
    if (revisedDebtMonth && budgetType === 'personal') expenses += ownerContribution;
    if (revisedDebtMonth && budgetType === 'business') income += ownerContribution;
    const left = income - expenses - debt - savings;
    const split = budgetFunding(BASELINE, savings + Math.max(0, left), m).allocation;
    return { m, income, expenses, debt, savings, left, notes, split,
      ownerContribution: revisedDebtMonth ? operatingContribution : 0,
      investmentContribution: revisedDebtMonth ? ownerContribution - operatingContribution : 0,
      debtLines: debtLines.sort((a, b) => b.amount - a.amount) };
  });

  return (
    <section className="space-y-3 border-b py-4" aria-label="Months ahead">
      <div>
        <h2 className="text-lg font-semibold">Months ahead</h2>
        <p className="text-sm text-muted-foreground">Your saved {budgetType === 'all' ? 'personal + business' : budgetType} budgets for the next {MONTHS} months, with one-time items like the sister loan, speaking fee and loan payoffs called out.</p>
        <details className="mt-2 rounded-md border bg-muted/30 p-2 text-sm">
          <summary className="cursor-pointer font-medium">Why debt payments change each month</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
            <li><b>October–November:</b> $500 sister loan payments (Oct 30, Nov 30) for Mom's home repair.</li>
            <li><b>November:</b> the $4,100 speaking fee covers the final $500 sister payment, pays off Vacation Loan 2306 and puts $1,000 extra on Vacation Loan 3004 (35% APR). Including its regular $228.47 payment, Loan 3004 receives $1,228.47. The freed $1,146.25 remains available for your Five-Bucket plan.</li>
            <li><b>December–April:</b> Vacation Loan 3004 payments are spread across five monthly budgets. Estimated payments include monthly interest at the saved 35.99% APR, assuming October's $228.47 and November's $1,228.47 payments occur. See each month's Vacation Loan Payment 1 below; April is the estimated final payoff. Confirm the exact payoff with the lender.</li>
            <li><b>January–April 2027:</b> Vacation Loan 2306 and the $1,000 sister loan are fully repaid. The student loan starts at {formatCurrency(januaryPayments?.student || 0)}/month. BetrLink is $583/month through April ({formatCurrency(januaryPayments?.betrLinkPersonal || 0)} personal + {formatCurrency(januaryPayments?.betrLinkBusiness || 0)} business). Loan 3004 keeps its estimated payments through April.</li>
            <li><b>From May 2027:</b> BetrLink ends; Loan 3004 is expected to be cleared after April, subject to lender confirmation. Student loan payments and other regular minimums continue.</li>
          </ul>
        </details>
      </div>
      {isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cols.map(c => (
            <div key={c.m} className="rounded-lg border bg-card/60 p-3 text-sm backdrop-blur">
              <p className="mb-2 font-semibold">{format(new Date(c.m + 'T00:00:00'), 'MMMM yyyy')}</p>
              <dl className="space-y-1 tabular-nums">
                <div className="flex justify-between"><dt>Income</dt><dd>{formatCurrency(c.income)}</dd></div>
                <div className="flex justify-between"><dt>Expenses</dt><dd>{formatCurrency(c.expenses)}</dd></div>
                {budgetType === 'personal' && c.ownerContribution > 0 && <div className="flex justify-between text-xs text-muted-foreground"><dt>Includes business funding</dt><dd>{formatCurrency(c.ownerContribution)}</dd></div>}
                {budgetType === 'personal' && c.investmentContribution > 0.005 && <div className="flex justify-between text-xs text-muted-foreground"><dt>Includes business investment allocation</dt><dd>{formatCurrency(c.investmentContribution)}</dd></div>}
                <div className="flex justify-between"><dt>Debt payments</dt><dd>{formatCurrency(c.debt)}</dd></div>
                <div className="flex justify-between"><dt>Five-Bucket savings</dt><dd>{formatCurrency(c.savings)}</dd></div>
                <div className={`flex justify-between border-t pt-1 font-semibold ${c.left < 0 ? 'text-destructive' : 'text-primary'}`}><dt>Left over</dt><dd>{formatCurrency(c.left)}</dd></div>
              </dl>
              {c.debtLines.length > 0 && (
                <div className="mt-2 space-y-0.5 border-t pt-2 text-xs tabular-nums">
                  <p className="font-medium">Debt payments</p>
                  {c.debtLines.map(d => <div key={d.name} className="flex justify-between gap-2 text-muted-foreground"><span className="truncate">{d.name}</span><span>{formatCurrency(d.amount)}</span></div>)}
                </div>
              )}
              {c.savings + Math.max(0, c.left) > 0 && (
                <div className="mt-2 space-y-0.5 border-t pt-2 text-xs tabular-nums">
                  <p className="font-medium">Five-Bucket split{c.left > 0.005 ? ' (incl. left over)' : ''}</p>
                  {(['emergency', 'retire', 'vacation', 'housing', 'guilt'] as const).map(k => (
                    <div key={k} className="flex justify-between text-muted-foreground"><span>{BUCKETS.find(b => b.key === k)?.label}</span><span>{formatCurrency(c.split[k] / 100)}</span></div>
                  ))}
                </div>
              )}
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
