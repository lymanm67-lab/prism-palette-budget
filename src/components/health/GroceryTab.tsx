import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { ShoppingBasket, Receipt, TrendingDown } from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { fmtMoney, prepStatus } from '@/lib/health/healthEngine';
import { useGroceryStats, useHealthPrep, useHealthMeals } from '@/hooks/use-health';

export default function GroceryTab() {
  const { data: stats, isLoading } = useGroceryStats();
  const { data: preps = [] } = useHealthPrep();
  const { data: meals = [] } = useHealthMeals();

  if (isLoading || !stats) return <Skeleton className="h-64 w-full" />;

  const packed = preps.reduce((s, p) => s + prepStatus(p).packed, 0);
  const mealsLogged = meals.length;
  const mealCount = Math.max(1, packed + mealsLogged);
  const costPerMeal = stats.spent / mealCount;
  const usedPct = stats.budget > 0 ? stats.spent / stats.budget : 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {([
          ['Grocery budget', fmtMoney(stats.budget), stats.monthLabel],
          ['Spent so far', fmtMoney(stats.spent), 'Reimbursements netted out'],
          ['Remaining', fmtMoney(stats.remaining), stats.remaining >= 0 ? 'On plan' : 'Over budget'],
          ['Cost per prepped meal', fmtMoney(costPerMeal), `${mealCount} meals tracked`],
        ] as const).map(([label, value, caption]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{caption}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBasket className="h-4 w-4 text-prism-teal" /> {stats.monthLabel} grocery budget
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={Math.min(100, usedPct * 100)} className="h-2.5" />
          <p className="text-sm text-muted-foreground">
            {stats.budget > 0
              ? `${Math.round(usedPct * 100)}% of the grocery budget used.`
              : 'No grocery budget found for this month — set one on the Budgets page and it will appear here.'}
          </p>
        </CardContent>
      </Card>

      {stats.trend.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingDown className="h-4 w-4 text-prism-lime" /> Grocery spend, last 6 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.trend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                  <Bar dataKey="spent" name="Spent" fill="hsl(var(--prism-teal))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Receipt className="h-4 w-4 text-prism-amber" /> Eating-out avoidance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Every prepped container replaces a restaurant meal. At a $14 average lunch, the{' '}
            {packed} containers you have packed represent roughly{' '}
            <strong className="text-foreground">{fmtMoney(packed * 14 - stats.spent * 0.3)}</strong> of
            avoided spend after ingredient cost.
          </p>
          <p>
            Grocery figures come from your PRISM transactions in grocery and food categories, with
            transfers excluded and grocery reimbursements netted against spend.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
