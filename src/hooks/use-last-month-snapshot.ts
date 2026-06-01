import { useMemo } from 'react';
import { useTransactionsByDateRange, useBudgets } from '@/hooks/use-finance-data';

export type LastMonthFeeling = 'on_track' | 'a_little_off' | 'way_off';
export type LastMonthCause = 'one_time' | 'lifestyle_creep' | 'income_timing' | 'unrealistic_budget';

export interface LastMonthSnapshot {
  loading: boolean;
  hasData: boolean;
  monthLabel: string;        // e.g. "May 2026"
  monthKey: string;          // "YYYY-MM-01"
  budgeted: number;
  spent: number;
  overBy: number;            // spent - budgeted (negative = under)
  overPct: number;           // overBy / budgeted * 100
  topCategories: { name: string; budgeted: number; spent: number; over: number }[];
  largestExpense: { merchant: string; amount: number; category: string | null } | null;
  feeling: LastMonthFeeling;
  cause: LastMonthCause;
  rationale: string;
}

function firstOfLastMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth() - 1, 1);
}
function lastOfLastMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 0);
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function useLastMonthSnapshot(): LastMonthSnapshot {
  const start = firstOfLastMonth();
  const end = lastOfLastMonth();
  const monthKey = `${iso(start).slice(0, 7)}-01`;
  const monthLabel = start.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const txQ = useTransactionsByDateRange(iso(start), iso(end));
  const bgQ = useBudgets(monthKey);

  return useMemo<LastMonthSnapshot>(() => {
    const loading = txQ.isLoading || bgQ.isLoading;
    const txns = (txQ.data || []).filter((t: any) => !t.is_transfer);
    const budgets = bgQ.data || [];

    // Spending = sum of negative amounts (or positive expenses depending on convention).
    // Project convention: expenses are stored as negative; income positive.
    const expenses = txns.filter((t: any) => Number(t.amount) < 0);

    // Wife reimburses for groceries — net "Wife Contribution" income against grocery expense.
    const wifeReimbursement = txns
      .filter((t: any) => Number(t.amount) > 0 && (t.categories?.name || '').toLowerCase().includes('wife contribution'))
      .reduce((s: number, t: any) => s + Number(t.amount), 0);

    const grossSpent = expenses.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0);
    const spent = Math.max(0, grossSpent - wifeReimbursement);
    const budgeted = budgets.reduce((s: number, b: any) => s + Number(b.planned_amount || 0), 0);
    const overBy = spent - budgeted;
    const overPct = budgeted > 0 ? (overBy / budgeted) * 100 : 0;

    // Per-category roll-up
    const catMap = new Map<string, { name: string; budgeted: number; spent: number }>();
    for (const b of budgets) {
      const id = b.category_id;
      const name = b.categories?.name || 'Uncategorized';
      catMap.set(id, { name, budgeted: Number(b.planned_amount || 0), spent: 0 });
    }
    for (const t of expenses) {
      const id = t.category_id || 'none';
      const name = t.categories?.name || 'Uncategorized';
      const cur = catMap.get(id) || { name, budgeted: 0, spent: 0 };
      cur.spent += Math.abs(Number(t.amount));
      catMap.set(id, cur);
    }
    // Subtract wife reimbursement from the Groceries category spent
    for (const [id, cur] of catMap.entries()) {
      if (cur.name.toLowerCase().includes('grocer')) {
        cur.spent = Math.max(0, cur.spent - wifeReimbursement);
        catMap.set(id, cur);
      }
    }
    const topCategories = Array.from(catMap.values())
      .map((c) => ({ ...c, over: c.spent - c.budgeted }))
      .sort((a, b) => b.over - a.over)
      .slice(0, 3);


    // Largest single expense
    const biggest = expenses.reduce<any>((max, t) => {
      const amt = Math.abs(Number(t.amount));
      return !max || amt > Math.abs(Number(max.amount)) ? t : max;
    }, null);
    const largestExpense = biggest
      ? {
          merchant: biggest.merchant || biggest.description || 'Unknown',
          amount: Math.abs(Number(biggest.amount)),
          category: biggest.categories?.name || null,
        }
      : null;

    // Feeling heuristic
    let feeling: LastMonthFeeling = 'on_track';
    if (overPct >= 15) feeling = 'way_off';
    else if (overPct >= 3) feeling = 'a_little_off';

    // Cause heuristic
    let cause: LastMonthCause = 'lifestyle_creep';
    let rationale = '';
    const overCats = topCategories.filter((c) => c.over > 0);

    if (largestExpense && overBy > 0 && largestExpense.amount >= overBy * 0.6) {
      cause = 'one_time';
      rationale = `One ${largestExpense.category || 'large'} charge of $${largestExpense.amount.toFixed(0)} drove most of the overage.`;
    } else if (overCats.length >= 3) {
      cause = 'lifestyle_creep';
      rationale = `${overCats.length} categories went over — looks like gradual creep, not a single event.`;
    } else if (overCats.length === 1 && overCats[0].budgeted > 0 && overCats[0].over / overCats[0].budgeted > 0.5) {
      cause = 'unrealistic_budget';
      rationale = `${overCats[0].name} blew past its budget by ${Math.round((overCats[0].over / overCats[0].budgeted) * 100)}% — the number may be too tight.`;
    } else if (overPct < 3) {
      cause = 'one_time';
      rationale = `Spending stayed close to plan${overBy > 0 ? `, only $${overBy.toFixed(0)} over.` : '.'}`;
    } else {
      rationale = `Spending was $${Math.abs(overBy).toFixed(0)} ${overBy > 0 ? 'over' : 'under'} budget across ${overCats.length} categor${overCats.length === 1 ? 'y' : 'ies'}.`;
    }

    return {
      loading,
      hasData: !loading && (txns.length > 0 || budgets.length > 0),
      monthLabel,
      monthKey,
      budgeted,
      spent,
      overBy,
      overPct,
      topCategories,
      largestExpense,
      feeling,
      cause,
      rationale,
    };
  }, [txQ.data, txQ.isLoading, bgQ.data, bgQ.isLoading, monthLabel, monthKey]);
}
