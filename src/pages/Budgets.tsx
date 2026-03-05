import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { MOCK_BUDGETS, CATEGORIES, CATEGORY_GROUPS, formatCurrency } from '@/lib/seed-data';

const Budgets = () => {
  const totalPlanned = MOCK_BUDGETS.reduce((s, b) => s + b.planned, 0);
  const totalSpent = MOCK_BUDGETS.reduce((s, b) => s + b.spent, 0);
  const totalPct = Math.round((totalSpent / totalPlanned) * 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Budgets</h1>
        <p className="text-muted-foreground">March 2026 budget overview.</p>
      </div>

      <Card>
        <CardContent className="flex items-center gap-6 p-5">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Total Budget</p>
            <p className="font-display text-2xl font-bold">{formatCurrency(totalSpent)} <span className="text-base font-normal text-muted-foreground">/ {formatCurrency(totalPlanned)}</span></p>
          </div>
          <div className="w-40">
            <Progress value={totalPct} className="h-3" />
            <p className="mt-1 text-right text-xs text-muted-foreground">{totalPct}% used</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {MOCK_BUDGETS.map((budget) => {
          const cat = CATEGORIES.find((c) => c.id === budget.categoryId);
          if (!cat) return null;
          const pct = Math.round((budget.spent / budget.planned) * 100);
          const remaining = budget.planned - budget.spent;
          const overBudget = remaining < 0;
          return (
            <motion.div key={budget.categoryId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="font-medium">{cat.name}</span>
                    </div>
                    <span className={`text-sm font-medium ${overBudget ? 'text-prism-rose' : 'text-muted-foreground'}`}>
                      {overBudget ? 'Over by ' + formatCurrency(Math.abs(remaining)) : formatCurrency(remaining) + ' left'}
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex justify-between text-sm text-muted-foreground mb-1">
                      <span>{formatCurrency(budget.spent)}</span>
                      <span>{formatCurrency(budget.planned)}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(pct, 100)}%`,
                          backgroundColor: overBudget ? 'hsl(var(--prism-negative))' : cat.color,
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
