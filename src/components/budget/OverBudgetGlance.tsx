import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCurrency } from '@/hooks/use-currency';
import { useBudgetActual } from '@/hooks/use-budget-actual';
import { BUDGET_ACTUAL_PILLARS, type BudgetActualMode, type BudgetActualPillarKey } from '@/lib/budgeting/budgetActual';

const PILLAR_COLOR: Record<BudgetActualPillarKey, string> = Object.fromEntries(
  BUDGET_ACTUAL_PILLARS.map(def => [def.key, def.color])
) as Record<BudgetActualPillarKey, string>;

const PILLAR_LABEL: Record<BudgetActualPillarKey, string> = Object.fromEntries(
  BUDGET_ACTUAL_PILLARS.map(def => [def.key, def.label])
) as Record<BudgetActualPillarKey, string>;

interface Props {
  month: string; // YYYY-MM
  budgetType: 'personal' | 'business' | 'all';
}

export default function OverBudgetGlance({ month, budgetType }: Props) {
  const { formatCurrency } = useCurrency();
  const mode: BudgetActualMode = budgetType === 'all' ? 'combined' : budgetType;
  const { data, isLoading } = useBudgetActual(month, mode);

  const over = useMemo(() => {
    if (!data) return [];
    const lines = [...data.pillars.flatMap(p => p.lines), ...data.uncategorized];
    return lines
      .map(l => ({ ...l, over: l.actual - l.budgeted }))
      .filter(l => l.over > 0.005)
      .sort((a, b) => b.over - a.over);
  }, [data]);

  const totalOver = over.reduce((s, l) => s + l.over, 0);
  const unbudgeted = over.filter(l => l.budgeted === 0);

  return (
    <Card className="print:hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-prism-rose" />
            Over budget at a glance
          </CardTitle>
          {!isLoading && (
            <Badge variant={over.length > 0 ? 'destructive' : 'secondary'} className="shrink-0">
              {over.length === 0 ? 'All clear' : `${over.length} categor${over.length === 1 ? 'y' : 'ies'} · ${formatCurrency(totalOver)} over`}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Checking spending against planned amounts…</p>
        ) : over.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every category with a plan is at or under budget so far this month.</p>
        ) : (
          <div className="space-y-1.5">
            {over.map(line => {
              const color = `hsl(${line.pillar === 'uncategorized' ? 'var(--muted-foreground)' : PILLAR_COLOR[line.pillar]})`;
              const pct = line.budgeted > 0 ? Math.round((line.actual / line.budgeted) * 100) : null;
              return (
                <Link
                  key={line.key}
                  to={`/budgets/actual?month=${month}&mode=${mode}`}
                  className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {line.pillar !== 'uncategorized' ? PILLAR_LABEL[line.pillar] : 'Uncategorized'}
                      {' · '}
                      {formatCurrency(line.actual)} spent of {formatCurrency(line.budgeted)} planned
                      {pct !== null && pct < 1000 && ` · ${pct}%`}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-prism-rose">
                    +{formatCurrency(line.over)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                </Link>
              );
            })}
            {unbudgeted.length > 0 && (
              <p className="pt-1 text-[11px] text-muted-foreground">
                {unbudgeted.length === 1 ? 'One category has' : `${unbudgeted.length} categories have`} spending but no planned amount yet — give {unbudgeted.length === 1 ? 'it' : 'them'} a job on the Budget step.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
