import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useBudgets, useCategories, useTransactions } from '@/hooks/use-finance-data';
import { formatCurrency } from '@/lib/seed-data';
import { Loader2 } from 'lucide-react';

const currentMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

const Budgets = () => {
  const month = currentMonth();
  const { data: budgets, isLoading: budgetsLoading } = useBudgets(month);
  const { data: transactions } = useTransactions();
  const { data: categories } = useCategories();

  // Compute actual spending per category for current month
  const spentByCategory = useMemo(() => {
    if (!transactions) return {};
    const monthPrefix = month.substring(0, 7); // "2026-03"
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.date.startsWith(monthPrefix) && t.amount < 0 && t.category_id) {
        map[t.category_id] = (map[t.category_id] || 0) + Math.abs(t.amount);
      }
    }
    return map;
  }, [transactions, month]);

  if (budgetsLoading) return <div className="flex items-center justify-center p-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  const budgetItems = (budgets || []).map(b => ({
    ...b,
    spent: spentByCategory[b.category_id] || 0,
  }));

  const totalPlanned = budgetItems.reduce((s, b) => s + b.planned_amount, 0);
  const totalSpent = budgetItems.reduce((s, b) => s + b.spent, 0);
  const totalPct = totalPlanned > 0 ? Math.round((totalSpent / totalPlanned) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Budgets</h1>
        <p className="text-muted-foreground">
          {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} budget overview.
        </p>
      </div>

      {budgetItems.length > 0 && (
        <Card>
          <CardContent className="flex items-center gap-6 p-5">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Total Budget</p>
              <p className="font-display text-2xl font-bold">
                {formatCurrency(totalSpent)} <span className="text-base font-normal text-muted-foreground">/ {formatCurrency(totalPlanned)}</span>
              </p>
            </div>
            <div className="w-40">
              <Progress value={Math.min(totalPct, 100)} className="h-3" />
              <p className="mt-1 text-right text-xs text-muted-foreground">{totalPct}% used</p>
            </div>
          </CardContent>
        </Card>
      )}

      {budgetItems.length === 0 && (
        <Card><CardContent className="p-10 text-center text-muted-foreground">
          No budgets set for this month. Budgets will appear here once you create them.
        </CardContent></Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {budgetItems.map((budget) => {
          const cat = budget.categories;
          const pct = budget.planned_amount > 0 ? Math.round((budget.spent / budget.planned_amount) * 100) : 0;
          const remaining = budget.planned_amount - budget.spent;
          const overBudget = remaining < 0;
          return (
            <motion.div key={budget.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: cat?.color }} />
                      <span className="font-medium">{cat?.name}</span>
                    </div>
                    <span className={`text-sm font-medium ${overBudget ? 'text-prism-rose' : 'text-muted-foreground'}`}>
                      {overBudget ? 'Over by ' + formatCurrency(Math.abs(remaining)) : formatCurrency(remaining) + ' left'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>{formatCurrency(budget.spent)}</span>
                      <span>{formatCurrency(budget.planned_amount)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: overBudget ? 'hsl(var(--prism-negative))' : (cat?.color || '#7c5cf5'),
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default Budgets;
